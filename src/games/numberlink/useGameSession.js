import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ---------------------------------------------------------
   Shared one-stroke-path session state: filled path, taps,
   mistakes, elapsed timer, undo/hint, win detection. Used by
   both the tutorial levels (NumberLink.jsx) and the Daily
   Challenge (Daily.jsx) so the interaction rules never drift
   between the two.

   A "session puzzle" is the shape both callers must produce:
     { n, total, path, clueMap }
   where clueMap is `${r}_${c} -> number` and path is the full
   1..N solution (used only for the hint feature).
--------------------------------------------------------- */

const DIRS_8 = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// Given the player's current (possibly off-solution) path, searches for
// *any* legal way to fill the rest of the board — not just the original
// canonical `puzzle.path` — so hint stays correct even after the player
// has wandered onto a different valid route than the one the puzzle was
// generated from. Same Warnsdorff-ordered backtracking as the generators
// in NumberLink.jsx/daily.mjs, just seeded from the current head and
// constrained to hit each remaining clue at its exact step number.
// Returns the full completed path, `null` if the position is provably a
// dead end, or "unknown" if the search couldn't decide within budget.
function findCompletion(puzzle, order, stepBudget = 150000) {
  const { n, total, clueMap } = puzzle;
  const visited = new Set(order.map(([r, c]) => `${r}_${c}`));
  const path = order.slice();
  let steps = 0;

  function neighborsOf(r, c) {
    const res = [];
    for (const [dr, dc] of DIRS_8) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        const key = `${nr}_${nc}`;
        if (!visited.has(key)) res.push([nr, nc]);
      }
    }
    return res;
  }

  function dfs(r, c, depth) {
    steps++;
    if (steps > stepBudget) return "TIMEOUT";
    if (depth === total) return true;

    const candidates = neighborsOf(r, c).filter(([nr, nc]) => {
      const clueVal = clueMap[`${nr}_${nc}`];
      return clueVal === undefined || clueVal === depth + 1;
    });
    const scored = candidates.map((p) => ({ p, deg: neighborsOf(p[0], p[1]).length }));
    for (let i = scored.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scored[i], scored[j]] = [scored[j], scored[i]];
    }
    scored.sort((a, b) => a.deg - b.deg);

    for (const { p } of scored) {
      const key = `${p[0]}_${p[1]}`;
      visited.add(key);
      path.push(p);
      const res = dfs(p[0], p[1], depth + 1);
      if (res === true) return true;
      if (res === "TIMEOUT") return "TIMEOUT";
      visited.delete(key);
      path.pop();
    }
    return false;
  }

  const [hr, hc] = order[order.length - 1];
  const result = dfs(hr, hc, order.length);
  if (result === true) return path;
  if (result === "TIMEOUT") return "unknown";
  return null;
}

export function useGameSession({ onWin, onHintUsed, onUndoUsed } = {}) {
  const [puzzle, setPuzzleState] = useState(null);
  const [filledOrder, setFilledOrder] = useState([]);
  const pathRef = useRef([]);
  const [taps, setTaps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const [shakeKey, setShakeKey] = useState(null);
  const shakeTimeout = useRef(null);
  const [hintCell, setHintCell] = useState(null);
  const [hintStuck, setHintStuck] = useState(false);
  const timerRef = useRef(null);
  const puzzleRef = useRef(null);

  const tapsRef = useRef(0);
  const mistakesRef = useRef(0);
  const elapsedRef = useRef(0);
  const onWinRef = useRef(onWin);
  const onHintUsedRef = useRef(onHintUsed);
  const onUndoUsedRef = useRef(onUndoUsed);
  useEffect(() => { onWinRef.current = onWin; }, [onWin]);
  useEffect(() => { onHintUsedRef.current = onHintUsed; }, [onHintUsed]);
  useEffect(() => { onUndoUsedRef.current = onUndoUsed; }, [onUndoUsed]);
  useEffect(() => { tapsRef.current = taps; }, [taps]);
  useEffect(() => { mistakesRef.current = mistakes; }, [mistakes]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  const filledSet = useMemo(() => {
    const s = new Set();
    filledOrder.forEach(([r, c]) => s.add(`${r}_${c}`));
    return s;
  }, [filledOrder]);

  const setPath = useCallback((next) => {
    pathRef.current = next;
    setFilledOrder(next);
    setHintCell(null);
    setHintStuck(false);
  }, []);

  const start = useCallback((newPuzzle) => {
    puzzleRef.current = newPuzzle;
    setPuzzleState(newPuzzle);
    pathRef.current = [];
    setFilledOrder([]);
    setTaps(0);
    setMistakes(0);
    setHints(0);
    setElapsed(0);
    setHintCell(null);
    setHintStuck(false);
    wonRef.current = false;
    setWon(false);
  }, []);

  // Resets progress on the *same* puzzle instance (no regeneration) — used
  // by "play again"/"retry" so a retry is actually a retry, not a new
  // random board.
  const restart = useCallback(() => {
    if (puzzleRef.current) start(puzzleRef.current);
  }, [start]);

  /* timer */
  useEffect(() => {
    if (puzzle && !won) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    return undefined;
  }, [puzzle, won]);

  const triggerShake = useCallback((key) => {
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    setShakeKey(key);
    shakeTimeout.current = setTimeout(() => setShakeKey(null), 380);
  }, []);

  const handleWin = useCallback(() => {
    wonRef.current = true;
    setWon(true);
    onWinRef.current &&
      onWinRef.current({
        taps: tapsRef.current + 1,
        mistakes: mistakesRef.current,
        timeSec: elapsedRef.current,
      });
  }, []);

  // Advance the path to (r,c) or retract; reads the synchronous pathRef so
  // rapid drag events never work off stale state.
  const advanceTo = useCallback(
    (r, c) => {
      const puzzle = puzzleRef.current;
      if (!puzzle || wonRef.current) return;
      const order = pathRef.current;
      const key = `${r}_${c}`;

      if (order.length === 0) {
        if (puzzle.clueMap[key] === 1) {
          setPath([[r, c]]);
          setTaps((t) => t + 1);
        } else {
          setMistakes((m) => m + 1);
          triggerShake(key);
        }
        return;
      }

      const [hr, hc] = order[order.length - 1];
      if (hr === r && hc === c) return; // already the head, ignore

      // sliding back onto the previous circle retracts, no penalty
      if (order.length >= 2) {
        const [pr, pc] = order[order.length - 2];
        if (pr === r && pc === c) {
          setPath(order.slice(0, -1));
          return;
        }
      }

      const adjacent = Math.max(Math.abs(hr - r), Math.abs(hc - c)) === 1;
      const already = order.some(([fr, fc]) => fr === r && fc === c);
      const nextNum = order.length + 1;
      const clueVal = puzzle.clueMap[key];

      if (!adjacent || already || (clueVal !== undefined && clueVal !== nextNum)) {
        setMistakes((m) => m + 1);
        triggerShake(key);
        return;
      }

      const next = [...order, [r, c]];
      setPath(next);
      setTaps((t) => t + 1);
      if (next.length === puzzle.total) {
        handleWin();
      }
    },
    [setPath, triggerShake, handleWin]
  );

  const undo = useCallback(() => {
    if (wonRef.current) return;
    const order = pathRef.current;
    if (order.length === 0) return;
    setPath(order.slice(0, -1));
    onUndoUsedRef.current && onUndoUsedRef.current();
  }, [setPath]);

  // Marks (doesn't auto-place) the correct next cell so the player still
  // makes the move themselves. First checks whether the player's actual
  // current path can still be completed at all — following the original
  // canonical solution blindly would occasionally point at a cell that's
  // no longer reachable once the player has taken a different-but-valid
  // route, which is worse than useless. If nothing can complete the
  // position, says so instead of guessing.
  const hint = useCallback(() => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return;
    const order = pathRef.current;
    const nextNum = order.length + 1;
    if (nextNum > puzzle.total) return;

    let nextCell;
    if (order.length === 0) {
      nextCell = puzzle.path[0];
    } else {
      const canonicalPrefix = puzzle.path.slice(0, order.length);
      const onCanonical = order.every(([r, c], i) => canonicalPrefix[i][0] === r && canonicalPrefix[i][1] === c);
      if (onCanonical) {
        nextCell = puzzle.path[nextNum - 1];
      } else {
        const completion = findCompletion(puzzle, order);
        if (completion === null || completion === "unknown") {
          setHintCell(null);
          setHintStuck(true);
          onHintUsedRef.current && onHintUsedRef.current({ salvageable: false });
          return;
        }
        nextCell = completion[nextNum - 1];
      }
    }

    setHintStuck(false);
    setHintCell(`${nextCell[0]}_${nextCell[1]}`);
    setHints((h) => h + 1);
    onHintUsedRef.current && onHintUsedRef.current({ salvageable: true });
  }, []);

  /* derived candidate cells (valid next taps) for gentle highlighting */
  const candidateSet = useMemo(() => {
    if (!puzzle || won) return new Set();
    if (filledOrder.length === 0) {
      const entry = Object.entries(puzzle.clueMap).find(([, v]) => v === 1);
      return entry ? new Set([entry[0]]) : new Set();
    }
    const [hr, hc] = filledOrder[filledOrder.length - 1];
    const s = new Set();
    for (const [dr, dc] of DIRS_8) {
      const nr = hr + dr, nc = hc + dc;
      if (nr >= 0 && nr < puzzle.n && nc >= 0 && nc < puzzle.n) {
        const key = `${nr}_${nc}`;
        if (!filledSet.has(key)) s.add(key);
      }
    }
    return s;
  }, [puzzle, won, filledOrder, filledSet]);

  return {
    puzzle,
    filledOrder,
    filledSet,
    candidateSet,
    taps,
    mistakes,
    hints,
    elapsed,
    won,
    shakeKey,
    hintCell,
    hintStuck,
    start,
    restart,
    advanceTo,
    undo,
    hint,
  };
}
