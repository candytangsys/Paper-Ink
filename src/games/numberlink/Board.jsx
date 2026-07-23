import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { inkTrailColor } from "../../theme.jsx";
import { useLanguage } from "../../i18n.jsx";

/* ---------------------------------------------------------
   Board: pure rendering + pointer input for the one-stroke
   grid, plus its own map-style pan/zoom viewport. Shared by
   the tutorial levels and the Daily Challenge. Sizing scales
   from 2x2 up through 16x16 (the Sunday daily board).

   The viewport always starts at a "fit" scale that shows the
   whole board — for n=16 that's <1x — so "see the full board"
   is the default view, not something you have to zoom out to
   reach (there's nowhere further out to go: fit is the zoom
   floor). From there, pinch or the wheel zoom in around the
   gesture's focal point, and a one-finger drag on empty board
   space pans; a one-finger drag that starts on a cell always
   draws instead. The two gestures are disambiguated once, on
   pointerdown, by hit-testing — not by touch-action tricks —
   so they never fight each other the way the old pan-x-only
   scroll container did against the draw gesture on n=16.
--------------------------------------------------------- */

export function boardMetrics(n, zoom = 1) {
  // n=16 (the Sunday board) is the one size that can't fit a ≥32px touch
  // target inside a 375px-wide screen (16 * 32 = 512px alone exceeds that),
  // so it intentionally renders past typical viewports and relies on the
  // viewport's own fit-scale + pan to stay reachable.
  const cellSize =
    (n <= 4 ? 62 : n <= 6 ? 50 : n <= 7 ? 42 : n <= 8 ? 38 : n <= 9 ? 34 :
    n <= 10 ? 30 : n <= 12 ? 25 : n <= 14 ? 21 : 32) * zoom;
  const gap = (n <= 8 ? 5 : n <= 12 ? 3 : n <= 14 ? 2 : 3) * zoom;
  const pad = (n <= 8 ? 12 : n <= 12 ? 9 : n <= 14 ? 7 : 10) * zoom;
  const fontSize = (n <= 6 ? 18 : n <= 8 ? 15 : n <= 10 ? 13 : n <= 12 ? 11 : n <= 14 ? 9.5 : 14) * zoom;
  const boardPx = pad * 2 + n * cellSize + (n - 1) * gap;
  return { cellSize, gap, pad, fontSize, boardPx };
}

// Ceiling on manual zoom-in — independent of fit, so even an already-small
// board (fit === 1) can still be magnified for a closer look.
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.4;
const DRAW_COMMIT_DELAY_MS = 70;

const TEXT = {
  zh: { zoomIn: "放大", zoomOut: "縮小", fit: "顯示完整棋盤" },
  en: { zoomIn: "Zoom in", zoomOut: "Zoom out", fit: "Show whole board" },
};

export default function Board({
  puzzle,
  filledOrder,
  filledSet,
  candidateSet,
  won,
  shakeKey,
  hintCell,
  onCellClick,
  revealedCell,
  rootCauseCell,
  previewCells,
  magnifierMode,
  onMagnifierTap,
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const n = puzzle.n;
  const { cellSize, gap: GAP, pad: PAD, fontSize, boardPx } = boardMetrics(n);

  const numberAt = (r, c) => {
    const key = `${r}_${c}`;
    if (filledSet.has(key)) {
      const idx = filledOrder.findIndex(([fr, fc]) => fr === r && fc === c);
      return idx + 1;
    }
    if (puzzle.clueMap[key] !== undefined) return puzzle.clueMap[key];
    return null;
  };

  const centerOf = (r, c) => ({
    x: PAD + c * (cellSize + GAP) + cellSize / 2,
    y: PAD + r * (cellSize + GAP) + cellSize / 2,
  });

  const viewportRef = useRef(null);
  const boardRef = useRef(null);
  const lastKeyRef = useRef(null);
  const onCellClickRef = useRef(onCellClick);
  const wonRef = useRef(won);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const fitScaleRef = useRef(1);

  // Live pointer positions (screen coords) keyed by pointerId, plus which
  // gesture is currently active — set once on pointerdown and read from
  // refs during move so the move handler never needs stale-state deps.
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null); // "draw" | "pan" | "pinch" | null
  const panStartRef = useRef(null);
  const pinchStartRef = useRef(null);
  // A one-finger touch that lands on a cell doesn't commit as a draw right
  // away — real two-finger pinches don't land perfectly simultaneously, so
  // committing immediately would register the first finger as a stray tap
  // before the second finger's pointerdown arrives and reclassifies the
  // gesture as a pinch. Held briefly in pendingCellRef/pendingDrawTimerRef;
  // any actual movement or a same-finger pointerup commits it immediately
  // instead of waiting out the delay, so real single-finger drawing never
  // feels laggy.
  const pendingCellRef = useRef(null);
  const pendingDrawTimerRef = useRef(null);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);
  useEffect(() => {
    wonRef.current = won;
  }, [won]);

  const applyScale = useCallback((next) => {
    scaleRef.current = next;
    setScale(next);
  }, []);
  const applyPan = useCallback((next) => {
    panRef.current = next;
    setPan(next);
  }, []);

  const clampPan = useCallback(
    (x, y, s) => {
      const el = viewportRef.current;
      const vw = el ? el.clientWidth : boardPx;
      const vh = el ? el.clientHeight : boardPx;
      const w = boardPx * s;
      const h = boardPx * s;
      const axis = (pos, viewportSize, contentSize) =>
        contentSize <= viewportSize ? (viewportSize - contentSize) / 2 : Math.min(0, Math.max(viewportSize - contentSize, pos));
      return { x: axis(x, vw, w), y: axis(y, vh, h) };
    },
    [boardPx]
  );

  // Reset to the "show the whole board" scale whenever the puzzle changes
  // (new size, new level) — this is the default view, not a state you
  // return to by zooming out.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    const vw = (el && el.clientWidth) || boardPx;
    const fit = Math.min(1, vw / boardPx);
    fitScaleRef.current = fit;
    applyScale(fit);
    applyPan(clampPan(0, 0, fit));
  }, [n, boardPx, clampPan, applyScale, applyPan]);

  // Window resizes (rotation, browser resize) re-measure the fit floor and
  // re-clamp the current view into bounds without resetting a user's zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onResize = () => {
      const vw = el.clientWidth;
      if (!vw) return;
      const fit = Math.min(1, vw / boardPx);
      fitScaleRef.current = fit;
      const nextScale = Math.max(fit, Math.min(MAX_SCALE, scaleRef.current));
      applyScale(nextScale);
      applyPan(clampPan(panRef.current.x, panRef.current.y, nextScale));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [boardPx, clampPan, applyScale, applyPan]);

  // Desktop wheel zoom, focused on the cursor — attached as a native
  // listener (not React's onWheel) so preventDefault reliably stops the
  // page from scrolling instead of zooming.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextScale = Math.min(MAX_SCALE, Math.max(fitScaleRef.current, scaleRef.current * factor));
      const bx = (cx - panRef.current.x) / scaleRef.current;
      const by = (cy - panRef.current.y) / scaleRef.current;
      applyScale(nextScale);
      applyPan(clampPan(cx - bx * nextScale, cy - by * nextScale, nextScale));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampPan, applyScale, applyPan]);

  const cellAtLocal = useCallback(
    (x, y) => {
      let col = Math.round((x - PAD - cellSize / 2) / (cellSize + GAP));
      let row = Math.round((y - PAD - cellSize / 2) / (cellSize + GAP));
      row = Math.max(0, Math.min(n - 1, row));
      col = Math.max(0, Math.min(n - 1, col));
      const center = centerOf(row, col);
      const dist = Math.hypot(x - center.x, y - center.y);
      return dist <= cellSize / 2 + 10 ? { row, col } : null;
    },
    [n, cellSize, GAP, PAD]
  );

  // Converts a screen point into the board's own unscaled coordinate space
  // (the same 0..boardPx space centerOf()/cellAtLocal() work in), undoing
  // the viewport's current pan/zoom transform.
  const localPoint = (clientX, clientY) => {
    const rect = boardRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / scaleRef.current, y: (clientY - rect.top) / scaleRef.current };
  };

  const clearPendingDraw = () => {
    if (pendingDrawTimerRef.current) {
      clearTimeout(pendingDrawTimerRef.current);
      pendingDrawTimerRef.current = null;
    }
    pendingCellRef.current = null;
  };

  const commitPendingDraw = () => {
    const pending = pendingCellRef.current;
    if (!pending) return;
    clearPendingDraw();
    gestureRef.current = "draw";
    lastKeyRef.current = `${pending.row}_${pending.col}`;
    setDragPos({ x: pending.x, y: pending.y });
    setDragging(true);
    onCellClickRef.current(pending.row, pending.col);
  };

  useEffect(() => clearPendingDraw, []);

  const handlePointerDown = (e) => {
    const vp = viewportRef.current;
    if (!vp || !boardRef.current) return;
    vp.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const { x, y } = localPoint(e.clientX, e.clientY);
      if (magnifierMode) {
        // One tap consumes magnifier mode; no drag/pan while it's armed so
        // a stray finger movement can't turn an intended tap into a pan.
        const cell = cellAtLocal(x, y);
        if (cell) onMagnifierTap && onMagnifierTap(cell.row, cell.col);
        gestureRef.current = null;
        return;
      }
      const cell = !wonRef.current ? cellAtLocal(x, y) : null;
      if (cell) {
        gestureRef.current = "maybe-draw";
        pendingCellRef.current = { row: cell.row, col: cell.col, x, y };
        pendingDrawTimerRef.current = setTimeout(() => {
          if (gestureRef.current === "maybe-draw" && pointersRef.current.size === 1) commitPendingDraw();
        }, DRAW_COMMIT_DELAY_MS);
      } else {
        gestureRef.current = "pan";
        panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
      }
    } else if (pointersRef.current.size === 2) {
      // A second finger always wins: cancel any in-progress/pending draw
      // and start pinch-zoom instead (a draw that already committed before
      // this finger landed keeps whatever cell it placed — nothing to roll
      // back for that case, only the not-yet-committed one is discarded).
      clearPendingDraw();
      gestureRef.current = "pinch";
      setDragging(false);
      setDragPos(null);
      lastKeyRef.current = null;
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      pinchStartRef.current = {
        dist,
        scale: scaleRef.current,
        panX: panRef.current.x,
        panY: panRef.current.y,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
    }
  };

  const handlePointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gestureRef.current === "maybe-draw") {
      // Real movement means this is a deliberate single-finger drag, not
      // the lead-in to a pinch — commit right away instead of waiting out
      // the disambiguation delay, then fall through to handle this move.
      commitPendingDraw();
    }

    if (gestureRef.current === "draw") {
      const { x, y } = localPoint(e.clientX, e.clientY);
      setDragPos({ x, y });
      const cell = cellAtLocal(x, y);
      if (cell) {
        const key = `${cell.row}_${cell.col}`;
        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key;
          onCellClickRef.current(cell.row, cell.col);
        }
      }
    } else if (gestureRef.current === "pan") {
      const start = panStartRef.current;
      const nextX = start.panX + (e.clientX - start.clientX);
      const nextY = start.panY + (e.clientY - start.clientY);
      applyPan(clampPan(nextX, nextY, scaleRef.current));
    } else if (gestureRef.current === "pinch") {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length < 2) return;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const start = pinchStartRef.current;
      const nextScale = Math.min(MAX_SCALE, Math.max(fitScaleRef.current, start.scale * (dist / start.dist)));
      // Keep the board point that was under the pinch's start midpoint
      // pinned under the (possibly moving) current midpoint.
      const bx = (start.midX - start.panX) / start.scale;
      const by = (start.midY - start.panY) / start.scale;
      applyScale(nextScale);
      applyPan(clampPan(midX - bx * nextScale, midY - by * nextScale, nextScale));
    }
  };

  const handlePointerUp = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.delete(e.pointerId);

    if (gestureRef.current === "maybe-draw") {
      // Finger lifted before the delay elapsed — a genuine quick tap, not
      // an abandoned pinch attempt, so commit it now.
      commitPendingDraw();
    }

    if (gestureRef.current === "pinch") {
      if (pointersRef.current.size === 1) {
        // Downgrade to a one-finger pan with the remaining finger rather
        // than ending the gesture outright — matches how map apps let you
        // lift one finger mid-pinch and keep moving.
        const [remaining] = pointersRef.current.values();
        gestureRef.current = "pan";
        panStartRef.current = { clientX: remaining.x, clientY: remaining.y, panX: panRef.current.x, panY: panRef.current.y };
      } else if (pointersRef.current.size === 0) {
        gestureRef.current = null;
      }
    } else if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      setDragging(false);
      setDragPos(null);
      lastKeyRef.current = null;
    }
  };

  const zoomBy = (factor) => {
    const el = viewportRef.current;
    const cx = el ? el.clientWidth / 2 : boardPx / 2;
    const cy = el ? el.clientHeight / 2 : boardPx / 2;
    const nextScale = Math.min(MAX_SCALE, Math.max(fitScaleRef.current, scaleRef.current * factor));
    const bx = (cx - panRef.current.x) / scaleRef.current;
    const by = (cy - panRef.current.y) / scaleRef.current;
    applyScale(nextScale);
    applyPan(clampPan(cx - bx * nextScale, cy - by * nextScale, nextScale));
  };

  const fitToScreen = () => {
    applyScale(fitScaleRef.current);
    applyPan(clampPan(0, 0, fitScaleRef.current));
  };

  const atMinZoom = scale <= fitScaleRef.current + 0.001;
  const atMaxZoom = scale >= MAX_SCALE - 0.001;

  return (
    <div
      ref={viewportRef}
      style={{ ...styles.viewport, maxWidth: boardPx }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={boardRef}
        style={{
          ...styles.board,
          width: boardPx,
          height: boardPx,
          gap: GAP,
          padding: PAD,
          gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        <svg
          width={boardPx}
          height={boardPx}
          style={styles.lineLayer}
          viewBox={`0 0 ${boardPx} ${boardPx}`}
        >
          {filledOrder.slice(1).map(([r, c], i) => {
            const [pr, pc] = filledOrder[i];
            const a = centerOf(pr, pc);
            const b = centerOf(r, c);
            const tt = puzzle.total > 1 ? (i + 0.5) / (puzzle.total - 1) : 0;
            const isLast = i === filledOrder.length - 2;
            return (
              <line
                key={`${pr}_${pc}-${r}_${c}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={inkTrailColor(tt)}
                strokeWidth={Math.max(3, cellSize * 0.16)}
                strokeLinecap="round"
                opacity={isLast ? 1 : 0.85}
              />
            );
          })}

          {dragging && dragPos && filledOrder.length > 0 && !won && (() => {
            const [lr, lc] = filledOrder[filledOrder.length - 1];
            const a = centerOf(lr, lc);
            const tt = puzzle.total > 1 ? (filledOrder.length - 0.5) / (puzzle.total - 1) : 0;
            return (
              <line
                x1={a.x}
                y1={a.y}
                x2={dragPos.x}
                y2={dragPos.y}
                stroke={inkTrailColor(tt)}
                strokeWidth={Math.max(3, cellSize * 0.14)}
                strokeLinecap="round"
                strokeDasharray="1 7"
                opacity={0.6}
              />
            );
          })()}
        </svg>

        {Array.from({ length: n }).map((_, r) =>
          Array.from({ length: n }).map((__, c) => {
            const key = `${r}_${c}`;
            const num = numberAt(r, c);
            const isFilled = filledSet.has(key);
            const isClueOnly = !isFilled && puzzle.clueMap[key] !== undefined;
            const isCandidate = candidateSet.has(key);
            const isHintTarget = hintCell === key && !isFilled;
            const isRevealed = !isFilled && !isClueOnly && revealedCell && revealedCell.key === key;
            const isRootCause = !isFilled && rootCauseCell === key;
            const previewIndex = !isFilled && !isClueOnly && previewCells ? previewCells.indexOf(key) : -1;
            const isPreview = previewIndex !== -1;
            const isHead =
              isFilled && filledOrder.length > 0 &&
              filledOrder[filledOrder.length - 1][0] === r &&
              filledOrder[filledOrder.length - 1][1] === c;
            const isShaking = shakeKey === key;

            let bg = "#EBE3D0";
            let border = "1px solid rgba(43,42,40,0.16)";
            let color = "#B7AC96";
            let boxShadow = "none";
            let fontWeight = 500;

            if (isFilled) {
              const tt = puzzle.total > 1 ? (num - 1) / (puzzle.total - 1) : 0;
              bg = inkTrailColor(tt);
              border = "1px solid rgba(243,238,225,0.55)";
              color = "#F3EEE1";
              fontWeight = 600;
              boxShadow = isHead
                ? `0 0 0 3px rgba(178,58,46,0.85), 0 2px 8px rgba(43,42,40,0.25)`
                : `0 1px 4px rgba(43,42,40,0.18)`;
            } else if (isRootCause) {
              bg = "rgba(178,58,46,0.14)";
              border = "2px solid #B23A2E";
              color = "#B23A2E";
              fontWeight = 700;
              boxShadow = "0 0 0 4px rgba(178,58,46,0.2)";
            } else if (isRevealed) {
              bg = "rgba(91,124,153,0.14)";
              border = "1.5px dashed rgba(91,124,153,0.75)";
              color = "#3F5A73";
              fontWeight = 700;
            } else if (isHintTarget) {
              bg = "rgba(184,146,90,0.18)";
              border = "2px solid #B8925A";
              color = "#8B6A32";
              fontWeight = 700;
              boxShadow = "0 0 0 4px rgba(184,146,90,0.22)";
            } else if (isPreview) {
              const strength = 1 - previewIndex * 0.3;
              bg = `rgba(139,92,157,${(0.16 * strength).toFixed(3)})`;
              border = `1.5px dashed rgba(139,92,157,${(0.7 * strength).toFixed(3)})`;
              color = "#5A3C66";
              fontWeight = 600;
            } else if (isClueOnly) {
              bg = "#E7DBBF";
              border = "1.5px solid rgba(43,42,40,0.5)";
              color = "#2B2A28";
              fontWeight = 600;
            } else if (isCandidate) {
              bg = "rgba(110,142,134,0.12)";
              border = "1.5px dashed rgba(110,142,134,0.85)";
              color = "#4C5B4E";
            }

            const displayText = num || (isRevealed ? (revealedCell.num != null ? revealedCell.num : "?") : "");

            return (
              <button
                key={key}
                onClick={(e) => {
                  if (e.detail === 0) (magnifierMode ? onMagnifierTap && onMagnifierTap(r, c) : onCellClick(r, c));
                }}
                className={isShaking ? "ink-shake" : isHintTarget || isCandidate || isRootCause || isPreview ? "ink-pulse" : ""}
                style={{
                  ...styles.cell,
                  width: cellSize,
                  height: cellSize,
                  fontSize,
                  fontWeight,
                  background: bg,
                  border,
                  color,
                  boxShadow,
                  position: "relative",
                  zIndex: 1,
                  cursor: magnifierMode ? "crosshair" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {displayText}
              </button>
            );
          })
        )}
      </div>

      <div style={styles.zoomControls} onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(ZOOM_STEP)} disabled={atMaxZoom} style={styles.zoomBtn} aria-label={t.zoomIn} title={t.zoomIn}>
          <ZoomIn size={16} />
        </button>
        <button onClick={fitToScreen} style={styles.zoomBtn} aria-label={t.fit} title={t.fit}>
          <Maximize2 size={14} />
        </button>
        <button onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={atMinZoom} style={styles.zoomBtn} aria-label={t.zoomOut} title={t.zoomOut}>
          <ZoomOut size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  viewport: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    overflow: "hidden",
    marginBottom: 24,
    borderRadius: 6,
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.14)",
    boxShadow: "0 2px 24px rgba(43,42,40,0.10), inset 0 0 0 1px rgba(243,238,225,0.6)",
    touchAction: "none",
    boxSizing: "border-box",
  },
  board: {
    position: "absolute",
    top: 0,
    left: 0,
    boxSizing: "border-box",
    display: "grid",
    transformOrigin: "0 0",
    willChange: "transform",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  lineLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  cell: {
    borderRadius: "50%",
    fontFamily: "'EB Garamond', 'Noto Serif TC', serif",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    padding: 0,
  },
  zoomControls: {
    position: "absolute",
    right: 8,
    bottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    zIndex: 2,
  },
  zoomBtn: {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(243,238,225,0.92)",
    border: "1px solid rgba(43,42,40,0.16)",
    borderRadius: 6,
    color: "#2B2A28",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(43,42,40,0.15)",
  },
};
