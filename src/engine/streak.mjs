/**
 * Streak 系統：每月限救一次、只能救「昨天」、儲存介面注入式
 */
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / DAY);

export function createStreakStore(storage) {
  const KEY = "daily_streak_v1";
  const load = () => {
    try { return JSON.parse(storage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const save = (s) => storage.setItem(KEY, JSON.stringify(s));

  return {
    recordCompletion(todayStr, { perfect = false, timeSec = 0 } = {}) {
      const s = load();
      if (s.lastDate === todayStr) return this.status(todayStr);
      const gap = s.lastDate ? dayDiff(s.lastDate, todayStr) : null;
      s.streak = gap === 1 ? (s.streak || 0) + 1 : 1;
      s.lastDate = todayStr;
      s.best = Math.max(s.best || 0, s.streak);
      s.history = s.history || {};
      s.history[todayStr] = { perfect, timeSec };
      save(s);
      return this.status(todayStr);
    },
    canRescue(todayStr) {
      const s = load();
      if (!s.lastDate) return { ok: false, reason: "no_history" };
      if (dayDiff(s.lastDate, todayStr) !== 2) return { ok: false, reason: "not_yesterday_break" };
      const month = todayStr.slice(0, 7);
      if (s.rescueUsedMonth === month) return { ok: false, reason: "monthly_limit" };
      return { ok: true };
    },
    rescue(todayStr) {
      const check = this.canRescue(todayStr);
      if (!check.ok) return { success: false, ...check };
      const s = load();
      const yesterday = iso(new Date(todayStr + "T00:00:00Z") - DAY);
      s.lastDate = yesterday;
      s.history = s.history || {};
      s.history[yesterday] = { rescued: true };
      s.rescueUsedMonth = todayStr.slice(0, 7);
      save(s);
      return { success: true, streak: s.streak };
    },
    status(todayStr) {
      const s = load();
      const gap = s.lastDate ? dayDiff(s.lastDate, todayStr) : null;
      const alive = gap === 0 || gap === 1;
      return {
        streak: alive ? (s.streak || 0) : 0,
        rawStreak: s.streak || 0,
        best: s.best || 0,
        doneToday: s.lastDate === todayStr,
        broken: gap !== null && gap >= 2,
        rescueAvailable: this.canRescue(todayStr).ok,
        milestones: [7, 30, 100, 365].filter((m) => (alive ? s.streak : 0) >= m),
      };
    },
  };
}
