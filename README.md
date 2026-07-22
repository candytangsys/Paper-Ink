### 🎮 立即遊玩 / Play now: **https://candytangsys.github.io/game/**

**[中文](#紙墨集) · [English](#paper--ink)**

---

# 紙墨集

一個文青紙墨風的「一筆連」數字路徑謎題，主畫面提供每日挑戰與 28 關練習兩種入口，介面支援中英雙語切換。

---

## 玩法

**一筆連**：Hidato 式數字連線謎題，依序點選或一筆滑過，把 1 連到 N，8 方向鄰接（含斜角）。共 28 關練習關卡，難度漸增；另有每日挑戰模式，詳見下方「每日挑戰」章節。

---

## 視覺風格

米紙底色配墨褐字，襯線字體（思源宋體 Noto Serif TC ＋ Garamond 家族），質感偏書頁：

- 連線／進度採青瓷 → 黛青 → 赭石的水墨漸層
- 圓圈分素紙空圈、深墨圈（已知線索）、青瓷虛線圈（可下一步），目前位置以朱砂紅標示
- 背景以淡墨緩緩暈染取代霓虹光暈，動畫皆偏柔和，並支援系統的「減少動態」（`prefers-reduced-motion`）偏好

主畫面與啟動加載頁另有一套經核准的獨立色票（宣紙、松煙墨、朱砂印等，定義於 `src/homeTheme.js`），僅用於這兩個畫面；謎題本身的畫面維持上述配色不變。

---

## 每日挑戰

主畫面「每日挑戰」入口卡會依 UTC 日期產生全球同題的每日謎題（週一 5×5 到週日 16×16，尺寸與線索密度依星期遞增），完成後可分享成績卡（文字＋圖像），並累積 Streak；斷檔一天內每月可救回一次。點開分享連結會直達當日題目。

---

## 中英雙語

右上角固定顯示語言切換鈕（EN／中），切換後的語言會套用到主畫面與所有畫面，並保存在瀏覽器中，下次開啟時延續上次的選擇。

---

## PWA（可離線、可安裝）

支援加入主畫面、離線遊玩（App 殼層與已生成過的每日題皆由 Service Worker 快取，每日題本身是純前端依日期決定性生成，離線也能正確產生）。完成第 3 次任意關卡後會顯示一次安裝引導。

---

## 分析埋點（GA4）

`src/analytics.js` 頂部的 `GA_ID` 目前是佔位字串 `"G-XXXXXXXXXX"`。正式上線前，請：

1. 在 GA4 後台建立資源，取得 Measurement ID（格式 `G-XXXXXXXXXX`）。
2. 將 `src/analytics.js` 的 `GA_ID` 換成實際 ID。
3. 同步更新 `index.html` 中 `gtag/js?id=...` 那行 script 的 `id` 參數。

開發模式（`npm run dev`）下，所有埋點事件也會同步印在瀏覽器 console（`[analytics] eventName {...}`），可用來替代 GA4 DebugView 做本機驗證。

---

## 開發

```bash
npm install
npm run dev      # 本機開發伺服器
npm run build    # 打包至 dist/
npm run preview  # 預覽打包結果（含 Service Worker，離線行為請用這個而非 npm run dev 驗證）
npm test         # 執行 src/engine/ 的單元測試
```

使用 Vite + React 開發，透過 GitHub Actions 部署到 GitHub Pages。`src/engine/`（每日題生成、Streak、分享文案）為純邏輯模組，與畫面渲染完全分離，方便獨立測試。

---
---

# Paper & Ink

A one-stroke number path puzzle in a literary "paper and ink" visual style. The home screen offers two ways in — a daily challenge and a 28-level practice ladder — with every screen supporting Chinese/English switching.

---

## How to play

**One-Stroke Path**: a Hidato-style number path puzzle — tap or drag to connect 1 through N in one stroke, across 8-directional (including diagonal) adjacency. 28 practice levels of rising difficulty, plus a Daily Challenge mode described below.

---

## Visual style

Rice-paper background with ink-brown text, set in serif type (Noto Serif TC + the Garamond family), aiming for a page-like texture:

- Connecting lines / progress use a celadon → indigo-grey → ochre ink-wash gradient
- Circles come in three states — plain paper, dark ink (known clue), and a dashed celadon ring (next step) — with the current position marked in vermillion red
- A faint, slowly drifting ink wash replaces neon glow in the background; all animation is gentle and respects the system's "reduce motion" (`prefers-reduced-motion`) preference

The home screen and boot loading screen use a separate, approved palette (rice paper, pine-soot ink, a seal-red accent — defined in `src/homeTheme.js`), scoped to just those two screens; the puzzle screens themselves keep the palette above unchanged.

---

## Daily Challenge

The "Daily Challenge" card on the home screen generates a globally-synced puzzle from the UTC date (5×5 on Monday up to 16×16 on Sunday, size and clue density scaling through the week). Finishing it unlocks a shareable result card (text + image) and builds a streak; a one-day gap can be rescued once a month. Shared links open straight into that day's puzzle.

---

## Bilingual support

A language toggle (EN / 中) sits in the top-right corner on every screen. Switching applies across the home screen and every screen in the app, and the choice is remembered in the browser for next time.

---

## PWA (installable, works offline)

The app can be added to your home screen and played offline — the app shell and any daily puzzle you've already opened are cached by a Service Worker, and since each day's puzzle is generated locally from its date, it works correctly offline too. An install prompt appears once, after your 3rd cleared level.

---

## Analytics (GA4)

`GA_ID` at the top of `src/analytics.js` is currently the placeholder `"G-XXXXXXXXXX"`. Before launch:

1. Create a GA4 property and grab its Measurement ID (`G-XXXXXXXXXX` format).
2. Replace `GA_ID` in `src/analytics.js` with the real ID.
3. Update the `id` parameter on the `gtag/js?id=...` script tag in `index.html` to match.

In dev mode (`npm run dev`), every tracked event is also logged to the browser console (`[analytics] eventName {...}`) as a local stand-in for GA4 DebugView.

---

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # bundle to dist/
npm run preview  # preview the production build (includes the Service Worker — use this, not npm run dev, to check offline behavior)
npm test         # run the src/engine/ unit tests
```

Built with Vite + React, deployed to GitHub Pages via GitHub Actions. `src/engine/` (daily-puzzle generation, streak, share copy) is pure logic with no React dependency, kept separate from rendering so it can be tested in isolation.
