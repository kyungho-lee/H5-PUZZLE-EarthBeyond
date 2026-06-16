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
})(window);
