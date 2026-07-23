import { useEffect, useState } from "react";
import { HOME_COLORS, HOME_FONT_SERIF, HOME_FONT_MONO } from "../homeTheme.js";
import { useLanguage } from "../i18n.jsx";

/* ---------------------------------------------------------
   F6-b boot loading screen. The signature element is the ink
   stroke tracing a one-stroke path between six nodes — the
   core game mechanic, made visible before the player even
   reaches the home screen. Not a generic spinner: the stroke
   literally draws the same kind of path the puzzles use.

   v3.3: no longer auto-dismisses on its own timer. Once the
   min-display/fonts-ready gate in App.jsx is satisfied it keeps
   looping the stroke animation but also reveals an "Enter"
   button (readyToEnter) — the player decides when to leave the
   splash, App.jsx only starts the actual fade-out after onEnter
   fires.
--------------------------------------------------------- */

const TEXT = {
  zh: { enter: "點擊進入" },
  en: { enter: "Tap to Enter" },
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LoadingScreen({ exiting, readyToEnter, onEnter }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  return (
    <div
      style={{ ...styles.root, opacity: exiting ? 0 : 1, pointerEvents: exiting ? "none" : "auto" }}
      aria-hidden={exiting}
    >
      <svg viewBox="0 0 132 132" style={styles.mark}>
        <path
          d="M30 34 C 50 20, 62 18, 70 24 S 96 36, 104 46 S 100 76, 96 88 S 66 104, 54 102 S 20 92, 24 80"
          fill="none"
          stroke={HOME_COLORS.ink}
          strokeWidth={2.6}
          strokeLinecap="round"
          style={
            reduced
              ? { strokeDasharray: 520, strokeDashoffset: 0 }
              : { strokeDasharray: 520, strokeDashoffset: 520, animation: "loading-draw 1.7s cubic-bezier(.65,.05,.36,1) infinite" }
          }
        />
        <circle cx={30} cy={34} r={4} fill={HOME_COLORS.seal} />
        <circle cx={70} cy={24} r={3.5} fill={HOME_COLORS.inkFaint} opacity={0.35} />
        <circle cx={104} cy={46} r={3.5} fill={HOME_COLORS.inkFaint} opacity={0.35} />
        <circle cx={96} cy={88} r={3.5} fill={HOME_COLORS.inkFaint} opacity={0.35} />
        <circle cx={54} cy={102} r={3.5} fill={HOME_COLORS.inkFaint} opacity={0.35} />
        <circle cx={24} cy={80} r={4} fill={HOME_COLORS.seal} />
      </svg>
      <div style={styles.title}>紙&nbsp;墨&nbsp;筆</div>
      <div style={styles.subtitle}>Paper &amp; Ink · 一筆連</div>
      {readyToEnter && (
        <button onClick={onEnter} autoFocus style={styles.enterBtn} className="ink-rise">
          {t.enter}
        </button>
      )}
      <style>{`
        @keyframes loading-draw {
          0% { stroke-dashoffset: 520; }
          55% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: `radial-gradient(120% 90% at 50% 15%, #F8F3E6 0%, ${HOME_COLORS.paper} 55%, ${HOME_COLORS.paperDeep} 100%)`,
    transition: "opacity 0.26s ease",
  },
  mark: { width: 132, height: 132 },
  title: {
    fontFamily: HOME_FONT_SERIF,
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: "0.28em",
    marginTop: 22,
    color: HOME_COLORS.ink,
  },
  subtitle: {
    fontFamily: HOME_FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.2em",
    color: HOME_COLORS.inkFaint,
    marginTop: 8,
    textTransform: "uppercase",
  },
  enterBtn: {
    marginTop: 34,
    padding: "12px 36px",
    borderRadius: 4,
    border: `1px solid ${HOME_COLORS.seal}`,
    background: HOME_COLORS.seal,
    color: HOME_COLORS.paper,
    fontFamily: HOME_FONT_SERIF,
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "0.15em",
    cursor: "pointer",
  },
};
