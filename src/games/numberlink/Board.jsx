import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { inkTrailColor } from "../../theme.jsx";

/* ---------------------------------------------------------
   Board: pure rendering + pointer input for the one-stroke
   grid. Shared by the tutorial levels and the Daily Challenge.
   Sizing scales from 2x2 up through 16x16 (the Sunday daily
   board). No manual zoom/pan/scroll: the board measures its
   container and shrinks its own metrics (cellSize/gap/pad/
   fontSize, via the `zoom` factor below) so it always renders
   fully visible at once, no matter how wide it naturally is.
--------------------------------------------------------- */

export function boardMetrics(n, zoom = 1) {
  const cellSize =
    (n <= 4 ? 62 : n <= 6 ? 50 : n <= 7 ? 42 : n <= 8 ? 38 : n <= 9 ? 34 :
    n <= 10 ? 30 : n <= 12 ? 25 : n <= 14 ? 21 : 32) * zoom;
  const gap = (n <= 8 ? 5 : n <= 12 ? 3 : n <= 14 ? 2 : 3) * zoom;
  const pad = (n <= 8 ? 12 : n <= 12 ? 9 : n <= 14 ? 7 : 10) * zoom;
  const fontSize = (n <= 6 ? 18 : n <= 8 ? 15 : n <= 10 ? 13 : n <= 12 ? 11 : n <= 14 ? 9.5 : 14) * zoom;
  const boardPx = pad * 2 + n * cellSize + (n - 1) * gap;
  return { cellSize, gap, pad, fontSize, boardPx };
}

export default function Board({
  puzzle,
  filledOrder,
  filledSet,
  candidateSet,
  won,
  shakeKey,
  onCellClick,
  revealedCell,
  rootCauseCell,
  previewCells,
  magnifierMode,
  onMagnifierTap,
  previousPath,
  hammerMode,
  onHammerTap,
}) {
  const n = puzzle.n;
  const naturalBoardPx = boardMetrics(n, 1).boardPx;
  const [fit, setFit] = useState(1);
  const { cellSize, gap: GAP, pad: PAD, fontSize, boardPx } = boardMetrics(n, fit);

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

  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const lastKeyRef = useRef(null);
  const onCellClickRef = useRef(onCellClick);
  const wonRef = useRef(won);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(null);

  useEffect(() => {
    onCellClickRef.current = onCellClick;
  }, [onCellClick]);
  useEffect(() => {
    wonRef.current = won;
  }, [won]);

  // Shrinks the board's own metrics (not a CSS transform) so it always
  // renders fully within its container's width — no scrolling, panning, or
  // zoom controls needed. Re-measured on mount/size change and on window
  // resize (rotation, browser resize).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const vw = el.clientWidth;
      if (!vw) return;
      setFit(Math.min(1, vw / naturalBoardPx));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [naturalBoardPx]);

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

  const localPoint = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (wonRef.current || !boardRef.current) return;
    const { x, y } = localPoint(e);
    const cell = cellAtLocal(x, y);
    if (!cell) return;
    // Magnifier mode consumes a single tap (no drag/draw) to reveal one
    // cell's number, then the caller disarms it.
    if (magnifierMode) {
      onMagnifierTap && onMagnifierTap(cell.row, cell.col);
      return;
    }
    // Hammer mode (v3.6): same single-tap-no-drag pattern as the magnifier,
    // but targets an existing given clue instead of a blank cell.
    if (hammerMode) {
      onHammerTap && onHammerTap(cell.row, cell.col);
      return;
    }
    lastKeyRef.current = `${cell.row}_${cell.col}`;
    setDragPos({ x, y });
    setDragging(true);
    onCellClickRef.current(cell.row, cell.col);
  };

  // Listen on window while dragging so movement is tracked even as the
  // finger/cursor passes over sibling circles, regardless of which
  // element the pointer happens to be over.
  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (e) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragPos({ x, y });
      const cell = cellAtLocal(x, y);
      if (cell) {
        const key = `${cell.row}_${cell.col}`;
        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key;
          onCellClickRef.current(cell.row, cell.col);
        }
      }
    };
    const onUp = () => {
      setDragging(false);
      setDragPos(null);
      lastKeyRef.current = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, cellAtLocal]);

  return (
    <div ref={containerRef} style={styles.container}>
    <div
      ref={boardRef}
      onPointerDown={handlePointerDown}
      style={{
        ...styles.board,
        width: boardPx,
        height: boardPx,
        gap: GAP,
        padding: PAD,
        gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <svg
        width={boardPx}
        height={boardPx}
        style={styles.lineLayer}
        viewBox={`0 0 ${boardPx} ${boardPx}`}
      >
        {/* 路線記憶 (v3.6): faint dashed reference of the path right before
            the player's first undo/retry this attempt — drawn first so the
            real (solid) path always renders on top of it. */}
        {previousPath && previousPath.slice(1).map(([r, c], i) => {
          const [pr, pc] = previousPath[i];
          const a = centerOf(pr, pc);
          const b = centerOf(r, c);
          return (
            <line
              key={`ghost-${pr}_${pc}-${r}_${c}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#8B8478"
              strokeWidth={Math.max(2, cellSize * 0.1)}
              strokeLinecap="round"
              strokeDasharray="2 6"
              opacity={0.5}
            />
          );
        })}

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
          const isHammerable =
            hammerMode && isClueOnly && puzzle.clueMap[key] !== 1 && puzzle.clueMap[key] !== puzzle.total;
          const isCandidate = candidateSet.has(key);
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
            // 溯源符 suggested alternate direction — distinct from hint's
            // amber so the two tools never look interchangeable.
            bg = "rgba(178,58,46,0.14)";
            border = "2px solid #B23A2E";
            color = "#B23A2E";
            fontWeight = 700;
            boxShadow = "0 0 0 4px rgba(178,58,46,0.2)";
          } else if (isRevealed) {
            // 放大鏡 (magnifier) reveal — a cool watermark tone, distinct
            // from root-cause (vermillion).
            bg = "rgba(91,124,153,0.14)";
            border = "1.5px dashed rgba(91,124,153,0.75)";
            color = "#3F5A73";
            fontWeight = 700;
          } else if (isPreview) {
            // 引路符 — up to 3 upcoming cells, fading with distance so it
            // reads as a route shape, not an exact-number spoiler like 放大鏡.
            // v3.7: bumped up across the board (fill/border/ring opacity all
            // raised) after feedback that the original tones read as too
            // faint to notice against the board.
            const strength = 1 - previewIndex * 0.3;
            bg = `rgba(139,92,157,${(0.32 * strength).toFixed(3)})`;
            border = `2px dashed rgba(139,92,157,${(0.95 * strength).toFixed(3)})`;
            color = "#5A3C66";
            fontWeight = 700;
            boxShadow = `0 0 0 4px rgba(139,92,157,${(0.22 * strength).toFixed(3)})`;
          } else if (isHammerable) {
            // 錘子 targeting mode — an amber ring on the clue cells that can
            // actually be hammered (excludes start/end), distinct from the
            // plain clue styling so it reads as "tap to remove."
            bg = "#E7DBBF";
            border = "2px dashed #8B6A32";
            color = "#8B6A32";
            fontWeight = 700;
            boxShadow = "0 0 0 3px rgba(139,106,50,0.2)";
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
                if (e.detail !== 0) return;
                if (magnifierMode) onMagnifierTap && onMagnifierTap(r, c);
                else if (hammerMode) onHammerTap && onHammerTap(r, c);
                else onCellClick(r, c);
              }}
              className={isShaking ? "ink-shake" : isCandidate || isRootCause || isPreview || isHammerable ? "ink-pulse" : ""}
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
                touchAction: "none",
                cursor: magnifierMode || hammerMode ? "crosshair" : "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {displayText}
            </button>
          );
        })
      )}
    </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
    boxSizing: "border-box",
  },
  board: {
    position: "relative",
    boxSizing: "border-box",
    display: "grid",
    gap: 5,
    padding: 16,
    borderRadius: 6,
    background: "#EAE2CF",
    border: "1px solid rgba(43,42,40,0.14)",
    boxShadow: "0 1px 4px rgba(43,42,40,0.08)",
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
};
