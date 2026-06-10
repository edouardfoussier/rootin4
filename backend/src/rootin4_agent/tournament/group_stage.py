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
    state: TournamentState,
    rng: np.random.Generator,
) -> GroupStageOutcome:
    """Play every group fixture once, compute standings.

    FIFA tiebreakers (applied in order):
        1. Points (W*3 + D)
        2. Goal difference
        3. Goals scored
        4. Disciplinary points (we stub as 0 — no cards in sim)
        5. FIFA ranking (we substitute Elo rank)
    """
    from .data import home_bonus
    from .poisson import sample_score

    records: dict[str, TeamGroupRecord] = {
        code: TeamGroupRecord(code=code) for code in state.teams
    }
    scores_by_group: dict[str, dict[int, tuple[int, int]]] = {
        letter: {} for letter in {t.group for t in state.teams.values()}
    }

    for fixture in state.fixtures.values():
        if fixture.round != "group":
            continue
        a, b = fixture.team_a, fixture.team_b
        bonus_a = home_bonus(a, fixture)
        bonus_b = home_bonus(b, fixture)
        # `home_a` is a *relative* edge; net out B's own home bonus.
        goals_a, goals_b = sample_score(
            state.elo[a], state.elo[b], home_a=bonus_a - bonus_b, rng=rng
        )
        scores_by_group[fixture.group][fixture.id] = (goals_a, goals_b)

        rec_a, rec_b = records[a], records[b]
        rec_a.played += 1
        rec_b.played += 1
        rec_a.gf += goals_a
        rec_a.ga += goals_b
        rec_b.gf += goals_b
        rec_b.ga += goals_a
        if goals_a > goals_b:
            rec_a.won += 1
            rec_b.lost += 1
        elif goals_b > goals_a:
            rec_b.won += 1
            rec_a.lost += 1
        else:
            rec_a.drawn += 1
            rec_b.drawn += 1

    def fifa_key(rec: TeamGroupRecord) -> tuple:
        # Descending sort: points, GD, goals scored, Elo (FIFA-rank proxy).
        return (rec.pts, rec.gd, rec.gf, state.elo[rec.code])

    groups: dict[str, GroupOutcome] = {}
    thirds: list[TeamGroupRecord] = []
    for letter in sorted(scores_by_group):
        members = [
            records[t.code] for t in state.teams.values() if t.group == letter
        ]
        members.sort(key=fifa_key, reverse=True)
        groups[letter] = GroupOutcome(
            letter=letter,
            standings=members,
            match_scores=scores_by_group[letter],
        )
        thirds.append(members[2])

    best = _rank_thirds(thirds, state)[:8]
    return GroupStageOutcome(groups=groups, best_thirds=best)


def _rank_thirds(
    thirds: list[TeamGroupRecord], state: TournamentState
) -> list[TeamGroupRecord]:
    return sorted(
        thirds,
        key=lambda rec: (rec.pts, rec.gd, rec.gf, state.elo[rec.code]),
        reverse=True,
    )


def rank_best_thirds(thirds: list[TeamGroupRecord]) -> list[TeamGroupRecord]:
    """Sort the 12 third-placed teams by FIFA criteria, return top 8.

    Standalone variant (no Elo tiebreak available) kept for the public
    API; the engine itself uses `_rank_thirds` which adds the Elo proxy.
    """
    return sorted(
        thirds, key=lambda rec: (rec.pts, rec.gd, rec.gf), reverse=True
    )[:8]
