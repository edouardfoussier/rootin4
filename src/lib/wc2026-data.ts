/**
 * 2026 FIFA World Cup — full schedule + groups + stadiums.
 *
 * Source: Wikipedia article "2026 FIFA World Cup" (snapshot used at scaffold
 * time). Cross-checked against the bracket structure published by FIFA after
 * the official draw on December 5, 2025.
 *
 * What is real here:
 *  - 16 stadiums with city + host country
 *  - 12 groups with their drawn teams (in FIFA's published order)
 *  - 36 group-stage matchday blocks (group × matchday → date + 2 venues)
 *  - 32 knockout matches with their date, stadium, and the FIFA slot
 *    descriptions (e.g. "Winner Group K vs 3rd-place D/E/I/J/L")
 *
 * What is an approximation, marked `estimated`:
 *  - Kickoff times: standardised to 18:00 local until we pull the official
 *    FIFA fixture API
 *  - Which of the two MD pairings happens at which of the two daily venues
 *    (the FIFA rotation gives us the pairings, the venue allocation per
 *    pairing is best-effort)
 *
 * F1 will replace the placeholder kickoffs with the official ones and add
 * per-match resolved teams as the tournament progresses.
 */

export type HostCountry = "USA" | "CAN" | "MEX";

export type TeamCode =
  | "MEX" | "RSA" | "KOR" | "CZE"
  | "CAN" | "BIH" | "QAT" | "SUI"
  | "BRA" | "MAR" | "HAI" | "SCO"
  | "USA" | "PAR" | "AUS" | "TUR"
  | "GER" | "CUW" | "CIV" | "ECU"
  | "NED" | "JPN" | "SWE" | "TUN"
  | "BEL" | "EGY" | "IRN" | "NZL"
  | "ESP" | "CPV" | "KSA" | "URU"
  | "FRA" | "SEN" | "IRQ" | "NOR"
  | "ARG" | "ALG" | "AUT" | "JOR"
  | "POR" | "COD" | "UZB" | "COL"
  | "ENG" | "CRO" | "GHA" | "PAN";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Round =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "tp"
  | "final";

export type Team = {
  code: TeamCode;
  name: string;
  flag: string;
  group: GroupLetter;
  /** Drawn seed within the group (1–4). Drives the FIFA rotation. */
  seed: 1 | 2 | 3 | 4;
  /** Pre-tournament Elo prior (best-effort, refreshed during the agent's
   *  weekly Elo update task). */
  eloSeed: number;
};

export type Stadium = {
  code: string;
  /** FIFA-sponsor-free venue name used during the tournament. */
  fifaName: string;
  /** Commercial name, used in normal life. */
  name: string;
  city: string;
  country: HostCountry;
  capacity: number;
  /** Approx kickoff timezone for displaying local times. */
  timeZone: string;
};

export type Match = {
  id: number;
  round: Round;
  /** ISO date (no time component). */
  date: string;
  /** Local kickoff time at the stadium (HH:mm). */
  kickoffLocal: string;
  /** Stadium code (see `STADIUMS`). */
  stadium: string;
  /** Convenient host-country shortcut. */
  hostCountry: HostCountry;
  /** Group letter for group-stage matches. */
  group?: GroupLetter;
  /** For group stage: confirmed team pairing (already drawn). */
  teamA?: TeamCode;
  teamB?: TeamCode;
  /** For knockout: FIFA slot descriptions for each side. */
  slotA?: string;
  slotB?: string;
  /** True when the kickoff is a best-guess pending official confirmation. */
  estimatedKickoff?: boolean;
};

// ----------------------------------------------------------------------------
// Stadiums
// ----------------------------------------------------------------------------

export const STADIUMS: Record<string, Stadium> = {
  AZTECA:    { code: "AZTECA",    fifaName: "Estadio Banorte",         name: "Estadio Azteca",          city: "Mexico City",       country: "MEX", capacity: 87523, timeZone: "America/Mexico_City" },
  AKRON:     { code: "AKRON",     fifaName: "Estadio Guadalajara",     name: "Estadio Akron",           city: "Zapopan",           country: "MEX", capacity: 49850, timeZone: "America/Mexico_City" },
  BBVA:      { code: "BBVA",      fifaName: "Estadio Monterrey",       name: "Estadio BBVA",            city: "Guadalupe, NL",     country: "MEX", capacity: 53500, timeZone: "America/Monterrey" },
  BMO:       { code: "BMO",       fifaName: "Toronto Stadium",         name: "BMO Field",               city: "Toronto",           country: "CAN", capacity: 45500, timeZone: "America/Toronto" },
  BC_PLACE:  { code: "BC_PLACE",  fifaName: "Vancouver Stadium",       name: "BC Place",                city: "Vancouver",         country: "CAN", capacity: 54500, timeZone: "America/Vancouver" },
  MBS:       { code: "MBS",       fifaName: "Atlanta Stadium",         name: "Mercedes-Benz Stadium",   city: "Atlanta, GA",       country: "USA", capacity: 71000, timeZone: "America/New_York" },
  GILLETTE:  { code: "GILLETTE",  fifaName: "Boston Stadium",          name: "Gillette Stadium",        city: "Foxborough, MA",    country: "USA", capacity: 65878, timeZone: "America/New_York" },
  ATT:       { code: "ATT",       fifaName: "Dallas Stadium",          name: "AT&T Stadium",            city: "Arlington, TX",     country: "USA", capacity: 80000, timeZone: "America/Chicago" },
  NRG:       { code: "NRG",       fifaName: "Houston Stadium",         name: "NRG Stadium",             city: "Houston, TX",       country: "USA", capacity: 72220, timeZone: "America/Chicago" },
  ARROWHEAD: { code: "ARROWHEAD", fifaName: "Kansas City Stadium",     name: "Arrowhead Stadium",       city: "Kansas City, MO",   country: "USA", capacity: 76416, timeZone: "America/Chicago" },
  SOFI:      { code: "SOFI",      fifaName: "Los Angeles Stadium",     name: "SoFi Stadium",            city: "Inglewood, CA",     country: "USA", capacity: 70240, timeZone: "America/Los_Angeles" },
  HARD_ROCK: { code: "HARD_ROCK", fifaName: "Miami Stadium",           name: "Hard Rock Stadium",       city: "Miami Gardens, FL", country: "USA", capacity: 65326, timeZone: "America/New_York" },
  METLIFE:   { code: "METLIFE",   fifaName: "New York New Jersey Stadium", name: "MetLife Stadium",     city: "East Rutherford, NJ", country: "USA", capacity: 82500, timeZone: "America/New_York" },
  LINC:      { code: "LINC",      fifaName: "Philadelphia Stadium",    name: "Lincoln Financial Field", city: "Philadelphia, PA",  country: "USA", capacity: 69596, timeZone: "America/New_York" },
  LEVIS:     { code: "LEVIS",     fifaName: "Bay Area Stadium",        name: "Levi's Stadium",          city: "Santa Clara, CA",   country: "USA", capacity: 68500, timeZone: "America/Los_Angeles" },
  LUMEN:     { code: "LUMEN",     fifaName: "Seattle Stadium",         name: "Lumen Field",             city: "Seattle, WA",       country: "USA", capacity: 68740, timeZone: "America/Los_Angeles" },
};

// ----------------------------------------------------------------------------
// Teams & groups
// ----------------------------------------------------------------------------

const team = (
  code: TeamCode,
  name: string,
  flag: string,
  group: GroupLetter,
  seed: 1 | 2 | 3 | 4,
  eloSeed: number
): Team => ({ code, name, flag, group, seed, eloSeed });

export const TEAMS: Record<TeamCode, Team> = Object.fromEntries(
  [
    // Group A
    team("MEX", "Mexico",          "🇲🇽", "A", 1, 1815),
    team("RSA", "South Africa",    "🇿🇦", "A", 2, 1640),
    team("KOR", "South Korea",     "🇰🇷", "A", 3, 1800),
    team("CZE", "Czechia",         "🇨🇿", "A", 4, 1690),

    // Group B
    team("CAN", "Canada",          "🇨🇦", "B", 1, 1730),
    team("BIH", "Bosnia-Herzegovina", "🇧🇦", "B", 2, 1640),
    team("QAT", "Qatar",           "🇶🇦", "B", 3, 1685),
    team("SUI", "Switzerland",     "🇨🇭", "B", 4, 1825),

    // Group C
    team("BRA", "Brazil",          "🇧🇷", "C", 1, 2030),
    team("MAR", "Morocco",         "🇲🇦", "C", 2, 1850),
    team("HAI", "Haiti",           "🇭🇹", "C", 3, 1560),
    team("SCO", "Scotland",        "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "C", 4, 1750),

    // Group D
    team("USA", "United States",   "🇺🇸", "D", 1, 1810),
    team("PAR", "Paraguay",        "🇵🇾", "D", 2, 1685),
    team("AUS", "Australia",       "🇦🇺", "D", 3, 1770),
    team("TUR", "Türkiye",         "🇹🇷", "D", 4, 1750),

    // Group E
    team("GER", "Germany",         "🇩🇪", "E", 1, 1985),
    team("CUW", "Curaçao",         "🇨🇼", "E", 2, 1490),
    team("CIV", "Ivory Coast",     "🇨🇮", "E", 3, 1780),
    team("ECU", "Ecuador",         "🇪🇨", "E", 4, 1825),

    // Group F
    team("NED", "Netherlands",     "🇳🇱", "F", 1, 1990),
    team("JPN", "Japan",           "🇯🇵", "F", 2, 1820),
    team("SWE", "Sweden",          "🇸🇪", "F", 3, 1755),
    team("TUN", "Tunisia",         "🇹🇳", "F", 4, 1690),

    // Group G
    team("BEL", "Belgium",         "🇧🇪", "G", 1, 1955),
    team("EGY", "Egypt",           "🇪🇬", "G", 2, 1740),
    team("IRN", "Iran",            "🇮🇷", "G", 3, 1790),
    team("NZL", "New Zealand",     "🇳🇿", "G", 4, 1580),

    // Group H
    team("ESP", "Spain",           "🇪🇸", "H", 1, 2065),
    team("CPV", "Cape Verde",      "🇨🇻", "H", 2, 1610),
    team("KSA", "Saudi Arabia",    "🇸🇦", "H", 3, 1700),
    team("URU", "Uruguay",         "🇺🇾", "H", 4, 1935),

    // Group I
    team("FRA", "France",          "🇫🇷", "I", 1, 2045),
    team("SEN", "Senegal",         "🇸🇳", "I", 2, 1810),
    team("IRQ", "Iraq",            "🇮🇶", "I", 3, 1610),
    team("NOR", "Norway",          "🇳🇴", "I", 4, 1830),

    // Group J
    team("ARG", "Argentina",       "🇦🇷", "J", 1, 2125),
    team("ALG", "Algeria",         "🇩🇿", "J", 2, 1750),
    team("AUT", "Austria",         "🇦🇹", "J", 3, 1780),
    team("JOR", "Jordan",          "🇯🇴", "J", 4, 1565),

    // Group K
    team("POR", "Portugal",        "🇵🇹", "K", 1, 2020),
    team("COD", "DR Congo",        "🇨🇩", "K", 2, 1640),
    team("UZB", "Uzbekistan",      "🇺🇿", "K", 3, 1670),
    team("COL", "Colombia",        "🇨🇴", "K", 4, 1940),

    // Group L
    team("ENG", "England",         "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "L", 1, 1990),
    team("CRO", "Croatia",         "🇭🇷", "L", 2, 1920),
    team("GHA", "Ghana",           "🇬🇭", "L", 3, 1720),
    team("PAN", "Panama",          "🇵🇦", "L", 4, 1640),
  ].map((t) => [t.code, t])
) as Record<TeamCode, Team>;

export const GROUPS: Record<GroupLetter, Team[]> = (() => {
  const acc: Partial<Record<GroupLetter, Team[]>> = {};
  for (const t of Object.values(TEAMS)) {
    (acc[t.group] ||= []).push(t);
  }
  // Sort each group by seed for predictability
  for (const letter of Object.keys(acc) as GroupLetter[]) {
    acc[letter]!.sort((a, b) => a.seed - b.seed);
  }
  return acc as Record<GroupLetter, Team[]>;
})();

// ----------------------------------------------------------------------------
// Group-stage matchday venues (from Wikipedia)
// ----------------------------------------------------------------------------

type Matchday = 1 | 2 | 3;

type MdBlock = {
  group: GroupLetter;
  matchday: Matchday;
  /** Dates (one per pairing). Most matchdays share the same date except a few
   *  MD1 / MD2 blocks where FIFA spreads the two pairings across two days. */
  dates: [string, string];
  /** Stadiums (one per pairing). */
  venues: [string, string];
};

const GROUP_MD_BLOCKS: MdBlock[] = [
  // Group A
  { group: "A", matchday: 1, dates: ["2026-06-11", "2026-06-11"], venues: ["AZTECA", "AKRON"] },
  { group: "A", matchday: 2, dates: ["2026-06-18", "2026-06-18"], venues: ["MBS", "AKRON"] },
  { group: "A", matchday: 3, dates: ["2026-06-24", "2026-06-24"], venues: ["AZTECA", "BBVA"] },

  // Group B
  { group: "B", matchday: 1, dates: ["2026-06-12", "2026-06-13"], venues: ["BMO", "LEVIS"] },
  { group: "B", matchday: 2, dates: ["2026-06-18", "2026-06-18"], venues: ["SOFI", "BC_PLACE"] },
  { group: "B", matchday: 3, dates: ["2026-06-24", "2026-06-24"], venues: ["BC_PLACE", "LUMEN"] },

  // Group C
  { group: "C", matchday: 1, dates: ["2026-06-13", "2026-06-13"], venues: ["METLIFE", "GILLETTE"] },
  { group: "C", matchday: 2, dates: ["2026-06-19", "2026-06-19"], venues: ["GILLETTE", "LINC"] },
  { group: "C", matchday: 3, dates: ["2026-06-24", "2026-06-24"], venues: ["HARD_ROCK", "MBS"] },

  // Group D
  { group: "D", matchday: 1, dates: ["2026-06-12", "2026-06-13"], venues: ["SOFI", "BC_PLACE"] },
  { group: "D", matchday: 2, dates: ["2026-06-19", "2026-06-19"], venues: ["LUMEN", "LEVIS"] },
  { group: "D", matchday: 3, dates: ["2026-06-25", "2026-06-25"], venues: ["SOFI", "LEVIS"] },

  // Group E
  { group: "E", matchday: 1, dates: ["2026-06-14", "2026-06-14"], venues: ["NRG", "LINC"] },
  { group: "E", matchday: 2, dates: ["2026-06-20", "2026-06-20"], venues: ["BMO", "ARROWHEAD"] },
  { group: "E", matchday: 3, dates: ["2026-06-25", "2026-06-25"], venues: ["LINC", "METLIFE"] },

  // Group F
  { group: "F", matchday: 1, dates: ["2026-06-14", "2026-06-14"], venues: ["ATT", "BBVA"] },
  { group: "F", matchday: 2, dates: ["2026-06-20", "2026-06-20"], venues: ["NRG", "BBVA"] },
  { group: "F", matchday: 3, dates: ["2026-06-25", "2026-06-25"], venues: ["ATT", "ARROWHEAD"] },

  // Group G
  { group: "G", matchday: 1, dates: ["2026-06-15", "2026-06-15"], venues: ["LUMEN", "SOFI"] },
  { group: "G", matchday: 2, dates: ["2026-06-21", "2026-06-21"], venues: ["SOFI", "BC_PLACE"] },
  { group: "G", matchday: 3, dates: ["2026-06-26", "2026-06-26"], venues: ["LUMEN", "BC_PLACE"] },

  // Group H
  { group: "H", matchday: 1, dates: ["2026-06-15", "2026-06-15"], venues: ["MBS", "HARD_ROCK"] },
  { group: "H", matchday: 2, dates: ["2026-06-21", "2026-06-21"], venues: ["MBS", "HARD_ROCK"] },
  { group: "H", matchday: 3, dates: ["2026-06-26", "2026-06-26"], venues: ["NRG", "AKRON"] },

  // Group I
  { group: "I", matchday: 1, dates: ["2026-06-16", "2026-06-16"], venues: ["METLIFE", "GILLETTE"] },
  { group: "I", matchday: 2, dates: ["2026-06-22", "2026-06-22"], venues: ["LINC", "METLIFE"] },
  { group: "I", matchday: 3, dates: ["2026-06-26", "2026-06-26"], venues: ["GILLETTE", "BMO"] },

  // Group J
  { group: "J", matchday: 1, dates: ["2026-06-16", "2026-06-16"], venues: ["ARROWHEAD", "LEVIS"] },
  { group: "J", matchday: 2, dates: ["2026-06-22", "2026-06-22"], venues: ["ATT", "LEVIS"] },
  { group: "J", matchday: 3, dates: ["2026-06-27", "2026-06-27"], venues: ["ARROWHEAD", "ATT"] },

  // Group K
  { group: "K", matchday: 1, dates: ["2026-06-17", "2026-06-17"], venues: ["NRG", "AZTECA"] },
  { group: "K", matchday: 2, dates: ["2026-06-23", "2026-06-23"], venues: ["NRG", "AKRON"] },
  { group: "K", matchday: 3, dates: ["2026-06-27", "2026-06-27"], venues: ["HARD_ROCK", "MBS"] },

  // Group L
  { group: "L", matchday: 1, dates: ["2026-06-17", "2026-06-17"], venues: ["ATT", "BMO"] },
  { group: "L", matchday: 2, dates: ["2026-06-23", "2026-06-23"], venues: ["GILLETTE", "BMO"] },
  { group: "L", matchday: 3, dates: ["2026-06-27", "2026-06-27"], venues: ["METLIFE", "LINC"] },
];

/** FIFA round-robin rotation for groups of 4 (seeds 1..4):
 *  MD1 → 1v2, 3v4
 *  MD2 → 1v3, 4v2
 *  MD3 → 4v1, 2v3
 *  Returns the two pairings in the order they'll be played on the matchday. */
const ROTATION: Record<Matchday, [[1 | 2 | 3 | 4, 1 | 2 | 3 | 4], [1 | 2 | 3 | 4, 1 | 2 | 3 | 4]]> = {
  1: [[1, 2], [3, 4]],
  2: [[1, 3], [4, 2]],
  3: [[4, 1], [2, 3]],
};

function teamBySeed(group: GroupLetter, seed: 1 | 2 | 3 | 4): TeamCode {
  return GROUPS[group].find((t) => t.seed === seed)!.code;
}

// ----------------------------------------------------------------------------
// Knockout matches (from Wikipedia bracket)
// ----------------------------------------------------------------------------

type KnockoutMatch = {
  id: number;
  round: Round;
  date: string;
  stadium: string;
  slotA: string;
  slotB: string;
};

const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // Round of 32
  { id: 73, round: "r32", date: "2026-06-28", stadium: "SOFI",      slotA: "Runner-up Group A", slotB: "Runner-up Group B" },
  { id: 74, round: "r32", date: "2026-06-29", stadium: "GILLETTE",  slotA: "Winner Group E",    slotB: "3rd Group A/B/C/D/F" },
  { id: 75, round: "r32", date: "2026-06-29", stadium: "BBVA",      slotA: "Winner Group F",    slotB: "Runner-up Group C" },
  { id: 76, round: "r32", date: "2026-06-29", stadium: "NRG",       slotA: "Winner Group C",    slotB: "Runner-up Group F" },
  { id: 77, round: "r32", date: "2026-06-30", stadium: "METLIFE",   slotA: "Winner Group I",    slotB: "3rd Group C/D/F/G/H" },
  { id: 78, round: "r32", date: "2026-06-30", stadium: "ATT",       slotA: "Runner-up Group E", slotB: "Runner-up Group I" },
  { id: 79, round: "r32", date: "2026-06-30", stadium: "AZTECA",    slotA: "Winner Group A",    slotB: "3rd Group C/E/F/H/I" },
  { id: 80, round: "r32", date: "2026-07-01", stadium: "MBS",       slotA: "Winner Group L",    slotB: "3rd Group E/H/I/J/K" },
  { id: 81, round: "r32", date: "2026-07-01", stadium: "LEVIS",     slotA: "Winner Group D",    slotB: "3rd Group B/E/F/I/J" },
  { id: 82, round: "r32", date: "2026-07-01", stadium: "LUMEN",     slotA: "Winner Group G",    slotB: "3rd Group A/E/H/I/J" },
  { id: 83, round: "r32", date: "2026-07-02", stadium: "BMO",       slotA: "Runner-up Group K", slotB: "Runner-up Group L" },
  { id: 84, round: "r32", date: "2026-07-02", stadium: "SOFI",      slotA: "Winner Group H",    slotB: "Runner-up Group J" },
  { id: 85, round: "r32", date: "2026-07-02", stadium: "BC_PLACE",  slotA: "Winner Group B",    slotB: "3rd Group E/F/G/I/J" },
  { id: 86, round: "r32", date: "2026-07-03", stadium: "HARD_ROCK", slotA: "Winner Group J",    slotB: "Runner-up Group H" },
  { id: 87, round: "r32", date: "2026-07-03", stadium: "ARROWHEAD", slotA: "Winner Group K",    slotB: "3rd Group D/E/I/J/L" },
  { id: 88, round: "r32", date: "2026-07-03", stadium: "ATT",       slotA: "Runner-up Group D", slotB: "Runner-up Group G" },

  // Round of 16
  { id: 89, round: "r16", date: "2026-07-04", stadium: "LINC",      slotA: "Winner Match 74",   slotB: "Winner Match 77" },
  { id: 90, round: "r16", date: "2026-07-04", stadium: "NRG",       slotA: "Winner Match 73",   slotB: "Winner Match 75" },
  { id: 91, round: "r16", date: "2026-07-05", stadium: "METLIFE",   slotA: "Winner Match 76",   slotB: "Winner Match 78" },
  { id: 92, round: "r16", date: "2026-07-05", stadium: "AZTECA",    slotA: "Winner Match 79",   slotB: "Winner Match 80" },
  { id: 93, round: "r16", date: "2026-07-06", stadium: "ATT",       slotA: "Winner Match 83",   slotB: "Winner Match 84" },
  { id: 94, round: "r16", date: "2026-07-06", stadium: "LUMEN",     slotA: "Winner Match 81",   slotB: "Winner Match 82" },
  { id: 95, round: "r16", date: "2026-07-07", stadium: "MBS",       slotA: "Winner Match 86",   slotB: "Winner Match 88" },
  { id: 96, round: "r16", date: "2026-07-07", stadium: "BC_PLACE",  slotA: "Winner Match 85",   slotB: "Winner Match 87" },

  // Quarterfinals
  { id: 97,  round: "qf", date: "2026-07-09", stadium: "GILLETTE",  slotA: "Winner Match 89",  slotB: "Winner Match 90" },
  { id: 98,  round: "qf", date: "2026-07-10", stadium: "SOFI",      slotA: "Winner Match 93",  slotB: "Winner Match 94" },
  { id: 99,  round: "qf", date: "2026-07-11", stadium: "HARD_ROCK", slotA: "Winner Match 91",  slotB: "Winner Match 92" },
  { id: 100, round: "qf", date: "2026-07-11", stadium: "ARROWHEAD", slotA: "Winner Match 95",  slotB: "Winner Match 96" },

  // Semifinals
  { id: 101, round: "sf", date: "2026-07-14", stadium: "ATT",       slotA: "Winner Match 97",  slotB: "Winner Match 98" },
  { id: 102, round: "sf", date: "2026-07-15", stadium: "MBS",       slotA: "Winner Match 99",  slotB: "Winner Match 100" },

  // Third place + Final
  { id: 103, round: "tp",    date: "2026-07-18", stadium: "HARD_ROCK", slotA: "Loser Match 101",  slotB: "Loser Match 102" },
  { id: 104, round: "final", date: "2026-07-19", stadium: "METLIFE",   slotA: "Winner Match 101", slotB: "Winner Match 102" },
];

// ----------------------------------------------------------------------------
// Build the master match list
// ----------------------------------------------------------------------------

function buildGroupMatches(): Match[] {
  const out: Match[] = [];
  // Order MD blocks by date(s), then by group letter, to produce stable IDs 1..72.
  const sorted = [...GROUP_MD_BLOCKS].sort((a, b) => {
    const aDate = a.dates[0];
    const bDate = b.dates[0];
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    if (a.matchday !== b.matchday) return a.matchday - b.matchday;
    return a.group.localeCompare(b.group);
  });

  let nextId = 1;
  for (const block of sorted) {
    const [pairA, pairB] = ROTATION[block.matchday];
    out.push(
      {
        id: nextId++,
        round: "group",
        date: block.dates[0],
        kickoffLocal: "18:00",
        estimatedKickoff: true,
        stadium: block.venues[0],
        hostCountry: STADIUMS[block.venues[0]].country,
        group: block.group,
        teamA: teamBySeed(block.group, pairA[0]),
        teamB: teamBySeed(block.group, pairA[1]),
      },
      {
        id: nextId++,
        round: "group",
        date: block.dates[1],
        kickoffLocal: "18:00",
        estimatedKickoff: true,
        stadium: block.venues[1],
        hostCountry: STADIUMS[block.venues[1]].country,
        group: block.group,
        teamA: teamBySeed(block.group, pairB[0]),
        teamB: teamBySeed(block.group, pairB[1]),
      }
    );
  }
  return out;
}

function buildKnockoutMatches(): Match[] {
  return KNOCKOUT_MATCHES.map((m) => ({
    id: m.id,
    round: m.round,
    date: m.date,
    kickoffLocal: "18:00",
    estimatedKickoff: true,
    stadium: m.stadium,
    hostCountry: STADIUMS[m.stadium].country,
    slotA: m.slotA,
    slotB: m.slotB,
  }));
}

export const MATCHES: Match[] = [...buildGroupMatches(), ...buildKnockoutMatches()];
export const MATCHES_BY_ID: Record<number, Match> = Object.fromEntries(
  MATCHES.map((m) => [m.id, m])
);

// ----------------------------------------------------------------------------
// Convenience helpers
// ----------------------------------------------------------------------------

export const ROUND_LABEL: Record<Round, string> = {
  group: "Group stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  tp: "Third-place play-off",
  final: "Final",
};

export const HOST_LABEL: Record<HostCountry, string> = {
  USA: "United States",
  CAN: "Canada",
  MEX: "Mexico",
};

export function getStadium(match: Match): Stadium {
  return STADIUMS[match.stadium];
}

export function getMatchTeams(match: Match): {
  a: { team?: Team; slot?: string };
  b: { team?: Team; slot?: string };
} {
  return {
    a: { team: match.teamA ? TEAMS[match.teamA] : undefined, slot: match.slotA },
    b: { team: match.teamB ? TEAMS[match.teamB] : undefined, slot: match.slotB },
  };
}

/** ISO date → "Sat, July 4" for compact UIs. */
export function formatShortDate(iso: string): string {
  // Force UTC interpretation so we don't drift across timezones.
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Returns a friendly kickoff line for a match card. */
export function formatMatchKickoff(match: Match): string {
  const stadium = getStadium(match);
  return `${formatShortDate(match.date)} · ${match.kickoffLocal} local · ${stadium.city}`;
}
