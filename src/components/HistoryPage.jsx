import { useMemo } from "react";
import { Home, Feather } from "lucide-react";
import { COLORS, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import { fmtTime } from "../engine/share.mjs";
import { loadDailyHistory } from "../dailyHistory.js";
import { loadLevelHistory } from "../levelHistory.js";

const TEXT = {
  zh: {
    brandTag: "Daily · Ink · Path",
    title: "個人歷史紀錄",
    home: "主畫面",
    empty: "還沒有任何完成紀錄，去挑戰一關吧！",
    dailyKind: (size) => `每日挑戰 · ${size}×${size}`,
    levelKind: (size) => `常規關卡 · ${size}×${size}`,
    perfect: "完美",
    mistakes: (n) => `${n} 次失誤`,
    score: (n) => `${n} 分`,
  },
  en: {
    brandTag: "Daily · Ink · Path",
    title: "History",
    home: "Home",
    empty: "No completions yet — go clear a puzzle!",
    dailyKind: (size) => `Daily · ${size}×${size}`,
    levelKind: (size) => `Regular · ${size}×${size}`,
    perfect: "Perfect",
    mistakes: (n) => `${n} mistakes`,
    score: (n) => `${n} pts`,
  },
};

// Merges dailyHistory.js (date -> entry) and levelHistory.js (id -> entry)
// into one reverse-chronological list, since v3.1 retires the fixed-level
// grid in favor of this page as the sole "what have I done" view.
function buildCombinedHistory() {
  const daily = loadDailyHistory();
  const levels = loadLevelHistory();
  const rows = [];

  Object.entries(daily).forEach(([date, entry]) => {
    rows.push({
      key: `daily_${date}`,
      kind: "daily",
      size: entry.size ?? null,
      timeSec: entry.timeSec,
      mistakes: entry.mistakes,
      perfect: entry.perfect,
      score: entry.score ?? null,
      completedAt: entry.completedAt ?? 0,
    });
  });

  Object.entries(levels).forEach(([id, entry]) => {
    rows.push({
      key: `level_${id}`,
      kind: "level",
      size: entry.size,
      timeSec: entry.timeSec,
      mistakes: entry.mistakes,
      perfect: entry.perfect,
      score: entry.score,
      completedAt: entry.completedAt ?? 0,
    });
  });

  rows.sort((a, b) => b.completedAt - a.completedAt);
  return rows;
}

export default function HistoryPage({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const rows = useMemo(buildCombinedHistory, []);

  return (
    <div style={styles.root}>
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

        {rows.length === 0 ? (
          <p style={styles.empty}>{t.empty}</p>
        ) : (
          <div style={styles.list}>
            {rows.map((row) => (
              <div key={row.key} style={styles.row}>
                <div style={styles.rowMain}>
                  <span style={styles.rowKind}>
                    {row.kind === "daily" ? t.dailyKind(row.size) : t.levelKind(row.size)}
                  </span>
                  <span style={styles.rowTime}>{fmtTime(row.timeSec)}</span>
                </div>
                <div style={styles.rowMeta}>
                  <span>{row.perfect ? t.perfect : t.mistakes(row.mistakes)}</span>
                  {row.score != null && <span style={styles.rowScore}>{t.score(row.score)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
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
    margin: "0 0 24px",
    letterSpacing: 4,
    color: "#2B2A28",
  },
  empty: {
    fontSize: 13.5,
    color: "#8B8478",
    letterSpacing: 1,
  },
  list: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    width: "100%",
    textAlign: "left",
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.14)",
    borderRadius: 8,
    padding: "12px 16px",
  },
  rowMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  rowKind: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 14,
    fontWeight: 600,
    color: "#2B2A28",
  },
  rowTime: {
    fontFamily: "'EB Garamond', serif",
    fontSize: 13,
    color: "#5A564C",
  },
  rowMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#8B8478",
    letterSpacing: 0.5,
  },
  rowScore: {
    color: "#B8925A",
    fontWeight: 600,
  },
};
