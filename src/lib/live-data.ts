import type { MatchHistory, MatchPrediction } from "@/lib/predictions";

/**
 * Server-side accessors for the Rootin4 agent backend (Cloud Run).
 * Never import from a client component — BACKEND_URL stays server-only.
 *
 * On failure we return null and let pages render an honest empty state:
 * no fabricated probabilities, ever.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export function backendUrl(): string {
  return BACKEND_URL;
}

export async function getLivePrediction(
  matchId: number
): Promise<MatchPrediction | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/predictions/${matchId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    return (await res.json()) as MatchPrediction;
  } catch {
    return null;
  }
}

/**
 * Probability timeline for a fixture — feeds the "price over time"
 * sparklines. One point per real-world event, so an empty/short series
 * just means nothing has happened yet (no fake history).
 */
export async function getMatchHistory(
  matchId: number
): Promise<MatchHistory | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/history/match/${matchId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    return (await res.json()) as MatchHistory;
  } catch {
    return null;
  }
}
