# 혜성 타일 · 관측소 칸 — 설계

- 날짜: 2026-09-26
- 대상: Earth & Beyond (Daily · Endless)
- 배경: Playgama 심사 거절(MOD-5167, 2026-06-17) — *"If you can add original mechanics, curated art direction, or hand-tuned gameplay, we'd love to take another look."* 이 문서는 그중 **original mechanics** 에 답한다. 이미지 보정(curated art direction)은 별도 작업이다.

## 0. 목표와 성공 기준

- 우주 테마에서 나온 오리지널 메커닉 두 개를 넣고, 둘이 서로 맞물려 매 턴 판단거리를 만든다.
- 성공 기준
  1. Daily 한 판(수 분) 안에 심사자가 두 메커닉을 모두 만나고, 첫 등장 안내로 규칙을 이해한다.
  2. 옵션을 주지 않은 모드(Chronicles · 메인)는 동작이 **완전히 같다**(회귀 테스트로 보장).
  3. 같은 날짜 · 같은 입력이면 Daily 결과가 같다(공정성).
  4. Daily 별 경제(64/128/256/512 → 1/2/3/5)는 바뀌지 않는다.

## 1. 규칙

### 1.1 혜성 타일 (Comet)

| 항목 | 값 |
|---|---|
| 등장 | 이동 뒤 새 타일이 생길 때 `chance` 확률로 일반 타일 대신 혜성 |
| 기본 확률 | 8% (`chance: 0.08`) |
| 동시 개수 | 보드에 최대 1개 |
| 첫 등장 | `turn ≥ minTurn`(5) 부터 |
| 값 | 일반 타일과 같다(Daily 2 또는 4). 다른 타일과 똑같이 합쳐진다 |
| 수명 | `ttl` 6. 유효한 이동 1번 = 1턴 |
| 합치면 | 그 머지 점수 ×3(`mult: 3`). 결과 타일은 일반 타일 |
| 놓치면 | ttl 이 0 이 되면 사라진다. 벌은 없다 |

2048류에서 타일이 사라지는 것은 칸이 비는 이득이다. 그래서 "사라짐"을 벌이 아니라 **놓친 기회**로 설계한다 — "혜성을 쫓을까, 모서리 전략을 지킬까"가 판단거리다.

### 1.2 관측소 칸 (Observatory)

| 항목 | 값 |
|---|---|
| 개수 | 4×4 보드에 1칸 |
| 위치 | Daily: 날짜 시드(별도 스트림 `날짜 + "obs"`) — 모두 같다. Endless: 무작위 |
| 효과 | 머지 결과가 이 칸에 떨어지면 그 머지 점수 ×2 |
| 재배치 | 1024 Collapse 로 보드가 초기화될 때 새 위치로 |

### 1.3 겹침과 계산 순서

- 혜성 머지가 관측소에 떨어지면 ×3 × ×2 = **×6**.
- 점수 = `Σ(머지 size × 머지 배율) × 연쇄 배율(chainMultiplier, 최대 ×5)`.
- Endless 는 연쇄 배율을 쓰지 않는다(기존과 같음): `Σ(머지 size × 머지 배율)`.
- Daily 리더보드 점수 `별×10000 + 점수` 구조는 그대로. 배율은 같은 별 수 안의 순위만 가른다.

### 1.4 적용 모드

| 모드 | 적용 | 이유 |
|---|---|---|
| Daily | 예 | 점수 · 리더보드가 있다. 시드로 공정하다 |
| Endless | 예 | 점수 기반, 코어 옵션을 Daily 와 공유한다 |
| Chronicles | 아니오 | 점수가 아니라 장면 해금이 목표. Era 4~7 설계 때 따로 본다 |
| 메인(8×8) | 아니오 | 개발용 모드 |

## 2. 화면 · 연출 · 안내

### 2.1 혜성 타일 (`grid-render.js` `drawTile`)

- 금색 테두리 + 은은한 맥동 글로우, 대각선 짧은 꼬리(Canvas 그라디언트 — 새 이미지 없음).
- 남은 턴 배지: **왼쪽 아래** 원형(오른쪽 위는 기존 단계 번호 배지). ttl ≤ 2 이면 빨간색 + 깜빡임.
- 사라질 때: 그 칸에서 금색 입자가 흩어지고 "☄️" 가 떠오르며 사라진다(기존 FloatText · 입자 재사용).

### 2.2 관측소 칸 (`_drawCellBg`)

- 청록 원형 문양 + 작은 망원경 아이콘. 타일이 올라가도 칸 테두리 글로우는 보인다.
- 위치가 바뀌면 새 칸에서 한 번 반짝인다.

### 2.3 머지 연출 (`_fireMerges`, 기존 "⭐+N" 패턴)

- 관측소: 떠오르는 점수 옆 청록 "×2".
- 혜성: 금색 "☄️×3", 입자 더 많이.
- 겹침: 큰 금색 "×6" + 짧은 금색 화면 플래시(기존 `flash` 재사용 — 렌더러에 흔들림 기능이 없어 새로 만들지 않는다).

### 2.4 첫 등장 안내

- 각 요소가 **처음 나타나는 순간 한 번** 기존 토스트(`showGameToast`)로 4초 안내. 게임은 멈추지 않는다.
  - Comet — EN: *"A comet! Merge it within 6 moves for ×3 points — or it flies away."* / KO: *"혜성이다! 6번 안에 합치면 점수 ×3 — 놓치면 날아가요."*
  - Observatory — EN: *"Observatory — merges that land here score ×2."* / KO: *"관측소 — 여기서 합치면 점수 ×2."*
- 본 기록: `earthbeyond_tut_comet`, `earthbeyond_tut_observatory` (Daily · Endless 공유).
- Daily 시작 튜토리얼(`_DTUT_CONTENT.daily`)에 두 요소를 한 줄씩 추가.

### 2.5 문구 · 접근성

- 새 문구는 `i18n.js` `ui.toast` / `ui.hint` 에 **EN · KO 를 함께** 넣는다(한쪽만 있으면 `t()` 폴백이 재귀할 수 있다 — 코드 읽기 기준).
- 색만으로 구분하지 않는다: 혜성 = 꼬리 + 배지 숫자, 관측소 = 망원경 아이콘.

## 3. 구조와 데이터 흐름

원칙: **코어는 판정, 셸은 실행**(1024 Collapse 와 같은 분리). 옵션이 없으면 코어 동작은 이전과 같다.

### 3.1 코어 — `src/neon-drift.js`

- 타일: `{color, size}` → `{color, size, comet?: {ttl}}`. `slideLine` · `cloneGrid` 가 추가 필드를 보존하도록 고친다(지금은 버린다).
- 새 옵션
  - `opts.comet = {chance, ttl, minTurn, mult}` — 없으면 혜성 없음
  - `opts.observatory = [r, c]` — 없으면 관측소 없음
  - `opts.turn` — 셸이 넘기는 현재 턴 수
- `applyMove` 순서
  1. 슬라이드 · 머지. 머지마다 `mult` = (혜성이 섞였으면 `comet.mult`) × (결과 칸이 관측소면 2). 결과 타일은 일반 타일.
  2. `scoreGained = Σ(size × mult) × chainMultiplier(chain)`.
  3. 남은 혜성 ttl − 1, 0 이면 제거하고 `expired` 에 기록.
  4. 스폰. 보드에 혜성이 없고 `turn ≥ minTurn` 이면 `rng() < chance` 로 혜성.
- 결과에 추가(기존 필드는 그대로): `merges[i].mult`, `merges[i].points`, `cometCaught`, `expired: [{at}]`, `spawned.comet`.
- `canMove` / `checkGameOver` 는 바꾸지 않는다(혜성도 합쳐지는 일반 타일).
- 난수: 혜성 확률 판정은 옵션이 있을 때만 `rng` 를 한 번 더 부른다 — 옵션이 없으면 난수 순서가 이전과 같다.

### 3.2 셸 — `src/index.html`

- `doMove` 에 턴 카운터(유효 이동마다 +1). 게임 시작 · Collapse 에서 0.
- 관측소 위치: Daily 는 `dailySeededRng(날짜 + "obs")` 별도 스트림, Endless 는 `makeRng`. 시작 · Collapse 때 다시 정해 렌더러에 알린다.
- `buildDailyOpts` 와 Endless 옵션에 `comet` · `observatory` · `turn` 을 채운다.
- Endless 점수(`HTML:1474`, 지금 `Σ m.size`) → `Σ m.points`.
- 첫 등장 판단 · 말풍선 표시.

### 3.3 렌더러 — `src/grid-render.js`

- `setObservatory(r, c)` (null 로 끔) → `_drawCellBg` 가 문양을 그린다. 트윈 중 셀 루프(`grid-render.js:474-477`)에도 같은 처리.
- `drawTile` 이 `tile.comet` 을 보고 테두리 · 꼬리 · 배지.
- `_fireMerges` 가 `mult` 로 ×2 / ×3 / ×6, `expired` 로 날아가는 연출.

## 4. 테스트

`test/neon-drift.test.js` (`node --test`, 지금 저장소에는 테스트 파일이 없다).

1. 회귀: 옵션 없이 고정 시드로 N수 진행한 결과가 변경 전과 같다(변경 전 코드로 스냅샷을 먼저 만든다).
2. 혜성이 미끄러져도 `comet.ttl` 이 유지된다.
3. 이동 1번에 ttl −1, 0 에서 제거되고 `expired` 에 기록된다.
4. 혜성 머지 ×3, 관측소 머지 ×2, 겹침 ×6, 그 뒤 연쇄 배율.
5. 혜성은 보드에 최대 1개, `turn < minTurn` 이면 나오지 않는다.
6. 같은 시드 · 같은 입력 → 같은 결과.

추가 확인
- 밸런스: 기존 시뮬레이션 방식(`docs/sims`)으로 혜성 등장 빈도 · 잡는 비율 · 평균 점수 변화를 재고, 필요하면 8% · 6턴 · ×3 을 조정한다.
- 화면: `scripts/visual-check.mjs` 로 두 요소가 보이는 스크린샷.

## 5. 출시

### 5.1 제출 zip 경로 문제 수정 (선행)

- 증상: 2026-06-16 에 올린 빌드에서 타일 · 시작 화면 이미지가 안 나오고 숫자 타일만 보였다.
- 원인: `CLAUDE.md` 가 안내하는 `Compress-Archive`(Windows PowerShell 5.1)는 zip 항목 이름을 역슬래시로 적는다(`themes\human-civilization\bg-step-01.webp` — 재현 확인). zip 규격의 구분자는 `/` 라, Linux 에서 풀면 `themes/` 폴더가 생기지 않는다. 최상위 파일(`index.html`, JS)은 정상이라 게임은 돌지만 `themes/**` 요청이 모두 실패하고, `grid-render.js` 의 `onerror` 폴백이 숫자 타일을 그린다.
- 수정
  - `scripts/build-playgama.mjs` 추가: `src/` 를 .NET `ZipFile` 로 묶되 항목 이름을 `/` 로 적는다. 만든 뒤 항목에 `\` 가 없는지, `index.html` 이 루트에 있는지, `themes/` 아래 이미지 수가 `src/themes` 와 같은지 검사하고 하나라도 어긋나면 실패로 멈춘다. `firebase-config.js` 처럼 제출에 넣지 않을 파일은 빼는 목록으로 관리한다. 파일명에 버전 · 짧은 커밋 해시를 넣는다.
  - `CLAUDE.md` 의 `Compress-Archive` 안내를 이 스크립트로 바꾼다.
  - 업로드 뒤 QA Tool 에서 이미지가 보이는지 확인하는 단계를 출시 절차에 넣는다.
- 템플릿(`h5-puzzle-template`) 과 다른 프로젝트의 같은 안내는 이 작업 범위 밖이다(사용자 결정 대기).

### 5.2 문서 · 제출

- `docs/devLog/Release_Note_v1.2.0.md`, `docs/playgama-submission.md` 설명 갱신.
- Playgama: 새 빌드 zip 업로드, 개발자 코멘트는 **실제로 바뀐 것만** 적는다. 제목 "Kevin-Puzzle-Earth&Beyond" → "Earth & Beyond".

## 6. 범위 밖

- 이미지 보정(사람이 방향을 정하는 아트 작업) — 별도 작업.
- Chronicles · 메인 모드 적용.
- 진행 중 보드 저장(지금도 없다).
