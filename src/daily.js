/* daily.js — Daily Mode pure meta logic. Zero DOM/ads.
   UMD: module.exports for node tests, SG.Daily in browser.
   Depends on SG.ND (dailyType). In node, requires ./neon-drift. */
(function (root, factory) {
  const ND = (typeof require === 'function') ? require('./neon-drift') : (root.SG && root.SG.ND);
  const api = factory(ND);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.Daily = api; }
})(typeof self !== 'undefined' ? self : this, function (ND) {
  'use strict';

  const N = 4;
  // 리트라이 3회 (총 4판/일). best-run 증분 적립이라 무한 반복 수급은 없지만,
  // 한 판의 긴장감 유지 + 광고 피로 완화를 위해 5→3으로 축소. (v0.8.2)
  const MAX_RETRIES = 3;

  // Build the 4x4 starting board for a date+weekday. Pure (rng injected).
  function dailyBoard(dateStr, dayOfWeek, rng) {
    const type = ND.dailyType(dayOfWeek);
    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    const place = (size) => {
      let guard = 0;
      while (guard++ < 1000) {
        const r = Math.floor(rng() * N), c = Math.floor(rng() * N);
        if (!grid[r][c]) { grid[r][c] = { color: 0, size: size }; return; }
      }
    };
    for (const st of type.startTiles) for (let i = 0; i < st.count; i++) place(st.size);
    return grid;
  }

  // ── DailyState — persistence injected (localStorage-like or plain {} map) ──
  function _key(dateStr) { return 'earthbeyond_daily_' + dateStr; }
  function _read(store, k) {
    if (store && typeof store.getItem === 'function') {
      try { return JSON.parse(store.getItem(k)); } catch (_) { return null; }
    }
    if (store && store[k] != null) {
      return typeof store[k] === 'string' ? JSON.parse(store[k]) : store[k];
    }
    return null;
  }
  function _write(store, k, v) {
    const s = JSON.stringify(v);
    if (store && typeof store.setItem === 'function') { try { store.setItem(k, s); } catch (_) {} }
    else if (store) { store[k] = s; }
  }

  function loadDaily(dateStr, store) {
    const existing = _read(store, _key(dateStr));
    if (existing && existing.date === dateStr) {
      if (existing.claimedBest == null) existing.claimedBest = 0;   // 마이그레이션
      return existing;
    }
    const fresh = { date: dateStr, retriesUsed: 0, stars: 0, bestRun: 0, claimedBest: 0 };
    _write(store, _key(dateStr), fresh);
    return fresh;
  }

  // 세션 종료 시 1회 정산: 오늘 best 중 아직 지갑에 안 넣은 차액만 적립.
  // 여러 번 호출해도 best 전액까지만(중복 없음). 반환: 이번에 적립된 별 수.
  function claimBestToWallet(ds, store) {
    const claimable = Math.max(0, (ds.bestRun || 0) - (ds.claimedBest || 0));
    if (claimable <= 0) return 0;
    const earned = earnStarsToWallet(claimable, 'daily', store);
    ds.claimedBest = ds.bestRun;
    _write(store, _key(ds.date), ds);
    return earned;
  }
  // 아직 정산 안 된 best 차액 (CLAIM 버튼 금액 표시용)
  function claimableBest(ds) {
    return Math.max(0, (ds.bestRun || 0) - (ds.claimedBest || 0));
  }
  function addStars(ds, n, store) { ds.stars += n; _write(store, _key(ds.date), ds); return ds.stars; }
  function setBestRun(ds, runStars, store) {
    if (runStars > ds.bestRun) { ds.bestRun = runStars; _write(store, _key(ds.date), ds); }
    return ds.bestRun;
  }
  function canRetry(ds) { return ds.retriesUsed < MAX_RETRIES; }
  function useRetry(ds, store) {
    if (canRetry(ds)) { ds.retriesUsed++; _write(store, _key(ds.date), ds); }
    return ds.retriesUsed;
  }
  function retriesLeft(ds) { return MAX_RETRIES - ds.retriesUsed; }

  // ── Wallet (별 2-tier) ─────────────────────────────────────────────
  var WALLET_KEY = 'earthbeyond_wallet';
  var WALLET_DAILY_CAP = 80;

  function loadWallet(store) {
    var w = _read(store, WALLET_KEY);
    if (!w) {
      w = { stars: 0, totalEarned: 0, totalSpent: 0, dailyEarnedToday: 0, lastUpdated: '' };
    }
    var today = new Date().toISOString().slice(0, 10);
    if (w.lastUpdated !== today) {
      w.dailyEarnedToday = 0;
      w.lastUpdated = today;
    }
    return w;
  }
  function saveWallet(store, w) { _write(store, WALLET_KEY, w); }

  // 세션 종료 시 runStars를 wallet으로 이전
  // mode: 'daily' | 'endless' → 일일 캡(WALLET_DAILY_CAP) 공유
  //       'collection'        → 테마 완성 일회성 보상, 캡 제외
  // 반환: 실제 적립된 별 수 (캡 초과분 제거됨)
  function earnStarsToWallet(runStars, mode, store) {
    var w = loadWallet(store);
    var earned = 0;
    if (mode === 'daily' || mode === 'endless') {
      // daily + endless 합산 일일 캡
      var room = Math.max(0, WALLET_DAILY_CAP - w.dailyEarnedToday);
      earned = Math.min(runStars, room);
      w.dailyEarnedToday += earned;
    } else {
      // 'collection': 테마 완성 일회성 보상 — 캡 없음
      earned = runStars;
    }
    w.stars += earned;
    w.totalEarned += earned;
    if (w.stars > w.totalEarned - w.totalSpent) w.stars = Math.max(0, w.totalEarned - w.totalSpent);
    saveWallet(store, w);
    return earned;
  }

  function spendStars(amount, store) {
    var w = loadWallet(store);
    if (w.stars < amount) return false;
    w.stars -= amount;
    w.totalSpent += amount;
    saveWallet(store, w);
    return true;
  }

  function getWalletStars(store) {
    return loadWallet(store).stars;
  }

  // ── Rewarded Ad Daily Limit ────────────────────────────────────────
  var AD_KEY = 'earthbeyond_ad_quota';
  var REWARDED_DAILY_LIMIT = 3;

  function loadAdQuota(store) {
    var q = _read(store, AD_KEY);
    var today = new Date().toISOString().slice(0, 10);
    if (!q || q.date !== today) {
      q = { date: today, used: 0 };
    }
    return q;
  }
  function saveAdQuota(store, q) { _write(store, AD_KEY, q); }

  // 리워드 광고 소비 가능 여부 확인. 가능하면 true + 카운트 증가.
  function useRewardedAd(store) {
    var q = loadAdQuota(store);
    if (q.used >= REWARDED_DAILY_LIMIT) return false;
    q.used++;
    saveAdQuota(store, q);
    return true;
  }

  function rewardedAdsLeft(store) {
    var q = loadAdQuota(store);
    return Math.max(0, REWARDED_DAILY_LIMIT - q.used);
  }

  // 광고 실패 시 쿼터 1회 반환
  function refundRewardedAd(store) {
    var q = loadAdQuota(store);
    if (q.used > 0) { q.used--; saveAdQuota(store, q); }
  }

  return {
    N, MAX_RETRIES,
    dailyBoard, loadDaily, addStars, setBestRun, canRetry, useRetry, retriesLeft,
    claimBestToWallet, claimableBest,
    loadWallet, saveWallet, earnStarsToWallet, spendStars, getWalletStars,
    WALLET_KEY, WALLET_DAILY_CAP,
    useRewardedAd, rewardedAdsLeft, refundRewardedAd, REWARDED_DAILY_LIMIT,
    AD_KEY,
  };
});
