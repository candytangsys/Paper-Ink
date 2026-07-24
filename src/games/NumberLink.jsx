import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Timer, Feather, Share2 } from "lucide-react";
import { inkWashStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";
import PlayArea from "./numberlink/PlayArea.jsx";
import OnboardingIntro from "./numberlink/OnboardingIntro.jsx";
import { useGameSession } from "./numberlink/useGameSession.js";
import ScoreBreakdown from "./numberlink/ScoreBreakdown.jsx";
import { shareLevel } from "./numberlink/levelShareFlow.js";
import { fmtTime } from "../engine/share.mjs";
import { generateHamiltonianPath, pickClueIndices, hasDiagonalStep } from "../engine/hamiltonian.mjs";
import { CHAPTERS, DIAGONAL_FORCED_SIZES, clueRatioForClear, nextChapterSize } from "../engine/chapters.mjs";
import { parTimeSec, computeScore } from "../engine/score.mjs";
import { getChapterEntry, isChapterUnlocked, recordChapterClear, willHitMilestoneOnNextClear } from "../chapterProgress.js";
import { recordLevelHistoryEntry } from "../levelHistory.js";
import { maybeShowInterstitial } from "../interstitialAd.js";
import { track } from "../analytics.js";
import { recordLevelCompletion } from "../pwaInstall.js";
import { addPoints } from "../pointsWallet.js";
import { hasSeenIntro, markIntroSeen } from "../tutorialIntro.js";

const TEXT = {
  zh: {
    level: (n) => `第 ${n} 關`,
    chapterLabel: (size) => `${size} × ${size} 章節`,
    perfect: "完美",
    backToLevels: "返回主畫面",
    nextStroke: (n) => `下一筆　${n}`,
    solved: "一筆連成",
    steps: (n) => `${n} 步`,
    mistakes: (n) => `${n} 失誤`,
    mistakesLabel: (n) => (n === 0 ? "零失誤" : `${n} 次失誤`),
    bestScore: (score) => `本章節最佳 ${score} 分`,
    playAgain: "再玩一次",
    nextLevel: "下一關",
    loading: "研墨中…",
    unlocked: (size) => `🎉 解鎖新章節：${size} × ${size}`,
    scoreBase: "完成",
    scoreTime: "速度",
    scoreAccuracy: "準確度",
    scoreNoHint: "無提示",
    scoreMilestone: "里程碑",
    scoreTotal: "本關積分",
    scoreBalance: (gain, balance) => `本關 +${gain} 分，目前總分 ${balance}`,
    share: "分享成績",
    shared: "已複製到剪貼簿",
  },
  en: {
    level: (n) => `Level ${n}`,
    chapterLabel: (size) => `${size} × ${size} Chapter`,
    perfect: "Perfect",
    backToLevels: "Back to Home",
    nextStroke: (n) => `Next stroke　${n}`,
    solved: "Solved in one stroke",
    steps: (n) => `${n} moves`,
    mistakes: (n) => `${n} mistakes`,
    mistakesLabel: (n) => (n === 0 ? "No mistakes" : `${n} mistakes`),
    bestScore: (score) => `Chapter best ${score} pts`,
    playAgain: "Play again",
    nextLevel: "Next level",
    loading: "Grinding ink…",
    unlocked: (size) => `🎉 New chapter unlocked: ${size} × ${size}`,
    scoreBase: "Complete",
    scoreTime: "Speed",
    scoreAccuracy: "Accuracy",
    scoreNoHint: "No hint",
    scoreMilestone: "Milestone",
    scoreTotal: "Score",
    scoreBalance: (gain, balance) => `+${gain} this level, ${balance} total`,
    share: "Share result",
    shared: "Copied to clipboard",
  },
};

/* ---------------------------------------------------------
   一筆連 (One-Stroke / Ink Path)
   A Hidato-style number path puzzle: connect 1..N through
   adjacent cells (including diagonals). Some numbers are
   given as clues, the rest must be deduced. Tap to link, or
   press and drag to draw the whole trail in one stroke.
   Literary "ink on paper" (文青) visual direction.

   v3.1: regular levels are grouped into size-based chapters
   (大關卡) with infinite randomly-generated small levels
   (小關卡) inside each — there's no fixed level count anymore.
   Clue density decreases with each chapter clear (see
   engine/chapters.mjs) until a floor is reached at
   CHAPTER_MILESTONE clears, which is also when the next
   chapter unlocks. "第幾關" is just a clear-count display,
   not a stable level identity.

   v3.2: play surface (board + tools + undo/retry) is now the
   shared PlayArea component, unified with Daily.jsx. The old
   per-level A/B text-hint experiment is retired in favor of a
   one-time OnboardingIntro walkthrough (src/tutorialIntro.js).
--------------------------------------------------------- */

function buildPuzzle(n, clues, { requireDiagonal = false } = {}) {
  let path = null;
  let tries = 0;
  const maxTries = requireDiagonal ? 60 : 30;
  while (tries < maxTries) {
    const candidate = generateHamiltonianPath(n, Math.random, 20000);
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

export default function NumberLink({ onExit, initialSize = null }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [loaded, setLoaded] = useState(false);
  const [chapterSize, setChapterSize] = useState(null);
  const [chapterClearCount, setChapterClearCount] = useState(0);
  const [bestScore, setBestScore] = useState(null);
  const [lastScore, setLastScore] = useState(null);
  const [pointsBalance, setPointsBalance] = useState(null);
  const [justUnlocked, setJustUnlocked] = useState(null);
  // Bug fix: this used to show once ever regardless of chapter, which meant
  // an experienced player deep-linking into a large chapter on a device/
  // browser that never happened to set the "seen" flag would get the
  // "tap 1 to start" walkthrough on an 8×8 board. Scope it to the smallest
  // chapter's first few clears instead — that's the only place it's ever
  // actually relevant, and it still only shows once (via markIntroSeen()).
  const [introDismissed, setIntroDismissed] = useState(() => hasSeenIntro());

  // Metadata about the puzzle currently in play, needed at win time to
  // compute par time (par depends on the clue ratio actually used).
  const puzzleMetaRef = useRef({ size: null, clueRatio: null });

  const startChapterLevel = useCallback((size) => {
    const { chapterClearCount: clearCount, bestScore: best } = getChapterEntry(size);
    const ratio = clueRatioForClear(size, clearCount);
    const total = size * size;
    const clues = Math.max(2, Math.round(total * ratio));
    const requireDiagonal = DIAGONAL_FORCED_SIZES.has(size);
    const p = buildPuzzle(size, clues, { requireDiagonal });
    puzzleMetaRef.current = { size, clueRatio: clues / total };
    setChapterSize(size);
    setChapterClearCount(clearCount);
    setBestScore(best);
    setLastScore(null);
    setJustUnlocked(null);
    session.start(p);
    track("tutorial_level_start", { size, clear_count: clearCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWin = useCallback(({ mistakes: finalMistakes, timeSec: finalTime, usedTool }) => {
    const { size, clueRatio } = puzzleMetaRef.current;
    const par = parTimeSec(size, clueRatio);
    const justHitMilestone = willHitMilestoneOnNextClear(size);
    const score = computeScore({
      timeSec: finalTime, parTimeSec: par, mistakes: finalMistakes, usedTool, justHitMilestone,
    });
    const { chapterClearCount: newCount, justHitMilestone: confirmedMilestone } = recordChapterClear(size, score.total);
    recordLevelHistoryEntry({
      size,
      chapterClearIndex: newCount,
      timeSec: finalTime,
      mistakes: finalMistakes,
      score: score.total,
      perfect: finalMistakes === 0,
      completedAt: Date.now(),
    });
    track("tutorial_level_complete", {
      size, clear_count: newCount, time_sec: finalTime, mistakes: finalMistakes, score: score.total,
    });
    // Interstitial mount point (RD 指令 v1.0 §三之2): every small-level
    // clear is a candidate opportunity, including chapter-transition
    // clears — maybeShowInterstitial's own frequency cap decides whether
    // this particular one actually fires.
    maybeShowInterstitial({
      trigger: confirmedMilestone ? "chapter_transition" : "level_complete",
      size,
      clearCount: newCount,
    });
    recordLevelCompletion();
    setChapterClearCount(newCount);
    setLastScore(score);
    setPointsBalance(addPoints(score.total));
    setBestScore((prev) => (prev == null ? score.total : Math.max(prev, score.total)));
    const next = confirmedMilestone ? nextChapterSize(size) : null;
    setJustUnlocked(next);
  }, []);

  const session = useGameSession({
    onWin: handleWin,
    onUndoUsed: () => track("undo_used", { context: "tutorial" }),
  });

  // NumberLink no longer has its own chapter-select screen — Home's chapter
  // list is the sole entry point and always deep-links a specific chapter
  // (board size). Start it once per navigation; if it's missing, not a
  // known chapter size, or still locked, there's nothing to show here, so
  // bounce back to Home instead.
  const autoStartedSizeRef = useRef();
  useEffect(() => {
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (autoStartedSizeRef.current === initialSize) return;
    autoStartedSizeRef.current = initialSize;
    if (initialSize != null && CHAPTERS.includes(initialSize) && isChapterUnlocked(initialSize)) {
      startChapterLevel(initialSize);
    } else {
      onExit && onExit();
    }
  }, [initialSize, loaded, startChapterLevel, onExit]);

  const dismissIntro = useCallback(() => {
    markIntroSeen();
    setIntroDismissed(true);
  }, []);
  const showIntro = !introDismissed && chapterSize === CHAPTERS[0] && chapterClearCount < 3;

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
        chapterSize={chapterSize}
        chapterClearCount={chapterClearCount}
        bestScore={bestScore}
        lastScore={lastScore}
        pointsBalance={pointsBalance}
        justUnlocked={justUnlocked}
        session={session}
        onBack={onExit}
        onNextLevel={() => startChapterLevel(chapterSize)}
        onReplay={session.restart}
        t={t}
        lang={lang}
      />
      {showIntro && <OnboardingIntro onDismiss={dismissIntro} />}
    </div>
  );
}

/* ---------- screens ---------- */

function GameScreen({
  chapterSize, chapterClearCount, bestScore, lastScore, pointsBalance, justUnlocked,
  session, onBack, onNextLevel, onReplay, t, lang,
}) {
  const { puzzle, taps, mistakes, elapsed, won } = session;
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const handleShare = useCallback(async () => {
    const result = await shareLevel({
      size: chapterSize, level: chapterClearCount + 1, timeSec: elapsed, perfect: mistakes === 0, lang,
    });
    if (result.method === "clipboard") {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      setToast(t.shared);
      toastTimeout.current = setTimeout(() => setToast(null), 2600);
    }
  }, [chapterSize, chapterClearCount, elapsed, mistakes, lang, t.shared]);

  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
  }, []);

  if (!puzzle) return null;
  const nextNum = session.filledOrder.length + 1;
  // Bug fix: every chapter now shows the full control surface (rails +
  // bottom row). This used to be gated off for the smallest chapters
  // (CONTROLS_HIDDEN_SIZES, a "learn bare mechanics first" holdover from
  // before the onboarding walkthrough existed) — but the walkthrough now
  // teaches 回退/重來/the tool rail up front, on exactly the chapter that
  // was hiding them, which just left those buttons missing where the
  // tutorial had just told the player to expect them.
  const displayLevel = chapterClearCount + 1;

  return (
    <div style={styles.gameWrap}>
      <div style={styles.gameHeader}>
        <button onClick={onBack} style={styles.iconBtn} aria-label={t.backToLevels}>
          <ArrowLeft size={18} color="#5A564C" />
        </button>
        <div style={styles.gameHeaderCenter}>
          <div style={styles.gameLevelLabel}>{t.chapterLabel(chapterSize)} · {t.level(displayLevel)}</div>
          <div style={styles.gameNext}>{won ? t.solved : t.nextStroke(nextNum)}</div>
        </div>
        <div style={styles.iconBtnSpacer} />
      </div>

      <div style={styles.statsRow}>
        <StatPill icon={<Timer size={13} color="#8B8478" />} label={fmtTime(elapsed)} />
        <StatPill label={t.steps(taps)} />
        <StatPill label={t.mistakes(mistakes)} warn={mistakes > 0} />
      </div>

      <PlayArea session={session} toolContext="tutorial" />

      {won && (
        <div style={styles.winOverlay}>
          <div style={styles.winCard}>
            <Feather size={24} color="#B23A2E" />
            <div style={styles.winTitle}>{t.solved}</div>
            <div style={styles.winStats}>
              {fmtTime(elapsed)} · {t.steps(taps)} · {t.mistakesLabel(mistakes)}
            </div>
            <ScoreBreakdown
              score={lastScore}
              pointsBalance={pointsBalance}
              compact
              labels={{
                base: t.scoreBase, time: t.scoreTime, accuracy: t.scoreAccuracy,
                noHint: t.scoreNoHint, milestone: t.scoreMilestone, total: t.scoreTotal,
                balance: t.scoreBalance,
              }}
            />
            {bestScore != null && <div style={styles.winBest}>{t.bestScore(bestScore)}</div>}
            {justUnlocked != null && <div style={styles.unlockBanner}>{t.unlocked(justUnlocked)}</div>}
            <div style={styles.winActions}>
              <button onClick={onReplay} style={styles.winBtnGhost}>
                {t.playAgain}
              </button>
              <button onClick={onNextLevel} style={styles.winBtnSolid}>
                {t.nextLevel}
              </button>
            </div>
            <button onClick={handleShare} style={styles.shareLink}>
              <Share2 size={12} />
              <span>{t.share}</span>
            </button>
          </div>
        </div>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
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
    maxWidth: 560,
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
  iconBtnSpacer: { width: 38, height: 38 },
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
  unlockBanner: {
    marginTop: 12,
    fontSize: 13,
    color: "#6E8E86",
    fontFamily: "'Noto Serif TC', serif",
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
  // Small, secondary — share is a promo nudge here, not the main action
  // (that's playAgain/nextLevel above it).
  shareLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    margin: "14px auto 0",
    padding: "5px 10px",
    background: "transparent",
    border: "none",
    color: "#8B8478",
    fontSize: 11.5,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#2B2A28",
    color: "#EAE2CF",
    padding: "10px 20px",
    borderRadius: 999,
    fontSize: 13,
    letterSpacing: 1,
    zIndex: 20,
  },
};
