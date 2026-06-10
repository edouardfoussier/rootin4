"""Load the canonical WC2026 dataset (teams, stadiums, fixtures).

`data.json` is generated from the frontend's `src/lib/wc2026-data.ts`
(single source of truth) — regenerate with the tsx dump script if the
schedule mirror ever changes. The JSON carries the real FIFA match
numbers, the Dec 5 2025 draw, and the knockout slot descriptors
("Winner Group K", "3rd Group D/E/I/J/L", "Winner Match 89", ...).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .state import Fixture, Stadium, Team, TournamentState

_DATA_PATH = Path(__file__).parent / "data.json"

# Host-nation Elo bonus, applied when a team plays a fixture staged in
# its own country (plan: docs/datacamp-plan.md — Mexico gets the largest
# bump for altitude + crowd, USA next, Canada the mildest).
HOME_BONUS: dict[str, float] = {"MEX": 70.0, "USA": 40.0, "CAN": 30.0}


def home_bonus(team_code: str, fixture: Fixture) -> float:
    """Elo bonus for `team_code` playing at `fixture`'s venue (0 if away)."""
    if team_code in HOME_BONUS and fixture.stadium.host_country == team_code:
        return HOME_BONUS[team_code]
    return 0.0


@lru_cache(maxsize=1)
def load_state() -> TournamentState:
    """Parse data.json into a `TournamentState` (cached — data is frozen)."""
    raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))

    stadiums = {
        code: Stadium(
            code=code,
            name=s["name"],
            city=s["city"],
            host_country=s["country"],
        )
        for code, s in raw["stadiums"].items()
    }

    teams = {
        code: Team(
            code=code,
            name=t["name"],
            group=t["group"],
            seed=t["seed"],
            elo_seed=float(t["eloSeed"]),
            flag=t.get("flag", ""),
        )
        for code, t in raw["teams"].items()
    }

    fixtures: dict[int, Fixture] = {}
    for m in raw["matches"]:
        fixtures[m["id"]] = Fixture(
            id=m["id"],
            round=m["round"],
            date=m["date"],
            stadium=stadiums[m["stadium"]],
            group=m.get("group"),
            team_a=m.get("teamA"),
            team_b=m.get("teamB"),
            slot_a=m.get("slotA"),
            slot_b=m.get("slotB"),
        )

    return TournamentState(
        teams=teams,
        fixtures=fixtures,
        elo={code: t.elo_seed for code, t in teams.items()},
    )
