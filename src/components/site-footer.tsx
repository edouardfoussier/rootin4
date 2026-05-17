import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-line/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg italic text-ink">
          An independent forecast for the seat you bought.
        </p>
        <div className="flex flex-col gap-1 text-right sm:items-end">
          <p className="label-mono text-ink-soft">
            Google Cloud Rapid Agent Hackathon · Arize track
          </p>
          <p className="text-xs text-ink-soft">
            Not affiliated with FIFA. Not betting advice.{" "}
            <Link
              href="/about"
              className="text-twilight underline-offset-4 hover:underline"
            >
              Read the manifesto →
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
