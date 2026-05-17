"""Group-stage simulation + FIFA tiebreakers.

One call simulates all 72 group-stage matches, computes the 12 group
standings, applies FIFA tiebreakers, and returns the 32 teams that
advance to the Round of 32 (12 winners + 12 runners-up + 8 best-third).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    import numpy as np
    from .state import TournamentState


@dataclass(slots=True)
class TeamGroupRecord:
    """Standings line for a single team within its group."""

    code: str
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    gf: int = 0
    ga: int = 0

    @property
    def gd(self) -> int:
        return self.gf - self.ga

    @property
    def pts(self) -> int:
        return self.won * 3 + self.drawn


@dataclass(slots=True)
class GroupOutcome:
    """Ordered standings for a single group + scored matches."""

    letter: str
    standings: list[TeamGroupRecord]               # length 4, ranked
    match_scores: dict[int, tuple[int, int]] = field(default_factory=dict)

    @property
    def winner(self) -> str:
        return self.standings[0].code

    @property
    def runner_up(self) -> str:
        return self.standings[1].code

    @property
    def third(self) -> TeamGroupRecord:
        return self.standings[2]


@dataclass(slots=True)
class GroupStageOutcome:
    """All 12 group outcomes + the 8 best third-placed teams."""

    groups: dict[str, GroupOutcome]
    best_thirds: list[TeamGroupRecord]             # length 8, ranked


def simulate_group_stage(
    state: "TournamentState",
    rng: "np.random.Generator",
) -> GroupStageOutcome:
    """Play every group fixture once, compute standings.

    FIFA tiebreakers (applied in order):
        1. Points (W*3 + D)
        2. Goal difference
        3. Goals scored
        4. Disciplinary points (we stub as 0 — no cards in sim)
        5. FIFA ranking (we substitute Elo rank)

    For best-third ranking we apply the same criteria across the 12
    third-placed teams and keep the top 8.

    TODO(W2): implement per the spec; needs `state.fixtures` filtered to
    `round == "group"` and `state.elo` for the win/score sample.
    """
    raise NotImplementedError("Implement in W2.")


def rank_best_thirds(thirds: list[TeamGroupRecord]) -> list[TeamGroupRecord]:
    """Sort the 12 third-placed teams by FIFA criteria, return top 8."""
    raise NotImplementedError("Implement in W2.")
