"""Rootin4 agent definition.

We use Google ADK's `Agent` primitive (code-owned, traceable). The agent is
fronted by Gemini 2.5 Pro for reasoning. As we ship F1 and beyond, tools are
appended to `_TOOLS` below — each one shows up in Phoenix as its own span.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from .tools.health import health

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are Rootin4, an analyst agent for World Cup 2026 ticket-holders.

Your job is to answer two questions, with calibrated probabilities, for any
of the 104 scheduled matches:

  1. For a given match (e.g. "Match 87"), which teams are most likely to play?
  2. For a given team (e.g. Argentina), which matches are they most likely to
     appear in?

You always reason from the latest Monte Carlo run and any news events the
tools surface. You never invent numbers. When you cite a probability, you
mention how many simulations backed it. You are concise, precise, and you
write like a sports columnist who happens to be a Bayesian.
"""

_TOOLS = [health]


@lru_cache(maxsize=1)
def build_agent():
    """Lazily build the ADK agent so we don't pay import cost at module load."""
    try:
        from google.adk.agents import Agent
    except ImportError as exc:
        raise RuntimeError(
            "google-adk is not installed. Run `uv sync` inside backend/."
        ) from exc

    return Agent(
        name="rootin4",
        model="gemini-2.5-pro",
        description=(
            "Ticket-intelligence agent for World Cup 2026 — predicts who "
            "plays at the seat you already bought."
        ),
        instruction=SYSTEM_PROMPT,
        tools=list(_TOOLS),
    )
