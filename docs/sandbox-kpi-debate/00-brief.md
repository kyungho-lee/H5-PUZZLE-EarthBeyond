# EarthBeyond 샌드박스 KPI 끝장토론 — 공통 브리프 (PD 서지현 · 2026-10-01)

## 감독 지시
"EarthBeyond 샌드박스 버전을, Little Haunts 게임 시스템 중 필요한 부분을 개선사항으로 모든 에이전트가 교차분석한 뒤 끝장토론을 진행한다. PD 는 결과를 취합해 서비스 에이전트와 최종 업데이트 스펙을 제안한다."

## 사실 (확인됨)
- 2026-10-01 11:03 UTC Playgama 가 EarthBeyond(앱 `cmqf9ib9y009rlr0hzzxkr4hw`) v0.9 심사를 **보류(POSTPONED)** 하고 **샌드박스로 이동**: https://playgama.ai/play/ubqram6dg5 (archive `cmumnvu5f017lpl0hey0yfjei`). 코멘트: "아직 카탈로그 기준 미달 → 샌드박스에서 초기 트래픽 · 실제 성과 데이터 수집 → 지표 좋은 게임을 정기적으로 카탈로그에 올림."
- 2026-06 첫 제출 반려 사유: "100% 생성형 AI 산출물 · 신선한 플레이 경험 없음" — 독창적 메커닉 · 큐레이션된 아트 디렉션 · 손으로 조율한 게임플레이를 요구.
- 서비스 운영 KPI 리포트: `H5-PUZZLE-LittleHaunts/docs/ops/kpi-report-2026-10-01.md` (MCP 로 볼 수 있는 지표 = 공개 plays · likes · 트래픽 집행 / 볼 수 없는 지표 = 세션 · 평균 시간 · 리텐션).
- v0.9 bridge config 의 SaaS 리더보드 플랫폼에 `playgama_sandbox` 가 없다(playgama · qa_tool 만) → 샌드박스에서 게임 안 랭킹이 꺼졌을 가능성 높음.
- 조직 무료 SHARE 트래픽 보너스 남은 2개(평생 3게임). Little Haunts 챌린지 마감 10/6 10:00 KST 까지는 LH 홍보 우선.

## 제약 (EarthBeyond 캐논)
- 버전: v0.9.x 유지, v1.0 은 카탈로그 등재 뒤. `package.json` 과 `APP_VERSION` 함께.
- Playgama zip: 외부 호출 · 분석 도구 금지(Firebase 제외), 저장은 Bridge Storage, 리더보드는 Bridge SaaS, 광고는 Bridge 만, 리워드 광고는 선택(계속 조건 금지 · 매번 +1 life 금지 — 체크 10).
- 판단 근거는 **EarthBeyond 자체의 KPI**(샌드박스 plays · likes · 체류 · 재방문 → 카탈로그 선발)로 쓴다. "Little Haunts 가 했으니까"는 근거가 아니다 — LH 시스템은 **후보 목록**일 뿐, 각 항목이 EB 에서 왜 KPI 를 올리는지 EB 코드 · 구조로 증명할 것.

## Little Haunts 시스템 후보 (참고: `H5-PUZZLE-LittleHaunts/docs/release/changelog.md`, `src/`)
샌드박스 SaaS 리더보드(`playgama_sandbox`) · 잘 자요 화면 순위(상위 5 + 내 줄) · 순위 상승 연출 · 리더보드 3탭(점수 · 진행 · 명예의 전당) · 명예의 전당 띠("첫 주인공") · 기믹 첫 안내 말풍선(1회 · 저장) · 새 친구 축하 연출(칸 팝 · 별 비행) · 밤 배너 · 큰 점수 연출(배율 · 콤보 · 이정표) · 엔딩 크레딧 · iframe 포커스 · 광고 뒤 소리 복구 · 빌드 문법 게이트 · DEV 훅 자동 제거 · 첫 수가 곧 시작(K2) · 판 저장(K3) · 위험 가장자리 · 달(구조) · 유령 · 소환진.

## 산출물
- 1라운드: `r1-<역할>.md` — EB 코드 · 화면 분석, EB 샌드박스 KPI 를 막는 것 상위 5, 제안 상위 5(각: 무엇 · 왜 EB KPI 를 올리나 · 비용(시간) · 위험 · LH 에서 가져올 것/새로 만들 것).
- 2라운드: `r2-<역할>.md` — 다른 4명의 r1 을 읽고 교차 채점(1~5: KPI 효과 · 비용 · 위험 · AI 반려 사유 해소 여부) + 셀프 리플렉션(내 안의 약점) + 수정한 최종 상위 3.
- PD 취합: `pd-final-spec.md` (서비스 운영과 함께).
