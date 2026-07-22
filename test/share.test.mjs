import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShareText, buildShareUrl, dailyNumber, fmtTime } from "../src/engine/share.mjs";
import { createRefIdStore } from "../src/engine/refId.mjs";

test("share text carries the perfect badge", () => {
  const text = buildShareText({ date: "2026-08-01", dailyNo: 1, size: 5, timeSec: 65, perfect: true, streak: 1, lang: "zh" });
  assert.match(text, /完美/);
});

test("share text carries the streak count", () => {
  const text = buildShareText({ date: "2026-08-01", dailyNo: 1, size: 5, timeSec: 65, perfect: true, streak: 4, lang: "zh" });
  assert.match(text, /4/);
  assert.match(text, /🔥/);
});

test("share text never reveals solution/clue data", () => {
  const text = buildShareText({ date: "2026-08-01", dailyNo: 1, size: 5, timeSec: 65, perfect: false, streak: 0, lang: "zh" });
  assert.equal(typeof text, "string");
  assert.doesNotMatch(text, /solution|clue/i);
});

test("share url carries attribution params", () => {
  const url = buildShareUrl({ baseUrl: "https://candytangsys.github.io/game/", date: "2026-08-01", refId: "u_abc12345" });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("ref"), "u_abc12345");
  assert.equal(parsed.searchParams.get("utm_source"), "share");
});

test("share url opens directly into the day's puzzle", () => {
  const url = buildShareUrl({ baseUrl: "https://candytangsys.github.io/game/", date: "2026-08-01", refId: "u_abc12345" });
  assert.match(url, /#\/daily\/2026-08-01/);
});

test("dailyNumber counts from the epoch", () => {
  assert.equal(dailyNumber("2026-08-01"), 1);
  assert.equal(dailyNumber("2026-08-02"), 2);
});

test("fmtTime pads minutes and seconds", () => {
  assert.equal(fmtTime(65), "01:05");
  assert.equal(fmtTime(5), "00:05");
});

test("refId store creates and persists an anonymous id", () => {
  const map = new Map();
  const storage = { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) };
  const store = createRefIdStore(storage);
  const id = store.getOrCreate();
  assert.match(id, /^u_[a-z0-9]{8}$/);
  assert.equal(store.getOrCreate(), id);
});
