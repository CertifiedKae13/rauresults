export type ResultRow = {
  rank: number;
  name: string;
  time: string;
  rawTime: number | null;
  gap: number | null;
  section: number | null;
  sectionPlace: number | null;
  gender: string;
  team: string;
  teamAbbr: string;
  teamColor: string;
  points: number | null;
  medal: string | null;
  qualified: boolean;
  status: string;
};

export type ResultSource = {
  universeId: string;
  placeId: string;
  jobId: string;
};

export type ResultReport = {
  reportId: string;
  schemaVersion: 1;
  meetId: string;
  kind: "RaceResults" | "TeamStandings";
  category: string;
  roundName: string;
  event: string;
  stage: string;
  isFinal: boolean;
  rowCount: number;
  capturedAt: string;
  receivedAt?: string;
  source: ResultSource;
  results: ResultRow[];
  standings: ResultRow[];
  metadata: Record<string, unknown>;
};

export type ResultsResponse = {
  reports: ResultReport[];
  demo: boolean;
  updatedAt: string;
};

export type IngestResult = {
  inserted: boolean;
};
