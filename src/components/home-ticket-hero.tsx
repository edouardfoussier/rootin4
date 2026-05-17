"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="border-dashed border-rust/40 bg-card">
        <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Ticket className="mt-0.5 h-5 w-5 text-rust" />
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-medium">
                You haven&apos;t marked your ticket yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Find the match you bought a seat for, mark it, and Rootin4 will
                pin the prediction to every page you visit.
              </p>
            </div>
          </div>
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:bg-rust"
          >
            Find my match →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const match = MATCHES_BY_ID[ticket.matchId];
  if (!match) return null;
  const stadium = getStadium(match);
  const { a, b } = getMatchTeams(match);

  return (
    <Card className="border-rust/60 bg-card ring-2 ring-rust/30">
      <CardContent className="flex flex-col gap-2 py-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label-mono text-rust">
            Your ticket · Match #{match.id}
          </span>
          <span className="label-mono text-muted-foreground">
            {ROUND_LABEL[match.round]}
          </span>
        </div>
        <p className="font-display text-2xl font-semibold tracking-tight">
          {a.team && b.team ? (
            <>
              {a.team.flag} {a.team.name}{" "}
              <span className="font-serif-accent text-rust">vs</span>{" "}
              {b.team.flag} {b.team.name}
            </>
          ) : (
            <>
              {a.slot}{" "}
              <span className="font-serif-accent text-rust">vs</span>{" "}
              {b.slot}
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {stadium.name} · {stadium.city} · {formatShortDate(match.date)} at{" "}
          {match.kickoffLocal} local
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href={`/match/${match.id}`}
            className="inline-flex items-center rounded-full bg-rust px-4 py-2 text-sm font-medium text-rust-foreground transition hover:opacity-90"
          >
            Open the prediction →
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-rust hover:text-rust"
          >
            Browse the schedule
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
