'use strict';
// v0.9.2 명예의 전당 — 한 저장에 1회 제출 · 순위(N번째 우주정복자) · 불러오기 실패 시 숨김(null)
const test = require('node:test');
const assert = require('node:assert');
const H = require('../src/hall-of-fame.js');

const T0 = Date.UTC(2026, 9, 6, 12, 0, 0);

test('score = seconds since 2026-01-01 UTC (ascending = arrival order), never below 1', () => {
  assert.strictEqual(H.scoreAt(Date.UTC(2026, 0, 1, 0, 0, 10)), 10);
  assert.ok(H.scoreAt(T0) < H.scoreAt(T0 + 1000));
  assert.strictEqual(H.scoreAt(0), 1);
  assert.ok(H.scoreAt(Date.UTC(2090, 0, 1)) < 2147483647, 'fits a 32-bit score for decades');
});

test('record once per save: replay / later endings keep the first value', () => {
  const st = {};
  const a = H.record(st, T0);
  assert.strictEqual(a.isNew, true);
  assert.ok(H.needsSubmit(a.state));
  const b = H.record(st, T0 + 86400000);
  assert.strictEqual(b.isNew, false);
  assert.strictEqual(b.state.score, a.state.score, 'value does not move on replay');
});

test('submit until success, then never again', () => {
  const st = {};
  H.record(st, T0);
  assert.ok(H.needsSubmit(H.load(st)), 'failed submit → still pending');
  H.markSent(st);
  assert.strictEqual(H.needsSubmit(H.load(st)), false);
  H.record(st, T0 + 5000);
  assert.strictEqual(H.needsSubmit(H.load(st)), false, 'a second ending does not resubmit');
  assert.strictEqual(H.markSent({}).sent, false, 'nothing recorded → nothing marked');
});

test('rank: my id in the list → its rank; otherwise earlier arrivals + 1', () => {
  const rows = H.normalize([{ id: 'c', score: 300, rank: 3 }, { id: 'a', score: 100, rank: 1 }, { id: 'b', score: 200, rank: 2 }]);
  assert.deepStrictEqual(rows.map(r => r.id), ['a', 'b', 'c']);
  assert.strictEqual(H.rankOf(rows, 'b', 200), 2);
  assert.strictEqual(H.rankOf(rows, 'zz', 250), 3, 'not in list yet (just submitted) → 2 earlier + 1');
  assert.strictEqual(H.rankOf(rows, null, 0), 0, 'no ending yet → no rank');
  const noRank = H.normalize([{ id: 'x', score: 50 }, { id: 'y', score: 20 }]);
  assert.deepStrictEqual(noRank.map(r => [r.id, r.rank]), [['y', 1], ['x', 2]], 'missing rank → by score ascending');
});

test('texts: English ordinal + Korean 「N번째 우주정복자」', () => {
  assert.deepStrictEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(H.ordinal),
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
  assert.strictEqual(H.conquerorLine('en', 3), '👑 You are the 3rd Universe Conqueror!');
  assert.strictEqual(H.conquerorLine('ko', 3), '👑 당신은 3번째 우주정복자!');
  assert.strictEqual(H.conquerorLine('en', 0), '');
  assert.match(H.bannerLine('ko', 12, 0), /12명이 우주를 정복했습니다 — 명예의 전당에 도전!/);
  assert.match(H.bannerLine('en', 1, 0), /1 player has conquered/);
  assert.match(H.bannerLine('en', 0, 0), /be the first/);
  assert.match(H.bannerLine('ko', 5, 2), /당신은 2번째 우주정복자/);
});

test('load failure → null (caller hides the box); top rows + my row when outside', () => {
  assert.strictEqual(H.normalize(null), null);
  assert.strictEqual(H.displayRows(null, 'me', 10), null);
  const rows = H.normalize(Array.from({ length: 8 }, (_, i) => ({ id: 'p' + i, score: 10 + i, rank: i + 1 })));
  const d = H.displayRows(rows, 'p6', 16, 5);
  assert.strictEqual(d.length, 6);
  assert.deepStrictEqual(d[5], { id: 'p6', name: '', score: 16, rank: 7, isMe: true, sep: true });
  const inTop = H.displayRows(rows, 'p1', 11, 5);
  assert.strictEqual(inTop.length, 5);
  assert.ok(inTop[1].isMe);
  assert.deepStrictEqual(H.displayRows([], 'me', 0, 5), [], 'empty board is shown as empty, not hidden');
});
