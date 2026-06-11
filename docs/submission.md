# Devpost submission — Rootin4 (Arize track)

> Working copies for the submission form. Paste, adjust, submit before
> **June 11, 2:00 PM PT**. Update the URLs after the Cloud Run deploys.

## Form fields

- **Project name**: Rootin4
- **Tagline**: Know who's really playing at your seat — a self-improving
  Gemini agent for World Cup 2026 ticket-holders.
- **Hosted project URL**: https://rootin4-web-282461311841.europe-west1.run.app (NOT the repo)
- **Code repository**: https://github.com/edouardfoussier/rootin4 (public, MIT)
- **Partner track**: **Arize**
- **New or existing**: New — first commit and all work within the contest
  window (repo history starts May 17, 2026).
- **Team members**: Édouard Foussier (solo)

## Text description

**The problem.** World Cup 2026 tickets are sold by *fixture number*,
months before anyone knows who plays in them. You don't buy
"France vs Brazil" — you buy "Match 87, Round of 32, Kansas City,
slot: Winner Group K vs a third-place wildcard from groups D/E/I/J/L."
Every prediction product answers "who wins the cup?". None answers the
question an actual ticket-holder has: **who will I actually see play at
my seat?**

**What Rootin4 does.** Rootin4 is a Gemini-powered agent that treats the
tournament as a probability machine. Ask it about any of the 104
fixtures ("I have a ticket for match 87 — who will I see?") or any team
("which matches will France play in?") and it answers with calibrated
probabilities, computed live by a Monte Carlo engine that replays the
whole tournament thousands of times per question — all 72 group
matches, FIFA tiebreakers, the best-8-of-12 third-place allocation into
the bracket (solved as a constraint-matching problem over FIFA's
published slot descriptors), every knockout round, and a penalty-shootout
model. The web app exposes the same numbers visually: per-fixture
probability ladders, most-likely matchups, scoreline distributions, and
a streaming chat with the agent itself.

**The self-improving part (Arize track).** Every Gemini call, tool call
and agent step is auto-instrumented with OpenInference and traced to
Arize Phoenix. The twist: the agent is also a *consumer* of its own
observability. It carries the Phoenix MCP server as a toolset (27 tools
— spans, datasets, experiments, prompts) and, when asked to audit
itself, reads its own traces back, looks for systematic bias, and
applies bounded Elo corrections via an `update_priors` tool. Corrections
are logged with their evidence, surface in the UI ("Self-corrections"
panel), and reshape every subsequent simulation. Observe → introspect →
correct, as one loop.

**Tech.** Gemini 2.5 (Flash for the interactive loop, Pro-ready via
env) · Google ADK (code-owned `Agent` + `Runner`, SSE streaming) ·
Arize Phoenix Cloud + OpenInference auto-instrumentation + Phoenix MCP
server over stdio · FastAPI on Cloud Run (Python 3.12, NumPy Monte
Carlo) · Next.js 16 on Cloud Run (standalone container, App Router,
Tailwind v4) · the full WC2026 dataset (Dec 5, 2025 draw, real FIFA
match numbers) shared between the TS frontend and Python backend from a
single source of truth.

**What we learned.** (1) The Round-of-32 third-place allocation is the
gnarliest part of the 48-team format — FIFA's Annex C is effectively a
bipartite matching instance, and modelling it as backtracking over the
schedule's own slot descriptors beat hand-copying a 495-row table.
(2) Agents get dramatically more trustworthy when the observability is
*inside* the loop: making the agent cite Phoenix evidence before it can
touch its priors turned "vibes-based self-improvement" into something
you can audit span by span. (3) ADK's MCPToolset makes a partner
integration feel native — the Phoenix tools sit next to the Monte Carlo
tools in the same agent, same traces.

## Demo video script (target ≤ 2:45)

> Record at 1080p, browser full-screen, dark room voice-over. Have the
> /agent page pre-loaded and one Phoenix tab with traces open.

| t | Shot | Voice-over (FR or EN, ~words) |
|---|------|-------------------------------|
| 0:00–0:20 | Home page, slow scroll to teaser cards | "World Cup 2026 tickets are sold by match number — months before anyone knows who plays. This is Rootin4: an agent that tells you who will actually show up at the seat you already bought." |
| 0:20–0:50 | /match/87 — probability ladder animates | "Match 87, Kansas City. The schedule only says 'Winner of Group K versus a third-place wildcard'. Rootin4 replays the entire tournament five thousand times — group stage, FIFA tiebreakers, the bracket — and turns that riddle into probabilities: Portugal 52%, Colombia 43%." |
| 0:50–1:35 | /agent — click "ticket for match 87" prompt; tool chip + streaming answer on screen | "The same engine is a set of tools for a Gemini agent built on Google ADK. Watch it call the Monte Carlo tool live and answer with the numbers — every figure cites how many simulations back it." |
| 1:35–2:15 | Ask: "Inspect your recent traces in Phoenix. Any bias you should correct?" — phoenix tool chips appear; switch briefly to Phoenix UI showing the trace tree; back to the Self-corrections panel updating | "Every step you just saw was traced to Arize Phoenix. And here's the loop: the agent connects to Phoenix's MCP server, reads its own traces, finds a bias — and corrects its own priors. The correction is logged with evidence, and every probability on the site shifts." |
| 2:15–2:45 | /schedule quick scroll → back to /agent header badges (Gemini · ADK · Phoenix MCP) | "Gemini 2.5, Google ADK, Arize Phoenix — one agent, 104 fixtures, and a model that gets more honest every time you question it. Rootin4: know who's really playing at your seat." |

**Recording checklist**
- [ ] Backend warm (hit /agent once before recording)
- [ ] Phoenix project open in a second tab, traces visible
- [ ] Browser zoom 100%, no bookmarks bar, FR keyboard popups off
- [ ] Under 3:00 hard limit; upload to YouTube as **Public**, title
      "Rootin4 — Google Cloud Rapid Agent Hackathon (Arize track)"

## Compliance self-check (from the organizers' email)

- [x] Gemini invoked at runtime (ADK `Runner` → `gemini-2.5-flash`, verified)
- [x] Google Cloud Agent Builder: Google ADK agent + Runner, deployed on Cloud Run
- [x] Arize MCP server invoked at runtime by the agent (Phoenix MCP toolset)
- [x] No competing AI or cloud services (hosting: Cloud Run; model: Gemini only)
- [x] Repo public + MIT license visible in About
- [ ] Hosted URL live (fill after deploy, test in incognito)
- [ ] Video < 3 min, public on YouTube
- [x] New project, first commit May 17, 2026 (window opened May 5)
