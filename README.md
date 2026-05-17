<div align="center">

# Rootin<sup>*4*</sup>

### Know who&apos;s really playing at your seat.

Every other World Cup tool predicts who wins.
**Rootin4** predicts *who shows up at the seat you already bought.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-Gemini%202.5%20%2B%20Google%20ADK-4285F4)](https://google.github.io/adk-docs/)
[![Observability](https://img.shields.io/badge/observability-Arize%20Phoenix-orange)](https://docs.arize.com/phoenix)
[![Hackathon](https://img.shields.io/badge/Google%20Cloud%20Rapid%20Agent-Arize%20Track-red)](https://rapid-agent.devpost.com/)

</div>

---

## What is this?

Rootin4 is a **Gemini-powered agent** built on **Google ADK**, instrumented with
**Arize Phoenix** via OpenInference, that answers two questions nobody else
answers cleanly for FIFA World Cup 2026 ticket-holders:

1. *"Which of the 104 scheduled matches will my team actually play in?"* — with
   a probability per match.
2. *"For Match #87 in Atlanta on July 4 — who's likely to be playing?"* — with
   a probability per team.

Plus a **self-improving feedback loop**: every prediction is traced in Phoenix,
every completed match becomes an eval, and the agent introspects on its own
calibration via the **Phoenix MCP server** to correct systematic biases between
matches.

## How it differs

|                                  | Bracket sims (worldcuppredictor, bracket2026, …) | Rootin4 |
| -------------------------------- | :----------------------------------------------: | :-----: |
| Predict who wins the tournament  |                        ✅                       |   ✅    |
| **Address each fixture by ID**   |                        ❌                       |   ✅    |
| **Inverse view ("who at seat 87?")** |                    ❌                       |   ✅    |
| News-aware probability updates   |                        ❌                       |   ✅    |
| Self-improving (Phoenix MCP loop)|                        ❌                       |   ✅    |

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16, Vercel)                         │
│   /  /match/[id]  /team/[country]  /agent              │
└─────────────────┬──────────────────────────────────────┘
                  │ REST + SSE
┌─────────────────▼──────────────────────────────────────┐
│  Backend agent (Python, Cloud Run)                     │
│   - Google ADK runtime · Gemini 2.5 Pro                │
│   - OpenInference auto-instrumentation                 │
│   - Phoenix MCP connection (runtime introspection)     │
│                                                        │
│  Tools exposed to the agent (incrementally shipping):  │
│   run_monte_carlo · team_match_probabilities ·         │
│   match_team_probabilities · pull_news ·               │
│   phoenix_query_traces · update_priors                 │
└─────────┬─────────┬─────────┬───────────────────────────┘
          │         │         │
   ┌──────▼──┐  ┌───▼──┐ ┌────▼──────────┐
   │Postgres │  │Tavily│ │Phoenix Cloud  │
   │ + cache │  │      │ │(free tier)    │
   └─────────┘  └──────┘ └───────────────┘
```

## Repo layout

```
.
├── src/                  # Next.js 16 frontend (TypeScript, Tailwind v4, shadcn)
│   ├── app/
│   │   ├── page.tsx                 # Home — hero, search, today's spotlight
│   │   ├── match/[id]/page.tsx      # The hero match page
│   │   └── ...
│   ├── components/
│   └── lib/
├── backend/              # Python 3.12 agent (Google ADK + Phoenix)
│   ├── src/rootin4_agent/
│   │   ├── main.py                  # FastAPI / Cloud Run entrypoint
│   │   ├── agent.py                 # ADK Agent + tools
│   │   ├── instrumentation.py       # OpenInference + Phoenix wiring
│   │   └── tools/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
├── db/
│   ├── schema.sql        # Postgres schema (matches, teams, predictions, …)
│   └── seed.sql          # 12 groups × 4 teams from the Dec 5, 2025 draw
└── README.md
```

## Quickstart

### Frontend

```bash
pnpm install
pnpm dev
# → http://localhost:3000
```

### Backend

```bash
cd backend
uv sync --extra dev
cp .env.example .env  # fill in GOOGLE_API_KEY + PHOENIX_API_KEY
uv run uvicorn rootin4_agent.main:app --reload --port 8080
# → http://localhost:8080/healthz
```

### Database (optional for the scaffold)

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

## Hackathon context

Built for the [Google Cloud Rapid Agent Hackathon](https://rapid-agent.devpost.com/)
on the **Arize track**. The required components are all in place:

- ✅ Powered by Gemini 2.5 (Pro for reasoning, Flash for extraction)
- ✅ Code-owned agent runtime via Google ADK (no visual builder)
- ✅ Arize Phoenix MCP server integration for runtime self-introspection
- ✅ OpenInference auto-instrumentation (Google ADK + GenAI)
- ✅ Deployable to Cloud Run (Dockerfile included)
- ✅ Open-source under MIT

## License

MIT — see [LICENSE](LICENSE).
