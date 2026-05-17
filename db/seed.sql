-- Rootin4 seed data
-- 12 groups × 4 teams = 48 teams. Composition reflects the FIFA World Cup
-- 2026 draw held in Washington D.C. on December 5, 2025.
-- Source: NBC Sports / FOX Sports / olympics.com recap of the official draw.
--
-- Elo seeds are *approximate* pre-tournament values; they get refreshed by
-- the `update_elo_ratings` agent task pulling eloratings.net during the
-- tournament. Treat them as v0 priors.

BEGIN;

-- Groups
INSERT INTO groups (letter) VALUES
    ('A'), ('B'), ('C'), ('D'), ('E'), ('F'),
    ('G'), ('H'), ('I'), ('J'), ('K'), ('L')
ON CONFLICT DO NOTHING;

-- Teams (code, name, flag, group, fifa_rank_2025_estimate, elo_seed_estimate)
INSERT INTO teams (code, name, flag_emoji, group_letter, fifa_rank_2025, elo_seed) VALUES
    -- Group A (seed order = draw order from FIFA on Dec 5, 2025)
    ('MEX', 'Mexico',          '🇲🇽', 'A', 19, 1815),
    ('RSA', 'South Africa',    '🇿🇦', 'A', 56, 1640),
    ('KOR', 'South Korea',     '🇰🇷', 'A', 23, 1800),
    ('CZE', 'Czechia',         '🇨🇿', 'A', 41, 1690),

    -- Group B
    ('CAN', 'Canada',          '🇨🇦', 'B', 30, 1730),
    ('SUI', 'Switzerland',     '🇨🇭', 'B', 17, 1825),
    ('QAT', 'Qatar',           '🇶🇦', 'B', 52, 1685),
    ('BIH', 'Bosnia-Herzegovina', '🇧🇦', 'B', 71, 1640),

    -- Group C
    ('BRA', 'Brazil',          '🇧🇷', 'C',  5, 2030),
    ('MAR', 'Morocco',         '🇲🇦', 'C', 13, 1850),
    ('SCO', 'Scotland',        '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 38, 1750),
    ('HAI', 'Haiti',           '🇭🇹', 'C', 84, 1560),

    -- Group D
    ('USA', 'United States',   '🇺🇸', 'D', 16, 1810),
    ('PAR', 'Paraguay',        '🇵🇾', 'D', 44, 1685),
    ('AUS', 'Australia',       '🇦🇺', 'D', 26, 1770),
    ('TUR', 'Türkiye',         '🇹🇷', 'D', 28, 1750),

    -- Group E
    ('GER', 'Germany',         '🇩🇪', 'E', 10, 1985),
    ('ECU', 'Ecuador',         '🇪🇨', 'E', 24, 1825),
    ('CIV', 'Ivory Coast',     '🇨🇮', 'E', 39, 1780),
    ('CUW', 'Curaçao',         '🇨🇼', 'E', 86, 1490),

    -- Group F
    ('NED', 'Netherlands',     '🇳🇱', 'F',  6, 1990),
    ('JPN', 'Japan',           '🇯🇵', 'F', 18, 1820),
    ('TUN', 'Tunisia',         '🇹🇳', 'F', 40, 1690),
    ('SWE', 'Sweden',          '🇸🇪', 'F', 36, 1755),

    -- Group G
    ('BEL', 'Belgium',         '🇧🇪', 'G',  8, 1955),
    ('IRN', 'Iran',            '🇮🇷', 'G', 20, 1790),
    ('EGY', 'Egypt',           '🇪🇬', 'G', 35, 1740),
    ('NZL', 'New Zealand',     '🇳🇿', 'G', 89, 1580),

    -- Group H
    ('ESP', 'Spain',           '🇪🇸', 'H',  2, 2065),
    ('URU', 'Uruguay',         '🇺🇾', 'H', 14, 1935),
    ('KSA', 'Saudi Arabia',    '🇸🇦', 'H', 60, 1700),
    ('CPV', 'Cape Verde',      '🇨🇻', 'H', 70, 1610),

    -- Group I
    ('FRA', 'France',          '🇫🇷', 'I',  3, 2045),
    ('SEN', 'Senegal',         '🇸🇳', 'I', 21, 1810),
    ('NOR', 'Norway',          '🇳🇴', 'I', 31, 1830),
    ('IRQ', 'Iraq',            '🇮🇶', 'I', 58, 1610),

    -- Group J
    ('ARG', 'Argentina',       '🇦🇷', 'J',  1, 2125),
    ('ALG', 'Algeria',         '🇩🇿', 'J', 33, 1750),
    ('AUT', 'Austria',         '🇦🇹', 'J', 22, 1780),
    ('JOR', 'Jordan',          '🇯🇴', 'J', 64, 1565),

    -- Group K
    ('POR', 'Portugal',        '🇵🇹', 'K',  7, 2020),
    ('COD', 'DR Congo',        '🇨🇩', 'K', 53, 1640),
    ('UZB', 'Uzbekistan',      '🇺🇿', 'K', 57, 1670),
    ('COL', 'Colombia',        '🇨🇴', 'K', 12, 1940),

    -- Group L
    ('ENG', 'England',         '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L',  4, 1990),
    ('CRO', 'Croatia',         '🇭🇷', 'L', 11, 1920),
    ('PAN', 'Panama',          '🇵🇦', 'L', 42, 1640),
    ('GHA', 'Ghana',           '🇬🇭', 'L', 73, 1720)
ON CONFLICT (code) DO NOTHING;

-- The canonical schedule lives in `src/lib/wc2026-data.ts` (single source
-- of truth for the frontend). A follow-up migration / ingest script will
-- mirror it into the `matches` table once F1 needs DB-backed reads.
--
-- For now we materialise just Match #87 — the persona example referenced
-- across the demo and the README.
INSERT INTO matches (
    id, round, stadium, city, host_country, kickoff_utc, slot_description
) VALUES (
    87,
    'Round of 32',
    'Arrowhead Stadium',
    'Kansas City, MO',
    'USA',
    '2026-07-03 23:00:00+00',
    'Winner Group K vs third-place team from Group D/E/I/J/L'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
