import Link from "next/link";

import { HeaderTicketChip } from "./header-ticket-chip";
import { LiveSimulationStatus } from "./live-simulation-status";

export function SiteHeader() {
  return (
    <header className="border-b border-ink-line/60 bg-paper/30 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group inline-flex items-baseline gap-0.5"
            aria-label="Rootin4 home"
          >
            <span className="text-2xl font-semibold tracking-tight text-ink">
              Rootin
            </span>
            <span className="font-display text-3xl leading-none text-horizon">
              4
            </span>
          </Link>
          <LiveSimulationStatus />
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <HeaderTicketChip />
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/schedule"
              className="label-mono text-ink-soft transition hover:text-ink"
            >
              Schedule
            </Link>
            <Link
              href="/match/87"
              className="label-mono text-ink-soft transition hover:text-ink"
            >
              Match 87
            </Link>
            <Link
              href="/about"
              className="label-mono text-ink-soft transition hover:text-ink"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
