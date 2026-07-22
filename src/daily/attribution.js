import { track } from "../analytics.js";

const SESSION_KEY = "share_ref";

// Called once on app boot: if this visit arrived via a shared link
// (?ref=...), log share_visit and remember the ref for the rest of the
// session so a same-day conversion can be attributed back to it.
export function captureShareVisit() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem(SESSION_KEY, ref);
      track("share_visit", { ref });
    }
  } catch {
    /* URL/sessionStorage unavailable, ignore */
  }
}

export function getSessionShareRef() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function trackShareConversion(date) {
  const ref = getSessionShareRef();
  if (ref) track("share_conversion", { ref, date });
}
