/**
 * 每日挑戰：日期種子確定性生成器（全球同題）
 */
import { generateHamiltonianPath, pickClueIndices } from "./hamiltonian.mjs";

function hashDate(dateStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const WEEK_SCHEDULE = {
  1: { size: 5,  clueRatio: 0.40, label: "週一・回歸日" },
  2: { size: 6,  clueRatio: 0.35, label: "週二" },
  3: { size: 8,  clueRatio: 0.30, label: "週三" },
  4: { size: 10, clueRatio: 0.28, label: "週四" },
  5: { size: 12, clueRatio: 0.25, label: "週五" },
  6: { size: 14, clueRatio: 0.25, label: "週六・長謎題" },
  0: { size: 16, clueRatio: 0.22, label: "週日・每週之王" },
};
export function buildDailyPuzzle(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const sched = WEEK_SCHEDULE[d.getUTCDay()];
  const seed = hashDate(dateStr);
  const rng = mulberry32(seed);
  const n = sched.size, total = n * n;
  let path = null, tries = 0;
  while (!path && tries < 50) { path = generateHamiltonianPath(n, rng); tries++; }
  if (!path) return null;
  const k = Math.max(2, Math.round(total * sched.clueRatio));
  const clueIdx = pickClueIndices(total, k, rng);
  const clues = {};
  clueIdx.forEach((idx) => {
    const [r, c] = path[idx - 1];
    clues[`${r}_${c}`] = idx;
  });
  return { date: dateStr, weekday: sched.label, size: n, total,
           clueCount: clueIdx.size, seed, tries, clues, solution: path };
}

export { WEEK_SCHEDULE };
