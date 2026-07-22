// Every daily-challenge date is a UTC calendar date string (YYYY-MM-DD) so
// the same puzzle lands for every player worldwide on the same day.
export function todayUTCString() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00Z").getTime());
}

// Clamp a requested date so nobody can walk the hash route forward into a
// not-yet-arrived puzzle; deterministic generation means it's "correct"
// either way, but showing tomorrow's board early would spoil the surprise.
export function clampToToday(dateStr) {
  const today = todayUTCString();
  return dateStr > today ? today : dateStr;
}
