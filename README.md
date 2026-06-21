**[中文](#猜數字遊戲) · [English](#guess-the-code)**

---

# 猜數字遊戲

一款考驗邏輯推理與系統性排除能力的數字解謎遊戲。

---

## 遊戲簡介

電腦隨機產生四個**不重複**的數字作為答案，玩家透過不斷猜測與分析回饋，逐步推理出正確答案。

---

## 遊戲規則

1. 電腦從 0～9 中隨機選出 **4 個不重複的數字**，並排列成固定順序
2. 玩家每回合輸入一組 4 位數字進行猜測，**猜測可以包含重複數字**
3. 電腦回傳「**幾個位置猜對**」
   - 只告知位置正確的數量，**不告知是哪個位置**
   - **不告知**數字是否存在於答案中
4. 玩家根據回饋持續猜測，直到 4 個位置全部猜對為止

---

## 範例

假設答案為 `3 8 1 6`

| 猜測 | 回饋 | 說明 |
|------|------|------|
| `1111` | 1 個位置對 | 第三位的 `1` 正確（猜測可重複）|
| `3333` | 1 個位置對 | 第一位的 `3` 正確（猜測可重複）|
| `3812` | 2 個位置對 | 第一位 `3`、第二位 `8` 正確 |
| `3816` | 4 個位置對 | 全部正確！ |

---

## 勝利條件

猜出 4 個數字且**順序完全正確**。

---

## 攻略提示

- **差異法**：每次只改變一個位置的數字，觀察分數變化
  - 分數 +1 → 新數字在該位置正確
  - 分數 -1 → 舊數字在該位置正確
  - 分數不變 → 兩個都不是該位置的答案
- **善用重複猜測**：猜 `1111` 可快速確認 `1` 是否出現在某個位置，再配合差異法縮小範圍
- 先用 `0000`～`9999` 逐一確認哪個數字在哪個位置有出現
- 再逐一確認每個位置的正確數字

---

## 技術資訊

- 答案空間：10 × 9 × 8 × 7 = **5,040 種**可能組合
- 建議最少步數：約 **10～14 步**可保證解出

---

## 開發

使用 React 開發，於 Claude.ai Artifacts 環境運行。

---
---

# Guess the Code

A number-deduction puzzle that tests logical reasoning and systematic elimination.

---

## Overview

The computer randomly generates four **unique** digits as the secret code. Through repeated guesses and analysis of the feedback, the player gradually deduces the correct answer.

---

## Rules

1. The computer randomly picks **4 unique digits** from 0–9 and arranges them in a fixed order
2. Each round the player enters a 4-digit guess — **guesses may contain repeated digits**
3. The computer returns **how many positions are correct**
   - It only reveals the *count* of correct positions, **not which positions**
   - It does **not** reveal whether a digit exists in the answer at all
4. The player keeps guessing based on the feedback until all 4 positions are correct

---

## Example

Suppose the answer is `3 8 1 6`

| Guess | Feedback | Notes |
|-------|----------|-------|
| `1111` | 1 position correct | The `1` in the third spot is right (repeats allowed) |
| `3333` | 1 position correct | The `3` in the first spot is right (repeats allowed) |
| `3812` | 2 positions correct | First `3` and second `8` are right |
| `3816` | 4 positions correct | All correct! |

---

## Win Condition

Guess all 4 digits **in the exact correct order**.

---

## Strategy Tips

- **Difference method**: change only one position's digit each turn and watch the score
  - Score +1 → the new digit is correct in that position
  - Score −1 → the old digit was correct in that position
  - Score unchanged → neither is the answer for that position
- **Use repeated guesses**: guessing `1111` quickly confirms whether `1` appears in some position, then combine with the difference method to narrow down
- First use `0000`–`9999` to confirm which digits appear and where
- Then pin down the correct digit for each position one by one

---

## Technical Notes

- Answer space: 10 × 9 × 8 × 7 = **5,040 possible combinations**
- Recommended minimum: about **10–14 guesses** guarantees a solution

---

## Development

Built with React, running in the Claude.ai Artifacts environment.
