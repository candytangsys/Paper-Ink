import { useState, useEffect, useRef } from "react";

const TEXT = {
  zh: {
    eyebrow: "猜數字遊戲",
    title: "GUESS THE CODE",
    subtitle: "四個不重複的數字 · 猜中位置得分",
    empty: "還沒有猜測紀錄",
    unit: "位",
    winTitle: "答對了！",
    winDetail: (ans, n) => (<>答案是 <strong style={{ color: "#fff" }}>{ans}</strong>，共猜了 {n} 次</>),
    playAgain: "再玩一次",
    placeholder: "輸入四個數字",
    guess: "猜！",
    hint: "數字 0–9，四個不重複 · 回傳幾個位置猜對",
    restart: "重新開始",
    reveal: "公布解答",
    answerIs: (ans) => (<>答案是 <strong style={{ color: "#fff" }}>{ans}</strong></>),
  },
  en: {
    eyebrow: "NUMBER GUESSING",
    title: "GUESS THE CODE",
    subtitle: "Four unique digits · score by correct position",
    empty: "No guesses yet",
    unit: "hit",
    winTitle: "You got it!",
    winDetail: (ans, n) => (<>The code was <strong style={{ color: "#fff" }}>{ans}</strong>, in {n} guesses</>),
    playAgain: "Play again",
    placeholder: "Enter four digits",
    guess: "Guess!",
    hint: "Digits 0–9, four unique · returns how many positions are right",
    restart: "Restart",
    reveal: "Reveal answer",
    answerIs: (ans) => (<>The answer is <strong style={{ color: "#fff" }}>{ans}</strong></>),
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

export default function App() {
  const [secret, setSecret] = useState(() => generateSecret());
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [lang, setLang] = useState("zh");
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
    setHistory(h => [...h, { guess: input, correct }]);
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
    <div style={{
      minHeight: "100vh",
      background: "#0f0f1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      fontFamily: "'Courier New', monospace",
      color: "#e0e0f0",
      padding: "32px 16px",
      position: "relative",
    }}>
      {/* Language toggle */}
      <button onClick={() => setLang(l => (l === "zh" ? "en" : "zh"))} style={{
        position: "absolute",
        top: 16,
        right: 16,
        background: "transparent",
        color: "#888",
        border: "1px solid #2a2a4a",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: 1,
        fontFamily: "inherit",
      }}>{lang === "zh" ? "EN" : "中"}</button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          fontSize: 13,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#6c63ff",
          marginBottom: 8,
        }}>{t.eyebrow}</div>
        <h1 style={{
          fontSize: 38,
          fontWeight: 900,
          margin: 0,
          letterSpacing: 2,
          color: "#ffffff",
        }}>{t.title}</h1>
        <p style={{ color: "#888", marginTop: 8, fontSize: 14, letterSpacing: 1 }}>
          {t.subtitle}
        </p>
      </div>

      {/* Game Box */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#16162a",
        borderRadius: 16,
        border: "1px solid #2a2a4a",
        padding: 24,
        boxShadow: "0 8px 40px rgba(108,99,255,0.15)",
      }}>

        {/* History */}
        <div style={{ marginBottom: 20, minHeight: 60 }}>
          {history.length === 0 && (
            <div style={{ color: "#444", textAlign: "center", fontSize: 13, padding: "12px 0" }}>
              {t.empty}
            </div>
          )}
          {history.map((row, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              marginBottom: 6,
              borderRadius: 8,
              background: row.correct === 4 ? "#1a2e1a" : "#1a1a2e",
              border: `1px solid ${row.correct === 4 ? "#3a7a3a" : "#2a2a4a"}`,
            }}>
              <span style={{ fontSize: 13, color: "#aaa" }}>#{i + 1}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {row.guess.split("").map((d, j) => (
                  <span key={j} style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: "#0f0f1a",
                    border: "1px solid #333",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: 0,
                  }}>{d}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: row.correct === 4 ? "#5dba5d" : row.correct > 0 ? "#6c63ff" : "#555",
                }}>{row.correct}</span>
                <span style={{ fontSize: 11, color: "#666" }}>{t.unit}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Win State */}
        {won ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#5dba5d", marginBottom: 4 }}>
              {t.winTitle}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
              {t.winDetail(secret.join(""), history.length)}
            </div>
            <button onClick={handleRestart} style={{
              background: "#6c63ff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 1,
            }}>{t.playAgain}</button>
          </div>
        ) : revealed ? (
          /* Revealed: answer shown, must restart */
          <div style={{ textAlign: "center", padding: "4px 0" }}>
            <div style={{ fontSize: 15, color: "#888", marginBottom: 16 }}>
              {t.answerIs(secret.join(""))}
            </div>
            <button onClick={handleRestart} style={{
              background: "#6c63ff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 1,
            }}>{t.playAgain}</button>
          </div>
        ) : (
          /* Input Row */
          <div style={{ display: "flex", gap: 10 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              maxLength={4}
              placeholder={t.placeholder}
              style={{
                flex: 1,
                background: "#0f0f1a",
                border: "1px solid #3a3a5a",
                borderRadius: 8,
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                padding: "10px 14px",
                outline: "none",
                letterSpacing: 8,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleGuess}
              disabled={input.length !== 4}
              style={{
                background: input.length === 4 ? "#6c63ff" : "#2a2a4a",
                color: input.length === 4 ? "#fff" : "#555",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 15,
                fontWeight: 700,
                cursor: input.length === 4 ? "pointer" : "default",
                transition: "background 0.2s",
                letterSpacing: 1,
              }}
            >{t.guess}</button>
          </div>
        )}

        {/* Hint */}
        {!won && !revealed && (
          <div style={{ marginTop: 14, color: "#444", fontSize: 12, textAlign: "center" }}>
            {t.hint}
          </div>
        )}

        {/* Reveal answer */}
        {!won && !revealed && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button onClick={() => setRevealed(true)} style={{
              background: "transparent",
              color: "#777",
              border: "1px dashed #3a3a5a",
              borderRadius: 8,
              padding: "7px 18px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 1,
              fontFamily: "inherit",
            }}>{t.reveal}</button>
          </div>
        )}
      </div>

      {/* Restart (during game) */}
      {!won && !revealed && history.length > 0 && (
        <button onClick={handleRestart} style={{
          marginTop: 16,
          background: "transparent",
          color: "#555",
          border: "1px solid #2a2a4a",
          borderRadius: 8,
          padding: "7px 18px",
          fontSize: 12,
          cursor: "pointer",
          letterSpacing: 1,
        }}>{t.restart}</button>
      )}
    </div>
  );
}
