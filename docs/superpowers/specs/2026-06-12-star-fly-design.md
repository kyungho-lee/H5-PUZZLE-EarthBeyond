# Star-Fly 연출 라이브러리 — 설계

날짜: 2026-06-12
대상: Daily 모드 스타 획득 연출 + 범용 재사용 라이브러리

## 배경

Daily 모드에서 스타 획득 시 카운트는 정상 누적되나(이전 커밋에서 확인), 화면
피드백이 약해 "획득이 안 되는 것처럼" 보였다. 획득한 별을 **개수만큼 HUD 카운터로
하나씩 날려 쌓이게** 하여, 크게 띄웠다가 늦게 이동시켜 인지를 확실히 한다.

이 연출은 여러 게임에서 자주 쓰이므로 **무종속 재사용 라이브러리**로 만들고, 원본을
`h5-puzzle-template`에 두어 새 프로젝트가 자동 상속하게 한다.

## 목표 / 비목표

**목표**
- 획득 스타 N개를 개별 비행시켜 HUD 카운터에 쌓는 연출.
- 어느 HTML/게임에서도 쓸 수 있는 무종속 라이브러리 (`SG.StarFly`).
- 템플릿에 원본 배치 → 신규 게임 자동 포함. 현재 프로젝트는 독립 복사본.

**비목표**
- 스타 누적 로직 변경(이미 정상). 본 작업은 연출 + 라이브러리화만.
- 빌드 도구/번들러 도입. 정적 `<script>` 로드 유지.
- 다른 SG 모듈에 대한 의존 추가 (zero-dependency 원칙).

## 핵심 결정

### A. DOM 오버레이 방식 (캔버스 아님)
별이 **캔버스 보드 안 → 캔버스 밖 HUD 카운터**로 날아가야 한다. 캔버스 파티클은
캔버스 경계를 벗어날 수 없으므로, 비행 별은 `document.body`에 붙는 **절대위치 DOM
노드**로 구현한다. 좌표계는 **viewport(화면) 좌표**로 통일한다.

### B. 좌표 주입식 API (게임/캔버스 무관)
라이브러리는 캔버스도 HUD도 모른다. 호출자가 출발 화면좌표와 도착 DOM 엘리먼트만
넘긴다. 도착점은 매 프레임 `getBoundingClientRect()`로 재측정해 레이아웃 변화에도
정확히 착지한다.

### C. Zero-dependency + 복사 배포
`SG.particles`/`Renderer`/canvas 등 어떤 SG 모듈에도 의존하지 않는다. 브라우저
전역(`document`, `requestAnimationFrame`)만 사용. 파일 공유는 심링크/빌드 종속 없이
**각 프로젝트가 동일 내용의 독립 복사본**을 보유한다. 원본은 템플릿.

## 공개 API

```js
SG.StarFly.burst({
  from:  { x, y },     // 화면(viewport) 좌표 — 출발점 (필수)
  to:    Element,      // 도착 DOM 엘리먼트 (HUD 카운터). 매 프레임 위치 재측정 (필수)
  count: 5,            // 날릴 별 개수 (기본 1)
  onArrive: fn,        // 별 1개 도착 시마다 호출 — 카운터 +1 틱 (선택)
  onDone:   fn,        // 전부 도착 후 1회 (선택)
  glyph: '★',          // 별 글리프 (선택, 기본 '★') — 코인/하트 등 재사용 가능
  color: '#ffd23f',    // 색 (선택, 기본 금색)
  size:  28,           // px (선택, 기본 28)
  stagger: 80,         // 개별 출발 간격 ms (선택, 기본 80)
});
```

- `from`/`to`가 없으면 no-op (안전 가드). `to`가 DOM에서 사라지면 마지막 좌표 사용.
- 반환값 없음. 진행은 콜백으로 관찰.

## 모션 (별 1개당 3단계)

| 단계 | 시간 | 동작 |
|------|------|------|
| 머문(hold) | ~500ms | 출발점에서 scale 1.6→1.0 팝업 후 제자리 글로우. 인지 확보. |
| 비행(fly) | ~700ms | HUD로 2차 베지어 호각선 비행, ease-in-out. 약간 축소. |
| 착지(land) | 즉시 | `onArrive()` 호출 → 카운터 +1 + 작은 펄스. 노드 제거. |

- N개를 `stagger`(기본 80ms) 간격으로 순차 출발 → "하나씩 빨려 들어가 쌓이는" 느낌.
- 자체 `requestAnimationFrame` 루프. 활성 별이 0이면 루프 자동 정지(유휴 비용 0).
- `Date.now()`/`Math.random()`는 모션 지터에만 사용(렌더 전용, 결정성 불필요).

## 별 렌더링

- 각 별 = `document.body` 절대위치 DOM 노드. 기본 `★` 텍스트 + 금색 텍스트섀도 글로우.
- CSS 클래스 `.sg-star-fly`를 JS가 `<style>`로 **최초 1회 주입** → HTML에 CSS 추가 불필요.
- `pointer-events:none`, 높은 `z-index`로 입력 방해 없이 최상단 표시.

## NeonDrift 통합

- **인캔버스 `⭐+N` 플로트(기존 `_fireMerges`)는 유지하되 역할 축소**: 보드 위 즉시
  피드백은 캔버스가, "HUD로 쌓이는" 비행은 `StarFly`가 담당. (중복이 아니라 역할 분담:
  병합 지점의 순간 강조 → 카운터로의 이동 인지)
- 호출 지점: `index.html` `doMove`의 데일리 분기. `result.completed`가 있으면 각
  완료 타겟의 병합 셀을 화면좌표로 변환:
  `rect = canvas.getBoundingClientRect()` + `cellXY(r,c)`(CSS px, dpr 보정 주의)
  → `from = { x: rect.left + cssX, y: rect.top + cssY }`.
- `to = document.getElementById('stat-score')`, `count = completed의 stars 합`.
- `dailyRunStars`는 이미 누적돼 있으므로, `onArrive`마다 HUD 숫자만 1씩 틱업하도록
  `updateDailyHud` 호출 타이밍을 비행 도착에 맞춘다(즉시 전체 갱신 대신 점증 표시).

### 좌표 변환 주의
캔버스 FX는 CSS px(`cellXY`)로 그려지고 `canvas.width`는 dpr 배율이 적용돼 있다.
`getBoundingClientRect()`는 CSS px를 반환하므로 `cellXY` 결과(CSS px)를 그대로
더하면 된다. dpr 재보정 불필요.

## 파일 / 배치

| 파일 | 역할 |
|------|------|
| `h5-puzzle-template/src/star-fly.js` | 원본 (신규 게임 자동 상속) |
| `H5-PUZZLE-NeonDrift-v1/src/star-fly.js` | 독립 복사본 (동일 내용) |
| `H5-PUZZLE-NeonDrift-v1/src/index.html` | `<script>` 로드 + `doMove` 통합 |
| `H5-PUZZLE-NeonDrift-v1/src/grid-render.js` | 인캔버스 플로트 유지(변경 최소) |

## 테스트 / 검증

- `scripts/star-fly-check.js`: 최소 DOM 스텁으로 `burst({count:N})` 호출 시
  (1) 별 노드 N개 생성, (2) `onArrive` N회, (3) `onDone` 1회를 어서트.
  RAF는 가짜 타이머로 진행. jsdom 미사용.
- 기존 `node --test` 50개 회귀 없음 확인.
- 브라우저 실구동 확인은 드라이버 부재로 사용자 검증에 위임(또는 Playwright 설치 옵션).

## 리스크 / 완화

- **좌표 오차**(스크롤/리사이즈): 도착점 매 프레임 재측정으로 흡수. 출발점은 발사
  시점 1회 고정(보드는 비행 중 안 움직임).
- **다량의 별**(예: 연쇄로 10+): `stagger`로 분산되나, 과도하면 `count` 상한(예 12)
  + 나머지는 즉시 카운트 반영을 고려. 1차 구현은 상한만 두고 단순 유지.
- **템플릿/복사본 동기화 누락**: 동일 내용 보장을 위해 통합 시 `diff -q`로 확인.
