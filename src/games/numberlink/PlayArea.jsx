import { useState, useEffect, useCallback } from "react";
import { Undo2, RotateCcw, Search, Crosshair, Wand2, Route, Snowflake, ZoomIn, ZoomOut, Coins } from "lucide-react";
import { useLanguage } from "../../i18n.jsx";
import Board from "./Board.jsx";
import ToolUnlockSheet from "./ToolUnlockSheet.jsx";
import { getPointsBalance } from "../../pointsWallet.js";
import {
  MAGNIFIER_COST, ROOT_CAUSE_COST, RELAY_COST, PREVIEW_COST, FREEZE_COST,
  unlockViaAd, unlockViaPoints,
} from "../../toolUnlock.js";
import { track } from "../../analytics.js";
import { isDesktopViewport } from "../../deviceUtil.js";

/* ---------------------------------------------------------
   Shared in-game play surface (v3.2): left rail (points +
   zoom), board column (start hint / stuck banners / Board),
   right rail (5 paid tools), bottom row (回退/重來). One
   implementation for both NumberLink.jsx and Daily.jsx so the
   two never drift apart again — Daily was the layout baseline.

   Owns all tool-unlock UI state itself; callers just hand it
   the session from useGameSession() plus two small flags.
--------------------------------------------------------- */

const ZOOM_STEPS = [1, 1.15, 1.3];

const TOOL_ORDER = ["magnifier", "rootCause", "relay", "preview", "freeze"];
const TOOL_ICONS = { magnifier: Search, rootCause: Crosshair, relay: Wand2, preview: Route, freeze: Snowflake };
const TOOL_COSTS = { magnifier: MAGNIFIER_COST, rootCause: ROOT_CAUSE_COST, relay: RELAY_COST, preview: PREVIEW_COST, freeze: FREEZE_COST };

const TEXT = {
  zh: {
    undo: "回退",
    retry: "重來",
    startHint: "點擊「1」開始畫線",
    pointsLabel: "積分",
    zoomIn: "放大盤面",
    zoomOut: "縮小盤面",
    hintStuck: "目前走法已經無法完成，試試回退或重來一次",
    stuckPrompt: "目前走法可能已經卡住了",
    useToolBtn: "使用道具",
    dismissBtn: "忽略",
    cancelBtn: "取消",
    watchAd: "看廣告解鎖",
    spendPointsBtn: (cost) => `花費 ${cost} 積分解鎖`,
    balanceLabel: (bal) => `目前積分 ${bal}`,
    insufficientPoints: "積分不足",
    tools: {
      magnifier: { name: "放大鏡", short: "放大鏡", title: "解鎖放大鏡", ad: "觀看一段小短片以解鎖放大鏡？（P0 暫以此對話框代替廣告）" },
      rootCause: { name: "溯源符", short: "溯源符", title: "解鎖溯源符", ad: "觀看一段小短片以解鎖溯源符？（P0 暫以此對話框代替廣告）" },
      relay: { name: "接力筆", short: "接力筆", title: "解鎖接力筆", ad: "觀看一段小短片以解鎖接力筆？（P0 暫以此對話框代替廣告）" },
      preview: { name: "引路符", short: "引路符", title: "解鎖引路符", ad: "觀看一段小短片以解鎖引路符？（P0 暫以此對話框代替廣告）" },
      freeze: { name: "靜心符", short: "靜心符", title: "解鎖靜心符", ad: "觀看一段小短片以解鎖靜心符？（P0 暫以此對話框代替廣告）" },
    },
  },
  en: {
    undo: "Undo",
    retry: "Retry",
    startHint: "Tap “1” to start drawing",
    pointsLabel: "Points",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    hintStuck: "This path can't be completed anymore — try undo or retry",
    stuckPrompt: "This path may already be stuck",
    useToolBtn: "Use tool",
    dismissBtn: "Dismiss",
    cancelBtn: "Cancel",
    watchAd: "Watch ad to unlock",
    spendPointsBtn: (cost) => `Spend ${cost} points`,
    balanceLabel: (bal) => `${bal} points available`,
    insufficientPoints: "Not enough points",
    tools: {
      magnifier: { name: "Magnifier", short: "Magnify", title: "Unlock Magnifier", ad: "Watch a short clip to unlock the magnifier? (P0 stand-in for the rewarded ad)" },
      rootCause: { name: "Root Cause", short: "Root Cause", title: "Unlock Root Cause", ad: "Watch a short clip to unlock root cause? (P0 stand-in for the rewarded ad)" },
      relay: { name: "Relay Brush", short: "Relay", title: "Unlock Relay Brush", ad: "Watch a short clip to unlock the relay brush? (P0 stand-in for the rewarded ad)" },
      preview: { name: "Guide Talisman", short: "Guide", title: "Unlock Guide Talisman", ad: "Watch a short clip to unlock the guide talisman? (P0 stand-in for the rewarded ad)" },
      freeze: { name: "Stillness Talisman", short: "Stillness", title: "Unlock Stillness Talisman", ad: "Watch a short clip to unlock the stillness talisman? (P0 stand-in for the rewarded ad)" },
    },
  },
};

export default function PlayArea({ session, showTools = true, toolContext = "tutorial" }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const {
    puzzle, filledOrder, filledSet, candidateSet, won,
    shakeKey, hintCell, hintStuck, revealedCell, rootCause, previewCells, stuckBannerVisible,
    advanceTo, undo, restart, revealCell, traceRootCause, placeNextCell, previewPath, freezeTime, dismissStuckBanner,
  } = session;

  const [magnifierMode, setMagnifierMode] = useState(false);
  const [unlockTool, setUnlockTool] = useState(null); // one of TOOL_ORDER | null
  const [unlockError, setUnlockError] = useState(null);
  const [liveBalance, setLiveBalance] = useState(() => getPointsBalance());
  const [zoomIdx, setZoomIdx] = useState(0);

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
    if (unlockViaPoints(TOOL_COSTS[unlockTool])) {
      setLiveBalance(getPointsBalance());
      applyToolUnlock(unlockTool);
    } else {
      setUnlockError(t.insufficientPoints);
    }
  }, [unlockTool, applyToolUnlock, t]);

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
      undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showTools, filledOrder.length, won, undo]);

  if (!puzzle) return null;

  const zoom = ZOOM_STEPS[zoomIdx];
  const TOOL_DISABLED = {
    magnifier: won,
    rootCause: won || filledOrder.length < 2,
    // Blocked while the position is a confirmed dead end (stuckBannerVisible)
    // so a player can't spend points on an auto-place that has nowhere valid
    // to place — unlike the mark-only tools, 接力筆 does nothing in that case.
    relay: won || stuckBannerVisible || filledOrder.length >= puzzle.total,
    preview: won,
    freeze: won,
  };

  return (
    <>
      <div style={styles.playRow}>
        {showTools && (
          <div style={styles.leftRail}>
            <div style={styles.pointsChip} title={t.pointsLabel} aria-label={t.pointsLabel}>
              <Coins size={14} color="#B8925A" />
              <span>{liveBalance}</span>
            </div>
            <button
              onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
              disabled={zoomIdx >= ZOOM_STEPS.length - 1}
              style={styles.railBtn}
              aria-label={t.zoomIn}
              title={t.zoomIn}
            >
              <ZoomIn size={17} />
            </button>
            <button
              onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
              disabled={zoomIdx <= 0}
              style={styles.railBtn}
              aria-label={t.zoomOut}
              title={t.zoomOut}
            >
              <ZoomOut size={17} />
            </button>
          </div>
        )}

        <div style={styles.boardColumn}>
          {filledOrder.length === 0 && !won && <div style={styles.startHint}>{t.startHint}</div>}
          {hintStuck && <div style={styles.hintStuckBanner}>{t.hintStuck}</div>}
          {showTools && stuckBannerVisible && (
            <div style={styles.stuckBanner}>
              <span>{t.stuckPrompt}</span>
              <div style={styles.stuckActions}>
                <button onClick={() => setUnlockTool("rootCause")} style={styles.stuckBtn}>{t.useToolBtn}</button>
                <button onClick={undo} style={styles.stuckBtn}>{t.undo}</button>
                <button onClick={dismissStuckBanner} style={styles.stuckBtnGhost}>{t.dismissBtn}</button>
              </div>
            </div>
          )}

          <Board
            puzzle={puzzle}
            filledOrder={filledOrder}
            filledSet={filledSet}
            candidateSet={candidateSet}
            won={won}
            shakeKey={shakeKey}
            hintCell={hintCell}
            onCellClick={advanceTo}
            revealedCell={revealedCell}
            rootCauseCell={rootCause ? rootCause.suggestedCell : null}
            previewCells={showTools ? previewCells : undefined}
            zoom={showTools ? zoom : 1}
            magnifierMode={showTools && magnifierMode}
            onMagnifierTap={(r, c) => {
              revealCell(r, c);
              setMagnifierMode(false);
            }}
          />
        </div>

        {showTools && (
          <div style={styles.rightRail}>
            {TOOL_ORDER.map((key) => {
              const Icon = TOOL_ICONS[key];
              const copy = t.tools[key];
              const active = key === "magnifier" && magnifierMode;
              return (
                <button
                  key={key}
                  onClick={() => (key === "magnifier" && magnifierMode ? setMagnifierMode(false) : setUnlockTool(key))}
                  disabled={TOOL_DISABLED[key]}
                  style={{ ...styles.toolBtn, ...(active ? styles.toolBtnActive : {}) }}
                  title={copy.name}
                >
                  <Icon size={18} />
                  <span style={styles.toolLabel}>{copy.short}</span>
                  <span style={styles.toolCost}>{TOOL_COSTS[key]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showTools && (
        <div style={styles.bottomRow}>
          <button onClick={undo} style={styles.bottomBtn} disabled={filledOrder.length === 0 || won} title={`${t.undo} (Ctrl+Z)`}>
            <Undo2 size={16} />
            <span>{t.undo}</span>
          </button>
          <button onClick={restart} style={styles.bottomBtn} disabled={filledOrder.length === 0 || won}>
            <RotateCcw size={16} />
            <span>{t.retry}</span>
          </button>
        </div>
      )}

      {showTools && (
        <ToolUnlockSheet
          open={unlockTool != null}
          title={unlockTool ? t.tools[unlockTool].title : ""}
          cost={unlockTool ? TOOL_COSTS[unlockTool] : 0}
          pointsBalance={liveBalance}
          error={unlockError}
          labels={{ watchAd: t.watchAd, spendPoints: t.spendPointsBtn, cancel: t.cancelBtn, balance: t.balanceLabel }}
          onWatchAd={handleWatchAd}
          onSpendPoints={handleSpendPoints}
          onCancel={closeUnlockSheet}
        />
      )}
    </>
  );
}

const styles = {
  playRow: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
  },
  leftRail: {
    flex: "0 0 auto",
    width: 52,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  rightRail: {
    flex: "0 0 auto",
    width: 56,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  pointsChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    width: "100%",
    padding: "8px 4px",
    borderRadius: 8,
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
    fontSize: 12,
    fontFamily: "'EB Garamond', serif",
    color: "#8B6A32",
    fontWeight: 600,
  },
  railBtn: {
    width: "100%",
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 8,
    color: "#2B2A28",
    cursor: "pointer",
  },
  boardColumn: {
    flex: "1 1 auto",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  startHint: {
    marginBottom: 12,
    fontSize: 12.5,
    color: "#6E8E86",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    textAlign: "center",
  },
  hintStuckBanner: {
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
