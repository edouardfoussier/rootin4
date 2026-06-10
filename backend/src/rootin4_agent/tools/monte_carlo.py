"""Monte Carlo tools exposed to the ADK agent (and the REST layer).

The aggregate is cached per (n_samples, seed, priors-overlay) so repeated
questions don't re-simulate. `update_priors` is the write-half of the
Phoenix self-correction loop: the agent introspects its calibration via
the Phoenix MCP tools, then nudges a team's Elo here — the next
simulation run picks the correction up automatically.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import replace

from ..tournament.aggregate import TournamentAggregate, run
from ..tournament.state import TournamentState, load_default_state

logger = logging.getLogger(__name__)

DEFAULT_N_SAMPLES = 5_000
DEFAULT_SEED = 2026

# Elo corrections applied on top of the pre-tournament seeds. Mutated only
# through `update_priors`; guarded for the multi-request FastAPI context.
_lock = threading.Lock()
_elo_overrides: dict[str, float] = {}
_priors_log: list[dict] = []
_cache: dict[tuple, TournamentAggregate] = {}


def _current_state() -> TournamentState:
    base = load_default_state()
    if not _elo_overrides:
        return base
    elo = dict(base.elo)
    for code, delta in _elo_overrides.items():
        elo[code] = elo.get(code, 1500.0) + delta
    return replace(base, elo=elo)


def get_aggregate(
    n_samples: int = DEFAULT_N_SAMPLES, seed: int = DEFAULT_SEED
) -> TournamentAggregate:
    """Cached aggregate for the current priors overlay (REST + tools)."""
    with _lock:
        key = (n_samples, seed, tuple(sorted(_elo_overrides.items())))
        if key not in _cache:
            _cache[key] = run(_current_state(), n_samples=n_samples, seed=seed)
            if len(_cache) > 8:  # keep the hot entries, drop the oldest
                _cache.pop(next(iter(_cache)))
        return _cache[key]


def _team_label(code: str) -> str:
    team = load_default_state().teams.get(code)
    return f"{team.name} ({code})" if team else code


def run_monte_carlo(n_simulations: int = 5000) -> dict:
    """Simulate the full World Cup 2026 `n_simulations` times.

    Runs the Elo + Poisson tournament engine over all 104 fixtures
    (group stage, FIFA tiebreakers, third-place allocation, knockout
    bracket through the final) and returns headline numbers.

    Args:
        n_simulations: How many tournaments to simulate (500-20000).
            5000 is a good default — ~1.5s and stable to ±1%.

    Returns:
        Champion probabilities (top 12), the active Elo corrections, and
        the sample size backing every number.
    """
    n = max(500, min(int(n_simulations), 20_000))
    agg = get_aggregate(n_samples=n)
    return {
        "n_simulations": agg.n_samples,
        "champion_probabilities": [
            {"team": _team_label(code), "code": code, "probability": round(p, 4)}
            for code, p in list(agg.champion_probs.items())[:12]
        ],
        "active_elo_corrections": dict(_elo_overrides),
        "note": (
            "Probabilities are empirical frequencies over the simulated "
            "tournaments. Cite n_simulations when quoting them."
        ),
    }


def match_team_probabilities(match_id: int) -> dict:
    """Who is likely to actually play at a given World Cup 2026 match?

    The inverse-ticket question: for the FIFA match number the user
    bought a seat for, return the probability of each team appearing,
    the most likely pairings, the modal scoreline, and the penalty-
    shootout rate (knockout fixtures only).

    Args:
        match_id: FIFA match number, 1-104. Group stage is 1-72,
            Round of 32 is 73-88, final is 104.

    Returns:
        Fixture facts (date, stadium, round, scheduled slots) plus
        empirical probabilities from the latest Monte Carlo aggregate.
    """
    state = load_default_state()
    fixture = state.fixtures.get(int(match_id))
    if fixture is None:
        return {"error": f"match_id must be 1-104, got {match_id}"}

    agg = get_aggregate()
    fx = agg.fixtures[fixture.id]
    slot_a = fixture.team_a or fixture.slot_a
    slot_b = fixture.team_b or fixture.slot_b
    return {
        "match_id": fixture.id,
        "round": fixture.round,
        "date": fixture.date,
        "stadium": f"{fixture.stadium.name}, {fixture.stadium.city}",
        "scheduled_as": f"{slot_a} vs {slot_b}",
        "n_simulations": fx.n_samples,
        "team_probabilities": [
            {"team": _team_label(code), "code": code, "probability": round(p, 4)}
            for code, p in list(fx.team_probs.items())[:10]
        ],
        "most_likely_pairings": [
            {
                "team_a": _team_label(a),
                "team_b": _team_label(b),
                "probability": round(p, 4),
            }
            for (a, b), p in list(fx.pair_probs.items())[:6]
        ],
        "most_likely_scores": [
            {"score": f"{ga}-{gb}", "probability": round(c / fx.n_samples, 4)}
            for (ga, gb), c in fx.score_dist.most_common(5)
        ],
        "penalty_shootout_rate": round(fx.penalties_rate, 4),
    }


def team_match_probabilities(team_code: str) -> dict:
    """Which World Cup 2026 matches will a given team actually play in?

    For a ticket-holder following one team: P(team appears) for every
    fixture beyond their three scheduled group games.

    Args:
        team_code: 3-letter code, e.g. "ARG", "FRA", "POR", "USA".

    Returns:
        The team's guaranteed group fixtures plus appearance
        probabilities for every knockout fixture (probability > 1%),
        and the team's championship odds.
    """
    code = team_code.strip().upper()
    state = load_default_state()
    team = state.teams.get(code)
    if team is None:
        by_name = {t.name.lower(): t for t in state.teams.values()}
        team = by_name.get(team_code.strip().lower())
        if team is None:
            return {"error": f"Unknown team {team_code!r}. Use a 3-letter code like FRA."}
        code = team.code

    agg = get_aggregate()
    group_fixtures = []
    knockout_probs = []
    for fid in sorted(state.fixtures):
        fixture = state.fixtures[fid]
        if fixture.round == "group":
            if code in (fixture.team_a, fixture.team_b):
                group_fixtures.append(
                    {
                        "match_id": fid,
                        "date": fixture.date,
                        "stadium": f"{fixture.stadium.name}, {fixture.stadium.city}",
                        "opponent": _team_label(
                            fixture.team_b if fixture.team_a == code else fixture.team_a
                        ),
                    }
                )
            continue
        p = agg.fixtures[fid].team_probs.get(code, 0.0)
        if p > 0.01:
            knockout_probs.append(
                {
                    "match_id": fid,
                    "round": fixture.round,
                    "date": fixture.date,
                    "stadium": f"{fixture.stadium.name}, {fixture.stadium.city}",
                    "probability": round(p, 4),
                }
            )

    return {
        "team": _team_label(code),
        "group": team.group,
        "elo": state.elo[code] + _elo_overrides.get(code, 0.0),
        "n_simulations": agg.n_samples,
        "guaranteed_group_matches": group_fixtures,
        "knockout_appearance_probabilities": knockout_probs,
        "champion_probability": round(agg.champion_probs.get(code, 0.0), 4),
    }


def update_priors(team_code: str, elo_delta: float, reason: str) -> dict:
    """Apply an Elo correction to a team — the self-improvement write path.

    Call this after introspecting prediction calibration in Phoenix
    (via the phoenix MCP tools) reveals a systematic bias, e.g. "we
    over-rated Germany by ~40 Elo across the group stage". The
    correction applies to every subsequent Monte Carlo run.

    Args:
        team_code: 3-letter team code, e.g. "GER".
        elo_delta: Elo points to add (negative to downgrade). Keep
            corrections modest: ±10 to ±60.
        reason: One-line justification, ideally citing the Phoenix
            evidence (trace counts, Brier deltas) that motivated it.

    Returns:
        The team's old/new effective Elo and the full correction log.
    """
    code = team_code.strip().upper()
    state = load_default_state()
    if code not in state.teams:
        return {"error": f"Unknown team code {team_code!r}"}
    delta = max(-120.0, min(float(elo_delta), 120.0))
    with _lock:
        old = state.elo[code] + _elo_overrides.get(code, 0.0)
        _elo_overrides[code] = _elo_overrides.get(code, 0.0) + delta
        new = state.elo[code] + _elo_overrides[code]
        _priors_log.append(
            {"team": code, "delta": delta, "reason": reason}
        )
        _cache.clear()  # next aggregate reflects the corrected priors
    logger.info("priors updated: %s %+0.1f (%s)", code, delta, reason)
    return {
        "team": _team_label(code),
        "old_elo": round(old, 1),
        "new_elo": round(new, 1),
        "applied_delta": delta,
        "corrections_log": list(_priors_log),
    }


def get_priors_log() -> list[dict]:
    """Read-only view of applied corrections (REST layer)."""
    return list(_priors_log)
