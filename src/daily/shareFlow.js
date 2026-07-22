import { buildShareText, buildShareUrl, dailyNumber } from "../engine/share.mjs";
import { createRefIdStore } from "../engine/refId.mjs";
import { renderShareImage } from "./shareImage.js";
import { track } from "../analytics.js";

// Web Share API (with the Canvas image attached) first, falling back to a
// clipboard copy of the text + link when the platform can't share files —
// or has no Web Share API at all (most desktop browsers).
export async function shareDaily({ date, size, timeSec, perfect, streak, solution, lang }) {
  const dailyNo = dailyNumber(date);
  const refId = createRefIdStore(window.localStorage).getOrCreate();
  const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const url = buildShareUrl({ baseUrl, date, refId });
  const text = buildShareText({ date, dailyNo, size, timeSec, perfect, streak, lang });

  let file = null;
  try {
    const blob = await renderShareImage({ dailyNo, size, timeSec, perfect, streak, solution, lang });
    if (blob) file = new File([blob], "paper-ink-daily.png", { type: "image/png" });
  } catch {
    /* canvas unavailable, share text-only */
  }

  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: text, text, url, files: [file] });
      track("share_click", { date, method: "web_share_image" });
      return { shared: true, method: "web_share_image" };
    }
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      track("share_click", { date, method: "web_share_text" });
      return { shared: true, method: "web_share_text" };
    }
    throw new Error("no_web_share_api");
  } catch (err) {
    if (err && err.name === "AbortError") {
      return { shared: false, cancelled: true };
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      track("share_click", { date, method: "clipboard" });
      return { shared: true, method: "clipboard" };
    } catch {
      track("share_click", { date, method: "clipboard_failed" });
      return { shared: false, method: "clipboard_failed" };
    }
  }
}
