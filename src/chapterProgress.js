// Per-chapter (per board size) progress, replacing the old flat
// numberlink_progress_v1 (unlockedLevel + best[levelIndex]) now that levels
// are infinite/random within a chapter rather than a fixed indexed list.
// Shape: { [size]: { chapterClearCount, bestScore } }
import { CHAPTERS, chapterUnlockThreshold, SCORE_MILESTONE_INTERVAL } from "./engine/chapters.mjs";

const KEY = "chapter_progress_v1";

export function loadChapterProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable, ignore */
  }
}

export function getChapterEntry(size) {
  const progress = loadChapterProgress();
  return progress[size] || { chapterClearCount: 0, bestScore: null };
}

export function isChapterUnlocked(size) {
  const idx = CHAPTERS.indexOf(size);
  if (idx <= 0) return true; // first chapter (or unknown size) always open
  const prevSize = CHAPTERS[idx - 1];
  return getChapterEntry(prevSize).chapterClearCount >= chapterUnlockThreshold(prevSize);
}

// The furthest CHAPTERS index the player has actually unlocked so far —
// used to gate tool availability (toolUnlock.js's TOOL_UNLOCK_CHAPTER_INDEX)
// on overall progress rather than on whichever chapter happens to be open
// right now, so replaying an early chapter after unlocking later ones never
// takes tools away again.
export function highestUnlockedChapterIndex() {
  let idx = 0;
  for (let i = 1; i < CHAPTERS.length; i++) {
    if (!isChapterUnlocked(CHAPTERS[i])) break;
    idx = i;
  }
  return idx;
}

// Peeks at whether the *next* clear in `size`'s chapter would land on a
// milestone multiple (10th, 20th, 30th, ...) — "同大關卡每累積 10 關 +30"
// repeats every 10 clears, it isn't a one-time unlock bonus. Exposed
// separately from recordChapterClear so the score can be computed (which
// needs to know about the milestone bonus) before the clear is persisted.
export function willHitMilestoneOnNextClear(size) {
  const next = getChapterEntry(size).chapterClearCount + 1;
  return next % SCORE_MILESTONE_INTERVAL === 0;
}

// Records one clear in `size`'s chapter, bumping its clear count and best
// score. Returns { chapterClearCount, justHitMilestone } (milestone here
// mirrors willHitMilestoneOnNextClear's prediction for this same clear).
export function recordChapterClear(size, score) {
  const progress = loadChapterProgress();
  const prev = progress[size] || { chapterClearCount: 0, bestScore: null };
  const chapterClearCount = prev.chapterClearCount + 1;
  const justHitMilestone = chapterClearCount % SCORE_MILESTONE_INTERVAL === 0;
  const bestScore = prev.bestScore == null ? score : Math.max(prev.bestScore, score);
  progress[size] = { chapterClearCount, bestScore };
  save(progress);
  return { chapterClearCount, justHitMilestone };
}
