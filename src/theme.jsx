// Shared "文青紙墨風" (literary ink-and-paper) design tokens, used by every
// game in the hub so the whole app reads as one consistent piece.

export const COLORS = {
  paper: "#E4DCC9", // rice-paper page background
  panel: "#F1EADA", // card / panel surface
  ink: "#33302A", // primary ink-brown text
  inkSoft: "#6B6456", // secondary text
  faint: "#8C8271", // tertiary / label text
  hairline: "#A99E88", // fine rule / numerals
  border: "rgba(51,48,42,0.16)",
  borderStrong: "rgba(51,48,42,0.28)",
  vermillion: "#A23C2E", // 朱砂紅 — current position / primary accent
  celadon: "#6E8E86", // 青瓷 — gradient start / "next step" dashed ring
  indigoGrey: "#4C5B6E", // 黛青 — gradient mid
  ochre: "#B0793C", // 赭石 — gradient end
};

// 青瓷 → 黛青 → 赭石, an ink-wash gradient used for connecting lines / trails.
export function inkTrailColor(t) {
  const stops = [
    [110, 142, 134],
    [76, 91, 110],
    [176, 121, 60],
  ];
  const scaled = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const c0 = stops[i];
  const c1 = stops[i + 1];
  const lerp = (a, b, u) => Math.round(a + (b - a) * u);
  return `rgb(${lerp(c0[0], c1[0], localT)}, ${lerp(c0[1], c1[1], localT)}, ${lerp(c0[2], c1[2], localT)})`;
}

export const FONT_SERIF = "'Noto Serif TC', 'EB Garamond', serif";
export const FONT_DISPLAY = "'Cormorant Garamond', 'Noto Serif TC', serif";

export function GlobalInkStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300;1,500&family=EB+Garamond:wght@400;500;600&family=Noto+Serif+TC:wght@300;400;500;600;700&display=swap');

      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { min-height: 100%; }
      body {
        margin: 0;
        background: ${COLORS.paper};
        color: ${COLORS.ink};
        font-family: ${FONT_SERIF};
      }

      @keyframes ink-drift {
        0% { transform: translate(-6%, -4%) scale(1); }
        50% { transform: translate(4%, 3%) scale(1.06); }
        100% { transform: translate(-6%, -4%) scale(1); }
      }
      @keyframes ink-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-3px); }
        50% { transform: translateX(2.5px); }
        75% { transform: translateX(-1.5px); }
      }
      @keyframes ink-breathe {
        0%, 100% { opacity: 0.9; }
        50% { opacity: 0.5; }
      }
      @keyframes ink-rise {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ink-ring {
        0%   { transform: scale(1);    opacity: 0.6; }
        100% { transform: scale(1.35); opacity: 0; }
      }
      .ink-shake { animation: ink-shake 0.36s ease; }
      .ink-pulse { animation: ink-breathe 2.4s ease-in-out infinite; }
      .ink-rise { animation: ink-rise 0.6s ease both; }
      .ink-ring-pulse { animation: ink-ring 1.6s ease-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .ink-shake, .ink-pulse, .ink-rise, .ink-drift, .ink-ring-pulse {
          animation: none !important;
        }
      }
    `}</style>
  );
}

// Background wash: a faint, slowly drifting bloom of ink instead of neon glow.
export const inkWashStyle = {
  position: "absolute",
  top: "-25%",
  left: "-15%",
  width: "130%",
  height: "65%",
  background:
    "radial-gradient(closest-side, rgba(76,91,110,0.10), transparent 70%), radial-gradient(closest-side, rgba(176,121,60,0.09), transparent 72%)",
  filter: "blur(60px)",
  animation: "ink-drift 26s ease-in-out infinite",
  pointerEvents: "none",
};

// Shared chrome that appears on the home screen and every game screen, so
// it only needs to be defined (and kept visually consistent) once.
export const homeBtnStyle = {
  position: "absolute",
  top: 20,
  left: 20,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: "7px 14px",
  fontSize: 12.5,
  fontFamily: FONT_SERIF,
  letterSpacing: 1,
  color: COLORS.inkSoft,
  cursor: "pointer",
};

export const brandRowStyle = { display: "flex", alignItems: "center", gap: 9, marginBottom: 14 };

export const eyebrowStyle = {
  fontFamily: "'EB Garamond', serif",
  fontSize: 12,
  letterSpacing: 5,
  textTransform: "uppercase",
  color: COLORS.faint,
};
