'use strict';
// v0.9.1 PD 스펙 §2-3 — CONTINUE 판당 1회 · 별 전용, 전면광고 리듬
const test = require('node:test');
const assert = require('node:assert');
const R = require('../src/session-rules.js');

function clock(t0) { let t = t0; const f = () => t; f.add = ms => { t += ms; }; return f; }

test('CONTINUE: cap 1 per run; stars = wallet + this-run unsettled stars; short → shown but disabled', () => {
  assert.deepStrictEqual(R.continueOffer({ usedThisRun: 0, removable: 3, wallet: 5 }), { show: true, enabled: true, method: 'stars', reason: 'ok', cost: 5 });
  assert.strictEqual(R.continueOffer({ usedThisRun: 1, removable: 3, wallet: 999 }).show, false, 'cap 1');
  assert.strictEqual(R.continueOffer({ usedThisRun: 1, removable: 3, firstRunEver: true }).show, false, 'free one also counts toward the cap');
  const run = R.continueOffer({ usedThisRun: 0, removable: 3, wallet: 0, runStars: 7 });
  assert.ok(run.show && run.enabled, 'this-run stars pay (first-time player with 0 wallet)');
  const short = R.continueOffer({ usedThisRun: 0, removable: 3, wallet: 2, runStars: 2 });
  assert.deepStrictEqual([short.show, short.enabled, short.reason], [true, false, 'no_stars'], 'not hidden — disabled "Earn 5⭐"');
  assert.strictEqual(R.continueOffer({ usedThisRun: 0, removable: 0, wallet: 50 }).reason, 'nothing_to_clear');
  assert.strictEqual(R.CONTINUE_CAP_PER_RUN, 1);
});

test('CONTINUE: the very first Chronicles run gets one free keep-going (no ad)', () => {
  const f = R.continueOffer({ usedThisRun: 0, removable: 3, wallet: 0, runStars: 0, firstRunEver: true });
  assert.deepStrictEqual([f.show, f.enabled, f.method, f.cost], [true, true, 'free', 0]);
  assert.strictEqual(R.continueOffer({ usedThisRun: 0, removable: 3, wallet: 0, firstRunEver: false }).method, 'stars');
});

test('CONTINUE payment: run stars first, then wallet; null when short', () => {
  assert.deepStrictEqual(R.splitContinueCost(5, 3, 10), { fromRun: 3, fromWallet: 2 });
  assert.deepStrictEqual(R.splitContinueCost(5, 9, 0), { fromRun: 5, fromWallet: 0 });
  assert.strictEqual(R.splitContinueCost(5, 2, 2), null);
});

test('loss-streak assist: same chapter 2 losses in a row → one step up; chapter clear resets; per chapter', () => {
  const L = R.createLossStreak();
  L.noteLoss('a'); assert.strictEqual(L.assist('a'), false);
  L.noteLoss('b'); assert.strictEqual(L.assist('a'), false, 'losses in another chapter do not count');
  L.noteLoss('a'); assert.strictEqual(L.assist('a'), true);
  L.noteLoss('a'); assert.strictEqual(L.assist('a'), true, 'stays on until a clear');
  L.noteClear('a'); assert.strictEqual(L.assist('a'), false);
  assert.deepStrictEqual(R.assistTiers(null), [{ maxAtMost: Infinity, dist: [[2, 1]] }]);
  assert.deepStrictEqual(R.assistTiers([{ maxAtMost: 64, dist: [[1, 0.8], [2, 0.2]] }]), [{ maxAtMost: 64, dist: [[2, 0.8], [4, 0.2]] }]);
});

test('game-over copy: "N of 11 kept · Next: reach X", "So close" when best ≥ half of next', () => {
  const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  const acq = [1, 2, 4, 8, 16, 32, 64];
  assert.deepStrictEqual(R.gameOverCopy({ sizes, acquired: acq, best: 32 }), { kept: 7, next: 128, soClose: false, line1: '7 of 11 kept', line2: 'Next: reach 128' });
  assert.strictEqual(R.gameOverCopy({ sizes, acquired: acq, best: 64 }).line2, 'So close — 64 of 128');
  assert.strictEqual(R.gameOverCopy({ sizes, acquired: acq, best: 64, lang: 'ko' }).line2, '거의 다 왔어요 — 64 / 128');
  assert.strictEqual(R.gameOverCopy({ sizes, acquired: sizes, best: 1024 }).next, null);
});

test('ads: the interval is explicit config (90 s) and counted from session start', () => {
  assert.strictEqual(R.AD_RHYTHM.MIN_GAP_MS, 90000);
  const now = clock(1000);
  const ad = R.createAdRhythm({ now });
  now.add(30000);
  assert.deepStrictEqual(ad.decide('collapse'), { show: false, reason: 'cooldown' });
  now.add(60000);
  assert.strictEqual(ad.decide('collapse').show, true);
  ad.noteShown();
  now.add(89999);
  assert.strictEqual(ad.decide('play_again').reason, 'cooldown');
  now.add(1);
  assert.strictEqual(ad.decide('play_again').show, true);
});

test('ads: never on the session\'s first game over, never on menu exit', () => {
  const now = clock(0);
  const ad = R.createAdRhythm({ now });
  now.add(10 * 60000);
  assert.deepStrictEqual(ad.decide('game_over'), { show: false, reason: 'first_game_over' });
  assert.strictEqual(ad.decide('game_over').show, true, 'second game over may show');
  assert.deepStrictEqual(ad.decide('menu'), { show: false, reason: 'menu' });
});

test('ads: not right after a scene reveal (3 s)', () => {
  const now = clock(0);
  const ad = R.createAdRhythm({ now });
  now.add(5 * 60000);
  ad.decide('game_over');                       // 첫 게임오버 소진
  ad.noteSceneReveal();
  now.add(2999);
  assert.strictEqual(ad.decide('game_over').reason, 'after_reveal');
  now.add(1);
  assert.strictEqual(ad.decide('collapse').show, true);
});

test('ads: Chronicles interstitial comes after the result screen, on PLAY AGAIN — never after the session first game over', () => {
  const now = clock(0);
  const ad = R.createAdRhythm({ now });
  now.add(5 * 60000);
  ad.noteGameOver();
  assert.deepStrictEqual(ad.decide('after_game_over'), { show: false, reason: 'first_game_over' });
  ad.noteGameOver();
  assert.strictEqual(ad.decide('after_game_over').show, true);
  ad.noteShown();
  ad.noteGameOver();
  assert.strictEqual(ad.decide('after_game_over').reason, 'cooldown');
});
