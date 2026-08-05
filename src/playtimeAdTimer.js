// v3.8: once the player's very first tap of the session happens, fires an
// interstitial every PLAYTIME_INTERVAL_MS of continued app-open time —
// independent of individual puzzle starts/clears/chapter switches, unlike
// interstitialAd.js's per-clear cap or undoRestartAdCounter.js's per-click
// cap. A plain module-level singleton (not React state) so the cadence
// survives across puzzles within the same visit without needing to live
// above every screen that can start a session; naturally resets on reload,
// same as the rest of this app's in-memory ad state.
import { showInterstitialIfConsented } from "./interstitialAd.js";

const PLAYTIME_INTERVAL_MS = 3 * 60 * 1000;

let intervalId = null;

// Call from the very first successful tap of a session (useGameSession.js's
// advanceTo). Safe to call repeatedly — only the first call actually starts
// the timer.
export function startPlaytimeAdTimer() {
  if (intervalId != null) return;
  intervalId = setInterval(() => {
    showInterstitialIfConsented({ trigger: "playtime_interval" });
  }, PLAYTIME_INTERVAL_MS);
}
