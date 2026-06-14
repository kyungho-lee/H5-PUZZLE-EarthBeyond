# Collection Mode + Game Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collection 모드(체인 기반 도감 수집), 게임 경제(Wallet + 별 2-tier), 광고 연동을 구현한다.

**Architecture:** `collection.js`(UMD 상태 CRUD) + `collection-themes.js`(데이터) 신규 파일로 로직을 분리하고, `index.html` 인라인 스크립트에 `collectionMode` 분기 + `_collapseShared()` 공통 추출을 추가한다. `daily.js`에 `earnStarsToWallet` + wallet helpers를 추가해 별 2-tier를 구현한다.

**Tech Stack:** Vanilla JS (UMD), localStorage, Firebase Firestore v8 compat, SVG (외부 파일 lazy fetch)

---

## File Map

| 파일 | 역할 | 상태 |
|---|---|---|
| `src/collection.js` | SG.Collection — 체인/테마 상태 CRUD (UMD) | 신규 |
| `src/collection-themes.js` | SG.CollectionThemes — 테마 데이터 배열 | 신규 |
| `src/themes/neon-city/step-01~10.svg` | NEON CITY 단계별 SVG 플레이스홀더 | 신규 |
| `src/themes/cyber-ocean/step-01~10.svg` | CYBER OCEAN 단계별 SVG 플레이스홀더 | 신규 |
| `src/daily.js` | earnStarsToWallet + wallet _read/_write 추가 | 수정 |
| `src/firebase.js` | submitScore: themeId를 mode key에 포함 (이미 지원됨) | 확인 |
| `src/index.html` | collectionMode 상태, _collapseShared, collectionCollapse, startCollection, 오버레이 3개, 버튼 1개 추가 | 수정 |

---

## Task 1: collection-themes.js 신규 생성

**Files:**
- Create: `src/collection-themes.js`

- [ ] **Step 1: 파일 생성**

```js
// src/collection-themes.js
(function (root) {
  'use strict';
  root.SG = root.SG || {};

  function makePaths(id) {
    return Array.from({ length: 10 }, function (_, i) {
      return 'themes/' + id + '/step-' + String(i + 1).padStart(2, '0') + '.svg';
    });
  }

  root.SG.CollectionThemes = [
    {
      id: 'neon-city',
      label: 'NEON CITY',
      description: '네온 불빛이 가득한 사이버펑크 도시',
      requiredChains: 10,
      unlockCondition: null,
      svgPaths: makePaths('neon-city'),
    },
    {
      id: 'cyber-ocean',
      label: 'CYBER OCEAN',
      description: '네온 빛이 반사되는 사이버 심해',
      requiredChains: 10,
      unlockCondition: 'neon-city',
      svgPaths: makePaths('cyber-ocean'),
    },
  ];
})(typeof window !== 'undefined' ? window : global);
```

- [ ] **Step 2: 커밋**

```bash
git add src/collection-themes.js
git commit -m "feat(collection): add CollectionThemes data module"
```

---

## Task 2: collection.js 신규 생성

**Files:**
- Create: `src/collection.js`

- [ ] **Step 1: 파일 생성**

```js
// src/collection.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SG = root.SG || {}; root.SG.Collection = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var META_KEY = 'neondrift_collection_meta';

  function _key(themeId) { return 'neondrift_collection_' + themeId; }

  function _read(store, k) {
    try { return JSON.parse(store.getItem(k)); } catch (_) { return null; }
  }
  function _write(store, k, v) {
    try { store.setItem(k, JSON.stringify(v)); } catch (_) {}
  }

  // ── Meta (전체 테마 목록 / 활성 테마) ────────────────────────────
  function loadMeta(store) {
    return _read(store, META_KEY) || {
      activeThemeId: 'neon-city',
      unlockedThemes: ['neon-city'],
      completedThemes: [],
    };
  }
  function saveMeta(store, meta) { _write(store, META_KEY, meta); }

  // ── 테마 진행도 ───────────────────────────────────────────────────
  function loadTheme(themeId, store) {
    return _read(store, _key(themeId)) || {
      themeId: themeId,
      chainCount: 0,
      unlockedSteps: [],
      status: 'active',
      completedAt: null,
    };
  }
  function saveTheme(store, state) { _write(store, _key(state.themeId), state); }

  // ── 체인 기록 (Collapse 1회) ──────────────────────────────────────
  // 반환: { chainCount, newStep, isComplete }
  function recordChain(themeId, store, themes) {
    var theme = themes.find(function (t) { return t.id === themeId; });
    var required = theme ? theme.requiredChains : 10;
    var state = loadTheme(themeId, store);
    if (state.status === 'completed') return { chainCount: state.chainCount, newStep: null, isComplete: true };

    state.chainCount++;
    var newStep = state.chainCount;
    if (state.unlockedSteps.indexOf(newStep) === -1) state.unlockedSteps.push(newStep);

    var isComplete = state.chainCount >= required;
    if (isComplete) {
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
    }
    saveTheme(store, state);
    return { chainCount: state.chainCount, newStep: newStep, isComplete: isComplete };
  }

  // ── 다음 테마 해금 ────────────────────────────────────────────────
  // 반환: 해금된 테마 id (없으면 null)
  function unlockNextTheme(completedThemeId, store, themes) {
    var meta = loadMeta(store);
    var next = themes.find(function (t) { return t.unlockCondition === completedThemeId; });
    if (!next) return null;
    if (meta.unlockedThemes.indexOf(next.id) === -1) meta.unlockedThemes.push(next.id);
    if (meta.completedThemes.indexOf(completedThemeId) === -1) meta.completedThemes.push(completedThemeId);
    meta.activeThemeId = next.id;
    saveMeta(store, meta);
    return next.id;
  }

  // ── devResetAll 지원: neondrift_collection_* 키 반환 ─────────────
  function getAllKeys(store) {
    var keys = [];
    try {
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i);
        if (k && k.indexOf('neondrift_collection') === 0) keys.push(k);
      }
    } catch (_) {}
    return keys;
  }

  return { loadMeta, saveMeta, loadTheme, saveTheme, recordChain, unlockNextTheme, getAllKeys };
});
```

- [ ] **Step 2: 커밋**

```bash
git add src/collection.js
git commit -m "feat(collection): add Collection state CRUD module (UMD)"
```

---

## Task 3: SVG 플레이스홀더 20개 생성

**Files:**
- Create: `src/themes/neon-city/step-01.svg` ~ `step-10.svg`
- Create: `src/themes/cyber-ocean/step-01.svg` ~ `step-10.svg`

각 SVG는 viewBox="0 0 240 240", 배경 #060810, < 8KB 규격.

- [ ] **Step 1: NEON CITY 공통 헬퍼 SVG 구조**

모든 NEON CITY SVG는 누적 레이어 방식 — step N은 step N-1 레이어에 새 레이어를 추가.

`src/themes/neon-city/step-01.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <!-- 레이어 1: 도시 스카이라인 실루엣 -->
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
</svg>
```

`src/themes/neon-city/step-02.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <!-- 레이어 2: 빌딩 창문 -->
  <rect x="14" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="22" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="14" y="133" width="5" height="4" fill="#1e2a3a" opacity="0.5"/>
  <rect x="48" y="95" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="56" y="95" width="5" height="4" fill="#253040" opacity="0.8"/>
  <rect x="103" y="88" width="6" height="4" fill="#1e2a3a" opacity="0.6"/>
  <rect x="113" y="88" width="6" height="4" fill="#253040" opacity="0.7"/>
  <rect x="143" y="108" width="5" height="4" fill="#1e2a3a" opacity="0.6"/>
  <rect x="203" y="103" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
</svg>
```

`src/themes/neon-city/step-03.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <rect x="14" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="22" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="48" y="95" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="103" y="88" width="6" height="4" fill="#1e2a3a" opacity="0.6"/>
  <rect x="143" y="108" width="5" height="4" fill="#1e2a3a" opacity="0.6"/>
  <!-- 레이어 3: 도로 격자 -->
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <line x1="0" y1="215" x2="240" y2="215" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="30" y1="200" x2="30" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="80" y1="200" x2="80" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="130" y1="200" x2="130" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="180" y1="200" x2="180" y2="240" stroke="#1e2235" stroke-width="0.8"/>
</svg>
```

`src/themes/neon-city/step-04.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <rect x="14" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="48" y="95" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="103" y="88" width="6" height="4" fill="#1e2a3a" opacity="0.6"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <line x1="30" y1="200" x2="30" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="80" y1="200" x2="80" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="130" y1="200" x2="130" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <!-- 레이어 4: 첫 네온 사인 (cyan) -->
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <rect x="46" y="95" width="38" height="14" fill="none" stroke="#00f5c8" stroke-width="0.8" opacity="0.5" filter="url(#g1)"/>
</svg>
```

`src/themes/neon-city/step-05.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="g2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <line x1="80" y1="200" x2="80" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <rect x="46" y="95" width="38" height="14" fill="none" stroke="#00f5c8" stroke-width="0.8" opacity="0.5" filter="url(#g1)"/>
  <!-- 레이어 5: 두 번째 네온 사인 (red) -->
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#g2)" opacity="0.9">NEON</text>
  <rect x="141" y="105" width="30" height="12" fill="none" stroke="#ff4060" stroke-width="0.8" opacity="0.5" filter="url(#g2)"/>
</svg>
```

`src/themes/neon-city/step-06.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="g2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#g2)" opacity="0.9">NEON</text>
  <!-- 레이어 6: 홀로그램 광고판 -->
  <rect x="100" y="55" width="40" height="22" fill="#0d1530" opacity="0.85" stroke="#b06aff" stroke-width="0.8"/>
  <text x="104" y="68" font-family="monospace" font-size="6" fill="#b06aff" opacity="0.8">AD·2049</text>
  <line x1="100" y1="57" x2="100" y2="57" stroke="#b06aff" stroke-width="0.5" opacity="0.4"/>
  <rect x="100" y="55" width="40" height="22" fill="url(#glitch)" opacity="0.15"/>
</svg>
```

`src/themes/neon-city/step-07.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="g2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#g2)" opacity="0.9">NEON</text>
  <rect x="100" y="55" width="40" height="22" fill="#0d1530" opacity="0.85" stroke="#b06aff" stroke-width="0.8"/>
  <text x="104" y="68" font-family="monospace" font-size="6" fill="#b06aff" opacity="0.8">AD·2049</text>
  <!-- 레이어 7: 비/파티클 레이어 -->
  <line x1="20" y1="0" x2="18" y2="40" stroke="#00c8ff" stroke-width="0.6" opacity="0.3"/>
  <line x1="55" y1="10" x2="53" y2="55" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <line x1="90" y1="5" x2="88" y2="50" stroke="#00c8ff" stroke-width="0.6" opacity="0.35"/>
  <line x1="130" y1="0" x2="128" y2="45" stroke="#00c8ff" stroke-width="0.6" opacity="0.28"/>
  <line x1="165" y1="8" x2="163" y2="48" stroke="#00c8ff" stroke-width="0.6" opacity="0.32"/>
  <line x1="200" y1="3" x2="198" y2="43" stroke="#00c8ff" stroke-width="0.6" opacity="0.3"/>
  <line x1="35" y1="50" x2="33" y2="90" stroke="#00c8ff" stroke-width="0.6" opacity="0.2"/>
  <line x1="75" y1="45" x2="73" y2="85" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <line x1="155" y1="55" x2="153" y2="95" stroke="#00c8ff" stroke-width="0.6" opacity="0.22"/>
  <line x1="215" y1="40" x2="213" y2="80" stroke="#00c8ff" stroke-width="0.6" opacity="0.28"/>
</svg>
```

`src/themes/neon-city/step-08.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="g2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#00c8ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#g2)" opacity="0.9">NEON</text>
  <rect x="100" y="55" width="40" height="22" fill="#0d1530" opacity="0.85" stroke="#b06aff" stroke-width="0.8"/>
  <line x1="20" y1="0" x2="18" y2="40" stroke="#00c8ff" stroke-width="0.6" opacity="0.3"/>
  <line x1="90" y1="5" x2="88" y2="50" stroke="#00c8ff" stroke-width="0.6" opacity="0.35"/>
  <line x1="165" y1="8" x2="163" y2="48" stroke="#00c8ff" stroke-width="0.6" opacity="0.32"/>
  <!-- 레이어 8: 도로 반사광 -->
  <rect x="0" y="200" width="240" height="40" fill="url(#road)"/>
  <line x1="40" y1="205" x2="120" y2="240" stroke="#00f5c8" stroke-width="0.5" opacity="0.12"/>
  <line x1="200" y1="205" x2="120" y2="240" stroke="#00f5c8" stroke-width="0.5" opacity="0.12"/>
</svg>
```

`src/themes/neon-city/step-09.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="g1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="g2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#00c8ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#g1)" opacity="0.9">DRIFT</text>
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#g2)" opacity="0.9">NEON</text>
  <rect x="100" y="55" width="40" height="22" fill="#0d1530" opacity="0.85" stroke="#b06aff" stroke-width="0.8"/>
  <line x1="20" y1="0" x2="18" y2="40" stroke="#00c8ff" stroke-width="0.6" opacity="0.3"/>
  <line x1="90" y1="5" x2="88" y2="50" stroke="#00c8ff" stroke-width="0.6" opacity="0.35"/>
  <rect x="0" y="200" width="240" height="40" fill="url(#road)"/>
  <!-- 레이어 9: 비행 차량 실루엣 -->
  <ellipse cx="60" cy="75" rx="22" ry="5" fill="#1a1e2e" filter="url(#g1)"/>
  <ellipse cx="60" cy="73" rx="14" ry="4" fill="#0f1220"/>
  <circle cx="45" cy="75" r="2" fill="#ffaa00" opacity="0.9" filter="url(#g1)"/>
  <circle cx="75" cy="75" r="2" fill="#ff4060" opacity="0.7" filter="url(#g1)"/>
  <ellipse cx="185" cy="55" rx="18" ry="4" fill="#1a1e2e" filter="url(#g1)"/>
  <circle cx="170" cy="55" r="1.5" fill="#00f5c8" opacity="0.8" filter="url(#g1)"/>
</svg>
```

`src/themes/neon-city/step-10.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow2"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#00c8ff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="moon" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#b06aff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#b06aff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <!-- 달빛 -->
  <circle cx="195" cy="30" r="40" fill="url(#moon)"/>
  <circle cx="195" cy="30" r="12" fill="#1a0f2e" stroke="#b06aff" stroke-width="0.5" opacity="0.6"/>
  <!-- 빌딩 -->
  <rect x="10" y="120" width="30" height="110" fill="#0a0d1a"/>
  <rect x="45" y="90" width="25" height="140" fill="#0a0d1a"/>
  <rect x="75" y="110" width="20" height="120" fill="#0a0d1a"/>
  <rect x="100" y="80" width="35" height="150" fill="#0a0d1a"/>
  <rect x="140" y="100" width="28" height="130" fill="#0a0d1a"/>
  <rect x="173" y="115" width="22" height="115" fill="#0a0d1a"/>
  <rect x="200" y="95" width="30" height="135" fill="#0a0d1a"/>
  <!-- 창문 -->
  <rect x="14" y="125" width="5" height="4" fill="#253040" opacity="0.8"/>
  <rect x="22" y="125" width="5" height="4" fill="#1e2a3a" opacity="0.7"/>
  <rect x="48" y="95" width="5" height="4" fill="#253040" opacity="0.8"/>
  <rect x="103" y="88" width="6" height="4" fill="#00f5c8" opacity="0.2"/>
  <rect x="143" y="108" width="5" height="4" fill="#ff4060" opacity="0.2"/>
  <!-- 도로 -->
  <line x1="0" y1="200" x2="240" y2="200" stroke="#1e2235" stroke-width="1.5"/>
  <line x1="80" y1="200" x2="80" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <line x1="160" y1="200" x2="160" y2="240" stroke="#1e2235" stroke-width="0.8"/>
  <!-- 반사광 -->
  <rect x="0" y="200" width="240" height="40" fill="url(#road)"/>
  <!-- 네온 사인들 (최대 글로우) -->
  <text x="48" y="108" font-family="monospace" font-size="8" fill="#00f5c8" filter="url(#glow)">DRIFT</text>
  <rect x="46" y="95" width="38" height="14" fill="none" stroke="#00f5c8" stroke-width="1" opacity="0.7" filter="url(#glow)"/>
  <text x="143" y="115" font-family="monospace" font-size="7" fill="#ff4060" filter="url(#glow2)">NEON</text>
  <rect x="141" y="105" width="30" height="12" fill="none" stroke="#ff4060" stroke-width="1" opacity="0.7" filter="url(#glow2)"/>
  <!-- 홀로그램 광고판 -->
  <rect x="100" y="55" width="40" height="22" fill="#0d1530" opacity="0.9" stroke="#b06aff" stroke-width="1" filter="url(#glow)"/>
  <text x="104" y="68" font-family="monospace" font-size="6" fill="#b06aff">AD·2049</text>
  <!-- 비/파티클 -->
  <line x1="20" y1="0" x2="18" y2="40" stroke="#00c8ff" stroke-width="0.8" opacity="0.4"/>
  <line x1="90" y1="5" x2="88" y2="50" stroke="#00c8ff" stroke-width="0.8" opacity="0.45"/>
  <line x1="165" y1="8" x2="163" y2="48" stroke="#00c8ff" stroke-width="0.8" opacity="0.4"/>
  <line x1="35" y1="50" x2="33" y2="90" stroke="#00c8ff" stroke-width="0.6" opacity="0.3"/>
  <line x1="215" y1="40" x2="213" y2="80" stroke="#00c8ff" stroke-width="0.6" opacity="0.35"/>
  <!-- 비행 차량 -->
  <ellipse cx="60" cy="75" rx="22" ry="5" fill="#1a1e2e" filter="url(#glow)"/>
  <ellipse cx="60" cy="73" rx="14" ry="4" fill="#0f1220"/>
  <circle cx="45" cy="75" r="2.5" fill="#ffaa00" filter="url(#glow)"/>
  <circle cx="75" cy="75" r="2" fill="#ff4060" opacity="0.9" filter="url(#glow)"/>
  <ellipse cx="185" cy="55" rx="18" ry="4" fill="#1a1e2e" filter="url(#glow)"/>
  <circle cx="170" cy="55" r="2" fill="#00f5c8" filter="url(#glow)"/>
</svg>
```

- [ ] **Step 2: CYBER OCEAN 10개 생성**

`src/themes/cyber-ocean/step-01.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <!-- 레이어 1: 심해 어둠 + 수평선 -->
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
</svg>
```

`src/themes/cyber-ocean/step-02.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <!-- 레이어 2: 원거리 산호/구조물 실루엣 -->
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
</svg>
```

`src/themes/cyber-ocean/step-03.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <!-- 레이어 3: 수중 격자/데이터 그리드 -->
  <line x1="0" y1="140" x2="240" y2="140" stroke="#0a1f30" stroke-width="0.5" opacity="0.6"/>
  <line x1="0" y1="155" x2="240" y2="155" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="0" y1="170" x2="240" y2="170" stroke="#0a1f30" stroke-width="0.5" opacity="0.4"/>
  <line x1="40" y1="130" x2="40" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="80" y1="130" x2="80" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="120" y1="130" x2="120" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="160" y1="130" x2="160" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="200" y1="130" x2="200" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
</svg>
```

`src/themes/cyber-ocean/step-04.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <line x1="40" y1="130" x2="40" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="120" y1="130" x2="120" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <line x1="200" y1="130" x2="200" y2="200" stroke="#0a1f30" stroke-width="0.5" opacity="0.5"/>
  <!-- 레이어 4: 첫 번째 사이버 수중 구조물 (cyan) -->
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
</svg>
```

`src/themes/cyber-ocean/step-05.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="gw2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <!-- 레이어 5: 두 번째 구조물 (warn) -->
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <circle cx="168" cy="158" r="5" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
</svg>
```

`src/themes/cyber-ocean/step-06.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="gw2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="biolum" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#00f5c8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00f5c8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <circle cx="168" cy="158" r="5" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <!-- 레이어 6: 생물발광 구름 -->
  <circle cx="110" cy="175" r="28" fill="url(#biolum)"/>
  <circle cx="30" cy="185" r="15" fill="url(#biolum)"/>
</svg>
```

`src/themes/cyber-ocean/step-07.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="gw2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="biolum" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#00f5c8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00f5c8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <circle cx="110" cy="175" r="28" fill="url(#biolum)"/>
  <!-- 레이어 7: 수면 반사/잔물결 -->
  <ellipse cx="120" cy="130" rx="80" ry="3" fill="none" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <ellipse cx="120" cy="130" rx="50" ry="2" fill="none" stroke="#00c8ff" stroke-width="0.5" opacity="0.2"/>
  <ellipse cx="120" cy="130" rx="110" ry="4" fill="none" stroke="#00c8ff" stroke-width="0.4" opacity="0.15"/>
  <!-- 기포들 -->
  <circle cx="55" cy="160" r="1.5" fill="none" stroke="#00c8ff" stroke-width="0.5" opacity="0.5"/>
  <circle cx="60" cy="148" r="1" fill="none" stroke="#00c8ff" stroke-width="0.5" opacity="0.4"/>
  <circle cx="170" cy="155" r="1.5" fill="none" stroke="#00c8ff" stroke-width="0.5" opacity="0.4"/>
  <circle cx="115" cy="162" r="1" fill="none" stroke="#00c8ff" stroke-width="0.5" opacity="0.5"/>
</svg>
```

`src/themes/cyber-ocean/step-08.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="gw2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="biolum" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#00f5c8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00f5c8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#00c8ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="url(#depth)"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608" opacity="0.7"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <circle cx="110" cy="175" r="28" fill="url(#biolum)"/>
  <ellipse cx="120" cy="130" rx="80" ry="3" fill="none" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <!-- 레이어 8: 수중 광기둥 (빛 샤프트) -->
  <polygon points="100,0 140,0 155,130 85,130" fill="#00c8ff" opacity="0.03"/>
  <polygon points="110,0 130,0 138,130 102,130" fill="#00c8ff" opacity="0.04"/>
</svg>
```

`src/themes/cyber-ocean/step-09.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="gw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="gw2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="biolum" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#00f5c8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00f5c8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#040608"/>
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a1520" stroke-width="2"/>
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="0.8" filter="url(#gw2)" opacity="0.8"/>
  <circle cx="110" cy="175" r="28" fill="url(#biolum)"/>
  <ellipse cx="120" cy="130" rx="80" ry="3" fill="none" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <polygon points="100,0 140,0 155,130 85,130" fill="#00c8ff" opacity="0.03"/>
  <!-- 레이어 9: 사이버 해파리 실루엣 -->
  <ellipse cx="120" cy="95" rx="20" ry="12" fill="#041428" stroke="#b06aff" stroke-width="0.8" filter="url(#gw)" opacity="0.8"/>
  <line x1="108" y1="107" x2="105" y2="125" stroke="#b06aff" stroke-width="0.5" opacity="0.5"/>
  <line x1="114" y1="107" x2="112" y2="128" stroke="#b06aff" stroke-width="0.5" opacity="0.5"/>
  <line x1="120" y1="107" x2="120" y2="130" stroke="#b06aff" stroke-width="0.5" opacity="0.6"/>
  <line x1="126" y1="107" x2="128" y2="128" stroke="#b06aff" stroke-width="0.5" opacity="0.5"/>
  <line x1="132" y1="107" x2="135" y2="125" stroke="#b06aff" stroke-width="0.5" opacity="0.5"/>
</svg>
```

`src/themes/cyber-ocean/step-10.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow2"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="biolum" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#00f5c8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#00f5c8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="jelly" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#b06aff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#b06aff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <!-- 수심 그라디언트 배경 -->
  <rect x="0" y="0" width="240" height="130" fill="#060810"/>
  <rect x="0" y="130" width="240" height="110" fill="#030508"/>
  <!-- 광기둥 -->
  <polygon points="100,0 140,0 158,130 82,130" fill="#00c8ff" opacity="0.04"/>
  <polygon points="108,0 132,0 142,130 98,130" fill="#00c8ff" opacity="0.05"/>
  <!-- 수평선 -->
  <line x1="0" y1="130" x2="240" y2="130" stroke="#0a3050" stroke-width="2" filter="url(#glow)"/>
  <!-- 해저 지형 -->
  <path d="M0,200 Q20,160 40,180 Q60,145 80,175 Q100,155 120,178 Q140,150 160,172 Q180,148 200,170 Q220,158 240,175 L240,240 L0,240 Z" fill="#060d14"/>
  <!-- 수중 구조물 (최대 글로우) -->
  <rect x="50" y="155" width="8" height="40" fill="#041420" stroke="#00f5c8" stroke-width="1.2" filter="url(#glow)" opacity="0.9"/>
  <rect x="45" y="150" width="18" height="8" fill="#041420" stroke="#00f5c8" stroke-width="1.2" filter="url(#glow)" opacity="0.9"/>
  <rect x="165" y="160" width="6" height="30" fill="#041420" stroke="#ff4060" stroke-width="1.2" filter="url(#glow2)" opacity="0.9"/>
  <circle cx="168" cy="158" r="5" fill="#041420" stroke="#ff4060" stroke-width="1.2" filter="url(#glow2)" opacity="0.9"/>
  <!-- 생물발광 -->
  <circle cx="110" cy="175" r="35" fill="url(#biolum)"/>
  <circle cx="30" cy="185" r="18" fill="url(#biolum)"/>
  <circle cx="210" cy="178" r="14" fill="url(#biolum)"/>
  <!-- 잔물결 -->
  <ellipse cx="120" cy="130" rx="100" ry="4" fill="none" stroke="#00c8ff" stroke-width="0.8" opacity="0.3" filter="url(#glow)"/>
  <ellipse cx="120" cy="130" rx="60" ry="2.5" fill="none" stroke="#00c8ff" stroke-width="0.6" opacity="0.25"/>
  <!-- 기포 -->
  <circle cx="55" cy="155" r="2" fill="none" stroke="#00f5c8" stroke-width="0.6" opacity="0.6" filter="url(#glow)"/>
  <circle cx="60" cy="143" r="1.5" fill="none" stroke="#00f5c8" stroke-width="0.6" opacity="0.5"/>
  <circle cx="170" cy="150" r="2" fill="none" stroke="#00f5c8" stroke-width="0.6" opacity="0.5" filter="url(#glow)"/>
  <circle cx="115" cy="160" r="1.5" fill="none" stroke="#00f5c8" stroke-width="0.6" opacity="0.6"/>
  <!-- 사이버 해파리 (최대 글로우) -->
  <ellipse cx="120" cy="88" rx="22" ry="13" fill="#061028" stroke="#b06aff" stroke-width="1.2" filter="url(#glow2)" opacity="0.9"/>
  <circle cx="120" cy="88" r="25" fill="url(#jelly)" opacity="0.6"/>
  <line x1="108" y1="101" x2="104" y2="122" stroke="#b06aff" stroke-width="0.7" opacity="0.6" filter="url(#glow)"/>
  <line x1="114" y1="101" x2="111" y2="125" stroke="#b06aff" stroke-width="0.7" opacity="0.6"/>
  <line x1="120" y1="101" x2="120" y2="128" stroke="#b06aff" stroke-width="0.8" opacity="0.7" filter="url(#glow)"/>
  <line x1="126" y1="101" x2="129" y2="125" stroke="#b06aff" stroke-width="0.7" opacity="0.6"/>
  <line x1="132" y1="101" x2="136" y2="122" stroke="#b06aff" stroke-width="0.7" opacity="0.6" filter="url(#glow)"/>
</svg>
```

- [ ] **Step 3: 커밋**

```bash
git add src/themes/
git commit -m "feat(collection): add placeholder SVGs for neon-city and cyber-ocean themes"
```

---

## Task 4: daily.js — Wallet 기능 추가

**Files:**
- Modify: `src/daily.js`

- [ ] **Step 1: `earnStarsToWallet` + wallet helpers 추가**

`daily.js` 맨 마지막 `return { ... }` 바로 위에 다음을 삽입:

```js
  // ── Wallet (별 2-tier) ─────────────────────────────────────────────
  var WALLET_KEY = 'neondrift_wallet';
  var WALLET_DAILY_CAP = 80;
  var WALLET_PRACTICE_CAP = 12;

  function loadWallet(store) {
    var w = _read(store, WALLET_KEY);
    if (!w) {
      w = { stars: 0, totalEarned: 0, totalSpent: 0, dailyEarnedToday: 0, practiceEarnedToday: 0, lastUpdated: '' };
    }
    // Reset daily caps at UTC midnight
    var today = new Date().toISOString().slice(0, 10);
    if (w.lastUpdated !== today) {
      w.dailyEarnedToday = 0;
      w.practiceEarnedToday = 0;
      w.lastUpdated = today;
    }
    return w;
  }
  function saveWallet(store, w) { _write(store, WALLET_KEY, w); }

  // 세션 종료 시 runStars를 wallet으로 이전.
  // mode: 'daily' | 'practice' | 'collection'
  // 반환: 실제 적립된 별 수 (캡 초과분 제거됨)
  function earnStarsToWallet(runStars, mode, store) {
    var w = loadWallet(store);
    var earned = 0;
    if (mode === 'daily') {
      var room = Math.max(0, WALLET_DAILY_CAP - w.dailyEarnedToday);
      earned = Math.min(runStars, room);
      w.dailyEarnedToday += earned;
    } else if (mode === 'practice') {
      var room = Math.max(0, WALLET_PRACTICE_CAP - w.practiceEarnedToday);
      earned = Math.min(runStars, room);
      w.practiceEarnedToday += earned;
    } else {
      // collection: bonus stars (no daily cap for collapse bonuses)
      earned = runStars;
    }
    w.stars += earned;
    w.totalEarned += earned;
    // 무결성 체크
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
```

그리고 `return { ... }` 을 다음으로 교체:

```js
  return {
    N, MAX_RETRIES,
    dailyBoard, loadDaily, addStars, setBestRun, canRetry, useRetry, retriesLeft,
    loadWallet, saveWallet, earnStarsToWallet, spendStars, getWalletStars,
    WALLET_KEY, WALLET_DAILY_CAP, WALLET_PRACTICE_CAP,
  };
```

- [ ] **Step 2: 커밋**

```bash
git add src/daily.js
git commit -m "feat(economy): add Wallet 2-tier star system to daily.js"
```

---

## Task 5: index.html — `<script>` 태그 추가

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: collection-themes.js, collection.js 스크립트 태그 추가**

`src/index.html`의 `<script src="daily.js"></script>` 다음 줄에 삽입:

```html
<script src="collection-themes.js"></script>
<script src="collection.js"></script>
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.html
git commit -m "feat(collection): wire collection module scripts into index.html"
```

---

## Task 6: index.html — Collection 오버레이 3개 추가

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: Collection 관련 CSS 추가**

`</style>` 태그 직전에 삽입:

```css
    /* ── Collection 오버레이 ────────────────────────────────────────── */
    /* 해금 팝업 썸네일 */
    #ol-unlock .unlock-thumb {
      width: 160px; height: 160px;
      border: 1px solid var(--accent);
      border-radius: 6px;
      margin: 0 auto 16px;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      background: var(--panel);
    }
    #ol-unlock .unlock-thumb svg { width: 100%; height: 100%; }
    #ol-unlock .chain-badge {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2.4rem; font-weight: 700;
      color: var(--accent);
      letter-spacing: 2px;
    }

    /* 도감 갤러리 */
    #ol-gallery .ol-panel {
      max-width: 480px;
      width: 94vw;
    }
    #gallery-tabs {
      display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .gallery-tab {
      padding: 6px 14px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--textdim);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.72rem; letter-spacing: 1px;
      cursor: pointer;
      transition: border-color .12s, color .12s;
    }
    .gallery-tab.active {
      border-color: var(--accent); color: var(--accent);
    }
    .gallery-tab.locked { opacity: 0.4; cursor: default; }
    #gallery-progress {
      font-size: 0.72rem; color: var(--textdim);
      margin-bottom: 8px; text-align: left;
    }
    #gallery-bar-wrap {
      height: 4px; background: var(--border); border-radius: 2px;
      margin-bottom: 14px; overflow: hidden;
    }
    #gallery-bar {
      height: 100%; background: var(--accent);
      border-radius: 2px; transition: width .3s;
    }
    #gallery-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 14px;
    }
    .gallery-cell {
      aspect-ratio: 1;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      background: var(--panel);
      display: flex; align-items: center; justify-content: center;
      transition: border-color .12s;
    }
    .gallery-cell.unlocked { border-color: var(--dim); }
    .gallery-cell.unlocked:hover { border-color: var(--accent); }
    .gallery-cell.locked { filter: brightness(0.15); cursor: default; }
    .gallery-cell svg { width: 100%; height: 100%; }
    .gallery-lock-icon {
      position: absolute; font-size: 1rem; color: var(--textdim);
    }

    /* 이미지 상세 뷰 */
    #ol-detail .ol-panel { max-width: 340px; }
    #detail-img {
      width: 200px; height: 200px;
      border: 1px solid var(--border);
      border-radius: 4px;
      margin: 0 auto 12px;
      overflow: hidden;
      background: var(--panel);
    }
    #detail-img svg { width: 100%; height: 100%; }
    #detail-nav {
      display: flex; justify-content: space-between;
      margin-top: 8px;
    }
    .detail-nav-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--textdim);
      padding: 6px 14px;
      border-radius: 4px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .detail-nav-btn:hover { border-color: var(--accent); color: var(--accent); }
    .detail-nav-btn:disabled { opacity: 0.3; cursor: default; }
```

- [ ] **Step 2: 3개 오버레이 HTML 추가**

`<!-- Practice game-over -->` 블록 바로 다음에 삽입:

```html
<!-- ── Collection: 체인 해금 팝업 ─────────────────────────────────── -->
<div id="ol-unlock" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title" id="unlock-chain-title">CHAIN 1/10</div>
    <div class="unlock-thumb" id="unlock-thumb">
      <!-- SVG inject here -->
    </div>
    <div class="ol-label" id="unlock-theme-label">NEON CITY — STEP 1</div>
    <button class="btn-primary modal-btn" onclick="closeUnlockPopup()">CONTINUE</button>
  </div>
</div>

<!-- ── Collection: 테마 완료 ──────────────────────────────────────── -->
<div id="ol-theme-complete" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title">THEME COMPLETE!</div>
    <div class="ol-score" id="theme-complete-label">NEON CITY</div>
    <div class="ol-label">10 CHAINS COMPLETED · SAVED</div>
    <button class="btn-primary modal-btn" id="btn-view-gallery" onclick="openGallery()">VIEW GALLERY</button>
    <button class="btn-secondary modal-btn" id="btn-next-theme" onclick="startNextTheme()">NEXT THEME</button>
    <button class="btn-secondary modal-btn" onclick="collectionToMenu()">MENU</button>
  </div>
</div>

<!-- ── Collection: 도감(Gallery) ────────────────────────────────────── -->
<div id="ol-gallery" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title">GALLERY</div>
    <div id="gallery-tabs"><!-- tabs injected by JS --></div>
    <div id="gallery-progress">0 / 10</div>
    <div id="gallery-bar-wrap"><div id="gallery-bar" style="width:0%"></div></div>
    <div id="gallery-grid"><!-- cells injected by JS --></div>
    <button class="btn-secondary modal-btn" onclick="closeGallery()">CLOSE</button>
  </div>
</div>

<!-- ── Collection: 이미지 상세 뷰 ─────────────────────────────────── -->
<div id="ol-detail" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title" id="detail-title">1 / 10</div>
    <div id="detail-img"><!-- SVG inject --></div>
    <div class="ol-label" id="detail-label">NEON CITY — STEP 1</div>
    <div id="detail-nav">
      <button class="detail-nav-btn" id="btn-detail-prev" onclick="detailNav(-1)">◀ PREV</button>
      <button class="detail-nav-btn" id="btn-detail-next" onclick="detailNav(+1)">NEXT ▶</button>
    </div>
    <button class="btn-secondary modal-btn" style="margin-top:12px" onclick="closeDetail()">BACK</button>
  </div>
</div>

<!-- ── Collection: 게임오버 ─────────────────────────────────────────── -->
<div id="ol-collection-over" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title">GAME OVER</div>
    <div class="ol-score" id="collection-chain-display">3/10</div>
    <div class="ol-label">CHAIN PROGRESS SAVED</div>
    <button class="btn-primary modal-btn" onclick="collectionAgain()">AGAIN</button>
    <button class="btn-secondary modal-btn" onclick="openGallery()">GALLERY</button>
    <button class="btn-secondary modal-btn" onclick="collectionToMenu()">MENU</button>
  </div>
</div>
```

- [ ] **Step 3: 시작 화면에 COLLECTION 버튼 추가**

`#ol-start` 패널의 `<button ... onclick="startPractice()">PRACTICE</button>` 다음 줄에 삽입:

```html
    <button class="btn-secondary modal-btn" id="btn-collection" data-action="collection" onclick="startCollection()">COLLECTION</button>
```

- [ ] **Step 4: 커밋**

```bash
git add src/index.html
git commit -m "feat(collection): add gallery/unlock/complete overlays and Collection button"
```

---

## Task 7: index.html — Collection 상태 변수 + 핵심 함수

**Files:**
- Modify: `src/index.html` (인라인 `<script>` 블록)

- [ ] **Step 1: 상태 변수 추가**

`let practiceCollapseCount = 0;` 바로 다음에 삽입:

```js
// ── Collection mode state ─────────────────────────────────────────
let collectionMode = false;
let activeThemeId = 'neon-city';
let collectionCollapseCount = 0;   // 현재 세션의 Collapse 횟수 (광고 쿨다운용)
let lastInterstitialAt = 0;        // 인터스티셜 60초 쿨다운
const INTERSTITIAL_COOLDOWN_MS = 60000;

// 도감 상세뷰 상태
let _detailThemeId = null;
let _detailStep = 1;
```

- [ ] **Step 2: `_collapseShared()` 추출 및 `practiceCollapse` 리팩토링**

기존 `practiceCollapse` 함수를 다음으로 교체:

```js
// ── 공통 Collapse 처리 (FX + 광고 쿨다운 + 보드 리셋) ────────────
async function _collapseShared(collapseInfo) {
  // FX
  try {
    if (renderer && collapseInfo && collapseInfo.at) {
      for (const pos of collapseInfo.at) {
        const [cx, cy] = renderer.cellXY(pos[0], pos[1]);
        const gold = { fill: '#ffd23f', glow: '#ffe98a' };
        if (renderer.particles) renderer.particles.emit(cx, cy, gold, 28);
        if (renderer.rings) renderer.rings.push(
          new global.SG.Ring(cx, cy, renderer.cell * 0.5, renderer.cell * 2.2, gold.glow, 520)
        );
        renderer.flash = { life: 400, maxLife: 400, color: gold.glow, peak: 0.45 };
      }
    }
  } catch (_) {}
  await new Promise(function (r) { setTimeout(r, 400); });

  // 인터스티셜 쿨다운 (60초)
  const now = Date.now();
  const canShowAd = (now - lastInterstitialAt) >= INTERSTITIAL_COOLDOWN_MS;
  if (canShowAd) {
    try { await SG.CG.requestMidgameAd(); lastInterstitialAt = now; } catch (_) {}
  }

  // 보드 리셋
  grid = SG.ND.emptyGrid(4);
  for (let i = 0; i < 2; i++) {
    const s = SG.ND.spawnTile(grid, rng, dailyOpts);
    if (s) grid[s.at[0]][s.at[1]] = { color: s.color, size: s.size };
  }
  gameRunning = true;
}

// Practice 1024 Collapse
async function practiceCollapse(collapseInfo) {
  gameRunning = false;
  practiceCollapseCount++;
  await _collapseShared(collapseInfo);
  updateDailyHud();
  renderer.drawGrid(grid);
}
```

- [ ] **Step 3: `collectionCollapse()` + `startCollection()` + HUD 추가**

`practiceCollapse` 함수 다음에 삽입:

```js
// ── Collection Collapse ────────────────────────────────────────────
async function collectionCollapse(collapseInfo) {
  if (!gameRunning) return;
  gameRunning = false;
  collectionCollapseCount++;

  // 1. 저장 (광고 전에 먼저 — 앱 종료 대응)
  const themes = SG.CollectionThemes;
  const result = SG.Collection.recordChain(activeThemeId, localStorage, themes);

  // 2. 해금 팝업 표시 (유저가 닫을 때까지 대기)
  await showUnlockPopup(result.chainCount, activeThemeId, result.newStep);

  // 3. 공통 처리 (광고 + 보드 리셋)
  await _collapseShared(collapseInfo);

  // 4. 테마 완료 판정
  if (result.isComplete) {
    await collectionThemeComplete(activeThemeId);
    return;   // collectionThemeComplete가 게임 흐름 인계
  }

  updateCollectionHud();
  renderer.drawGrid(grid);
}

// 해금 팝업 표시 + 유저 탭 대기
function showUnlockPopup(chainCount, themeId, step) {
  return new Promise(function (resolve) {
    const theme = SG.CollectionThemes.find(function (t) { return t.id === themeId; });
    const required = theme ? theme.requiredChains : 10;
    document.getElementById('unlock-chain-title').textContent = 'CHAIN ' + chainCount + '/' + required;
    const label = (theme ? theme.label : themeId.toUpperCase()) + ' — STEP ' + step;
    document.getElementById('unlock-theme-label').textContent = label;

    // SVG lazy load
    const thumb = document.getElementById('unlock-thumb');
    thumb.innerHTML = '<div style="color:var(--accent);font-family:Rajdhani,sans-serif;font-size:2rem">★</div>';
    if (theme && theme.svgPaths && step) {
      loadThemeSvg(themeId, step).then(function (svg) {
        if (svg) thumb.innerHTML = svg;
      }).catch(function () {});
    }

    document.getElementById('ol-unlock').classList.remove('hidden');
    // closeUnlockPopup 클릭 시 resolve
    window._unlockResolve = resolve;
  });
}

function closeUnlockPopup() {
  document.getElementById('ol-unlock').classList.add('hidden');
  if (window._unlockResolve) { window._unlockResolve(); window._unlockResolve = null; }
}

async function collectionThemeComplete(themeId) {
  gameRunning = false;
  try { SG.CG.gameplayStop(); } catch (_) {}

  // Firebase 제출
  try {
    if (SG.FB.isConnected()) {
      await SG.FB.submitScore(10, {
        mode: 'collection_' + themeId,
        themeId: themeId,
        date: utcDateStr(),
      });
    }
  } catch (_) {}

  // Collapse 보너스 별: 테마 완료 ⭐20
  SG.Daily.earnStarsToWallet(20, 'collection', localStorage);

  // 다음 테마 해금
  SG.Collection.unlockNextTheme(themeId, localStorage, SG.CollectionThemes);

  // 테마 완료 오버레이
  const theme = SG.CollectionThemes.find(function (t) { return t.id === themeId; });
  document.getElementById('theme-complete-label').textContent = theme ? theme.label : themeId.toUpperCase();
  document.getElementById('ol-theme-complete').classList.remove('hidden');
  openModalNav('ol-theme-complete');
}

// Collection 모드 시작
function startCollection() {
  const meta = SG.Collection.loadMeta(localStorage);
  activeThemeId = meta.activeThemeId || 'neon-city';
  const dow = utcDayOfWeek();
  dailyTypeCfg = SG.ND.dailyType(dow);
  const base = buildDailyOpts(dailyTypeCfg);
  dailyOpts = Object.assign({}, base, { collapseSize: 1024 });
  rng = makeRng();
  grid = SG.Daily.dailyBoard(utcDateStr(), dow, rng);
  collectionMode = true;
  collectionCollapseCount = 0;
  practiceMode = false;
  dailyMode = true;
  gameRunning = true;
  dailyRunStars = 0;
  dailyStarsShown = 0;
  // 오버레이 정리
  ['ol-start','ol-collection-over','ol-theme-complete'].forEach(function (id) {
    document.getElementById(id).classList.add('hidden');
  });
  closeModalNav();
  renderer.setMode('daily');
  renderer.drawGrid(grid);
  updateCollectionHud();
  try { SG.CG.gameplayStart(); } catch (_) {}
}

function updateCollectionHud() {
  const theme = SG.CollectionThemes.find(function (t) { return t.id === activeThemeId; });
  const themeLabel = theme ? theme.label : activeThemeId.toUpperCase();
  const state = SG.Collection.loadTheme(activeThemeId, localStorage);
  const required = theme ? theme.requiredChains : 10;
  document.getElementById('game-title').textContent =
    'COLLECTION · ' + themeLabel + ' ×' + state.chainCount + '/' + required;
  document.getElementById('stat-score').textContent = '⭐' + dailyStarsShown;
  document.getElementById('stat-best').textContent = '⭐' + SG.Daily.getWalletStars(localStorage);
  document.getElementById('stat-chain').textContent = state.chainCount + '/' + required;
}

// Collection 게임오버
async function collectionGameOver() {
  gameRunning = false;
  try { SG.CG.gameplayStop(); } catch (_) {}
  try { if (SG.Sound && SG.Sound.playGameOver) SG.Sound.playGameOver(); } catch (_) {}
  dailyStarsShown = dailyRunStars;

  // Wallet 이전 (하루 캡 없는 collection 모드)
  SG.Daily.earnStarsToWallet(dailyRunStars, 'collection', localStorage);

  try { await SG.CG.requestMidgameAd(); } catch (_) {}

  const state = SG.Collection.loadTheme(activeThemeId, localStorage);
  const theme = SG.CollectionThemes.find(function (t) { return t.id === activeThemeId; });
  const required = theme ? theme.requiredChains : 10;
  document.getElementById('collection-chain-display').textContent =
    state.chainCount + '/' + required + ' CHAINS';
  document.getElementById('ol-collection-over').classList.remove('hidden');
  openModalNav('ol-collection-over');
}

function collectionAgain() {
  closeModalNav();
  document.getElementById('ol-collection-over').classList.add('hidden');
  startCollection();
}

function collectionToMenu() {
  closeModalNav();
  ['ol-collection-over','ol-theme-complete','ol-gallery','ol-detail'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  collectionMode = false;
  dailyMode = false;
  practiceMode = false;
  if (renderer) renderer.setMode('main');
  showStart();
}

function startNextTheme() {
  closeModalNav();
  document.getElementById('ol-theme-complete').classList.add('hidden');
  const meta = SG.Collection.loadMeta(localStorage);
  activeThemeId = meta.activeThemeId;
  startCollection();
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/index.html
git commit -m "feat(collection): add collectionCollapse, startCollection, HUD, game-over flow"
```

---

## Task 8: index.html — doMove() 분기 + Gallery UI

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: doMove() 에 collectionMode 분기 추가**

`doMove()` 함수 내 `renderer.animate` 콜백 중:

```js
  // 기존:
  if (practiceMode && result.collapse) { practiceCollapse(result.collapse); return; }
  if (ND.checkGameOver(grid, 'sizeOnly')) { practiceMode ? practiceGameOver() : dailyGameOver(); }
```

를 다음으로 교체:

```js
  if (collectionMode && result.collapse) { collectionCollapse(result.collapse); return; }
  if (practiceMode && result.collapse) { practiceCollapse(result.collapse); return; }
  if (ND.checkGameOver(grid, 'sizeOnly')) {
    if (collectionMode) { collectionGameOver(); return; }
    practiceMode ? practiceGameOver() : dailyGameOver();
  }
```

- [ ] **Step 2: Gallery 함수 추가**

`collectionToMenu` 함수 다음에 삽입:

```js
// ── Gallery ────────────────────────────────────────────────────────
function openGallery(themeId) {
  const meta = SG.Collection.loadMeta(localStorage);
  const viewThemeId = themeId || activeThemeId || meta.activeThemeId || 'neon-city';
  renderGalleryTabs(meta, viewThemeId);
  renderGalleryCells(viewThemeId);
  document.getElementById('ol-gallery').classList.remove('hidden');
  openModalNav('ol-gallery');
}

function closeGallery() {
  closeModalNav();
  document.getElementById('ol-gallery').classList.add('hidden');
}

function renderGalleryTabs(meta, activeId) {
  const tabs = document.getElementById('gallery-tabs');
  tabs.innerHTML = '';
  SG.CollectionThemes.forEach(function (t) {
    const isUnlocked = meta.unlockedThemes.indexOf(t.id) !== -1;
    const btn = document.createElement('button');
    btn.className = 'gallery-tab' + (t.id === activeId ? ' active' : '') + (!isUnlocked ? ' locked' : '');
    const check = meta.completedThemes.indexOf(t.id) !== -1 ? ' ✓' : '';
    const lock = !isUnlocked ? ' 🔒' : '';
    btn.textContent = t.label + check + lock;
    if (isUnlocked) {
      btn.onclick = function () {
        document.querySelectorAll('.gallery-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderGalleryCells(t.id);
      };
    }
    tabs.appendChild(btn);
  });
}

function renderGalleryCells(themeId) {
  const theme = SG.CollectionThemes.find(function (t) { return t.id === themeId; });
  if (!theme) return;
  const state = SG.Collection.loadTheme(themeId, localStorage);
  const required = theme.requiredChains;

  document.getElementById('gallery-progress').textContent =
    state.chainCount + ' / ' + required + ' CHAINS';
  const pct = Math.min(100, Math.round((state.chainCount / required) * 100));
  document.getElementById('gallery-bar').style.width = pct + '%';

  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  for (let step = 1; step <= required; step++) {
    const cell = document.createElement('div');
    const isUnlocked = state.unlockedSteps.indexOf(step) !== -1;
    cell.className = 'gallery-cell ' + (isUnlocked ? 'unlocked' : 'locked');
    if (isUnlocked) {
      loadThemeSvg(themeId, step).then(function (svg) {
        if (svg) cell.innerHTML = svg;
      }).catch(function () {});
      const s = step;
      cell.onclick = function () { openDetail(themeId, s, state.unlockedSteps); };
    } else {
      cell.innerHTML = '<span class="gallery-lock-icon">🔒</span>';
    }
    grid.appendChild(cell);
  }
}

async function loadThemeSvg(themeId, step) {
  try {
    const path = 'themes/' + themeId + '/step-' + String(step).padStart(2, '0') + '.svg';
    const r = await fetch(path);
    if (!r.ok) return null;
    return await r.text();
  } catch (_) { return null; }
}

// 이미지 상세 뷰
function openDetail(themeId, step, unlockedSteps) {
  _detailThemeId = themeId;
  _detailStep = step;
  renderDetail(unlockedSteps);
  document.getElementById('ol-detail').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('ol-detail').classList.add('hidden');
  _detailThemeId = null;
}

function renderDetail(unlockedStepsOverride) {
  const themeId = _detailThemeId;
  const theme = SG.CollectionThemes.find(function (t) { return t.id === themeId; });
  if (!theme) return;
  const state = SG.Collection.loadTheme(themeId, localStorage);
  const unlockedSteps = unlockedStepsOverride || state.unlockedSteps;
  const required = theme.requiredChains;
  const step = _detailStep;

  document.getElementById('detail-title').textContent = step + ' / ' + required;
  document.getElementById('detail-label').textContent = theme.label + ' — STEP ' + step;

  const img = document.getElementById('detail-img');
  img.innerHTML = '<div style="color:var(--accent);font-family:Rajdhani,sans-serif;font-size:2rem;margin:auto">★</div>';
  loadThemeSvg(themeId, step).then(function (svg) {
    if (svg) img.innerHTML = svg;
  }).catch(function () {});

  document.getElementById('btn-detail-prev').disabled = step <= 1 || unlockedSteps.indexOf(step - 1) === -1;
  document.getElementById('btn-detail-next').disabled = step >= required || unlockedSteps.indexOf(step + 1) === -1;
}

function detailNav(delta) {
  const themeId = _detailThemeId;
  const state = SG.Collection.loadTheme(themeId, localStorage);
  const newStep = _detailStep + delta;
  if (state.unlockedSteps.indexOf(newStep) !== -1) {
    _detailStep = newStep;
    renderDetail(state.unlockedSteps);
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/index.html
git commit -m "feat(collection): add doMove branch, gallery UI, detail view"
```

---

## Task 9: devResetAll 업데이트

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: devResetAll에 collection 키 정리 추가**

`devResetAll` 함수 내 `kill` 배열 생성 루프 바로 다음에 (push 직후):

```js
    // collection 키도 정리
    try {
      const collectionKeys = SG.Collection.getAllKeys(localStorage);
      collectionKeys.forEach(function (k) { if (kill.indexOf(k) === -1) kill.push(k); });
    } catch (_) {}
```

- [ ] **Step 2: 커밋**

```bash
git add src/index.html
git commit -m "fix(dev): include collection keys in devResetAll"
```

---

## Task 10: 연결 검증 — 브라우저 수동 테스트

- [ ] **Step 1: 로컬 서버 실행**

```bash
# src/ 디렉터리에서
python -m http.server 8080
# 또는
npx serve src/
```

- [ ] **Step 2: 시작 화면 COLLECTION 버튼 확인**

`http://localhost:8080` 열기 → START 화면에 DAILY / PRACTICE / COLLECTION 버튼 표시 확인.

- [ ] **Step 3: Collection 시작 + HUD 확인**

COLLECTION 클릭 → `COLLECTION · NEON CITY ×0/10` HUD 확인.
보드 4×4, 슬라이드 가능 확인.

- [ ] **Step 4: 1024 도달 시뮬레이션 (DEV 모드)**

`?dev` URL 추가 → 콘솔에서:
```js
// 가장 빠른 테스트: 보드를 1024 직전 상태로 조작
const g = SG.ND.emptyGrid(4);
g[0][0] = {color:0, size:512};
g[0][1] = {color:0, size:512};
_testSetGrid(g);
_testSetGameRunning(true);
_testSetIsAnimating(false);
// 이제 ← 입력하면 1024 Collapse 트리거
```
→ 해금 팝업 표시 → CONTINUE → 보드 리셋 → HUD `×1/10` 확인.

- [ ] **Step 5: Gallery 열기 확인**

`SG.Collection.loadTheme('neon-city', localStorage)` 콘솔 확인 → chainCount:1, unlockedSteps:[1].
개임오버 후 [GALLERY] 클릭 → 갤러리 표시, step-1 썸네일 로드 확인.

- [ ] **Step 6: Wallet 확인**

콘솔:
```js
SG.Daily.loadWallet(localStorage)
// → {stars: ..., totalEarned: ..., ...}
```

---

## Task 11: 최종 커밋

- [ ] **Step 1: 상태 확인 및 최종 커밋**

```bash
git status
git add -p   # 누락 파일 있으면 추가
git commit -m "feat: Collection mode MVP + game economy (wallet, collapse bonus)"
```

---

## 자가 검토 — Spec 커버리지

| GDD 요구사항 | 구현 태스크 |
|---|---|
| Collection 모드 시작 (시작 화면 버튼) | Task 6 Step 3 |
| collectionCollapse() — 저장→팝업→광고→리셋 순서 | Task 7 Step 3 |
| _collapseShared() 공통 추출 | Task 7 Step 2 |
| 체인 카운터 +1, unlockedSteps 추가 | Task 2 (recordChain) |
| 게임오버 시 체인 유지 | Task 2 (recordChain — status:'active' 유지) |
| 테마 완료 → Firebase 제출 | Task 7 Step 3 (collectionThemeComplete) |
| 다음 테마 해금 | Task 2 (unlockNextTheme) |
| #ol-gallery 도감 | Task 6 Step 2 + Task 8 Step 2 |
| #ol-unlock 해금 팝업 | Task 6 Step 2 + Task 7 Step 3 |
| SVG 외부 파일 lazy fetch | Task 8 Step 2 (loadThemeSvg) |
| localStorage 저장 구조 | Task 2 |
| Wallet 2-tier (earnStarsToWallet) | Task 4 |
| 일일 캡 (daily:80, practice:12) | Task 4 |
| 인터스티셜 60초 쿨다운 | Task 7 Step 1 (lastInterstitialAt) |
| 광고 거부 시 조용히 진행 | _collapseShared try/catch |
| devResetAll collection 키 포함 | Task 9 |
| NEON CITY SVG 10개 | Task 3 |
| CYBER OCEAN SVG 10개 | Task 3 |

**제외 (GDD 명시적 제외):**
- 2배 버프 리워드 광고 (Phase 2)
- 테마 해금 별 차감 UI (Phase 2)
- Daily 재시도 별 폴백 UI (Phase 2)
- 도감 리더보드 UI (향후)
