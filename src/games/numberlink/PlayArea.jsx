import { useState, useEffect, useCallback } from "react";
import { Undo2, RotateCcw, Search, Crosshair, Wand2, Route, Snowflake, Hammer, Coins } from "lucide-react";
import { useLanguage } from "../../i18n.jsx";
import Board from "./Board.jsx";
import ToolUnlockSheet from "./ToolUnlockSheet.jsx";
import ToolIntroModal from "./ToolIntroModal.jsx";
import { getPointsBalance } from "../../pointsWallet.js";
import {
  MAGNIFIER_COST, ROOT_CAUSE_COST, RELAY_COST, PREVIEW_COST, FREEZE_COST, HAMMER_COST,
  unlockViaAd, unlockViaPoints, getToolCost, getToolPurchaseCount,
  canResetEscalation, getResetEscalationCost, resetEscalationViaAd, resetEscalationViaPoints,
  isToolUnlockedAtChapterIndex,
} from "../../toolUnlock.js";
import { hasSeenToolIntro, markToolIntroSeen } from "../../toolIntroSeen.js";
import { bumpUndoRestartUsage } from "../../undoRestartAdCounter.js";
import { bumpRetryUsage } from "../../retryAdCounter.js";
import { showInterstitialIfConsented } from "../../interstitialAd.js";
import { track } from "../../analytics.js";
import { isDesktopViewport } from "../../deviceUtil.js";

/* ---------------------------------------------------------
   Shared in-game play surface (v3.2): left rail (points),
   board column (start hint / stuck banner / Board), right
   rail (6 paid tools), bottom row (回退/重來). One
   implementation for both NumberLink.jsx and Daily.jsx so the
   two never drift apart again — Daily was the layout baseline.

   v3.6: tools now unlock progressively by chapter progress
   (unlockedChapterIndex), 錘子 (hammer) joins the tool rail,
   root-cause surfaces which step to rewind to, a faint ghost
   of the pre-undo/retry path is shown until the level is won,
   and every 5th 回退/重來 click is an interstitial-ad beat.

   Owns all tool-unlock UI state itself; callers just hand it
   the session from useGameSession() plus a few small flags.
--------------------------------------------------------- */

const TOOL_ORDER = ["freeze", "magnifier", "preview", "rootCause", "hammer", "relay"];
const TOOL_ICONS = { freeze: Snowflake, magnifier: Search, preview: Route, rootCause: Crosshair, hammer: Hammer, relay: Wand2 };
const TOOL_COSTS = { magnifier: MAGNIFIER_COST, rootCause: ROOT_CAUSE_COST, relay: RELAY_COST, preview: PREVIEW_COST, freeze: FREEZE_COST, hammer: HAMMER_COST };

const TEXT = {
  zh: {
    undo: "回退",
    retry: "重來",
    retryRemaining: (n) => (n > 0 ? `今日還可重來 ${n} 次` : "今日重來次數已用完"),
    startHint: "點擊「1」開始畫線",
    pointsLabel: "積分",
    stuckPrompt: "目前走法已經卡住了，建議回退或重來一次",
    useToolBtn: "使用道具",
    dismissBtn: "忽略",
    cancelBtn: "取消",
    watchAd: "看廣告解鎖",
    spendPointsBtn: (cost) => `花費 ${cost} 積分解鎖`,
    balanceLabel: (bal) => `目前積分 ${bal}`,
    insufficientPoints: "積分不足",
    rootCauseSuggest: (n) => `溯源符：建議回到第 ${n} 步重新開始`,
    lockedTitle: (chapterLabel) => `${chapterLabel} 章節解鎖`,
    resetLabel: "已連續購買，價格已上漲",
    resetWatchAd: "看廣告重置價格",
    resetSpendPoints: (cost) => `花費 ${cost} 積分重置價格`,
    hammerHint: "點擊盤面上任一固定數字，將它移除",
    tools: {
      magnifier: {
        name: "放大鏡", short: "放大鏡", title: "解鎖放大鏡",
        ad: "觀看一段小短片以解鎖放大鏡？（P0 暫以此對話框代替廣告）",
        intro: "查看盤面上任一格的正確數字。",
      },
      rootCause: {
        name: "溯源符", short: "溯源符", title: "解鎖溯源符",
        ad: "觀看一段小短片以解鎖溯源符？（P0 暫以此對話框代替廣告）",
        intro: "找出目前走法最後一個仍可解開的步驟，並建議回到第幾步。",
      },
      relay: {
        name: "接力筆", short: "接力筆", title: "解鎖接力筆",
        ad: "觀看一段小短片以解鎖接力筆？（P0 暫以此對話框代替廣告）",
        intro: "直接幫你畫出下一步，是唯一會自動前進的道具。",
      },
      preview: {
        name: "引路符", short: "引路符", title: "解鎖引路符",
        ad: "觀看一段小短片以解鎖引路符？（P0 暫以此對話框代替廣告）",
        intro: "預覽接下來 3 步的走向（不顯示數字）。",
      },
      freeze: {
        name: "靜心符", short: "靜心符", title: "解鎖靜心符",
        ad: "觀看一段小短片以解鎖靜心符？（P0 暫以此對話框代替廣告）",
        intro: "立即減少 15 秒已耗費時間，幫助達成速度加分。",
      },
      hammer: {
        name: "錘子", short: "錘子", title: "解鎖錘子",
        ad: "觀看一段小短片以解鎖錘子？（P0 暫以此對話框代替廣告）",
        intro: "移除盤面上一個固定數字，讓你自己安排怎麼連過去。",
      },
    },
  },
  en: {
    undo: "Undo",
    retry: "Retry",
    retryRemaining: (n) => (n > 0 ? `${n} retries left today` : "No retries left today"),
    startHint: "Tap “1” to start drawing",
    pointsLabel: "Points",
    stuckPrompt: "This path is stuck — try undo or retry",
    useToolBtn: "Use tool",
    dismissBtn: "Dismiss",
    cancelBtn: "Cancel",
    watchAd: "Watch ad to unlock",
    spendPointsBtn: (cost) => `Spend ${cost} points`,
    balanceLabel: (bal) => `${bal} points available`,
    insufficientPoints: "Not enough points",
    rootCauseSuggest: (n) => `Trace: rewind to step ${n} and restart from there`,
    lockedTitle: (chapterLabel) => `Unlocks in the ${chapterLabel} chapter`,
    resetLabel: "Price has climbed from repeat purchases",
    resetWatchAd: "Watch ad to reset price",
    resetSpendPoints: (cost) => `Spend ${cost} points to reset price`,
    hammerHint: "Tap any fixed number on the board to remove it",
    tools: {
      magnifier: {
        name: "Magnifier", short: "Magnify", title: "Unlock Magnifier",
        ad: "Watch a short clip to unlock the magnifier? (P0 stand-in for the rewarded ad)",
        intro: "Reveal the correct number for any cell on the board.",
      },
      rootCause: {
        name: "Trace", short: "Trace", title: "Unlock Trace",
        ad: "Watch a short clip to unlock trace? (P0 stand-in for the rewarded ad)",
        intro: "Finds the last still-solvable step in your path, and suggests which step to rewind to.",
      },
      relay: {
        name: "Relay Brush", short: "Relay", title: "Unlock Relay Brush",
        ad: "Watch a short clip to unlock the relay brush? (P0 stand-in for the rewarded ad)",
        intro: "Places the next correct cell for you — the only tool that advances the path.",
      },
      preview: {
        name: "Guide Talisman", short: "Guide", title: "Unlock Guide Talisman",
        ad: "Watch a short clip to unlock the guide talisman? (P0 stand-in for the rewarded ad)",
        intro: "Preview the next 3 cells in sequence (no numbers shown).",
      },
      freeze: {
        name: "Stillness Talisman", short: "Stillness", title: "Unlock Stillness Talisman",
        ad: "Watch a short clip to unlock the stillness talisman? (P0 stand-in for the rewarded ad)",
        intro: "Instantly refunds 15s off your counted time, helping the speed bonus.",
      },
      hammer: {
        name: "Hammer", short: "Hammer", title: "Unlock Hammer",
        ad: "Watch a short clip to unlock the hammer? (P0 stand-in for the rewarded ad)",
        intro: "Removes one of the board's fixed numbers, freeing you to route through it yourself.",
      },
    },
  },
};

export default function PlayArea({
  session, showTools = true, toolContext = "tutorial", onRestart, restartsRemaining = null,
  unlockedChapterIndex = Infinity, chapterUnlockLabel,
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const {
    puzzle, filledOrder, filledSet, candidateSet, won,
    shakeKey, revealedCell, rootCause, previewCells, stuckBannerVisible, previousPath,
    advanceTo, undo, restart, revealCell, traceRootCause, placeNextCell, previewPath, freezeTime, hammerClue, dismissStuckBanner,
  } = session;

  const [magnifierMode, setMagnifierMode] = useState(false);
  const [hammerMode, setHammerMode] = useState(false);
  const [unlockTool, setUnlockTool] = useState(null); // one of TOOL_ORDER | null
  const [unlockError, setUnlockError] = useState(null);
  const [liveBalance, setLiveBalance] = useState(() => getPointsBalance());
  // Bumped whenever a tool-intro modal is dismissed, just to force this
  // component to re-check hasSeenToolIntro() (which reads localStorage, not
  // React state) on the next render.
  const [, setIntroSeenTick] = useState(0);

  // Re-read the wallet balance fresh each time the picker opens rather than
  // trusting the useState initializer's one-time snapshot (points may have
  // been earned since this screen mounted).
  useEffect(() => {
    if (unlockTool != null) setLiveBalance(getPointsBalance());
  }, [unlockTool]);

  const closeUnlockSheet = useCallback(() => {
    setUnlockTool(null);
    setUnlockError(null);
  }, []);

  const applyToolUnlock = useCallback(
    (toolKey) => {
      track("tool_unlocked", { tool: toolKey, context: toolContext });
      if (toolKey === "magnifier") setMagnifierMode(true);
      else if (toolKey === "rootCause") traceRootCause();
      else if (toolKey === "relay") placeNextCell();
      else if (toolKey === "preview") previewPath();
      else if (toolKey === "freeze") freezeTime();
      else if (toolKey === "hammer") setHammerMode(true);
      closeUnlockSheet();
    },
    [toolContext, traceRootCause, placeNextCell, previewPath, freezeTime, closeUnlockSheet]
  );

  const handleWatchAd = useCallback(() => {
    if (!unlockTool) return;
    if (unlockViaAd(t.tools[unlockTool].ad)) applyToolUnlock(unlockTool);
  }, [unlockTool, t, applyToolUnlock]);

  const handleSpendPoints = useCallback(() => {
    if (!unlockTool) return;
    if (unlockViaPoints(unlockTool, TOOL_COSTS[unlockTool])) {
      setLiveBalance(getPointsBalance());
      applyToolUnlock(unlockTool);
    } else {
      setUnlockError(t.insufficientPoints);
    }
  }, [unlockTool, applyToolUnlock, t]);

  // v3.6: once a tool's point-price has escalated from repeat purchases,
  // offer a way to clear that markup on demand (watch an ad, or pay a steep
  // multiple of the current price) instead of only ever waiting it out.
  const handleResetViaAd = useCallback(() => {
    if (!unlockTool) return;
    if (resetEscalationViaAd(t.tools[unlockTool].ad, unlockTool)) setLiveBalance(getPointsBalance());
  }, [unlockTool, t]);

  const handleResetViaPoints = useCallback(() => {
    if (!unlockTool) return;
    if (resetEscalationViaPoints(unlockTool, TOOL_COSTS[unlockTool])) {
      setLiveBalance(getPointsBalance());
    } else {
      setUnlockError(t.insufficientPoints);
    }
  }, [unlockTool, t]);

  // Ctrl+Z / Cmd+Z undo, desktop-only (≥769px) — centralized here since
  // 回退 now lives in PlayArea for both screens instead of being
  // duplicated per screen.
  useEffect(() => {
    if (!showTools) return undefined;
    const onKeyDown = (e) => {
      const isUndoShortcut = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === "z" || e.key === "Z");
      if (!isUndoShortcut || !isDesktopViewport()) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      if (filledOrder.length === 0 || won) return;
      e.preventDefault();
      handleUndoClick();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTools, filledOrder.length, won]);

  // Shared "every 5th 回退/重來 click, regardless of which button" ad beat
  // (v3.6) — deliberately independent of interstitialAd.js's own per-clear
  // frequency cap, since this trigger has its own counter.
  const bumpAndMaybeShowAd = useCallback(() => {
    if (bumpUndoRestartUsage()) showInterstitialIfConsented({ trigger: "undo_restart" });
  }, []);

  const handleUndoClick = useCallback(() => {
    undo();
    bumpAndMaybeShowAd();
  }, [undo, bumpAndMaybeShowAd]);

  const handleRestartClick = useCallback(() => {
    (onRestart || restart)();
    bumpAndMaybeShowAd();
    // v3.8: 重來 additionally has its own every-3rd-use ad cadence, on top
    // of (not instead of) the shared every-5th-回退/重來 counter above —
    // see retryAdCounter.js for why these are two separate counters.
    if (bumpRetryUsage()) showInterstitialIfConsented({ trigger: "retry" });
  }, [onRestart, restart, bumpAndMaybeShowAd]);

  const dismissToolIntro = useCallback((toolKey) => {
    markToolIntroSeen(toolKey);
    setIntroSeenTick((v) => v + 1);
  }, []);

  if (!puzzle) return null;

  // Current points cost for each tool, escalated by how many times it's
  // already been points-bought (see toolUnlock.js's getToolCost) — always
  // computed fresh at render time, not cached, so a purchase's price bump
  // shows up immediately on the very next render.
  const liveCost = (key) => getToolCost(TOOL_COSTS[key], key);
  const TOOL_DISABLED = {
    magnifier: won,
    rootCause: won || filledOrder.length < 2,
    // Blocked while the position is a confirmed dead end (stuckBannerVisible)
    // so a player can't spend points on an auto-place that has nowhere valid
    // to place — unlike the mark-only tools, 接力筆 does nothing in that case.
    relay: won || stuckBannerVisible || filledOrder.length >= puzzle.total,
    preview: won,
    freeze: won,
    hammer: won,
  };
  const TOOL_LOCKED = {};
  TOOL_ORDER.forEach((key) => {
    TOOL_LOCKED[key] = !isToolUnlockedAtChapterIndex(key, unlockedChapterIndex);
  });
  const rootCauseUnlocked = !TOOL_LOCKED.rootCause;
  // Only one intro bubble at a time (v3.7): the tool row is now a wrapping
  // grid instead of a single vertical rail, so multiple simultaneous
  // bubbles (e.g. 靜心符/放大鏡 unlocking together on chapter 0) would land
  // in adjacent columns/rows and overlap into unreadable text. Showing just
  // the earliest not-yet-seen tool turns it into a one-at-a-time guided
  // tour instead — dismissing one reveals the next.
  const nextIntroTool = TOOL_ORDER.find((key) => !TOOL_LOCKED[key] && !hasSeenToolIntro(key));

  const openUnlockSheet = (key) => {
    if (TOOL_LOCKED[key]) return;
    setUnlockTool(key);
  };

  const purchaseCount = unlockTool ? getToolPurchaseCount(unlockTool) : 0;
  const resetInfo =
    unlockTool && canResetEscalation(unlockTool)
      ? {
          label: t.resetLabel,
          cost: getResetEscalationCost(TOOL_COSTS[unlockTool], unlockTool),
          watchAdLabel: t.resetWatchAd,
          spendPointsLabel: t.resetSpendPoints,
          onWatchAd: handleResetViaAd,
          onSpendPoints: handleResetViaPoints,
        }
      : null;

  return (
    <>
      {showTools && (
        <div style={styles.topBar}>
          <div style={styles.pointsChip} title={t.pointsLabel} aria-label={t.pointsLabel}>
            <Coins size={14} color="#B8925A" />
            <span>{liveBalance}</span>
          </div>
        </div>
      )}

      <div style={styles.boardColumn}>
        {filledOrder.length === 0 && !won && <div style={styles.startHint}>{t.startHint}</div>}
        {showTools && hammerMode && <div style={styles.hammerHint}>{t.hammerHint}</div>}
        {showTools && stuckBannerVisible && (
          <div style={styles.stuckBanner}>
            <span>{t.stuckPrompt}</span>
            <div style={styles.stuckActions}>
              {rootCauseUnlocked && (
                <button onClick={() => openUnlockSheet("rootCause")} style={styles.stuckBtn}>{t.useToolBtn}</button>
              )}
              <button onClick={handleUndoClick} style={styles.stuckBtn}>{t.undo}</button>
              <button onClick={dismissStuckBanner} style={styles.stuckBtnGhost}>{t.dismissBtn}</button>
            </div>
          </div>
        )}
        {/* 溯源符 (v3.6): now names the exact step to rewind to, instead of
            only marking the suggested next cell on the board. The free
            stuck banner above stays deliberately vague ("it's stuck") —
            this detail is the paid tool's payoff. */}
        {showTools && rootCause && (
          <div style={styles.rootCauseCaption}>{t.rootCauseSuggest(rootCause.lastGoodStep)}</div>
        )}

        <Board
          puzzle={puzzle}
          filledOrder={filledOrder}
          filledSet={filledSet}
          candidateSet={candidateSet}
          won={won}
          shakeKey={shakeKey}
          onCellClick={advanceTo}
          revealedCell={revealedCell}
          rootCauseCell={rootCause ? rootCause.suggestedCell : null}
          previewCells={showTools ? previewCells : undefined}
          magnifierMode={showTools && magnifierMode}
          onMagnifierTap={(r, c) => {
            revealCell(r, c);
            setMagnifierMode(false);
          }}
          previousPath={showTools ? previousPath : undefined}
          hammerMode={showTools && hammerMode}
          onHammerTap={(r, c) => {
            if (hammerClue(r, c)) setHammerMode(false);
          }}
        />
      </div>

      {showTools && (
        <div style={styles.toolRow}>
          {TOOL_ORDER.map((key) => {
            const Icon = TOOL_ICONS[key];
            const copy = t.tools[key];
            const active = (key === "magnifier" && magnifierMode) || (key === "hammer" && hammerMode);
            const locked = TOOL_LOCKED[key];
            const showIntro = key === nextIntroTool;
            return (
              <div key={key} style={styles.toolSlot}>
                <button
                  onClick={() => {
                    if (locked) return;
                    if (key === "magnifier" && magnifierMode) setMagnifierMode(false);
                    else if (key === "hammer" && hammerMode) setHammerMode(false);
                    else openUnlockSheet(key);
                    if (showIntro) dismissToolIntro(key);
                  }}
                  disabled={locked || TOOL_DISABLED[key]}
                  style={{
                    ...styles.toolBtn,
                    ...(active ? styles.toolBtnActive : {}),
                    ...(locked ? styles.toolBtnLocked : {}),
                  }}
                  title={locked ? t.lockedTitle(chapterUnlockLabel ? chapterUnlockLabel(key) : "") : copy.name}
                >
                  <Icon size={18} />
                  <span style={styles.toolLabel}>{copy.short}</span>
                  {!locked && <span style={styles.toolCost}>{liveCost(key)}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showTools && (
        <div style={styles.bottomRow}>
          <button onClick={handleUndoClick} style={styles.bottomBtn} disabled={filledOrder.length === 0 || won} title={`${t.undo} (Ctrl+Z)`}>
            <Undo2 size={16} />
            <span>{t.undo}</span>
          </button>
          <button
            onClick={handleRestartClick}
            style={styles.bottomBtn}
            disabled={filledOrder.length === 0 || won || restartsRemaining === 0}
            title={restartsRemaining != null ? t.retryRemaining(restartsRemaining) : undefined}
          >
            <RotateCcw size={16} />
            <span>{restartsRemaining != null ? `${t.retry} (${restartsRemaining})` : t.retry}</span>
          </button>
        </div>
      )}

      {showTools && (
        <ToolUnlockSheet
          open={unlockTool != null}
          title={unlockTool ? t.tools[unlockTool].title : ""}
          cost={unlockTool ? liveCost(unlockTool) : 0}
          pointsBalance={liveBalance}
          error={unlockError}
          labels={{ watchAd: t.watchAd, spendPoints: t.spendPointsBtn, cancel: t.cancelBtn, balance: t.balanceLabel }}
          onWatchAd={handleWatchAd}
          onSpendPoints={handleSpendPoints}
          onCancel={closeUnlockSheet}
          resetInfo={resetInfo}
        />
      )}

      {showTools && nextIntroTool && (
        <ToolIntroModal
          toolKey={nextIntroTool}
          title={t.tools[nextIntroTool].name}
          caption={t.tools[nextIntroTool].intro}
          onDismiss={() => dismissToolIntro(nextIntroTool)}
        />
      )}
    </>
  );
}

const styles = {
  topBar: {
    width: "100%",
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  pointsChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    background: "transparent",
    border: "1px solid rgba(43,42,40,0.16)",
    fontSize: 12.5,
    fontFamily: "'EB Garamond', serif",
    color: "#8B6A32",
    fontWeight: 600,
  },
  boardColumn: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  toolRow: {
    width: "100%",
    display: "grid",
    // Always exactly one row of 6, evenly shrinking to fit the container
    // instead of flex-wrapping — a wrap left an orphaned single button
    // stranded alone on its own second row on narrower phones.
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 6,
    marginTop: 4,
  },
  toolSlot: {
    position: "relative",
    minWidth: 0,
  },
  startHint: {
    marginBottom: 12,
    fontSize: 12.5,
    color: "#6E8E86",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  hammerHint: {
    marginBottom: 12,
    fontSize: 12.5,
    color: "#8B6A32",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  stuckBanner: {
    marginBottom: 16,
    padding: "10px 14px",
    borderRadius: 4,
    background: "rgba(184,146,90,0.12)",
    border: "1px solid rgba(184,146,90,0.4)",
    fontSize: 12.5,
    color: "#8B6A32",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  rootCauseCaption: {
    marginBottom: 16,
    padding: "8px 14px",
    borderRadius: 4,
    background: "rgba(178,58,46,0.08)",
    border: "1px solid rgba(178,58,46,0.3)",
    fontSize: 12.5,
    color: "#B23A2E",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  stuckActions: {
    display: "flex",
    gap: 8,
  },
  stuckBtn: {
    background: "#B8925A",
    color: "#F3EEE1",
    border: "none",
    borderRadius: 4,
    padding: "6px 14px",
    fontSize: 12,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    cursor: "pointer",
  },
  stuckBtnGhost: {
    background: "transparent",
    color: "#8B6A32",
    border: "1px solid rgba(139,106,50,0.4)",
    borderRadius: 4,
    padding: "6px 14px",
    fontSize: 12,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    cursor: "pointer",
  },
  toolBtn: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 2px 6px",
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 8,
    color: "#2B2A28",
    cursor: "pointer",
    position: "relative",
  },
  toolBtnActive: {
    background: "#B8925A",
    borderColor: "#B8925A",
    color: "#F3EEE1",
  },
  toolBtnLocked: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  toolLabel: {
    fontSize: 9.5,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 0.5,
    lineHeight: 1.2,
    textAlign: "center",
  },
  toolCost: {
    fontSize: 9,
    fontFamily: "'EB Garamond', serif",
    color: "#B8925A",
    fontWeight: 700,
  },
  bottomRow: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 12,
  },
  bottomBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 4,
    padding: "11px 22px",
    color: "#2B2A28",
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
};
