import { buildLevelShareText, buildLevelShareUrl } from "../../engine/share.mjs";
import { createRefIdStore } from "../../engine/refId.mjs";
import { track } from "../../analytics.js";

// Regular-level share (v3.3) — a small, secondary action on the win card,
// promotional rather than a result card: text + link only, no canvas image
// (that machinery is Daily-specific, see daily/shareFlow.js). Same
// Web-Share-then-clipboard fallback pattern as shareDaily().
export async function shareLevel({ size, level, timeSec, perfect, lang }) {
  const refId = createRefIdStore(window.localStorage).getOrCreate();
  const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const url = buildLevelShareUrl({ baseUrl, refId });
  const text = buildLevelShareText({ size, level, timeSec, perfect, lang });

  try {
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      track("share_click", { context: "tutorial", size, level, method: "web_share_text" });
      return { shared: true, method: "web_share_text" };
    }
    throw new Error("no_web_share_api");
  } catch (err) {
    if (err && err.name === "AbortError") {
      return { shared: false, cancelled: true };
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      track("share_click", { context: "tutorial", size, level, method: "clipboard" });
      return { shared: true, method: "clipboard" };
    } catch {
      track("share_click", { context: "tutorial", size, level, method: "clipboard_failed" });
      return { shared: false, method: "clipboard_failed" };
    }
  }
}
