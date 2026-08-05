import { COLORS, inkTrailColor } from "../theme.jsx";
import { fmtTime } from "../engine/share.mjs";

const WIDTH = 1080;
// v3.9: +100 over the original 1350 to make room for the score/streak
// badge row (drawStatBadge) added below the path thumbnail — without the
// extra height, the perfect-run stamp's fixed bottom-right position would
// overlap the badges whenever both are showing at once (i.e. any perfect
// run with a streak ≥2, not an edge case).
const HEIGHT = 1450;

const SHARE_TEXT = {
  zh: {
    brand: "紙墨筆・一筆連",
    daily: "每日挑戰",
    perfect: "完",
    streakLabel: "連續天數",
    scoreLabel: "積分",
  },
  en: {
    brand: "Paper & Ink",
    daily: "One-Stroke Daily",
    perfect: "PERFECT",
    streakLabel: "Streak",
    scoreLabel: "Points",
  },
};

// v3.9: the abstract path thumbnail stays deliberately illegible (see
// drawPathThumb below — anti-spoiler, not a bug), so it doesn't read as much
// of an achievement on its own. These badge pills are what actually carry
// the "worth sharing" signal now — score and streak, styled to pop rather
// than sitting as small plain text.
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// A stat "badge": small uppercase label on top, big bold value below,
// inside a rounded pill — cx is the pill's horizontal center.
function drawStatBadge(ctx, { cx, y, w, h, accent, label, value }) {
  const x = cx - w / 2;
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = "600 22px 'EB Garamond', serif";
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), cx, y + 34);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 46px 'Noto Serif TC', serif";
  ctx.fillText(value, cx, y + h - 20);
}

// Draws only the *shape* of the solved path — no numbers, no clue
// positions — so the image can never leak the answer to a puzzle that
// shares the same date (and therefore the same solution) for every player.
function drawPathThumb(ctx, solution, size, box) {
  const { x, y, w, h } = box;
  const pad = w * 0.08;
  const cell = (w - pad * 2) / size;
  const centerOf = (r, c) => ({
    x: x + pad + c * cell + cell / 2,
    y: y + pad + r * cell + cell / 2,
  });

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < solution.length; i++) {
    const [pr, pc] = solution[i - 1];
    const [r, c] = solution[i];
    const a = centerOf(pr, pc);
    const b = centerOf(r, c);
    const t = solution.length > 1 ? (i - 0.5) / (solution.length - 1) : 0;
    ctx.strokeStyle = inkTrailColor(t);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(2, cell * 0.22);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// Traditional seals are never stamped perfectly square — a fixed rotation
// reads as a template. Each share gets its own tilt within a natural
// hand-stamped range instead.
const STAMP_TILT_MIN_DEG = 3;
const STAMP_TILT_MAX_DEG = 5;

function drawPerfectStamp(ctx, label) {
  const w = 170;
  const h = 170;
  const r = 12;
  const x = -w / 2;
  const y = -h / 2;

  ctx.save();
  ctx.translate(WIDTH - 190, HEIGHT - 95);
  const tiltDeg = STAMP_TILT_MIN_DEG + Math.random() * (STAMP_TILT_MAX_DEG - STAMP_TILT_MIN_DEG);
  const sign = Math.random() < 0.5 ? -1 : 1;
  ctx.rotate((sign * tiltDeg * Math.PI) / 180);
  ctx.globalAlpha = 0.88;
  ctx.strokeStyle = COLORS.vermillion;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = COLORS.vermillion;
  ctx.font = "700 46px 'Noto Serif TC', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 6);
  ctx.restore();
}

export async function renderShareImage({ size, timeSec, perfect, streak, score, solution, lang = "zh" }) {
  const T = SHARE_TEXT[lang];
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  try {
    await document.fonts.ready;
  } catch {
    /* font loading API unavailable, fall back to default serif */
  }

  // rice-paper background with a soft ink wash, echoing theme.jsx's inkWashStyle
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const wash1 = ctx.createRadialGradient(WIDTH * 0.2, HEIGHT * 0.12, 0, WIDTH * 0.2, HEIGHT * 0.12, WIDTH * 0.6);
  wash1.addColorStop(0, "rgba(76,91,110,0.12)");
  wash1.addColorStop(1, "rgba(76,91,110,0)");
  ctx.fillStyle = wash1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const wash2 = ctx.createRadialGradient(WIDTH * 0.85, HEIGHT * 0.25, 0, WIDTH * 0.85, HEIGHT * 0.25, WIDTH * 0.55);
  wash2.addColorStop(0, "rgba(176,121,60,0.10)");
  wash2.addColorStop(1, "rgba(176,121,60,0)");
  ctx.fillStyle = wash2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // brand / eyebrow
  ctx.fillStyle = COLORS.faint;
  ctx.font = "600 30px 'EB Garamond', serif";
  ctx.textAlign = "center";
  ctx.fillText(T.brand.toUpperCase(), WIDTH / 2, 150);

  // title
  ctx.fillStyle = COLORS.ink;
  ctx.font = "600 74px 'Noto Serif TC', serif";
  ctx.fillText(T.daily, WIDTH / 2, 250);

  // path thumbnail
  const boxSize = WIDTH * 0.62;
  drawPathThumb(ctx, solution, size, { x: (WIDTH - boxSize) / 2, y: 340, w: boxSize, h: boxSize });

  // stats row (small, informational — size/time)
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 40px 'Noto Serif TC', serif";
  ctx.fillText(`${size}×${size}　·　${fmtTime(timeSec)}`, WIDTH / 2, 340 + boxSize + 80);

  // badge row (the actual "worth sharing" signal — score always, streak
  // once it's ≥2) — sized/positioned as a pair when both are present, or
  // a single centered badge when streak isn't shown yet.
  const badges = [];
  if (score != null) badges.push({ accent: COLORS.vermillion, label: T.scoreLabel, value: String(score) });
  if (streak >= 2) badges.push({ accent: COLORS.ochre, label: T.streakLabel, value: `🔥 ${streak}` });

  if (badges.length) {
    const badgeW = 320;
    const badgeH = 130;
    const gap = 36;
    const totalW = badges.length * badgeW + (badges.length - 1) * gap;
    let cx = WIDTH / 2 - totalW / 2 + badgeW / 2;
    const y = 340 + boxSize + 120;
    for (const b of badges) {
      drawStatBadge(ctx, { cx, y, w: badgeW, h: badgeH, ...b });
      cx += badgeW + gap;
    }
  }

  if (perfect) drawPerfectStamp(ctx, T.perfect);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
