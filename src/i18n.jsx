import { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY = "lang_pref_v1";
const LanguageContext = createContext(null);

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "en" || v === "zh" ? v : "zh";
  } catch (e) {
    return "zh";
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang);

  const toggle = useCallback(() => {
    setLang((l) => {
      const next = l === "zh" ? "en" : "zh";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* storage unavailable, ignore */
      }
      return next;
    });
  }, []);

  return <LanguageContext.Provider value={{ lang, toggle }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
