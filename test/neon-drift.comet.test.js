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
