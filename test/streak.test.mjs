import { test } from "node:test";
import assert from "node:assert/strict";
import { createStreakStore } from "../src/engine/streak.mjs";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

test("consecutive days build up the streak (3 days = 3)", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-02");
  const status = store.recordCompletion("2026-08-03");
  assert.equal(status.streak, 3);
});

test("completing the same day twice does not recount", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-01");
  const status = store.recordCompletion("2026-08-01");
  assert.equal(status.streak, 1);
});

test("a broken streak resets to 1", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-02");
  const status = store.recordCompletion("2026-08-10");
  assert.equal(status.streak, 1);
});

test("a one-day gap (yesterday) is rescuable", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  const check = store.canRescue("2026-08-03");
  assert.equal(check.ok, true);
});

test("a gap older than yesterday is not rescuable", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  const check = store.canRescue("2026-08-05");
  assert.equal(check.ok, false);
  assert.equal(check.reason, "not_yesterday_break");
});

test("a successful rescue restores and extends the streak", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-02");
  const result = store.rescue("2026-08-04");
  assert.equal(result.success, true);
  assert.equal(result.streak, 2);
});

test("completing today after a rescue increments the streak", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-02");
  store.rescue("2026-08-04");
  const status = store.recordCompletion("2026-08-04");
  assert.equal(status.streak, 3);
});

test("a second rescue in the same month is rejected", () => {
  const store = createStreakStore(memoryStorage());
  store.recordCompletion("2026-08-01");
  store.recordCompletion("2026-08-02");
  store.rescue("2026-08-04"); // first rescue, uses up the monthly allowance
  store.recordCompletion("2026-08-04");
  store.recordCompletion("2026-08-05");
  // break again within the same month, with a valid "yesterday" gap
  const result = store.rescue("2026-08-07");
  assert.equal(result.success, false);
  assert.equal(result.reason, "monthly_limit");
});

test("status reports milestones once the streak reaches them", () => {
  const store = createStreakStore(memoryStorage());
  let status;
  const start = new Date("2026-08-01T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    status = store.recordCompletion(d);
  }
  assert.equal(status.streak, 7);
  assert.ok(status.milestones.includes(7));
});
