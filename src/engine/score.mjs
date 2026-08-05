/**
 * Multi-dimensional scoring (v3.1 RD spec §一之2). Score never affects
 * chapter unlock (that's judged purely on chapterClearCount) — it's a
 * separate, purely additive feedback loop.
 */

// RD placeholder: seconds allotted at a given size/clue-density combo.
// Lower density (harder) gets more time. Tune after launch using real
// time_sec distributions from analytics.
export function parTimeSec(n, clueRatio) {
  return Math.round(n * n * (1.8 - 0.6 * clueRatio));
}

// v3.6: every component scaled down (roughly halved) so the reward pace
// actually lines up with the v3.6 tool-price increase — the old values let a
// player afford any tool within 1-2 clears even after prices went up 50%,
// which is faster than the intended "buyable within ~5 clears" pace.
//
// v3.8: two additions, both keyed off the chapter the clear happened in —
// pass chapterIndex (chapters.mjs's chapterIndexOf) and, for the starter
// bonus, clearIndexInChapter + chapterUnlockThreshold too. Omitting them
// (as every pre-v3.8 call site/test does) is equivalent to chapterIndex 0
// with no starter bonus — both new fields come out to 0, total unchanged.
//
// - `difficulty`: harder (bigger-board) chapters pay out more for an
//   identical performance — +15% of the base breakdown per chapter index,
//   so a 16×16 clear (index 11) is worth ~2.65× the same clear on 2×2.
// - `starter`: a one-time, decaying "can afford your first tool almost
//   immediately" boost — chapter 0 (2×2) only, linearly decaying from +15
//   on the very first clear down to 0 by the time that chapter's own
//   unlock threshold is reached (i.e. exactly when the game would
//   otherwise consider you past the "brand new" phase).
const DIFFICULTY_BONUS_PER_CHAPTER = 0.15;
const STARTER_BONUS_CHAPTER_INDEX = 0;
const STARTER_BONUS_BASE = 15;

export function computeScore({
  timeSec, parTimeSec, mistakes, usedTool, justHitMilestone,
  chapterIndex = 0, clearIndexInChapter = null, chapterUnlockThreshold = null,
}) {
  const breakdown = { base: 5, time: 0, accuracy: 0, noHint: 0, milestone: 0, difficulty: 0, starter: 0 };

  if (timeSec <= parTimeSec * 0.7) breakdown.time = 6;
  else if (timeSec <= parTimeSec) breakdown.time = 3;

  if (mistakes === 0) breakdown.accuracy = 4;
  else if (mistakes <= 2) breakdown.accuracy = 2;

  if (!usedTool) breakdown.noHint = 3;
  if (justHitMilestone) breakdown.milestone = 15;

  const subtotal = breakdown.base + breakdown.time + breakdown.accuracy + breakdown.noHint + breakdown.milestone;
  breakdown.difficulty = Math.round(subtotal * DIFFICULTY_BONUS_PER_CHAPTER * chapterIndex);

  if (chapterIndex === STARTER_BONUS_CHAPTER_INDEX && clearIndexInChapter != null && chapterUnlockThreshold) {
    const remaining = chapterUnlockThreshold - (clearIndexInChapter - 1);
    breakdown.starter = remaining > 0 ? Math.round((STARTER_BONUS_BASE * remaining) / chapterUnlockThreshold) : 0;
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown };
}
