import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

const port = 3400 + (process.pid % 400);
const origin = `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";

before(async () => {
  server = spawn("./node_modules/.bin/vinext", ["dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on("data", (chunk) => { serverOutput += chunk.toString(); });

  // A cold vinext/Vite graph can take roughly 25 seconds on the first local
  // launch, especially after a production build has replaced its cache.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for the production test server\n${serverOutput.slice(-4000)}`);
});

after(() => {
  server?.kill("SIGTERM");
});

test("server-renders the RAU results board", async () => {
  const response = await fetch(`${origin}/`, { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RAU Live Results<\/title>/i);
  assert.match(html, /AI Championship Results Center/);
  assert.match(html, /Live Race/);
  assert.match(html, /Event Index/);
  assert.match(html, /Team standings/);
  assert.match(html, /Live 0\.25s/);
  assert.match(html, /POST \/api\/live/);
  assert.match(html, /POST \/api\/results/);
});

test("GET /api/results returns the safe demo feed when storage is empty", async () => {
  const response = await fetch(`${origin}/api/results?limit=2`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  const payload = await response.json();
  assert.equal(payload.demo, true);
  assert.ok(payload.reports.length >= 3);
  assert.equal(payload.reports[0].kind, "RaceResults");
  assert.ok(payload.reports[0].results.length > 0);
  assert.ok(payload.reports[0].results[0].splits.length > 0);
  const relay = payload.reports.find((report) => report.event === "4X400");
  assert.ok(relay);
  assert.equal(relay.results[0].relayLegs.length, 4);
  assert.equal(relay.results[0].members.length, 4);
});

test("GET /api/live returns an ordered demo race with timer, bubble, qualifications, and finish times", async () => {
  const response = await fetch(`${origin}/api/live`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.demo, true);
  assert.equal(payload.live.status, "RUNNING");
  assert.ok(payload.live.timerSeconds > 0);
  assert.equal(payload.live.worldRecord.label, "400M WR");
  assert.equal(payload.live.bubbleDisplayTime, "40.70");
  assert.equal(payload.live.bubbleTarget, 6);
  assert.equal(payload.live.bubbleProvisional, true);
  assert.match(payload.live.qualificationRule, /TOP 3.*6 FASTEST/);
  assert.equal(payload.live.entrants.length, 8);
  assert.equal(payload.live.entrants[0].name, "Noah Whitfield");
  assert.equal(payload.live.entrants[0].finishTime, "39.45");
  assert.equal(payload.live.entrants[0].finishPlace, 1);
  assert.equal(payload.live.entrants[0].qualificationStatus, "Q");
  assert.equal(payload.live.entrants[3].qualificationStatus, "q");
  assert.match(payload.live.entrants[0].finishTime, /^\d/);
  assert.ok(payload.live.entrants[0].splits.length >= 2);
  assert.ok(payload.live.entrants[0].currentRawTime > 0);
  assert.match(payload.live.entrants[0].currentTime, /^\d/);
});

test("live board exposes finished time and removes the track-sector and latest-split columns", async () => {
  const source = await readFile(new URL("../app/live-race-board.tsx", import.meta.url), "utf8");
  assert.match(source, /<th>Finished time<\/th>/);
  assert.match(source, /PROVISIONAL BUBBLE/);
  assert.match(source, /requestInFlight\.current/);
  assert.match(source, /setInterval\(\(\) => void loadLive\(\), 250\)/);
  assert.match(source, /Feed delay/);
  assert.match(source, /finish-calibrated distance/);
  assert.match(source, /Relay team \/ active runner/);
  assert.match(source, /relayLegs\.map/);
  assert.match(source, /m leg splits/);
  assert.match(source, /relay-splits-cell/);
  const orderSource = await readFile(new URL("../lib/live-order.ts", import.meta.url), "utf8");
  assert.match(orderSource, /right\.distanceMeters - left\.distanceMeters/);
  assert.doesNotMatch(source, /<th>Track sector<\/th>/);
  assert.doesNotMatch(source, /<th>Latest split<\/th>/);
});

test("live ingest rejects a distance that disagrees with normalized lane progress", async () => {
  const source = await readFile(new URL("../app/api/live/route.ts", import.meta.url), "utf8");
  assert.match(source, /Math\.abs\(reportedDistance - progressDistance\) > distanceTolerance/);
  assert.match(source, /normalizeRelayLegs/);
});

test("POST /api/results rejects unauthenticated requests", async () => {
  const response = await fetch(`${origin}/api/results`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("POST /api/live rejects unauthenticated requests", async () => {
  const response = await fetch(`${origin}/api/live`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});
