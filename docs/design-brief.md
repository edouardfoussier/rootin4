# Claude Design — Brief for Rootin4

> Copy/paste from `## Prompt for Claude Design` to the end. Everything above
> the prompt is internal context for me.

---

## Internal context

- Hackathon: Google Cloud Rapid Agent Hackathon, Arize track. Deadline Jun 11, 2026.
- Repo: https://github.com/edouardfoussier/rootin4
- Stack already in place: Next.js 16 (App Router, Turbopack), Tailwind v4,
  shadcn/ui (Base UI variant). Fonts already loaded via `next/font`:
  Bricolage Grotesque, Instrument Serif (italic), Geist Mono.
- Current palette is a generic editorial cream/ink/rust. The user wants
  **a strong football aesthetic** while staying tasteful (no kitsch).
- Pages to design: `/`, `/match/[id]`, `/schedule`, `/team/[code]`, `/agent`.
- Persona: Marco, 32, Lyon. Bought a Round-of-32 ticket months ago. Doesn't
  know who will play in his seat. Wants a calm, confident, smart UI that
  shows him probabilities, news context, and his own ticket's outlook.

---

## Prompt for Claude Design

You are designing **Rootin4** — a probabilistic ticket-intelligence web app for
fans of the **2026 FIFA World Cup** (USA · Canada · Mexico). Tagline:

> **Know who's really playing at your seat.**
> Every other World Cup tool predicts who wins. Rootin4 predicts who shows
> up at the seat you already bought.

You inherit a working Next.js 16 + Tailwind v4 + shadcn (Base UI) scaffold.
Your job is to **redesign the visual language and the four hero pages** with a
strong football identity that still feels editorial and analytical, not kitschy.

### 1 · Brand essence

Rootin4 lives at the intersection of **fan emotion** and **bayesian rigor**.
The design must say two things at once:

- *"I love this game."* → warmth, ritual, jersey culture, stadium light.
- *"And I have the math."* → calibrated probability bars, clean tables,
  serious typography.

If The Athletic, FourFourTwo, and Phoenix Observability had a baby
designed by a Panini sticker album editor, that's the vibe.

### 2 · Three aesthetic directions to choose from

Pick the one that lands hardest. Show all three on the home page hero in your
first deliverable; then commit to the winner for the rest.

#### Direction A — "Pitch and ink"
A modern editorial sports magazine. Off-white paper background; deep ink
text. The accent comes from **pitch-line geometry** — penalty-box arcs,
center-circle motifs, white lines as section dividers. Color is rationed: one
hot accent (a single team-jersey red or yellow per page) and lots of negative
space. Reference: **The Athletic** long-form features.

#### Direction B — "Trionda" (official 2026 visual)
Bright, optimistic, plural. Three host countries = three accents: warm green
(Mexico), bold red (Canada), saturated blue (USA), unified by a near-black
ink. Soft gradients evoking the official Trionda matchball. Bold display
typography breaks across two lines mid-word for drama. Reference:
**FIFA 2026 brand kit**, color blocks like Adidas keynote slides.

#### Direction C — "Sticker album"
Cream, dusty pastel, gold foil accents. Country badge crests treated like
collected stickers in an album grid. Knockout bracket rendered as a sticker
wall. Probability bars rendered as collected/missing rows. Slightly playful,
but the math always renders with deadly seriousness. Reference: **Panini
World Cup albums** + **The Blizzard magazine** typography.

### 3 · Pages to deliver

For each page, give me a high-fidelity layout (desktop + mobile breakpoints)
and call out the components I'll need to build/replace in shadcn.

1. **`/`** — Home / search.
   - Hero with the tagline + a one-sentence persona pitch.
   - **Search affordance**: "What's your match number?" with autocomplete
     (match #, stadium, city, team).
   - **"Today's matches"** strip (live during the tournament; placeholder of
     near-term fixtures otherwise).
   - **"Mark my ticket"** empty-state CTA that points to the schedule.

2. **`/schedule`** — The full 104-match calendar.
   - Toggle between **by date**, **by round**, **by stadium**, **by group**.
   - Sticky filters: date range, host country (USA/CAN/MEX), team, round.
   - Each row is a clickable match card; the user's own ticket (if marked)
     pulses subtly.
   - Empty-state when filters return nothing.

3. **`/match/[id]`** — The hero page (already partially built; see existing).
   - Header: match #, round, stadium + city, kickoff, slot description.
   - **Who will play here**: vertical bars, top 4 named, "other teams"
     rolled up.
   - **Most likely matchups**: top 5 pair cards with flavor lines.
   - **What moved these probabilities**: news event timeline with an icon
     per event type (injury, suspension, weather, qualification).
   - **Should you go?**: a copywritten verdict tied to the user's preferred
     team if one is set, otherwise generic.
   - **Trace this prediction**: a Phoenix MCP deep-link badge — small but
     visible, the credibility cherry.

4. **`/team/[code]`** — A team's probable matches.
   - Hero with the team crest, group, key stats (Elo, FIFA rank).
   - Sortable table of all 104 matches with `P(team plays)` per row, hidden
     by default for `P = 0`.
   - "Most likely path through the bracket" mini-visualization.

5. **`/agent`** — The trophy page (designed to win the Arize judges).
   - **Calibration plot** (predicted prob vs observed frequency).
   - **Brier-score timeline** (one dot per evaluated match).
   - **Agent journal** — chronological entries where the agent narrates
     what it learned after each match. Each entry deep-links to the
     Phoenix trace.
   - Treat this page as if it were a New York Times data feature.

### 4 · Components to spec

- **Probability bar** (`ProbabilityBar`): label, value, hot/cold state.
  Animate to value on first paint.
- **Match card**: round badge, kickoff, stadium, top-2 most-likely teams.
- **Pair card** (matchup likelihood): two flags, probability, flavor copy.
- **News timeline item**: date, headline, impact delta chip.
- **Calibration chart**: x = predicted prob bucket, y = observed frequency,
  diagonal reference line, colored band for confidence interval.
- **Brier dot plot**: timeline of evaluations.
- **Phoenix trace badge**: small, monospace, mono-rust.
- **"My ticket" indicator**: persistent header chip + ribbon on the saved
  match card.

### 5 · Hard constraints

- **Tailwind v4** via `@theme inline` tokens, no Tailwind config file.
- **shadcn Base UI variant** — keep using their primitives; don't introduce
  Radix or Headless UI.
- **Fonts already wired** via `next/font/google`:
  - `var(--font-bricolage)` — display + sans
  - `var(--font-instrument-serif)` — italic accent (numbers, decorative)
  - `var(--font-geist-mono)` — labels, probabilities, trace IDs
- **Mobile-first**. The demo video will be filmed in portrait sections.
- **Accessibility**: every probability must be readable by a screen reader.
  Color is never the only carrier of meaning.
- **Animation budget**: subtle. One animated section per page max.
- **Dark mode**: support it. Marco's plane is at night and the demo will
  toggle it.

### 6 · Deliverables (in this order)

1. A **moodboard** (4-6 visual references) for the chosen direction.
2. **Token spec**: colors, type ramp, spacing scale, radii, shadows.
   Express everything as Tailwind v4 `@theme inline` CSS variables.
3. **High-fidelity layouts** for the 5 pages above (desktop + mobile),
   either in Figma or as static React components in the repo under
   `src/components/design/`.
4. **One Loom or written walkthrough** explaining your hierarchy choices.
5. **A "before/after"** comparing the current `/match/87` to your new design,
   because that's the page we'll demo on day one.

### 7 · Out of scope

- Building the agent. That's me.
- Building the Monte Carlo engine. That's me.
- Picking team names / actual match data. That's me.
- Anything outside the five pages listed above.

### 8 · What "winning" looks like

When a hackathon judge lands on `/match/87` from cold:

- In 3 seconds they understand the **inverse view** (probabilities of teams
  at this fixture).
- In 10 seconds they feel the **football identity** in the type and color.
- In 30 seconds they click `/agent`, see the calibration plot, and think
  *"this team actually built the bayesian loop."*

That's the bar. Have fun.
