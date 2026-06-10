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
    state: TournamentState,
    n_samples: int = 10_000,
    seed: int | None = None,
) -> TournamentAggregate:
    """Run N simulations and fold into a `TournamentAggregate`.

    The function is intentionally pure: same `state` + same `seed` →
    same output. Phoenix traces wrap this at the tool layer, not here.
    """
    import numpy as np

    from .simulate import simulate_one

    rng = np.random.default_rng(seed)

    team_counts: dict[int, Counter[str]] = {}
    pair_counts: dict[int, Counter[tuple[str, str]]] = {}
    score_counts: dict[int, Counter[tuple[int, int]]] = {}
    pens_counts: Counter[int] = Counter()
    champions: Counter[str] = Counter()

    for fixture_id in state.fixtures:
        team_counts[fixture_id] = Counter()
        pair_counts[fixture_id] = Counter()
        score_counts[fixture_id] = Counter()

    for _ in range(n_samples):
        result = simulate_one(state, rng)

        for group in result.group_stage.groups.values():
            for match_id, score in group.match_scores.items():
                score_counts[match_id][score] += 1
        for match_id, ko in result.knockout.matches.items():
            team_counts[match_id][ko.team_a] += 1
            team_counts[match_id][ko.team_b] += 1
            pair_counts[match_id][(ko.team_a, ko.team_b)] += 1
            score_counts[match_id][(ko.goals_a, ko.goals_b)] += 1
            if ko.went_to_penalties:
                pens_counts[match_id] += 1
        champions[result.knockout.champion] += 1

    fixtures: dict[int, FixtureAggregate] = {}
    for fixture_id, fixture in state.fixtures.items():
        if fixture.round == "group":
            # Participants are fixed by the schedule.
            team_probs = {fixture.team_a: 1.0, fixture.team_b: 1.0}
            pair_probs = {(fixture.team_a, fixture.team_b): 1.0}
        else:
            team_probs = {
                code: count / n_samples
                for code, count in team_counts[fixture_id].most_common()
            }
            pair_probs = {
                pair: count / n_samples
                for pair, count in pair_counts[fixture_id].most_common()
            }
        fixtures[fixture_id] = FixtureAggregate(
            match_id=fixture_id,
            n_samples=n_samples,
            team_probs=team_probs,
            pair_probs=pair_probs,
            score_dist=score_counts[fixture_id],
            penalties_rate=pens_counts[fixture_id] / n_samples,
        )

    return TournamentAggregate(
        n_samples=n_samples,
        fixtures=fixtures,
        champion_probs={
            code: count / n_samples for code, count in champions.most_common()
        },
    )
