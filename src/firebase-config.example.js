/* firebase-config.example.js — 설정 템플릿
   ════════════════════════════════════════════════════════════════════
   이 파일을 firebase-config.js 로 복사한 뒤 실제 값을 입력하세요.
   firebase-config.js 는 .gitignore 에 등록되어 레포에 커밋되지 않습니다.

   ── 설정 절차 ─────────────────────────────────────────────────────
   1. https://console.firebase.google.com → 프로젝트 선택
   2. 프로젝트 설정(⚙) → 일반 → 앱(</>) → SDK 구성 → 아래 값 복사
   3. Firestore Database → 규칙 탭 → 아래 보안 규칙 붙여넣기 후 게시
   4. (권장) Google Cloud Console → API & Services → firebase-config.js 의
      apiKey 선택 → HTTP 리퍼러 제한 → Playgama 도메인만 허용

   ── Firestore Security Rules ──────────────────────────────────────
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // Daily 점수: 하루 1건 · 점수 0-99999 · 본인만 쓰기 불가(익명)
       // → 쓰기 개방, 읽기 개방. 스팸 방어는 score 범위 + rate limit으로.
       match /puzzle_scores/{docId} {
         allow read: if true;
         allow write: if request.resource.data.score is int
                      && request.resource.data.score >= 0
                      && request.resource.data.score <= 99999
                      && request.resource.data.playerId is string
                      && request.resource.data.playerId.size() <= 64;
       }

       // 리더보드 캐시 문서: 서버에서만 쓰기 (클라이언트 직접 쓰기 차단)
       // 현재는 클라이언트가 직접 query 하므로 puzzle_scores 만 사용.
       // Cloud Functions 도입 시 이 규칙 활성화.
       match /puzzle_lb/{docId} {
         allow read: if true;
         allow write: if false;   // Functions only
       }

       // Collection 모드 리더보드 (모드별 네임스페이스)
       // docId = "{mode}_{date}_{playerId}"
       // 현재는 puzzle_scores 에 mode 필드로 구분 (별도 컬렉션 불필요).
     }
   }
   ──────────────────────────────────────────────────────────────────

   ── 컬렉션 구조 ───────────────────────────────────────────────────
   puzzle_scores/{mode}_{date}_{playerId}
     · playerId  : string   (localStorage puzzle_player_id)
     · score     : number   (daily=별 수, collection=점수)
     · date      : string   (YYYY-MM-DD UTC)
     · mode      : string   ('daily' | 'collection' | ...)
     · ts        : timestamp
     · [meta]    : 추가 필드 (bestRun, level 등)

   puzzle_lb/{date}  ← 향후 Cloud Functions 집계 캐시 (현재 미사용)
*/

window.SG_FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
