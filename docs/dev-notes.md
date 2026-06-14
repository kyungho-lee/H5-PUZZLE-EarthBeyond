# Neon Drift — 개발노트 (버전별)

> H5 퍼즐 게임. 모드: **본게임(8×8, Dev)**, **Daily(4×4 일일도전)**, **Practice**, **Collection(테마 수집)**.
> 플랫폼: Playgama Bridge / CrazyGames. 형식: 버전 = 기능 묶음 단위. 최신이 위.
>
> **현재 버전: `v0.9`** — 코드 상수 `APP_VERSION`([src/index.html](../src/index.html))와 동기화.
> START 화면 하단에 표시(DEV 모드면 `· DEV` 부가). 버전 변경 시 양쪽을 함께 갱신.

| 버전 | 날짜 | 요약 |
|------|------|------|
| v0.9 | 2026-06-14 | Daily CLAIM(세션종료 best정산) + 별 사용처: 테마 즉시해금 |
| v0.8.2 | 2026-06-14 | 리트라이 5→3회 + Daily 역할 정의(재화 채널) 문서화 |
| v0.8.1 | 2026-06-14 | Daily 지갑 적립을 '오늘 best run 증분'으로 — 시도마다 누적되던 과수급 차단 |
| v0.8 | 2026-06-14 | 상단 HUD 재구성: 재화 칩 상시노출·되돌리기/CHAIN 제거·Daily 별 지갑 누적 |
| v0.7 | 2026-06-14 | 갤러리 최종단계(1024) 포함 11단계 + 단계 수 동적화(확장 대비) |
| v0.6 | 2026-06-14 | 스타 누적재화화·CONTINUE 스타소모·갤러리 설정메뉴+레드닷·상세팝업 제거 |
| v0.5.3 | 2026-06-14 | 게임오버 단계분리 버그(.hidden) + 광고버튼 가독성(.btn-ad) |
| v0.5.2 | 2026-06-14 | CONTINUE 에러 수정(global→SG.Ring), 연출 실패 방어 |
| v0.5.1 | 2026-06-14 | 게임오버 광고 UX: CONTINUE→END RUN→DOUBLE STARS 2단계 |
| v0.5 | 2026-06-14 | 콜렉션 경제·밸런스·본게임 size 전환·daily 별버그 수정 |
| v0.4 | 2026-06-13 | 콜렉션 1차 (테마/갤러리/머지획득) |
| v0.3 | 2026-06-12 | Daily/Practice/지갑 |
| v0.2 | 2026-06-11 | 코어 게임플레이·FX·사운드 |
| v0.1 | 2026-06-11 | 초기 스캐폴드·엔진·SDK |

---

## v0.9 — Daily CLAIM 정산 + 별 사용처(테마 즉시해금) (2026-06-14)

"광고 보고도 +0" 보완과 별 사용처 확장을 함께 처리.

### Daily 정산 = 세션 종료 CLAIM 1회 (best 전액)
- 게임 중/매 게임오버엔 지갑 적립 **안 함**. best만 갱신.
- 게임오버 화면 `CLAIM ⭐N` 버튼 = 오늘 best 미정산분을 지갑에 1회 정산 + 종료(`claimDailyAndExit`).
  `claimableBest = bestRun − claimedBest`, `claimBestToWallet`은 idempotent(중복 정산 없음).
- **"광고 보고도 +0" 해소**: RETRY로 best를 올릴수록 CLAIM 금액↑ → 리트라이 광고의 가치가
  best 갱신으로 보장됨. (광고=더 높은 best 도전, 수령은 CLAIM에서 한 번)
- MENU 등 다른 종료 경로에도 자동 정산 안전망(`dailyToMenu` → claimBestToWallet).
- `dailyState.claimedBest` 필드 추가(마이그레이션 0). daily 게임오버 UI: THIS RUN / TODAY BEST 표기.

### 별 사용처: 테마 즉시 해금
- 갤러리에서 잠긴 테마 탭 클릭 → 셀 영역에 `UNLOCK ⭐50` 패널.
- `unlockThemeWithStars`: `spendStars(THEME_UNLOCK_COST=50)` → `forceUnlockTheme`(unlockedThemes 추가).
  잔액 부족 시 토스트. 해금 후 즉시 갤러리 갱신.
- 순차 해금(테마 완성) 외에 **별로 건너뛰기** 경로 제공 → 별 수요처 확보.

> 향후: 별 사용처 추가(부스터/스킨), 테마 가격 차등(순서별), daily 리더보드 활성화는 미적용.

---

## v0.8.2 — 리트라이 축소 + Daily 역할 정의 (2026-06-14)

Daily의 리트라이 횟수와 모드 역할 논의 결과 반영.

- **리트라이 5 → 3회** (`MAX_RETRIES`). best-run 증분 적립이라 무한 수급은 이미 막혔지만,
  5회는 광고 피로 + 한 판 긴장감 희석 → 3회(총 4판)로 축소.
- **Daily 역할 = 재화(별) 벌이 채널**(콜렉션 보조)로 확정. 산출물(별)은 콜렉션 CONTINUE 등에 소모.
- 설계·향후 검토 사항을 [docs/daily-economy-notes.md](daily-economy-notes.md)에 정리
  (광고 보고도 +0 가능 보완안, 별 사용처 확장, 캡 재검토 등).

---

## v0.8.1 — Daily 지갑 적립 밸런스 (best-run 증분) (2026-06-14)

v0.8에서 daily 별을 지갑에 적립하면서, daily가 하루 여러 번 시도(리트라이) 가능해
**시도마다 누적 → 과수급** 우려 발생.

- **수정**: 지갑엔 **오늘 최고기록(best run) 갱신분만** 적립.
  `walletGain = max(0, 이번판 - 이전best)`. 예) best 6→8이면 +2, 8→5면 +0.
- 효과: 시도 횟수와 무관하게 하루 daily 지갑 적립 = 그날 best run 총량. "더 잘할수록만 더 받음".
- `dailyState.stars`(daily 화면 총합·리더보드용)는 기존대로 매 시도 누적 유지 — 지갑과 분리.

---

## v0.8 — 상단 HUD 재구성 + Daily 별 지갑 누적 (2026-06-14)

상단 UI를 누적 재화(지갑 ⭐) 중심으로 재정비하고 불필요 요소를 제거.

- **재화 칩 상시 노출**: 헤더 우상단(⚙ 옆)에 `⭐N` 칩 고정 — 모드 무관 항상 표시.
  적립 시 bump 애니메이션(`updateWalletChip`). 시작 화면·게임오버·모드 진입에서 갱신.
- **Daily 별도 지갑 누적**: 그동안 daily는 daily 카운터(`addStars`)에만 쌓고 지갑엔 안 들어갔다.
  이제 `dailyGameOver`에서 `earnStarsToWallet(..., 'daily')`로 지갑에도 적립(일일 캡 적용).
  → 모든 모드(daily/collection)의 별이 단일 재화로 통합.
- **되돌리기(↩) 완전 제거**: 본게임(Dev)에서만 동작하고 타 모드는 항상 비활성이라 혼란만 줌.
  버튼·CSS·`undo()`·`snapshot`/`undoUsed`·이벤트 바인딩 모두 삭제.
- **CHAIN 스탯 제거 + 모드별 HUD 정리**: 라벨/내용 불일치(본게임=체인, daily=R, collection=단계) 해소.
  스탯 2칸을 `setStats(label,value,...)`로 모드별 구성:
  - 본게임: SCORE / BEST (체인배수는 제목 옆 보조 `×N`)
  - Daily: THIS RUN ⭐ / RETRY R · Practice: THIS RUN ⭐만
  - Collection: STEP n/N / THIS RUN +⭐ (누적 ⭐는 칩이 담당)
- fly 연출 타깃을 모드별 칸으로 조정(collection은 둘째 칸).

---

## v0.7 — 갤러리 최종단계 포함 + 단계 수 동적화 (2026-06-14)

갤러리에 최종 단계(1024)까지 모든 단계를 노출하고, 향후 단계 추가에 유연하도록 전면 동적화.

- **11단계로 확장**: `STEP_SIZES`에 1024 추가(1~1024). 단일 소스에서 `STEP_COUNT`(11)·
  `FINAL_SIZE`(1024)·`SIZE_TO_STEP`(자동 생성) 파생.
- **완성 트리거 변경**: 기존 "1024는 step 아닌 별도 트리거" → **마지막 단계(FINAL_SIZE) 획득 = 완성**.
  단계 수와 무관하게 동작.
- **하드코딩 제거**: 갤러리 셀 루프/진행도, HUD(`acquired/N`), 언락 팝업(`STEP n / N`),
  게임오버·완성 화면의 `10`을 모두 `STEP_COUNT`로 동적화.
  `collection-themes.js`의 `makePaths`도 `STEP_COUNT` 길이로 자동 생성(로드 순서 collection.js→themes).
- **마이그레이션**: 완성된 테마는 `loadTheme`에서 전 단계를 backfill → 단계 확장 후에도 갤러리 빈칸 없음.
- **에셋**: step-11.svg 추가 (neon-digits=금색 1024 ★COMPLETE, neon-city/cyber-ocean=placeholder).
  step-10 라벨 `STEP 10 / 11`로 정정.
- 향후 단계 추가 절차: `STEP_SIZES`에 size 추가 + 각 테마 step-NN.svg 추가. 나머지는 자동.

---

## v0.6 — 콜렉션 스타 경제 개편 + 갤러리 동선 (2026-06-14)

CONTINUE 시 보유 스타가 사라져 보이던 문제를 근본 수정하면서 콜렉션 경제를 재정비.

### 스타 = 누적 재화 (적립 시점 정리)
- **문제**: 게임오버 진입 시 이번 판 스타를 즉시 지갑에 적립 → CONTINUE로 이어가면 SCORE가 0으로
  리셋되고 이어한 판에서 또 적립되어 중복·혼란("스타가 사라진" 것처럼 보임).
- **수정**: 적립은 **정산 시점에만** (`settleRunStars`, `_runSettled` 1회 가드).
  END RUN / RETRY / MENU / DOUBLE STARS에서 정산. **CONTINUE는 정산 안 하고 `dailyRunStars` 유지**(이어가는 판).

### CONTINUE = 스타 소모 (사용처)
- 광고형 → **스타 소모형**으로 전환. 비용 회수당 **5 → 10 → 20 → 40**(`CONTINUE_COSTS`, 이후 40 유지).
- **잔액 부족 시에만 리워드 광고로 대체**(무료 진행). 버튼 라벨이 `(⭐N)` / `(📺 AD)`로 동적.
- `collectionContinueCount`로 회수 추적(세션 시작 시 0).

### 갤러리 동선 개편
- **상세팝업(ol-detail) 제거**: 셀 클릭 = NEW 해제 + ⭐1 수령 + 별이 HUD로 날아가는 연출(`galleryStarBurst`).
  관련 HTML/CSS/함수(openDetail/closeDetail/renderDetail/detailNav) 전부 삭제.
- **갤러리 진입 = 설정(옵션) 메뉴**: 콜렉션 모드일 때 설정 패널에 GALLERY 버튼 노출.
- **레드닷**: NEW 블록이 있으면 헤더 ⚙ 아이콘과 설정 내 GALLERY 버튼에 빨간 점(`updateGalleryDot`).
  비콜렉션 모드 진입 시 자동 정리.

---

## v0.5.3 — 게임오버 단계분리 + 광고버튼 가독성 (2026-06-14)

v0.5.1의 2단계 UX가 실제로는 두 단계가 동시에 보이고, 광고 버튼 텍스트가 안 읽히던 문제 수정.

- **단계 분리 안 됨**: `.hidden`이 `.overlay.hidden`에만 정의돼 일반 div(`co-phase-settle`)엔
  안 먹음 → 1·2단계 동시 노출. **범용 `.hidden { display:none !important }`** 추가로 해결.
- **광고 버튼 가독성**: `.btn-primary`(밝은 민트 배경) + 인라인 `color:#39ff14/#ffd23f`(밝은 텍스트)
  → 밝은 위에 밝은 글자. 전용 **`.btn-ad`**(어두운 배경 `rgba(6,8,16,.6)` + 발광 테두리/텍스트,
  `.ad-green`/`.ad-gold`) 도입. CONTINUE/DOUBLE STARS/DOUBLE REWARD에 적용.

---

## v0.5.2 — CONTINUE 런타임 에러 핫픽스 (2026-06-14)

CONTINUE 선택 시 `ReferenceError: global is not defined`로 연출이 throw되어 화면 정리가
멈추고 이어하기가 안 되던 문제 수정.

- 원인: 브라우저 전용 index.html에서 `global.SG.Ring`을 참조 (`global`은 Node 전역, 브라우저엔 없음).
  particles.js는 `window.SG.Ring`(=`SG.Ring`)에 노출하므로 `global.SG` → `SG`로 전부 치환 (6곳).
- `playClearFx`의 디버그 `console.log` 제거.
- `collectionContinueWithAd`에서 `playClearFx`를 try로 감싸 — 연출이 실패해도 블록 제거·게임 재개 보장.

---

## v0.5.1 — 게임오버 광고 UX 2단계화 (2026-06-14)

게임오버 화면에 광고 버튼 2개(DOUBLE STARS + CONTINUE)가 동시 노출되어 의미가 충돌
("정산하고 끝" vs "이어하기")하던 문제를 단계적 흐름으로 정리.

- **1단계 (CONTINUE 권유)**: `📺 CONTINUE` + `END RUN ▸`. 제거할 블록이 있을 때만 진입.
- **2단계 (정산)**: `END RUN ▸`을 누르거나 CONTINUE 불가 시 → `THIS RUN ⭐` + `📺 DOUBLE STARS` + `RETRY (FREE)`.
- 광고 버튼은 한 번에 하나만 노출 → 광고 피로감↓, 선택 명확화.
- `collectionSetOverPhase('continue'|'settle')`로 단계 전환, 보이는 버튼만 키보드 네비 재수집.
- `openModalNav` 필터를 `offsetParent` 기준으로 보강 — `.hidden` 부모(단계 전환) 안의 버튼도 정확히 제외.
- ad-strategy.md 갱신.

---

## v0.5 — 콜렉션 경제·밸런스·본게임 size 전환 (2026-06-14)

이번 사이클의 핵심: 콜렉션 모드를 "머지 size = 갤러리 단계"로 재설계하고, 광고 수익
전략을 입히고, 본게임을 size 키우기로 전환. 더불어 데이터 기반 밸런스 분석을 수행.

### 콜렉션 모드 재설계
- **머지 size ↔ 갤러리 step 1:1 매핑** (`SIZE_TO_STEP`): step1=size1 … step10=size512.
  **1024 머지 = 테마 완성 트리거** (갤러리 step 아님, 다음 테마 해금).
- **블록 = 테마 스킨**: 보드 타일이 테마 SVG로 꽉 차게 렌더 (`grid-render.js`의
  `collTileImage` 캐시, size→step→SVG). 이미지에 숫자가 있으면 숫자 오버레이 생략.
- **step-01(size 1) 자동 획득**: 머지로 안 나오므로 콜렉션 시작 시 조용히 획득 + 토스트.
- **NEW 마크 + 갤러리 스타 보상**: 새 블록 획득 시 NEW 배지(노란 펄스), 갤러리에서
  클릭하면 NEW 해제 + ⭐1 수령(블록당 1회 영구, `claimStep`/`claimedSizes`).
- **1024 완성 플로우**: 완성 팝업 → 보드 리셋 → 테마 완료 오버레이 → NEXT로 다음 테마.
- **진행도 연동 graded 스폰**: 완성한 테마 수↑ → 시작 블록 가중치↑ (체감 난이도 유지).

### 광고 수익 전략 (`docs/ad-strategy.md`)
- **게임오버 진입**: 전체광고(interstitial) 1회 노출.
- **DOUBLE STARS (리워드)**: 이번 판 스타 x2. 기본 1배 즉시 적립, 광고 시 +1배. 실패해도 1배 유지.
- **DOUBLE REWARD (리워드)**: 테마 완성 보상 ⭐20→⭐40.
- **CONTINUE (리워드)**: 상위 3종 외 블록을 **터지는 연출 후 제거**하고 이어하기 (스타 무료).
  - 정책: RETRY는 항상 무료(이탈 방지), x2/CONTINUE는 100% 자발적 리워드.
  - placement: `collection_double_stars`, `collection_theme_double`, `collection_continue`.

### 본게임(START Dev) size 전환
- 단색 win 제거 → **8×8 · colorAndSize · 2색 · graded** 구성.
- **클리어 = 아무 색이든 1024 도달** (시뮬 검증: greedy 100%/corner 99.3% 달성 가능).
- 2색의 "같은 색만 머지" 제약이 자연스러운 난이도 상승 연출.
- 엔진: `gradedSpawnSize`/`maxSize`/`maxSizeByColor`/`uniformColor`/`noColorWin` 추가.

### 밸런스 분석 (`docs/balance-report-*.md`, `docs/sims/`)
- **"size 1만 스폰 vs 큰 수 스폰"**: 항상 size1이 훨씬 어려움(칸 고갈). 큰 수는 색 제약과
  겹치면 오히려 난이도↑. → 본게임/콜렉션 모두 **약한 graded** 채택.
- **12단계(→4096) 확장 시 보드 크기**: 4×4·10단계와 유사 난이도는 **5×5**(6×6은 너무 쉬움).
- **2색 "각 색 1024"는 그리디 0%** (한 색 키우면 다른 색 공간이 죽음) → 단일 1024로 확정.
- 재현 시뮬레이터: `node docs/sims/balance_*.js` (실제 `neon-drift.js` 규칙 사용).

### 버그 수정
- **Daily 별 6→4 감소**: `flyStarsToHud`의 `onArrive`가 표시값(`dailyStarsShown`)을 무조건
  ++ → fly 중첩 시 실제값(`dailyRunStars`) 초과 후 동기화에서 떨어짐. **clamp로 해결**
  (daily·collection·practice 공통 함수라 셋 다 동시 해결). 적립 데이터는 실제값 기준이라 손실 없었음.
- **콜렉션 시작 시 freeze / 갤러리 z-index / 구포맷 마이그레이션** (이전 핫픽스 통합).

### 기타
- UI 텍스트 영문화 (DEV BAR, 게임오버/완성 패널, 토스트 메시지).
- neon-digits placeholder 10단계 숫자 SVG 정비 (step-10 = 512).
- 에셋 제작 가이드 (`docs/collection-theme-assets-guide.md`): WebP 우선, 256×256, 행성 테마 예시.

---

## v0.4 이전 — 기반 구축 (2026-06-11 ~ 06-13)

git 히스토리 기준 요약 (상세는 `git log`):

- **v0.4 콜렉션 1차**: neon-digits 첫 테마, 1~1024 SVG 갤러리, 머지 기반 획득, 언락 FX,
  스타-이어하기 플로우, dev 치트 모드(순서 타일 시퀀스).
- **v0.3 Daily/Practice**: 일일 도전(요일별 난이도), 별 2-tier 지갑, 리트라이(광고),
  Practice 무한 모드, 1024 collapse.
- **v0.2 코어 게임플레이**: 8×8 슬라이드/머지, 체인 배수, 파티클·링·플래시 FX,
  사운드팩, 키보드/터치/스와이프 입력, 모달 네비게이션.
- **v0.1 초기**: H5 Puzzle 템플릿 기반 스캐폴드, TDD 그리드 엔진, Playgama/CrazyGames
  SDK 래퍼, Firebase 리더보드.
