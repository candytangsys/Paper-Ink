import { useMemo, useEffect } from "react";
import { Check } from "lucide-react";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import { HOME_COLORS, HOME_FONT_SERIF, HOME_FONT_SANS, HOME_FONT_MONO } from "../homeTheme.js";
import { WEEK_SCHEDULE } from "../engine/daily.mjs";
import { dailyNumber, fmtTime } from "../engine/share.mjs";
import { createStreakStore } from "../engine/streak.mjs";
import { getDailyEntry, loadDailyHistory } from "../dailyHistory.js";
import { todayUTCString } from "../dateUtil.js";
import { LEVEL_COUNT, NUMBERLINK_STORAGE_KEY } from "../games/NumberLink.jsx";
import { track } from "../analytics.js";

// F7: the engine's WEEK_SCHEDULE[].label carries a fixed Chinese flavor
// string used only to seed puzzle generation — the UI keeps its own
// bilingual weekday names instead of displaying it directly.
const WEEKDAY_NAMES = {
  zh: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const TEXT = {
  zh: {
    brand: "紙墨集",
    dailyEyebrow: (weekday) => `${weekday} · 今日挑戰`,
    dailyNo: (n) => `#${String(n).padStart(2, "0")}`,
    clues: "線索",
    best: "最快",
    doneBadge: "今日已完成",
    ctaEnter: "進入今日挑戰",
    ctaDone: "查看今日成績",
    sectionLabel: "常規關卡",
  },
  en: {
    brand: "Paper & Ink",
    dailyEyebrow: (weekday) => `${weekday} · Daily Challenge`,
    dailyNo: (n) => `#${String(n).padStart(2, "0")}`,
    clues: "Clues",
    best: "Best",
    doneBadge: "Completed today",
    ctaEnter: "Enter Today's Challenge",
    ctaDone: "View Today's Result",
    sectionLabel: "Regular Levels",
  },
};

function loadNumberLinkProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(NUMBERLINK_STORAGE_KEY));
    return { unlockedLevel: raw?.unlockedLevel || 1, best: raw?.best || {} };
  } catch {
    return { unlockedLevel: 1, best: {} };
  }
}

// Personal best across every daily completion so far, regardless of board
// size — a simple, always-meaningful "your fastest daily clear" stat.
function bestDailyTimeSec() {
  const history = loadDailyHistory();
  const times = Object.values(history)
    .filter((e) => typeof e.timeSec === "number")
    .map((e) => e.timeSec);
  return times.length ? Math.min(...times) : null;
}

export default function Home({ onSelect }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];

  useEffect(() => {
    track("home_view", {});
  }, []);

  const daily = useMemo(() => {
    const today = todayUTCString();
    const weekdayIdx = new Date(today + "T00:00:00Z").getUTCDay();
    const sched = WEEK_SCHEDULE[weekdayIdx];
    const entry = getDailyEntry(today);
    const status = createStreakStore(window.localStorage).status(today);
    return {
      no: dailyNumber(today),
      size: sched.size,
      clueCount: Math.max(2, Math.round(sched.size * sched.size * sched.clueRatio)),
      total: sched.size * sched.size,
      weekdayIdx,
      done: !!entry,
      streak: status.streak,
      bestTimeSec: bestDailyTimeSec(),
    };
  }, []);
  const weekdayName = WEEKDAY_NAMES[lang][daily.weekdayIdx];

  const progress = useMemo(() => loadNumberLinkProgress(), []);

  return (
    <div style={styles.root}>
      <LangToggle />
      <div style={styles.topbar}>
        <div style={styles.brandmark}>
          <div style={styles.sealDot}>紙</div>
          <span style={styles.brandName}>{t.brand}</span>
        </div>
        <div style={styles.streakChip}>
          <span style={styles.flame}>🔥</span>
          <span style={styles.streakNum}>{daily.streak}</span>
        </div>
      </div>

      <div style={styles.scrollArea}>
        <button onClick={() => onSelect("daily")} style={styles.scrollCard}>
          <div style={styles.scrollEdgeTop} />
          <div style={styles.scrollEdgeBottom} />
          <div style={styles.scrollEyebrow}>{t.dailyEyebrow(weekdayName)}</div>
          <div style={styles.scrollTitleRow}>
            <div style={styles.scrollTitle}>
              {daily.size} × {daily.size}
            </div>
            <div style={styles.scrollDailyNo}>{t.dailyNo(daily.no)}</div>
          </div>
          <div style={styles.scrollMeta}>
            <span>
              {t.clues} <b style={styles.metaNum}>{daily.clueCount}/{daily.total}</b>
            </span>
            {daily.bestTimeSec != null && (
              <span>
                {t.best} <b style={styles.metaNum}>{fmtTime(daily.bestTimeSec)}</b>
              </span>
            )}
            {daily.done && (
              <span style={styles.doneBadge}>
                <Check size={12} /> {t.doneBadge}
              </span>
            )}
          </div>
          <div style={styles.scrollVisual}>
            <svg width="180" height="70" viewBox="0 0 180 70">
              <path
                d="M10 50 C 40 10, 70 60, 100 20 S 150 55, 170 15"
                fill="none"
                stroke={HOME_COLORS.ink}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
              />
            </svg>
          </div>
          <div style={styles.scrollCta}>{daily.done ? t.ctaDone : t.ctaEnter}</div>
        </button>

        <div style={styles.sectionLabelRow}>
          <span>{t.sectionLabel}</span>
          <span style={styles.sectionLabelLine} />
        </div>

        <div style={styles.levelGrid}>
          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((lvl) => {
            // Below the unlocked frontier always reads as done even without
            // its own best[] entry (can only happen from injected/edge-case
            // progress data, since normal play sets both together) — this
            // keeps exactly one node "current" instead of a whole streak of
            // them lighting up as seal.
            const done = !!progress.best[lvl] || lvl < progress.unlockedLevel;
            const current = !done && lvl === progress.unlockedLevel;
            const state = done ? "done" : current ? "current" : "locked";
            return (
              <button
                key={lvl}
                onClick={() => onSelect("number-link")}
                style={{
                  ...styles.levelNode,
                  ...(state === "done" ? styles.levelNodeDone : state === "current" ? styles.levelNodeCurrent : {}),
                }}
              >
                {lvl}
              </button>
            );
          })}
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
    background: HOME_COLORS.paper,
    color: HOME_COLORS.ink,
    fontFamily: HOME_FONT_SANS,
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "56px 22px 0",
  },
  brandmark: { display: "flex", alignItems: "center", gap: 9 },
  sealDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: HOME_COLORS.seal,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: HOME_FONT_SERIF,
    color: HOME_COLORS.paper,
    fontSize: 12,
    fontWeight: 700,
  },
  brandName: {
    fontFamily: HOME_FONT_SERIF,
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: "0.06em",
  },
  streakChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 11px",
    background: "#fff8ec",
    border: `1px solid ${HOME_COLORS.hairline}`,
    borderRadius: 999,
  },
  flame: { fontSize: 13 },
  streakNum: { fontFamily: HOME_FONT_MONO, fontWeight: 600, fontSize: 13, color: HOME_COLORS.seal },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 22px 40px",
    maxWidth: 480,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  scrollCard: {
    position: "relative",
    display: "block",
    width: "100%",
    textAlign: "left",
    border: `1px solid ${HOME_COLORS.hairline}`,
    borderRadius: 18,
    padding: "26px 22px 22px",
    background: "linear-gradient(180deg, #FBF7EC 0%, #F4EEDD 100%)",
    boxShadow: "0 14px 30px -18px rgba(43,42,40,0.35)",
    overflow: "hidden",
    cursor: "pointer",
    color: HOME_COLORS.ink,
  },
  scrollEdgeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    background: `repeating-linear-gradient(90deg, ${HOME_COLORS.ink} 0 2px, transparent 2px 9px)`,
    opacity: 0.55,
  },
  scrollEdgeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    background: `repeating-linear-gradient(90deg, ${HOME_COLORS.ink} 0 2px, transparent 2px 9px)`,
    opacity: 0.55,
  },
  scrollEyebrow: {
    fontFamily: HOME_FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.18em",
    color: HOME_COLORS.inkFaint,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  scrollTitleRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
  scrollTitle: { fontFamily: HOME_FONT_SERIF, fontSize: 30, fontWeight: 700 },
  scrollDailyNo: { fontFamily: HOME_FONT_MONO, fontSize: 13, color: HOME_COLORS.inkFaint },
  scrollMeta: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 14,
    fontFamily: HOME_FONT_SANS,
    fontSize: 12.5,
    color: HOME_COLORS.inkSoft,
  },
  metaNum: { fontFamily: HOME_FONT_MONO, color: HOME_COLORS.ink, fontWeight: 600 },
  doneBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: HOME_COLORS.bamboo,
    fontWeight: 600,
  },
  scrollVisual: {
    margin: "18px 0",
    height: 96,
    borderRadius: 12,
    background: HOME_COLORS.paperDeep,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollCta: {
    width: "100%",
    padding: 13,
    borderRadius: 12,
    background: HOME_COLORS.ink,
    color: HOME_COLORS.paper,
    fontFamily: HOME_FONT_SERIF,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textAlign: "center",
  },
  sectionLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "26px 0 14px",
    fontFamily: HOME_FONT_SERIF,
    fontSize: 13,
    color: HOME_COLORS.inkSoft,
    letterSpacing: "0.12em",
  },
  sectionLabelLine: { flex: 1, height: 1, background: HOME_COLORS.hairline },
  levelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 9,
  },
  levelNode: {
    aspectRatio: "1",
    borderRadius: 9,
    background: "#fff8ec",
    border: `1px solid ${HOME_COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: HOME_FONT_MONO,
    fontSize: 12,
    color: HOME_COLORS.inkFaint,
    cursor: "pointer",
  },
  levelNodeDone: { background: HOME_COLORS.bamboo, color: HOME_COLORS.paper, borderColor: HOME_COLORS.bamboo },
  levelNodeCurrent: { background: HOME_COLORS.seal, color: HOME_COLORS.paper, borderColor: HOME_COLORS.seal },
};
