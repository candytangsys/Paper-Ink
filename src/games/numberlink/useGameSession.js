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

export function useGameSession({ onWin, onHintUsed, onUndoUsed } = {}) {
  const [puzzle, setPuzzleState] = useState(null);
  const [filledOrder, setFilledOrder] = useState([]);
  const pathRef = useRef([]);
  const [taps, setTaps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const [shakeKey, setShakeKey] = useState(null);
  const shakeTimeout = useRef(null);
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
  }, []);

  const start = useCallback((newPuzzle) => {
    puzzleRef.current = newPuzzle;
    setPuzzleState(newPuzzle);
    pathRef.current = [];
    setFilledOrder([]);
    setTaps(0);
    setMistakes(0);
    setElapsed(0);
    wonRef.current = false;
    setWon(false);
  }, []);

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

  const hint = useCallback(() => {
    const puzzle = puzzleRef.current;
    if (!puzzle || wonRef.current) return;
    const nextNum = pathRef.current.length + 1;
    if (nextNum > puzzle.total) return;
    const [r, c] = puzzle.path[nextNum - 1];
    setMistakes((m) => m + 1);
    onHintUsedRef.current && onHintUsedRef.current();
    advanceTo(r, c);
  }, [advanceTo]);

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
    start,
    advanceTo,
    undo,
    hint,
  };
}
