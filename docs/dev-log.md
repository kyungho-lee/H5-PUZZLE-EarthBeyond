# Earth & Beyond — 개발일지

---

## v0.3 — 2026-06-16

### Playgama Platform SDK 완전 연동

#### 오디오 음소거 (Wiki: `isAudioEnabled`)
- **초기값 즉시 적용**: Bridge init 완료 직후 `bridge.platform.isAudioEnabled` 1회 읽어 `false`이면 즉시 BGM 음소거 (`_onAudioStateChanged(false)` 호출)
- `SG.PG._audioEnabled` 상태 필드 추가 — resume 시 오디오 복원 판단에 사용
- `AUDIO_STATE_CHANGED` 이벤트: 기존 구현 유지 + `_audioEnabled` 동기화 추가

#### 게임 일시정지 (`PAUSE_STATE_CHANGED`)
- **버그 수정**: 이전 구현은 `isPaused=true`일 때 `isAnimating=true`로 설정했으나, `renderer.animate()` 콜백이 완료되면 `isAnimating=false`로 덮어쓰는 경쟁 조건 존재 → pause 도중 입력이 다시 열리는 문제
- **수정**: `isPlatformPaused` 플래그 신설. `doMove()`에서 `isAnimating || isPlatformPaused` 두 조건을 모두 체크
- pause 시 BGM 음소거 추가 (wiki: "Pause gameplay, timers, **and audio**")
- resume 시 `_audioEnabled` 상태 확인 후 오디오 복원 — audio disabled 상태에서 resume해도 소리 켜지지 않음

#### Wiki 스펙 대비 최종 상태

| 항목 | 상태 |
|------|------|
| `AUDIO_STATE_CHANGED` 이벤트 구독 | ✅ |
| `isAudioEnabled` 초기값 즉시 적용 | ✅ |
| `PAUSE_STATE_CHANGED` 이벤트 구독 | ✅ |
| pause 시 입력 차단 | ✅ (`isPlatformPaused` 플래그) |
| pause 시 오디오 정지 | ✅ |
| resume 시 오디오 상태 복원 | ✅ |

---

## v0.2 — 2026-06-15

### Playgama 제출 준비

#### Daily 모드 수정
- Daily 보드에서 숫자 대신 테마 이미지 표시: `setMode('daily')` 후 `renderer.colorBySize = false` 설정
- Daily 보드 배경: Collection 획득 step이 아닌 현재 보드 최고 타일 step 배경 실시간 적용 (`updateDailyBoardBg()`)
- `dailyTheme`을 모듈 레벨 전역 변수로 승격 (`_dailyTheme` 로컬 → `dailyTheme`)

#### 광고 연동 개선
- `showInterstitial()` 래퍼 추가 — 배너 자동 hide/show 포함
- 리워드 광고 실행 전후 배너 hide/show 추가
- `unhandledrejection` 핸들러: `r.code === 'sdkDisabled'` 명시적 처리 추가

#### Firebase / 리더보드
- Daily 리더보드 ID: `kevin-PEB`, Endless 리더보드 ID: `kevin-PEB2`
- `SG.PG.LB_DAILY`, `SG.PG.LB_ENDLESS` 상수 노출
- `lbSubmit(score, lbId)` — lbId 파라미터 추가 (기본값 `LB_DAILY`)

#### 스크린샷 / 커버 이미지
- `make-screenshots.mjs`: 16블록 풀 보드 표시 수정 (`var` 선언으로 `window.*` 노출)
- `make-cover.mjs`: 실제 게임 화면 3종(800×800, 1080×1920, 1920×1080) 캡처
- START 히어로 화면: 3-Era 콜라주 배경 + 타이틀 오버레이 레이아웃 추가

#### 제출 문서
- `docs/playgama-submission.md` 전면 재작성 (NeonDrift 복사본 → Earth & Beyond 전용)
- "AI 생성 컨텐츠가 아닌 이유" 섹션 추가 (이전 검수 거절 대응)
- 33개 장면 목록 포함

---

## v0.1 — 2026-06-14 (초기)

- NeonDrift v1 코어 이식 (`neon-drift.js`, `grid-render.js`, `particles.js`)
- 3-Mode 구조: Chronicles / Daily / Endless
- Collection 시스템: Era 1~3 × 11 step
- `localStorage` 키 네임스페이스: `earthbeyond_`
- Playgama Bridge SDK 연동 (`playgama.js`)
- Firebase Firestore 리더보드 (`firebase.js`)
- Web Audio 합성 사운드팩 (`sound.js`)
