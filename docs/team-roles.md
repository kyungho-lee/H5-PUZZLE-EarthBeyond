# 팀 역할 · 협업 절차 — EarthBeyond

**PD 한 명과 전담 에이전트 다섯**, 필요할 때만 부르는 컨설턴트로 만든다.
에이전트 정의는 `.claude/agents/` — **직무만 적고 프로젝트 사실은 적지 않는다.** 프로젝트 사실(목표 · 파일 · 명령 · 정책 · 일정)은 이 문서 · `docs/win-condition.md` · `CLAUDE.md` 에 둔다. 역할 문구를 바꾸면 이 문서와 그 파일을 함께 고친다.

## 1. 역할

| 이름 | 직책 | 에이전트 정의 | 모델 |
|---|---|---|---|
| 서지현 | PD (총괄) | 메인 세션 | Opus |
| 한도윤 | 기술총괄 | `.claude/agents/tech-lead.md` | Opus |
| 문세라 | 아트 디렉터 | `.claude/agents/art-director.md` | Opus |
| 강민재 | 서비스 운영 · 배포 | `.claude/agents/service-ops.md` | Sonnet |
| 임하루 | 게임 디자인 · 레벨 · 밸런스 | `.claude/agents/level-designer.md` | Opus |
| 윤채원 | 라이브옵스 · 참여 설계 | `.claude/agents/liveops-planner.md` | Opus |
| *(이름표 없음)* | 게임 제작 컨설턴트 | `.claude/agents/game-consultant.md` | Fable · 읽기 도구만 |

- **수퍼바이저(감독)** = 사용자. 방향을 정하고, 긴급 · 모순 · 외부 공개 사안만 결정한다.
- **PD** = 메인 세션. 일정 · 우선순위 · 사양 확정 제안 · 에이전트 배정 · 커밋.
- **컨설턴트**는 감독이 부르라고 할 때만. 의견은 찬스카드.

## 2. 이 프로젝트에서 무엇을 어디서 보나

| 영역 | 주 담당 | 위치 · 명령 |
|---|---|---|
| 목표 · 넘지 않는 선 | 전원 | `docs/win-condition.md` |
| 현행 사양 · 일정 · 게시 체크리스트 | PD | `docs/sandbox-kpi-debate/pd-final-spec.md`(4장 일정 · 7-3 go/no-go) · `cont-pd-final.md` |
| 게임 컨셉 · 시대 설계 · 에셋 규칙 | PD · AD | `docs/concept.md` · `docs/era-design.md` · `docs/asset-guide.md` |
| 엔진 · 셸 · Bridge 연동 | 기술총괄 | `src/neon-drift.js` · `grid-render.js` · `index.html` · `playgama.js` · `save-store.js` · `playgama-bridge-config.json` |
| 테스트 · 빌드 게이트 | 기술총괄 | `npm test` · `scripts/playgama-gates.js` |
| 로컬 실행 | 누구나 | `cd src && python -m http.server 8081` (DEV: `?dev=1`, LB STATS 포함) |
| 테마 그림 · 스토어 면 | AD | `src/themes/` · `docs/store/` · `scripts/make-store-covers.mjs` |
| 밸런스 시뮬레이션 | 게임 디자인 | `scripts/sim-strata.mjs` · `sim-continue.mjs` · `docs/sims/` · `docs/balance-report-*.md` |
| 빌드 zip · 릴리스 노트 | 서비스 운영 | `npm run build:playgama` → `build/earth-and-beyond-<ver>-<hash>.zip` · `docs/devLog/Release_Note_v<ver>.md` |
| 참여 · 트래픽 · 측정 계획 | 라이브옵스 | `docs/ad-strategy.md` · pd-final-spec 4장 |
| 토론 · 실험 기록 | 누구나 | 토론 `docs/sandbox-kpi-debate/` · 실험 `docs/rnd/` |

Playgama 앱 id `cmqf9ib9y009rlr0hzzxkr4hw`, 샌드박스 https://playgama.ai/play/ubqram6dg5.

## 3. 협업 규칙

- 에이전트는 **서브에이전트를 부르지 않는다.** 커밋은 PD 가 요청할 때만, 바꾼 경로만.
- 보고는 **한국어**, 플레이어가 보는 말로: 무엇을 했나 · 확인 결과(숫자 · 캡처) · 남은 위험 · 넘길 것.
- **「확인했다」 는 실제로 열어 본 것만.** 화면은 실제로 띄워 캡처로, zip 은 목록을 펼쳐서.
- 로컬 웹서버 · Chrome 탭은 하나만, 쓰고 나면 종료.
- 푸시 · 캐비닛 업로드 · 커버/폼 변경 · 샌드박스 공개 · 트래픽은 **감독 승인 뒤**. 모더레이션 재제출은 하지 않는다.
- 판단 근거는 EarthBeyond 자체의 코드 · 지표다. 다른 프로젝트의 결정은 근거로 쓰지 않는다.

## 4. 끝장토론

방향을 정할 때 쓴다. **1라운드** 역할별 제안(각자 문서 하나) → **2라운드** 전원이 다른 제안을 읽고 교차 채점(지표 효과 · 비용 · 위험) + 셀프 리플렉션 → **PD 취합** 최종 스펙 → 감독 승인. 기록은 주제별 폴더(예: `docs/sandbox-kpi-debate/`).
