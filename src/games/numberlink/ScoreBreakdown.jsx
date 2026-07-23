// Renders a computeScore() result (src/engine/score.mjs) as a total plus a
// compact breakdown line. Shared between NumberLink.jsx and Daily.jsx's win
// screens since both need identical rendering of the same score shape;
// callers pass their own (already-translated) labels since this codebase
// keeps TEXT dictionaries per-screen rather than centralized.
//
// `pointsBalance` + `labels.balance` are optional: when provided (the score
// this run earned has just been credited via addPoints, v3.1 §一), renders
// a second line with the running wallet total so the credit is visible at
// the moment it happens, not just later on Home.
export default function ScoreBreakdown({ score, labels, pointsBalance }) {
  if (!score) return null;
  const { total, breakdown } = score;
  const parts = [
    breakdown.base > 0 && `${labels.base} +${breakdown.base}`,
    breakdown.time > 0 && `${labels.time} +${breakdown.time}`,
    breakdown.accuracy > 0 && `${labels.accuracy} +${breakdown.accuracy}`,
    breakdown.noHint > 0 && `${labels.noHint} +${breakdown.noHint}`,
    breakdown.milestone > 0 && `${labels.milestone} +${breakdown.milestone}`,
  ].filter(Boolean);

  return (
    <div style={styles.wrap}>
      <div style={styles.total}>{labels.total} {total}</div>
      <div style={styles.parts}>{parts.join(" · ")}</div>
      {pointsBalance != null && labels.balance && (
        <div style={styles.balanceLine}>{labels.balance(total, pointsBalance)}</div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  total: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#B8925A",
    letterSpacing: 1,
  },
  parts: {
    fontSize: 11.5,
    color: "#8B8478",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
  },
  balanceLine: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#B8925A",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
  },
};
