'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../src/lb-sync.js');

const empty = { gallery: 0, clears: {} };

test('gallery is planned only when it grew past what was sent', () => {
  assert.deepStrictEqual(L.plan({ galleryTotal: 5, clears: [] }, empty), [{ lbId: 'gallery_total', score: 5, kind: 'gallery' }]);
  assert.deepStrictEqual(L.plan({ galleryTotal: 5, clears: [] }, { gallery: 5, clears: {} }), []);
  assert.deepStrictEqual(L.plan({ galleryTotal: 3, clears: [] }, { gallery: 5, clears: {} }), []);   // reset data never lowers
});

test('a clear is planned once, only with a known run count', () => {
  const clears = [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 4 }, { lbId: 'ch2_clear', themeId: 'b', clearRuns: null }];
  assert.deepStrictEqual(L.plan({ galleryTotal: 0, clears }, empty), [{ lbId: 'ch1_clear', score: 4, kind: 'clear', themeId: 'a' }]);
  assert.deepStrictEqual(L.plan({ galleryTotal: 0, clears }, { gallery: 0, clears: { a: 4 } }), []);
});

test('markSent records success; an unmarked (failed) item is planned again', () => {
  const items = L.plan({ galleryTotal: 7, clears: [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 2 }] }, empty);
  const sent = L.markSent(empty, items[0]);           // gallery ok, clear failed
  assert.deepStrictEqual(sent, { gallery: 7, clears: {} });
  assert.deepStrictEqual(L.plan({ galleryTotal: 7, clears: [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 2 }] }, sent).map(i => i.lbId), ['ch1_clear']);
});

test('load/save round-trip and tolerate garbage', () => {
  const st = {};
  assert.deepStrictEqual(L.load(st), empty);
  L.save(st, { gallery: 3, clears: { a: 1 } });
  assert.deepStrictEqual(L.load(st), { gallery: 3, clears: { a: 1 } });
  assert.deepStrictEqual(L.load({ earthbeyond_lb_sent: '{bad' }), empty);
});

// v0.9.1: 일일 · Endless 최고점 재전송 (playgama_sandbox SaaS LB 가 꺼져 있던 동안의 기록)
test('v0.9.1: daily best is (re)sent once per date and again only when it grows', () => {
  const cur = d => ({ galleryTotal: 0, clears: [], daily: { lbId: 'kevin-PEB', date: d.date, score: d.score } });
  let items = L.plan(cur({ date: '2026-10-05', score: 900 }), empty);
  assert.deepStrictEqual(items, [{ lbId: 'kevin-PEB', score: 900, kind: 'daily', date: '2026-10-05' }]);
  let sent = L.markSent(empty, items[0]);
  assert.deepStrictEqual(L.plan(cur({ date: '2026-10-05', score: 900 }), sent), []);
  assert.strictEqual(L.plan(cur({ date: '2026-10-05', score: 1200 }), sent).length, 1);
  assert.strictEqual(L.plan(cur({ date: '2026-10-06', score: 100 }), sent).length, 1, 'new day → send that day\'s best');
  assert.deepStrictEqual(L.plan(cur({ date: '2026-10-06', score: 0 }), sent), [], 'nothing played today → nothing');
});

test('v0.9.1: endless best is sent when above what was sent; old saves (no daily/endless field) still load', () => {
  const cur = { galleryTotal: 0, clears: [], endless: { lbId: 'Kevin-PEB2', score: 3000 } };
  const old = { gallery: 4, clears: { a: 2 } };                 // v0.9.0 저장 형식
  const items = L.plan(cur, old);
  assert.deepStrictEqual(items, [{ lbId: 'Kevin-PEB2', score: 3000, kind: 'endless' }]);
  const sent = L.markSent(old, items[0]);
  assert.deepStrictEqual(sent, { gallery: 4, clears: { a: 2 }, endless: 3000 });
  assert.deepStrictEqual(L.plan(cur, sent), []);
  const st = {}; L.save(st, sent); assert.deepStrictEqual(L.load(st), sent);
});
