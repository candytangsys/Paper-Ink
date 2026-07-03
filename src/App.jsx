import { useState, useEffect, useCallback } from "react";
import Home from "./components/Home.jsx";
import GuessNumber from "./games/GuessNumber.jsx";
import NumberLink from "./games/NumberLink.jsx";
import TimeSense from "./games/TimeSense.jsx";
import { GlobalInkStyle } from "./theme.jsx";
import { LanguageProvider } from "./i18n.jsx";

const ROUTES = new Set(["guess-number", "number-link", "time-sense"]);

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return ROUTES.has(raw) ? raw : "home";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);

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
      {route === "home" && <Home onSelect={navigate} />}
      {route === "guess-number" && <GuessNumber onExit={() => navigate(null)} />}
      {route === "number-link" && <NumberLink onExit={() => navigate(null)} />}
      {route === "time-sense" && <TimeSense onExit={() => navigate(null)} />}
    </LanguageProvider>
  );
}
