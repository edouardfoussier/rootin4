"""Score wire — autonomous ingestion of real World Cup results.

Reads ESPN's public scoreboard (keyless JSON; league slug `fifa.world`)
and maps each COMPLETED event onto exactly one of our 104 fixtures:

* Group stage — exact team-pair match against the schedule.
* Knockout — the real bracket is *resolved from recorded results* (group
  standings → R32 slots, then "Winner Match N" feeders), so an event
  pairs with a fixture only when reality already determines that pairing.
  Unresolvable or ambiguous events are skipped and retried next run.

Everything returned here is validated against the fixture list before
anyone (agent or fallback code) is allowed to record it. The wire never
invents scores: not-completed events are reported but never recordable.
"""

from __future__ import annotations

import logging
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from ..tournament.group_stage import TeamGroupRecord
from ..tournament.knockout import _assign_thirds
from ..tournament.results import MatchResult
from ..tournament.state import TournamentState, load_default_state

logger = logging.getLogger(__name__)

SCOREBOARD_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"
)

# Wire names that don't normalise onto our dataset's names by themselves.
NAME_ALIASES: dict[str, str] = {
    "usa": "USA",
    "united states": "USA",
    "south korea": "KOR",
    "korea republic": "KOR",
    "ir iran": "IRN",
    "iran": "IRN",
    "czech republic": "CZE",
    "czechia": "CZE",
    "bosnia and herzegovina": "BIH",
    "bosnia-herzegovina": "BIH",
    "ivory coast": "CIV",
    "cote d'ivoire": "CIV",
    "cabo verde": "CPV",
    "cape verde": "CPV",
}


@dataclass(slots=True)
class WireEvent:
    """One scoreboard event, validated and fixture-matched when possible."""

    event_id: str
    kickoff_utc: str
    status: str
    completed: bool
    team_a: str | None          # our 3-letter code, None if unmapped
    team_b: str | None
    name_a: str                 # wire display names, for logging
    name_b: str
    goals_a: int
    goals_b: int
    shootout_winner: str | None
    match_id: int | None        # our fixture, None if no safe match
    note: str = ""


def _norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return s.lower().replace(".", "").strip()


def _team_code(state: TournamentState, abbrev: str, name: str) -> str | None:
    """abbreviation → exact name → alias table; None if all miss."""
    if abbrev and abbrev.upper() in state.teams:
        return abbrev.upper()
    by_name = {_norm(t.name): code for code, t in state.teams.items()}
    if _norm(name) in by_name:
        return by_name[_norm(name)]
    return NAME_ALIASES.get(_norm(name))


# ---------------------------------------------------------------------------
# Real-bracket resolution from recorded results
# ---------------------------------------------------------------------------


def _real_group_standings(
    state: TournamentState, results: dict[int, MatchResult]
) -> dict[str, list[TeamGroupRecord]] | None:
    """FIFA-ranked standings per group, only if all 72 group games are in."""
    group_fixtures = [f for f in state.fixtures.values() if f.round == "group"]
    if any(f.id not in results for f in group_fixtures):
        return None
    records = {code: TeamGroupRecord(code=code) for code in state.teams}
    for f in group_fixtures:
        res = results[f.id]
        ra, rb = records[res.team_a], records[res.team_b]
        ra.played += 1
        rb.played += 1
        ra.gf += res.goals_a
        ra.ga += res.goals_b
        rb.gf += res.goals_b
        rb.ga += res.goals_a
        if res.goals_a > res.goals_b:
            ra.won += 1
            rb.lost += 1
        elif res.goals_b > res.goals_a:
            rb.won += 1
            ra.lost += 1
        else:
            ra.drawn += 1
            rb.drawn += 1
    standings: dict[str, list[TeamGroupRecord]] = {}
    for letter in sorted({t.group for t in state.teams.values()}):
        members = [records[t.code] for t in state.teams.values() if t.group == letter]
        members.sort(
            key=lambda r: (r.pts, r.gd, r.gf, state.elo[r.code]), reverse=True
        )
        standings[letter] = members
    return standings


def real_knockout_pairs(
    state: TournamentState, results: dict[int, MatchResult]
) -> dict[int, frozenset[str]]:
    """match_id → {team codes} for every knockout fixture reality has
    already determined (group results for R32; feeder winners beyond)."""
    pairs: dict[int, frozenset[str]] = {}
    standings = _real_group_standings(state, results)

    if standings is not None:
        thirds = [standings[letter][2] for letter in sorted(standings)]
        thirds.sort(
            key=lambda r: (r.pts, r.gd, r.gf, state.elo[r.code]), reverse=True
        )
        advancing = {state.teams[r.code].group: r.code for r in thirds[:8]}

        third_slots: list[tuple[int, int, frozenset[str]]] = []
        resolved: dict[int, list[str | None]] = {}
        for f in state.fixtures.values():
            if f.round != "r32":
                continue
            pair: list[str | None] = [None, None]
            for pos, slot in enumerate((f.slot_a, f.slot_b)):
                if slot.startswith("Winner Group "):
                    pair[pos] = standings[slot[-1]][0].code
                elif slot.startswith("Runner-up Group "):
                    pair[pos] = standings[slot[-1]][1].code
                else:
                    allowed = frozenset(slot.removeprefix("3rd Group ").split("/"))
                    third_slots.append((f.id, pos, allowed))
            resolved[f.id] = pair
        assignment = _assign_thirds(
            [(mid, allowed) for mid, _, allowed in third_slots], set(advancing)
        )
        if assignment:
            for mid, pos, _ in third_slots:
                resolved[mid][pos] = advancing[assignment[mid]]
            for mid, pair in resolved.items():
                if pair[0] and pair[1]:
                    pairs[mid] = frozenset(pair)  # type: ignore[arg-type]

    # Later rounds resolve from recorded feeder results, round by round.
    for f in sorted(
        (f for f in state.fixtures.values() if f.round not in ("group", "r32")),
        key=lambda f: f.id,
    ):
        sides = []
        for slot in (f.slot_a, f.slot_b):
            feeder_id = int(slot.rsplit(" ", 1)[1])
            feeder = results.get(feeder_id)
            if feeder is None or feeder.winner is None:
                sides = []
                break
            if slot.startswith("Winner Match "):
                sides.append(feeder.winner)
            else:  # Loser Match N (third-place playoff)
                sides.append(
                    feeder.team_b
                    if feeder.winner == feeder.team_a
                    else feeder.team_a
                )
        if len(sides) == 2:
            pairs[f.id] = frozenset(sides)
    return pairs


# ---------------------------------------------------------------------------
# Wire fetch + fixture matching
# ---------------------------------------------------------------------------


_raw_cache: tuple[float, list[dict]] | None = None
_RAW_TTL_SECONDS = 60.0


def _fetch_events(dates: list[str]) -> list[dict]:
    """Raw scoreboard fetch, cached briefly so one sync pass (agent turn
    + deterministic fallback) sees a single consistent snapshot."""
    global _raw_cache
    import time

    if _raw_cache and time.monotonic() - _raw_cache[0] < _RAW_TTL_SECONDS:
        return _raw_cache[1]
    events: dict[str, dict] = {}
    with httpx.Client(timeout=15.0, headers={"User-Agent": "rootin4/1.0"}) as client:
        for d in dates:
            resp = client.get(SCOREBOARD_URL, params={"dates": d})
            resp.raise_for_status()
            for ev in resp.json().get("events", []):
                events[str(ev.get("id"))] = ev
    _raw_cache = (time.monotonic(), list(events.values()))
    return _raw_cache[1]


def _parse_event(state: TournamentState, ev: dict) -> WireEvent | None:
    comp = (ev.get("competitions") or [{}])[0]
    competitors = comp.get("competitors") or []
    if len(competitors) != 2:
        return None
    home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
    away = next((c for c in competitors if c is not home), competitors[1])
    status = comp.get("status", {}).get("type", {})

    def team(c: dict) -> tuple[str | None, str]:
        t = c.get("team", {})
        name = t.get("displayName", "?")
        return _team_code(state, t.get("abbreviation", ""), name), name

    code_h, name_h = team(home)
    code_a, name_a = team(away)

    shootout_winner = None
    try:
        sh_h, sh_a = home.get("shootoutScore"), away.get("shootoutScore")
        if sh_h is not None and sh_a is not None and sh_h != sh_a:
            shootout_winner = code_h if int(sh_h) > int(sh_a) else code_a
    except (TypeError, ValueError):
        pass

    return WireEvent(
        event_id=str(ev.get("id")),
        kickoff_utc=ev.get("date", ""),
        status=status.get("name", "?"),
        completed=bool(status.get("completed")),
        team_a=code_h,
        team_b=code_a,
        name_a=name_h,
        name_b=name_a,
        goals_a=int(home.get("score") or 0),
        goals_b=int(away.get("score") or 0),
        shootout_winner=shootout_winner,
        match_id=None,
    )


def _match_fixture(
    state: TournamentState,
    results: dict[int, MatchResult],
    ko_pairs: dict[int, frozenset[str]],
    ev: WireEvent,
) -> None:
    """Attach the unique safe fixture for this event, or leave None."""
    if not ev.team_a or not ev.team_b:
        ev.note = "unmapped team name"
        return
    pair = frozenset((ev.team_a, ev.team_b))
    group_hits = [
        f.id
        for f in state.fixtures.values()
        if f.round == "group"
        and frozenset((f.team_a, f.team_b)) == pair
        and f.id not in results
    ]
    ko_hits = [
        mid for mid, p in ko_pairs.items() if p == pair and mid not in results
    ]
    hits = group_hits + ko_hits
    if len(hits) == 1:
        ev.match_id = hits[0]
    elif not hits:
        ev.note = "no unrecorded fixture for this pairing (yet)"
    else:
        ev.note = f"ambiguous fixtures {hits}; skipping"


def fetch_wire_events(
    results: dict[int, MatchResult], now: datetime | None = None
) -> list[WireEvent]:
    """Scoreboard events for yesterday+today (UTC), fixture-matched."""
    state = load_default_state()
    now = now or datetime.now(UTC)
    dates = [(now - timedelta(days=1)).strftime("%Y%m%d"), now.strftime("%Y%m%d")]
    ko_pairs = real_knockout_pairs(state, results)
    events = []
    for raw in _fetch_events(dates):
        ev = _parse_event(state, raw)
        if ev is None:
            continue
        _match_fixture(state, results, ko_pairs, ev)
        events.append(ev)
    return events
