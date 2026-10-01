/* firebase.js — PLAYGAMA-STUB (v0.9.1). Playgama zip 에는 외부 백엔드 · IP 조회가 없다.
   src/firebase.js 와 같은 SG.FB 모양을 no-op 으로 준다. 리더보드는 Bridge SaaS(playgama.js)만. */
(function (global) {
  'use strict';
  const SG = global.SG = global.SG || {};
  function getPlayerId() {
    let id = null;
    try { id = SG.Store.getItem('puzzle_player_id'); } catch (_) {}
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { SG.Store.setItem('puzzle_player_id', id); } catch (_) {}
    }
    return id;
  }
  function langCountry() {
    try {
      const l = (navigator.language || '').split('-')[1];
      return l && l.length === 2 ? l.toUpperCase() : '';
    } catch (_) { return ''; }
  }
  function countryFlag(cc) {
    try {
      if (!cc || cc.length !== 2) return '🌐';
      const base = 0x1F1E6 - 65;
      return String.fromCodePoint(base + cc.charCodeAt(0)) + String.fromCodePoint(base + cc.charCodeAt(1));
    } catch (_) { return '🌐'; }
  }
  SG.FB = {
    init: function () { return Promise.resolve(false); },
    isConnected: function () { return false; },
    getPlayerId: getPlayerId,
    submitScore: function () { return Promise.resolve(false); },
    fetchLeaderboard: function () { return Promise.resolve([]); },
    detectCountry: langCountry,
    countryFlag: countryFlag,
  };
})(typeof window !== 'undefined' ? window : globalThis);
