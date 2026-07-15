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

test("lane arc length compares staggered curved lanes fairly", () => {
  const insideLane = [[0, 0], [0, 50], [50, 100], [100, 100]];
  const outsideLane = [[20, 0], [20, 65], [65, 120], [120, 120]];
  const insideHalf = [25, 75];
  const outsideHalf = [42.5, 92.5];
  const insideProgress = projectProgress(insideHalf, insideLane);
  const outsideProgress = projectProgress(outsideHalf, outsideLane);
  assert.ok(Math.abs(insideProgress - outsideProgress) < 0.08);
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
