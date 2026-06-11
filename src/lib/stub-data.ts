/**
 * Prediction types + small helpers shared by the UI.
 *
 * All probability data comes LIVE from the agent backend
 * (`live-data.ts` → Cloud Run → Monte Carlo engine). This module only
 * defines the payload shapes and match lookups — the hand-authored stub
 * predictions from the scaffold era are gone: if the backend is down we
 * show an honest empty state, never fabricated numbers.
 *
 * Real schedule data (stadium, date, slot description, etc.) lives in
 * `wc2026-data.ts` — never in this file.
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

export type MatchPrediction = {
  matchId: number;
  iterations: number;
  lastUpdatedIso: string;
  teamProbabilities: TeamProbability[];
  pairProbabilities: PairProbability[];
  mostLikelyScores?: ScorelineProbability[];
  outcomeProbabilities?: OutcomeProbabilities;
  penaltyShootoutRate?: number;
  news: NewsEvent[];
};

export function getMatch(matchId: number): Match | null {
  return MATCHES_BY_ID[matchId] ?? null;
}

export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}
