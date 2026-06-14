# Practice 모드 + 검수 준비 — 설계

날짜: 2026-06-12
대상: Playgama 검수 제출 빌드 (Daily 중심, 본게임은 이후 업데이트)

## 배경

Daily NeonDrift가 완전한 게임 플로우를 갖춰 먼저 Playgama 검수에 제출한다. 본게임
(8×8 score 모드)은 아직 완성도가 낮아 검수 빌드에서 제외하되 개발은 계속한다.
대신 순위에 기록되지 않는 **Practice 모드**(자유 연습)를 제공한다. 리더보드는 QA
통과 후 APP public token으로 실제 연결하고, 현재는 더미로 UI/플로우만 완성한다.

## 목표 / 비목표

**목표**
- 본게임(START) 진입을 `?dev`에서만 노출 → 검수 빌드에선 숨김. 개발은 유지.
- Practice 모드: Daily 메커니즘(4×4·sizeOnly·별) 재사용, 순위 미기록, 매판 랜덤 시드.
  무료 시작 → 종료 → **광고 후** 결과 표시 → AGAIN(무제한)/MENU.
- Daily 게임오버 오버레이에 더미 리더보드(Top-N) 표시 → "순위확인" 플로우 완성.

**비목표**
- 본게임 로직 삭제/리팩터 (그대로 유지, dev에서 개발).
- 실제 Firebase/Playgama 리더보드 연결 (QA 통과 후 별도).
- Practice 순위 저장 (의도적으로 안 함).

## 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 본게임 노출 | `?dev` 또는 localStorage sg_dev=1일 때만 START 버튼 표시 |
| Practice 보드 | 4×4, sizeOnly, 별 타겟(64/128/256/512). 매판 `makeRng()` 랜덤 시드 |
| Practice 요일타입 | 오늘 dailyType 사용 (FLOOD 등) |
| Practice 순위 | Firebase/Playgama submit 안 함. dailyState(localStorage) 안 건드림 |
| Practice 재시도 | 무제한, 무료 (AGAIN 버튼) |
| Practice 광고 | 시작 무료. 게임오버 → requestMidgameAd() await → 결과 오버레이 |
| 더미 리더보드 | Daily 게임오버 오버레이에 표시. fetchLeaderboard 미연결 시 _demoLeaderboard |

## 메뉴 구조

```
검수/일반 빌드:   [DAILY] [PRACTICE] [SETTINGS]
?dev 빌드:        [DAILY] [PRACTICE] [START(본게임)] [SETTINGS]
```

- START 버튼은 기본 `style="display:none"`. 부트의 dev 판정(이미 dev-bar에 사용)에서
  `?dev`/sg_dev=1이면 `display:''`로 노출.

## Practice 플로우

```
PRACTICE 클릭 (무료)
  → startPractice(): practiceMode=true, dailyMode=true(분기 재사용),
    rng=makeRng(), 오늘 dailyType, grid=dailyBoard(랜덤), HUD 갱신
  → 4×4 연습 플레이 (별 획득 FX·StarFly 그대로 동작)
  → checkGameOver → practiceGameOver()
       gameRunning=false
       await SG.CG.requestMidgameAd()        ← 광고 (SDK 없으면 즉시 통과)
       결과 오버레이 표시 (THIS RUN ⭐N / AGAIN / MENU)
  → AGAIN → startPractice() (무료·무제한)
  → MENU  → showStart()
```

### 상태 격리
- 새 플래그 `practiceMode` (전역). Practice는 `dailyMode=true`로 두어 doMove의
  4×4·별·FX 분기를 재사용하되, **순위/리트라이/스토리지 분기에서 practiceMode를 검사**해
  스킵한다.
- `practiceRunStars` (또는 dailyRunStars 재사용 + 미저장)로 이번 판 별 집계.
  단순화를 위해 dailyRunStars/dailyStarsShown을 재사용하되, practiceGameOver에서
  addStars/setBestRun/submit을 호출하지 않는다.

## Daily 게임오버 더미 리더보드

- 마크업: `ol-daily-over` 패널에 리더보드 영역(`#daily-lb`) 추가 — 제목 + Top-N 행.
- 채우기: dailyGameOver에서 `SG.FB.fetchLeaderboard(date, {mode:'daily'})` await →
  반환 배열을 행으로 렌더. 미연결 시 `_demoLeaderboard()`가 더미 3행 반환 → 그대로 표시.
- 행 표기: `순위 · playerId(축약) · ⭐score`. 본인 항목 강조는 향후(토큰 연결 후).
- DEMO 표시: 미연결일 때 "DEMO" 배지로 더미임을 명시(혼동 방지).

## 구현 단위

| 파일 | 변경 |
|------|------|
| index.html (메뉴) | PRACTICE 버튼 추가, START에 display:none + dev 노출 |
| index.html (Practice) | startPractice / practiceGameOver / practiceMode 플래그 |
| index.html (doMove) | 게임오버 분기에서 practiceMode면 practiceGameOver |
| index.html (게임오버 OL) | ol-daily-over에 #daily-lb 영역 + 렌더 함수 + practice 결과 OL |
| index.html (부트) | dev면 START 노출 |

## 광고 매핑 (검수 기준)

| 시점 | 호출 | placement |
|------|------|-----------|
| Daily retry | requestRewardedAd('daily_retry') | daily_retry (rewarded) |
| Practice 결과 | requestMidgameAd() | level_complete (interstitial) |
| Daily→MENU | requestMidgameAd() | level_complete |
| 시작/게임오버 화면 | showBanner() | idle_banner |

## 테스트 / 검증

- `node --test` 50개 회귀 없음.
- Playwright(visual-check.mjs) 확장: (1) 일반 빌드에서 START 숨김, dev에서 노출,
  (2) Practice 시작→게임오버→결과 오버레이, (3) Daily 게임오버에 더미 리더보드 행 표시.
- Practice가 dailyState(localStorage)를 변경하지 않음을 단언.

## 리스크 / 완화

- **practiceMode/dailyMode 혼용 분기 누락**: 순위·스토리지·리트라이 호출부를 전수
  점검하고 practiceMode 가드를 명시. visual-check로 dailyState 불변 단언.
- **fetchLeaderboard 복합 인덱스**: 실연결 시 date+mode+score 인덱스 필요. 더미
  단계에선 무관. config 주석에 메모.
- **검수 빌드에서 dev 노출 사고**: START는 기본 display:none(HTML 기본값)이라
  dev 판정 실패해도 숨김이 기본 — 안전 측 기본값.
