"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";

import { useMyTicket } from "@/lib/use-my-ticket";
import {
  MATCHES_BY_ID,
  ROUND_LABEL,
  formatShortDate,
  getMatchTeams,
  getStadium,
} from "@/lib/wc2026-data";

export function HomeTicketHero() {
  const { ticket } = useMyTicket();

  if (!ticket) {
    return (
      <article className="glass-panel rounded-2xl border-dashed">
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Ticket className="mt-0.5 h-5 w-5 text-horizon" />
            <div className="flex flex-col gap-1">
              <p className="font-display text-xl italic text-ink">
                You haven&apos;t marked your ticket yet.
              </p>
              <p className="text-sm text-ink-soft">
                Find the fixture you bought a seat for, mark it, and Rootin4
                pins the prediction to every page you visit.
              </p>
            </div>
          </div>
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center self-start rounded-full bg-twilight px-5 py-2 text-sm font-medium text-paper transition hover:opacity-90 sm:self-auto"
          >
            Find my match →
          </Link>
        </div>
      </article>
    );
  }

  const match = MATCHES_BY_ID[ticket.matchId];
  if (!match) return null;
  const stadium = getStadium(match);
  const { a, b } = getMatchTeams(match);

  return (
    <article className="glass-panel rounded-2xl border-horizon/40">
      <div className="flex flex-col gap-3 px-6 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label-mono text-horizon">
            Your ticket · Match #{match.id}
          </span>
          <span className="label-mono text-ink-soft">
            {ROUND_LABEL[match.round]}
          </span>
        </div>
        <p className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {a.team && b.team ? (
            <>
              {a.team.flag} {a.team.name}{" "}
              <span className="italic text-horizon">vs</span>{" "}
              {b.team.flag} {b.team.name}
            </>
          ) : (
            <>
              {a.slot}{" "}
              <span className="italic text-horizon">vs</span>{" "}
              {b.slot}
            </>
          )}
        </p>
        <p className="text-sm text-ink-soft">
          {stadium.name} · {stadium.city} · {formatShortDate(match.date)} at{" "}
          {match.kickoffLocal} local
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href={`/match/${match.id}`}
            className="inline-flex items-center rounded-full bg-twilight px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90"
          >
            Open the prediction →
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center rounded-full border border-ink-line bg-paper/60 px-4 py-2 text-sm font-medium text-ink transition hover:border-horizon hover:text-horizon"
          >
            Browse the schedule
          </Link>
        </div>
      </div>
    </article>
  );
}
