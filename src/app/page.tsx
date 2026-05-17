import Link from "next/link";

import { HomeTicketHero } from "@/components/home-ticket-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  HOST_LABEL,
  MATCHES,
  STADIUMS,
  formatShortDate,
  getMatchTeams,
  getStadium,
} from "@/lib/wc2026-data";

export default function Home() {
  const openerMatch = MATCHES.find((m) => m.date === "2026-06-11");
  const earlyMatches = MATCHES.slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-20 pb-10">
          <span className="label-mono text-rust">
            World Cup 2026 · USA · Canada · Mexico
          </span>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Every World Cup tool predicts{" "}
            <span className="font-serif-accent text-rust">who wins.</span>
            <br />
            <span className="text-foreground/80">Rootin</span>
            <span className="font-serif-accent text-rust">4</span>
            <span className="text-foreground/80"> predicts </span>
            <span className="font-serif-accent text-foreground">
              who shows up at the seat you already bought.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl font-display text-lg text-muted-foreground">
            104 fixtures. 48 teams. 16 stadiums across 3 host countries.
            One question Marco can&apos;t answer alone:{" "}
            <em className="font-serif-accent text-foreground">
              who&apos;s playing in his seat?
            </em>{" "}
            We ran 100,000 simulations and asked the news. Here&apos;s our best
            guess.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:bg-rust"
            >
              Find your match →
            </Link>
            <Link
              href="/match/87"
              className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-rust hover:text-rust"
            >
              See Match #87 in action
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-rust hover:text-rust"
            >
              How the agent learns
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-12">
          <HomeTicketHero />
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-12">
          <header className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tournament opener
            </h2>
            <Link
              href="/schedule"
              className="label-mono text-muted-foreground transition hover:text-rust"
            >
              See all 104 →
            </Link>
          </header>
          {openerMatch ? <OpenerCard matchId={openerMatch.id} /> : null}
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-16">
          <header className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              First days
            </h2>
            <span className="label-mono text-muted-foreground">
              June 11 – June 14
            </span>
          </header>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {earlyMatches.map((match) => {
              const { a, b } = getMatchTeams(match);
              const stadium = getStadium(match);
              return (
                <Link
                  key={match.id}
                  href={`/match/${match.id}`}
                  className="rounded-lg border border-border/70 bg-card p-4 transition hover:border-rust"
                >
                  <p className="label-mono text-muted-foreground">
                    Match #{match.id} · {formatShortDate(match.date)}
                  </p>
                  <p className="mt-2 font-display text-lg font-medium">
                    {a.team && b.team ? (
                      <>
                        {a.team.flag} {a.team.name}{" "}
                        <span className="font-serif-accent text-rust">vs</span>{" "}
                        {b.team.flag} {b.team.name}
                      </>
                    ) : (
                      <>
                        {a.slot} vs {b.slot}
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stadium.name} · {stadium.city} ·{" "}
                    {HOST_LABEL[match.hostCountry]}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function OpenerCard({ matchId }: { matchId: number }) {
  const match = MATCHES.find((m) => m.id === matchId)!;
  const { a, b } = getMatchTeams(match);
  const stadium = getStadium(match);
  return (
    <Card className="mt-4 border-border/80 bg-card">
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-mono text-muted-foreground">
            Match #{match.id} · {formatShortDate(match.date)}
          </span>
          <p className="font-display text-2xl font-semibold tracking-tight">
            {a.team && b.team
              ? `${a.team.name} vs ${b.team.name}`
              : `${a.slot} vs ${b.slot}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {stadium.name}
            <span className="font-serif-accent ml-2 text-rust">
              · {stadium.city}
            </span>{" "}
            · capacity {stadium.capacity.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {a.team && (
            <span className="text-4xl" aria-hidden>
              {a.team.flag}
            </span>
          )}
          <span className="font-serif-accent text-3xl text-rust">vs</span>
          {b.team && (
            <span className="text-4xl" aria-hidden>
              {b.team.flag}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
