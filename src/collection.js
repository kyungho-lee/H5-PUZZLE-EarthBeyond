// src/collection.js — SG.Collection state CRUD (UMD)
//
// 수집 구조:
//   - 각 테마는 N단계 이미지로 구성 (테마별로 단계 수가 다를 수 있음)
//   - 각 step은 특정 머지 크기와 1:1 대응
//   - 보드에서 해당 크기를 머지로 처음 생성하면 → step 이미지 획득
//   - 마지막 단계 머지 = 테마 완성 트리거 → 다음 테마 해금
//
// 테마별 단계 커스터마이징:
//   collection-themes.js의 테마 객체에 stepSizes 배열을 지정하면
//   해당 테마만 다른 단계 수/크기로 동작한다.
//   stepSizes 미지정 시 DEFAULT_STEP_SIZES(전역 기본값) 사용.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SG = root.SG || {}; root.SG.Collection = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var META_KEY = 'earthbeyond_collection_meta';

  // 기본 단계 크기 — 테마에 stepSizes가 없을 때 사용하는 전역 기본값.
  // 새 단계를 전체 테마에 추가하려면 여기에 size를 넣는다.
  // 특정 테마만 다른 단계를 쓰려면 collection-themes.js의 테마 객체에
  // stepSizes: [1,2,4,...,N] 를 직접 정의한다.
  var DEFAULT_STEP_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

  // STEP_COUNT / FINAL_SIZE / SIZE_TO_STEP 은 테마 기준으로 동적 계산.
  // 하위호환: SG.Collection.STEP_SIZES / STEP_COUNT 는 기본값을 노출 (collection-themes.js용).
  var STEP_COUNT = DEFAULT_STEP_SIZES.length;

  // 테마 객체(또는 null)를 받아 해당 테마의 stepSizes를 반환.
  function _themeSizes(theme) {
    return (theme && theme.stepSizes && theme.stepSizes.length)
      ? theme.stepSizes
      : DEFAULT_STEP_SIZES;
  }

  // 테마의 SIZE_TO_STEP 맵 생성 (매 호출마다 재계산 — 테마 수가 적어 성능 무관).
  function _sizeToStep(theme) {
    var sizes = _themeSizes(theme);
    var m = {};
    for (var i = 0; i < sizes.length; i++) m[sizes[i]] = i + 1;
    return m;
  }

  // 테마의 완성 트리거 size (stepSizes 마지막 요소).
  function _finalSize(theme) {
    var sizes = _themeSizes(theme);
    return sizes[sizes.length - 1];
  }

  // collapseSize: 보드 리셋 트리거 size.
  // 테마의 finalSize와 같아야 함 — startCollection()에서 이 값을 dailyOpts에 주입.
  function getCollapseSize(theme) {
    return _finalSize(theme);
  }

  function _key(themeId) { return 'earthbeyond_collection_' + themeId; }
  function _read(store, k) {
    try { return JSON.parse(store.getItem(k)); } catch (_) { return null; }
  }
  function _write(store, k, v) {
    try { store.setItem(k, JSON.stringify(v)); } catch (_) {}
  }

  // ── Meta ──────────────────────────────────────────────────────────
  function loadMeta(store) {
    var saved = _read(store, META_KEY);
    if (!saved) {
      return {
        activeThemeId: 'neon-digits',
        unlockedThemes: ['neon-digits'],
        completedThemes: [],
      };
    }
    if (!saved.unlockedThemes) saved.unlockedThemes = [saved.activeThemeId || 'neon-digits'];
    if (!saved.completedThemes) saved.completedThemes = [];
    return saved;
  }
  function saveMeta(store, meta) { _write(store, META_KEY, meta); }

  // ── 테마 진행도 ───────────────────────────────────────────────────
  // theme: SG.CollectionThemes 배열의 테마 객체 (stepSizes 참조용). null이면 기본값 사용.
  function loadTheme(themeId, store, theme) {
    var sizes = _themeSizes(theme);
    var saved = _read(store, _key(themeId));
    if (!saved) {
      return {
        themeId: themeId,
        acquiredSizes: [],
        acquiredSteps: [],
        newSizes: [],
        claimedSizes: [],
        status: 'active',
        completedAt: null,
      };
    }
    // 구 포맷(chainCount/unlockedSteps) → 신 포맷 마이그레이션
    if (!saved.acquiredSteps) {
      saved.acquiredSteps = saved.unlockedSteps || [];
      saved.acquiredSizes = (saved.unlockedSteps || []).map(function (step) {
        return sizes[step - 1];
      }).filter(Boolean);
    }
    if (!saved.acquiredSizes) saved.acquiredSizes = [];
    if (!saved.newSizes) saved.newSizes = [];
    if (!saved.claimedSizes) saved.claimedSizes = [];
    // 완성된 테마는 갤러리 전 단계를 채워 표시 (단계 수 확장 시 빈 칸 방지).
    if (saved.status === 'completed') {
      for (var i = 0; i < sizes.length; i++) {
        var sz = sizes[i];
        if (saved.acquiredSizes.indexOf(sz) === -1) saved.acquiredSizes.push(sz);
        if (saved.acquiredSteps.indexOf(i + 1) === -1) saved.acquiredSteps.push(i + 1);
      }
    }
    return saved;
  }
  function saveTheme(store, state) { _write(store, _key(state.themeId), state); }

  // ── step-01(size 1) 자동 획득 ─────────────────────────────────────
  function grantStartStep(themeId, store, theme) {
    var state = loadTheme(themeId, store, theme);
    if (state.status === 'completed') return null;
    if (state.acquiredSizes.indexOf(1) !== -1) return null;
    state.acquiredSizes.push(1);
    if (state.acquiredSteps.indexOf(1) === -1) state.acquiredSteps.push(1);
    if (state.newSizes.indexOf(1) === -1) state.newSizes.push(1);
    saveTheme(store, state);
    return { step: 1, size: 1 };
  }

  // ── 갤러리: NEW 확인 + 스타 보상 수령 ─────────────────────────────
  function claimStep(themeId, size, store, theme) {
    var state = loadTheme(themeId, store, theme);
    var wasNew = state.newSizes.indexOf(size) !== -1;
    var starAwarded = false;
    if (wasNew) {
      state.newSizes = state.newSizes.filter(function (s) { return s !== size; });
    }
    if (state.acquiredSizes.indexOf(size) !== -1 && state.claimedSizes.indexOf(size) === -1) {
      state.claimedSizes.push(size);
      starAwarded = true;
    }
    if (wasNew || starAwarded) saveTheme(store, state);
    return { wasNew: wasNew, starAwarded: starAwarded };
  }

  function hasNew(themeId, store, theme) {
    var state = loadTheme(themeId, store, theme);
    return state.newSizes && state.newSizes.length > 0;
  }

  // ── 머지 기록 ─────────────────────────────────────────────────────
  // theme: 현재 활성 테마 객체 (stepSizes 참조용)
  function recordMerges(themeId, mergedSizes, store, themes, theme) {
    var sizeToStep = _sizeToStep(theme);
    var finalSize = _finalSize(theme);
    var state = loadTheme(themeId, store, theme);
    if (state.status === 'completed') return { newSteps: [], isComplete: true };

    var newSteps = [];
    var isComplete = false;

    (mergedSizes || []).forEach(function (size) {
      var step = sizeToStep[size];
      if (!step) return;
      if (state.acquiredSizes.indexOf(size) !== -1) return;
      state.acquiredSizes.push(size);
      if (state.acquiredSteps.indexOf(step) === -1) state.acquiredSteps.push(step);
      if (state.newSizes.indexOf(size) === -1) state.newSizes.push(size);
      newSteps.push({ step: step, size: size });
      if (size === finalSize) isComplete = true;
    });

    if (newSteps.length === 0) return { newSteps: [], isComplete: false };

    if (isComplete) {
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
    }
    saveTheme(store, state);
    return { newSteps: newSteps, isComplete: isComplete };
  }

  // ── 다음 테마 해금 ────────────────────────────────────────────────
  function unlockNextTheme(completedThemeId, store, themes) {
    var meta = loadMeta(store);
    var next = themes && themes.find(function (t) { return t.unlockCondition === completedThemeId; });
    if (!next) return null;
    if (meta.unlockedThemes.indexOf(next.id) === -1) meta.unlockedThemes.push(next.id);
    if (meta.completedThemes.indexOf(completedThemeId) === -1) meta.completedThemes.push(completedThemeId);
    meta.activeThemeId = next.id;
    saveMeta(store, meta);
    return next.id;
  }

  // ── 테마 즉시 해금 (별 사용처) ────────────────────────────────────
  function forceUnlockTheme(themeId, store, themes) {
    var theme = themes && themes.find(function (t) { return t.id === themeId; });
    if (!theme) return null;
    var meta = loadMeta(store);
    if (meta.unlockedThemes.indexOf(themeId) !== -1) return null;
    meta.unlockedThemes.push(themeId);
    saveMeta(store, meta);
    return themeId;
  }

  // ── devResetAll 지원 ──────────────────────────────────────────────
  function getAllKeys(store) {
    var keys = [];
    try {
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i);
        if (k && k.indexOf('earthbeyond_collection') === 0) keys.push(k);
      }
    } catch (_) {}
    return keys;
  }

  return {
    // 기본값 노출 (collection-themes.js의 stepCount() 참조용)
    STEP_SIZES: DEFAULT_STEP_SIZES,
    STEP_COUNT: STEP_COUNT,
    FINAL_SIZE: DEFAULT_STEP_SIZES[DEFAULT_STEP_SIZES.length - 1],
    // 전역 SIZE_TO_STEP은 기본값만 — 테마별 맵은 _sizeToStep(theme) 사용
    SIZE_TO_STEP: (function () {
      var m = {};
      for (var i = 0; i < DEFAULT_STEP_SIZES.length; i++) m[DEFAULT_STEP_SIZES[i]] = i + 1;
      return m;
    })(),
    // 테마별 동적 헬퍼
    getCollapseSize: getCollapseSize,
    getThemeStepCount: function (theme) { return _themeSizes(theme).length; },
    getThemeSizes: _themeSizes,
    // CRUD
    loadMeta, saveMeta, loadTheme, saveTheme,
    recordMerges, grantStartStep, claimStep, hasNew,
    unlockNextTheme, forceUnlockTheme, getAllKeys,
  };
});
