# Earth & Beyond — 시대별 설계 명세 (Era Design Spec)

> 각 Era = 11단계 이미지팩. 1024 머지 달성 시 시대 완성 → 다음 Era 해금.
> step-11은 시대 완성 보상 타일 — 가장 화려하게 제작.

---

## Era 1: Primordial Earth

**시기:** 빅뱅(138억 년 전) ~ 인류 전야(6만 년 전)
**테마 ID:** `primordial-earth`
**설명:** 우주 먼지에서 지구가 탄생하고 생명이 시작되어 포유류가 등장하기까지의 대서사시.

### 11단계 장면 목록

| step | size | 영문명 | 한국어 설명 | 주 색상 | 시각 표현 |
|---|---|---|---|---|---|
| 01 | 2 | Stardust & Molecular Cloud | 성간 먼지와 분자운 | 보라/남색 | 흩어진 점광원, 가스 구름 실루엣 |
| 02 | 4 | Protoplanetary Disk | 원시 태양계 원반 | 주황/황색 | 소용돌이 원반, 중심 빛 |
| 03 | 8 | Magma Ocean Earth | 용암 지구 (마그마 오션) | 적황/오렌지 | 붉게 타오르는 구체, 용암 흐름 |
| 04 | 16 | Moon-forming Impact | 달 형성 (테이아 충돌) | 백열/흰-주황 | 두 천체 충돌, 파편 산란 |
| 05 | 32 | First Oceans | 원시 해양 탄생 | 청-녹 | 물결, 수증기, 하늘색 |
| 06 | 64 | Stromatolites | 최초 생명 (스트로마톨라이트) | 녹색 | 얕은 바다, 돔형 미생물 매트 |
| 07 | 128 | Great Oxidation Event | 산소 대폭발 / 눈덩이 지구 | 청-백 | 산소 거품, 얼음 구체 |
| 08 | 256 | Cambrian Explosion | 캄브리아 대폭발 | 다색 (청·적·황) | 다양한 생명체 실루엣, 화려한 바다 |
| 09 | 512 | Age of Dinosaurs | 공룡의 시대 (쥐라기) | 녹-황 | 거대 공룡 실루엣, 울창한 식생 |
| 10 | 1024 | K-Pg Extinction | 소행성 충돌 대멸종 | 암적/회색 | 충돌 화구, 먼지 구름, 화염 |
| 11 | 2048 | Rise of Mammals ✨ | 포유류의 시대 (완성 보상) | 따뜻한 금/갈색 | 초원, 다양한 포유류, 새벽빛 |

### 보드 / 슬롯 배경 스킨

- **보드 배경 무드:** 용암/초기 지구 톤. 어두운 주황·붉은 계열 그라데이션. 용암이 흐르는 느낌의 텍스처.
  - 파일: `src/themes/primordial-earth/board-bg.webp` (512×512)
  - 색상 키워드: `#1a0800` → `#4d1500` → `#7a2800` 그라데이션
- **slot-bg01** (짝수 슬롯): 깊은 적갈색, 희미한 용암 균열 패턴
  - 파일: `src/themes/primordial-earth/slot-bg01.webp` (128×128)
- **slot-bg02** (홀수 슬롯): 어두운 회흑색, 냉각된 현무암 텍스처
  - 파일: `src/themes/primordial-earth/slot-bg02.webp` (128×128)

---

## Era 2: Human Civilization

**시기:** 석기 시대(25만 년 전) ~ 아폴로 11호(1969년)
**테마 ID:** `human-civilization`
**해금 조건:** `primordial-earth` Era 완성 (1024 머지)
**설명:** 인류가 도구를 만들고 문명을 쌓아 마침내 우주에 발을 내딛기까지.

### 11단계 장면 목록

| step | size | 영문명 | 한국어 설명 | 주 색상 | 시각 표현 |
|---|---|---|---|---|---|
| 01 | 2 | Stone Age Cave Art | 석기 시대 & 동굴벽화 | 황토/적갈 | 손도장, 동물 암각화 실루엣 |
| 02 | 4 | Agricultural Revolution | 농업 혁명 | 녹-황 | 밀밭, 쟁기, 정착지 |
| 03 | 8 | Ancient Civilizations | 고대 문명 (이집트/메소포타미아) | 금/사막 황 | 피라미드, 지구라트 실루엣 |
| 04 | 16 | Classical Antiquity | 그리스·로마 철학·과학 | 흰 대리석/청 | 파르테논, 기어/아스트롤라베 |
| 05 | 32 | Age of Exploration | 대항해 시대 | 해청/갈색 | 범선, 지도, 나침반 |
| 06 | 64 | Scientific Revolution | 과학 혁명 (뉴턴·갈릴레오) | 황-주 | 망원경, 사과, 천체도 |
| 07 | 128 | Industrial Revolution | 산업 혁명 | 회/철회 | 증기 기관, 공장 굴뚝 |
| 08 | 256 | Electrical Age | 전기 & 통신 시대 | 전기 청/백 | 전구, 전신선, 라디오 |
| 09 | 512 | Atomic Age | 원자력 & 세계대전 | 핵광/황-녹 | 원자 모델, 버섯구름 실루엣 |
| 10 | 1024 | Digital Revolution | 디지털 혁명 | 네온 청/초록 | 회로 기판, 픽셀, 인터넷 노드 |
| 11 | 2048 | Apollo Moon Landing ✨ | 아폴로 — 달 착륙 (완성 보상) | 금/순백 | 우주복, 달 표면, 지구 발돋움 |

### 보드 / 슬롯 배경 스킨

- **보드 배경 무드:** 문명의 축적감. 고대 석재와 금속 텍스처가 혼합된 중간톤.
  - 파일: `src/themes/human-civilization/board-bg.webp` (512×512)
  - 색상 키워드: `#1c1408` → `#2e2010` → `#3d2a14` 고대 석재/양피지 톤
- **slot-bg01** (짝수 슬롯): 고대 석재 패턴, 따뜻한 회-황 계열
  - 파일: `src/themes/human-civilization/slot-bg01.webp` (128×128)
- **slot-bg02** (홀수 슬롯): 산화된 청동/철 텍스처
  - 파일: `src/themes/human-civilization/slot-bg02.webp` (128×128)

---

## Era 3: Solar System

**시기:** 우주 탐사 시대 (1969년~현재)
**테마 ID:** `solar-system`
**해금 조건:** `human-civilization` Era 완성 (1024 머지)
**설명:** 인류가 우주로 나가 태양계 끝까지 탐사하는 여정. NASA/ESA 탐사선 실사 이미지 모티브.

### 11단계 장면 목록

| step | size | 영문명 | 한국어 설명 | 실사 출처 | 주 색상 | 시각 표현 |
|---|---|---|---|---|---|---|
| 01 | 2 | Moon Surface | 달 표면 (아폴로 발자국) | Apollo 11 | 회/백 | 발자국, 월면차, 분화구 |
| 02 | 4 | Mars Surface | 화성 표면 — 로버 | Perseverance | 적갈/주황 | 붉은 암반, 로버 실루엣 |
| 03 | 8 | Jupiter Great Red Spot | 목성 대적점 | Juno | 적-황 소용돌이 | 거대 폭풍 구조 |
| 04 | 16 | Saturn's Rings | 토성 고리 | Cassini | 황/베이지 | 선명한 링 시스템 |
| 05 | 32 | Titan's Methane Lakes | 타이탄 메탄 바다 | Cassini (VIMS/SAR) | 탁한 주황 | 메탄 호수, 안개 대기 |
| 06 | 64 | Europa Ice Shell | 유로파 얼음 표면 | Galileo / Europa Clipper | 청-백 | 균열 얼음, 지하해 암시 |
| 07 | 128 | Pluto Heart | 명왕성 하트 지형 | New Horizons | 분홍-백 | 하트형 질소 빙원 |
| 08 | 256 | Solar Corona | 태양 코로나 | SOHO / Solar Orbiter | 백-금 플라즈마 | 코로나 루프, 태양풍 |
| 09 | 512 | Pale Blue Dot | 보이저 1호에서 본 지구 | Voyager 1 (1990) | 어두운 우주+파란 점 | 광막한 어둠 속 지구 |
| 10 | 1024 | Interstellar Space | 성간 공간 진입 | Voyager 1 (2012~) | 칠흑 + 성간 입자 | 태양권계면 너머 |
| 11 | 2048 | Oort Cloud ✨ | 오르트 구름 — 태양계 끝 (완성 보상) | 이론적/Voyager 궤도 추산 | 어두운 청-남 + 얼음 파편 | 무수한 얼음 천체, 태양이 별처럼 |

### 실사 사진 출처 상세

| 탐사선/관측기 | 운영 기관 | 주요 활용 step |
|---|---|---|
| Apollo 11 | NASA | step-01 |
| Perseverance Rover | NASA/JPL | step-02 |
| Juno | NASA | step-03 |
| Cassini | NASA/ESA/ASI | step-04, step-05 |
| Galileo / Europa Clipper | NASA | step-06 |
| New Horizons | NASA/JHU APL | step-07 |
| SOHO / Solar Orbiter | NASA/ESA | step-08 |
| Voyager 1 | NASA/JPL | step-09, step-10 |

### 보드 / 슬롯 배경 스킨

- **보드 배경 무드:** 심우주. 칠흑 배경에 별빛 산란. 성단/성운 희미하게.
  - 파일: `src/themes/solar-system/board-bg.webp` (512×512)
  - 색상 키워드: `#000005` → `#010818` 거의 완전한 어둠, 미세한 별빛 노이즈
- **slot-bg01** (짝수 슬롯): 심우주 남색, 희미한 성운 가스 패턴
  - 파일: `src/themes/solar-system/slot-bg01.webp` (128×128)
- **slot-bg02** (홀수 슬롯): 완전한 칠흑, 소수 점광원만
  - 파일: `src/themes/solar-system/slot-bg02.webp` (128×128)

---

## Era 4 ~ 7: 미래 확장 계획

### Era 4: Stellar Nurseries (별의 요람)

허블·JWST가 찍은 성운 이미지 모티브. 독수리 성운 "창조의 기둥", 카리나 성운, 오리온 성운 등. 별이 탄생하는 가스·먼지 기둥 장면으로 구성. step-11은 주계열성 진입 순간. 보드 배경은 성운 특유의 분홍-청 혼합 빛.

### Era 5: Milky Way (우리 은하)

우리 은하 구조 탐구. 오리온 팔에서 은하 중심(Sgr A*) 블랙홀까지. EHT(사건지평선 망원경) 블랙홀 이미지가 step-11. 보드 배경은 은하수 아치형 사진 모티브.

### Era 6: Local Group (국부 은하군)

마젤란 성운(LMC/SMC), 안드로메다(M31), 삼각형 은하(M33) 등 국부 은하군 구성원 탐방. 은하 충돌·병합 장면 포함. step-11은 안드로메다와 우리 은하의 미래 병합 시뮬레이션 이미지.

### Era 7: Deep Field (우주의 끝)

JWST SMACS 0723 딥필드 이미지가 컨셉의 핵심. 수백 개 은하가 중력 렌즈로 왜곡된 장면. 빅뱅 직후 초기 우주(적색편이 z>10 천체)까지 거슬러 올라감. step-11은 관측 가능한 우주 전체 지도 (Planck CMB 모티브).

---

## 참고: 스텝 승급 size 체계

```
step-01 → size 2
step-02 → size 4
step-03 → size 8
step-04 → size 16
step-05 → size 32
step-06 → size 64
step-07 → size 128
step-08 → size 256
step-09 → size 512
step-10 → size 1024  ← 기존 '1024 머지' 완성 기준
step-11 → size 2048  ← 시대 완성 보상 타일 (✨)
```
