/**
 * 分享卡文字層：核心榮譽符號＝完美（零失誤）；連結帶歸因參數
 */
const pad = (n) => String(n).padStart(2, "0");
export const fmtTime = (sec) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

function inkThumb(size) {
  const row = "▢".repeat(Math.min(size, 8));
  return size <= 8 ? row : row + "…";
}

export function buildShareText({ date, size, timeSec, perfect, streak, lang = "zh" }) {
  const t = fmtTime(timeSec);
  if (lang === "zh") {
    return [
      `紙墨筆・一筆連 每日挑戰`,
      `${size}×${size}｜${t}${perfect ? "｜🖋 一筆連成・完美" : ""}`,
      streak >= 2 ? `🔥 連續 ${streak} 天` : null,
      inkThumb(size),
    ].filter(Boolean).join("\n");
  }
  return [
    `Paper & Ink · One-Stroke Daily`,
    `${size}×${size} | ${t}${perfect ? " | 🖋 Perfect" : ""}`,
    streak >= 2 ? `🔥 ${streak}-day streak` : null,
    inkThumb(size),
  ].filter(Boolean).join("\n");
}

export function buildShareUrl({ baseUrl, date, refId }) {
  const u = new URL(baseUrl);
  u.hash = `#/daily/${date}`;
  u.searchParams.set("utm_source", "share");
  u.searchParams.set("ref", refId);
  return u.toString();
}

// Regular-level share (v3.3): promotional, not a result card — a level's
// board is freshly randomized per play, so there's no "same puzzle" to
// deep-link into or spoil. Sends people to the app itself rather than any
// specific level.
export function buildLevelShareText({ size, level, timeSec, perfect, lang = "zh" }) {
  const t = fmtTime(timeSec);
  if (lang === "zh") {
    return [
      `紙墨筆・一筆連`,
      `${size}×${size} 第 ${level} 關｜${t}${perfect ? "｜🖋 零失誤" : ""}`,
      `依序連接數字、一筆畫成的紙墨風解謎遊戲，來挑戰看看吧！`,
    ].join("\n");
  }
  return [
    `Paper & Ink · One-Stroke Path`,
    `${size}×${size} Level ${level} | ${t}${perfect ? " | 🖋 Perfect" : ""}`,
    `A literary ink-and-paper number-path puzzle — give it a try!`,
  ].join("\n");
}

export function buildLevelShareUrl({ baseUrl, refId }) {
  const u = new URL(baseUrl);
  u.searchParams.set("utm_source", "share");
  u.searchParams.set("ref", refId);
  return u.toString();
}

// Placeholder until the real launch date is locked in — update this one
// constant when it is. Not shown to players anywhere (see buildDailyAnalyticsParams
// below): day_index is a backend-only analytics dimension now, not UI copy.
export const DAILY_EPOCH = "2026-08-01";

export function dailyNumber(dateStr, epoch = DAILY_EPOCH) {
  return Math.round((new Date(dateStr) - new Date(epoch)) / 86400000) + 1;
}

// Every daily_open/daily_complete analytics call should carry day_index so
// the backend dashboard can slice by "day N of the challenge" — funnels
// itself through this one function so day_index can never accidentally end
// up wired into a player-visible string instead of a track() call.
export function buildDailyAnalyticsParams(date, extra = {}) {
  return { ...extra, day_index: dailyNumber(date) };
}
