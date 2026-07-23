import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPointsReward, DAILY_BASE_REWARD, DAILY_STREAK_BONUS_CAP } from "../src/engine/dailyReward.mjs";

test("day 1 of a streak (or no streak) earns just the base reward", () => {
  assert.equal(dailyPointsReward(1), DAILY_BASE_REWARD);
  assert.equal(dailyPointsReward(0), DAILY_BASE_REWARD);
});

test("reward grows with streak length", () => {
  assert.equal(dailyPointsReward(2), DAILY_BASE_REWARD + 2);
  assert.equal(dailyPointsReward(5), DAILY_BASE_REWARD + 8);
});

test("streak bonus is capped", () => {
  const atCap = dailyPointsReward(1000);
  assert.equal(atCap, DAILY_BASE_REWARD + DAILY_STREAK_BONUS_CAP);
  assert.equal(dailyPointsReward(10000), atCap);
});
