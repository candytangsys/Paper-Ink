import { useState, useEffect, useCallback } from "react";
import Home from "./components/Home.jsx";
import NumberLink from "./games/NumberLink.jsx";
import Daily from "./games/Daily.jsx";
import InstallBanner from "./components/InstallBanner.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { GlobalInkStyle } from "./theme.jsx";
import { LanguageProvider } from "./i18n.jsx";
import { captureShareVisit } from "./daily/attribution.js";
import { isValidDateStr, clampToToday, todayUTCString } from "./dateUtil.js";
import { track } from "./analytics.js";

const ROUTES = new Set(["number-link"]);
const DAILY_ROUTE = /^daily(?:\/(\d{4}-\d{2}-\d{2}))?$/;

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const dailyMatch = raw.match(DAILY_ROUTE);
  if (dailyMatch) {
    const requested = dailyMatch[1];
    const date = requested && isValidDateStr(requested) ? clampToToday(requested) : todayUTCString();
    return { kind: "daily", date };
  }
  return { kind: ROUTES.has(raw) ? raw : "home" };
}

// F6-b: minimum-display + font-ready gate, capped so the whole boot stays
// comfortably under the spec's 1.5s (4G) budget even if fonts load slowly.
const LOADING_MIN_MS = 400;
const LOADING_CAP_MS = 1000;
const LOADING_FADE_MS = 260;

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [bootPhase, setBootPhase] = useState("loading"); // 'loading' | 'exiting' | 'ready'

  useEffect(() => {
    captureShareVisit();
    track("app_open", {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const minWait = new Promise((resolve) => setTimeout(resolve, LOADING_MIN_MS));
    const fontsReady =
      typeof document !== "undefined" && document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    const capped = Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, LOADING_CAP_MS))]);
    Promise.all([minWait, capped]).then(() => {
      if (!cancelled) setBootPhase("exiting");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bootPhase !== "exiting") return;
    const t = setTimeout(() => setBootPhase("ready"), LOADING_FADE_MS);
    return () => clearTimeout(t);
  }, [bootPhase]);

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((id) => {
    window.location.hash = id ? `/${id}` : "/";
  }, []);

  return (
    <LanguageProvider>
      <GlobalInkStyle />
      {route.kind === "home" && <Home onSelect={navigate} />}
      {route.kind === "number-link" && <NumberLink onExit={() => navigate(null)} />}
      {route.kind === "daily" && <Daily date={route.date} onExit={() => navigate(null)} />}
      <InstallBanner />
      {bootPhase !== "ready" && <LoadingScreen exiting={bootPhase === "exiting"} />}
    </LanguageProvider>
  );
}
