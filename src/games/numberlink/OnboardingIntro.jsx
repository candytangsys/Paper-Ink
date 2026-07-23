import { Feather } from "lucide-react";
import { useLanguage } from "../../i18n.jsx";
import { buildHashRoute } from "../../router.js";

// First-run walkthrough for regular levels (v3.2) — shown once ever
// (gated by src/tutorialIntro.js), before the player's very first puzzle.
// Covers the same basic rules the new Rules page documents in full, so a
// player never has to leave the flow to learn how to play.
const TEXT = {
  zh: {
    title: "怎麼玩",
    lines: [
      "依序連接數字 1 → N，可上下左右斜角八個方向移動；按住拖曳可一筆畫完。",
      "點擊盤面上的「1」開始，之後依序點下一個數字；回退可以撤銷、重來可以重新挑戰同一題。",
      "卡住的時候，遊戲會在你停下來幾秒後自動提示下一步，完全免費、不用按任何按鈕。",
      "想要更多幫助？盤面右側有 5 種道具，用每次過關累積的積分、或看廣告即可解鎖。",
    ],
    rulesLink: "查看完整玩法與積分說明",
    cta: "開始遊戲",
  },
  en: {
    title: "How to Play",
    lines: [
      "Connect numbers 1 → N in order — 8-directional moves including diagonals. Press and hold to draw the whole stroke at once.",
      "Tap “1” on the board to start, then tap the next number in sequence. 回退 (Undo) undoes a step; 重來 (Retry) restarts the same puzzle.",
      "Stuck? The game auto-hints your next move a few seconds after you pause — free, no button needed.",
      "Want more help? 5 tools live on the right side of the board, unlocked with points earned from clearing puzzles, or a quick ad.",
    ],
    rulesLink: "See full rules & scoring",
    cta: "Start Playing",
  },
};

export default function OnboardingIntro({ onDismiss }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <Feather size={22} color="#B23A2E" />
        <div style={styles.title}>{t.title}</div>
        <ol style={styles.list}>
          {t.lines.map((line, i) => (
            <li key={i} style={styles.listItem}>{line}</li>
          ))}
        </ol>
        <a href={`#${buildHashRoute("rules")}`} style={styles.rulesLink}>
          {t.rulesLink}
        </a>
        <button onClick={onDismiss} style={styles.cta}>
          {t.cta}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(43,42,40,0.5)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    padding: 20,
  },
  card: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.18)",
    borderRadius: 6,
    padding: "28px 26px",
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
    boxShadow: "0 24px 60px rgba(43,42,40,0.3)",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 3,
    margin: "10px 0 16px",
    color: "#B23A2E",
  },
  list: {
    textAlign: "left",
    margin: 0,
    padding: "0 0 0 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#5A564C",
    fontFamily: "'Noto Serif TC', serif",
  },
  rulesLink: {
    display: "inline-block",
    marginTop: 16,
    fontSize: 12,
    color: "#4C5B6E",
    textDecoration: "underline",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
  },
  cta: {
    display: "block",
    width: "100%",
    marginTop: 18,
    padding: "12px 0",
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
