import { ScheduleExplorer } from "@/components/schedule-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MATCHES, STADIUMS } from "@/lib/wc2026-data";

export const metadata = {
  title: "The 32 riddle matches · Rootin4",
  description:
    "The 32 knockout matches of the 2026 FIFA World Cup — the ones where nobody knows who plays yet. Find yours and see who's most likely to show up.",
};

export default function SchedulePage() {
  const riddles = MATCHES.filter((m) => m.round !== "group").length;
  const venues = Object.keys(STADIUMS).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-6 pt-12 pb-20">
          <section className="flex flex-col gap-3 pb-8">
            <span className="label-mono text-rust">The knockout bracket</span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {riddles} matches.{" "}
              <span className="font-serif-accent text-rust">{venues} stadiums.</span>{" "}
              <span className="text-foreground/80">Nobody knows who plays.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Every knockout seat was sold before the bracket existed — that&apos;s
              the riddle Rootin4 prices. Tap any match to see who&apos;s most
              likely to play there, or filter by the team you follow. Got a
              group-stage ticket? Jump to it by number — those line-ups are
              already locked.
            </p>
          </section>

          <ScheduleExplorer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
