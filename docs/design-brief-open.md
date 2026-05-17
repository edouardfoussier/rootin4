# Rootin4 — Open design brief

> A second, **style-agnostic** brief. Everything below `## The brief` is the
> prompt itself — copy/paste it into Claude Design, Lovable, v0, or any
> generative design tool. The visual identity, color system, typography,
> motion language, and overall "feel" are entirely up to the tool. We're
> asking the model to invent the look, not match a reference.

---

## The brief

You're designing **Rootin4** — a web app for fans of the **2026 FIFA World
Cup** (hosted across the United States, Canada, and Mexico from June 11 to
July 19, 2026).

**Tagline:** *"Know who's really playing at your seat."*

### What the product does

Every other World Cup product predicts who wins the tournament. Rootin4
predicts who actually shows up at the seat you already bought.

For each of the 32 knockout-stage fixtures — most of which were assigned to
ticket-holders months before the bracket was decided — Rootin4 computes:

- a **probability per team** that they will play in that fixture,
- a **probability per likely pairing** (top 5),
- and a short list of **news events** that recently shifted those numbers.

Behind the scenes, an autonomous agent simulates the rest of the tournament
many thousands of times, reads news to update its priors, evaluates its own
past predictions after each completed match, identifies its own systematic
biases, and corrects itself for the next round.

### Who it's for

**Marco**, 32, lives in Lyon, France. He bought a Round-of-32 ticket through
FIFA's random draw eight months before the tournament. The fixture on his
ticket says something like *"Winner Group K vs third-place team from Group
D/E/I/J/L"* — he can't picture what that means for who will actually be on
the pitch.

He wants to know:

1. Is my preferred team likely to play here?
2. If not, what are the realistic matchups?
3. Is it still worth flying to the city?

Marco is reasonably literate but not a stats nerd. He wants something calm,
confident, and intelligent that turns the math into a decision he can act on.

### What's known vs. what's predicted

**Known** (already decided by FIFA):

- 48 national teams, drawn into 12 groups of 4 (groups A–L) on December 5, 2025
- 104 fixtures across 16 stadiums in 3 host countries
- Every fixture's date, kickoff, stadium, and slot description
  (e.g. "Winner Group A", "Runner-up Group J", "3rd-place from Group D/E/I/J/L")
- Group-stage pairings (because the draw produced them)

**Predicted** by the agent:

- Knockout-stage participants per fixture, with a probability per team
- Top 5 most likely pairings for each knockout fixture
- The impact of recent news on those probabilities
- The agent's own calibration history — how trustworthy past predictions
  turned out to be

### Pages

1. **Home (`/`)** — A landing page that explains the product to a first-time
   visitor and lets them get to their match in one move. They can search by
   match number, team, stadium, city, or date. If they marked a ticket on a
   previous visit, that ticket should be the most prominent thing on the
   page. Otherwise, prompt them to find their match.

2. **Schedule (`/schedule`)** — The full 104-match calendar. Users can group
   by date, by round, or by stadium, and filter by host country, round, and
   team. Each item links to the match page. Users can mark "this is my
   ticket" on any match; that match should stand out across the rest of the
   app.

3. **Match (`/match/[id]`)** — The hero page. For a single fixture, show:
   - **Header**: match number, round, stadium, city, kickoff, slot
     description, group (if it's a group-stage match)
   - **Who will play here**: probability bars for the top 4–6 teams, with a
     roll-up row for the long tail
   - **Most likely matchups**: top 5 plausible pairings, each with a
     one-line flavor description
   - **What moved these probabilities**: a small chronological feed of news
     events that recently shifted the numbers, each with the team it
     affected and a +/- delta
   - **Should you go?**: a single-sentence verdict that gets warmer or
     cooler depending on whether the user's preferred team is likely to
     play
   - **Trace this prediction**: an unobtrusive link out to the agent's
     reasoning trace — the receipt that proves the numbers aren't vibes

4. **Team (`/team/[code]`)** — A team's full path through the tournament.
   Show the team's flag/crest, group, and a couple of key stats. Below, a
   sortable table of every fixture with the probability that this team
   plays in each (zero-probability rows hidden by default). Optionally, a
   small visualization of the team's most likely bracket path.

5. **Agent (`/agent`)** — The page that earns the product its credibility.
   It shows what the agent has learned about itself. Three sections:
   - A **calibration plot** — predicted-probability bucket on one axis,
     observed frequency on the other, with a diagonal reference line for
     perfect calibration
   - A **Brier-score timeline** — one dot per evaluated match, so the
     visitor can see whether the agent is improving over time
   - An **agent journal** — chronological narrative entries, one per
     recently evaluated match, in which the agent explains what bias it
     detected and what prior it adjusted. Each entry deep-links to the
     underlying reasoning trace.

### Components the data demands

Beyond the pages, these recur enough that they deserve a definition:

- **Probability bar** — label, value, animated on first paint, can be
  highlighted or dimmed depending on emphasis
- **Match card** — round, kickoff, stadium, and either the two teams
  (if known) or the slot descriptions (if knockout-undecided)
- **Pair card** — two teams + a probability + a one-line flavor copy
- **News-event item** — date, headline, the team it impacts, a +/- delta
- **Calibration chart** — scatter or line plot, with a reference diagonal
- **Brier dot plot** — timeline along x, score along y, lower = better
- **Trace badge** — a small, easy-to-overlook link to a reasoning trace
- **"My ticket" indicator** — a persistent chip/ribbon that surfaces the
  saved match on every relevant view

### Hard constraints

- **Mobile-first.** The product's demo video will be shot in portrait. The
  phone layout matters more than the desktop one.
- **Accessibility.** Every probability and every state change must be
  conveyed by something other than color alone — text, shape, icon, or
  position.
- **Dark mode** must be supported.
- **No sign-up, no accounts.** A user's marked ticket lives in
  `localStorage`; nothing more is persisted.
- **Animation budget is small.** Use it for one moment of delight per page,
  not more.
- **English only** for now. The tagline, copy, and labels are in English.

### What "winning" looks like

When a first-time visitor lands on the match page:

- In 3 seconds, they understand the inverse view — that this product tells
  them who is most likely to play **at this fixture**, not who is most
  likely to win the cup.
- In 10 seconds, they feel something about the product's identity, whatever
  identity you decide to give it.
- In 30 seconds, they've clicked through to the agent page and walked away
  thinking: "this isn't a wrapper around an LLM — it's a system that
  actually learns."

That's the bar. The visual identity, the color system, the typography,
the motion language, the iconography, the overall feel — all of it is
yours to invent. Surprise me.

### What you do **not** need to design

- The Monte Carlo engine
- The agent's reasoning loop
- The data ingestion / news pipeline
- Any team names, stadium names, or fixture data — that's wired separately
- Authentication, payments, resale integrations
