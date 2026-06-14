# Earth & Beyond — 리소스 제작 가이드 (Asset Production Guide)

---

## 기술 규격 (Technical Spec)

### 스텝 타일 이미지

| 항목 | 규격 |
|---|---|
| 포맷 | WebP (정식) / SVG (현재 placeholder) |
| 해상도 | 256 × 256 px |
| 배경 | 투명 (alpha channel 필수) |
| 파일 크기 | ≤ 20 KB / 장 |
| 수량 | 11장 × 3 Era = 33장 (현재) |

### 배경 이미지

| 종류 | 파일명 | 해상도 | 용도 |
|---|---|---|---|
| 보드 배경 | `board-bg.webp` | 512 × 512 px | 게임 보드 전체 배경 |
| 슬롯 배경 짝수 | `slot-bg01.webp` | 128 × 128 px | 짝수 번호 슬롯 배경 |
| 슬롯 배경 홀수 | `slot-bg02.webp` | 128 × 128 px | 홀수 번호 슬롯 배경 |

### SVG → WebP 전환 방법

현재 `collection-themes.js`에서 `makePaths('era-id', 'svg')`로 SVG placeholder를 로드 중.
정식 WebP 제작 완료 후 **ext 인자만 `'webp'`로 교체**하면 전환 완료:

```js
// 현재 (placeholder)
svgPaths: makePaths('primordial-earth', 'svg'),

// 정식 에셋 전환 후
svgPaths: makePaths('primordial-earth', 'webp'),
```

---

## 디렉토리 구조

```
src/themes/
├── primordial-earth/
│   ├── step-01.svg ~ step-11.svg   ← 현재 SVG placeholder
│   ├── step-01.webp ~ step-11.webp ← 정식 에셋 (제작 후 배치)
│   ├── board-bg.webp               ← 보드 배경 (512×512)
│   ├── slot-bg01.webp              ← 슬롯 배경 짝수 (128×128)
│   └── slot-bg02.webp              ← 슬롯 배경 홀수 (128×128)
├── human-civilization/
│   ├── step-01.svg ~ step-11.svg
│   ├── board-bg.webp
│   ├── slot-bg01.webp
│   └── slot-bg02.webp
└── solar-system/
    ├── step-01.svg ~ step-11.svg
    ├── board-bg.webp
    ├── slot-bg01.webp
    └── slot-bg02.webp
```

---

## AI 이미지 생성 가이드

### 공통 원칙

1. **인접 step(N ↔ N+1)은 한눈에 구분 가능**해야 한다. 형태/색상/크기감/밝기 중 최소 2가지 이상 변화.
2. **step-11은 가장 화려하게** — 시대 완성 보상감을 극대화. 복잡도, 색상 수, 빛의 강도 모두 최대.
3. 투명 배경 필수 (`--no-background` 또는 배경 제거 후처리).
4. 256×256 정사각형 구도. 중앙 집중형 구도 권장.

### Era 1: Primordial Earth 프롬프트 패턴

```
"[장면명], primordial earth era, dark cosmic background,
 glowing neon outline style, vibrant [주 색상] glow,
 256x256 square tile, transparent background,
 game asset art, fantasy sci-fi style"
```

예시 (step-03 Magma Ocean Earth):
```
"Magma Ocean Earth, molten lava planet surface, primordial earth era,
 dark background, glowing orange-red neon outline, volcanic glow,
 256x256 game tile art, transparent background"
```

### Era 2: Human Civilization 프롬프트 패턴

```
"[장면명], human civilization era, ancient to modern progression,
 dark background, [주 색상] neon glow, minimalist icon style,
 256x256 square tile, transparent background, game asset"
```

예시 (step-11 Apollo Moon Landing):
```
"Apollo astronaut on Moon surface, Earth in background, human civilization era,
 dark space background, golden white neon glow, triumphant achievement moment,
 256x256 game tile, transparent background, detailed icon art"
```

### Era 3: Solar System 프롬프트 패턴

```
"[천체명/탐사선명], NASA space photography style, photorealistic,
 deep space dark background, [주 색상] glowing detail,
 256x256 game tile art, transparent background"
```

예시 (step-04 Saturn's Rings — Cassini):
```
"Saturn with rings, Cassini spacecraft photography style, photorealistic planet,
 deep black space background, golden beige ring system glow,
 256x256 game tile, transparent background, NASA imagery inspired"
```

---

## 에셋 체크리스트 (제작 순서 권장)

### Era 1: Primordial Earth

- [ ] step-01: Stardust & Molecular Cloud — 보라/남색, 가스 구름 + 점광원
- [ ] step-02: Protoplanetary Disk — 주황/황색, 소용돌이 원반
- [ ] step-03: Magma Ocean Earth — 적황, 용암 구체
- [ ] step-04: Moon-forming Impact — 백열, 충돌 순간
- [ ] step-05: First Oceans — 청-녹, 물결 + 수증기
- [ ] step-06: Stromatolites — 녹색, 돔형 미생물
- [ ] step-07: Great Oxidation Event — 청-백, 산소 거품
- [ ] step-08: Cambrian Explosion — 다색, 다양한 생명 실루엣
- [ ] step-09: Age of Dinosaurs — 녹-황, 공룡 실루엣
- [ ] step-10: K-Pg Extinction — 암적/회, 충돌 화구
- [ ] step-11: Rise of Mammals ✨ — 금/갈, 초원 + 포유류 (최고 화려도)
- [ ] board-bg: 용암/마그마 오션 톤 512×512
- [ ] slot-bg01: 적갈색 용암 균열 128×128
- [ ] slot-bg02: 냉각 현무암 128×128

### Era 2: Human Civilization

- [ ] step-01: Stone Age Cave Art — 황토/적갈, 암각화
- [ ] step-02: Agricultural Revolution — 녹-황, 밀밭
- [ ] step-03: Ancient Civilizations — 금/사막 황, 피라미드
- [ ] step-04: Classical Antiquity — 흰 대리석, 파르테논
- [ ] step-05: Age of Exploration — 해청/갈, 범선
- [ ] step-06: Scientific Revolution — 황-주, 망원경 + 사과
- [ ] step-07: Industrial Revolution — 회/철회, 증기 기관
- [ ] step-08: Electrical Age — 전기 청, 전구
- [ ] step-09: Atomic Age — 핵광/황-녹, 원자 모델
- [ ] step-10: Digital Revolution — 네온 청, 회로 기판
- [ ] step-11: Apollo Moon Landing ✨ — 금/순백, 달 착륙 (최고 화려도)
- [ ] board-bg: 고대 석재/양피지 톤 512×512
- [ ] slot-bg01: 고대 석재 패턴 128×128
- [ ] slot-bg02: 산화 청동/철 텍스처 128×128

### Era 3: Solar System

- [ ] step-01: Moon Surface — 회/백, 발자국 + 분화구
- [ ] step-02: Mars Surface — 적갈/주황, 붉은 암반
- [ ] step-03: Jupiter Great Red Spot — 적-황 소용돌이
- [ ] step-04: Saturn's Rings — 황/베이지, 링 시스템
- [ ] step-05: Titan's Methane Lakes — 탁한 주황, 메탄 호수
- [ ] step-06: Europa Ice Shell — 청-백, 균열 얼음
- [ ] step-07: Pluto Heart — 분홍-백, 하트형 빙원
- [ ] step-08: Solar Corona — 백-금, 코로나 루프
- [ ] step-09: Pale Blue Dot — 칠흑 + 파란 점
- [ ] step-10: Interstellar Space — 칠흑 + 성간 입자
- [ ] step-11: Oort Cloud ✨ — 어두운 청-남, 얼음 파편 + 별빛 (최고 화려도)
- [ ] board-bg: 심우주 칠흑 + 별빛 512×512
- [ ] slot-bg01: 심우주 남색 + 희미한 성운 128×128
- [ ] slot-bg02: 완전한 칠흑 + 점광원 128×128

---

## 저작권 안전 참고 이미지 출처

아래 소스는 모두 **공공 도메인(Public Domain)** 또는 **CC0** 라이선스로,
상업적 H5 게임 에셋의 아트 레퍼런스로 사용 가능하다.

| 출처 | URL | 라이선스 | 주요 활용 |
|---|---|---|---|
| NASA Image Gallery | https://images.nasa.gov | Public Domain | Era 3 전체, Era 1/2 일부 |
| ESA/Hubble Public Domain | https://esahubble.org/images | CC BY 4.0 | Era 4 (성운) |
| JWST First Images | https://webbtelescope.org/news/first-images | NASA CC0 | Era 4/7 |
| Voyager Image Archive | https://voyager.jpl.nasa.gov | Public Domain | Era 3 step-09, 10 |
| Cassini Image Archive | https://saturn.jpl.nasa.gov | Public Domain | Era 3 step-04, 05 |
| New Horizons Gallery | https://www.nasa.gov/mission/new-horizons | Public Domain | Era 3 step-07 |

> **주의:** 참고 이미지를 기반으로 AI 생성 또는 오리지널 아트를 제작하는 것은 문제 없음.
> 실사 사진 자체를 그대로 게임 에셋으로 사용하는 경우 각 이미지별 라이선스를 재확인할 것.

---

## 품질 기준 (QA Checklist)

- [ ] 모든 스텝 타일이 투명 배경 (체크보드 패턴에서 확인)
- [ ] step N과 step N+1이 썸네일(64px) 크기에서도 구분 가능
- [ ] step-11이 step-10 대비 명확하게 더 화려하고 밀도 높음
- [ ] WebP 파일 크기 각각 ≤ 20 KB
- [ ] board-bg.webp 로드 후 타일과 시각적 조화 확인
- [ ] slot-bg01/02가 서로 구분되고 타일 가독성을 해치지 않음
- [ ] 모바일 160dpi 화면에서 타일 아이콘 인식 가능
