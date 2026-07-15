import assert from "node:assert/strict";
import { test } from "node:test";

const effortLoad = (ratio) => 0.55 + 0.65 * Math.max(0, ratio) ** 3;

test("conservation requires a real runner behind and enough race progress", () => {
  const canConserve = ({ fieldSize, hasRunnerBehind, progress, place, buffer }) => (
    fieldSize >= 2
    && hasRunnerBehind
    && progress >= 0.42
    && place <= 3
    && buffer >= 4.5
  );

  assert.equal(canConserve({ fieldSize: 1, hasRunnerBehind: false, progress: 0.6, place: 1, buffer: 999 }), false);
  assert.equal(canConserve({ fieldSize: 8, hasRunnerBehind: false, progress: 0.6, place: 3, buffer: 999 }), false);
  assert.equal(canConserve({ fieldSize: 8, hasRunnerBehind: true, progress: 0.1, place: 1, buffer: 8 }), false);
  assert.equal(canConserve({ fieldSize: 8, hasRunnerBehind: true, progress: 0.6, place: 1, buffer: 8 }), true);
});

test("stamina drain uses commanded speed relative to stamina-adjusted max", () => {
  const staminaAdjustedMax = 80;
  const fullCommand = 80;
  const conserveCommand = 72;
  const fullRatio = fullCommand / staminaAdjustedMax;
  const conserveRatio = conserveCommand / staminaAdjustedMax;

  assert.equal(fullRatio, 1);
  assert.equal(conserveRatio, 0.9);
  assert.ok(effortLoad(conserveRatio) < effortLoad(fullRatio));
  assert.ok(effortLoad(conserveRatio) / effortLoad(fullRatio) < 0.86);
});

test("opening drive keeps a full-effort floor while accelerating", () => {
  const commandedSpeed = 18;
  const staminaAdjustedMax = 90;
  const rawRatio = commandedSpeed / staminaAdjustedMax;
  const driveRatio = Math.max(rawRatio, 1);

  assert.equal(rawRatio, 0.2);
  assert.equal(driveRatio, 1);
  assert.equal(effortLoad(driveRatio), effortLoad(1));
});
