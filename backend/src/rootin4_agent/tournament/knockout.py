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


def resolve_bracket(
    group_outcome: "GroupStageOutcome",
) -> dict[int, tuple[str, str]]:
    """Map each knockout match_id → (team_a_code, team_b_code).

    Uses the FIFA Annex C lookup for the 3rd-place wildcard slots.
    Returns a dict for matches 73..88 (R32 only); R16+ resolve as their
    feeder matches complete during `play_knockout`.
    """
    raise NotImplementedError("Implement in W2 with knockout_lookup table.")


def play_knockout(
    state: "TournamentState",
    group_outcome: "GroupStageOutcome",
    rng: "np.random.Generator",
) -> KnockoutOutcome:
    """Simulate matches 73..104. Each match: sample score; if tied at
    full time on a knockout fixture, run a penalty shoot-out (we model
    it as a single Bernoulli weighted lightly by Elo)."""
    raise NotImplementedError("Implement in W2.")


def penalty_winner(
    elo_a: float,
    elo_b: float,
    rng: "np.random.Generator",
) -> str:
    """Coin flip lightly tilted by Elo. Returns winner code ('A' / 'B').

    Penalty shoot-outs in the literature are ~52/48 for the favourite.
    We compress the Elo-derived win prob aggressively toward 0.5.
    """
    raise NotImplementedError("Implement in W2.")
