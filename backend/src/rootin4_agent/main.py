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
from datetime import UTC, datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .instrumentation import setup_observability
from .settings import get_settings
from .tools.health import health
from .tools.monte_carlo import get_aggregate, get_priors_log
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_observability()
    # Warm the default Monte Carlo aggregate off the request path.
    threading.Thread(target=get_aggregate, daemon=True).start()
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

    team_probabilities = [
        {"team": _team_payload(code), "probability": p}
        for code, p in list(fx.team_probs.items())[:8]
    ]
    pair_probabilities = [
        {
            "teamA": _team_payload(a),
            "teamB": _team_payload(b),
            "probability": p,
            "flavor": f"Seen in {p:.0%} of {n:,} simulated tournaments.",
        }
        for (a, b), p in list(fx.pair_probs.items())[:5]
    ]
    return {
        "matchId": match_id,
        "iterations": n,
        "lastUpdatedIso": datetime.now(UTC).isoformat(),
        "teamProbabilities": team_probabilities,
        "pairProbabilities": pair_probabilities,
        "mostLikelyScores": [
            {"score": f"{ga}-{gb}", "probability": c / n}
            for (ga, gb), c in fx.score_dist.most_common(5)
        ],
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


def run() -> None:
    """`rootin4` console script entrypoint — launches uvicorn for local dev."""
    import uvicorn

    uvicorn.run(
        "rootin4_agent.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
    )
