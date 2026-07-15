import type { ResultReport, ResultRow } from "./result-types";

const teams = {
  UF: { name: "Florida", color: "#FA4616" },
  UT: { name: "Texas", color: "#BF5700" },
  USC: { name: "USC", color: "#990000" },
  LSU: { name: "LSU", color: "#461D7C" },
  UO: { name: "Oregon", color: "#154733" },
  UGA: { name: "Georgia", color: "#BA0C2F" },
};

function raceRow(
  rank: number,
  name: string,
  time: string,
  teamAbbr: keyof typeof teams,
  rawTime: number,
  gender: string,
  status = "",
  section: number | null = null,
  sectionPlace: number | null = null,
): ResultRow {
  const team = teams[teamAbbr];
  return {
    rank,
    name,
    time,
    rawTime,
    gap: rank === 1 ? 0 : Number((rawTime - 10.71).toFixed(2)),
    section,
    sectionPlace,
    gender,
    team: team.name,
    teamAbbr,
    teamColor: team.color,
    points: rank <= 8 ? [10, 8, 6, 5, 4, 3, 2, 1][rank - 1] : null,
    medal: rank === 1 ? "GOLD" : rank === 2 ? "SILVER" : rank === 3 ? "BRONZE" : null,
    qualified: false,
    status: status || (rank <= 3 ? `${rank}${rank === 1 ? "ST" : rank === 2 ? "ND" : "RD"}` : ""),
  };
}

function standingRow(rank: number, teamAbbr: keyof typeof teams, points: number): ResultRow {
  const team = teams[teamAbbr];
  return {
    rank,
    name: team.name,
    time: "",
    rawTime: null,
    gap: null,
    section: null,
    sectionPlace: null,
    gender: "",
    team: team.name,
    teamAbbr,
    teamColor: team.color,
    points,
    medal: rank === 1 ? "GOLD" : rank === 2 ? "SILVER" : rank === 3 ? "BRONZE" : null,
    qualified: false,
    status: "",
  };
}

export function getDemoReports(): ResultReport[] {
  const now = Date.now();
  const standings = [
    standingRow(1, "UF", 36),
    standingRow(2, "UT", 31),
    standingRow(3, "USC", 24),
    standingRow(4, "LSU", 19),
    standingRow(5, "UO", 14),
    standingRow(6, "UGA", 9),
  ];
  const base = {
    schemaVersion: 1 as const,
    meetId: "demo-meet",
    source: { universeId: "demo", placeId: "demo", jobId: "demo" },
    standings,
    metadata: { Demo: true },
  };

  return [
    {
      ...base,
      reportId: "demo-100m-w-final",
      kind: "RaceResults",
      category: "Women",
      roundName: "Final",
      event: "100M",
      stage: "FINAL",
      isFinal: true,
      rowCount: 8,
      capturedAt: new Date(now - 45_000).toISOString(),
      receivedAt: new Date(now - 44_000).toISOString(),
      results: [
        raceRow(1, "Sha'Carri Richardson", "10.71", "UF", 10.71, "Women"),
        raceRow(2, "Julien Alfred", "10.78", "UT", 10.78, "Women"),
        raceRow(3, "Shericka Jackson", "10.84", "USC", 10.84, "Women"),
        raceRow(4, "Marie-Josee Ta Lou", "10.91", "LSU", 10.91, "Women"),
        raceRow(5, "Dina Asher-Smith", "10.96", "UO", 10.96, "Women"),
        raceRow(6, "Daryll Neita", "11.02", "UGA", 11.02, "Women"),
        raceRow(7, "Twanisha Terry", "11.08", "USC", 11.08, "Women"),
        raceRow(8, "Aleia Hobbs", "11.11", "LSU", 11.11, "Women"),
      ],
    },
    {
      ...base,
      reportId: "demo-100m-m-final",
      kind: "RaceResults",
      category: "Men",
      roundName: "Final",
      event: "100M",
      stage: "FINAL",
      isFinal: true,
      rowCount: 8,
      capturedAt: new Date(now - 180_000).toISOString(),
      receivedAt: new Date(now - 178_000).toISOString(),
      results: [
        raceRow(1, "Noah Lyles", "9.79", "UF", 9.79, "Men"),
        raceRow(2, "Kishane Thompson", "9.80", "UT", 9.8, "Men"),
        raceRow(3, "Fred Kerley", "9.81", "USC", 9.81, "Men"),
        raceRow(4, "Akani Simbine", "9.86", "LSU", 9.86, "Men"),
        raceRow(5, "Letsile Tebogo", "9.88", "UO", 9.88, "Men"),
        raceRow(6, "Oblique Seville", "9.91", "UGA", 9.91, "Men"),
        raceRow(7, "Kenneth Bednarek", "9.95", "USC", 9.95, "Men"),
        raceRow(8, "Marcell Jacobs", "10.03", "LSU", 10.03, "Men"),
      ],
    },
    {
      ...base,
      reportId: "demo-200m-w-semi",
      kind: "RaceResults",
      category: "Women",
      roundName: "Semifinal Qualifiers",
      event: "200M",
      stage: "SEMIFINAL",
      isFinal: false,
      rowCount: 8,
      capturedAt: new Date(now - 420_000).toISOString(),
      receivedAt: new Date(now - 418_000).toISOString(),
      results: [
        raceRow(1, "Gabby Thomas", "21.91", "UT", 21.91, "Women", "Q", 4, 1),
        raceRow(2, "Brittany Brown", "22.04", "USC", 22.04, "Women", "Q", 2, 1),
        raceRow(3, "Favour Ofili", "22.11", "LSU", 22.11, "Women", "Q", 1, 1),
        raceRow(4, "Mujinga Kambundji", "22.23", "UO", 22.23, "Women", "Q", 3, 1),
        raceRow(5, "Dina Asher-Smith", "22.28", "UGA", 22.28, "Women", "Q", 4, 2),
        raceRow(6, "Twanisha Terry", "22.33", "UF", 22.33, "Women", "Q", 2, 2),
        raceRow(7, "Marie-Josee Ta Lou", "22.41", "USC", 22.41, "Women", "Q", 1, 2),
        raceRow(8, "Shericka Jackson", "22.47", "LSU", 22.47, "Women", "Q", 3, 2),
      ],
    },
    {
      ...base,
      reportId: "demo-team-standings",
      kind: "TeamStandings",
      category: "Meet",
      roundName: "Overall Team Standings",
      event: "CHAMPIONSHIP",
      stage: "MEET COMPLETE",
      isFinal: true,
      rowCount: standings.length,
      capturedAt: new Date(now - 30_000).toISOString(),
      receivedAt: new Date(now - 29_000).toISOString(),
      results: standings,
    },
  ];
}
