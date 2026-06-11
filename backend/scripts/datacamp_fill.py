"""Generate paste-ready DataCamp notebook predictions.

Runs the Rootin4 Monte Carlo engine ON DATACAMP'S OWN FIXTURE LIST
(their match ids, their bracket topology, their team names) and emits a
single Python cell that fills `group_predictions` / `knockout_predictions`.

Usage: uv run python scripts/datacamp_fill.py <workspace_dir>
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from rootin4_agent.tournament.aggregate import run
from rootin4_agent.tournament.elo import win_prob
from rootin4_agent.tournament.state import Fixture, Stadium, TournamentState, load_default_state

CORNERS, YELLOWS, REDS = 10, 4, 0

# Rootin4 code → DataCamp display name, where they differ from data.json.
NAME_OVERRIDES = {
    "USA": "USA",
    "CZE": "UEFA Playoff D",
    "BIH": "UEFA Playoff A",
    "TUR": "UEFA Playoff C",
    "SWE": "UEFA Playoff B",
    "IRQ": "FIFA Playoff 2",
    "COD": "FIFA Playoff 1",
    "RSA": "South Africa",
    "KOR": "South Korea",
    "CIV": "Côte d'Ivoire",
    "CPV": "Cabo Verde",
    "CUW": "Curaçao",
    "KSA": "Saudi Arabia",
    "NZL": "New Zealand",
}

ROUNDS = {
    "Round of 32": "r32",
    "Round of 16": "r16",
    "Quarter-final": "qf",
    "Semi-final": "sf",
    "Third-place playoff": "tp",
    "Final": "final",
}

CAN_CITIES = ("Toronto", "Vancouver")
MEX_CITIES = ("Mexico City", "Guadalajara", "Monterrey")


def host_country(venue: str) -> str:
    if any(c in venue for c in CAN_CITIES):
        return "CAN"
    if any(c in venue for c in MEX_CITIES):
        return "MEX"
    return "USA"


def main(workspace: Path) -> None:
    base = load_default_state()
    code_to_name = {
        code: NAME_OVERRIDES.get(code, t.name) for code, t in base.teams.items()
    }
    name_to_code = {v: k for k, v in code_to_name.items()}

    fixtures: dict[int, Fixture] = {}

    with open(workspace / "data" / "group_fixtures.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["match_id"])
            home, away = row["home_team"], row["away_team"]
            if home not in name_to_code or away not in name_to_code:
                raise SystemExit(f"Unmapped team in match {mid}: {home!r} / {away!r}")
            fixtures[mid] = Fixture(
                id=mid,
                round="group",
                date=row["date_utc"][:10],
                stadium=Stadium(
                    code=f"V{mid}", name=row["venue"], city=row["venue"],
                    host_country=host_country(row["venue"]),
                ),
                group=row["group"],
                team_a=name_to_code[home],
                team_b=name_to_code[away],
            )

    def norm_slot(slot: str) -> str:
        if slot.startswith("Best 3rd (Groups "):
            return "3rd Group " + slot.removeprefix("Best 3rd (Groups ").rstrip(")")
        return slot

    ko_rows: list[dict] = []
    with open(workspace / "data" / "knockout_slots.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["match_id"])
            ko_rows.append(row)
            fixtures[mid] = Fixture(
                id=mid,
                round=ROUNDS[row["round"]],
                date=row["date_utc"][:10],
                stadium=Stadium(
                    code=f"V{mid}", name=row["venue"], city=row["venue"],
                    host_country=host_country(row["venue"]),
                ),
                slot_a=norm_slot(row["slot_home"]),
                slot_b=norm_slot(row["slot_away"]),
            )

    state = TournamentState(
        teams=base.teams, fixtures=fixtures, elo=dict(base.elo)
    )
    agg = run(state, n_samples=10_000, seed=2026)

    group_lines, ko_lines = [], []
    for mid in sorted(fixtures):
        fx = agg.fixtures[mid]
        n = fx.n_samples
        hg, ag = fx.modal_score()
        if fixtures[mid].round == "group":
            p_home = sum(c for (a, b), c in fx.score_dist.items() if a > b) / n
            p_away = sum(c for (a, b), c in fx.score_dist.items() if a < b) / n
            p_draw = 1.0 - p_home - p_away
            outcome = max(
                [("home", p_home), ("away", p_away), ("draw", p_draw)],
                key=lambda kv: kv[1],
            )[0]
            group_lines.append(
                f"    {mid}: ({hg}, {ag}, {CORNERS}, {YELLOWS}, {REDS}, {outcome!r}),"
            )
        else:
            code_h, code_a = fx.modal_pair()
            fixture = fixtures[mid]
            bonus_h = 0.0
            if code_h in ("MEX", "USA", "CAN") and fixture.stadium.host_country == code_h:
                bonus_h = {"MEX": 70.0, "USA": 40.0, "CAN": 30.0}[code_h]
            bonus_a = 0.0
            if code_a in ("MEX", "USA", "CAN") and fixture.stadium.host_country == code_a:
                bonus_a = {"MEX": 70.0, "USA": 40.0, "CAN": 30.0}[code_a]
            p_h = win_prob(state.elo[code_h], state.elo[code_a], bonus_h - bonus_a)
            winner = "home" if p_h >= 0.5 else "away"
            pens = hg == ag
            ko_lines.append(
                f"    {mid}: ({code_to_name[code_h]!r}, {code_to_name[code_a]!r}, "
                f"{hg}, {ag}, {CORNERS}, {YELLOWS}, {REDS}, {winner!r}, {pens}),"
            )

    snippet = f'''\
# === Rootin4 predictions — Elo + Poisson Monte Carlo, 10,000 simulated tournaments ===
# Engine: https://github.com/edouardfoussier/rootin4 (backend/src/rootin4_agent/tournament)

GROUP = {{  # match_id: (home_goals, away_goals, corners, yellows, reds, winning_team)
{chr(10).join(group_lines)}
}}

KNOCKOUT = {{  # match_id: (home_team, away_team, home_goals, away_goals, corners, yellows, reds, match_winner, penalties)
{chr(10).join(ko_lines)}
}}

for col, idx in [("predicted_home_goals", 0), ("predicted_away_goals", 1),
                 ("corners", 2), ("yellow_cards", 3), ("red_cards", 4),
                 ("winning_team", 5)]:
    group_predictions[col] = group_predictions["match_id"].map(
        lambda m: GROUP[m][idx])

for col, idx in [("predicted_home_team", 0), ("predicted_away_team", 1),
                 ("predicted_home_goals", 2), ("predicted_away_goals", 3),
                 ("corners", 4), ("yellow_cards", 5), ("red_cards", 6),
                 ("match_winner", 7), ("penalties", 8)]:
    knockout_predictions[col] = knockout_predictions["match_id"].map(
        lambda m: KNOCKOUT[m][idx])

display(group_predictions.head(10))
display(knockout_predictions)
'''

    out = workspace / "rootin4_fill_cell.py"
    out.write_text(snippet, encoding="utf-8")
    print(f"snippet written: {out} ({len(group_lines)} group + {len(ko_lines)} knockout rows)")
    champs = list(agg.champion_probs.items())[:5]
    print("champions on THEIR bracket:", [(code_to_name[c], round(p, 3)) for c, p in champs])


if __name__ == "__main__":
    main(Path(sys.argv[1]))
