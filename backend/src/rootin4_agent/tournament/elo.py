"""Elo helpers — single-match win probability + post-match update.

Calibration target during W2 backtest: pre-Euro-2024 Elo from
eloratings.net snapshot should reproduce ~Brier 0.20 on the 51 actual
Euro 2024 matches.
"""

from __future__ import annotations

import math

# Standard Elo scale; lower K reflects pre-tournament priors not being
# moved much by a single noisy result. Tune in W2.
K_FACTOR_DEFAULT = 20.0


def win_prob(elo_a: float, elo_b: float, home_a: float = 0.0) -> float:
    """Probability that team A beats team B in a one-off match.

    Args:
        elo_a: Elo rating of team A.
        elo_b: Elo rating of team B.
        home_a: Elo bonus applied to team A for playing on home soil
            (or at altitude for Mexican fixtures, etc.). Pass 0 for
            neutral venue. Typical values: +40 for hosts, +60 for
            altitude advantage.

    Returns:
        Win probability for team A in [0, 1].
    """
    return 1.0 / (1.0 + math.pow(10.0, -((elo_a + home_a) - elo_b) / 400.0))


def update_elo(
    elo_winner: float,
    elo_loser: float,
    *,
    draw: bool = False,
    k: float = K_FACTOR_DEFAULT,
) -> tuple[float, float]:
    """Return new Elo ratings after a single match.

    Used by the Phoenix self-correction loop to nudge priors after each
    completed real-world match. Not used inside the Monte Carlo (we
    don't want sim outcomes to mutate priors mid-tournament).
    """
    if draw:
        score_w = 0.5
    else:
        score_w = 1.0
    expected_w = win_prob(elo_winner, elo_loser)
    delta = k * (score_w - expected_w)
    return elo_winner + delta, elo_loser - delta
