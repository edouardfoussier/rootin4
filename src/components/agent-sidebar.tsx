"use client";

import { useCallback, useEffect, useState } from "react";

type ChampionRow = {
  team: { code: string; name: string; flag: string };
  probability: number;
};

type Correction = { team: string; delta: number; reason: string };

export function AgentSidebar() {
  const [champions, setChampions] = useState<ChampionRow[]>([]);
  const [iterations, setIterations] = useState(0);
  const [corrections, setCorrections] = useState<Correction[]>([]);

  const refresh = useCallback(() => {
    fetch("/api/champions")
      .then((r) => r.json())
      .then((d) => {
        setChampions((d.champions ?? []).slice(0, 6));
        setIterations(d.iterations ?? 0);
      })
      .catch(() => {});
    fetch("/api/priors")
      .then((r) => r.json())
      .then((d) => setCorrections(d.corrections ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("rootin4:agent-turn-done", refresh);
    return () => window.removeEventListener("rootin4:agent-turn-done", refresh);
  }, [refresh]);

  const max = champions[0]?.probability ?? 0;

  return (
    <aside className="flex flex-col gap-6">
      <section className="glass-panel rounded-2xl border-0 px-5 py-5">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">
            Championship odds
          </h2>
          {iterations > 0 && (
            <span className="label-mono text-ink-soft">
              {iterations.toLocaleString()} sims
            </span>
          )}
        </header>
        <ol className="mt-4 flex flex-col gap-2.5">
          {champions.length === 0 && (
            <li className="text-sm italic text-ink-soft">
              Waking the simulation engine…
            </li>
          )}
          {champions.map((row) => (
            <li key={row.team.code} className="flex items-center gap-2.5">
              <span aria-hidden className="w-6 text-lg">
                {row.team.flag}
              </span>
              <span className="w-24 truncate text-sm text-ink">
                {row.team.name}
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-line/50">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-twilight"
                  style={{
                    width: `${max > 0 ? (row.probability / max) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="w-12 text-right font-mono text-xs tabular-nums text-ink">
                {(row.probability * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-panel rounded-2xl border-0 px-5 py-5">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">
            Self-corrections
          </h2>
          <span className="label-mono text-twilight">Phoenix loop</span>
        </header>
        {corrections.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            None yet. Ask the agent to inspect its own Phoenix traces — when
            it finds a systematic bias, the Elo correction it applies shows
            up here, and every probability on this site shifts with it.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {corrections.map((c, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 border-l-2 border-twilight/60 pl-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-ink">
                    {c.team}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      c.delta >= 0 ? "text-horizon" : "text-twilight"
                    }`}
                  >
                    {c.delta >= 0 ? "+" : ""}
                    {c.delta.toFixed(0)} Elo
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink-soft">
                  {c.reason}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
