# Earth & Beyond v0.9.1 — 릴리스 노트

_2026-10-01 · 근거: `docs/sandbox-kpi-debate/pd-final-spec.md` (감독 승인) · `discovery-fx-spec.md` · `strata-gate.md`_

## 바뀐 것

### 첫 판 · 막지 않는 발견 (§2-2)
- 첫 방문: Daily · 튜토리얼 · 챕터 인트로 · 공개 모달 없이 **Chronicles 1장 보드로 바로**. 보드 위 한 줄 안내(토스트)만.
  기존 키만 씀(`earthbeyond_onboarded` · `earthbeyond_tutorial_seen` · `earthbeyond_intro_seen_primordial-earth`).
- step 2~10 획득: 모달 대신 칸 팝 + 시대 색 고리 + 장면 이름 · 연대 배너(비차단, 큐, 움직이면 양보). 모달은 step 1 · 마지막 step 만(문구 `ERA Ⅰ · STEP 01 / 11` + 장면 이름, 어둠 .6 · 블러 없음).
- 동작 줄이기: 팝 1.08/200ms, 고리 · 파티클 없음 → 2px 테두리 600ms, 배너는 opacity 만.
- Daily 튜토리얼 문구 수정("3 attempts" · "today's leaderboard" 삭제).
- 새 step 경로 게임오버 미판정 소프트락 수정(strata-gate §4 ④).

### 지층 최소판 (§2-1, 임하루 `src/strata.js`)
- 1장만: 최고 갱신으로 경계가 오르면 화석 정리(기존 클리어 연출) + 생성 크기 상승. 첫 정리 때 토스트 1회. CONTINUE 뒤에도 같은 판 상태 유지.
- 끄기: `EBStrata.CHAPTERS.length = 0`. 대체안 스위치 `ENDLESS_UNLOCK_AT_128`(기본 false).

### 광고 · 체크리스트 #10 (§2-3)
- CONTINUE (AD) 삭제 → **별 결제만(⭐5) · 판당 1회 · 무료 없음**. 별이 모자라면 버튼 숨김 → 바로 정산.
- Daily 게임오버: **무료 PLAY AGAIN**(광고 조건 없음).
- 전면광고 규칙 `src/session-rules.js` `AD_RHYTHM`: 90초 간격(세션 시작부터), 세션 첫 게임오버 · 메뉴로 나갈 때 · 장면 공개 후 3초 제외. Bridge `setMinimumDelayBetweenInterstitial(90)`.
- 리워드는 ×2 보너스(START WITH ⭐×2 · 챕터/테마/Endless ×2)에만. config 에서 `daily_retry` · `collection_continue` 삭제.

### 계측 · 안전 빌드 (§2-4)
- `saas.leaderboards.platforms` 에 `playgama_sandbox`. lb-sync 가 오늘 Daily 최고 · Endless 최고를 (재)전송.
- `SG.PG.track()` → `bridge.analytics.send(name, {gameVersion, …})` (있을 때만): `scene_unlocked` · `run_ended`(moves · duration_sec · max_step …) · `ad_offer` · `tutorial`.
- 빌드 게이트 `scripts/playgama-gates.js`(LH 이식): 외부 URL · 분석 SDK · 직접 저장소(save-store.js 외) · DEV 잔존 · 인라인 스크립트 문법 · Bridge 태그 1개 · 버전 · `playgama_sandbox`. DEV 블록 제거, firebase.js · crazygames.js · firebase-config.js 는 no-op 스텁(`scripts/playgama-stubs/`).
- iframe 포커스 `window.focus()` + 키 입력 `e.code`(화살표 · WASD). 늦게 붙은 Bridge 에도 `game_ready` 1회.
- 운영 집계 LB STATS 는 DEV 바에서 분리: `?lbstats=1`(읽기 전용).

### 계속하기 · 엔딩 (cont-pd-final 추가 범위, 감독 승인 10/2)
- 지층 1~3장, 창 6/7/7 (`strata.js` 임하루) — 셸은 `gradedTiers(strataRun)`.
- KEEP GOING: 판당 1회 · 광고 없음. **게임 첫 판(1장 runs = 1) 무료 1회**(기존 테마 상태에서 판정, 새 키 없음). 별 = 지갑 + 이번 판 미정산 별(이번 판 별부터 차감). 5⭐ 미만이면 비활성 "Earn 5⭐ to keep going".
- 표시 없는 연패 보정: 같은 장 2연패 → 다음 판 생성 한 단계 위, 장 클리어로 해제, 세션 한정(`EBStrata.noteRunEnd` 한 곳; 지층이 꺼진 장에서만 셸 보정).
- 게임오버 화면: PLAY AGAIN 가장 크게 · 기본 포커스 → KEEP GOING → 📺 ⭐×2 외곽선 → GALLERY · MENU. "N of 11 kept · Next: reach X" / "So close — a of b". 타이머 없음. Chronicles 전면광고는 결과 화면 뒤 PLAY AGAIN 에서만(세션 첫 게임오버 제외 · 90초).
- 엔딩(마지막 장): "Your journey through 13.8 billion years is complete" + 걸린 판 수, 광고 버튼 맨 아래, ENDLESS 유지.
- 리워드 쿼터 판당 리셋 버그 수정 → 하루 3회(키 `earthbeyond_ad_quota` 그대로).
- 계측 `continue_used {method: free|stars}`, `run_ended` 에 `assisted`.

## 확인
- `npm test` 74/74. `npm run build:playgama -- --force` → `build/earth-and-beyond-0.9.1-<hash>.zip`(133 files).
- 로컬(8092) 실기: 첫 방문 → 1장 보드 직행, 발견 배너 비차단, CONTINUE 광고 없음 · 판당 1회, Daily 무료 PLAY AGAIN, 지층 정리 + 토스트 1회, 콘솔 에러 0 (동작 줄이기 켬/끔 둘 다).

## 미확인
- `bridge.analytics.send` 의 실제 시그니처 · 수집 여부, `leaderboards.type` on `playgama_sandbox`, 실제 광고 간격 → 10/5 게시 페이지 실기.
