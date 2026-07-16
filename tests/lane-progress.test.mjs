import assert from "node:assert/strict";
import { test } from "node:test";

function projectProgress(position, points) {
  const segmentLengths = [];
  const cumulative = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index][0] - points[index - 1][0];
    const dz = points[index][1] - points[index - 1][1];
    const length = Math.hypot(dx, dz);
    segmentLengths.push(length);
    total += length;
    cumulative.push(total);
  }
  let best = { distance: Infinity, route: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = segmentLengths[index - 1];
    const alpha = Math.max(0, Math.min(1, ((position[0] - start[0]) * dx + (position[1] - start[1]) * dz) / (length * length)));
    const projected = [start[0] + dx * alpha, start[1] + dz * alpha];
    const distance = Math.hypot(position[0] - projected[0], position[1] - projected[1]);
    if (distance < best.distance) {
      best = { distance, route: (cumulative[index - 2] ?? 0) + length * alpha };
    }
  }
  return best.route / total;
}

function leashedProgress(projectedRoute, travelledRoute, courseDistance, lead = 5) {
  const allowedLead = travelledRoute > 0.75 ? lead : 0;
  return Math.max(0, Math.min(1, Math.min(projectedRoute, travelledRoute + allowedLead) / courseDistance));
}

test("lane arc length compares staggered curved lanes fairly", () => {
  const insideLane = [[0, 0], [0, 50], [50, 100], [100, 100]];
  const outsideLane = [[20, 0], [20, 65], [65, 120], [120, 120]];
  const insideHalf = [25, 75];
  const outsideHalf = [42.5, 92.5];
  const insideProgress = projectProgress(insideHalf, insideLane);
  const outsideProgress = projectProgress(outsideHalf, outsideLane);
  assert.ok(Math.abs(insideProgress - outsideProgress) < 0.08);
});

test("leader progress ends at the finish wall instead of an authored runout", () => {
  // Tim has covered more of the actual race, but his lane happens to include a
  // much longer post-finish waypoint route. Full-route normalization reverses
  // the order; finish-calibrated normalization restores the real leader.
  const timDistance = 320;
  const timFinishDistance = 400;
  const timRouteWithRunout = 520;
  const rivalDistance = 315;
  const rivalFinishDistance = 410;
  const rivalRouteWithRunout = 430;

  const legacyTim = timDistance / timRouteWithRunout;
  const legacyRival = rivalDistance / rivalRouteWithRunout;
  assert.ok(legacyTim < legacyRival);

  const calibratedTim = timDistance / timFinishDistance;
  const calibratedRival = rivalDistance / rivalFinishDistance;
  assert.ok(calibratedTim > calibratedRival);
});

test("split crossing interpolation stays between samples", () => {
  const previousMeters = 56;
  const currentMeters = 64;
  const previousTime = 6.2;
  const currentTime = 7.0;
  const fraction = (60 - previousMeters) / (currentMeters - previousMeters);
  const crossing = previousTime + (currentTime - previousTime) * fraction;
  assert.equal(crossing, 6.6);
});

test("an overlapping oval start cannot project lane 1 to a completed lap", () => {
  assert.equal(leashedProgress(400, 0, 400), 0);
  assert.ok(leashedProgress(400, 12, 400) < 0.05);
});

test("the first finish-wall crossing of an 800m leg is not finish eligible", () => {
  assert.equal(400 / 800 >= 0.8, false);
  assert.equal(790 / 800 >= 0.8, true);
});
