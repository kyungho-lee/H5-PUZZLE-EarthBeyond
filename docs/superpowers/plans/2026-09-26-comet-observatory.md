# Comet Tile · Observatory Cell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two original mechanics to Daily and Endless — a comet tile that must be merged within 6 moves for ×3 points, and an observatory cell that doubles merge points — and fix the Playgama submission zip so theme images actually ship.

**Architecture:** The pure core (`src/neon-drift.js`) gains optional `opts.comet` / `opts.observatory` / `opts.turn` and reports new result fields; with those options absent it behaves exactly as before (pinned by a baseline snapshot test). The shell (`src/index.html`) owns turn counting, observatory placement and tips; the renderer (`src/grid-render.js`) draws the new states. A new Node build script writes the zip with `/` separators.

**Tech Stack:** Vanilla JS (no bundler), Canvas 2D, `node:test` (Node 22), Playwright (existing devDependency) for visual checks, Node `zlib` for the zip writer.

**Spec:** `docs/superpowers/specs/2026-09-26-comet-observatory-design.md`

## Global Constraints

- Branch: `feat/comet-observatory`. Commit after every task.
- Comet defaults: `chance: 0.08`, `ttl: 6`, `minTurn: 5`, `mult: 3`. Observatory multiplier: ×2. Stacked: ×6.
- Score = `Σ(merge size × merge mult) × chainMultiplier(chain)`; Endless = `Σ(merge size × merge mult)` (no chain multiplier, as today).
- Applies to **Daily and Endless only**. Chronicles and main (8×8) must behave exactly as before.
- Daily star targets (64/128/256/512 → 1/2/3/5) unchanged.
- Daily observatory uses its own seeded stream `dailySeededRng(date + ':obs')` so the Daily tile RNG sequence is not consumed by observatory placement.
- Every new i18n key is added to **both** `ko` and `en` packs in the same edit.
- Tip copy — EN: `A comet! Merge it within 6 moves for ×3 points — or it flies away.` / `Observatory — merges that land here score ×2.` KO: `혜성이다! 6번 안에 합치면 점수 ×3 — 놓치면 날아가요.` / `관측소 — 여기서 합치면 점수 ×2.`
- Tip-seen keys: `earthbeyond_tut_comet`, `earthbeyond_tut_observatory`.
- No new runtime dependencies. No new image assets.
- `npm test` runs `node --test test/` (scoped so `TossPOC/`, `scripts/`, `docs/sims/` are never picked up as tests).

## Review Focus

1. **Chronicles inherits Daily options** — `startCollection` builds its options from `buildDailyOpts()` (`src/index.html:2546-2556`). If comet/observatory are added inside `buildDailyOpts`, Chronicles silently gets them. Expect: Chronicles never has comets or an observatory. Pinned in Task 6 Step 1 (assertion in `scripts/cosmic-check.mjs`).
2. **Mode switch leaves a stale observatory** — the renderer persists across modes. Expect: after Daily → Chronicles/main, no observatory is drawn. Pinned in Task 4 (`setMode` clears it) and asserted in Task 6's check script.
3. **Comet on the move it would expire** — a comet merged on its 6th move must score ×3, not vanish first. Expect merge wins. Pinned in Task 3 Step 1 (`merge on the last ttl move still scores`).
4. **Collapse mid-comet** — a 1024 collapse resets the board; the comet and turn counter must reset and the observatory re-seat. Pinned in Task 6's check script (forced collapse path) and Task 3 (no expiry processing when `collapse` fires).
5. **Tile objects shared by reference** — `slideLine` currently rebuilds tiles; after preserving `comet`, a shallow copy would let `ttl -= 1` mutate the pre-move grid used by the tween. Expect the `before` grid unchanged after `applyMove`. Pinned in Task 2 Step 1 (`applyMove does not mutate input grid`).

---

### Task 1: Test harness and baseline snapshot of current core behaviour

**Files:**
- Create: `scripts/nd-baseline.js`
- Create: `test/fixtures/nd-baseline.json` (generated)
- Create: `test/neon-drift.baseline.test.js`
- Modify: `package.json` (`"test"` script)

**Interfaces:**
- Produces: `runScenarios(ND) → Array<{name, seed, steps: Array<{dir, grid, scoreGained, chain, moved, spawned, starsGained, collapse}>}>` exported from `scripts/nd-baseline.js`. Grids are normalised to `[[color,size]|null]`.

- [ ] **Step 1: Write the scenario runner (generates from the CURRENT core, before any change)**

`scripts/nd-baseline.js`:
```js
/* nd-baseline.js — pins neon-drift.js behaviour with options absent.
   Run once BEFORE core changes: node scripts/nd-baseline.js  → writes test/fixtures/nd-baseline.json
   test/neon-drift.baseline.test.js replays the same scenarios and compares. */
'use strict';
const path = require('path');
const fs = require('fs');

function mulberry(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = ['left', 'up', 'right', 'down'];

const SCENARIOS = [
  { name: 'daily', opts: { n: 4, mergeRule: 'sizeOnly', daily: true, spawnFourProb: 0.15, collapseSize: 1024,
      targets: [{ size: 64, stars: 1, remove: false }, { size: 128, stars: 2, remove: false },
                { size: 256, stars: 3, remove: false }, { size: 512, stars: 5, remove: false }] } },
  { name: 'chronicles', opts: { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4,
      collapseSize: 1024, targets: [],
      gradedTiers: [{ maxAtMost: 16, dist: [[1, 8], [2, 2]] }, { maxAtMost: 9999, dist: [[1, 6], [2, 3], [4, 1]] }] } },
  { name: 'main', opts: { n: 8, mergeRule: 'colorAndSize', bias: 0.5, clampThreshold: 2, colors: 2, noColorWin: true } },
];

const norm = (grid) => grid.map(row => row.map(t => (t ? [t.color, t.size] : null)));

function runScenarios(ND) {
  const out = [];
  for (const sc of SCENARIOS) {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = mulberry(seed * 7919);
      const dirRng = mulberry(seed * 104729);
      let grid = ND.emptyGrid(sc.opts.n);
      for (let i = 0; i < 2; i++) {
        const s = ND.spawnTile(grid, rng, sc.opts);
        if (s) grid[s.at[0]][s.at[1]] = { color: s.color, size: s.size };
      }
      const steps = [];
      for (let k = 0; k < 80; k++) {
        const dir = DIRS[Math.floor(dirRng() * 4)];
        const r = ND.applyMove(grid, dir, rng, sc.opts);
        steps.push({ dir, grid: norm(r.grid), scoreGained: r.scoreGained, chain: r.chain, moved: r.moved,
          spawned: r.spawned ? { at: r.spawned.at, color: r.spawned.color, size: r.spawned.size } : null,
          starsGained: r.starsGained, collapse: r.collapse });
        grid = r.grid;
        if (ND.checkGameOver(grid, sc.opts.mergeRule)) break;
      }
      out.push({ name: sc.name, seed, steps });
    }
  }
  return out;
}

module.exports = { runScenarios };

if (require.main === module) {
  const ND = require('../src/neon-drift.js');
  const file = path.join(__dirname, '..', 'test', 'fixtures', 'nd-baseline.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(runScenarios(ND)));
  console.log('wrote', file);
}
```

- [ ] **Step 2: Generate the fixture from the unmodified core**

Run: `node scripts/nd-baseline.js`
Expected: `wrote ...test/fixtures/nd-baseline.json`

- [ ] **Step 3: Write the baseline test**

`test/neon-drift.baseline.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ND = require('../src/neon-drift.js');
const { runScenarios } = require('../scripts/nd-baseline.js');
const baseline = require('./fixtures/nd-baseline.json');

test('core without comet/observatory options matches the pre-change baseline', () => {
  const now = JSON.parse(JSON.stringify(runScenarios(ND)));
  assert.strictEqual(now.length, baseline.length);
  for (let i = 0; i < baseline.length; i++) {
    assert.deepStrictEqual(now[i], baseline[i], `${baseline[i].name} seed ${baseline[i].seed}`);
  }
});
```

- [ ] **Step 4: Scope the test command and run**

In `package.json` change `"test": "node --test"` to `"test": "node --test test/"`.

Run: `npm test`
Expected: 1 test, PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/nd-baseline.js test/fixtures/nd-baseline.json test/neon-drift.baseline.test.js package.json
git commit -m "test: pin neon-drift core behaviour with a baseline snapshot"
```

---

### Task 2: Core — preserve comet state through slides and clones

**Files:**
- Modify: `src/neon-drift.js:29-53` (`slideLine`), `src/neon-drift.js:317-319` (`cloneGrid`), export list at `:363`
- Test: `test/neon-drift.comet.test.js` (create)

**Interfaces:**
- Produces: `ND.copyTile(t) → {color,size[,comet:{ttl}]} | null` (deep copy). `slideLine(...).merges[i].comet: boolean` (true when either input tile was a comet). Merged result tiles never carry `comet`.

- [ ] **Step 1: Write the failing tests**

`test/neon-drift.comet.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ND = require('../src/neon-drift.js');

const T = (size, extra) => Object.assign({ color: 0, size }, extra || {});
const C = (size, ttl) => T(size, { comet: { ttl } });

test('slideLine keeps comet ttl on a tile that only slides', () => {
  const r = ND.slideLine([null, C(2, 4), null, T(8)], 'sizeOnly');
  assert.deepStrictEqual(r.line[0], C(2, 4));
  assert.deepStrictEqual(r.line[1], T(8));
});

test('slideLine merge involving a comet flags the merge and yields a plain tile', () => {
  const r = ND.slideLine([T(2), C(2, 3), null, null], 'sizeOnly');
  assert.deepStrictEqual(r.line[0], T(4));
  assert.strictEqual(r.merges.length, 1);
  assert.strictEqual(r.merges[0].comet, true);
});

test('slideLine merge without a comet is flagged false', () => {
  const r = ND.slideLine([T(2), T(2), null, null], 'sizeOnly');
  assert.strictEqual(r.merges[0].comet, false);
});

test('cloneGrid deep-copies comet state', () => {
  const g = [[C(2, 5), null], [null, T(4)]];
  const c = ND.cloneGrid(g);
  assert.deepStrictEqual(c, g);
  c[0][0].comet.ttl = 1;
  assert.strictEqual(g[0][0].comet.ttl, 5);
});

test('applyMove does not mutate input grid (comet tiles included)', () => {
  const g = ND.emptyGrid(4);
  g[0][3] = C(2, 6);
  g[1][0] = T(4);
  const snap = JSON.stringify(g);
  ND.applyMove(g, 'left', () => 0.5, { n: 4, mergeRule: 'sizeOnly', daily: true, comet: { chance: 0, ttl: 6, minTurn: 0, mult: 3 }, turn: 0 });
  assert.strictEqual(JSON.stringify(g), snap);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/neon-drift.comet.test.js`
Expected: FAIL — `r.line[0]` lacks `comet`, `merges[0].comet` is undefined, and `cloneGrid` drops `comet`.

- [ ] **Step 3: Implement**

In `src/neon-drift.js`, add after `sameLine` (before `slideLine`):
```js
  // Deep copy of one tile, keeping optional comet state. null stays null.
  function copyTile(t) {
    if (!t) return null;
    const out = { color: t.color, size: t.size };
    if (t.comet) out.comet = { ttl: t.comet.ttl };
    return out;
  }
```
In `slideLine` replace the merge/non-merge pushes:
```js
      if (i + 1 < tiles.length && canMerge) {
        const size = a.size * 2;
        out.push({ color: a.color, size });
        merges.push({ index: out.length - 1, size, comet: !!(a.comet || b.comet) });
        i += 2;
      } else {
        out.push(copyTile(a));
        i += 1;
      }
```
Replace `cloneGrid` body:
```js
  function cloneGrid(grid) {
    return grid.map(row => row.map(copyTile));
  }
```
Add `copyTile` to the returned API object on the last line.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS (baseline still identical — `copyTile` of a plain tile equals the old `{color,size}`).

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.comet.test.js
git commit -m "feat(core): tiles keep comet state through slides and clones"
```

---

### Task 3: Core — multipliers, comet expiry, comet spawn, observatory pick

**Files:**
- Modify: `src/neon-drift.js:228-309` (`applyMove`), export list
- Test: `test/neon-drift.comet.test.js` (append)

**Interfaces:**
- Consumes: `copyTile`, `slideLine(...).merges[i].comet` (Task 2).
- Produces:
  - `applyMove` opts: `comet?: {chance, ttl, minTurn, mult}`, `observatory?: [r,c]`, `turn?: number` (completed moves before this one).
  - `applyMove` result adds: `merges[i].mult: number`, `merges[i].points: number`, `merges[i].comet: boolean`, `merges[i].observatory: boolean`, `cometCaught: boolean`, `expired: Array<{at:[r,c], size}>`; `spawned.comet: boolean` when a spawn happened.
  - `ND.pickObservatory(rng, n) → [r, c]`.
  - `ND.hasComet(grid) → boolean`.

- [ ] **Step 1: Write the failing tests** (append to `test/neon-drift.comet.test.js`)

```js
const OPTS = (extra) => Object.assign({ n: 4, mergeRule: 'sizeOnly', daily: true, spawnFourProb: 0 }, extra || {});
const COMET = { chance: 0, ttl: 6, minTurn: 0, mult: 3 };
const fixedRng = (v) => () => v;

test('plain merge: mult 1, points = size', () => {
  const g = ND.emptyGrid(4); g[0][0] = T(2); g[0][1] = T(2);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0 }));
  assert.strictEqual(r.merges[0].mult, 1);
  assert.strictEqual(r.merges[0].points, 4);
  assert.strictEqual(r.scoreGained, 4);
});

test('comet merge scores ×3', () => {
  const g = ND.emptyGrid(4); g[0][0] = T(2); g[0][1] = C(2, 4);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0 }));
  assert.strictEqual(r.merges[0].mult, 3);
  assert.strictEqual(r.scoreGained, 12);
  assert.strictEqual(r.cometCaught, true);
  assert.strictEqual(r.grid[0][0].comet, undefined);
});

test('observatory merge scores ×2 only when the result lands on it', () => {
  const g = ND.emptyGrid(4); g[0][0] = T(2); g[0][1] = T(2); g[2][0] = T(4); g[2][1] = T(4);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ observatory: [0, 0] }));
  const onObs = r.merges.find(m => m.at[0] === 0);
  const offObs = r.merges.find(m => m.at[0] === 2);
  assert.strictEqual(onObs.mult, 2); assert.strictEqual(onObs.observatory, true);
  assert.strictEqual(offObs.mult, 1); assert.strictEqual(offObs.observatory, false);
  // (4*2 + 8*1) * chainMultiplier(2)=2 → 32
  assert.strictEqual(r.scoreGained, 32);
});

test('comet merged on the observatory stacks to ×6, then chain multiplier', () => {
  const g = ND.emptyGrid(4); g[0][0] = C(2, 2); g[0][1] = T(2);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, observatory: [0, 0], turn: 0 }));
  assert.strictEqual(r.merges[0].mult, 6);
  assert.strictEqual(r.scoreGained, 24); // 4*6 * chain(1)=1
});

test('comet ttl decreases once per valid move and expires at 0', () => {
  // comet is size 4 so the spawned 2s (rng 0.99 → last empty cell, size 2) never merge with it
  let g = ND.emptyGrid(4); g[3][3] = C(4, 2); g[0][0] = T(8);
  let r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0 }));
  const c1 = r.grid[3][0];
  assert.strictEqual(c1.comet.ttl, 1);
  assert.deepStrictEqual(r.expired, []);
  // row 3 is now [C4, _, _, 2] → right → [_, _, C4, 2]; ttl hits 0 at [3,2]
  r = ND.applyMove(r.grid, 'right', fixedRng(0.99), OPTS({ comet: COMET, turn: 1 }));
  assert.strictEqual(r.expired.length, 1);
  assert.deepStrictEqual(r.expired[0], { at: [3, 2], size: 4 });
  assert.strictEqual(ND.hasComet(r.grid), false);
});

test('merge on the last ttl move still scores (merge before expiry)', () => {
  const g = ND.emptyGrid(4); g[0][0] = T(2); g[0][3] = C(2, 1);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0 }));
  assert.strictEqual(r.cometCaught, true);
  assert.strictEqual(r.merges[0].mult, 3);
  assert.deepStrictEqual(r.expired, []);
});

test('no move → no ttl change', () => {
  const g = ND.emptyGrid(4); g[0][0] = C(2, 3);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0 }));
  assert.strictEqual(r.moved, false);
  assert.strictEqual(r.grid[0][0].comet.ttl, 3);
});

test('comet spawns when chance hits, turn >= minTurn, none on board', () => {
  const g = ND.emptyGrid(4); g[0][3] = T(2);
  const r = ND.applyMove(g, 'left', fixedRng(0.0), OPTS({ comet: { chance: 0.5, ttl: 6, minTurn: 5, mult: 3 }, turn: 5 }));
  assert.strictEqual(r.spawned.comet, true);
  const [sr, sc] = r.spawned.at;
  assert.deepStrictEqual(r.grid[sr][sc].comet, { ttl: 6 });
});

test('no comet before minTurn', () => {
  const g = ND.emptyGrid(4); g[0][3] = T(2);
  const r = ND.applyMove(g, 'left', fixedRng(0.0), OPTS({ comet: { chance: 1, ttl: 6, minTurn: 5, mult: 3 }, turn: 4 }));
  assert.strictEqual(r.spawned.comet, false);
});

test('at most one comet on the board', () => {
  const g = ND.emptyGrid(4); g[0][3] = T(2); g[3][3] = C(4, 5);
  const r = ND.applyMove(g, 'left', fixedRng(0.0), OPTS({ comet: { chance: 1, ttl: 6, minTurn: 0, mult: 3 }, turn: 9 }));
  assert.strictEqual(r.spawned.comet, false);
  let count = 0;
  for (const row of r.grid) for (const t of row) if (t && t.comet) count++;
  assert.strictEqual(count, 1);
});

test('no expiry processing when a collapse fires', () => {
  const g = ND.emptyGrid(4); g[0][0] = T(512); g[0][1] = T(512); g[3][3] = C(2, 1);
  const r = ND.applyMove(g, 'left', fixedRng(0.99), OPTS({ comet: COMET, turn: 0, collapseSize: 1024 }));
  assert.ok(r.collapse);
  assert.deepStrictEqual(r.expired, []);
  assert.strictEqual(r.spawned, null);
});

test('same seed + same inputs → identical results', () => {
  const mk = () => { let s = 42; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const run = () => {
    const rng = mk(); let g = ND.emptyGrid(4); g[0][0] = T(2); const trace = [];
    const dirs = ['left', 'up', 'right', 'down'];
    for (let k = 0; k < 60; k++) {
      const r = ND.applyMove(g, dirs[k % 4], rng, OPTS({ comet: { chance: 0.3, ttl: 6, minTurn: 2, mult: 3 }, observatory: [1, 2], turn: k }));
      trace.push(JSON.stringify([r.grid, r.scoreGained, r.expired, r.spawned]));
      g = r.grid;
    }
    return trace;
  };
  assert.deepStrictEqual(run(), run());
});

test('pickObservatory returns an in-bounds cell and is deterministic', () => {
  const a = ND.pickObservatory(fixedRng(0.74), 4);
  assert.deepStrictEqual(a, [2, 2]);
  const b = ND.pickObservatory(fixedRng(0.999), 4);
  assert.deepStrictEqual(b, [3, 3]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/neon-drift.comet.test.js`
Expected: FAIL — `mult` undefined, `ND.hasComet`/`ND.pickObservatory` not functions, `expired` undefined.

- [ ] **Step 3: Implement**

Add helpers above `applyMove`:
```js
  function hasComet(grid) {
    for (const row of grid) for (const t of row) if (t && t.comet) return true;
    return false;
  }

  // Observatory cell for an n×n board. Two rng draws: row, then column.
  function pickObservatory(rng, n) {
    return [Math.floor(rng() * n), Math.floor(rng() * n)];
  }
```
In `applyMove`, after `const targets = ...` add:
```js
    const comet = opts.comet || null;
    const obs = opts.observatory || null;
```
Replace the merge collection + score lines (`for (const m of res.merges) { merges.push(...) }` and `for (const m of res.merges) scoreGained += m.size;`) with:
```js
      for (const m of res.merges) {
        const at = invMap(dir, k, m.index, n);
        const onObs = !!(obs && at[0] === obs[0] && at[1] === obs[1]);
        const isComet = !!(comet && m.comet);
        const mult = (isComet ? comet.mult : 1) * (onObs ? 2 : 1);
        const points = m.size * mult;
        merges.push({ at, size: m.size, mult, points, comet: isComet, observatory: onObs });
        scoreGained += points;
      }
      chain += res.merges.length;
```
(keep the existing `chain += res.merges.length;` only once — delete the old line.)

After the collapse block and before `const won = ...`, add:
```js
    // Comet lifetime: one valid move = one turn. Merges already happened above,
    // so a comet merged on its last move scored before it could expire.
    const expired = [];
    if (moved && !collapse) {
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const t = next[r][c];
        if (!t || !t.comet) continue;
        t.comet.ttl -= 1;
        if (t.comet.ttl <= 0) { expired.push({ at: [r, c], size: t.size }); next[r][c] = null; }
      }
    }
```
Replace the spawn block:
```js
    let spawned = null;
    if (moved && !won && !collapse) {
      const s = spawnTile(next, rng, opts);
      if (s) {
        const tile = { color: s.color, size: s.size };
        s.comet = false;
        if (comet && (opts.turn || 0) >= comet.minTurn && !hasComet(next) && rng() < comet.chance) {
          tile.comet = { ttl: comet.ttl };
          s.comet = true;
        }
        next[s.at[0]][s.at[1]] = tile;
        spawned = s;
      }
    }

    const cometCaught = merges.some(m => m.comet);
    return { grid: next, moves, merges, chain, scoreGained, moved, won, spawned, starsGained, completed, collapse, expired, cometCaught };
```
Note `s.comet = false` is only set on the spawn object; the baseline normaliser in Task 1 records only `at/color/size`, so the baseline stays identical. The extra `rng()` call happens only when `comet` is set.

Add `hasComet, pickObservatory` to the exported API.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all PASS, including the Task 1 baseline.

- [ ] **Step 5: Commit**

```bash
git add src/neon-drift.js test/neon-drift.comet.test.js
git commit -m "feat(core): comet ×3 with 6-move lifetime and observatory ×2"
```

---

### Task 4: Renderer — observatory cell, comet tile, merge/expiry FX

**Files:**
- Modify: `src/grid-render.js` — constructor (find `this.pops = new Map()`), `setMode` (`:163-173`), `drawTile` (`:190-264`), `_drawCellBg` (`:268-283`), `_fireMerges` (`:360-408`)

**Interfaces:**
- Consumes: result fields from Task 3 (`merges[i].mult/points/comet/observatory`, `expired`).
- Produces: `renderer.setObservatory(cell: [r,c] | null)`; `renderer.observatory` (read by the check script).

- [ ] **Step 1: Add state and setter**

In the constructor next to `this.pops = new Map();` add:
```js
      this.observatory = null;        // [r,c] | null — Daily/Endless only
      this._obsPulseStart = 0;
```
Add method after `setMode`:
```js
    // Observatory cell (×2 merges). null hides it. Re-seating pulses once.
    setObservatory(cell) {
      this.observatory = cell ? [cell[0], cell[1]] : null;
      this._obsPulseStart = performance.now();
    }
```
In `setMode`, after `this.pops.clear();` add `this.observatory = null;` (every mode start clears it; Daily/Endless set it again afterwards).

- [ ] **Step 2: Draw the observatory in `_drawCellBg`**

Before the final `ctx.restore();` of `_drawCellBg`, add:
```js
      const obs = this.observatory;
      if (obs && obs[0] === r && obs[1] === c) {
        const pulse = Math.max(0, 1 - (performance.now() - this._obsPulseStart) / 700);
        ctx.globalAlpha = 0.55 + 0.45 * pulse;
        ctx.strokeStyle = '#00f5c8';
        ctx.lineWidth = Math.max(1.5, this.cell * 0.035);
        ctx.shadowColor = '#00f5c8';
        ctx.shadowBlur = 10 + 14 * pulse;
        ctx.beginPath();
        ctx.arc(cx, cy, sz * 0.40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.85;
        ctx.font = `${Math.round(this.cell * 0.20)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔭', x + sz * 0.80, y + sz * 0.82);
      }
```

- [ ] **Step 3: Draw comet decorations in `drawTile`**

Right after `ctx.globalAlpha = alpha;` near the top of `drawTile`, add the tail (drawn under the tile body):
```js
      if (tile.comet) {
        const g = ctx.createLinearGradient(x + s, y, x + s * 1.35, y - s * 0.35);
        g.addColorStop(0, 'rgba(255,210,63,0.75)');
        g.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.save();
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.70, y);
        ctx.lineTo(x + s * 1.40, y - s * 0.40);
        ctx.lineTo(x + s, y + s * 0.30);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
```
Just before the final `ctx.restore();` of `drawTile`, add the border and countdown badge:
```js
      if (tile.comet) {
        const t = performance.now();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ffe98a';
        ctx.shadowBlur = 8 + 6 * (0.5 + 0.5 * Math.sin(t / 220));
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = Math.max(2, this.cell * 0.05);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + s, y, x + s, y + s, rad);
        ctx.arcTo(x + s, y + s, x, y + s, rad);
        ctx.arcTo(x, y + s, x, y, rad);
        ctx.arcTo(x, y, x + s, y, rad);
        ctx.stroke();
        ctx.shadowBlur = 0;
        const ttl = tile.comet.ttl;
        const urgent = ttl <= 2;
        const br = this.cell * 0.14;
        const bx = x + br * 0.95, by = y + s - br * 0.95;   // bottom-left
        ctx.globalAlpha = urgent ? (0.55 + 0.45 * (Math.sin(t / 90) > 0 ? 1 : 0)) : 1;
        ctx.fillStyle = urgent ? '#e0314b' : 'rgba(6,8,16,0.88)';
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = Math.max(0.8, br * 0.14); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(br * 1.15)}px 'Rajdhani','Share Tech Mono',monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(ttl), bx, by);
      }
```

- [ ] **Step 4: Multiplier and expiry FX in `_fireMerges`**

Replace the merge float line
`this.floats.push(new global.SG.FloatText(cx, cy, '+' + m.size, pal.fill, fscale));`
with:
```js
        const pts = m.points != null ? m.points : m.size;
        this.floats.push(new global.SG.FloatText(cx, cy, '+' + pts, pal.fill, fscale));
        if (m.mult > 1) {
          const gold = { fill: '#ffd23f', glow: '#ffe98a' };
          const teal = { fill: '#00f5c8', glow: '#7dffe6' };
          const big = m.mult >= 6;
          const label = big ? '×' + m.mult : (m.comet ? '☄️×' + m.mult : '×' + m.mult);
          const col = (m.comet || big) ? gold : teal;
          this.floats.push(new global.SG.FloatText(cx + this.cell * 0.28, cy - this.cell * 0.22, label, col.fill, big ? 2.6 : 1.8));
          this.particles.emit(cx, cy, col, big ? 26 : (m.comet ? 18 : 8));
          if (big) this.flash = { life: 260, maxLife: 260, color: gold.glow, peak: 0.22 };
        }
```
After the `completed` loop at the end of `_fireMerges`, add:
```js
      for (const e of (result.expired || [])) {
        const [cx, cy] = this.cellXY(e.at[0], e.at[1]);
        const gold = { fill: '#ffd23f', glow: '#ffe98a' };
        this.particles.emit(cx, cy, gold, 12);
        this.floats.push(new global.SG.FloatText(cx, cy, '☄️', gold.fill, 1.6));
      }
```
Also, for expiry to show when a move has no merges, check that `_fireMerges` is always called after a tween (it is: `tick` calls it unconditionally when `!firedMerges`).

- [ ] **Step 5: Syntax check and commit**

Run: `node -e "require('vm'); new (require('vm').Script)(require('fs').readFileSync('src/grid-render.js','utf8'))" && npm test`
Expected: no syntax error; tests PASS.

```bash
git add src/grid-render.js
git commit -m "feat(render): observatory cell, comet tile and multiplier FX"
```

---

### Task 5: Shell — wire options, turn counter, observatory seeding, scoring, tips

**Files:**
- Modify: `src/index.html` — state block (`:1305-1315`), `doMove` (`:1441-1498`), `startDailyRun` (`:2011-2062`), `startEndless` (`:2622-2668`), `dailyCollapse` (`:2222-2228`), `endlessCollapse` (`:2678-2685`), `_DTUT_CONTENT.daily` (`:1687-1700`)
- Modify: `src/i18n.js` — `ko.ui.toast` (`:73`) and `en.ui.toast` (`:222`)

**Interfaces:**
- Consumes: `ND.pickObservatory`, result fields (Task 3); `renderer.setObservatory` (Task 4).
- Produces (globals on `window`, used by Task 6's check script): `moveTurn`, `observatoryCell`, `applyCosmicOpts(opts, obsRng)`.

- [ ] **Step 1: i18n keys (both packs)**

In `src/i18n.js` `ko.ui.toast` add:
```js
        cometTip:       '☄️ 혜성이다! 6번 안에 합치면 점수 ×3 — 놓치면 날아가요.',
        observatoryTip: '🔭 관측소 — 여기서 합치면 점수 ×2.',
```
In `en.ui.toast` add:
```js
        cometTip:       '☄️ A comet! Merge it within 6 moves for ×3 points — or it flies away.',
        observatoryTip: '🔭 Observatory — merges that land here score ×2.',
```

- [ ] **Step 2: Shell state and helpers**

After `let dailyTheme = null;` (`:1315`) add:
```js
// ── Comet · Observatory (Daily · Endless only — spec 2026-09-26) ──
const COMET_OPTS = { chance: 0.08, ttl: 6, minTurn: 5, mult: 3 };
var moveTurn = 0;            // valid moves since run start / last collapse
var observatoryCell = null;  // [r,c] | null
let _obsRng = null;          // Daily: dailySeededRng(date+':obs'), Endless: makeRng()

// Adds comet/observatory to a Daily/Endless opts object. NEVER call from
// buildDailyOpts — Chronicles derives its opts from it.
function applyCosmicOpts(opts, obsRng) {
  _obsRng = obsRng;
  moveTurn = 0;
  opts.comet = COMET_OPTS;
  opts.turn = 0;
  observatoryCell = SG.ND.pickObservatory(_obsRng, opts.n || 4);
  opts.observatory = observatoryCell;
  renderer.setObservatory(observatoryCell);
  showCosmicTip('observatory');
}

function reseatObservatory() {
  if (!dailyOpts || !dailyOpts.comet || !_obsRng) return;
  moveTurn = 0;
  dailyOpts.turn = 0;
  observatoryCell = SG.ND.pickObservatory(_obsRng, dailyOpts.n || 4);
  dailyOpts.observatory = observatoryCell;
  renderer.setObservatory(observatoryCell);
}

function showCosmicTip(kind) {
  const key = kind === 'comet' ? 'earthbeyond_tut_comet' : 'earthbeyond_tut_observatory';
  try { if (localStorage.getItem(key) === '1') return; localStorage.setItem(key, '1'); } catch (_) {}
  const msg = SG.i18n ? SG.i18n.t(kind === 'comet' ? 'ui.toast.cometTip' : 'ui.toast.observatoryTip') : '';
  if (msg) showGameToast(msg, 4000);
}
```

- [ ] **Step 3: `doMove` — turn counter, comet tip, Endless points**

In `doMove`, replace
`const result = ND.applyMove(grid, dir, rng, opts);`
with:
```js
  if (opts && opts.comet) opts.turn = moveTurn;
  const result = ND.applyMove(grid, dir, rng, opts);
```
and right after `if (!result.moved) return;` add:
```js
  if (opts && opts.comet) {
    moveTurn++;
    if (result.spawned && result.spawned.comet) showCosmicTip('comet');
  }
```
Replace the Endless score line
`endlessScore += result.merges.reduce(function (acc, m) { return acc + m.size; }, 0);`
with:
```js
        endlessScore += result.merges.reduce(function (acc, m) { return acc + (m.points != null ? m.points : m.size); }, 0);
```

- [ ] **Step 4: Daily start**

In `startDailyRun`, after `renderer.setMode('daily');` (setMode clears the observatory, so seating must come after it) add:
```js
  applyCosmicOpts(dailyOpts, _devDailyAllThemes ? makeRng() : dailySeededRng(date + ':obs'));
```

- [ ] **Step 5: Endless start**

In `startEndless`, after `renderer.setMode('daily', 4);` add:
```js
  applyCosmicOpts(dailyOpts, makeRng());
```

- [ ] **Step 6: Collapse re-seat**

In `dailyCollapse`, after `await _collapseShared(collapseInfo);` add `reseatObservatory();`.
In `endlessCollapse`, after `await _collapseShared(collapseInfo);` add `reseatObservatory();`.

- [ ] **Step 7: Daily tutorial line**

In `_DTUT_CONTENT.daily.en.s0.desc` append:
`<br>☄️ <strong>Comets</strong> give ×3 · 🔭 <strong>Observatory</strong> gives ×2!`
In `_DTUT_CONTENT.daily.ko.s0.desc` append:
`<br>☄️ <strong>혜성</strong> ×3 · 🔭 <strong>관측소</strong> ×2!`

- [ ] **Step 8: Run tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/index.html src/i18n.js
git commit -m "feat(shell): comet and observatory in Daily and Endless"
```

---

### Task 6: Browser check script — mechanics visible, Chronicles untouched

**Files:**
- Create: `scripts/cosmic-check.mjs`

**Interfaces:**
- Consumes: global functions `openDaily()`, `startEndless(skin)`, `startCollection()`, `doMove(dir)`; globals `grid`, `dailyOpts` (top-level `let` — not `window` properties, but reachable by bare name from `page.evaluate` because classic scripts share the global lexical scope), `observatoryCell` (`var`), `renderer` (`var`).

- [ ] **Step 1: Write the check**

`scripts/cosmic-check.mjs`:
```js
/* cosmic-check.mjs — drives the real game: Daily/Endless show an observatory and
   can spawn/expire comets; Chronicles and main never do. Screenshots → scripts/_shots/.
   Run: node scripts/cosmic-check.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/') + '?dev';
const shots = path.resolve(__dirname, '_shots');
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/firebase/i.test(m.text())) errors.push('console.error: ' + m.text()); });
const fail = (msg) => { console.error('FAIL', msg); process.exitCode = 1; };

await page.goto(url);
await page.waitForTimeout(800);

// Daily: observatory seated, comet appears (force chance=1 after minTurn) and expires.
await page.evaluate(() => window.openDaily && window.openDaily());
await page.waitForTimeout(500);
await page.evaluate(() => { const t = document.getElementById('ol-daily-tutorial'); if (t) t.classList.add('hidden'); });
let st = await page.evaluate(() => ({ obs: window.observatoryCell, hasComet: !!dailyOpts.comet }));
if (!st.obs || !st.hasComet) fail('Daily: no observatory/comet opts ' + JSON.stringify(st));
await page.evaluate(() => { dailyOpts.comet = Object.assign({}, dailyOpts.comet, { chance: 1, minTurn: 0 }); });
const dirs = ['left', 'up', 'right', 'down'];
let sawComet = false, sawExpire = false;
for (let i = 0; i < 40 && !(sawComet && sawExpire); i++) {
  const r = await page.evaluate((d) => {
    const before = JSON.stringify(grid);
    window.doMove(d);
    const g = grid;
    let comet = false; for (const row of g) for (const t of row) if (t && t.comet) comet = true;
    return { comet, changed: JSON.stringify(g) !== before };
  }, dirs[i % 4]);
  await page.waitForTimeout(180);
  if (r.comet) sawComet = true;
  if (sawComet && !r.comet) sawExpire = true;
  if (i === 3) await page.screenshot({ path: path.join(shots, 'cosmic-daily.png') });
}
if (!sawComet) fail('Daily: comet never appeared');

// Endless
await page.evaluate(() => { try { localStorage.setItem('sg_dev', '1'); } catch (_) {} });
await page.evaluate(() => window.startEndless && window.startEndless(null));
await page.waitForTimeout(400);
st = await page.evaluate(() => ({ obs: window.observatoryCell, hasComet: !!(dailyOpts && dailyOpts.comet) }));
if (!st.obs || !st.hasComet) console.warn('WARN Endless: locked or not seated (needs a completed chapter) ' + JSON.stringify(st));
else await page.screenshot({ path: path.join(shots, 'cosmic-endless.png') });

// Chronicles must NOT inherit comet/observatory (Review Focus 1, 2)
await page.evaluate(() => window.startCollection && window.startCollection());
await page.waitForTimeout(400);
st = await page.evaluate(() => ({ cometOpt: !!(dailyOpts && dailyOpts.comet), obsOpt: !!(dailyOpts && dailyOpts.observatory), rendererObs: renderer.observatory }));
if (st.cometOpt || st.obsOpt || st.rendererObs) fail('Chronicles inherited cosmic opts ' + JSON.stringify(st));
await page.screenshot({ path: path.join(shots, 'cosmic-chronicles.png') });

if (errors.length) fail('page errors:\n' + errors.join('\n'));
await browser.close();
console.log(process.exitCode ? 'cosmic-check: FAILED' : 'cosmic-check: OK', { sawComet, sawExpire });
```

- [ ] **Step 2: Install devDependencies and run**

Run: `npm install && npx playwright install chromium && node scripts/cosmic-check.mjs`
Expected: `cosmic-check: OK { sawComet: true, sawExpire: true }` (a WARN for Endless is acceptable if no chapter is completed in a fresh profile). `startCollection()` starts the currently active theme (`activeThemeId`, default `primordial-earth`).

- [ ] **Step 3: Look at the screenshots**

Open `scripts/_shots/cosmic-daily.png` and `cosmic-chronicles.png`. Expected: Daily shows the teal observatory ring with 🔭 on one cell; Chronicles shows none.

- [ ] **Step 4: Commit**

```bash
git add scripts/cosmic-check.mjs
git commit -m "test: browser check for comet/observatory and Chronicles isolation"
```

---

### Task 7: Balance simulation and numbers check

**Files:**
- Create: `docs/sims/cosmic_sim.js`
- Create: `docs/balance-report-cosmic.md`

- [ ] **Step 1: Write the simulator**

`docs/sims/cosmic_sim.js`:
```js
/* cosmic_sim.js — Daily with/without comet+observatory, greedy-corner bot.
   Run: node docs/sims/cosmic_sim.js */
'use strict';
const ND = require('../../src/neon-drift.js');
function mulberry(seed) { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const BASE = { n: 4, mergeRule: 'sizeOnly', daily: true, spawnFourProb: 0.15, collapseSize: 1024,
  targets: [{ size: 64, stars: 1 }, { size: 128, stars: 2 }, { size: 256, stars: 3 }, { size: 512, stars: 5 }] };
const COMET = { chance: 0.08, ttl: 6, minTurn: 5, mult: 3 };
const PREF = ['down', 'left', 'right', 'up'];

function play(seed, cosmic) {
  const rng = mulberry(seed);
  const opts = Object.assign({}, BASE);
  if (cosmic) { opts.comet = COMET; opts.observatory = ND.pickObservatory(mulberry(seed ^ 0xabc), 4); }
  let grid = ND.emptyGrid(4);
  for (let i = 0; i < 2; i++) { const s = ND.spawnTile(grid, rng, opts); grid[s.at[0]][s.at[1]] = { color: 0, size: s.size }; }
  let score = 0, stars = 0, moves = 0, spawned = 0, caught = 0, expired = 0;
  for (let guard = 0; guard < 5000; guard++) {
    opts.turn = moves;
    let r = null;
    for (const d of PREF) { const t = ND.applyMove(grid, d, rng, opts); if (t.moved) { r = t; break; } }
    if (!r) break;
    moves++; score += r.scoreGained; stars += r.starsGained;
    if (r.spawned && r.spawned.comet) spawned++;
    if (r.cometCaught) caught++;
    expired += (r.expired || []).length;
    grid = r.grid;
    if (r.collapse) { grid = ND.emptyGrid(4); for (let i = 0; i < 2; i++) { const s = ND.spawnTile(grid, rng, opts); grid[s.at[0]][s.at[1]] = { color: 0, size: s.size }; } }
    if (ND.checkGameOver(grid, 'sizeOnly')) break;
  }
  return { score, stars, moves, spawned, caught, expired };
}

const N = 1000;
for (const cosmic of [false, true]) {
  const agg = { score: 0, stars: 0, moves: 0, spawned: 0, caught: 0, expired: 0 };
  for (let s = 1; s <= N; s++) { const r = play(s, cosmic); for (const k in agg) agg[k] += r[k]; }
  const avg = k => (agg[k] / N).toFixed(2);
  console.log(cosmic ? 'WITH cosmic' : 'BASELINE   ', 'score', avg('score'), 'stars', avg('stars'), 'moves', avg('moves'),
    'comets', avg('spawned'), 'caught', avg('caught'), 'expired', avg('expired'),
    'catchRate', agg.spawned ? (agg.caught / agg.spawned * 100).toFixed(1) + '%' : '-');
}
```

- [ ] **Step 2: Run and record**

Run: `node docs/sims/cosmic_sim.js`
Expected: two lines. Acceptance: comets per run ≥ 2 (reviewers meet one in a few minutes); stars average within ±10% of baseline (targets unchanged); catch rate between 25% and 75% (a real decision, neither free nor hopeless). If a bound is missed, adjust only `COMET_OPTS` (`chance` or `ttl`) in both `src/index.html` and the sim, rerun, and note the change.

- [ ] **Step 3: Write the report**

`docs/balance-report-cosmic.md`: the two output lines verbatim, the acceptance bounds above, and the final `COMET_OPTS` values. Reproduce line: `node docs/sims/cosmic_sim.js`.

- [ ] **Step 4: Commit**

```bash
git add docs/sims/cosmic_sim.js docs/balance-report-cosmic.md src/index.html
git commit -m "docs: comet/observatory balance simulation"
```

---

### Task 8: Submission zip with `/` separators

**Files:**
- Create: `scripts/zip-writer.js`
- Create: `scripts/build-playgama.mjs`
- Create: `test/zip-writer.test.js`
- Modify: `CLAUDE.md:95` (replace the `Compress-Archive` instruction), `package.json` (`"build:playgama"` script, `"version": "1.2.0"`), `.gitignore` (add `build/`)

**Interfaces:**
- Produces: `writeZip(entries: Array<{name: string, data: Buffer}>) → Buffer`, `listZip(buf: Buffer) → string[]` (central-directory names) from `scripts/zip-writer.js` (CommonJS).

- [ ] **Step 1: Write the failing test**

`test/zip-writer.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const { writeZip, listZip } = require('../scripts/zip-writer.js');

test('nested names are stored with forward slashes and read back', () => {
  const buf = writeZip([
    { name: 'index.html', data: Buffer.from('<html></html>') },
    { name: 'themes/solar-system/step-01.webp', data: Buffer.from([1, 2, 3, 4]) },
  ]);
  assert.deepStrictEqual(listZip(buf), ['index.html', 'themes/solar-system/step-01.webp']);
  assert.ok(!buf.includes(Buffer.from('themes\\')));
});

test('backslash names are rejected', () => {
  assert.throws(() => writeZip([{ name: 'themes\\a.webp', data: Buffer.from('x') }]), /backslash/);
});

test('stored data round-trips (deflate)', () => {
  const data = Buffer.from('hello hello hello hello');
  const buf = writeZip([{ name: 'a.txt', data }]);
  // local header: 30 bytes + name; compressed payload follows
  const nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
  const csize = buf.readUInt32LE(18);
  const payload = buf.subarray(30 + nameLen + extraLen, 30 + nameLen + extraLen + csize);
  assert.deepStrictEqual(zlib.inflateRawSync(payload), data);
  assert.strictEqual(buf.readUInt32LE(14), zlib.crc32(data));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/zip-writer.test.js`
Expected: FAIL — `Cannot find module '../scripts/zip-writer.js'`.

- [ ] **Step 3: Implement the writer**

`scripts/zip-writer.js`:
```js
/* zip-writer.js — minimal ZIP (deflate) writer/lister. Names always use '/'.
   Why: PowerShell 5.1 Compress-Archive writes '\' separators; Playgama unpacks on
   Linux, so themes/** never became folders and every theme image 404'd (2026-06-16 build). */
'use strict';
const zlib = require('zlib');

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function writeZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (const e of entries) {
    if (e.name.includes('\\')) throw new Error('zip entry name contains a backslash: ' + e.name);
    const name = Buffer.from(e.name, 'utf8');
    const comp = zlib.deflateRawSync(e.data, { level: 9 });
    const crc = zlib.crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(e.data.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

function listZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i++) {
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    names.push(buf.toString('utf8', p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
  }
  return names;
}

module.exports = { writeZip, listZip };
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the build script**

`scripts/build-playgama.mjs`:
```js
/* build-playgama.mjs — Playgama submission zip from src/. Names use '/'.
   Checks before writing: index.html at root, no '\' in names, every file under
   src/themes is in the zip. Refuses a dirty working tree unless --force.
   Usage: npm run build:playgama [-- --force] */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { writeZip, listZip } = require('./zip-writer.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'build');
const EXCLUDE = [/^\./, /\.example\.js$/];

const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
if (git('status', '--porcelain') && !process.argv.includes('--force')) {
  console.error('working tree is dirty — commit first or pass --force');
  process.exit(1);
}

function walk(dir, rel = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.some(re => re.test(d.name))) continue;
    const r = rel ? rel + '/' + d.name : d.name;
    if (d.isDirectory()) out.push(...walk(path.join(dir, d.name), r));
    else out.push(r);
  }
  return out.sort();
}

const files = walk(SRC);
if (!files.includes('index.html')) { console.error('index.html missing at src root'); process.exit(1); }
const zip = writeZip(files.map(name => ({ name, data: fs.readFileSync(path.join(SRC, ...name.split('/'))) })));

const names = listZip(zip);
const themeFiles = files.filter(f => f.startsWith('themes/'));
const bad = names.filter(n => n.includes('\\'));
const missing = themeFiles.filter(f => !names.includes(f));
if (bad.length || missing.length || !names.includes('index.html')) {
  console.error('zip check failed', { bad, missing });
  process.exit(1);
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `earth-and-beyond-${version}-${git('rev-parse', '--short', 'HEAD')}.zip`);
fs.writeFileSync(out, zip);
console.log(`✓ ${path.relative(ROOT, out)}  ${names.length} files (${themeFiles.length} under themes/)  ${zip.length} bytes`);
```

- [ ] **Step 6: Wire scripts, version, ignore, docs**

In `package.json`: set `"version": "1.2.0"` and add `"build:playgama": "node scripts/build-playgama.mjs"`.
In `.gitignore` add a line `build/`.
In `CLAUDE.md` replace the `Compress-Archive -Path "$src\*" ...` block (around line 95) with:
```
npm run build:playgama        # → build/earth-and-beyond-<version>-<hash>.zip
```
and one sentence: `Do not use Compress-Archive: PowerShell 5.1 writes '\' separators and Playgama (Linux) then serves no theme images.`

- [ ] **Step 7: Build and inspect with an independent tool**

Run: `git add -A && git commit -m "build: Playgama zip with forward-slash entries" && npm run build:playgama && unzip -l build/earth-and-beyond-1.2.0-*.zip | grep -c "themes/"`
Expected: build prints `✓ build/earth-and-beyond-1.2.0-<hash>.zip ...`; the `grep -c` count equals the `(N under themes/)` number the script printed; `unzip` prints no backslash warning.

---

### Task 9: Release notes and submission copy

**Files:**
- Create: `docs/devLog/Release_Note_v1.2.0.md`
- Modify: `docs/playgama-submission.md` (description / how-to-play sections)

- [ ] **Step 1: Release note**

`docs/devLog/Release_Note_v1.2.0.md` — sections: New mechanics (Comet ×3 within 6 moves, Observatory ×2, stacking ×6, Daily seeded placement, first-appearance tips EN/KO); Fixes (submission zip used `\` separators so theme images never loaded on Playgama — now built with `npm run build:playgama`); Balance (paste the two `cosmic_sim.js` lines from `docs/balance-report-cosmic.md`); Scope (Daily + Endless; Chronicles unchanged).

- [ ] **Step 2: Submission copy**

In `docs/playgama-submission.md` add to the Daily description a paragraph:
```
**Comets & Observatory (new in 1.2).** A comet streaks onto the board now and then — merge it within 6 moves for ×3 points before it flies away. One cell on every board is an Observatory: merges that land there score ×2, and a comet caught on the Observatory scores ×6. Every Daily player gets the same observatory cell, so the leaderboard stays fair.
```
and to How to Play → Daily:
```
- ☄️ Comet tiles show a countdown; merge them before it reaches 0 for ×3 points
- 🔭 The Observatory cell doubles the points of any merge that lands on it
```

- [ ] **Step 3: Commit**

```bash
git add docs/devLog/Release_Note_v1.2.0.md docs/playgama-submission.md
git commit -m "docs: v1.2.0 release note and submission copy"
```

---

## After the plan (needs the developer, not part of task execution)

- Upload `build/earth-and-beyond-1.2.0-*.zip` via the Playgama MCP, confirm `get_archive_status` is `PASSED`, open the QA Tool link and confirm theme images render (not number tiles).
- Update the form (title "Earth & Beyond", description/how-to-play from Task 9) and write the developer comment listing only what changed.
- Submitting to moderation is a human action in the cabinet.
