# Earth & Beyond — 개발노트 (버전별)

> H5 퍼즐 게임. NeonDrift v1 코어 이식. 모드: **Daily**, **Practice**, **Chronicles(스토리/컬렉션)**.
> 플랫폼: Playgama / CrazyGames. 형식: 버전 = 기능 묶음 단위. 최신이 위.

| 버전 | 날짜 | 요약 |
|------|------|------|
| v0.2 | 2026-06-15 | Chronicles 스토리 모드 MVP 착수 — chapter/stepDescriptions 데이터, Daily 테마 랜덤화 |
| v0.1 | 2026-06-15 | 초기 스캐폴드 — NeonDrift 코어 이식, 브랜딩, Era 1~3 테마 정의, WebP 에셋 일괄 크롭 |

---

## v0.2 — Chronicles 스토리 모드 MVP 착수 (2026-06-15)

### 배경
다중 에이전트 교차 논의(3개 설계안 × 상호 비평 × 통합)를 통해 스토리 모드 설계안 확정.
핵심 원칙 3가지:
1. 플레이 리듬을 끊지 않는 서사 삽입 (머지마다 오버레이 X)
2. Era 완성 후에도 돌아올 이유 (Epoch Stamp 수집 메타)
3. `collection.js` / `neon-drift.js` 변경 없음 — UI 레이어만 추가

### 이번 커밋 내용

**`collection-themes.js` — chapter, stepDescriptions 필드 추가**
- 각 테마 객체에 `chapter: { number, title, tagline, completeMessage }` 추가
- `stepDescriptions: [11개 문장]` 배열 추가 (Era 1~3 총 33개 한국어 해설)
- 기존 필드(svgPaths, boardBg 등) 변경 없음

**`index.html` — Daily 모드 테마 랜덤화**
- `startDailyRun()`에서 `renderer.setCollectionTheme(null)` → 날짜 시드 기반 테마 선택으로 교체
- 해금된 테마 중에서만 선택 (`unlockCondition` 없거나 `unlockedThemes`에 포함)
- 같은 날 = 항상 같은 테마 (`date + ':theme'` 시드)
- "검수 통과 시 새롭게 보이는 형태" — Era 2, 3 해금될수록 Daily 테마가 다양해짐

### Phase 1 MVP 진행 예정
- [ ] Chapter Intro 모달 (첫 진입 1회, boardBg 배경 재사용)
- [ ] 장면 획득 토스트 확장 (썸네일 + stepDescriptions 해설 1줄)
- [ ] Progress Bar (보드 상단, acquiredSteps/11)
- [ ] Chapter Complete 모달 + Epoch Stamp 도장 CSS 애니메이션

---

## v0.1 — 초기 스캐폴드 + WebP 에셋 일괄 처리 (2026-06-15)

### NeonDrift → Earth & Beyond 이식
- 게임 코어(`neon-drift.js`, `grid-render.js`, `particles.js` 등) 그대로 이식
- 브랜딩 교체: "EARTH & BEYOND" 타이틀, 딥스페이스+지구 톤 CSS
- localStorage 키 네임스페이스 분리: `earthbeyond_*` (NeonDrift `neondrift_*`와 무관)

### Era 1~3 테마 정의 (`collection-themes.js`)
- Era 1: Primordial Earth (빅뱅~포유류 전야)
- Era 2: Human Civilization (석기~아폴로 11호)
- Era 3: Solar System (수성~태양계 전체)
- 해금 체인: Era 1 → Era 2 → Era 3

### WebP 에셋 일괄 크롭/처리
원본 이미지 → `assets/source/` 보관, 결과물 → `src/themes/<era-id>/`

| 파일 | 처리 내용 |
|------|---------|
| `202606150253_theme1.jpeg` | Era 1 step-01~11 크롭 (3×4 그리드, step-11=포유류/row2,col3) |
| `202606150253_theme2.jpeg` | Era 2 step-01~11 크롭 (4×4 그리드, 달착륙=row2,col2까지) |
| `202606150253_theme3.jpeg` | Era 3 step-01~10 크롭 (3×4 그리드, row2,col2 태양계전체 스킵) |
| `202606150307_step-11.jpeg` | Era 3 step-11 (태양계 전체 — 별도 제공, 256×256 리사이즈) |
| `Era_1__Primordial_Earth_bg_01.jpeg` | Era 1 board-bg(512×512), slot-bg01/02(128×128) |
| `Era_2__Human Civilization_bg_01.jpeg` | Era 2 board-bg(512×512), slot-bg01/02(128×128) |
| `202606150303_bg_01.jpeg` | Era 3 board-bg(512×512), slot-bg01/02(128×128) |

**크롭 스크립트:** `scripts/crop-solar-system.py`, `scripts/crop-era1-era2.py`

### 에셋 현황
- 모든 step WebP: ≤20 KB 충족
- slot 배경: 현재 비활성 (주석 처리) — 전용 에셋 준비 후 활성화 예정
- `collection-themes.js`: Era 1~3 모두 `'webp'`로 전환 완료
