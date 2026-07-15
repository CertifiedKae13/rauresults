import { NextResponse } from "next/server";
import {
  getIngestToken,
  insertReport,
  listReports,
  reportsFromJobInLastMinute,
} from "../../../lib/results-store";
import type { ResultReport, ResultRow } from "../../../lib/result-types";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_ROWS = 64;
const MAX_REPORTS_PER_JOB_PER_MINUTE = 120;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function valueFrom(input: Record<string, unknown>, camel: string, pascal: string): unknown {
  return input[camel] ?? input[pascal];
}

function shortString(value: unknown, fallback: string, max = 120): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRow(value: unknown, fallbackRank: number): ResultRow {
  const input = record(value);
  const rank = finiteNumber(valueFrom(input, "rank", "Rank"));
  const points = finiteNumber(valueFrom(input, "points", "Points"));
  const rawTime = finiteNumber(valueFrom(input, "rawTime", "RawTime"));
  const gap = finiteNumber(valueFrom(input, "gap", "Gap"));
  const section = finiteNumber(valueFrom(input, "section", "Section"));
  const sectionPlace = finiteNumber(valueFrom(input, "sectionPlace", "SectionPlace"));

  return {
    rank: rank ? Math.max(1, Math.min(999, Math.floor(rank))) : fallbackRank,
    name: shortString(valueFrom(input, "name", "Name"), "Unknown athlete", 80),
    time: shortString(valueFrom(input, "time", "Time"), "--", 24),
    rawTime,
    gap,
    section: section === null ? null : Math.max(1, Math.min(99, Math.floor(section))),
    sectionPlace: sectionPlace === null ? null : Math.max(1, Math.min(99, Math.floor(sectionPlace))),
    gender: shortString(valueFrom(input, "gender", "Gender"), "Open", 24),
    team: shortString(valueFrom(input, "team", "Team"), "Unattached", 80),
    teamAbbr: shortString(valueFrom(input, "teamAbbr", "TeamAbbr"), "UNA", 12),
    teamColor: /^#[0-9A-Fa-f]{6}$/.test(shortString(valueFrom(input, "teamColor", "TeamColor"), ""))
      ? shortString(valueFrom(input, "teamColor", "TeamColor"), "#64748B", 7).toUpperCase()
      : "#64748B",
    points: points === null ? null : Math.max(0, Math.min(1000, Math.floor(points))),
    medal: shortString(valueFrom(input, "medal", "Medal"), "", 12) || null,
    qualified: valueFrom(input, "qualified", "Qualified") === true,
    status: shortString(valueFrom(input, "status", "Status"), "", 16),
  };
}

function normalizeRows(value: unknown): ResultRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ROWS).map((row, index) => normalizeRow(row, index + 1));
}

function normalizeReport(value: unknown): ResultReport | null {
  const input = record(value);
  const source = record(input.source);
  const reportId = shortString(input.reportId, "", 80);
  const meetId = shortString(input.meetId, "", 80);
  const jobId = shortString(source.jobId, "", 80);
  if (!reportId || !meetId || !jobId) return null;

  const results = normalizeRows(input.results);
  const standings = normalizeRows(input.standings);
  const kind = input.kind === "TeamStandings" ? "TeamStandings" : "RaceResults";
  const capturedAt = shortString(input.capturedAt, "", 40);
  const parsedCapturedAt = Date.parse(capturedAt);

  return {
    reportId,
    schemaVersion: 1,
    meetId,
    kind,
    category: shortString(input.category, "Open", 40),
    roundName: shortString(input.roundName, "Results", 80),
    event: shortString(input.event, "UNKNOWN", 40).toUpperCase(),
    stage: shortString(input.stage, "RESULTS", 40).toUpperCase(),
    isFinal: input.isFinal === true,
    rowCount: results.length,
    capturedAt: Number.isFinite(parsedCapturedAt) ? new Date(parsedCapturedAt).toISOString() : new Date().toISOString(),
    source: {
      universeId: shortString(source.universeId, "unknown", 40),
      placeId: shortString(source.placeId, "unknown", 40),
      jobId,
    },
    results,
    standings,
    metadata: record(input.metadata),
  };
}

function secureEqual(left: string, right: string): boolean {
  const max = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < max; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
  const response = await listReports(Number.isFinite(requestedLimit) ? requestedLimit : 50);
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  const expectedToken = getIngestToken();
  if (!expectedToken) {
    return NextResponse.json({ error: "Results ingest is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedToken =
    request.headers.get("x-results-token") ??
    (authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  if (!providedToken || !secureEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const report = normalizeReport(decoded);
  if (!report || report.results.length === 0) {
    return NextResponse.json(
      { error: "reportId, meetId, source.jobId, and at least one result are required" },
      { status: 400 },
    );
  }

  const recentCount = await reportsFromJobInLastMinute(report.source.jobId);
  if (recentCount >= MAX_REPORTS_PER_JOB_PER_MINUTE) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSeconds: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const result = await insertReport(report);
  return NextResponse.json(
    { ok: true, reportId: report.reportId, duplicate: !result.inserted },
    { status: result.inserted ? 201 : 200 },
  );
}
