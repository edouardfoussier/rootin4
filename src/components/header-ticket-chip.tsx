"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";

import { useMyTicket } from "@/lib/use-my-ticket";

export function HeaderTicketChip() {
  const { ticket } = useMyTicket();
  if (!ticket) return null;
  return (
    <Link
      href={`/match/${ticket.matchId}`}
      className="hidden items-center gap-1.5 rounded-full border border-horizon/40 bg-horizon/15 px-3 py-1 text-xs font-medium text-horizon transition hover:bg-horizon/25 sm:inline-flex"
      title="Your saved ticket"
    >
      <Ticket className="h-3.5 w-3.5" /> Your ticket · Match #{ticket.matchId}
    </Link>
  );
}
