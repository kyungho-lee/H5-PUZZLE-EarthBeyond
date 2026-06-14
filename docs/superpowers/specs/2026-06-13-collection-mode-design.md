# NeonDrift — Collection 모드 GDD

**버전:** v0.2 (교차 리뷰 반영)
**작성일:** 2026-06-13
**기준 브랜치:** `feat/neon-drift-game`

---

## 1. 모드 개요

### 한 줄 소개

> "1024 타일을 반복해서 완성하며 네온-사이버펑크 세계관의 도감을 채워나가는 수집형 퍼즐 모드"

### 목표

Practice 모드의 1024 Collapse 메커닉을 반복 달성하면서 테마별 이미지를 단계적으로 해금하고,
10번 체인을 완성하면 해당 테마가 클리어된다. 클리어한 테마의 이미지는 도감(Gallery)에서 영구 보관된다.

### Daily / Practice / Collection 비교

| 항목 | Daily | Practice | Collection |
|---|---|---|---|
| 판 수 | 1일 1판 | 무제한 | 무제한 |
| 보드 시드 | 날짜 고정 | 무작위 | 무작위 |
| 1024 Collapse | 없음 | 보드 리셋 후 계속 | 보드 리셋 + **체인 카운터 +1** |
| 목표 | ⭐ 최대화 | 연습 | **테마 완성 (10체인)** |
| 리더보드 | Firebase Daily | 없음 | **테마 완료 시 Firebase** |
| 영구 저장 | 날짜별 별 누적 | 없음 | **도감 진행도 localStorage** |
| 광고 트리거 | 게임오버 | Collapse마다 | **Collapse마다** |

---

## 2. 코어 루프

```
[Collection 모드 시작]
         │
         ▼
[현재 활성 테마 로드]
  - 첫 실행: NEON CITY 자동 선택
  - 이전 테마 완료: 다음 테마 자동 해금
         │
         ▼
[게임 시작: collapseSize=1024, mergeRule='sizeOnly']
(Practice 옵션 동일)
         │
         ▼
[타일 슬라이드 → 1024 타일 생성 감지]
         │
         ▼
[collectionCollapse() 진입]
         │
    1. FX: 파티클 + 링 + 플래시 (400ms)
    2. 해금 팝업: "CHAIN N/10 완성! [이미지 썸네일]" (유저 탭 닫기)
    3. 광고: requestMidgameAd()
    4. localStorage 저장: chainCount++, unlockedSteps 추가
    5. 보드 리셋: emptyGrid(4) + 타일 2개 스폰
    6. HUD 갱신: "COLLECTION · {THEME} ×N"
         │
    chainCount === 10?
    ┌────┴────┐
   YES        NO
    │          │
    ▼     [게임 재개]
[테마 완료 시퀀스]
  - "THEME COMPLETE" 오버레이
  - Firebase 제출 (mode:'collection', themeId)
  - 다음 테마 해금 (localStorage meta 갱신)
  - [도감 보기] / [다음 테마] / [메뉴] 버튼

[게임오버: canMove() === false]
  - 체인 진행도 유지 (중간 종료해도 손해 없음)
  - "CHAIN N/10 유지됨" 메시지 표시
  - [AGAIN] / [도감] / [메뉴]
```

### 핵심 원칙

- **체인은 게임오버 시에도 소멸하지 않는다.** (H5 캐주얼 이탈 최소화)
- **해금 팝업은 광고 앞에 배치.** 보상감을 먼저 주고 광고를 자연스러운 전환점으로 사용.
- **일반 Collapse(중간 체인)도 팝업 표시.** 모든 체인에서 이미지 해금 피드백 제공.

---

## 3. 테마 시스템

### 해금 구조

```
테마 1: NEON CITY     [즉시 플레이 가능]
테마 2: CYBER OCEAN   [테마 1 완료 시 해제]
테마 3: GHOST CIRCUIT [테마 2 완료 시 해제]
... (데이터 배열 확장으로 추가)
```

MVP: 테마 2개 (NEON CITY, CYBER OCEAN)

### 테마 데이터 구조 (데이터 주도 설계 — 하드코드 금지)

```js
// src/collection-themes.js
(function (root) {
  root.SG = root.SG || {};
  root.SG.CollectionThemes = [
    {
      id: 'neon-city',
      label: 'NEON CITY',
      description: '네온 불빛이 가득한 사이버펑크 도시',
      requiredChains: 10,          // 완료 조건 (테마별 조정 가능)
      unlockCondition: null,       // 항상 열림 (첫 번째 테마)
      svgPaths: [                  // 외부 SVG 파일 경로 (lazy fetch)
        'themes/neon-city/step-01.svg',
        // ... step-10.svg
      ],
    },
    {
      id: 'cyber-ocean',
      label: 'CYBER OCEAN',
      description: '네온 빛이 반사되는 사이버 심해',
      requiredChains: 10,
      unlockCondition: 'neon-city',
      svgPaths: [ 'themes/cyber-ocean/step-01.svg', /* ... */ ],
    },
  ];
})(typeof window !== 'undefined' ? window : global);
```

---

## 4. 이미지 단계 설계

### 10단계 구성 원칙

동일한 씬이 단계적으로 완성되는 구조 (누적 레이어 방식):

| 단계 | 레이어 | 내용 |
|---|---|---|
| 1~3 | 배경/무드 | 세계관 분위기, 기본 실루엣 |
| 4~6 | 주요 오브젝트 | 핵심 요소 등장 |
| 7~9 | 디테일 | 파티클, 글리치, 광원 효과 |
| 10 | 완성 컷 | 풀 컬러 + 최대 글로우 |

### NEON CITY 단계 예시

| 단계 | 내용 | SVG 요소 |
|---|---|---|
| 1 | 어두운 도시 스카이라인 실루엣 | 사각형 빌딩 `fill:#060810` |
| 2 | 빌딩 창문 불빛 | 소형 사각형 low opacity |
| 3 | 도로 격자 패턴 | 선형 그리드 `stroke:#1e2235` |
| 4 | 첫 번째 네온 사인 | `stroke:#00f5c8` 글로우 필터 |
| 5 | 두 번째 네온 사인 | `stroke:#ff4060` |
| 6 | 홀로그램 광고판 | 반투명 rect + 글리치 |
| 7 | 비/파티클 레이어 | 세로선들 `stroke:#00c8ff` 0.4 |
| 8 | 도로 반사광 | 그라디언트 오버레이 |
| 9 | 비행 차량 실루엣 | 타원 + 포인트 라이트 |
| 10 | 풀 씬 | 모든 레이어 + 최대 글로우 |

### SVG 파일 규격

```
크기: 240×240px (viewBox="0 0 240 240")
배경: #060810 (게임 배경 일치)
색상: --accent(#00f5c8), --warn(#ff4060), COLOR_PALETTE 준수
목표 파일 크기: 단계당 < 8KB
```

---

## 5. 도감 UI

### 레이아웃 (ASCII Mockup)

```
┌─────────────────────────────────┐
│  ◀ BACK        G A L L E R Y   │
├─────────────────────────────────┤
│ [ NEON CITY ✓ ] [ CYBER OCEAN ○]│  ← 테마 탭
│ [ GHOST CIRCUIT 🔒 ]             │
├─────────────────────────────────┤
│  NEON CITY               7/10  │
│  ████████████████░░░░░░░ 70%   │  ← 진행 바
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 ││  ← 5열×2행 그리드
│  │img│ │img│ │img│ │img│ │img ││    해금: 썸네일
│  └───┘ └───┘ └───┘ └───┘ └───┘│    미해금: ? 박스 (brightness:0.1)
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │ 6 │ │ 7 │ │ 8 │ │ ? │ │ ? ││
│  │img│ │img│ │img│ │ 🔒│ │ 🔒││
│  └───┘ └───┘ └───┘ └───┘ └───┘│
│                                 │
│  [ CONTINUE → ]                 │
└─────────────────────────────────┘
```

### 이미지 상세 뷰 (셀 탭)

```
┌─────────────────────────────────┐
│  ◀            3 / 10            │
├─────────────────────────────────┤
│   ┌─────────────────────────┐   │
│   │      [SVG 이미지]        │   │  ← 200×200
│   └─────────────────────────┘   │
│   NEON CITY — STEP 3            │
│   도로 격자 패턴 등장             │
│   ◀ PREV          NEXT ▶        │
└─────────────────────────────────┘
```

### 구현 방식

- `#ol-gallery` 오버레이 추가 (기존 overlay 시스템)
- `max-width: 480px` (기존 360px보다 넓게)
- CSS Grid 5열, 기존 `--accent`, `--panel` CSS 변수 재사용
- SVG: 도감 오픈 시점에 `fetch()` + `innerHTML` lazy load

---

## 6. 진행 저장 (localStorage)

```js
// 키: 'neondrift_collection_meta'
{
  activeThemeId: 'neon-city',
  unlockedThemes: ['neon-city'],
  completedThemes: [],
}

// 키: 'neondrift_collection_neon-city'
{
  themeId: 'neon-city',
  chainCount: 7,
  unlockedSteps: [1,2,3,4,5,6,7],
  status: 'active',      // 'active' | 'completed'
  completedAt: null,
}
```

### 저장 시점

| 이벤트 | 저장 내용 |
|---|---|
| Collapse 감지 직후 (팝업 이전) | `chainCount++`, `unlockedSteps` 추가 |
| 테마 완료 | `status:'completed'`, `completedAt` |
| 다음 테마 해금 | `meta.unlockedThemes` 추가 |

기존 `daily.js`의 `_read/_write` 패턴 그대로 복사해서 `SG.Collection`으로 노출.
`devResetAll()`에서 `neondrift_collection_*` 키 자동 포함 (기존 prefix 규칙 준수).

---

## 7. Firebase 연동

### 테마 완료 시 제출

```js
// themeId를 mode에 포함해 docKey 충돌 방지
// docKey → "collection_neon-city_2026-06-13_p_xxxx"
await SG.FB.submitScore(10, {
  mode: 'collection_' + themeId,
  themeId,
  date: utcDateStr(),
});
```

MVP: 제출만, 조회 UI 없음. 도감 완료 오버레이에 "기록됨" 텍스트만 표시.

---

## 8. SVG 플레이스홀더 전략

### 외부 파일 + Lazy Fetch (인라인 금지)

```
src/
  themes/
    neon-city/
      step-01.svg ~ step-10.svg
    cyber-ocean/
      step-01.svg ~ step-10.svg
```

도감 오픈 시점에 필요한 단계만 로드:

```js
async function loadThemeSvg(themeId, step) {
  const r = await fetch('themes/' + themeId + '/step-' +
    String(step).padStart(2,'0') + '.svg');
  return r.text();
}
```

**인라인 SVG 100KB 번들 방식 채택 금지** — Playgama QA 초기 로드 기준 위반 위험.

### Claude 생성 플레이스홀더 최소 규격

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="240" height="240" fill="#060810"/>
  <!-- 단계별 레이어 추가 -->
</svg>
```

---

## 9. 구현 구조

### 신규 파일

| 파일 | 역할 |
|---|---|
| `src/collection.js` | 상태 로직 (UMD, `SG.Collection`) |
| `src/collection-themes.js` | 테마 데이터 배열 (`SG.CollectionThemes`) |
| `src/themes/{id}/step-N.svg` | 단계별 SVG 플레이스홀더 |

### index.html 수정

| 변경 | 내용 |
|---|---|
| `#ol-start` | COLLECTION 버튼 추가 |
| `#ol-gallery` | 도감 오버레이 신규 |
| `#ol-unlock` | 이미지 해금 팝업 오버레이 신규 |
| `doMove()` | `collectionMode` 분기 추가 |
| `collectionCollapse()` | 신규 함수 (practiceCollapse 분기) |
| `_collapseShared()` | 공통 추출 (FX + 광고 + 보드 리셋) |
| `startCollection()` | 신규 함수 |

### collectionCollapse() 설계

```js
// practiceCollapse와 공통 부분 추출
async function _collapseShared(collapseInfo) {
  gameRunning = false;
  // FX (400ms)
  await new Promise(r => setTimeout(r, 400));
  try { await SG.CG.requestMidgameAd(); } catch(_) {}
  grid = SG.ND.emptyGrid(4);
  for (let i = 0; i < 2; i++) {
    const s = SG.ND.spawnTile(grid, rng, dailyOpts);
    if (s) grid[s.at[0]][s.at[1]] = { color: s.color, size: s.size };
  }
  gameRunning = true;
}

async function collectionCollapse(collapseInfo) {
  // 1. 저장 (광고 전에 먼저 — 앱 종료 대응)
  const result = SG.Collection.recordChain(activeThemeId, localStorage);
  // 2. 해금 팝업 (광고 전, 보상감 우선)
  await showUnlockPopup(result.chainCount, collapseInfo);
  // 3. 공통 (광고 + 보드 리셋)
  await _collapseShared(collapseInfo);
  // 4. 테마 완료 판정
  if (result.isComplete) await collectionThemeComplete();
  updateCollectionHud();
  renderer.drawGrid(grid);
}
```

---

## 10. MVP 범위

### 포함

- 테마 2개 (NEON CITY, CYBER OCEAN)
- SVG 플레이스홀더 20개 (Claude 생성)
- collectionCollapse() + _collapseShared() 리팩토링
- #ol-gallery 도감 UI
- #ol-unlock 해금 팝업
- localStorage 저장/로드
- Firebase 테마 완료 제출
- 시작 화면 COLLECTION 버튼

### 제외 (향후)

- 도감 리더보드 UI
- 테마 3개 이상 (데이터 배열 확장으로 쉽게 추가 가능)
- 모드 간 크로스 보너스 (Daily → Collection 체인 +1 등)
- 실제 아트 SVG 교체

---

## 11. 미결 확정 사항

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| 01 | 테마 재플레이 | **자유 플레이 허용** (감상 모드) | 이탈 방지, 이미지 재열람 허용 |
| 02 | 체인 누적 | **게임오버 시 유지** | H5 캐주얼, 진행 손실 = 이탈 |
| 03 | 해금 팝업 순서 | **FX → 팝업 → 광고 → 리셋** | 보상감 우선, 광고는 전환점 |
| 04 | 이미지 로딩 | **외부 SVG 파일 + lazy fetch** | 초기 번들 0 증가 |
| 05 | 별 시스템 | **별 유지 + 체인 추가** | 기존 회로 재사용, 수정 최소화 |
| 06 | 버튼 배치 | **DAILY \| PRACTICE \| COLLECTION** | DEV 버튼은 dev-bar 유지 |
| 07 | Firebase 재시도 | **MVP: 무음 처리** | 빈도 낮음, 로컬 완료는 보장됨 |

---

## 12. 교차 리뷰 지적 사항 (반영 기록)

**게임 디자인 리뷰:**
- 1024 도달률 30~40% 우려 → MVP에서 진입 허들 관찰 후 판단 (힌트 토큰은 2차)
- 세션 내 중간 보상 없음 → 별(⭐) 시스템이 중간 보상 역할 (별 유지 결정 근거)
- Daily-Collection 시너지 없음 → 향후 크로스 보너스로 해결 (MVP 제외)
- 별 시스템 정의 불명확 → GDD 본문 보완: 별은 HUD 표시용, 체인이 핵심 진행 지표

**기술 리뷰:**
- SVG 100KB 인라인 금지 → 외부 파일 lazy fetch로 확정
- collectionCollapse 비동기 상태 관리 → _collapseShared 분리 + `openModalNav` 게이트 유지
- index.html 비대화 → collection-shell.js 분리 검토 (공수 고려해 인라인 유지 후 판단)
- Firebase docKey 충돌 → mode에 themeId 포함으로 해결
- 체인 조건 하드코드 금지 → requiredChains 테마 데이터로 외부화

---

*v0.2 — 교차 리뷰 반영 완료. 구현 전 DECISION 전 항목 확정.*
