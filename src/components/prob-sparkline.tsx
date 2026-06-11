import { cn } from "@/lib/utils";

type Props = {
  /** Probabilities in [0,1], oldest → newest. One point per real event. */
  values: number[];
  /** Accessible description, e.g. "France appearance odds over time". */
  label: string;
  /** Show the ▲/▼ move since the first point (default true). */
  showDelta?: boolean;
  className?: string;
};

const W = 88;
const H = 26;
const PAD = 3;

/**
 * Polymarket-style price history, sized for a probability row. Pure
 * SVG, no client JS — the line inherits `currentColor` from the row's
 * tone. Points are spaced evenly by event (results land irregularly;
 * even spacing keeps short histories readable).
 */
export function ProbSparkline({
  values,
  label,
  showDelta = true,
  className,
}: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Floor the y-span so a ±1pt wiggle doesn't render like a cliff.
  const span = Math.max(max - min, 0.05);
  const mid = (max + min) / 2;
  const lo = mid - span / 2;

  const x = (i: number) =>
    PAD + (i * (W - 2 * PAD)) / (values.length - 1);
  const y = (v: number) =>
    PAD + (1 - (v - lo) / span) * (H - 2 * PAD);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);

  const deltaPts = (values[values.length - 1] - values[0]) * 100;
  const flat = Math.abs(deltaPts) < 0.05;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`${label}: ${flat ? "unchanged" : `${deltaPts > 0 ? "up" : "down"} ${Math.abs(deltaPts).toFixed(1)} points`} since the opening price`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        aria-hidden
        className="shrink-0"
      >
        <path
          d={`M ${pts.join(" L ")} L ${x(values.length - 1).toFixed(1)},${H - 1} L ${x(0).toFixed(1)},${H - 1} Z`}
          fill="currentColor"
          opacity="0.1"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={x(values.length - 1)}
          cy={y(values[values.length - 1])}
          r="2.4"
          fill="currentColor"
        />
      </svg>
      {showDelta && !flat && (
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            deltaPts > 0 ? "text-twilight" : "text-horizon"
          )}
          aria-hidden
        >
          {deltaPts > 0 ? "▲" : "▼"} {Math.abs(deltaPts).toFixed(1)}
        </span>
      )}
    </span>
  );
}
