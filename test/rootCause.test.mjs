import { test } from "node:test";
import assert from "node:assert/strict";
import { traceRootCauseFrom } from "../src/games/numberlink/useGameSession.js";

// Hand-built 3x3 puzzle. Canonical solution is a simple boustrophedon path;
// a clue is pinned mid-path (not just at the start/end) so that skipping it
// permanently orphans that step number — a deterministic dead end
// regardless of how well-connected the remaining cells are (8-directional
// adjacency on a near-empty 3x3 board is otherwise very forgiving).
const CANONICAL_PATH = [
  [0, 0], [0, 1], [0, 2], // 1,2,3
  [1, 2], [1, 1], [1, 0], // 4,5,6
  [2, 0], [2, 1], [2, 2], // 7,8,9
];
const puzzle = {
  n: 3,
  total: 9,
  path: CANONICAL_PATH,
  clueMap: { "0_0": 1, "1_1": 5, "2_2": 9 },
};

test("traceRootCauseFrom finds the exact step where the player skipped a pinned clue", () => {
  // Matches the canonical path for steps 1-4, then at step 5 goes to (2,1)
  // instead of the clue-5 cell (1,1) — (2,1) is a legal, adjacent, unvisited
  // move (no immediate "mistake"), but it permanently strands clue 5.
  const order = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 1]];
  const result = traceRootCauseFrom(puzzle, order);
  assert.equal(result.lastGoodStep, 4);
  assert.equal(result.suggestedCell, "1_1");
});

test("traceRootCauseFrom on a path that never deviates reports the full length as still-good", () => {
  const order = CANONICAL_PATH.slice(0, 6);
  const result = traceRootCauseFrom(puzzle, order);
  assert.equal(result.lastGoodStep, 6);
});

test("traceRootCauseFrom identifies the deviation point even one step further along", () => {
  // Same wrong turn at step 5, but the player kept going one more step
  // (to a still-legal, still-doomed cell) before asking for help.
  const order = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 1], [1, 0]];
  const result = traceRootCauseFrom(puzzle, order);
  assert.equal(result.lastGoodStep, 4);
  assert.equal(result.suggestedCell, "1_1");
});
