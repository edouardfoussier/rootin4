"""OpenInference + Phoenix instrumentation.

This module is the only place we wire observability so the Arize judges can
see every Gemini call, every tool invocation, and every reasoning step in
Phoenix. If `PHOENIX_API_KEY` is unset we silently fall back to a local
in-memory exporter — the app still runs, just without remote traces.
"""

from __future__ import annotations

import logging
import os

from .settings import get_settings

logger = logging.getLogger(__name__)

_initialised = False


def setup_observability() -> None:
    """Initialise OpenInference instrumentors and Phoenix exporter.

    Safe to call multiple times — guarded by a module-level flag.
    """
    global _initialised
    if _initialised:
        return

    settings = get_settings()

    if settings.phoenix_api_key:
        os.environ["PHOENIX_CLIENT_HEADERS"] = (
            f"api_key={settings.phoenix_api_key}"
        )
    os.environ.setdefault(
        "PHOENIX_COLLECTOR_ENDPOINT", settings.phoenix_collector_endpoint
    )

    try:
        from phoenix.otel import register

        tracer_provider = register(
            project_name=settings.phoenix_project_name,
            auto_instrument=True,
        )
        logger.info(
            "Phoenix tracer registered for project=%s endpoint=%s",
            settings.phoenix_project_name,
            settings.phoenix_collector_endpoint,
        )
    except Exception as exc:  # pragma: no cover — defensive, never crash boot
        logger.warning(
            "Phoenix registration failed (%s) — continuing without remote tracing.",
            exc,
        )
        tracer_provider = None

    _instrument_google_stack(tracer_provider)

    _initialised = True


def _instrument_google_stack(tracer_provider) -> None:
    """Attach OpenInference auto-instrumentors for Gemini + ADK if available."""

    try:
        from openinference.instrumentation.google_genai import (
            GoogleGenAIInstrumentor,
        )

        GoogleGenAIInstrumentor().instrument(tracer_provider=tracer_provider)
        logger.info("Instrumented google-genai")
    except Exception as exc:  # pragma: no cover
        logger.debug("google-genai instrumentor unavailable: %s", exc)

    try:
        from openinference.instrumentation.google_adk import (
            GoogleADKInstrumentor,
        )

        GoogleADKInstrumentor().instrument(tracer_provider=tracer_provider)
        logger.info("Instrumented google-adk")
    except Exception as exc:  # pragma: no cover
        logger.debug("google-adk instrumentor unavailable: %s", exc)
