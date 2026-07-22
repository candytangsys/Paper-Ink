/**
 * 每日挑戰：日期種子確定性生成器（全球同題）
 */
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
const DIRS_8 = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

function generateHamiltonianPath(n, rng, stepBudget = 200000) {
  const total = n * n;
  const visited = Array.from({ length: n }, () => Array(n).fill(false));
  const path = [];
  let steps = 0;
  function nb(r, c) {
    const res = [];
    for (const [dr, dc] of DIRS_8) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]) res.push([nr, nc]);
    }
    return res;
  }
  function dfs(r, c, depth) {
    steps++;
    if (steps > stepBudget) return "TIMEOUT";
    visited[r][c] = true; path.push([r, c]);
    if (depth === total) return true;
    let ns = nb(r, c).map((p) => ({ p, deg: nb(p[0], p[1]).length }));
    for (let i = ns.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ns[i], ns[j]] = [ns[j], ns[i]];
    }
    ns.sort((a, b) => a.deg - b.deg);
    for (const { p } of ns) {
      const r2 = dfs(p[0], p[1], depth + 1);
      if (r2 === "TIMEOUT") return "TIMEOUT";
      if (r2) return true;
    }
    visited[r][c] = false; path.pop();
    return false;
  }
  const sr = Math.floor(rng() * n), sc = Math.floor(rng() * n);
  const result = dfs(sr, sc, 1);
  return result === true ? path : null;
}

function pickClueIndices(total, k, rng) {
  const set = new Set([1, total]);
  const need = k - set.size;
  if (need > 0) {
    const step = (total - 1) / (need + 1);
    for (let i = 1; i <= need; i++) {
      let idx = Math.round(1 + step * i);
      idx = Math.max(2, Math.min(total - 1, idx));
      set.add(idx);
    }
  }
  let attempts = 0;
  while (set.size < k && attempts < 200 && total > 2) {
    set.add(2 + Math.floor(rng() * (total - 2)));
    attempts++;
  }
  return set;
}

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
