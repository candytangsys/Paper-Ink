// Install-prompt bookkeeping for F6. beforeinstallprompt only ever fires
// once per page load (and only on Chromium/Android), so it's captured at
// module scope immediately on import, independent of whether any
// component asking about it is mounted yet.
const COUNT_KEY = "pwa_install_progress_v1";
let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
}

export function hasDeferredPrompt() {
  return !!deferredPrompt;
}

export function onPromptAvailable(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function triggerInstall() {
  if (!deferredPrompt) return { outcome: "unavailable" };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(COUNT_KEY)) || { count: 0, dismissed: false };
  } catch {
    return { count: 0, dismissed: false };
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(COUNT_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable, ignore */
  }
}

// Called from every level-completion win handler (tutorial + daily) so the
// "after your 3rd cleared level" install nudge can fire regardless of
// which mode introduced the player to their third win.
export function recordLevelCompletion() {
  const p = loadProgress();
  p.count += 1;
  saveProgress(p);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pwa-install-progress"));
  }
  return p;
}

export function getInstallProgress() {
  return loadProgress();
}

export function dismissInstallPrompt() {
  const p = loadProgress();
  p.dismissed = true;
  saveProgress(p);
}
