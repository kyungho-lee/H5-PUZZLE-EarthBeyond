# R1 — 서비스 운영(강민재) · EarthBeyond 샌드박스 KPI

_2026-10-01 · 근거: 캐비닛 MCP 읽기 도구(`get_launch_steps` · `get_sandbox_state` · `get_sandbox_traffic` · `list_moderation_comments` · `get_application` · `list_leaderboards` · `get_game_checklist` · `get_bridge_sdk_docs api/analytics`) + wiki WebFetch(`mcp.md` · `mcp/tools.md` · `game-requirements/content-requirements.md`) + EB 코드 읽기. 쓰기 도구 · 브라우저 · src 수정 없음. 「확인」은 직접 읽은 것만, 나머지는 「추정」 · 「미확인」._

---

## 0. Playgama 가 샌드박스 → 카탈로그를 무엇으로 고르나 (원문만)

| 출처 | 원문 | 운영 해석 |
|---|---|---|
| 심사 코멘트 10/1 11:03 UTC | "We regularly select good-quality games from Sandbox that demonstrate strong performance metrics and add them to the main Playgama catalog." | 기준 = **품질 + 성과 지표**. 지표 이름 · 임계값 · 주기는 **어디에도 없다**(미확인). |
| wiki `mcp.md` | "A sandbox is a public page … no submit, no certification, no moderation." / 카탈로그 경로는 moderation submission 뿐이라고 서술 | wiki 는 「샌드박스 → 카탈로그 자동 승격」을 문서화하지 않았다. 코멘트(운영자 선발)와 wiki(제출) 두 경로가 공존 — **선발은 Playgama 재량**. |
| wiki content-requirements | "AI-generated games are performing more than 2x worse on metrics compared to titles created without AI graphics." | Playgama 는 **게임별 지표를 실제로 비교**한다. 6/17 AI 반려 사유와 같은 축 — 지표가 좋아야 「AI 티」 판정을 뒤집을 근거가 된다. |
| Bridge docs `api/analytics` | "Bridge already sends system events on its own — SDK initialization, platform messages such as `game_ready`, ads, purchases, **session start and end**." | 플랫폼은 Bridge 로 **세션 수 · 세션 길이를 이미 수집**한다(확인). 「performance metrics」가 이것일 가능성 높음(추정). 우리는 MCP 로 못 본다. |
| checklist #14 (live) | "No external analytics … Send game events through the Bridge analytics module instead (`analytics.send`, Bridge 2.3.0 or newer)." | **분석 금지 규정 안에 공식 통로가 생겼다.** KPI 리포트(10/1)의 「분석 불가」 전제는 수정 필요. |
| wiki `mcp.md` | "One sandbox per game, and its address never changes. Re-publishing replaces what is live and keeps the players' saved progress." / "Three publications per rolling hour." | 패치 게시 = 같은 URL · 진행 보존. 리비전 교체 비용은 낮다. |
| wiki `mcp.md` · tools | 무료 SHARE 보너스 "once per game, for up to three games per organization over its lifetime" · 트래픽 시작 조건 "covers in the live revision, and a live build in which the Bridge SDK was found" | **EB 는 무료 보너스를 평생 1회만** 쓴다. 조직 남은 2개 중 EB 몫은 1개뿐, 나머지 1개는 다른 게임 몫. |

**운영 결론**: 우리가 바꿀 수 있는 선발 입력은 (1) 플랫폼이 이미 재는 세션 · 길이(→ 첫 판 진입 · 체류), (2) 트래픽 표본 크기(→ 무료 부스트 1회를 계측된 빌드에), (3) 「품질」 인상(→ 커버 · 설명 · 공유 글). 그 외 선발 규칙은 미확인이며, 추측으로 일정을 짜지 않는다.

---

## 1. EB 현황 — 코드 · 캐비닛 대조

### 1.1 캐비닛 (10/1 조회)
- 샌드박스 `ubqram6dg5` ACTIVE · revision `cmupfe6qu017qfm0h3ctczgbz` · archive `earth-and-beyond-0.9.0-7762954`(PASSED, **Bridge 2.2.0** 측정).
- launch steps: archive · bridge · covers · form · sandbox DONE / share AVAILABLE / **traffic TODO(current)**.
- traffic: `verdict.allowed: true` · FREE · 3일 · `expectedGameplays: 100` · `remainingFreeRuns: 2` · runs 0 · referral 0.
- 리더보드 6개 활성(`kevin-PEB` · `Kevin-PEB2` · `gallery_total` · `ch1~3_clear`) · 모두 `scoreValidationMode: log_only`.

### 1.2 폼 · 미디어 (get_application)
- **설명 문구가 v0.9 와 어긋난다**: "Comets & Observatory **(new in 1.2)**" — 버전 리셋(v0.9) 뒤 남은 옛 번호. 카탈로그 선발자가 읽는 문구.
- `developerComment` 는 1.x 시절 문장("ad-continue flow … polished").
- **커버 3장 · 스크린샷 5장 · 영상 1개 모두 2026-06-15 업로드** — AI 반려(6/17) 이전, v0.9 기능(혜성 · 관측소 · 갤러리 랭킹) 이전 화면. 샌드박스 카드 · 트래픽 광고 소재(LH run 은 creative 12개가 자동 생성됨)의 원본이 이 커버일 가능성 높음(추정).
- 공유 글 기본 템플릿이 "Made with AI. … Fine-tuned by me." — AI 반려 이력이 있는 게임의 공개 문구로는 불리. 글은 감독이 직접 쓰므로 바꿀 수 있다.

### 1.3 코드 (src · scripts)
- `src/playgama-bridge-config.json` `saas.leaderboards.platforms = ["playgama","qa_tool"]` — **`playgama_sandbox` 없음**. 샌드박스에서 랭킹 · `gallery_total` · `chN_clear` 기록이 꺼질 가능성 높음(코드 근거, 실기 미확인).
- 진행 이벤트는 `platform.sendMessage('level_started' | 'level_failed' | 'level_completed', …)`(index.html 2405 · 2696 · 3252) + 장면별 커스텀 메시지. **`bridge.analytics.send` 는 쓰지 않는다.** sendMessage 의 커스텀 이름을 플랫폼이 집계하는지는 미확인, analytics 모듈은 「Use them to see where players drop off」라고 명시.
- Bridge 는 `https://bridge.playgama.com/v2/stable/playgama-bridge.js` 로드 → 런타임 버전은 CDN stable 을 따른다. 9/29 측정 2.2.0, 지금 2.3.0+ 인지 미확인 → `bridge.analytics` 존재 검사로 안전하게 붙일 수 있다.
- `scripts/build-playgama.mjs`: `package.json` ↔ `APP_VERSION` 불일치 차단 **있음**. 제외 목록은 `firebase-config.js` 뿐 → `firebase.js`(gstatic · ipapi.co URL) · `crazygames.js`(sdk.crazygames.com URL)가 zip 에 **들어간다**. 둘 다 가드됨(Firebase 는 config 없으면 미연결, CG 는 hostname 검사)이라 실제 호출은 없다고 판단하나, 체크 #11 · #14 의 문자열 검사에 걸릴 여지가 남는다. 또 `index.html` 의 `<script src="firebase-config.js">` 는 zip 에서 404 → 콘솔 에러 1건.
- 빌드 문법 게이트 · DEV 훅 자동 제거는 **없다**(DEV 바는 `?dev` 파라미터로만 노출 — 기능상 안전, 운영 집계 `?dev=1` 은 공개 URL 에서 누구나 켤 수 있음).

### 1.4 체크리스트(live 26항목) 대비 v0.9 갭
| # | 상태 | 근거 |
|---|---|---|
| 10 리워드 opt-in · 계속 조건 금지 · 매번 +1 life 금지 | **회색** | Chronicles 게임오버 1단계가 「📺 CONTINUE (AD n/N)」(별 부족 시 광고로 이어하기, 하루 쿼터까지 **매 패배마다** 제시). END RUN 이 늘 있어 opt-in 이긴 하나, 문구 "never offer '+1 life' every time the player loses one" 에 가까운 패턴. 자동 검사는 PASSED, 사람 심사 판정은 미확인. |
| 11 외부 리소스 금지 | 대체로 OK | 실제 외부 호출은 Bridge CDN 뿐(코드 근거). 다만 죽은 외부 URL 문자열이 zip 에 남음. |
| 14 외부 분석 금지 → Bridge analytics 권장 | **미이행** | analytics.send 미사용. |
| 26 게시 링크 Playwright 확인 | **미이행(샌드박스 기준)** | Playgama 가 직접 게시한 revision 을 우리가 열어 본 기록 없음 → 리더보드 꺼짐 여부도 실측 안 됨. |
| 1~9 · 12~13 · 15~25 | v0.9 릴리스 노트 · 9/29 검사 기준 충족으로 기록됨 | 이번 라운드에서 재실측 안 함. |

---

## 2. EB 샌드박스 KPI 를 막는 것 — 상위 5

1. **트래픽 0** — runs 0, plays 사실상 1. 표본이 없으면 「strong performance metrics」 자체가 성립하지 않는다. 무료 부스트는 EB 평생 1회.
2. **우리가 KPI 를 못 본다** — 세션 · 체류 · 리텐션은 플랫폼만 안다. EB 는 이 시점 analytics.send 미사용 + `playgama_sandbox` 누락으로 **게임이 직접 남기는 지표(리더보드)도 꺼져 있다**(추정). 이대로 부스트를 쓰면 plays 숫자만 남는다. 좋아요는 개별 게임 페이지에 숫자가 안 보여 EB 는 그것조차 못 본다.
3. **스토어 면이 6월 상태** — 커버 · 스크린샷 · 설명(“new in 1.2”)이 AI 반려 이전 · v0.9 이전. 광고 클릭률 · 카드 클릭률과 「품질」 인상을 동시에 깎는다(추정, 측정 불가).
4. **리비전 관리 규칙 부재** — 같은 URL 로 언제든 교체 가능(진행 보존, 3회/시간)하지만, 부스트 도중 동작이 바뀌면 그 기간 지표가 두 빌드의 혼합이 된다. Playgama 가 어떤 리비전의 지표를 보는지 미확인.
5. **체크 #10 회색 지대** — 패배마다 광고 이어하기 제시. 카탈로그로 뽑힐 때 사람 심사에서 걸리면 지표가 좋아도 한 바퀴 더 돈다.

---

## 3. 제안 — 상위 5

### P1. v0.9.1 「계측 패치」 — `playgama_sandbox` + Bridge analytics 이벤트 (트래픽 전 필수)
- **무엇**: ① `saas.leaderboards.platforms` 에 `"playgama_sandbox"` 추가. ② `SG.PG.track(name, data)` 래퍼 신설 — `bridge.analytics && bridge.analytics.send` 가 있을 때만 호출, 없으면 무시. 기존 `level_started/failed/completed` 지점 + `run_ended {mode, moves, duration_sec, scenes}` · `tutorial_completed`(혜성 · 관측소 첫 팁) · `ad_offer_shown/accepted {placement}` 를 같은 지점에서 보낸다(snake_case, 값은 data 에). sendMessage 는 그대로 둔다. ③ `package.json` 0.9.1 · `APP_VERSION 'v0.9.1'`.
- **왜 EB KPI 를 올리나**: 직접 올리진 않는다 — **부스트 1회를 「측정 가능한 1회」로 바꾼다.** 랭킹 노출은 재방문 동기(Daily 순위)라 체류 · 재방문에 직접 기여. analytics 는 체크 #14 가 지정한 공식 통로라 Playgama 쪽 「drop off」 화면에 EB 데이터가 쌓인다(우리 열람 경로는 미확인 → 감독이 캐비닛 웹에서 확인 요청).
- **비용**: 설정 1줄 + 래퍼 · 호출 6곳 ≈ 반나절, 빌드 · 업로드 · `get_sandbox_state(archiveId)` 사전점검 · 게시 ≈ 30분.
- **위험**: 낮음. Bridge 런타임이 2.2.x 면 analytics 는 조용히 빠짐(feature detect). 게시는 감독 승인. 새 아카이브로 `get_submission_state` 가 제출 가능으로 바뀌어도 **제출하지 않는다**.
- **LH/신규**: `playgama_sandbox` 는 LH v0.1.2 와 같은 수정(EB 근거: config 파일). analytics 래퍼는 **신규**(LH 도 미사용).

### P2. 무료 SHARE 부스트 1회 — LH 마감 뒤 10/6 시작, 게시글 3개 시차로 약 6일
- **무엇**: 10/6 10:00 KST(LH 마감) 이후, LH 캠페인이 `RUNNING` 이 아님을 `get_sandbox_traffic`(LH)으로 확인한 뒤 EB 첫 게시글 1개로 `start_sandbox_traffic`. 10/7 · 10/8 에 2 · 3번째 링크 추가(추가 시점부터 최소 3일) → 측정 창 ≈ 10/6~10/11. 조직 남은 2개 중 **EB 1개만 사용**(wiki: once per game), 1개는 다음 게임 몫으로 보존.
- **왜**: 플랫폼 기대치 100 gameplays/부스트(보장 아님) — 지금 1 play 에서 선발 판단이 가능한 최소 표본으로. LH 의 10/3 Facebook 링크 추가로 LH 런이 10/6 전후까지 이어지므로, 조직 「active-campaign capacity」 충돌 여부(미확인)를 피해 겹치지 않게 한다.
- **비용**: 게시글 3개(감독) · 매일 10분 스냅샷.
- **위험**: 되돌릴 수 없음 · 평생 1회. **P1 · P3 가 게시된 리비전에서만** 시작한다(계측 없는 빌드에 쓰면 보너스 낭비). 공유 글은 기본 "Made with AI" 대신 손으로 고른 장면 · 시대 순서 · 혜성 메커닉을 앞세운 문구로.
- **LH/신규**: 시차 링크 추가 운영 방식은 LH 에서 캠페인 동작으로 확인된 사실(EB 에도 같은 API).

### P3. 스토어 면 갱신 — 설명 · developerComment · 커버 3장 · 스크린샷
- **무엇**: 설명에서 "(new in 1.2)" 제거, v0.9 기준 문구(시대 순서를 손으로 배열했다는 큐레이션 포인트 유지). `developerComment` 갱신. 커버 3장(800² · 1080×1920 · 1920×1080)을 v0.9 실제 화면 기반으로 재생성(`scripts/make-cover.mjs`), 스크린샷 5장은 혜성 · 관측소 · 갤러리 랭킹 포함으로 교체(스크린샷 업로드는 캐비닛 수동 — MCP 도구 없음).
- **왜**: 샌드박스 카드 · 트래픽 광고 소재의 클릭률 → plays. 선발자가 읽는 「품질」 면. 6월 이미지는 AI 반려 시점 그대로다.
- **비용**: 폼 문구 30분 · 커버 재생성 1~2시간(아트 판정은 art-director).
- **위험**: 커버 교체 뒤 **반드시 재게시**해야 live revision 에 커버가 반영(트래픽 조건 "covers in the live revision"). P1 게시와 한 번에 묶는다. 폼 수정은 쓰기 도구라 감독 승인.
- **LH/신규**: 신규(EB 고유 문제).

### P4. 리비전 동결 규칙 — 「부스트 전 1회 게시 → 측정 창 동결 → 창 뒤 패치」
- **무엇**: v0.9.1(P1+P3 + 기술 · 기획이 고른 첫 판 개선 1~2건)을 **10/5 KST 까지** 게시하고 QA Tool + 샌드박스 링크로 체크 #26 실측(랭킹 버튼 노출 · 기록 반영 · 테마 이미지). 10/6~10/11 측정 창 동안 **동작 변경 게시 금지**(치명 버그만 예외, 사유 기록). v0.9.2 는 10/12 이후 측정 결과로. 각 게시 시각 · revision id 를 `docs/devLog` 에 표로 남겨 지표 구간을 나눈다.
- **왜**: 혼합 표본이면 어떤 변경이 체류를 올렸는지 알 수 없고, Playgama 가 보는 리비전도 미확인이다. 진행 보존 · 같은 URL 이라 게시 자체 위험은 낮으니 **타이밍만 통제**하면 된다.
- **비용**: 0(운영 규율) + 게시 전 실측 30분.
- **위험**: 측정 창 중 발견한 개선을 6일 미룬다. LH 마감 전(~10/6) EB 무거운 빌드 · 브라우저 확인은 PC 부하 규칙상 LH 작업과 겹치지 않게 시간 분리.
- **LH/신규**: 신규. (LH 의 빌드 문법 게이트 · DEV 훅 제거는 EB 빌드 스크립트에 없음 — 기술 담당 후보로 넘김, 운영 필수는 아님.)

### P5. 분석 없는 KPI 대시보드(운영 일지) + 체크 #10 정리 제안
- **무엇**: (a) 매일 2회 기록 — `get_sandbox_traffic`(status · spentRatio) · 공개 페이지 plays · P1 리더보드 `getEntries` 분포(`gallery_total` 인원 = 1장면 이상 플레이어 수, 장면 분포 = 깊이, `chN_clear` 판 수 중앙값 = 난이도, Daily 항목 수 = 재방문 대리). (b) 감독에게 캐비닛 웹 UI 의 통계 · analytics 화면 존재 여부 1회 확인 요청. (c) 측정 창 끝(10/12) 리포트 → 재제출은 그 뒤 감독 판단. (d) 체크 #10: Chronicles 「CONTINUE (AD)」 를 패배마다 제시하는 구조를 기획 · 기술에 넘겨 r2 에서 판정(예: 광고 이어하기 런당 1회 제한, 또는 별 결제만 남기기).
- **왜**: 플랫폼 지표를 못 보는 상태에서 카탈로그 선발 전에 우리가 병목(첫 장면 미도달 · 챕터 벽)을 고칠 유일한 근거. #10 은 지표가 좋아 선발돼도 사람 심사에서 되돌아올 위험을 미리 없앤다.
- **비용**: 하루 10분 · 리포트 1시간. #10 수정은 기술 담당 추정 1~2시간.
- **위험**: `getEntries` 반환 한도에 잘려 인원이 과소 집계될 수 있음(설계 문서상 「N 이 조회 한도일 수 있음」) — 값이 고정되면 한도로 표기. `?dev=1` 운영 집계는 공개 URL 에서 누구나 켤 수 있으니 숫자 외 개인정보가 없는지 기술 확인.
- **LH/신규**: 스냅샷 루틴은 LH 챌린지 운영과 같은 형식(EB 근거: 같은 MCP 지표 한계). #10 은 EB 코드 근거(index.html 3269~3290 · 3362~3397).

---

## 4. 승인 필요 목록 (감독)
아카이브 업로드 · 샌드박스 게시(P1 · P3 · P4) · 폼 · 커버 수정(P3) · SNS 게시 · `start_sandbox_traffic`(P2) · 재제출 여부(P5 c). 이번 라운드에서 쓰기 도구는 호출하지 않았다.

## 5. 미확인 (r2 에서 다른 역할이 근거를 대면 갱신)
- 카탈로그 선발 지표 이름 · 임계값 · 주기 · 어느 revision 을 보는지.
- analytics.send 데이터를 개발자가 어디서 보는지(MCP 도구 없음).
- 현재 Bridge stable 런타임 버전(2.3.0+ 여부).
- 조직 단위 active-campaign capacity 로 LH · EB 동시 런이 막히는지.
- 샌드박스 실기에서 랭킹이 실제로 숨는지(브라우저 금지로 미실측).
