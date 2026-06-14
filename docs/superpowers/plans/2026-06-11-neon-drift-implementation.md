# Neon Drift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the playable Neon Drift game (8×8 slide-merge puzzle) inside the existing H5 template, with a pure deterministic core verified by `node:test`, a Canvas renderer, and the platform shell (ads, leaderboard, persistence) wired in.

**Architecture:** A pure, dependency-free game core (`neon-drift.js`) holds all rules (slide/merge/chain/win/over/spawn) and is unit-tested with injected RNG. A Canvas renderer (`grid-render.js`) tweens the core's output. `particles.js` and `palette.js` are ported from the sibling SameGame project. `index.html` is the shell: state machine, input, ads, persistence. Reused modules (`playgama.js`, `firebase.js`, `notify.js`, `sound.js`) are called, not modified.

**Tech Stack:** Vanilla JS (no build step), HTML5 Canvas, `node:test` (built-in runner, zero deps), Playgama Bridge + CrazyGames SDK adapters, Firebase Firestore wrapper.

**Reference docs:**
- Spec: [docs/Tech/neon-drift-spec.md](../../Tech/neon-drift-spec.md)
- Architecture & TDD cases: [docs/Tech/neon-drift-architecture.md](../../Tech/neon-drift-architecture.md)
- Ad rules: [docs/ad-patterns.md](../../ad-patterns.md)
- Design tokens: [docs/design-tokens.md](../../design-tokens.md)

---

## File Structure

| File | Responsibility | Created/Modified |
|------|---------------|------------------|
| `package.json` | `"test": "node --test"` | Create |
| `test/helpers.js` | Grid notation helpers (`R1`, `tileGrid`, `seededRandom`), `sameLine` re-export for tests | Create |
| `src/neon-drift.js` | ⭐ Pure core: `slideLine`, `applyMove`, `chainMultiplier`, `spawnTile`, `checkWin`, `checkGameOver`, `canMove`, `difficulty`. Zero deps, no `Date`/`Math.random`. | Create |
| `test/neon-drift.test.js` | 23 TDD cases against the core | Create |
| `src/palette.js` | `COLOR_PALETTE` (ported) + `difficulty` re-export bridge for browser | Create |
| `src/particles.js` | `Particle`, `ParticleSystem`, `FloatText` (ported from SameGame `render.js`) | Create |
| `src/grid-render.js` | Canvas draw + slide tween (lerp) + dev size numbers | Create |
| `src/index.html` | Shell: boot, state machine, input→core, ads, persistence | Modify (replace TODO template body) |

**Module dependency direction (one-way):** `index.html` → `grid-render.js` → (`palette.js`, `particles.js`); `index.html` → `neon-drift.js`. Core depends on nothing.

**Core data types (used throughout):**
```js
// Tile: { color: number, size: number }  where size = 2^k (1,2,4,8,...)
// Empty cell: null
// grid: Tile[8][8]  row-major  (grid[r][c])
```

---

## Task 1: Project test scaffold + grid notation helpers

**Files:**
- Create: `package.json`
- Create: `test/helpers.js`

- [ ] **Step 1: Create package.json**

Create `package.json`:
```json
{
  "name": "neon-drift",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create test helpers**

Create `test/helpers.js`:
```js
'use strict';
// Grid notation helpers for readable TDD cases.
// "R1" = color 0 (R) size 1, "G2" = color 1 (G) size 2, "□"/null = empty.
const COLORS = { R: 0, G: 1, B: 2, O: 3, P: 4, Y: 5 };

// Parse a token like "R1" / "G2" / "□" / null into a Tile or null.
function tok(t) {
  if (t == null || t === '□' || t === '.') return null;
  const color = COLORS[t[0]];
  const size = Number(t.slice(1));
  if (color === undefined || !Number.isFinite(size)) {
    throw new Error(`bad token: ${t}`);
  }
  return { color, size };
}

// Build a single line (array) from tokens: line('□','R1','□','□')
function line(...toks) {
  return toks.map(tok);
}

// Build an 8x8 grid from rows of token arrays; missing cells pad to null.
// tileGrid([['R1','R1']]) → row 0 has two tiles, rest null. 8x8.
function tileGrid(rows) {
  const g = Array.from({ length: 8 }, () => Array(8).fill(null));
  rows.forEach((row, r) => row.forEach((t, c) => { g[r][c] = tok(t); }));
  return g;
}

// Deterministic RNG (same as SameGame seededRandom) for spawn tests.
function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { COLORS, tok, line, tileGrid, seededRandom };
```

- [ ] **Step 3: Commit**

```bash
git add package.json test/helpers.js
git commit -m "test: add node:test scaffold and grid notation helpers"
```

---

## Task 2: `slideLine` — the single source of truth for sliding (TDD cases 1–8b)

**Files:**
- Create: `src/neon-drift.js`
- Create: `test/neon-drift.test.js`

`slideLine(line)` takes a length-8 array of `Tile|null` (left-packing reference) and returns `{ line: Tile[8], merges: [{index, size}], moved: bool }`. Merge rule: adjacent same `color` AND same `size` → one tile at `size*2`; a merged pair is consumed (`i += 2`) so it cannot re-merge in the same push. `moved` MUST be element-wise comparison (`out != line` is reference compare and always true — that would break the spawn gate).

- [ ] **Step 1: Write failing tests for slideLine (cases 1–8b)**

Create `test/neon-drift.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { line, tileGrid, seededRandom } = require('./helpers');
const ND = require('../src/neon-drift');

// Compare a returned line against expected tokens, cell by cell.
function assertLine(actual, expectedToks) {
  const expected = line(...expectedToks);
  assert.strictEqual(actual.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.deepStrictEqual(actual[i], expected[i], `cell ${i}`);
  }
}

test('case 1: simple compact', () => {
  const r = ND.slideLine(line('□', 'R1', '□', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R1', '□', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.moved, true);
  assert.strictEqual(r.merges.length, 0);
});

test('case 2: same color same size merges', () => {
  const r = ND.slideLine(line('R1', 'R1', '□', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', '□', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 1);
  assert.deepStrictEqual(r.merges[0], { index: 0, size: 2 });
});

test('case 3: gapped merge', () => {
  const r = ND.slideLine(line('R1', '□', 'R1', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', '□', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 1);
});

test('case 4: same color different size does NOT merge, no move', () => {
  const r = ND.slideLine(line('R1', 'R2', '□', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R1', 'R2', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.moved, false);
  assert.strictEqual(r.merges.length, 0);
});

test('case 5: different color does NOT merge', () => {
  const r = ND.slideLine(line('R1', 'G1', '□', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R1', 'G1', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 0);
});

test('case 6: no re-merge in one push', () => {
  const r = ND.slideLine(line('R1', 'R1', 'R1', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', 'R1', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 1);
});

test('case 7: four in a row → two merges', () => {
  const r = ND.slideLine(line('R1', 'R1', 'R1', 'R1', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', 'R2', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 2);
});

test('case 8: no change → moved false', () => {
  const r = ND.slideLine(line('R2', 'R1', '□', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', 'R1', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.moved, false);
});

test('case 8b: different-size leader then mergeable pair (i-progression edge)', () => {
  const r = ND.slideLine(line('R2', 'R1', 'R1', '□', '□', '□', '□', '□'));
  assertLine(r.line, ['R2', 'R2', '□', '□', '□', '□', '□', '□']);
  assert.strictEqual(r.merges.length, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `Cannot find module '../src/neon-drift'` (or `ND.slideLine is not a function`).

- [ ] **Step 3: Implement slideLine (minimal)**

Create `src/neon-drift.js`:
```js
/* neon-drift.js — pure game core. Zero dependencies.
   No Date.now() / Math.random(): all randomness is injected (rng). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;     // node test
  else { root.SG = root.SG || {}; root.SG.ND = api; }                          // browser
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 8;

  // Cell-wise equality of two length-8 lines.
  function sameLine(a, b) {
    for (let i = 0; i < N; i++) {
      const x = a[i], y = b[i];
      if (x == null && y == null) continue;
      if (x == null || y == null) return false;
      if (x.color !== y.color || x.size !== y.size) return false;
    }
    return true;
  }

  // Slide a length-8 line left, merging adjacent same-color same-size pairs.
  // Returns { line: Tile[8], merges: [{index, size}], moved }.
  function slideLine(input) {
    const tiles = input.filter(t => t != null);
    const out = [];
    const merges = [];
    let i = 0;
    while (i < tiles.length) {
      if (i + 1 < tiles.length &&
          tiles[i].color === tiles[i + 1].color &&
          tiles[i].size === tiles[i + 1].size) {
        const size = tiles[i].size * 2;
        out.push({ color: tiles[i].color, size });
        merges.push({ index: out.length - 1, size });
        i += 2;                       // consume pair → no re-merge this push
      } else {
        out.push(tiles[i]);
        i += 1;
      }
    }
    while (out.length < N) out.push(null);
    const moved = !sameLine(out, input);
    return { line: out, merges, moved };
  }

  return { N, sameLine, slideLine };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — 9 tests (cases 1–8b).

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): slideLine with merge + no-re-merge (TDD 1-8b)"
```

---

## Task 3: `chainMultiplier` (TDD case 12)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

- [ ] **Step 1: Add failing test for chainMultiplier**

Append to `test/neon-drift.test.js`:
```js
test('case 12: chain multiplier curve', () => {
  assert.strictEqual(ND.chainMultiplier(0), 0);
  assert.strictEqual(ND.chainMultiplier(1), 1);
  assert.strictEqual(ND.chainMultiplier(2), 2);
  assert.strictEqual(ND.chainMultiplier(4), 4);
  assert.strictEqual(ND.chainMultiplier(5), 5);
  assert.strictEqual(ND.chainMultiplier(7), 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `ND.chainMultiplier is not a function`.

- [ ] **Step 3: Implement chainMultiplier**

In `src/neon-drift.js`, add before the `return` statement:
```js
  // chain 0→0, 1→1, 2→2, 3→3, 4→4, >=5→5
  function chainMultiplier(chain) {
    if (chain <= 0) return 0;
    return Math.min(chain, 5);
  }
```
And add `chainMultiplier` to the returned object:
```js
  return { N, sameLine, slideLine, chainMultiplier };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS — case 12 green, prior cases still green.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): chainMultiplier curve (TDD 12)"
```

---

## Task 4: `checkWin` + `canMove` + `checkGameOver` (TDD cases 16, 17, 19, 20, 20b)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/neon-drift.test.js`:
```js
test('case 16: checkWin single color → true', () => {
  const g = tileGrid([['R1', 'R2'], ['R1', 'R1']]);
  assert.strictEqual(ND.checkWin(g), true);
});

test('case 17: checkWin multi color → false', () => {
  const g = tileGrid([['R1', 'G1']]);
  assert.strictEqual(ND.checkWin(g), false);
});

test('case 19: full grid + no move → game over', () => {
  // Checkerboard of R1/G1: full, no adjacent equal pair anywhere.
  const rows = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) row.push((r + c) % 2 === 0 ? 'R1' : 'G1');
    rows.push(row);
  }
  const g = tileGrid(rows);
  assert.strictEqual(ND.checkGameOver(g), true);
});

test('case 20: full grid but mergeable → not game over', () => {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) row.push((r + c) % 2 === 0 ? 'R1' : 'G1');
    rows.push(row);
  }
  rows[0][0] = 'R1'; rows[0][1] = 'R1';   // create a horizontal mergeable pair
  const g = tileGrid(rows);
  assert.strictEqual(ND.checkGameOver(g), false);
});

test('case 20b: canMove detects vertical-only mergeable', () => {
  // Full grid, no horizontal pair, but a vertical R1 over R1.
  const rows = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) row.push((r + c) % 2 === 0 ? 'R1' : 'G1');
    rows.push(row);
  }
  rows[0][0] = 'R1'; rows[1][0] = 'R1';   // vertical pair in column 0
  const g = tileGrid(rows);
  assert.strictEqual(ND.canMove(g), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `ND.checkWin is not a function`.

- [ ] **Step 3: Implement checkWin, canMove, checkGameOver**

In `src/neon-drift.js`, add before the `return`:
```js
  // Distinct colors present === 1 (ignores empty cells). Empty grid → false.
  function checkWin(grid) {
    let seen = -1;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (seen === -1) seen = t.color;
      else if (t.color !== seen) return false;
    }
    return seen !== -1;
  }

  // Any empty cell, or any adjacent (h/v) same-color same-size pair → movable.
  function canMove(grid) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) return true;
      const right = c + 1 < N ? grid[r][c + 1] : null;
      const down = r + 1 < N ? grid[r + 1][c] : null;
      if (right && right.color === t.color && right.size === t.size) return true;
      if (down && down.color === t.color && down.size === t.size) return true;
    }
    return false;
  }

  function checkGameOver(grid) {
    return !canMove(grid);
  }
```
Update the return:
```js
  return { N, sameLine, slideLine, chainMultiplier, checkWin, canMove, checkGameOver };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — cases 16,17,19,20,20b green.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): checkWin/canMove/checkGameOver (TDD 16,17,19,20,20b)"
```

---

## Task 5: `difficulty(level)` (TDD case 22 extension)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/neon-drift.test.js`:
```js
test('case 22a: difficulty colors curve + clamp', () => {
  assert.strictEqual(ND.difficulty(0).colors, 3);
  assert.strictEqual(ND.difficulty(1).colors, 4);
  assert.strictEqual(ND.difficulty(3).colors, 6);
  assert.strictEqual(ND.difficulty(10).colors, 6);   // clamp at 6
});

test('case 22b: difficulty bias monotonic decrease with floor', () => {
  const b0 = ND.difficulty(0).bias;
  const b1 = ND.difficulty(1).bias;
  const bBig = ND.difficulty(20).bias;
  assert.ok(b0 > b1, 'bias decreases');
  assert.ok(bBig >= 0.35 - 1e-9, 'bias floor 0.35');
});

test('case 22c: difficulty startBlocks + clampThreshold', () => {
  assert.strictEqual(ND.difficulty(0).startBlocks, 8);
  assert.strictEqual(ND.difficulty(0).clampThreshold, 2);
  assert.strictEqual(ND.difficulty(2).clampThreshold, 1);
  assert.strictEqual(ND.difficulty(20).startBlocks, 16);   // clamp at 16
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `ND.difficulty is not a function`.

- [ ] **Step 3: Implement difficulty**

In `src/neon-drift.js`, add before the `return`:
```js
  // Pure difficulty function (architecture §3.3). level >= 0.
  function difficulty(level) {
    return {
      colors:         Math.min(3 + level, 6),
      bias:           Math.max(0.6 - level * 0.05, 0.35),
      startBlocks:    Math.min(8 + level * 2, 16),
      clampThreshold: level >= 2 ? 1 : 2,
    };
  }
```
Update the return to include `difficulty`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — cases 22a/b/c green.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): difficulty(level) pure function (TDD 22)"
```

---

## Task 6: `spawnTile` with most-color bias + clamp (TDD cases 14, 14b, 15)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

`spawnTile(grid, rng, opts)` picks one empty cell and a color, returns `{ at:[r,c], color, size:1 }` or `null` if no empty cell. `opts = { bias, clampThreshold, colors }`. Color choice: with probability `bias` pick the current most-frequent color; otherwise uniform over active colors. If distinct colors present `<= clampThreshold`, force the majority color (single-color-imminent clamp). Cell choice is uniform over empties using `rng`.

- [ ] **Step 1: Add failing tests**

Append to `test/neon-drift.test.js`:
```js
test('case 15: spawnTile on full grid → null', () => {
  const rows = Array.from({ length: 8 }, () => Array(8).fill('R1'));
  const g = tileGrid(rows);
  assert.strictEqual(ND.spawnTile(g, seededRandom(1), { bias: 0.6, clampThreshold: 1, colors: 3 }), null);
});

test('case 14: spawnTile deterministic + majority over-sampled', () => {
  // Grid biased heavily to color R (0); a few empties.
  const rows = Array.from({ length: 8 }, () => Array(8).fill('R1'));
  rows[0][0] = null; rows[0][1] = null; rows[0][2] = null;
  rows[7][7] = 'G1';   // one minority tile so distinct=2 (above clampThreshold=0 here)
  const g = tileGrid(rows);
  // Determinism: same seed → same result.
  const a = ND.spawnTile(g, seededRandom(42), { bias: 0.6, clampThreshold: 0, colors: 3 });
  const b = ND.spawnTile(g, seededRandom(42), { bias: 0.6, clampThreshold: 0, colors: 3 });
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.size, 1);

  // Over-sampling: across many seeds, majority color R should dominate spawns.
  let rCount = 0, total = 0;
  for (let s = 0; s < 300; s++) {
    const res = ND.spawnTile(g, seededRandom(s), { bias: 0.6, clampThreshold: 0, colors: 3 });
    if (res) { total++; if (res.color === 0) rCount++; }
  }
  assert.ok(rCount / total > 1 / 3, `R oversampled: ${rCount}/${total}`);
});

test('case 14b: spawnTile clamp forces majority when distinct <= threshold', () => {
  const rows = Array.from({ length: 8 }, () => Array(8).fill('R1'));
  rows[0][0] = null;          // one empty
  rows[7][7] = 'G1';          // distinct = 2 (R majority, G minority)
  const g = tileGrid(rows);
  // clampThreshold 2 → distinct(2) <= 2 → must spawn majority color R (0)
  for (let s = 0; s < 20; s++) {
    const res = ND.spawnTile(g, seededRandom(s), { bias: 0.6, clampThreshold: 2, colors: 3 });
    assert.strictEqual(res.color, 0, `seed ${s} forced majority`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `ND.spawnTile is not a function`.

- [ ] **Step 3: Implement spawnTile**

In `src/neon-drift.js`, add before the `return`:
```js
  // Collect [r,c] of empty cells.
  function emptyCells(grid) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }

  // Count tiles per color; return { counts: Map, majority: colorIdx|−1, distinct }.
  function colorStats(grid) {
    const counts = new Map();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) continue;
      counts.set(t.color, (counts.get(t.color) || 0) + 1);
    }
    let majority = -1, max = -1;
    for (const [color, n] of counts) if (n > max) { max = n; majority = color; }
    return { counts, majority, distinct: counts.size };
  }

  // Spawn one size-1 tile. opts: { bias, clampThreshold, colors }.
  function spawnTile(grid, rng, opts) {
    const empties = emptyCells(grid);
    if (empties.length === 0) return null;
    const { bias, clampThreshold, colors } = opts;
    const { majority, distinct } = colorStats(grid);

    // Cell: uniform over empties.
    const at = empties[Math.floor(rng() * empties.length)];

    // Color: clamp → majority; else biased majority vs uniform.
    let color;
    if (distinct > 0 && distinct <= clampThreshold && majority !== -1) {
      color = majority;
    } else if (majority !== -1 && rng() < bias) {
      color = majority;
    } else {
      color = Math.floor(rng() * colors);
    }
    return { at, color, size: 1 };
  }
```
Update the return to include `spawnTile`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — cases 14,14b,15 green.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): spawnTile bias + single-color clamp (TDD 14,14b,15)"
```

---

## Task 7: `applyMove` — full-grid push with coordinate inverse-mapping (TDD cases 9, 10, 11, 13, 13b, 18, 21)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

`applyMove(grid, dir, rng, opts)` normalizes the grid to "left push" per the §3.1 inverse table, applies `slideLine` per line, maps results back to original `[r,c]`, computes chain/score, checks win BEFORE spawn, spawns only if `moved && !won`. Returns `{ grid, moves, merges, chain, scoreGained, moved, won, spawned }`. `opts` is passed to `spawnTile`.

**§3.1 inverse map (line index j → grid [r,c]), N=8:**
| dir | line k | j-direction | [r,c] |
|-----|--------|-------------|-------|
| `left` | row r | left→right | `[k, j]` |
| `right` | row r | right→left | `[k, N-1-j]` |
| `up` | col c | top→bottom | `[j, k]` |
| `down` | col c | bottom→top | `[N-1-j, k]` |

- [ ] **Step 1: Add failing tests**

Append to `test/neon-drift.test.js`:
```js
const OPTS = { bias: 0.6, clampThreshold: 0, colors: 3 };

test('case 11: moved=true → spawns one size-1 tile', () => {
  // Multi-color board so won=false (single-color would win → spawn suppressed, see case 18).
  const g = tileGrid([['□', 'R1', 'G1']]);     // empty + two colors → left push moves, no win
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  assert.strictEqual(r.moved, true);
  assert.notStrictEqual(r.spawned, null);
  assert.strictEqual(r.spawned.size, 1);
  // spawned cell is actually filled in returned grid
  const [sr, sc] = r.spawned.at;
  assert.ok(r.grid[sr][sc] != null);
});

test('case 10: moved=false → no spawn', () => {
  const g = tileGrid([['R2', 'R1']]);          // already left-packed, non-mergeable
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  assert.strictEqual(r.moved, false);
  assert.strictEqual(r.spawned, null);
});

test('case 13: score = sum(size) * chainMultiplier', () => {
  // Row 0: R1 R1 R1 R1 → two merges to R2 R2, chain 2 → (2+2)*2 = 8
  const g = tileGrid([['R1', 'R1', 'R1', 'R1']]);
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  assert.strictEqual(r.chain, 2);
  assert.strictEqual(r.scoreGained, 8);
});

test('case 13b: no merge → scoreGained 0', () => {
  const g = tileGrid([['□', 'R1']]);
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  assert.strictEqual(r.chain, 0);
  assert.strictEqual(r.scoreGained, 0);
});

test('case 18: win detected BEFORE spawn → won true, spawned null', () => {
  // Only R tiles, one mergeable pair → after merge still single color → win.
  const g = tileGrid([['R1', 'R1']]);
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  assert.strictEqual(r.won, true);
  assert.strictEqual(r.spawned, null);   // spawn suppressed on win
});

test('case 9: left push inverse coords (R1 at [0,3] → [0,0])', () => {
  const g = tileGrid([['□', '□', '□', 'R1']]);
  const r = ND.applyMove(g, 'left', seededRandom(1), OPTS);
  const mv = r.moves.find(m => m.from[0] === 0 && m.from[1] === 3);
  assert.ok(mv, 'move from [0,3] exists');
  assert.deepStrictEqual(mv.to, [0, 0]);
});

test('case 9 (right/up/down): inverse coords per §3.1', () => {
  // RIGHT: R1 at [0,0] → [0,7]
  let g = tileGrid([['R1']]);
  let r = ND.applyMove(g, 'right', seededRandom(1), OPTS);
  let mv = r.moves.find(m => m.from[0] === 0 && m.from[1] === 0);
  assert.deepStrictEqual(mv.to, [0, 7]);

  // UP: R1 at [3,0] → [0,0]
  g = tileGrid([[], [], [], ['R1']]);
  r = ND.applyMove(g, 'up', seededRandom(1), OPTS);
  mv = r.moves.find(m => m.from[0] === 3 && m.from[1] === 0);
  assert.deepStrictEqual(mv.to, [0, 0]);

  // DOWN: R1 at [0,0] → [7,0]
  g = tileGrid([['R1']]);
  r = ND.applyMove(g, 'down', seededRandom(1), OPTS);
  mv = r.moves.find(m => m.from[0] === 0 && m.from[1] === 0);
  assert.deepStrictEqual(mv.to, [7, 0]);
});

test('case 21: merges[] at-coords map back to original direction', () => {
  // Right push: R1 R1 at [0,0],[0,1] merge → lands at rightmost [0,7].
  const g = tileGrid([['R1', 'R1']]);
  const r = ND.applyMove(g, 'right', seededRandom(1), OPTS);
  assert.strictEqual(r.merges.length, 1);
  assert.deepStrictEqual(r.merges[0].at, [0, 7]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `ND.applyMove is not a function`.

- [ ] **Step 3: Implement applyMove**

In `src/neon-drift.js`, add before the `return`:
```js
  // Map (line k, packed index j) → original [r,c] per dir (§3.1).
  function invMap(dir, k, j) {
    switch (dir) {
      case 'left':  return [k, j];
      case 'right': return [k, N - 1 - j];
      case 'up':    return [j, k];
      case 'down':  return [N - 1 - j, k];
      default: throw new Error('bad dir: ' + dir);
    }
  }

  // Read a line for (dir, k): the row/column in packing order.
  function readLine(grid, dir, k) {
    const out = [];
    for (let j = 0; j < N; j++) { const [r, c] = invMap(dir, k, j); out.push(grid[r][c]); }
    return out;
  }

  function emptyGrid() {
    return Array.from({ length: N }, () => Array(N).fill(null));
  }

  // Full-grid push. opts forwarded to spawnTile.
  function applyMove(grid, dir, rng, opts) {
    const next = emptyGrid();
    const moves = [];
    const merges = [];
    let chain = 0;
    let scoreGained = 0;
    let moved = false;

    // We need per-source tracking. Re-derive moves by walking source tiles in
    // packing order and assigning destination indices from the slid line.
    for (let k = 0; k < N; k++) {
      const src = readLine(grid, dir, k);          // length-8, packing order
      const res = slideLine(src);
      if (res.moved) moved = true;

      // Write slid line back to next grid.
      for (let j = 0; j < N; j++) {
        const [r, c] = invMap(dir, k, j);
        next[r][c] = res.line[j];
      }

      // Build moves[]: walk source tiles (compacted order), assign to dest slots.
      // dest slot index advances by 1 per output cell; a merge consumes 2 sources
      // that both move to the same dest slot.
      const srcTiles = [];
      for (let j = 0; j < N; j++) if (src[j] != null) srcTiles.push(j);   // source j indices
      let si = 0;                                  // index into srcTiles
      for (let outIdx = 0; outIdx < res.line.length && res.line[outIdx] != null; outIdx++) {
        const isMerge = res.merges.some(m => m.index === outIdx);
        const consume = isMerge ? 2 : 1;
        for (let n = 0; n < consume; n++) {
          const fromJ = srcTiles[si++];
          const from = invMap(dir, k, fromJ);
          const to = invMap(dir, k, outIdx);
          moves.push({ from, to });
        }
      }

      // merges[] with original coords.
      for (const m of res.merges) {
        merges.push({ at: invMap(dir, k, m.index), size: m.size });
      }
      chain += res.merges.length;
      for (const m of res.merges) scoreGained += m.size;
    }

    scoreGained *= chainMultiplier(chain);

    // Win check BEFORE spawn (FR-6).
    const won = checkWin(next);

    let spawned = null;
    if (moved && !won) {
      const s = spawnTile(next, rng, opts);
      if (s) { next[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; spawned = s; }
    }

    return { grid: next, moves, merges, chain, scoreGained, moved, won, spawned };
  }
```
Update the return to include `applyMove`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — cases 9,10,11,13,13b,18,21 green, all prior green.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): applyMove with §3.1 inverse mapping, win-before-spawn (TDD 9,10,11,13,13b,18,21)"
```

---

## Task 8: Lifecycle helpers — level-up color clamp + Undo snapshot (TDD cases 22, 23)

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

These are small pure helpers the shell will use: `nextLevel(level)` (architecture §22: activeColors+1, max 6 via `difficulty`) and `cloneGrid(grid)` (for the 1-step Undo snapshot, case 23).

- [ ] **Step 1: Add failing tests**

Append to `test/neon-drift.test.js`:
```js
test('case 22 lifecycle: level-up increments colors, clamps at 6', () => {
  assert.strictEqual(ND.difficulty(ND.nextLevel(0)).colors, 4);
  assert.strictEqual(ND.difficulty(ND.nextLevel(5)).colors, 6);   // 6 stays 6
  assert.strictEqual(ND.nextLevel(5) >= 5, true);
});

test('case 23: cloneGrid deep-copies for undo', () => {
  const g = tileGrid([['R1', 'G2']]);
  const snap = ND.cloneGrid(g);
  g[0][0].size = 99;                  // mutate original
  assert.strictEqual(snap[0][0].size, 1, 'snapshot unaffected');
  assert.strictEqual(snap[0][1].color, 1);
  assert.strictEqual(snap[0][2], null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `ND.nextLevel is not a function`.

- [ ] **Step 3: Implement nextLevel + cloneGrid**

In `src/neon-drift.js`, add before the `return`:
```js
  // Level-up: increment level; colors are clamped inside difficulty() at 6.
  function nextLevel(level) {
    return level + 1;
  }

  // Deep clone an 8x8 grid (tiles are plain {color,size}).
  function cloneGrid(grid) {
    return grid.map(row => row.map(t => t ? { color: t.color, size: t.size } : null));
  }
```
Update the return to include `nextLevel, cloneGrid`. Final return line:
```js
  return {
    N, sameLine, slideLine, chainMultiplier, checkWin, canMove, checkGameOver,
    difficulty, spawnTile, applyMove, nextLevel, cloneGrid, colorStats, emptyCells,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all 23 case groups green. Run final count check.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): nextLevel + cloneGrid for level-up and undo (TDD 22,23)"
```

---

## Task 9: Initial grid builder + verify full core suite

**Files:**
- Modify: `src/neon-drift.js`
- Modify: `test/neon-drift.test.js`

`initGrid(level, rng)` builds the starting 8×8 grid: place `difficulty(level).startBlocks` size-1 tiles at random empty cells, colors uniform over `difficulty(level).colors`. Pure (rng injected). FR-1.

- [ ] **Step 1: Add failing test**

Append to `test/neon-drift.test.js`:
```js
test('FR-1: initGrid places startBlocks tiles, deterministic', () => {
  const a = ND.initGrid(0, seededRandom(7));
  const b = ND.initGrid(0, seededRandom(7));
  // deterministic
  assert.deepStrictEqual(a, b);
  // count tiles
  let count = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (a[r][c]) count++;
  assert.strictEqual(count, ND.difficulty(0).startBlocks);   // 8
  // all size 1, color within range
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const t = a[r][c];
    if (t) { assert.strictEqual(t.size, 1); assert.ok(t.color < 3); }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `ND.initGrid is not a function`.

- [ ] **Step 3: Implement initGrid**

In `src/neon-drift.js`, add before the `return`:
```js
  // Build starting grid for a level. Pure (rng injected). FR-1.
  function initGrid(level, rng) {
    const { startBlocks, colors } = difficulty(level);
    const grid = emptyGrid();
    let placed = 0;
    let guard = 0;
    while (placed < startBlocks && guard < 10000) {
      guard++;
      const r = Math.floor(rng() * N);
      const c = Math.floor(rng() * N);
      if (grid[r][c]) continue;
      grid[r][c] = { color: Math.floor(rng() * colors), size: 1 };
      placed++;
    }
    return grid;
  }
```
Add `initGrid` to the return object.

- [ ] **Step 4: Run full suite**

Run: `node --test`
Expected: PASS — all tests green (cases 1–23 + FR-1). Note the total test count for the commit message.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "feat(core): initGrid starting board (FR-1); full core suite green"
```

---

## Task 10: Port `palette.js` (COLOR_PALETTE + browser difficulty bridge)

**Files:**
- Create: `src/palette.js`

Browser-only module exposing `SG.COLOR_PALETTE` (ported verbatim from SameGame `render.js`). The CSS `--c0..--c5` tokens in index.html are a separate color source for buttons; `COLOR_PALETTE` is the canvas source — keep them visually consistent (spec §3.2).

- [ ] **Step 1: Create palette.js**

Create `src/palette.js`:
```js
/* palette.js — Neon Drift canvas color palette.
   Ported verbatim from SameGame Grid Protocol render.js COLOR_PALETTE.
   Browser global: SG.COLOR_PALETTE (array of {fill, glow, dark}). */
(function (global) {
  'use strict';
  const COLOR_PALETTE = [
    { fill: '#ff3050', glow: '#ff0030', dark: '#800018' }, // 0 R
    { fill: '#00c8ff', glow: '#0090ff', dark: '#004878' }, // 1 B
    { fill: '#88ff20', glow: '#44cc00', dark: '#204800' }, // 2 G
    { fill: '#ff9020', glow: '#ff6000', dark: '#782800' }, // 3 O
    { fill: '#c050ff', glow: '#9020e8', dark: '#500080' }, // 4 P
    { fill: '#ffe020', glow: '#ffb000', dark: '#705000' }, // 5 Y
  ];
  global.SG = global.SG || {};
  global.SG.COLOR_PALETTE = COLOR_PALETTE;
})(typeof self !== 'undefined' ? self : this);
```

- [ ] **Step 2: Commit**

```bash
git add src/palette.js
git commit -m "feat: port COLOR_PALETTE to palette.js"
```

---

## Task 11: Port `particles.js` (Particle, ParticleSystem, FloatText)

**Files:**
- Create: `src/particles.js`

Ported from SameGame `render.js` lines 16–90. These use `Math.random()` internally — that's fine, they are render-only and never touch the core.

- [ ] **Step 1: Create particles.js**

Create `src/particles.js`:
```js
/* particles.js — render-only FX. Ported from SameGame Grid Protocol render.js.
   Uses Math.random() internally (render-only; core stays deterministic).
   Browser globals: SG.Particle, SG.ParticleSystem, SG.FloatText. */
(function (global) {
  'use strict';

  class Particle {
    constructor() { this.active = false; }
    spawn(x, y, color, vx, vy, life, size) {
      Object.assign(this, { x, y, color, vx, vy, life, maxLife: life, size, active: true });
    }
    update(dt) {
      if (!this.active) return;
      this.x += this.vx * dt;
      this.y += (this.vy + 200 * (1 - this.life / this.maxLife)) * dt;
      this.vx *= 0.97;
      this.life -= dt * 1000;
      if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
      if (!this.active) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.globalAlpha = alpha * .9;
      ctx.fillStyle = this.color;
      const s = this.size * alpha;
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  class ParticleSystem {
    constructor(maxParticles = 600) {
      this.pool = Array.from({ length: maxParticles }, () => new Particle());
    }
    emit(x, y, colorObj, count = 12) {
      for (let i = 0; i < count; i++) {
        const p = this.pool.find(p => !p.active);
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const spd = 80 + Math.random() * 220;
        p.spawn(x, y,
          Math.random() < .5 ? colorObj.fill : colorObj.glow,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd - 60,
          300 + Math.random() * 400,
          3 + Math.random() * 5
        );
      }
    }
    update(dt) { this.pool.forEach(p => p.update(dt)); }
    draw(ctx) { this.pool.forEach(p => p.draw(ctx)); }
  }

  class FloatText {
    constructor(x, y, text, color, scale = 1) {
      const life = 900 + Math.min(scale, 3.5) * 160;
      const vy = -68 - scale * 14;
      Object.assign(this, { x, y, text, color, scale, life, maxLife: life, vy });
    }
    update(dt) { this.y += this.vy * dt; this.life -= dt * 1000; }
    get alive() { return this.life > 0; }
    draw(ctx) {
      const alpha = Math.min(1, this.life / 280);
      const baseSize = 13 + this.scale * 4.5;
      const fontSize = Math.round(baseSize + (1 - this.life / this.maxLife) * 3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
      ctx.textAlign = 'center';
      if (this.scale >= 2) { ctx.shadowColor = this.color; ctx.shadowBlur = 6 + this.scale * 3; }
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  global.SG = global.SG || {};
  Object.assign(global.SG, { Particle, ParticleSystem, FloatText });
})(typeof self !== 'undefined' ? self : this);
```

- [ ] **Step 2: Commit**

```bash
git add src/particles.js
git commit -m "feat: port ParticleSystem + FloatText to particles.js"
```

---

## Task 12: `grid-render.js` — Canvas draw + slide tween + dev numbers

**Files:**
- Create: `src/grid-render.js`

Renderer holds canvas state, draws an 8×8 grid of rounded tiles using `SG.COLOR_PALETTE`, tweens `moves[]` with lerp over a duration (NFR-1: 50–80ms/line, use 120ms total), then fires `merges[]` particles/FloatText via the injected `ParticleSystem`. Dev mode (`?dev` or `localStorage.sg_dev`) overlays the size number on each tile (spec §5.4). No game-rule logic.

- [ ] **Step 1: Create grid-render.js**

Create `src/grid-render.js`:
```js
/* grid-render.js — Canvas renderer + slide tween for Neon Drift.
   Depends on SG.COLOR_PALETTE (palette.js), SG.ParticleSystem/SG.FloatText (particles.js).
   Browser global: SG.Renderer. No game-rule logic. */
(function (global) {
  'use strict';
  const { COLOR_PALETTE } = global.SG;

  const N = 8;
  const TWEEN_MS = 120;                 // total slide tween (NFR-1)
  const DEV = (() => {
    try {
      return /(\?|&)dev\b/.test(location.search) || localStorage.getItem('sg_dev') === '1';
    } catch (_) { return false; }
  })();

  const easeOut = t => 1 - (1 - t) * (1 - t);

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = new global.SG.ParticleSystem(600);
      this.floats = [];
      this.cell = 0;
      this.pad = 0;
      this.tween = null;                // { from:grid, moves, merges, start, dur, onDone }
      this._lastTs = 0;
      this.resize();
    }

    resize() {
      const dpr = global.devicePixelRatio || 1;
      const size = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) || 360;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.pad = Math.round(size * 0.02);
      this.cell = (size - this.pad * 2) / N;
    }

    cellXY(r, c) {
      return [this.pad + c * this.cell + this.cell / 2, this.pad + r * this.cell + this.cell / 2];
    }

    drawTile(cx, cy, tile, alpha = 1) {
      const ctx = this.ctx;
      const pal = COLOR_PALETTE[tile.color] || COLOR_PALETTE[0];
      const s = this.cell * 0.86;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = pal.fill;
      const x = cx - s / 2, y = cy - s / 2, rad = s * 0.18;
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + s, y, x + s, y + s, rad);
      ctx.arcTo(x + s, y + s, x, y + s, rad);
      ctx.arcTo(x, y + s, x, y, rad);
      ctx.arcTo(x, y, x + s, y, rad);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (DEV) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#6b7299';
        ctx.font = `bold ${Math.round(this.cell * 0.28)}px 'Share Tech Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.size), cx, cy);
      }
      ctx.restore();
    }

    // Static draw of a grid (no tween).
    drawGrid(grid) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const [cx, cy] = this.cellXY(r, c);
        ctx.save();
        ctx.globalAlpha = 0.08; ctx.fillStyle = '#1e2235';
        ctx.fillRect(cx - this.cell * 0.43, cy - this.cell * 0.43, this.cell * 0.86, this.cell * 0.86);
        ctx.restore();
        if (grid[r][c]) this.drawTile(cx, cy, grid[r][c]);
      }
    }

    // Animate a push. fromGrid = grid BEFORE move; result = applyMove output.
    animate(fromGrid, result, onDone) {
      this.tween = {
        from: fromGrid, result, start: null, dur: TWEEN_MS, onDone, firedMerges: false,
      };
    }

    // Spawn particles+floats for merges (called once when tween completes).
    _fireMerges(result) {
      for (const m of result.merges) {
        const [cx, cy] = this.cellXY(m.at[0], m.at[1]);
        const tile = result.grid[m.at[0]][m.at[1]];
        const pal = COLOR_PALETTE[(tile && tile.color) || 0];
        this.particles.emit(cx, cy, pal, 14);
        const scale = Math.min(1 + Math.log2(m.size), 3.5);
        this.floats.push(new global.SG.FloatText(cx, cy, '+' + m.size, pal.fill, scale));
      }
    }

    // Main RAF tick. Returns nothing; call from a loop.
    tick(ts) {
      const dt = this._lastTs ? Math.min((ts - this._lastTs) / 1000, 0.05) : 0;
      this._lastTs = ts;
      const ctx = this.ctx;

      if (this.tween) {
        if (this.tween.start == null) this.tween.start = ts;
        const t = Math.min((ts - this.tween.start) / this.tween.dur, 1);
        const k = easeOut(t);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // grid backdrop
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const [cx, cy] = this.cellXY(r, c);
          ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#1e2235';
          ctx.fillRect(cx - this.cell * 0.43, cy - this.cell * 0.43, this.cell * 0.86, this.cell * 0.86);
          ctx.restore();
        }
        // moving tiles
        for (const mv of this.tween.result.moves) {
          const [fr, fc] = mv.from, [tr, tc] = mv.to;
          const [fx, fy] = this.cellXY(fr, fc);
          const [txp, typ] = this.cellXY(tr, tc);
          const tile = this.tween.from[fr][fc];
          if (tile) this.drawTile(fx + (txp - fx) * k, fy + (typ - fy) * k, tile);
        }
        if (t >= 1) {
          if (!this.tween.firedMerges) { this._fireMerges(this.tween.result); this.tween.firedMerges = true; }
          const done = this.tween.onDone;
          const finalGrid = this.tween.result.grid;
          this.tween = null;
          this.drawGrid(finalGrid);
          if (done) done();
        }
      }

      // particles + floats overlay
      this.particles.update(dt);
      this.particles.draw(ctx);
      this.floats = this.floats.filter(f => f.alive);
      this.floats.forEach(f => { f.update(dt); f.draw(ctx); });
    }
  }

  global.SG = global.SG || {};
  global.SG.Renderer = Renderer;
})(typeof self !== 'undefined' ? self : this);
```

- [ ] **Step 2: Manual smoke check (syntax)**

Run: `node -e "require('./src/palette.js'); require('./src/particles.js'); console.log('palette+particles load OK')"`
Expected: prints `palette+particles load OK` (grid-render uses `location`/`document`, so it is browser-only — not require-checked here; just verify no syntax error with `node --check`).
Run: `node --check src/grid-render.js`
Expected: no output (syntax OK).

- [ ] **Step 3: Commit**

```bash
git add src/grid-render.js
git commit -m "feat: grid-render canvas renderer with slide tween + dev numbers"
```

---

## Task 13: `index.html` shell — integrate game into existing template

**Files:**
- Modify: `src/index.html`

The template ALREADY provides a working shell: boot IIFE (SDK init), overlays `#ol-start` / `#ol-gameover` (toggled via `.hidden` class), HUD `#stat-score` / `#stat-best` / `#game-title`, game-over score `#go-score`, canvas `#gameCanvas`, and functions `startGame()` / `restartGame()` / `goToStart()` / `endGame()` / `updateStats()` / `resizeCanvas()` / `render()` / `loop()`. **Integrate into these — do not invent new ids or a parallel structure.** Verified element ids and functions (index.html lines 204–456):
- canvas: `gameCanvas`; canvas wrap: `canvas-wrap`
- title: `game-title`; score: `stat-score`; best: `stat-best`; gameover score: `go-score`
- overlays: `ol-start`, `ol-gameover` (`.hidden` class); buttons call `startGame()`, `restartGame()`, `goToStart()`
- SDK calls present: `SG.CG.gameplayStart/Stop()`, `SG.CG.requestMidgameAd()`, `SG.CG.showBanner()`, `SG.FB.isConnected()`, `SG.FB.submitScore()`, `SG.PG.isAvailable()`, `SG.PG.leaderboard.submit()`
- existing state vars: `score`, `bestScore`, `gameRunning`, `canvas`, `ctx`, `_rafId`
- existing storage keys (line 274): `puzzle_best`, `puzzle_player_id`

- [ ] **Step 1: Set titles + storage keys + add module script includes**

In `src/index.html`:
- Line 7: `<title>Puzzle Game</title>` → `<title>Neon Drift</title>`
- Line 216: `<div id="game-title">Puzzle</div>` → `<div id="game-title">NEON DRIFT</div>`
- Line 240: `<div class="ol-title">Puzzle Game</div>` → `<div class="ol-title">NEON DRIFT</div>`
- Line 242: `TODO: 게임 설명을 여기에` → `같은 색·같은 크기 블록을 밀어 합쳐라`
- Line 274–275 storage keys:
```js
const STORAGE_KEY_BEST  = 'neondrift_best';
const STORAGE_KEY_PLAYER = 'neondrift_player_id';
```
- After the SDK includes block (after line 265, `<script src="firebase.js"></script>`) and BEFORE the game main `<script>` (line 271), add the game module includes in dependency order:
```html
<!-- ── 게임 모듈 (의존성 순서) ──────────────────────────────────── -->
<script src="palette.js"></script>
<script src="particles.js"></script>
<script src="neon-drift.js"></script>
<script src="grid-render.js"></script>
```

- [ ] **Step 2: Add direction-button controls + HUD chain to the markup**

After the `#canvas-wrap` div (closes at line 232) and before `</div>` closing `#app` (line 234), insert the controls:
```html
  <!-- 방향 컨트롤 -->
  <div id="controls">
    <button class="dirbtn" data-dir="up" aria-label="up">↑</button>
    <div class="dirrow">
      <button class="dirbtn" data-dir="left" aria-label="left">←</button>
      <button id="btn-undo" aria-label="undo" disabled>↩</button>
      <button class="dirbtn" data-dir="right" aria-label="right">→</button>
    </div>
    <button class="dirbtn" data-dir="down" aria-label="down">↓</button>
  </div>
```
Add a CHAIN stat: after the BEST stat-item (closes line 225), insert:
```html
      <div class="stat-item">
        <span class="stat-label">CHAIN</span>
        <span class="stat-value" id="stat-chain">×0</span>
      </div>
```
Add control styles inside the `<style>` block (before its closing `</style>`):
```css
    #controls { display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:14px; }
    .dirrow { display:flex; gap:8px; }
    .dirbtn, #btn-undo {
      width:56px; height:56px; font-size:1.4rem; color:var(--accent);
      background:var(--panel); border:1px solid var(--border); border-radius:10px;
      box-shadow:0 0 12px rgba(0,245,200,.15); cursor:pointer; touch-action:manipulation;
    }
    .dirbtn:active { background:#11243a; }
    #btn-undo { color:var(--warn); }
    #btn-undo:disabled { opacity:.35; cursor:default; box-shadow:none; }
```

- [ ] **Step 3: Replace the placeholder game body (lines ~272–414) with the real game logic**

Replace the inline game logic — from the `const STORAGE_KEY_BEST` declarations through the end of `devResetAll()` (i.e. everything between the opening `<script>` at line 271 and the boot IIFE at line 417) — with the following. Keep the storage-key constants (already updated in Step 1) at the top:
```js
const STORAGE_KEY_BEST  = 'neondrift_best';
const STORAGE_KEY_PLAYER = 'neondrift_player_id';

// ── 상태 ──────────────────────────────────────────────────────────
const ND = SG.ND;
let score = 0;
let bestScore = parseInt(localStorage.getItem(STORAGE_KEY_BEST) || '0', 10);
let gameRunning = false;

let renderer = null;
let rng = null;
let grid = null;
let snapshot = null;        // 1-step undo
let level = 0;
let undoUsed = false;
let isAnimating = false;
let maxChain = 0;

const canvas = document.getElementById('gameCanvas');

// Live (non-deterministic) RNG seed; core stays deterministic given this fn.
function makeRng() {
  let seed = (Date.now() ^ (Math.floor(Math.random() * 1e9))) | 0;
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 캔버스 크기 ───────────────────────────────────────────────────
function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  const size = Math.min(wrap.clientWidth - 16, wrap.clientHeight - 16, 480);
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  if (renderer) { renderer.resize(); if (grid) renderer.drawGrid(grid); }
}

// ── HUD ───────────────────────────────────────────────────────────
function updateStats(chain) {
  document.getElementById('stat-score').textContent = score.toLocaleString();
  document.getElementById('stat-best').textContent = bestScore.toLocaleString();
  document.getElementById('stat-chain').textContent = '×' + (chain || 0);
  document.getElementById('game-title').textContent = 'NEON DRIFT  LV.' + (level + 1);
}

// ── 한 번의 밀기 ──────────────────────────────────────────────────
function doMove(dir) {
  if (!gameRunning || isAnimating) return;               // NFR-2 input gate
  const opts = ND.difficulty(level);
  const before = ND.cloneGrid(grid);
  const result = ND.applyMove(grid, dir, rng, {
    bias: opts.bias, clampThreshold: opts.clampThreshold, colors: opts.colors,
  });
  if (!result.moved) return;                             // no-op push: ignore

  snapshot = before; undoUsed = false;
  document.getElementById('btn-undo').disabled = false;
  grid = result.grid;
  score += result.scoreGained;
  if (result.chain > maxChain) maxChain = result.chain;
  updateStats(result.chain);

  try {
    if (result.merges.length && SG.Sound && SG.Sound.playRemove) SG.Sound.playRemove(result.merges[0].size);
    if (result.chain >= 2 && SG.Sound && SG.Sound.playCombo) SG.Sound.playCombo(result.chain);
  } catch (_) {}

  isAnimating = true;
  renderer.animate(before, result, function () {
    isAnimating = false;
    if (result.won) {
      try { if (SG.Sound && SG.Sound.playClear) SG.Sound.playClear(); } catch (_) {}
      levelUp();
      return;
    }
    if (ND.checkGameOver(grid)) endGame();
  });
}

function levelUp() {
  try { if (SG.CG && SG.CG.requestMidgameAd) SG.CG.requestMidgameAd(); } catch (_) {}
  level = ND.nextLevel(level);
  rng = rng || makeRng();
  grid = ND.initGrid(level, rng);
  document.getElementById('btn-undo').disabled = true;
  snapshot = null;
  updateStats(0);
  renderer.drawGrid(grid);
}

function undo() {
  if (!snapshot || undoUsed || isAnimating || !gameRunning) return;
  grid = ND.cloneGrid(snapshot);
  undoUsed = true;
  document.getElementById('btn-undo').disabled = true;
  renderer.drawGrid(grid);
}

// ── 게임 루프 ─────────────────────────────────────────────────────
let _rafId = null;
function loop(ts) {
  if (renderer) renderer.tick(ts || 0);
  _rafId = requestAnimationFrame(loop);
}

// ── 시작 / 재시작 / 메뉴 ──────────────────────────────────────────
async function startGame() {
  document.getElementById('ol-start').classList.add('hidden');
  score = 0; level = 0; maxChain = 0; undoUsed = false; snapshot = null;
  rng = makeRng();
  grid = ND.initGrid(level, rng);
  gameRunning = true;
  document.getElementById('btn-undo').disabled = true;
  updateStats(0);
  if (renderer) renderer.drawGrid(grid);
  try { SG.CG.gameplayStart(); } catch (_) {}
}

async function restartGame() {
  document.getElementById('ol-gameover').classList.add('hidden');
  try { await SG.CG.requestMidgameAd(); } catch (_) {}
  await startGame();
}

function goToStart() {
  document.getElementById('ol-gameover').classList.add('hidden');
  document.getElementById('ol-start').classList.remove('hidden');
  gameRunning = false;
}

// ── 종료 ──────────────────────────────────────────────────────────
async function endGame() {
  gameRunning = false;
  try { SG.CG.gameplayStop(); } catch (_) {}
  try { if (SG.Sound && SG.Sound.playGameOver) SG.Sound.playGameOver(); } catch (_) {}

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(STORAGE_KEY_BEST, String(bestScore));
  }
  updateStats(0);

  try { if (SG.FB.isConnected()) await SG.FB.submitScore(score, { level, maxChain }); } catch (_) {}
  try { if (SG.PG.isAvailable()) await SG.PG.leaderboard.submit(score); } catch (_) {}

  document.getElementById('go-score').textContent = score.toLocaleString();
  document.getElementById('ol-gameover').classList.remove('hidden');
  try { SG.CG.showBanner(); } catch (_) {}
}

// ── 입력 바인딩 ───────────────────────────────────────────────────
document.querySelectorAll('.dirbtn').forEach(function (b) {
  b.addEventListener('click', function () { doMove(b.dataset.dir); });
});
document.getElementById('btn-undo').addEventListener('click', undo);
window.addEventListener('keydown', function (e) {
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (map[e.key]) { e.preventDefault(); doMove(map[e.key]); }
});
let _sx = 0, _sy = 0;
canvas.addEventListener('touchstart', function (e) {
  const t = e.touches[0]; _sx = t.clientX; _sy = t.clientY;
}, { passive: true });
canvas.addEventListener('touchend', function (e) {
  const t = e.changedTouches[0]; const dx = t.clientX - _sx, dy = t.clientY - _sy;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
  else doMove(dy > 0 ? 'down' : 'up');
}, { passive: true });

// ── Playgama 오디오/일시정지 훅 ──────────────────────────────────
SG.PG._onAudioStateChanged = function (isEnabled) {
  try { if (SG.Sound && SG.Sound.setMuted) SG.Sound.setMuted(!isEnabled); } catch (_) {}
};
SG.PG._onPauseStateChanged = function (isPaused) {
  if (isPaused) isAnimating = true;     // freeze input while paused
  else isAnimating = false;
};

// ── DEV BAR ───────────────────────────────────────────────────────
function devResetAll() {
  if (!confirm('모든 데이터를 초기화할까요?')) return;
  localStorage.removeItem(STORAGE_KEY_BEST);
  localStorage.removeItem(STORAGE_KEY_PLAYER);
  location.reload();
}
```

- [ ] **Step 4: Initialize the renderer + loop inside the existing boot IIFE**

In the boot IIFE (lines 417–456), after `resizeCanvas(); window.addEventListener('resize', resizeCanvas);` (line 425–426), insert renderer init + sound instance + loop start. NOTE: `sound.js` exposes only the CLASS `SG.SoundManager` (no instance); the shell must create `SG.Sound` itself:
```js
  // 사운드 인스턴스 생성 (sound.js는 SG.SoundManager 클래스만 노출)
  try { SG.Sound = new SG.SoundManager(); } catch (_) { SG.Sound = null; }

  // 렌더러 + 루프 (게임 모듈 로드 후)
  renderer = new SG.Renderer(canvas);
  resizeCanvas();                 // re-fit now that renderer exists
  requestAnimationFrame(loop);
```
Leave the rest of the boot IIFE unchanged (it already shows the START overlay by default since `#ol-start` has no `.hidden` class, calls `SG.CG.showBanner()`, and `updateStats()` — update that trailing `updateStats()` call to `updateStats(0)`).

- [ ] **Step 5: Syntax check**

Run: `node --check src/grid-render.js && node --check src/neon-drift.js && node --check src/particles.js && node --check src/palette.js`
Expected: no output (all syntax OK). (index.html inline JS can't be node-checked; verify in browser next.)

- [ ] **Step 6: Manual verification in browser**

Serve from `src/`:
```bash
cd src && python -m http.server 8080
```
Open `http://localhost:8080/?dev` and verify:
- START overlay shows; clicking START renders an 8×8 grid with ~8 tiles, banner shows.
- Arrow keys / direction buttons slide tiles; same-color same-size pairs merge with `+N` float + particles; HUD score/chain/level update.
- Dev mode shows size numbers; `R1+R1→R2` merges but `R1+R2` and `R1+G1` do not.
- Undo reverts one move then disables; a second undo does nothing.
- Reaching single-color clears the level (LV increments, board resets); filling the board to no-moves shows GAME OVER with best score.

Expected: all behaviors correct. Fix any discrepancy before commit.

- [ ] **Step 7: Commit**

```bash
git add src/index.html
git commit -m "feat: integrate Neon Drift game into template shell (state, input, render, ads, persistence)"
```

---

## Task 14: Playgama / leaderboard config + deploy verification

**Files:**
- Modify: `src/playgama.js` (only the `_HOF_LB_ID` / leaderboard id constant, per template README)
- Modify: `src/playgama-bridge-config.json` (placement / leaderboard id)

- [ ] **Step 1: Set leaderboard id**

Inspect `src/playgama.js` for the leaderboard id constant (template README notes `_HOF_LB_ID` is the one value to replace). Read it, then set it to the Neon Drift leaderboard id. If the id is not yet provisioned, leave the template default and note it in the commit — do NOT invent an id.

Run: (Read `src/playgama.js`, find `_HOF_LB_ID`)

- [ ] **Step 2: Verify standalone integrity**

Run from repo root:
```bash
powershell -File ../scripts/verify-standalone.ps1 H5-PUZZLE-NeonDrift-v1
```
Expected: PASS (only EXTERNAL-URL warnings for known CDNs: fonts, firebase, playgama, crazygames).

- [ ] **Step 3: Build deploy zip**

From `src/`:
```bash
cd src && zip -r ../neon-drift.zip . -x ".*"
```
Expected: `neon-drift.zip` created with the flat `src/` contents (NFR-6: Playgama QA Tool upload unit).

- [ ] **Step 4: Run full test suite one final time**

Run: `node --test`
Expected: PASS — all core tests green.

- [ ] **Step 5: Commit**

```bash
git add src/playgama.js src/playgama-bridge-config.json
git commit -m "chore: configure playgama leaderboard id + verify standalone build"
```

---

## Out of scope (YAGNI — spec §9)

- Multi-undo (1-step only), pause menu beyond overlay, online multiplayer, custom themes, external sound files.
- chain≥5 wildcard block reward and game-over revive (block-2-remove) are deferred: the spec §10/§6 marks the wildcard merge rule unresolved. Implement after first playtest tuning. (Tracked as follow-up, not in this plan.)

## Open items carried from spec §10

- Spawn most-color bias weight: `bias` factor is in `difficulty()`; tune via playtest.
- chain≥5 wildcard exact merge rule: decide at implementation of the reward feature (post-MVP).
