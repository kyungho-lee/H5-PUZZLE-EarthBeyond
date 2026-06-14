# NeonDrift — AI 이미지 생성 가이드

Collection 모드 블록 스킨(테마 이미지팩)을 AI 이미지 생성 툴로 제작하기 위한 가이드.

---

## 1. 출력 규격 (필수)

| 항목 | 값 |
|------|-----|
| 크기 | **256 × 256 px** (정사각 1:1) |
| 포맷 | **WebP** 권장 (PNG도 가능) |
| 배경 | **투명** 또는 **#060810 (거의 검정)** |
| 파일 크기 | 1장당 **≤ 20 KB** 목표, 40 KB 상한 |
| 색공간 | sRGB |

> 렌더러가 블록 셀(~80–125 CSS px) 안에 꽉 채워 그린다.  
> 이미지 자체에 내부 여백을 두지 말 것 — 셀 안쪽 여백(약 7%)은 렌더러가 자동 처리.

---

## 2. 공통 스타일 지시문 (모든 테마 공통 접두)

모든 프롬프트 앞에 반드시 붙인다:

```
cyberpunk neon-glow icon, square 1:1 format, dark background #060810,
vibrant neon lighting, sharp edges with soft glow aura,
game tile art style, no text, no watermark, isolated subject,
flat icon composition centered in frame
```

---

## 3. 테마별 프롬프트 가이드

### 3-1. NEON CITY (네온 도시)

**테마 컨셉:** 사이버펑크 도시의 건물·거리·네온 사인이 머지할수록 점점 완성되어 가는 야경.  
**대표 발광색:** 시안 `#00f5c8`, 핑크 `#ff4060`, 보라 `#b06aff`  
**성장 방향:** 황량한 실루엣 → 창문 불빛 → 네온 사인 → 홀로그램 → 풀 야경

| step | size | 모티프 | 핵심 프롬프트 키워드 |
|-----:|-----:|--------|-------------------|
| 01 | 1 | 어두운 건물 실루엣 | `dark city building silhouette, no lights, minimal, monochrome dark blue` |
| 02 | 2 | 창문에 희미한 불빛 | `city building with faint window lights, few lit windows, dark night` |
| 03 | 4 | 도로 격자·가로등 | `street grid pattern, dim streetlights, urban top-down perspective` |
| 04 | 8 | 첫 번째 네온 사인 | `single cyan neon sign on building, glowing neon tube, #00f5c8` |
| 05 | 16 | 두 번째 네온 사인 추가 | `two neon signs, cyan and pink neon glow, cyberpunk storefront` |
| 06 | 32 | 홀로그램 광고판 | `holographic advertisement billboard, translucent blue projection, glitch effect` |
| 07 | 64 | 비·파티클 레이어 | `rain falling on neon-lit street, rain streaks, reflections on wet ground` |
| 08 | 128 | 도로 반사광 | `neon reflections on wet asphalt, colorful light puddles, vivid glow` |
| 09 | 256 | 비행 차량 실루엣 | `flying car silhouette, anti-gravity vehicle, neon engine glow, night sky` |
| 10 | 512 | 풀 야경 | `full cyberpunk cityscape, all neon signs lit, rain, flying cars, maximum glow` |
| 11 | 1024 | 도시 완성 (테마 완료) | `complete neon city panorama, all lights on, epic cyberpunk skyline, celebration glow` |

**전체 프롬프트 예시 (step-04):**
```
cyberpunk neon-glow icon, square 1:1 format, dark background #060810,
vibrant neon lighting, sharp edges with soft glow aura,
game tile art style, no text, no watermark, isolated subject,
flat icon composition centered in frame,
single cyan neon sign on building, glowing neon tube, #00f5c8,
city building silhouette, night scene
```

---

### 3-2. CYBER OCEAN (사이버 심해)

**테마 컨셉:** 심해의 생명체가 머지할수록 네온으로 빛나며 진화하는 바이오루미네선스.  
**대표 발광색:** 딥 블루 `#00c8ff`, 바이올렛 `#b06aff`, 에메랄드 `#39d353`  
**성장 방향:** 어두운 심해 → 미생물 → 해파리 → 심해어 → 산호 → 거대 생물

| step | size | 모티프 | 핵심 프롬프트 키워드 |
|-----:|-----:|--------|-------------------|
| 01 | 1 | 어두운 심해 배경 | `dark deep ocean abyss, minimal, no creatures, deep blue-black` |
| 02 | 2 | 미세 플랑크톤 점들 | `tiny bioluminescent plankton dots, faint blue glow, sparse` |
| 03 | 4 | 해파리 새싹 | `small jellyfish, faint neon glow, transparent body, #00c8ff` |
| 04 | 8 | 빛나는 해파리 | `glowing jellyfish, bioluminescent tentacles, blue-violet neon` |
| 05 | 16 | 심해 산호 | `neon coral reef, bioluminescent coral, vibrant green and blue glow` |
| 06 | 32 | 심해어 | `deep sea fish with bioluminescent lure, anglerfish style, neon glow` |
| 07 | 64 | 오징어·문어 | `neon glowing squid, cyberpunk bio-mechanical tentacles, violet glow` |
| 08 | 128 | 거대 산호 군락 | `massive coral formation, vivid neon ecosystem, multiple species glowing` |
| 09 | 256 | 거대 심해 생물 | `giant deep sea creature silhouette, massive scale, epic bioluminescence` |
| 10 | 512 | 심해 전체 생태계 | `full bioluminescent deep ocean ecosystem, all creatures glowing, epic scene` |
| 11 | 1024 | 완성 — 빛의 심연 | `ultimate cyber ocean, overwhelming neon bioluminescence, all life glowing, mythical` |

---

### 3-3. NEON DIGITS (현재 placeholder — 참고용)

숫자 `1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024`를 큰 네온 글자로 표현.  
AI 생성 불필요 (SVG 코드로 직접 생성됨). 새 테마 제작 시 스타일 참고용으로만 사용.

---

## 4. 툴별 설정 권장값

### Midjourney

```
/imagine [공통 스타일] + [테마별 키워드] --ar 1:1 --style raw --v 6
```

추가 파라미터:
```
--no text, watermark, border, frame
--stylize 200
```

### DALL-E 3 (ChatGPT)

```
Create a square game tile icon (1:1 ratio) with dark background (#060810).
Style: cyberpunk neon-glow, vibrant bioluminescent colors, no text.
Subject: [테마별 키워드]
Output: 256x256px, transparent or dark background.
```

### Stable Diffusion

```
Positive: [공통 스타일], [테마별 키워드], game icon, centered composition
Negative: text, watermark, border, white background, blurry, low quality, photorealistic
Steps: 30, CFG: 7, Sampler: DPM++ 2M Karras
```

---

## 5. 후처리 체크리스트

생성 후 게임에 넣기 전 확인:

- [ ] **크기**: 256×256 px 로 리사이즈 (비율 유지)
- [ ] **배경**: 투명 처리 또는 `#060810` 단색 배경으로 교체
- [ ] **여백**: 이미지 내 빈 공간 최소화 — 주제가 프레임을 꽉 채울 것
- [ ] **포맷 변환**: WebP로 변환 (`cwebp -q 80 input.png -o step-01.webp`)
- [ ] **파일 크기**: ≤ 20 KB 확인 (초과 시 품질 낮추거나 `cwebp -q 70`)
- [ ] **인접 단계 비교**: step N과 N+1을 나란히 놓고 한눈에 구분되는지 확인
- [ ] **파일명**: `step-01.webp` ~ `step-11.webp` (2자리 zero-pad)

---

## 6. 파일 배치 및 코드 등록

### 파일 배치

```
src/themes/
  neon-city/
    step-01.webp
    step-02.webp
    ...
    step-11.webp
  cyber-ocean/
    step-01.webp
    ...
    step-11.webp
```

### collection-themes.js 확장자 변경

현재 `makePaths(id)`는 `.svg`를 생성한다. WebP로 전환 시:

```js
// src/collection-themes.js
function makePaths(id, ext) {
  ext = ext || 'svg';
  return Array.from({ length: stepCount() }, function (_, i) {
    return 'themes/' + id + '/step-' + String(i + 1).padStart(2, '0') + '.' + ext;
  });
}

// 테마 등록 시
{ id: 'neon-city', svgPaths: makePaths('neon-city', 'webp'), ... }
{ id: 'cyber-ocean', svgPaths: makePaths('cyber-ocean', 'webp'), ... }
```

> `neon-digits`는 SVG 유지, 새 테마만 WebP로 교체하면 된다.

---

## 7. 단계별 성장감 설계 원칙

### 핵심 요건: 순서가 한눈에 보여야 한다

> **step N과 step N+1을 나란히 놓았을 때, 어느 쪽이 더 앞 단계인지 0.5초 안에 판단할 수 있어야 한다.**

이미지만 보고 단계 순서를 인지할 수 없으면 수집의 성취감이 사라진다. 아래 세 축 중 **최소 두 축**에서 인접 단계 간 눈에 띄는 차이가 있어야 한다.

인접 단계(N → N+1)를 구분하는 세 가지 축:

| 축 | 방법 | 잘못된 예 |
|----|------|-----------|
| **밝기** | 단계가 올라갈수록 글로우 강도 증가 (step 1 = 어둡고 muted, 최종 = 최대 발광) | 밝기가 비슷한 이미지가 연속으로 나옴 |
| **복잡도** | 요소 수 증가 (step 1 = 단일 오브젝트, 최종 = 여러 요소가 가득) | 처음부터 요소가 많아 후반과 구분 안 됨 |
| **크기감** | 주제 오브젝트가 프레임 대비 점점 커지거나 화면을 꽉 채움 | 모든 단계에서 오브젝트 크기가 동일 |

### 단계 구간별 지침

| 구간 | 방향 |
|------|------|
| step 1~3 | **분위기 확립** — 어둡고 단순, 테마 세계관 힌트만. 오브젝트 최소화 |
| step 4~7 | **오브젝트 등장** — 핵심 요소들이 하나씩 추가. 각 단계마다 새 요소 1개 |
| step 8~(N-1) | **디테일 폭발** — 전체가 빛나고 복잡해짐. 색상·글로우 최대화 |
| step N (최종) | **클리어 연출** — 직전 단계보다 확연히 화려. "완성됐다"는 느낌이 즉각적 |

### 검수 체크리스트

생성 후 아래를 반드시 확인한다:

- [ ] step 1과 step N을 동시에 보여줬을 때 누구나 순서를 맞힐 수 있는가
- [ ] 인접 두 장(N, N+1)을 섞어 놓았을 때 순서를 구분할 수 있는가
- [ ] 단계가 올라갈수록 **일관된 방향**(밝아짐 또는 복잡해짐)으로 변화하는가
- [ ] 중간 단계에서 갑자기 어두워지거나 단순해지는 역전 구간이 없는가
