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

export function computeScore({ timeSec, parTimeSec, mistakes, usedTool, justHitMilestone }) {
  const breakdown = { base: 10, time: 0, accuracy: 0, noHint: 0, milestone: 0 };

  if (timeSec <= parTimeSec * 0.7) breakdown.time = 10;
  else if (timeSec <= parTimeSec) breakdown.time = 5;

  if (mistakes === 0) breakdown.accuracy = 5;
  else if (mistakes <= 2) breakdown.accuracy = 2;

  if (!usedTool) breakdown.noHint = 5;
  if (justHitMilestone) breakdown.milestone = 30;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown };
}
