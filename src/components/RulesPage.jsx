import { Home, Feather } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import { CHAPTER_MILESTONE } from "../engine/chapters.mjs";
import { MAGNIFIER_COST, ROOT_CAUSE_COST, RELAY_COST, PREVIEW_COST, FREEZE_COST } from "../toolUnlock.js";
import { DAILY_BASE_REWARD, DAILY_STREAK_BONUS_PER_DAY, DAILY_STREAK_BONUS_CAP } from "../engine/dailyReward.mjs";

const TEXT = {
  zh: {
    brandTag: "Daily · Ink · Path",
    title: "玩法說明",
    home: "主畫面",
    sections: [
      {
        heading: "目標與操作",
        body: [
          "依序連接數字 1 → N，8 個方向（含斜角）皆可移動；按住拖曳可一筆畫完整條路徑。",
          "點擊「1」開始，之後依序點下一個數字。回退可撤銷上一步；重來可重新挑戰同一題（不會換題）。",
          `左側可放大／縮小盤面顯示、查看目前積分；右側是 5 種可解鎖的道具。`,
        ],
      },
      {
        heading: "大關卡與小關卡",
        body: [
          "常規關卡依棋盤大小分成「大關卡」，每個大關卡內的「小關卡」是即時產生、無限的。",
          `每個大關卡通關 ${CHAPTER_MILESTONE} 次後，線索密度會降到最低（最難），同時解鎖下一個大關卡；之後小關卡仍可無限挑戰下去，關卡序號會持續累加。`,
        ],
      },
      {
        heading: "積分規則",
        body: [
          "常規關卡：每次完成都會依表現計分並存入積分——基礎分 +10；速度（標準時間 70% 內 +10、100% 內 +5）；準確度（零失誤 +5、1-2 次失誤 +2）；無提示（全程未使用任何道具，含自動提示，+5）；里程碑（同一大關卡每累積 10 次通關 +30）。",
          `每日挑戰：完成當天題目固定獲得 ${DAILY_BASE_REWARD} 積分，並依目前連續天數增加——每多一天連續紀錄 +${DAILY_STREAK_BONUS_PER_DAY} 積分，最多額外 +${DAILY_STREAK_BONUS_CAP} 分。重點在養成習慣、堅持越久獎勵越多，不在比較單次表現。`,
          "積分可在道具解鎖時花費，或直接累積查看成長。",
        ],
      },
      {
        heading: "道具一覽",
        body: [
          "提示：免費、自動——停下來幾秒後系統會自動標出下一步，不用按任何按鈕。",
          `放大鏡（起價 ${MAGNIFIER_COST} 積分）：查看盤面上任一格的正確數字。`,
          `溯源符（起價 ${ROOT_CAUSE_COST} 積分）：找出目前走法最後一個仍可解開的步驟。`,
          `接力筆（起價 ${RELAY_COST} 積分）：直接幫你畫出下一步，是唯一會自動前進的道具。`,
          `引路符（起價 ${PREVIEW_COST} 積分）：預覽接下來 3 步的走向（不顯示數字）。`,
          `靜心符（起價 ${FREEZE_COST} 積分）：立即減少 15 秒已耗費時間，幫助達成速度加分。`,
          "以上道具皆可花積分或看一段短片解鎖；使用任一種都會讓「無提示」加分失效。",
          "同一種道具用積分連續購買會愈來愈貴（每次 +20%）；看廣告解鎖則不受影響，價格永遠不變。",
        ],
      },
      {
        heading: "每日挑戰",
        body: [
          "每天一道固定題目，全球玩家同一天看到相同的題目。連續完成可累積🔥連續天數，每月有一次「救回」機會挽回中斷的紀錄，也可以分享成績。",
        ],
      },
    ],
  },
  en: {
    brandTag: "Daily · Ink · Path",
    title: "How to Play",
    home: "Home",
    sections: [
      {
        heading: "Goal & Controls",
        body: [
          "Connect numbers 1 → N in order — 8-directional moves including diagonals. Press and hold to draw the whole stroke in one go.",
          "Tap “1” to start, then tap the next number in sequence. Undo steps back one move; Retry restarts the same puzzle (not a new one).",
          "The left rail zooms the board in/out and shows your current points; the right rail holds 5 unlockable tools.",
        ],
      },
      {
        heading: "Chapters & Levels",
        body: [
          "Regular levels are grouped into chapters by board size. Levels inside a chapter are generated on demand — effectively infinite.",
          `Clearing a chapter ${CHAPTER_MILESTONE} times drops clue density to its floor (hardest) and unlocks the next chapter; you can keep clearing levels in that chapter indefinitely afterward, with the level count still climbing.`,
        ],
      },
      {
        heading: "Scoring",
        body: [
          "Regular levels: every clear earns points based on performance — base +10; speed (+10 within 70% of par time, +5 within 100%); accuracy (+5 for zero mistakes, +2 for 1-2); no-hint (+5 if no tool, including the automatic hint, was used); milestone (+30 every 10th clear within the same chapter).",
          `Daily Challenge: ${DAILY_BASE_REWARD} points for finishing the day's puzzle, plus a bonus that grows with your current streak — +${DAILY_STREAK_BONUS_PER_DAY} per additional streak day, up to +${DAILY_STREAK_BONUS_CAP} extra. Rewards the habit and sticking with it, not any single day's result.`,
          "Points can be spent unlocking tools, or simply watched grow over time.",
        ],
      },
      {
        heading: "Tools",
        body: [
          "Hint: free and automatic — auto-marks your next move a few seconds after you pause, no button needed.",
          `Magnifier (from ${MAGNIFIER_COST} pts): reveal the correct number for any cell on the board.`,
          `Root Cause (from ${ROOT_CAUSE_COST} pts): find the last step in your current path that's still solvable.`,
          `Relay Brush (from ${RELAY_COST} pts): places the next correct cell for you — the only tool that actually advances the path.`,
          `Guide Talisman (from ${PREVIEW_COST} pts): preview the next 3 cells in sequence (no numbers shown).`,
          `Stillness Talisman (from ${FREEZE_COST} pts): instantly refunds 15s off your counted time, helping the speed bonus.`,
          "Every tool above can be unlocked with points or by watching a short ad; using any of them forfeits the no-hint bonus.",
          "Buying the same tool with points repeatedly makes it pricier each time (+20% per purchase); watching an ad instead is unaffected — always the same price.",
        ],
      },
      {
        heading: "Daily Challenge",
        body: [
          "One fixed puzzle a day, the same for every player worldwide. Completing it builds your 🔥 streak; one rescue is available per month if you break it, and results can be shared.",
        ],
      },
    ],
  },
};

export default function RulesPage({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];

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

        <div style={styles.sections}>
          {t.sections.map((section) => (
            <div key={section.heading} style={styles.section}>
              <div style={styles.heading}>{section.heading}</div>
              {section.body.map((para, i) => (
                <p key={i} style={styles.para}>{para}</p>
              ))}
            </div>
          ))}
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
    padding: "56px 20px 40px",
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
  sections: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 22,
    textAlign: "left",
  },
  section: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.14)",
    borderRadius: 8,
    padding: "16px 18px",
  },
  heading: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#B23A2E",
    marginBottom: 8,
    letterSpacing: 1,
  },
  para: {
    fontSize: 13,
    lineHeight: 1.65,
    color: "#5A564C",
    margin: "0 0 8px",
  },
};
