/**
 * Stub data — Phase 1 scaffold only.
 * Real probabilities will come from the Monte Carlo engine
 * (backend/agent_tools/monte_carlo.py) once F1 is wired up.
 *
 * TODO(F1): replace this module with a query against the predictions
 * table; pre-warm via the `run_monte_carlo` tool on the backend.
 */

export type TeamCode = string;

export type Team = {
  code: TeamCode;
  name: string;
  flag: string;
  group: string;
};

export type TeamProbability = {
  team: Team;
  probability: number;
};

export type PairProbability = {
  teamA: Team;
  teamB: Team;
  probability: number;
  flavor: string;
};

export type NewsEvent = {
  id: string;
  date: string;
  headline: string;
  detail: string;
  impactTeam: TeamCode;
  deltaPct: number;
};

export type Match = {
  id: number;
  round: "Group" | "Round of 32" | "Round of 16" | "Quarter-final" | "Semi-final" | "Final";
  stadium: string;
  city: string;
  country: "USA" | "Canada" | "Mexico";
  kickoffIso: string;
  slotDescription: string;
  iterations: number;
  lastUpdatedIso: string;
  teamProbabilities: TeamProbability[];
  pairProbabilities: PairProbability[];
  news: NewsEvent[];
};

const t = (code: string, name: string, flag: string, group: string): Team => ({
  code,
  name,
  flag,
  group,
});

export const STUB_TEAMS = {
  ARG: t("ARG", "Argentina", "🇦🇷", "J"),
  BRA: t("BRA", "Brazil", "🇧🇷", "L"),
  ESP: t("ESP", "Spain", "🇪🇸", "H"),
  FRA: t("FRA", "France", "🇫🇷", "K"),
  GER: t("GER", "Germany", "🇩🇪", "I"),
  POR: t("POR", "Portugal", "🇵🇹", "F"),
  ENG: t("ENG", "England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "G"),
  NED: t("NED", "Netherlands", "🇳🇱", "C"),
  CRO: t("CRO", "Croatia", "🇭🇷", "B"),
  URU: t("URU", "Uruguay", "🇺🇾", "E"),
};

export const STUB_MATCH_87: Match = {
  id: 87,
  round: "Round of 32",
  stadium: "Mercedes-Benz Stadium",
  city: "Atlanta, GA",
  country: "USA",
  kickoffIso: "2026-07-04T22:00:00Z", // 18:00 EDT
  slotDescription: "Second of Group J vs first of Group I or third-place wildcard",
  iterations: 100_000,
  lastUpdatedIso: "2026-05-17T17:30:00Z",
  teamProbabilities: [
    { team: STUB_TEAMS.ARG, probability: 0.47 },
    { team: STUB_TEAMS.BRA, probability: 0.31 },
    { team: STUB_TEAMS.ESP, probability: 0.12 },
    { team: STUB_TEAMS.FRA, probability: 0.07 },
    { team: STUB_TEAMS.GER, probability: 0.015 },
    { team: STUB_TEAMS.POR, probability: 0.008 },
    { team: STUB_TEAMS.ENG, probability: 0.005 },
    { team: STUB_TEAMS.NED, probability: 0.002 },
  ],
  pairProbabilities: [
    {
      teamA: STUB_TEAMS.ARG,
      teamB: STUB_TEAMS.BRA,
      probability: 0.142,
      flavor: "Classic. High-drama.",
    },
    {
      teamA: STUB_TEAMS.ARG,
      teamB: STUB_TEAMS.ESP,
      probability: 0.108,
      flavor: "Latin pride.",
    },
    {
      teamA: STUB_TEAMS.ARG,
      teamB: STUB_TEAMS.FRA,
      probability: 0.075,
      flavor: "2022 final rematch.",
    },
    {
      teamA: STUB_TEAMS.BRA,
      teamB: STUB_TEAMS.ESP,
      probability: 0.069,
      flavor: "Samba meets tiki-taka.",
    },
    {
      teamA: STUB_TEAMS.BRA,
      teamB: STUB_TEAMS.FRA,
      probability: 0.041,
      flavor: "1998 ghosts.",
    },
  ],
  news: [
    {
      id: "news-vini-2026-06-09",
      date: "2026-06-09",
      headline: "Vinicius injury (BRA)",
      detail: "Brazil's path through this slot dropped from 36% to 31% (-5pt).",
      impactTeam: "BRA",
      deltaPct: -5,
    },
    {
      id: "news-arg-2026-06-07",
      date: "2026-06-07",
      headline: "Argentina won Group J",
      detail: "Their probability here rose from 41% to 47%.",
      impactTeam: "ARG",
      deltaPct: 6,
    },
  ],
};

export const STUB_MATCHES: Record<number, Match> = {
  87: STUB_MATCH_87,
};

export const formatProbability = (p: number): string =>
  `${Math.round(p * 100)}%`;

export const formatKickoff = (iso: string, tz = "America/New_York"): string => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: tz,
  }).format(d);
};
