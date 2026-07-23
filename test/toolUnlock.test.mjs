import { test } from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

test("getToolCost escalates per tool as it's repeatedly bought, independent of other tools", async () => {
  global.localStorage = memoryStorage();
  const { getToolCost, unlockViaPoints, getToolPurchaseCount } = await import(`../src/toolUnlock.js?t=${Date.now()}`);
  const { addPoints } = await import(`../src/pointsWallet.js?t=${Date.now()}`);

  addPoints(1000);
  assert.equal(getToolCost(10, "magnifier"), 10);

  unlockViaPoints("magnifier", 10); // costs 10, count -> 1
  assert.equal(getToolPurchaseCount("magnifier"), 1);
  assert.equal(getToolCost(10, "magnifier"), 12); // +20% of base per prior purchase

  unlockViaPoints("magnifier", 10); // costs 12, count -> 2
  assert.equal(getToolCost(10, "magnifier"), 14);

  // A different tool's cost is unaffected by magnifier's purchases.
  assert.equal(getToolCost(25, "rootCause"), 25);
});

test("unlockViaPoints spends the escalated cost, not the base cost, and only bumps the count on success", async () => {
  global.localStorage = memoryStorage();
  const { unlockViaPoints } = await import(`../src/toolUnlock.js?t=${Date.now()}`);
  const { addPoints, getPointsBalance } = await import(`../src/pointsWallet.js?t=${Date.now()}`);

  addPoints(11); // enough for the base cost (10) but not a second escalated purchase (12)
  assert.equal(unlockViaPoints("magnifier", 10), true);
  assert.equal(getPointsBalance(), 1);
  assert.equal(unlockViaPoints("magnifier", 10), false); // needs 12 now, only has 1
  assert.equal(getPointsBalance(), 1); // failed spend leaves balance untouched
});
