import { ScheduleExplorer } from "@/components/schedule-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MATCHES, STADIUMS } from "@/lib/wc2026-data";

export const metadata = {
  title: "Schedule · Rootin4",
  description:
    "All 104 fixtures of the 2026 FIFA World Cup. Filter by date, round, host country, or team — then mark the one you bought a ticket for.",
};

export default function SchedulePage() {
  const total = MATCHES.length;
  const venues = Object.keys(STADIUMS).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 pt-12 pb-20">
          <section className="flex flex-col gap-3 pb-8">
            <span className="label-mono text-rust">The full calendar</span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {total} fixtures.{" "}
              <span className="font-serif-accent text-rust">{venues} stadiums.</span>{" "}
              <span className="text-foreground/80">One seat that&apos;s yours.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Filter by date, round, host country, or team. Tap any match to see
              who&apos;s most likely to play there. Mark the one you bought a
              ticket for — Rootin4 will then surface it on every page.
            </p>
          </section>

          <ScheduleExplorer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
