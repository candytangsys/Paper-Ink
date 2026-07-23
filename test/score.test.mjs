import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, parTimeSec } from "../src/engine/score.mjs";

test("golden time (<=70% par) gets +10 time bonus", () => {
  const par = parTimeSec(8, 0.3);
  const { total, breakdown } = computeScore({
    timeSec: Math.floor(par * 0.7), parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 10);
  assert.equal(total, 10 + 10 + 5 + 5 + 0); // base+time+accuracy+noHint
});

test("silver time (<=100% par, >70%) gets +5 time bonus", () => {
  const par = 100;
  const { breakdown } = computeScore({
    timeSec: 90, parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 5);
});

test("over par time gets no time bonus", () => {
  const par = 100;
  const { breakdown } = computeScore({
    timeSec: 150, parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 0);
});

test("zero mistakes is +5 accuracy (perfect)", () => {
  const { breakdown } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.accuracy, 5);
});

test("1-2 mistakes is +2 accuracy", () => {
  const { breakdown } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 2, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.accuracy, 2);
});

test("3+ mistakes is +0 accuracy", () => {
  const { breakdown } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 3, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.accuracy, 0);
});

test("using a hint/tool forfeits the no-hint bonus", () => {
  const { breakdown } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: true, justHitMilestone: false,
  });
  assert.equal(breakdown.noHint, 0);
});

test("hitting the chapter milestone adds +30 exactly once", () => {
  const { breakdown, total } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: true,
  });
  assert.equal(breakdown.milestone, 30);
  assert.equal(total, 10 + 5 + 5 + 5 + 30);
});

test("base completion score is always +10 regardless of other factors", () => {
  const { breakdown } = computeScore({
    timeSec: 999999, parTimeSec: 1, mistakes: 99, usedTool: true, justHitMilestone: false,
  });
  assert.equal(breakdown.base, 10);
});

test("parTimeSec gives more time for lower clue density", () => {
  const dense = parTimeSec(8, 0.4);
  const sparse = parTimeSec(8, 0.1);
  assert.ok(sparse > dense);
});
