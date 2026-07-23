import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Timer, Feather, Home, Share2, Flame, RotateCcw } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";
import PlayArea from "./numberlink/PlayArea.jsx";
import { useGameSession } from "./numberlink/useGameSession.js";
import { buildDailyPuzzle } from "../engine/daily.mjs";
import { fmtTime, buildDailyAnalyticsParams } from "../engine/share.mjs";
import { createStreakStore } from "../engine/streak.mjs";
import { getDailyEntry, recordDailyCompletion } from "../dailyHistory.js";
import { getRestartCount, recordDailyRestart, DAILY_RESTART_LIMIT } from "../dailyRestarts.js";
import { todayUTCString } from "../dateUtil.js";
import { shareDaily } from "../daily/shareFlow.js";
import { trackShareConversion } from "../daily/attribution.js";
import { track } from "../analytics.js";
import { recordLevelCompletion } from "../pwaInstall.js";
import { addPoints } from "../pointsWallet.js";
import { dailyPointsReward } from "../engine/dailyReward.mjs";

const TEXT = {
  zh: {
    home: "主畫面",
    brandTag: "Daily · Ink · Path",
    dailyTitle: "每日挑戰",
    loading: "研墨中…",
    reviewBanner: "僅供回顧・不列入連續紀錄",
    nextStroke: (n) => `下一筆　${n}`,
    solved: "一筆連成",
    steps: (n) => `${n} 步`,
    mistakes: (n) => `${n} 失誤`,
    mistakesLabel: (n) => (n === 0 ? "零失誤" : `${n} 次失誤`),
    perfectBadge: "🖋 完美",
    streakLabel: (n) => `🔥 連續 ${n} 天`,
    replay: "再玩一次",
    share: "分享成績",
    shared: "已複製到剪貼簿",
    alreadyDoneTitle: "今日已完成",
    alreadyDoneTitlePast: "此日已完成",
    milestone: (n) => `🎉 達成 ${n} 天里程碑！`,
    rescueBanner: "昨天斷了嗎？本月還有一次「救回」機會。",
    rescueBtn: "救回昨天",
    rescueConfirm: "觀看一段小短片以救回昨天的連續紀錄？（P0 暫以此對話框代替廣告）",
    rescueSuccess: "已救回！請完成今日題延續紀錄。",
    rescueFailed: "這次無法救回。",
    scoreTotal: "積分",
    scoreBalance: (gain, balance) => `本關 +${gain} 分，目前總分 ${balance}`,
    restartLimitReached: "今日重來次數已用完，請完成目前進度",
  },
  en: {
    home: "Home",
    brandTag: "Daily · Ink · Path",
    dailyTitle: "Daily Challenge",
    loading: "Grinding ink…",
    reviewBanner: "Archive only · doesn't count toward your streak",
    nextStroke: (n) => `Next stroke　${n}`,
    solved: "Solved in one stroke",
    steps: (n) => `${n} moves`,
    mistakes: (n) => `${n} mistakes`,
    mistakesLabel: (n) => (n === 0 ? "No mistakes" : `${n} mistakes`),
    perfectBadge: "🖋 Perfect",
    streakLabel: (n) => `🔥 ${n}-day streak`,
    replay: "Play Again",
    share: "Share result",
    shared: "Copied to clipboard",
    alreadyDoneTitle: "Today's puzzle is done",
    alreadyDoneTitlePast: "This day is already done",
    milestone: (n) => `🎉 ${n}-day milestone reached!`,
    rescueBanner: "Broke your streak yesterday? You have one rescue left this month.",
    rescueBtn: "Rescue yesterday",
    rescueConfirm: "Watch a short clip to rescue yesterday's streak? (P0 stand-in for the rewarded ad)",
    rescueSuccess: "Rescued! Finish today's puzzle to keep it going.",
    rescueFailed: "Couldn't rescue this time.",
    scoreTotal: "Score",
    scoreBalance: (gain, balance) => `+${gain} this level, ${balance} total`,
    restartLimitReached: "No retries left today — finish with your current progress",
  },
};

export default function Daily({ date, onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const today = todayUTCString();
  const isToday = date === today;

  const streakStore = useMemo(() => createStreakStore(window.localStorage), []);
  // Derived fresh from storage on every date change (a plain useState
  // initializer only runs once per mount, so it would go stale when the
  // user navigates between dates without Daily unmounting, e.g. via the
  // hash route). justCompleted is an optimistic overlay for the puzzle
  // just solved in this session, scoped to its own date so it never
  // leaks onto a different date navigated to afterwards.
  const persistedEntry = useMemo(() => getDailyEntry(date), [date]);
  const [justCompleted, setJustCompleted] = useState(null);
  const historyEntry = justCompleted && justCompleted.date === date ? justCompleted.entry : persistedEntry;

  // Restart ("重來") count for today's in-progress attempt, capped at
  // DAILY_RESTART_LIMIT — re-derived on date change the same way
  // persistedEntry is, so navigating between dates picks up each date's own
  // count instead of carrying one date's tally onto another.
  const [restartCount, setRestartCount] = useState(() => getRestartCount(date));
  useEffect(() => {
    setRestartCount(getRestartCount(date));
  }, [date]);

  const [streakStatus, setStreakStatus] = useState(() => streakStore.status(today));
  const [toast, setToast] = useState(null);
  const [rescuing, setRescuing] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(null);
  // "再玩一次" on an already-completed day replays the same puzzle for fun
  // without re-recording the completion/streak/points — see handleWin.
  const [practiceMode, setPracticeMode] = useState(false);
  const toastTimeout = useRef(null);

  const puzzle = useMemo(() => {
    const raw = buildDailyPuzzle(date);
    if (!raw) return null;
    return { n: raw.size, total: raw.total, path: raw.solution, clueMap: raw.clues, weekday: raw.weekday };
  }, [date]);

  const showToast = useCallback((msg) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(msg);
    toastTimeout.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const handleWin = useCallback(
    ({ mistakes, timeSec }) => {
      // Practice replay of an already-completed day: let the player finish
      // for fun, but don't touch dailyHistory/streak/points a second time.
      if (practiceMode) {
        setPracticeMode(false);
        return;
      }
      const perfect = mistakes === 0;

      // Streak first: the reward scales with the streak *after* today
      // counts, so it has to be known before computing how many points
      // this completion is worth.
      let status = streakStatus;
      if (isToday) {
        status = streakStore.recordCompletion(date, { perfect, timeSec });
        setStreakStatus(status);
        trackShareConversion(date);
      }
      const reward = dailyPointsReward(status ? status.streak : 0);

      const entry = { perfect, mistakes, timeSec, size: puzzle.n, score: reward, completedAt: Date.now() };
      recordDailyCompletion(date, entry);
      setJustCompleted({ date, entry });
      setPointsBalance(addPoints(reward));

      track("daily_complete", buildDailyAnalyticsParams(date, {
        date,
        size: puzzle.n,
        time_sec: timeSec,
        mistakes,
        perfect,
        score: reward,
        streak: status ? status.streak : 0,
      }));
      recordLevelCompletion();
    },
    [practiceMode, date, isToday, puzzle, streakStatus, streakStore]
  );

  const session = useGameSession({
    onWin: handleWin,
    onHintUsed: (info) => track("hint_used", { context: "daily", salvageable: info?.salvageable }),
    onUndoUsed: () => track("undo_used", { context: "daily" }),
  });

  // Resets today's in-progress attempt, gated by DAILY_RESTART_LIMIT so a
  // player can't retry indefinitely until a perfect run. Only counts against
  // the limit for the actual (not-yet-recorded) attempt — historyEntry is
  // only truthy here in the practiceMode branch (see the recap/GameArea
  // switch below), which stays unlimited since it already doesn't touch
  // dailyHistory/streak/points either.
  const handleRestart = useCallback(() => {
    if (!historyEntry) {
      if (restartCount >= DAILY_RESTART_LIMIT) return;
      const next = recordDailyRestart(date);
      setRestartCount(next);
      if (next >= DAILY_RESTART_LIMIT) showToast(t.restartLimitReached);
    }
    session.restart();
  }, [historyEntry, restartCount, date, session.restart, showToast, t.restartLimitReached]);

  const restartsRemaining = historyEntry ? null : Math.max(0, DAILY_RESTART_LIMIT - restartCount);

  // Fire daily_fail_abandon when leaving an in-progress (unsolved, not
  // already-completed-before-this-session) puzzle: on navigating away, or
  // when the viewed date changes without a win. Refs mirror the latest
  // won/historyEntry so the cleanup below always reads fresh values
  // instead of the ones captured when the effect was set up.
  const wonRef = useRef(false);
  const historyEntryRef = useRef(historyEntry);
  const elapsedRef = useRef(0);
  useEffect(() => {
    wonRef.current = session.won;
  }, [session.won]);
  useEffect(() => {
    historyEntryRef.current = historyEntry;
  }, [historyEntry]);
  useEffect(() => {
    elapsedRef.current = session.elapsed;
  }, [session.elapsed]);
  useEffect(() => {
    const abandonDate = date;
    return () => {
      if (!wonRef.current && !historyEntryRef.current) {
        track("daily_fail_abandon", { date: abandonDate, elapsed_sec: elapsedRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openedRef = useRef(null);
  useEffect(() => {
    if (!puzzle || openedRef.current === date) return;
    openedRef.current = date;
    track("daily_open", buildDailyAnalyticsParams(date, { date, size: puzzle.n }));
    if (!historyEntry) session.start(puzzle);
    // historyEntry is only read here to decide whether to (re)start a
    // session; it intentionally isn't a dependency so completing the
    // puzzle just now doesn't re-trigger this open-tracking effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, date]);

  // Daily doesn't unmount when navigating between dates (App.jsx just
  // updates the `date` prop on the same instance, e.g. via a shared link to
  // a different day), so a lingering practiceMode from the previous date
  // would otherwise show that new date's GameArea even when it's already
  // completed and should show its RecapCard.
  useEffect(() => {
    setPracticeMode(false);
  }, [date]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  // Desktop keyboard shortcuts: Esc always goes home; Backspace/R only act
  // while a puzzle is in progress (not on the recap card). Ctrl+Z/Cmd+Z is
  // handled centrally by PlayArea (回退 lives there now); H/hint is gone —
  // hint is no longer manually triggerable (v3.2, auto-fires on idle).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

      if (e.key === "Escape") {
        if (onExit) {
          e.preventDefault();
          onExit();
        }
        return;
      }

      if (historyEntry || !session.puzzle) return;

      if (e.key === "Backspace") {
        if (session.filledOrder.length > 0 && !session.won) {
          e.preventDefault();
          session.undo();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (session.filledOrder.length > 0 && !session.won) {
          e.preventDefault();
          handleRestart();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onExit, historyEntry, session.puzzle, session.filledOrder.length, session.won, session.undo, handleRestart]);

  const handleShare = useCallback(async () => {
    const entry = historyEntry;
    if (!entry || !puzzle) return;
    const result = await shareDaily({
      date,
      size: puzzle.n,
      timeSec: entry.timeSec,
      perfect: entry.perfect,
      streak: streakStatus.streak,
      solution: puzzle.path,
      lang,
    });
    if (result.method === "clipboard") showToast(t.shared);
  }, [historyEntry, puzzle, date, streakStatus, lang, showToast, t.shared]);

  const handleReplay = useCallback(() => {
    setPracticeMode(true);
    session.restart();
  }, [session.restart]);

  const handleRescue = useCallback(() => {
    if (typeof window !== "undefined" && window.confirm) {
      track("streak_rescue_offered", {});
      const proceed = window.confirm(t.rescueConfirm);
      if (!proceed) return;
    }
    setRescuing(true);
    const result = streakStore.rescue(today);
    setRescuing(false);
    if (result.success) {
      track("streak_rescue_used", {});
      setStreakStatus(streakStore.status(today));
      showToast(t.rescueSuccess);
    } else {
      showToast(t.rescueFailed);
    }
  }, [streakStore, today, t, showToast]);

  if (!puzzle) {
    return (
      <div style={styles.rootLoading}>
        <div style={styles.loadingText}>{t.loading}</div>
      </div>
    );
  }

  const showRescueBanner = isToday && !historyEntry && streakStatus.broken && streakStatus.rescueAvailable;
  const newMilestone = historyEntry && isToday && streakStatus.milestones.length > 0 ? Math.max(...streakStatus.milestones) : null;

  return (
    <div style={styles.root}>
      <div style={inkWashStyle} />
      <LangToggle />
      <div style={styles.wrap}>
        {onExit && (
          <button onClick={onExit} style={homeBtnStyle} aria-label={t.home} title={`${t.home} (Esc)`}>
            <Home size={15} color={COLORS.inkSoft} />
            <span>{t.home}</span>
          </button>
        )}
        <div style={brandRowStyle}>
          <Feather size={18} color={COLORS.vermillion} />
          <span style={eyebrowStyle}>{t.brandTag}</span>
        </div>
        <h1 style={styles.title}>{t.dailyTitle}</h1>
        {!isToday && <p style={styles.reviewBanner}>{t.reviewBanner}</p>}

        {showRescueBanner && (
          <div style={styles.rescueBanner}>
            <span>{t.rescueBanner}</span>
            <button onClick={handleRescue} disabled={rescuing} style={styles.rescueBtn}>
              {t.rescueBtn}
            </button>
          </div>
        )}

        {historyEntry && !practiceMode ? (
          <RecapCard
            entry={historyEntry}
            justEarned={justCompleted && justCompleted.date === date ? justCompleted.entry.score : null}
            pointsBalance={justCompleted && justCompleted.date === date ? pointsBalance : null}
            isToday={isToday}
            streakStatus={streakStatus}
            onReplay={handleReplay}
            onShare={handleShare}
            t={t}
          />
        ) : (
          <GameArea session={session} t={t} onRestart={handleRestart} restartsRemaining={restartsRemaining} />
        )}

        {newMilestone && <div style={styles.milestoneStamp}>{t.milestone(newMilestone)}</div>}
        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

function GameArea({ session, t, onRestart, restartsRemaining }) {
  const { puzzle, taps, mistakes, elapsed, won } = session;
  if (!puzzle) return null;
  const nextNum = session.filledOrder.length + 1;

  return (
    <>
      <div style={styles.statusLine}>{won ? t.solved : t.nextStroke(nextNum)}</div>
      <div style={styles.statsRow}>
        <StatPill icon={<Timer size={13} color="#8B8478" />} label={fmtTime(elapsed)} />
        <StatPill label={t.steps(taps)} />
        <StatPill label={t.mistakes(mistakes)} warn={mistakes > 0} />
      </div>

      <PlayArea session={session} showTools toolContext="daily" onRestart={onRestart} restartsRemaining={restartsRemaining} />
    </>
  );
}

function RecapCard({ entry, justEarned, pointsBalance, isToday, streakStatus, onReplay, onShare, t }) {
  return (
    <div style={styles.recapCard}>
      <Feather size={26} color="#B23A2E" />
      <div style={styles.recapTitle}>{isToday ? t.alreadyDoneTitle : t.alreadyDoneTitlePast}</div>
      <div style={styles.recapStats}>
        {fmtTime(entry.timeSec)} · {entry.perfect ? t.perfectBadge : t.mistakesLabel(entry.mistakes)}
        {entry.score != null && ` · ${t.scoreTotal} ${entry.score}`}
      </div>
      {justEarned != null && pointsBalance != null && (
        <div style={styles.pointsLine}>{t.scoreBalance(justEarned, pointsBalance)}</div>
      )}
      {isToday && streakStatus.streak >= 2 && (
        <div style={styles.recapStreak}>
          <Flame size={15} color={COLORS.ochre} />
          <span>{t.streakLabel(streakStatus.streak)}</span>
        </div>
      )}
      <button onClick={onReplay} style={styles.primaryBtn}>
        <RotateCcw size={16} />
        <span>{t.replay}</span>
      </button>
      <button onClick={onShare} style={styles.shareLink}>
        <Share2 size={12} />
        <span>{t.share}</span>
      </button>
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
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 560,
    padding: "56px 16px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    animation: "ink-rise 0.6s ease both",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 32,
    fontWeight: 600,
    margin: "0 0 6px",
    letterSpacing: 4,
    color: "#2B2A28",
  },
  reviewBanner: {
    fontSize: 12.5,
    color: "#8B8478",
    letterSpacing: 1,
    margin: "0 0 18px",
  },
  rescueBanner: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    background: "rgba(178,58,46,0.08)",
    border: "1px solid rgba(178,58,46,0.3)",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 20,
    fontSize: 12.5,
    color: "#5A564C",
    maxWidth: 340,
  },
  rescueBtn: {
    background: "#B23A2E",
    color: "#EAE2CF",
    border: "none",
    borderRadius: 4,
    padding: "8px 18px",
    fontSize: 13,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    cursor: "pointer",
  },
  statusLine: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 3,
    color: "#B23A2E",
    marginBottom: 16,
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
  recapCard: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.18)",
    borderRadius: 6,
    padding: "34px 30px",
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    boxShadow: "0 8px 30px rgba(43,42,40,0.14)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  recapTitle: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: 4,
    color: "#B23A2E",
  },
  recapStats: {
    fontSize: 14,
    color: "#5A564C",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
  },
  recapStreak: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: COLORS.ochre,
    fontFamily: "'Noto Serif TC', serif",
  },
  pointsLine: {
    fontSize: 12.5,
    color: "#B8925A",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
  },
  primaryBtn: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#B23A2E",
    color: "#EAE2CF",
    border: "none",
    borderRadius: 4,
    padding: "12px 26px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  // Small, secondary — share is a promo nudge here, not the main action.
  shareLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 2,
    padding: "5px 10px",
    background: "transparent",
    border: "none",
    color: "#8B8478",
    fontSize: 11.5,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
    cursor: "pointer",
  },
  milestoneStamp: {
    marginTop: 18,
    fontSize: 14,
    color: COLORS.vermillion,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    animation: "ink-rise 0.5s ease both",
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
