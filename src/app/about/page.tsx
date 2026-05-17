import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About · Rootin4",
  description:
    "The manifesto. A weather forecast for the seat you bought — what Rootin4 is, who it's for, and how the agent earns its credibility.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 pt-16 pb-12 sm:pt-24">
          <span className="label-mono text-twilight">Manifesto</span>
          <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] font-black leading-[0.92] tracking-tight text-ink">
            Rootin4
          </h1>

          <Lead>
            Every other World Cup product is trying to predict who wins the
            tournament. We&apos;re trying to predict who actually shows up at
            the seat you already bought.
          </Lead>

          <Body>
            The 2026 World Cup runs across three countries, sixteen stadiums,
            and one hundred and four matches. Most of the knockout-stage
            tickets were sold months before the bracket was decided — which
            means most knockout-stage ticket-holders are sitting on a riddle.
            Winner Group K versus the third-place finisher from Group D, E, I,
            J, or L. Now what?
          </Body>

          <Body>
            Rootin4 is a weather forecast for that riddle. Not betting odds,
            not a fantasy bracket, not a countdown clock. A calm,
            continuously-updating probability per team and per pairing for
            each fixture, with a single plain-language answer to the only
            question that actually matters: should I get on the plane?
          </Body>

          <Body>
            Behind the surface is an agent built on Google&apos;s Agent
            Development Kit and Gemini 2.5. <em className="font-display">In
            the version you&apos;re reading this on, the engine is still
            warming up.</em> When the Monte Carlo loop lands, the agent will
            simulate the rest of the tournament thousands of times an hour.
            When the news pipeline lands, it&apos;ll ingest match-window
            reports and adjust priors when a starter is ruled out or a
            qualification ban is overturned. After every completed match, the
            agent will grade its own prediction, look for the bias that
            caused it to miss, and correct itself before the next round. The
            model is designed to get better the deeper the tournament goes —
            exactly when it matters most.
          </Body>

          <Body>
            We show that work. Every probability you see on this site is
            traced in Arize Phoenix; when the agent corrects itself, that
            entry shows up in the ticker pinned to the bottom of your screen;
            when it identifies a systematic bias in its own thinking, that
            goes on the agent page. We&apos;d rather show you a model that
            publicly changes its mind than a confident number with no soul.
          </Body>

          <Body>
            Rootin4 is for Marco in Lyon, who owns a Round-of-32 ticket and
            isn&apos;t a stats nerd. It&apos;s for everyone who bought into
            the riddle and now wants the riddle translated, gently, into a
            decision. We can&apos;t tell you who&apos;ll lift the trophy in
            New Jersey on the nineteenth of July. We aim to tell you, with
            calibrated honesty, who is most likely to be standing on the
            pitch in front of your seat.
          </Body>

          <p className="mt-12 font-display text-4xl italic text-horizon">
            Make the call.
          </p>

          <p className="mt-12 border-t border-ink-line pt-6 text-sm leading-relaxed text-ink-soft">
            Rootin4 is an independent forecast built for the{" "}
            <Link
              href="https://rapid-agent.devpost.com/"
              className="text-twilight underline-offset-4 hover:underline"
            >
              Google Cloud Rapid Agent Hackathon (Arize track)
            </Link>
            . Not affiliated with FIFA. Not betting advice.{" "}
            <span className="block mt-2">
              Source on{" "}
              <Link
                href="https://github.com/edouardfoussier/rootin4"
                className="text-twilight underline-offset-4 hover:underline"
              >
                GitHub
              </Link>
              .
            </span>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 font-display text-3xl italic leading-[1.25] text-ink sm:text-4xl">
      {children}
    </p>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-lg leading-[1.7] text-ink sm:text-xl">{children}</p>
  );
}
