# rootin4-agent

The Python backend for **Rootin4** — a code-owned Gemini agent built on
Google ADK, instrumented with Arize Phoenix via OpenInference, and deployable
to Cloud Run.

Built for the [Google Cloud Rapid Agent Hackathon](https://rapid-agent.devpost.com/)
— Arize track.

## Quickstart

```bash
# 1. Install Python 3.12 + deps with uv
uv sync

# 2. Copy env template and fill in keys
cp .env.example .env

# 3. Run the agent locally (health endpoint on :8080)
uv run uvicorn rootin4_agent.main:app --reload --port 8080
```

## Architecture

```
rootin4_agent/
├── main.py                # FastAPI entrypoint (Cloud Run target)
├── agent.py               # ADK agent definition + tool registration
├── instrumentation.py     # OpenInference + Phoenix wiring
├── settings.py            # Pydantic settings
└── tools/
    └── health.py          # Stub tool — replaced by Monte Carlo + Phoenix MCP tools
```

## Tools (planned)

| Tool                              | Status   | Source                          |
| --------------------------------- | -------- | ------------------------------- |
| `health()`                        | ✅ stub  | `tools/health.py`               |
| `run_monte_carlo(iterations)`     | TODO     | `tools/monte_carlo.py`          |
| `team_match_probabilities(code)`  | TODO     | `tools/probabilities.py`        |
| `match_team_probabilities(id)`    | TODO     | `tools/probabilities.py`        |
| `pull_news(match_id, hours)`      | Stretch  | `tools/news.py`                 |
| `phoenix_query_traces(filter)`    | TODO     | via Phoenix MCP                 |
| `update_priors(team, delta)`      | TODO     | `tools/priors.py`               |

## Environment variables

See `.env.example` — at minimum you need `GOOGLE_API_KEY` and, for tracing,
`PHOENIX_API_KEY` (free tier: https://app.phoenix.arize.com).
