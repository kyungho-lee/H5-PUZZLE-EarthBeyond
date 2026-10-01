# 지층(Strata) 최소판 — 출고 게이트 기록 (v0.9.1)

_임하루(디자인 · 밸런스) · 2026-10-01 · 근거 스펙: `pd-final-spec.md` §2-1 · §7-1 · 설계: `r1-design.md` P1 · `r2-design.md` §2-1_
_결정: PD 10/4 18:00 KST — 이 문서로 출고 / 대체안을 정한다._

## 0. 판정 (요약)

| 게이트 (스펙 §2-1, CONTINUE 없이) | 기준 | 결과 (greedy · corner) | 판정 |
|---|---|---|---|
| 판당 1장 클리어 | 25~45% | **38.1% · 30.8%** | **통과** |
| 첫 클리어까지 판 수(중앙) | ≤ 3판 | **2판 · 2판** (3판 안 77% · 69%) | **통과** |
| 한 판 길이 | ≈ 5분 | 중앙 **4.4 · 4.1분**, 클리어한 판 **5.0 · 5.2분** (60수/분 가정) | **통과**(가정 조건부, §3) |
| 소프트락 | 0 | **0 / 9,000판** (+ 첫 클리어 sim 6,000명분) | **통과** |
| 참고: 별 CONTINUE 1회(판당 상한 1) | 기록만 | **80.9% · 74.4%** | 상한 1회가 꼭 필요(§2) |

**→ 출고 권장(go).** 단, 초보형 봇 위험(§2-3)과 실측 미완(§3)을 함께 적는다.

## 1. 규칙 (구현 = `src/strata.js`)

- **대상**: ~~1장만~~ → **10/2 개정(§6): 1 · 2 · 3장, 창 6/7/7**. Daily · Endless 는 꺼짐(`enabledFor` = false).
- **화석 정리**: 판 최고 `best` 로 경계 `threshold = best >> 6` 이 오르는 순간, `size < threshold` 칸을 모두 비운다. 최고 칸은 절대 지우지 않는다.
  - 128 → 크기 1 정리, 256 → 2 미만, 512 → 8 미만 … (판당 정리 이벤트 중앙 1회, 정리 칸 중앙 1~2개)
- **생성 크기 상승**: `spawnSize(best) = max(1, best >> 5)` (64→2, 128→4, 256→8, 512→16). 엔진 수정 없음 — `EBStrata.gradedTiers()` 를 `opts.gradedTiers` 에 넣으면 기존 `gradedSpawnSize` 가 정확히 이 값을 낸다(테스트로 고정).
- **저장**: 새 Storage 키 **없음**. 판 상태 `{enabled, base, steps}` 는 메모리에만. 기존 저장(갤러리 · 별 · runs)은 그대로 읽힌다.
- r1/r2 sim 의 규칙과 같다(창 6, 화석 + 기본 크기 상승). r2 값(greedy 36% · corner 30%)을 이번 sim 이 재현했다.

## 2. sim 결과

`node scripts/sim-strata.mjs --runs 1000 --players 500` (봇별 1,000판, 첫 클리어는 가상 플레이어 500명 × 최대 30판, 실제 `applyMove` + `strata.js`, `startCollection()` 의 1장 옵션 그대로, 시드 고정 → 재현 가능)

| 봇 | 변형 | 판당 클리어 | 512 도달 | 판 길이 중앙 (p25–p75) | 분/판 | 클리어 판 수·분 | 첫 클리어 중앙 판 | 3판 안 | 30판 안 못 깸 | 첫 클리어까지 분 | 소프트락 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy | 지층 꺼짐 · CONT 0 | 0.0% | 0.2% | 262 (202–316) | 4.4 | — | — | 0% | 100% | — | 0 |
| greedy | **지층 · CONT 0** | **38.1%** | 46.5% | 265 (193–301) | 4.4 | 299 (5.0) | **2** | 76.6% | 0% | 9.2 | 0 |
| greedy | 지층 · CONT 1 | 80.9% | 89.5% | 309 (290–334) | 5.2 | 310 (5.2) | 1 | 99.0% | 0% | 5.3 | 0 |
| corner | 지층 꺼짐 · CONT 0 | 0.0% | 0.0% | 223 (186–297) | 3.7 | — | — | 0% | 100% | — | 0 |
| corner | **지층 · CONT 0** | **30.8%** | 36.7% | 247 (174–304) | 4.1 | 310 (5.2) | **2** | 69.0% | 0% | 10.1 | 0 |
| corner | 지층 · CONT 1 | 74.4% | 83.2% | 321 (301–338) | 5.3 | 324 (5.4) | 1 | 98.4% | 0% | 5.6 | 0 |
| mixed | 지층 꺼짐 · CONT 0 | 0.0% | 0.0% | 169 (140–221) | 2.8 | — | — | 0% | 100% | — | 0 |
| mixed | 지층 · CONT 0 | 7.1% | 12.2% | 160 (132–213) | 2.7 | 297 (5.0) | 14 | 18.2% | 19.4% | 28.6 | 0 |
| mixed | 지층 · CONT 1 | 28.9% | 43.7% | 272 (221–310) | 4.5 | 311 (5.2) | 3 | 64.8% | 0% | 11.1 | 0 |

봇: greedy = 합치기 최다(숙련 상한), corner = down→left→right→up(흔한 사람형, r1/r2 와 같음), mixed = greedy 75% + 무작위 25%(초보형, 이번에 추가).

### 2-1. 소프트락 검사 (sim 이 판마다 확인)
- 수 상한 6,000 도달 · `canMove` 인데 움직이는 방향 없음 · **화석 정리할 칸이 남은 채 게임오버** · 화석이 최고 칸을 지움 · 빈 보드 → **전부 0건**.
- 같은 검사를 `test/strata.test.js` 에 시드 30판으로 넣었다(`npm test`).

### 2-2. CONTINUE
- 별 CONTINUE 1회(상위 3종 외 제거, `continueRemovableCells` 와 같은 규칙)만 붙여도 74~81%. 2회 이상이면 r2 기준 94~96%. → 스펙 §2-3 **"별 결제만 · 판당 1회"는 지층 게이트의 전제**다. 상한이 빠지면 출고하지 않는다.
- 신규 유저는 별 0 이라 CONTINUE 가 안 보인다 → 신규 유저 경험 = CONT 0 줄.

### 2-3. 위험 — 초보형(mixed)
- 무작위 수가 25% 섞이면 판당 7%, 첫 클리어 중앙 14판, 30판 안 못 깸 19%. 게이트 기준 봇(greedy · corner)은 통과지만 **서툰 사람에게는 여전히 벽**이 남는다.
- 지금 조정하지 않는 이유: 창 5 는 84%(r1)로 너무 쉽고, 창 6 과 5 사이의 중간 레버는 측정이 없다. 10/5 동결 전에 새 레버를 넣으면 게이트를 다시 재야 한다.
- 측정 창에서 볼 것: `run_ended {moves, duration_sec, max_step}` 의 1장 `max_step` 분포 · `ch1` 클리어까지 `runs`(`clearRuns`). 10 · 11단계 도달이 corner 줄(31%)보다 크게 낮으면 v0.9.2 에서 창/스폰을 다시 맞춘다.

## 3. 시간 가정과 실측 (운영 §7-1 조건 ②)

- 모든 "분"은 **60수/분(1수 ≈ 1초)** 가정이다. 45수/분이면 판 중앙 5.5~5.9분, 클리어 판 6.6~6.9분 — 여전히 "≈5분" 범위의 위쪽.
- **사람 실플레이 2~3판 실측은 아직 없다**(이 작업은 브라우저 금지). 셸 배선 뒤 tech/QA 가 로컬에서 1장 2~3판을 두고 아래 칸을 채운다. 실측 분당 수가 40 미만이면 PD 에게 알린다(판 길이 ≥ 6분 → 피로 위험).

| 실측 | 판 1 | 판 2 | 판 3 |
|---|---|---|---|
| 수 / 시간 / 최고 / 화석 이벤트 | _ | _ | _ |

## 4. 셸 배선 (tech lead 용 — `src/index.html`, 엔진 수정 없음)

API (`window.EBStrata`, UMD — node 에서는 `require('../src/strata.js')`):
```
EBStrata.enabledFor(chapterId) -> bool              // 'primordial-earth' 만 true
EBStrata.gradedTiers()          -> tiers            // opts.gradedTiers 에 넣는다(생성 크기 상승)
EBStrata.newRun(chapterId)      -> ctx              // 판 시작마다 1개
EBStrata.onNewBest(grid, best, ctx) -> { fossils:[[r,c]...], spawnBase, threshold, advanced }
                                                    // grid 를 바꾸지 않음. 경계가 오른 수에만 fossils 가 참
EBStrata.clearCells(grid, cells) -> n               // 제자리에서 칸을 비움
EBStrata.fossilCells(grid, best) / threshold(best) / spawnSize(best) / describe(lang) / WINDOW
```

① 스크립트 (`neon-drift.js` 다음 줄):
```html
<script src="strata.js"></script>
```

② `startCollection()` — `const gradedTiers = collectionGradedTiers(progress);` 다음:
```js
const _strataOn = !!(window.EBStrata && EBStrata.enabledFor(activeThemeId));
strataRun = _strataOn ? EBStrata.newRun(activeThemeId) : null;   // 전역: let strataRun = null;
```
그리고 `dailyOpts = Object.assign(...)` 안의 `gradedTiers: gradedTiers` 를
```js
gradedTiers: _strataOn ? EBStrata.gradedTiers() : gradedTiers,
```
(첫 2칸 생성 전에 dailyOpts 가 정해지므로 시작 칸은 크기 1 그대로.) `startEndless` 등 다른 시작 함수에서는 `strataRun = null;`.

③ `doMove()` 의 `renderer.animate` 콜백, `if (collectionMode) {` 블록 **맨 앞**(collectionCheckMerges · 게임오버 판정보다 먼저 — 순서가 바뀌면 "정리할 칸이 있는데 게임오버"가 생긴다):
```js
if (collectionMode) {
  if (strataRun && !result.collapse) {
    const st = EBStrata.onNewBest(grid, ND.maxSize(grid), strataRun);
    if (st.fossils.length) {
      isAnimating = true;                                   // 연출 중 입력 차단
      (async function () {
        try { await playClearFx(st.fossils); } catch (_) {} // 기존 클리어 연출 재사용(CONTINUE 와 같은 경로)
        EBStrata.clearCells(grid, st.fossils);
        renderer.drawGrid(grid);
        if (strataRun.steps === 1) showGameToast(EBStrata.describe(SG.i18n && SG.i18n.getLang()), 2400);
        isAnimating = false;
        _collectionAfterMove(result);                       // ↓ 기존 본문을 함수로 뺀 것
      })();
      return;
    }
  }
  _collectionAfterMove(result);
  return;
}
```
```js
function _collectionAfterMove(result) {   // 기존 collectionMode 블록 본문 그대로
  const mergedSizes = result.merges.map(function (m) { return m.size; });
  if (mergedSizes.length) { collectionCheckMerges(mergedSizes); return; }
  if (ND.checkGameOver(grid, 'sizeOnly')) { collectionGameOver(); return; }
}
```
- CONTINUE 는 같은 판 → `strataRun` 을 그대로 둔다. PLAY AGAIN / 새 판은 `startCollection()` 이 새로 만든다.
- 끄는 스위치(긴급): `EBStrata.CHAPTERS.length = 0;` 한 줄, 또는 ① 의 script 태그 삭제(② · ③ 은 `window.EBStrata` 가드로 꺼진다).
- 빌드: `scripts/build-playgama.mjs` 는 `src/` 전체를 담으므로 추가 작업 없음.

④ (기존 버그 · 같이 고치길 권함) `_collectionCheckMergesInner` 의 "새 step 획득" 경로는 팝업 뒤 `gameRunning = true` 로 재개하면서 **게임오버를 판정하지 않는다**. 그 수로 보드가 막히면 입력이 전부 무시되는 소프트락이 된다(지층과 무관, 지층이 칸을 비워 빈도는 줄어든다). 끝의 `renderer.drawGrid(grid);` 다음에:
```js
if (ND.checkGameOver(grid, 'sizeOnly')) { collectionGameOver(); return; }
```

## 5. 대체안 (게이트 미달 / PD no-go 시 — 0.5h)

한 줄: `isEndlessUnlocked()` 의 반환을
```js
return (meta.completedThemes && meta.completedThemes.length > 0) ||
       SG.Collection.loadTheme('primordial-earth', SG.Store, SG.CollectionThemes[0]).acquiredSizes.indexOf(128) !== -1;
```
로 바꾸고, 잠김 토스트 문구를 "Reach 128 in Chronicles to unlock Endless"(ko: "Chronicles 에서 128 을 만들면 열립니다")로 고친다. 이때 지층은 ③ 의 끄는 스위치로 끈다. Storage 키 변경 없음.

## 6. 재게이트 — 승인 조합 (10/2, `cont-pd-final.md`)

조합: **지층 3장 · 창 6/7/7** + 별 CONTINUE 5⭐ · 판당 1회(지갑 + 이번 판 미정산 별, 판 별 먼저) + **게임 첫 판(1장 첫 판) 무료 CONTINUE 1회** + **표시 없는 연패 보정**(같은 장 게임오버 2연속 → 다음 판 생성 한 단계 위, 장 클리어로 해제, 세션 한정).
sim: `node scripts/sim-continue.mjs --gate --players 300` — `src/strata.js` API(`newRun(id)` · `gradedTiers(ctx)` · `onNewBest` · `noteRunEnd`)를 셸과 같은 순서로 호출. 봇별 300명 × 최대 60판, 60수/분 + 판당 0.25분.

| 봇 | 1장 판당 | 2장 판당 | 3장 판당 | 1장까지 판·분 | 엔딩(60판 안) | 엔딩까지 판 | 엔딩까지 분(중앙 · p75) | 첫 세션 분* | 첫 세션 1장 클리어* | CONTINUE 쓴 판 | 보정 걸린 판 | 소프트락 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greedy(숙련) | 78% | 35% | 35% | 1 · 5.6 | 100% | 7 | 41.6 · 47.8 | 24.8 | 94% | 86% | 31% | 0 |
| **corner(보통)** | **73%** | **32%** | **33%** | **1 · 5.8** | **100%** | **7** | **44.6 · 51.2** | 25.1 | 93% | 89% | 35% | 0 |
| **novice(초보)** | **40%** | **12%** | **14%** | **3 · 10.6** | **100%** | **17** | **74.2 · 101.2** | 19.6 | 70% | 97% | 68% | 0 |

\* 세션 모델은 `cont-design.md` §1 가정(선택지 비교용).

- **판정**: 엔딩 도달 100%(봇 3종), 소프트락 0. 2 · 3장 판당 32~35%(보통) — 1장 게이트 범위(25~45%)와 같은 "어렵지만 깨는" 구간. 1장은 CONTINUE 가 거의 늘 있어(무료 1회 + 별) 판당 73~78% — 의도한 쉬운 입구.
- **1장 게이트(§0, CONTINUE 없이)는 변하지 않았다**(`sim-strata.mjs` 재실행: greedy 38.1% · corner 30.8%, 같은 값).
- **주의**: 초보 2 · 3장 12~14% 는 연패 보정에 기대는 값이다(보정 걸린 판 68%). 보정을 빼면 초보 엔딩 10%(`cont-design.md` A7).
- **이중 보정 금지**: `session-rules.assistTiers()` 와 `EBStrata` 의 `ctx.shift` 는 같은 효과다. 셸은 **둘 중 하나만** 쓴다(§4 개정 참고 — 메시지로 전달).

### 개정 API (하위 호환)
```
EBStrata.WINDOWS = { 'primordial-earth':6, 'human-civilization':7, 'solar-system':7 }; CHAPTERS = 위 3개
EBStrata.windowFor(id)                  -> 6 | 7
EBStrata.newRun(id)                     -> { enabled, chapterId, window, shift, base, steps }   // shift = 연패 보정(0|1)
EBStrata.gradedTiers(ctx | id | ())     -> ctx: 창 + shift 반영 / id: 창만 / 인자 없음: 창 6(예전과 같음)
EBStrata.onNewBest(grid, best, ctx)     -> 그대로 (ctx.window 사용)
EBStrata.noteRunEnd(id, 'game_over' | 'chapter_clear' | 'quit')   // 연패 보정용, 세션 메모리만
EBStrata.lossStreak(id) / assistShift(id) / resetSession()
끄는 스위치: EBStrata.CHAPTERS.length = 0  (그대로)
```

## 7. 파일

- `src/strata.js` — 규칙 + 훅(순수, 의존성 없음, Storage 없음)
- `scripts/sim-strata.mjs` — 이 문서의 표를 다시 만든다
- `test/strata.test.js` — 규칙 · 엔진 graded 일치 · 꺼짐 · 소프트락 시드 30판 (`npm test` 74/74 통과(10/2), 기존 baseline 불변)
