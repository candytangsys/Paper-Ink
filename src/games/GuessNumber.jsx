import { useState, useEffect, useRef } from "react";
import { Home, Feather } from "lucide-react";
import { COLORS, FONT_SERIF, FONT_DISPLAY, inkWashStyle, homeBtnStyle, brandRowStyle, eyebrowStyle } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import LangToggle from "../components/LangToggle.jsx";

const TEXT = {
  zh: {
    eyebrow: "猜數字遊戲",
    title: "猜數字",
    subtitle: "四個不重複的數字 · 猜中位置得分",
    empty: "還沒有猜測紀錄",
    unit: "位",
    winTitle: "答對了",
    winDetail: (ans, n) => (<>答案是 <strong style={{ color: COLORS.vermillion }}>{ans}</strong>，共猜了 {n} 次</>),
    playAgain: "再玩一次",
    placeholder: "輸入四個數字",
    guess: "猜",
    hint: "數字 0–9，四個不重複 · 回傳幾個位置猜對",
    restart: "重新開始",
    reveal: "公布解答",
    answerIs: (ans) => (<>答案是 <strong style={{ color: COLORS.vermillion }}>{ans}</strong></>),
    home: "主畫面",
  },
  en: {
    eyebrow: "NUMBER GUESSING",
    title: "GUESS THE CODE",
    subtitle: "Four unique digits · score by correct position",
    empty: "No guesses yet",
    unit: "hit",
    winTitle: "You got it",
    winDetail: (ans, n) => (<>The code was <strong style={{ color: COLORS.vermillion }}>{ans}</strong>, in {n} guesses</>),
    playAgain: "Play again",
    placeholder: "Enter four digits",
    guess: "Guess",
    hint: "Digits 0–9, four unique · returns how many positions are right",
    restart: "Restart",
    reveal: "Reveal answer",
    answerIs: (ans) => (<>The answer is <strong style={{ color: COLORS.vermillion }}>{ans}</strong></>),
    home: "Home",
  },
};

function generateSecret() {
  const digits = Array.from({ length: 10 }, (_, i) => i);
  const shuffled = digits.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function countCorrect(secret, guess) {
  let count = 0;
  for (let i = 0; i < 4; i++) {
    if (secret[i] === Number(guess[i])) count++;
  }
  return count;
}

export default function GuessNumber({ onExit }) {
  const [secret, setSecret] = useState(() => generateSecret());
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [won]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function handleInput(e) {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    setInput(val);
  }

  function handleGuess() {
    if (input.length !== 4) return;
    const correct = countCorrect(secret, input);
    const isWin = correct === 4;
    setHistory((h) => [...h, { guess: input, correct }]);
    if (isWin) setWon(true);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleGuess();
  }

  function handleRestart() {
    setSecret(generateSecret());
    setHistory([]);
    setWon(false);
    setRevealed(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div style={styles.root}>
      <div style={inkWashStyle} />

      <button onClick={onExit} style={homeBtnStyle} aria-label={t.home}>
        <Home size={15} color={COLORS.inkSoft} />
        <span>{t.home}</span>
      </button>

      <LangToggle />

      <div className="ink-rise" style={styles.wrap}>
        <div style={brandRowStyle}>
          <Feather size={18} color={COLORS.vermillion} />
          <span style={eyebrowStyle}>{t.eyebrow}</span>
        </div>
        <h1 style={styles.title}>{t.title}</h1>
        <p style={styles.subtitle}>{t.subtitle}</p>

        <div style={styles.panel}>
          <div style={{ marginBottom: 20, minHeight: 60 }}>
            {history.length === 0 && <div style={styles.empty}>{t.empty}</div>}
            {history.map((row, i) => (
              <div
                key={i}
                style={{
                  ...styles.historyRow,
                  background: row.correct === 4 ? "rgba(110,142,134,0.14)" : "transparent",
                  border: `1px solid ${row.correct === 4 ? "rgba(110,142,134,0.5)" : COLORS.border}`,
                }}
              >
                <span style={styles.rowIndex}>#{i + 1}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {row.guess.split("").map((d, j) => (
                    <span key={j} style={styles.digitChip}>
                      {d}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      ...styles.scoreNum,
                      color: row.correct === 4 ? COLORS.celadon : row.correct > 0 ? COLORS.indigoGrey : COLORS.hairline,
                    }}
                  >
                    {row.correct}
                  </span>
                  <span style={styles.scoreUnit}>{t.unit}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {won ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={styles.winTitle}>{t.winTitle}</div>
              <div style={styles.winDetail}>{t.winDetail(secret.join(""), history.length)}</div>
              <button onClick={handleRestart} style={styles.primaryBtn}>
                {t.playAgain}
              </button>
            </div>
          ) : revealed ? (
            <div style={{ textAlign: "center", padding: "4px 0" }}>
              <div style={styles.winDetail}>{t.answerIs(secret.join(""))}</div>
              <button onClick={handleRestart} style={styles.primaryBtn}>
                {t.playAgain}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                maxLength={4}
                placeholder={t.placeholder}
                style={{
                  ...styles.input,
                  letterSpacing: input.length > 0 ? 8 : 0.5,
                  fontSize: input.length > 0 ? 22 : 15,
                }}
              />
              <button
                onClick={handleGuess}
                disabled={input.length !== 4}
                style={{
                  ...styles.primaryBtn,
                  margin: 0,
                  opacity: input.length === 4 ? 1 : 0.4,
                  cursor: input.length === 4 ? "pointer" : "default",
                }}
              >
                {t.guess}
              </button>
            </div>
          )}

          {!won && !revealed && <div style={styles.hint}>{t.hint}</div>}

          {!won && !revealed && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button onClick={() => setRevealed(true)} style={styles.ghostBtnSmall}>
                {t.reveal}
              </button>
            </div>
          )}
        </div>

        {!won && !revealed && history.length > 0 && (
          <button onClick={handleRestart} style={styles.restartBtn}>
            {t.restart}
          </button>
        )}
      </div>
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
    overflowX: "hidden",
    display: "flex",
    justifyContent: "center",
  },
  wrap: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 440,
    padding: "72px 20px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 40,
    fontWeight: 600,
    margin: "0 0 10px",
    letterSpacing: 4,
    color: COLORS.ink,
  },
  subtitle: { fontSize: 14, color: COLORS.inkSoft, margin: "0 0 32px", letterSpacing: 1, lineHeight: 1.6 },
  panel: {
    width: "100%",
    background: COLORS.panel,
    borderRadius: 6,
    border: `1px solid ${COLORS.border}`,
    padding: 24,
    boxShadow: "0 2px 24px rgba(51,48,42,0.10)",
    textAlign: "left",
  },
  empty: { color: COLORS.hairline, textAlign: "center", fontSize: 13, padding: "12px 0" },
  historyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    marginBottom: 6,
    borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
  },
  rowIndex: { fontSize: 12, color: COLORS.faint, fontFamily: "'EB Garamond', serif" },
  digitChip: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    background: COLORS.paper,
    border: `1px solid ${COLORS.border}`,
    fontSize: 17,
    fontWeight: 600,
    color: COLORS.ink,
    fontFamily: FONT_DISPLAY,
  },
  scoreNum: { fontSize: 21, fontWeight: 700, fontFamily: FONT_DISPLAY },
  scoreUnit: { fontSize: 11, color: COLORS.faint },
  winTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: 4,
    color: COLORS.vermillion,
    marginBottom: 8,
  },
  winDetail: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 18 },
  primaryBtn: {
    background: COLORS.vermillion,
    color: COLORS.panel,
    border: "none",
    borderRadius: 4,
    padding: "10px 26px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 2,
    fontFamily: FONT_SERIF,
    flex: "0 0 auto",
  },
  input: {
    flex: 1,
    minWidth: 0,
    background: COLORS.paper,
    border: `1px solid ${COLORS.borderStrong}`,
    borderRadius: 4,
    color: COLORS.ink,
    fontWeight: 600,
    padding: "10px 14px",
    outline: "none",
    fontFamily: FONT_DISPLAY,
  },
  hint: { marginTop: 14, color: COLORS.faint, fontSize: 12, textAlign: "center", letterSpacing: 0.5 },
  ghostBtnSmall: {
    background: "transparent",
    color: COLORS.inkSoft,
    border: `1px dashed ${COLORS.borderStrong}`,
    borderRadius: 4,
    padding: "7px 18px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 1,
    fontFamily: FONT_SERIF,
  },
  restartBtn: {
    marginTop: 16,
    background: "transparent",
    color: COLORS.faint,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "7px 18px",
    fontSize: 12,
    cursor: "pointer",
    letterSpacing: 1,
    fontFamily: FONT_SERIF,
  },
};
