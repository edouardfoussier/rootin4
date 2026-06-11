"""Compact Phoenix span introspection for the self-improvement loop.

The Phoenix MCP `get-spans` tool returns raw span bodies — including
full LLM prompts — which can exceed Gemini's input window in one call.
This local tool queries the same Phoenix REST API but folds the spans
into a small calibration report the model can actually reason over.
The MCP toolset stays attached for catalog operations (projects,
datasets, experiments); this is the token-safe spans path.
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime

import httpx

from ..settings import get_settings

logger = logging.getLogger(__name__)


def phoenix_calibration_report(limit: int = 25) -> dict:
    """Summarize the agent's recent Phoenix traces (compact, token-safe).

    Fetches the most recent spans from the agent's own Phoenix project
    and returns an aggregate view: which tools were called, latencies,
    errors, and what the recent questions were about. Use this when
    auditing your own behaviour or hunting for systematic bias; use the
    phoenix MCP tools for datasets/experiments/projects.

    Args:
        limit: How many recent spans to fold in (max 50).

    Returns:
        Aggregated trace statistics — never raw span payloads.
    """
    settings = get_settings()
    if not settings.phoenix_api_key:
        return {"error": "Phoenix is not configured (PHOENIX_API_KEY unset)."}

    base = settings.phoenix_collector_endpoint.rstrip("/")
    headers = {"Authorization": f"Bearer {settings.phoenix_api_key}"}
    # Span bodies are heavy server-side; keep the page small so the
    # endpoint answers fast and the report stays compact.
    limit = max(1, min(int(limit), 15))

    try:
        with httpx.Client(timeout=30.0) as client:
            projects = client.get(
                f"{base}/v1/projects", headers=headers
            ).raise_for_status().json()["data"]
            project_id = next(
                (p["id"] for p in projects
                 if p["name"] == settings.phoenix_project_name),
                None,
            )
            if project_id is None:
                return {
                    "error": f"No '{settings.phoenix_project_name}' project in "
                    f"Phoenix yet — traces appear after the first agent turns.",
                    "projects": [p["name"] for p in projects],
                }
            spans = client.get(
                f"{base}/v1/projects/{project_id}/spans",
                headers=headers,
                params={"limit": limit},
            ).raise_for_status().json().get("data", [])
    except httpx.HTTPError as exc:
        logger.warning("phoenix introspection failed: %s", exc)
        return {"error": f"Phoenix REST call failed: {exc}"}

    kinds: Counter[str] = Counter()
    statuses: Counter[str] = Counter()
    tool_calls: Counter[str] = Counter()
    questions: list[str] = []
    latencies_ms: list[float] = []

    for span in spans:
        name = span.get("name", "?")
        kinds[name] += 1
        statuses[span.get("status_code", "UNSET")] += 1
        attrs = span.get("attributes", {}) or {}
        if name.startswith("execute_tool") or attrs.get("openinference.span.kind") == "TOOL":
            tool_calls[attrs.get("tool.name", name)] += 1
        value = attrs.get("input.value")
        if isinstance(value, str) and 0 < len(value) < 200 and len(questions) < 5:
            questions.append(value)
        start, end = span.get("start_time"), span.get("end_time")
        if start and end:
            try:
                dt = (
                    datetime.fromisoformat(end) - datetime.fromisoformat(start)
                ).total_seconds() * 1000
                latencies_ms.append(dt)
            except ValueError:
                pass

    return {
        "project": settings.phoenix_project_name,
        "spans_analyzed": len(spans),
        "span_kinds": dict(kinds.most_common(8)),
        "status_codes": dict(statuses),
        "tools_invoked": dict(tool_calls.most_common(8)),
        "recent_inputs_sample": questions,
        "latency_ms": {
            "p50": round(sorted(latencies_ms)[len(latencies_ms) // 2], 1)
            if latencies_ms
            else None,
            "max": round(max(latencies_ms), 1) if latencies_ms else None,
        },
        "note": (
            "Aggregated from the agent's own OpenInference traces in Arize "
            "Phoenix. Raw span bodies are deliberately not returned."
        ),
    }
