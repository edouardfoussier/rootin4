import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchTicketActions } from "@/components/match-ticket-actions";
import { ProbabilityBar } from "@/components/probability-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatProbability,
  getMatch,
  getPrediction,
} from "@/lib/stub-data";
import {
  HOST_LABEL,
  ROUND_LABEL,
  formatShortDate,
  getMatchTeams,
  getStadium,
} from "@/lib/wc2026-data";

type Params = { id: string };

export default async function MatchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) notFound();

  const match = getMatch(matchId);
  if (!match) notFound();

  const prediction = getPrediction(matchId);
  const stadium = getStadium(match);
  const { a, b } = getMatchTeams(match);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-20">
          {/* Header block */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="label-mono">
                Match #{match.id}
              </Badge>
              <Badge variant="outline" className="label-mono">
                {ROUND_LABEL[match.round]}
              </Badge>
              <Badge variant="outline" className="label-mono">
                {HOST_LABEL[match.hostCountry]}
              </Badge>
              {match.group && (
                <Badge variant="outline" className="label-mono">
                  Group {match.group}
                </Badge>
              )}
            </div>

            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {stadium.name}
              <span className="font-serif-accent ml-3 text-3xl text-rust sm:text-4xl">
                · {stadium.city}
              </span>
            </h1>

            <p className="label-mono text-muted-foreground">
              {formatShortDate(match.date)} · {match.kickoffLocal} local
              {match.estimatedKickoff && " (est.)"} · capacity {stadium.capacity.toLocaleString()}
            </p>

            {/* Pairing or slot */}
            <p className="max-w-prose text-base text-muted-foreground">
              <span className="font-serif-accent text-rust">Fixture:</span>{" "}
              {a.team && b.team ? (
                <>
                  {a.team.flag} {a.team.name} vs {b.team.flag} {b.team.name}
                </>
              ) : (
                <>
                  {a.slot} <span className="font-serif-accent">vs</span> {b.slot}
                </>
              )}
            </p>

            <MatchTicketActions matchId={match.id} />
          </section>

          <Separator className="my-10" />

          {prediction ? (
            <>
              {/* Probability bars */}
              <section className="flex flex-col gap-6">
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Who will play here
                  </h2>
                  <span className="label-mono text-muted-foreground">
                    {prediction.iterations.toLocaleString()} sims ·{" "}
                    {minutesAgo(prediction.lastUpdatedIso)} min ago
                  </span>
                </header>

                <div className="flex flex-col gap-4">
                  {prediction.teamProbabilities.slice(0, 4).map((row, idx) => (
                    <ProbabilityBar
                      key={row.team.code}
                      prefix={row.team.flag}
                      label={row.team.name}
                      probability={row.probability}
                      highlight={idx === 0}
                    />
                  ))}
                  {prediction.teamProbabilities.length > 4 && (
                    <ProbabilityBar
                      prefix="·"
                      label={`${prediction.teamProbabilities.length - 4} other teams`}
                      probability={prediction.teamProbabilities
                        .slice(4)
                        .reduce((acc, t) => acc + t.probability, 0)}
                    />
                  )}
                </div>

                <p className="font-serif-accent text-lg text-muted-foreground">
                  Most likely to walk on this pitch:{" "}
                  <span className="text-rust">
                    {prediction.teamProbabilities[0].team.name}
                  </span>{" "}
                  at {formatProbability(prediction.teamProbabilities[0].probability)}.
                </p>
              </section>

              <Separator className="my-10" />

              {/* Pair probabilities */}
              <section className="flex flex-col gap-6">
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Most likely matchups
                  </h2>
                  <span className="label-mono text-muted-foreground">
                    Top {prediction.pairProbabilities.length} pairings
                  </span>
                </header>

                <div className="grid grid-cols-1 gap-3">
                  {prediction.pairProbabilities.map((pair) => (
                    <Card
                      key={`${pair.teamA.code}-${pair.teamB.code}`}
                      className="border-border/80 bg-card"
                    >
                      <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm sm:text-base">
                          <span className="text-xl" aria-hidden>
                            {pair.teamA.flag}
                          </span>
                          <span className="font-display font-medium">
                            {pair.teamA.name}
                          </span>
                          <span className="font-serif-accent text-rust">vs</span>
                          <span className="text-xl" aria-hidden>
                            {pair.teamB.flag}
                          </span>
                          <span className="font-display font-medium">
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
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    What moved these probabilities
                  </h2>
                  <span className="label-mono text-muted-foreground">
                    Hand-curated until F3
                  </span>
                </header>

                <ol className="flex flex-col gap-4">
                  {prediction.news.map((event) => (
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
                      <p className="text-sm text-muted-foreground">
                        {event.detail}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <Separator className="my-10" />

              <ShouldYouGoCard
                leaderName={prediction.teamProbabilities[0].team.name}
                leaderProbability={prediction.teamProbabilities[0].probability}
              />
            </>
          ) : (
            <PredictionComingSoon />
          )}

          <div className="mt-12">
            <Link
              href="/schedule"
              className="label-mono text-muted-foreground transition hover:text-rust"
            >
              ← back to the schedule
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ShouldYouGoCard({
  leaderName,
  leaderProbability,
}: {
  leaderName: string;
  leaderProbability: number;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Should you go?
      </h2>
      <Card className="border-rust/40 bg-card">
        <CardContent className="flex flex-col gap-3 py-5">
          <p className="font-serif-accent text-xl text-foreground">
            If you&apos;re rootin&apos; for{" "}
            <span className="text-rust">{leaderName}</span>, the numbers say{" "}
            <span className="text-rust">keep your seat.</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Indicative outlook based on a {Math.round(leaderProbability * 100)}%
            chance they walk into this match. Below 35% we suggest hedging;
            below 15%, reselling. Refreshed live as news lands.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function PredictionComingSoon() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Predictions warming up
      </h2>
      <Card className="border-border/60 bg-card">
        <CardContent className="flex flex-col gap-3 py-6">
          <p className="font-serif-accent text-lg text-foreground">
            The Monte Carlo engine ships in week&nbsp;2.
          </p>
          <p className="text-sm text-muted-foreground">
            For each match the agent will run 100,000 simulations of the rest
            of the tournament, pull the latest news, and post calibrated
            probabilities here. The persona example lives on{" "}
            <Link
              href="/match/87"
              className="text-rust underline-offset-4 hover:underline"
            >
              Match&nbsp;87
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function minutesAgo(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}
