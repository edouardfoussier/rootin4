"use client";

import { useLiveSimulation } from "@/lib/use-live-simulation";

/**
 * Fixed-bottom strip rendering the agent's pulse.
 *
 * On mobile we hide the right-hand stats so the line of log copy keeps room
 * to breathe. The ticker honours iOS / Android safe areas via
 * `env(safe-area-inset-bottom)` so it doesn't collide with the home indicator.
 */
export function AgentTicker() {
  const { latestLog, driftPct, simsPerHour } = useLiveSimulation();

  if (!latestLog) return null;

  return (
    <div
      className="glass-panel fixed inset-x-3 z-40 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[11px] sm:inset-x-8 sm:gap-6"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <span className="pulse-dot shrink-0" />
        <span className="label-mono shrink-0 text-ink-soft">
          Agent activity
        </span>
        <span
          key={latestLog.id}
          className="truncate font-mono text-ink animate-text-reveal"
          style={{ animation: "var(--animate-ticker-rise)" }}
        >
          {latestLog.text}
        </span>
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-6 sm:flex">
        <Stat
          label="Model drift"
          value={`${driftPct >= 0 ? "+" : ""}${driftPct.toFixed(2)}%`}
        />
        <Stat
          label="Simulations"
          value={`${simsPerHour.toLocaleString()}/hr`}
        />
      </div>
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
