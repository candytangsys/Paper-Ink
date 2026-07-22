# CHANGELOG

## v1.7 — Product rename: 紙墨集 → 紙墨筆

CEO-confirmed scope decision: the product is now a single-game app (一筆連), not a mini-games collection — `GuessNumber.jsx` / `TimeSense.jsx` were already removed in v1.2 and were never part of P0's financial modeling, KPIs, or acquisition strategy, so this rename doesn't touch any of that. "紙墨集" ("Paper & Ink **Collection**") implied a multi-game anthology; "紙墨筆" ("Paper, Ink, **Brush**") echoes 一筆連's core "one-stroke" mechanic instead and fits the now-confirmed single-game positioning.

### Changed

- **Brand name, everywhere it appears in-product**: `index.html` `<title>`, `README.md` (heading + anchor link), the PWA manifest (`vite.config.js`'s `name` / `short_name`), the boot `LoadingScreen.jsx` title, `Home.jsx`'s header wordmark, `InstallBanner.jsx`'s install prompt, the Daily Challenge share text (`share.mjs`) and share-card image (`shareImage.js`).
- **PWA manifest `description`** (`vite.config.js`): also dropped the stale "小遊戲合輯" (mini-games collection) framing while touching this file for the rename, since it directly contradicted the now-confirmed single-game positioning — not just a name swap, flagging it as a slightly bigger edit than the rest of this pass. Now: "文青紙墨風的一筆連數字路徑謎题，含每日挑戰".

### Not changed (pending your decision)

- **The seal-mark character** (`Home.jsx`'s `sealDot`, currently "紙") — left as-is per your note that this is still undecided. Easy one-line swap to "筆" once you call it; nothing else depends on this file's current character.
- Old CHANGELOG entries below (P0, v1.2) still say "紙墨集" — left untouched as a historical record of what those specs were called at the time, not revised to match the new name.

### Verification

- `npm test` — 25/25 passing.
- `npm run build` — succeeds; confirmed `dist/manifest.webmanifest`'s `name`/`short_name`/`description` fields all reflect the new name and positioning.
- Manually verified in headless Chromium (Playwright): browser tab title and Home's header wordmark both read "紙墨筆"; seal icon still shows "紙" as expected.

---

## v1.6 — Removed 一筆連's orphaned internal level-select screen

Follow-up to v1.5: with the back button now exiting straight to Home, `NumberLink.jsx`'s own level-select screen (`MenuScreen`) had no path left that reached it in normal use — Home's grid has been the sole level entry point since v1.3, always deep-linking a specific level. Rather than leave dead UI behind a URL nobody links to, it's deleted.

### Removed

- `MenuScreen` and its 28-card level grid, along with the styles, icons (`Lock`, `Check`, `Home`), and text strings (`title`, `subtitle`, `hint`, `tier`, `brandTag`, `home`) that existed only to support it. `difficultyTier()` (only used to color that grid's tier dots) removed too. Home's own level grid already covers this — same 28 levels, same locked/done states, one less place for the two to drift out of sync.

### Changed

- `NumberLink.jsx` no longer has `screen` ('menu' | 'game') state — it always renders the game screen now. The URL-driven auto-start effect gained an else-branch: if the requested level is missing, out of range, or still locked, it calls `onExit()` to bounce back to Home instead of falling back to the now-deleted menu. This also means a stale or hand-typed link to a locked level (or the bare `#/number-link` with no level) redirects to Home instead of silently showing a level browser.

### Verification

- `npm test` — 25/25 passing.
- `npm run build` — succeeds (bundle ~4 KB smaller from the removed dead code).
- Manually driven in headless Chromium (Playwright): bare `#/number-link` → redirects to Home; a locked level's deep link → redirects to Home; Home → level 1 → still enters directly; back arrow → still returns to Home; full play-through (win level 1 → advance to level 2) still works end-to-end.

---

## v1.5 — Level back button now returns to Home

### Fixed

- **Pressing back during a level didn't return to 主畫面.** `src/games/NumberLink.jsx`'s in-game back arrow (and the "back" button shown on the win screen after the last level) called `setScreen("menu")`, landing on 一筆連's own internal level-select screen instead of the app's Home screen. That internal menu is only reachable that way now — since v1.3, Home's level grid always deep-links straight into a specific level (`initialLevel`), so nothing routes through it as an intermediate step anymore. Both buttons now call `onExit` (navigates to `#/`) instead, matching what a player expects after entering a level directly from Home. Labels updated accordingly: "返回關卡選單" / "Back to level menu" → "返回主畫面" / "Back to Home", "返回選單" / "Back to menu" → "返回主畫面" / "Back to Home".

### Verification

- `npm test` — 25/25 passing.
- `npm run build` — succeeds.
- Manually verified in headless Chromium (Playwright): Home → level 1 → back arrow → lands back on Home (`#/`, level grid visible) instead of the level-select menu.

---

## v1.4 — Gameplay screens reskinned to F7 palette; refined share stamp

CEO-directed follow-up to v1.3: closes the visual gap where 一筆連 (tutorial + Daily Challenge) still read as the pre-F7 app while Home/Loading had moved on to the new palette, and upgrades the share card's "perfect" stamp to the agreed spec. Home's own breakpoint strategy (fluid, no fixed breakpoints) and the 16×16 Daily board's narrow-screen handling (shrink cells, no horizontal scroll) were both confirmed as already correct — no change needed there.

### Changed

- **Gameplay screens now use the F7 palette.** `theme.jsx`'s `COLORS` (paper/panel/ink/inkSoft/faint/border/vermillion) is realigned to `homeTheme.js`'s `HOME_COLORS` hex-for-hex, and every hardcoded duplicate of the old palette in `NumberLink.jsx`, `Daily.jsx`, and `numberlink/Board.jsx` (~90 literal hex/rgba occurrences — most of the app's chrome was never actually routed through the `COLORS` constant) was mapped to its new-palette equivalent: paper/panel/ink/text tones 1:1, 朱砂紅 accent → 印章紅 (seal), and two judgment-call remaps for tones with no direct F7 token — the "done/record" indigo-grey accent → 竹青 (bamboo, matching Home's own "done" color) and the difficulty-tier gold-brown → 赭金 (gold). The ink-trail path gradient (celadon → indigo-grey → ochre) and the candidate-highlight teal are unchanged — they're decorative/functional, not surface chrome, and have no equivalent in `HOME_COLORS`. `homeTheme.js`'s header comment updated to note it's no longer scoped to Home-only (supersedes architecture constraint §5.5).
- **Share card "perfect" stamp** (`src/daily/shareImage.js`): now a rounded-corner square (12px radius) with a thin 2.5px stroke (was a sharp-cornered 6px block) and a randomized ±3–5° tilt per share (was a fixed −6.9°, outside the agreed range and identical on every card) — reads as a hand-stamped seal instead of a template.

### Verification

- `npm test` — 25/25 passing.
- `npm run build` — succeeds.
- Manually compared in headless Chromium (Playwright) across Home, the level-select menu, an in-game board, and the Daily Challenge screen — all four now share one consistent paper/ink/seal palette.

---

## v1.3 — Home level grid now enters levels directly

Fixes a broken interaction the F7 home redesign shipped with: tapping a level number in the "常規關卡" grid navigated to 一筆連's level-select menu instead of the level itself.

### Added

- `src/router.js`: hash routing extracted from `App.jsx` into its own module (`routeFromHash` / `buildHashRoute`), extended so `#/number-link/:level` carries an optional level number alongside the existing bare `#/number-link` and `#/daily(/:date)` forms. Covered by `test/router.test.mjs`.

### Fixed

- **Home level grid didn't open the level it showed.** `src/components/Home.jsx`'s level nodes now pass their level number through `onSelect`, and `src/games/NumberLink.jsx` accepts an `initialLevel` prop that jumps straight into that level's puzzle on mount instead of showing the level-select menu. Locked nodes are now non-interactive (`disabled`, dimmed) rather than silently opening the menu.
- **Puzzle kept regenerating after entering a level.** Two compounding bugs, both in `NumberLink.jsx`: (1) `startLevel` depended on the whole `session` object returned by `useGameSession`, which is a fresh object literal every render, so `startLevel`'s identity — and anything depending on it — churned every render (e.g. every timer tick); narrowed the dependency to the stable `session.start`. (2) the new auto-start-from-URL effect depended on `unlockedLevel`, so *winning* a level (which bumps `unlockedLevel`) re-ran the effect and silently restarted the level just solved; guarded with a ref so the URL-driven auto-start fires at most once per navigation.

### Verification

- `npm test` — 27/27 passing (2 new router tests added).
- `npm run build` — succeeds.
- Manually driven end-to-end in headless Chromium (Playwright): home → level 1 opens directly into the puzzle (not the menu) → puzzle stays stable while idle for 3.5s → clearing level 1 shows the win screen with correct stats → "下一關" advances into level 2 → back on Home, level 2 shows unlocked and opens directly.

---

## v1.2 — Home screen redesign (F7) + boot loading screen (F6-b)

Brings the CEO-approved home screen mockup (`主畫面與加載頁_視覺稿v1.html`) and the boot loading screen into P0, plus the `home_view` funnel event.

### Added

- **F7 — Home redesign**: `src/components/Home.jsx` rebuilt to the approved visual — a top bar with a seal-colored brandmark and an always-visible 🔥 streak pill, a "scroll card" daily-challenge entry (dashed scroll-style top/bottom edges, weekday + size + daily number, clue count and personal-best-time meta, a static ink-path decoration, a full-width CTA that reads differently once today's puzzle is done), and a 6-column, 28-node level-progress grid (done = bamboo, current = seal, locked = pale) replacing the old list-style level card. New tokens live in `src/homeTheme.js`, scoped to Home + the loading screen only — every other screen keeps following `theme.jsx`'s existing palette per the architecture constraint that visuals elsewhere stay as-is. `NumberLink.jsx` now exports `LEVEL_COUNT` / `NUMBERLINK_STORAGE_KEY` so Home can read real progress without duplicating the level table.
- **F6-b — Boot loading screen**: `src/components/LoadingScreen.jsx`, shown by `App.jsx` from first mount until fonts are ready (capped well under the 1.5s budget, with a 400ms floor so it never just flickers). Its signature element is an SVG ink stroke tracing a one-stroke path between six nodes — deliberately not a generic spinner — and falls back to a fully-drawn static path when `prefers-reduced-motion` is set. `index.html`'s body background now matches the new paper token so there's no white flash before React mounts.
- **F5 — `home_view`**: tracked on every Home mount, as the funnel's first-touch denominator ahead of `tutorial_level_start` / `daily_open`.

### Changed

- `theme.jsx`'s font `@import` extended with Noto Sans TC and JetBrains Mono (additive; existing Cormorant Garamond / EB Garamond / Noto Serif TC usage elsewhere is untouched).
- App icons (`public/icon-192.png`, `icon-512.png`) and the PWA manifest's `background_color`/`theme_color` regenerated/updated to the new paper (`#F3EEE1`) / seal (`#B23A2E`) tokens so the install/splash experience matches the redesigned home screen.
- Level-grid "current" logic treats anything below the unlocked frontier as done even without its own `best[]` entry, so exactly one node is ever highlighted as current regardless of how progress data got there.

## Also in this pass — removed Guess the Code and Sense of Time

Per direct instruction, the app now only ships 一筆連 (tutorial levels + Daily Challenge). `src/games/GuessNumber.jsx` and `src/games/TimeSense.jsx` were deleted, their routes removed from `App.jsx`, and Home's copy/entry list updated accordingly (no more three-"chapter" framing).

---

## P0 — Daily Challenge, Streak, Share, Tutorial A/B, Analytics, PWA

Implements the full P0 scope from the "紙墨集「一筆連」每日挑戰版" spec (v1.0, 2026-07-21): a daily-challenge growth loop layered on top of the existing 28-level 一筆連 tutorial, with zero backend and zero monetization.

### Added

- **F1 — Daily Challenge**: `src/engine/daily.mjs` (date-seeded, deterministic, globally-synced puzzle generation per the Mon–Sun size/clue schedule) wired up to a new `#/daily/:date` hash route and `src/games/Daily.jsx` screen. Past dates open in read-only "review" mode and don't affect the streak; future dates clamp to today. A "reveal solution" / regenerate action is intentionally absent from Daily (the puzzle is deterministic by date, so there's nothing to reveal without spoiling it).
- **F2 — Streak**: `src/engine/streak.mjs`, surfaced as a 🔥 counter on the Home entry card and the Daily completion screen, a once-a-month "rescue yesterday" flow (confirm() dialog stands in for the P1 rewarded-ad gate, via the `onRescueRequested`-shaped `handleRescue` hook), and a milestone stamp at 7/30/100/365 days.
- **F3 — Share**: `src/engine/share.mjs` for text + attribution-tagged links, `src/daily/shareImage.js` for a 1080×1350 Canvas share card (path-shape-only ink thumbnail — no numbers or clue positions, so it can never spoil the shared date's puzzle for anyone else), and `src/daily/shareFlow.js` wiring Web Share API with a clipboard-copy fallback. `src/daily/attribution.js` captures `?ref=` on load (`share_visit`) and reports `share_conversion` on same-session completion.
- **F4 — Tutorial**: levels 2–3 now regenerate until their solution requires a diagonal step; undo/hint stay hidden until level 7; `src/tutorialVariant.js` assigns a persistent A/B bucket with a one-line hint shown at levels 2/5/7 for variant B.
- **F5 — Analytics**: `src/analytics.js` wraps `gtag` behind `track(event, params)`, auto-attaching `tutorial_variant` / `ref_id` / `lang` to every event and mirroring to `console.log` in dev as a DebugView stand-in. Full event dictionary wired at every call site (`app_open`, `tutorial_level_start/complete`, `tutorial_complete`, `daily_open/complete/fail_abandon`, `share_click/visit/conversion`, `streak_rescue_offered/used`, `hint_used`, `undo_used`).
- **F6 — PWA**: `vite-plugin-pwa` (generateSW) precaches the app shell for offline play; `src/pwaInstall.js` + `src/components/InstallBanner.jsx` show a one-time install nudge after a player's 3rd cleared level (tutorial or daily), using the native `beforeinstallprompt` on Chromium/Android and manual "Add to Home Screen" instructions on iOS.

### Changed

- Refactored `src/games/NumberLink.jsx`: extracted `src/games/numberlink/Board.jsx` (grid rendering + pointer/drag input, now scaling from 2×2 up through 16×16) and `src/games/numberlink/useGameSession.js` (path/taps/mistakes/timer/undo/hint state machine) so the tutorial and Daily share one implementation of the core interaction loop instead of duplicating it.
- `src/components/Home.jsx` gained a featured Daily Challenge entry card (today's size, weekday, completion state, streak).
- `index.html` / `src/main.jsx`: added the GA4 `gtag.js` bootstrap and PWA manifest link (the latter auto-injected by vite-plugin-pwa).

### New localStorage keys

`daily_streak_v1`, `daily_history_v1`, `user_ref_id`, `tutorial_variant`, `pwa_install_progress_v1` — additive only; existing `numberlink_progress_v1` and `lang_pref_v1` are untouched and unaffected.

### Explicitly out of scope (per spec)

Ad SDK, IAP, coin/hint economy, leaderboards, cloud save, achievements, timed mode, any backend service.

### Verification

- `npm test` — 23/23 passing (14 from the spec's appendix D plus additional coverage for daily-puzzle validity, refId, and edge cases).
- `npm run build` — succeeds; total added weight (main JS bundle delta + service worker + workbox runtime + manifest) is ≈14 KB gzip, well under the 150 KB budget.
- Manually verified in-browser: cross-date determinism, all seven weekday sizes, streak rescue/milestone flow, share text/image non-spoiler guarantee, `share_visit`/`share_conversion` attribution, tutorial diagonal-forcing and progressive undo/hint reveal, full GA4 event dictionary (via dev console), offline play with the origin server stopped (via `npm run preview`), and no regressions in the original 28 levels, Guess the Code, Sense of Time, or the language toggle.

### Known limitation

GA4 `Measurement ID` and Lighthouse's installability audit weren't run against a live GA4 property / Lighthouse CLI in this environment; the manifest, icons, and service worker were verified by hand against Lighthouse's underlying installability criteria instead. See the README's "Analytics (GA4)" section for the placeholder-replacement steps.
