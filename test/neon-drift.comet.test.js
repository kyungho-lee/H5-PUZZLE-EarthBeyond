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
