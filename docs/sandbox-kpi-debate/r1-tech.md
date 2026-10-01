# r1 — 기술 (한도윤 · 기술총괄) · 2026-10-01

_렌즈: Bridge · 샌드박스 연동 빈틈, 첫 세션 로드 · 부팅, LH 시스템 → EB 구조 이식 비용, 회귀 위험, 빌드 게이트._
_읽은 범위: 브리프 전문, EB `CLAUDE.md` · `START-HERE.md`(둘 다 06월 기준이라 낡음 — 에셋 · Firebase 항목은 현재와 다름), EB `src/` playgama.js · playgama-bridge-config.json · save-store.js · lb-sync.js 전문, index.html 은 부팅(4700~4832) · 광고/오디오(2165~2230, 4170~4200, 4560~4575) · 리더보드(2255~2290, 2355~2390, 2855~2960, 3795~3960) · 입력(4030~4060) · 온보딩(1600~1625, 1875~1910) 구간, firebase.js 핵심 구간, scripts/build-playgama.mjs 전문. collection.js · daily.js · sound.js 는 grep 으로 관련 줄만. LH 는 changelog 전문, lh-platform.js · scripts/playgama-gates.js 전문, lh-store.js · index.html 은 grep._
_코드는 읽기만 했다. 브라우저 · 샌드박스 실측은 하지 않았다 — 아래 "확인 필요" 표시는 추정이다._

---

## EB 코드 분석 요약 (KPI 와 닿는 곳만)

| 영역 | EB 현재 | 근거 |
|---|---|---|
| Bridge SDK | v2 정적 `<script>`(index.html:19) — 샌드박스 2.2.0+ 조건 충족. playgama.js 의 v1 동적 로더는 정적 태그가 있으면 안 탄다(죽은 경로) | index.html:19, playgama.js:44-55 |
| SaaS 리더보드 플랫폼 | `["playgama","qa_tool"]` — **`playgama_sandbox` 없음** | playgama-bridge-config.json:39-43 |
| LB 꺼졌을 때 동작 | `getType()==='not_available'` 이면 제출 자체를 안 함(`lbSubmit` 즉시 false), 랭킹 버튼 · 일일/엔드리스 순위 상자 숨김 | playgama.js:261-264, index.html:2366, 2918, 3831-3836, 3920 |
| 놓친 점수 복구 | 갤러리 · 챕터 클리어는 `lb-sync`(보낸 값 기록)로 다음 부팅에 재전송됨. **일일 최고 · 엔드리스 최고는 재전송 경로 없음** → 샌드박스 기간 기록은 영구 유실 | lb-sync.js, index.html:2270-2273, 2871-2874 |
| 내 순위 | Playgama 행의 id 와 비교할 내 id 가 없다(`bridge.player.id` 미사용). 일일 순위 "내 줄"은 Firebase 전용 | index.html:3951-3957 |
| 부팅 대기 | SDK+Storage 를 최대 **10초** 기다린 뒤에 렌더러 생성 → 그동안 캔버스 없음 · 메뉴 버튼 비활성(`body.booting`) | index.html:4730-4760, 777 |
| 늦은 Bridge | 10초 넘으면 `_bootTimedOut` 으로 그 세션은 로컬 저장. 다음 세션에서 attachBridge 가 원격 저장으로 **덮어씀**(병합 없음) → 그 세션 진행 유실. `game_ready` 도 안 나감(loadingStop 이 패치 전 no-op) | save-store.js:81-97, index.html:4815, playgama.js:150-153 |
| 판 저장 | 저장소는 Bridge Storage 하나(`earthbeyond_save`)로 정리돼 있음(좋음). 단 **진행 중인 판(보드)은 저장 안 함** — iframe 이탈 · 새로고침이면 Chronicles 판이 처음부터 | collection.js grep(보드 없음), index.html 2694 |
| iframe 포커스 | `window.focus()` 없음, 키는 `e.key` 만. 첫 방문은 클릭 없이 Daily 튜토리얼 판이 바로 열림 → 방향키 먼저 누르는 데스크톱 유저는 무반응(확인 필요) | index.html:4036-4041, 1879-1885 |
| 광고 뒤 소리 | `_adAudioPause/Resume` + 일시정지 사유 해제는 이미 있음. 없는 것: 광고 뒤 `isAudioEnabled` 재조회, 사용자 입력 시 AudioContext 재개 안전망(`_unlockBgm` 은 `once`) | index.html:2172-2200, 4795-4796 |
| 빌드 게이트 | 파일명 `\` · themes 누락 · 버전 일치 · dirty tree 만 검사. **외부 URL · 분석 · 직접 localStorage · 인라인 문법 · DEV 잔존 검사 없음**. zip 에 firebase.js(gstatic CDN · ipapi.co), crazygames.js(CrazyGames SDK URL) 문자열이 그대로 들어감(설정 파일이 없어 실행은 안 됨) | scripts/build-playgama.mjs, firebase.js:56,194, crazygames.js:32 |
| 진행 이벤트 | `level_started/completed/failed` · `chN_stepNN` 커스텀 메시지 이미 전송 — 샌드박스 지표 수집과 맞물림(좋음) | index.html:2403-2405, 2696-2698, 3252 |

---

## EB 샌드박스 KPI 를 막는 것 — 상위 5 (기술)

1. **샌드박스에서 게임 안 랭킹이 통째로 꺼졌을 가능성이 높다.** config 에 `playgama_sandbox` 가 없고, EB 코드는 `not_available` 이면 제출도 안 하고 순위 UI 도 숨긴다. 재방문 동기(일일 순위 · 엔드리스 최고 · 갤러리 순위)가 샌드박스 유저에게 보이지 않으며, 일일 · 엔드리스 기록은 나중에 켜도 복구되지 않는다. (실측 확인 필요: 샌드박스 콘솔 `bridge.leaderboards.type`)
2. **첫 세션 부팅이 최악 10초 막힌다.** SDK · Storage 를 기다리는 동안 캔버스가 없고 버튼은 비활성. 샌드박스 트래픽(광고 유입 · 모바일)은 첫 화면 이탈이 가장 크다. 게다가 10초 초과 세션은 진행이 다음 세션에서 덮어써져 유실되고 `game_ready` 도 안 나간다.
3. **판 중간 이탈 = 판 유실.** Chronicles(코어루프) 판은 길고 보드를 저장하지 않는다. iframe 게임은 탭 이동 · 새로고침이 잦아, 재방문해도 "이어하기"가 없어 재방문 가치가 깎인다.
4. **"나는 몇 등"이 Playgama 에서 안 보인다.** `bridge.player.id` 를 안 써서 Playgama 행에서 내 줄을 못 찾는다. 순위가 켜져도 개인 동기(순위 상승)가 약하다.
5. **빌드 게이트가 얇다.** 4,832줄 인라인 셸에 문법 검사가 없고, 외부 URL(Firebase CDN · ipapi.co · CrazyGames SDK) 문자열이 zip 에 남아 카탈로그 심사의 "외부 호출" 항목에서 걸릴 여지가 있다. 샌드박스 기간에 패치를 자주 내야 하는데 한 줄 실수가 그대로 나간다(LH v0.1.4 에서 실제로 따옴표 한 줄이 거의 나갈 뻔).

부수: iframe 포커스(데스크톱 첫 입력 무반응 가능) · 광고 뒤 소리 재조회 누락은 작지만 첫 세션 체감에 닿는다 — 제안 2 에 묶는다.

---

## 제안 — 상위 5

### 1. 샌드박스 리더보드 켜기 + 놓친 최고점 재전송
- **무엇**: config `saas.leaderboards.platforms` 에 `"playgama_sandbox"` 추가. `lb-sync` 의 `plan()` 을 일일 최고(오늘) · 엔드리스 최고까지 넓혀 "보낸 값보다 크면 보낸다"로 부팅 · 게임오버마다 재전송. 노드 테스트 추가(lb-sync.test.js 확장).
- **왜 EB KPI**: EB 의 재방문 장치 3개(Daily 순위 · Endless 최고 · 갤러리/챕터 랭킹)가 전부 `in_game` 에 걸려 있다 — 켜지는 순간 이미 있는 UI 가 그대로 살아난다. 새 화면 0개로 재방문 동기를 복구하는 가장 싼 수.
- **비용**: 2~3시간(config 5분 · lb-sync 확장 + 테스트 1.5h · QA Tool · 샌드박스 실측 1h).
- **위험**: 낮음. 주의 — 샌드박스 SaaS 순위는 리셋이 없어 "DAILY RANKING"이 누적 순위라는 점(코드 주석 3922 에 이미 인지), dev/치트 기록 차단 가드는 유지.
- **LH/새로**: LH v0.1.2 의 config 한 줄은 가져오고, 재전송은 EB 자체 `lb-sync` 확장(새로).

### 2. 부팅 대기 10초 → 2.5초 + 늦은 Bridge 병합 + `game_ready` 보장 (+ iframe 포커스 · 광고 뒤 소리 보강)
- **무엇**: `BOOT_SDK_TIMEOUT_MS` 를 2.5초로 낮추고, 늦게 붙은 Bridge 는 버리지 않고 **병합**(save-store `attachBridge` 에 merge 모드: 키별 규칙 — 카운터 · 해금 · 최고점은 max/합집합, 날짜 키는 오늘 것, 나머지는 `savedAt` 최신). 늦게 붙어도 `game_ready` 1회 전송(LH `attach.then(gameReady)` 패턴). 같은 묶음으로 `window.focus()`(부팅 · pointerdown) · `e.code` 키 매핑 · 광고 종료 시 `isAudioEnabled` 재조회 · 입력 시 AudioContext 재개 안전망.
- **왜 EB KPI**: 첫 화면까지 시간이 샌드박스 plays → 실제 플레이 전환을 좌우. 지금은 최악 10초 빈 화면, 그리고 그 세션 진행은 다음에 사라진다(재방문 유저에게 "진행이 날아간 게임"). 포커스 · 소리는 첫 세션 "고장 난 느낌"을 없앤다.
- **비용**: 6~8시간(병합 규칙 + save-store 테스트 3h · 부팅 배선 1.5h · 포커스/소리 1h · 실측 1.5h).
- **위험**: 중. 저장 병합은 회귀 시 가장 아픈 곳(진행 유실). 테스트 먼저(save-store.test.js 에 "로컬 진행 + 원격 진행 → 둘 다 보존" 케이스), 키별 규칙 표를 PD 확인 뒤 구현.
- **LH/새로**: 패턴(2.5초 · 연결 순간 병합 · gameReady 지연)은 LH K2/K3 · v0.1.1 · v0.1.3 에서 가져오되, 병합 규칙은 EB 의 평면 키 구조(`earthbeyond_*`)에 맞게 새로 쓴다. LH 의 객체 병합은 그대로 못 씀.

### 3. Chronicles 판 저장 · 이어하기
- **무엇**: 진행 중 판(grid · score · 이번 판 별 · continue 횟수 · 테마 id · RNG 상태)을 이동마다 `earthbeyond_run_collection` 한 키로 저장(디바운스는 save-store 가 이미 400ms). 부팅/모드 진입 시 있으면 그 판으로 복귀. 정산 · 게임오버 · 1024 Collapse 시 삭제.
- **왜 EB KPI**: EB 코어루프는 긴 판(시대 완성)이다. iframe 이탈 뒤 돌아온 유저가 판을 잃지 않으면 재방문 → 세션 연장으로 바로 이어진다. 체류 · 재방문 둘 다에 닿는 유일한 구조 변경.
- **비용**: 6~10시간. neon-drift 코어의 RNG 상태 직렬화 여부를 먼저 확인해야 함(안 되면 시드 + 이동 수 재생 방식으로 +3h). Daily 는 리트라이 규칙이 있어 이번 범위에서 제외 권장.
- **위험**: 중. 저장 형식 · 버전 이관, comet(ttl) 같은 타일 부가 상태 누락, CONTINUE 경제와 중복 지급(이어하기로 별을 두 번 받는 경로) 검토 필요.
- **LH/새로**: 개념은 LH K3(판 저장), 코드는 새로(EB 보드 · 경제 구조가 다름).

### 4. 빌드 게이트 이식 (외부 URL · 분석 · 직접 storage · 인라인 문법 · DEV 잔존 · Bridge 태그 1개)
- **무엇**: LH `scripts/playgama-gates.js`(순수 함수, 테스트 있음)를 EB `build-playgama.mjs` 앞단에 이식. EB 사정에 맞춰 Playgama zip 에서는 firebase.js · crazygames.js 를 **no-op 스텁으로 바꿔 넣기**(파일을 빼면 `SG.FB.init()` · `SG.CG` 참조가 터져 부팅 catch 가 SDK_INIT 오류를 띄움). save-store.js · firebase.js 외 직접 localStorage 금지 허용 목록.
- **왜 EB KPI**: 샌드박스 기간 = 지표 보고 자주 패치하는 기간. 깨진 빌드 한 번이 그날 트래픽 전체를 버린다. 그리고 카탈로그 선발(최종 목표) 심사의 "외부 호출 · 분석 도구 금지"를 zip 단에서 증명.
- **비용**: 3~4시간(게이트 이식 + EB 허용 목록 1.5h · 스텁 치환 1h · 테스트 1h).
- **위험**: 낮음(빌드 스크립트만). 단 첫 실행에서 기존 문자열(예: playgama.js v1 URL, dev bar)이 줄줄이 걸릴 것 — 죽은 v1 로더는 이번에 지운다.
- **LH/새로**: LH 에서 가져옴(가장 이식 비용 대비 효과가 확실한 항목).

### 5. Playgama 에서 "내 순위" 줄 + 순위 상승 표시
- **무엇**: playgama.js 에 `playerId()`(=`bridge.player.id`) · `myRank(lbId)` 추가, `_normalizePgEntries` 에서 내 행 표시. 일일 · 엔드리스 게임오버 순위 상자에 상위 5 + 내 줄, 지난 순위를 저장해 올랐으면 한 줄 연출("▲ 12 → 7"). 연출 규격은 AD.
- **왜 EB KPI**: 제안 1 로 순위가 켜져도 "나"가 안 보이면 재도전 이유가 약하다. Daily 3회 리트라이 구조와 맞물려 "한 판 더"(세션 길이)를 만든다.
- **비용**: 4~5시간(래퍼 1h · 게임오버 2곳 배선 2h · 지난 순위 저장 · 연출 자리 1.5h). 제안 1 의존.
- **위험**: 낮음~중. getEntries 반환 상한(EB 집계 주석에 "may be capped")으로 하위권은 내 행이 없을 수 있음 → "순위 밖" 문구 처리 필요. 샌드박스 플레이어 수가 적으면 효과 작음.
- **LH/새로**: 개념 · `myRank` 패턴은 LH v0.1.4, 화면은 EB 기존 lb 상자 재사용(새 화면 없음).

---

## 하지 않기를 권하는 것 (기술 근거)
- 리더보드 3탭 · 명예의 전당 띠 · 엔딩 크레딧 · 큰 점수 연출: EB 에는 이미 랭킹 창(갤러리 + 챕터 3탭)이 있다. 플레이어 수가 확인되기 전(제안 1 이후 실측) 화면을 더 만드는 건 순서가 뒤. 유령 · 달 · 소환진은 EB 코어 규칙 변경이라 neon-drift 기준선 테스트(baseline)를 흔든다 — 기획 렌즈에서 근거가 나오지 않으면 범위 밖.
- 버전: 위 묶음은 v0.9.1(패치)로. `package.json` 0.9.1 ↔ `APP_VERSION 'v0.9.1'` — 현재 빌드 스크립트가 이미 대조한다.

## 넘길 것
- 샌드박스 실측(콘솔 `bridge.leaderboards.type`, 부팅 시간)은 서비스 운영 · PD 확인 필요 — 나는 브라우저를 쓰지 않았다.
- 체크 10 관련: EB 게임오버 CONTINUE 에 `collection_continue` 리워드 광고 경로가 있다(index.html:1206, 3283). "계속 조건 금지" 캐논과의 정합은 서비스 운영 판단으로 넘긴다.
