# Earth & Beyond — store copy v0.9.1

_AD 문세라 · 2026-10-01 · 근거: `docs/sandbox-kpi-debate/pd-final-spec.md` §2-5. 캐비닛 반영(`update_application_form` · 커버 · 스크린샷)은 감독 승인 뒤 운영이 한다._

**정직성 원칙**: 타일 · 배경 그림은 이미지 생성 도구로 만든 일러스트를 고르고 잘라 쓴 것이다. 그래서 설명에서 "AI 가 아니다"라고 말하지 않고, 옛 설명의 "NASA · ESA … photography 에서 따왔다" 같은 표현도 쓰지 않는다. 대신 **손으로 설계한 것**(시대 순서 · 장면 선정 · 규칙 · 지층 · 연대기)만 사실대로 적는다.

**조건부 문장**: `[STRATA]` 표시 문장은 지층 최소판이 10/4 18:00 게이트를 통과해 출고될 때만 넣는다. 대체안(Endless 해금 128)으로 가면 `[FALLBACK]` 문장으로 바꾼다.

---

## 1. Short description (~150 chars)

Merge tiles to move time forward — from stardust to the Moon landing. 33 scenes, ordered by hand into a timeline of Earth, people and planets.

## 2. Full description

Earth & Beyond is a slide-and-merge puzzle where every merge moves time forward. Start with a speck of interstellar dust; merge your way through a molten Earth, the first oceans and the first life — and keep going, beyond Earth.

**Chronicles — an era chronicle.** Three eras, eleven scenes each: Primordial Earth, Human Civilization and the Solar System. Each tile value is a moment in a real timeline, and we chose and ordered every scene so the board tells that story in sequence. When you reach a new scene, it is named on the board ("Magma Ocean Earth", "Birth of the Oceans") and the game keeps going — no pause, no pop-up wall.

[STRATA] **Strata.** When you reach a new high scene, the oldest small tiles settle into the past as fossil layers and clear the board. Time moves on, and the board makes room for the next age — that is how a full era becomes reachable in a single run.

[FALLBACK] **Endless.** Reach the 128 scene once to open Endless mode: the same eras with no finish line.

**Daily Challenge.** One seeded board a day, the same for everyone. Earn stars at tile milestones and post your best score to the leaderboard. Comets cross the board now and then — merge one within 6 moves for ×3 points — and one Observatory cell doubles any merge that lands on it.

**What we designed by hand:** the order of all 33 scenes and their one-line histories, the step-per-merge timeline, [STRATA] the strata rule, the comet and observatory rules, the daily seeding, and every line of the game's code. The scene pictures are illustrations made with image tools and then selected, cropped and sequenced by us.

## 3. How to play

**Goal:** merge matching tiles to move forward in time and collect every scene of an era.

**Controls**
- Swipe, or use the arrow keys, to slide every tile at once.
- Two tiles with the same value merge into one (1 + 1 → 2, 2 + 2 → 4 …).
- A new tile appears after every move. The run ends when no move is left.

**Chronicles**
- Each new tile value reveals the next scene of the era — its name appears above the board.
- Eleven scenes per era; the eleventh (the 1024 tile) completes the era and opens the next one.
- [STRATA] Reaching a new top scene settles the oldest small tiles into fossil strata and frees space.
- Ran out of moves? Spend stars to CONTINUE once per run, or start a new run — your collection is kept.

**Daily Challenge**
- Everyone gets the same board today. Stars at 64 / 128 / 256 / 512.
- PLAY AGAIN is free; your best score of the day goes to the leaderboard.
- ☄️ Comet: merge it before its countdown ends for ×3. 🔭 Observatory cell: ×2 for merges that land on it.

**Tip:** keep your biggest tile in a corner and build toward it.

## 4. Developer comment (to moderators — replaces the June comment)

> This sandbox build (v0.9.1) is not a resubmission yet. Since the June review we changed how the game plays, not only how it looks: new scenes are revealed on the board without stopping play, the Chronicles rules [STRATA] now include a strata mechanic that clears the oldest tiles when a new age is reached, and the continue-by-ad path was removed. The scene art is still illustration made with image tools; the era order, scene selection, rules and code are ours. We are measuring sandbox play before we ask for review again.

(옛 코멘트의 "(new in 1.2)" · 1.2.0 번호 · Firebase/외부 리더보드 언급은 모두 뺀다. 버전은 v0.9.1 하나만.)

## 5. Share post (replaces the "Made with AI. … Fine-tuned by me." template)

공유 글 기본 템플릿(`get_sandbox_share`)은 `#PlaygamaMCP` 를 문구 안과 해시태그 양쪽에 넣는다. SHARE 트래픽 조건은 "공개 게시글 링크"뿐으로 확인됐고(LH `docs/ops/launch-readiness.md`), 해시태그 필수 여부는 문서에 없다 → **템플릿의 해시태그 줄(`#playgama #PlaygamaMCP …`)은 그대로 남기고**, 앞 문장만 바꾼다. 링크는 게시 뒤 `get_sandbox_share` 가 준 것을 그대로 쓴다(직접 만들지 않음).

**X / Threads (≤280자)**
> Every merge moves time forward. Start as stardust, end on the Moon — 33 scenes we put in order, one tile at a time. Earth & Beyond → {link}
> #playgama #PlaygamaMCP #webdev #gamedev

**Facebook / LinkedIn**
> I've been building Earth & Beyond, a merge puzzle where each merge is a step through history: interstellar dust → molten Earth → the first oceans → … → the Moon landing. The scene order, the rules and the new on-board reveals are hand-designed; the newest build adds [STRATA: strata, so a full era can be finished in one run]. Free in the browser: {link}
> #playgama #PlaygamaMCP #webdev #gamedev

**Reddit (r/playgamabridge) 제목**: `Earth & Beyond — a merge puzzle where every merge moves time forward (feedback welcome)`

## 6. Screenshot shot list (5장 — v0.9.1 빌드가 준비되면 실제 화면에서 캡처)

규격: 세로 1080×1920 (360×640 뷰포트 × DPR 3) 기본. 캐비닛이 가로를 요구하면 1920×1080 (1280×720 × 1.5) 로 같은 5장. 개발 바(`?dev=1`) · 토스트 · 광고 자리 없는 상태. 캡처 도구: `scripts/make-screenshots.mjs` 확장(기술 · 운영과 협의).

| # | 화면 | 보여 줄 것 | 연출 상태 |
|---|---|---|---|
| 1 | Chronicles 1장 보드 — **발견 배너 순간** | 칸 팝 + 시대 색 고리 + `ERA Ⅰ · STEP 05 / 11 — BIRTH OF THE OCEANS` 배너, 아래 나레이션 바 | 배너 유지 구간(0.3~2.2s)에서 멈춤 캡처 |
| 2 | **Daily 보드** — 혜성 · 관측소 | 혜성 카운트다운 칸 + 관측소 칸이 함께 보이는 판(혜성 · 관측소는 Daily · Endless 전용, Chronicles 엔 없음) | 일반 플레이 |
| 3 | [STRATA] **지층 정리 순간** / [FALLBACK] Endless 보드 | 오래된 작은 칸이 화석으로 정리되는 프레임 | 정리 연출 중간 |
| 4 | **챕터 클리어** (step 11) | `showChapterClearFX` 금빛 연출 + 장면 이름 | 파티클 정점 |
| 5 | **갤러리** — Primordial Earth 11칸 | 연대기 순서로 놓인 장면 카드, 일부 "?" | 정적 |

제외: 시작 메뉴(어두운 3분할 콜라주 — 커버와 언어가 다름), 광고 · 결제 화면, Daily 게임오버.

## 7. 커버 (참고)

`docs/store/v0.9.1/cover-{square,portrait,landscape}.png` — `node scripts/make-store-covers.mjs` 로 다시 만든다(구성 페이지 `docs/store/cover-keyart.html`). 카드 = 기존 타일 4장(Primordial step 1 · 3 · 5, Human Civilization step 11), 배지 숫자는 실제 게임 값(1 · 4 · 16 · 1024). 배경 별밭 · 로고 · 테두리는 코드. `check-*.png` 는 축소 검수용이라 업로드하지 않는다.
