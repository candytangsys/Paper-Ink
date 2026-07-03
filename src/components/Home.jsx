import { Feather, Hash, Timer, Waypoints } from "lucide-react";
import { COLORS, FONT_SERIF, FONT_DISPLAY, inkWashStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";

const TEXT = {
  zh: {
    eyebrow: "Paper · Ink · Games",
    title: "紙墨集",
    subtitle: "三卷小遊戲，各自成篇",
    games: [
      { id: "guess-number", icon: Hash, label: "第一卷", title: "猜數字", desc: "四個不重複的數字，靠邏輯層層推敲" },
      { id: "number-link", icon: Waypoints, label: "第二卷", title: "一筆連", desc: "循著數字順序，一筆連過每一格" },
      { id: "time-sense", icon: Timer, label: "第三卷", title: "時感", desc: "關於時間的感知練習" },
    ],
  },
  en: {
    eyebrow: "Paper · Ink · Games",
    title: "Paper & Ink",
    subtitle: "Three small games, each its own chapter",
    games: [
      { id: "guess-number", icon: Hash, label: "Chapter I", title: "Guess the Code", desc: "Four unique digits, deduced through logic" },
      { id: "number-link", icon: Waypoints, label: "Chapter II", title: "One-Stroke Path", desc: "Trace every cell in order, in a single stroke" },
      { id: "time-sense", icon: Timer, label: "Chapter III", title: "Sense of Time", desc: "A practice in perceiving the passage of time" },
    ],
  },
};

export default function Home({ onSelect }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  return (
    <div style={styles.root}>
      <div style={inkWashStyle} />
      <LangToggle />
      <div className="ink-rise" style={styles.wrap}>
        <div style={brandRowStyle}>
          <Feather size={20} color={COLORS.vermillion} />
          <span style={eyebrowStyle}>{t.eyebrow}</span>
        </div>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.subtitle}>{t.subtitle}</p>

        <div style={styles.grid}>
          {t.games.map((g) => {
            const Icon = g.icon;
            return (
              <button key={g.id} onClick={() => onSelect(g.id)} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.cardLabel}>{g.label}</span>
                  <Icon size={16} color={COLORS.hairline} />
                </div>
                <div style={styles.cardTitle}>{g.title}</div>
                <div style={styles.cardDesc}>{g.desc}</div>
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
    background: COLORS.paper,
    color: COLORS.ink,
    fontFamily: FONT_SERIF,
    display: "flex",
    justifyContent: "center",
    overflowX: "hidden",
  },
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 480,
    padding: "72px 22px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 46,
    fontWeight: 600,
    margin: "0 0 10px",
    letterSpacing: 8,
    color: COLORS.ink,
  },
  subtitle: { fontSize: 14, color: COLORS.inkSoft, margin: "0 0 40px", letterSpacing: 1, lineHeight: 1.6 },
  grid: { width: "100%", display: "flex", flexDirection: "column", gap: 14 },
  card: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "20px 22px",
    textAlign: "left",
    cursor: "pointer",
    color: COLORS.ink,
    boxShadow: "0 1px 0 rgba(51,48,42,0.05)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLabel: {
    fontFamily: "'EB Garamond', serif",
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.hairline,
    textTransform: "uppercase",
  },
  cardTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: 1, color: COLORS.ink },
  cardDesc: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 6, lineHeight: 1.7 },
};
