import { COLORS, inkTrailColor } from "../theme.jsx";
import { fmtTime } from "../engine/share.mjs";

const WIDTH = 1080;
const HEIGHT = 1350;

const SHARE_TEXT = {
  zh: {
    brand: "紙墨筆・一筆連",
    daily: (n) => `每日挑戰 #${n}`,
    perfect: "完",
    streak: (n) => `連續 ${n} 天`,
  },
  en: {
    brand: "Paper & Ink",
    daily: (n) => `One-Stroke Daily #${n}`,
    perfect: "PERFECT",
    streak: (n) => `${n}-day streak`,
  },
};

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
  ctx.translate(WIDTH - 190, HEIGHT - 260);
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

export async function renderShareImage({ dailyNo, size, timeSec, perfect, streak, solution, lang = "zh" }) {
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
  ctx.fillText(T.daily(dailyNo), WIDTH / 2, 250);

  // path thumbnail
  const boxSize = WIDTH * 0.62;
  drawPathThumb(ctx, solution, size, { x: (WIDTH - boxSize) / 2, y: 340, w: boxSize, h: boxSize });

  // stats row
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = "500 40px 'Noto Serif TC', serif";
  ctx.fillText(`${size}×${size}　·　${fmtTime(timeSec)}`, WIDTH / 2, 340 + boxSize + 80);

  if (streak >= 2) {
    ctx.fillStyle = COLORS.ochre;
    ctx.font = "600 38px 'Noto Serif TC', serif";
    ctx.fillText(`🔥 ${T.streak(streak)}`, WIDTH / 2, 340 + boxSize + 140);
  }

  if (perfect) drawPerfectStamp(ctx, T.perfect);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
