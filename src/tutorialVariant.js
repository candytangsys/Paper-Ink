// A/B experiment hook for the first-10-levels tutorial (F4). Assigned once
// on first app boot and persisted, so every event in the session (and every
// future session) reports the same bucket.
const KEY = "tutorial_variant";

export function getTutorialVariant() {
  try {
    let v = localStorage.getItem(KEY);
    if (v !== "A" && v !== "B") {
      v = Math.random() < 0.5 ? "A" : "B";
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "A";
  }
}
