<div align="center">

# Rootin<sup>*4*</sup>

### Know who&apos;s really playing at your seat.

Every other World Cup tool predicts who wins.
**Rootin4** predicts *who shows up at the seat you already bought.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-Gemini%202.5%20%2B%20Google%20ADK-4285F4)](https://google.github.io/adk-docs/)
[![Observability](https://img.shields.io/badge/observability-Arize%20Phoenix-orange)](https://docs.arize.com/phoenix)
[![Hackathon](https://img.shields.io/badge/Google%20Cloud%20Rapid%20Agent-Arize%20Track-red)](https://rapid-agent.devpost.com/)

**Live demo:** [rootin4-web…run.app](https://rootin4-web-282461311841.europe-west1.run.app) · **Agent API:** [rootin4-agent…run.app](https://rootin4-agent-282461311841.europe-west1.run.app/health)

</div>

---

## What is this?

Rootin4 is a **Gemini-powered agent** built on **Google ADK**, instrumented with
**Arize Phoenix** via OpenInference, that answers two questions nobody else
answers cleanly for FIFA World Cup 2026 ticket-holders:

1. *"Which of the 104 scheduled matches will my team actually play in?"* — with
   a probability per match.
2. *"For Match #87 in Kansas City on July 3 — who's likely to be playing?"* — with
   a probability per team.

Under the hood, a pure-Python **Monte Carlo engine** replays the entire
tournament thousands of times per question: all 72 group matches, FIFA
tiebreakers, the 8-best-thirds allocation into the Round of 32 bracket
(solved as a constraint-matching problem over the slot descriptors FIFA
publishes), then every knockout round including a penalty-shootout model.

Plus a **self-improving loop**: every Gemini call and tool invocation is
traced to Phoenix, and the agent itself connects to the **Phoenix MCP
server** at runtime — ask it to audit its own traces and it applies Elo
corrections (`update_priors`) that shift every probability on the site.

## How it differs

|                                  | Bracket sims (worldcuppredictor, bracket2026, …) | Rootin4 |
| -------------------------------- | :----------------------------------------------: | :-----: |
| Predict who wins the tournament  |                        ✅                       |   ✅    |
| **Address each match by ID**   |                        ❌                       |   ✅    |
| **Inverse view ("who at seat 87?")** |                    ❌                       |   ✅    |
| Conversational agent over the model |                     ❌                       |   ✅    |
| Self-improving (Phoenix MCP loop)|                        ❌                       |   ✅    |

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  Frontend — Next.js 16 on Cloud Run                    │
│   /  /schedule  /match/[id]  /agent (streaming chat)   │
│   API routes proxy SSE + JSON to the agent backend     │
└─────────────────┬──────────────────────────────────────┘
                  │ REST + SSE
┌─────────────────▼──────────────────────────────────────┐
│  Agent backend — Python 3.12 on Cloud Run              │
│   - Google ADK runtime · Gemini 2.5 (Flash default)    │
│   - OpenInference auto-instrumentation → Phoenix       │
│   - FastAPI: POST /agent · GET /agent/stream (SSE)     │
│                                                        │
│  Tools exposed to the agent:                           │
│   run_monte_carlo · match_team_probabilities ·         │
│   team_match_probabilities · update_priors ·           │
│   phoenix_calibration_report (token-safe trace audit)  │
│   + Phoenix MCP toolset (projects·datasets·experiments)│
└─────────┬──────────────────────┬───────────────────────┘
          │                      │ MCP (stdio)
   ┌──────▼─────────┐   ┌────────▼───────────┐
   │ Monte Carlo    │   │ @arizeai/phoenix-  │
   │ engine         │   │ mcp → Phoenix Cloud│
   │ (data.json =   │   │ (traces · datasets │
   │ real WC2026    │   │  · experiments)    │
   │ schedule)      │   └────────────────────┘
   └────────────────┘
```

The 48 teams, 16 stadiums and 104 matches (December 5, 2025 draw, real
FIFA match numbers and knockout slot descriptors) live in one dataset,
`src/lib/wc2026-data.ts`, mirrored to the backend as `data.json` — the
TS UI and the Python sim can never disagree about a structural fact.

## Repo layout

```
.
├── src/                  # Next.js 16 frontend (TypeScript, Tailwind v4, shadcn)
│   ├── app/
│   │   ├── page.tsx                 # Home — hero, live teasers
│   │   ├── agent/page.tsx           # Streaming agent chat + Phoenix loop panel
│   │   ├── match/[id]/page.tsx      # Live per-match probabilities
│   │   └── api/                     # SSE / JSON proxies to the backend
│   ├── components/
│   └── lib/
├── backend/              # Python 3.12 agent (Google ADK + Phoenix)
│   ├── src/rootin4_agent/
│   │   ├── main.py                  # FastAPI / Cloud Run entrypoint
│   │   ├── agent.py                 # ADK Agent + tools + Phoenix MCP toolset
│   │   ├── instrumentation.py       # OpenInference + Phoenix wiring
│   │   ├── tools/monte_carlo.py     # Agent tools + priors overlay
│   │   └── tournament/              # The Monte Carlo engine
│   │       ├── data.json            # WC2026 dataset (mirror of the TS source)
│   │       ├── group_stage.py       # 72 matches + FIFA tiebreakers
│   │       ├── knockout.py          # bracket walk + 3rd-place matching + pens
│   │       └── aggregate.py         # N-run distributions per match
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile                   # python:3.12 + node (Phoenix MCP server)
├── Dockerfile            # Frontend standalone image for Cloud Run
├── datacamp-predictions/ # 104 predictions exported for DataCamp's WC26 competition
└── README.md
```

## Quickstart

### Backend (the agent)

```bash
cd backend
uv sync --extra dev
cp .env.example .env   # set GOOGLE_API_KEY (required) + PHOENIX_API_KEY (optional)
uv run uvicorn rootin4_agent.main:app --port 8080
# → http://localhost:8080/healthz
# → curl -X POST localhost:8080/agent -H 'content-type: application/json' \
#        -d '{"prompt": "Who plays at match 87?"}'
```

Without `PHOENIX_API_KEY` the agent still runs — you lose remote tracing
and the MCP introspection tools, nothing else. The Phoenix MCP server is
spawned via `npx` at runtime, so Node ≥ 20 is needed for the full loop.

### Frontend

```bash
pnpm install
BACKEND_URL=http://localhost:8080 pnpm dev
# → http://localhost:3000  (the /agent page is the demo centrepiece)
```

### Tests

```bash
cd backend && uv run pytest && uv run ruff check src
pnpm lint && pnpm build
```

### Deploy (Cloud Run)

```bash
# Backend
cd backend && gcloud run deploy rootin4-agent --source . \
  --region europe-west1 --allow-unauthenticated \
  --env-vars-file your-env.yaml

# Frontend
gcloud run deploy rootin4-web --source . \
  --region europe-west1 --allow-unauthenticated \
  --set-env-vars BACKEND_URL=<backend service URL>
```

## The self-improving loop (Arize track)

1. **Trace** — OpenInference auto-instruments every Gemini call, tool
   call and agent step; spans stream to Phoenix Cloud.
2. **Introspect** — ask it *"any bias you should correct?"* and the
   agent reads its own telemetry: `phoenix_calibration_report` folds its
   recent spans into a compact audit, and the Phoenix MCP toolset
   (`list-projects`, `list-datasets`, `get-dataset-examples`, …) gives
   it the catalog.
3. **Correct** — when the evidence shows a systematic miss, the agent
   calls `update_priors(team, elo_delta, reason)`. The correction is
   logged, surfaces in the UI (`/agent` → Self-corrections), and every
   subsequent Monte Carlo run prices it in.

## Modelling notes

- **Win probability**: standard Elo logistic with host-nation bonuses
  (MEX +70, USA +40, CAN +30).
- **Scorelines**: independent Poissons with means tilted by Elo gap,
  calibrated to ~2.55 goals/match (modern World Cup average).
- **Group ranking**: points → goal difference → goals scored → Elo (as
  the FIFA-ranking proxy). Best 8 of 12 third-placed teams advance.
- **Third-place allocation**: FIFA's Annex C constrains which group's
  third can land in which R32 slot; we solve the resulting assignment
  by backtracking (most-constrained slot first) — deterministic and
  always consistent with the published bracket constraints.
- **Penalty shootouts**: `p = 0.7 × p_elo + 0.15` — shootouts are
  nearly coin flips, whoever you are.

## License

MIT — see [LICENSE](LICENSE).
