/**
 * Chapter (大關卡) model for the regular-level restructure (v3.1 RD spec).
 * A chapter is one board size; within a chapter, small levels (小關卡) are
 * generated on demand forever — there's no fixed level count anymore.
 * Clue density decreases as the player clears more puzzles in the same
 * chapter, bottoming out at CHAPTER_MILESTONE clears (which is also the
 * unlock threshold for the next chapter).
 *
 * The curve coefficients below are an RD proposal calibrated against the
 * retired fixed-28-level table's per-size clue counts and the daily
 * challenge's WEEK_SCHEDULE ratios — not arbitrary, but still a placeholder
 * pending a GD playtesting pass. Tune `start`/`floor` here; nothing else
 * needs to change.
 */

// Board sizes in progression order. Merges the old tutorial range (2-9)
// with the larger sizes the daily challenge already uses (10-16), so 16x16
// is reachable here too, shared with the Sunday daily board.
export const CHAPTERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16];

// Clears within one chapter needed to unlock the next chapter (and to reach
// the difficulty floor). Suggested default from the spec, adjustable.
export const CHAPTER_MILESTONE = 10;

// Chapters where undo/hint stay hidden, translated from the old
// CONTROLS_UNLOCK_LEVEL=7 cutoff (which covered levels on sizes 2 and 3).
export const CONTROLS_HIDDEN_SIZES = new Set([2, 3]);

// Chapters whose puzzles must require at least one diagonal step, translated
// from the old DIAGONAL_FORCED_LEVELS={2,3} (both size-3 levels).
export const DIAGONAL_FORCED_SIZES = new Set([3]);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Clue ratio at a given cumulative-clears count within a chapter of size n.
// Decreases linearly from `start` to `floor` over the first
// CHAPTER_MILESTONE clears, then stays at floor.
export function clueRatioForClear(n, chapterClearCount) {
  const start = clamp(0.62 - 0.02 * n, 0.22, 0.5);
  const floor = clamp(0.30 - 0.014 * n, 0.06, 0.22);
  const t = Math.min(chapterClearCount, CHAPTER_MILESTONE) / CHAPTER_MILESTONE;
  return start - (start - floor) * t;
}

export function chapterIndexOf(size) {
  return CHAPTERS.indexOf(size);
}

export function nextChapterSize(size) {
  const idx = chapterIndexOf(size);
  if (idx === -1 || idx === CHAPTERS.length - 1) return null;
  return CHAPTERS[idx + 1];
}
