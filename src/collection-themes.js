// src/collection-themes.js — Earth & Beyond collection theme definitions
//
// 시대 체인: Era 1 → Era 2 → Era 3 → (계속 확장)
//   각 시대 = 11단계 이미지팩. 1024 머지로 시대 완성 → 다음 시대 해금.
//
// 에셋 제작 규격:
//   WebP 256×256px, 투명배경, ≤20KB/장
//   SVG placeholder → 정식 WebP 완성 시 ext만 교체
//   폴더: src/themes/<era-id>/step-01.webp ~ step-11.webp
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

  root.SG.CollectionThemes = [

    // ── Era 1: PRIMORDIAL EARTH ──────────────────────────────────────
    // 빅뱅 잔해 → 지구 탄생 → 생명 → 공룡 → 포유류 전야
    {
      id: 'primordial-earth',
      label: 'PRIMORDIAL EARTH',
      description: 'From cosmic dust to the dawn of life',
      era: 1,
      unlockCondition: null,          // 첫 시대 — 처음부터 해금
      showStepBadge: true,
      svgPaths: makePaths('primordial-earth', 'svg'),
      // 정식 에셋 완성 후: makePaths('primordial-earth', 'webp')
    },

    // ── Era 2: HUMAN CIVILIZATION ───────────────────────────────────
    // 석기 → 고대문명 → 과학혁명 → 산업혁명 → 아폴로
    {
      id: 'human-civilization',
      label: 'HUMAN CIVILIZATION',
      description: 'From stone tools to reaching the stars',
      era: 2,
      unlockCondition: 'primordial-earth',
      showStepBadge: true,
      svgPaths: makePaths('human-civilization', 'svg'),
    },

    // ── Era 3: SOLAR SYSTEM ─────────────────────────────────────────
    // 달 → 화성 → 목성(카시니) → 토성 → 명왕성 → 태양 → 성간공간
    // 실사 모티브: NASA Voyager / Cassini / New Horizons / SOHO
    {
      id: 'solar-system',
      label: 'SOLAR SYSTEM',
      description: 'Exploring our cosmic neighbourhood',
      era: 3,
      unlockCondition: 'human-civilization',
      showStepBadge: true,
      svgPaths: makePaths('solar-system', 'svg'),
      // 정식 에셋: NASA 탐사선 실사 모티브 WebP
    },

  ];

  // 에셋 제작 참고 — 각 시대 11단계 장면 목록
  // Era 1 — Primordial Earth
  //   01: 성간 먼지 & 분자운       / Stardust & Molecular Cloud
  //   02: 원시 태양계 원반          / Protoplanetary Disk
  //   03: 용암 지구 (마그마 오션)   / Magma Ocean Earth
  //   04: 달 형성 (테이아 충돌)     / Moon-forming Impact
  //   05: 원시 해양 탄생            / First Oceans
  //   06: 최초 생명 (스트로마톨라이트) / Stromatolites
  //   07: 산소 대폭발 / 눈덩이 지구  / Great Oxidation Event
  //   08: 캄브리아 대폭발           / Cambrian Explosion
  //   09: 공룡의 시대 (쥐라기)      / Age of Dinosaurs
  //   10: 소행성 충돌 대멸종        / K-Pg Extinction
  //   11: 포유류의 시대 ✨           / Rise of Mammals
  //
  // Era 2 — Human Civilization
  //   01: 석기 & 동굴벽화           / Stone Age Cave Art
  //   02: 농업 혁명                 / Agricultural Revolution
  //   03: 고대 문명 (이집트/메소포타미아) / Ancient Civilizations
  //   04: 그리스/로마 철학·과학     / Classical Antiquity
  //   05: 대항해 시대               / Age of Exploration
  //   06: 과학 혁명 (뉴턴/갈릴레오) / Scientific Revolution
  //   07: 산업 혁명                 / Industrial Revolution
  //   08: 전기 & 통신 시대          / Electrical Age
  //   09: 원자력 & 세계대전         / Atomic Age
  //   10: 디지털 혁명               / Digital Revolution
  //   11: 아폴로 — 달 착륙 ✨        / Apollo Moon Landing
  //
  // Era 3 — Solar System
  //   01: 달 표면 (아폴로 발자국)   / Moon Surface
  //   02: 화성 표면 (로버)          / Mars Surface — Perseverance
  //   03: 목성 대적점               / Jupiter Great Red Spot — Juno
  //   04: 토성 고리                 / Saturn's Rings — Cassini
  //   05: 타이탄 (메탄 바다)        / Titan's Methane Lakes
  //   06: 유로파 (얼음 표면)        / Europa Ice Shell
  //   07: 명왕성 하트 지형          / Pluto Heart — New Horizons
  //   08: 태양 코로나               / Solar Corona — SOHO
  //   09: Pale Blue Dot             / Earth from Voyager 1
  //   10: 성간 공간 진입            / Interstellar Space — Voyager 1
  //   11: 오르트 구름 경계 ✨        / Oort Cloud — Edge of Solar System

})(typeof window !== 'undefined' ? window : global);
