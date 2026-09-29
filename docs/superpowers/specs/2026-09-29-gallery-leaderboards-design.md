# 갤러리 · 챕터 클리어 리더보드 설계

_2026-09-29 · 대상 버전 v0.9 (Playgama 심사 제출본에 포함)_

## 목적

두 가지를 같은 비중으로 얻는다.

1. **플레이어용 순위** — 갤러리 수집 수와 챕터 최단 클리어로 자연스러운 경쟁.
2. **운영자용 진행 집계** — 몇 명이 어디까지 통과했는지, 챕터 클리어에 몇 판이 걸리는지 → 병목 파악과 추가 콘텐츠 시점 판단.

## 제약 (확인된 사실)

- Playgama 빌드는 외부 호출 · 분석 도구 금지(체크리스트 11, 14) → 서버에 모이는 통로는 **Bridge SaaS 리더보드**뿐.
- 업적(achievements)은 playgama에서 기기 로컬 저장이라 집계 불가.
- 캐비닛 리더보드 화면은 설정(ID · Name · Type · Score order)만 보이고 점수 목록 · 참여자 수는 없다.
- 게임 안 `leaderboards.getEntries(id)`는 순위 목록을 돌려주며 **한 번에 몇 명까지인지(N)는 문서에 없다**. 집계는 이 목록 기준이므로 참여자가 N을 넘으면 잘린다.
- SaaS 리더보드는 `leaderboards.type === 'in_game'`인 환경(playgama, qa_tool)에서만 동작. 로컬 · 기타 플랫폼은 `not_available`.

## 리더보드 (캐비닛에 생성 완료, 2026-09-29)

| ID | Name | 정렬 | 점수 |
|---|---|---|---|
| `gallery_total` | Gallery Collection | desc | 3챕터 합산 획득 장면 수 (0~33) |
| `ch1_clear` | Chapter 1 Clear | asc | 챕터 1 클리어까지 시작한 판 수 |
| `ch2_clear` | Chapter 2 Clear | asc | 챕터 2 클리어까지 시작한 판 수 |
| `ch3_clear` | Chapter 3 Clear | asc | 챕터 3 클리어까지 시작한 판 수 |

챕터 번호는 `SG.CollectionThemes` 배열 순서(1 = primordial-earth, 2 = human-civilization, 3 = solar-system).

## 1. 점수 규칙과 기록 시점

**gallery_total**
- 점수 = 모든 테마의 `acquiredSteps.length` 합. 완성 테마는 `loadTheme`이 11단계를 채워 주므로 그대로 합산.
- 가공(동점 분리 인코딩) 없음 — 점수를 곧 장면 수로 읽기 위해.
- 기록: 장면을 새로 얻을 때(`recordMerges`의 `newSteps` 비어 있지 않음, `grantStartStep` 반환값 있음) + 부팅 시 1회(기존 플레이어 백필 · 이전 실패 재시도).
- 같은 값을 반복 제출하지 않도록 마지막으로 성공한 값을 저장(`earthbeyond_lb_sent`)하고, 값이 커졌을 때만 제출.

**chN_clear**
- 판 수 카운터: 테마 상태에 `runs`(정수, 기본 0) 추가. `startCollection()`이 새 판을 시작할 때 활성 테마의 `runs += 1`. PLAY AGAIN · 별 ×2 시작도 `startCollection()`을 거치므로 1판. CONTINUE는 같은 판.
- 점수 = 클리어 순간의 `runs` (최소 1).
- 기록: 테마 완성(`recordMerges`의 `isComplete`) 시 1회. 성공 여부를 `earthbeyond_lb_sent`에 남기고, 실패했으면 다음 부팅에 재시도.
- 기존 플레이어: `runs`가 없던 시절에 이미 완성했거나 **step 1(무료)을 넘어 진행 중이던** 테마는 판 수를 모르므로(`runsUnknown`) 그 챕터 클리어를 **제출하지 않는다**(가짜 값 금지 — 이번 버전부터 세면 실제보다 작게 기록된다). 새로 시작하는 챕터부터 기록.

**실패 처리**: 제출 실패는 게임 진행에 영향 없음(`lbSubmit`이 이미 catch). 재시도는 부팅 시 동기화에서.

## 2. 플레이어 화면

- 갤러리 창 하단에 **🏆 RANKING** 버튼. `SG.PG.leaderboard.getType() === 'in_game'`일 때만 표시.
- 랭킹 창(`ol-ranking`): 탭 GALLERY · CH 1 · CH 2 · CH 3.
  - 각 탭: 상위 10명(순위 · 이름 · 점수), 로딩 중 표시, 비었으면 "No scores yet — be the first!".
  - 하단 "YOU": 내 로컬 값 — GALLERY는 장면 수, CH N은 클리어했으면 판 수, 아니면 "Not cleared yet".
  - CH 점수 표기: "N runs".
- 닫기 버튼(체크리스트 18: 모든 팝업에 닫기).
- 영어 · 한국어 문구는 `i18n.js`에 추가.

## 3. 운영자 집계와 진행 이벤트

**LB STATS (`?dev=1`)**
- 개발 바에 버튼. 4개 리더보드를 `getEntries`로 조회해 표시:
  - `gallery_total`: 반환 인원, 장면 수별 인원(0~33 중 값이 있는 것만).
  - `chN_clear`: 반환 인원(= 클리어 인원), 판 수 최소 · 중앙값 · 최대.
  - 각 리더보드의 반환 인원 옆에 "(N이 조회 한도일 수 있음)" 안내 — 값이 늘지 않고 고정되면 잘리고 있다는 신호.
- `in_game`이 아니면 "Leaderboards not available on this platform" 표시.

**진행 이벤트** (`bridge.platform.sendMessage` / `sendCustomMessage`, 실패 무시)
- Chronicles 판 시작: `level_started` `{ world: themeId, level: String(현재 획득 스텝 수) }`
- Chronicles 게임오버: `level_failed` `{ world, level }`
- 챕터 클리어: `level_completed` `{ world }`
- 새 장면 획득: 커스텀 메시지 `ch{N}_step{SS}` (예: `ch1_step05`)
- Bridge가 없으면 no-op. 볼 수 있는 통계 화면이 있는지는 Playgama에 문의 중 — 게임 동작과 무관.

## 구성 요소 (파일)

- `src/playgama-bridge-config.json` — `leaderboards`에 4개 ID 추가.
- `src/playgama.js` — `LB_GALLERY`, `LB_CHAPTER_CLEAR`(배열) 상수, `sendMessage(name, data)` · `sendCustomMessage(id)` 래퍼.
- `src/collection.js` — `runs` 필드(로드 시 기본 0), `bumpRuns(themeId, store, theme)`, `totalAcquired(store, themes)`.
- `src/lb-sync.js` (신규, 순수 로직 · 노드 테스트) — 제출할 값 결정: 현재 값과 `earthbeyond_lb_sent` 비교 → 제출 목록 반환, 성공 기록 갱신.
- `src/index.html` — 기록 시점 연결, 랭킹 창 · RANKING 버튼, LB STATS, 이벤트 호출.
- `src/i18n.js` — 랭킹 문구.

## 테스트

- 노드: `collection.js`의 `runs` · `bumpRuns` · `totalAcquired`, `lb-sync.js`의 제출 결정(증가 시만, 클리어 1회, 실패 후 재시도, `runs` 없는 완성 테마 미제출).
- 브라우저(로컬 mock): RANKING 버튼이 `not_available`에서 숨겨짐, LB STATS가 안내 문구 표시, 판 시작마다 `runs` 증가, 이벤트 호출이 오류 없이 no-op.
- QA Tool(`qa_tool`, `in_game`): 제출 → 랭킹 창에 내 기록 표시, LB STATS 집계.

## 범위 밖

- 동점 분리 · 점수 조작 방지(캐비닛 score validation은 기존대로 `log_only`).
- 업적 연동, 다른 플랫폼(Firebase) 집계.
- Playgama 통계 화면 연동 — 문의 결과에 따라 후속.
