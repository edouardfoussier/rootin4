import type { ReactNode } from "react";

type Verdict = "book" | "hold" | "wait";

type Props = {
  /** Top-line decision verb. Defaults derive from `verdict`. */
  title: string;
  verdict: Verdict;
  /** One-line plain-language reasoning. */
  body: string;
  /** Optional small confidence chip on the divider row. */
  confidence?: number;
  /** Optional right-hand accessory in the divider (e.g. a link to traces). */
  accessory?: ReactNode;
};

const VERDICT_LABEL: Record<Verdict, string> = {
  book: "Book the flight",
  hold: "Hold the seat",
  wait: "Wait it out",
};

const VERDICT_TONE: Record<Verdict, string> = {
  book: "text-horizon",
  hold: "text-twilight",
  wait: "text-ink-soft",
};

export function VerdictCard({ title, verdict, body, confidence, accessory }: Props) {
  return (
    <article className="glass-panel relative rounded-3xl p-8 sm:p-10">
      <span className="label-mono mb-6 block text-twilight">
        The decision
      </span>
      <h3 className="font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
        {title}
      </h3>
      <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
        {body}
      </p>
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-ink-line pt-4">
        <span className={`font-display text-xl font-bold sm:text-2xl ${VERDICT_TONE[verdict]}`}>
          {VERDICT_LABEL[verdict]}.
        </span>
        <div className="flex items-center gap-4">
          {confidence !== undefined && (
            <span className="font-mono text-xs tabular-nums text-ink-soft">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
          {accessory}
        </div>
      </div>
    </article>
  );
}

export function deriveVerdict(probability: number): Verdict {
  if (probability >= 0.35) return "book";
  if (probability >= 0.15) return "hold";
  return "wait";
}
