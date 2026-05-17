import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { STUB_MATCH_87, formatProbability } from "@/lib/stub-data";

export default function Home() {
  const topTwo = STUB_MATCH_87.teamProbabilities.slice(0, 2);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pt-20 pb-12">
          <span className="label-mono text-rust">World Cup 2026 · USA · Canada · Mexico</span>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Every World Cup tool predicts <span className="font-serif-accent text-rust">who wins.</span>
            <br />
            <span className="text-foreground/80">Rootin</span>
            <span className="font-serif-accent text-rust">4</span>
            <span className="text-foreground/80"> predicts </span>
            <span className="font-serif-accent text-foreground">who shows up at the seat you already bought.</span>
          </h1>

          <p className="mt-6 max-w-2xl font-display text-lg text-muted-foreground">
            104 matches. 48 teams. One question Marco can&apos;t answer:{" "}
            <em className="font-serif-accent text-foreground">
              who&apos;s playing in Match 87?
            </em>{" "}
            We ran 100,000 simulations and asked the news. Here&apos;s our best guess.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/match/87"
              className="inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:bg-rust"
            >
              See Match 87 →
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-rust hover:text-rust"
            >
              How the agent learns
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-16">
          <h2 className="font-display text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Today&apos;s spotlight
          </h2>
          <Card className="mt-4 border-border/80 bg-card">
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="label-mono text-muted-foreground">
                  Match #{STUB_MATCH_87.id} · {STUB_MATCH_87.round}
                </span>
                <p className="font-display text-2xl font-semibold tracking-tight">
                  {STUB_MATCH_87.stadium}
                  <span className="font-serif-accent ml-2 text-xl text-rust">
                    · {STUB_MATCH_87.city}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {STUB_MATCH_87.slotDescription}.
                </p>
              </div>
              <div className="flex items-center gap-5">
                {topTwo.map((row) => (
                  <div key={row.team.code} className="flex flex-col items-end gap-1">
                    <span className="text-2xl" aria-hidden>{row.team.flag}</span>
                    <span className="font-display text-base font-medium">{row.team.name}</span>
                    <span className="label-mono text-rust">
                      {formatProbability(row.probability)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 font-serif-accent text-lg text-muted-foreground">
            Scaffold demo — full schedule, team views, and agent introspection ship as we build.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
