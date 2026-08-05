import { Search, Crosshair, Wand2, Route, Snowflake, Hammer } from "lucide-react";
import { useLanguage } from "../../i18n.jsx";
import { boardMetrics } from "./Board.jsx";
import { NODE_CELLS, useReducedMotion, useLoopingFrames, MiniGrid } from "./OnboardingIntro.jsx";

/* ---------------------------------------------------------
   v3.7: replaces the old "small tooltip bubble, dismissed by
   tapping ×" per-tool intro with a full-screen animated demo
   card, matching the treatment OnboardingIntro.jsx already
   uses for the first-run walkthrough — each tool gets its own
   short looping demo on the same mini 2×2 board (via MiniGrid's
   `overrides`) acting out what it actually does, instead of
   just a caption. Still shown once per tool (gated the same way
   as before, via toolIntroSeen.js through PlayArea.jsx), still
   one at a time.
--------------------------------------------------------- */

const TOOL_ICONS = { freeze: Snowflake, magnifier: Search, preview: Route, rootCause: Crosshair, hammer: Hammer, relay: Wand2 };

function cellCenter(idx) {
  const { cellSize, gap, pad } = boardMetrics(2);
  const [r, c] = NODE_CELLS[idx];
  return { x: pad + c * (cellSize + gap) + cellSize / 2, y: pad + r * (cellSize + gap) + cellSize / 2 };
}

const MINI_GEOMETRY = boardMetrics(2);

const FREEZE_FRAMES = [
  { seconds: 47, badge: false, ms: 700 },
  { seconds: 47, badge: true, ms: 550 },
  { seconds: 32, badge: true, ms: 1000 },
  { seconds: 32, badge: false, ms: 700 },
];

function FreezeDemo({ reduced }) {
  const f = useLoopingFrames(FREEZE_FRAMES, !reduced);
  const mm = String(Math.floor(f.seconds / 60)).padStart(2, "0");
  const ss = String(f.seconds % 60).padStart(2, "0");
  return (
    <div style={styles.freezeWrap}>
      <div style={styles.freezeTime}>
        {mm}:{ss}
      </div>
      <div
        style={{
          ...styles.freezeBadge,
          opacity: f.badge ? 1 : 0,
          transform: f.badge ? "translateY(0)" : "translateY(6px)",
        }}
      >
        −15s
      </div>
    </div>
  );
}

const MAGNIFIER_FRAMES = [
  { filledCount: 2, cursor: false, revealed: false, ms: 600 },
  { filledCount: 2, cursor: true, revealed: false, ms: 500 },
  { filledCount: 2, cursor: true, revealed: true, ms: 1400 },
  { filledCount: 2, cursor: false, revealed: false, ms: 500 },
];

function MagnifierDemo({ reduced }) {
  const f = useLoopingFrames(MAGNIFIER_FRAMES, !reduced);
  const { x, y } = cellCenter(2);
  const overrides = f.revealed ? { 2: { variant: "revealed", label: "3" } } : undefined;
  return (
    <div style={styles.miniStage}>
      <MiniGrid filledCount={f.filledCount} overrides={overrides} />
      <div
        style={{
          ...styles.floatingIcon,
          left: x + MINI_GEOMETRY.cellSize * 0.28,
          top: y + MINI_GEOMETRY.cellSize * 0.28,
          opacity: f.cursor ? 1 : 0,
        }}
      >
        <Search size={16} color="#3F5A73" />
      </div>
    </div>
  );
}

const PREVIEW_FRAMES = [
  { filledCount: 1, show: false, ms: 600 },
  { filledCount: 1, show: true, ms: 1600 },
  { filledCount: 1, show: false, ms: 500 },
];

function PreviewDemo({ reduced }) {
  const f = useLoopingFrames(PREVIEW_FRAMES, !reduced);
  const overrides = f.show
    ? { 1: { variant: "preview" }, 2: { variant: "preview" }, 3: { variant: "preview" } }
    : undefined;
  return (
    <div style={styles.miniStage}>
      <MiniGrid filledCount={f.filledCount} overrides={overrides} />
    </div>
  );
}

const TRACE_FRAMES = [
  { filledCount: 2, ring: null, caption: false, ms: 500 },
  { filledCount: 3, ring: null, caption: false, ms: 500 },
  { filledCount: 3, ring: 1, caption: true, ms: 1800 },
  { filledCount: 2, ring: null, caption: false, ms: 700 },
];

function TraceDemo({ reduced, t }) {
  const f = useLoopingFrames(TRACE_FRAMES, !reduced);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={styles.miniStage}>
        <MiniGrid filledCount={f.filledCount} ringIndex={f.ring} />
      </div>
      <div
        style={{
          ...styles.traceCaption,
          opacity: f.caption ? 1 : 0,
          transform: f.caption ? "translateY(0)" : "translateY(-4px)",
        }}
      >
        {t.rewindSuggest(2)}
      </div>
    </div>
  );
}

const HAMMER_FRAMES = [
  { filledCount: 1, clueShown: true, cursor: false, ms: 650 },
  { filledCount: 1, clueShown: true, cursor: true, ms: 500 },
  { filledCount: 1, clueShown: false, cursor: false, ms: 1400 },
];

function HammerDemo({ reduced }) {
  const f = useLoopingFrames(HAMMER_FRAMES, !reduced);
  const { x, y } = cellCenter(2);
  const overrides = f.clueShown ? { 2: { variant: "clue", label: "3" } } : undefined;
  return (
    <div style={styles.miniStage}>
      <MiniGrid filledCount={f.filledCount} overrides={overrides} />
      <div
        style={{
          ...styles.floatingIcon,
          left: x + MINI_GEOMETRY.cellSize * 0.28,
          top: y + MINI_GEOMETRY.cellSize * 0.28,
          opacity: f.cursor ? 1 : 0,
        }}
      >
        <Hammer size={16} color="#8B6A32" />
      </div>
    </div>
  );
}

const RELAY_FRAMES = [
  { filledCount: 1, sparkle: null, ms: 500 },
  { filledCount: 1, sparkle: 1, ms: 350 },
  { filledCount: 2, sparkle: null, ms: 500 },
  { filledCount: 2, sparkle: 2, ms: 350 },
  { filledCount: 3, sparkle: null, ms: 500 },
  { filledCount: 3, sparkle: 3, ms: 350 },
  { filledCount: 4, sparkle: null, celebrate: true, ms: 1300 },
];

function RelayDemo({ reduced }) {
  const f = useLoopingFrames(RELAY_FRAMES, !reduced);
  const sparklePos = f.sparkle != null ? cellCenter(f.sparkle) : null;
  return (
    <div style={styles.miniStage}>
      <MiniGrid filledCount={f.filledCount} celebrate={f.celebrate} />
      {sparklePos && (
        <div style={{ ...styles.floatingIcon, left: sparklePos.x - 8, top: sparklePos.y - 8, opacity: 0.9 }}>
          <Wand2 size={16} color="#B8925A" />
        </div>
      )}
    </div>
  );
}

const DEMOS = {
  freeze: FreezeDemo,
  magnifier: MagnifierDemo,
  preview: PreviewDemo,
  rootCause: TraceDemo,
  hammer: HammerDemo,
  relay: RelayDemo,
};

const TEXT = {
  zh: { gotIt: "知道了", rewindSuggest: (n) => `回到第 ${n} 步` },
  en: { gotIt: "Got it", rewindSuggest: (n) => `Rewind to step ${n}` },
};

export default function ToolIntroModal({ toolKey, title, caption, onDismiss }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const reduced = useReducedMotion();
  const Demo = DEMOS[toolKey];
  const Icon = TOOL_ICONS[toolKey];
  if (!Demo) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconBadge}>
          <Icon size={20} color="#B23A2E" />
        </div>
        <div style={styles.title}>{title}</div>
        <div style={styles.demoStage}>
          <Demo reduced={reduced} t={t} />
        </div>
        <p style={styles.caption}>{caption}</p>
        <button onClick={onDismiss} style={styles.cta}>
          {t.gotIt}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(43,42,40,0.5)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    padding: 20,
  },
  card: {
    position: "relative",
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.18)",
    borderRadius: 6,
    padding: "26px 26px 22px",
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    boxShadow: "0 24px 60px rgba(43,42,40,0.3)",
  },
  iconBadge: {
    width: 40,
    height: 40,
    margin: "0 auto 10px",
    borderRadius: "50%",
    background: "#F3EEE1",
    border: "1px solid rgba(178,58,46,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: 2,
    margin: "0 0 14px",
    color: "#B23A2E",
  },
  demoStage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  miniStage: {
    position: "relative",
    width: MINI_GEOMETRY.boardPx,
    height: MINI_GEOMETRY.boardPx,
    margin: "0 auto",
  },
  floatingIcon: {
    position: "absolute",
    pointerEvents: "none",
    transition: "opacity 0.25s ease",
  },
  freezeWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  freezeTime: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: 2,
    color: "#2B2A28",
  },
  freezeBadge: {
    padding: "3px 10px",
    borderRadius: 999,
    background: "#B23A2E",
    color: "#EAE2CF",
    fontSize: 12,
    fontFamily: "'EB Garamond', serif",
    fontWeight: 700,
    transition: "opacity 0.3s ease, transform 0.3s ease",
  },
  traceCaption: {
    padding: "6px 12px",
    borderRadius: 4,
    background: "rgba(178,58,46,0.1)",
    border: "1px solid rgba(178,58,46,0.3)",
    color: "#B23A2E",
    fontSize: 12,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 0.5,
    transition: "opacity 0.3s ease, transform 0.3s ease",
  },
  caption: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#5A564C",
    fontFamily: "'Noto Serif TC', serif",
    margin: "16px 0 0",
  },
  cta: {
    width: "100%",
    marginTop: 18,
    padding: "12px 0",
    borderRadius: 4,
    border: "1px solid #B23A2E",
    background: "#B23A2E",
    color: "#EAE2CF",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
};
