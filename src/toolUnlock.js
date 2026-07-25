// Unlock economy for the 6 paid hint tools (v3.1 §一之3/4b, expanded v3.2,
// price/escalation retuned + 錘子 added in v3.6). Costs are ranked by how
// much they actually help: 溯源符 is diagnostic-only but expensive because
// it saves the most wasted moves on a genuinely dead path; 錘子 permanently
// loosens a puzzle's own constraints; 接力筆 costs less than 溯源符 despite
// being the only tool that actually advances the board, matching how the
// original v3.1 pricing was set — not something this pass revisits.
import { spendPoints } from "./pointsWallet.js";
import { consentAllowsAds } from "./adConsent.js";

// v3.6: base prices raised ~50% across the board — the v3.1 prices let a
// player afford any tool within 1-2 clears even before this pass, well
// under the intended "buyable within ~5 clears" pace (see engine/score.mjs's
// matching cut). Rounded to whole points.
export const MAGNIFIER_COST = 15;
export const ROOT_CAUSE_COST = 38;
export const RELAY_COST = 30; // 接力筆
export const PREVIEW_COST = 23; // 引路符
export const FREEZE_COST = 15; // 靜心符
export const HAMMER_COST = 35; // 錘子 (v3.6, new)

// RD 指令 v1.0 §三之1: the actual "show an ad" step now lives behind an
// injectable provider so the real rewarded-ad SDK can be dropped in later
// (setAdProvider) without touching any call site — every caller still does
// `if (unlockViaAd(msg))` synchronously today (ToolUnlockSheet.jsx, Daily.jsx
// past-day unlock, ...), so the default provider stays the same synchronous
// window.confirm() P0 stand-in it always was. Wiring a genuinely async SDK
// will need its own pass over those call sites when that lands; this round
// is groundwork only, per the instruction.
function defaultAdProvider(confirmMessage) {
  if (typeof window === "undefined" || !window.confirm) return true;
  return window.confirm(confirmMessage);
}

let adProvider = defaultAdProvider;

export function setAdProvider(provider) {
  adProvider = typeof provider === "function" ? provider : defaultAdProvider;
}

// Per the CMP (adConsent.js): no ad call of any kind — placeholder or real —
// may fire before the player has consented.
export function unlockViaAd(confirmMessage) {
  if (!consentAllowsAds()) return false;
  return adProvider(confirmMessage);
}

// v3.4/v3.6: repeatedly buying the *same* tool with points makes its next
// point-purchase cost more (+30% of its base cost per prior purchase, per
// tool — buying 放大鏡 a lot doesn't raise 溯源符's price). Nudges players
// toward spreading spend across tools or watching an ad occasionally instead
// of point-buying one favorite tool indefinitely at a flat price. Watching
// an ad is unaffected — always free, no scaling.
//
// v3.6: the escalation used to reset every calendar month automatically;
// that's gone now (counts accumulate indefinitely) in favor of an explicit
// player-initiated reset (resetEscalationViaAd/resetEscalationViaPoints,
// below) — the player decides when the markup is worth clearing, rather
// than waiting out the calendar.
const PURCHASE_KEY = "tool_purchase_counts_v1";
const COST_GROWTH_PER_PURCHASE = 0.3;
// A price reset costs 5x the tool's *current* (already-escalated) price —
// deliberately steep, so it's only worth it once escalation has piled up
// several purchases deep, not as a routine alternative to just buying at
// the escalated price.
const RESET_COST_MULTIPLIER = 5;

function loadPurchaseCounts() {
  try {
    return JSON.parse(localStorage.getItem(PURCHASE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePurchaseCounts(counts) {
  try {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(counts));
  } catch {
    /* storage unavailable, ignore */
  }
}

export function getToolPurchaseCount(toolKey) {
  return loadPurchaseCounts()[toolKey] || 0;
}

// The price a player would pay *right now* to points-unlock `toolKey`,
// given how many times they've already bought it. Callers should always
// display and spend this value, never the raw base cost.
export function getToolCost(baseCost, toolKey) {
  const count = getToolPurchaseCount(toolKey);
  return Math.round(baseCost * (1 + COST_GROWTH_PER_PURCHASE * count));
}

// Spends the current (already-escalated) cost for `toolKey` and, on
// success, bumps its purchase count so the *next* purchase costs more.
export function unlockViaPoints(toolKey, baseCost) {
  const cost = getToolCost(baseCost, toolKey);
  const success = spendPoints(cost);
  if (success) {
    const counts = loadPurchaseCounts();
    counts[toolKey] = (counts[toolKey] || 0) + 1;
    savePurchaseCounts(counts);
  }
  return success;
}

// The point cost to clear `toolKey`'s escalation back to its base price
// right now — always computed off the *current* escalated price, so it
// keeps rising the longer a player waits.
export function getResetEscalationCost(baseCost, toolKey) {
  return getToolCost(baseCost, toolKey) * RESET_COST_MULTIPLIER;
}

function clearPurchaseCount(toolKey) {
  const counts = loadPurchaseCounts();
  delete counts[toolKey];
  savePurchaseCounts(counts);
}

// Only worth offering once there's actually a markup to clear.
export function canResetEscalation(toolKey) {
  return getToolPurchaseCount(toolKey) > 0;
}

export function resetEscalationViaPoints(toolKey, baseCost) {
  const cost = getResetEscalationCost(baseCost, toolKey);
  const success = spendPoints(cost);
  if (success) clearPurchaseCount(toolKey);
  return success;
}

export function resetEscalationViaAd(confirmMessage, toolKey) {
  if (!unlockViaAd(confirmMessage)) return false;
  clearPurchaseCount(toolKey);
  return true;
}

// v3.6: tools unlock progressively across the first few chapters instead of
// all being available from the very first level — ordered weakest-to-
// strongest effect so the biggest solving assists show up latest. Index is
// a CHAPTERS array index (engine/chapters.mjs), not a board size; chapter 0
// (2×2) always ships with 靜心符/放大鏡 since the onboarding walkthrough
// demos tools on that very chapter.
export const TOOL_UNLOCK_CHAPTER_INDEX = {
  freeze: 0,
  magnifier: 0,
  preview: 1,
  rootCause: 2,
  hammer: 3,
  relay: 4,
};

export function isToolUnlockedAtChapterIndex(toolKey, chapterIndex) {
  const required = TOOL_UNLOCK_CHAPTER_INDEX[toolKey] ?? 0;
  return chapterIndex >= required;
}
