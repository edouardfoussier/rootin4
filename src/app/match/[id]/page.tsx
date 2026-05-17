import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchTicketActions } from "@/components/match-ticket-actions";
import { ProbabilityBar } from "@/components/probability-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VerdictCard, deriveVerdict } from "@/components/verdict-card";
import {
  formatProbability,
  getMatch,
  getPrediction,
  type TeamProbability,
} from "@/lib/stub-data";
import {
  HOST_LABEL,
  ROUND_LABEL,
  formatShortDate,
  getMatchTeams,
  getStadium,
} from "@/lib/wc2026-data";

type Params = { id: string };

const TONE_BY_RANK = ["twilight", "horizon", "ink", "ink", "ink", "ink"] as const;

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
        <div className="mx-auto w-full max-w-4xl px-6 pt-12 pb-16 sm:pt-16">
          {/* Header block — eyebrow + editorial H1 + atmospheric sub-line */}
          <section className="flex flex-col gap-5">
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

            <h1 className="font-display text-5xl font-black leading-[0.95] text-ink sm:text-7xl">
              Who arrives in {stadium.city.split(",")[0]}?
            </h1>

            <p className="max-w-prose text-base text-ink-soft sm:text-lg">
              {a.team && b.team ? (
                <>
                  <span aria-hidden>{a.team.flag}</span> {a.team.name} face{" "}
                  <span aria-hidden>{b.team.flag}</span> {b.team.name} at{" "}
                  <span className="font-display italic text-ink">{stadium.name}</span>,{" "}
                  {formatShortDate(match.date)} at {match.kickoffLocal} local.
                </>
              ) : (
                <>
                  The fixture is locked, but the participants aren&apos;t. This
                  slot reads{" "}
                  <span className="font-display italic text-ink">
                    {a.slot}
                  </span>{" "}
                  versus{" "}
                  <span className="font-display italic text-ink">
                    {b.slot}
                  </span>{" "}
                  — and Rootin4 has been simulating the rest of the tournament
                  to translate that riddle into probabilities.
                </>
              )}
            </p>

            <p className="label-mono text-ink-soft">
              {formatShortDate(match.date)} · {match.kickoffLocal} local
              {match.estimatedKickoff && " (est.)"} · capacity{" "}
              {stadium.capacity.toLocaleString()}
            </p>

            <MatchTicketActions matchId={match.id} />
          </section>

          <Separator className="my-12 bg-ink-line" />

          {prediction ? (
            <PredictionSections prediction={prediction} />
          ) : (
            <PredictionComingSoon />
          )}

          <div className="mt-12">
            <Link
              href="/schedule"
              className="label-mono text-ink-soft transition hover:text-horizon"
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

function PredictionSections({
  prediction,
}: {
  prediction: ReturnType<typeof getPrediction> & object;
}) {
  const ranked: TeamProbability[] = prediction.teamProbabilities.slice();
  const top = ranked.slice(0, 4);
  const tail = ranked.slice(4);
  const tailSum = tail.reduce((acc, t) => acc + t.probability, 0);
  const leader = ranked[0];

  return (
    <>
      {/* Probability ladder */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Who will play here
          </h2>
          <span className="label-mono text-ink-soft">
            {prediction.iterations.toLocaleString()} sims ·{" "}
            {minutesAgo(prediction.lastUpdatedIso)} min ago
          </span>
        </header>

        <div className="flex flex-col gap-5">
          {top.map((row, idx) => (
            <ProbabilityBar
              key={row.team.code}
              prefix={row.team.flag}
              label={row.team.name}
              probability={row.probability}
              tone={TONE_BY_RANK[idx] ?? "ink"}
              delayMs={idx * 90}
              sub={`Group ${row.team.group} · ${qualPath(row.team.code, row.team.group)}`}
            />
          ))}
          {tail.length > 0 && (
            <ProbabilityBar
              prefix="·"
              label={`${tail.length} other teams`}
              probability={tailSum}
              tone="muted"
              size="sm"
              delayMs={top.length * 90}
            />
          )}
        </div>
      </section>

      <Separator className="my-12 bg-ink-line" />

      {/* Pair ladder */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Most likely matchups
          </h2>
          <span className="label-mono text-ink-soft">
            Top {prediction.pairProbabilities.length} pairings
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3">
          {prediction.pairProbabilities.map((pair, idx) => (
            <Card
              key={`${pair.teamA.code}-${pair.teamB.code}`}
              className="border-ink-line/70 bg-paper/40 backdrop-blur"
            >
              <CardContent className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-baseline gap-2.5 text-base sm:text-lg">
                  <span aria-hidden className="text-xl">
                    {pair.teamA.flag}
                  </span>
                  <span className="font-display font-bold text-ink">
                    {pair.teamA.name}
                  </span>
                  <span className="font-display italic text-horizon">
                    vs
                  </span>
                  <span aria-hidden className="text-xl">
                    {pair.teamB.flag}
                  </span>
                  <span className="font-display font-bold text-ink">
                    {pair.teamB.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="hidden text-sm italic text-ink-soft sm:inline">
                    {pair.flavor}
                  </span>
                  <span className="font-mono text-base tabular-nums text-ink">
                    {(pair.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-12 bg-ink-line" />

      {/* News timeline */}
      <section className="flex flex-col gap-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            What moved these probabilities
          </h2>
          <span className="label-mono text-ink-soft">Hand-curated until F3</span>
        </header>

        <ol className="flex flex-col gap-4">
          {prediction.news.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-1 border-l-2 border-horizon/60 pl-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="label-mono text-ink-soft">{event.date}</span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    event.deltaPct >= 0 ? "text-horizon" : "text-twilight"
                  }`}
                >
                  {event.deltaPct >= 0 ? "+" : ""}
                  {event.deltaPct.toFixed(1)}pt
                </span>
              </div>
              <p className="font-display text-lg font-bold text-ink">
                {event.headline}
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                {event.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Separator className="my-12 bg-ink-line" />

      <VerdictCard
        title={
          leader
            ? `${leader.team.name} is most likely on this pitch.`
            : "Stay flexible."
        }
        verdict={deriveVerdict(leader?.probability ?? 0)}
        body={
          leader
            ? `${formatProbability(leader.probability)} of our simulations put ${leader.team.name} into this fixture. The wildcard pool is volatile — we'll update this if the pre-tournament window shifts.`
            : "Probabilities are still warming up. Check back when the agent has a verdict."
        }
        confidence={leader?.probability}
        accessory={
          <span className="label-mono rounded-full border border-ink-line bg-paper/40 px-2 py-1 text-twilight">
            Trace · Phoenix MCP
          </span>
        }
      />
    </>
  );
}

function PredictionComingSoon() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
        Predictions warming up
      </h2>
      <Card className="glass-panel border-0">
        <CardContent className="flex flex-col gap-3 py-7">
          <p className="font-display text-xl italic text-ink">
            The Monte Carlo engine ships in week 2.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            For each fixture the agent will run 100,000 simulations of the rest
            of the tournament and post calibrated probabilities here. The
            persona example lives on{" "}
            <Link
              href="/match/87"
              className="text-twilight underline-offset-4 hover:underline"
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

function qualPath(_code: string, group: string): string {
  // Until F1 wires real qualification probabilities, give a generic path label.
  return `via Group ${group}`;
}

function minutesAgo(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}
