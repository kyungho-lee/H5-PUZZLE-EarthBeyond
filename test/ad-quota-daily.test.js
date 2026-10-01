'use strict';
// v0.9.1 (cont-pd-final §6): 리워드 쿼터는 하루 3회 — 판이 바뀌어도 리셋되지 않는다. 키(earthbeyond_ad_quota) 그대로.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../src/daily.js');

test('rewarded quota is per day: 3 uses, then refused until the date changes; same key', () => {
  const store = {};
  assert.strictEqual(D.AD_KEY, 'earthbeyond_ad_quota');
  for (let i = 0; i < D.REWARDED_DAILY_LIMIT; i++) assert.strictEqual(D.useRewardedAd(store), true);
  assert.strictEqual(D.useRewardedAd(store), false);
  assert.strictEqual(D.rewardedAdsLeft(store), 0);
  store[D.AD_KEY] = JSON.stringify({ date: '2000-01-01', used: 3 });      // 어제 기록 → 오늘은 새로
  assert.strictEqual(D.rewardedAdsLeft(store), D.REWARDED_DAILY_LIMIT);
});

test('the shell no longer resets the quota when a Chronicles run starts', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert.ok(!/SG\.Daily\.resetAdQuota\(/.test(html), 'startCollection must not call resetAdQuota (per-run reset bug)');
});
