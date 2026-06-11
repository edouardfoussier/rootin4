/**
 * Prediction payload types + small helpers shared by the UI.
 *
 * All probability data comes LIVE from the agent backend
 * (`live-data.ts` → Cloud Run → Monte Carlo engine). If the backend is
 * unreachable, pages render an honest empty state — never fabricated
 * numbers. Real schedule data (stadium, date, slot descriptions) lives
 * in `wc2026-data.ts`.
 */

import { MATCHES_BY_ID, type Match, type Team } from "./wc2026-data";

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
  impactTeam: string;
  deltaPct: number;
};

export type ScorelineProbability = {
  score: string; // "2-1" — team A goals first
  probability: number;
};

export type OutcomeProbabilities = {
  home: number;
  draw: number;
  away: number;
};

/** Final score recorded by the operator once a match is actually played. */
export type RecordedResult = {
  teamA: string;
  teamB: string;
  goalsA: number;
  goalsB: number;
  scoreLine: string;
  winner: string | null;
  recordedAt: string;
};

export type MatchPrediction = {
  matchId: number;
  iterations: number;
  lastUpdatedIso: string;
  result?: RecordedResult | null;
  teamProbabilities: TeamProbability[];
  pairProbabilities: PairProbability[];
  mostLikelyScores?: ScorelineProbability[];
  outcomeProbabilities?: OutcomeProbabilities;
  penaltyShootoutRate?: number;
  news: NewsEvent[];
};

/**
 * Probability timeline for one fixture — one point per real-world event
 * (pre-tournament baseline, recorded result, agent self-correction).
 * Knockout fixtures key `probs` by team code; group fixtures by
 * "home" / "draw" / "away".
 */
export type MatchHistory = {
  matchId: number;
  series: "teams" | "outcomes";
  points: Array<{
    ts: string;
    trigger: string;
    kind: string;
    probs: Record<string, number>;
  }>;
};

/** Series of one key across the history, oldest → newest. */
export function historySeries(
  history: MatchHistory | null,
  key: string
): number[] {
  if (!history) return [];
  return history.points.map((p) => p.probs[key] ?? 0);
}

export function getMatch(matchId: number): Match | null {
  return MATCHES_BY_ID[matchId] ?? null;
}

export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}
