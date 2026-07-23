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

// Background stuck-check budget (v3.1 §一之4a) — deliberately much lower
// than findCompletion's default so it can run after every single move
// without noticeable jank, especially on a 16x16 board. A cheaper budget
// means more "unknown" (timeout) results, which the caller treats as "not
// stuck" — false negatives are fine here, a laggy board on every tap isn't.
const QUICK_CHECK_BUDGET = 20000;

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

// Returns *some* full 1..total completion consistent with the player's
// current path `order` — the untouched canonical puzzle.path if they
// haven't diverged from it yet (cheap, no search), otherwise a fresh
// findCompletion() search. Shared by hint(), revealCell(), and
// traceRootCause(), all of which just need "a valid way to finish from
// here," not necessarily the original solution.
function completionFrom(puzzle, order, stepBudget) {
  if (order.length === 0) return puzzle.path;
  const canonicalPrefix = puzzle.path.slice(0, order.length);
  const onCanonical = order.every(([r, c], i) => canonicalPrefix[i][0] === r && canonicalPrefix[i][1] === c);
  if (onCanonical) return puzzle.path;
  return findCompletion(puzzle, order, stepBudget);
}

// 溯源符 (v3.1 §一之4b): binary-searches back along the player's current
// path for the last step that was still completable. Solvability along a
// fixed path is monotonically non-increasing (once a prefix is a dead end,
// every longer prefix built on top of it is too — it's the same infeasible
// position with more constraints stacked on), so this needs only
// ~log2(path length) findCompletion calls instead of checking every step,
// which matters since each call can cost up to its full stepBudget.
// Exported (rather than kept as a hook-internal closure) so its correctness
// can be unit-tested directly against constructed puzzles/paths.
export function traceRootCauseFrom(puzzle, order) {
  let lo = 1; // step 1 (clue "1") is always solvable — the puzzle has a solution by construction
  let hi = order.length;
  let lastGoodCompletion = puzzle.path;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const completion = findCompletion(puzzle, order.slice(0, mid), 150000);
    if (completion && completion !== "unknown") {
      lo = mid;
      lastGoodCompletion = completion;
    } else {
      hi = mid - 1;
    }
  }
  const suggested = lastGoodCompletion[lo] || null;
  return { lastGoodStep: lo, suggestedCell: suggested ? `${suggested[0]}_${suggested[1]}` : null };
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
  // Magnifier (放大鏡, v3.1 §一之3): revealed number for an arbitrary
  // tapped cell, not necessarily the next one in sequence.
  const [revealedCell, setRevealedCell] = useState(null); // { key, num: number|null } | null
  // Proactive stuck detection + root-cause tool (v3.1 §一之4).
  const [stuckBannerVisible, setStuckBannerVisible] = useState(false);
  const [rootCause, setRootCause] = useState(null); // { lastGoodStep, suggestedCell } | null
  const stuckSinceRef = useRef(null);
  const stuckShownRef = useRef(false);
  const timerRef = useRef(null);
  const puzzleRef = useRef(null);
  // Whether any hint/tool (hint(), revealCell(), traceRootCause()) was
  // used this run — feeds the "no-hint" scoring bonus (v3.1).
  const usedToolRef = useRef(false);

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
    setRevealedCell(null);
    setRootCause(null);
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
    setRevealedCell(null);
    setRootCause(null);
    setStuckBannerVisible(false);
    stuckSinceRef.current = null;
    stuckShownRef.current = false;
    wonRef.current = false;
    setWon(false);
    usedToolRef.current = false;
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

  // "玩家自己回退離開卡死點後，偵測重新啟動" — any retraction (drag-back or
  // explicit undo) that backs out of the point where stuck-detection first
  // triggered clears the episode so it can fire fresh later.
  const maybeResetStuck = useCallback((newLength) => {
    if (stuckSinceRef.current !== null && newLength < stuckSinceRef.current) {
      stuckSinceRef.current = null;
      stuckShownRef.current = false;
      setStuckBannerVisible(false);
    }
  }, []);

  // Background stuck-check (v3.1 §一之4a): run after every successful move,
  // using a reduced step budget so it can't noticeably lag a 16x16 board.
  // Doesn't interrupt immediately — waits 3 further moves past the first
  // detected dead end before surfacing the banner, and only once per episode.
  const checkStuck = useCallback((order) => {
    const puzzle = puzzleRef.current;
    const completion = findCompletion(puzzle, order, QUICK_CHECK_BUDGET);
    if (completion === null) {
      if (stuckSinceRef.current === null) {
        stuckSinceRef.current = order.length;
      } else if (!stuckShownRef.current && order.length - stuckSinceRef.current >= 3) {
        stuckShownRef.current = true;
        setStuckBannerVisible(true);
      }
    } else {
      // Solvable, or the quick budget timed out ("unknown") — treat both as
      // "not stuck" rather than risk a false positive from an under-budget search.
      stuckSinceRef.current = null;
      stuckShownRef.current = false;
      setStuckBannerVisible(false);
    }
  }, []);

  const dismissStuckBanner = useCallback(() => setStuckBannerVisible(false), []);

  const handleWin = useCallback(() => {
    wonRef.current = true;
    setWon(true);
    onWinRef.current &&
      onWinRef.current({
        taps: tapsRef.current + 1,
        mistakes: mistakesRef.current,
        timeSec: elapsedRef.current,
        usedTool: usedToolRef.current,
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
          const retracted = order.slice(0, -1);
          setPath(retracted);
          maybeResetStuck(retracted.length);
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
      } else {
        checkStuck(next);
      }
    },
    [setPath, triggerShake, handleWin, checkStuck]
  );

  const undo = useCallback(() => {
    if (wonRef.current) return;
    const order = pathRef.current;
    if (order.length === 0) return;
    const next = order.slice(0, -1);
    setPath(next);
    maybeResetStuck(next.length);
    onUndoUsedRef.current && onUndoUsedRef.current();
  }, [setPath, maybeResetStuck]);

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
    usedToolRef.current = true;

    const completion = completionFrom(puzzle, order);
    if (completion === null || completion === "unknown") {
      setHintCell(null);
      setHintStuck(true);
      onHintUsedRef.current && onHintUsedRef.current({ salvageable: false });
      return;
    }

    const nextCell = completion[nextNum - 1];
    setHintStuck(false);
    setHintCell(`${nextCell[0]}_${nextCell[1]}`);
    setHints((h) => h + 1);
    onHintUsedRef.current && onHintUsedRef.current({ salvageable: true });
  }, []);

  // Magnifier (v3.1 §一之3): reveal the correct number for *any* tapped
  // cell, not just the next one in sequence — doesn't auto-place it, same
  // "player still makes the move" principle as hint().
  const revealCell = useCallback((r, c) => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return;
    const key = `${r}_${c}`;
    if (puzzle.clueMap[key] !== undefined) return; // clue cells already show their number
    if (pathRef.current.some(([fr, fc]) => fr === r && fc === c)) return; // already filled in
    usedToolRef.current = true;

    const order = pathRef.current;
    const completion = completionFrom(puzzle, order);
    if (completion === null || completion === "unknown") {
      setRevealedCell({ key, num: null });
      return;
    }
    const idx = completion.findIndex(([pr, pc]) => pr === r && pc === c);
    setRevealedCell({ key, num: idx + 1 });
  }, []);

  const traceRootCause = useCallback(() => {
    const puzzle = puzzleRef.current;
    const order = pathRef.current;
    if (!puzzle || wonRef.current || order.length < 2) return null;
    usedToolRef.current = true;
    const result = traceRootCauseFrom(puzzle, order);
    setRootCause(result);
    return result;
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
    revealedCell,
    stuckBannerVisible,
    rootCause,
    start,
    restart,
    advanceTo,
    undo,
    hint,
    revealCell,
    traceRootCause,
    dismissStuckBanner,
  };
}
