"use client";

import { useCallback, useEffect, useState } from "react";

type ActivityEvent = { ts: string; kind: string; text: string };
type EngineStats = {
  tournaments_simulated: number;
  active_corrections: number;
  default_sample_size: number;
};

const POLL_MS = 12_000;
const ROTATE_MS = 6_000;

/**
 * Fixed-bottom strip showing REAL engine/agent events from the backend
 * (`/api/activity`): actual Monte Carlo runs, actual agent tool calls,
 * actual prior corrections. Nothing synthesized — if the backend is
 * unreachable the strip simply doesn't render.
 */
export function AgentTicker() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [cursor, setCursor] = useState(0);

  const refresh = useCallback(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    window.addEventListener("rootin4:agent-turn-done", refresh);
    return () => {
      clearInterval(poll);
      window.removeEventListener("rootin4:agent-turn-done", refresh);
    };
  }, [refresh]);

  // Rotate through the recent real events so the strip stays alive
  // without inventing anything.
  useEffect(() => {
    if (events.length < 2) return;
    const id = setInterval(
      () => setCursor((c) => (c + 1) % Math.min(events.length, 8)),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [events.length]);

  if (events.length === 0) return null;
  const current = events[Math.min(cursor, events.length - 1)];

  return (
    <div
      className="glass-panel fixed inset-x-3 z-40 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[11px] sm:inset-x-8 sm:gap-6"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <span className="pulse-dot shrink-0" />
        <span className="label-mono shrink-0 text-ink-soft">
          Engine log
        </span>
        <span
          key={current.ts + current.text}
          className="truncate font-mono text-ink"
          style={{ animation: "var(--animate-ticker-rise)" }}
        >
          {current.text}
        </span>
      </div>

      {stats && (
        <div className="ml-auto hidden shrink-0 items-center gap-6 sm:flex">
          <Stat
            label="Tournaments simulated"
            value={stats.tournaments_simulated.toLocaleString()}
          />
          <Stat
            label="Self-corrections"
            value={String(stats.active_corrections)}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="label-mono text-[0.55rem] text-ink-soft">{label}</div>
      <div className="font-mono text-[11px] font-medium tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}
