# TossPOC 수동 작업 가이드

Phase 1(코드 세팅)은 완료되었습니다. 아래는 순서대로 진행해야 하는 수동 단계입니다.

---

## Phase 1 완료 확인

```bash
# 로컬 dev 서버로 동작 확인
cd TossPOC/earthbeyond-toss
npm run dev
# http://localhost:5173 — 게임이 세로 모드로 로드되는지 확인
# 콘솔에 [TossBridge] stub mode 로그 확인
```

---

## Phase 2: Android 포팅 (수동)

### 2-1. Capacitor Android 플랫폼 추가

```bash
cd TossPOC/earthbeyond-toss
npm run build          # Vite 빌드 → dist/ 생성
npx cap add android    # android/ 폴더 자동 생성
npx cap sync           # dist/ → android/app/src/main/assets/public/ 복사
```

### 2-2. Android Studio에서 열기

```bash
npx cap open android
```

Android Studio가 열리면:
1. Gradle sync 자동 실행 (~3분 대기)
2. `android/app/src/main/AndroidManifest.xml` 확인:
   ```xml
   <activity
     android:name=".MainActivity"
     android:screenOrientation="portrait"
     android:exported="true">
   ```
   `screenOrientation="portrait"` 없으면 추가

3. `android/app/build.gradle` 확인:
   ```groovy
   defaultConfig {
     applicationId "com.zenga.earthbeyond"
     minSdk 24
     targetSdk 34
     versionCode 1
     versionName "1.0.0"
   }
   ```

### 2-3. 에뮬레이터/실기기 테스트

Android Studio → Run ▶

체크리스트:
- [ ] 앱 아이콘으로 설치됨
- [ ] Canvas 게임 렌더
- [ ] 터치 컨트롤 동작
- [ ] 세로 모드 고정 (기기 회전 시 가로 전환 안 됨)
- [ ] 사운드 재생

### 2-4. Release AAB 빌드 (Play Store 제출용)

Android Studio → Build → Generate Signed Bundle / APK:
1. "Android App Bundle" 선택 → Next
2. "Create new..." 클릭:
   - Key store path: `[프로젝트 외부 안전한 위치]/earthbeyond.jks`
   - Alias: `earthbeyond-key`
   - Validity: 25 years
3. Build Variant: **release** → Finish

결과물: `android/app/build/outputs/bundle/release/app-release.aab`

> ⚠️ keystore는 분실 시 복구 불가. Google Drive 등에 별도 백업 필수.

---

## Phase 3: 등급 획득 (수동 — Google Play Console)

### 3-1. Google Play Console 접속

[play.google.com/console](https://play.google.com/console)

개발자 계정 없으면: 25달러 1회 등록

### 3-2. 새 앱 만들기

- 앱 이름: `Earth Beyond`
- 기본 언어: 한국어
- 앱 또는 게임: **게임**
- 유료 또는 무료: **무료**

### 3-3. 앱 정보 입력

| 항목 | 내용 |
|---|---|
| 간단한 설명 (80자) | 빅뱅부터 우주의 끝까지 — 시대를 완성하는 머지 퍼즐 |
| 카테고리 | 게임 → 퍼즐 |
| 이메일 | 개발자 연락처 |

그래픽 에셋:
- 앱 아이콘: 512×512 PNG
- Feature 그래픽: 1024×500 PNG
- 스크린샷: 최소 2장

### 3-4. 내부 테스트 트랙에 AAB 업로드

Play Console → 테스트 → 내부 테스트 → 새 버전 만들기:
1. `app-release.aab` 업로드
2. 테스터 이메일 추가 (본인 계정)
3. "검토 제출"

### 3-5. IARC 등급 설문 (자체등급분류)

Play Console → 정책 → 앱 콘텐츠 → 콘텐츠 등급 → "시작하기"

예상 답변 (EarthBeyond 기준):
| 항목 | 답변 |
|---|---|
| 폭력적 콘텐츠 | 없음 |
| 성인 콘텐츠 | 없음 |
| 도박/베팅 | 없음 |
| 사용자 간 상호작용 | 리더보드 (익명 점수) |
| 개인정보 수집 | 없음 |
| 인앱 구매 | 없음 (현재) |
| 광고 포함 | 있음 |

→ 예상 등급: **전체이용가(ALL)**

### 3-6. 증명서 다운로드

Play Console → 콘텐츠 등급 → "등급 증명서 다운로드"

파일명: `IARC_Certificate_earthbeyond.pdf`
저장: `TossPOC/docs/rating/IARC_Certificate_earthbeyond.pdf`

---

## Phase 4: 앱인토스 등록 (파트너십 이후)

### 4-1. 사전 조건

- [ ] 토스 비즈니스 계정
- [ ] 앱인토스 파트너십 계약 완료 → SDK 접근권 발급
- [ ] IARC 증명서 PDF 준비

### 4-2. 앱인토스 콘솔 앱 등록

[apps-in-toss.com](https://apps-in-toss.com) → 앱 만들기:
- appName: `earthbeyond` ← granite.config.ts와 동일해야 함
- 표시 이름: `Earth & Beyond`
- 카테고리: 게임 → 퍼즐
- 등급분류증명서: IARC PDF 업로드

### 4-3. 실제 Toss SDK 연동

`TossPOC/earthbeyond-toss/src/toss-bridge.js` 의 stub 메서드를 실제 SDK API로 교체:
- `init()` → SDK 초기화
- `login()` → `appLogin()` 호출 + 백엔드 토큰 교환
- `requestRewardedAd()` → 앱인토스 광고 SDK
- `purchase()` → 인앱결제 IAP

`granite.config.ts` permissions 업데이트:
```typescript
permissions: ['login', 'inapp-purchase'],
```

### 4-4. .ait 번들 배포

```bash
npx ait token add
npx ait deploy -m "v1.0.0 초기 배포"
```

### 4-5. 검수 제출 → 출시

| 검수 단계 | 예상 소요 |
|---|---|
| 운영 검수 | 1~2일 |
| 기능 검수 | 1~2일 |
| 디자인 검수 | 1일 |
| 보안 검수 | 1~2일 |

총 5~7 영업일 후 "출시하기" 클릭 → `intoss://earthbeyond` 로 토스앱에 노출

---

*작성일: 2026-06-16*
