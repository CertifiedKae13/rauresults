import { env } from "cloudflare:workers";
import { getDemoReports } from "./demo-results";
import type { IngestResult, ResultReport, ResultsResponse } from "./result-types";

type D1RunResult = { meta?: { changes?: number } };
type D1AllResult<T> = { results?: T[] };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<D1RunResult>;
  all: <T>() => Promise<D1AllResult<T>>;
  first: <T>() => Promise<T | null>;
};
type D1Database = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<unknown[]>;
};
type RuntimeEnv = { DB?: D1Database; RESULTS_INGEST_TOKEN?: string };
type StoredReport = { payload_json: string; received_at: string };

let initialization: Promise<void> | null = null;

function runtimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

export function getIngestToken(): string {
  const configured =
    runtimeEnv().RESULTS_INGEST_TOKEN?.trim() ||
    process.env.RESULTS_INGEST_TOKEN?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "development" ? "local-development-token" : "";
}

function database(): D1Database | null {
  return runtimeEnv().DB ?? null;
}

async function ensureSchema(db: D1Database): Promise<void> {
  if (!initialization) {
    initialization = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS result_reports (
          id TEXT PRIMARY KEY NOT NULL, meet_id TEXT NOT NULL, kind TEXT NOT NULL,
          category TEXT NOT NULL, round_name TEXT NOT NULL, event TEXT NOT NULL,
          stage TEXT NOT NULL, is_final INTEGER NOT NULL, row_count INTEGER NOT NULL,
          server_job_id TEXT NOT NULL, place_id TEXT NOT NULL, universe_id TEXT NOT NULL,
          captured_at TEXT NOT NULL, received_at TEXT NOT NULL, payload_json TEXT NOT NULL
        )`),
        db.prepare("CREATE INDEX IF NOT EXISTS result_reports_received_at_idx ON result_reports (received_at)"),
        db.prepare("CREATE INDEX IF NOT EXISTS result_reports_event_idx ON result_reports (event)"),
        db.prepare("CREATE INDEX IF NOT EXISTS result_reports_kind_idx ON result_reports (kind)"),
        db.prepare("CREATE INDEX IF NOT EXISTS result_reports_server_job_idx ON result_reports (server_job_id)"),
      ])
      .then(() => undefined)
      .catch((error) => {
        initialization = null;
        throw error;
      });
  }
  await initialization;
}

export async function listReports(limit = 50): Promise<ResultsResponse> {
  const db = database();
  if (!db) return { reports: getDemoReports(), demo: true, updatedAt: new Date().toISOString() };

  await ensureSchema(db);
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await db
    .prepare("SELECT payload_json, received_at FROM result_reports ORDER BY received_at DESC LIMIT ?")
    .bind(boundedLimit)
    .all<StoredReport>();

  const reports: ResultReport[] = [];
  for (const row of rows.results ?? []) {
    try {
      const parsed = JSON.parse(row.payload_json) as ResultReport;
      reports.push({ ...parsed, receivedAt: row.received_at });
    } catch {
      // Ignore a malformed historical record instead of breaking the public board.
    }
  }

  if (reports.length === 0) {
    return { reports: getDemoReports(), demo: true, updatedAt: new Date().toISOString() };
  }
  return { reports, demo: false, updatedAt: reports[0]?.receivedAt ?? new Date().toISOString() };
}

export async function reportsFromJobInLastMinute(jobId: string): Promise<number> {
  const db = database();
  if (!db) return 0;
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM result_reports WHERE server_job_id = ? AND received_at >= datetime('now', '-1 minute')")
    .bind(jobId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function insertReport(report: ResultReport): Promise<IngestResult> {
  const db = database();
  if (!db) throw new Error("D1 results storage is not configured");
  await ensureSchema(db);

  const receivedAt = new Date().toISOString();
  const stored = { ...report, receivedAt };
  const result = await db
    .prepare(`INSERT OR IGNORE INTO result_reports (
      id, meet_id, kind, category, round_name, event, stage, is_final, row_count,
      server_job_id, place_id, universe_id, captured_at, received_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      report.reportId, report.meetId, report.kind, report.category, report.roundName,
      report.event, report.stage, report.isFinal ? 1 : 0, report.rowCount,
      report.source.jobId, report.source.placeId, report.source.universeId,
      report.capturedAt, receivedAt, JSON.stringify(stored),
    )
    .run();

  return { inserted: Number(result.meta?.changes ?? 0) > 0 };
}
