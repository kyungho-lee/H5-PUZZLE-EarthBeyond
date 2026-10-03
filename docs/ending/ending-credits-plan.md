# 엔딩 영상 · 크레딧 — 준비안 (AD 문세라)

_2026-10-04 · 감독 지시: "EB 엔딩을 하이퍼프레임 플러그인을 사용해서 만들어서 크레딧과 함께 보여준다."_
_HyperFrames 는 아직 설치 전이다. 이 문서는 설치 없이 할 수 있는 준비(흐름 파악 · 콘티 · 크레딧 틀 · 재생 방식 · 렌더 준비물)만 담는다. 코드 · 게시 빌드는 건드리지 않았다._
_10/5 게시 ~ 10/12 리포트 동안은 게시 빌드가 동결이라(`docs/win-condition.md`) 게임에 붙이는 일은 v0.9.2 이후 빌드 대상이다._

---

## 1. 지금 EB 의 「엔딩」 — 사실 확인

### 장 구성 (`src/collection-themes.js` · `src/i18n.js`)

| 장 | id | 11단계 (i18n 단계 설명 기준) | 그림 |
|---|---|---|---|
| I Primordial Earth | `primordial-earth` | 성간 먼지 → 원시 원반 → 마그마 바다 → 달 형성 충돌 → 원시 바다 → 최초의 생명 → 산소 대폭발 → 캄브리아 → 공룡 → 소행성 충돌 → 포유류 | `themes/primordial-earth/` |
| II Human Civilization | `human-civilization` | 석기 → 농업 → 고대 문명 → 그리스·로마 → 대항해 → 과학 혁명 → 산업 혁명 → 전기 → 원자력 → 디지털 → 달 착륙 | `themes/human-civilization/` |
| III Solar System | `solar-system` | 수성 → 금성 → 지구 → 화성 → 목성 → 토성 → 천왕성 → 해왕성 → 명왕성 → 태양 → 태양계 전체 | `themes/solar-system/` |

장마다 같은 파일 묶음: `step-01~11.webp`(타일 256×256) · `bg-step-01~11.webp`(단계 배경 512×512) · `board-bg.webp`(768×768) · `slot-bg01/02.webp`(128). 원본은 `assets/source/` 2048×2048 시트(4×4 · 3×4 격자, 잘라 쓴 셀이 약 500px)와 낱장 몇 장(`Era_1…bg_01` · `Era_2…bg_01` · `…step-11.jpeg`) — **장면 한 장당 실제 해상도 상한은 약 512px** 이다. 이것이 영상 해상도를 정한다(5장).

`docs/era-design.md` 의 Era 3 단계표(달 표면 · 화성 로버 · 타이탄 · 오르트 구름…)는 지금 게임(수성 ~ 태양계 전체)과 다르다. 콘티는 **게임 안 i18n · 실제 그림** 을 기준으로 했다. Era 4~7(별의 요람 ~ 딥필드)은 문서상 계획일 뿐 게임에는 없다.

### 엔딩이 뜨는 시점

- **마지막 장(III Solar System)의 마지막 단계(step-11, 최종 크기 블록)를 처음 만든 순간** 한 번. 전 장을 다 깼다는 별도 판정은 없다 — 장은 순서대로만 열리므로(`unlockCondition`) III 을 끝냈다는 것이 곧 전 장 완료다(별로 장을 미리 여는 `forceUnlockTheme` 이 있지만, 엔딩 판정은 "III 의 step-11" 하나뿐이다).
- 흐름(`src/index.html`): 머지 → `SG.Collection.recordMerges` 가 `isComplete` → 보드 비움 → **`showChapterClearFX`**(풀스크린: step-11 배경 · `CHAPTER 3` · `SOLAR SYSTEM` · `CHAPTER COMPLETE` 도장 · 완료 문구 · 폭죽 3연발 · `playClear`, 탭 또는 3.5초 뒤 자동 진행) → `collectionThemeComplete` → 다음 장이 없으므로 **`#ol-theme-complete` 패널**: `ALL CHAPTERS COMPLETE` · "138억 년의 여정을 마쳤습니다" · "N판 만에" · ⭐20 · `NEW MODE UNLOCKED — ENDLESS MODE ∞` · MENU · DOUBLE REWARD(광고).
- 즉 지금의 엔딩 = **3.5초 장 클리어 연출 + 정산 패널**. 영상 · 크레딧 · THE END 는 없다.
- **한 저장에 한 번만 뜬다.** 장이 `completed` 가 되면 `recordMerges` 가 더는 이벤트를 내지 않는다. 다시 볼 입구가 없다 → 4장에서 "다시 보기" 입구를 제안한다.
- 게임오버(`#ol-gameover` 등)는 판이 막혔을 때의 결과 화면이라 엔딩과 관계없다.

**옆에서 발견한 것(기술총괄에게 넘김, 고치지 않음):** `unlockNextTheme` 은 다음 장이 없으면 바로 `null` 을 돌려주기 때문에 **III 을 끝내도 `meta.completedThemes` 에 `solar-system` 이 들어가지 않는다.** 그래서 이 값을 세는 곳(장 완료 수, 테마 메뉴 ✓, 스폰 강도 `progress`)에서 III 은 끝나지 않은 장으로 보인다. 엔딩 "다시 보기" 조건은 `loadTheme('solar-system').status === 'completed'` 로 거는 편이 맞다.

---

## 2. 엔딩 영상 콘티 (60초 · 30fps)

원칙
- **그림은 게임에 이미 있는 파일만** (`src/themes/**`). 새 생성형 이미지 · 외부 사진 · 스톡 없음. 글자 · 빛 · 비네트 · 입자(코드로 그리는 점) 같은 그래픽 요소만 더한다.
- 모든 `bg-step` 그림 가장자리에 **약 4px 어두운 테두리**가 있다(직접 열어 확인: solar 11 · human 11 · primordial 06 등). 화면에 쓸 때 **최소 1.04배 이상 확대**해서 테두리를 밖으로 민다.
- 원본이 512px 라 확대는 **최대 1.18배** 까지(720 화면 기준). 그 이상은 흐려진다.
- **EB 고유 문법 = "장면 위의 타일".** 각 장 마지막 컷에서 그 단계 타일(`step-11.webp`)을 앞 레이어로 띄워 배경과 다른 속도로 움직인다 — 한 장짜리 그림으로 만들 수 있는 유일한 진짜 패럴랙스이고, 플레이어가 머지로 얻은 그 그림이라는 신호다.
- 글자: Rajdhani 700(제목) · Share Tech Mono(장 번호 · 크레딧 직함) — 게임과 같은 폰트(`src/fonts/`). 영어 한 벌(게임도 장 이름은 두 언어 모두 영어).
- 장면 사이는 기본 0.5초 디졸브. 장이 바뀔 때만 0.8초 검정 경유.

| # | 초 | 그림 (`src/themes/…`) | 움직임 | 텍스트 | 음악 · 효과 |
|---|---|---|---|---|---|
| C01 | 0.0–3.0 | `primordial-earth/bg-step-01` 성간 먼지 | 검정에서 페이드 인, 줌 1.04→1.14 | 1.0초부터 `EARTH & BEYOND` (페이드 · 자간 넓어짐) | M1 earth 페이드 인 |
| C02 | 3.0–5.0 | `primordial-earth/board-bg` | 줌 1.04→1.08 | `CHAPTER I` / `PRIMORDIAL EARTH` | |
| C03 | 5.0–7.0 | `primordial-earth/bg-step-03` 마그마 바다 | 줌 인 1.06→1.16 (행성 중심) | — | |
| C04 | 7.0–9.0 | `primordial-earth/bg-step-04` 달 형성 충돌 | 왼→오 팬 + 1.10 | — | |
| C05 | 9.0–11.0 | `primordial-earth/bg-step-06` 최초의 생명 | 아래→위 틸트(빛 줄기 쪽) | — | |
| C06 | 11.0–13.0 | `primordial-earth/bg-step-09` 공룡 | 오→왼 팬 | — | |
| C07 | 13.0–15.5 | `primordial-earth/bg-step-11` 포유류 + 앞 레이어 `step-11.webp` | 배경 줌 1.04→1.10, 타일은 아래에서 떠오르며 다른 속도로 위로 (패럴랙스) | — | 0.8초 검정 경유 · M1→M2 교차 |
| C08 | 15.5–17.5 | `human-civilization/board-bg` | 줌 1.04→1.08 | `CHAPTER II` / `HUMAN CIVILIZATION` | M2 civilization |
| C09 | 17.5–19.5 | `human-civilization/bg-step-01` 동굴 벽화 | 천천히 줌 인 | — | |
| C10 | 19.5–21.5 | `human-civilization/bg-step-03` 피라미드 · 나일 | 왼→오 팬 | — | |
| C11 | 21.5–23.5 | `human-civilization/bg-step-05` 범선 | 줌 인 + 살짝 위로 | — | |
| C12 | 23.5–25.5 | `human-civilization/bg-step-07` 산업 혁명 | 오→왼 팬 | — | |
| C13 | 25.5–28.0 | `human-civilization/bg-step-11` 달 발자국 · 지구 + 앞 레이어 `step-11.webp` | C07 과 같은 패럴랙스 | — | 0.8초 검정 · M2→M3 |
| C14 | 28.0–30.0 | `solar-system/board-bg` ※ | 줌 1.04→1.08 | `CHAPTER III` / `SOLAR SYSTEM` | M3 solar |
| C15 | 30.0–32.0 | `solar-system/bg-step-03` 지구 | 줌 아웃 1.16→1.06 | — | |
| C16 | 32.0–34.0 | `solar-system/bg-step-05` 목성 | 왼→오 팬 (띠 방향) | — | |
| C17 | 34.0–36.0 | `solar-system/bg-step-06` 토성 | 고리 따라 대각 팬 | — | |
| C18 | 36.0–38.0 | `solar-system/bg-step-10` 태양 | 줌 인 + 밝기 살짝 올림 | — | |
| C19 | 38.0–40.5 | `solar-system/bg-step-11` 은하 + 앞 레이어 `step-11.webp` | 패럴랙스 + 아주 느린 회전 2° | — | |
| C20 | 40.5–46.0 | `human-civilization/bg-step-11` (달에서 본 지구) | **줌 아웃 1.18→1.04** — "돌아본다" | 41.0 `Looking back, you see a pale blue dot.` → 43.5 `Your journey through 13.8 billion years is complete.` | M3 줄어듦 |
| C21 | 46.0–49.0 | 검정 + 화면 입자(코드) | 정지, 글자만 | **`THE END`** (Rajdhani 700, 페이드 인 · 1.5초 유지) | `playClear` 류 종소리 1회, BGM 페이드 아웃 |
| C22 | 49.0–58.0 | 33개 타일 모자이크(장마다 11칸 × 3줄, `step-01~11.webp`) 어둡게 35% | 모자이크 아주 느리게 위로 | **크레딧 롤** (3장 틀) | M3 조용히 재진입 |
| C23 | 58.0–60.0 | 모자이크 밝기 100% 로 | 정지 | `THANK YOU FOR PLAYING` | 페이드 아웃 |

※ C14 `solar-system/board-bg.webp` 는 다른 그림과 달리 **실제 천체 사진처럼 보인다**(별 회절 무늬 · 성운 결). 출처를 모르면 영상(=게임 밖으로도 공유될 수 있는 산출물)에 쓰지 않고 `solar-system/bg-step-11`(은하)이나 `bg-step-08` 로 바꾼다. 실사라면 크레딧에 출처 표기가 필요하다(3장 C).

- **문구 출처:** C20 첫 줄은 III 장 완료 문구(`completeMessage`)를 줄인 것, 둘째 줄은 지금 엔딩 패널 문구 그대로. 새로 지은 서사 없음.
- **30초판이 필요하면:** 장마다 C03~C06 중 2컷만 남기고(장당 6초), C20 3초, 크레딧 롤 생략 · THE END + 핵심 크레딧 한 장.
- 그림 선정 이유: 장마다 "탄생/시작 → 전환점 → 장의 마지막 단계" 순서가 화면에서 읽히게 고름. 색이 비슷한 그림이 연달아 붙지 않게(마그마-충돌-바다-숲, 동굴-금빛-청록-주황) 배치했다.

### 음악 큐

- **게임 안 사운드는 파일이 없다.** `src/sound.js` 는 Web Audio 합성기다(머지 효과 · `playClear` · BGM 3종 `earth` / `civilization` / `solar` 시퀀서). 그대로 영상에 넣을 mp3 · ogg 는 없다.
- **재사용은 가능** — 우리 코드이므로 저작권 문제 없음. 방법: 같은 `BGM_THEMES` 음표 데이터를 `OfflineAudioContext` 로 돌려 WAV 로 뽑는 버리는 스크립트(`docs/rnd/` 표시, 기술총괄). 장마다 한 곡 → M1 earth · M2 civilization · M3 solar, 장 전환에 0.8초 교차. THE END 종소리는 `playClear` 를 같은 방식으로 녹음.
- 볼륨: 게임 BGM 기본값(0.38)과 같은 감으로 믹스. 영상 오디오는 AAC(mp4) 한 트랙.

---

## 3. 크레딧 초안 — 항목 구조만

**사람 이름은 모두 비워 둔다. 지어내지 않는다.** 팀 문서의 이름(서지현 · 한도윤 · 문세라 · 강민재 · 임하루 · 윤채원)은 AI 에이전트 역할 이름이라 실제 제작자 크레딧에 올릴지부터 감독 결정이다.

### A. 만든 사람

| 직함 (영상 표기) | 이름 |
|---|---|
| Director | 「감독 확인 필요」 |
| Game Design | 「감독 확인 필요」 |
| Art Direction | 「감독 확인 필요」 |
| Programming | 「감독 확인 필요」 |
| Sound | 「감독 확인 필요」 (합성 사운드 · BGM 은 `sound.js` 자체 제작) |
| Published by / Studio | 「감독 확인 필요」 (ZENGA GAMES 표기 여부) |
| Special Thanks | 「감독 확인 필요」 (없으면 줄 삭제) |

### B. 플랫폼

| 항목 | 표기안 | 확인 |
|---|---|---|
| Platform | Playgama | Playgama 로고 · 상표 사용 규정 확인 전에는 **글자로만** |
| Playgama Bridge SDK | "Powered by Playgama Bridge" | 게임이 CDN 에서 불러 쓰는 플랫폼 SDK. 표기 의무는 확인 안 됨 → 선택 |

### C. 사용 도구 · 라이선스 (저장소에서 실제 확인한 것만)

| 이름 | 어디서 쓰나 | 라이선스 | 표기 필요 |
|---|---|---|---|
| Rajdhani (600 · 700) | 게임 글꼴 `src/fonts/` · 영상 글자 | SIL OFL 1.1 (Google Fonts 배포본) | 영상 크레딧 표기는 **선택**. 단 **zip 에 폰트 파일을 넣어 재배포하므로 OFL 본문(OFL.txt) 동봉이 필요** — 지금 `src/fonts/` 에 라이선스 파일이 없다(기존 빌드에도 해당, 기술총괄 · 서비스 운영에 넘김) |
| Share Tech Mono (400) | 같음 | SIL OFL 1.1 | 같음 |
| NeonDrift v1 엔진 | `neon-drift.js` · `grid-render.js` · `particles.js` | 자체 코드 | 선택 ("Engine: NeonDrift") |
| HyperFrames (HeyGen) | 엔딩 영상 렌더 (설치 예정) | Apache-2.0 (GitHub 표기) | 영상 결과물에는 의무 없음 → **선택**("Ending rendered with HyperFrames") |
| GSAP | HyperFrames 컴포지션 애니메이션 | GreenSock 표준 무료 라이선스(오픈소스 아님) — 정확한 조항은 설치 시 기술총괄 확인 | 영상만 쓰면 **선택**. 게임 안에 js 로 넣으면(4장 B안) 라이선스 고지 필요 |
| FFmpeg | HyperFrames 가 인코딩에 사용 | LGPL/GPL (도구) | 결과 영상에는 의무 없음 → 생략 가능 |
| Playwright | `devDependencies` (검증 스크립트) | Apache-2.0 | 게임에 안 들어감 → 표기 안 함 |
| Firebase SDK | `firebase.js` (CDN) | — | **Playgama zip 에서는 스텁으로 빠짐** → Playgama 판 크레딧에 넣지 않음 |
| CrazyGames SDK | `crazygames.js` (CDN) | — | CrazyGames 판에서만. Playgama 판에는 넣지 않음 |
| 천체 사진 (있다면) | `solar-system/board-bg.webp` 가 실사로 보임 | 출처 모름 | **감독 확인 필요** — 실사면 기관 표기(예: NASA 는 공공 도메인이나 표기 권장, ESO 등은 CC BY 계열이면 표기 의무). 확인 전엔 영상에서 제외 |

### D. 감독 확인 항목

1. 사람 이름 · 직함 묶음(한 사람이 여러 직함이면 한 줄로 합칠지).
2. **AI 도구 사용 표기 여부와 문구.** 사실관계: `docs/store/v0.9.1/copy.md` 의 정직성 원칙 — "타일 · 배경 그림은 이미지 생성 도구로 만든 일러스트를 고르고 잘라 쓴 것". 크레딧이 이와 어긋나는 말("hand-painted" 등)을 하면 안 된다. 선택지: (a) 표기 안 함 (b) "Illustrations: curated & edited from image-generation tools" 처럼 사실만 (c) 개발 도구(코딩 보조 AI)까지 표기. AD 의견: 넣는다면 (b) — 스토어 문구와 같은 말, 큐레이션이 사람 몫이라는 점이 함께 읽힌다. 최종은 감독.
3. 스튜디오 · 퍼블리셔 표기, 저작권 줄(`© 2026 …`).
4. `solar-system/board-bg` 출처.
5. 결말 문구: 게임 소개는 "to the edge of the Universe" 인데 지금 마지막 장은 태양계다. **`THE END`** 그대로 갈지, Era 4+ 계획을 살려 마지막 줄을 `TO BE CONTINUED` 류로 둘지.

---

## 4. 게임 안 재생 방식

### A안 — 렌더된 영상 파일(mp4)을 zip 에 넣어 재생

- 위치: III 장 `showChapterClearFX` 가 끝난 뒤, `#ol-theme-complete` 정산 패널 **앞**에 전체 화면 `<video>` (검정 배경, 정사각 영상 가운데).
- 파일: `src/ending/ending-720.mp4` (로컬 상대 경로 → 체크리스트 #11 외부 리소스 금지 충족, 빌드 게이트의 외부 URL 검사와도 무관). `preload="none"` — **엔딩 때만 받는다**, 첫 로딩 · 게임 시작 시간에 영향 없음. `poster` 는 기존 그림(`solar-system/bg-step-11.webp`).
- **건너뛰기:** 오른쪽 위 `SKIP ›` 상시 표시(체크리스트 #18 닫기), Esc · Enter · Space 도. 끝나거나 건너뛰면 지금 정산 패널로.
- **소리:** 시작 시 `video.muted = SG.Sound.muted`(설정 음소거 따름, #22). 게임 BGM 은 영상 동안 `stopBgm`, 끝나면 복귀. 엔딩은 머지 직후라 사용자 입력 기록이 있지만 3.5초 자동 진행 경로도 있으므로 `play()` 거부 시 **음소거로 재생 + "🔊 TAP FOR SOUND"** 로 폴백. Bridge 일시정지 · 오디오 상태 이벤트(#5)에서 영상도 일시정지 · 음소거.
- **광고:** 영상 앞뒤에 전면 광고 없음. DOUBLE REWARD 는 지금처럼 정산 패널 맨 아래.
- **실패 처리:** `error` 이벤트 · 재생 시작 지연이 길면 바로 정산 패널로(#25 멈춤 없음).
- **다시 보기:** 엔딩이 한 저장에 한 번만 뜨므로 정산 패널과 Gallery(III 탭)에 `▶ ENDING` 버튼. 조건은 `loadTheme('solar-system').status === 'completed'`(1장의 `completedThemes` 문제 때문).
- 용량 상한: **영상 6MB 이하**(지금 zip `earth-and-beyond-0.9.2-ee8718d.zip` 2.2MB). 플랫폼 상한 300MB(#12)와는 거리가 멀고, 기준은 저가 모바일에서 엔딩 진입 대기다. 느린 줌 · 팬 위주라 H.264 압축이 잘 되는 그림이다. 렌더 뒤 실제 크기를 재고 넘으면 `--crf` 를 올린다.

### B안 — HyperFrames 컴포지션 HTML 을 게임 안에서 실시간 재생

- 장점: 그림은 이미 zip 에 있으니 추가 용량은 스크립트뿐, 글자를 i18n(한국어)으로 바꿀 수 있음, 해상도 무관.
- 문제:
  1. **GSAP 를 로컬 파일로 넣어야 한다**(HyperFrames 예시는 jsDelivr CDN — 그대로면 #11 위반). 넣어도 `gsap.min.js` 머리 주석의 URL 이 `scripts/playgama-gates.js` 외부 URL 검사에 걸릴 수 있고, 주석을 지우면 라이선스 고지를 지우는 셈이다.
  2. GSAP 라이선스가 오픈소스가 아니라 조항 확인이 필요하다.
  3. HyperFrames 컴포지션은 렌더러가 프레임을 하나씩 찾아가는(seek) 전제로 짜인다. 게임 안에서 돌리려면 그 런타임을 넣거나 같은 타임라인을 다시 짜야 한다 — "하이퍼프레임으로 만든다" 는 지시의 이점이 사라진다.
  4. 저가 모바일에서 512px 그림 여러 장의 확대 · 디졸브 · 배경 파티클(`bg-fx.js`)이 겹치면 프레임이 떨어질 수 있고, 기기마다 결과가 다르다. 영상은 모두에게 같은 화면이다.

### 권고 — A안 (로컬 mp4, H.264/AAC, 720×720, 6MB 이하, 엔딩 때만 로드)

이유: 외부 리소스 0 · 새 js 라이선스 0 · 빌드 게이트 변경 0, 저가 기기에서도 하드웨어 디코딩으로 같은 화면, 실패해도 기존 정산 패널로 떨어지는 단순한 경로. 같은 렌더를 스토어 · 공유 영상으로도 재사용할 수 있다(5장 변형). 글자는 영어 한 벌로 두 언어 공용(장 이름이 이미 영어 표기).
WebM(VP9)은 구형 iOS Safari 지원이 불확실해 넣지 않는다 — 한 파일만.

---

## 5. HyperFrames 렌더 준비물

### 설치 · 환경 (공식 문서 · GitHub 에서 확인한 것)

- Node.js 22 이상, FFmpeg.
- Claude Code 플러그인: `claude plugin marketplace add heygen-com/hyperframes` → `claude plugin install hyperframes@hyperframes` (또는 스킬: `npx skills add heygen-com/hyperframes`).
- CLI: `npx hyperframes init <폴더>` · `preview` · `lint` · `check` · `render --output <파일>`.
- 렌더 옵션: `--format mp4|mov|webm|gif|png-sequence|hls` · `--fps`(기본 30 또는 `data-fps`) · `--quality draft|standard|high` · `--width/--height` · `--crf` · `--composition <html>`.
- **설치는 감독 승인 뒤.** 아래 경로 · 파일명은 제안이다.

### 작업 위치 (게임 빌드와 분리)

```
docs/ending/                     ← 이 문서
tools/ending-video/              ← HyperFrames 프로젝트 (init 결과, zip 에 안 들어감)
  index.html                     ← 루트 컴포지션 (정사각 720 · 60초)
  compositions/
    chapter-1.html  chapter-2.html  chapter-3.html   ← 장별 하위 컴포지션 (C02–C07 / C08–C13 / C14–C19)
    epilogue.html                ← C20–C21 (돌아보기 · THE END)
    credits.html                 ← C22–C23 (모자이크 · 롤)
  assets/
    img/  → src/themes/**/bg-step-*.webp · board-bg.webp · step-*.webp 를 **복사**(원본 경로 유지한 하위 폴더)
    fonts/ → src/fonts/*.woff2 복사
    audio/ → bgm-earth.wav · bgm-civilization.wav · bgm-solar.wav · clear.wav (sound.js 오프라인 녹음)
  renders/                       ← 결과 (커밋 안 함)
src/ending/ending-720.mp4        ← 게임에 넣는 최종 1개 (A안)
```

- 그림은 **복사본**을 쓰고 게임 파일은 건드리지 않는다. 컴포지션 안 경로는 상대 경로만(외부 URL 0 — 렌더 결정성에도 필요).
- GSAP 는 HyperFrames 예시처럼 CDN 이어도 **렌더 도구 쪽에서만** 쓰는 것이라 게임 zip 과 무관하다. 렌더 PC 의 네트워크가 걱정되면 로컬 사본으로.

### 컴포지션 규칙 (문서 확인)

- 루트: `data-composition-id` · `data-width` · `data-height` · `data-duration`(초) · `data-start="0"`.
- 클립: `class="clip"` · `id` · `data-start`(초, `"clipId + 0.5"` 같은 상대식 가능) · `data-duration` · `data-track-index`(표시용, 겹침 방지 아님).
- 애니메이션: `gsap.timeline({ paused: true })` 하나를 만들어 `window.__timelines["<composition-id>"]` 에 동기 등록.
- 오디오: `<audio>` 에 `data-start` · `data-volume`. 영상 · 오디오에 `play()` · `currentTime` 직접 호출 금지.
- 결정성: `Math.random` 금지(C21 입자는 시드 고정 배열), 시계 시간 · 무한 반복 금지.

### 해상도 · 길이

| 산출물 | 크기 | 길이 | 용도 |
|---|---|---|---|
| **게임 안 마스터** | **720×720 정사각** · 30fps · H.264/AAC | 60초 (30초판 선택) | 세로(보드 폭 360~400 css px × DPR 2)와 가로(높이 720) 모두 여백 없이 맞음. 원본 512px 상한 때문에 이 이상은 흐려짐 |
| 세로 공유 변형 | 1080×1920 | 같음 | 정사각 무대 가운데 + 위아래는 같은 그림을 흐리게 깐 채움. 스토어 · SNS — 공개는 감독 승인 |
| 가로 변형 | 1920×1080 | 같음 | 같은 방식, 좌우 채움 |

변형은 같은 컴포지션을 무대 크기 변수로만 바꿔 렌더한다(새 그림 없음).

### 렌더 전 AD 확인

- 각 컷 실제 프레임 캡처로: 테두리가 안 보이는지 · 확대 흐림 · 글자 가독성(작은 폰에서 크레딧 최소 크기) · 디졸브에서 색이 탁해지지 않는지.
- 크레딧 3장 D 항목이 감독 확인을 마쳤는지 — 「감독 확인 필요」 가 남은 채로 렌더하지 않는다.
- `solar-system/board-bg` 출처 결론.

---

## 넘길 것

- **감독:** 크레딧 이름 · 직함, AI 도구 표기 여부, 스튜디오 표기, `THE END` vs 이어짐 문구, HyperFrames 설치 승인, `solar-system/board-bg` 출처.
- **기술총괄:** `completedThemes` 에 III 이 안 들어가는 문제, `sound.js` BGM 오프라인 녹음 스크립트, A안 재생 셸(SKIP · 음소거 · Bridge 일시정지 · 실패 폴백 · 다시 보기).
- **기술총괄 · 서비스 운영:** `src/fonts/` 에 OFL 라이선스 파일 동봉(기존 빌드에도 해당).

## 감독 확인 (2026-10-04)

- **크레딧 = LH 와 같은 멤버 형식**(LH `src/index.html` `CREDITS` 배열): Game Director `Kevin-H5` · Producer / Tech Lead / Art Director / Game Design & Balance / LiveOps & Engagement / Release & Service Ops / Outside Consultant 는 「(AI agent)」 표기 + 페르소나 이름 · 사운드/음악 항목은 EB 실제 출처대로(EB 는 Web Audio 합성 — 외부 음원이 있으면 그 출처) · `Built with Claude Code · Playgama Bridge` (+ HyperFrames · FFmpeg 렌더 표기는 사용 시) · 마지막 감사 한 줄.
- **`solar-system/board-bg.webp` = AI 생성 그림**(실제 천체 사진 아님) → 영상에 사용 가능. AI 사용은 위 「(AI agent)」 표기와 스토어 문구 정직성 원칙에 맞춰 크레딧에 반영.

## 기술총괄 구현 (2026-10-04 · 한도윤) — v0.9.2 빌드 대상, 게시 · 커밋 없음

**영상** — `tools/ending-video/` HyperFrames 0.8.115 컴포지션(`index.html` 한 장, 720×720 · 60초 · 30fps, C01~C23 콘티 그대로, 그림은 `src/themes` 복사본만, 확대 1.04~1.18). `npm run ending:render` = `prepare.mjs`(그림 · 폰트 · 크레딧 복사) → `record-audio.mjs`(헤드리스 Chromium OfflineAudioContext 로 `sound.js` BGM earth → civilization → solar + `playClear` 를 콘티 시각에 녹음, 외부 음원 0) → HyperFrames 렌더 → FFmpeg H.264 High/yuv420p CRF 27 · AAC 128k · faststart → `src/ending/ending-720.mp4`(5,175,599 바이트, 6MB 넘으면 실패). `-- --share` 로 공유용 1080×1920 · 1920×1080(정사각 무대 + 같은 화면 흐린 채움, `renders/`, 게임 미포함 · 공개는 감독 승인). FFmpeg 가 PATH 에 없으면 `FFMPEG_DIR`. 영상 안 글자는 모두 영문(감독 지시).
- GSAP 는 렌더 도구 안 로컬 사본(`tools/ending-video/vendor/gsap.min.js`, GreenSock 표준 무료 라이선스) — 게임 zip 에는 안 들어간다.
- `THE END` 그대로(3장 D-5 미결정 → 콘티 기본값). 바꾸면 `index.html` 한 줄 + 재렌더.

**크레딧 한 벌** — `src/ending/credits.js`(LH 형식, 감독 확인 반영). 영상 컴포지션과 게임(재생 실패 시 글자 크레딧)이 같은 파일을 쓴다. 고치면 재렌더.

**게임 흐름** — III 장 step-11 첫 완성 → `showChapterClearFX` → 보상 적립 → `#ol-ending`(영상 src 를 이때 붙임) → 끝 · SKIP(늘 보임, Esc/Enter/Space) · 실패 → 끝 화면(「N번째 우주정복자」 + 명예의 전당, 실패 시 글자 크레딧) → CONTINUE → 기존 `ALL CHAPTERS COMPLETE` 패널. 다시 보기: 패널 `▶ WATCH ENDING` · 갤러리 III 탭 `▶ ENDING`(조건 `loadTheme('solar-system').status === 'completed'`). 소리 = 설정 SOUND · 플랫폼 오디오, 자동재생 거부 → 음소거 재생 + `TAP FOR SOUND` → 그래도 거부 → `TAP TO PLAY`. 광고 · Bridge 일시정지 · 탭 숨김 = 영상 일시정지, 영상 중 게임 BGM 정지 후 복귀. 8초 안에 시작 못 하면 실패 처리(멈춤 없음). dev: 개발 바 `ENDING`.
- 계측(Bridge analytics): `ending_first_view` · `ending_start` · `ending_skip`(at_sec) · `ending_complete` · `ending_failed`.

**버그 수정** — `unlockNextTheme` 이 마지막 장에서도 `completedThemes` 에 기록. 옛 저장은 부팅 때 `syncCompletedThemes` 로 복구(장 상태 completed 인데 목록에 없는 장). 테스트 `test/collection.complete.test.js`.

**폰트 OFL** — `src/fonts/OFL-Rajdhani.txt` · `OFL-ShareTechMono.txt`(Google Fonts 배포본 원문). 빌드 게이트: 폰트를 넣으면 OFL 본문 필수, 라이선스 본문 URL 은 검사 제외, 영상은 `.mp4` 만 · 6MB 이하.

### 명예의 전당 「N번째 우주정복자」 (감독 추가 지시)

- 값 = **처음 엔딩을 본 순간의 도착 시각** = 2026-01-01 00:00 UTC 부터 지난 초(정수, 1 이상). 오름차순 순위 = 도착 순서. 저장 키 `earthbeyond_hof`(Bridge 저장 동기화 대상) — 처음 한 번 정하고, 다시 보기 · 재플레이로 바뀌지 않는다. 전송은 `lbSyncNow` 가 성공할 때까지 재시도, 성공 뒤 다시 보내지 않음. DEV · 치트 런은 기록 안 함. 로직 `src/hall-of-fame.js`, 테스트 `test/hall-of-fame.test.js`.
- 화면: 엔딩 끝 화면(「👑 You are the Nth Universe Conqueror!」 / 「👑 당신은 N번째 우주정복자!」 + 상위 5 + 내 줄, 표시 값은 도착 날짜), 로비 띠(막지 않음, 탭 → 명예의 전당), 랭킹 창 `👑` 탭(엔딩 전 🔒). 리더보드가 `in_game` 이 아니거나 불러오기 실패면 숨김, 어떤 버튼도 네트워크를 기다리지 않는다.
- **알려진 한계:** 같은 초에 끝낸 두 사람은 같은 값(동점 순서는 리더보드가 정함). 클라이언트 시계라 시계를 과거로 돌리면 앞자리에 설 수 있다(서버 시각을 받을 수단이 Bridge 에 없다). `getEntries` 가 상위 N 명만 주면 띠의 "N명이 정복" 은 그 수에서 멈추고, 목록 밖 내 순위는 하한값이다.
- **PD 에게 — 캐비닛 리더보드 생성(감독 승인 뒤, 기술총괄은 만들지 않았다).** `playgama-bridge-config.json` 에는 이미 `{ "id": "hall_of_fame" }` 을 넣었다. 캐비닛 `create_leaderboard`: `applicationId = cmqf9ib9y009rlr0hzzxkr4hw` · `id = hall_of_fame` · `name = Hall of Fame` · `type = numeric` · `scoreOrder = asc`(적을수록 위 — `ch1_clear`~`ch3_clear` 와 같은 방식, 목록 조회로 asc 지원 확인) · `decimals = 0`. 만들기 전까지는 전송이 실패해 대기로 남고(다음 동기화에 재시도), 화면은 숨김.
