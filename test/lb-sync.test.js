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
