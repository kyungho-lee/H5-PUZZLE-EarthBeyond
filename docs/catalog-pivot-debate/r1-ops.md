# 1라운드 — 서비스 운영 · 배포 (강민재)

_조회 시각 2026-10-02 (KST 오후 추정, UTC 타임스탬프는 아래 표 그대로) · Playgama 읽기 도구 + WebFetch 만 사용. 쓰기 도구는 하나도 부르지 않았다. 숫자는 조회한 그대로, 추정은 「추정」, 못 본 것은 「미확인」._

## 0. 최신 사실 (10/2 조회) 와 어제 대비

| 항목 | 10/1 12:2x UTC (kpi-report) | 10/2 조회 | 변화 |
|---|---|---|---|
| **EB 공개 played** | 1 | **3** | +2 (트래픽 0 · 자연 유입 추정) |
| EB 좋아요 | 페이지에 숫자 없음 | 페이지에 숫자 없음 | 미확인 |
| EB 샌드박스 | ACTIVE · v0.9 아카이브 `cmumnvu5f…` | 같음. publishedAt 10/1 11:03:10 UTC | 변화 없음 |
| EB 최신 아카이브(v0.9.1) | - | `cmuprz1u805k4pz0h6ffxz6p0`. launch step `sandbox` = **OUTDATED / CHANGED**(게시 대기), `form` = TODO(선택), `traffic` = TODO(source SHARE) | 게시만 남음 |
| EB 트래픽 | 이력 0 | 이력 0 · `allowed: true` · FREE 사용 가능 · **조직 남은 무료 횟수 2** · 레퍼럴 0 | 변화 없음 |
| EB 리더보드(캐비닛 설정) | 6개 | 6개(`kevin-PEB` `Kevin-PEB2` `gallery_total` `ch1~3_clear`), 모두 활성 · `log_only` | 변화 없음 (항목 수는 MCP 로 조회 불가) |
| EB 심사 | MOD-5167 POSTPONED | 같음. 코멘트 2건(10/1 샌드박스 이동 · 6/17 AI 자산 반려) | 변화 없음 |
| **LH 공개 played** | 103 | **142** (게임 페이지) · 챌린지 리더보드 143 | +39~40 (+약 38%) |
| **LH 좋아요** | 10 | **18** (챌린지 리더보드) | +8 (+80%) |
| LH like/play | 약 9.9% | **약 12.6%** (18/143) | 상승 |
| **LH 챌린지 순위** | 4위 / 25개 | **1위 / 29개** | 등재 +4. 어제 1위였던 Car Parking Challenge Game(2.7k · 202) 은 **오늘 표에 없다**(원인 미확인: 삭제 · 탈락 · 표 갱신 누락 중 무엇인지 모름) |
| LH 2위 | Strange Barcelona 64 · 16 | Strange Barcelona 67 · 16 | 거의 정지 |
| LH 트래픽 run | RUNNING · spentRatio 0.28585 | RUNNING · **0.38416** · 종료 10/3 13:36:17 UTC · postUrls 2개(X · Threads) | +0.098 |
| LH 리더보드(설정) | 3개 | 3개(`night_score` `best_progress` `hall_of_fame`) 활성 | 변화 없음 |
| **텔레메트리 API** | HTTP 500(10/2) | EB · LH 둘 다 9/25~10/2 로 재시도 → **HTTP 500** | 여전히 안 됨. 세션 · 체류 · 재방문은 못 본다 |

- 해석(추정): LH 의 +40 plays 는 spentRatio 0.10 소진과 같은 방향이다(부스트 기대치 100 gameplays/부스트, 실측 아님). **EB 의 +2 는 광고가 아닌 자연 유입이며 의미 있는 표본이 아니다.**
- 챌린지 1위는 LH 지만 2위 Strange Barcelona 와 likes 2 차이(18 vs 16). 평균 5분 자격 충족 여부는 공개 데이터로 볼 수 없다(미확인).
- LH 현황의 출처: 챌린지 리더보드 `https://playgama.ai/play/challenge/alittlespooky/leaderboard` (29 entries).

## 1. 진단 — 서비스 운영 관점에서 EB 가 카탈로그에 못 가는 이유

| # | 진단 | 근거 |
|---|---|---|
| 1 | **지금 EB 에는 입증할 숫자 자체가 없다.** 게시 후 약 1일 동안 played 3, 트래픽 이력 0, 공개 좋아요 표시 없음. 「지표가 좋은 게임을 고른다」 는 문장에서 우리는 아직 후보 표본조차 못 만들었다. | `get_sandbox_traffic`(runs 비어 있음) · EB 게임 페이지 3 played |
| 2 | **Playgama 가 보는 지표를 우리는 못 본다.** 텔레메트리 500 이 이틀째. 캐비닛 MCP 로 보이는 건 plays · likes · 트래픽 상태 뿐이다. 선발 기준이 체류 · 재방문이면 우리는 눈 감고 최적화한다. | `get_game_telemetry_analytics` 500 × 2 |
| 3 | **6월 반려 사유가 아직 어느 면에서도 해소되지 않았다.** 스토어 폼 · 커버 · 스크린샷은 6월 그대로이고(`form` TODO), 코멘트 원문은 「original mechanics, curated art direction, hand-tuned gameplay」 를 요구한다. 샌드박스 이동은 「합격」 이 아니라 「카탈로그 기준 미달」 이다(10/1 코멘트 원문 「does not yet meet the requirements」). | `list_moderation_comments` |
| 4 | **정책 문구가 그래픽 제작 방식을 직접 겨눈다.** content-requirements: 「titles constructed wholly with generative AI perform significantly worse and are rejected unless they demonstrate substantial human refinement of visuals and bring meaningful innovation to player experience」. EB 타일 · 배경은 생성 이미지 큐레이션(3세트)이다. 「큐레이션」 이 「substantial human refinement」 로 읽히는지는 Playgama 판단이라 우리가 확정 못 한다. | wiki content-requirements (WebFetch) |
| 5 | **v0.9.1 은 아직 게시 전이라 샌드박스에 떠 있는 건 v0.9(리더보드 비활성 의심 빌드)이다.** kpi-report 는 v0.9 가 `playgama_sandbox` 플랫폼 id 가 없어 샌드박스 리더보드가 꺼진다고 진단했다(설정 파일 근거, 직접 확인 안 함). 현재 샌드박스 플레이어 3명은 그 빌드를 쓴다. | `get_launch_steps` sandbox OUTDATED · kpi-report 2.4 |

## 2. LH 사례 해부 (운영 영역)

| 구분 | 내용 |
|---|---|
| **EB 에 의미 있는 것** | ① 마감이 있는 **챌린지라는 공개 순위표**가 plays · likes 를 매일 보여 준다 → 우리가 판단할 수 있는 유일한 외부 비교 표. ② LH 는 샌드박스 게시 당일(9/30)에 SHARE 트래픽을 걸고 **게시 링크를 2개(X · Threads)로 나눠 달아 3일 이상 노출**을 만들었다. 이틀 만에 played 약 40 → 143 규모로 반응이 보였다. ③ 리더보드 3개를 **플레이어에게 보이는 곳**(점수 · 진행 · 명예의 전당)에 두어 `getEntries` 로 진행 분포를 읽을 수 있게 했다. ④ 결과적으로 like/play 약 12.6% — **좋아요 비율은 EB 가 가진 적 없는 숫자**다. |
| **EB 에 의미 없는 것** | ① 챌린지 유입(주제 맞춘 별도 노출, 100 sessions · 5분 룰)은 상시 샌드박스에는 없다. ② 6일 범위 · 할로윈 한시 소재는 카탈로그 상시 노출 기준과 다르다. ③ form 단계가 NO_CERTIFICATION 으로 막혀 있어 LH 는 실수 제출이 불가능한 구조 — EB 는 certification BASIC 이라 제출 가능성이 열려 있다(그래서 재제출 금지 규칙이 필요). |
| **LH 도 아직 증명 못 한 것** | ① **평균 플레이 시간**(5분 자격) — 어디서도 안 보임. ② 챌린지 1위 교체는 **경쟁작 Car Parking 이 표에서 사라진 효과**일 수 있다(원인 미확인) → 「LH 가 이겼다」 가 아니라 「표가 바뀌었다」. ③ 카탈로그 선발과 챌린지 순위가 같은 기준인지. LH 는 DRAFT 상태이고 카탈로그 심사에 낸 적이 없다. ④ 유료/무료 부스트 이후 자연 유입 유지력 — 10/3 이후 데이터가 아직 없다. |

## 3. 방향 투표

**운영 관점 투표: C (그래픽 제작 방식 · 스토어 면 교체 + 시나리오 압축), 같은 앱 id 유지.** A 단독(현행 유지 + 보강)은 반대, B(전면 교체 + 새 앱)는 현시점 반대.

이유 (운영 사실만):
1. 같은 앱 id 를 유지하면 **샌드박스 URL · 심사 이력 · certification · 리더보드 6개 · Bridge 연동이 그대로 이어진다.** 새 앱은 이걸 전부 처음부터 다시 한다(`create_application` · 폼 · 커버 · 샌드박스 · certification).
2. Playgama 의 10/1 코멘트는 **EB 한 게임을 샌드박스에서 보겠다**는 것이다. 새 앱으로 옮기면 이 코멘트의 「이어서 본다」 맥락을 잃는다(추정: 선발 담당자가 앱 단위로 본다 — 미확인).
3. 6월 반려 코멘트가 따라오는 단점은 있지만 반려 코멘트의 요구가 「손으로 조율한 gameplay · 큐레이션 아트」 라서, 같은 앱에서 그 요구를 충족하는 빌드를 올리는 것이 **응답의 형태로는 가장 직접적**이다. 새 앱으로 숨는 건 같은 요구를 다시 마주할 뿐이다.
4. content-requirements 에 「Games cannot duplicate existing titles in the catalog or from the same developer」 가 있다. 같은 코어(4×4 슬라이드 머지)를 새 앱으로 또 내면 **같은 개발자의 기존 타이틀(EB · LH · NeonDrift · samegame)과 중복으로 읽힐 위험**이 생긴다(「sequels are acceptable if graphics and mechanics are substantially redesigned」 라는 예외 조건이 있어 완전히 막히는 건 아니다). 이는 B(새 앱)에 불리한 공개 근거다.

피봇의 컨셉 · 그래픽 안은 AD · 게임 디자인 역할의 몫이라 여기서는 적지 않는다. 운영이 필요로 하는 조건만 적는다: **새 컨셉은 아카이브 규칙(외부 호출 없음 · 용량 · 라틴 파일명)을 유지하고, 새 AI 이미지는 쓰지 않으며, 같은 앱 id 에서 v0.9.x 로 나가는 크기**여야 한다.

## 4. 카탈로그 선발 기준 — 공개적으로 확인 가능한 것 vs 모르는 것

| 구분 | 내용 | 출처 |
|---|---|---|
| **확인됨 (문구)** | 「We regularly select good-quality games from Sandbox that demonstrate strong performance metrics and add them to the main Playgama catalog」 | 10/1 모더레이션 코멘트 |
| 확인됨 | AI 자산: 「can use AI-generated assets, but they shouldn't be built entirely from them」. 순수 생성 산출물은 reject. 완화 조건 = 시각의 상당한 사람 손질 + 의미 있는 플레이 혁신 | 6/17 코멘트 · wiki content-requirements |
| 확인됨 | 중복: 카탈로그 · 동일 개발자 기존 타이틀 복제 금지. 속편은 그래픽 · 메카닉 실질 재설계 시 가능 | wiki content-requirements |
| 확인됨 | 체크리스트 26항목(Bridge 1~7 필수, 외부 리소스 금지 #11, 외부 분석 금지 #14, 리워드 광고 옵트인 #10 등). 팁에 「Do not synthesize sound procedurally — use ready-made free sound packs」 가 있다 | `get_game_checklist` |
| 확인됨 | 일반 모더레이션 소요 3~5 영업일 | wiki faq/game-moderation |
| **모름** | **「strong performance metrics」 가 정확히 무엇인가**(plays? likes? 체류? 재방문? 수익?), 임계값, 평가 주기(「regularly」 의 간격), 샌드박스 기간 상한 | 공개 문서에 없음 (wiki 색인에 카탈로그 선발 전용 페이지 없음) |
| 모름 | 선발이 **샌드박스의 최신 revision** 을 보는지 **마지막 제출 아카이브(v0.9.0)** 를 보는지 | 미확인 (kpi-report 에서도 미확인) |
| 모름 | 선발 시 6월 AI 반려가 **감점으로 따라오는지** | 미확인 |
| 모름 | 플랫폼이 EB 의 세션 · 체류 · 재방문을 집계해 보고 있는지(집계는 한다고 추정, 챌린지에 5분 평균을 쓰므로) | 추정 |
| 모름 | 선발된 뒤 v1.0 으로 어떤 절차(재제출 vs 자동 이동)를 밟는지 | 미확인 |

## 5. 피봇 시 운영 선택지 비교

### 5.1 같은 앱 id 에서 컨셉 교체 (옵션 S)

| 항목 | 내용 |
|---|---|
| 절차 | ① 새 아카이브 빌드(`npm run build:playgama`, 컨셉 반영) → ② `start_archive_upload` · `confirm_archive_upload` → 빌드 검사 → ③ `get_sandbox_state(archiveId)` 로 게시 사전 점검 → ④ `publish_sandbox`(새 revision, **같은 URL** `ubqram6dg5`) → ⑤ 스토어 폼 · 커버 · 스크린샷 갱신(`update_application_form` · 커버 업로드, 스크린샷은 도구 없음 = 사람이 캐비닛에서) → ⑥ 트래픽 |
| 장점 | URL · 앱 · 리더보드 6개 · certification BASIC · 심사 이력 유지. 지금 쌓인 3 played 와 이후 데이터가 같은 앱에 이어진다. 코멘트 「이어서 본다」 가 성립. |
| 위험 | ① **MOD-5167 POSTPONED 이력과 6월 반려 코멘트가 따라온다.** ② 새 아카이브를 올리면 `get_submission_state` 가 NO_CHANGES → 제출 가능으로 바뀔 수 있다 → 재제출 금지 규칙 유지 필요. ③ 컨셉이 바뀌면 지금까지 쌓은 리더보드 점수(`kevin-PEB` `gallery_total` `chN_clear`)의 의미가 달라진다(데이터가 거의 없어 손실은 작다). ④ 스크린샷 업로드 도구가 없어 사람 작업이 생긴다. |
| 되돌릴 수 없는 것 | **샌드박스 revision 을 게시하면 이전 revision 으로 되돌리는 도구는 확인하지 못했다**(미확인; 이전 아카이브를 다시 게시하는 방식으로는 가능해 보이나 URL · played 누적은 한 몫). SHARE 보너스 소진은 되돌릴 수 없다. 6월 반려 이력은 어떤 선택으로도 지울 수 없다. |

### 5.2 새 앱 등록 (옵션 N)

| 항목 | 내용 |
|---|---|
| 절차 | `create_application` → 폼 · 커버 · 스크린샷 → Bridge 연동 + 아카이브 업로드 → certification(QA tool 링크; LH 의 form 단계가 `NO_CERTIFICATION` 으로 막힌 것처럼 새 앱도 BLOCKED 로 시작) → `publish_sandbox`(새 URL) → 트래픽 |
| 장점 | 6월 반려 코멘트 · POSTPONED 이력이 붙지 않는다. 컨셉 · 제목 · 스토어 면을 처음부터 새로 쓴다. 기존 EB 는 baseline 으로 남아 비교 가능. |
| 위험 | ① **조직 SHARE 한도(조직당 평생 3개, 사용 1 → 남은 2)는 앱이 아니라 조직 단위**라 새 앱을 만들어도 늘지 않는다. EB 몫 1을 새 앱이 가져가면 기존 EB 에는 쓸 수 없다. ② 같은 개발자 중복 타이틀 위험(위 3장 4번). ③ 새 앱은 played 0, 리더보드 id 6개 신규 생성(`create_leaderboard` 쓰기) 필요. ④ 「제목은 유일하지 않다」(도구 설명) — 실패한 `create_application` 뒤에는 `list_applications` 로 중복 확인 후 재시도. ⑤ 앱 수 조직 상한은 미확인. ⑥ 기존 EB 샌드박스를 닫는지 두는지는 우리가 정해야 하고, 두면 두 게임이 같은 코어로 트래픽을 나눠 먹는다. |
| 되돌릴 수 없는 것 | 앱 생성 후 삭제 도구는 확인 못 했다(미확인). SHARE 소진. 새 앱에 쓴 certification · 리더보드 설정. |

### 5.3 비교 요약

| 기준 | S (같은 앱) | N (새 앱) |
|---|---|---|
| 심사 이력 | 따라옴(POSTPONED + 6월 반려) | 없음 |
| 샌드박스 URL · played | 유지(3 played, 의미 없는 양) | 0 에서 시작 |
| SHARE 보너스(조직 2 남음) | 같은 풀 | **같은 풀. 한 앱에만 쓸 수 있음** |
| 작업량(운영) | 아카이브 + 폼 + 커버 | 위 + 앱 생성 + 리더보드 6 + certification |
| 중복 타이틀 위험 | 낮음(같은 앱) | **중간**(같은 코어, 같은 개발자) |
| 선발 담당자 맥락 | 이어짐(추정) | 끊김(추정) |
| 운영 권고 | **채택** | 다음 신작에서만 고려 |

## 6. 제안 상위 5 (운영)

| # | 제안 | 올리는 지표 | 왜 EB 에서 그런가 | 비용(일) | 위험 |
|---|---|---|---|---|---|
| 1 | **v0.9.1 을 baseline 으로 먼저 게시하고(리더보드 `playgama_sandbox` 활성), 피봇 빌드는 v0.9.2+ 로 같은 앱에 덮는다** | 리더보드 분포(진행 · 판 수) · plays | v0.9 샌드박스는 리더보드가 꺼진다는 진단(설정 근거). v0.9.1 은 `get_launch_steps` 상 게시만 남았고 빌드 검사 PASSED. 피봇 전 기준선이 없으면 피봇이 좋아졌는지 알 수 없다 | 0.5 (게시 + 확인) | 피봇 전 SHARE 를 쓰면 baseline 에 소진 → 아래 5장 참고 |
| 2 | **트래픽 없는 날도 매일 같은 시각에 스냅샷**(EB · LH played, 챌린지 표, `spentRatio`, 리더보드 분포) | plays · likes · 분포 | 텔레메트리가 500 이라 우리가 가진 건 공개 숫자뿐. 날짜별 시계열이 나중에 선발 근거가 된다 | 매일 10분 | 없음(읽기 전용) |
| 3 | **스토어 폼 · 커버 · 스크린샷을 새 컨셉에 맞춰 다시 쓴다**(`form` step TODO) | likes · plays 전환 | 지금 스토어 면은 6월 그대로. 클릭 → 플레이 전환에서 가장 먼저 보이는 건 커버다. 반려 사유가 「신선함 없음」 이라 면이 낡은 채로는 같은 인상 | 1~2 (AD 몫 포함) | 스크린샷 업로드 도구 없음 → 사람이 캐비닛에서 |
| 4 | **텔레메트리 가용성 상시 감시**: `get_game_telemetry_analytics` 를 하루 1회만 호출하고 복구되면 그 날부터 EB · LH 기간 별 지표를 읽는다 | 체류 · 세션 | 500 이 플랫폼 문제인지 데이터 없음 때문인지 모른다. 복구 시 LH 의 체류 숫자로 5분 자격 · EB 체류를 처음 볼 수 있다 | 0 | 복구가 안 될 수도 있음 → 게임 안 리더보드(판 수 · 누적 분 대리 지표)를 보조로 |
| 5 | **「입증」 판정 기준을 볼 수 있는 숫자로 못 박는다**(7장) | 전부 | 선발 기준이 비공개라 자체 기준이 있어야 승리/패배를 판정할 수 있다 | 문서 0.5 | 기준이 낮으면 자기만족 — 상대 비교(LH · 챌린지 표)를 같이 쓴다 |

## 7. 성공 판정 제안 (볼 수 있는 지표 한계 포함)

| 단계 | 기준 | 볼 수 있나 |
|---|---|---|
| 최소(「입증 시작」) | EB 가 부스트 1회 뒤 played **100+** (플랫폼 기대치 100/부스트) · 계측 빌드 위에서 | 예(공개 페이지) |
| 중간(「LH 와 같은 선」) | like/play **≥ 10%** (LH 현재 12.6% · 어제 9.9%) · 부스트 종료 후에도 일 played **>0** 유지(자연 유입 존재) | likes 는 챌린지 표에서만 보임 → **EB 는 챌린지에 없으므로 likes 를 못 본다**(개별 페이지에 숫자 없음). 새 빌드에서 likes 가 보이는 경로를 찾아야 함 |
| 진행 깊이 | `chN_clear` · `gallery_total` 참여 인원 분포에서 **1판 이상 플레이한 사람 중 Chapter 2 도달 비율** 계획 수립 | 리더보드 항목 수는 MCP 로 못 봄 → 게임 안 `getEntries`(LB STATS `?dev=1`) 에서 사람이 읽어야 함 |
| 체류 | 평균 플레이 시간 | **현재 불가**(텔레메트리 500). 복구 전까지는 판단 근거에서 제외 |
| 선발 | Playgama 가 카탈로그에 올림(알림 · 상태 변경) | 상태는 `get_application`·`list_moderation_comments` 로 보임 |

## 8. 10/5 게시 · 동결 · SHARE 의견

현행 계획: 10/5 v0.9.1 게시 → 동결 → 10/7 SHARE 부스트 → 10/12 리포트 → v0.9.2.

| 선택지 | 내용 | 운영 판단 |
|---|---|---|
| **P1 (권고)** | **10/5 v0.9.1 게시는 그대로 진행**한다. 게시 후 동결은 「측정 창」 이 아니라 「**baseline 3일(10/5~10/8)**」 로 줄이고, SHARE 는 **쓰지 않는다**. 피봇 빌드는 v0.9.2 로 같은 앱에 올리는 시점(≈ 10/10 전후, 추정)에 SHARE 1개를 소진한다 | 이유: v0.9.1 은 올라가 있고 검사 통과. 게시 자체는 비용이 거의 없고 리더보드 활성의 이득이 있다. SHARE 를 baseline 에 쓰면 피봇 빌드에 쓸 몫이 사라진다. 남은 2개 중 EB 몫은 1개 규칙이므로 **한 번뿐**이다 |
| P2 | 10/5 게시를 미루고 피봇 빌드가 준비될 때까지 기다린다 | 샌드박스에는 리더보드 꺼진 v0.9 이 계속 떠 있다. 어차피 played 3 이라 손실은 작지만 baseline 도 영영 없다 |
| P3 | 10/5 게시 + 10/7 SHARE 현행 그대로 | 피봇 의사가 있다면 SHARE 를 baseline(옛 컨셉)에 쓰고 피봇 빌드에는 못 쓴다. **피봇 시 가장 나쁜 조합** |
| 동결 규칙 | 「게시 빌드를 바꾸지 않는다」 는 **SHARE 부스트 기간(3일) 동안만** 적용하는 것을 제안. 부스트가 없는 baseline 기간에는 동결 이유가 약하다(played 3 인 곳에서 동결 효과 없음) | 피봇 빌드를 부스트 시작 전에 게시하고, 그 빌드로 부스트 + 동결 |

- SHARE 시점 제약: LH 캠페인이 10/3 13:36 UTC 종료 예정(Facebook 링크 추가 시 연장). `get_launch_steps` 상 조직 `remainingFreeRuns` 가 2 로 EB 에도 보인다. 동시 실행이 LH 연장에 영향 주는지는 미확인(kpi-report 도 미확인) → **LH 마감(10/6 10:00 KST) 전에 EB 부스트를 시작하지 않는 것이 안전**하다.
- 부스트 사양(조회값): FREE · $2/게시글(내부 회계) · 3일 · expectedGameplays 100. 링크 추가 시 추가 시점부터 최소 3일(LH 에서 관측).
- SHARE 시작 요건: 공개 게시물 링크 필요(감독 SNS) → 외부 게시이므로 감독 승인.

## 9. 되돌릴 수 없는 것 · 승인이 필요한 것 (운영 목록)

| 행동 | 쓰기 도구 | 되돌림 | 승인 |
|---|---|---|---|
| v0.9.1 샌드박스 게시 | `publish_sandbox` | 이전 아카이브 재게시로 가능 추정(미확인) | 감독 |
| 피봇 아카이브 업로드 | `start_archive_upload` · `confirm_archive_upload` | 아카이브는 쌓임 | 감독 |
| 폼 · 커버 변경 | `update_application_form` · 커버 업로드 | 재변경 가능 | 감독 |
| 새 리더보드 | `create_leaderboard` | 비활성화는 가능해 보이나 삭제 도구 미확인 | 감독 |
| SHARE 시작 | `start_sandbox_traffic` | **불가**(조직 평생 한도 3, 현재 2 남음) | 감독 |
| 새 앱 생성 | `create_application` | 삭제 도구 미확인 | 감독 |
| 모더레이션 재제출 | (사람이 캐비닛) | 불가, 쿨다운 위험 | **금지 유지** |

## 10. 내가 모르는 것 / 확인이 필요한 것

1. 카탈로그 선발 지표의 정의 · 임계값 · 주기. 캐비닛 웹 UI 에 통계 화면이 있는지(감독 확인 요청).
2. 텔레메트리 500 의 원인과 복구 시점. EB 가 Bridge `analytics.send` 를 보내고 있는지(체크리스트 #14 는 Bridge analytics 를 권장).
3. 선발 평가가 최신 샌드박스 revision 인지, 마지막 제출 아카이브(v0.9.0)인지.
4. Car Parking Challenge Game 이 챌린지 표에서 사라진 이유.
5. 새 앱 생성 상한 · 삭제 가능 여부 · 샌드박스 revision 롤백 도구 여부.
6. LH 캠페인 중 EB 캠페인이 동시에 돌 수 있는지의 실제 영향.
7. 개별 게임 페이지에 likes 가 표시되지 않아, EB 의 likes 를 어디서 볼 수 있는지.
8. EB 현재 샌드박스(v0.9)에서 리더보드가 실제로 꺼지는지 — 설정 파일 근거 진단일 뿐 브라우저로 확인하지 않았다.
