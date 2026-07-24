// Unlock economy for the 5 paid hint tools (v3.1 §一之3/4b, expanded v3.2).
// Costs are ranked by how much they actually help: 溯源符 is diagnostic-only
// but expensive because it saves the most wasted moves on a genuinely dead
// path; 接力筆 costs more than the mark-only tools because it's the only one
// that actually advances the board for you; 引路符/靜心符/放大鏡 are cheaper,
// lower-impact nudges.
import { spendPoints } from "./pointsWallet.js";
import { consentAllowsAds } from "./adConsent.js";

export const MAGNIFIER_COST = 10;
export const ROOT_CAUSE_COST = 25;
export const RELAY_COST = 20; // 接力筆
export const PREVIEW_COST = 15; // 引路符
export const FREEZE_COST = 10; // 靜心符

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

// v3.4: repeatedly buying the *same* tool with points makes its next
// point-purchase cost more (+20% of its base cost per prior purchase,
// per tool — buying 放大鏡 a lot doesn't raise 溯源符's price). Nudges
// players toward spreading spend across tools or watching an ad
// occasionally instead of point-buying one favorite tool indefinitely at a
// flat price. Watching an ad is unaffected — always free, no scaling.
//
// The escalation resets every calendar month (UTC, matching the daily
// challenge's date convention) — counts are stored alongside the month they
// were accumulated in, and a stale month is treated as empty rather than
// migrated forward.
const PURCHASE_KEY = "tool_purchase_counts_v1";
const COST_GROWTH_PER_PURCHASE = 0.2;

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function loadPurchaseCounts() {
  try {
    const state = JSON.parse(localStorage.getItem(PURCHASE_KEY));
    if (!state || state.month !== currentMonthKey()) return {};
    return state.counts || {};
  } catch {
    return {};
  }
}

function savePurchaseCounts(counts) {
  try {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify({ month: currentMonthKey(), counts }));
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
