"""Stub `health` tool — verifies the agent loop is reachable end-to-end.

Replaced in F1 by the Monte Carlo + probability tools.
"""

from __future__ import annotations

from datetime import UTC, datetime


def health() -> dict[str, str]:
    """Return a simple liveness payload the agent can echo back.

    Returns:
        Mapping with status, timestamp, and a friendly tagline.
    """
    return {
        "status": "ok",
        "service": "rootin4-agent",
        "timestamp": datetime.now(UTC).isoformat(),
        "tagline": "Know who's really playing at your seat.",
    }
