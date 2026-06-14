# Earth & Beyond — 이어서 시작하기

> 이 파일을 먼저 읽고 작업을 시작하세요.  
> 현재 상태, 다음 할 일, 주요 파일 위치를 한 곳에 정리했습니다.

---

## 현재 상태 (2026-06-15 기준)

### 완료된 것

| 항목 | 상태 |
|------|------|
| 게임 엔진 이식 | ✅ NeonDrift 코어 전체 (neon-drift.js, grid-render.js 등) |
| 브랜딩 적용 | ✅ "EARTH & BEYOND" 타이틀, 딥스페이스+지구 톤 CSS |
| 컬렉션 테마 3개 정의 | ✅ Era 1~3 (`collection-themes.js`) |
| Placeholder SVG | ✅ 33개 (시대별 11단계 × 3) |
| localStorage 분리 | ✅ `earthbeyond_*` 키 (NeonDrift `neondrift_*`와 무관) |
| 개발 문서 | ✅ concept.md, era-design.md, asset-guide.md |
| 스크립트 | ✅ make-cover, make-screenshots, visual-check 등 |
| GitHub 레포 | ✅ https://github.com/kyungho-lee/H5-PUZZLE-EarthBeyond |
| 로컬 서버 | ✅ `cd src && python -m http.server 8081` → http://localhost:8081 |

### 아직 안 된 것 (다음 작업)

| 우선순위 | 항목 | 비고 |
|---------|------|------|
| 🔴 높음 | 정식 WebP 에셋 수령 후 themes/ 교체 | `docs/asset-guide.md` 참조 |
| 🔴 높음 | `firebase-config.js` 실제 값 입력 | `firebase-config.example.js` 참조 |
| 🔴 높음 | `playgama-bridge-config.json` 리더보드 ID 입력 | Playgama 대시보드에서 발급 |
| 🟡 중간 | Era 4~7 테마 설계 및 등록 | `docs/era-design.md` 참조 |
| 🟡 중간 | 보드/슬롯 배경 스킨 추가 | `board-bg.webp`, `slot-bg01/02.webp` |
| 🟢 낮음 | Playgama 제출용 커버/스크린샷 생성 | `node scripts/make-cover.mjs` |
| 🟢 낮음 | 게임 설명 텍스트 (영문) 작성 | `docs/playgama-submission.md` 참조 |

---

## 바로 시작하는 방법

```bash
# 1. 로컬 서버 실행
cd C:\Users\lkh08\H5-games\H5-PUZZLE-EarthBeyond\src
python -m http.server 8081

# 2. 브라우저에서 열기
http://localhost:8081

# 3. DEV 모드 (테마 선택, 강제 해금)
http://localhost:8081?dev=1
```

---

## 핵심 파일 지도

### 수정할 일이 많은 파일

| 파일 | 언제 수정 |
|------|---------|
| `src/collection-themes.js` | 새 Era 추가, WebP 전환 시 `ext: 'webp'` |
| `src/palette.js` | 색상 조정 (타일 6색, 크기별 팔레트) |
| `src/index.html` | UI 텍스트, 게임 로직, 모드 동작 수정 |
| `src/firebase-config.js` | Firebase 프로젝트 키 (`.gitignore`로 제외됨) |
| `src/playgama-bridge-config.json` | 광고 placement ID, 리더보드 ID |

### 건드리지 않아도 되는 파일

| 파일 | 이유 |
|------|------|
| `src/neon-drift.js` | 게임 코어 — 안정 완성 |
| `src/grid-render.js` | Canvas 렌더러 — 안정 완성 |
| `src/particles.js`, `src/star-fly.js` | FX — 완성 |
| `src/sound.js` | 사운드팩 3종 — 완성 |
| `src/playgama.js`, `src/crazygames.js` | 플랫폼 SDK — 완성 |

---

## 테마 에셋 추가 방법

WebP 에셋을 받으면:

```
1. src/themes/<era-id>/ 폴더에 step-01.webp ~ step-11.webp 배치

2. src/collection-themes.js 에서 해당 테마의 svgPaths 수정:
   svgPaths: makePaths('primordial-earth', 'webp')  ← 'svg' → 'webp'

3. 보드/슬롯 배경 있으면 같은 폴더에:
   board-bg.webp   (512×512)
   slot-bg01.webp  (128×128)
   slot-bg02.webp  (128×128)

   collection-themes.js 테마 객체에 추가:
   boardBg: 'themes/primordial-earth/board-bg.webp',
   slotBg1: 'themes/primordial-earth/slot-bg01.webp',
   slotBg2: 'themes/primordial-earth/slot-bg02.webp',
```

---

## 새 Era 추가 방법

```js
// src/collection-themes.js 에 추가
{
  id: 'stellar-nurseries',
  label: 'STELLAR NURSERIES',
  description: 'Hubble & JWST — where stars are born',
  era: 4,
  unlockCondition: 'solar-system',   // 직전 시대 id
  showStepBadge: true,
  svgPaths: makePaths('stellar-nurseries', 'webp'),
}
```

그리고 `src/themes/stellar-nurseries/step-01.webp ~ step-11.webp` 파일 추가.  
렌더러·갤러리·HUD는 자동 반영됩니다.

---

## 주요 문서 링크

| 문서 | 내용 |
|------|------|
| `docs/concept.md` | 게임 피치, 코어루프, 차별화 포인트 |
| `docs/era-design.md` | 시대별 11단계 장면 명세 (step 번호, 색상, 시각 표현) |
| `docs/asset-guide.md` | WebP 제작 규격, AI 프롬프트 힌트, NASA/ESA 출처 |
| `docs/ai-image-generation-guide.md` | NeonDrift에서 이식한 이미지 생성 가이드 (순서 인지 요건) |
| `CLAUDE.md` | 폴더 구조, 개발 규칙, zip 배포 방법 |
| `.claude/skills/playgama-submission/SKILL.md` | Playgama 제출 체크리스트 |
| `.claude/skills/playgama-ad-integration/SKILL.md` | 광고 연동 트러블슈팅 |

---

## 현재 테마 체인

```
[Era 1] Primordial Earth  ──→  [Era 2] Human Civilization  ──→  [Era 3] Solar System
 (SVG placeholder)               (SVG placeholder)               (SVG placeholder)
 빅뱅 ~ 포유류 전야               석기 ~ 아폴로 11호               달 ~ 오르트 구름
```

**다음 확장 예정:**
```
Era 4: Stellar Nurseries (허블/JWST 성운)
Era 5: Milky Way
Era 6: Local Group (안드로메다)
Era 7: Deep Field (JWST SMACS 0723)
```

---

## Git / 레포 정보

```
로컬:  C:\Users\lkh08\H5-games\H5-PUZZLE-EarthBeyond
원격:  https://github.com/kyungho-lee/H5-PUZZLE-EarthBeyond
브랜치: main

관련 레포:
  H5_games.git          → H5-games 모노레포 허브 (서브모듈로 등록됨)
  H5-PUZZLE-NeonDrift-v1 → 엔진 원본 (참고용)
```

---

## Playgama 재심사 준비 체크리스트

NeonDrift는 "100% AI 생성 결과물" 사유로 리젝됨.  
Earth & Beyond로 재도전 시 아래 항목을 충족해야 합니다.

```
[ ] Era 1~3 정식 WebP 에셋 완성 (33장 타일 + 9장 배경)
[ ] 각 step이 한눈에 구분되는 시각 차이 (docs/asset-guide.md QA 체크리스트)
[ ] 영문 게임 설명 작성 (docs/playgama-submission.md 구조 참조)
[ ] firebase-config.js 실제 키 입력
[ ] playgama-bridge-config.json 리더보드 ID 입력
[ ] make-cover.mjs → cover-square/portrait/landscape 3장 생성
[ ] make-screenshots.mjs → ss-01 ~ ss-05 5장 생성
[ ] game.zip 생성 후 업로드
```
