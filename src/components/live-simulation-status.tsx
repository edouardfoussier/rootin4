"use client";

import { useEffect, useState } from "react";

/**
 * Tiny "Live · day-of-tournament" badge that sits beside the logo.
 * The date renders client-side to avoid hydration drift.
 */
export function LiveSimulationStatus() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(now);

  return (
    <span className="hidden items-center gap-2 rounded-full border border-ink-line/70 bg-paper/60 px-3 py-1 sm:inline-flex">
      <span className="pulse-dot" />
      <span className="label-mono text-ink-soft">Live · {dateLabel}</span>
    </span>
  );
}
