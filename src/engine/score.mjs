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
export function computeScore({ timeSec, parTimeSec, mistakes, usedTool, justHitMilestone }) {
  const breakdown = { base: 5, time: 0, accuracy: 0, noHint: 0, milestone: 0 };

  if (timeSec <= parTimeSec * 0.7) breakdown.time = 6;
  else if (timeSec <= parTimeSec) breakdown.time = 3;

  if (mistakes === 0) breakdown.accuracy = 4;
  else if (mistakes <= 2) breakdown.accuracy = 2;

  if (!usedTool) breakdown.noHint = 3;
  if (justHitMilestone) breakdown.milestone = 15;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown };
}
