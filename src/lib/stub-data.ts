/**
 * Stub prediction layer.
 *
 * Until F1 (the Monte Carlo engine in `backend/`) lands, we hand-author one
 * prediction per match we want to demo. Anything that touches probabilities
 * goes through this module so the rest of the UI stays stable when the real
 * `predictions` table starts driving it.
 *
 * Real schedule data (stadium, date, slot description, etc.) lives in
 * `wc2026-data.ts` — never in this file.
 */

import {
  MATCHES_BY_ID,
  TEAMS,
  type Match,
  type Team,
  type TeamCode,
} from "./wc2026-data";

export type TeamProbability = {
  team: Team;
  probability: number;
};

export type PairProbability = {
  teamA: Team;
  teamB: Team;
  probability: number;
  flavor: string;
};

export type NewsEvent = {
  id: string;
  date: string;
  headline: string;
  detail: string;
  impactTeam: TeamCode;
  deltaPct: number;
};

export type MatchPrediction = {
  matchId: number;
  iterations: number;
  lastUpdatedIso: string;
  teamProbabilities: TeamProbability[];
  pairProbabilities: PairProbability[];
  news: NewsEvent[];
};

const t = (code: TeamCode) => TEAMS[code];

// ---------------------------------------------------------------------------
// Match 87 — the demo persona's ticket
// Reality: 03 Jul 2026, Arrowhead Stadium, Kansas City
//          Winner Group K (likely Portugal) vs 3rd from D/E/I/J/L
// Plausible wildcard pool: ARG, FRA, USA, GER, ENG
// ---------------------------------------------------------------------------

const MATCH_87_PREDICTION: MatchPrediction = {
  matchId: 87,
  iterations: 100_000,
  lastUpdatedIso: "2026-05-17T17:30:00Z",
  teamProbabilities: [
    { team: t("POR"), probability: 0.61 },
    { team: t("COL"), probability: 0.21 },
    { team: t("COD"), probability: 0.08 },
    { team: t("ARG"), probability: 0.04 },
    { team: t("FRA"), probability: 0.025 },
    { team: t("USA"), probability: 0.015 },
    { team: t("GER"), probability: 0.01 },
    { team: t("ENG"), probability: 0.005 },
    { team: t("UZB"), probability: 0.005 },
  ],
  pairProbabilities: [
    {
      teamA: t("POR"),
      teamB: t("ARG"),
      probability: 0.046,
      flavor: "Messi vs Ronaldo, possibly the last act.",
    },
    {
      teamA: t("POR"),
      teamB: t("FRA"),
      probability: 0.041,
      flavor: "Euro 2016 final reprise.",
    },
    {
      teamA: t("POR"),
      teamB: t("USA"),
      probability: 0.028,
      flavor: "Hosts' first taste of a giant.",
    },
    {
      teamA: t("COL"),
      teamB: t("ARG"),
      probability: 0.022,
      flavor: "South American derby with a Kansas accent.",
    },
    {
      teamA: t("POR"),
      teamB: t("GER"),
      probability: 0.019,
      flavor: "Two former champions, one wildcard.",
    },
  ],
  news: [
    {
      id: "news-por-2026-04-11",
      date: "2026-04-11",
      headline: "Ronaldo suspension lifted ahead of opener",
      detail:
        "FIFA exempted the qualification-round ban on May 8, restoring Portugal's strongest XI. P(Portugal wins Group K) up from 58% → 64%.",
      impactTeam: "POR",
      deltaPct: 6,
    },
    {
      id: "news-arg-2026-05-02",
      date: "2026-05-02",
      headline: "Argentina lock in a friendly vs Mexico",
      detail:
        "Pre-tournament tune-up at Estadio Azteca raises ARG's projected Group J finish — knock-on effect on third-place wildcard pool.",
      impactTeam: "ARG",
      deltaPct: -1.5,
    },
    {
      id: "news-col-2026-05-09",
      date: "2026-05-09",
      headline: "Colombia roster shaken by injury",
      detail:
        "Two starters ruled out for the group stage. Colombia's chance of finishing 2nd in Group K nudged down from 25% → 21%.",
      impactTeam: "COL",
      deltaPct: -4,
    },
  ],
};

const PREDICTIONS_BY_ID: Record<number, MatchPrediction> = {
  87: MATCH_87_PREDICTION,
};

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export function getPrediction(matchId: number): MatchPrediction | null {
  return PREDICTIONS_BY_ID[matchId] ?? null;
}

export function getMatch(matchId: number): Match | null {
  return MATCHES_BY_ID[matchId] ?? null;
}

export const DEMO_MATCH_ID = 87;

// ---------------------------------------------------------------------------
// Formatters retained at the call sites for back-compat
// ---------------------------------------------------------------------------

export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}
