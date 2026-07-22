import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Undo2, Lightbulb, Timer, Feather, Home, Share2, Flame } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";
import Board from "./numberlink/Board.jsx";
import { useGameSession } from "./numberlink/useGameSession.js";
import { buildDailyPuzzle } from "../engine/daily.mjs";
import { fmtTime, dailyNumber } from "../engine/share.mjs";
import { createStreakStore } from "../engine/streak.mjs";
import { getDailyEntry, recordDailyCompletion } from "../dailyHistory.js";
import { todayUTCString } from "../dateUtil.js";
import { shareDaily } from "../daily/shareFlow.js";
import { trackShareConversion } from "../daily/attribution.js";
import { track } from "../analytics.js";
import { recordLevelCompletion } from "../pwaInstall.js";

const TEXT = {
  zh: {
    home: "主畫面",
    brandTag: "Daily · Ink · Path",
    dailyTitle: (n) => `每日挑戰 #${n}`,
    loading: "研墨中…",
    reviewBanner: "僅供回顧・不列入連續紀錄",
    nextStroke: (n) => `下一筆　${n}`,
    solved: "一筆連成",
    undo: "回退",
    hintBtn: "提示",
    steps: (n) => `${n} 步`,
    mistakes: (n) => `${n} 失誤`,
    mistakesLabel: (n) => (n === 0 ? "零失誤" : `${n} 次失誤`),
    perfectBadge: "🖋 完美",
    streakLabel: (n) => `🔥 連續 ${n} 天`,
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
  },
  en: {
    home: "Home",
    brandTag: "Daily · Ink · Path",
    dailyTitle: (n) => `Daily Challenge #${n}`,
    loading: "Grinding ink…",
    reviewBanner: "Archive only · doesn't count toward your streak",
    nextStroke: (n) => `Next stroke　${n}`,
    solved: "Solved in one stroke",
    undo: "Undo",
    hintBtn: "Hint",
    steps: (n) => `${n} moves`,
    mistakes: (n) => `${n} mistakes`,
    mistakesLabel: (n) => (n === 0 ? "No mistakes" : `${n} mistakes`),
    perfectBadge: "🖋 Perfect",
    streakLabel: (n) => `🔥 ${n}-day streak`,
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
  },
};

export default function Daily({ date, onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const today = todayUTCString();
  const isToday = date === today;
  const dailyNo = dailyNumber(date);

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

  const [streakStatus, setStreakStatus] = useState(() => streakStore.status(today));
  const [toast, setToast] = useState(null);
  const [rescuing, setRescuing] = useState(false);
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
      const perfect = mistakes === 0;
      recordDailyCompletion(date, { perfect, mistakes, timeSec, completedAt: Date.now() });
      setJustCompleted({ date, entry: { perfect, mistakes, timeSec, completedAt: Date.now() } });

      let status = streakStatus;
      if (isToday) {
        status = streakStore.recordCompletion(date, { perfect, timeSec });
        setStreakStatus(status);
        trackShareConversion(date);
      }
      track("daily_complete", {
        date,
        size: puzzle.n,
        time_sec: timeSec,
        mistakes,
        perfect,
        streak: status ? status.streak : 0,
      });
      recordLevelCompletion();
    },
    [date, isToday, puzzle, streakStatus, streakStore]
  );

  const session = useGameSession({
    onWin: handleWin,
    onHintUsed: () => track("hint_used", { context: "daily" }),
    onUndoUsed: () => track("undo_used", { context: "daily" }),
  });

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
    track("daily_open", { date, size: puzzle.n });
    if (!historyEntry) session.start(puzzle);
    // historyEntry is only read here to decide whether to (re)start a
    // session; it intentionally isn't a dependency so completing the
    // puzzle just now doesn't re-trigger this open-tracking effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, date]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

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
          <button onClick={onExit} style={homeBtnStyle} aria-label={t.home}>
            <Home size={15} color={COLORS.inkSoft} />
            <span>{t.home}</span>
          </button>
        )}
        <div style={brandRowStyle}>
          <Feather size={18} color={COLORS.vermillion} />
          <span style={eyebrowStyle}>{t.brandTag}</span>
        </div>
        <h1 style={styles.title}>{t.dailyTitle(dailyNo)}</h1>
        {!isToday && <p style={styles.reviewBanner}>{t.reviewBanner}</p>}

        {showRescueBanner && (
          <div style={styles.rescueBanner}>
            <span>{t.rescueBanner}</span>
            <button onClick={handleRescue} disabled={rescuing} style={styles.rescueBtn}>
              {t.rescueBtn}
            </button>
          </div>
        )}

        {historyEntry ? (
          <RecapCard entry={historyEntry} isToday={isToday} streakStatus={streakStatus} onShare={handleShare} t={t} />
        ) : (
          <GameArea session={session} t={t} />
        )}

        {newMilestone && <div style={styles.milestoneStamp}>{t.milestone(newMilestone)}</div>}
        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

function GameArea({ session, t }) {
  const { puzzle, filledOrder, filledSet, candidateSet, taps, mistakes, elapsed, won, shakeKey, advanceTo, undo, hint } = session;
  if (!puzzle) return null;
  const nextNum = filledOrder.length + 1;

  return (
    <>
      <div style={styles.statusLine}>{won ? t.solved : t.nextStroke(nextNum)}</div>
      <div style={styles.statsRow}>
        <StatPill icon={<Timer size={13} color="#8C8271" />} label={fmtTime(elapsed)} />
        <StatPill label={t.steps(taps)} />
        <StatPill label={t.mistakes(mistakes)} warn={mistakes > 0} />
      </div>

      <Board
        puzzle={puzzle}
        filledOrder={filledOrder}
        filledSet={filledSet}
        candidateSet={candidateSet}
        won={won}
        shakeKey={shakeKey}
        onCellClick={advanceTo}
      />

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
    </>
  );
}

function RecapCard({ entry, isToday, streakStatus, onShare, t }) {
  return (
    <div style={styles.recapCard}>
      <Feather size={26} color="#A23C2E" />
      <div style={styles.recapTitle}>{isToday ? t.alreadyDoneTitle : t.alreadyDoneTitlePast}</div>
      <div style={styles.recapStats}>
        {fmtTime(entry.timeSec)} · {entry.perfect ? t.perfectBadge : t.mistakesLabel(entry.mistakes)}
      </div>
      {isToday && streakStatus.streak >= 2 && (
        <div style={styles.recapStreak}>
          <Flame size={15} color={COLORS.ochre} />
          <span>{t.streakLabel(streakStatus.streak)}</span>
        </div>
      )}
      <button onClick={onShare} style={styles.shareBtn}>
        <Share2 size={16} />
        <span>{t.share}</span>
      </button>
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
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 480,
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
    color: "#33302A",
  },
  reviewBanner: {
    fontSize: 12.5,
    color: "#8C8271",
    letterSpacing: 1,
    margin: "0 0 18px",
  },
  rescueBanner: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    background: "rgba(162,60,46,0.08)",
    border: "1px solid rgba(162,60,46,0.3)",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 20,
    fontSize: 12.5,
    color: "#6B6456",
    maxWidth: 340,
  },
  rescueBtn: {
    background: "#A23C2E",
    color: "#F1EADA",
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
    color: "#A23C2E",
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
    border: "1px solid rgba(51,48,42,0.16)",
    borderRadius: 999,
    padding: "5px 14px",
    fontSize: 13,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
    color: "#6B6456",
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
  recapCard: {
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.18)",
    borderRadius: 6,
    padding: "34px 30px",
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    boxShadow: "0 8px 30px rgba(46,42,34,0.14)",
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
    color: "#A23C2E",
  },
  recapStats: {
    fontSize: 14,
    color: "#6B6456",
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
  shareBtn: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#A23C2E",
    color: "#F1EADA",
    border: "none",
    borderRadius: 4,
    padding: "12px 26px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
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
    background: "#33302A",
    color: "#F1EADA",
    padding: "10px 20px",
    borderRadius: 999,
    fontSize: 13,
    letterSpacing: 1,
    zIndex: 20,
  },
};
