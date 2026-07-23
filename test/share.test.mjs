import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShareText, buildShareUrl, dailyNumber, buildDailyAnalyticsParams, fmtTime } from "../src/engine/share.mjs";
import { createRefIdStore } from "../src/engine/refId.mjs";

test("share text carries the perfect badge", () => {
  const text = buildShareText({ date: "2026-08-01", size: 5, timeSec: 65, perfect: true, streak: 1, lang: "zh" });
  assert.match(text, /完美/);
});

test("share text carries the streak count", () => {
  const text = buildShareText({ date: "2026-08-01", size: 5, timeSec: 65, perfect: true, streak: 4, lang: "zh" });
  assert.match(text, /4/);
  assert.match(text, /🔥/);
});

test("share text never reveals solution/clue data", () => {
  const text = buildShareText({ date: "2026-08-01", size: 5, timeSec: 65, perfect: false, streak: 0, lang: "zh" });
  assert.equal(typeof text, "string");
  assert.doesNotMatch(text, /solution|clue/i);
});

// day_index is a backend-only analytics dimension now (see
// buildDailyAnalyticsParams below) — player-visible share text must never
// carry a "#N" day number.
test("share text never carries a day-index number", () => {
  const zh = buildShareText({ date: "2026-08-01", size: 5, timeSec: 65, perfect: true, streak: 3, lang: "zh" });
  const en = buildShareText({ date: "2026-08-01", size: 5, timeSec: 65, perfect: true, streak: 3, lang: "en" });
  assert.doesNotMatch(zh, /#-?\d/);
  assert.doesNotMatch(en, /#-?\d/);
});

test("share url carries attribution params", () => {
  const url = buildShareUrl({ baseUrl: "https://candytangsys.github.io/Paper-Ink/", date: "2026-08-01", refId: "u_abc12345" });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("ref"), "u_abc12345");
  assert.equal(parsed.searchParams.get("utm_source"), "share");
});

test("share url opens directly into the day's puzzle", () => {
  const url = buildShareUrl({ baseUrl: "https://candytangsys.github.io/Paper-Ink/", date: "2026-08-01", refId: "u_abc12345" });
  assert.match(url, /#\/daily\/2026-08-01/);
});

test("dailyNumber counts from the epoch", () => {
  assert.equal(dailyNumber("2026-08-01", "2026-08-01"), 1);
  assert.equal(dailyNumber("2026-08-02", "2026-08-01"), 2);
});

test("dailyNumber defaults to the configured DAILY_EPOCH constant", () => {
  // Pinned to today's placeholder epoch (2026-08-01) rather than importing
  // DAILY_EPOCH directly, so this test actually breaks (rather than
  // silently tracking) if the constant is edited without updating this
  // expectation to match.
  assert.equal(dailyNumber("2026-08-01"), 1);
});

test("buildDailyAnalyticsParams carries day_index for the backend dashboard, alongside any extra event params", () => {
  const params = buildDailyAnalyticsParams("2026-08-03", { size: 12, perfect: true });
  assert.equal(params.day_index, dailyNumber("2026-08-03"));
  assert.equal(params.size, 12);
  assert.equal(params.perfect, true);
});

test("buildDailyAnalyticsParams works with no extra params (daily_open has none beyond date/size)", () => {
  const params = buildDailyAnalyticsParams("2026-08-01");
  assert.deepEqual(params, { day_index: 1 });
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
