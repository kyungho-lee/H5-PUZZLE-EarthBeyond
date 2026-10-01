// src/strata.js — 지층(Strata) 최소판 규칙 (UMD · 순수 함수 · 의존성 없음)
//
// 규칙 (Chronicles 1·2·3장, 창 6/7/7 — cont-pd-final.md 승인. Daily · Endless 는 꺼짐):
//   - 판 최고(best)가 올라 threshold = best >> 창 이 오르면,
//     size < threshold 인 칸은 화석이 되어 정리된다(셸이 기존 playClearFx 로 보여 준다).
//   - 새로 나오는 블록 크기도 오른다: spawnSize = max(1, best >> (창 - 1 - shift)).
//     shift = 연패 보정: 같은 장 2연속 게임오버 뒤 다음 판 1(표시 없음, 클리어하면 해제, 세션 한정).
//     엔진(neon-drift.js)은 손대지 않는다 — gradedTiers() 표를 opts.gradedTiers 에 넣으면
//     엔진의 기존 graded 스폰이 같은 값을 낸다(보드 최고 = 판 최고: 화석은 최고 칸을 지우지 않는다).
//   - Storage 키를 쓰지 않는다. 판 상태(ctx.base)는 메모리에만 있다.
// 근거 sim: scripts/sim-strata.mjs · docs/sandbox-kpi-debate/strata-gate.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();   // node test / sim
  else { root.EBStrata = factory(); }                                             // browser: window.EBStrata
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WINDOW = 6;   // 기본 창(장 지정이 없을 때 · 1장)
  // 장별 창 — cont-pd-final.md(감독 승인): 6/7/7. 2·3장 창 7은 연패 보정과 한 묶음(없으면 초보 엔딩 10%).
  var WINDOWS = { 'primordial-earth': 6, 'human-civilization': 7, 'solar-system': 7 };
  // 켜진 장 목록. 끄는 스위치: EBStrata.CHAPTERS.length = 0
  var CHAPTERS = ['primordial-earth', 'human-civilization', 'solar-system'];
  var ASSIST_AFTER_LOSSES = 2;   // 같은 장 연속 게임오버 수 → 다음 판 생성 크기 한 단계 위(표시 없음)

  function enabledFor(chapterId) {
    return CHAPTERS.indexOf(chapterId) !== -1;
  }

  function windowFor(chapterId) {
    return WINDOWS[chapterId] || WINDOW;
  }

  // 화석 경계: 이 크기 미만은 정리 대상. win 생략 = 6.
  function threshold(best, win) {
    return Math.max(1, (best | 0) >> (win || WINDOW));
  }

  // 새 블록 크기(결정적). shift = 연패 보정 단계(0|1).
  function spawnSize(best, win, shift) {
    return Math.max(1, (best | 0) >> Math.max(0, (win || WINDOW) - 1 - (shift || 0)));
  }

  // neon-drift gradedSpawnSize 용 표. 인자: 생략(창 6) | 장 id | newRun() ctx(창 + 연패 보정 반영).
  // tier k: mx <= 2^(win-1-shift+k) → size 2^k  (k = 0..10)
  function gradedTiers(arg) {
    var win = WINDOW, shift = 0;
    if (typeof arg === 'string') win = windowFor(arg);
    else if (arg && typeof arg === 'object') { win = arg.window || WINDOW; shift = arg.shift || 0; }
    var t = [];
    for (var k = 0; k <= 10; k++) {
      t.push({ maxAtMost: Math.pow(2, win - 1 - shift + k), dist: [[Math.pow(2, k), 1]] });
    }
    return t;
  }

  function maxSize(grid) {
    var m = 1;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[r].length; c++) {
      var t = grid[r][c];
      if (t && t.size > m) m = t.size;
    }
    return m;
  }

  // size < threshold(best, win) 인 칸 좌표.
  function fossilCells(grid, best, win) {
    var th = threshold(best, win);
    var out = [];
    if (th <= 1) return out;
    for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[r].length; c++) {
      var t = grid[r][c];
      if (t && t.size < th) out.push([r, c]);
    }
    return out;
  }

  // ── 연패 보정(세션 한정 · 메모리만 · Storage 없음) ─────────────────
  var _losses = {};   // chapterId → 연속 게임오버 수
  // 판이 끝날 때 1번: outcome = 'game_over' | 'chapter_clear' | 'quit'(중도 이탈은 세지 않음)
  function noteRunEnd(chapterId, outcome) {
    if (outcome === 'chapter_clear') _losses[chapterId] = 0;
    else if (outcome === 'game_over') _losses[chapterId] = (_losses[chapterId] || 0) + 1;
  }
  function lossStreak(chapterId) { return _losses[chapterId] || 0; }
  function assistShift(chapterId) { return lossStreak(chapterId) >= ASSIST_AFTER_LOSSES ? 1 : 0; }
  function resetSession() { _losses = {}; }

  // 판 시작 때 1개 만든다. 창 · 연패 보정은 판 시작 시점에 고정된다.
  function newRun(chapterId) {
    var on = enabledFor(chapterId);
    return { enabled: on, chapterId: chapterId, window: windowFor(chapterId),
             shift: on ? assistShift(chapterId) : 0, base: 1, steps: 0 };
  }

  // 매 수 뒤(보드 확정 후, 게임오버 판정 전) 호출. best 를 생략하면 보드 최고를 쓴다.
  // grid 는 바꾸지 않는다. 경계가 올랐을 때만 fossils 가 찬다.
  //   → { fossils:[[r,c]...], spawnBase, threshold, advanced }
  function onNewBest(grid, best, ctx) {
    if (best == null) best = maxSize(grid);
    var win = (ctx && ctx.window) || WINDOW;
    var th = threshold(best, win);
    var res = { fossils: [], spawnBase: spawnSize(best, win, ctx && ctx.shift), threshold: th, advanced: false };
    if (!ctx || !ctx.enabled) { res.spawnBase = 1; res.threshold = 1; return res; }
    if (th > ctx.base) {
      ctx.base = th;
      ctx.steps++;
      res.advanced = true;
      res.fossils = fossilCells(grid, best, win);
    }
    return res;
  }

  // 셸 편의: 좌표 칸을 비운다(제자리 변경). 반환 = 비운 칸 수.
  function clearCells(grid, cells) {
    var n = 0;
    for (var i = 0; i < cells.length; i++) {
      var p = cells[i];
      if (grid[p[0]] && grid[p[0]][p[1]]) { grid[p[0]][p[1]] = null; n++; }
    }
    return n;
  }

  // 토스트 문구(첫 화석 정리 때 1회).
  function describe(lang) {
    return lang === 'ko'
      ? '시간이 흐릅니다 — 오래된 블록이 화석이 되어 가라앉아요'
      : 'Time moves on — ancient blocks sink as fossils';
  }

  return {
    WINDOW: WINDOW, WINDOWS: WINDOWS, CHAPTERS: CHAPTERS, ASSIST_AFTER_LOSSES: ASSIST_AFTER_LOSSES,
    enabledFor: enabledFor, windowFor: windowFor, threshold: threshold, spawnSize: spawnSize, gradedTiers: gradedTiers,
    fossilCells: fossilCells, newRun: newRun, onNewBest: onNewBest, clearCells: clearCells,
    noteRunEnd: noteRunEnd, lossStreak: lossStreak, assistShift: assistShift, resetSession: resetSession,
    describe: describe,
  };
});
