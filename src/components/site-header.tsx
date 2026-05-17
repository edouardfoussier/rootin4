import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex w-full max-w-5xl items-baseline justify-between gap-6 px-6 py-5">
        <Link href="/" className="group inline-flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Rootin
          </span>
          <span className="font-serif-accent text-3xl leading-none text-rust">
            4
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/match/87"
            className="label-mono text-muted-foreground transition hover:text-foreground"
          >
            Match 87
          </Link>
          <Link
            href="/team/ARG"
            className="label-mono text-muted-foreground transition hover:text-foreground"
          >
            Teams
          </Link>
          <Link
            href="/agent"
            className="label-mono text-muted-foreground transition hover:text-foreground"
          >
            Agent
          </Link>
        </nav>
      </div>
    </header>
  );
}
