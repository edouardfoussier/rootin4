# DataCamp World Cup 2026 — submission plan

We're entering the [DataCamp FIFA World Cup 2026 Prediction
competition](https://app.datacamp.com/) **not to win the jersey** (we'll
take it) but to use the DataCamp leaderboard as an **external,
auto-graded benchmark** for Rootin4's `/agent` calibration page during
the Arize-track hackathon demo.

That framing is what makes this worth the side-quest.

## Why this is on the Rootin4 critical path

- **Monte Carlo** is F1, we'd build it anyway → 70% overlap
- **Phoenix self-improving loop** needs an honest external grader →
  DataCamp scoring after each match is that grader
- **Demo video moment**: *"Our agent submitted 104 score predictions to
  DataCamp on June 10. After the group stage it ranked 14th of 47. The
  calibration plot you see here is grading against those actual outcomes."*
- **Time hit**: ~6-8h net (everything else was already planned)

## Deadlines

| Date | Event |
|------|-------|
| **May 18, 11:00 CET** | DataCamp competition opens — sign up |
| **June 10** | Internal target: submit DataCamp notebook (1 day buffer) |
| **June 11, 09:00 UTC** | DataCamp absolute deadline (`= 11:00 CET`) |
| **June 11, 14:00 PDT** | Arize hackathon deadline (`= 23:00 CET`, same day) |

## What we predict — and what we punt on

| DataCamp item | Points | Approach | Verdict |
|---|---|---|---|
| **Final score for 104 matches** | 25/match | Elo + Poisson goal model, modal score from 10k sims | ✅ Core |
| **Match winner (group stage)** | included | Derived from score sim | ✅ Core |
| **Knockout bracket: who meets whom** | included | Monte Carlo on full tournament | ✅ Core |
| **Knockout winner per match** | included | Same | ✅ Core |
| **Went to penalties (knockout)** | included | If sim mean outcome is draw at 90′ + small randomness | ✅ Core |
| **Corners per match** | 10 | League/tournament average (~10.4) ± aggressive-style adjustment from team Elo bracket | 🟡 Stub |
| **Yellow cards per match** | 10 | Tournament average (~3.8) ± referee severity stub | 🟡 Stub |
| **Red cards per match** | 5 | Tournament average (~0.15) → predict 0 for everyone (Bayes-optimal under low base rate unless we have referee data) | 🟡 Stub |

Multipliers go up to ×16 for the final. So one well-calibrated late
prediction is worth more than 50 group-stage shots. Accuracy compounds.

## Architecture additions to Rootin4 backend

```text
backend/src/rootin4_agent/
├── tournament/
│   ├── state.py              # load teams, fixtures, Elo from DB / wc2026-data
│   ├── elo.py                # win-probability + Elo updates after sim'd matches
│   ├── poisson.py            # goal model: λ_A, λ_B from Elo diff → score sample
│   ├── group_stage.py        # play all 72 group matches, compute standings,
│   │                         # apply FIFA tiebreakers, pick 8 best 3rd-placers
│   ├── knockout.py           # build the bracket from group output, walk to final
│   ├── simulate.py           # one_full_tournament() → SimResult
│   └── aggregate.py          # run N iterations, fold into per-fixture distributions
├── exports/
│   └── datacamp.py           # turn aggregate distributions into the DataCamp
│                             # notebook predictions (modal score, etc.)
└── tools/
    └── monte_carlo.py        # ADK-exposed tool wrapping aggregate.run()
```

### Modelling choices

**Win probability (single match):**
```python
def win_prob(elo_a: float, elo_b: float, home_a: float = 0.0) -> float:
    """Standard Elo, home_a is a +Elo bonus for the team playing at home."""
    return 1.0 / (1.0 + 10 ** (-((elo_a + home_a) - elo_b) / 400))
```

**Score model (Poisson with skill-tilted means):**
```python
# Base scoring rate: ~2.5 goals per match in modern World Cups,
# split between teams as a function of Elo gap.
BASE_GOALS_PER_MATCH = 2.5

def expected_goals(elo_a: float, elo_b: float, home_a: float = 0.0) -> tuple[float, float]:
    p_a = win_prob(elo_a, elo_b, home_a)
    # tilt: stronger team gets more of the goal share. Calibrate against
    # Euro 2024 + Copa America 2024 in the backtest.
    share_a = 0.40 + 0.55 * p_a   # ~ 0.40 even matchup, ~ 0.78 if p_a = 0.7
    lambda_a = BASE_GOALS_PER_MATCH * share_a
    lambda_b = BASE_GOALS_PER_MATCH * (1 - share_a)
    return lambda_a, lambda_b
```

Then `goals_a ~ Poisson(λ_a)`, `goals_b ~ Poisson(λ_b)`. Tournament
average goals can be tuned per-host-country (CONMEBOL games tend to
score more, etc.) once we backtest.

**Home advantage** (Elo bonus on top of team rating):
- Mexico playing in Mexico: +60–80 (altitude + crowd)
- USA playing in USA: +40
- Canada playing in Canada: +30
- Any team in Mexico City / Guadalajara (altitude penalty for sea-level
  opponents): apply asymmetrically

These get tuned during the backtest, not made up.

**Knockout penalty shoot-outs:** if `goals_a == goals_b` at full time,
sample a winner with `win_prob(elo_a, elo_b) * 0.7 + 0.15` (compresses
toward 50/50 — penalty shoot-outs are notoriously close to coin flips).

**Group stage 3rd-place ranking** (FIFA rule):
1. Points
2. Goal difference
3. Goals scored
4. Disciplinary points (we don't have this in the sim — stub at 0)
5. FIFA ranking (use Elo rank as proxy)

The top 8 of the 12 third-placed teams advance.

## Backtest before submission

Two completed tournaments published their results in 2024:
- **Euro 2024** (51 matches)
- **Copa América 2024** (32 matches)

Workflow:
1. Pre-tournament Elo for each participating team → seed the model.
2. Simulate the tournament 10k times.
3. Compare per-match modal score vs actual.
4. Compute Brier on outcome predictions.
5. Tune `BASE_GOALS_PER_MATCH` + the `share_a` curve coefficients.

Goal: **Brier ≤ 0.21** on outcome (random would be 0.25, 538 hits
~0.20 on past Euros). Below 0.21 means we're modelling, not guessing.

Every backtest result is **logged to Phoenix** with project tag
`rootin4-backtest` so the `/agent` calibration plot is populated *before*
the WC starts.

## DataCamp output format

DataCamp's template (we'll know exactly the structure when we open the
notebook on May 18) is, per the brief:

- One row per match: `match_id, goals_home, goals_away`
- Group stage rows include a `winner` column (we predict from goals)
- Knockout rows include a `winner` + `went_to_penalties` flag
- A separate `corners_total`, `yellow_cards_total`, `red_cards_total`
  per row

Our `exports/datacamp.py` will:

1. Pull the aggregated distributions from `aggregate.run(N=10_000)`
2. For each match, pick the modal `(goals_a, goals_b)` from the empirical
   joint distribution of goals
3. Stub corners / yellow / red with tournament-average estimates
4. Write a CSV / pandas DataFrame the DataCamp notebook can consume

## How the DataCamp leaderboard powers Rootin4's `/agent` page

Once submitted, every match the agent predicts has *three* gradings:

1. **Internal Brier score** (Phoenix log_eval) — already planned for F5
2. **DataCamp scoring** — public, comparative
3. **Self-introspection narrative** — agent reasons on its own miss
   patterns, logged to Phoenix journal

The `/agent` page renders all three, with the **DataCamp leaderboard
rank as the hero metric** — because that's the only one of the three
that the visitor can verify out-of-band. It's the receipt.

## Tonight's todo

- [x] Plan written (this doc)
- [ ] You: check whether you have a DataCamp premium / DC Donates /
      Classrooms login. If not, the cheapest path is a Premium trial
      (DataCamp does 14-day trials). Confirm before Monte Carlo dev
      starts so we don't waste a model on a competition we can't enter.
- [ ] You: register the competition tomorrow morning when it opens at
      11:00 CET, just to grab the slot.
- [ ] Me (W2, May 30-31): build the `tournament/` modules per the
      sketch above, with a working backtest on Euro 2024 + Copa América
      2024, logged to Phoenix.

## What changes in the existing roadmap

The `Voodoo win, Tech:Europe Keynoter` solo-hacker pace from the PRD
becomes:

| Weekend | Was | Now |
|---|---|---|
| W2 (May 30-31) | Monte Carlo + backtest Euro 2024 | + Poisson score model + Copa America backtest |
| W3 (Jun 6-7) | News pipeline + UI polish + `/agent` | + DataCamp notebook generator + first dry-run submission |
| W4 (Jun 10) | Demo recording, hackathon submit | + DataCamp final submission (target Jun 10 23:59 CET) |

Net surcharge: ~6-8h.

## Risk register

- **DataCamp template might require predictions for matches we don't
  fully simulate yet** (e.g. the 3rd-place ranking pool). Mitigation:
  always sample-out a most-likely tournament path during aggregation, so
  every fixture has a most-likely (team_a, team_b) for score prediction.
- **Their notebook environment might not let us paste raw JSON** → fine,
  we'll inline the predictions as Python literals.
- **DataCamp scoring might lag** behind matches → the `/agent` page
  shows whatever's available; we can also fall back to our internal
  Brier if DataCamp's API delays.
- **Premium subscription cost** if no trial — DataCamp Premium runs ~$25
  for a month. Worth it for a Claude Enterprise gift + the demo angle.
