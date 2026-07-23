// Per-date "重來" (restart) counter for the Daily Challenge's in-progress
// attempt. Caps how many times a player can reset back to the start of
// today's puzzle so the challenge can't be retried indefinitely until a
// perfect run — once exhausted, they finish with whatever progress they've
// got. Keyed by date like dailyHistory.js so past/future dates never share
// a counter. Only governs the pre-completion attempt; the unlimited
// post-completion "再玩一次" practice replay (Daily.jsx's practiceMode)
// doesn't touch this at all, since it already doesn't affect the recorded
// completion/streak/points either.
const KEY = "daily_restart_count_v1";

export const DAILY_RESTART_LIMIT = 3;

// Mistake count (per attempt) at which the Daily Challenge is considered
// "failed" and Daily.jsx surfaces the challenge-failed banner (retry/undo,
// or watch an ad to revive once DAILY_RESTART_LIMIT is exhausted). Doesn't
// block further taps — the player can still ignore it and finish anyway.
export const DAILY_FAIL_MISTAKES = 3;

function loadRestartCounts() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getRestartCount(date) {
  return loadRestartCounts()[date] || 0;
}

export function recordDailyRestart(date) {
  const counts = loadRestartCounts();
  const next = (counts[date] || 0) + 1;
  counts[date] = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(counts));
  } catch {
    /* storage unavailable, ignore */
  }
  return next;
}
