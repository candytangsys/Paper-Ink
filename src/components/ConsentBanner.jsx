import { useState } from "react";
import { COLORS, FONT_SERIF } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import { hasAdConsentChoice, setAdConsent } from "../adConsent.js";

const TEXT = {
  zh: {
    body: "本 App 使用廣告以維持免費。",
    agree: "同意",
    necessaryOnly: "僅必要",
  },
  en: {
    body: "This app uses ads to stay free.",
    agree: "Agree",
    necessaryOnly: "Necessary only",
  },
};

// Minimal CMP (RD 指令 v1.0 §三之3). Shown once, on first launch, until the
// player makes an explicit choice — no dismiss-without-choosing, since
// unlockViaAd()/maybeShowInterstitial() both refuse to call into any ad
// provider until a choice is recorded (see adConsent.js).
export default function ConsentBanner() {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [visible, setVisible] = useState(() => !hasAdConsentChoice());

  if (!visible) return null;

  const choose = (ads) => {
    setAdConsent(ads);
    setVisible(false);
  };

  return (
    <div style={styles.banner}>
      <div style={styles.body}>{t.body}</div>
      <div style={styles.actions}>
        <button onClick={() => choose(false)} style={styles.ghostBtn}>
          {t.necessaryOnly}
        </button>
        <button onClick={() => choose(true)} style={styles.solidBtn}>
          {t.agree}
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 40,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "14px 16px",
    boxShadow: "0 8px 30px rgba(46,42,34,0.22)",
    maxWidth: 440,
    margin: "0 auto",
    fontFamily: FONT_SERIF,
  },
  body: { flex: 1, minWidth: 180, fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 },
  actions: { display: "flex", alignItems: "center", gap: 8 },
  ghostBtn: {
    background: "transparent",
    border: `1px solid ${COLORS.borderStrong}`,
    borderRadius: 4,
    padding: "8px 14px",
    fontSize: 12.5,
    color: COLORS.ink,
    fontFamily: FONT_SERIF,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  solidBtn: {
    background: COLORS.vermillion,
    color: COLORS.panel,
    border: "none",
    borderRadius: 4,
    padding: "8px 14px",
    fontSize: 12.5,
    fontFamily: FONT_SERIF,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
