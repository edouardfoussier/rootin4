"""FastAPI entrypoint — Cloud Run target.

Endpoints:
    GET  /healthz                    → liveness check
    POST /agent                      → one full agent turn (Gemini + tools)
    GET  /agent/stream               → same, but SSE (tokens + tool events)
    GET  /api/predictions/{id}       → MatchPrediction payload for the UI
    GET  /api/teams/{code}           → team appearance probabilities
    GET  /api/champions              → championship odds
    GET  /api/priors                 → self-correction log

Tracing is wired via `instrumentation.setup_observability()` on app
startup, so every Gemini call and tool invocation lands in Phoenix.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import uuid
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .instrumentation import setup_observability
from .settings import get_settings
from .tools.health import health
from .tools.monte_carlo import (
    ensure_baseline_snapshot,
    get_activity,
    get_aggregate,
    get_aggregate_timestamp,
    get_engine_stats,
    get_priors_log,
    get_recorded_results,
    log_activity,
)
from .tools.results_service import (
    champions_history,
    delete_result,
    list_match_results,
    match_history,
    record_result,
    record_wire_result,
)
from .tournament.state import load_default_state

# ADK's Gemini client reads GOOGLE_API_KEY / GOOGLE_GENAI_USE_VERTEXAI
# from the process environment; pydantic-settings alone won't export
# them. Clients are built lazily per request, so loading after imports
# is safe. No-op when .env is absent (Cloud Run injects real env vars).
load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

_runner = None
_runner_lock = asyncio.Lock()

APP_NAME = "rootin4"
USER_ID = "web"


class AgentRequest(BaseModel):
    """Payload for /agent."""

    prompt: str
    session_id: str | None = None


class AgentResponse(BaseModel):
    """Response envelope for /agent."""

    output: str
    session_id: str
    tools_used: list[str] = []
    model: str
    metadata: dict[str, Any] = {}


def _build_runner():
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService

    from .agent import build_agent

    return Runner(
        app_name=APP_NAME,
        agent=build_agent(),
        session_service=InMemorySessionService(),
        auto_create_session=True,
    )


async def _get_runner():
    global _runner
    async with _runner_lock:
        if _runner is None:
            _runner = _build_runner()
    return _runner


def _warm_engine() -> None:
    get_aggregate()
    # Anchor the sparklines' opening price on the very first boot.
    ensure_baseline_snapshot()


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_observability()
    # Warm the default Monte Carlo aggregate off the request path.
    threading.Thread(target=_warm_engine, daemon=True).start()
    logger.info(
        "rootin4-agent ready (env=%s, model=%s)",
        get_settings().rootin4_env,
        get_settings().rootin4_model,
    )
    yield


app = FastAPI(
    title="Rootin4 Agent",
    version="1.0.0",
    description=(
        "Code-owned Gemini agent on Google ADK, instrumented with Phoenix. "
        "Built for the Google Cloud Rapid Agent Hackathon — Arize track."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # public, read-mostly demo API
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/healthz")
def healthz() -> dict[str, Any]:
    """Liveness probe — same payload as the agent's `health` tool.

    Exposed under both paths: Google's frontend intercepts `/healthz`
    on run.app domains, so `/health` is the publicly reachable one.
    """
    return health()


def _user_content(prompt: str):
    from google.genai import types

    return types.Content(role="user", parts=[types.Part(text=prompt)])


@app.post("/agent", response_model=AgentResponse)
async def invoke_agent(request: AgentRequest) -> AgentResponse:
    """One blocking agent turn: prompt in, final answer + tool log out."""
    runner = await _get_runner()
    session_id = request.session_id or f"s-{uuid.uuid4().hex[:12]}"

    output_parts: list[str] = []
    tools_used: list[str] = []
    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=session_id,
        new_message=_user_content(request.prompt),
    ):
        for call in event.get_function_calls():
            tools_used.append(call.name)
        if event.is_final_response() and event.content and event.content.parts:
            output_parts.extend(p.text for p in event.content.parts if p.text)

    log_activity(
        f"Gemini turn completed — tools: {', '.join(tools_used) or 'none'}",
        kind="agent",
    )
    return AgentResponse(
        output="".join(output_parts).strip(),
        session_id=session_id,
        tools_used=tools_used,
        model=get_settings().rootin4_model,
        metadata={"phoenix_project": get_settings().phoenix_project_name},
    )


@app.get("/agent/stream")
async def stream_agent(prompt: str, session_id: str | None = None):
    """SSE agent turn: `token`, `tool`, `final`, `done` events."""
    from google.adk.agents.run_config import RunConfig, StreamingMode

    runner = await _get_runner()
    sid = session_id or f"s-{uuid.uuid4().hex[:12]}"

    def sse(payload: dict) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    async def gen():
        yield sse({"type": "session", "session_id": sid})
        try:
            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=sid,
                new_message=_user_content(prompt),
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            ):
                for call in event.get_function_calls():
                    yield sse({"type": "tool", "name": call.name})
                text = ""
                if event.content and event.content.parts:
                    text = "".join(p.text or "" for p in event.content.parts)
                if event.partial and text:
                    yield sse({"type": "token", "text": text})
                elif event.is_final_response() and text:
                    yield sse({"type": "final", "text": text})
        except Exception as exc:  # surface errors to the client, not the void
            logger.exception("agent stream failed")
            yield sse({"type": "error", "message": str(exc)})
        yield sse({"type": "done"})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# REST layer for the Next.js frontend (mirrors src/lib/stub-data.ts shapes)
# ---------------------------------------------------------------------------


def _team_payload(code: str) -> dict[str, Any]:
    team = load_default_state().teams[code]
    return {
        "code": team.code,
        "name": team.name,
        "flag": team.flag,
        "group": team.group,
        "seed": team.seed,
        "eloSeed": team.elo_seed,
    }


@app.get("/api/predictions/{match_id}")
def prediction(match_id: int) -> dict[str, Any]:
    """`MatchPrediction`-shaped payload for /match/[id]."""
    state = load_default_state()
    fixture = state.fixtures.get(match_id)
    if fixture is None:
        raise HTTPException(status_code=404, detail="match_id must be 1-104")

    agg = get_aggregate()
    fx = agg.fixtures[match_id]
    n = fx.n_samples

    # Full-time outcome split — the interesting number for group games,
    # where the participants themselves are already locked.
    home_wins = sum(c for (ga, gb), c in fx.score_dist.items() if ga > gb)
    away_wins = sum(c for (ga, gb), c in fx.score_dist.items() if ga < gb)
    draws = n - home_wins - away_wins

    team_probabilities = [
        {"team": _team_payload(code), "probability": p}
        for code, p in list(fx.team_probs.items())[:8]
    ]
    pair_probabilities = [
        {
            "teamA": _team_payload(a),
            "teamB": _team_payload(b),
            # The percentage already sits next to the row — no duplicate copy.
            "flavor": "",
            "probability": p,
        }
        for (a, b), p in list(fx.pair_probs.items())[:5]
    ]
    recorded = get_recorded_results().get(match_id)
    return {
        "matchId": match_id,
        "iterations": n,
        # Honest freshness: when the aggregate was computed, not "now".
        "lastUpdatedIso": get_aggregate_timestamp(),
        # Real final score once the operator records it — the UI flips
        # from forecast to full-time mode on this field.
        "result": (
            {
                "teamA": recorded.team_a,
                "teamB": recorded.team_b,
                "goalsA": recorded.goals_a,
                "goalsB": recorded.goals_b,
                "scoreLine": recorded.score_line(),
                "winner": recorded.winner,
                "recordedAt": recorded.recorded_at,
            }
            if recorded
            else None
        ),
        "teamProbabilities": team_probabilities,
        "pairProbabilities": pair_probabilities,
        "mostLikelyScores": [
            {"score": f"{ga}-{gb}", "probability": c / n}
            for (ga, gb), c in fx.score_dist.most_common(5)
        ],
        "outcomeProbabilities": {
            "home": home_wins / n,
            "draw": draws / n,
            "away": away_wins / n,
        },
        "penaltyShootoutRate": fx.penalties_rate,
        "news": [],
    }


@app.get("/api/teams/{code}")
def team_matches(code: str) -> dict[str, Any]:
    """Appearance probabilities for one team across all fixtures."""
    from .tools.monte_carlo import team_match_probabilities

    payload = team_match_probabilities(code)
    if "error" in payload:
        raise HTTPException(status_code=404, detail=payload["error"])
    return payload


@app.get("/api/champions")
def champions() -> dict[str, Any]:
    """Championship odds from the current aggregate."""
    agg = get_aggregate()
    return {
        "iterations": agg.n_samples,
        "champions": [
            {"team": _team_payload(code), "probability": p}
            for code, p in list(agg.champion_probs.items())[:16]
        ],
    }


@app.get("/api/priors")
def priors() -> dict[str, Any]:
    """Self-correction log — what the agent changed and why."""
    return {"corrections": get_priors_log()}


@app.get("/api/activity")
def activity() -> dict[str, Any]:
    """Real engine/agent events + cumulative counters (nothing staged)."""
    return {"events": get_activity(), "stats": get_engine_stats()}


# ---------------------------------------------------------------------------
# Real results (operator writes, public reads) + probability history
# ---------------------------------------------------------------------------


class ResultPayload(BaseModel):
    """Body for POST /api/admin/results."""

    match_id: int = Field(ge=1, le=104)
    goals_a: int = Field(ge=0, le=15)
    goals_b: int = Field(ge=0, le=15)
    # Knockout fixtures only: the actual teams (the schedule has slots),
    # and the shootout winner when the score is level.
    team_a: str | None = None
    team_b: str | None = None
    winner: str | None = None


def _require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    expected = get_settings().rootin4_admin_token
    if not expected:
        raise HTTPException(
            status_code=503, detail="result recording is not configured"
        )
    if x_admin_token != expected:
        raise HTTPException(status_code=401, detail="bad or missing admin token")


@app.post("/api/admin/results", dependencies=[Depends(_require_admin)])
def admin_record_result(payload: ResultPayload) -> dict[str, Any]:
    """Record a final score; sims re-price around it immediately."""
    try:
        return record_result(
            payload.match_id,
            payload.goals_a,
            payload.goals_b,
            winner=payload.winner,
            team_a=payload.team_a,
            team_b=payload.team_b,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/admin/results/{match_id}", dependencies=[Depends(_require_admin)])
def admin_delete_result(match_id: int) -> dict[str, Any]:
    """Roll back a mistyped result."""
    try:
        return delete_result(match_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/results")
def results() -> dict[str, Any]:
    """Recorded real results (public, read-only)."""
    return list_match_results()


@app.get("/api/history/champions")
def history_champions(top: int = 16) -> dict[str, Any]:
    """Championship-odds timeline — one point per real-world event."""
    return champions_history(top=max(1, min(top, 48)))


@app.get("/api/history/match/{match_id}")
def history_match(match_id: int) -> dict[str, Any]:
    """Per-fixture probability timeline (teams for KO, outcomes for groups)."""
    try:
        return match_history(match_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Autonomous sync — Cloud Scheduler wakes the ops agent after each match
# ---------------------------------------------------------------------------

_ops_runner = None


async def _get_ops_runner():
    global _ops_runner
    async with _runner_lock:
        if _ops_runner is None:
            from google.adk.runners import Runner
            from google.adk.sessions import InMemorySessionService

            from .agent import build_ops_agent

            _ops_runner = Runner(
                app_name=f"{APP_NAME}-ops",
                agent=build_ops_agent(),
                session_service=InMemorySessionService(),
                auto_create_session=True,
            )
    return _ops_runner


@app.post("/internal/sync-results", dependencies=[Depends(_require_admin)])
async def sync_results() -> dict[str, Any]:
    """One autonomous sync pass: wire check → ops-agent records → fallback.

    Idempotent (recorded fixtures are skipped), so the hourly schedule
    doubles as the retry loop. The Gemini turn is the primary writer and
    is fully traced in Phoenix; a deterministic fallback re-checks the
    wire afterwards so a missed tool call can't lose a result.
    """
    from .tools.score_wire import fetch_wire_events

    before = get_recorded_results()
    try:
        events = fetch_wire_events(before)
    except Exception as exc:  # network/wire failure → let Scheduler retry
        logger.exception("score wire unreachable")
        raise HTTPException(status_code=502, detail=f"score wire: {exc}") from exc

    wire_summary = [
        {
            "teams": f"{ev.name_a} vs {ev.name_b}",
            "score": f"{ev.goals_a}-{ev.goals_b}",
            "status": ev.status,
            "match_id": ev.match_id,
            "recordable": bool(ev.completed and ev.match_id),
            "note": ev.note,
        }
        for ev in events
    ]
    recordable = [ev for ev in events if ev.completed and ev.match_id]
    if not recordable:
        log_activity(
            f"Auto-sync: wire checked, {len(events)} event(s), nothing to record",
            kind="sync",
        )
        return {"recorded": [], "agent_ran": False, "wire": wire_summary}

    # Primary path: the ops agent reads the wire and commits the results
    # (each tool call lands in Phoenix). Any failure here is non-fatal —
    # the deterministic sweep below still records what the wire shows.
    agent_output, agent_tools = "", []
    try:
        runner = await _get_ops_runner()
        async for event in runner.run_async(
            user_id="scheduler",
            session_id=f"sync-{uuid.uuid4().hex[:10]}",
            new_message=_user_content(
                "Scheduled sync: check the wire and record every completed, "
                "recordable match, then summarise the moves."
            ),
        ):
            for call in event.get_function_calls():
                agent_tools.append(call.name)
            if event.is_final_response() and event.content and event.content.parts:
                agent_output = "".join(
                    p.text or "" for p in event.content.parts
                ).strip()
    except Exception:
        logger.exception("ops agent turn failed; deterministic fallback only")

    # Belt-and-braces: anything still unrecorded gets written by code.
    fallback_recorded = []
    after_agent = get_recorded_results()
    for ev in recordable:
        if ev.match_id not in after_agent:
            out = record_wire_result(ev.match_id)
            if "error" not in out:
                fallback_recorded.append(out["label"])
                log_activity(
                    f"Auto-sync fallback recorded {out['label']}", kind="sync"
                )

    recorded_now = [
        mid for mid in get_recorded_results() if mid not in before
    ]
    return {
        "recorded": sorted(recorded_now),
        "agent_ran": True,
        "agent_tools": agent_tools,
        "agent_summary": agent_output,
        "fallback_recorded": fallback_recorded,
        "wire": wire_summary,
    }


def run() -> None:
    """`rootin4` console script entrypoint — launches uvicorn for local dev."""
    import uvicorn

    uvicorn.run(
        "rootin4_agent.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
    )
