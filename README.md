### 🎮 立即遊玩 / Play now: **https://candytangsys.github.io/guess_number/**

**[中文](#紙墨集) · [English](#paper--ink)**

---

# 紙墨集

一個文青紙墨風的小遊戲合輯，從主畫面選擇卷冊進入不同的遊戲，介面支援中英雙語切換。

---

## 收錄遊戲

| 卷冊 | 名稱 | 玩法 |
|------|------|------|
| 第一卷 | **猜數字** | 電腦隨機產生四個不重複的數字，玩家靠邏輯推理與系統性排除猜出答案 |
| 第二卷 | **一筆連** | Hidato 式數字連線謎題，依序點選或一筆滑過，把 1 連到 N，共 28 關，難度漸增 |
| 第三卷 | **時感** | 兩種模式的時間感知練習：自己停下計時，或猜猜靜默了多久 |

---

## 視覺風格

米紙底色配墨褐字，襯線字體（思源宋體 Noto Serif TC ＋ Garamond 家族），質感偏書頁：

- 連線／進度採青瓷 → 黛青 → 赭石的水墨漸層
- 圓圈分素紙空圈、深墨圈（已知線索）、青瓷虛線圈（可下一步），目前位置以朱砂紅標示
- 背景以淡墨緩緩暈染取代霓虹光暈，動畫皆偏柔和，並支援系統的「減少動態」（`prefers-reduced-motion`）偏好

---

## 中英雙語

右上角固定顯示語言切換鈕（EN／中），切換後的語言會套用到主畫面與所有遊戲，並保存在瀏覽器中，下次開啟時延續上次的選擇。

---

## 開發

```bash
npm install
npm run dev      # 本機開發伺服器
npm run build    # 打包至 dist/
npm run preview  # 預覽打包結果
```

使用 Vite + React 開發，透過 GitHub Actions 部署到 GitHub Pages。

---
---

# Paper & Ink

A small collection of games in a literary "paper and ink" visual style. Pick a chapter from the home screen to jump into a game; every screen supports switching between Chinese and English.

---

## Games

| Chapter | Name | Description |
|---------|------|--------------|
| I | **Guess the Code** | The computer picks four unique digits; deduce the answer through logic and systematic elimination |
| II | **One-Stroke Path** | A Hidato-style number path puzzle — tap or drag to connect 1 through N in one stroke, across 28 levels of rising difficulty |
| III | **Sense of Time** | Two modes of time perception: stop the clock yourself, or guess how long the silence lasted |

---

## Visual style

Rice-paper background with ink-brown text, set in serif type (Noto Serif TC + the Garamond family), aiming for a page-like texture:

- Connecting lines / progress use a celadon → indigo-grey → ochre ink-wash gradient
- Circles come in three states — plain paper, dark ink (known clue), and a dashed celadon ring (next step) — with the current position marked in vermillion red
- A faint, slowly drifting ink wash replaces neon glow in the background; all animation is gentle and respects the system's "reduce motion" (`prefers-reduced-motion`) preference

---

## Bilingual support

A language toggle (EN / 中) sits in the top-right corner on every screen. Switching applies across the home screen and all games, and the choice is remembered in the browser for next time.

---

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # bundle to dist/
npm run preview  # preview the production build
```

Built with Vite + React, deployed to GitHub Pages via GitHub Actions.
