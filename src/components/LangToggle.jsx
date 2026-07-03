import { useLanguage } from "../i18n.jsx";
import { COLORS, FONT_SERIF } from "../theme.jsx";

export default function LangToggle({ style }) {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      aria-label={lang === "zh" ? "Switch to English" : "切換為中文"}
      style={{ ...baseStyle, ...style }}
    >
      {lang === "zh" ? "EN" : "中"}
    </button>
  );
}

const baseStyle = {
  position: "absolute",
  top: 20,
  right: 20,
  zIndex: 2,
  background: "transparent",
  color: COLORS.faint,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: 1,
  fontFamily: FONT_SERIF,
};
