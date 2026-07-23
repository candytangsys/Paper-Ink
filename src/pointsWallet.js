// Global points balance, fed by every completed puzzle's score (v3.1
// scoring). Spent on tool unlocks (magnifier, root-cause) as an
// alternative to watching an ad. Not a currency — no real-money path.
const KEY = "points_wallet_v1";

export function getPointsBalance() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function addPoints(amount) {
  const balance = getPointsBalance() + amount;
  try {
    localStorage.setItem(KEY, String(balance));
  } catch {
    /* storage unavailable, ignore */
  }
  return balance;
}

export function spendPoints(amount) {
  const balance = getPointsBalance();
  if (balance < amount) return false;
  try {
    localStorage.setItem(KEY, String(balance - amount));
  } catch {
    /* storage unavailable, ignore */
  }
  return true;
}
