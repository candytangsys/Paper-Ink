import { useState, useEffect, useCallback } from "react";
import { Undo2, Lightbulb, RotateCcw, ArrowLeft, Lock, Check, Timer, Feather, Home } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
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
    abHints: { 2: "斜角也能走", 5: "按住可一筆滑過", 7: "卡住了？試試回退或提示" },
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

export default function NumberLink({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [screen, setScreen] = useState("menu"); // 'menu' | 'game'
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
    onHintUsed: () => track("hint_used", { context: "tutorial" }),
    onUndoUsed: () => track("undo_used", { context: "tutorial" }),
  });

  const startLevel = useCallback(
    (lvl) => {
      const spec = LEVELS[lvl - 1];
      const p = buildPuzzle(spec.size, spec.clues, { requireDiagonal: DIAGONAL_FORCED_LEVELS.has(lvl) });
      setLevelIndex(lvl);
      session.start(p);
      setScreen("game");
      track("tutorial_level_start", { level: lvl });
    },
    [session]
  );

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
      {screen === "menu" ? (
        <MenuScreen unlockedLevel={unlockedLevel} best={best} onStart={startLevel} onExit={onExit} t={t} />
      ) : (
        <GameScreen
          levelIndex={levelIndex}
          session={session}
          best={best[levelIndex]}
          variant={variant}
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

function GameScreen({ levelIndex, session, best, variant, onRegenerate, onBack, onNextLevel, onReplay, hasNextLevel, t }) {
  const { puzzle, filledOrder, filledSet, candidateSet, taps, mistakes, elapsed, won, shakeKey, advanceTo, undo, hint } = session;
  if (!puzzle) return null;
  const nextNum = filledOrder.length + 1;
  const showControls = levelIndex >= CONTROLS_UNLOCK_LEVEL;
  const abHint = variant === "B" ? t.abHints[levelIndex] : null;

  return (
    <div style={styles.gameWrap}>
      <div style={styles.gameHeader}>
        <button onClick={onBack} style={styles.iconBtn} aria-label={t.backToLevels}>
          <ArrowLeft size={18} color="#6B6456" />
        </button>
        <div style={styles.gameHeaderCenter}>
          <div style={styles.gameLevelLabel}>{t.level(levelIndex)}</div>
          <div style={styles.gameNext}>{won ? t.solved : t.nextStroke(nextNum)}</div>
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

      {abHint && <div style={styles.abHint}>{abHint}</div>}

      <Board
        puzzle={puzzle}
        filledOrder={filledOrder}
        filledSet={filledSet}
        candidateSet={candidateSet}
        won={won}
        shakeKey={shakeKey}
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
            <Feather size={24} color="#A23C2E" />
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
  abHint: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 12.5,
    color: "#8A6A3A",
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
