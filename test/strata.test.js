'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ND = require('../src/neon-drift.js');
const S = require('../src/strata.js');

const T = size => ({ color: 0, size });
function grid(rows) { return rows.map(r => r.map(s => (s ? T(s) : null))); }

test('enabled for Chronicles chapters 1-3 with windows 6/7/7 (off elsewhere)', () => {
  assert.strictEqual(S.enabledFor('primordial-earth'), true);
  assert.strictEqual(S.enabledFor('human-civilization'), true);
  assert.strictEqual(S.enabledFor('solar-system'), true);
  assert.deepStrictEqual(['primordial-earth', 'human-civilization', 'solar-system'].map(S.windowFor), [6, 7, 7]);
  for (const id of ['endless', 'daily', undefined, null, '']) {
    assert.strictEqual(S.enabledFor(id), false, String(id));
  }
});

test('kill switch CHAPTERS.length = 0 turns every chapter off', () => {
  const saved = S.CHAPTERS.slice();
  try {
    S.CHAPTERS.length = 0;
    assert.strictEqual(S.enabledFor('primordial-earth'), false);
    assert.strictEqual(S.newRun('human-civilization').enabled, false);
  } finally { S.CHAPTERS.push(...saved); }
  assert.strictEqual(S.enabledFor('solar-system'), true);
});

test('per-chapter tiers: gradedTiers(id) and gradedTiers(ctx) follow the chapter window', () => {
  const at = (tiers, mx) => ND.gradedSpawnSize(grid([[mx, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), () => 0.5, { gradedTiers: tiers });
  S.resetSession();
  for (let mx = 1; mx <= 1024; mx *= 2) {
    assert.strictEqual(at(S.gradedTiers('human-civilization'), mx), S.spawnSize(mx, 7), 'ch2 mx ' + mx);
    assert.strictEqual(at(S.gradedTiers(S.newRun('solar-system')), mx), Math.max(1, mx >> 6), 'ch3 ctx mx ' + mx);
  }
  assert.deepStrictEqual(S.gradedTiers('primordial-earth'), S.gradedTiers());
  // ch2 window 7: 256 → threshold 2, fossils only < 2
  const ctx = S.newRun('human-civilization');
  const r = S.onNewBest(grid([[256, 1, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 256, ctx);
  assert.strictEqual(r.threshold, 2);
  assert.deepStrictEqual(r.fossils, [[0, 1]]);
  assert.strictEqual(r.spawnBase, 4);
});

test('silent loss-streak assist: 2 game overs in a chapter → next run spawn one step up; clear resets', () => {
  S.resetSession();
  const id = 'human-civilization';
  assert.strictEqual(S.newRun(id).shift, 0);
  S.noteRunEnd(id, 'game_over');
  assert.strictEqual(S.newRun(id).shift, 0);
  S.noteRunEnd(id, 'quit');                       // quitting is not a loss
  assert.strictEqual(S.newRun(id).shift, 0);
  S.noteRunEnd(id, 'game_over');
  const ctx = S.newRun(id);
  assert.strictEqual(ctx.shift, 1);
  assert.strictEqual(S.newRun('solar-system').shift, 0);   // per chapter
  assert.strictEqual(S.onNewBest(grid([[256, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 256, ctx).spawnBase, 8);
  S.noteRunEnd(id, 'chapter_clear');
  assert.strictEqual(S.newRun(id).shift, 0);
  S.resetSession();
});

test('window 6: threshold = best >> 6, spawn = best >> 5 (min 1)', () => {
  assert.strictEqual(S.WINDOW, 6);
  assert.strictEqual(S.threshold(32), 1);
  assert.strictEqual(S.threshold(64), 1);
  assert.strictEqual(S.threshold(128), 2);
  assert.strictEqual(S.threshold(1024), 16);
  assert.strictEqual(S.spawnSize(16), 1);
  assert.strictEqual(S.spawnSize(64), 2);
  assert.strictEqual(S.spawnSize(512), 16);
});

test('gradedTiers() makes the unchanged engine spawn spawnSize(boardMax)', () => {
  const tiers = S.gradedTiers();
  for (let mx = 1; mx <= 1024; mx *= 2) {
    const g = grid([[mx, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    assert.strictEqual(ND.gradedSpawnSize(g, () => 0.5, { gradedTiers: tiers }), S.spawnSize(mx), 'mx ' + mx);
  }
});

test('onNewBest: fossils only when the threshold rises, never the best, grid untouched', () => {
  const ctx = S.newRun('primordial-earth');
  const g = grid([[128, 1, 1, 2], [4, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0]]);
  const snap = JSON.stringify(g);
  const r = S.onNewBest(g, 128, ctx);
  assert.strictEqual(r.advanced, true);
  assert.strictEqual(r.threshold, 2);
  assert.strictEqual(r.spawnBase, 4);
  assert.deepStrictEqual(r.fossils, [[0, 1], [0, 2], [3, 2]]);
  assert.strictEqual(JSON.stringify(g), snap);
  // same best again → nothing new
  const r2 = S.onNewBest(g, 128, ctx);
  assert.strictEqual(r2.advanced, false);
  assert.deepStrictEqual(r2.fossils, []);
  // best omitted → board max
  const ctx2 = S.newRun('primordial-earth');
  assert.deepStrictEqual(S.onNewBest(g, null, ctx2).fossils, r.fossils);
  // clearCells empties exactly those cells
  assert.strictEqual(S.clearCells(g, r.fossils), 3);
  assert.strictEqual(ND.maxSize(g), 128);
});

test('onNewBest is a no-op when strata is off for the chapter', () => {
  const ctx = S.newRun('endless');
  const g = grid([[512, 1, 1, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = S.onNewBest(g, 512, ctx);
  assert.deepStrictEqual(r.fossils, []);
  assert.strictEqual(r.advanced, false);
  assert.strictEqual(r.spawnBase, 1);
});

test('describe() returns a short toast in en / ko', () => {
  assert.ok(S.describe('en').length > 10);
  assert.ok(S.describe('ko').length > 5);
});

// Smoke: deterministic chapter-1 runs with the real engine — no soft-lock, some clears.
test('chapter-1 strata runs: no soft-locks and at least one 1024 clear (seeded)', () => {
  function mkRng(seed) { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const o = { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4, gradedTiers: S.gradedTiers(), collapseSize: 1024 };
  const corner = g => ['down', 'left', 'right', 'up'].find(d => ND.applyMove(g, d, () => 0.99, o).moved);
  let clears = 0;
  for (let i = 0; i < 30; i++) {
    const rng = mkRng(11 + i * 7919);
    const ctx = S.newRun('primordial-earth');
    let g = ND.emptyGrid(4);
    for (let k = 0; k < 2; k++) { const s = ND.spawnTile(g, rng, o); g[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; }
    let moves = 0;
    while (!ND.checkGameOver(g, 'sizeOnly')) {
      assert.ok(moves < 6000, 'move cap (soft-lock) seed ' + i);
      const d = corner(g);
      assert.ok(d, 'canMove but no direction moves, seed ' + i);
      const r = ND.applyMove(g, d, rng, o); g = r.grid; moves++;
      if (r.collapse) { clears++; break; }
      const best = ND.maxSize(g);
      S.clearCells(g, S.onNewBest(g, best, ctx).fossils);
      assert.strictEqual(ND.maxSize(g), best);
    }
    if (ND.checkGameOver(g, 'sizeOnly')) assert.deepStrictEqual(S.fossilCells(g, ND.maxSize(g)), [], 'game over with pending fossils');
  }
  assert.ok(clears > 0, 'expected at least one clear in 30 seeded runs');
});
