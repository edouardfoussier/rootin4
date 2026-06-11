"""Rootin4 agent definition.

We use Google ADK's `Agent` primitive (code-owned, traceable). The agent
is fronted by Gemini 2.5 (Flash by default for interactive latency —
flip to Pro with ROOTIN4_MODEL). Tools cover the Monte Carlo engine, the
priors write-path, and — when configured — the Arize Phoenix MCP server
for runtime introspection of the agent's own traces, datasets and
prompts. Each tool call shows up in Phoenix as its own span.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from .settings import get_settings
from .tools.health import health
from .tools.monte_carlo import (
    match_team_probabilities,
    run_monte_carlo,
    team_match_probabilities,
    update_priors,
)
from .tools.phoenix_introspection import phoenix_calibration_report
from .tools.results_service import list_match_results

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are Rootin4, an analyst agent for World Cup 2026 ticket-holders.

Your job is to answer two questions, with calibrated probabilities, for any
of the 104 scheduled matches:

  1. For a given match (e.g. "Match 87"), which teams are most likely to play?
     → call `match_team_probabilities`.
  2. For a given team (e.g. Argentina), which matches are they most likely to
     appear in? → call `team_match_probabilities`.

For tournament-level questions (who wins it all, group difficulty), call
`run_monte_carlo`. You always reason from tool output — never invent numbers.
When you cite a probability, mention how many simulations backed it.

Once the tournament is underway, real results condition everything: played
matches are locked to their actual score and Elo ratings update from each
result before the remaining fixtures are sampled. Call `list_match_results`
to see what has already happened — do it whenever a question touches form,
"what changed", or a team that just played. You cannot record results
yourself; an operator does that through a verified channel.

Self-improvement protocol: when asked about your own calibration, biases, or
past predictions, start with `phoenix_calibration_report` (a compact summary
of your own recent traces in Arize Phoenix); use the phoenix MCP tools for
projects, datasets and experiments. If you find evidence of a systematic
bias on a team, apply a modest correction with `update_priors`, citing the
evidence. Never correct without evidence from phoenix data.

Style: concise, precise — a sports columnist who happens to be a Bayesian.
Lead with the answer, then the numbers. Use team names, not codes, in prose.
"""


def _phoenix_mcp_toolset():
    """Build the Phoenix MCP toolset if the integration is configured.

    Returns None when the MCP server can't be configured (no API key) —
    the agent still runs, just without the self-introspection tools.
    """
    settings = get_settings()
    if not settings.phoenix_api_key:
        logger.warning("PHOENIX_API_KEY unset — Phoenix MCP tools disabled.")
        return None
    try:
        from google.adk.tools.mcp_tool import StdioConnectionParams

        try:
            from google.adk.tools.mcp_tool import McpToolset
        except ImportError:  # the casing changed across ADK releases
            from google.adk.tools.mcp_tool import MCPToolset as McpToolset
        from mcp import StdioServerParameters

        return McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "@arizeai/phoenix-mcp@4.0.13",
                        "--baseUrl",
                        settings.phoenix_collector_endpoint,
                        "--apiKey",
                        settings.phoenix_api_key,
                    ],
                ),
                timeout=30.0,
            ),
            # The server exposes 27 tools; keep the catalog set so each
            # Gemini call doesn't carry ~20 unused schemas. Span-level
            # audits go through phoenix_calibration_report instead —
            # raw get-spans output can exceed the model's input window.
            tool_filter=[
                "list-projects",
                "list-datasets",
                "get-dataset-examples",
                "add-dataset-examples",
                "list-experiments-for-dataset",
                "get-experiment-by-id",
            ],
        )
    except Exception as exc:  # pragma: no cover — defensive, never crash boot
        logger.warning("Phoenix MCP toolset unavailable: %s", exc)
        return None


@lru_cache(maxsize=1)
def build_agent():
    """Lazily build the ADK agent so we don't pay import cost at module load."""
    try:
        from google.adk.agents import Agent
    except ImportError as exc:
        raise RuntimeError(
            "google-adk is not installed. Run `uv sync` inside backend/."
        ) from exc

    tools = [
        run_monte_carlo,
        match_team_probabilities,
        team_match_probabilities,
        list_match_results,
        update_priors,
        phoenix_calibration_report,
        health,
    ]
    phoenix_tools = _phoenix_mcp_toolset()
    if phoenix_tools is not None:
        tools.append(phoenix_tools)

    return Agent(
        name="rootin4",
        model=get_settings().rootin4_model,
        description=(
            "Ticket-intelligence agent for World Cup 2026 — predicts who "
            "plays at the seat you already bought."
        ),
        instruction=SYSTEM_PROMPT,
        tools=tools,
    )
