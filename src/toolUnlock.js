// Unlock economy for the 5 paid hint tools (v3.1 §一之3/4b, expanded v3.2).
// Costs are ranked by how much they actually help: 溯源符 is diagnostic-only
// but expensive because it saves the most wasted moves on a genuinely dead
// path; 接力筆 costs more than the mark-only tools because it's the only one
// that actually advances the board for you; 引路符/靜心符/放大鏡 are cheaper,
// lower-impact nudges. All unlock paths reuse the same window.confirm
// stand-in the streak-rescue flow already uses (Daily.jsx handleRescue) —
// there's no real ad SDK in this codebase yet; this is the same P0 placeholder.
import { spendPoints } from "./pointsWallet.js";

export const MAGNIFIER_COST = 10;
export const ROOT_CAUSE_COST = 25;
export const RELAY_COST = 20; // 接力筆
export const PREVIEW_COST = 15; // 引路符
export const FREEZE_COST = 10; // 靜心符

export function unlockViaAd(confirmMessage) {
  if (typeof window === "undefined" || !window.confirm) return true;
  return window.confirm(confirmMessage);
}

export function unlockViaPoints(cost) {
  return spendPoints(cost);
}
