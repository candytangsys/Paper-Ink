// Per-date completion record, keyed by date string. Backs the Home entry
// card's "already completed today" state and the Daily screen's read-only
// recap when a puzzle has already been solved.
const KEY = "daily_history_v1";

export function loadDailyHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getDailyEntry(date) {
  return loadDailyHistory()[date] || null;
}

export function recordDailyCompletion(date, entry) {
  const history = loadDailyHistory();
  history[date] = entry;
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    /* storage unavailable, ignore */
  }
  return history;
}
