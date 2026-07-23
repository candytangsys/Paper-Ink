// One-time flag for the regular-level onboarding modal (v3.2). Same shape
// as pointsWallet.js/toolUnlock.js's small localStorage wrappers.
const KEY = "tutorial_intro_seen_v1";

export function hasSeenIntro() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // storage unavailable — don't force the modal on every load
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable, ignore */
  }
}
