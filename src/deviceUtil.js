// Desktop-only affordances (keyboard shortcuts, hover-specific cursors) are
// gated on this breakpoint rather than input-type detection (no reliable
// "has a keyboard" signal exists) — a tablet/desktop-class viewport is the
// closest proxy the spec asks for (v3.1 §三).
export const DESKTOP_BREAKPOINT_PX = 769;

export function isDesktopViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= DESKTOP_BREAKPOINT_PX;
}
