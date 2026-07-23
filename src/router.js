import { isValidDateStr, clampToToday, todayUTCString } from "./dateUtil.js";

const ROUTES = new Set(["number-link", "history", "rules"]);
const DAILY_ROUTE = /^daily(?:\/(\d{4}-\d{2}-\d{2}))?$/;
// The captured number's meaning changed from a fixed level-array index to a
// chapter board size (v3.1 restructure) — the route shape itself is
// unchanged, so this regex and the `level` field name stay as-is.
const NUMBERLINK_ROUTE = /^number-link(?:\/(\d+))?$/;

export function routeFromHash(hash = typeof window !== "undefined" ? window.location.hash : "") {
  const raw = String(hash || "").replace(/^#\/?/, "");

  const dailyMatch = raw.match(DAILY_ROUTE);
  if (dailyMatch) {
    const requested = dailyMatch[1];
    const date = requested && isValidDateStr(requested) ? clampToToday(requested) : todayUTCString();
    return { kind: "daily", date };
  }

  const numberLinkMatch = raw.match(NUMBERLINK_ROUTE);
  if (numberLinkMatch) {
    const level = numberLinkMatch[1] ? Number(numberLinkMatch[1]) : null;
    return { kind: "number-link", level };
  }

  return { kind: ROUTES.has(raw) ? raw : "home" };
}

export function buildHashRoute(kind, level = null) {
  if (!kind) return "/";
  if (kind === "number-link") {
    return level != null ? `/number-link/${level}` : "/number-link";
  }
  return `/${kind}`;
}
