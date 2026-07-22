import { useState, useEffect, useCallback, useRef } from "react";
import { inkTrailColor } from "../../theme.jsx";

/* ---------------------------------------------------------
   Board: pure rendering + pointer input for the one-stroke
   grid. Shared by the tutorial levels and the Daily Challenge.
   Sizing scales from 2x2 up through 16x16 (the Sunday daily
   board) while staying inside a ~480px-wide column.
--------------------------------------------------------- */

export function boardMetrics(n) {
  const cellSize =
    n <= 4 ? 62 : n <= 6 ? 50 : n <= 7 ? 42 : n <= 8 ? 38 : n <= 9 ? 34 :
    n <= 10 ? 30 : n <= 12 ? 25 : n <= 14 ? 21 : 18;
  const gap = n <= 8 ? 5 : n <= 12 ? 3 : 2;
  const pad = n <= 8 ? 12 : n <= 12 ? 9 : 7;
  const fontSize = n <= 6 ? 18 : n <= 8 ? 15 : n <= 10 ? 13 : n <= 12 ? 11 : 9.5;
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
}) {
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
        {filledOrder.slice(1).map(([r, c], i) => {
          const [pr, pc] = filledOrder[i];
          const a = centerOf(pr, pc);
          const b = centerOf(r, c);
          const t = puzzle.total > 1 ? (i + 0.5) / (puzzle.total - 1) : 0;
          const isLast = i === filledOrder.length - 2;
          return (
            <line
              key={`${pr}_${pc}-${r}_${c}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={inkTrailColor(t)}
              strokeWidth={Math.max(3, cellSize * 0.16)}
              strokeLinecap="round"
              opacity={isLast ? 1 : 0.85}
            />
          );
        })}

        {dragging && dragPos && filledOrder.length > 0 && !won && (() => {
          const [lr, lc] = filledOrder[filledOrder.length - 1];
          const a = centerOf(lr, lc);
          const t = puzzle.total > 1 ? (filledOrder.length - 0.5) / (puzzle.total - 1) : 0;
          return (
            <line
              x1={a.x}
              y1={a.y}
              x2={dragPos.x}
              y2={dragPos.y}
              stroke={inkTrailColor(t)}
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
          const isHead =
            isFilled && filledOrder.length > 0 &&
            filledOrder[filledOrder.length - 1][0] === r &&
            filledOrder[filledOrder.length - 1][1] === c;
          const isShaking = shakeKey === key;

          let bg = "#EBE3D0";
          let border = "1px solid rgba(51,48,42,0.16)";
          let color = "#B7AC96";
          let boxShadow = "none";
          let fontWeight = 500;

          if (isFilled) {
            const t = puzzle.total > 1 ? (num - 1) / (puzzle.total - 1) : 0;
            bg = inkTrailColor(t);
            border = "1px solid rgba(241,234,218,0.55)";
            color = "#F4EEDF";
            fontWeight = 600;
            boxShadow = isHead
              ? `0 0 0 3px rgba(162,60,46,0.85), 0 2px 8px rgba(51,48,42,0.25)`
              : `0 1px 4px rgba(51,48,42,0.18)`;
          } else if (isClueOnly) {
            bg = "#E7DBBF";
            border = "1.5px solid rgba(51,48,42,0.5)";
            color = "#33302A";
            fontWeight = 600;
          } else if (isCandidate) {
            bg = "rgba(110,142,134,0.12)";
            border = "1.5px dashed rgba(110,142,134,0.85)";
            color = "#4C5B4E";
          }

          return (
            <button
              key={key}
              onClick={(e) => {
                if (e.detail === 0) onCellClick(r, c);
              }}
              className={isShaking ? "ink-shake" : isCandidate ? "ink-pulse" : ""}
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
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {num || ""}
            </button>
          );
        })
      )}
    </div>
  );
}

const styles = {
  board: {
    position: "relative",
    boxSizing: "border-box",
    display: "grid",
    gap: 5,
    padding: 16,
    borderRadius: 6,
    background: "#F1EADA",
    border: "1px solid rgba(51,48,42,0.14)",
    boxShadow: "0 2px 24px rgba(51,48,42,0.10), inset 0 0 0 1px rgba(241,234,218,0.6)",
    marginBottom: 24,
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
