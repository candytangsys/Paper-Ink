# CHANGELOG

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
