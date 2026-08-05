// v3.8: 重來 (retry) gets its own dedicated ad cadence — every 3rd retry
// click, regardless of how many 回退 clicks happened in between. Layered on
// top of (not replacing) undoRestartAdCounter.js's existing shared
// every-5th-回退-or-重來 counter: a player who only ever retries hits this
// 3-count gate first; one who mixes undo and retry may still also
// occasionally hit the shared 5-count gate. Two independent counters, each
// simple on its own, rather than one counter trying to encode both rules.
const KEY = "retry_ad_count_v1";
const TRIGGER_EVERY = 3;

function loadCount() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveCount(n) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* storage unavailable, ignore */
  }
}

// Returns true on the click that hits the 3rd use (and resets the counter).
export function bumpRetryUsage() {
  const next = loadCount() + 1;
  if (next >= TRIGGER_EVERY) {
    saveCount(0);
    return true;
  }
  saveCount(next);
  return false;
}
