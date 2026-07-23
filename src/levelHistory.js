// Regular-level (chapter) completion records, one entry per clear. Mirrors
// dailyHistory.js's flat-localStorage-map shape but keyed by an incrementing
// id (regular levels have no natural date key like the daily challenge).
const KEY = "level_history_v1";

export function loadLevelHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

// entry: { size, chapterClearIndex, timeSec, mistakes, score, perfect, completedAt }
// Named distinctly from pwaInstall.js's recordLevelCompletion (an unrelated
// install-prompt nudge counter) to avoid an import collision in callers that
// need both.
export function recordLevelHistoryEntry(entry) {
  const history = loadLevelHistory();
  const id = `${entry.completedAt}_${Math.random().toString(36).slice(2, 8)}`;
  history[id] = entry;
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    /* storage unavailable, ignore */
  }
  return history;
}
