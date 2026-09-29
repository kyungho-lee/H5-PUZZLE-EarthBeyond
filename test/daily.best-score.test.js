'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Daily = require('../src/daily.js');

test('setBestScore keeps the highest run score of the day and reports a new best', () => {
  const store = {};
  const ds = Daily.loadDaily('2026-09-29', store);
  assert.strictEqual(ds.bestScore, 0);
  assert.strictEqual(Daily.setBestScore(ds, 1200, store), true);
  assert.strictEqual(Daily.setBestScore(ds, 800, store), false);   // lower retry never overwrites
  assert.strictEqual(ds.bestScore, 1200);
  assert.strictEqual(Daily.loadDaily('2026-09-29', store).bestScore, 1200);
});

test('bestScore starts at 0 on a new day (daily reset)', () => {
  const store = {};
  Daily.setBestScore(Daily.loadDaily('2026-09-29', store), 5000, store);
  assert.strictEqual(Daily.loadDaily('2026-09-30', store).bestScore, 0);
});

test('endless best is tracked per day separately from the daily best', () => {
  const store = {};
  const ds = Daily.loadDaily('2026-09-29', store);
  Daily.setBestScore(ds, 700, store);
  assert.strictEqual(Daily.setBestScore(ds, 300, store, 'endlessBest'), true);
  assert.strictEqual(Daily.setBestScore(ds, 200, store, 'endlessBest'), false);
  const reloaded = Daily.loadDaily('2026-09-29', store);
  assert.strictEqual(reloaded.bestScore, 700);
  assert.strictEqual(reloaded.endlessBest, 300);
  assert.strictEqual(Daily.loadDaily('2026-09-30', store).endlessBest, 0);
});

test('loadDaily migrates a saved day without bestScore', () => {
  const store = { 'earthbeyond_daily_2026-09-29': JSON.stringify({ date: '2026-09-29', retriesUsed: 1, stars: 3, bestRun: 3, claimedBest: 0 }) };
  assert.strictEqual(Daily.loadDaily('2026-09-29', store).bestScore, 0);
});
