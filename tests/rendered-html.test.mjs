import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 3400 + (process.pid % 400);
const origin = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  server = spawn("./node_modules/.bin/vinext", ["dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "ignore",
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // Production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Timed out waiting for the production test server");
});

after(() => {
  server?.kill("SIGTERM");
});

test("server-renders the StrideSync results board", async () => {
  const response = await fetch(`${origin}/`, { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>StrideSync Live Results<\/title>/i);
  assert.match(html, /AI Championship Results Center/);
  assert.match(html, /Live Race/);
  assert.match(html, /Event Index/);
  assert.match(html, /Team standings/);
  assert.match(html, /Live 0\.5s/);
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
});

test("GET /api/live returns an ordered demo race with timer, record, and splits", async () => {
  const response = await fetch(`${origin}/api/live`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  const payload = await response.json();
  assert.equal(payload.demo, true);
  assert.equal(payload.live.status, "RUNNING");
  assert.ok(payload.live.timerSeconds > 0);
  assert.equal(payload.live.worldRecord.label, "400M WR");
  assert.equal(payload.live.entrants.length, 8);
  assert.ok(payload.live.entrants[0].progress > payload.live.entrants[1].progress);
  assert.ok(payload.live.entrants[0].splits.length >= 2);
  assert.ok(payload.live.entrants[0].currentRawTime > 0);
  assert.match(payload.live.entrants[0].currentTime, /^\d/);
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
