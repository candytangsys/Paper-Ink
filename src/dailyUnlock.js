// Per-date unlock record for replaying/reviewing a Daily Challenge day other
// than today. Today's puzzle is always free; every other date (whether
// already completed before this gate existed or not) must be unlocked once
// — watch an ad or spend points, same economy as the in-game hint tools in
// toolUnlock.js — before Daily.jsx will open it. Unlocking a date is
// permanent, so revisiting it later never asks again.
const KEY = "daily_unlock_v1";

export const PAST_DAY_UNLOCK_COST = 500;

function loadUnlocks() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function isPastDayUnlocked(date) {
  return !!loadUnlocks()[date];
}

export function unlockPastDay(date) {
  const unlocks = loadUnlocks();
  unlocks[date] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocks));
  } catch {
    /* storage unavailable, ignore */
  }
}
