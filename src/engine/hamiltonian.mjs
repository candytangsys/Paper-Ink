/**
 * Shared Warnsdorff-heuristic Hamiltonian-path generator, used by both the
 * daily challenge (seeded, deterministic) and the regular/chapter levels
 * (unseeded by default). Extracted so the two callers stop maintaining
 * independent copies of the same algorithm.
 */
const DIRS_8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// rng defaults to Math.random so unseeded callers (regular levels) don't
// need to pass one; the daily challenge passes its own seeded mulberry32.
export function generateHamiltonianPath(n, rng = Math.random, stepBudget = 200000) {
  const total = n * n;
  const visited = Array.from({ length: n }, () => Array(n).fill(false));
  const path = [];
  let steps = 0;

  function neighborsOf(r, c) {
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
    visited[r][c] = true;
    path.push([r, c]);
    if (depth === total) return true;

    const candidates = neighborsOf(r, c).map((p) => ({ p, deg: neighborsOf(p[0], p[1]).length }));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.sort((a, b) => a.deg - b.deg);

    for (const { p } of candidates) {
      const result = dfs(p[0], p[1], depth + 1);
      if (result === "TIMEOUT") return "TIMEOUT";
      if (result) return true;
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  const sr = Math.floor(rng() * n);
  const sc = Math.floor(rng() * n);
  const result = dfs(sr, sc, 1);
  return result === true ? path : null;
}

// Always keeps index 1 and `total` as clues, evenly spreads the rest along
// the path, then randomly tops up if the spread came up short.
export function pickClueIndices(total, k, rng = Math.random) {
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

// True once the solution requires at least one diagonal step, so a player
// can't clear the puzzle with only orthogonal reasoning.
export function hasDiagonalStep(path) {
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1];
    const [r, c] = path[i];
    if (Math.abs(r - pr) === 1 && Math.abs(c - pc) === 1) return true;
  }
  return false;
}
