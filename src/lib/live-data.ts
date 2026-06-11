import { getPrediction as getStubPrediction } from "@/lib/stub-data";
import type { MatchPrediction } from "@/lib/stub-data";

/**
 * Server-side accessors for the Rootin4 agent backend (Cloud Run).
 * Never import from a client component — BACKEND_URL stays server-only.
 * Every accessor degrades gracefully so the demo never renders blank.
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
    // Backend cold / unreachable → fall back to the curated stub so the
    // page still tells the story (only match 87 has stub data).
    return getStubPrediction(matchId);
  }
}
