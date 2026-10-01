# CONTINUE — A라운드 · 서비스 운영 · 준수(강민재) · 2026-10-01

_근거: 캐비닛 MCP 읽기 도구(`get_game_checklist` · `get_bridge_sdk_docs api/advertisement/rewarded` · `list_moderation_comments` 조직 앱 3개 — EB · NeonDrift · samegame), wiki `game-requirements/advertising-requirements`(WebFetch). 쓰기 · 브라우저 · src 수정은 하지 않았다._

## 1. 규정 원문 (세 곳)

| 출처 | 원문 |
|---|---|
| live 체크리스트 #10 | "Rewarded ads are opt-in: a clear button that says an ad is coming and what it gives; the reward is an extra bonus rather than a condition for continuing; never offer "+1 life" every time the player loses one." |
| wiki 광고 요구사항 (심사 기준 문서) | "It is forbidden to offer reward-based ads to 'gain +1 life' every time users lose a life." / "The reward for watching a rewarded video is an additional bonus (e.g., but not limited to: boosters, additional actions, level skip, bonus levels, and other similar mechanics) to the main game and **should not affect the ability to continue the gameplay**." / "Ads are shown during logical pauses: between levels, after the game ends …" (빈도 규정은 없음) |
| Bridge SDK rewarded 문서 | 쓰임새 예시: "an extra life, double coins, a hint, or a skip", "The player can use a small boost (**revive**, extra hint, skip a hard level)." |

**해석**
- SDK 문서는 revive 를 일반적인 쓰임새로 소개한다. 반면 **카탈로그 심사가 따르는 문서는 wiki 요구사항**이다. 두 문서가 어긋나므로 심사 기준(wiki)을 따른다.
- 금지 대상은 「광고 = 이어하기 수단」이다. 「매번」은 판정을 강화하는 조건일 뿐이다. "should not affect the ability to continue" 는 횟수와 관계없이 이어하기를 광고에 묶는 것 자체를 겨냥한다.
- 허용되는 쪽은 「추가 보너스」다(부스터 · 추가 행동 · 보너스 레벨). EB 에 이미 있는 ⭐×2 부스트 · 챕터 ×2 · Endless ×2 가 이 범주의 모범 사례다.
- **EB 구조상 특수성**: Chronicles 판은 **언제나 게임오버로 끝난다**(장 클리어를 빼면 패배 외에 끝나는 길이 없음). 따라서 「판당 1회 광고 CONTINUE」는 곧 「질 때마다 광고 부활」과 같다.

## 2. 심사자 문구 (조직 이력 기준)
- 조직 앱 3개(EB · NeonDrift · samegame)의 반려 코멘트는 모두 **템플릿 문단 + wiki 요구사항 링크** 형식이다(예: AI 반려 문단 + `…/content-requirements`). 광고 위반으로 반려된 이력은 없다.
- 따라서 광고 위반이 걸리면 이렇게 올 가능성이 높다(**추정**): advertising-requirements 문장을 그대로 인용한 문단("It is forbidden to offer reward-based ads to 'gain +1 life' every time users lose a life" 또는 "should not affect the ability to continue the gameplay") + 링크 + 반려 또는 POSTPONED.
- 운영상 비용: 반려 1회 = 재제출 1사이클. 샌드박스 지표가 좋아 선발 후보가 되더라도 **사람 심사에서 되돌아온다.** EB 는 이미 AI 사유 이력이 있어 사유가 하나 더 붙는 셈이다.

## 3. 선택지별 #10 위험 등급 (샌드박스 → 카탈로그 선발 기준)

| 안 | 등급 | 근거 | 가능해지는 측정 |
|---|---|---|---|
| **B1 광고 CONTINUE 판당 1회** | **높음 — 금지 권고** | 판은 언제나 패배로 끝나므로 = 질 때마다 광고 부활. 금지 문장 두 개에 그대로 들어맞는다. 무료 PLAY AGAIN 이 옆에 있어도 "continue 를 광고에 묶음"은 해소되지 않는다 | Bridge 가 광고 이벤트를 자동 수집(analytics 문서). 우리는 `continue_used{method:'ad'}` 만 더 보낼 수 있다 |
| **B2 광고 CONTINUE 세션당 N회 / 쿨다운** | **중간~높음** | 「매번」은 피하지만, 「보상이 계속 가능 여부에 영향」 조항이 남는다. 버튼 문구 "CONTINUE (AD)" 자체가 심사자 눈에 띄는 패턴이다. 횟수 · 쿨다운은 심사자가 화면에서 확인하기 어렵다(한 판만 보면 "지면 광고 부활"로 보인다) | B1 과 같다 + 쿨다운 때문에 표본이 줄어든다 |
| **B3 광고로 「추가 행동」 부스터**(예: 판 중 언제든 1회 "작은 블록 정리", 게임오버 화면이 아닌 HUD 에서) | **낮음~중간** | wiki 허용 예시 "boosters, additional actions" 에 해당한다. 단, **게임오버 화면에만 뜨면 부활의 위장**으로 읽힌다 → 판 중 사용 · 판당 1회 · 게임오버와 분리가 조건 | `booster_used{when}` · 판 길이 변화 |
| **A 별 CONTINUE**(현행: 5⭐ · 판당 1회) | **없음(광고 규정 대상 아님)** | 게임 안 재화다. 별은 플레이로 번다(IAP 없음) | `continue_used{method:'stars'}` · 별 잔액 분포 |
| **A′ 광고 → 별 → CONTINUE**(⭐×2 정산 광고로 번 별을 CONTINUE 에 씀) | **낮음** | 광고가 주는 것은 「별 2배」(순수 보너스)다. 이어하기는 별로 산다. 이미 있는 ⭐×2 구조 그대로이고, 게임오버 화면에 광고 = 이어하기가 함께 보이지 않으면 안전하다 | 별 출처(플레이/광고) 구분 이벤트 |
| **C 무료 CONTINUE 조건부**(첫 방문 첫 게임오버 1회 등) | **없음** | 광고가 없다. 다만 「매번 무료」는 난이도 의미를 잃는다(디자인 sim: 1회만으로도 74~81%) | `continue_used{method:'free'}` → 첫 세션 이탈과 비교 |
| **D 진행 보존**(장면 · 지층 단계 · 장 안 체크포인트 유지) | **없음** | 규정 무관 | 이미 있는 `gallery_total` 분포 · `ch1_clear` 판 수 |
| **E 게임오버 화면**(So close · 다음 목표 · 무료 PLAY AGAIN 을 가장 크게) | **없음** | 규정 무관. 오히려 #10 의 "보너스로만"을 화면에서 보여 준다 | `run_ended{scenes, best, reason}` |
| **F 연속 실패 보정** | **없음** | 규정 무관 | `run_ended{assist:true}` |

## 4. UX · 인지 근거 (운영과 닿는 것만)
- **「처음부터」의 실체를 줄이는 것이 먼저다(D · E).** Chronicles 의 장면(단계)은 판을 넘어 유지된다(디자인 r1/r2). 그러니 플레이어가 잃는 것은 「보드」이지 「진행」이 아니다. 게임오버 화면이 그 사실을 말하지 않으면 손실 회피가 실제 손실보다 크게 느껴진다. "장면 7/11 유지 · 다음 장면까지 256" 한 줄이면 진행 착시(endowed progress)와 목표 경사 효과를 그대로 쓸 수 있다. 비용이 거의 없는 안이다.
- **첫 방문자 별 0 문제**: 현행 A 는 첫 게임오버에서 버튼이 숨는다. 가장 이탈이 큰 순간에 선택지가 0개라는 뜻이다. 해법은 광고가 아니라 **시작 별(진행 착시)**: 첫 장면 획득이나 첫 판 정산에서 별 5개 이상을 보장하면, 첫 CONTINUE 는 「무료」가 아니라 「번 별로 산 것」이 된다. #10 위험 0, 난이도 의미도 유지된다.

## 5. 추천 조합 (운영 · 준수)
**D + E + A(5⭐ · 판당 1회) + 시작 별 보장 + A′(광고는 ⭐×2 정산에만) — 게임오버 화면에 광고 CONTINUE 없음. B1 · B2 는 넣지 않는다.**
- 예상 효과: 첫 게임오버에서도 이어하기 선택지가 생긴다(별 0 문제 해소). 이어하기 1회 클리어율은 디자인 sim 74~81%로, 첫 장 완주까지 시간이 확보된다. 정확한 엔딩 도달률은 디자인 sim 으로 확정한다.
- #10 위험: **없음 ~ 낮음**(A′ 에서 게임오버 화면에 「광고로 별 → 바로 이어하기」 동선이 생기지 않게 화면 분리만 지키면).
- 비용: 시작 별 보장 0.5h · 게임오버 문구(D/E) 1~2h · 이벤트 `continue_offered/used{method}` · `run_ended` 1h(v0.9.1 `track()` 래퍼 재사용).
- 측정: method 별 CONTINUE 사용률, `run_ended` 장면 분포, `ch1_clear` 판 수, Bridge 자동 `gameplay_30s/60s`(볼 화면은 미확인).
- 굳이 광고를 더 쓰려면 **B3**(판 중 HUD 부스터, 판당 1회, 게임오버와 분리)까지만 둔다. 이것은 v0.9.2 이후, 측정 창 데이터를 보고 정한다.
