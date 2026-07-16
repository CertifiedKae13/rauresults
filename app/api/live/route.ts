import { NextResponse } from "next/server";
import { getIngestToken } from "../../../lib/results-store";
import { getLatestLiveRace, upsertLiveRace } from "../../../lib/live-store";
import { orderLiveEntrants } from "../../../lib/live-order";
import type { LiveEntrant, LiveRace, WorldRecord } from "../../../lib/live-types";
import type { RelayLegSplit, SplitTime } from "../../../lib/result-types";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 128 * 1024;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function valueFrom(input: Record<string, unknown>, camel: string, pascal: string): unknown {
  return input[camel] ?? input[pascal];
}

function shortString(value: unknown, fallback: string, max = 120): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function color(value: unknown): string {
  const candidate = shortString(value, "#64748B", 7);
  return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate.toUpperCase() : "#64748B";
}

function qualificationStatus(value: unknown): "Q" | "q" | null {
  return value === "Q" || value === "q" ? value : null;
}

function normalizeSplits(value: unknown): SplitTime[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((candidate) => {
    const input = record(candidate);
    const distance = finiteNumber(valueFrom(input, "distance", "Distance"));
    const rawTime = finiteNumber(valueFrom(input, "rawTime", "RawTime"));
    if (distance === null || rawTime === null || distance <= 0 || rawTime < 0) return [];
    const normalizedDistance = Math.min(10_000, Math.floor(distance));
    const position = finiteNumber(valueFrom(input, "position", "Position"));
    return [{
      distance: normalizedDistance,
      label: shortString(valueFrom(input, "label", "Label"), `${normalizedDistance}m`, 16),
      time: shortString(valueFrom(input, "time", "Time"), rawTime.toFixed(2), 24),
      rawTime,
      position: position === null ? null : Math.max(1, Math.min(99, Math.floor(position))),
    }];
  }).sort((left, right) => left.distance - right.distance);
}

function normalizeRelayLegs(value: unknown): RelayLegSplit[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((candidate) => {
    const input = record(candidate);
    const leg = finiteNumber(valueFrom(input, "leg", "Leg"));
    const rawTime = finiteNumber(valueFrom(input, "rawTime", "RawTime"));
    const cumulativeRawTime = finiteNumber(valueFrom(input, "cumulativeRawTime", "CumulativeRawTime"));
    if (leg === null || rawTime === null || cumulativeRawTime === null || rawTime < 0 || cumulativeRawTime < 0) return [];
    return [{
      leg: Math.max(1, Math.min(4, Math.floor(leg))),
      athlete: shortString(valueFrom(input, "athlete", "Athlete"), "Unknown runner", 80),
      time: shortString(valueFrom(input, "time", "Time"), rawTime.toFixed(2), 24),
      rawTime,
      cumulativeTime: shortString(valueFrom(input, "cumulativeTime", "CumulativeTime"), cumulativeRawTime.toFixed(2), 24),
      cumulativeRawTime,
    }];
  }).sort((left, right) => left.leg - right.leg);
}

function normalizeMembers(value: unknown): string[] {
  return Array.isArray(value)
    ? value.slice(0, 4).flatMap((member) => typeof member === "string" && member.trim() ? [member.trim().slice(0, 80)] : [])
    : [];
}

function normalizeEntrants(value: unknown, eventDistance: number): LiveEntrant[] {
  if (!Array.isArray(value)) return [];
  const entrants = value.slice(0, 16).map((candidate, index) => {
    const input = record(candidate);
    const progress = Math.max(0, Math.min(1, finiteNumber(valueFrom(input, "progress", "Progress")) ?? 0));
    const finishPlace = finiteNumber(valueFrom(input, "finishPlace", "FinishPlace"));
    const state = shortString(valueFrom(input, "state", "State"), "Staged", 20);
    const reportedDistance = Math.max(0, Math.min(eventDistance, finiteNumber(valueFrom(input, "distanceMeters", "DistanceMeters")) ?? progress * eventDistance));
    const progressDistance = progress * eventDistance;
    const distanceTolerance = Math.max(1, eventDistance * 0.01);
    // The Roblox source normally publishes matching progress and distance. If a
    // malformed/stale frame claims a full lap while progress is still at the
    // blocks, prefer the normalized lane progress instead of showing 400.0m.
    const distanceMeters = Math.abs(reportedDistance - progressDistance) > distanceTolerance
      ? progressDistance
      : reportedDistance;
    const currentLeg = finiteNumber(valueFrom(input, "currentLeg", "CurrentLeg"));
    return {
      rank: index + 1,
      name: shortString(valueFrom(input, "name", "Name"), "Unknown athlete", 80),
      lane: Math.max(0, Math.min(99, Math.floor(finiteNumber(valueFrom(input, "lane", "Lane")) ?? 0))),
      gender: shortString(valueFrom(input, "gender", "Gender"), "Open", 24),
      team: shortString(valueFrom(input, "team", "Team"), "Unattached", 80),
      teamAbbr: shortString(valueFrom(input, "teamAbbr", "TeamAbbr"), "UNA", 12),
      teamColor: color(valueFrom(input, "teamColor", "TeamColor")),
      distanceMeters,
      progress,
      state,
      finishPlace: finishPlace === null ? null : Math.max(1, Math.min(99, Math.floor(finishPlace))),
      currentRawTime: finiteNumber(valueFrom(input, "currentRawTime", "CurrentRawTime")),
      currentTime: shortString(valueFrom(input, "currentTime", "CurrentTime"), "--", 24),
      finishRawTime: finiteNumber(valueFrom(input, "finishRawTime", "FinishRawTime")),
      finishTime: shortString(valueFrom(input, "finishTime", "FinishTime"), "", 24) || null,
      qualificationStatus: qualificationStatus(valueFrom(input, "qualificationStatus", "QualificationStatus")),
      splits: normalizeSplits(valueFrom(input, "splits", "Splits")),
      relayLegs: normalizeRelayLegs(valueFrom(input, "relayLegs", "RelayLegs")),
      members: normalizeMembers(valueFrom(input, "members", "Members")),
      activeAthlete: shortString(valueFrom(input, "activeAthlete", "ActiveAthlete"), "", 80) || null,
      currentLeg: currentLeg === null ? null : Math.max(1, Math.min(4, Math.floor(currentLeg))),
      batonState: shortString(valueFrom(input, "batonState", "BatonState"), "", 20) || null,
    } satisfies LiveEntrant;
  });

  return orderLiveEntrants(entrants);
}

function normalizeWorldRecord(value: unknown): WorldRecord | null {
  const input = record(value);
  const rawTime = finiteNumber(input.rawTime);
  if (rawTime === null) return null;
  return {
    event: shortString(input.event, "TRACK", 20),
    label: shortString(input.label, "World record", 40),
    time: shortString(input.time, rawTime.toFixed(2), 24),
    rawTime,
    athlete: shortString(input.athlete, "Official record", 80),
    country: shortString(input.country, "", 8),
    year: Math.max(1900, Math.min(2200, Math.floor(finiteNumber(input.year) ?? new Date().getUTCFullYear()))),
  };
}

function normalizeLiveRace(value: unknown): LiveRace | null {
  const input = record(value);
  const source = record(input.source);
  const raceId = shortString(input.raceId, "", 80);
  const meetId = shortString(input.meetId, "", 80);
  const jobId = shortString(source.jobId, "", 80);
  if (!raceId || !meetId || !jobId) return null;
  const eventDistance = Math.max(40, Math.min(10_000, finiteNumber(input.eventDistance) ?? 200));
  const capturedAtInput = shortString(input.capturedAt, "", 40);
  const capturedDate = Date.parse(capturedAtInput);
  const capturedAt = Number.isFinite(capturedDate) ? new Date(capturedDate).toISOString() : new Date().toISOString();
  const capturedAtUnix = finiteNumber(input.capturedAtUnix) ?? Date.parse(capturedAt) / 1000;
  const checkpoints = Array.isArray(input.checkpoints)
    ? input.checkpoints.flatMap((candidate) => {
        const distance = finiteNumber(candidate);
        return distance !== null && distance > 0 && distance < eventDistance ? [Math.floor(distance)] : [];
      }).slice(0, 8).sort((left, right) => left - right)
    : [];
  const bubbleTimeInput = finiteNumber(input.bubbleTime);
  const bubbleTime = bubbleTimeInput !== null && bubbleTimeInput > 0 ? Math.min(86_400, bubbleTimeInput) : null;
  const bubblePlaceInput = finiteNumber(input.bubblePlace);
  const bubbleTargetInput = finiteNumber(input.bubbleTarget);

  return {
    schemaVersion: 1,
    raceId,
    meetId,
    status: input.status === "COMPLETE" ? "COMPLETE" : "RUNNING",
    category: shortString(input.category, "Open", 40),
    roundName: shortString(input.roundName, "Race", 80),
    event: shortString(input.event, "TRACK", 40).toUpperCase(),
    eventDistance,
    timerSeconds: Math.max(0, Math.min(86_400, finiteNumber(input.timerSeconds) ?? 0)),
    timerRunning: input.timerRunning === true && input.status !== "COMPLETE",
    checkpoints,
    bubbleTime,
    bubbleDisplayTime: shortString(input.bubbleDisplayTime, bubbleTime === null ? "" : bubbleTime.toFixed(2), 24) || null,
    bubblePlace: bubblePlaceInput === null ? null : Math.max(0, Math.min(99, Math.floor(bubblePlaceInput))),
    bubbleTarget: bubbleTargetInput === null ? null : Math.max(1, Math.min(99, Math.floor(bubbleTargetInput))),
    bubbleProvisional: input.bubbleProvisional === true,
    qualificationRule: shortString(input.qualificationRule, "", 80),
    capturedAt,
    capturedAtUnix,
    worldRecord: normalizeWorldRecord(input.worldRecord),
    source: {
      universeId: shortString(source.universeId, "unknown", 40),
      placeId: shortString(source.placeId, "unknown", 40),
      jobId,
    },
    entrants: normalizeEntrants(input.entrants, eventDistance),
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

export async function GET() {
  return NextResponse.json(await getLatestLiveRace(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const expectedToken = getIngestToken();
  if (!expectedToken) return NextResponse.json({ error: "Live ingest is not configured" }, { status: 503 });
  const authorization = request.headers.get("authorization") ?? "";
  const providedToken = request.headers.get("x-results-token") ??
    (authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  if (!providedToken || !secureEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let decoded: unknown;
  try { decoded = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const live = normalizeLiveRace(decoded);
  if (!live || live.entrants.length === 0) {
    return NextResponse.json({ error: "raceId, meetId, source.jobId, and entrants are required" }, { status: 400 });
  }
  await upsertLiveRace(live);
  return NextResponse.json({ ok: true, raceId: live.raceId }, { status: 200 });
}
