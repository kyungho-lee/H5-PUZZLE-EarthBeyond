/* crazygames.js — PLAYGAMA-STUB (v0.9.1). Playgama zip 에는 CrazyGames SDK 를 싣지 않는다.
   SG.CG 인터페이스만 no-op 으로 둔다 — playgama.js 가 Bridge 준비 뒤 이 메서드들을 Bridge 로 갈아 끼운다. */
(function (global) {
  'use strict';
  const SG = global.SG = global.SG || {};
  const noop = function () {};
  SG.CG = {
    init: function () { return Promise.resolve(false); },
    isAvailable: function () { return false; },
    loadingStart: noop, loadingStop: noop,
    gameplayStart: noop, gameplayStop: noop,
    requestMidgameAd: function () { return Promise.resolve(); },
    requestRewardedAd: function () { return Promise.resolve({ granted: false }); },
    showBanner: noop, hideBanner: noop,
  };
})(typeof window !== 'undefined' ? window : globalThis);
