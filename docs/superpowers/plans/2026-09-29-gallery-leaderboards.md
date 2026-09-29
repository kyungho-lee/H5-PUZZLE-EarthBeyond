# 갤러리 · 챕터 클리어 리더보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갤러리 수집 수(`gallery_total`)와 챕터 클리어 판 수(`ch1~3_clear`)를 Playgama SaaS 리더보드에 올리고, 플레이어 랭킹 창 · 운영자 집계(LB STATS) · 진행 이벤트를 붙인다.

**Architecture:** 판 수 · 클리어 판 수는 `collection.js` 테마 상태에 저장. "무엇을 제출할지"는 순수 모듈 `lb-sync.js`가 결정(노드 테스트). `index.html`이 기록 시점에 `lbSyncNow()`를 불러 Bridge로 제출하고, 랭킹 창 · LB STATS는 `SG.PG.leaderboard.getEntries`로 읽는다.

**Tech Stack:** Plain JS (UMD 모듈 + `index.html` 인라인 스크립트), Playgama Bridge SDK v2, `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-29-gallery-leaderboards-design.md`

## Global Constraints

- 리더보드 ID(캐비닛 생성 완료, 변경 불가): `gallery_total`(desc), `ch1_clear` · `ch2_clear` · `ch3_clear`(asc).
- 챕터 번호 = `SG.CollectionThemes` 배열 순서 (1 = primordial-earth, 2 = human-civilization, 3 = solar-system).
- 가짜 값 금지: 판 수를 모르는 클리어는 제출하지 않는다. 백엔드가 없으면 랭킹 UI를 숨긴다(더미 행 없음).
- 모든 저장은 `SG.Store`(Bridge Storage) 경유. 새 키: `earthbeyond_lb_sent`.
- Playgama 빌드는 외부 호출 금지 — 새 코드도 Bridge 외 네트워크 호출 없음.
- 모든 팝업에 닫기 버튼(체크리스트 18).
- 버전은 v0.9 유지(심사 제출본에 포함). 릴리스 노트 `docs/devLog/Release_Note_v0.9.0.md`에 추가.

## Review Focus

- 기존 플레이어가 진행 중이던 챕터: `runs`가 이번 버전부터 세어져 클리어 판 수가 실제보다 작게 기록될 수 있음 → 저장된 진행이 step 1을 넘는데 `runs`가 없으면 `runsUnknown`으로 표시하고 그 챕터의 클리어는 제출하지 않는다 (Task 1 테스트).
- 제출 실패(네트워크 · Bridge 미초기화): 다음 부팅에 재시도해야 하고, 실패한 값을 "보냄"으로 표시하면 안 된다 (Task 2 테스트).
- 갤러리 수가 줄어드는 경우(데이터 리셋): 이미 보낸 더 큰 값보다 작으면 다시 보내지 않는다 — 리더보드는 최고값만 의미 (Task 2 테스트).
- `leaderboards.type`이 `in_game`이 아닌 환경(로컬 · 다른 플랫폼): 제출 · 조회를 시도하지 않고 RANKING 버튼 숨김 (Task 5 브라우저 확인).
- `getEntries`가 null/빈 배열/이름 없는 항목을 돌려줄 때: 랭킹 창이 깨지지 않고 빈 상태 · id 꼬리로 표시 (Task 5).

---

### Task 1: 테마 상태에 판 수 · 클리어 판 수, 갤러리 합계

**Files:**
- Modify: `src/collection.js` (loadTheme 기본값/마이그레이션, recordMerges 완성 처리, 신규 함수, export)
- Test: `test/collection.runs.test.js` (신규)

**Interfaces:**
- Produces:
  - `SG.Collection.bumpRuns(themeId, store, theme) → number` (증가 후 runs)
  - `SG.Collection.totalAcquired(store, themes) → number` (모든 테마 acquiredSteps.length 합)
  - 테마 상태 필드: `runs:number`, `runsUnknown:boolean`, `clearRuns:number|null`
  - `recordMerges`가 완성 시 `state.clearRuns = runsUnknown ? null : Math.max(1, runs)`

- [ ] **Step 1: Write the failing test** — `test/collection.runs.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/collection.js');

const theme = { id: 't1', stepSizes: [1, 2, 4] };
const store = () => ({});

test('new theme starts with runs 0 and known run count', () => {
  const s = C.loadTheme('t1', store(), theme);
  assert.strictEqual(s.runs, 0);
  assert.strictEqual(s.runsUnknown, false);
  assert.strictEqual(s.clearRuns, null);
});

test('bumpRuns increments and persists', () => {
  const st = store();
  assert.strictEqual(C.bumpRuns('t1', st, theme), 1);
  assert.strictEqual(C.bumpRuns('t1', st, theme), 2);
  assert.strictEqual(C.loadTheme('t1', st, theme).runs, 2);
});

test('clearing records clearRuns = runs', () => {
  const st = store();
  C.bumpRuns('t1', st, theme); C.bumpRuns('t1', st, theme); C.bumpRuns('t1', st, theme);
  const rec = C.recordMerges('t1', [2, 4], st, [theme], theme);
  assert.strictEqual(rec.isComplete, true);
  assert.strictEqual(C.loadTheme('t1', st, theme).clearRuns, 3);
});

test('saved progress from before run counting is marked unknown and never gets clearRuns', () => {
  const st = { earthbeyond_collection_t1: JSON.stringify({ themeId: 't1', acquiredSizes: [1, 2], acquiredSteps: [1, 2], newSizes: [], claimedSizes: [], status: 'active' }) };
  assert.strictEqual(C.loadTheme('t1', st, theme).runsUnknown, true);
  C.bumpRuns('t1', st, theme);
  C.recordMerges('t1', [4], st, [theme], theme);
  assert.strictEqual(C.loadTheme('t1', st, theme).clearRuns, null);
});

test('saved progress with only the free step 1 still counts runs', () => {
  const st = { earthbeyond_collection_t1: JSON.stringify({ themeId: 't1', acquiredSizes: [1], acquiredSteps: [1], newSizes: [1], claimedSizes: [], status: 'active' }) };
  assert.strictEqual(C.loadTheme('t1', st, theme).runsUnknown, false);
});

test('totalAcquired sums acquired steps over themes', () => {
  const t2 = { id: 't2', stepSizes: [1, 2] };
  const st = store();
  C.grantStartStep('t1', st, theme);
  C.recordMerges('t1', [2], st, [theme, t2], theme);
  C.grantStartStep('t2', st, t2);
  assert.strictEqual(C.totalAcquired(st, [theme, t2]), 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/collection.runs.test.js`
Expected: FAIL (`s.runs` undefined / `bumpRuns is not a function`)

- [ ] **Step 3: Implement** — `src/collection.js`

`loadTheme`의 새 상태 기본값에 `runs: 0, runsUnknown: false, clearRuns: null` 추가. 저장된 상태 마이그레이션 블록(`if (!saved.claimedSizes) ...` 다음)에:

```js
    // 판 수 카운터(v0.9~). 카운터 이전에 step 1(무료)을 넘어 진행한 테마는 판 수를 알 수 없다.
    if (saved.runs == null) {
      saved.runs = 0;
      saved.runsUnknown = saved.status === 'completed' || saved.acquiredSteps.some(function (s) { return s > 1; });
    }
    if (saved.runsUnknown == null) saved.runsUnknown = false;
    if (saved.clearRuns === undefined) saved.clearRuns = null;
```

`recordMerges`의 `if (isComplete) {` 블록에 `state.clearRuns = state.runsUnknown ? null : Math.max(1, state.runs || 0);` 추가.

신규 함수(`hasNew` 아래):

```js
  // 새 판 시작 — startCollection()이 호출. 반환: 증가 후 판 수.
  function bumpRuns(themeId, store, theme) {
    var state = loadTheme(themeId, store, theme);
    state.runs = (state.runs || 0) + 1;
    saveTheme(store, state);
    return state.runs;
  }

  // 모든 테마의 획득 장면 수 합 (gallery_total 리더보드 점수).
  function totalAcquired(store, themes) {
    return (themes || []).reduce(function (sum, t) {
      return sum + loadTheme(t.id, store, t).acquiredSteps.length;
    }, 0);
  }
```

export 목록에 `bumpRuns, totalAcquired` 추가.

- [ ] **Step 4: Run tests** — `npm test` → 전부 PASS

- [ ] **Step 5: Commit** — `git add src/collection.js test/collection.runs.test.js && git commit -m "feat(collection): 챕터 판 수 · 클리어 판 수 · 갤러리 합계"`

---

### Task 2: 제출 결정 모듈 `lb-sync.js`

**Files:**
- Create: `src/lb-sync.js`
- Test: `test/lb-sync.test.js`

**Interfaces:**
- Consumes: 없음 (순수)
- Produces:
  - `SG.LbSync.plan({ galleryTotal, clears: [{ lbId, themeId, clearRuns }] }, sent) → [{ lbId, score, kind: 'gallery'|'clear', themeId? }]`
  - `SG.LbSync.markSent(sent, item) → sent` (새 객체)
  - `SG.LbSync.load(store) → sent`, `SG.LbSync.save(store, sent)` — 키 `earthbeyond_lb_sent`, 형태 `{ gallery: number, clears: { [themeId]: number } }`

- [ ] **Step 1: Write the failing test** — `test/lb-sync.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../src/lb-sync.js');

const empty = { gallery: 0, clears: {} };

test('gallery is planned only when it grew past what was sent', () => {
  assert.deepStrictEqual(L.plan({ galleryTotal: 5, clears: [] }, empty), [{ lbId: 'gallery_total', score: 5, kind: 'gallery' }]);
  assert.deepStrictEqual(L.plan({ galleryTotal: 5, clears: [] }, { gallery: 5, clears: {} }), []);
  assert.deepStrictEqual(L.plan({ galleryTotal: 3, clears: [] }, { gallery: 5, clears: {} }), []);   // reset data never lowers
});

test('a clear is planned once, only with a known run count', () => {
  const clears = [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 4 }, { lbId: 'ch2_clear', themeId: 'b', clearRuns: null }];
  assert.deepStrictEqual(L.plan({ galleryTotal: 0, clears }, empty), [{ lbId: 'ch1_clear', score: 4, kind: 'clear', themeId: 'a' }]);
  assert.deepStrictEqual(L.plan({ galleryTotal: 0, clears }, { gallery: 0, clears: { a: 4 } }), []);
});

test('markSent records success; an unmarked (failed) item is planned again', () => {
  const items = L.plan({ galleryTotal: 7, clears: [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 2 }] }, empty);
  const sent = L.markSent(empty, items[0]);           // gallery ok, clear failed
  assert.deepStrictEqual(sent, { gallery: 7, clears: {} });
  assert.deepStrictEqual(L.plan({ galleryTotal: 7, clears: [{ lbId: 'ch1_clear', themeId: 'a', clearRuns: 2 }] }, sent).map(i => i.lbId), ['ch1_clear']);
});

test('load/save round-trip and tolerate garbage', () => {
  const st = {};
  assert.deepStrictEqual(L.load(st), empty);
  L.save(st, { gallery: 3, clears: { a: 1 } });
  assert.deepStrictEqual(L.load(st), { gallery: 3, clears: { a: 1 } });
  assert.deepStrictEqual(L.load({ earthbeyond_lb_sent: '{bad' }), empty);
});
```

- [ ] **Step 2: Run** — `node --test test/lb-sync.test.js` → FAIL (module not found)

- [ ] **Step 3: Implement** — `src/lb-sync.js`

```js
/* lb-sync.js — 어떤 리더보드 점수를 제출할지 결정 (순수 로직, 노드 테스트).
   sent = 마지막으로 제출에 성공한 값 { gallery, clears: { themeId: runs } }.
   UMD: module.exports for node tests, SG.LbSync in browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.LbSync = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'earthbeyond_lb_sent';
  const LB_GALLERY = 'gallery_total';

  function empty() { return { gallery: 0, clears: {} }; }

  function plan(cur, sent) {
    const out = [];
    const s = sent || empty();
    if ((cur.galleryTotal || 0) > (s.gallery || 0)) {
      out.push({ lbId: LB_GALLERY, score: cur.galleryTotal, kind: 'gallery' });
    }
    (cur.clears || []).forEach(function (c) {
      if (c.clearRuns > 0 && !(s.clears && s.clears[c.themeId])) {
        out.push({ lbId: c.lbId, score: c.clearRuns, kind: 'clear', themeId: c.themeId });
      }
    });
    return out;
  }

  function markSent(sent, item) {
    const s = { gallery: (sent && sent.gallery) || 0, clears: Object.assign({}, sent && sent.clears) };
    if (item.kind === 'gallery') s.gallery = Math.max(s.gallery, item.score);
    else s.clears[item.themeId] = item.score;
    return s;
  }

  function load(store) {
    try {
      const v = JSON.parse(store.getItem ? store.getItem(KEY) : store[KEY]);
      if (v && typeof v.gallery === 'number' && v.clears) return v;
    } catch (_) {}
    return empty();
  }
  function save(store, sent) {
    const s = JSON.stringify(sent);
    if (store.setItem) store.setItem(KEY, s); else store[KEY] = s;
  }

  return { plan, markSent, load, save, KEY, LB_GALLERY };
});
```

- [ ] **Step 4: Run tests** — `npm test` → PASS
- [ ] **Step 5: Commit** — `git add src/lb-sync.js test/lb-sync.test.js && git commit -m "feat(lb): 리더보드 제출 결정 모듈"`

---

### Task 3: Bridge 연동 — 리더보드 ID · 제출 결과 · 메시지

**Files:**
- Modify: `src/playgama-bridge-config.json` (`leaderboards`)
- Modify: `src/playgama.js` (`lbSubmit` 반환값, 상수, 메시지 래퍼, export)
- Modify: `src/index.html` (`<script src="lb-sync.js">` 추가 — `collection.js` 다음)

**Interfaces:**
- Produces:
  - `SG.PG.LB_GALLERY = 'gallery_total'`, `SG.PG.LB_CHAPTER_CLEAR = ['ch1_clear','ch2_clear','ch3_clear']`
  - `SG.PG.leaderboard.submit(score, lbId) → Promise<boolean>` (성공 true, 미지원 · 실패 false)
  - `SG.PG.sendMessage(name, data)`, `SG.PG.sendCustomMessage(id)` — Bridge 없으면 no-op, 예외 삼킴

- [ ] **Step 1: Config** — `leaderboards` 배열을 다음으로:

```json
  "leaderboards": [
    { "id": "kevin-PEB", "isMain": true },
    { "id": "Kevin-PEB2" },
    { "id": "gallery_total" },
    { "id": "ch1_clear" },
    { "id": "ch2_clear" },
    { "id": "ch3_clear" }
  ]
```

- [ ] **Step 2: playgama.js** — `lbSubmit`를 성공 여부를 돌려주게:

```js
  function lbSubmit(score, lbId) {
    if (!_ready || !_bridge || !_bridge.leaderboards) return Promise.resolve(false);
    if (lbGetType() === 'not_available') return Promise.resolve(false);
    var id = lbId || _LB_DAILY;
    return Promise.resolve(_bridge.leaderboards.setScore(id, score))
      .then(function () { return true; })
      .catch(function (e) { console.warn('[SG.PG.lb] setScore failed:', e); return false; });
  }
```

상수 · 래퍼(리더보드 ID 블록 아래):

```js
  var _LB_GALLERY = 'gallery_total';
  var _LB_CHAPTER_CLEAR = ['ch1_clear', 'ch2_clear', 'ch3_clear'];

  // 진행 이벤트 — 실패해도 게임에 영향 없음.
  function sendMessage(name, data) {
    if (!_ready || !_bridge || !_bridge.platform) return;
    try { Promise.resolve(_bridge.platform.sendMessage(name, data)).catch(function () {}); } catch (e) {}
  }
  function sendCustomMessage(id) {
    if (!_ready || !_bridge || !_bridge.platform || typeof _bridge.platform.sendCustomMessage !== 'function') return;
    try { Promise.resolve(_bridge.platform.sendCustomMessage(id)).catch(function () {}); } catch (e) {}
  }
```

`SG.PG`에 `LB_GALLERY: _LB_GALLERY, LB_CHAPTER_CLEAR: _LB_CHAPTER_CLEAR, sendMessage, sendCustomMessage` 추가.

- [ ] **Step 3: 기존 호출부 확인** — `lbSubmit` 반환값을 쓰던 곳 없음(`await`만) → 동작 변화 없음. `grep -n "leaderboard.submit" src/index.html`로 확인.
- [ ] **Step 4: script 태그** — `<script src="collection.js"></script>` 다음 줄에 `<script src="lb-sync.js"></script>`.
- [ ] **Step 5: Verify** — `npm test` PASS, 로컬 페이지 콘솔 에러 없음, `node -e "JSON.parse(require('fs').readFileSync('src/playgama-bridge-config.json','utf8'))"`.
- [ ] **Step 6: Commit** — `git commit -am "feat(lb): 갤러리 · 챕터 리더보드 ID, 제출 성공 여부, 진행 메시지 래퍼"` (lb-sync.js 태그 포함)

---

### Task 4: 기록 시점 연결 · 진행 이벤트 (`index.html`)

**Files:**
- Modify: `src/index.html` — `startCollection`, `_collectionCheckMergesInner`, `collectionGameOver`, 부팅

**Interfaces:**
- Consumes: Task 1 `bumpRuns`/`totalAcquired`/`clearRuns`, Task 2 `SG.LbSync`, Task 3 `SG.PG.*`
- Produces: `lbSyncNow() → Promise<void>`, `chapterIndexOf(themeId) → number (1-based, 0 = 없음)`

- [ ] **Step 1: 헬퍼 추가** (`collectionCheckMerges` 위)

```js
// ── 갤러리 · 챕터 클리어 리더보드 동기화 ─────────────────────────────
function chapterIndexOf(themeId) {
  return SG.CollectionThemes.findIndex(function (t) { return t.id === themeId; }) + 1;
}
let _lbSyncing = false;
async function lbSyncNow() {
  if (_lbSyncing || !SG.PG.isAvailable() || SG.PG.leaderboard.getType() === 'not_available') return;
  _lbSyncing = true;
  try {
    const themes = SG.CollectionThemes;
    const cur = {
      galleryTotal: SG.Collection.totalAcquired(SG.Store, themes),
      clears: themes.slice(0, SG.PG.LB_CHAPTER_CLEAR.length).map(function (t, i) {
        return { lbId: SG.PG.LB_CHAPTER_CLEAR[i], themeId: t.id, clearRuns: SG.Collection.loadTheme(t.id, SG.Store, t).clearRuns };
      }),
    };
    let sent = SG.LbSync.load(SG.Store);
    for (const item of SG.LbSync.plan(cur, sent)) {
      if (await SG.PG.leaderboard.submit(item.score, item.lbId)) sent = SG.LbSync.markSent(sent, item);
    }
    SG.LbSync.save(SG.Store, sent);
  } catch (e) { console.warn('[lb] sync failed:', e); }
  finally { _lbSyncing = false; }
}
```

- [ ] **Step 2: startCollection** — `SG.Collection.grantStartStep(...)` 줄을 다음으로 교체:

```js
  const _startGranted = SG.Collection.grantStartStep(activeThemeId, SG.Store, activeThemeObj);
  SG.Collection.bumpRuns(activeThemeId, SG.Store, activeThemeObj);   // 새 판 = 1판 (CONTINUE는 같은 판)
  const _stepsNow = SG.Collection.loadTheme(activeThemeId, SG.Store, activeThemeObj).acquiredSteps.length;
  SG.PG.sendMessage('level_started', { world: activeThemeId, level: String(_stepsNow) });
  if (_startGranted) {
    SG.PG.sendCustomMessage('ch' + chapterIndexOf(activeThemeId) + '_step01');
    lbSyncNow();
  }
```

- [ ] **Step 3: _collectionCheckMergesInner** — `const rec = SG.Collection.recordMerges(...)` 바로 다음에:

```js
  if (rec.newSteps.length) {
    const _ch = chapterIndexOf(activeThemeId);
    rec.newSteps.forEach(function (it) {
      SG.PG.sendCustomMessage('ch' + _ch + '_step' + String(it.step).padStart(2, '0'));
    });
    if (rec.isComplete) SG.PG.sendMessage('level_completed', { world: activeThemeId });
    lbSyncNow();
  }
```

- [ ] **Step 4: collectionGameOver** — `_runSettled = false;` 다음에:

```js
  try {
    const _t = SG.CollectionThemes.find(function (t) { return t.id === activeThemeId; }) || null;
    const _lv = SG.Collection.loadTheme(activeThemeId, SG.Store, _t).acquiredSteps.length;
    SG.PG.sendMessage('level_failed', { world: activeThemeId, level: String(_lv) });
  } catch (_) {}
```

- [ ] **Step 5: 부팅 백필 · 재시도** — 부팅의 `await SG.FB.init();` 앞에 `lbSyncNow();` (await 안 함).

- [ ] **Step 6: Verify (브라우저, 로컬 mock)** — `?dev=1`로 Chronicles 3번 시작 → `SG.Collection.loadTheme('primordial-earth', SG.Store, SG.CollectionThemes[0]).runs`가 3 증가, 콘솔 에러 없음. `lbSyncNow()`는 mock(`not_available`)에서 즉시 반환.

- [ ] **Step 7: Commit** — `git commit -am "feat(lb): 갤러리 · 챕터 클리어 기록과 진행 이벤트 연결"`

---

### Task 5: 플레이어 랭킹 창

**Files:**
- Modify: `src/index.html` — 갤러리 패널 버튼, `ol-ranking` 오버레이, CSS, 함수
- Modify: `src/i18n.js` — 문구 (ko · en)

**Interfaces:**
- Consumes: Task 3 `SG.PG.LB_GALLERY`, `LB_CHAPTER_CLEAR`, `leaderboard.getEntries/getType`; 기존 `_normalizePgEntries`, `LB_EMPTY_HTML`, `.lb-row` 스타일
- Produces: `openRanking()`, `closeRanking()`, `rankingShowTab(key)`, `refreshRankingButton()`

- [ ] **Step 1: i18n** — `ui.btn`에 `ranking: '🏆 RANKING'`(ko · en 동일), `ui.label`에 `notCleared: '아직 클리어 전'` / `'Not cleared yet'`, `runs: '판'` / `'runs'`, `you: '나'` / `'YOU'`, `rankingTitle: 'RANKING'`.

- [ ] **Step 2: 갤러리 패널** — CLOSE 버튼 앞에:

```html
    <button class="btn-secondary modal-btn" id="btn-gallery-ranking" onclick="openRanking()" data-i18n="ui.btn.ranking" style="display:none">🏆 RANKING</button>
```

- [ ] **Step 3: 오버레이** — `ol-gallery` 다음에:

```html
<div id="ol-ranking" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title" data-i18n="ui.label.rankingTitle">RANKING</div>
    <div id="ranking-tabs" style="display:flex;gap:6px;margin-bottom:10px">
      <button class="soundset-chip modal-btn" data-rk="gallery" onclick="rankingShowTab('gallery')" style="flex:1;justify-content:center">GALLERY</button>
      <button class="soundset-chip modal-btn" data-rk="1" onclick="rankingShowTab('1')" style="flex:1;justify-content:center">CH 1</button>
      <button class="soundset-chip modal-btn" data-rk="2" onclick="rankingShowTab('2')" style="flex:1;justify-content:center">CH 2</button>
      <button class="soundset-chip modal-btn" data-rk="3" onclick="rankingShowTab('3')" style="flex:1;justify-content:center">CH 3</button>
    </div>
    <div id="ranking-rows"></div>
    <div class="lb-sep">···</div>
    <div id="ranking-me" class="lb-row lb-me"></div>
    <button class="btn-secondary modal-btn" onclick="closeRanking()" data-i18n="ui.btn.close">CLOSE</button>
  </div>
</div>
```

- [ ] **Step 4: 함수** (`_normalizePgEntries` 아래). `_normalizePgEntries`에 `name: e.name ? String(e.name) : ''` 필드 추가.

```js
// ── 랭킹 창 (갤러리 · 챕터 최단 클리어) ─────────────────────────────
function rankingAvailable() {
  return SG.PG && SG.PG.isAvailable() && SG.PG.leaderboard.getType() === 'in_game';
}
function refreshRankingButton() {
  const b = document.getElementById('btn-gallery-ranking');
  if (b) b.style.display = rankingAvailable() ? '' : 'none';
}
function openRanking() {
  document.getElementById('ol-ranking').classList.remove('hidden');
  openModalNav('ol-ranking');
  rankingShowTab('gallery');
}
function closeRanking() {
  document.getElementById('ol-ranking').classList.add('hidden');
  openModalNav('ol-gallery');   // 갤러리 위에서 열렸으므로 갤러리로 복귀
}
async function rankingShowTab(key) {
  document.querySelectorAll('#ranking-tabs [data-rk]').forEach(function (b) {
    b.setAttribute('aria-selected', String(b.dataset.rk === key));
  });
  const box = document.getElementById('ranking-rows');
  const me = document.getElementById('ranking-me');
  const t = (k, fb) => (SG.i18n && SG.i18n.t(k)) || fb;
  const isGallery = key === 'gallery';
  const idx = isGallery ? -1 : parseInt(key, 10) - 1;
  const lbId = isGallery ? SG.PG.LB_GALLERY : SG.PG.LB_CHAPTER_CLEAR[idx];
  const fmt = (score) => isGallery ? String(score) : score + ' ' + t('ui.label.runs', 'runs');
  // 내 기록 (로컬)
  if (isGallery) {
    me.innerHTML = '<span class="lb-rank">·</span><span class="lb-id">' + t('ui.label.you', 'YOU') + '</span><span class="lb-score">' +
      SG.Collection.totalAcquired(SG.Store, SG.CollectionThemes) + '</span>';
  } else {
    const th = SG.CollectionThemes[idx];
    const cr = th ? SG.Collection.loadTheme(th.id, SG.Store, th).clearRuns : null;
    me.innerHTML = '<span class="lb-rank">·</span><span class="lb-id">' + t('ui.label.you', 'YOU') + '</span><span class="lb-score">' +
      (cr ? fmt(cr) : t('ui.label.notCleared', 'Not cleared yet')) + '</span>';
  }
  box.innerHTML = '<div class="lb-row lb-empty" style="opacity:.5">Loading…</div>';
  const entries = await SG.PG.leaderboard.getEntries(lbId);
  const rows = _normalizePgEntries(entries).slice(0, 10);
  box.innerHTML = rows.map(function (r, i) {
    const who = (r.name || r.playerId || 'player').slice(-12);
    return '<div class="lb-row"><span class="lb-rank">' + (i + 1) + '</span><span class="lb-id">' + who +
      '</span><span class="lb-score">' + fmt(r.score) + '</span></div>';
  }).join('') || LB_EMPTY_HTML;
}
```

이름은 `textContent` 경로가 아니라 innerHTML이므로 이스케이프: `who`를 `String(...).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))`로 감싼다.

- [ ] **Step 5: 버튼 표시 갱신** — `openGallery()`와 `openGalleryForEndless()` 끝에서 `refreshRankingButton();` 호출.

- [ ] **Step 6: Verify (브라우저)** — 로컬 mock: 갤러리 열어도 RANKING 버튼 숨김. 콘솔에서 `openRanking()` 강제 호출 시 빈 상태/Loading 표시가 깨지지 않고 CLOSE로 갤러리 복귀. `getEntries`를 `async () => [{ id:'x', name:'<b>A</b>', score: 9 }, { id:'y', score: 3 }]`로 대체해 이름 이스케이프 · id 꼬리 표시 확인.

- [ ] **Step 7: Commit** — `git commit -am "feat(lb): 갤러리 · 챕터 최단 클리어 랭킹 창"`

---

### Task 6: 운영자 집계 LB STATS (`?dev=1`)

**Files:**
- Modify: `src/index.html` — dev-bar 버튼, `ol-lbstats` 오버레이, 함수

**Interfaces:**
- Consumes: Task 3 상수, `getEntries`, `_normalizePgEntries`
- Produces: `openLbStats()`, `closeLbStats()`, `lbStatsSummary(lbId, rows) → string` (순수, 텍스트)

- [ ] **Step 1: dev-bar 버튼** — `<button onclick="devUnlockActiveTheme()">UNLOCK</button>` 다음에 `<button onclick="openLbStats()">LB STATS</button>`.

- [ ] **Step 2: 오버레이**

```html
<div id="ol-lbstats" class="overlay hidden">
  <div class="ol-panel">
    <div class="ol-title">LB STATS</div>
    <pre id="lbstats-body" style="text-align:left;font-size:.72rem;white-space:pre-wrap;max-height:60vh;overflow:auto"></pre>
    <button class="btn-secondary modal-btn" onclick="closeLbStats()">CLOSE</button>
  </div>
</div>
```

- [ ] **Step 3: 함수**

```js
// ── 운영자 집계 (?dev=1) — getEntries 반환 목록 기준. 반환 인원이 고정되면 조회 한도(N)로 잘리는 중.
function lbStatsSummary(lbId, rows) {
  const n = rows.length;
  if (lbId === SG.PG.LB_GALLERY) {
    const hist = {};
    rows.forEach(function (r) { hist[r.score] = (hist[r.score] || 0) + 1; });
    const lines = Object.keys(hist).map(Number).sort(function (a, b) { return b - a; })
      .map(function (s) { return '  ' + String(s).padStart(2) + ' scenes: ' + hist[s]; });
    return lbId + ' — returned ' + n + ' (may be capped)\n' + (lines.join('\n') || '  (none)');
  }
  const runs = rows.map(function (r) { return r.score; }).sort(function (a, b) { return a - b; });
  const med = n ? (n % 2 ? runs[(n - 1) / 2] : (runs[n / 2 - 1] + runs[n / 2]) / 2) : '-';
  return lbId + ' — cleared ' + n + ' (may be capped)' +
    (n ? '\n  runs min ' + runs[0] + ' · median ' + med + ' · max ' + runs[n - 1] : '');
}
async function openLbStats() {
  const body = document.getElementById('lbstats-body');
  document.getElementById('ol-lbstats').classList.remove('hidden');
  openModalNav('ol-lbstats');
  if (!(SG.PG && SG.PG.isAvailable() && SG.PG.leaderboard.getType() === 'in_game')) {
    body.textContent = 'Leaderboards not available on this platform (' + (SG.PG ? SG.PG.platformId() : '?') + ').';
    return;
  }
  body.textContent = 'Loading…';
  const ids = [SG.PG.LB_GALLERY].concat(SG.PG.LB_CHAPTER_CLEAR);
  const parts = [];
  for (const id of ids) parts.push(lbStatsSummary(id, _normalizePgEntries(await SG.PG.leaderboard.getEntries(id))));
  body.textContent = parts.join('\n\n');
}
function closeLbStats() {
  document.getElementById('ol-lbstats').classList.add('hidden');
  closeModalNav();
}
```

- [ ] **Step 4: Verify (브라우저)** — 로컬: LB STATS → "not available (mock)". 콘솔에서 `lbStatsSummary('gallery_total', [{score:11},{score:11},{score:3}])`가 11: 2, 3: 1을, `lbStatsSummary('ch1_clear', [{score:4},{score:2},{score:9}])`가 min 2 · median 4 · max 9를 보여줌.

- [ ] **Step 5: Commit** — `git commit -am "feat(lb): 운영자 집계 LB STATS"`

---

### Task 7: 문서 · 빌드 · QA Tool 확인

**Files:**
- Modify: `docs/devLog/Release_Note_v0.9.0.md` (Leaderboards 섹션에 추가)
- Modify: `docs/dev-notes-earthbeyond.md` (v0.9 요약에 리더보드 언급)

- [ ] **Step 1: 릴리스 노트** — Leaderboards 섹션에:

```markdown
- **Gallery & chapter-clear leaderboards:** `gallery_total` ranks players by scenes collected (0–33); `ch1_clear`–`ch3_clear` rank the fewest runs taken to clear each chapter. Open them from the gallery (🏆 RANKING, shown only where leaderboards are available).
- Progress events: `level_started` / `level_failed` / `level_completed` and a custom message per new scene (`ch1_step05` …).
```

- [ ] **Step 2: 전체 테스트** — `npm test` → PASS.
- [ ] **Step 3: Commit 후 빌드** — `git commit -am "docs: v0.9 릴리스 노트에 갤러리 · 챕터 리더보드"` → `npm run build:playgama` → `build/earth-and-beyond-0.9.0-<commit>.zip`.
- [ ] **Step 4: 체크리스트 점검** — `get_game_checklist`로 zip 대비 항목 확인(외부 호출 · 팝업 닫기 · localStorage 직접 사용 없음).
- [ ] **Step 5: 업로드 · QA** — 사용자 확인 후 `start_archive_upload` → `confirm_archive_upload` → `get_archive_status`가 PASSED → `get_archive_qa_tool_link`로 열어 `?dev=1` 없이 갤러리 RANKING 표시, Chronicles 한 판 후 GALLERY 탭에 내 점수, LB STATS(dev)로 집계 확인.
