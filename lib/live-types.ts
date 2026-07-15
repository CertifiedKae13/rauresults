import type { ResultSource, SplitTime } from "./result-types";

export type WorldRecord = {
  event: string;
  label: string;
  time: string;
  rawTime: number;
  athlete: string;
  country: string;
  year: number;
};

export type LiveEntrant = {
  rank: number;
  name: string;
  lane: number;
  gender: string;
  team: string;
  teamAbbr: string;
  teamColor: string;
  distanceMeters: number;
  progress: number;
  state: string;
  finishPlace: number | null;
  currentRawTime: number | null;
  currentTime: string;
  finishRawTime: number | null;
  finishTime: string | null;
  splits: SplitTime[];
};

export type LiveRace = {
  schemaVersion: 1;
  meetId: string;
  raceId: string;
  status: "RUNNING" | "COMPLETE";
  category: string;
  roundName: string;
  event: string;
  eventDistance: number;
  timerSeconds: number;
  timerRunning: boolean;
  checkpoints: number[];
  capturedAt: string;
  capturedAtUnix: number;
  receivedAt?: string;
  worldRecord: WorldRecord | null;
  source: ResultSource;
  entrants: LiveEntrant[];
};

export type LiveResponse = {
  live: LiveRace | null;
  demo: boolean;
  serverNow: string;
};
