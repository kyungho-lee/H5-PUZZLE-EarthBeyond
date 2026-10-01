# Earth & Beyond — Claude Code 개발 가이드

## 프로젝트 개요

**Earth & Beyond** — 머지 퍼즐 게임. 원시 지구에서 우주의 끝까지 시대를 완성해가는 Collection 기반 코어루프.

- **엔진**: NeonDrift v1 코어 이식 (neon-drift.js, grid-render.js, particles.js)
- **플랫폼**: Playgama / CrazyGames (H5)
- **로컬 서버**: `cd src && python -m http.server 8081`
- **GitHub**: https://github.com/kyungho-lee/H5-PUZZLE-EarthBeyond

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

```
npm run build:playgama        # → build/earth-and-beyond-<version>-<hash>.zip
```

Compress-Archive 는 쓰지 않는다 — PowerShell 5.1 이 zip 경로를 '\' 로 적어 Playgama(Linux)에서 테마 이미지가 전혀 안 나온다(2026-06-16 빌드).

업로드 뒤에는 QA Tool 링크를 열어 테마 이미지가 실제로 렌더링되는지(숫자 타일이 아닌지) 확인한다.

