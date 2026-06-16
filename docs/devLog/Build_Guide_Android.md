# Earth & Beyond — Android 빌드 가이드

**작성일:** 2026-06-17
**프로젝트:** `TossPOC/earthbeyond-toss`
**패키지:** `com.zenga.earthbeyond`
**타겟 SDK:** 34 / 최소 SDK: 22

---

## 사전 준비

| 도구 | 버전 | 다운로드 |
|------|------|----------|
| Android Studio | Hedgehog 이상 | developer.android.com/studio |
| JDK | 17 (Android Studio 번들) | 별도 설치 불필요 |
| Node.js | 18 이상 | nodejs.org |

---

## Step 1 — 웹 빌드 (Vite → dist/)

```powershell
cd TossPOC/earthbeyond-toss
npm install          # 최초 1회
npm run build        # dist/ 생성
npx cap sync         # dist/ → android/app/src/main/assets/public/ 복사
```

> `cap sync`는 웹 코드 변경할 때마다 실행해야 Android에 반영됨.

---

## Step 2 — Android Studio에서 열기

```powershell
npx cap open android
```

또는 Android Studio → **File → Open** → `TossPOC/earthbeyond-toss/android` 선택

### Gradle Sync
- 열리면 자동으로 Gradle sync 시작 (~3분)
- 하단 **Build** 탭에서 `BUILD SUCCESSFUL` 확인

---

## Step 3 — 에뮬레이터 / 실기기 테스트 (Debug 빌드)

### 에뮬레이터 생성
1. Android Studio → **Device Manager** (우측 패널)
2. **Create Virtual Device** → Pixel 7 → API 34 → Finish

### 실기기 연결
1. 기기 설정 → 개발자 옵션 → USB 디버깅 ON
2. USB 연결 후 Android Studio 상단 드롭다운에서 기기 선택

### 실행
상단 ▶ **Run** 버튼 클릭

**체크리스트:**
- [ ] 앱 아이콘으로 설치됨
- [ ] Canvas 게임 렌더 정상
- [ ] 터치/스와이프 컨트롤 동작
- [ ] 세로 모드 고정 (기기 회전해도 가로 전환 안 됨)
- [ ] 사운드 재생

---

## Step 4 — Release AAB 빌드 (Play Store 제출용)

### 4-1. Keystore 생성 (최초 1회)

Android Studio → **Build → Generate Signed Bundle / APK**

1. **Android App Bundle** 선택 → Next
2. **Create new...** 클릭:

| 항목 | 값 |
|------|-----|
| Key store path | 프로젝트 외부 안전한 위치 (예: `C:/keystore/earthbeyond.jks`) |
| Password | 강력한 비밀번호 설정 |
| Alias | `earthbeyond-key` |
| Key Password | keystore 비밀번호와 동일 가능 |
| Validity | 25 years |
| First and Last Name | 개발자 이름 |

> ⚠️ **keystore는 분실 시 복구 불가. Google Drive 등 외부에 반드시 백업.**
> ⚠️ **keystore 비밀번호도 별도 기록 필수.**

3. **Next** → Build Variant: **release** → **Finish**

### 4-2. 결과물 위치

```
android/app/build/outputs/bundle/release/app-release.aab
```

### 4-3. 이후 버전 업데이트 시

`build.gradle`에서 버전 올리고 AAB 재빌드:

```groovy
// android/app/build.gradle
versionCode 2          // 출시할 때마다 +1 (정수, 되돌릴 수 없음)
versionName "1.1.0"    // 사용자에게 보이는 버전
```

---

## Step 5 — Play Console 업로드

1. [play.google.com/console](https://play.google.com/console) 접속
2. Earth & Beyond 앱 → **테스트 → 내부 테스트 → 새 버전 만들기**
3. `app-release.aab` 업로드
4. 출시 노트 입력 → **검토 제출**

---

## 빠른 재빌드 순서 (코드 수정 후)

```powershell
# 1. 웹 코드 수정 후
npm run build
npx cap sync

# 2. Android Studio에서
# Build → Clean Project → Build → Generate Signed Bundle
```

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| Gradle sync 실패 | File → Invalidate Caches → Restart |
| `cap sync` 후 변경사항 미반영 | `npm run build` 먼저 실행했는지 확인 |
| 에뮬레이터에서 사운드 없음 | 에뮬레이터 볼륨 설정 확인 (실기기에서 재테스트) |
| AAB 빌드 시 keystore 오류 | 비밀번호/경로 재확인, 공백 없어야 함 |
