"""Real-result conditioning: locked scores, Elo updates, history slices."""

from __future__ import annotations

import numpy as np
import pytest

from rootin4_agent.tournament.aggregate import run
from rootin4_agent.tournament.group_stage import simulate_group_stage
from rootin4_agent.tournament.results import (
    apply_results_to_elo,
    validate_result,
)
from rootin4_agent.tournament.state import load_default_state


def test_validate_group_result_uses_schedule_teams():
    state = load_default_state()
    res = validate_result(state, 1, 2, 1)
    assert (res.team_a, res.team_b) == ("MEX", "RSA")
    assert res.winner == "MEX"
    assert res.score_line() == "2–1"


def test_validate_rejects_nonsense():
    state = load_default_state()
    with pytest.raises(ValueError):
        validate_result(state, 999, 1, 0)
    with pytest.raises(ValueError):
        validate_result(state, 1, -1, 0)
    # Knockout fixtures need explicit teams, and draws need a winner.
    with pytest.raises(ValueError):
        validate_result(state, 104, 1, 0)
    with pytest.raises(ValueError):
        validate_result(state, 104, 1, 1, team_a="FRA", team_b="BRA")


def test_group_sim_locks_recorded_score():
    state = load_default_state()
    state.results = {1: validate_result(state, 1, 2, 1)}
    rng = np.random.default_rng(7)
    for _ in range(5):
        outcome = simulate_group_stage(state, rng)
        assert outcome.groups["A"].match_scores[1] == (2, 1)
        mex = next(
            r for r in outcome.groups["A"].standings if r.code == "MEX"
        )
        assert mex.won >= 1  # the real win is always on the books


def test_elo_moves_toward_winner_and_respects_home_bonus():
    state = load_default_state()
    res = validate_result(state, 1, 2, 1)
    updated = apply_results_to_elo(state, {1: res})
    assert updated["MEX"] > state.elo["MEX"]
    assert updated["RSA"] < state.elo["RSA"]
    # Zero-sum exchange.
    assert updated["MEX"] - state.elo["MEX"] == pytest.approx(
        state.elo["RSA"] - updated["RSA"]
    )
    # Azteca home bonus is in the expectation → a home win moves the
    # rating less than the same scoreline on neutral ground would.
    neutral_fixture_gain = None
    for fid, fx in state.fixtures.items():
        if fx.round == "group" and fx.team_a == "MEX" and fx.stadium.host_country != "MEX":
            neutral = apply_results_to_elo(
                state, {fid: validate_result(state, fid, 2, 1)}
            )
            neutral_fixture_gain = neutral["MEX"] - state.elo["MEX"]
            break
    if neutral_fixture_gain is not None:
        assert updated["MEX"] - state.elo["MEX"] < neutral_fixture_gain


def test_aggregate_reprices_downstream_of_result():
    state = load_default_state()
    base = run(state, n_samples=400, seed=11)

    state.results = {1: validate_result(state, 1, 0, 3)}  # RSA shock win
    state.elo = apply_results_to_elo(state, state.results)
    conditioned = run(state, n_samples=400, seed=11)

    # The played match is deterministic in every simulation.
    assert conditioned.fixtures[1].score_dist[(0, 3)] == 400
    # South Africa's championship odds can only improve after a win.
    assert conditioned.champion_probs.get("RSA", 0.0) >= base.champion_probs.get(
        "RSA", 0.0
    )
