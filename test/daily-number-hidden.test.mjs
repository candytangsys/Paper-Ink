import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Daily.jsx / Home.jsx / shareImage.js all render real JSX (theme.jsx
// pulls in an actual <style> element), so they can't be imported into a
// plain `node --test` run without a JSX transform like the rest of this
// suite has. Source-scanning them is the honest way, within this
// project's existing test setup, to pin down "day_index is a backend-only
// analytics dimension and never reaches a player-visible string" — see
// buildDailyAnalyticsParams in src/engine/share.mjs for where day_index
// actually gets computed and attached.

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (relPath) => readFileSync(join(__dirname, "..", "src", relPath), "utf8");

test("Home.jsx has no reference to the day-index feature at all", () => {
  const home = src("components/Home.jsx");
  assert.doesNotMatch(home, /dailyNumber|dailyNo|day_index/);
});

test("Daily.jsx's title copy is a plain string with no day number interpolated in", () => {
  const daily = src("games/Daily.jsx");
  const zh = daily.match(/dailyTitle:\s*"([^"]*)"/);
  const en = daily.match(/dailyTitle:\s*"([^"]*)"/g);
  assert.ok(zh, "expected a plain-string dailyTitle field in Daily.jsx's TEXT.zh");
  assert.equal(zh[1], "每日挑戰");
  assert.equal(en.length, 2, "expected one dailyTitle string per language (zh + en)");
  assert.ok(en.every((m) => !/\d/.test(m)), "dailyTitle must not contain a day number");
});

test("Daily.jsx only ever uses day_index inside a track(...) analytics call, never in rendered copy", () => {
  const daily = src("games/Daily.jsx");
  // day_index is computed via buildDailyAnalyticsParams, not the raw
  // dailyNumber() — Daily.jsx should never import dailyNumber directly,
  // so there is only one function name that could leak a day number here.
  assert.doesNotMatch(daily, /\bdailyNumber\(/);
  const totalCalls = (daily.match(/buildDailyAnalyticsParams\(/g) || []).length;
  const callsInsideTrack = (daily.match(/track\(\s*"[a-z_]+",\s*buildDailyAnalyticsParams\(/g) || []).length;
  assert.ok(totalCalls > 0, "expected Daily.jsx to actually wire day_index into analytics");
  assert.equal(callsInsideTrack, totalCalls, "every buildDailyAnalyticsParams(...) call must be a track(...) argument");
});

test("shareImage.js's share-card title never renders a day number", () => {
  const shareImage = src("daily/shareImage.js");
  assert.doesNotMatch(shareImage, /dailyNumber|dailyNo/);
  // `daily` used to be a `(n) => ...` template; confirm it's back to a
  // plain value, not invoked with an argument.
  assert.doesNotMatch(shareImage, /T\.daily\(/);
  const dailyLabels = [...shareImage.matchAll(/daily:\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.equal(dailyLabels.length, 2, "expected one daily-label string per language (zh + en)");
  assert.ok(dailyLabels.every((label) => !/\d/.test(label)), "share-card daily label must not contain a day number");
});
