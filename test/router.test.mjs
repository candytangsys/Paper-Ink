import test from "node:test";
import assert from "node:assert/strict";
import { buildHashRoute, routeFromHash } from "../src/router.js";

test("routeFromHash parses number-link level routes", () => {
  assert.deepEqual(routeFromHash("#/number-link/7"), { kind: "number-link", level: 7 });
  assert.deepEqual(routeFromHash("#/number-link"), { kind: "number-link", level: null });
});

test("buildHashRoute creates level-specific hash routes", () => {
  assert.equal(buildHashRoute("number-link", 7), "/number-link/7");
  assert.equal(buildHashRoute("number-link"), "/number-link");
  assert.equal(buildHashRoute(null), "/");
});

test("routeFromHash and buildHashRoute round-trip the history route", () => {
  assert.deepEqual(routeFromHash("#/history"), { kind: "history" });
  assert.equal(buildHashRoute("history"), "/history");
});
