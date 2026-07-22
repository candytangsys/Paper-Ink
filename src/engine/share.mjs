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
