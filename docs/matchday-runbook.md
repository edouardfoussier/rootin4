# Matchday runbook — recording real results

**The system is autonomous.** A Cloud Scheduler job (`rootin4-sync`,
hourly 17:00–07:00 UTC) wakes the ops agent, which reads the public
score wire, records every completed match (scores come from the wire —
the agent only chooses which fixtures to commit), and a deterministic
fallback re-checks behind it. Idempotent, so every hour is also a
retry. You should never *need* this runbook — it exists for the day the
wire is wrong or down.

Audit trail: `GET /api/results`, the activity ticker (kind `sync`), and
the ops-agent traces in Phoenix. Manual override below.

## Tonight — June 11

| Match | Fixture | Record with |
|---|---|---|
| 1 | 🇲🇽 Mexico – 🇿🇦 South Africa (Azteca, 18:00 local) | `./backend/scripts/record-result.sh 1 GOALS_MEX GOALS_RSA` |
| 2 | 🇰🇷 South Korea – 🇨🇿 Czechia | `./backend/scripts/record-result.sh 2 GOALS_KOR GOALS_CZE` |

Example — Mexico wins 2–1:

```bash
./backend/scripts/record-result.sh 1 2 1
```

The response shows the championship-odds move for both teams. Goals are
always in the schedule's order (team A first — the home/first-listed side).

## Knockout matches (June 28 onward)

The schedule only knows slots, so pass the actual teams — and the
shootout winner if it ends level:

```bash
./backend/scripts/record-result.sh 77 2 2 FRA SEN FRA   # FRA on pens
```

## Fixing a typo

```bash
./backend/scripts/record-result.sh --undo 1
./backend/scripts/record-result.sh 1 3 1
```

Note: the rollback and re-record each add a history snapshot — the
sparklines will honestly show the correction.

## Where the token lives

`~/.rootin4-admin-token` (also accepted via `$ROOTIN4_ADMIN_TOKEN`).
Without it, `POST /api/admin/results` answers 401; without the env var
on Cloud Run, 503. The public site and the agent are read-only.

## Quick sanity checks

```bash
curl -s $BACKEND/api/results | python3 -m json.tool          # what's recorded
curl -s $BACKEND/api/history/champions | python3 -m json.tool # snapshot count
```

with `BACKEND=https://rootin4-agent-282461311841.europe-west1.run.app`.
