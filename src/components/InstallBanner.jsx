import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";
import { COLORS, FONT_SERIF } from "../theme.jsx";
import { useLanguage } from "../i18n.jsx";
import {
  hasDeferredPrompt,
  onPromptAvailable,
  triggerInstall,
  isIOS,
  isStandalone,
  getInstallProgress,
  dismissInstallPrompt,
} from "../pwaInstall.js";

const TEXT = {
  zh: {
    title: "安裝紙墨集到主畫面",
    body: "像 App 一樣開啟，離線也能玩。",
    iosBody: "點選分享圖示，選擇「加入主畫面」。",
    install: "安裝",
    dismiss: "不用了",
  },
  en: {
    title: "Add Paper & Ink to your home screen",
    body: "Open it like an app — works offline too.",
    iosBody: "Tap the Share icon, then \"Add to Home Screen\".",
    install: "Install",
    dismiss: "Not now",
  },
};

// Shows once, after the 3rd cleared level (tutorial or daily) in this
// browser, then never again — per F6's "one nudge, dismissible" spec.
export default function InstallBanner() {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [, forceTick] = useState(0);
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(() => {
    if (isStandalone()) return setVisible(false);
    const progress = getInstallProgress();
    if (progress.dismissed || progress.count < 3) return setVisible(false);
    setVisible(hasDeferredPrompt() || isIOS());
  }, []);

  useEffect(() => {
    evaluate();
    const unsubscribe = onPromptAvailable(() => {
      forceTick((n) => n + 1);
      evaluate();
    });
    window.addEventListener("pwa-install-progress", evaluate);
    return () => {
      unsubscribe();
      window.removeEventListener("pwa-install-progress", evaluate);
    };
  }, [evaluate]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (hasDeferredPrompt()) {
      await triggerInstall();
    }
    dismissInstallPrompt();
    setVisible(false);
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  return (
    <div style={styles.banner}>
      <div style={styles.text}>
        <div style={styles.title}>{t.title}</div>
        <div style={styles.body}>{isIOS() && !hasDeferredPrompt() ? t.iosBody : t.body}</div>
      </div>
      <div style={styles.actions}>
        {hasDeferredPrompt() && (
          <button onClick={handleInstall} style={styles.installBtn}>
            <Download size={14} />
            <span>{t.install}</span>
          </button>
        )}
        <button onClick={handleDismiss} style={styles.dismissBtn} aria-label={t.dismiss}>
          <X size={16} color={COLORS.faint} />
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
    zIndex: 30,
    display: "flex",
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
  text: { flex: 1 },
  title: { fontSize: 13.5, fontWeight: 600, color: COLORS.ink, letterSpacing: 0.5 },
  body: { fontSize: 12, color: COLORS.inkSoft, marginTop: 4, lineHeight: 1.5 },
  actions: { display: "flex", alignItems: "center", gap: 8 },
  installBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
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
  dismissBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
  },
};
