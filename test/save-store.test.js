'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createStore, SAVE_KEY } = require('../src/save-store.js');

function fakeLocal(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _m: m,
  };
}
function fakeBridge(saved) {
  const b = { data: saved ? { [SAVE_KEY]: saved } : {}, sets: 0 };
  b.get = async keys => keys.map(k => (k in b.data ? b.data[k] : null));
  b.set = async (keys, values) => { b.sets++; keys.forEach((k, i) => { b.data[k] = values[i]; }); };
  return b;
}
const TODAY = '2026-09-29';

test('without a bridge the store behaves like the native storage', () => {
  const local = fakeLocal();
  const s = createStore(local, () => TODAY);
  s.setItem('earthbeyond_wallet', '{"stars":3}');
  assert.strictEqual(local.getItem('earthbeyond_wallet'), '{"stars":3}');
  assert.strictEqual(s.getItem('earthbeyond_wallet'), '{"stars":3}');
});

test('attach restores progress from the bridge before anything is read', async () => {
  const snap = JSON.stringify({ v: 1, data: { earthbeyond_wallet: '{"stars":9}' } });
  const s = createStore(fakeLocal({ earthbeyond_wallet: '{"stars":1}' }), () => TODAY);
  await s.attachBridge(fakeBridge(snap));
  assert.strictEqual(s.getItem('earthbeyond_wallet'), '{"stars":9}');
});

test('attach migrates existing local progress when the bridge has no save', async () => {
  const local = fakeLocal({ earthbeyond_wallet: '{"stars":4}', puzzle_player_id: 'p_1', sg_dev: '1' });
  const bridge = fakeBridge(null);
  const s = createStore(local, () => TODAY);
  await s.attachBridge(bridge);
  const saved = JSON.parse(bridge.data[SAVE_KEY]).data;
  assert.strictEqual(saved.earthbeyond_wallet, '{"stars":4}');
  assert.strictEqual(saved.puzzle_player_id, 'p_1');
  assert.strictEqual(saved.sg_dev, undefined);   // dev flag is not progress
});

test('after attach, game keys go to the bridge in one call and never to local storage', async () => {
  const local = fakeLocal();
  const bridge = fakeBridge(null);
  const s = createStore(local, () => TODAY);
  await s.attachBridge(bridge);
  const before = bridge.sets;
  s.setItem('earthbeyond_lang', 'ko');
  s.setItem('earthbeyond_bgm', 'on');
  await s.flush();
  assert.strictEqual(bridge.sets, before + 1);
  assert.strictEqual(local.getItem('earthbeyond_lang'), null);
  assert.deepStrictEqual(JSON.parse(bridge.data[SAVE_KEY]).data, { earthbeyond_lang: 'ko', earthbeyond_bgm: 'on' });
});

test('non-game keys stay in local storage (dev flag)', async () => {
  const local = fakeLocal();
  const s = createStore(local, () => TODAY);
  await s.attachBridge(fakeBridge(null));
  s.setItem('sg_dev', '1');
  assert.strictEqual(local.getItem('sg_dev'), '1');
  assert.strictEqual(s.getItem('sg_dev'), '1');
});

test('key()/length/removeItem cover game keys so reset can enumerate them', async () => {
  const s = createStore(fakeLocal(), () => TODAY);
  await s.attachBridge(fakeBridge(null));
  s.setItem('earthbeyond_collection_meta', '{}');
  s.setItem('earthbeyond_collection_x', '{}');
  const keys = [];
  for (let i = 0; i < s.length; i++) keys.push(s.key(i));
  assert.ok(keys.includes('earthbeyond_collection_x'));
  s.removeItem('earthbeyond_collection_x');
  assert.strictEqual(s.getItem('earthbeyond_collection_x'), null);
});

test('old daily states are pruned from the save, today and yesterday kept', async () => {
  const bridge = fakeBridge(null);
  const s = createStore(fakeLocal(), () => TODAY);
  await s.attachBridge(bridge);
  s.setItem('earthbeyond_daily_2026-09-20', '{}');
  s.setItem('earthbeyond_daily_2026-09-28', '{}');
  s.setItem('earthbeyond_daily_2026-09-29', '{}');
  await s.flush();
  const saved = JSON.parse(bridge.data[SAVE_KEY]).data;
  assert.deepStrictEqual(Object.keys(saved).sort(), ['earthbeyond_daily_2026-09-28', 'earthbeyond_daily_2026-09-29']);
});

test('a failing bridge load keeps the game on local storage', async () => {
  const local = fakeLocal({ earthbeyond_wallet: '{"stars":2}' });
  const s = createStore(local, () => TODAY);
  const ok = await s.attachBridge({ get: async () => { throw new Error('x'); }, set: async () => {} });
  assert.strictEqual(ok, false);
  assert.strictEqual(s.getItem('earthbeyond_wallet'), '{"stars":2}');
  s.setItem('earthbeyond_wallet', '{"stars":5}');
  assert.strictEqual(local.getItem('earthbeyond_wallet'), '{"stars":5}');
});
