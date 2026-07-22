import { createRefIdStore } from "./engine/refId.mjs";
import { getTutorialVariant } from "./tutorialVariant.js";

// TODO: replace with the real GA4 Measurement ID before launch (see README).
export const GA_ID = "G-XXXXXXXXXX";

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

function safeRefId() {
  try {
    return createRefIdStore(window.localStorage).getOrCreate();
  } catch {
    return "u_00000000";
  }
}

function safeLang() {
  try {
    return localStorage.getItem("lang_pref_v1") || "zh";
  } catch {
    return "zh";
  }
}

// Every event automatically carries tutorial_variant / ref_id / lang, per
// the F5 event dictionary. Event names are fixed by the spec — do not rename.
export function track(event, params = {}) {
  const payload = {
    ...params,
    tutorial_variant: getTutorialVariant(),
    ref_id: safeRefId(),
    lang: safeLang(),
  };
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, payload);
  }
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, payload);
  }
}
