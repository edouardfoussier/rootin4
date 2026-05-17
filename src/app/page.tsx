import Link from "next/link";

import { HomeTicketHero } from "@/components/home-ticket-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { getPrediction } from "@/lib/stub-data";
import {
  HOST_LABEL,
  MATCHES,
  formatShortDate,
  getMatchTeams,
  getStadium,
} from "@/lib/wc2026-data";

/** Three fixtures across host countries to anchor the home page. */
const TEASER_IDS = [87, 1, 73] as const;

export default function Home() {
  const teasers = TEASER_IDS.map((id) => MATCHES.find((m) => m.id === id)).filter(
    Boolean
  ) as (typeof MATCHES)[number][];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Editorial hero */}
        <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-12 sm:pt-24">
          <span className="label-mono text-twilight">
            World Cup 2026 · USA · Canada · Mexico · June 11 – July 19
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,9vw,6rem)] font-black leading-[0.92] tracking-tight text-ink">
            Who actually shows up at your seat?
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Every other World Cup product predicts who wins. Rootin4 predicts
            who actually walks onto the pitch in front of the seat you already
            bought.{" "}
            <span className="font-display italic text-ink">
              48 teams. 16 stadiums. 104 fixtures. One riddle.
            </span>
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-medium text-paper shadow-md transition hover:opacity-90"
            >
              Find my fixture →
            </Link>
            <Link
              href="/match/87"
              className="inline-flex items-center rounded-full border border-ink-line bg-paper/60 px-6 py-3 text-sm font-medium text-ink backdrop-blur transition hover:border-horizon hover:text-horizon"
            >
              See Match #87 in action
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center rounded-full border border-ink-line bg-paper/60 px-6 py-3 text-sm font-medium text-ink backdrop-blur transition hover:border-twilight hover:text-twilight"
            >
              How Rootin4 thinks
            </Link>
          </div>
        </section>

        {/* Saved ticket (or empty-state CTA) */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-12">
          <HomeTicketHero />
        </section>

        {/* Teaser fixtures */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <header className="flex items-baseline justify-between border-b border-ink-line pb-3">
            <h2 className="label-mono text-ink-soft">Teaser fixtures</h2>
            <Link
              href="/schedule"
              className="label-mono text-ink-soft transition hover:text-horizon"
            >
              See all 104 →
            </Link>
          </header>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {teasers.map((match) => (
              <TeaserCard key={match.id} matchId={match.id} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function TeaserCard({ matchId }: { matchId: number }) {
  const match = MATCHES.find((m) => m.id === matchId);
  if (!match) return null;
  const stadium = getStadium(match);
  const { a, b } = getMatchTeams(match);
  const prediction = getPrediction(matchId);
  const leader = prediction?.teamProbabilities[0];

  return (
    <Link
      href={`/match/${match.id}`}
      className="group rounded-2xl border border-ink-line/70 bg-paper/50 p-5 backdrop-blur transition hover:border-twilight"
    >
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <CardContent className="flex flex-col gap-3 p-0">
          <div className="flex items-baseline justify-between">
            <span className="label-mono text-ink-soft">
              Match #{match.id}
            </span>
            <span className="label-mono text-ink-soft">
              {HOST_LABEL[match.hostCountry]}
            </span>
          </div>
          <p className="font-display text-2xl font-bold leading-tight text-ink">
            {a.team && b.team
              ? `${a.team.name} vs ${b.team.name}`
              : `${a.slot} vs ${b.slot}`}
          </p>
          <p className="text-sm text-ink-soft">
            {stadium.name} · {stadium.city}
          </p>
          <p className="label-mono text-ink-soft">
            {formatShortDate(match.date)}
          </p>
          {leader && (
            <p className="mt-2 inline-flex items-baseline gap-2 self-start rounded-full bg-twilight/10 px-3 py-1 text-twilight">
              <span className="font-mono text-xs tabular-nums">
                {Math.round(leader.probability * 100)}%
              </span>
              <span className="font-display text-xs italic">
                {leader.team.name}
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
