// src/collection-themes.js — Earth & Beyond collection theme definitions
//
// 텍스트(label, description, chapter, stepDescriptions)는 src/i18n.js에서 관리.
// 이 파일은 에셋 경로·게임 메카닉 설정만 보유.
// 텍스트 접근: SG.i18n.themeText(themeId) 또는 SG.i18n.t('themes.<id>.chapter.title')
(function (root) {
  'use strict';
  root.SG = root.SG || {};

  function stepCount() {
    return (root.SG.Collection && root.SG.Collection.STEP_COUNT) || 11;
  }
  function makePaths(id, ext, count) {
    var e = ext || 'svg';
    var n = count || stepCount();
    return Array.from({ length: n }, function (_, i) {
      return 'themes/' + id + '/step-' + String(i + 1).padStart(2, '0') + '.' + e;
    });
  }
  // Chronicles: 스텝별 배경 이미지 경로 (bg-step-01.webp ~ bg-step-11.webp)
  function makeBgPaths(id) {
    var n = stepCount();
    return Array.from({ length: n }, function (_, i) {
      return 'themes/' + id + '/bg-step-' + String(i + 1).padStart(2, '0') + '.webp';
    });
  }

  // i18n 텍스트를 테마 객체에 주입하는 헬퍼
  // collection-themes.js 로드 시점에는 i18n이 아직 없을 수 있으므로 lazy getter 사용
  function withText(themeId, assetConfig) {
    return Object.defineProperties(assetConfig, {
      label:            { get: function () { return _t(themeId, 'label'); },       enumerable: true },
      description:      { get: function () { return _t(themeId, 'description'); }, enumerable: true },
      chapter:          { get: function () { return _chapter(themeId); },          enumerable: true },
      stepDescriptions: { get: function () { return _steps(themeId); },            enumerable: true },
    });
  }

  function _t(themeId, field) {
    try { return root.SG.i18n.t('themes.' + themeId + '.' + field); } catch (_) { return themeId; }
  }
  function _chapter(themeId) {
    try {
      var text = root.SG.i18n.themeText(themeId);
      return text ? text.chapter : null;
    } catch (_) { return null; }
  }
  function _steps(themeId) {
    try {
      var text = root.SG.i18n.themeText(themeId);
      return text ? text.stepDescriptions : [];
    } catch (_) { return []; }
  }

  root.SG.CollectionThemes = [

    // ── Era 1: PRIMORDIAL EARTH ──────────────────────────────────────
    withText('primordial-earth', {
      id: 'primordial-earth',
      era: 1,
      unlockCondition: null,
      showStepBadge: true,
      svgPaths: makePaths('primordial-earth', 'webp'),
      boardBg:  'themes/primordial-earth/board-bg.webp',
      stepBgs:  makeBgPaths('primordial-earth'),
    }),

    // ── Era 2: HUMAN CIVILIZATION ───────────────────────────────────
    withText('human-civilization', {
      id: 'human-civilization',
      era: 2,
      unlockCondition: 'primordial-earth',
      showStepBadge: true,
      svgPaths: makePaths('human-civilization', 'webp'),
      boardBg:  'themes/human-civilization/board-bg.webp',
      stepBgs:  makeBgPaths('human-civilization'),
    }),

    // ── Era 3: SOLAR SYSTEM ─────────────────────────────────────────
    withText('solar-system', {
      id: 'solar-system',
      era: 3,
      unlockCondition: 'human-civilization',
      showStepBadge: true,
      svgPaths: makePaths('solar-system', 'webp'),
      boardBg:  'themes/solar-system/board-bg.webp',
      stepBgs:  makeBgPaths('solar-system'),
    }),

  ];

})(typeof window !== 'undefined' ? window : global);
