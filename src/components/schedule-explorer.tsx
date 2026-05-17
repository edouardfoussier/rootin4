"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMyTicket } from "@/lib/use-my-ticket";
import {
  HOST_LABEL,
  MATCHES,
  ROUND_LABEL,
  STADIUMS,
  TEAMS,
  formatShortDate,
  getMatchTeams,
  getStadium,
  type HostCountry,
  type Match,
  type Round,
  type Team,
} from "@/lib/wc2026-data";

type GroupBy = "date" | "round" | "stadium";

const ROUND_OPTIONS: Round[] = ["group", "r32", "r16", "qf", "sf", "tp", "final"];
const HOST_OPTIONS: HostCountry[] = ["USA", "CAN", "MEX"];

export function ScheduleExplorer() {
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [hostFilter, setHostFilter] = useState<HostCountry | "ALL">("ALL");
  const [roundFilter, setRoundFilter] = useState<Round | "ALL">("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const { ticket } = useMyTicket();

  const teams = useMemo(() => {
    return Object.values(TEAMS).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredMatches = useMemo(() => {
    const teamCode = teamFilter || null;
    return MATCHES.filter((m) => {
      if (hostFilter !== "ALL" && m.hostCountry !== hostFilter) return false;
      if (roundFilter !== "ALL" && m.round !== roundFilter) return false;
      if (teamCode) {
        const matchesTeam =
          m.teamA === teamCode ||
          m.teamB === teamCode ||
          (m.slotA?.includes(`Group ${TEAMS[teamCode as keyof typeof TEAMS]?.group ?? ""}`) ?? false) ||
          (m.slotB?.includes(`Group ${TEAMS[teamCode as keyof typeof TEAMS]?.group ?? ""}`) ?? false);
        if (!matchesTeam) return false;
      }
      return true;
    });
  }, [hostFilter, roundFilter, teamFilter]);

  const grouped = useMemo(() => groupMatches(filteredMatches, groupBy), [
    filteredMatches,
    groupBy,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        hostFilter={hostFilter}
        setHostFilter={setHostFilter}
        roundFilter={roundFilter}
        setRoundFilter={setRoundFilter}
        teamFilter={teamFilter}
        setTeamFilter={setTeamFilter}
        teams={teams}
        resultCount={filteredMatches.length}
      />

      {grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <header className="flex items-baseline justify-between border-b border-border/60 pb-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {group.heading}
                </h2>
                <span className="label-mono text-muted-foreground">
                  {group.subheading}
                </span>
              </header>
              <div className="grid grid-cols-1 gap-3">
                {group.matches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    isMine={ticket?.matchId === match.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  groupBy,
  setGroupBy,
  hostFilter,
  setHostFilter,
  roundFilter,
  setRoundFilter,
  teamFilter,
  setTeamFilter,
  teams,
  resultCount,
}: {
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  hostFilter: HostCountry | "ALL";
  setHostFilter: (h: HostCountry | "ALL") => void;
  roundFilter: Round | "ALL";
  setRoundFilter: (r: Round | "ALL") => void;
  teamFilter: string;
  setTeamFilter: (t: string) => void;
  teams: Team[];
  resultCount: number;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-2 border-b border-border/60 bg-background/85 px-2 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Segmented
          label="Group by"
          options={[
            { value: "date", label: "Date" },
            { value: "round", label: "Round" },
            { value: "stadium", label: "Stadium" },
          ]}
          value={groupBy}
          onChange={(v) => setGroupBy(v as GroupBy)}
        />

        <Select
          label="Host"
          value={hostFilter}
          onChange={(v) => setHostFilter(v as HostCountry | "ALL")}
        >
          <option value="ALL">All</option>
          {HOST_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {HOST_LABEL[h]}
            </option>
          ))}
        </Select>

        <Select
          label="Round"
          value={roundFilter}
          onChange={(v) => setRoundFilter(v as Round | "ALL")}
        >
          <option value="ALL">All</option>
          {ROUND_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {ROUND_LABEL[r]}
            </option>
          ))}
        </Select>

        <Select
          label="Team"
          value={teamFilter}
          onChange={(v) => setTeamFilter(v)}
        >
          <option value="">Any</option>
          {teams.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </Select>

        <span className="ml-auto label-mono text-muted-foreground">
          {resultCount} match{resultCount === 1 ? "" : "es"}
        </span>
      </div>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-mono text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-full border border-border/80 bg-card p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              value === opt.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="label-mono text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground focus:border-rust focus:outline-none focus:ring-2 focus:ring-rust/30"
      >
        {children}
      </select>
    </label>
  );
}

function MatchRow({ match, isMine }: { match: Match; isMine: boolean }) {
  const stadium = getStadium(match);
  const { a, b } = getMatchTeams(match);

  return (
    <Link
      href={`/match/${match.id}`}
      className={`group block rounded-lg border bg-card transition hover:border-rust hover:bg-card ${
        isMine ? "border-rust/60 ring-2 ring-rust/30" : "border-border/70"
      }`}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-md border border-border/70 bg-background px-3 py-1.5 text-center label-mono">
              <span className="text-[0.6rem] text-muted-foreground">Match</span>
              <span className="text-base text-foreground">#{match.id}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="label-mono text-muted-foreground">
                {formatShortDate(match.date)} · {match.kickoffLocal} local
                {match.estimatedKickoff && " (est.)"}
              </span>
              <p className="font-display text-base font-medium text-foreground sm:text-lg">
                {a.team && b.team ? (
                  <>
                    <span aria-hidden>{a.team.flag}</span> {a.team.name}{" "}
                    <span className="font-serif-accent text-rust">vs</span>{" "}
                    <span aria-hidden>{b.team.flag}</span> {b.team.name}
                  </>
                ) : (
                  <>
                    {a.slot}{" "}
                    <span className="font-serif-accent text-rust">vs</span>{" "}
                    {b.slot}
                  </>
                )}
              </p>
              <span className="text-sm text-muted-foreground">
                {stadium.name} · {stadium.city}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="label-mono">
              {ROUND_LABEL[match.round]}
            </Badge>
            {match.group && (
              <Badge variant="outline" className="label-mono">
                Group {match.group}
              </Badge>
            )}
            {isMine && (
              <Badge className="label-mono bg-rust text-rust-foreground">
                Your ticket
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed border-border/80 bg-card">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-display text-xl font-medium">No fixtures match these filters.</p>
        <p className="text-sm text-muted-foreground">
          Try widening the host, round, or team — or reset to see all 104.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

type Group = {
  key: string;
  heading: string;
  subheading: string;
  matches: Match[];
};

function groupMatches(matches: Match[], groupBy: GroupBy): Group[] {
  const buckets = new Map<string, Match[]>();
  const order: string[] = [];
  for (const m of matches) {
    const key = bucketKey(m, groupBy);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(m);
  }

  return order.map((key) => {
    const list = buckets.get(key)!;
    const sorted = [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.id - b.id;
    });
    return {
      key,
      ...bucketLabel(key, groupBy),
      matches: sorted,
    };
  });
}

function bucketKey(m: Match, groupBy: GroupBy): string {
  if (groupBy === "date") return m.date;
  if (groupBy === "round") return m.round;
  return m.stadium;
}

function bucketLabel(
  key: string,
  groupBy: GroupBy
): { heading: string; subheading: string } {
  if (groupBy === "date") {
    return { heading: formatShortDate(key), subheading: key };
  }
  if (groupBy === "round") {
    return {
      heading: ROUND_LABEL[key as Round],
      subheading: countMatchesByRound(key as Round),
    };
  }
  const stadium = STADIUMS[key];
  return {
    heading: stadium ? `${stadium.name}` : key,
    subheading: stadium ? `${stadium.city} · ${HOST_LABEL[stadium.country]}` : "",
  };
}

function countMatchesByRound(r: Round): string {
  const total = MATCHES.filter((m) => m.round === r).length;
  return `${total} fixture${total === 1 ? "" : "s"}`;
}
