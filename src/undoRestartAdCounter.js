// Every 5th 回退/重來 click (shared counter — either button counts) shows an
// interstitial ad instead of putting a hard cap on either button (v3.6).
// Deliberately separate from interstitialAd.js's own level-clear frequency
// cap (free-levels window, per-clear interval, cooldown) — those two
// triggers have nothing to do with each other, so this counter is the whole
// frequency rule for this trigger; callers should pair a true result with
// interstitialAd.js's showInterstitialIfConsented(), not maybeShowInterstitial().
const KEY = "undo_restart_ad_count_v1";
const TRIGGER_EVERY = 5;

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

// Returns true on the click that hits the 5th use (and resets the counter).
export function bumpUndoRestartUsage() {
  const next = loadCount() + 1;
  if (next >= TRIGGER_EVERY) {
    saveCount(0);
    return true;
  }
  saveCount(next);
  return false;
}
