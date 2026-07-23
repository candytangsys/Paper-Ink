import { test } from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

test("getRestartCount starts at 0 for a date with no recorded restarts", async () => {
  global.localStorage = memoryStorage();
  const { getRestartCount } = await import(`../src/dailyRestarts.js?t=${Date.now()}`);
  assert.equal(getRestartCount("2026-07-23"), 0);
});

test("recordDailyRestart increments and persists per date, independent of other dates", async () => {
  global.localStorage = memoryStorage();
  const { getRestartCount, recordDailyRestart } = await import(`../src/dailyRestarts.js?t=${Date.now()}`);

  assert.equal(recordDailyRestart("2026-07-23"), 1);
  assert.equal(recordDailyRestart("2026-07-23"), 2);
  assert.equal(getRestartCount("2026-07-23"), 2);

  // A different date's count is unaffected.
  assert.equal(getRestartCount("2026-07-22"), 0);
  assert.equal(recordDailyRestart("2026-07-22"), 1);
  assert.equal(getRestartCount("2026-07-23"), 2);
});

test("DAILY_RESTART_LIMIT is 3", async () => {
  const { DAILY_RESTART_LIMIT } = await import(`../src/dailyRestarts.js?t=${Date.now()}`);
  assert.equal(DAILY_RESTART_LIMIT, 3);
});
