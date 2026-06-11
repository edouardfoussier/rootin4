"""Record / list / roll back real match results, and slice the history.

Write paths are operator-only (admin-token REST endpoint); the agent —
and therefore the public — gets read access via `list_match_results`.
Each write invalidates the simulation cache and appends a probability
snapshot, so the UI sparklines step exactly when reality does.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from ..storage import get_store
from ..tournament.results import validate_result
from ..tournament.state import load_default_state
from .monte_carlo import (
    get_aggregate,
    get_recorded_results,
    invalidate_aggregates,
    log_activity,
    take_snapshot,
)

logger = logging.getLogger(__name__)


def _team_name(code: str) -> str:
    team = load_default_state().teams.get(code)
    return team.name if team else code


def record_result(
    match_id: int,
    goals_a: int,
    goals_b: int,
    winner: str | None = None,
    team_a: str | None = None,
    team_b: str | None = None,
) -> dict:
    """Persist a final score and re-price the tournament around it.

    Returns the before/after championship odds for both teams so the
    caller (and the activity feed) can show the move, Polymarket-style.
    Raises ValueError on an invalid payload.
    """
    state = load_default_state()
    result = validate_result(
        state,
        match_id,
        goals_a,
        goals_b,
        winner=winner,
        team_a=team_a,
        team_b=team_b,
        recorded_at=datetime.now(UTC).isoformat(),
    )

    before = get_aggregate()  # cached pre-result surface
    before_champ = {
        result.team_a: before.champion_probs.get(result.team_a, 0.0),
        result.team_b: before.champion_probs.get(result.team_b, 0.0),
    }

    store = get_store()
    items = [
        raw
        for raw in store.load_results()
        if int(raw.get("match_id", -1)) != result.match_id
    ]
    items.append(result.to_dict())
    items.sort(key=lambda raw: int(raw["match_id"]))
    store.save_results(items)
    invalidate_aggregates()

    label = (
        f"FT M{result.match_id}: {_team_name(result.team_a)} "
        f"{result.score_line()} {_team_name(result.team_b)}"
    )
    if result.is_draw and result.winner:
        label += f" ({_team_name(result.winner)} on pens)"
    log_activity(f"Result recorded — {label}", kind="result")

    after = get_aggregate()  # recompute conditioned on the new result
    take_snapshot(label, kind="result")

    def _move(code: str) -> dict:
        return {
            "team": _team_name(code),
            "code": code,
            "champion_before": round(before_champ[code], 4),
            "champion_after": round(after.champion_probs.get(code, 0.0), 4),
        }

    return {
        "recorded": result.to_dict(),
        "label": label,
        "n_simulations": after.n_samples,
        "championship_moves": [_move(result.team_a), _move(result.team_b)],
        "total_results_recorded": len(items),
    }


def delete_result(match_id: int) -> dict:
    """Roll back a typo'd result and re-price (admin only)."""
    store = get_store()
    items = store.load_results()
    kept = [raw for raw in items if int(raw.get("match_id", -1)) != int(match_id)]
    if len(kept) == len(items):
        raise ValueError(f"no recorded result for match {match_id}")
    store.save_results(kept)
    invalidate_aggregates()
    log_activity(f"Result rolled back — match {match_id}", kind="result")
    take_snapshot(f"Rolled back result for match {match_id}", kind="rollback")
    return {"deleted_match_id": int(match_id), "total_results_recorded": len(kept)}


def list_match_results() -> dict:
    """Real World Cup 2026 results recorded so far, oldest first.

    Every Monte Carlo simulation is conditioned on these: completed
    matches are locked to their actual score, and both teams' Elo
    ratings are updated from each result before the remaining fixtures
    are sampled. Use this to see what reality the current probabilities
    already include.

    Returns:
        The recorded results with score lines and team names, plus how
        the conditioning works.
    """
    state = load_default_state()
    results = get_recorded_results()
    payload = []
    for mid in sorted(results):
        res = results[mid]
        fixture = state.fixtures.get(mid)
        payload.append(
            {
                "match_id": mid,
                "round": fixture.round if fixture else "?",
                "date": fixture.date if fixture else "?",
                "score": (
                    f"{_team_name(res.team_a)} {res.score_line()} "
                    f"{_team_name(res.team_b)}"
                ),
                "winner": _team_name(res.winner) if res.winner else "draw",
                "recorded_at": res.recorded_at,
            }
        )
    return {
        "count": len(payload),
        "results": payload,
        "note": (
            "All simulations lock these scores in and update Elo from "
            "them; quoting current probabilities already includes this."
        ),
    }


# ---------------------------------------------------------------------------
# History slices for the UI sparklines
# ---------------------------------------------------------------------------


def champions_history(top: int = 16) -> dict:
    """Championship-odds timeline for the strongest teams."""
    history = get_store().load_history()
    latest = history[-1]["champions"] if history else {}
    codes = [c for c, _ in sorted(latest.items(), key=lambda kv: -kv[1])[:top]]
    points = [
        {
            "ts": snap["ts"],
            "trigger": snap.get("trigger", ""),
            "kind": snap.get("kind", "event"),
            "probs": {c: snap.get("champions", {}).get(c, 0.0) for c in codes},
        }
        for snap in history
    ]
    return {"codes": codes, "points": points}


def match_history(match_id: int) -> dict:
    """Probability timeline for one fixture.

    Knockout fixtures: P(team appears) per snapshot. Group fixtures:
    home/draw/away outcome split per snapshot.
    """
    state = load_default_state()
    fixture = state.fixtures.get(int(match_id))
    if fixture is None:
        raise ValueError(f"match_id must be 1-104, got {match_id}")
    history = get_store().load_history()
    key, bucket = (
        ("group_outcomes", "outcomes")
        if fixture.round == "group"
        else ("fixtures", "teams")
    )
    points = []
    for snap in history:
        probs = snap.get(key, {}).get(str(int(match_id)))
        if probs is None:
            continue
        points.append(
            {
                "ts": snap["ts"],
                "trigger": snap.get("trigger", ""),
                "kind": snap.get("kind", "event"),
                "probs": probs,
            }
        )
    return {"matchId": int(match_id), "series": bucket, "points": points}
