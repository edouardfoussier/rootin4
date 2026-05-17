"use client";

/**
 * Anchored-jitter simulation that drives the visible "the agent is thinking"
 * feel. Two cadences:
 *   - DRIFT_INTERVAL_MS   (~1.6s) — small ± nudges to probabilities + sims/hr
 *   - LOG_INTERVAL_MS     (~4.2s) — a new agent-log entry rises into the ticker
 *
 * The drift is *anchored*: each tick we pull values back toward their initial
 * seed, so probabilities orbit instead of drifting away. Without that pull a
 * 47% probability would happily slide to 51% in 30 seconds and break trust.
 *
 * Page-local hook — for cross-component sharing wrap in a context provider.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AgentLogKind = "correction" | "news" | "simulation" | "bias";

export type AgentLogEntry = {
  id: string;
  kind: AgentLogKind;
  text: string;
  ts: number;
};

/** Hand-crafted entries that feel like our actual Match #87 narrative
 *  (Group K = Portugal, plus the third-place wildcards from D/E/I/J/L). */
const SEED_LOG: Omit<AgentLogEntry, "id" | "ts">[] = [
  { kind: "correction", text: "Ronaldo training in full gear after his qualification ban was lifted — Portugal Group K finish revised +1.8pt" },
  { kind: "simulation", text: "Batch 6,200 complete — Match #87 wildcard distribution narrowing around ARG / FRA / GER" },
  { kind: "news",       text: "Ingested 38 Spanish-language sources; Colombia roster reshuffle pulling P(2nd Group K) toward 21%" },
  { kind: "bias",       text: "Neutralising systematic CONCACAF home-advantage over-valuation at sea level" },
  { kind: "correction", text: "+2.1pt Brazil after Vinicius medically cleared for the tournament window" },
  { kind: "simulation", text: "Re-running 5,400 iterations for Arrowhead — Portugal vs 3rd D/E/I/J/L pool stable" },
  { kind: "news",       text: "Argentina pre-tournament friendly vs Mexico confirmed at Estadio Azteca — priors nudged" },
  { kind: "bias",       text: "Detected over-confidence in seeded UEFA teams vs CAF qualifiers — soft 0.4 correction applied" },
  { kind: "simulation", text: "Probability volatility at 0.42 — within healthy range for pre-tournament window" },
  { kind: "correction", text: "Mbappé full training session reported — France projected R32 path narrowing" },
];

const LOG_INTERVAL_MS = 4_200;
const DRIFT_INTERVAL_MS = 1_600;

function jitter(base: number, amplitude: number): number {
  return base + (Math.random() - 0.5) * amplitude * 2;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export type UseLiveSimulationOptions = {
  /** Starting probabilities for the current fixture (0–100 scale). */
  initialTeamProbs?: Record<string, number>;
  /** Max ± drift per tick, in percentage points. */
  driftAmplitude?: number;
  /** Mute timers (e.g. for storybook / tests). */
  paused?: boolean;
};

export function useLiveSimulation(opts: UseLiveSimulationOptions = {}) {
  const { initialTeamProbs = {}, driftAmplitude = 0.25, paused = false } = opts;

  const anchorsRef = useRef<Record<string, number>>({ ...initialTeamProbs });
  // Keep anchors in sync if caller changes initial probs (e.g. matchId switch)
  useEffect(() => {
    anchorsRef.current = { ...initialTeamProbs };
    setTeamProbs({ ...initialTeamProbs });
  }, [JSON.stringify(initialTeamProbs)]); // eslint-disable-line react-hooks/exhaustive-deps

  const [teamProbs, setTeamProbs] = useState<Record<string, number>>({
    ...initialTeamProbs,
  });

  const [log, setLog] = useState<AgentLogEntry[]>(() =>
    SEED_LOG.slice(0, 4).map((entry, i) => ({
      ...entry,
      id: uid(),
      ts: Date.now() - (4 - i) * 60_000,
    }))
  );

  const [driftPct, setDriftPct] = useState(-0.04);
  const [simsPerHour, setSimsPerHour] = useState(14_204);

  const pushLog = useCallback((entry: Omit<AgentLogEntry, "id" | "ts">) => {
    setLog((prev) =>
      [{ ...entry, id: uid(), ts: Date.now() }, ...prev].slice(0, 50)
    );
  }, []);

  // Pause when the browser tab is hidden.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const muted = paused || hidden;

  // Drift numbers
  useEffect(() => {
    if (muted) return;
    const id = setInterval(() => {
      setTeamProbs((prev) => {
        const next: Record<string, number> = {};
        for (const code of Object.keys(prev)) {
          const anchor = anchorsRef.current[code] ?? prev[code];
          const proposal = jitter(prev[code], driftAmplitude);
          // Pull back toward the anchor (~spring) so probabilities orbit.
          const pulled = proposal + (anchor - proposal) * 0.15;
          next[code] = Math.max(0, Math.min(100, +pulled.toFixed(2)));
        }
        return next;
      });
      setDriftPct((d) => +jitter(d, 0.03).toFixed(2));
      setSimsPerHour((s) => Math.max(8_000, Math.round(jitter(s, 60))));
    }, DRIFT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [driftAmplitude, muted]);

  // Prepend log entries on a separate cadence
  useEffect(() => {
    if (muted) return;
    let i = SEED_LOG.length - 1;
    const id = setInterval(() => {
      i = (i + 1) % SEED_LOG.length;
      pushLog(SEED_LOG[i]);
    }, LOG_INTERVAL_MS);
    return () => clearInterval(id);
  }, [muted, pushLog]);

  return {
    teamProbs,
    log,
    latestLog: log[0] ?? null,
    driftPct,
    simsPerHour,
    pushLog,
    paused: muted,
  } as const;
}
