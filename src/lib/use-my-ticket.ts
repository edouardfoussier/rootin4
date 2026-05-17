"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "rootin4:my-ticket";
const EVT = "rootin4:ticket-changed";

export type MyTicket = {
  matchId: number;
  markedAtIso: string;
};

function readTicket(): MyTicket | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MyTicket;
    if (typeof parsed?.matchId !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeTicket(ticket: MyTicket | null) {
  if (typeof window === "undefined") return;
  if (ticket === null) {
    window.localStorage.removeItem(KEY);
  } else {
    window.localStorage.setItem(KEY, JSON.stringify(ticket));
  }
  // Notify other subscribers in the same tab.
  window.dispatchEvent(new CustomEvent(EVT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback();
  };
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVT, onCustom);
  };
}

/**
 * Returns the current "my ticket" from localStorage plus setters.
 * Safe to use in client components; SSR-rendered output is `null` until
 * hydration completes, matching expectations for browser-only state.
 */
export function useMyTicket() {
  const ticket = useSyncExternalStore(
    subscribe,
    () => readTicket(),
    () => null
  );

  const setTicket = useCallback((matchId: number) => {
    writeTicket({ matchId, markedAtIso: new Date().toISOString() });
  }, []);

  const clearTicket = useCallback(() => {
    writeTicket(null);
  }, []);

  return { ticket, setTicket, clearTicket } as const;
}

/** Imperative read for places where a hook would be awkward (e.g. effect setup). */
export function readMyTicketOnce(): MyTicket | null {
  return readTicket();
}

/** Cleanup hook — clears ticket on legacy data migrations if ever needed. */
export function useTicketMigration() {
  useEffect(() => {
    // Reserved hook; no-op for now.
  }, []);
}
