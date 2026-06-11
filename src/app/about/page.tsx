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
            Every World Cup product tries to predict who lifts the trophy.
            Rootin4 answers a smaller, more personal question: who actually
            plays at the seat you already bought?
          </Lead>

          <SectionLabel>The riddle</SectionLabel>
          <Body>
            The 2026 World Cup spans three countries, sixteen stadiums and
            104 matches — and tickets are sold by match number, months before
            the bracket exists. If you hold a knockout ticket, your seat reads
            like a puzzle: <em className="font-display">Winner Group K versus
            a third-place finisher from Group D, E, I, J or L</em>. Rootin4
            translates that into probabilities per team and per pairing, and
            into one plain-language answer: should you get on the plane?
          </Body>

          <SectionLabel>How the numbers are made</SectionLabel>
          <Body>
            A Monte Carlo engine replays the entire tournament thousands of
            times per question — all 104 fixtures, FIFA tiebreakers, the
            third-place allocation, penalty shootouts — from Elo-based team
            strengths. The probability next to a team is simply the share of
            simulated tournaments in which it reaches your match.
          </Body>
          <Body>
            Once the tournament kicks off, reality takes over: every recorded
            result is locked into the simulations, and both teams&apos;
            ratings are updated from it before the remaining fixtures are
            sampled. The small chart beside each probability is that
            number&apos;s history — one step per real event, the way a market
            re-prices on news.
          </Body>

          <SectionLabel>The agent that audits itself</SectionLabel>
          <Body>
            On top of the engine sits an agent built with Google&apos;s Agent
            Development Kit and Gemini 2.5. Every model call and tool call is
            traced to Arize Phoenix — and the agent can read those traces
            back. Ask it to audit its calibration: when the evidence shows a
            systematic bias, it corrects its own priors and says so. The
            system is designed to sharpen as the tournament progresses —
            exactly when your decision gets urgent.
          </Body>

          <SectionLabel>Why you can trust it</SectionLabel>
          <Body>
            Three rules keep us honest. Every number is computed live by the
            engine — no placeholders, ever. Every change of mind is public —
            results, corrections and re-pricing all land in the activity feed
            and on the charts. And if the backend is unreachable, we show
            nothing rather than something made up.
          </Body>

          <Body>
            We can&apos;t tell you who lifts the trophy in New Jersey on July
            19. We aim to tell you, with calibrated honesty, who is most
            likely to be standing on the pitch in front of your seat.
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="label-mono mt-12 border-t border-ink-line pt-6 text-twilight">
      {children}
    </h2>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-lg leading-[1.7] text-ink sm:text-xl">{children}</p>
  );
}
