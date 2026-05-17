import { cn } from "@/lib/utils";

type Tone = "twilight" | "horizon" | "ink" | "muted";

type Props = {
  label: string;
  prefix?: string;
  probability: number;
  tone?: Tone;
  /** Optional support copy (qualification path, group, etc.). */
  sub?: string;
  /** Stagger delay in ms applied to the keyframe; staggers a list of bars. */
  delayMs?: number;
  /** Compact heights. `default` ≈ 72px, `sm` ≈ 48px, `xs` ≈ 36px. */
  size?: "default" | "sm" | "xs";
  className?: string;
};

const TONE_CLASS: Record<Tone, string> = {
  twilight: "prob-fill--twilight",
  horizon: "prob-fill--horizon",
  ink: "prob-fill--ink",
  muted: "prob-fill--muted",
};

export function ProbabilityBar({
  label,
  prefix,
  probability,
  tone = "twilight",
  sub,
  delayMs = 0,
  size = "default",
  className,
}: Props) {
  const pct = Math.max(0, Math.min(100, +(probability * 100).toFixed(1)));
  const heightClass =
    size === "xs" ? "prob-track--xs" : size === "sm" ? "prob-track--sm" : "";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          {prefix && (
            <span className="text-xl leading-none" aria-hidden>
              {prefix}
            </span>
          )}
          <span className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {label}
          </span>
        </div>
        <span className="font-mono text-lg font-medium tabular-nums text-ink sm:text-xl">
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className={cn("prob-track", heightClass)} aria-hidden>
        <div
          className={cn("prob-fill", TONE_CLASS[tone])}
          style={
            {
              "--bar-w": `${pct}%`,
              "--bar-delay": `${delayMs}ms`,
            } as React.CSSProperties
          }
        />
      </div>

      {sub && (
        <p className="label-mono text-ink-soft">{sub}</p>
      )}

      {/* Screen-reader text for accessibility — color/length is decorative. */}
      <span className="sr-only">
        {label}: {pct.toFixed(1)} percent probability.
        {sub && ` ${sub}`}
      </span>
    </div>
  );
}
