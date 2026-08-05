import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, parTimeSec } from "../src/engine/score.mjs";

test("golden time (<=70% par) gets +6 time bonus", () => {
  const par = parTimeSec(8, 0.3);
  const { total, breakdown } = computeScore({
    timeSec: Math.floor(par * 0.7), parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 6);
  assert.equal(total, 5 + 6 + 4 + 3 + 0); // base+time+accuracy+noHint
});

test("silver time (<=100% par, >70%) gets +3 time bonus", () => {
  const par = 100;
  const { breakdown } = computeScore({
    timeSec: 90, parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 3);
});

test("over par time gets no time bonus", () => {
  const par = 100;
  const { breakdown } = computeScore({
    timeSec: 150, parTimeSec: par, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.time, 0);
});

test("zero mistakes is +4 accuracy (perfect)", () => {
  const { breakdown } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.accuracy, 4);
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

test("hitting the chapter milestone adds +15 exactly once", () => {
  const { breakdown, total } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: true,
  });
  assert.equal(breakdown.milestone, 15);
  assert.equal(total, 5 + 3 + 4 + 3 + 15);
});

test("base completion score is always +5 regardless of other factors", () => {
  const { breakdown } = computeScore({
    timeSec: 999999, parTimeSec: 1, mistakes: 99, usedTool: true, justHitMilestone: false,
  });
  assert.equal(breakdown.base, 5);
});

test("parTimeSec gives more time for lower clue density", () => {
  const dense = parTimeSec(8, 0.4);
  const sparse = parTimeSec(8, 0.1);
  assert.ok(sparse > dense);
});

test("omitting chapter context (pre-v3.8 call shape) adds no difficulty/starter bonus", () => {
  const { breakdown, total } = computeScore({
    timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: false,
  });
  assert.equal(breakdown.difficulty, 0);
  assert.equal(breakdown.starter, 0);
  assert.equal(total, 5 + 3 + 4 + 3);
});

test("difficulty bonus grows with chapter index, zero on chapter 0", () => {
  const base = { timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: false };
  const chapter0 = computeScore({ ...base, chapterIndex: 0 });
  const chapter4 = computeScore({ ...base, chapterIndex: 4 });
  const chapter11 = computeScore({ ...base, chapterIndex: 11 });
  assert.equal(chapter0.breakdown.difficulty, 0);
  assert.ok(chapter4.breakdown.difficulty > 0);
  assert.ok(chapter11.breakdown.difficulty > chapter4.breakdown.difficulty);
  assert.ok(chapter11.total > chapter0.total);
});

test("starter bonus only applies to chapter 0, decaying to 0 by the unlock threshold", () => {
  const base = { timeSec: 100, parTimeSec: 100, mistakes: 0, usedTool: false, justHitMilestone: false };
  const first = computeScore({ ...base, chapterIndex: 0, clearIndexInChapter: 1, chapterUnlockThreshold: 3 });
  const second = computeScore({ ...base, chapterIndex: 0, clearIndexInChapter: 2, chapterUnlockThreshold: 3 });
  const third = computeScore({ ...base, chapterIndex: 0, clearIndexInChapter: 3, chapterUnlockThreshold: 3 });
  const fourth = computeScore({ ...base, chapterIndex: 0, clearIndexInChapter: 4, chapterUnlockThreshold: 3 });
  const laterChapter = computeScore({ ...base, chapterIndex: 1, clearIndexInChapter: 1, chapterUnlockThreshold: 6 });
  assert.equal(first.breakdown.starter, 15);
  assert.ok(second.breakdown.starter > 0 && second.breakdown.starter < first.breakdown.starter);
  assert.ok(third.breakdown.starter >= 0 && third.breakdown.starter < second.breakdown.starter);
  assert.equal(fourth.breakdown.starter, 0);
  assert.equal(laterChapter.breakdown.starter, 0);
});
