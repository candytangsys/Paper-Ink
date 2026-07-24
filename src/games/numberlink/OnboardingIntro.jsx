import { useState, useEffect, useMemo } from "react";
import { Feather, Undo2, RotateCcw, Search, Crosshair, Wand2, Route, Snowflake, Coins } from "lucide-react";
import { useLanguage } from "../../i18n.jsx";
import { buildHashRoute } from "../../router.js";
import { boardMetrics } from "./Board.jsx";
import { inkTrailColor } from "../../theme.jsx";

/* ---------------------------------------------------------
   First-run walkthrough for regular levels (v3.3) — shown once
   ever (gated by src/tutorialIntro.js), before the player's
   very first puzzle, always on the smallest (2×2) chapter so
   every demo below can hardcode a real 2×2 board instead of an
   abstract example.

   Previously a single static card of four text bullets. Per
   feedback that a wall of text doesn't actually teach the
   *feel* of the game, this is now a 4-step carousel where each
   step animates a live-looking miniature board (same
   boardMetrics()/inkTrailColor() the real board uses) acting
   out the mechanic being explained — connecting cells, undo/
   retry, the idle auto-hint, and the tool rail — on a loop, with
   only a short caption per step instead of a paragraph.
--------------------------------------------------------- */

// Demo path for the mini 2×2 board: (0,0)→(0,1)→(1,0)→(1,1), i.e. right,
// then diagonal, then right again — deliberately includes one diagonal
// step so "8 directions" isn't just claimed in text but actually shown.
const NODE_CELLS = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function useReducedMotion() {
  return useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
}

// Cycles through `frames` (an array of { ...state, ms }) forever, holding
// each for its own `ms` before advancing — self-scheduling via chained
// setTimeout rather than a fixed-interval setInterval so uneven per-frame
// dwell times (a long "celebrate" pause vs. a quick reset) just work. Frozen
// on frame 0 when `enabled` is false (prefers-reduced-motion).
function useLoopingFrames(frames, enabled) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timeoutId;
    let i = 0;
    const tick = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        i = (i + 1) % frames.length;
        setIndex(i);
        tick();
      }, frames[i].ms);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [frames, enabled]);
  return frames[enabled ? index : frames.length - 1];
}

// The animated 2×2 board shared by the "connect", "undo/retry", and
// "auto-hint" steps — only the frame script driving it differs.
function MiniGrid({ filledCount, ringIndex, hintIndex, celebrate }) {
  const { cellSize, gap, pad, boardPx } = boardMetrics(2);
  const centerOf = (idx) => {
    const [r, c] = NODE_CELLS[idx];
    return { x: pad + c * (cellSize + gap) + cellSize / 2, y: pad + r * (cellSize + gap) + cellSize / 2 };
  };

  return (
    <div style={{ position: "relative", width: boardPx, height: boardPx, margin: "0 auto" }}>
      <svg width={boardPx} height={boardPx} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((i) => {
          if (filledCount < i + 2) return null;
          const a = centerOf(i);
          const b = centerOf(i + 1);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={inkTrailColor(i / 2)}
              strokeWidth={Math.max(3, cellSize * 0.16)}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {NODE_CELLS.map((cell, idx) => {
        const filled = idx < filledCount;
        const isRing = ringIndex === idx;
        const isHint = hintIndex === idx;
        const { x, y } = centerOf(idx);
        return (
          <div
            key={idx}
            className={isRing || isHint ? "ink-pulse" : ""}
            style={{
              position: "absolute",
              left: x - cellSize / 2,
              top: y - cellSize / 2,
              width: cellSize,
              height: cellSize,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'EB Garamond', 'Noto Serif TC', serif",
              fontWeight: 600,
              fontSize: 18,
              background: isHint ? "rgba(184,146,90,0.18)" : filled ? inkTrailColor(idx / 3) : "#EBE3D0",
              color: isHint ? "#8B6A32" : filled ? "#F3EEE1" : "#B7AC96",
              border: isHint ? "2px solid #B8925A" : filled ? "1px solid rgba(243,238,225,0.55)" : "1px solid rgba(43,42,40,0.16)",
              boxShadow: isRing ? "0 0 0 4px rgba(178,58,46,0.35)" : "none",
              transition: "background 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease",
            }}
          >
            {filled ? idx + 1 : ""}
          </div>
        );
      })}
      {celebrate && (
        <div style={styles.celebrate}>
          <Feather size={26} color="#B23A2E" />
        </div>
      )}
    </div>
  );
}

const CONNECT_FRAMES = [
  { filledCount: 0, ringIndex: 0, ms: 550 },
  { filledCount: 1, ringIndex: 1, ms: 550 },
  { filledCount: 2, ringIndex: 2, ms: 550 },
  { filledCount: 3, ringIndex: 3, ms: 550 },
  { filledCount: 4, ringIndex: null, celebrate: true, ms: 1000 },
];

const UNDO_FRAMES = [
  { filledCount: 3, icon: null, ms: 600 },
  { filledCount: 3, icon: "undo", ms: 450 },
  { filledCount: 2, icon: null, ms: 550 },
  { filledCount: 2, icon: "retry", ms: 450 },
  { filledCount: 0, icon: null, ms: 450 },
  { filledCount: 1, icon: null, ms: 150 },
  { filledCount: 2, icon: null, ms: 150 },
  { filledCount: 3, icon: null, ms: 150 },
];

const HINT_FRAMES = [
  { filledCount: 2, hintIndex: null, ms: 700 },
  { filledCount: 2, hintIndex: 2, ms: 800 },
  { filledCount: 3, hintIndex: null, ms: 550 },
  { filledCount: 0, hintIndex: null, ms: 200 },
  { filledCount: 1, hintIndex: null, ms: 150 },
  { filledCount: 2, hintIndex: null, ms: 150 },
];

const TOOL_KEYS = ["magnifier", "rootCause", "relay", "preview", "freeze"];
const TOOL_ICONS = { magnifier: Search, rootCause: Crosshair, relay: Wand2, preview: Route, freeze: Snowflake };
const TOOLS_FRAMES = [
  { visible: 0, ms: 180 },
  { visible: 1, ms: 150 },
  { visible: 2, ms: 150 },
  { visible: 3, ms: 150 },
  { visible: 4, ms: 150 },
  { visible: 5, ms: 1000 },
];

function ConnectDemo({ reduced }) {
  const f = useLoopingFrames(CONNECT_FRAMES, !reduced);
  return <MiniGrid filledCount={f.filledCount} ringIndex={f.ringIndex} celebrate={f.celebrate} />;
}

function UndoDemo({ reduced, t }) {
  const f = useLoopingFrames(UNDO_FRAMES, !reduced);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <MiniGrid filledCount={f.filledCount} />
      <div style={styles.iconRow}>
        <span style={{ ...styles.iconChip, ...(f.icon === "undo" ? styles.iconChipActive : {}) }}>
          <Undo2 size={15} />
          <span>{t.undo}</span>
        </span>
        <span style={{ ...styles.iconChip, ...(f.icon === "retry" ? styles.iconChipActive : {}) }}>
          <RotateCcw size={15} />
          <span>{t.retry}</span>
        </span>
      </div>
    </div>
  );
}

function HintDemo({ reduced }) {
  const f = useLoopingFrames(HINT_FRAMES, !reduced);
  return <MiniGrid filledCount={f.filledCount} hintIndex={f.hintIndex} />;
}

function ToolsDemo({ reduced }) {
  const f = useLoopingFrames(TOOLS_FRAMES, !reduced);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={styles.toolsRow}>
        {TOOL_KEYS.map((key, i) => {
          const Icon = TOOL_ICONS[key];
          const shown = f.visible > i;
          return (
            <span
              key={key}
              style={{
                ...styles.toolIcon,
                opacity: shown ? 1 : 0,
                transform: shown ? "scale(1)" : "scale(0.6)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
              }}
            >
              <Icon size={18} />
            </span>
          );
        })}
      </div>
      <span
        style={{
          ...styles.pointsChip,
          opacity: f.visible >= 5 ? 1 : 0,
          transform: f.visible >= 5 ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        <Coins size={14} color="#B8925A" />
        <span>+50</span>
      </span>
    </div>
  );
}

const TEXT = {
  zh: {
    steps: [
      { title: "① 連線", caption: "依序點擊數字 1 → N，可上下左右斜角八個方向移動；按住拖曳能一筆畫完。" },
      { title: "② 回退與重來", caption: "點錯了嗎？回退可收回一步；重來能清空重新挑戰同一題。", undo: "回退", retry: "重來" },
      { title: "③ 卡關提醒", caption: "如果走法已經卡死，停頓幾秒後系統會提醒你，說明可能需要回退或重來一次。" },
      { title: "④ 道具與積分", caption: "完成關卡會累積積分，右側 5 種道具可用積分或看廣告解鎖，助你度過難關。" },
    ],
    prev: "上一步",
    next: "下一步",
    start: "開始遊戲",
    skip: "略過",
    rulesLink: "查看完整玩法與積分說明",
  },
  en: {
    steps: [
      { title: "① Connect", caption: "Tap numbers 1 → N in order — 8-directional moves including diagonals. Press and hold to draw the whole stroke." },
      { title: "② Undo & Retry", caption: "Tapped the wrong cell? Undo takes back one step; Retry clears the board and restarts the same puzzle.", undo: "Undo", retry: "Retry" },
      { title: "③ Stuck Reminder", caption: "Hit a dead end? After a short pause the game lets you know — it may be time to undo or retry." },
      { title: "④ Tools & Points", caption: "Clearing puzzles earns points. 5 tools on the right can be unlocked with points or a quick ad when you need help." },
    ],
    prev: "Back",
    next: "Next",
    start: "Start Playing",
    skip: "Skip",
    rulesLink: "See full rules & scoring",
  },
};

export default function OnboardingIntro({ onDismiss }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const stepData = t.steps[step];
  const isLast = step === t.steps.length - 1;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <button onClick={onDismiss} style={styles.skip}>
          {t.skip}
        </button>

        <div style={styles.title}>{stepData.title}</div>

        <div style={styles.demoStage}>
          {step === 0 && <ConnectDemo reduced={reduced} />}
          {step === 1 && <UndoDemo reduced={reduced} t={stepData} />}
          {step === 2 && <HintDemo reduced={reduced} />}
          {step === 3 && <ToolsDemo reduced={reduced} />}
        </div>

        <p style={styles.caption}>{stepData.caption}</p>

        <div style={styles.dots}>
          {t.steps.map((_, i) => (
            <span key={i} style={{ ...styles.dot, ...(i === step ? styles.dotActive : {}) }} />
          ))}
        </div>

        <a href={`#${buildHashRoute("rules")}`} style={styles.rulesLink}>
          {t.rulesLink}
        </a>

        <div style={styles.actions}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} style={styles.ghostBtn}>
              {t.prev}
            </button>
          )}
          <button onClick={() => (isLast ? onDismiss() : setStep((s) => s + 1))} style={styles.cta}>
            {isLast ? t.start : t.next}
          </button>
        </div>
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
    padding: "28px 26px 24px",
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
    boxShadow: "0 24px 60px rgba(43,42,40,0.3)",
  },
  skip: {
    position: "absolute",
    top: 14,
    right: 16,
    background: "transparent",
    border: "none",
    color: "#8B8478",
    fontSize: 11.5,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
    cursor: "pointer",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 2,
    margin: "6px 0 16px",
    color: "#B23A2E",
  },
  demoStage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 168,
  },
  celebrate: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  iconRow: {
    display: "flex",
    gap: 10,
  },
  iconChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: 999,
    background: "#F3EEE1",
    border: "1px solid rgba(43,42,40,0.16)",
    color: "#8B8478",
    fontSize: 11.5,
    fontFamily: "'Noto Serif TC', serif",
    transition: "background 0.25s ease, color 0.25s ease, border-color 0.25s ease",
  },
  iconChipActive: {
    background: "#B8925A",
    borderColor: "#B8925A",
    color: "#F3EEE1",
  },
  toolsRow: {
    display: "flex",
    gap: 10,
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F3EEE1",
    border: "1px solid rgba(43,42,40,0.16)",
    color: "#2B2A28",
  },
  pointsChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 999,
    background: "#F3EEE1",
    border: "1px solid rgba(43,42,40,0.16)",
    color: "#8B6A32",
    fontSize: 12.5,
    fontFamily: "'EB Garamond', serif",
    fontWeight: 600,
  },
  caption: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#5A564C",
    fontFamily: "'Noto Serif TC', serif",
    margin: "16px 0 0",
    minHeight: 42,
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: 7,
    margin: "16px 0 4px",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "rgba(43,42,40,0.2)",
  },
  dotActive: {
    background: "#B23A2E",
  },
  rulesLink: {
    display: "inline-block",
    marginTop: 10,
    fontSize: 12,
    color: "#4C5B6E",
    textDecoration: "underline",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 18,
  },
  ghostBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 4,
    border: "1px solid rgba(43,42,40,0.22)",
    background: "transparent",
    color: "#2B2A28",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 2,
    cursor: "pointer",
  },
  cta: {
    flex: 2,
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
