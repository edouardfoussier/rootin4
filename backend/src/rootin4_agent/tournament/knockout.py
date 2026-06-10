"""Knockout simulation.

Given a `GroupStageOutcome`, resolve every knockout slot description
(e.g. *"Winner Group K vs 3rd Group D/E/I/J/L"*) into concrete teams,
then play matches 73 → 104 (R32 → Final + 3rd-place).

FIFA's published bracket determines *which* 3rd-place group goes to
*which* slot once we know which 8 thirds advance — the mapping is
deterministic given the set. The exact lookup table is the 8x495
combinatorial matrix from the WC2026 regulations (Annex C). We
implement it as a precomputed dict in `knockout_lookup.py`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    import numpy as np

    from .group_stage import GroupStageOutcome
    from .state import TournamentState


@dataclass(slots=True)
class KnockoutMatchResult:
    """A single resolved knockout match."""

    match_id: int
    team_a: str
    team_b: str
    goals_a: int
    goals_b: int
    went_to_penalties: bool
    winner: str


@dataclass(slots=True)
class KnockoutOutcome:
    """Every knockout match played, plus the champion."""

    matches: dict[int, KnockoutMatchResult] = field(default_factory=dict)
    champion: str | None = None
    runner_up: str | None = None
    third_place: str | None = None


def _assign_thirds(
    slots: list[tuple[int, frozenset[str]]],
    advancing: set[str],
) -> dict[int, str] | None:
    """Assign each third-place R32 slot a distinct group letter.

    `slots` is [(match_id, allowed_groups)], `advancing` the 8 group
    letters whose third advanced. FIFA's Annex C table is one canonical
    perfect matching; we recover a deterministic one by backtracking,
    most-constrained slot first, alphabetically smallest group first.
    """
    order = sorted(
        slots, key=lambda s: (len(s[1] & advancing), s[0])
    )

    assignment: dict[int, str] = {}
    used: set[str] = set()

    def backtrack(i: int) -> bool:
        if i == len(order):
            return True
        match_id, allowed = order[i]
        for letter in sorted(allowed & (advancing - used)):
            assignment[match_id] = letter
            used.add(letter)
            if backtrack(i + 1):
                return True
            used.discard(letter)
            del assignment[match_id]
        return False

    return assignment if backtrack(0) else None


def resolve_bracket(
    group_outcome: GroupStageOutcome,
    state: TournamentState,
) -> dict[int, tuple[str, str]]:
    """Map each R32 match_id (73..88) → (team_a_code, team_b_code).

    Slot grammar comes straight from the fixture list:
    "Winner Group X" / "Runner-up Group X" / "3rd Group A/B/C/D/F".
    """
    third_slots: list[tuple[int, int, frozenset[str]]] = []  # (id, pos, allowed)
    resolved: dict[int, list[str | None]] = {}

    for fixture in state.fixtures.values():
        if fixture.round != "r32":
            continue
        pair: list[str | None] = [None, None]
        for pos, slot in enumerate((fixture.slot_a, fixture.slot_b)):
            if slot.startswith("Winner Group "):
                pair[pos] = group_outcome.groups[slot[-1]].winner
            elif slot.startswith("Runner-up Group "):
                pair[pos] = group_outcome.groups[slot[-1]].runner_up
            elif slot.startswith("3rd Group "):
                allowed = frozenset(slot.removeprefix("3rd Group ").split("/"))
                third_slots.append((fixture.id, pos, allowed))
            else:  # pragma: no cover — schedule data is frozen
                raise ValueError(f"Unknown R32 slot descriptor: {slot!r}")
        resolved[fixture.id] = pair

    advancing_by_group = {
        state.teams[rec.code].group: rec.code
        for rec in group_outcome.best_thirds
    }
    assignment = _assign_thirds(
        [(mid, allowed) for mid, _, allowed in third_slots],
        set(advancing_by_group),
    )
    if assignment is None:  # pragma: no cover — Annex C guarantees a matching
        # Degenerate fallback: fill remaining slots greedily, ignoring
        # the allowed-set constraint, so the sim never crashes.
        leftovers = iter(sorted(advancing_by_group))
        assignment = {mid: next(leftovers) for mid, _, _ in third_slots}

    for match_id, pos, _ in third_slots:
        resolved[match_id][pos] = advancing_by_group[assignment[match_id]]

    return {mid: (pair[0], pair[1]) for mid, pair in resolved.items()}


def play_knockout(
    state: TournamentState,
    group_outcome: GroupStageOutcome,
    rng: np.random.Generator,
) -> KnockoutOutcome:
    """Simulate matches 73..104 in FIFA order.

    Each match: sample a full-time score; on a draw, run the penalty
    model. "Winner Match N" / "Loser Match N" slots resolve from earlier
    results as the walk proceeds (the schedule is topologically ordered).
    """
    from .data import home_bonus
    from .poisson import sample_score

    r32 = resolve_bracket(group_outcome, state)
    outcome = KnockoutOutcome()

    knockout_ids = sorted(
        f.id for f in state.fixtures.values() if f.round != "group"
    )
    for match_id in knockout_ids:
        fixture = state.fixtures[match_id]
        if match_id in r32:
            team_a, team_b = r32[match_id]
        else:
            team_a = _resolve_feeder(fixture.slot_a, outcome)
            team_b = _resolve_feeder(fixture.slot_b, outcome)

        bonus_a = home_bonus(team_a, fixture)
        bonus_b = home_bonus(team_b, fixture)
        goals_a, goals_b = sample_score(
            state.elo[team_a],
            state.elo[team_b],
            home_a=bonus_a - bonus_b,
            rng=rng,
        )
        pens = goals_a == goals_b
        if pens:
            side = penalty_winner(
                state.elo[team_a] + bonus_a, state.elo[team_b] + bonus_b, rng
            )
            winner = team_a if side == "A" else team_b
        else:
            winner = team_a if goals_a > goals_b else team_b

        outcome.matches[match_id] = KnockoutMatchResult(
            match_id=match_id,
            team_a=team_a,
            team_b=team_b,
            goals_a=goals_a,
            goals_b=goals_b,
            went_to_penalties=pens,
            winner=winner,
        )

        if fixture.round == "final":
            outcome.champion = winner
            outcome.runner_up = team_b if winner == team_a else team_a
        elif fixture.round == "tp":
            outcome.third_place = winner

    return outcome


def _resolve_feeder(slot: str, outcome: KnockoutOutcome) -> str:
    """Resolve "Winner Match N" / "Loser Match N" from played results."""
    feeder_id = int(slot.rsplit(" ", 1)[1])
    result = outcome.matches[feeder_id]
    if slot.startswith("Winner Match "):
        return result.winner
    if slot.startswith("Loser Match "):
        return result.team_b if result.winner == result.team_a else result.team_a
    raise ValueError(f"Unknown knockout slot descriptor: {slot!r}")


def penalty_winner(
    elo_a: float,
    elo_b: float,
    rng: np.random.Generator,
) -> str:
    """Coin flip lightly tilted by Elo. Returns winner code ('A' / 'B').

    Penalty shoot-outs in the literature are ~52/48 for the favourite.
    We compress the Elo-derived win prob aggressively toward 0.5
    (plan: p_shootout = 0.7 * p_elo + 0.15, so a 70% favourite on the
    night converts to just 64% from the spot).
    """
    from .elo import win_prob

    p_a = 0.7 * win_prob(elo_a, elo_b) + 0.15
    return "A" if rng.random() < p_a else "B"
