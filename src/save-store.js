/* save-store.js — player data store backed by Playgama Bridge Storage.
   localStorage-shaped API (getItem/setItem/removeItem/key/length) so game code and
   the store-injected modules (daily.js, collection.js) keep their calls unchanged.

   · Before attachBridge(), or without a Bridge: reads/writes the native localStorage.
   · attachBridge(): one storage.get([SAVE_KEY]) restores every game key; from then on
     game keys live in memory and are saved with one storage.set([SAVE_KEY], [json])
     (debounced). Bridge docs: never persist player data to localStorage directly.
   · A player with local progress but no Bridge save is migrated once.
   · Non-game keys (sg_dev) stay in localStorage — they are not player progress.
   UMD: module.exports for node tests, SG.Store in browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.SG = root.SG || {};
    let native = null;
    try { native = root.localStorage; } catch (_) {}
    root.SG.Store = api.createStore(native, function () { return new Date().toISOString().slice(0, 10); });
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SAVE_KEY = 'earthbeyond_save';
  const EXCLUDE = { earthbeyond_cc: true, earthbeyond_save: true };   // country cache, the save itself
  const DAILY_PREFIX = 'earthbeyond_daily_';
  const FLUSH_MS = 400;

  function isGameKey(k) {
    return !EXCLUDE[k] && (k.indexOf('earthbeyond_') === 0 || k === 'puzzle_player_id');
  }

  function createStore(native, today) {
    let bridge = null;          // { get(keys), set(keys, values) } once attached
    const mem = new Map();      // game keys while attached
    let timer = null;
    let pending = null;

    function nGet(k) { try { return native ? native.getItem(k) : null; } catch (_) { return null; } }
    function nSet(k, v) { try { if (native) native.setItem(k, v); } catch (_) {} }
    function nDel(k) { try { if (native) native.removeItem(k); } catch (_) {} }
    function nKeys() {
      const out = [];
      try { for (let i = 0; native && i < native.length; i++) out.push(native.key(i)); } catch (_) {}
      return out;
    }

    // Daily states only matter for today (and yesterday across the UTC boundary).
    function keepDaily(k) {
      if (k.indexOf(DAILY_PREFIX) !== 0) return true;
      const d = k.slice(DAILY_PREFIX.length);
      const t = today();
      const y = new Date(Date.parse(t + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
      return d === t || d === y;
    }

    function snapshot() {
      const data = {};
      mem.forEach(function (v, k) { if (keepDaily(k)) data[k] = v; });
      return JSON.stringify({ v: 1, savedAt: Date.now(), data: data });
    }

    function flush() {
      if (!bridge) return Promise.resolve(false);
      clearTimeout(timer); timer = null;
      const json = snapshot();
      pending = Promise.resolve()
        .then(function () { return bridge.set([SAVE_KEY], [json]); })
        .then(function () { return true; }, function () { return false; });
      return pending;
    }
    function schedule() {
      if (!bridge || timer) return;
      timer = setTimeout(flush, FLUSH_MS);
    }

    async function attachBridge(b) {
      let saved;
      try { saved = (await b.get([SAVE_KEY]))[0]; } catch (_) { return false; }
      let restored = null;
      if (saved) {
        try {
          const obj = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (obj && obj.data) restored = obj.data;
        } catch (_) {}
      }
      mem.clear();
      if (restored) {
        Object.keys(restored).forEach(function (k) { if (isGameKey(k)) mem.set(k, String(restored[k])); });
      } else {
        nKeys().forEach(function (k) { if (k && isGameKey(k)) mem.set(k, nGet(k)); });   // one-time migration
      }
      bridge = b;
      if (!restored) await flush();
      return true;
    }

    return {
      getItem: function (k) {
        if (bridge && isGameKey(k)) return mem.has(k) ? mem.get(k) : null;
        return nGet(k);
      },
      setItem: function (k, v) {
        if (bridge && isGameKey(k)) { mem.set(k, String(v)); schedule(); return; }
        nSet(k, String(v));
      },
      removeItem: function (k) {
        if (bridge && isGameKey(k)) { mem.delete(k); schedule(); return; }
        nDel(k);
      },
      key: function (i) { return this._keys()[i] == null ? null : this._keys()[i]; },
      get length() { return this._keys().length; },
      _keys: function () {
        if (!bridge) return nKeys();
        return Array.from(mem.keys()).concat(nKeys().filter(function (k) { return k && !isGameKey(k); }));
      },
      attachBridge: attachBridge,
      flush: flush,
      isBridged: function () { return !!bridge; },
    };
  }

  return { createStore: createStore, SAVE_KEY: SAVE_KEY, isGameKey: isGameKey };
});
