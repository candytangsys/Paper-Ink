// Unlock economy for the two new hint tools (v3.1 §一之3/4b). Root-cause
// costs more than the magnifier since it's higher information value (spec's
// wording). Both unlock paths reuse the same window.confirm stand-in the
// streak-rescue flow already uses (Daily.jsx handleRescue) — there's no
// real ad SDK in this codebase yet; this is the same P0 placeholder.
import { spendPoints } from "./pointsWallet.js";

export const MAGNIFIER_COST = 10;
export const ROOT_CAUSE_COST = 25;

export function unlockViaAd(confirmMessage) {
  if (typeof window === "undefined" || !window.confirm) return true;
  return window.confirm(confirmMessage);
}

export function unlockViaPoints(cost) {
  return spendPoints(cost);
}
