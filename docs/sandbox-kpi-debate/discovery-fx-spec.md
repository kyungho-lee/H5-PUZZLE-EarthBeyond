# 막지 않는 발견 연출 — v0.9.1 시각 규격 (AD 문세라 · 2026-10-01)

_근거: `pd-final-spec.md` §2-2 (감독 승인). 구현: 기술 한도윤, 목표 **~2h**. 새 이미지 · 새 폰트 · 새 파일 없음 — 있는 부품(`renderer.pops/rings/particles`, `#chronicles-narration`, `SG.Sound.playClear`, Rajdhani · Share Tech Mono, `:root` 토큰)만 쓴다._

## 0. 무엇이 바뀌나 (한 줄)

Chronicles 에서 **step 2~10** 을 새로 얻으면 `showUnlockPopup`(모달 + `gameRunning=false`)을 띄우지 않는다. 대신 **그 칸이 크게 튀고 시대 색 고리가 퍼지며, 보드 위쪽에 장면 이름 배너가 2.2초** 떠 있다 사라진다. 입력은 한 번도 막지 않는다.

| step | 연출 | 입력 |
|---|---|---|
| **1 (첫 공개)** | 지금 모달 유지(문구만 §4 로 변경) | 모달 동안 정지 |
| **2~10** | §1~3 비차단 발견 | **막지 않음** |
| **11** | 지금 모달 + `showChapterClearFX` 유지(문구만 §4) | 정지 |

> PD 스펙 문구는 "1~6단계"다. 7~10 도 같은 비차단으로 처리할 것을 권한다(모달 기준은 "1 과 11 만"이 PD 스펙 본문과 같다). 7~10 을 모달로 남기면 지층 이후 클라이맥스 구간에서 판이 다시 끊긴다.

## 1. 칸 팝 + 시대 색 고리 (캔버스, `grid-render.js` 에 있는 부품)

새 step 을 만든 머지 칸 `m.at` 에서 (`rec.newSteps[i].size` 와 같은 크기의 merge 를 `result.merges` 에서 찾음):

- **팝**: `pops.set(key, { life: 380, max: 380, scale: 1.32 })` — 지금 `POP_MS 140` 은 일반 머지용으로 두고, 발견 팝은 **자기 `max` 를 들고** 다닌다(`prog = 1 - life/(p.max||POP_MS)`, 시작 scale 은 `p.scale0||1.25`). 곡선: 0→120ms 1.0→1.32 (easeOut), 120→380ms 1.32→1.0 (easeOut, 살짝 0.98 언더슈트 없어도 됨).
- **고리 2개**: `new SG.Ring(cx, cy, cell*0.45, cell*1.6, ERA.ring, 520)` 즉시 + `new SG.Ring(cx, cy, cell*0.45, cell*2.4, ERA.ring, 700)` 120ms 뒤.
- **파티클**: `particles.emit(cx, cy, {fill:ERA.fill, glow:ERA.ring}, 18)` — 지금 모달판 40개보다 적게(보드 위라 소음 방지).
- **플래시 없음** (`renderer.flash` 쓰지 않음 — 화면 전체 번쩍임은 비차단 흐름에선 오조작 유발).
- 사운드: `SG.Sound.playClear()` 그대로 1회.

### 시대 색 (ERA)
| 테마 id | 시대 | `ERA.ring` (고리 · 배너 선) | `ERA.fill` |
|---|---|---|---|
| `primordial-earth` | Ⅰ 용암 | `#ffb347` | `#f7971e` (`--c2`) |
| `human-civilization` | Ⅱ 청동 | `#e8c27a` | `#b8862f` |
| `solar-system` | Ⅲ 별빛 | `#7aacff` | `#3a7bd5` (`--accent`) |
그 외 테마 → `#7aacff` / `--accent`.

## 2. 장면 이름 · 연대 배너 (DOM 1개 새 요소, 보드 위 오버레이)

- **위치**: `#gameCanvas` 를 감싼 부모 안 `position:absolute; left:50%; top: 보드 위쪽 끝 + 8px; transform:translateX(-50%)`. 보드 첫 줄을 일부 덮어도 된다 — `pointer-events:none` 이라 스와이프 · 탭이 그대로 통과. 폭 `min(88%, 340px)`. HUD(점수 · 버튼)는 덮지 않는다.
- **구성** (가운데 정렬, 2줄):
  1. 1줄 — `ERA Ⅰ · STEP 05 / 11` — Share Tech Mono 400, 10px, letter-spacing 3px, 색 `ERA.ring`
  2. 2줄 — 장면 이름 대문자 `BIRTH OF THE OCEANS` — Rajdhani 700, 20px (360폭 기준; `clamp(17px, 5.2vw, 22px)`), letter-spacing 1.5px, 색 `--text #dde8f6`, `text-shadow: 0 0 10px <ERA.ring>99, 0 2px 4px #000c`
  - 이름 = `stepDescriptions[step-1]` 의 `' — '` 앞부분(이미 `chroniclesShowStepToast` 가 같은 분리를 함). 연대 · 본문은 배너에 **넣지 않는다** — 본문은 아래 `#chronicles-narration` 바가 이미 보여 준다(그대로 호출).
- **판**: `background: linear-gradient(90deg, transparent, rgba(5,8,16,.78) 18%, rgba(5,8,16,.78) 82%, transparent); padding: 6px 18px 8px;` 위 · 아래에 `1px` 선 `linear-gradient(90deg, transparent, ERA.ring, transparent)`. 둥근 모서리 · 블러 없음.
- **타이밍** (팝 시작 = 0):
  - 0–80ms 대기 → 80–300ms 등장: opacity 0→1, `translateY(-6px)→0`, `scale(.96)→1`, ease-out
  - 300–2200ms 유지
  - 2200–2500ms 퇴장: opacity 1→0, `translateY(0)→-4px`
  - **다음 수를 두면** 유지 구간을 최대 900ms 로 줄인다(이미 1.0s 이상 보였으면 바로 퇴장 시작). 플레이어가 움직이면 배너는 양보한다.
- **연속 발견**(한 수에 2단계 이상, 또는 배너 중 새 발견): 큐로 처리. 앞 배너를 즉시 퇴장(200ms)시키고 다음을 등장 — 간격 최소 600ms. 팝 · 고리는 큐 없이 그 자리에서 즉시.

## 3. 같이 바뀌는 것

- `collectionOnMerge` 의 새 step 분기: step 1 · 11 만 `await showUnlockPopup`. 그 외는 `gameRunning` 을 끄지 않고 §1·§2 호출 → `chroniclesShowStepToast(theme, step)`(나레이션 바 + 배경 교체) 그대로.
- 배경 교체(`setStepBg`)는 지금처럼 페이드. 배경 가독성 수리(§2-6 여유분)는 이 규격 밖.
- 장면 공개 직후 광고 제외(PD §2-3): 비차단 발견도 "장면 공개"로 친다 → 발견 후 3초 안에는 전면광고를 띄우지 않는다.

## 4. 남는 모달 2개의 문구 (step 1 · 11)

- `unlock-chain-title`: `ERA Ⅰ · STEP 01 / 11` (지금 `PRIMORDIAL EARTH — STEP 1 / 11`)
- `unlock-theme-label`: `MERGE × 2 UNLOCKED!` → **장면 이름** `INTERSTELLAR DUST` (Rajdhani 700 그대로)
- 오버레이 어둠 `.88` → `.6`, `backdrop-filter` 제거 — 이 두 모달에서만(`#ol-unlock` 한정 규칙).

## 5. 동작 줄이기 (`prefers-reduced-motion: reduce`)

`start-sky.js` 와 같은 `matchMedia` 판정을 재사용.
- 팝: scale 최대 1.32 → **1.08**, 380ms → 200ms.
- 고리 · 파티클: **끔**. 대신 칸에 `ERA.ring` 2px 테두리를 600ms 동안 그렸다가 끔(정지 강조).
- 배너: 이동 · 스케일 없이 **opacity 만** 150ms in / 150ms out, 유지 2.2s 동일.
- 모달(1 · 11): 기존 FX 의 ring/particles/flash 생략, 모달은 그대로.

## 6. 승인 기준 (AD 가 캡처로 확인 — 360×640, 400×800, 1280×720)

1. 발견 순간 다음 스와이프가 **씹히지 않는다**(배너 위에서 시작한 스와이프 포함).
2. 배너 이름이 360폭에서 한 줄 — 가장 긴 이름(`MOON-FORMING IMPACT`, `INDUSTRIAL REVOLUTION` 류) 20px 에서 넘치면 `clamp` 하한 17px 까지 줄고, 그래도 넘치면 2줄 허용.
3. 고리가 이웃 타일 숫자 배지를 0.5초 넘게 가리지 않는다.
4. 한 수에 2단계 발견 시 배너가 겹치지 않는다.
5. 동작 줄이기 켬: 고리 · 파티클 0, 배너 이동 0.

## 7. 구현 시간 가늠

분기 + 큐 0.5h · 배너 DOM/CSS 0.5h · 발견 팝(가변 life) + 고리 0.4h · 모달 문구 · 어둠 0.2h · 동작 줄이기 0.2h · 확인 0.2h ≈ **2h**.
