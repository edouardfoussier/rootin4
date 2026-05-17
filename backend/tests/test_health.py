"""Sanity test — the agent's health tool returns the expected envelope."""

from __future__ import annotations

from rootin4_agent.tools.health import health


def test_health_payload_shape() -> None:
    payload = health()
    assert payload["status"] == "ok"
    assert payload["service"] == "rootin4-agent"
    assert "timestamp" in payload
    assert "tagline" in payload
