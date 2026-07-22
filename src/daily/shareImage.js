import { COLORS, inkTrailColor } from "../theme.jsx";
import { fmtTime } from "../engine/share.mjs";

const WIDTH = 1080;
const HEIGHT = 1350;

const SHARE_TEXT = {
  zh: {
    brand: "紙墨集・一筆連",
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

function drawPerfectStamp(ctx, label) {
  ctx.save();
  ctx.translate(WIDTH - 190, HEIGHT - 260);
  ctx.rotate(-0.12);
  ctx.globalAlpha = 0.88;
  ctx.strokeStyle = COLORS.vermillion;
  ctx.lineWidth = 6;
  ctx.strokeRect(-85, -85, 170, 170);
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
