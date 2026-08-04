import { useState } from "react";
import { Home, Feather, ChevronDown, Lock, Search, Crosshair, Wand2, Route, Snowflake, Hammer } from "lucide-react";
import { COLORS, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "./LangToggle.jsx";
import { CHAPTERS, CHAPTER_MILESTONE, SCORE_MILESTONE_INTERVAL } from "../engine/chapters.mjs";
import {
  MAGNIFIER_COST, ROOT_CAUSE_COST, RELAY_COST, PREVIEW_COST, FREEZE_COST, HAMMER_COST,
  TOOL_UNLOCK_CHAPTER_INDEX,
} from "../toolUnlock.js";
import { highestUnlockedChapterIndex } from "../chapterProgress.js";
import { DAILY_BASE_REWARD, DAILY_STREAK_BONUS_PER_DAY, DAILY_STREAK_BONUS_CAP } from "../engine/dailyReward.mjs";
import { PAST_DAY_UNLOCK_COST } from "../dailyUnlock.js";
import { SHARE_REWARD } from "../daily/shareReward.js";

/* ---------------------------------------------------------
   v3.6: rewritten from one long static wall of text into a
   page of collapsed-by-default sections (tap a heading to
   read its detail, one section open at a time) — the tools
   section additionally nests its own per-tool accordion, so
   each of the 6 tools shows just an icon + one-line summary
   until tapped, and locked tools show a lock + which chapter
   unlocks them instead of the full description.
--------------------------------------------------------- */

const TOOL_ICONS = { freeze: Snowflake, magnifier: Search, preview: Route, rootCause: Crosshair, hammer: Hammer, relay: Wand2 };
const TOOL_ORDER = ["freeze", "magnifier", "preview", "rootCause", "hammer", "relay"];

const TEXT = {
  zh: {
    brandTag: "Daily · Ink · Path",
    title: "玩法說明",
    home: "主畫面",
    sections: [
      {
        key: "goal",
        heading: "目標與操作",
        body: [
          "依序連接數字 1 → N，8 個方向（含斜角）皆可移動；按住拖曳可一筆畫完整條路徑。",
          "點擊「1」開始，之後依序點下一個數字。回退可撤銷上一步；重來可重新挑戰同一題（不會換題）。",
          "左側可查看目前積分；右側是可解鎖的道具，會隨章節進度陸續開放。",
        ],
      },
      {
        key: "chapters",
        heading: "大關卡與小關卡",
        body: [
          "常規關卡依棋盤大小分成「大關卡」，每個大關卡內的「小關卡」是即時產生、無限的。",
          `每個大關卡通關 ${CHAPTER_MILESTONE} 次後，線索密度會降到最低（最難），同時解鎖下一個大關卡；之後小關卡仍可無限挑戰下去，關卡序號會持續累加。`,
        ],
      },
      {
        key: "score",
        heading: "積分規則",
        body: [
          `常規關卡：每次完成都會依表現計分並存入積分——基礎分 +5；速度（標準時間 70% 內 +6、100% 內 +3）；準確度（零失誤 +4、1-2 次失誤 +2）；無提示（全程未使用任何道具，+3）；里程碑（同一大關卡每累積 ${SCORE_MILESTONE_INTERVAL} 次通關 +15）。`,
          `每日挑戰：完成當天題目固定獲得 ${DAILY_BASE_REWARD} 積分，並依目前連續天數增加——每多一天連續紀錄 +${DAILY_STREAK_BONUS_PER_DAY} 積分，最多額外 +${DAILY_STREAK_BONUS_CAP} 分。重點在養成習慣、堅持越久獎勵越多，不在比較單次表現。`,
          `分享每日挑戰成績：每天首次分享可獲得 +${SHARE_REWARD} 積分，同一天內重複分享不會再次發放。`,
          "積分可在道具解鎖時花費，或直接累積查看成長。",
        ],
      },
      {
        key: "daily",
        heading: "每日挑戰",
        body: [
          "每天一道固定題目，全球玩家同一天看到相同的題目。連續完成可累積🔥連續天數；只要斷的是昨天，隨時都能「救回」，次數不限，也可以分享成績賺積分。",
          `今日的題目一律可直接遊玩；今日以前的題目都需要先解鎖——花費 ${PAST_DAY_UNLOCK_COST} 積分或看一段短片，解鎖後即可永久查看該日。已經完成過的題目解鎖後只能查看成績，無法重複挑戰；尚未完成的題目解鎖後則可正常遊玩一次。`,
        ],
      },
    ],
    toolsHeading: "道具一覽",
    toolsIntro: "卡關提醒：免費、被動——如果目前走法已經無法完成，停頓幾秒後系統會提醒你，說明可能需要回退或重來一次。以下 6 種道具皆可花積分或看一段短片解鎖，會隨大關卡進度陸續開放；使用任一種都會讓「無提示」加分失效。同一種道具用積分連續購買會愈來愈貴（每次 +30%），可花積分或看廣告把價格重置回原價；看廣告解鎖則完全不受影響。",
    lockedAt: (label) => `${label} 章節解鎖`,
    tools: {
      magnifier: { name: "放大鏡", short: "查看盤面上任一格的正確數字。", detail: `起價 ${MAGNIFIER_COST} 積分：查看盤面上任一格的正確數字。` },
      rootCause: { name: "溯源符", short: "找出最後一個仍可解開的步驟，建議回到第幾步。", detail: `起價 ${ROOT_CAUSE_COST} 積分：找出目前走法最後一個仍可解開的步驟，並明確建議回到第幾步重新開始。` },
      relay: { name: "接力筆", short: "直接幫你畫出下一步。", detail: `起價 ${RELAY_COST} 積分：直接幫你畫出下一步，是唯一會自動前進的道具。` },
      preview: { name: "引路符", short: "預覽接下來 3 步的走向。", detail: `起價 ${PREVIEW_COST} 積分：預覽接下來 3 步的走向（不顯示數字）。` },
      freeze: { name: "靜心符", short: "立即減少 15 秒已耗費時間。", detail: `起價 ${FREEZE_COST} 積分：立即減少 15 秒已耗費時間，幫助達成速度加分。` },
      hammer: { name: "錘子", short: "移除盤面上一個固定數字。", detail: `起價 ${HAMMER_COST} 積分：移除盤面上一個原本固定顯示的數字（起點與終點除外），讓你自己安排怎麼連過去。` },
    },
  },
  en: {
    brandTag: "Daily · Ink · Path",
    title: "How to Play",
    home: "Home",
    sections: [
      {
        key: "goal",
        heading: "Goal & Controls",
        body: [
          "Connect numbers 1 → N in order — 8-directional moves including diagonals. Press and hold to draw the whole stroke in one go.",
          "Tap “1” to start, then tap the next number in sequence. Undo steps back one move; Retry restarts the same puzzle (not a new one).",
          "The left rail shows your current points; the right rail holds tools that open up gradually as you progress through chapters.",
        ],
      },
      {
        key: "chapters",
        heading: "Chapters & Levels",
        body: [
          "Regular levels are grouped into chapters by board size. Levels inside a chapter are generated on demand — effectively infinite.",
          `Clearing a chapter ${CHAPTER_MILESTONE} times drops clue density to its floor (hardest) and unlocks the next chapter; you can keep clearing levels in that chapter indefinitely afterward, with the level count still climbing.`,
        ],
      },
      {
        key: "score",
        heading: "Scoring",
        body: [
          `Regular levels: every clear earns points based on performance — base +5; speed (+6 within 70% of par time, +3 within 100%); accuracy (+4 for zero mistakes, +2 for 1-2); no-hint (+3 if no tool was used); milestone (+15 every ${SCORE_MILESTONE_INTERVAL}th clear within the same chapter).`,
          `Daily Challenge: ${DAILY_BASE_REWARD} points for finishing the day's puzzle, plus a bonus that grows with your current streak — +${DAILY_STREAK_BONUS_PER_DAY} per additional streak day, up to +${DAILY_STREAK_BONUS_CAP} extra. Rewards the habit and sticking with it, not any single day's result.`,
          `Sharing a Daily Challenge result: the first share each day earns +${SHARE_REWARD} points; sharing again the same day doesn't pay out twice.`,
          "Points can be spent unlocking tools, or simply watched grow over time.",
        ],
      },
      {
        key: "daily",
        heading: "Daily Challenge",
        body: [
          "One fixed puzzle a day, the same for every player worldwide. Completing it builds your 🔥 streak; as long as the break was just yesterday, you can rescue it anytime, with no limit on how often — and results can be shared for points.",
          `Today's puzzle is always open. Any earlier date needs a one-time unlock — spend ${PAST_DAY_UNLOCK_COST} points or watch a short ad — after which that day stays open for good. A day you'd already completed can only be reviewed once unlocked, not replayed; a day you never finished can still be played through once unlocked.`,
        ],
      },
    ],
    toolsHeading: "Tools",
    toolsIntro: "Stuck Reminder: free, passive — if your current path can no longer be completed, the game lets you know after a short pause. The 6 tools below can all be unlocked with points or a short ad, opening up gradually as you clear more chapters; using any of them forfeits the no-hint bonus. Buying the same tool with points repeatedly makes it pricier each time (+30% per purchase) — you can spend points or watch an ad to reset that price back down; watching an ad to unlock is always unaffected.",
    lockedAt: (label) => `Unlocks in the ${label} chapter`,
    tools: {
      magnifier: { name: "Magnifier", short: "Reveal the correct number for any cell.", detail: `From ${MAGNIFIER_COST} pts: reveal the correct number for any cell on the board.` },
      rootCause: { name: "Root Cause", short: "Finds the last solvable step, tells you where to rewind to.", detail: `From ${ROOT_CAUSE_COST} pts: finds the last still-solvable step in your path and names exactly which step to rewind to.` },
      relay: { name: "Relay Brush", short: "Places the next correct cell for you.", detail: `From ${RELAY_COST} pts: places the next correct cell for you — the only tool that actually advances the path.` },
      preview: { name: "Guide Talisman", short: "Preview the next 3 cells.", detail: `From ${PREVIEW_COST} pts: preview the next 3 cells in sequence (no numbers shown).` },
      freeze: { name: "Stillness Talisman", short: "Refunds 15s off your time.", detail: `From ${FREEZE_COST} pts: instantly refunds 15s off your counted time, helping the speed bonus.` },
      hammer: { name: "Hammer", short: "Removes one fixed number from the board.", detail: `From ${HAMMER_COST} pts: removes one of the board's originally fixed numbers (start/end excluded), leaving you to route through it yourself.` },
    },
  },
};

export default function RulesPage({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [openKey, setOpenKey] = useState(null);
  const [openTool, setOpenTool] = useState(null);
  const unlockedIdx = highestUnlockedChapterIndex();

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
          {t.sections.map((section) => {
            const isOpen = openKey === section.key;
            return (
              <div key={section.key} style={styles.section}>
                <button
                  onClick={() => setOpenKey(isOpen ? null : section.key)}
                  style={styles.sectionHeadBtn}
                  aria-expanded={isOpen}
                >
                  <span style={styles.heading}>{section.heading}</span>
                  <ChevronDown size={16} color="#B23A2E" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
                </button>
                {isOpen && section.body.map((para, i) => (
                  <p key={i} style={styles.para}>{para}</p>
                ))}
              </div>
            );
          })}

          <div style={styles.section}>
            <button
              onClick={() => setOpenKey(openKey === "tools" ? null : "tools")}
              style={styles.sectionHeadBtn}
              aria-expanded={openKey === "tools"}
            >
              <span style={styles.heading}>{t.toolsHeading}</span>
              <ChevronDown size={16} color="#B23A2E" style={{ transform: openKey === "tools" ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
            </button>
            {openKey === "tools" && (
              <>
                <p style={styles.para}>{t.toolsIntro}</p>
                <div style={styles.toolList}>
                  {TOOL_ORDER.map((key, i) => {
                    const Icon = TOOL_ICONS[key];
                    const copy = t.tools[key];
                    const requiredIdx = TOOL_UNLOCK_CHAPTER_INDEX[key] ?? 0;
                    const locked = unlockedIdx < requiredIdx;
                    const toolOpen = openTool === key;
                    const size = CHAPTERS[requiredIdx];
                    const isLast = i === TOOL_ORDER.length - 1;
                    return (
                      <div
                        key={key}
                        style={{
                          ...styles.toolCard,
                          ...(isLast ? {} : styles.toolCardDivider),
                          ...(locked ? styles.toolCardLocked : {}),
                        }}
                      >
                        <button
                          onClick={() => !locked && setOpenTool(toolOpen ? null : key)}
                          style={styles.toolHeadBtn}
                          aria-expanded={toolOpen}
                          disabled={locked}
                        >
                          {locked ? <Lock size={16} color="#8B8478" /> : <Icon size={16} color="#8B6A32" />}
                          <span style={styles.toolName}>{copy.name}</span>
                          <span style={styles.toolOneLiner}>{locked ? t.lockedAt(`${size}×${size}`) : copy.short}</span>
                        </button>
                        {toolOpen && !locked && <p style={styles.toolDetail}>{copy.detail}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
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
    gap: 12,
    textAlign: "left",
  },
  section: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.14)",
    borderRadius: 8,
    padding: "4px 18px",
  },
  sectionHeadBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: "transparent",
    border: "none",
    padding: "12px 0",
    cursor: "pointer",
    textAlign: "left",
  },
  heading: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#B23A2E",
    letterSpacing: 1,
  },
  para: {
    fontSize: 13,
    lineHeight: 1.65,
    color: "#5A564C",
    margin: "0 0 12px",
  },
  toolList: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  },
  toolCard: {
    padding: "0 2px",
  },
  toolCardDivider: {
    borderBottom: "1px solid rgba(43,42,40,0.10)",
  },
  toolCardLocked: {
    opacity: 0.7,
  },
  toolHeadBtn: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "transparent",
    border: "none",
    padding: "9px 0",
    cursor: "pointer",
    textAlign: "left",
  },
  toolName: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#2B2A28",
    flex: "0 0 auto",
  },
  toolOneLiner: {
    fontSize: 11.5,
    color: "#8B8478",
    fontFamily: "'EB Garamond', serif",
    flex: "1 1 auto",
    minWidth: 0,
    lineHeight: 1.4,
  },
  toolDetail: {
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "#5A564C",
    margin: "0 0 10px",
  },
};
