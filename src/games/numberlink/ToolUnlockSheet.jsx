// Shared "watch ad or spend points" picker for the hint tools (放大鏡 /
// 溯源符 / ..., v3.1 §一之3/4b). Used by both NumberLink.jsx and Daily.jsx so
// the unlock UX never drifts between tutorial levels and the Daily
// Challenge.
//
// v3.6: an optional `resetInfo` — { label, cost, watchAdLabel,
// spendPointsLabel(cost), onWatchAd, onSpendPoints } — renders an extra
// section for clearing a tool's purchase-escalation markup on demand,
// separate from the main unlock actions above it. Only passed in by callers
// when the tool actually has a markup to clear (toolUnlock.js's
// canResetEscalation()).
export default function ToolUnlockSheet({ open, title, cost, pointsBalance, error, labels, onWatchAd, onSpendPoints, onCancel, resetInfo }) {
  if (!open) return null;
  const canAfford = pointsBalance == null || pointsBalance >= cost;
  const canAffordReset = resetInfo && (pointsBalance == null || pointsBalance >= resetInfo.cost);

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>{title}</div>
        {pointsBalance != null && <div style={styles.balance}>{labels.balance(pointsBalance)}</div>}
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button onClick={onWatchAd} style={styles.btnSolid}>
            {labels.watchAd}
          </button>
          <button
            onClick={onSpendPoints}
            disabled={!canAfford}
            style={{ ...styles.btnGhost, ...(canAfford ? {} : styles.btnDisabled) }}
          >
            {labels.spendPoints(cost)}
          </button>
          <button onClick={onCancel} style={styles.btnText}>
            {labels.cancel}
          </button>
        </div>

        {resetInfo && (
          <div style={styles.resetSection}>
            <div style={styles.resetLabel}>{resetInfo.label}</div>
            <div style={styles.resetActions}>
              <button onClick={resetInfo.onWatchAd} style={styles.resetBtn}>
                {resetInfo.watchAdLabel}
              </button>
              <button
                onClick={resetInfo.onSpendPoints}
                disabled={!canAffordReset}
                style={{ ...styles.resetBtn, ...(canAffordReset ? {} : styles.btnDisabled) }}
              >
                {resetInfo.spendPointsLabel(resetInfo.cost)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(43,42,40,0.42)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    padding: 20,
  },
  card: {
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.18)",
    borderRadius: 6,
    padding: "26px 24px",
    textAlign: "center",
    maxWidth: 300,
    width: "100%",
    boxShadow: "0 24px 60px rgba(43,42,40,0.28)",
  },
  title: {
    fontFamily: "'Noto Serif TC', serif",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: 2,
    color: "#2B2A28",
  },
  balance: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#8B8478",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
  },
  error: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#B23A2E",
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
  },
  actions: {
    marginTop: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  btnSolid: {
    padding: "11px 0",
    borderRadius: 4,
    border: "1px solid #B23A2E",
    background: "#B23A2E",
    color: "#EAE2CF",
    fontWeight: 600,
    fontSize: 13.5,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1.5,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "11px 0",
    borderRadius: 4,
    border: "1px solid rgba(43,42,40,0.22)",
    background: "transparent",
    color: "#2B2A28",
    fontSize: 13.5,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1.5,
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  btnText: {
    padding: "6px 0",
    border: "none",
    background: "transparent",
    color: "#8B8478",
    fontSize: 12.5,
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 1,
    cursor: "pointer",
  },
  resetSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid rgba(43,42,40,0.14)",
  },
  resetLabel: {
    fontSize: 11.5,
    color: "#8B8478",
    fontFamily: "'EB Garamond', serif",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  resetActions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resetBtn: {
    padding: "9px 0",
    borderRadius: 4,
    border: "1px solid rgba(139,106,50,0.4)",
    background: "transparent",
    color: "#8B6A32",
    fontSize: 12.5,
    fontFamily: "'Noto Serif TC', serif",
    letterSpacing: 1,
    cursor: "pointer",
  },
};
