# Earth & Beyond — Claude Code 개발 가이드

## 프로젝트 개요

**Earth & Beyond** — 머지 퍼즐 게임. 원시 지구에서 우주의 끝까지 시대를 완성해가는 Collection 기반 코어루프.

- **엔진**: NeonDrift v1 코어 이식 (neon-drift.js, grid-render.js, particles.js)
- **플랫폼**: Playgama / CrazyGames (H5)
- **로컬 서버**: `cd src && python -m http.server 8081`
- **GitHub**: https://github.com/kyungho-lee/H5-PUZZLE-EarthBeyond

---

## 폴더 구조

```
H5-PUZZLE-EarthBeyond/
├── src/                        ← Playgama 제출 zip 대상 (flat 압축)
│   ├── index.html              ← 진입점 + 게임 쉘 + 인라인 JS/CSS
│   ├── neon-drift.js           ← 게임 코어 (슬라이드·머지·체인·RNG)
│   ├── grid-render.js          ← Canvas 렌더러 + 트윈 + 파티클
│   ├── collection.js           ← 컬렉션 상태 CRUD (localStorage)
│   ├── collection-themes.js    ← Era 1~3 테마 메타 정의
│   ├── daily.js                ← Daily 모드 상태 + 지갑(별)
│   ├── palette.js              ← 딥스페이스 + 지구 톤 6색
│   ├── particles.js            ← 파티클 FX + FloatText + Ring
│   ├── star-fly.js             ← 별 날아가기 HUD 애니메이션
│   ├── sound.js                ← Web Audio 합성 사운드팩 3종
│   ├── playgama.js             ← Playgama Bridge SDK 래퍼
│   ├── firebase.js             ← Firestore 리더보드 래퍼
│   ├── crazygames.js           ← CrazyGames SDK 어댑터
│   ├── notify.js               ← 토스트 알림 UI
│   └── themes/
│       ├── primordial-earth/   ← Era 1: step-01~11.svg (placeholder)
│       ├── human-civilization/ ← Era 2: step-01~11.svg (placeholder)
│       └── solar-system/       ← Era 3: step-01~11.svg (placeholder)
├── docs/
│   ├── concept.md              ← 게임 피치 + 코어루프 설계
│   ├── era-design.md           ← 시대별 11단계 장면 명세
│   ├── asset-guide.md          ← 리소스 제작 규격 + AI 프롬프트 힌트
│   └── superpowers/specs/      ← NeonDrift에서 이식한 참고 스펙
├── scripts/
│   ├── make-cover.mjs          ← Playgama 커버 이미지 생성
│   ├── make-screenshots.mjs    ← Playgama 스크린샷 5장 생성
│   └── visual-check.mjs        ← 시각 렌더링 검증
└── .claude/
    └── skills/
        └── playgama-ad-integration/ ← 광고 연동 트러블슈팅
```

---

## 핵심 개발 규칙

### localStorage 키 네임스페이스
모든 스토리지 키는 `earthbeyond_` 접두사 사용 (NeonDrift의 `neondrift_`와 분리됨).

### 테마 추가 방법
1. `src/themes/<era-id>/step-01.svg ~ step-11.svg` 파일 추가
2. `src/collection-themes.js`의 `SG.CollectionThemes` 배열에 객체 추가
3. 정식 WebP 완성 시 `makePaths(id, 'webp')`로만 변경

### 모드 구조
- **Daily**: 날짜 시드 기반 4×4 보드, 리더보드, 3회 리트라이
- **Practice**: 랜덤 보드, 무제한, 비경쟁
- **Collection**: 시대별 테마 스킨 머지 진행 (코어루프)

### 색상 토큰 (CSS 변수)
```css
--accent: #3a7bd5   /* 딥 블루 (NeonDrift의 #00f5c8 아쿠아 대체) */
--warn:   #e2683c   /* 용암 주황 */
--bg:     #050810   /* 우주 검정 */
```

---

## 로컬 테스트

```bash
cd src && python -m http.server 8081
# → http://localhost:8081
```

DEV 모드 활성화: URL에 `?dev=1` 추가  
Dev bar에서 테마 선택 + UNLOCK 버튼으로 즉시 테스트 가능

---

## Playgama 제출 zip

```powershell
$src = 'src'
$out = 'earthbeyond.zip'
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path "$src\*" -DestinationPath $out -CompressionLevel Optimal
```

---

## 에셋 현황

| 테마 | 상태 | 파일 |
|------|------|------|
| primordial-earth | SVG placeholder | step-01~11.svg |
| human-civilization | SVG placeholder | step-01~11.svg |
| solar-system | SVG placeholder | step-01~11.svg |

정식 WebP 에셋 수령 시 → `docs/asset-guide.md` 참조
