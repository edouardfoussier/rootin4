import { cn } from "@/lib/utils";

type Props = {
  label: string;
  prefix?: string;
  probability: number;
  highlight?: boolean;
  className?: string;
};

export function ProbabilityBar({
  label,
  prefix,
  probability,
  highlight,
  className,
}: Props) {
  const pct = Math.round(probability * 100);
  return (
    <div className={cn("group/bar grid grid-cols-[1.6rem_minmax(7rem,11rem)_1fr_3rem] items-center gap-3", className)}>
      <span className="text-lg leading-none" aria-hidden>
        {prefix ?? "•"}
      </span>
      <span className="font-display text-base text-foreground tracking-tight">
        {label}
      </span>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
            highlight ? "bg-rust" : "bg-foreground/75"
          )}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className="label-mono text-right tabular-nums text-foreground">
        {pct}%
      </span>
    </div>
  );
}
