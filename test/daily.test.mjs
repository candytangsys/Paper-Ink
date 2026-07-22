import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDailyPuzzle } from "../src/engine/daily.mjs";

function nextWeekday(utcDay) {
  const d = new Date("2026-08-01T00:00:00Z");
  while (d.getUTCDay() !== utcDay) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test("Sunday puzzles are 16x16", () => {
  const date = nextWeekday(0);
  const puzzle = buildDailyPuzzle(date);
  assert.equal(puzzle.size, 16);
  assert.equal(puzzle.total, 256);
});

test("weekday sizes follow the schedule", () => {
  const expected = { 1: 5, 2: 6, 3: 8, 4: 10, 5: 12, 6: 14, 0: 16 };
  for (const [day, size] of Object.entries(expected)) {
    const date = nextWeekday(Number(day));
    const puzzle = buildDailyPuzzle(date);
    assert.equal(puzzle.size, size, `weekday ${day} should be ${size}x${size}`);
  }
});

test("same date always produces the same puzzle (global sync)", () => {
  const date = "2026-08-05";
  const a = buildDailyPuzzle(date);
  const b = buildDailyPuzzle(date);
  assert.deepEqual(a.solution, b.solution);
  assert.deepEqual(a.clues, b.clues);
});

test("clue set always includes the start (1) and end (N)", () => {
  const date = "2026-08-06";
  const puzzle = buildDailyPuzzle(date);
  const values = Object.values(puzzle.clues);
  assert.ok(values.includes(1));
  assert.ok(values.includes(puzzle.total));
});

test("solution is a valid Hamiltonian path over 8-directional adjacency", () => {
  const date = "2026-08-07";
  const puzzle = buildDailyPuzzle(date);
  assert.equal(puzzle.solution.length, puzzle.total);
  const seen = new Set();
  for (let i = 0; i < puzzle.solution.length; i++) {
    const [r, c] = puzzle.solution[i];
    const key = `${r}_${c}`;
    assert.ok(!seen.has(key), "path must not revisit a cell");
    seen.add(key);
    if (i > 0) {
      const [pr, pc] = puzzle.solution[i - 1];
      const dr = Math.abs(r - pr), dc = Math.abs(c - pc);
      assert.ok(dr <= 1 && dc <= 1 && (dr + dc > 0), "steps must be 8-directionally adjacent");
    }
  }
});

test("365-day stress: every day generates a valid puzzle", () => {
  const start = new Date("2026-08-01T00:00:00Z");
  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const puzzle = buildDailyPuzzle(dateStr);
    assert.ok(puzzle, `day ${dateStr} must produce a puzzle`);
    assert.equal(puzzle.solution.length, puzzle.total);
  }
});
