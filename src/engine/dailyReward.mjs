/**
 * Daily Challenge points reward (v3.4). Flat base + a bonus that grows with
 * the player's current streak, capped so it doesn't run away — rewards the
 * daily habit itself (base) plus sticking with it (bonus), rather than any
 * single day's performance (that's what regular levels' computeScore() is
 * for; Daily intentionally doesn't use it, see Daily.jsx's handleWin).
 */
export const DAILY_BASE_REWARD = 50;
export const DAILY_STREAK_BONUS_PER_DAY = 2;
export const DAILY_STREAK_BONUS_CAP = 100;

// `streak` is the streak length *after* today's completion counts (i.e.
// streakStore.recordCompletion's returned status.streak) — day 1 of a
// streak earns no bonus yet, day 2 the first +2, and so on up to the cap.
export function dailyPointsReward(streak) {
  const days = Math.max(0, (streak || 0) - 1);
  const bonus = Math.min(DAILY_STREAK_BONUS_CAP, days * DAILY_STREAK_BONUS_PER_DAY);
  return DAILY_BASE_REWARD + bonus;
}
