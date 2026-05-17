import Link from "next/link";

import { HeaderTicketChip } from "./header-ticket-chip";

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="group inline-flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Rootin
          </span>
          <span className="font-serif-accent text-3xl leading-none text-rust">
            4
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <HeaderTicketChip />
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/schedule"
              className="label-mono text-muted-foreground transition hover:text-foreground"
            >
              Schedule
            </Link>
            <Link
              href="/match/87"
              className="label-mono text-muted-foreground transition hover:text-foreground"
            >
              Match 87
            </Link>
            <Link
              href="/agent"
              className="label-mono text-muted-foreground transition hover:text-foreground"
            >
              Agent
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
