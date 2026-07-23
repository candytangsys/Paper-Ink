import { useMemo, useState, useCallback } from "react";
import { Home, Feather, ChevronLeft, ChevronRight, Flame, Check, LifeBuoy, Lock } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import { loadDailyHistory } from "../dailyHistory.js";
import { createStreakStore } from "../engine/streak.mjs";
import { isPastDayUnlocked } from "../dailyUnlock.js";
import { todayUTCString } from "../dateUtil.js";

const TEXT = {
  zh: {
    brandTag: "Daily · Ink · Path",
    home: "主畫面",
    title: "挑戰行事曆",
    streakLabel: "目前連續",
    bestLabel: "最佳紀錄",
    days: (n) => `${n} 天`,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    legendPerfect: "完美通關",
    legendDone: "已完成",
    legendRescued: "已救回",
    legendMissed: "未完成",
    legendLocked: "尚未解鎖",
    monthFmt: "zh-TW",
  },
  en: {
    brandTag: "Daily · Ink · Path",
    home: "Home",
    title: "Challenge Calendar",
    streakLabel: "Current streak",
    bestLabel: "Best streak",
    days: (n) => `${n} days`,
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    legendPerfect: "Perfect",
    legendDone: "Completed",
    legendRescued: "Rescued",
    legendMissed: "Missed",
    legendLocked: "Locked",
    monthFmt: "en-US",
  },
};

function addDaysUTC(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function shiftMonth({ year, month }, delta) {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, "0");
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  }
  return cells;
}

export default function CalendarPage({ onExit, onSelectDate }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const today = todayUTCString();

  const [cursor, setCursor] = useState(() => {
    const d = new Date(today + "T00:00:00Z");
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  const dailyHistory = useMemo(loadDailyHistory, []);
  const streakStore = useMemo(() => createStreakStore(window.localStorage), []);
  const streakHistory = useMemo(() => streakStore.getHistory(), [streakStore]);
  const streakStatus = useMemo(() => streakStore.status(today), [streakStore, today]);

  const streakDates = useMemo(() => {
    if (!streakStatus.streak) return new Set();
    const anchor = streakStatus.doneToday ? today : addDaysUTC(today, -1);
    const set = new Set();
    for (let i = 0; i < streakStatus.streak; i++) set.add(addDaysUTC(anchor, -i));
    return set;
  }, [streakStatus, today]);

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor]);
  const monthLabel = useMemo(
    () =>
      new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(t.monthFmt, {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
    [cursor, t.monthFmt]
  );

  const currentMonthCursor = useMemo(() => {
    const d = new Date(today + "T00:00:00Z");
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  }, [today]);
  const atCurrentMonth = cursor.year === currentMonthCursor.year && cursor.month === currentMonthCursor.month;

  const goPrev = useCallback(() => setCursor((c) => shiftMonth(c, -1)), []);
  const goNext = useCallback(() => setCursor((c) => (atCurrentMonth ? c : shiftMonth(c, 1))), [atCurrentMonth]);

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
        <h1 style={styles.title}>{t.title}</h1>

        <div style={styles.statRow}>
          <div style={styles.statChip}>
            <Flame size={14} color={COLORS.ochre} />
            <span style={styles.statLabel}>{t.streakLabel}</span>
            <span style={styles.statNum}>{t.days(streakStatus.streak)}</span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>{t.bestLabel}</span>
            <span style={styles.statNum}>{t.days(streakStatus.best)}</span>
          </div>
        </div>

        <div style={styles.monthNav}>
          <button onClick={goPrev} style={styles.navBtn} aria-label="prev">
            <ChevronLeft size={16} color={COLORS.inkSoft} />
          </button>
          <span style={styles.monthLabel}>{monthLabel}</span>
          <button onClick={goNext} disabled={atCurrentMonth} style={{ ...styles.navBtn, ...(atCurrentMonth ? styles.navBtnDisabled : {}) }} aria-label="next">
            <ChevronRight size={16} color={atCurrentMonth ? COLORS.faint : COLORS.inkSoft} />
          </button>
        </div>

        <div style={styles.weekdayRow}>
          {t.weekdays.map((w, i) => (
            <span key={i} style={styles.weekdayCell}>
              {w}
            </span>
          ))}
        </div>

        <div style={styles.grid}>
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={`blank-${i}`} style={styles.cellBlank} />;

            const entry = dailyHistory[dateStr];
            const rescued = !entry && streakHistory[dateStr]?.rescued;
            const isFuture = dateStr > today;
            const isToday = dateStr === today;
            const locked = !isFuture && !isToday && !isPastDayUnlocked(dateStr);
            const inStreak = streakDates.has(dateStr);
            const dayNum = Number(dateStr.slice(8, 10));

            const rings = [];
            if (isToday) rings.push(`0 0 0 2px ${COLORS.vermillion}`);
            if (inStreak) rings.push(`0 0 0 ${isToday ? 4 : 2}px rgba(176,121,60,0.55)`);

            const cellStyle = {
              ...styles.cell,
              ...(entry ? (entry.perfect ? styles.cellPerfect : styles.cellDone) : {}),
              ...(rescued ? styles.cellRescued : {}),
              ...(locked ? styles.cellLocked : {}),
              ...(isFuture ? styles.cellFuture : {}),
              ...(rings.length ? { boxShadow: rings.join(", ") } : {}),
            };

            const content = (
              <>
                <span style={styles.cellDay}>{dayNum}</span>
                {locked ? (
                  <Lock size={10} color={COLORS.faint} style={styles.cellIcon} />
                ) : (
                  <>
                    {entry && (
                      <Check size={11} color={entry.perfect ? COLORS.vermillion : COLORS.celadon} style={styles.cellIcon} />
                    )}
                    {rescued && <LifeBuoy size={11} color={COLORS.ochre} style={styles.cellIcon} />}
                  </>
                )}
              </>
            );

            return isFuture ? (
              <div key={dateStr} style={cellStyle}>
                {content}
              </div>
            ) : (
              <button key={dateStr} onClick={() => onSelectDate && onSelectDate(dateStr)} style={cellStyle}>
                {content}
              </button>
            );
          })}
        </div>

        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <Check size={11} color={COLORS.vermillion} /> {t.legendPerfect}
          </span>
          <span style={styles.legendItem}>
            <Check size={11} color={COLORS.celadon} /> {t.legendDone}
          </span>
          <span style={styles.legendItem}>
            <LifeBuoy size={11} color={COLORS.ochre} /> {t.legendRescued}
          </span>
          <span style={styles.legendItem}>
            <Lock size={11} color={COLORS.faint} /> {t.legendLocked}
          </span>
          <span style={styles.legendItem}>
            <span style={styles.legendMissedDot} /> {t.legendMissed}
          </span>
        </div>
      </div>
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
    fontSize: 28,
    fontWeight: 600,
    margin: "0 0 18px",
    letterSpacing: 4,
    color: "#2B2A28",
  },
  statRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  statChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "#fff8ec",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 999,
  },
  statLabel: {
    fontSize: 11.5,
    color: COLORS.inkSoft,
    letterSpacing: 0.5,
  },
  statNum: {
    fontFamily: "'EB Garamond', serif",
    fontWeight: 700,
    fontSize: 13,
    color: COLORS.ink,
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginBottom: 14,
    width: "100%",
  },
  navBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    width: 30,
    height: 30,
    cursor: "pointer",
  },
  navBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  monthLabel: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 1.5,
    minWidth: 140,
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    width: "100%",
    marginBottom: 6,
  },
  weekdayCell: {
    fontSize: 11.5,
    color: COLORS.faint,
    letterSpacing: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 5,
    width: "100%",
  },
  cellBlank: { aspectRatio: "1" },
  cell: {
    position: "relative",
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    background: "#fff8ec",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.inkSoft,
    fontFamily: "'EB Garamond', serif",
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
  },
  cellDay: { fontSize: 12, lineHeight: 1 },
  cellIcon: { position: "absolute", bottom: 3, right: 3 },
  cellDone: {
    background: "rgba(110,142,134,0.14)",
    borderColor: "rgba(110,142,134,0.4)",
  },
  cellPerfect: {
    background: "rgba(178,58,46,0.1)",
    borderColor: "rgba(178,58,46,0.4)",
  },
  cellRescued: {
    background: "rgba(176,121,60,0.12)",
    borderColor: "rgba(176,121,60,0.4)",
    borderStyle: "dashed",
  },
  cellLocked: {
    background: "#F3EEE1",
    color: COLORS.faint,
  },
  cellFuture: {
    opacity: 0.35,
    cursor: "default",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 16px",
    justifyContent: "center",
    marginTop: 20,
    fontSize: 11.5,
    color: COLORS.inkSoft,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  legendMissedDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    border: `1px solid ${COLORS.border}`,
    background: "#fff8ec",
    display: "inline-block",
  },
};
