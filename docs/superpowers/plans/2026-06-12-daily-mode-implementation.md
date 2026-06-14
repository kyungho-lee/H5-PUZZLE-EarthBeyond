# Daily Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4×4 classic-2048 Daily Mode (merge by size only, stars for 1024/2048, 5 rewarded retries, daily date-seeded board, daily leaderboard) without breaking the existing 8×8 main game.

**Architecture:** Generalize the pure core (`neon-drift.js`) so board size and merge rule are parameters that default to today's behavior (8×8, color+size) — keeping all 33 existing tests green. Daily-specific meta (attempts, cumulative stars, date rollover, persistence) lives in a new pure `daily.js`. The shell (`index.html`) wires the DAILY menu, 4×4 screen, ads, and leaderboard. New pure logic is TDD'd with `node:test`.

**Tech Stack:** Vanilla JS UMD modules, HTML5 Canvas, `node:test`, Playgama Bridge (interstitial/rewarded/leaderboard).

**Spec:** [docs/superpowers/specs/2026-06-12-daily-mode-design.md](../specs/2026-06-12-daily-mode-design.md)

---

## File Structure

| File | Responsibility | Change |
|------|---------------|--------|
| `src/neon-drift.js` | Pure core. Generalize: size-agnostic `slideLine`; `applyMove(grid,dir,rng,opts)` gains `opts.n`, `opts.mergeRule`, `opts.targets`. Add `dateSeed`, `dailyType`. | Modify |
| `test/neon-drift.test.js` | Existing 33 tests — must stay green (regression). | Verify only |
| `test/daily.test.js` | TDD for sizeOnly merge, target scoring, dailyType, dateSeed, deterministic board. | Create |
| `src/daily.js` | Pure Daily meta: `DailyState` (date key, retriesUsed, stars), rollover, `dailyBoard(dateStr, rng)`. No DOM/ads. UMD → `SG.Daily`. | Create |
| `src/palette.js` | Add `SIZE_PALETTE` (size→color, classic-2048 neon) + `sizeColor(size)`. | Modify |
| `src/grid-render.js` | Support `n`-sized board + size-based color (daily) + target pop FX. | Modify |
| `src/index.html` | DAILY menu entry, 4×4 daily screen, daily game-over modal, exhausted countdown, ad + leaderboard wiring. | Modify |

**Core option contract (locked here, used everywhere downstream):**
```js
// Tile: { color, size }  (daily: color is cosmetic = sizeColorIndex; merge ignores it)
// applyMove(grid, dir, rng, opts)
//   opts.n          board size (default 8)
//   opts.mergeRule  'colorAndSize' (default) | 'sizeOnly'
//   opts.targets    [] (default) | e.g. [{size:1024, stars:1, remove:false},
//                                        {size:2048, stars:5, remove:true}]
//   opts.bias, opts.clampThreshold, opts.colors  (spawn; main game only)
// applyMove return adds:  starsGained:number, completed:[{at,size,stars,removed}]
```

---

## Task 1: Make `slideLine` size-agnostic (regression-safe)

`slideLine` currently pads to constant `N=8` and `sameLine` guards on `N`. A line already carries its own length, so use `input.length`. This unlocks 4×4 with zero call-site changes and keeps 8×8 identical.

**Files:**
- Modify: `src/neon-drift.js:13-49`
- Test: `test/neon-drift.test.js` (add 4-length cases), existing tests must pass

- [ ] **Step 1: Add failing tests for variable-length slide**

Append to `test/neon-drift.test.js`:
```js
test('slideLine: length-4 line compacts and merges', () => {
  const r = ND.slideLine([ {color:0,size:1}, {color:0,size:1}, null, null ]);
  assert.strictEqual(r.line.length, 4);
  assert.deepStrictEqual(r.line[0], { color:0, size:2 });
  assert.strictEqual(r.line[1], null);
  assert.strictEqual(r.merges.length, 1);
  assert.strictEqual(r.moved, true);
});

test('slideLine: length-4 no-op keeps moved false', () => {
  const r = ND.slideLine([ {color:0,size:2}, {color:1,size:1}, null, null ]);
  assert.strictEqual(r.line.length, 4);
  assert.strictEqual(r.moved, false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test`
Expected: FAIL — length-4 line returns length-8 (padded to 8), `r.line.length` assertion fails.

- [ ] **Step 3: Make slideLine + sameLine use line length**

In `src/neon-drift.js`, replace `sameLine` (lines 13-24) and `slideLine` (lines 28-49):
```js
  // Cell-wise equality of two equal-length lines.
  function sameLine(a, b) {
    if (a.length !== b.length) {
      throw new Error('sameLine: lines must be equal length');
    }
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (x == null && y == null) continue;
      if (x == null || y == null) return false;
      if (x.color !== y.color || x.size !== y.size) return false;
    }
    return true;
  }

  // Slide a line left, merging adjacent same-size pairs. Pads back to input length.
  // mergeRule: 'colorAndSize' (default) requires same color too; 'sizeOnly' ignores color.
  // Returns { line, merges: [{index, size}], moved }.
  function slideLine(input, mergeRule) {
    const len = input.length;
    const tiles = input.filter(t => t != null);
    const out = [];
    const merges = [];
    let i = 0;
    while (i < tiles.length) {
      const a = tiles[i], b = tiles[i + 1];
      const sizeMatch = b && a.size === b.size;
      const colorMatch = b && a.color === b.color;
      const canMerge = sizeMatch && (mergeRule === 'sizeOnly' ? true : colorMatch);
      if (i + 1 < tiles.length && canMerge) {
        const size = a.size * 2;
        out.push({ color: a.color, size });
        merges.push({ index: out.length - 1, size });
        i += 2;                       // consume pair → no re-merge this push
      } else {
        out.push({ color: a.color, size: a.size });
        i += 1;
      }
    }
    while (out.length < len) out.push(null);
    const moved = !sameLine(out, input);
    return { line: out, merges, moved };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test`
Expected: PASS — new length-4 tests pass AND all existing 33 tests still pass (length-8 lines pad to 8 as before; `slideLine` called with no mergeRule → defaults to colorAndSize since `mergeRule !== 'sizeOnly'`).

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.test.js
git commit -m "refactor(core): size-agnostic slideLine + mergeRule option (non-breaking)"
```

---

## Task 2: Generalize `applyMove`/`invMap`/`readLine`/`emptyGrid` to board size `n`

Thread an `n` parameter (default 8) through the grid helpers and `applyMove`. Forward `mergeRule` to `slideLine`. Add `targets` processing (star scoring + optional removal). Keep main game (no opts.n, no mergeRule, no targets) byte-identical.

**Files:**
- Modify: `src/neon-drift.js:138-211`
- Test: `test/daily.test.js` (create)

- [ ] **Step 1: Create failing daily core tests**

Create `test/daily.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ND = require('../src/neon-drift');

// 4x4 grid helper (sizeOnly: color irrelevant, use 0)
function g4(rows) {
  const g = Array.from({ length: 4 }, () => Array(4).fill(null));
  rows.forEach((row, r) => row.forEach((s, c) => { if (s) g[r][c] = { color: 0, size: s }; }));
  return g;
}
const RNG = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
const DAILY_OPTS = { n: 4, mergeRule: 'sizeOnly', targets: [
  { size: 1024, stars: 1, remove: false },
  { size: 2048, stars: 5, remove: true },
], spawnFourProb: 0, };

test('daily: sizeOnly merges ignore color', () => {
  // two size-2 tiles, different colors → still merge (classic 2048)
  const g = Array.from({ length: 4 }, () => Array(4).fill(null));
  g[0][0] = { color: 0, size: 2 }; g[0][1] = { color: 3, size: 2 };
  const r = ND.applyMove(g, 'left', RNG, DAILY_OPTS);
  assert.strictEqual(r.grid[0][0].size, 4);
});

test('daily: completing 2048 grants 5 stars and removes the tile', () => {
  const g = g4([[1024, 1024]]);                    // two 1024 → merge to 2048 (target)
  const r = ND.applyMove(g, 'left', RNG, DAILY_OPTS);
  assert.strictEqual(r.starsGained, 5);
  assert.strictEqual(r.completed.length, 1);
  assert.strictEqual(r.completed[0].size, 2048);
  assert.strictEqual(r.completed[0].removed, true);
  // the 2048 cell is empty (removed) before/at spawn handling
  // find any 2048 on the board → none should remain
  let has2048 = false;
  for (const row of r.grid) for (const t of row) if (t && t.size === 2048) has2048 = true;
  assert.strictEqual(has2048, false);
});

test('daily: completing 1024 grants 1 star and tile stays', () => {
  const g = g4([[512, 512]]);                      // two 512 → 1024 (target, stays)
  const r = ND.applyMove(g, 'left', RNG, DAILY_OPTS);
  assert.strictEqual(r.starsGained, 1);
  assert.strictEqual(r.completed[0].size, 1024);
  assert.strictEqual(r.completed[0].removed, false);
  let has1024 = false;
  for (const row of r.grid) for (const t of row) if (t && t.size === 1024) has1024 = true;
  assert.strictEqual(has1024, true);
});

test('daily: non-target merge grants 0 stars', () => {
  const g = g4([[2, 2]]);
  const r = ND.applyMove(g, 'left', RNG, DAILY_OPTS);
  assert.strictEqual(r.starsGained, 0);
  assert.strictEqual(r.completed.length, 0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test`
Expected: FAIL — `applyMove` ignores `opts.n` (treats grid as 8×8 via constant N), and has no `starsGained`/`completed`.

- [ ] **Step 3: Generalize grid helpers + applyMove**

In `src/neon-drift.js`, replace `invMap` (138-147), `readLine` (149-154), `emptyGrid` (156-158), and `applyMove` (160-211):
```js
  // Map (line k, packed index j) → original [r,c] per dir, board size n.
  function invMap(dir, k, j, n) {
    switch (dir) {
      case 'left':  return [k, j];
      case 'right': return [k, n - 1 - j];
      case 'up':    return [j, k];
      case 'down':  return [n - 1 - j, k];
      default: throw new Error('bad dir: ' + dir);
    }
  }

  function readLine(grid, dir, k, n) {
    const out = [];
    for (let j = 0; j < n; j++) { const [r, c] = invMap(dir, k, j, n); out.push(grid[r][c]); }
    return out;
  }

  function emptyGrid(n) {
    return Array.from({ length: n }, () => Array(n).fill(null));
  }

  // Full-grid push. opts: { n=8, mergeRule, targets=[], bias, clampThreshold, colors, spawnFourProb }.
  function applyMove(grid, dir, rng, opts) {
    opts = opts || {};
    const n = opts.n || 8;
    const mergeRule = opts.mergeRule || 'colorAndSize';
    const targets = opts.targets || [];
    const next = emptyGrid(n);
    const moves = [];
    const merges = [];
    let chain = 0;
    let scoreGained = 0;
    let moved = false;

    for (let k = 0; k < n; k++) {
      const src = readLine(grid, dir, k, n);
      const res = slideLine(src, mergeRule);
      if (res.moved) moved = true;

      for (let j = 0; j < n; j++) {
        const [r, c] = invMap(dir, k, j, n);
        next[r][c] = res.line[j];
      }

      const srcTiles = [];
      for (let j = 0; j < n; j++) if (src[j] != null) srcTiles.push(j);
      let si = 0;
      for (let outIdx = 0; outIdx < res.line.length && res.line[outIdx] != null; outIdx++) {
        const isMerge = res.merges.some(m => m.index === outIdx);
        const consume = isMerge ? 2 : 1;
        for (let nn = 0; nn < consume; nn++) {
          const fromJ = srcTiles[si++];
          const from = invMap(dir, k, fromJ, n);
          const to = invMap(dir, k, outIdx, n);
          moves.push({ from, to });
        }
      }

      for (const m of res.merges) {
        merges.push({ at: invMap(dir, k, m.index, n), size: m.size });
      }
      chain += res.merges.length;
      for (const m of res.merges) scoreGained += m.size;
    }

    scoreGained *= chainMultiplier(chain);

    // Target blocks (daily): score stars; optionally remove completed tile.
    let starsGained = 0;
    const completed = [];
    for (const m of merges) {
      const tgt = targets.find(t => t.size === m.size);
      if (tgt) {
        starsGained += tgt.stars;
        completed.push({ at: m.at, size: m.size, stars: tgt.stars, removed: !!tgt.remove });
        if (tgt.remove) next[m.at[0]][m.at[1]] = null;
      }
    }

    const won = checkWin(next);

    let spawned = null;
    if (moved && !won) {
      const s = spawnTile(next, rng, opts);
      if (s) { next[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; spawned = s; }
    }

    return { grid: next, moves, merges, chain, scoreGained, moved, won, spawned, starsGained, completed };
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test`
Expected: PASS — the 4 new daily tests pass AND all 33 existing tests pass (they call `applyMove` with main opts: no `n` → 8, no `mergeRule` → colorAndSize, no `targets` → [], so `starsGained=0`/`completed=[]` are extra fields that don't affect existing assertions).

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/daily.test.js
git commit -m "feat(core): applyMove board-size n + sizeOnly merge + target star scoring"
```

---

## Task 3: `spawnTile` daily mode (size 2/4 by probability, no color bias)

Daily spawns a `2` (or `4` with `spawnFourProb`) at a random empty cell — not a size-1 color-biased tile. Extend `spawnTile` to honor `opts.spawnFourProb` and a daily flag, while main game (no `spawnFourProb`) is unchanged.

**Files:**
- Modify: `src/neon-drift.js:116-136`
- Test: `test/daily.test.js`

- [ ] **Step 1: Add failing test**

Append to `test/daily.test.js`:
```js
test('daily: spawnTile yields size 2 or 4 (per spawnFourProb), color from size', () => {
  const g = Array.from({ length: 4 }, () => Array(4).fill(null));
  // spawnFourProb 0 → always 2
  const s2 = ND.spawnTile(g, RNG, { n: 4, daily: true, spawnFourProb: 0 });
  assert.strictEqual(s2.size, 2);
  // spawnFourProb 1 → always 4
  const s4 = ND.spawnTile(g, RNG, { n: 4, daily: true, spawnFourProb: 1 });
  assert.strictEqual(s4.size, 4);
  // empty grid → spawns somewhere valid
  assert.ok(s2.at[0] >= 0 && s2.at[0] < 4);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test`
Expected: FAIL — `spawnTile` returns `size: 1` always (ignores `daily`/`spawnFourProb`).

- [ ] **Step 3: Extend spawnTile**

In `src/neon-drift.js`, replace `spawnTile` (116-136):
```js
  // Spawn one tile at a random empty cell. opts:
  //   main:  { bias, clampThreshold, colors }      → size-1, color-biased
  //   daily: { daily:true, spawnFourProb }         → size 2 or 4 (classic 2048)
  function spawnTile(grid, rng, opts) {
    const empties = emptyCells(grid);
    if (empties.length === 0) return null;
    const at = empties[Math.floor(rng() * empties.length)];

    if (opts && opts.daily) {
      const size = rng() < (opts.spawnFourProb || 0) ? 4 : 2;
      return { at, color: 0, size };   // color cosmetic; renderer derives from size
    }

    const { bias, clampThreshold, colors } = opts;
    const { majority, distinct } = colorStats(grid);
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

- [ ] **Step 4: Run to verify pass**

Run: `node --test`
Expected: PASS — daily spawn test passes; existing main-game spawn tests (14, 14b, 15) unchanged (no `daily` flag → original path).

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/daily.test.js
git commit -m "feat(core): spawnTile daily mode (size 2/4 by spawnFourProb)"
```

---

## Task 4: `dateSeed` + `dailyType` (pure, deterministic)

`dateSeed(str)` hashes a UTC date string to a uint32 seed (port of SameGame pattern). `dailyType(dayOfWeek)` returns the day's config (§3 of spec).

**Files:**
- Modify: `src/neon-drift.js` (add before final `return {...}`)
- Test: `test/daily.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/daily.test.js`:
```js
test('dateSeed deterministic + distinct per date', () => {
  assert.strictEqual(ND.dateSeed('2026-06-12'), ND.dateSeed('2026-06-12'));
  assert.notStrictEqual(ND.dateSeed('2026-06-12'), ND.dateSeed('2026-06-13'));
  assert.ok(Number.isInteger(ND.dateSeed('2026-06-12')));
});

test('dailyType returns 7 configs Mon..Sun with expected labels', () => {
  const labels = [0,1,2,3,4,5,6].map(d => ND.dailyType(d).label);
  assert.deepStrictEqual(labels, ['WARMUP','STEADY','SEEDED','SCARCE','FLOOD','HIGHROLL','GAUNTLET']);
  const tue = ND.dailyType(1);
  assert.strictEqual(tue.spawnFourProb, 0.20);
  assert.ok(Array.isArray(tue.startTiles));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test`
Expected: FAIL — `ND.dateSeed is not a function`.

- [ ] **Step 3: Implement dateSeed + dailyType**

In `src/neon-drift.js`, add before the final `return {`:
```js
  // Hash a date string ("YYYY-MM-DD") → uint32 seed (xfnv1a-style). Deterministic.
  function dateSeed(dateStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < dateStr.length; i++) {
      h ^= dateStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Daily difficulty by UTC day-of-week (0=Mon..6=Sun). Pure. See spec §3.
  // startTiles: tiles preset on the board; spawnFourProb: chance a spawn is 4.
  function dailyType(dayOfWeek) {
    const TYPES = [
      { label: 'WARMUP',   startTiles: [{ size: 2, count: 2 }],               spawnFourProb: 0.10 },
      { label: 'STEADY',   startTiles: [{ size: 2, count: 2 }],               spawnFourProb: 0.20 },
      { label: 'SEEDED',   startTiles: [{ size: 4, count: 1 }, { size: 8, count: 1 }], spawnFourProb: 0.15 },
      { label: 'SCARCE',   startTiles: [{ size: 2, count: 1 }],               spawnFourProb: 0.05 },
      { label: 'FLOOD',    startTiles: [{ size: 2, count: 6 }],               spawnFourProb: 0.20 },
      { label: 'HIGHROLL', startTiles: [{ size: 4, count: 2 }],               spawnFourProb: 0.30 },
      { label: 'GAUNTLET', startTiles: [{ size: 8, count: 1 }, { size: 16, count: 1 }], spawnFourProb: 0.12 },
    ];
    return TYPES[((dayOfWeek % 7) + 7) % 7];
  }
```
Add `dateSeed, dailyType` to the returned object's exports.

- [ ] **Step 4: Run to verify pass**

Run: `node --test`
Expected: PASS — dateSeed + dailyType tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/daily.test.js
git commit -m "feat(core): dateSeed + dailyType (7 weekday configs)"
```

---

## Task 5: `daily.js` — deterministic board builder + DailyState

A new pure module. `dailyBoard(dateStr, dayOfWeek, rng)` builds the 4×4 start board from the day's `startTiles`, placed deterministically via injected rng (seeded from dateSeed by the caller). `DailyState` tracks date/retries/stars with localStorage-free pure logic (persistence injected as a simple store object so it's testable).

**Files:**
- Create: `src/daily.js`
- Test: `test/daily.test.js`

- [ ] **Step 1: Add failing tests**

Append to `test/daily.test.js`:
```js
const Daily = require('../src/daily');

test('dailyBoard: deterministic, places the type start tiles on 4x4', () => {
  const seed = ND.dateSeed('2026-06-12');
  const mkRng = () => { let s = seed; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s>>>15, 1|s); t = (t + Math.imul(t ^ t>>>7, 61|t)) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; };
  const a = Daily.dailyBoard('2026-06-12', 1, mkRng());   // Tue STEADY: two size-2
  const b = Daily.dailyBoard('2026-06-12', 1, mkRng());
  assert.deepStrictEqual(a, b);                            // deterministic
  let count = 0; for (const row of a) for (const t of row) if (t) count++;
  assert.strictEqual(count, 2);
  assert.strictEqual(a.length, 4);
});

test('DailyState: retries cap at 5, stars accumulate, date rollover resets', () => {
  const store = {};
  const ds = Daily.loadDaily('2026-06-12', store);
  assert.strictEqual(ds.stars, 0);
  assert.strictEqual(ds.retriesUsed, 0);
  Daily.addStars(ds, 4, store); assert.strictEqual(ds.stars, 4);
  assert.strictEqual(Daily.canRetry(ds), true);
  for (let i = 0; i < 5; i++) Daily.useRetry(ds, store);
  assert.strictEqual(ds.retriesUsed, 5);
  assert.strictEqual(Daily.canRetry(ds), false);
  // rollover: new date → fresh
  const ds2 = Daily.loadDaily('2026-06-13', store);
  assert.strictEqual(ds2.stars, 0);
  assert.strictEqual(ds2.retriesUsed, 0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test`
Expected: FAIL — `Cannot find module '../src/daily'`.

- [ ] **Step 3: Create daily.js**

Create `src/daily.js`:
```js
/* daily.js — Daily Mode pure meta logic. Zero DOM/ads.
   UMD: module.exports for tests, SG.Daily in browser.
   Depends on SG.ND (dailyType) in browser; in node, requires ../neon-drift. */
(function (root, factory) {
  const ND = (typeof require === 'function') ? require('./neon-drift') : (root.SG && root.SG.ND);
  const api = factory(ND);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.Daily = api; }
})(typeof self !== 'undefined' ? self : this, function (ND) {
  'use strict';

  const N = 4;
  const MAX_RETRIES = 5;

  // Build the 4x4 starting board for a date+weekday. Pure (rng injected).
  function dailyBoard(dateStr, dayOfWeek, rng) {
    const type = ND.dailyType(dayOfWeek);
    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    const place = (size) => {
      let guard = 0;
      while (guard++ < 1000) {
        const r = Math.floor(rng() * N), c = Math.floor(rng() * N);
        if (!grid[r][c]) { grid[r][c] = { color: 0, size }; return; }
      }
    };
    for (const st of type.startTiles) for (let i = 0; i < st.count; i++) place(st.size);
    return grid;
  }

  // ── DailyState (persistence injected as a plain object store) ──────
  // store is e.g. localStorage-like { getItem, setItem } OR a plain {} map.
  function _key(dateStr) { return 'neondrift_daily_' + dateStr; }
  function _read(store, k) {
    if (store && typeof store.getItem === 'function') { try { return JSON.parse(store.getItem(k)); } catch (_) { return null; } }
    return store && store[k] ? (typeof store[k] === 'string' ? JSON.parse(store[k]) : store[k]) : null;
  }
  function _write(store, k, v) {
    const s = JSON.stringify(v);
    if (store && typeof store.setItem === 'function') { try { store.setItem(k, s); } catch (_) {} }
    else if (store) { store[k] = s; }
  }

  function loadDaily(dateStr, store) {
    const existing = _read(store, _key(dateStr));
    if (existing && existing.date === dateStr) return existing;
    const fresh = { date: dateStr, retriesUsed: 0, stars: 0, bestRun: 0 };
    _write(store, _key(dateStr), fresh);
    return fresh;
  }
  function addStars(ds, n, store) { ds.stars += n; _write(store, _key(ds.date), ds); return ds.stars; }
  function setBestRun(ds, runStars, store) { if (runStars > ds.bestRun) { ds.bestRun = runStars; _write(store, _key(ds.date), ds); } }
  function canRetry(ds) { return ds.retriesUsed < MAX_RETRIES; }
  function useRetry(ds, store) { if (canRetry(ds)) { ds.retriesUsed++; _write(store, _key(ds.date), ds); } return ds.retriesUsed; }
  function retriesLeft(ds) { return MAX_RETRIES - ds.retriesUsed; }

  return { N, MAX_RETRIES, dailyBoard, loadDaily, addStars, setBestRun, canRetry, useRetry, retriesLeft };
});
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test`
Expected: PASS — dailyBoard determinism + DailyState tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/daily.js test/daily.test.js
git commit -m "feat: daily.js — deterministic board + DailyState (retries/stars/rollover)"
```

---

## Task 6: `palette.js` — SIZE_PALETTE (classic-2048 neon, size→color)

**Files:**
- Modify: `src/palette.js`

- [ ] **Step 1: Add SIZE_PALETTE + sizeColor**

In `src/palette.js`, before the `global.SG.COLOR_PALETTE = ...` exports, add:
```js
  // Classic-2048 neon palette by tile size (display only; daily merges by size).
  // {fill, glow} per size; sizes not listed fall back to the highest defined.
  const SIZE_PALETTE = {
    2:    { fill: '#3a4a63', glow: '#5a7aa3' },
    4:    { fill: '#4a6b8a', glow: '#6aa3d0' },
    8:    { fill: '#e8c060', glow: '#ffd060' },
    16:   { fill: '#e8a040', glow: '#ffb040' },
    32:   { fill: '#e88040', glow: '#ff9030' },
    64:   { fill: '#e86030', glow: '#ff7020' },
    128:  { fill: '#e84840', glow: '#ff5840' },
    256:  { fill: '#e83850', glow: '#ff4060' },
    512:  { fill: '#e02858', glow: '#ff3070' },
    1024: { fill: '#ff2050', glow: '#ff0040' },   // star source — strong red glow
    2048: { fill: '#ffffff', glow: '#00f5c8' },   // white-hot celebration
  };
  function sizeColor(size) {
    if (SIZE_PALETTE[size]) return SIZE_PALETTE[size];
    // above 2048 (shouldn't happen — 2048 removed) → reuse 2048
    return SIZE_PALETTE[2048];
  }
```
Add to exports:
```js
  global.SG.SIZE_PALETTE = SIZE_PALETTE;
  global.SG.sizeColor = sizeColor;
```

- [ ] **Step 2: Syntax check**

Run: `node --check src/palette.js`
Expected: no output (OK).

- [ ] **Step 3: Commit**

```bash
git add src/palette.js
git commit -m "feat: SIZE_PALETTE (classic-2048 neon, size→color) for daily"
```

---

## Task 7: `grid-render.js` — n-sized board + size-based color + number labels

The renderer currently assumes `N=8` and colors by `tile.color`. Add a render mode: when constructed/told it's daily, use board size `n=4`, color tiles by `sizeColor(tile.size)`, and always draw the size number (classic 2048 shows numbers). Target pop FX already exists (merge FX); ensure 2048 removal triggers the strong flash (reuse existing size-scaled FX — size 2048 → step is large → already strong).

**Files:**
- Modify: `src/grid-render.js`

- [ ] **Step 1: Read current Renderer constructor + drawTile + drawGrid**

Run: Read `src/grid-render.js` lines 19-90 (constructor, resize, cellXY, drawTile, drawGrid). Note `N` constant at top and `drawTile` using `COLOR_PALETTE[tile.color]`.

- [ ] **Step 2: Add board-size + color-mode support**

In `src/grid-render.js`:
- Near the top where `const N = 8;` is declared, change usage so the Renderer holds `this.n`. Add to constructor (after `this.canvas = canvas;`):
```js
      this.n = 8;                 // board size; setMode('daily') → 4
      this.colorBySize = false;   // daily: color tiles by size, draw numbers
```
- Add a method after `resize()`:
```js
    setMode(mode) {
      if (mode === 'daily') { this.n = 4; this.colorBySize = true; }
      else { this.n = 8; this.colorBySize = false; }
      this.resize();
    }
```
- In `resize()`, replace the `N` used for `this.cell` computation with `this.n`:
  change `this.cell = (size - this.pad * 2) / N;` → `this.cell = (size - this.pad * 2) / this.n;`
- In `cellXY`, `drawGrid`, `_drawBoard`, and the tween loop in `tick`, replace every `N` (the board-dimension loops `for (let r = 0; r < N; ...)`) with `this.n`. (Leave any non-board constant alone — there are none; all `N` here are board size.)
- In `drawTile`, replace the palette lookup:
  ```js
      const pal = COLOR_PALETTE[tile.color] || COLOR_PALETTE[0];
  ```
  with:
  ```js
      const pal = this.colorBySize
        ? (global.SG.sizeColor ? global.SG.sizeColor(tile.size) : (COLOR_PALETTE[tile.color] || COLOR_PALETTE[0]))
        : (COLOR_PALETTE[tile.color] || COLOR_PALETTE[0]);
  ```
- In `drawTile`, the size-number overlay is currently gated by `DEV`. Add: also draw the number when `this.colorBySize` (daily always shows numbers). Change the `if (DEV) {` block condition to `if (DEV || this.colorBySize) {` and, when daily, use a readable label color (white) and the actual tile value:
  ```js
      if (DEV || this.colorBySize) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.colorBySize ? '#0a0e16' : '#6b7299';
        ctx.font = `bold ${Math.round(this.cell * (this.colorBySize ? 0.30 : 0.28))}px 'Rajdhani','Share Tech Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.size), cx, cy);
      }
  ```

- [ ] **Step 3: Syntax check**

Run: `node --check src/grid-render.js`
Expected: no output (OK).

- [ ] **Step 4: Commit**

```bash
git add src/grid-render.js
git commit -m "feat(render): daily mode — 4x4 board, size-based color, number labels"
```

---

## Task 8: `index.html` — script includes + DAILY menu entry

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: Add daily.js script include**

In `src/index.html`, in the game-modules block (after `grid-render.js`), add:
```html
<script src="daily.js"></script>
```

- [ ] **Step 2: Add DAILY button to START overlay**

In the START overlay panel, BEFORE the START button, add:
```html
    <button class="btn-primary modal-btn" id="btn-daily" data-action="daily" onclick="openDaily()">DAILY</button>
```
Keep the existing START button but change it to `btn-secondary` (Daily is the headline CTA):
- Change `<button class="btn-primary modal-btn" data-action="start" onclick="startGame()">START</button>`
  to `<button class="btn-secondary modal-btn" data-action="start" onclick="startGame()">START</button>`

- [ ] **Step 3: Add daily game-over overlay markup**

After the `#ol-gameover` overlay, add a daily-specific overlay:
```html
<!-- Daily game-over -->
<div id="ol-daily-over" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title">GAME OVER</div>
    <div class="ol-label">THIS RUN <span id="daily-run-stars">⭐0</span></div>
    <div class="ol-score" id="daily-total-stars">⭐0</div>
    <div class="ol-label">TODAY TOTAL · RETRIES <span id="daily-retries">5/5</span></div>
    <button class="btn-primary modal-btn" id="btn-daily-retry" data-action="retry" onclick="dailyRetry()">RETRY (AD)</button>
    <button class="btn-secondary modal-btn" data-action="menu" onclick="dailyToMenu()">MENU</button>
    <div class="modal-hint">↑↓ Move · Enter Select</div>
  </div>
</div>
```

- [ ] **Step 4: Syntax check (inline script unaffected; structural)**

Run: `node --check src/grid-render.js && node --check src/daily.js && node --check src/neon-drift.js && node --check src/palette.js`
Expected: all OK (index.html structure validated in browser in Task 10).

- [ ] **Step 5: Commit**

```bash
git add src/index.html
git commit -m "feat(ui): DAILY menu entry + daily game-over overlay markup"
```

---

## Task 9: `index.html` — daily mode controller (state, run loop, ads, leaderboard)

Wire the daily flow into the shell. Reuses `renderer`, the d-pad input, modal nav, and `SG.ND`/`SG.Daily`. Adds daily-specific state and functions.

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: Add daily state + helpers in the inline script**

In `src/index.html` inline script, after the existing game state vars, add:
```js
// ── Daily mode state ──────────────────────────────────────────────
let dailyMode = false;
let dailyState = null;     // SG.Daily DailyState
let dailyRunStars = 0;     // stars in the current run
let dailyType = null;      // today's type config
let dailyOpts = null;      // applyMove opts for daily

function utcDateStr() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0');
}
function utcDayOfWeek() {
  // JS getUTCDay: 0=Sun..6=Sat → convert to 0=Mon..6=Sun
  const js = new Date().getUTCDay();
  return (js + 6) % 7;
}
function dailySeededRng(dateStr) {
  let s = SG.ND.dateSeed(dateStr) | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 2: Add daily run lifecycle functions**

Add these functions in the inline script:
```js
function openDaily() {
  const date = utcDateStr();
  dailyState = SG.Daily.loadDaily(date, window.localStorage);
  if (!SG.Daily.canRetry(dailyState) && dailyState.retriesUsed >= SG.Daily.MAX_RETRIES) {
    // Exhausted → stay on menu with countdown (handled by refreshDailyMenu); do not start.
    refreshDailyMenu();
    return;
  }
  startDailyRun();
}

function startDailyRun() {
  const date = utcDateStr();
  const dow = utcDayOfWeek();
  dailyType = SG.ND.dailyType(dow);
  dailyOpts = {
    n: 4, mergeRule: 'sizeOnly', daily: true,
    spawnFourProb: dailyType.spawnFourProb,
    targets: [ { size: 1024, stars: 1, remove: false }, { size: 2048, stars: 5, remove: true } ],
  };
  rng = dailySeededRng(date);                 // deterministic per day
  grid = SG.Daily.dailyBoard(date, dow, rng); // board first (consumes rng deterministically)
  dailyMode = true; gameRunning = true; dailyRunStars = 0;
  document.getElementById('ol-start').classList.add('hidden');
  document.getElementById('ol-daily-over').classList.add('hidden');
  closeModalNav();
  renderer.setMode('daily');
  renderer.drawGrid(grid);
  updateDailyHud();
  try { SG.CG.gameplayStart(); } catch (_) {}
}

function updateDailyHud() {
  document.getElementById('game-title').textContent = 'DAILY · ' + (dailyType ? dailyType.label : '');
  document.getElementById('stat-score').textContent = '⭐' + dailyRunStars;
  document.getElementById('stat-best').textContent = '⭐' + (dailyState ? dailyState.stars : 0);
  document.getElementById('stat-chain').textContent = 'R' + (dailyState ? SG.Daily.retriesLeft(dailyState) : 0);
}

async function dailyGameOver() {
  gameRunning = false;
  try { SG.CG.gameplayStop(); } catch (_) {}
  SG.Daily.addStars(dailyState, dailyRunStars, window.localStorage);
  SG.Daily.setBestRun(dailyState, dailyRunStars, window.localStorage);
  // submit cumulative daily stars to the daily leaderboard (non-blocking)
  try { if (SG.PG.isAvailable()) await SG.PG.leaderboard.submit(dailyState.stars); } catch (_) {}
  document.getElementById('daily-run-stars').textContent = '⭐' + dailyRunStars;
  document.getElementById('daily-total-stars').textContent = '⭐' + dailyState.stars;
  document.getElementById('daily-retries').textContent = SG.Daily.retriesLeft(dailyState) + '/' + SG.Daily.MAX_RETRIES;
  const retryBtn = document.getElementById('btn-daily-retry');
  retryBtn.style.display = SG.Daily.canRetry(dailyState) ? '' : 'none';
  document.getElementById('ol-daily-over').classList.remove('hidden');
  openModalNav('ol-daily-over');
}

async function dailyRetry() {
  if (!SG.Daily.canRetry(dailyState)) return;
  closeModalNav();
  document.getElementById('ol-daily-over').classList.add('hidden');
  let granted = true;
  try { const res = await SG.CG.requestRewardedAd('daily_retry'); granted = !res || res.granted !== false; } catch (_) { granted = false; }
  if (!granted) { document.getElementById('ol-daily-over').classList.remove('hidden'); openModalNav('ol-daily-over'); return; }
  SG.Daily.useRetry(dailyState, window.localStorage);
  startDailyRun();
}

function dailyToMenu() {
  closeModalNav();
  document.getElementById('ol-daily-over').classList.add('hidden');
  dailyMode = false;
  try { SG.CG.requestMidgameAd(); } catch (_) {}   // interstitial on exit (throttled by SDK)
  renderer.setMode('main');
  showStart();
  refreshDailyMenu();
}

function refreshDailyMenu() {
  const date = utcDateStr();
  const ds = SG.Daily.loadDaily(date, window.localStorage);
  const dow = utcDayOfWeek();
  const t = SG.ND.dailyType(dow);
  const btn = document.getElementById('btn-daily');
  if (!btn) return;
  if (ds.retriesUsed >= SG.Daily.MAX_RETRIES) {
    btn.disabled = true;
    btn.textContent = 'NEXT DAILY ' + msToNextUtcMidnight();
  } else {
    btn.disabled = false;
    btn.textContent = 'DAILY · ' + t.label + '  ⭐' + ds.stars + '  R' + SG.Daily.retriesLeft(ds);
  }
}
function msToNextUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  let s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
  const h = String(Math.floor(s/3600)).padStart(2,'0'); s %= 3600;
  const m = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0');
  return h + ':' + m + ':' + ss;
}
```

- [ ] **Step 3: Route doMove / game-over through daily when active**

Find `doMove(dir)` in the inline script. After computing `result = ND.applyMove(...)`, the function branches on main vs daily. Modify `doMove` so that in daily mode it uses `dailyOpts` and accrues stars + uses daily game-over. Locate the line `const opts = ND.difficulty(level);` and the `applyMove` call, and replace the opening of `doMove` body (the gate + opts + applyMove + result handling) with a daily-aware version:
```js
function doMove(dir) {
  flashDirBtn(dir);
  if (!gameRunning || isAnimating) return;
  flashBoardEdge(dir);
  const opts = dailyMode
    ? dailyOpts
    : (function(){ const d = ND.difficulty(level); return { bias:d.bias, clampThreshold:d.clampThreshold, colors:d.colors }; })();
  const before = ND.cloneGrid(grid);
  const result = ND.applyMove(grid, dir, rng, opts);
  if (!result.moved) return;
  if (!dailyMode) { snapshot = before; undoUsed = false; document.getElementById('btn-undo').disabled = false; }
  grid = result.grid;
  if (dailyMode) {
    dailyRunStars += result.starsGained || 0;
    updateDailyHud();
  } else {
    score += result.scoreGained;
    if (result.chain > maxChain) maxChain = result.chain;
    updateStats(result.chain);
  }
  try {
    if (result.merges.length && SG.Sound && SG.Sound.playMerge) {
      const notes = result.merges.map(function (m) { const t = result.grid[m.at[0]] && result.grid[m.at[0]][m.at[1]]; return { blockType: t ? t.color : 0, size: m.size }; });
      SG.Sound.playMerge(notes);
    }
  } catch (_) {}
  isAnimating = true;
  renderer.animate(before, result, function () {
    isAnimating = false;
    if (dailyMode) {
      if (ND.checkGameOver(grid)) dailyGameOver();
      return;
    }
    if (result.won) { try { if (SG.Sound && SG.Sound.playClear) SG.Sound.playClear(); } catch (_) {} levelUp(); return; }
    if (ND.checkGameOver(grid)) endGame();
  });
}
```
(Replace the ENTIRE existing `doMove` function with the above.)

- [ ] **Step 4: Call refreshDailyMenu on boot + start countdown ticker**

In the boot IIFE, after `openModalNav('ol-start')`, add:
```js
  refreshDailyMenu();
  setInterval(function () { if (!document.getElementById('ol-start').classList.contains('hidden')) refreshDailyMenu(); }, 1000);
```

- [ ] **Step 5: Syntax check inline script**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('src/index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];fs.writeFileSync('./_chk.js',m[m.length-1][1]);" && node --check ./_chk.js && rm -f ./_chk.js && echo OK
```
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/index.html
git commit -m "feat(daily): wire daily controller — run loop, stars, retries, ads, leaderboard, countdown"
```

---

## Task 10: Browser verification (manual + Playwright)

**Files:** none (verification)

- [ ] **Step 1: Serve and drive**

Serve from `src/` (`python -m http.server 8137`). With Playwright (or manually in Chrome at `http://127.0.0.1:8137/?dev`):
- START screen shows DAILY button with today's type label + ⭐ + retries.
- Click DAILY → 4×4 board with classic-2048 colors + numbers; HUD shows "DAILY · <TYPE>", ⭐, R.
- Arrow keys merge by size (two 2s merge regardless of cosmetic color).
- Build to 1024 → ⭐+1 float, tile stays; build to 2048 → ⭐+5, tile pops, strong flash.
- Fill board to game over → daily game-over modal: this-run ⭐, today-total ⭐, retries; RETRY (AD) + MENU; keyboard nav works.
- RETRY → (rewarded ad mock) fresh run, retries decremented.
- After 5 retries → DAILY menu button becomes countdown, disabled; START still works.
- Determinism check: note the start board; reload; same board for the same UTC day.

- [ ] **Step 2: Confirm no console errors + all unit tests green**

Run: `node --test`
Expected: PASS — 33 existing + all new daily tests (≈ 8) green.

- [ ] **Step 3: Standalone integrity**

Run: `powershell -ExecutionPolicy Bypass -File "c:\Users\lkh08\H5-games\scripts\verify-standalone.ps1" H5-PUZZLE-NeonDrift-v1`
Expected: PASS (only known-CDN external-URL warnings).

- [ ] **Step 4: Commit any verification fixes**

```bash
git add -A
git commit -m "fix(daily): address browser verification findings"
```
(Skip if nothing to fix.)

---

## Out of scope (spec §8 — post-playtest tuning)
- 1024 "stays" may overfill 4×4 → may switch to remove/cap after playtest.
- Difficulty numeric values tuned after playtest.
- Daily leaderboard id provisioning on Playgama (placeholder `_HOF_LB_ID` reused until a separate daily id is registered).
- Interstitial frequency tuning per Playgama policy.
