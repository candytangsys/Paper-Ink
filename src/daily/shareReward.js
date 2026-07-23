// One-time points reward for sharing a Daily Challenge result. Keyed by the
// puzzle's date (not the date the share button was clicked), so resharing
// the same day's result — including from a past, already-unlocked day's
// recap — never pays out twice; a different day's result can always earn it
// again.
const KEY = "daily_share_reward_v1";

export const SHARE_REWARD = 20;

function loadClaimed() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function hasClaimedShareReward(date) {
  return !!loadClaimed()[date];
}

export function claimShareReward(date) {
  const claimed = loadClaimed();
  claimed[date] = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(claimed));
  } catch {
    /* storage unavailable, ignore */
  }
}
