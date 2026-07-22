import { useState, useEffect, useCallback, useRef } from "react";
import { Undo2, Lightbulb, RotateCcw, ArrowLeft, Timer, Feather } from "lucide-react";
import { inkWashStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";
import Board from "./numberlink/Board.jsx";
import { useGameSession } from "./numberlink/useGameSession.js";
import { fmtTime } from "../engine/share.mjs";
import { getTutorialVariant } from "../tutorialVariant.js";
import { track } from "../analytics.js";
import { recordLevelCompletion } from "../pwaInstall.js";

const TEXT = {
  zh: {
    level: (n) => `第 ${n} 關`,
    perfect: "完美",
    backToLevels: "返回主畫面",
    regenerate: "重新出題",
    nextStroke: (n) => `下一筆　${n}`,
    solved: "一筆連成",
    undo: "回退",
    hintBtn: "提示",
    steps: (n) => `${n} 步`,
    mistakes: (n) => `${n} 失誤`,
    mistakesLabel: (n) => (n === 0 ? "零失誤" : `${n} 次失誤`),
    bestRecord: (time, mistakes) => `最佳紀錄 ${time} · ${mistakes}`,
    hintStuck: "目前走法已經無法完成，試試回退或重來一次",
    playAgain: "再玩一次",
    nextLevel: "下一關",
    backToMenu: "返回主畫面",
    loading: "研墨中…",
    abHints: { 2: "斜角也能走", 5: "按住可一筆滑過", 7: "卡住了？試試回退或提示" },
  },
  en: {
    level: (n) => `Level ${n}`,
    perfect: "Perfect",
    backToLevels: "Back to Home",
    regenerate: "New puzzle",
    nextStroke: (n) => `Next stroke　${n}`,
    solved: "Solved in one stroke",
    undo: "Undo",
    hintBtn: "Hint",
    steps: (n) => `${n} moves`,
    mistakes: (n) => `${n} mistakes`,
    mistakesLabel: (n) => (n === 0 ? "No mistakes" : `${n} mistakes`),
    bestRecord: (time, mistakes) => `Best ${time} · ${mistakes}`,
    hintStuck: "This path can't be completed anymore — try undo or retry",
    playAgain: "Play again",
    nextLevel: "Next level",
    backToMenu: "Back to Home",
    loading: "Grinding ink…",
    abHints: { 2: "Diagonal moves work too", 5: "Press and hold to trace in one stroke", 7: "Stuck? Try undo or hint" },
  },
};

/* ---------------------------------------------------------
   一筆連 (One-Stroke / Ink Path)
   A Hidato-style number path puzzle: connect 1..N through
   adjacent cells (including diagonals). Some numbers are
   given as clues, the rest must be deduced. Tap to link, or
   press and drag to draw the whole trail in one stroke.
   Literary "ink on paper" (文青) visual direction.

   Levels 1-10 are the guided tutorial (F4): level 1 is
   trivial, levels 2-3 force a diagonal step in the solution,
   levels 4-6 taper off clues on a 4x4 board, and undo/hint
   stay hidden until level 7 so early levels are pure
   deduction practice.
--------------------------------------------------------- */

// Each level: { size, clues }. Bigger boards get more levels, and within
// one size the clue count drops step by step so the deduction gets harder.
// 28 levels total.
const LEVELS = [
  { size: 2, clues: 4 }, // 1  · 起手
  { size: 3, clues: 6 }, // 2  · 斜角必經
  { size: 3, clues: 4 }, // 3  · 斜角必經
  { size: 4, clues: 8 }, // 4
  { size: 4, clues: 6 }, // 5
  { size: 4, clues: 5 }, // 6
  { size: 5, clues: 10 }, // 7  · undo/hint 起解禁
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
// Exposed so Home.jsx's F7 level-progress grid can mirror the same total
// and progress data without duplicating the LEVELS table.
export const LEVEL_COUNT = LEVELS.length;
export const NUMBERLINK_STORAGE_KEY = STORAGE_KEY;
const CONTROLS_UNLOCK_LEVEL = 7;
const DIAGONAL_FORCED_LEVELS = new Set([2, 3]);

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

// True once the solution requires at least one diagonal step, so a player
// can't clear the level with only orthogonal reasoning.
function hasDiagonalStep(path) {
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1];
    const [r, c] = path[i];
    if (Math.abs(r - pr) === 1 && Math.abs(c - pc) === 1) return true;
  }
  return false;
}

function buildPuzzle(n, clues, { requireDiagonal = false } = {}) {
  let path = null;
  let tries = 0;
  const maxTries = requireDiagonal ? 60 : 30;
  while (tries < maxTries) {
    const candidate = generateHamiltonianPath(n);
    tries++;
    if (candidate && (!requireDiagonal || hasDiagonalStep(candidate))) {
      path = candidate;
      break;
    }
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

/* ---------- main component ---------- */

export default function NumberLink({ onExit, initialLevel = null }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [best, setBest] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [levelIndex, setLevelIndex] = useState(1);
  const variant = getTutorialVariant();

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlockedLevel: nextUnlocked, best: nextBest }));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }, []);

  const handleWin = useCallback(
    ({ mistakes: finalMistakes, timeSec: finalTime }) => {
      track("tutorial_level_complete", { level: levelIndex, time_sec: finalTime, mistakes: finalMistakes });
      if (levelIndex === LEVELS.length) track("tutorial_complete", {});
      recordLevelCompletion();
      setBest((prevBest) => {
        const prev = prevBest[levelIndex];
        const candidate = { mistakes: finalMistakes, time: finalTime };
        const better =
          !prev || candidate.mistakes < prev.mistakes || (candidate.mistakes === prev.mistakes && candidate.time < prev.time);
        const nextBest = better ? { ...prevBest, [levelIndex]: candidate } : prevBest;
        setUnlockedLevel((prevUnlocked) => {
          const nextUnlocked = Math.max(prevUnlocked, Math.min(LEVELS.length, levelIndex + 1));
          saveProgress(nextUnlocked, nextBest);
          return nextUnlocked;
        });
        return nextBest;
      });
    },
    [levelIndex, saveProgress]
  );

  const session = useGameSession({
    onWin: handleWin,
    onHintUsed: (info) => track("hint_used", { context: "tutorial", salvageable: info?.salvageable }),
    onUndoUsed: () => track("undo_used", { context: "tutorial" }),
  });

  const startLevel = useCallback(
    (lvl) => {
      const spec = LEVELS[lvl - 1];
      const p = buildPuzzle(spec.size, spec.clues, { requireDiagonal: DIAGONAL_FORCED_LEVELS.has(lvl) });
      setLevelIndex(lvl);
      session.start(p);
      track("tutorial_level_start", { level: lvl });
    },
    [session.start]
  );

  // NumberLink no longer has its own level-select screen — Home's level grid
  // is the sole entry point and always deep-links a specific level. Start it
  // once per navigation; if it's missing, out of range, or still locked,
  // there's nothing to show here, so bounce back to Home instead.
  const autoStartedLevelRef = useRef();
  useEffect(() => {
    if (!loaded) return;
    if (autoStartedLevelRef.current === initialLevel) return;
    autoStartedLevelRef.current = initialLevel;
    if (initialLevel != null && initialLevel >= 1 && initialLevel <= LEVELS.length && initialLevel <= unlockedLevel) {
      startLevel(initialLevel);
    } else {
      onExit && onExit();
    }
  }, [initialLevel, loaded, unlockedLevel, startLevel, onExit]);

  const regenerate = useCallback(() => {
    startLevel(levelIndex);
  }, [levelIndex, startLevel]);

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
      <GameScreen
        levelIndex={levelIndex}
        session={session}
        best={best[levelIndex]}
        variant={variant}
        onRegenerate={regenerate}
        onBack={onExit}
        onNextLevel={() => startLevel(Math.min(LEVELS.length, levelIndex + 1))}
        onReplay={session.restart}
        hasNextLevel={levelIndex < LEVELS.length}
        t={t}
      />
    </div>
  );
}

/* ---------- screens ---------- */

function GameScreen({ levelIndex, session, best, variant, onRegenerate, onBack, onNextLevel, onReplay, hasNextLevel, t }) {
  const {
    puzzle, filledOrder, filledSet, candidateSet, taps, mistakes, elapsed, won,
    shakeKey, hintCell, hintStuck, advanceTo, undo, hint,
  } = session;
  if (!puzzle) return null;
  const nextNum = filledOrder.length + 1;
  const showControls = levelIndex >= CONTROLS_UNLOCK_LEVEL;
  const abHint = variant === "B" ? t.abHints[levelIndex] : null;

  return (
    <div style={styles.gameWrap}>
      <div style={styles.gameHeader}>
        <button onClick={onBack} style={styles.iconBtn} aria-label={t.backToLevels}>
          <ArrowLeft size={18} color="#5A564C" />
        </button>
        <div style={styles.gameHeaderCenter}>
          <div style={styles.gameLevelLabel}>{t.level(levelIndex)}</div>
          <div style={styles.gameNext}>{won ? t.solved : t.nextStroke(nextNum)}</div>
        </div>
        <button onClick={onRegenerate} style={styles.iconBtn} aria-label={t.regenerate}>
          <RotateCcw size={16} color="#5A564C" />
        </button>
      </div>

      <div style={styles.statsRow}>
        <StatPill icon={<Timer size={13} color="#8B8478" />} label={fmtTime(elapsed)} />
        <StatPill label={t.steps(taps)} />
        <StatPill label={t.mistakes(mistakes)} warn={mistakes > 0} />
      </div>

      {abHint && <div style={styles.abHint}>{abHint}</div>}
      {hintStuck && <div style={styles.hintStuckBanner}>{t.hintStuck}</div>}

      <Board
        puzzle={puzzle}
        filledOrder={filledOrder}
        filledSet={filledSet}
        candidateSet={candidateSet}
        won={won}
        shakeKey={shakeKey}
        hintCell={hintCell}
        onCellClick={advanceTo}
      />

      {showControls && (
        <div style={styles.controlsRow}>
          <button onClick={undo} style={styles.controlBtn} disabled={filledOrder.length === 0 || won}>
            <Undo2 size={16} />
            <span>{t.undo}</span>
          </button>
          <button onClick={hint} style={styles.controlBtn} disabled={won}>
            <Lightbulb size={16} />
            <span>{t.hintBtn}</span>
          </button>
        </div>
      )}

      {won && (
        <div style={styles.winOverlay}>
          <div style={styles.winCard}>
            <Feather size={24} color="#B23A2E" />
            <div style={styles.winTitle}>{t.solved}</div>
            <div style={styles.winStats}>
              {fmtTime(elapsed)} · {t.steps(taps)} · {t.mistakesLabel(mistakes)}
            </div>
            {best && (
              <div style={styles.winBest}>{t.bestRecord(fmtTime(best.time), t.mistakesLabel(best.mistakes))}</div>
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
    <div style={{ ...styles.statPill, ...(warn ? { color: "#B23A2E", border: "1px solid rgba(178,58,46,0.4)" } : {}) }}>
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
    background: "#F3EEE1",
    color: "#2B2A28",
    fontFamily: "'Noto Serif TC', 'EB Garamond', serif",
    overflowX: "hidden",
    overflowY: "auto",
    display: "flex",
    justifyContent: "center",
  },
  rootLoading: {
    minHeight: "100vh",
    background: "#F3EEE1",
    color: "#5A564C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Noto Serif TC', serif",
  },
  loadingText: { fontSize: 15, letterSpacing: 4 },
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
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
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
    color: "#8B8478",
    letterSpacing: 2,
  },
  gameNext: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 17,
    fontWeight: 600,
    marginTop: 3,
    letterSpacing: 3,
    color: "#B23A2E",
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
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 999,
    padding: "5px 14px",
    fontSize: 13,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
    color: "#5A564C",
  },
  hintStuckBanner: {
    marginTop: -10,
    marginBottom: 16,
    padding: "8px 14px",
    borderRadius: 4,
    background: "rgba(178,58,46,0.08)",
    border: "1px solid rgba(178,58,46,0.3)",
    fontSize: 12.5,
    color: "#B23A2E",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  abHint: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 12.5,
    color: "#B8925A",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  controlsRow: {
    display: "flex",
    gap: 12,
  },
  controlBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 4,
    padding: "11px 22px",
    color: "#2B2A28",
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  winOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(43,42,40,0.42)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: 20,
  },
  winCard: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.18)",
    borderRadius: 6,
    padding: "34px 30px",
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    boxShadow: "0 24px 60px rgba(43,42,40,0.28)",
  },
  winTitle: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: 6,
    margin: "12px 0 8px",
    color: "#B23A2E",
    textIndent: 6,
  },
  winStats: {
    fontSize: 14,
    color: "#5A564C",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
  },
  winBest: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#8B8478",
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
    border: "1px solid rgba(43,42,40,0.22)",
    background: "transparent",
    color: "#2B2A28",
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  winBtnSolid: {
    flex: 1,
    padding: "11px 0",
    borderRadius: 4,
    border: "1px solid #B23A2E",
    background: "#B23A2E",
    color: "#EAE2CF",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
};
