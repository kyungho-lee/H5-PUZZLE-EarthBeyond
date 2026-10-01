/* session-rules.js — v0.9.1 광고 리듬 · CONTINUE 규칙 (순수 로직, 노드 테스트).
   PD 스펙 §2-3 (체크리스트 #10):
   · CONTINUE 는 광고로 이어하기 없음, 판당 1회 상한. 게임 첫 판만 무료 1회(cont-pd-final), 그 밖에는 별(지갑 + 이번 판 별)
     (디자인 r2 sim: 지층 + CONTINUE 1회 = 1장 클리어 73~82% — 상한이 없으면 25~45% 게이트가 무의미).
   · 전면광고: 최소 90초 간격(세션 시작부터 셈), 세션 첫 게임오버 · 메뉴로 나갈 때 · 장면 공개 직후(3초) 제외.
   UMD: module.exports for node tests, SG.SessionRules in browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.SessionRules = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 광고 리듬 설정 — 값은 여기 한 곳. playgama.js 의 Bridge setMinimumDelayBetweenInterstitial 도 90초.
  const AD_RHYTHM = Object.freeze({
    MIN_GAP_MS: 90000,          // 직전 전면광고(없으면 세션 시작)부터 최소 간격
    AFTER_REVEAL_MS: 3000,      // 장면 공개(모달 · 비차단 발견) 직후 이 시간 안에는 띄우지 않음
    SKIP_FIRST_GAME_OVER: true, // 세션 첫 게임오버에는 띄우지 않음
  });

  // trigger: 'game_over' | 'after_game_over' | 'collapse' | 'menu' | 'play_again'
  function createAdRhythm(opts) {
    const o = opts || {};
    const now = o.now || function () { return Date.now(); };
    const cfg = Object.assign({}, AD_RHYTHM, o.config || {});
    let lastShownAt = now();         // 세션 시작 = 기준점 → 첫 광고는 빨라야 90초 뒤
    let lastRevealAt = -Infinity;
    let gameOvers = 0;

    function decide(trigger) {
      const t = now();
      if (trigger === 'game_over') {
        gameOvers++;
        if (cfg.SKIP_FIRST_GAME_OVER && gameOvers === 1) return { show: false, reason: 'first_game_over' };
      }
      // 결과 화면 뒤 PLAY AGAIN(cont-pd-final §4) — 게임오버는 noteGameOver() 로 이미 셌다
      if (trigger === 'after_game_over' && cfg.SKIP_FIRST_GAME_OVER && gameOvers <= 1) return { show: false, reason: 'first_game_over' };
      if (trigger === 'menu') return { show: false, reason: 'menu' };
      if (t - lastRevealAt < cfg.AFTER_REVEAL_MS) return { show: false, reason: 'after_reveal' };
      if (t - lastShownAt < cfg.MIN_GAP_MS) return { show: false, reason: 'cooldown' };
      return { show: true, reason: 'ok' };
    }
    function noteShown() { lastShownAt = now(); }
    function noteGameOver() { gameOvers++; }
    function noteSceneReveal() { lastRevealAt = now(); }
    return { decide, noteShown, noteSceneReveal, noteGameOver, config: cfg };
  }

  const CONTINUE_CAP_PER_RUN = 1;
  const CONTINUE_COST = 5;

  // 게임오버 화면의 KEEP GOING 버튼 (cont-pd-final §추가 범위 2).
  //  · 판당 1회 상한(cap) — 넘으면 숨김
  //  · 게임 첫 판(Chronicles 1장 runs === 1, 미완료)은 무료 1회 — 광고 아님
  //  · 별 = 지갑 + 이번 판 아직 정산 안 된 별. 모자라면 숨기지 않고 비활성("Earn 5⭐ to keep going")
  //  → { show, enabled, method: 'free'|'stars'|null, reason, cost }
  function continueOffer(s) {
    const o = s || {};
    const used = o.usedThisRun || 0;
    const cost = o.cost != null ? o.cost : CONTINUE_COST;
    const stars = (o.wallet || 0) + (o.runStars || 0);
    if (used >= CONTINUE_CAP_PER_RUN) return { show: false, enabled: false, method: null, reason: 'cap', cost: cost };
    if (!(o.removable > 0)) return { show: false, enabled: false, method: null, reason: 'nothing_to_clear', cost: cost };
    if (o.firstRunEver) return { show: true, enabled: true, method: 'free', reason: 'ok', cost: 0 };
    if (stars < cost) return { show: true, enabled: false, method: 'stars', reason: 'no_stars', cost: cost };
    return { show: true, enabled: true, method: 'stars', reason: 'ok', cost: cost };
  }

  // 별 결제 분배 — 이번 판 별(아직 지갑에 안 들어감)을 먼저 쓰고, 모자라면 지갑에서.
  function splitContinueCost(cost, runStars, wallet) {
    const fromRun = Math.min(cost, Math.max(0, runStars || 0));
    const fromWallet = cost - fromRun;
    if (fromWallet > (wallet || 0)) return null;
    return { fromRun: fromRun, fromWallet: fromWallet };
  }

  // 표시 없는 연패 보정 (cont-pd-final §추가 범위 3): 같은 장 2연패 → 다음 판부터 생성 한 단계 위, 장 클리어로 해제.
  // 세션 메모리만(저장 안 함 — 새로고침하면 처음부터 셈).
  const ASSIST_AFTER_LOSSES = 2;
  function createLossStreak() {
    const n = Object.create(null);
    return {
      noteLoss: function (ch) { n[ch] = (n[ch] || 0) + 1; },
      noteClear: function (ch) { n[ch] = 0; },
      losses: function (ch) { return n[ch] || 0; },
      assist: function (ch) { return (n[ch] || 0) >= ASSIST_AFTER_LOSSES; },
    };
  }
  // graded 표를 한 단계 위로(모든 생성 크기 ×2). null(always1) → 항상 2.
  function assistTiers(tiers) {
    if (!tiers) return [{ maxAtMost: Infinity, dist: [[2, 1]] }];
    return tiers.map(function (t) {
      return { maxAtMost: t.maxAtMost, dist: t.dist.map(function (d) { return [d[0] * 2, d[1]]; }) };
    });
  }

  // 게임오버 문구 (cont-pd-final §추가 범위 4). sizes = 장의 단계별 크기, acquired = 얻은 크기들, best = 이번 판 최고 칸.
  //  · "7 of 11 kept · Next: reach 128"  · 이번 판 최고가 다음 크기의 절반 이상이면 "So close — 64 of 128"
  function gameOverCopy(o) {
    const sizes = (o && o.sizes) || [];
    const acq = (o && o.acquired) || [];
    const kept = sizes.filter(function (sz) { return acq.indexOf(sz) !== -1; }).length;
    const next = sizes.find(function (sz) { return acq.indexOf(sz) === -1; });
    const best = (o && o.best) || 0;
    const ko = o && o.lang === 'ko';
    const keptLine = ko ? ('장면 ' + kept + ' / ' + sizes.length + ' 보관됨') : (kept + ' of ' + sizes.length + ' kept');
    if (next == null) return { kept: kept, next: null, soClose: false, line1: keptLine, line2: '' };
    const soClose = best * 2 >= next && best < next;
    const line2 = soClose
      ? (ko ? ('거의 다 왔어요 — ' + best + ' / ' + next) : ('So close — ' + best + ' of ' + next))
      : (ko ? ('다음: ' + next + ' 만들기') : ('Next: reach ' + next));
    return { kept: kept, next: next, soClose: soClose, line1: keptLine, line2: line2 };
  }

  return { AD_RHYTHM, createAdRhythm, CONTINUE_CAP_PER_RUN, CONTINUE_COST, continueOffer, splitContinueCost,
           ASSIST_AFTER_LOSSES, createLossStreak, assistTiers, gameOverCopy };
});
