import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Undo2, Lightbulb, RotateCcw, ArrowLeft, Lock, Check, Timer, Feather, Home } from "lucide-react";
import { COLORS, inkWashStyle, inkTrailColor, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";

const TEXT = {
  zh: {
    home: "主畫面",
    brandTag: "Number · Ink · Path",
    title: "一筆連",
    subtitle: (n) => `循著數字順序，一筆連過每一格　·　共 ${n} 關`,
    level: (n) => `第 ${n} 關`,
    tier: { 1: "易", 2: "中", 3: "難" },
    perfect: "完美",
    hint: "深色的圓是已知的落點，淺色的圓待你循序推敲。可輕點逐一相連，或按住指尖，一筆滑過。",
    backToLevels: "返回關卡選單",
    regenerate: "重新出題",
    nextStroke: (n) => `下一筆　${n}`,
    solved: "一筆連成",
    undo: "回退",
    hintBtn: "提示",
    steps: (n) => `${n} 步`,
    mistakes: (n) => `${n} 失誤`,
    mistakesLabel: (n) => (n === 0 ? "零失誤" : `${n} 次失誤`),
    bestRecord: (time, mistakes) => `最佳紀錄 ${time} · ${mistakes}`,
    playAgain: "再玩一次",
    nextLevel: "下一關",
    backToMenu: "返回選單",
    loading: "研墨中…",
  },
  en: {
    home: "Home",
    brandTag: "Number · Ink · Path",
    title: "One-Stroke Path",
    subtitle: (n) => `Trace every cell in order, in a single stroke　·　${n} levels`,
    level: (n) => `Level ${n}`,
    tier: { 1: "Easy", 2: "Medium", 3: "Hard" },
    perfect: "Perfect",
    hint: "The dark circles are known points, the light ones await your reasoning. Tap them one by one, or press and drag to trace the whole path in one stroke.",
    backToLevels: "Back to level menu",
    regenerate: "New puzzle",
    nextStroke: (n) => `Next stroke　${n}`,
    solved: "Solved in one stroke",
    undo: "Undo",
    hintBtn: "Hint",
    steps: (n) => `${n} moves`,
    mistakes: (n) => `${n} mistakes`,
    mistakesLabel: (n) => (n === 0 ? "No mistakes" : `${n} mistakes`),
    bestRecord: (time, mistakes) => `Best ${time} · ${mistakes}`,
    playAgain: "Play again",
    nextLevel: "Next level",
    backToMenu: "Back to menu",
    loading: "Grinding ink…",
  },
};

/* ---------------------------------------------------------
   一筆連 (One-Stroke / Ink Path)
   A Hidato-style number path puzzle: connect 1..N through
   adjacent cells (including diagonals). Some numbers are
   given as clues, the rest must be deduced. Tap to link, or
   press and drag to draw the whole trail in one stroke.
   Literary "ink on paper" (文青) visual direction.
--------------------------------------------------------- */

// Each level: { size, clues }. Bigger boards get more levels, and within
// one size the clue count drops step by step so the deduction gets harder.
// 28 levels total.
const LEVELS = [
  { size: 2, clues: 4 }, // 1  · 起手
  { size: 3, clues: 6 }, // 2
  { size: 3, clues: 4 }, // 3
  { size: 4, clues: 8 }, // 4
  { size: 4, clues: 6 }, // 5
  { size: 4, clues: 5 }, // 6
  { size: 5, clues: 10 }, // 7
  { size: 5, clues: 8 }, // 8
  { size: 5, clues: 6 }, // 9
  { size: 6, clues: 13 }, // 10
  { size: 6, clues: 10 }, // 11
  { size: 6, clues: 8 }, // 12
  { size: 6, clues: 6 }, // 13
  { size: 7, clues: 15 }, // 14
  { size: 7, clues: 12 }, // 15
  { size: 7, clues: 9 }, // 16
  { size: 7, clues: 7 }, // 17
  { size: 8, clues: 18 }, // 18
  { size: 8, clues: 14 }, // 19
  { size: 8, clues: 11 }, // 20
  { size: 8, clues: 9 }, // 21
  { size: 8, clues: 7 }, // 22
  { size: 9, clues: 20 }, // 23
  { size: 9, clues: 16 }, // 24
  { size: 9, clues: 13 }, // 25
  { size: 9, clues: 10 }, // 26
  { size: 9, clues: 8 }, // 27
  { size: 9, clues: 6 }, // 28 · 留白
];
const STORAGE_KEY = "numberlink_progress_v1";

// Difficulty tier (1 easy → 3 hard) from how sparse the clues are.
function difficultyTier(size, clues) {
  const ratio = clues / (size * size);
  if (ratio >= 0.5) return 1;
  if (ratio >= 0.28) return 2;
  return 3;
}


/* ---------- puzzle generation ---------- */

const DIRS_8 = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function generateHamiltonianPath(n, stepBudget = 20000) {
  const total = n * n;
  const visited = Array.from({ length: n }, () => Array(n).fill(false));
  const path = [];
  let steps = 0;

  function neighborsOf(r, c) {
    const dirs = DIRS_8;
    const res = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr,
        nc = c + dc;
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

    let nbrs = neighborsOf(r, c).map((p) => ({ p, deg: neighborsOf(p[0], p[1]).length }));
    for (let i = nbrs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nbrs[i], nbrs[j]] = [nbrs[j], nbrs[i]];
    }
    nbrs.sort((a, b) => a.deg - b.deg);

    for (const { p } of nbrs) {
      const result = dfs(p[0], p[1], depth + 1);
      if (result === "TIMEOUT") return "TIMEOUT";
      if (result) return true;
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  const sr = Math.floor(Math.random() * n);
  const sc = Math.floor(Math.random() * n);
  const result = dfs(sr, sc, 1);
  return result === true ? path : null;
}

function pickClueIndices(total, k) {
  const set = new Set([1, total]);
  const need = k - set.size;
  if (need > 0) {
    const step = (total - 1) / (need + 1);
    for (let i = 1; i <= need; i++) {
      let idx = Math.round(1 + step * i);
      if (idx <= 1) idx = 2;
      if (idx >= total) idx = total - 1;
      set.add(idx);
    }
  }
  let attempts = 0;
  while (set.size < k && attempts < 80 && total > 2) {
    const cand = 2 + Math.floor(Math.random() * Math.max(1, total - 2));
    set.add(cand);
    attempts++;
  }
  return set;
}

function buildPuzzle(n, clues) {
  let path = null;
  let tries = 0;
  while (!path && tries < 30) {
    path = generateHamiltonianPath(n);
    tries++;
  }
  if (!path) return null;
  const total = n * n;
  const k = Math.max(2, Math.min(total, clues || Math.round(total * 0.3) + 2));
  const clueIndices = pickClueIndices(total, k);
  const clueMap = {};
  clueIndices.forEach((idx) => {
    const [r, c] = path[idx - 1];
    clueMap[`${r}_${c}`] = idx;
  });
  return { n, total, path, clueMap };
}

/* ---------- formatting helpers ---------- */

function fmtTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ---------- main component ---------- */

export default function NumberLink({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [screen, setScreen] = useState("menu"); // 'menu' | 'game'
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [best, setBest] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [levelIndex, setLevelIndex] = useState(1);
  const [puzzle, setPuzzle] = useState(null);
  const [filledOrder, setFilledOrder] = useState([]); // array of [r,c], index0 -> number1
  const pathRef = useRef([]); // synchronous mirror of filledOrder for drag reads
  const [taps, setTaps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const wonRef = useRef(false);
  const [shakeKey, setShakeKey] = useState(null);
  const shakeTimeout = useRef(null);
  const timerRef = useRef(null);

  const filledSet = useMemo(() => {
    const s = new Set();
    filledOrder.forEach(([r, c]) => s.add(`${r}_${c}`));
    return s;
  }, [filledOrder]);

  const tapsRef = useRef(0);
  const mistakesRef = useRef(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    tapsRef.current = taps;
  }, [taps]);
  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const setPath = useCallback((next) => {
    pathRef.current = next;
    setFilledOrder(next);
  }, []);


  /* load progress */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.unlockedLevel) setUnlockedLevel(data.unlockedLevel);
        if (data.best) setBest(data.best);
      }
    } catch (e) {
      /* no saved progress yet */
    }
    setLoaded(true);
  }, []);

  const saveProgress = useCallback((nextUnlocked, nextBest) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ unlockedLevel: nextUnlocked, best: nextBest })
      );
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }, []);

  /* timer */
  useEffect(() => {
    if (screen === "game" && puzzle && !won) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
    return undefined;
  }, [screen, puzzle, won]);

  const startLevel = useCallback((lvl) => {
    const spec = LEVELS[lvl - 1];
    const p = buildPuzzle(spec.size, spec.clues);
    setLevelIndex(lvl);
    setPuzzle(p);
    pathRef.current = [];
    setFilledOrder([]);
    setTaps(0);
    setMistakes(0);
    setElapsed(0);
    wonRef.current = false;
    setWon(false);
    setScreen("game");
  }, []);

  const regenerate = useCallback(() => {
    startLevel(levelIndex);
  }, [levelIndex, startLevel]);

  const triggerShake = useCallback((key) => {
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    setShakeKey(key);
    shakeTimeout.current = setTimeout(() => setShakeKey(null), 380);
  }, []);

  const handleWin = useCallback(
    (finalTaps, finalMistakes, finalTime) => {
      wonRef.current = true;
      setWon(true);
      setBest((prevBest) => {
        const prev = prevBest[levelIndex];
        const candidate = { taps: finalTaps, mistakes: finalMistakes, time: finalTime };
        const better =
          !prev ||
          candidate.mistakes < prev.mistakes ||
          (candidate.mistakes === prev.mistakes && candidate.time < prev.time);
        const nextBest = better ? { ...prevBest, [levelIndex]: candidate } : prevBest;
        setUnlockedLevel((prevUnlocked) => {
          const nextUnlocked = Math.max(
            prevUnlocked,
            Math.min(LEVELS.length, levelIndex + 1)
          );
          saveProgress(nextUnlocked, nextBest);
          return nextUnlocked;
        });
        return nextBest;
      });
    },
    [levelIndex, saveProgress]
  );

  // Advance the path to (r,c) or retract; reads the synchronous pathRef so
  // rapid drag events never work off stale state.
  const advanceTo = useCallback(
    (r, c) => {
      if (!puzzle || wonRef.current) return;
      const order = pathRef.current;
      const key = `${r}_${c}`;

      if (order.length === 0) {
        if (puzzle.clueMap[key] === 1) {
          const next = [[r, c]];
          setPath(next);
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

      const adjacent =
        Math.max(Math.abs(hr - r), Math.abs(hc - c)) === 1;
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
        handleWin(tapsRef.current + 1, mistakesRef.current, elapsedRef.current);
      }
    },
    [puzzle, setPath, triggerShake, handleWin]
  );

  const handleUndo = useCallback(() => {
    if (wonRef.current) return;
    const order = pathRef.current;
    if (order.length === 0) return;
    setPath(order.slice(0, -1));
  }, [setPath]);

  const handleHint = useCallback(() => {
    if (!puzzle || wonRef.current) return;
    const nextNum = pathRef.current.length + 1;
    if (nextNum > puzzle.total) return;
    const [r, c] = puzzle.path[nextNum - 1];
    setMistakes((m) => m + 1);
    advanceTo(r, c);
  }, [puzzle, advanceTo]);

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
      const nr = hr + dr,
        nc = hc + dc;
      if (nr >= 0 && nr < puzzle.n && nc >= 0 && nc < puzzle.n) {
        const key = `${nr}_${nc}`;
        if (!filledSet.has(key)) s.add(key);
      }
    }
    return s;
  }, [puzzle, won, filledOrder, filledSet]);

  if (!loaded) {
    return (
      <div style={styles.rootLoading}>
        <div style={styles.loadingText}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={inkWashStyle} />
      <LangToggle />
      {screen === "menu" ? (
        <MenuScreen unlockedLevel={unlockedLevel} best={best} onStart={startLevel} onExit={onExit} t={t} />
      ) : (
        <GameScreen
          levelIndex={levelIndex}
          puzzle={puzzle}
          filledOrder={filledOrder}
          filledSet={filledSet}
          candidateSet={candidateSet}
          taps={taps}
          mistakes={mistakes}
          elapsed={elapsed}
          won={won}
          shakeKey={shakeKey}
          best={best[levelIndex]}
          onCellClick={advanceTo}
          onUndo={handleUndo}
          onHint={handleHint}
          onRegenerate={regenerate}
          onBack={() => setScreen("menu")}
          onNextLevel={() => startLevel(Math.min(LEVELS.length, levelIndex + 1))}
          onReplay={() => startLevel(levelIndex)}
          hasNextLevel={levelIndex < LEVELS.length}
          t={t}
        />
      )}
    </div>
  );
}

/* ---------- screens ---------- */

function MenuScreen({ unlockedLevel, best, onStart, onExit, t }) {
  return (
    <div style={styles.menuWrap}>
      {onExit && (
        <button onClick={onExit} style={homeBtnStyle} aria-label={t.home}>
          <Home size={15} color={COLORS.inkSoft} />
          <span>{t.home}</span>
        </button>
      )}
      <div style={brandRowStyle}>
        <Feather size={18} color={COLORS.vermillion} />
        <span style={eyebrowStyle}>{t.brandTag}</span>
      </div>
      <h1 style={styles.title}>{t.title}</h1>
      <p style={styles.subtitle}>{t.subtitle(LEVELS.length)}</p>

      <div style={styles.levelGrid}>
        {LEVELS.map((spec, i) => {
          const lvl = i + 1;
          const { size, clues } = spec;
          const locked = lvl > unlockedLevel;
          const record = best[lvl];
          const tier = difficultyTier(size, clues);
          return (
            <button
              key={lvl}
              onClick={() => !locked && onStart(lvl)}
              disabled={locked}
              style={{
                ...styles.levelCard,
                ...(locked ? styles.levelCardLocked : {}),
              }}
            >
              <div style={styles.levelCardTop}>
                <span style={styles.levelNum}>{String(lvl).padStart(2, "0")}</span>
                {locked ? (
                  <Lock size={15} color="#A99E88" />
                ) : record ? (
                  <Check size={15} color="#4C5B6E" />
                ) : null}
              </div>
              <div style={styles.levelSize}>{t.level(lvl)}</div>
              <div style={styles.levelMetaRow}>
                <span style={styles.tierDots}>
                  {[1, 2, 3].map((d) => (
                    <span
                      key={d}
                      style={{
                        ...styles.tierDot,
                        background: d <= tier ? "#8A6A3A" : "transparent",
                        border: `1px solid ${d <= tier ? "#8A6A3A" : "rgba(51,48,42,0.28)"}`,
                      }}
                    />
                  ))}
                </span>
                <span style={styles.tierLabel}>{t.tier[tier]}</span>
              </div>
              {record && (
                <div style={styles.levelRecord}>
                  {fmtTime(record.time)} · {record.mistakes === 0 ? t.perfect : t.mistakes(record.mistakes)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p style={styles.hint}>{t.hint}</p>
    </div>
  );
}

function GameScreen({
  levelIndex,
  puzzle,
  filledOrder,
  filledSet,
  candidateSet,
  taps,
  mistakes,
  elapsed,
  won,
  shakeKey,
  best,
  onCellClick,
  onUndo,
  onHint,
  onRegenerate,
  onBack,
  onNextLevel,
  onReplay,
  hasNextLevel,
  t,
}) {
  if (!puzzle) return null;
  const n = puzzle.n;
  const nextNum = filledOrder.length + 1;
  const numberAt = (r, c) => {
    const key = `${r}_${c}`;
    if (filledSet.has(key)) {
      const idx = filledOrder.findIndex(([fr, fc]) => fr === r && fc === c);
      return idx + 1;
    }
    if (puzzle.clueMap[key] !== undefined) return puzzle.clueMap[key];
    return null;
  };

  const cellSize = n <= 4 ? 62 : n <= 6 ? 50 : n <= 8 ? 40 : 34;
  const GAP = 5;
  const PAD = 12;
  const boardPx = PAD * 2 + n * cellSize + (n - 1) * GAP;
  const centerOf = (r, c) => ({
    x: PAD + c * (cellSize + GAP) + cellSize / 2,
    y: PAD + r * (cellSize + GAP) + cellSize / 2,
  });

  const boardRef = useRef(null);
  const lastKeyRef = useRef(null);
  const onCellClickRef = useRef(onCellClick);
  const wonRef = useRef(won);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);
  useEffect(() => {
    wonRef.current = won;
  }, [won]);

  const cellAtLocal = useCallback(
    (x, y) => {
      let col = Math.round((x - PAD - cellSize / 2) / (cellSize + GAP));
      let row = Math.round((y - PAD - cellSize / 2) / (cellSize + GAP));
      row = Math.max(0, Math.min(n - 1, row));
      col = Math.max(0, Math.min(n - 1, col));
      const center = centerOf(row, col);
      const dist = Math.hypot(x - center.x, y - center.y);
      return dist <= cellSize / 2 + 10 ? { row, col } : null;
    },
    [n, cellSize, GAP, PAD]
  );

  const localPoint = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (wonRef.current || !boardRef.current) return;
    const { x, y } = localPoint(e);
    const cell = cellAtLocal(x, y);
    if (!cell) return;
    lastKeyRef.current = `${cell.row}_${cell.col}`;
    setDragPos({ x, y });
    setDragging(true);
    onCellClickRef.current(cell.row, cell.col);
  };

  // Listen on window while dragging so movement is tracked even as the
  // finger/cursor passes over sibling circles, regardless of which
  // element the pointer happens to be over.
  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (e) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragPos({ x, y });
      const cell = cellAtLocal(x, y);
      if (cell) {
        const key = `${cell.row}_${cell.col}`;
        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key;
          onCellClickRef.current(cell.row, cell.col);
        }
      }
    };
    const onUp = () => {
      setDragging(false);
      setDragPos(null);
      lastKeyRef.current = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, cellAtLocal]);

  return (
    <div style={styles.gameWrap}>
      <div style={styles.gameHeader}>
        <button onClick={onBack} style={styles.iconBtn} aria-label={t.backToLevels}>
          <ArrowLeft size={18} color="#6B6456" />
        </button>
        <div style={styles.gameHeaderCenter}>
          <div style={styles.gameLevelLabel}>{t.level(levelIndex)}</div>
          <div style={styles.gameNext}>
            {won ? t.solved : t.nextStroke(nextNum)}
          </div>
        </div>
        <button onClick={onRegenerate} style={styles.iconBtn} aria-label={t.regenerate}>
          <RotateCcw size={16} color="#6B6456" />
        </button>
      </div>

      <div style={styles.statsRow}>
        <StatPill icon={<Timer size={13} color="#8C8271" />} label={fmtTime(elapsed)} />
        <StatPill label={t.steps(taps)} />
        <StatPill label={t.mistakes(mistakes)} warn={mistakes > 0} />
      </div>

      <div
        ref={boardRef}
        onPointerDown={handlePointerDown}
        style={{
          ...styles.board,
          width: boardPx,
          height: boardPx,
          gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <svg
          width={boardPx}
          height={boardPx}
          style={styles.lineLayer}
          viewBox={`0 0 ${boardPx} ${boardPx}`}
        >
          {filledOrder.slice(1).map(([r, c], i) => {
            const [pr, pc] = filledOrder[i];
            const a = centerOf(pr, pc);
            const b = centerOf(r, c);
            const t = puzzle.total > 1 ? (i + 0.5) / (puzzle.total - 1) : 0;
            const isLast = i === filledOrder.length - 2;
            return (
              <line
                key={`${pr}_${pc}-${r}_${c}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={inkTrailColor(t)}
                strokeWidth={Math.max(3, cellSize * 0.16)}
                strokeLinecap="round"
                opacity={isLast ? 1 : 0.85}
              />
            );
          })}

          {dragging && dragPos && filledOrder.length > 0 && !won && (() => {
            const [lr, lc] = filledOrder[filledOrder.length - 1];
            const a = centerOf(lr, lc);
            const t = puzzle.total > 1 ? (filledOrder.length - 0.5) / (puzzle.total - 1) : 0;
            return (
              <line
                x1={a.x}
                y1={a.y}
                x2={dragPos.x}
                y2={dragPos.y}
                stroke={inkTrailColor(t)}
                strokeWidth={Math.max(3, cellSize * 0.14)}
                strokeLinecap="round"
                strokeDasharray="1 7"
                opacity={0.6}
              />
            );
          })()}
        </svg>

        {Array.from({ length: n }).map((_, r) =>
          Array.from({ length: n }).map((__, c) => {
            const key = `${r}_${c}`;
            const num = numberAt(r, c);
            const isFilled = filledSet.has(key);
            const isClueOnly = !isFilled && puzzle.clueMap[key] !== undefined;
            const isCandidate = candidateSet.has(key);
            const isHead =
              isFilled && filledOrder.length > 0 &&
              filledOrder[filledOrder.length - 1][0] === r &&
              filledOrder[filledOrder.length - 1][1] === c;
            const isShaking = shakeKey === key;

            let bg = "#EBE3D0";
            let border = "1px solid rgba(51,48,42,0.16)";
            let color = "#B7AC96";
            let boxShadow = "none";
            let fontWeight = 500;

            if (isFilled) {
              const t = puzzle.total > 1 ? (num - 1) / (puzzle.total - 1) : 0;
              bg = inkTrailColor(t);
              border = "1px solid rgba(241,234,218,0.55)";
              color = "#F4EEDF";
              fontWeight = 600;
              boxShadow = isHead
                ? `0 0 0 3px rgba(162,60,46,0.85), 0 2px 8px rgba(51,48,42,0.25)`
                : `0 1px 4px rgba(51,48,42,0.18)`;
            } else if (isClueOnly) {
              bg = "#E7DBBF";
              border = "1.5px solid rgba(51,48,42,0.5)";
              color = "#33302A";
              fontWeight = 600;
            } else if (isCandidate) {
              bg = "rgba(110,142,134,0.12)";
              border = "1.5px dashed rgba(110,142,134,0.85)";
              color = "#4C5B4E";
            }

            return (
              <button
                key={key}
                onClick={(e) => {
                  if (e.detail === 0) onCellClick(r, c);
                }}
                className={isShaking ? "ink-shake" : isCandidate ? "ink-pulse" : ""}
                style={{
                  ...styles.cell,
                  width: cellSize,
                  height: cellSize,
                  fontSize: n >= 8 ? 13 : n >= 6 ? 15 : 18,
                  fontWeight,
                  background: bg,
                  border,
                  color,
                  boxShadow,
                  position: "relative",
                  zIndex: 1,
                  touchAction: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {num || ""}
              </button>
            );
          })
        )}
      </div>

      <div style={styles.controlsRow}>
        <button onClick={onUndo} style={styles.controlBtn} disabled={filledOrder.length === 0 || won}>
          <Undo2 size={16} />
          <span>{t.undo}</span>
        </button>
        <button onClick={onHint} style={styles.controlBtn} disabled={won}>
          <Lightbulb size={16} />
          <span>{t.hintBtn}</span>
        </button>
      </div>

      {won && (
        <div style={styles.winOverlay}>
          <div style={styles.winCard}>
            <Feather size={24} color="#A23C2E" />
            <div style={styles.winTitle}>{t.solved}</div>
            <div style={styles.winStats}>
              {fmtTime(elapsed)} · {t.steps(taps)} · {t.mistakesLabel(mistakes)}
            </div>
            {best && (
              <div style={styles.winBest}>
                {t.bestRecord(fmtTime(best.time), t.mistakesLabel(best.mistakes))}
              </div>
            )}
            <div style={styles.winActions}>
              <button onClick={onReplay} style={styles.winBtnGhost}>
                {t.playAgain}
              </button>
              {hasNextLevel ? (
                <button onClick={onNextLevel} style={styles.winBtnSolid}>
                  {t.nextLevel}
                </button>
              ) : (
                <button onClick={onBack} style={styles.winBtnSolid}>
                  {t.backToMenu}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, warn }) {
  return (
    <div style={{ ...styles.statPill, ...(warn ? { color: "#A23C2E", border: "1px solid rgba(162,60,46,0.4)" } : {}) }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* ---------- styles ---------- */

const styles = {
  root: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    background: "#E4DCC9",
    color: "#33302A",
    fontFamily: "'Noto Serif TC', 'EB Garamond', serif",
    overflowX: "hidden",
    overflowY: "auto",
    display: "flex",
    justifyContent: "center",
  },
  rootLoading: {
    minHeight: "100vh",
    background: "#E4DCC9",
    color: "#6B6456",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Noto Serif TC', serif",
  },
  loadingText: { fontSize: 15, letterSpacing: 4 },
  menuWrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 480,
    padding: "56px 22px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    animation: "ink-rise 0.7s ease both",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 46,
    fontWeight: 600,
    margin: "0 0 10px",
    letterSpacing: 8,
    color: "#33302A",
    textIndent: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B6456",
    margin: "0 0 38px",
    letterSpacing: 1,
    lineHeight: 1.6,
  },
  levelGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 14,
  },
  levelCard: {
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.14)",
    borderRadius: 4,
    padding: "18px 18px",
    textAlign: "left",
    cursor: "pointer",
    color: "#33302A",
    boxShadow: "0 1px 0 rgba(51,48,42,0.05)",
  },
  levelCardLocked: {
    opacity: 0.42,
    cursor: "not-allowed",
  },
  levelCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelNum: {
    fontFamily: "'EB Garamond', serif",
    fontSize: 14,
    letterSpacing: 2,
    color: "#A99E88",
  },
  levelSize: {
    fontFamily: "'Cormorant Garamond', 'Noto Serif TC', serif",
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: 1,
    color: "#33302A",
  },
  levelRecord: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#4C5B6E",
    fontFamily: "'Noto Serif TC', serif",
  },
  levelMetaRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  tierDots: {
    display: "inline-flex",
    gap: 4,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    border: "1px solid rgba(51,48,42,0.28)",
    display: "inline-block",
  },
  tierLabel: {
    fontSize: 12,
    color: "#8C8271",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
  },
  hint: {
    marginTop: 34,
    fontSize: 13,
    color: "#8C8271",
    lineHeight: 1.9,
    maxWidth: 320,
    letterSpacing: 0.5,
  },
  gameWrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 480,
    padding: "24px 16px 36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    animation: "ink-rise 0.5s ease both",
  },
  gameHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBtn: {
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.16)",
    borderRadius: 4,
    width: 38,
    height: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  gameHeaderCenter: { textAlign: "center" },
  gameLevelLabel: {
    fontFamily: "'EB Garamond', serif",
    fontSize: 12,
    color: "#A99E88",
    letterSpacing: 2,
  },
  gameNext: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 17,
    fontWeight: 600,
    marginTop: 3,
    letterSpacing: 3,
    color: "#A23C2E",
  },
  statsRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px solid rgba(51,48,42,0.16)",
    borderRadius: 999,
    padding: "5px 14px",
    fontSize: 13,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
    color: "#6B6456",
  },
  board: {
    position: "relative",
    boxSizing: "border-box",
    display: "grid",
    gap: 5,
    padding: 16,
    borderRadius: 6,
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.14)",
    boxShadow: "0 2px 24px rgba(51,48,42,0.10), inset 0 0 0 1px rgba(241,234,218,0.6)",
    marginBottom: 24,
  },
  lineLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  cell: {
    borderRadius: "50%",
    fontFamily: "'EB Garamond', 'Noto Serif TC', serif",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    padding: 0,
  },
  controlsRow: {
    display: "flex",
    gap: 12,
  },
  controlBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.16)",
    borderRadius: 4,
    padding: "11px 22px",
    color: "#33302A",
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  winOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(46,42,34,0.42)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: 20,
  },
  winCard: {
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.18)",
    borderRadius: 6,
    padding: "34px 30px",
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    boxShadow: "0 24px 60px rgba(46,42,34,0.28)",
  },
  winTitle: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: 6,
    margin: "12px 0 8px",
    color: "#A23C2E",
    textIndent: 6,
  },
  winStats: {
    fontSize: 14,
    color: "#6B6456",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
  },
  winBest: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#A99E88",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
  },
  winActions: {
    display: "flex",
    gap: 12,
    marginTop: 24,
  },
  winBtnGhost: {
    flex: 1,
    padding: "11px 0",
    borderRadius: 4,
    border: "1px solid rgba(51,48,42,0.22)",
    background: "transparent",
    color: "#33302A",
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  winBtnSolid: {
    flex: 1,
    padding: "11px 0",
    borderRadius: 4,
    border: "1px solid #A23C2E",
    background: "#A23C2E",
    color: "#F1EADA",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
};
