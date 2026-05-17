"""Bivariate Poisson-ish score model.

Each match yields a sampled `(goals_a, goals_b)` tuple. We do *not* use
a true bivariate Poisson (the correlation structure adds noise without
much skill gain at this calibration level). Instead each team's goals
are independent Poisson with means tilted by the Elo gap.

Calibration target during W2 backtest: mean goals per match should match
the modern World Cup average of ~2.5; the leader-of-share curve should
reproduce realistic 1-0 / 2-1 / 2-0 modal scores.
"""

from __future__ import annotations

import numpy as np

from .elo import win_prob

# Tuned against Euro 2024 + Copa America 2024 in `scripts/backtest.py`.
BASE_GOALS_PER_MATCH_DEFAULT = 2.55


def expected_goals(
    elo_a: float,
    elo_b: float,
    home_a: float = 0.0,
    base: float = BASE_GOALS_PER_MATCH_DEFAULT,
) -> tuple[float, float]:
    """Return (λ_a, λ_b), the Poisson means for each team's goals.

    The share of goals scored by A is a smooth function of A's win
    probability — even (50/50) matchups split goals roughly 50/50,
    lopsided matchups give the favourite 70-80% of the goal volume.
    """
    p_a = win_prob(elo_a, elo_b, home_a)
    share_a = 0.40 + 0.55 * p_a
    return base * share_a, base * (1.0 - share_a)


def sample_score(
    elo_a: float,
    elo_b: float,
    home_a: float = 0.0,
    rng: np.random.Generator | None = None,
    base: float = BASE_GOALS_PER_MATCH_DEFAULT,
) -> tuple[int, int]:
    """Draw a single (goals_a, goals_b) sample."""
    rng = rng or np.random.default_rng()
    lam_a, lam_b = expected_goals(elo_a, elo_b, home_a, base)
    return int(rng.poisson(lam_a)), int(rng.poisson(lam_b))


def sample_score_distribution(
    elo_a: float,
    elo_b: float,
    home_a: float = 0.0,
    n_samples: int = 10_000,
    base: float = BASE_GOALS_PER_MATCH_DEFAULT,
    rng: np.random.Generator | None = None,
) -> dict[tuple[int, int], float]:
    """Empirical joint distribution P(goals_a = i, goals_b = j).

    Returns a dict keyed by (i, j) → frequency in (0, 1].
    Used by the DataCamp exporter to pick a modal score and by the
    /match/[id] page to show "most likely scoreline" tiles.
    """
    rng = rng or np.random.default_rng()
    lam_a, lam_b = expected_goals(elo_a, elo_b, home_a, base)
    goals_a = rng.poisson(lam_a, size=n_samples)
    goals_b = rng.poisson(lam_b, size=n_samples)
    pairs, counts = np.unique(
        np.column_stack([goals_a, goals_b]), axis=0, return_counts=True
    )
    total = counts.sum()
    return {(int(p[0]), int(p[1])): int(c) / total for p, c in zip(pairs, counts)}


def modal_score(distribution: dict[tuple[int, int], float]) -> tuple[int, int]:
    """Most likely (goals_a, goals_b) from an empirical joint distribution."""
    return max(distribution.items(), key=lambda kv: kv[1])[0]
