"""Single full-tournament simulation.

One call simulates the entire WC2026 from kickoff through the final and
returns a `TournamentSimResult`. `aggregate.py` runs this 10,000+ times
and folds the results into per-fixture distributions.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    import numpy as np
    from .group_stage import GroupStageOutcome
    from .knockout import KnockoutOutcome
    from .state import TournamentState


@dataclass(slots=True)
class TournamentSimResult:
    group_stage: "GroupStageOutcome"
    knockout: "KnockoutOutcome"


def simulate_one(
    state: "TournamentState",
    rng: "np.random.Generator",
) -> TournamentSimResult:
    """Run group stage → knockout once. Pure function over the RNG."""
    raise NotImplementedError("Implement in W2.")
