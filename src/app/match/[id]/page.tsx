import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchTicketActions } from "@/components/match-ticket-actions";
import { ProbSparkline } from "@/components/prob-sparkline";
import { ProbabilityBar } from "@/components/probability-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VerdictCard, deriveVerdict } from "@/components/verdict-card";
import { getLivePrediction, getMatchHistory } from "@/lib/live-data";
import {
  formatProbability,
  getMatch,
  historySeries,
  type MatchHistory,
  type MatchPrediction,
  type RecordedResult,
  type TeamProbability,
} from "@/lib/predictions";
import {
  HOST_LABEL,
  ROUND_LABEL,
  TEAMS,
  formatShortDate,
  getMatchTeams,
  getStadium,
  type TeamCode,
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

  const [prediction, history] = await Promise.all([
    getLivePrediction(matchId),
    getMatchHistory(matchId),
  ]);
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
                  The match is locked in, but the participants aren&apos;t. This
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
            match.round === "group" ? (
              <GroupMatchSections
                prediction={prediction}
                history={history}
                homeName={a.team?.name ?? "Home side"}
                awayName={b.team?.name ?? "Away side"}
              />
            ) : (
              <PredictionSections prediction={prediction} history={history} />
            )
          ) : (
            <PredictionComingSoon />
          )}

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/schedule"
              className="label-mono text-ink-soft transition hover:text-horizon"
            >
              ← back to the schedule
            </Link>
            <Link
              href={`/agent?q=${encodeURIComponent(
                `I have a ticket for match ${match.id} — what should I expect?`
              )}`}
              className="inline-flex items-center rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-paper shadow-md transition hover:opacity-90"
            >
              Ask the agent about this match →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** "FULL-TIME" banner once the operator records the real score. */
function FullTimeBanner({ result }: { result: RecordedResult }) {
  const teamA = TEAMS[result.teamA as TeamCode];
  const teamB = TEAMS[result.teamB as TeamCode];
  return (
    <article className="glass-panel rounded-3xl border-l-4 border-l-horizon p-7 sm:p-8">
      <span className="label-mono flex items-center gap-2 text-horizon">
        <span className="inline-block h-2 w-2 rounded-full bg-horizon" aria-hidden />
        Full-time · official result
      </span>
      <p className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
        <span aria-hidden>{teamA?.flag}</span> {teamA?.name ?? result.teamA}{" "}
        <span className="font-mono tabular-nums">{result.scoreLine}</span>{" "}
        <span aria-hidden>{teamB?.flag}</span> {teamB?.name ?? result.teamB}
        {result.goalsA === result.goalsB && result.winner && (
          <span className="text-ink-soft">
            {" "}
            · {TEAMS[result.winner as TeamCode]?.name ?? result.winner} on pens
          </span>
        )}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Recorded {formatShortDate(result.recordedAt.slice(0, 10))}. This score
        is now locked into all simulations, and both teams&apos; Elo ratings
        have been updated from it — every probability on this site already
        prices it in.
      </p>
    </article>
  );
}

/**
 * Group fixtures: the participants are locked by the schedule, so the
 * interesting questions are the result and the scoreline — not "who
 * shows up" (the answer would be a silly 100%).
 */
function GroupMatchSections({
  prediction,
  history,
  homeName,
  awayName,
}: {
  prediction: MatchPrediction;
  history: MatchHistory | null;
  homeName: string;
  awayName: string;
}) {
  const outcome = prediction.outcomeProbabilities;
  const played = prediction.result ?? null;
  const favourite =
    outcome && outcome.home !== outcome.away
      ? outcome.home > outcome.away
        ? homeName
        : awayName
      : null;

  const spark = (key: "home" | "draw" | "away", label: string) => (
    <ProbSparkline values={historySeries(history, key)} label={label} />
  );

  return (
    <>
      {played && (
        <>
          <FullTimeBanner result={played} />
          <Separator className="my-12 bg-ink-line" />
        </>
      )}

      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            {played ? "How the forecast saw it" : "How this match plays out"}
          </h2>
          <span className="label-mono text-ink-soft">
            {prediction.iterations.toLocaleString()} sims ·{" "}
            {minutesAgo(prediction.lastUpdatedIso)} min ago
          </span>
        </header>

        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
          {played
            ? "Each line traces the forecast at every real event — opening price, recorded results, agent self-corrections — up to the final whistle."
            : "The matchup is locked — both teams are guaranteed on this pitch. What the simulations price is the result, and each line traces how that price has moved."}
        </p>

        {outcome && (
          <div className="flex flex-col gap-5">
            <ProbabilityBar
              prefix="🏠"
              label={`${homeName} win`}
              probability={outcome.home}
              tone="twilight"
              delayMs={0}
              accessory={spark("home", `${homeName} win odds over time`)}
            />
            <ProbabilityBar
              prefix="🤝"
              label="Draw"
              probability={outcome.draw}
              tone="muted"
              delayMs={90}
              accessory={spark("draw", "Draw odds over time")}
            />
            <ProbabilityBar
              prefix="✈️"
              label={`${awayName} win`}
              probability={outcome.away}
              tone="horizon"
              delayMs={180}
              accessory={spark("away", `${awayName} win odds over time`)}
            />
          </div>
        )}
      </section>

      {prediction.mostLikelyScores && !played && (
        <>
          <Separator className="my-12 bg-ink-line" />
          <ScorelineSection
            scores={prediction.mostLikelyScores}
            homeName={homeName}
            awayName={awayName}
          />
        </>
      )}

      {!played && (
        <>
          <Separator className="my-12 bg-ink-line" />

          <VerdictCard
            title={
              favourite
                ? `${favourite} are the favourites.`
                : "Too close to call."
            }
            // The matchup is locked — the seat decision isn't in question,
            // only the result is. Always "book".
            verdict="book"
            body={`Both teams are guaranteed on this pitch. Across ${prediction.iterations.toLocaleString()} simulated tournaments, this match ends ${formatProbability(
              outcome?.home ?? 0
            )} ${homeName} / ${formatProbability(outcome?.draw ?? 0)} draw / ${formatProbability(
              outcome?.away ?? 0
            )} ${awayName}.`}
            confidence={Math.max(outcome?.home ?? 0, outcome?.away ?? 0)}
            accessory={
              <span className="label-mono rounded-full border border-ink-line bg-paper/40 px-2 py-1 text-twilight">
                Trace · Phoenix MCP
              </span>
            }
          />
        </>
      )}
    </>
  );
}

function ScorelineSection({
  scores,
  homeName,
  awayName,
}: {
  scores: NonNullable<MatchPrediction["mostLikelyScores"]>;
  homeName: string;
  awayName: string;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Most likely scorelines
        </h2>
        <span className="label-mono text-ink-soft">
          {homeName} – {awayName}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {scores.slice(0, 5).map((s, i) => (
          <div
            key={s.score}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-5 backdrop-blur ${
              i === 0
                ? "border-twilight/60 bg-twilight/10"
                : "border-ink-line/70 bg-paper/40"
            }`}
          >
            <span className="font-display text-3xl text-ink">{s.score}</span>
            <span className="font-mono text-xs tabular-nums text-ink-soft">
              {(s.probability * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PredictionSections({
  prediction,
  history,
}: {
  prediction: MatchPrediction;
  history: MatchHistory | null;
}) {
  const ranked: TeamProbability[] = prediction.teamProbabilities.slice();
  const top = ranked.slice(0, 4);
  const tail = ranked.slice(4);
  const tailSum = tail.reduce((acc, t) => acc + t.probability, 0);
  const leader = ranked[0];
  const played = prediction.result ?? null;

  const spark = (code: string, name: string) => (
    <ProbSparkline
      values={historySeries(history, code)}
      label={`${name} appearance odds over time`}
    />
  );

  return (
    <>
      {played && (
        <>
          <FullTimeBanner result={played} />
          <Separator className="my-12 bg-ink-line" />
        </>
      )}

      {/* Probability ladder */}
      <section className="flex flex-col gap-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            {played ? "Who the forecast expected here" : "Who will play here"}
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
              sub={`Group ${row.team.group}`}
              accessory={spark(row.team.code, row.team.name)}
            />
          ))}
          {tail.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <ProbabilityBar
                  prefix="·"
                  label={`${tail.length} other teams`}
                  probability={tailSum}
                  tone="muted"
                  size="sm"
                  delayMs={top.length * 90}
                  sub="The rest of the field — click to expand"
                  accessory={
                    <span
                      className="inline-block text-ink-soft transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    >
                      ⌄
                    </span>
                  }
                />
              </summary>
              <div className="mt-4 flex flex-col gap-4 border-l-2 border-ink-line pl-4">
                {tail.map((row, idx) => (
                  <ProbabilityBar
                    key={row.team.code}
                    prefix={row.team.flag}
                    label={row.team.name}
                    probability={row.probability}
                    tone="muted"
                    size="xs"
                    delayMs={idx * 60}
                    sub={`Group ${row.team.group}`}
                    accessory={spark(row.team.code, row.team.name)}
                  />
                ))}
              </div>
            </details>
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
          {prediction.pairProbabilities.map((pair) => (
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

      {prediction.mostLikelyScores && !played && (
        <>
          <Separator className="my-12 bg-ink-line" />
          <ScorelineSection
            scores={prediction.mostLikelyScores}
            homeName={prediction.pairProbabilities[0]?.teamA.name ?? "Slot A"}
            awayName={prediction.pairProbabilities[0]?.teamB.name ?? "Slot B"}
          />
          {typeof prediction.penaltyShootoutRate === "number" &&
            prediction.penaltyShootoutRate > 0 && (
              <p className="mt-4 label-mono text-horizon">
                {(prediction.penaltyShootoutRate * 100).toFixed(0)}% of
                simulations send this one to penalties
              </p>
            )}
        </>
      )}

      {!played && (
        <>
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
                ? `${formatProbability(leader.probability)} of our simulations put ${leader.team.name} into this match. The bracket re-prices as real results land — check back after each matchday.`
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
      )}
    </>
  );
}

function PredictionComingSoon() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
        The engine is catching its breath
      </h2>
      <Card className="glass-panel border-0">
        <CardContent className="flex flex-col gap-3 py-7">
          <p className="font-display text-xl italic text-ink">
            Probabilities are computed live — and right now the simulation
            backend didn&apos;t answer.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            Every number comes from the real engine — never a placeholder.
            Refresh in a few seconds, or browse the{" "}
            <Link
              href="/schedule"
              className="text-twilight underline-offset-4 hover:underline"
            >
              schedule
            </Link>{" "}
            while the engine comes back.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function minutesAgo(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}
