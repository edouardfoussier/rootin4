"""Real match results — the bridge between the actual tournament and the sim.

A recorded result conditions every subsequent Monte Carlo run twice over:

1. **Locked outcome** — the match is no longer sampled; every simulated
   tournament replays the real scoreline (group stage) or the real
   winner (knockout), so standings and bracket paths downstream of it
   are consistent with reality.
2. **Elo update** — both teams' ratings move via the standard K-factor
   update (`elo.update_elo` logic, with venue bonus in the expectation),
   so *unplayed* matches re-price from real form.

Results are operator-recorded (admin endpoint) — there is no scraping
layer, and the agent only gets read access. Honest data or no data.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import TYPE_CHECKING

from .data import home_bonus
from .elo import K_FACTOR_DEFAULT, win_prob

if TYPE_CHECKING:  # pragma: no cover
    from .state import TournamentState


@dataclass(frozen=True, slots=True)
class MatchResult:
    """A final score for one fixture, aligned to (team_a, team_b)."""

    match_id: int
    team_a: str
    team_b: str
    goals_a: int
    goals_b: int
    # Knockout draws are decided from the spot; group draws stand as-is.
    winner: str | None = None
    recorded_at: str = ""

    @property
    def is_draw(self) -> bool:
        return self.goals_a == self.goals_b

    def score_line(self) -> str:
        return f"{self.goals_a}–{self.goals_b}"

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(raw: dict) -> MatchResult:
        return MatchResult(
            match_id=int(raw["match_id"]),
            team_a=raw["team_a"],
            team_b=raw["team_b"],
            goals_a=int(raw["goals_a"]),
            goals_b=int(raw["goals_b"]),
            winner=raw.get("winner"),
            recorded_at=raw.get("recorded_at", ""),
        )


def validate_result(
    state: TournamentState,
    match_id: int,
    goals_a: int,
    goals_b: int,
    winner: str | None = None,
    team_a: str | None = None,
    team_b: str | None = None,
    recorded_at: str = "",
) -> MatchResult:
    """Check a candidate result against the fixture list. Raises ValueError.

    Group fixtures take their teams from the schedule (`team_a`/`team_b`
    arguments are ignored); knockout fixtures require both codes since
    the schedule only carries slot descriptors.
    """
    fixture = state.fixtures.get(int(match_id))
    if fixture is None:
        raise ValueError(f"match_id must be 1-104, got {match_id}")
    if not (0 <= int(goals_a) <= 15 and 0 <= int(goals_b) <= 15):
        raise ValueError("goals must be between 0 and 15")

    if fixture.round == "group":
        team_a, team_b = fixture.team_a, fixture.team_b
        if int(goals_a) == int(goals_b):
            winner = None  # group draws stand
        else:
            winner = team_a if int(goals_a) > int(goals_b) else team_b
    else:
        if not team_a or not team_b:
            raise ValueError(
                f"match {match_id} is a knockout fixture ({fixture.round}); "
                "team_a and team_b codes are required"
            )
        team_a, team_b = team_a.strip().upper(), team_b.strip().upper()
        for code in (team_a, team_b):
            if code not in state.teams:
                raise ValueError(f"unknown team code {code!r}")
        if team_a == team_b:
            raise ValueError("team_a and team_b must differ")
        if int(goals_a) == int(goals_b):
            w = (winner or "").strip().upper()
            if w not in (team_a, team_b):
                raise ValueError(
                    "knockout draw: `winner` must name the shootout winner "
                    f"({team_a} or {team_b})"
                )
            winner = w
        else:
            winner = team_a if int(goals_a) > int(goals_b) else team_b

    return MatchResult(
        match_id=int(match_id),
        team_a=team_a,
        team_b=team_b,
        goals_a=int(goals_a),
        goals_b=int(goals_b),
        winner=winner,
        recorded_at=recorded_at,
    )


def apply_results_to_elo(
    state: TournamentState,
    results: dict[int, MatchResult],
    k: float = K_FACTOR_DEFAULT,
) -> dict[str, float]:
    """Fold real results into the pre-tournament ratings, in match order.

    The expectation term includes the venue bonus (Mexico at the Azteca
    is *expected* to over-perform its neutral-ground Elo, so a home win
    moves the rating less than a road win would). Shootout wins count
    as draws for rating purposes, per eloratings.net convention.
    """
    elo = dict(state.elo)
    for match_id in sorted(results):
        res = results[match_id]
        fixture = state.fixtures.get(match_id)
        if fixture is None or res.team_a not in elo or res.team_b not in elo:
            continue
        bonus = home_bonus(res.team_a, fixture) - home_bonus(res.team_b, fixture)
        expected_a = win_prob(elo[res.team_a], elo[res.team_b], home_a=bonus)
        if res.goals_a > res.goals_b:
            score_a = 1.0
        elif res.goals_a < res.goals_b:
            score_a = 0.0
        else:
            score_a = 0.5
        delta = k * (score_a - expected_a)
        elo[res.team_a] += delta
        elo[res.team_b] -= delta
    return elo
