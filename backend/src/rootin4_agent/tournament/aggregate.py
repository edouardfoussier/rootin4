"""Aggregate many tournament simulations into per-fixture distributions.

This is what the agent's `run_monte_carlo` tool calls. Output feeds both
the Rootin4 UI (probability bars, pair cards) and the DataCamp exporter
(modal scores).
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    import numpy as np
    from .state import TournamentState


@dataclass(slots=True)
class FixtureAggregate:
    """Empirical distributions for a single match across N simulations."""

    match_id: int
    n_samples: int
    team_probs: dict[str, float] = field(default_factory=dict)
    pair_probs: dict[tuple[str, str], float] = field(default_factory=dict)
    score_dist: Counter[tuple[int, int]] = field(default_factory=Counter)
    penalties_rate: float = 0.0

    def modal_pair(self) -> tuple[str, str]:
        """Most likely participants (used by DataCamp score export)."""
        return max(self.pair_probs.items(), key=lambda kv: kv[1])[0]

    def modal_score(self) -> tuple[int, int]:
        """Most likely scoreline."""
        return max(self.score_dist.items(), key=lambda kv: kv[1])[0]


@dataclass(slots=True)
class TournamentAggregate:
    """Roll-up of N simulated tournaments."""

    n_samples: int
    fixtures: dict[int, FixtureAggregate]
    champion_probs: dict[str, float] = field(default_factory=dict)


def run(
    state: "TournamentState",
    n_samples: int = 10_000,
    seed: int | None = None,
) -> TournamentAggregate:
    """Run N simulations and fold into a `TournamentAggregate`.

    The function is intentionally pure: same `state` + same `seed` →
    same output. Phoenix traces wrap this at the tool layer, not here.
    """
    raise NotImplementedError("Implement in W2.")
