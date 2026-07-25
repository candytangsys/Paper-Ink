// Interstitial ad mount point (RD 指令 v1.0 §三之2) — there is currently no
// interstitial anywhere in the app; this adds the trigger + frequency-cap
// plumbing so a real ad SDK can be dropped into the provider later without
// touching call sites. Frequency caps carry over spec v2.0's original
// control: no interstitials in the player's first 10 small-level clears,
// then whichever gate clears *later* of "every 3 clears" or a 120-second
// cooldown since the last interstitial actually shown.
import { consentAllowsAds } from "./adConsent.js";

const FREE_LEVELS = 10;
const LEVEL_INTERVAL = 3;
const MIN_INTERVAL_MS = 120000;

const STATE_KEY = "interstitial_ad_state_v1";

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_KEY));
    if (!parsed) throw new Error("empty");
    return parsed;
  } catch {
    return { totalLevels: 0, levelsSinceAd: 0, lastShownAt: 0 };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable, ignore */
  }
}

// No real ad network yet — placeholder no-op until the SDK is wired.
function defaultInterstitialProvider(context) {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[interstitialAd] placeholder trigger", context);
  }
}

let interstitialProvider = defaultInterstitialProvider;

// Swap in a real ad SDK later: setInterstitialProvider((ctx) => sdk.showInterstitial(...))
export function setInterstitialProvider(provider) {
  interstitialProvider = typeof provider === "function" ? provider : defaultInterstitialProvider;
}

// Call once per small-level clear, regardless of which trigger it is (a
// chapter switch or a plain level clear) — the frequency cap below decides
// whether this particular clear is actually the one that shows an ad.
// Returns whether it fired.
export function maybeShowInterstitial(context = {}) {
  const state = loadState();
  const totalLevels = state.totalLevels + 1;
  const levelsSinceAd = state.levelsSinceAd + 1;
  const now = Date.now();

  const pastFreeWindow = totalLevels > FREE_LEVELS;
  const countGateOk = levelsSinceAd >= LEVEL_INTERVAL;
  const timeGateOk = now - state.lastShownAt >= MIN_INTERVAL_MS;
  const shouldShow = pastFreeWindow && countGateOk && timeGateOk && consentAllowsAds();

  if (shouldShow) interstitialProvider(context);

  saveState({
    totalLevels,
    levelsSinceAd: shouldShow ? 0 : levelsSinceAd,
    lastShownAt: shouldShow ? now : state.lastShownAt,
  });
  return shouldShow;
}

// For trigger sources that already own their *own* frequency logic (e.g.
// undoRestartAdCounter.js's every-5th-click counter) and just need the
// actual "show it" step — consent-gated, but without maybeShowInterstitial's
// unrelated free-window/per-clear-interval/cooldown gates layered on top.
export function showInterstitialIfConsented(context = {}) {
  if (!consentAllowsAds()) return false;
  interstitialProvider(context);
  return true;
}
