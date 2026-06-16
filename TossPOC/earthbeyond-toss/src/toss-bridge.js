(function (global) {
  'use strict';

  var TossBridge = {
    platform: 'toss',

    init: function () {
      console.log('[TossBridge] stub mode');
      return Promise.resolve();
    },

    login: function () {
      return Promise.resolve({ userKey: 'stub-user-key', hash: 'stub-hash' });
    },

    purchase: function (productId) {
      console.log('[TossBridge] IAP stub:', productId);
      return Promise.resolve({ success: false, reason: 'stub' });
    },

    requestRewardedAd: function (placementId) {
      console.log('[TossBridge] Rewarded ad stub:', placementId);
      return Promise.resolve({ success: false, reason: 'stub' });
    },

    requestInterstitialAd: function () {
      return Promise.resolve({ success: false });
    },

    submitScore: function (score) {
      console.log('[TossBridge] Score stub:', score);
      return Promise.resolve({ success: false });
    },
  };

  global.TossBridge = TossBridge;

  // SG.PG stub — playgama.js 제거 대체. isAvailable()=false 로 모든 PG 경로 비활성화.
  global.SG = global.SG || {};
  global.SG.PG = {
    isAvailable:    function () { return false; },
    init:           function () { return Promise.resolve(); },
    storageSet:     function () { return Promise.resolve(); },
    LB_ENDLESS:     'endless',
    LB_DAILY:       'daily',
    _audioEnabled:  true,
    leaderboard: {
      submit:   function () { return Promise.resolve(); },
      getEntries: function () { return Promise.resolve([]); },
      getType:  function () { return 'native'; },
    },
  };

  // SG.CG stub — crazygames.js 제거 대체. 모든 호출이 try/catch 안이지만 명시적으로 정의.
  global.SG.CG = {
    isAvailable:   function () { return false; },
    init:          function () { return Promise.resolve(); },
    gameplayStart: function () {},
    gameplayStop:  function () {},
    showBanner:    function () {},
    hideBanner:    function () {},
    requestRewardedAd:    function () { return Promise.resolve({ success: false }); },
    requestInterstitialAd: function () { return Promise.resolve({ success: false }); },
  };

  // SG.FB stub — firebase.js 제거 대체.
  global.SG.FB = {
    isConnected:      function () { return false; },
    submitScore:      function () { return Promise.resolve(); },
    fetchLeaderboard: function () { return Promise.resolve([]); },
  };
})(window);
