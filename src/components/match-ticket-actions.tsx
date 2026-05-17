"use client";

import { Check, Ticket, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMyTicket } from "@/lib/use-my-ticket";

type Props = {
  matchId: number;
};

export function MatchTicketActions({ matchId }: Props) {
  const { ticket, setTicket, clearTicket } = useMyTicket();
  const isMine = ticket?.matchId === matchId;
  const hasOther = ticket && ticket.matchId !== matchId;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {isMine ? (
        <>
          <span className="inline-flex items-center gap-2 rounded-full bg-rust/15 px-3 py-1.5 text-sm text-rust">
            <Check className="h-4 w-4" /> This match is on your ticket
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearTicket}
            className="text-muted-foreground hover:text-rust"
          >
            <X className="mr-1 h-4 w-4" /> Forget my ticket
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setTicket(matchId)}
            className="bg-foreground text-background hover:bg-rust"
          >
            <Ticket className="mr-1 h-4 w-4" /> I have a ticket for this match
          </Button>
          {hasOther && (
            <span className="label-mono text-muted-foreground">
              (replaces your saved Match #{ticket!.matchId})
            </span>
          )}
        </>
      )}
    </div>
  );
}
