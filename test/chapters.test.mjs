import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, CLUE_RAMP_CLEARS, chapterUnlockThreshold, SCORE_MILESTONE_INTERVAL, clueRatioForClear, nextChapterSize } from "../src/engine/chapters.mjs";
import { getChapterEntry, isChapterUnlocked, recordChapterClear, willHitMilestoneOnNextClear, loadChapterProgress } from "../src/chapterProgress.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

test("16x16 is included in the chapter list, shared with the daily challenge", () => {
  assert.ok(CHAPTERS.includes(16));
});

test("clue ratio strictly decreases as chapterClearCount rises, then floors", () => {
  const n = 8;
  const r0 = clueRatioForClear(n, 0);
  const r5 = clueRatioForClear(n, 5);
  const rFloor = clueRatioForClear(n, CLUE_RAMP_CLEARS);
  const rBeyond = clueRatioForClear(n, CLUE_RAMP_CLEARS + 20);
  assert.ok(r0 > r5 && r5 > rFloor);
  assert.equal(rFloor, rBeyond);
});

test("nextChapterSize walks the CHAPTERS list, null past the last one", () => {
  assert.equal(nextChapterSize(CHAPTERS[0]), CHAPTERS[1]);
  assert.equal(nextChapterSize(CHAPTERS[CHAPTERS.length - 1]), null);
});

test("first chapter is always unlocked with no progress", () => {
  global.localStorage = memoryStorage();
  assert.equal(isChapterUnlocked(CHAPTERS[0]), true);
});

test("second chapter locked until the first hits its unlock threshold", () => {
  global.localStorage = memoryStorage();
  assert.equal(isChapterUnlocked(CHAPTERS[1]), false);
  const threshold = chapterUnlockThreshold(CHAPTERS[0]);
  for (let i = 0; i < threshold; i++) recordChapterClear(CHAPTERS[0], 10);
  assert.equal(isChapterUnlocked(CHAPTERS[1]), true);
});

test("chapter-unlock thresholds accelerate per chapter (triangular growth)", () => {
  assert.equal(chapterUnlockThreshold(CHAPTERS[0]), 3); // 2x2 -> 3x3
  assert.equal(chapterUnlockThreshold(CHAPTERS[1]), 6); // 3x3 -> 4x4
  assert.equal(chapterUnlockThreshold(CHAPTERS[2]), 10); // 4x4 -> 5x5
  assert.ok(
    chapterUnlockThreshold(CHAPTERS[2]) - chapterUnlockThreshold(CHAPTERS[1]) >
      chapterUnlockThreshold(CHAPTERS[1]) - chapterUnlockThreshold(CHAPTERS[0])
  );
});

test("recordChapterClear reports justHitMilestone exactly on the crossing clear", () => {
  global.localStorage = memoryStorage();
  let last;
  for (let i = 0; i < SCORE_MILESTONE_INTERVAL; i++) last = recordChapterClear(CHAPTERS[0], 10);
  assert.equal(last.justHitMilestone, true);
  const after = recordChapterClear(CHAPTERS[0], 10);
  assert.equal(after.justHitMilestone, false);
});

test("milestone score bonus repeats every 10 clears, not just once", () => {
  global.localStorage = memoryStorage();
  const hits = [];
  for (let i = 1; i <= 25; i++) {
    const predicted = willHitMilestoneOnNextClear(CHAPTERS[0]);
    const { justHitMilestone } = recordChapterClear(CHAPTERS[0], 10);
    assert.equal(predicted, justHitMilestone, `prediction should match actual at clear ${i}`);
    if (justHitMilestone) hits.push(i);
  }
  assert.deepEqual(hits, [10, 20]);
});

test("recordChapterClear tracks bestScore as a running max", () => {
  global.localStorage = memoryStorage();
  recordChapterClear(CHAPTERS[0], 20);
  recordChapterClear(CHAPTERS[0], 5);
  const entry = getChapterEntry(CHAPTERS[0]);
  assert.equal(entry.bestScore, 20);
});
