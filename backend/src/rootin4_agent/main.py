"""FastAPI entrypoint — Cloud Run target.

Two endpoints to start with:
    GET  /healthz   → liveness check
    POST /agent     → invoke the ADK agent with a free-form prompt

Tracing is wired automatically via `instrumentation.setup_observability()`
on app startup, so any LLM/tool call shows up in Phoenix.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from .instrumentation import setup_observability
from .settings import get_settings
from .tools.health import health

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class AgentRequest(BaseModel):
    """Payload for /agent."""

    prompt: str
    session_id: str | None = None


class AgentResponse(BaseModel):
    """Response envelope for /agent."""

    output: str
    trace_url: str | None = None
    metadata: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_observability()
    logger.info("rootin4-agent ready (env=%s)", get_settings().rootin4_env)
    yield


app = FastAPI(
    title="Rootin4 Agent",
    version="0.1.0",
    description=(
        "Code-owned Gemini agent on Google ADK, instrumented with Phoenix. "
        "Built for the Google Cloud Rapid Agent Hackathon — Arize track."
    ),
    lifespan=lifespan,
)


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    """Liveness probe — returns the same payload as the agent's `health` tool."""
    return health()


@app.post("/agent", response_model=AgentResponse)
async def invoke_agent(request: AgentRequest) -> AgentResponse:
    """Stub agent invocation.

    F1 will replace this with a real `Runner.run_async()` call against the ADK
    agent. For now we just confirm we can boot, trace, and route a request.
    """
    return AgentResponse(
        output=(
            "Agent scaffold is live. Replace this stub once the ADK Runner is "
            "wired with Monte Carlo + Phoenix MCP tools."
        ),
        trace_url=None,
        metadata={"prompt_preview": request.prompt[:120]},
    )


def run() -> None:
    """`rootin4` console script entrypoint — launches uvicorn for local dev."""
    import uvicorn

    uvicorn.run(
        "rootin4_agent.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
    )
