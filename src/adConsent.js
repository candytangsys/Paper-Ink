// Minimal CMP (consent management) for ads (RD 指令 v1.0 §三之3). Every
// ad-facing entry point — toolUnlock.js's unlockViaAd, interstitialAd.js's
// maybeShowInterstitial — must check consentAllowsAds() before calling into
// any ad provider, real or placeholder. Until the player has answered the
// banner, no ad call of any kind is allowed to fire.
const KEY = "ad_consent_v1";

export function loadAdConsent() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function hasAdConsentChoice() {
  return loadAdConsent() != null;
}

export function consentAllowsAds() {
  const consent = loadAdConsent();
  return !!(consent && consent.ads === true);
}

export function setAdConsent(ads) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ads: !!ads, decidedAt: Date.now() }));
  } catch {
    /* storage unavailable, ignore */
  }
}
