/**
 * Chapter (大關卡) model for the regular-level restructure (v3.1 RD spec).
 * A chapter is one board size; within a chapter, small levels (小關卡) are
 * generated on demand forever — there's no fixed level count anymore.
 * Clue density decreases as the player clears more puzzles in the same
 * chapter, bottoming out at CLUE_RAMP_CLEARS clears — a separate, flat pace
 * from chapterUnlockThreshold()'s (v3.8) per-chapter, accelerating unlock
 * threshold below.
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

// v3.8: clears needed to unlock the *next* chapter now grow per chapter
// instead of a flat count — triangular-number-shaped acceleration (the
// increment itself grows by 1 each step): 3, 6, 10, 15, 21, 28, 36, 45, 55,
// 66, 78 for the 11 transitions across CHAPTERS. `size` is the chapter
// being cleared (the source, not the one unlocking).
export function chapterUnlockThreshold(size) {
  const idx = chapterIndexOf(size);
  if (idx < 0) return CLUE_RAMP_CLEARS;
  return ((idx + 2) * (idx + 3)) / 2;
}

// Clue-density ramp-to-floor (see clueRatioForClear below) stays a flat
// pace, independent of chapterUnlockThreshold's now much larger and
// accelerating unlock thresholds above — otherwise late chapters would sit
// at rock-bottom clue density for dozens of clears in a row while grinding
// toward their much higher unlock threshold, instead of only their first
// handful of clears.
export const CLUE_RAMP_CLEARS = 7;

// Repeating interval for the scoring "milestone" bonus (+15, see
// engine/score.mjs's computeScore) — independent of chapterUnlockThreshold,
// so tuning one doesn't silently move the other.
export const SCORE_MILESTONE_INTERVAL = 10;

// Chapters whose puzzles must require at least one diagonal step, translated
// from the old DIAGONAL_FORCED_LEVELS={2,3} (both size-3 levels).
export const DIAGONAL_FORCED_SIZES = new Set([3]);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Clue ratio at a given cumulative-clears count within a chapter of size n.
// Decreases linearly from `start` to `floor` over the first
// CLUE_RAMP_CLEARS clears, then stays at floor.
export function clueRatioForClear(n, chapterClearCount) {
  const start = clamp(0.62 - 0.02 * n, 0.22, 0.5);
  const floor = clamp(0.30 - 0.014 * n, 0.06, 0.22);
  const t = Math.min(chapterClearCount, CLUE_RAMP_CLEARS) / CLUE_RAMP_CLEARS;
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
