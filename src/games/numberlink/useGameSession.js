import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { startPlaytimeAdTimer } from "../../playtimeAdTimer.js";

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

// v3.3: the game no longer auto-marks the next cell for you. Instead, this
// long after the player's last action, it silently re-checks whether the
// *current* path is a genuine dead end — if so, it surfaces the "you're
// stuck" banner (suggesting undo/retry/a tool) instead of giving away any
// solution info. Reset on every move (advanceTo/undo) and every tool use,
// so it only fires after a real pause, and every path mutation hides any
// stale banner immediately (see setPath) so it's never shown for a
// position the player has already moved on from.
const STUCK_REMINDER_IDLE_MS = 6000;

// 靜心符 (v3.2): flat refund off the counted elapsed time.
const FREEZE_REFUND_SEC = 15;

// 引路符 (v3.2): how many upcoming cells to preview at once.
const PREVIEW_LOOKAHEAD = 3;

// 路線記憶 (v3.9): how long the ghost reference line stays before
// auto-dismissing on its own, if the player hasn't already caught back up
// past it first.
const GHOST_PATH_TIMEOUT_MS = 10000;

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
// findCompletion() search. Shared by revealCell(), traceRootCause(), and
// placeNextCell()/previewPath(), all of which just need "a valid way to
// finish from here," not necessarily the original solution.
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

export function useGameSession({ onWin, onUndoUsed } = {}) {
  const [puzzle, setPuzzleState] = useState(null);
  const [filledOrder, setFilledOrder] = useState([]);
  const pathRef = useRef([]);
  const [taps, setTaps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  // v3.8: the elapsed timer no longer runs while the player is still just
  // looking at the board — it only starts once they actually tap "1".
  // Stays true through any later undo back down to 0 filled cells (the game
  // has "started" the moment it started, undoing everything doesn't un-start
  // it); only start()/restart() resets it.
  const [started, setStarted] = useState(false);
  const [shakeKey, setShakeKey] = useState(null);
  const shakeTimeout = useRef(null);
  // Magnifier (放大鏡, v3.1 §一之3): revealed number for an arbitrary
  // tapped cell, not necessarily the next one in sequence.
  const [revealedCell, setRevealedCell] = useState(null); // { key, num: number|null } | null
  // 引路符 (v3.2): ordered array of up-to-3 upcoming cell keys, marks only.
  const [previewCells, setPreviewCells] = useState([]);
  // Stuck detection (v3.1 §一之4, retuned in v3.3): surfaced only via the
  // idle timer below, or immediately when a tool that can't act on a dead
  // end is invoked directly (see placeNextCell/previewPath).
  const [stuckBannerVisible, setStuckBannerVisible] = useState(false);
  const [rootCause, setRootCause] = useState(null); // { lastGoodStep, suggestedCell } | null
  // 路線記憶 (v3.6): a snapshot of the path right before the player's first
  // undo/restart *this attempt* — a faint reference ghost so they can see
  // where they got to before backing out. Only the first regression each
  // attempt takes the snapshot (repeated undos afterward don't keep
  // overwriting it down to nothing).
  //
  // v3.9: no longer lingers for the rest of the whole attempt — it now
  // clears itself as soon as either condition is true: the player has
  // refilled back past where the ghost was (it's no longer useful
  // reference at that point), or GHOST_PATH_TIMEOUT_MS has passed since it
  // was taken (so it doesn't just sit there indefinitely if they wander
  // off in a different direction instead of retracing it).
  const [previousPath, setPreviousPath] = useState(null); // [[r,c], ...] | null
  // Mirrors `previousPath` synchronously — state updates are async, but
  // setPath() (below) needs to read the just-taken snapshot in the same
  // tick it was set (undo() sets both in one call).
  const previousPathRef = useRef(null);
  const previousPathTakenRef = useRef(false);
  const ghostTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const puzzleRef = useRef(null);
  // Idle-triggered stuck check (v3.3) — stuckTimerRef holds the pending
  // setTimeout, cleared/rescheduled on every player action.
  const stuckTimerRef = useRef(null);
  // Whether any tool (revealCell(), traceRootCause(), placeNextCell(),
  // previewPath(), freezeTime()) was used this run — feeds the "no-hint"
  // scoring bonus (v3.1). The passive stuck reminder never sets this: it
  // doesn't reveal any solution info, just that the current path is dead.
  const usedToolRef = useRef(false);

  const tapsRef = useRef(0);
  const mistakesRef = useRef(0);
  const elapsedRef = useRef(0);
  const onWinRef = useRef(onWin);
  const onUndoUsedRef = useRef(onUndoUsed);
  useEffect(() => { onWinRef.current = onWin; }, [onWin]);
  useEffect(() => { onUndoUsedRef.current = onUndoUsed; }, [onUndoUsed]);
  useEffect(() => { tapsRef.current = taps; }, [taps]);
  useEffect(() => { mistakesRef.current = mistakes; }, [mistakes]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  const filledSet = useMemo(() => {
    const s = new Set();
    filledOrder.forEach(([r, c]) => s.add(`${r}_${c}`));
    return s;
  }, [filledOrder]);

  const clearGhostPath = useCallback(() => {
    previousPathRef.current = null;
    previousPathTakenRef.current = false;
    setPreviousPath(null);
    if (ghostTimeoutRef.current) {
      clearTimeout(ghostTimeoutRef.current);
      ghostTimeoutRef.current = null;
    }
  }, []);

  const takeGhostSnapshot = useCallback((order) => {
    previousPathRef.current = order;
    previousPathTakenRef.current = true;
    setPreviousPath(order);
    if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
    ghostTimeoutRef.current = setTimeout(() => {
      ghostTimeoutRef.current = null;
      previousPathRef.current = null;
      previousPathTakenRef.current = false;
      setPreviousPath(null);
    }, GHOST_PATH_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
    };
  }, []);

  const setPath = useCallback(
    (next) => {
      pathRef.current = next;
      setFilledOrder(next);
      setRevealedCell(null);
      setRootCause(null);
      setPreviewCells([]);
      // Every path mutation (advance or retract) invalidates any stuck
      // reminder shown for the *previous* position — it'll be re-evaluated
      // fresh after the next pause via scheduleStuckCheck().
      setStuckBannerVisible(false);
      // v3.9: caught back up to (or past) where the ghost was taken —
      // it's served its purpose, dismiss it early instead of waiting out
      // GHOST_PATH_TIMEOUT_MS.
      if (previousPathRef.current && next.length >= previousPathRef.current.length) {
        clearGhostPath();
      }
    },
    [clearGhostPath]
  );

  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, []);

  // Resets the idle-stuck-check clock — called from every player action
  // (advanceTo/undo) and every tool use, so the reminder only evaluates
  // after a real pause, not immediately after something just happened.
  const scheduleStuckCheck = useCallback(() => {
    clearStuckTimer();
    if (wonRef.current || !puzzleRef.current) return;
    stuckTimerRef.current = setTimeout(() => {
      stuckTimerRef.current = null;
      const p = puzzleRef.current;
      if (!p || wonRef.current) return;
      const order = pathRef.current;
      if (order.length === 0) return;
      const completion = findCompletion(p, order);
      if (completion === null) setStuckBannerVisible(true);
    }, STUCK_REMINDER_IDLE_MS);
  }, [clearStuckTimer]);

  useEffect(() => clearStuckTimer, [clearStuckTimer]);

  const start = useCallback((newPuzzle) => {
    puzzleRef.current = newPuzzle;
    setPuzzleState(newPuzzle);
    pathRef.current = [];
    setFilledOrder([]);
    setTaps(0);
    setMistakes(0);
    setElapsed(0);
    setRevealedCell(null);
    setRootCause(null);
    setPreviewCells([]);
    setStuckBannerVisible(false);
    clearGhostPath();
    wonRef.current = false;
    setWon(false);
    setStarted(false);
    usedToolRef.current = false;
    clearStuckTimer(); // not (re)started until the player's first tap
  }, [clearStuckTimer, clearGhostPath]);

  // Resets progress on the *same* puzzle instance (no regeneration) — used
  // by "play again"/"retry" so a retry is actually a retry, not a new
  // random board. Preserves this attempt's ghost-path snapshot (start()
  // above always clears it, since it's also used for genuinely new
  // puzzles) — if no snapshot was taken yet, this restart itself counts as
  // the first regression and takes one from the pre-restart path.
  const restart = useCallback(() => {
    if (!puzzleRef.current) return;
    const ghost = previousPathTakenRef.current
      ? previousPathRef.current
      : pathRef.current.length > 0
      ? pathRef.current.slice()
      : null;
    start(puzzleRef.current);
    if (ghost) takeGhostSnapshot(ghost);
  }, [start, takeGhostSnapshot]);

  /* timer */
  useEffect(() => {
    if (puzzle && !won && started) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    return undefined;
  }, [puzzle, won, started]);

  const triggerShake = useCallback((key) => {
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    setShakeKey(key);
    shakeTimeout.current = setTimeout(() => setShakeKey(null), 380);
  }, []);

  const dismissStuckBanner = useCallback(() => setStuckBannerVisible(false), []);

  const handleWin = useCallback(() => {
    wonRef.current = true;
    clearStuckTimer();
    setWon(true);
    onWinRef.current &&
      onWinRef.current({
        taps: tapsRef.current + 1,
        mistakes: mistakesRef.current,
        timeSec: elapsedRef.current,
        usedTool: usedToolRef.current,
      });
  }, [clearStuckTimer]);

  // Advance the path to (r,c) or retract; reads the synchronous pathRef so
  // rapid drag events never work off stale state. Returns whether the tap
  // was valid (true) or a mistake (false) — Board.jsx's segmented-drag
  // commit (v3.8) uses this to decide whether its drag anchor should
  // advance to the attempted cell or stay put.
  const advanceTo = useCallback(
    (r, c) => {
      const puzzle = puzzleRef.current;
      if (!puzzle || wonRef.current) return false;
      scheduleStuckCheck(); // any interaction resets the idle-stuck-check clock
      const order = pathRef.current;
      const key = `${r}_${c}`;

      if (order.length === 0) {
        if (puzzle.clueMap[key] === 1) {
          setPath([[r, c]]);
          setTaps((t) => t + 1);
          setStarted(true);
          startPlaytimeAdTimer();
          return true;
        }
        setMistakes((m) => m + 1);
        triggerShake(key);
        return false;
      }

      const [hr, hc] = order[order.length - 1];
      if (hr === r && hc === c) return true; // already the head, harmless no-op

      // Tapping any already-filled number (v3.7) jumps the path straight
      // back to end there — a one-click alternative to hitting 回退
      // repeatedly. Same "no penalty, doesn't count as a hint tool" as
      // undo: free, no mistake, no usedToolRef. Works during a drag stroke
      // too, since Board.jsx's drag handler re-invokes this per cell
      // entered. Subsumes the old "slide back onto the previous circle"
      // special case (that's just filledIdx === order.length - 2).
      const filledIdx = order.findIndex(([fr, fc]) => fr === r && fc === c);
      if (filledIdx !== -1) {
        if (!previousPathTakenRef.current) takeGhostSnapshot(order.slice());
        setPath(order.slice(0, filledIdx + 1));
        return true;
      }

      const adjacent = Math.max(Math.abs(hr - r), Math.abs(hc - c)) === 1;
      const nextNum = order.length + 1;
      const clueVal = puzzle.clueMap[key];

      if (!adjacent || (clueVal !== undefined && clueVal !== nextNum)) {
        setMistakes((m) => m + 1);
        triggerShake(key);
        return false;
      }

      const next = [...order, [r, c]];
      setPath(next);
      setTaps((t) => t + 1);
      if (next.length === puzzle.total) handleWin();
      return true;
    },
    [setPath, triggerShake, handleWin, scheduleStuckCheck, takeGhostSnapshot]
  );

  const undo = useCallback(() => {
    if (wonRef.current) return;
    const order = pathRef.current;
    if (order.length === 0) return;
    if (!previousPathTakenRef.current) {
      takeGhostSnapshot(order.slice());
    }
    scheduleStuckCheck();
    setPath(order.slice(0, -1));
    onUndoUsedRef.current && onUndoUsedRef.current();
  }, [setPath, scheduleStuckCheck, takeGhostSnapshot]);

  // Magnifier (v3.1 §一之3): reveal the correct number for *any* tapped
  // cell, not just the next one in sequence — doesn't auto-place it, same
  // "player still makes the move" principle as the other tools.
  const revealCell = useCallback((r, c) => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return;
    const key = `${r}_${c}`;
    if (puzzle.clueMap[key] !== undefined) return; // clue cells already show their number
    if (pathRef.current.some(([fr, fc]) => fr === r && fc === c)) return; // already filled in
    usedToolRef.current = true;
    scheduleStuckCheck();

    const order = pathRef.current;
    const completion = completionFrom(puzzle, order);
    if (completion === null || completion === "unknown") {
      setRevealedCell({ key, num: null });
      return;
    }
    const idx = completion.findIndex(([pr, pc]) => pr === r && pc === c);
    setRevealedCell({ key, num: idx + 1 });
  }, [scheduleStuckCheck]);

  const traceRootCause = useCallback(() => {
    const puzzle = puzzleRef.current;
    const order = pathRef.current;
    if (!puzzle || wonRef.current || order.length < 2) return null;
    usedToolRef.current = true;
    scheduleStuckCheck();
    const result = traceRootCauseFrom(puzzle, order);
    setRootCause(result);
    return result;
  }, [scheduleStuckCheck]);

  // 接力筆 (v3.2): *auto-places* the next correct cell instead of just
  // marking it — the one paid tool that actually advances the path. Safe to
  // hand straight to advanceTo() since completionFrom guarantees the
  // returned cell is adjacent and clue-consistent by construction, so it
  // reuses advanceTo's win-check bookkeeping for free. If the current path
  // is already a dead end there's nothing to place, so it surfaces the
  // stuck banner immediately instead of waiting for the idle timer.
  const placeNextCell = useCallback(() => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return false;
    const order = pathRef.current;
    const nextNum = order.length + 1;
    if (nextNum > puzzle.total) return false;
    usedToolRef.current = true;
    const completion = completionFrom(puzzle, order);
    if (completion === null || completion === "unknown") {
      setStuckBannerVisible(true);
      return false;
    }
    const [r, c] = completion[nextNum - 1];
    advanceTo(r, c);
    return true;
  }, [advanceTo]);

  // 引路符 (v3.2): preview (mark only, no digits) the next PREVIEW_LOOKAHEAD
  // cells in sequence — a wider-but-shallower cousin of 接力筆, shows the
  // shape of the upcoming route without spoiling exact numbers. Same
  // immediate-stuck-banner fallback as placeNextCell when there's nothing
  // left to preview.
  const previewPath = useCallback(() => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return [];
    const order = pathRef.current;
    usedToolRef.current = true;
    scheduleStuckCheck();
    const completion = completionFrom(puzzle, order);
    if (completion === null || completion === "unknown") {
      setPreviewCells([]);
      setStuckBannerVisible(true);
      return [];
    }
    const upcoming = completion.slice(order.length, order.length + PREVIEW_LOOKAHEAD).map(([r, c]) => `${r}_${c}`);
    setPreviewCells(upcoming);
    return upcoming;
  }, [scheduleStuckCheck]);

  // 靜心符 (v3.2): flat time-refund off the counted elapsed seconds — helps
  // reach the golden/silver time-bonus tier. An instant, visible refund
  // (the clock jumps back) rather than an invisible pause, so the effect is
  // unambiguous to the player.
  const freezeTime = useCallback(() => {
    if (!puzzleRef.current || wonRef.current) return false;
    usedToolRef.current = true;
    scheduleStuckCheck();
    setElapsed((e) => Math.max(0, e - FREEZE_REFUND_SEC));
    return true;
  }, [scheduleStuckCheck]);

  // 錘子 (v3.6): deletes one of the puzzle's own given clue numbers, turning
  // it back into an ordinary blank cell the player can pass through at
  // whatever step their own path reaches it — loosens a constraint rather
  // than revealing a solution. The engine never assumes a fixed clue set
  // (findCompletion() above just reads whatever's in clueMap at call time),
  // so dropping one clue can only enlarge the solution space, never make
  // the puzzle unsolvable. Start (clue 1) and the final clue (`total`) are
  // protected — they anchor where the player begins/ends — and a clue the
  // path has already filled has nothing left to remove.
  const hammerClue = useCallback((r, c) => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return false;
    const key = `${r}_${c}`;
    const clueVal = puzzle.clueMap[key];
    if (clueVal === undefined || clueVal === 1 || clueVal === puzzle.total) return false;
    if (pathRef.current.some(([fr, fc]) => fr === r && fc === c)) return false;
    usedToolRef.current = true;
    scheduleStuckCheck();
    const nextClueMap = { ...puzzle.clueMap };
    delete nextClueMap[key];
    const nextPuzzle = { ...puzzle, clueMap: nextClueMap };
    puzzleRef.current = nextPuzzle;
    setPuzzleState(nextPuzzle);
    return true;
  }, [scheduleStuckCheck]);

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
    elapsed,
    won,
    shakeKey,
    revealedCell,
    previewCells,
    stuckBannerVisible,
    rootCause,
    previousPath,
    start,
    restart,
    advanceTo,
    undo,
    revealCell,
    traceRootCause,
    placeNextCell,
    previewPath,
    freezeTime,
    hammerClue,
    dismissStuckBanner,
  };
}
