// Per-tool "have I shown its one-time in-game intro yet" flags (v3.6). Same
// small localStorage-wrapper shape as tutorialIntro.js, but keyed per tool
// since each of the 6 tools gets its own one-time caption the first time it
// becomes unlocked in the right rail, rather than one flag for the whole
// walkthrough.
const KEY = "tool_intro_seen_v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function hasSeenToolIntro(toolKey) {
  return !!load()[toolKey];
}

export function markToolIntroSeen(toolKey) {
  const seen = load();
  seen[toolKey] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable, ignore */
  }
}
