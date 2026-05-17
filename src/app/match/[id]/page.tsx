import Link from "next/link";
import { notFound } from "next/navigation";

import { ProbabilityBar } from "@/components/probability-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatKickoff,
  formatProbability,
  STUB_MATCHES,
} from "@/lib/stub-data";

type Params = { id: string };

export default async function MatchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  const match = STUB_MATCHES[matchId];
  if (!match) notFound();

  const topTeams = match.teamProbabilities.slice(0, 4);
  const others = match.teamProbabilities.slice(4);
  const othersTotal = others.reduce((acc, t) => acc + t.probability, 0);
  const leader = topTeams[0];

  const lastUpdated = new Date(match.lastUpdatedIso);
  const minutesAgo = Math.max(
    1,
    Math.round((Date.now() - lastUpdated.getTime()) / 60_000)
  );

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-20">
          {/* Header block */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="label-mono">
                Match #{match.id}
              </Badge>
              <Badge variant="outline" className="label-mono">
                {match.round}
              </Badge>
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {match.stadium}
              <span className="font-serif-accent ml-3 text-3xl text-rust sm:text-4xl">
                · {match.city}
              </span>
            </h1>
            <p className="label-mono text-muted-foreground">
              {formatKickoff(match.kickoffIso)}
            </p>
            <p className="max-w-prose text-base text-muted-foreground">
              <span className="font-serif-accent text-rust">Slot:</span>{" "}
              {match.slotDescription}.
            </p>
          </section>

          <Separator className="my-10" />

          {/* Probability bars */}
          <section className="flex flex-col gap-6">
            <header className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Who will play here
              </h2>
              <span className="label-mono text-muted-foreground">
                {match.iterations.toLocaleString()} sims · {minutesAgo} min ago
              </span>
            </header>

            <div className="flex flex-col gap-4">
              {topTeams.map((row, idx) => (
                <ProbabilityBar
                  key={row.team.code}
                  prefix={row.team.flag}
                  label={row.team.name}
                  probability={row.probability}
                  highlight={idx === 0}
                />
              ))}
              {others.length > 0 && (
                <ProbabilityBar
                  prefix="·"
                  label={`${others.length} other teams`}
                  probability={othersTotal}
                />
              )}
            </div>

            <p className="font-serif-accent text-lg text-muted-foreground">
              Most likely to walk on this pitch:{" "}
              <span className="text-rust">{leader.team.name}</span>{" "}
              at {formatProbability(leader.probability)}.
            </p>
          </section>

          <Separator className="my-10" />

          {/* Pair probabilities */}
          <section className="flex flex-col gap-6">
            <header className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Most likely matchups
              </h2>
              <span className="label-mono text-muted-foreground">Top 5 pairings</span>
            </header>

            <div className="grid grid-cols-1 gap-3">
              {match.pairProbabilities.map((pair) => (
                <Card
                  key={`${pair.teamA.code}-${pair.teamB.code}`}
                  className="border-border/80 bg-card"
                >
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl" aria-hidden>
                        {pair.teamA.flag}
                      </span>
                      <span className="font-display text-base font-medium">
                        {pair.teamA.name}
                      </span>
                      <span className="font-serif-accent text-base text-rust">
                        vs
                      </span>
                      <span className="text-xl" aria-hidden>
                        {pair.teamB.flag}
                      </span>
                      <span className="font-display text-base font-medium">
                        {pair.teamB.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="hidden text-sm text-muted-foreground sm:inline">
                        {pair.flavor}
                      </span>
                      <span className="label-mono tabular-nums text-foreground">
                        {(pair.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator className="my-10" />

          {/* News timeline */}
          <section className="flex flex-col gap-5">
            <header className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                What moved these probabilities
              </h2>
              <span className="label-mono text-muted-foreground">
                Stub — wired to news pipeline post-MVP
              </span>
            </header>

            <ol className="flex flex-col gap-4">
              {match.news.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-1 border-l-2 border-rust/60 pl-4"
                >
                  <span className="label-mono text-muted-foreground">
                    {event.date}
                  </span>
                  <p className="font-display text-base font-medium">
                    {event.headline}
                  </p>
                  <p className="text-sm text-muted-foreground">{event.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <Separator className="my-10" />

          {/* Keep or resell heuristic */}
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Should you go?
            </h2>
            <Card className="border-rust/40 bg-card">
              <CardContent className="flex flex-col gap-3 py-5">
                <p className="font-serif-accent text-xl text-foreground">
                  If you&apos;re rootin&apos; for{" "}
                  <span className="text-rust">{leader.team.name}</span>, the
                  numbers say <span className="text-rust">keep your seat.</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Indicative outlook based on a {Math.round(leader.probability * 100)}% chance
                  they walk into this match. Below 35% we suggest hedging; below
                  15%, reselling. Refreshed live as news lands.
                </p>
              </CardContent>
            </Card>
          </section>

          <div className="mt-12">
            <Link
              href="/"
              className="label-mono text-muted-foreground transition hover:text-rust"
            >
              ← back to all fixtures
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
