import { useState, useRef, useEffect, useCallback } from "react";
import { Home, Feather } from "lucide-react";
import { COLORS, FONT_SERIF, FONT_DISPLAY, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";

const TEXT = {
  zh: {
    home: "主畫面",
    eyebrow: "Sense of Time",
    title: "時感",
    subtitle: "關於時間的感知練習",
    mode1Label: "第一式",
    mode1Title: "你來控制時間",
    mode1Desc: "先知道目標秒數，再用直覺去停下它",
    mode2Label: "第二式",
    mode2Title: "時間自己停下",
    mode2Desc: "按下開始後靜靜等待，猜猜它沉默了多久",
    leave: "← 離開",
    sense: "試著感受",
    unit: "秒",
    ready: "準備好了嗎",
    waiting: "靜靜等待…",
    stoppedAt: "你停下的時刻",
    yourGuess: "你的猜測",
    target: "目標",
    actual: "實際秒數",
    diff: "誤差",
    guessQuestion: "你覺得過了多久？",
    start: "點我開始",
    sensing: "感受中",
    submit: "送出",
    backToMenu: "回選單",
    again: "再一次",
    stats: (n, avg) => `共 ${n} 次　平均誤差 ${avg} 秒`,
    comment: (diff) => {
      if (diff < 0.1) return "近乎完美。你與時間同頻了。";
      if (diff < 0.3) return "很接近了，感知敏銳。";
      if (diff < 0.6) return "差一點點，再試試看。";
      if (diff < 1.5) return "時間比想像的更難捉摸。";
      return "沒關係，時間本來就是主觀的。";
    },
  },
  en: {
    home: "Home",
    eyebrow: "Sense of Time",
    title: "Sense of Time",
    subtitle: "A practice in perceiving the passage of time",
    mode1Label: "Mode I",
    mode1Title: "You control time",
    mode1Desc: "Know the target seconds first, then trust your instinct to stop it",
    mode2Label: "Mode II",
    mode2Title: "Time stops itself",
    mode2Desc: "Press start and wait quietly, then guess how long the silence lasted",
    leave: "← Leave",
    sense: "Try to feel it",
    unit: "sec",
    ready: "Ready?",
    waiting: "Waiting quietly…",
    stoppedAt: "When you stopped",
    yourGuess: "Your guess",
    target: "Target",
    actual: "Actual seconds",
    diff: "Diff",
    guessQuestion: "How long do you think it was?",
    start: "Tap to start",
    sensing: "Sensing",
    submit: "Submit",
    backToMenu: "Back to menu",
    again: "Try again",
    stats: (n, avg) => `${n} tries　avg diff ${avg}s`,
    comment: (diff) => {
      if (diff < 0.1) return "Nearly perfect. You're in sync with time.";
      if (diff < 0.3) return "Very close, a keen sense of time.";
      if (diff < 0.6) return "Just a little off, try again.";
      if (diff < 1.5) return "Time is trickier than it seems.";
      return "That's alright, time is subjective anyway.";
    },
  },
};

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

export default function TimeSense({ onExit }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [screen, setScreen] = useState("home"); // 'home' | 'game'
  const [mode, setMode] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [targetSec, setTargetSec] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState(null); // { userVal, trueVal, diff }
  const [attempts, setAttempts] = useState([]);
  const [guessValue, setGuessValue] = useState("");

  const startTimeRef = useRef(0);
  const actualSecRef = useRef(0);
  const countdownTimer = useRef(null);
  const autoStopTimer = useRef(null);
  const guessInputRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(countdownTimer.current);
    clearTimeout(autoStopTimer.current);
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  useEffect(() => {
    if (phase === "guessing") {
      setTimeout(() => guessInputRef.current?.focus(), 100);
    }
  }, [phase]);

  function goHome() {
    clearAllTimers();
    setAttempts([]);
    setScreen("home");
    setPhase("idle");
  }

  function enterMode(m) {
    clearAllTimers();
    setMode(m);
    setAttempts([]);
    setResult(null);
    setPhase("idle");
    if (m === 1) setTargetSec(randomBetween(3, 10));
    setScreen("game");
  }

  function handleMainBtn() {
    if (phase === "idle") {
      if (mode === 1) startTiming();
      else startCountdown();
    } else if (phase === "timing") {
      stopTiming();
    } else if (phase === "guessing") {
      submitGuess();
    }
  }

  function startTiming() {
    setPhase("timing");
    startTimeRef.current = performance.now();
  }

  function stopTiming() {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    showResult(elapsed, targetSec);
  }

  function startCountdown() {
    setPhase("countdown");
    let count = 3;
    setCountdown(count);
    const tick = () => {
      if (count === 0) {
        setPhase("waiting");
        startHiddenTimer();
        return;
      }
      setCountdown(count);
      count--;
      countdownTimer.current = setTimeout(tick, 900);
    };
    tick();
  }

  function startHiddenTimer() {
    const hiddenSec = randomBetween(2, 8);
    startTimeRef.current = performance.now();
    autoStopTimer.current = setTimeout(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      actualSecRef.current = elapsed;
      setGuessValue("");
      setPhase("guessing");
    }, hiddenSec * 1000);
  }

  function submitGuess() {
    const guess = parseFloat(guessValue);
    if (isNaN(guess) || guess < 0) {
      guessInputRef.current?.focus();
      return;
    }
    showResult(guess, actualSecRef.current);
  }

  function showResult(userVal, trueVal) {
    clearAllTimers();
    const diff = Math.abs(userVal - trueVal);
    setAttempts((a) => [...a, diff]);
    setResult({ userVal, trueVal, diff });
    setPhase("result");
  }

  function resetGame() {
    setResult(null);
    if (mode === 1) setTargetSec(randomBetween(3, 10));
    setPhase("idle");
  }

  const avgDiff = attempts.length ? attempts.reduce((a, b) => a + b, 0) / attempts.length : null;

  return (
    <div style={styles.root}>
      <div style={inkWashStyle} />

      <button onClick={onExit} style={homeBtnStyle} aria-label={t.home}>
        <Home size={15} color={COLORS.inkSoft} />
        <span>{t.home}</span>
      </button>

      <LangToggle />

      {screen === "home" ? (
        <div className="ink-rise" style={styles.wrap}>
          <div style={brandRowStyle}>
            <Feather size={18} color={COLORS.vermillion} />
            <span style={eyebrowStyle}>{t.eyebrow}</span>
          </div>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.subtitle}>{t.subtitle}</p>

          <div style={styles.modeCards}>
            <button style={styles.modeCard} onClick={() => enterMode(1)}>
              <div style={styles.modeLabel}>{t.mode1Label}</div>
              <div style={styles.modeTitle}>{t.mode1Title}</div>
              <div style={styles.modeDesc}>{t.mode1Desc}</div>
            </button>
            <button style={styles.modeCard} onClick={() => enterMode(2)}>
              <div style={styles.modeLabel}>{t.mode2Label}</div>
              <div style={styles.modeTitle}>{t.mode2Title}</div>
              <div style={styles.modeDesc}>{t.mode2Desc}</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="ink-rise" style={styles.wrap}>
          <p style={styles.modeBadge} onClick={goHome}>
            {mode === 1 ? t.mode1Label : t.mode2Label}　{t.leave}
          </p>

          {phase === "idle" && mode === 1 && (
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p style={styles.smallLabel}>{t.sense}</p>
              <div style={styles.targetDisplay}>{targetSec.toFixed(1)}</div>
              <div style={styles.smallLabel}>{t.unit}</div>
            </div>
          )}

          {(phase === "countdown" || phase === "waiting") && (
            <div style={{ textAlign: "center", marginBottom: 40, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={styles.hintText}>{phase === "waiting" ? t.waiting : t.ready}</p>
            </div>
          )}

          {phase === "result" && result && (
            <div style={styles.resultBlock}>
              <div style={styles.resultElapsed}>{result.userVal.toFixed(2)}</div>
              <div style={styles.resultLabel}>
                {mode === 1 ? t.stoppedAt : t.yourGuess}（{t.unit}）
              </div>
              <div style={styles.divider} />
              <div style={styles.resultDiff}>
                {mode === 1 ? t.target : t.actual} {result.trueVal.toFixed(2)} {t.unit}　{t.diff} {result.diff.toFixed(2)} {t.unit}
              </div>
              <div style={styles.resultComment}>{t.comment(result.diff)}</div>
            </div>
          )}

          {phase === "guessing" && (
            <div style={styles.guessWrap}>
              <label style={styles.guessLabel}>{t.guessQuestion}</label>
              <div style={styles.guessInputRow}>
                <input
                  ref={guessInputRef}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={guessValue}
                  onChange={(e) => setGuessValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                  style={styles.guessInput}
                />
                <span style={styles.guessUnit}>{t.unit}</span>
              </div>
            </div>
          )}

          <div style={styles.circleWrap}>
            <div
              className={phase === "timing" || phase === "waiting" ? "ink-ring-pulse" : ""}
              style={styles.circleRing}
            />
            <button
              onClick={handleMainBtn}
              style={{
                ...styles.mainBtn,
                ...(phase === "timing" || phase === "waiting" ? styles.mainBtnTiming : {}),
                ...(phase === "countdown" ? styles.mainBtnCounting : {}),
              }}
            >
              <span
                style={{
                  ...styles.btnLabel,
                  ...(phase === "timing" || phase === "waiting" ? { color: COLORS.paper } : {}),
                }}
              >
                {phase === "idle" ? "○" : phase === "countdown" ? countdown : phase === "timing" || phase === "waiting" ? "●" : phase === "guessing" ? "→" : "○"}
              </span>
              {(phase === "idle" || phase === "timing") && (
                <span
                  style={{
                    ...styles.btnSub,
                    ...(phase === "timing" ? { color: COLORS.inkSoft } : {}),
                  }}
                >
                  {phase === "idle" ? t.start : t.sensing}
                </span>
              )}
              {phase === "guessing" && <span style={styles.btnSub}>{t.submit}</span>}
            </button>
          </div>

          {phase === "result" && (
            <div style={styles.btnRow}>
              <button style={styles.textBtn} onClick={goHome}>
                {t.backToMenu}
              </button>
              <button style={styles.textBtnPrimary} onClick={resetGame}>
                {t.again}
              </button>
            </div>
          )}

          <div style={styles.scoreFooter}>
            {attempts.length > 0 && t.stats(attempts.length, avgDiff.toFixed(2))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    background: COLORS.paper,
    color: COLORS.ink,
    fontFamily: FONT_SERIF,
    display: "flex",
    justifyContent: "center",
    overflowX: "hidden",
  },
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 340,
    padding: "72px 20px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  title: { fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 500, margin: "0 0 6px", letterSpacing: 6, color: COLORS.ink },
  subtitle: { fontSize: 11, letterSpacing: 3, color: COLORS.faint, marginBottom: 48 },
  modeCards: { display: "flex", flexDirection: "column", gap: 14, width: "100%" },
  modeCard: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "20px 24px",
    cursor: "pointer",
    background: COLORS.panel,
    textAlign: "left",
    fontFamily: FONT_SERIF,
    color: COLORS.ink,
  },
  modeLabel: { fontSize: 10, letterSpacing: 4, color: COLORS.vermillion, marginBottom: 6, textTransform: "uppercase" },
  modeTitle: { fontSize: 16, fontWeight: 400 },
  modeDesc: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4, lineHeight: 1.7 },
  modeBadge: {
    fontSize: 10,
    letterSpacing: 4,
    color: COLORS.vermillion,
    textTransform: "uppercase",
    marginBottom: 24,
    cursor: "pointer",
  },
  smallLabel: { fontSize: 13, letterSpacing: 3, color: COLORS.faint, marginBottom: 8 },
  targetDisplay: { fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 300, color: COLORS.ink, lineHeight: 1, marginBottom: 4 },
  hintText: { fontSize: 12, color: COLORS.inkSoft, letterSpacing: 1 },
  resultBlock: { textAlign: "center", marginBottom: 32, minHeight: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  resultElapsed: { fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 300, color: COLORS.ink, lineHeight: 1 },
  resultLabel: { fontSize: 11, letterSpacing: 3, color: COLORS.inkSoft },
  resultComment: { fontSize: 13, color: COLORS.celadon, letterSpacing: 0.5, marginTop: 4, fontStyle: "italic" },
  resultDiff: { fontSize: 12, color: COLORS.hairline, letterSpacing: 1 },
  divider: { width: 40, height: 1, background: COLORS.border, margin: "8px auto" },
  guessWrap: { width: "100%", marginBottom: 32, textAlign: "center" },
  guessLabel: { display: "block", fontSize: 11, letterSpacing: 3, color: COLORS.vermillion, marginBottom: 12, textTransform: "uppercase" },
  guessInputRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 0 },
  guessInput: {
    width: 120,
    background: "transparent",
    border: "none",
    borderBottom: `1.5px solid ${COLORS.ink}`,
    fontFamily: FONT_DISPLAY,
    fontSize: 38,
    fontWeight: 300,
    color: COLORS.ink,
    textAlign: "center",
    outline: "none",
    padding: "4px 8px",
  },
  guessUnit: { fontSize: 13, letterSpacing: 2, color: COLORS.vermillion, paddingBottom: 8 },
  circleWrap: { position: "relative", width: 200, height: 200, margin: "0 auto 40px" },
  circleRing: { position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${COLORS.borderStrong}` },
  mainBtn: {
    position: "absolute",
    inset: 12,
    borderRadius: "50%",
    border: `1.5px solid ${COLORS.ink}`,
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mainBtnTiming: { background: COLORS.vermillion, border: `1.5px solid ${COLORS.vermillion}` },
  mainBtnCounting: { border: `1.5px solid ${COLORS.celadon}` },
  btnLabel: { fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 300, color: COLORS.ink, lineHeight: 1 },
  btnSub: { fontSize: 10, letterSpacing: 3, color: COLORS.inkSoft, textTransform: "uppercase" },
  btnRow: { display: "flex", gap: 12, width: "100%", justifyContent: "center" },
  textBtn: {
    background: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "10px 22px",
    fontFamily: FONT_SERIF,
    fontSize: 13,
    letterSpacing: 2,
    color: COLORS.ink,
    cursor: "pointer",
  },
  textBtnPrimary: {
    background: COLORS.ink,
    border: `1px solid ${COLORS.ink}`,
    borderRadius: 4,
    padding: "10px 22px",
    fontFamily: FONT_SERIF,
    fontSize: 13,
    letterSpacing: 2,
    color: COLORS.paper,
    cursor: "pointer",
  },
  scoreFooter: { marginTop: 32, fontSize: 11, letterSpacing: 2, color: COLORS.hairline, textAlign: "center", minHeight: 16 },
};
