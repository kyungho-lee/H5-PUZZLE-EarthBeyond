'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/collection.js');

const theme = { id: 't1', stepSizes: [1, 2, 4] };
const store = () => ({});

test('new theme starts with runs 0 and known run count', () => {
  const s = C.loadTheme('t1', store(), theme);
  assert.strictEqual(s.runs, 0);
  assert.strictEqual(s.runsUnknown, false);
  assert.strictEqual(s.clearRuns, null);
});

test('bumpRuns increments and persists', () => {
  const st = store();
  assert.strictEqual(C.bumpRuns('t1', st, theme), 1);
  assert.strictEqual(C.bumpRuns('t1', st, theme), 2);
  assert.strictEqual(C.loadTheme('t1', st, theme).runs, 2);
});

test('clearing records clearRuns = runs', () => {
  const st = store();
  C.bumpRuns('t1', st, theme); C.bumpRuns('t1', st, theme); C.bumpRuns('t1', st, theme);
  const rec = C.recordMerges('t1', [2, 4], st, [theme], theme);
  assert.strictEqual(rec.isComplete, true);
  assert.strictEqual(C.loadTheme('t1', st, theme).clearRuns, 3);
});

test('saved progress from before run counting is marked unknown and never gets clearRuns', () => {
  const st = { earthbeyond_collection_t1: JSON.stringify({ themeId: 't1', acquiredSizes: [1, 2], acquiredSteps: [1, 2], newSizes: [], claimedSizes: [], status: 'active' }) };
  assert.strictEqual(C.loadTheme('t1', st, theme).runsUnknown, true);
  C.bumpRuns('t1', st, theme);
  C.recordMerges('t1', [4], st, [theme], theme);
  assert.strictEqual(C.loadTheme('t1', st, theme).clearRuns, null);
});

test('saved progress with only the free step 1 still counts runs', () => {
  const st = { earthbeyond_collection_t1: JSON.stringify({ themeId: 't1', acquiredSizes: [1], acquiredSteps: [1], newSizes: [1], claimedSizes: [], status: 'active' }) };
  assert.strictEqual(C.loadTheme('t1', st, theme).runsUnknown, false);
});

test('totalAcquired sums acquired steps over themes', () => {
  const t2 = { id: 't2', stepSizes: [1, 2] };
  const st = store();
  C.grantStartStep('t1', st, theme);
  C.recordMerges('t1', [2], st, [theme, t2], theme);
  C.grantStartStep('t2', st, t2);
  assert.strictEqual(C.totalAcquired(st, [theme, t2]), 3);
});
