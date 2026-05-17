"""Tournament state — pure data types for the Monte Carlo engine.

These mirror `src/lib/wc2026-data.ts` on the frontend so the Python sim
and the TS UI never disagree about a match's structural facts. The
fixture list and group composition are loaded once at process start
(from the JSON ingest in W2) and never mutated; only sim state
(standings, advanced teams, scores) changes during a run.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

HostCountry = Literal["USA", "CAN", "MEX"]
Round = Literal["group", "r32", "r16", "qf", "sf", "tp", "final"]
GroupLetter = Literal[
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"
]


@dataclass(frozen=True, slots=True)
class Team:
    code: str           # ISO-like 3-letter (ARG, BRA, ...)
    name: str
    group: GroupLetter
    seed: int           # 1..4 within the group, drives FIFA rotation
    elo_seed: float     # pre-tournament prior


@dataclass(frozen=True, slots=True)
class Stadium:
    code: str           # AZTECA, METLIFE, ARROWHEAD, ...
    name: str
    city: str
    host_country: HostCountry
    altitude_m: int = 0  # used by home-advantage modelling


@dataclass(frozen=True, slots=True)
class Fixture:
    """A single scheduled slot. Group-stage fixtures have known teams,
    knockout fixtures have slot descriptors that resolve at sim time."""

    id: int                          # 1..104
    round: Round
    date: str                        # ISO date, YYYY-MM-DD
    stadium: Stadium
    group: GroupLetter | None = None
    team_a: str | None = None        # team code (group stage)
    team_b: str | None = None
    slot_a: str | None = None        # e.g. "Winner Group K" (knockout)
    slot_b: str | None = None


@dataclass(slots=True)
class TournamentState:
    """Frozen-ish container loaded once and passed to the engine."""

    teams: dict[str, Team]           # team_code → Team
    fixtures: dict[int, Fixture]     # match_id → Fixture
    elo: dict[str, float] = field(default_factory=dict)


def load_default_state() -> TournamentState:
    """Build the state from `wc2026-data.ts` mirror + db/seed.sql.

    TODO(W2): for the scaffold we hand-author this in
    `tournament/data.py`; later we may ingest from Postgres directly so
    the frontend and backend share a single source of truth.
    """
    raise NotImplementedError(
        "Wire to wc2026-data mirror in tournament/data.py during W2."
    )
