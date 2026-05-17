-- Rootin4 — World Cup 2026 ticket-intelligence agent
-- Postgres schema (v0.1, scaffold).
--
-- Designed for Neon / Supabase free tier. No Postgres-specific extensions
-- required beyond the standard build. Migrations stay flat for the hackathon
-- timeline; we'll graduate to a real migration tool (Alembic / drizzle) only
-- if v1 ships and we keep building.

BEGIN;

-- ---------------------------------------------------------------------------
-- Groups & teams
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
    letter      CHAR(1) PRIMARY KEY CHECK (letter ~ '^[A-L]$')
);

CREATE TABLE IF NOT EXISTS teams (
    code            VARCHAR(3) PRIMARY KEY,
    name            TEXT NOT NULL,
    flag_emoji      TEXT,
    group_letter    CHAR(1) NOT NULL REFERENCES groups(letter),
    fifa_rank_2025  INTEGER,
    -- Approximate pre-tournament Elo seed; refreshed weekly by an agent task.
    elo_seed        INTEGER
);

CREATE INDEX IF NOT EXISTS teams_group_idx ON teams(group_letter);

-- ---------------------------------------------------------------------------
-- Matches (104 in total: 72 group-stage + 32 knockout)
-- ---------------------------------------------------------------------------

CREATE TYPE match_round AS ENUM (
    'Group',
    'Round of 32',
    'Round of 16',
    'Quarter-final',
    'Semi-final',
    'Third-place',
    'Final'
);

CREATE TABLE IF NOT EXISTS matches (
    id              INTEGER PRIMARY KEY,          -- FIFA match number (1-104)
    round           match_round NOT NULL,
    stadium         TEXT NOT NULL,
    city            TEXT NOT NULL,
    host_country    VARCHAR(3) NOT NULL,          -- USA / CAN / MEX
    kickoff_utc     TIMESTAMPTZ NOT NULL,
    -- Pre-knockout, both team codes are known. For knockout, the slot
    -- description encodes how the participants are derived
    -- (e.g. "Winner Group J vs Runner-up Group I").
    team_a_code     VARCHAR(3) REFERENCES teams(code),
    team_b_code     VARCHAR(3) REFERENCES teams(code),
    slot_description TEXT
);

CREATE INDEX IF NOT EXISTS matches_round_idx ON matches(round);
CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches(kickoff_utc);

-- ---------------------------------------------------------------------------
-- Live Elo ratings (refreshed during the tournament)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS elo_ratings (
    id              BIGSERIAL PRIMARY KEY,
    team_code       VARCHAR(3) NOT NULL REFERENCES teams(code),
    rating          INTEGER NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          TEXT NOT NULL DEFAULT 'eloratings.net'
);

CREATE INDEX IF NOT EXISTS elo_ratings_team_idx ON elo_ratings(team_code, fetched_at DESC);

-- ---------------------------------------------------------------------------
-- Probability predictions (one row per Monte Carlo run × team × match)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS predictions (
    id              BIGSERIAL PRIMARY KEY,
    match_id        INTEGER NOT NULL REFERENCES matches(id),
    team_code       VARCHAR(3) NOT NULL REFERENCES teams(code),
    probability     NUMERIC(6, 5) NOT NULL CHECK (probability BETWEEN 0 AND 1),
    iterations      INTEGER NOT NULL,
    model_version   TEXT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Optional: snapshot of the trace ID so /agent can deep-link into Phoenix.
    phoenix_trace_id TEXT
);

CREATE INDEX IF NOT EXISTS predictions_match_idx ON predictions(match_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS predictions_team_idx ON predictions(team_code, computed_at DESC);

-- ---------------------------------------------------------------------------
-- News events (used by F3 — pulled & summarised by the agent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_events (
    id              BIGSERIAL PRIMARY KEY,
    match_id        INTEGER REFERENCES matches(id),
    impact_team     VARCHAR(3) REFERENCES teams(code),
    headline        TEXT NOT NULL,
    detail          TEXT,
    delta_pct       NUMERIC(5, 2),
    source_url      TEXT,
    occurred_at     DATE,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_events_match_idx ON news_events(match_id);

-- ---------------------------------------------------------------------------
-- Indicative resale prices (manually maintained for top fixtures)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_indicative_prices (
    match_id        INTEGER PRIMARY KEY REFERENCES matches(id),
    low_usd         INTEGER NOT NULL,
    high_usd        INTEGER NOT NULL,
    note            TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
