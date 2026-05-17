"""DataCamp World Cup 2026 submission exporter.

Turns a `TournamentAggregate` into the rows DataCamp's notebook
template expects. We deliberately keep this module side-effect-free
(no file writes) — the actual notebook upload happens in
`scripts/build_datacamp_notebook.py`, which:

    1. Calls `aggregate.run(state, n_samples=10_000)`
    2. Calls `build_predictions(aggregate)` (here)
    3. Renders a DataLab-compatible notebook from a Jinja template
    4. Saves to `submissions/<date>-rootin4-datacamp.ipynb`

We pin the prediction surface (the row schema below) once DataCamp
opens the official template on May 18.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from ..tournament.aggregate import TournamentAggregate

# Tournament-average stubs used when we don't have a specialised model.
# Calibrated against WC 2022 (~10.4 corners, ~3.8 yellow, ~0.15 red).
TOURNAMENT_AVG_CORNERS = 10
TOURNAMENT_AVG_YELLOW = 4
TOURNAMENT_AVG_RED = 0


@dataclass(slots=True)
class DataCampPrediction:
    """One row in the DataCamp submission table."""

    match_id: int
    team_a: str
    team_b: str
    goals_a: int
    goals_b: int
    winner: str | None         # None for draws in group stage
    went_to_penalties: bool    # always False for group stage
    corners_total: int
    yellow_cards_total: int
    red_cards_total: int


def build_predictions(
    aggregate: "TournamentAggregate",
) -> list[DataCampPrediction]:
    """One `DataCampPrediction` per fixture in our schedule.

    Strategy
    --------
    Group stage (known pairings):
        - Use the per-fixture score distribution from `aggregate`
        - Winner = team with more modal goals; None if tied
        - Penalties: always False
    Knockout (probabilistic pairings):
        - Pick the modal `(team_a, team_b)` from `aggregate.pair_probs`
        - Use that pair's modal score
        - Winner: team with more goals; if tied, pick the team whose
          marginal `team_probs` is higher (proxy for "more likely to
          progress past this round across our sims")
        - Penalties: `aggregate.penalties_rate >= 0.5`
    """
    raise NotImplementedError(
        "Implement in W2 once we have a working aggregate.run()."
    )


def to_datacamp_dataframe(predictions: list[DataCampPrediction]):
    """Convenience wrapper — converts to pandas DataFrame with the
    exact column order DataCamp's notebook template expects.

    Implemented lazily here so importing the module doesn't drag pandas
    into the agent's hot path.
    """
    import pandas as pd
    return pd.DataFrame(
        [
            {
                "match_id": p.match_id,
                "team_a": p.team_a,
                "team_b": p.team_b,
                "goals_a": p.goals_a,
                "goals_b": p.goals_b,
                "winner": p.winner or "",
                "went_to_penalties": p.went_to_penalties,
                "corners_total": p.corners_total,
                "yellow_cards_total": p.yellow_cards_total,
                "red_cards_total": p.red_cards_total,
            }
            for p in predictions
        ]
    )
