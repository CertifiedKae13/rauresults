import { env } from "cloudflare:workers";
import { getDemoLiveRace } from "./demo-live";
import type { LiveRace, LiveResponse } from "./live-types";

type D1RunResult = { meta?: { changes?: number } };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<D1RunResult>;
  first: <T>() => Promise<T | null>;
};
type D1Database = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<unknown[]>;
};
type RuntimeEnv = { DB?: D1Database };
type StoredLiveRace = { payload_json: string; received_at: string };

let liveInitialization: Promise<void> | null = null;

function database(): D1Database | null {
  return (env as unknown as RuntimeEnv).DB ?? null;
}

async function ensureLiveSchema(db: D1Database): Promise<void> {
  if (!liveInitialization) {
    liveInitialization = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS live_races (
        race_id TEXT PRIMARY KEY NOT NULL, meet_id TEXT NOT NULL, status TEXT NOT NULL,
        category TEXT NOT NULL, round_name TEXT NOT NULL, event TEXT NOT NULL,
        server_job_id TEXT NOT NULL, captured_at TEXT NOT NULL, received_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS live_races_received_at_idx ON live_races (received_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS live_races_status_idx ON live_races (status)"),
      db.prepare("CREATE INDEX IF NOT EXISTS live_races_server_job_idx ON live_races (server_job_id)"),
    ]).then(() => undefined).catch((error) => {
      liveInitialization = null;
      throw error;
    });
  }
  await liveInitialization;
}

export async function getLatestLiveRace(): Promise<LiveResponse> {
  const db = database();
  const serverNow = new Date().toISOString();
  if (!db) return { live: getDemoLiveRace(), demo: true, serverNow };

  await ensureLiveSchema(db);
  const row = await db.prepare(
    "SELECT payload_json, received_at FROM live_races ORDER BY received_at DESC LIMIT 1",
  ).first<StoredLiveRace>();
  if (!row) return { live: getDemoLiveRace(), demo: true, serverNow };

  try {
    const live = JSON.parse(row.payload_json) as LiveRace;
    const ageMs = Date.now() - Date.parse(row.received_at);
    const activeWindowMs = live.status === "RUNNING" ? 15_000 : 120_000;
    return {
      live: Number.isFinite(ageMs) && ageMs <= activeWindowMs ? { ...live, receivedAt: row.received_at } : null,
      demo: false,
      serverNow,
    };
  } catch {
    return { live: null, demo: false, serverNow };
  }
}

export async function upsertLiveRace(live: LiveRace): Promise<void> {
  const db = database();
  if (!db) throw new Error("D1 live results storage is not configured");
  await ensureLiveSchema(db);

  const receivedAt = new Date().toISOString();
  const stored = { ...live, receivedAt };
  await db.prepare(`INSERT INTO live_races (
    race_id, meet_id, status, category, round_name, event, server_job_id,
    captured_at, received_at, payload_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(race_id) DO UPDATE SET
    status = excluded.status, category = excluded.category, round_name = excluded.round_name,
    event = excluded.event, captured_at = excluded.captured_at,
    received_at = excluded.received_at, payload_json = excluded.payload_json`).bind(
    live.raceId, live.meetId, live.status, live.category, live.roundName, live.event,
    live.source.jobId, live.capturedAt, receivedAt, JSON.stringify(stored),
  ).run();

  await db.prepare("DELETE FROM live_races WHERE received_at < datetime('now', '-1 day')").run();
}
