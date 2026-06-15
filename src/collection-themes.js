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
    {
      id: 'primordial-earth',
      label: 'PRIMORDIAL EARTH',
      description: 'From cosmic dust to the dawn of life',
      era: 1,
      unlockCondition: null,
      showStepBadge: true,
      svgPaths: makePaths('primordial-earth', 'webp'),
      boardBg: 'themes/primordial-earth/board-bg.webp',
      // slotBg1: 'themes/primordial-earth/slot-bg01.webp',
      // slotBg2: 'themes/primordial-earth/slot-bg02.webp',
      chapter: {
        number: 1,
        title: 'Primordial Earth',
        tagline: '138억 년 전, 먼지와 가스가 중력에 이끌려 모이기 시작했다.',
        completeMessage: '생명의 씨앗이 뿌리를 내렸다. 포유류의 시대가 열린다.',
      },
      stepDescriptions: [
        '성간 먼지와 분자 구름 — 138억 년 전, 빅뱅의 잔해가 우주를 떠돌았다.',
        '원시 태양계 원반 — 먼지와 가스가 소용돌이치며 태양계의 씨앗이 되었다.',
        '마그마 오션 지구 — 갓 태어난 지구는 표면 전체가 용암 바다였다.',
        '달 형성 충돌 — 테이아가 지구에 충돌해 파편이 모여 달이 탄생했다.',
        '원시 바다의 탄생 — 증기가 식으며 지구 최초의 바다가 출렁이기 시작했다.',
        '최초의 생명 — 스트로마톨라이트, 얕은 바다에서 생명이 첫 발자국을 남겼다.',
        '산소 대폭발 — 미생물들이 산소를 뿜어내며 지구 대기를 바꾸어 놓았다.',
        '캄브리아 대폭발 — 5억 4천만 년 전, 복잡한 생명체들이 폭발적으로 등장했다.',
        '공룡의 시대 — 거대한 생명체들이 지구를 누비던 쥐라기의 절정.',
        '소행성 충돌 — 충돌의 충격파가 공룡 시대의 막을 내렸다.',
        '포유류의 시대 — 살아남은 자들이 새벽빛 아래 새로운 세계를 열었다.',
      ],
    },

    // ── Era 2: HUMAN CIVILIZATION ───────────────────────────────────
    {
      id: 'human-civilization',
      label: 'HUMAN CIVILIZATION',
      description: 'From stone tools to reaching the stars',
      era: 2,
      unlockCondition: 'primordial-earth',
      showStepBadge: true,
      svgPaths: makePaths('human-civilization', 'webp'),
      boardBg: 'themes/human-civilization/board-bg.webp',
      // slotBg1: 'themes/human-civilization/slot-bg01.webp',
      // slotBg2: 'themes/human-civilization/slot-bg02.webp',
      chapter: {
        number: 2,
        title: 'Human Civilization',
        tagline: '돌 하나를 깎던 손이 마침내 달에 발자국을 남겼다.',
        completeMessage: '인류는 지구를 넘어 우주로 나아갔다. 탐험은 계속된다.',
      },
      stepDescriptions: [
        '석기 시대 — 인류는 돌을 깎아 도구를 만들고 동굴 벽에 이야기를 새겼다.',
        '농업 혁명 — 씨앗을 땅에 심는 순간, 인류는 정착 문명의 길에 들어섰다.',
        '고대 문명 — 나일 강과 메소포타미아에서 피라미드와 도시가 하늘을 향해 솟았다.',
        '그리스·로마 — 이성과 법으로 세계를 이해하려 한 철학과 과학의 시대.',
        '대항해 시대 — 범선이 수평선을 넘어 미지의 대륙을 향해 나아갔다.',
        '과학 혁명 — 사과 하나가 떨어지는 순간, 우주를 지배하는 법칙이 드러났다.',
        '산업 혁명 — 증기의 힘이 인간의 노동을 대체하며 세상을 뒤바꾸었다.',
        '전기 시대 — 에디슨의 전구 하나가 밤을 낮으로 만들어 버렸다.',
        '원자력 시대 — 원자의 힘을 손에 쥔 인류는 가장 위험한 선택 앞에 섰다.',
        '디지털 혁명 — 회로 위를 흐르는 전자들이 인류를 하나로 연결했다.',
        '달 착륙 — 1969년 7월, 인류의 발자국이 달 표면에 새겨졌다.',
      ],
    },

    // ── Era 3: SOLAR SYSTEM ─────────────────────────────────────────
    {
      id: 'solar-system',
      label: 'SOLAR SYSTEM',
      description: 'Exploring our cosmic neighbourhood',
      era: 3,
      unlockCondition: 'human-civilization',
      showStepBadge: true,
      svgPaths: makePaths('solar-system', 'webp'),
      boardBg: 'themes/solar-system/board-bg.webp',
      // slotBg1: 'themes/solar-system/slot-bg01.webp',
      // slotBg2: 'themes/solar-system/slot-bg02.webp',
      chapter: {
        number: 3,
        title: 'Solar System',
        tagline: '탐사선이 태양계 끝을 향해 날아간다. 우리는 그 눈으로 우주를 본다.',
        completeMessage: '태양계의 끝에서 지구를 돌아보면, 창백한 푸른 점 하나가 보인다.',
      },
      stepDescriptions: [
        '수성 — 태양에 가장 가까운 행성, 극단의 온도차가 존재하는 세계.',
        '금성 — 두꺼운 대기가 열을 가두어 태양계에서 가장 뜨거운 행성이 되었다.',
        '지구 — 생명이 숨쉬는 유일한 행성, 우주에서 바라본 푸른 구슬.',
        '화성 — 붉은 사막과 올림푸스 화산, 인류 다음 발자국이 닿을 땅.',
        '목성 — 대적점이라 불리는 300년 된 폭풍이 지구보다 크게 소용돌이친다.',
        '토성 — 얼음과 암석으로 이루어진 장엄한 고리가 행성을 감싸고 있다.',
        '천왕성 — 옆으로 누워 공전하는 얼음 행성, 창백한 청록빛의 세계.',
        '해왕성 — 태양계 끝의 차가운 거인, 시속 2100km의 폭풍이 몰아친다.',
        '명왕성 — 하트 모양 빙원을 품은 왜소행성, 뉴호라이즌스가 처음 그 모습을 보여주었다.',
        '태양 — 모든 생명의 근원, 1초에 수소 6억 톤을 헬륨으로 바꾸며 빛난다.',
        '태양계 전체 — 보이저 1호의 시선으로 바라본 우리의 작은 우주 마을.',
      ],
    },

  ];

})(typeof window !== 'undefined' ? window : global);
