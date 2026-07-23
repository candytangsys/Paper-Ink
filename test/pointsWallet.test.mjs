import { test } from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

test("addPoints accumulates balance, spendPoints deducts when affordable", async () => {
  global.localStorage = memoryStorage();
  const { addPoints, spendPoints, getPointsBalance } = await import(`../src/pointsWallet.js?t=${Date.now()}`);
  assert.equal(getPointsBalance(), 0);
  addPoints(30);
  addPoints(10);
  assert.equal(getPointsBalance(), 40);
  assert.equal(spendPoints(25), true);
  assert.equal(getPointsBalance(), 15);
});

test("spendPoints refuses and leaves balance unchanged when insufficient", async () => {
  global.localStorage = memoryStorage();
  const { addPoints, spendPoints, getPointsBalance } = await import(`../src/pointsWallet.js?t=${Date.now()}`);
  addPoints(5);
  assert.equal(spendPoints(10), false);
  assert.equal(getPointsBalance(), 5);
});
