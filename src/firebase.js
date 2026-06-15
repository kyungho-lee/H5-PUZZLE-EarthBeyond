/* firebase.js — NeonDrift v1 — Firebase Firestore backend
   ═══════════════════════════════════════════════════════════════════
   Firebase SDK v8 (compat) 래퍼.  H5 게임에서 v8 compat을 쓰는 이유:
   · <script> 태그로 로드 가능 (module bundler 불필요)
   · file:// 로컬 테스트 시 CORS 없음
   · Playgama 플랫폼에서 추가 빌드 단계 없이 동작

   ┌─────────────────────────────────────────────────────────────────┐
   │  firebase-config.js 값이 "YOUR_..."  →  DEMO 모드 (더미 데이터) │
   │  실제 값 입력 + HTTPS 서버           →  Firestore 연결          │
   └─────────────────────────────────────────────────────────────────┘

   컬렉션 구조:
     earthbeyond_scores/{mode}_{date}_{playerId}
       · playerId  : string   (localStorage puzzle_player_id)
       · score     : number
       · date      : string   YYYY-MM-DD UTC
       · mode      : string   'daily' | 'collection' | (없으면 main)
       · ts        : serverTimestamp
       · [meta]    : bestRun, level 등 옵션 필드

   모드별 리더보드:
     · Daily      → mode:'daily',      score=오늘 총 ⭐별
     · Collection → mode:'collection', score=컬렉션 점수 (향후)
     · (Main)     → mode 없음,         score=게임 점수 (레거시)
*/
(function (global) {
  'use strict';

  const SG = global.SG = global.SG || {};

  const SCORES_COL = 'earthbeyond_scores';   // 프로젝트별 고유 컬렉션명

  let db = null;

  function isConnected() { return !!db; }

  function getPlayerId() {
    let id = localStorage.getItem('puzzle_player_id');
    if (!id) {
      try {
        const arr = new Uint8Array(8);
        (global.crypto || global.msCrypto).getRandomValues(arr);
        id = 'p_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      }
      localStorage.setItem('puzzle_player_id', id);
    }
    return id;
  }

  // ── Firebase SDK v8 compat 동적 로드 ─────────────────────────────
  async function _loadFirebase() {
    if (global.firebase) return true;
    const CDN = 'https://www.gstatic.com/firebasejs/8.10.1/';
    const scripts = [
      CDN + 'firebase-app.js',
      CDN + 'firebase-firestore.js',
    ];
    for (const src of scripts) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = () => res(); s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    return true;
  }

  // ── 초기화 ───────────────────────────────────────────────────────
  async function init() {
    const cfg = global.SG_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || cfg.apiKey.startsWith('YOUR_')) {
      console.log('[SG.FB] No config — DEMO mode');
      return false;
    }
    const proto = typeof location !== 'undefined' ? location.protocol : '';
    if (proto === 'file:') {
      console.log('[SG.FB] file:// — Firestore skipped');
      return false;
    }
    try {
      await _loadFirebase();
      if (!global.firebase.apps.length) global.firebase.initializeApp(cfg);
      db = global.firebase.firestore();
      console.log('[SG.FB] Firestore connected · project:', cfg.projectId);
      // IP 조회를 백그라운드로 미리 실행 → 캐시 채우기 (submitScore 시 동기 읽기 가능)
      detectCountryAsync().then(function (cc) {
        console.log('[SG.FB] country detected:', cc);
      }).catch(function () {});
      return true;
    } catch (e) {
      console.warn('[SG.FB] init failed:', e);
      if (SG.Notify) SG.Notify.error('FB_SDK_INIT');
      return false;
    }
  }

  // mode + date + playerId 로 문서 키 생성.
  // mode 없으면 레거시 "{date}_{pid}" (main 점수 하위호환).
  function _docKey(mode, date, pid) {
    return (mode ? mode + '_' : '') + date + '_' + pid;
  }

  // ── 점수 저장 ────────────────────────────────────────────────────
  // meta 옵션:
  //   mode    : 'daily' | 'collection' | undefined
  //   bestRun : number  (Daily: 단일 run 최고 별)
  //   level   : number  (Main)
  //   maxChain: number  (Main)
  async function submitScore(score, meta) {
    if (!db) return;
    const pid     = getPlayerId();
    const date    = new Date().toISOString().slice(0, 10);
    const mode    = meta && meta.mode;
    // 캐시 있으면 즉시, 없으면 IP 조회 후 저장 (게임 시작부터 미리 호출돼 있음)
    const country = await detectCountryAsync().catch(function () { return detectCountry(); });
    try {
      await db.collection(SCORES_COL).doc(_docKey(mode, date, pid)).set({
        playerId: pid,
        score,
        date,
        country,
        ...(meta || {}),
        ts: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('[SG.FB] submitScore failed:', e);
      if (SG.Notify) SG.Notify.error('FB_SUBMIT', {
        retry: () => submitScore(score, meta),
      });
    }
  }

  // ── 리더보드 조회 ─────────────────────────────────────────────────
  // opts.mode : 'daily' | 'collection' | undefined → 해당 모드만 필터
  // opts.limit: 조회 건수 (기본 20)
  // 연결 없으면 _demoLeaderboard() 반환 (DEMO 배지 표시용).
  async function fetchLeaderboard(date, opts) {
    if (!db) return _demoLeaderboard();
    const mode  = opts && opts.mode;
    const top   = (opts && opts.limit) || 20;
    const day   = date || new Date().toISOString().slice(0, 10);
    try {
      let q = db.collection(SCORES_COL).where('date', '==', day);
      if (mode) q = q.where('mode', '==', mode);
      const snap = await q.orderBy('score', 'desc').limit(top).get();
      return snap.docs.map(d => d.data());
    } catch (e) {
      console.warn('[SG.FB] fetchLeaderboard failed:', e);
      if (SG.Notify) SG.Notify.error('FB_FETCH', { retry: () => fetchLeaderboard(date, opts) });
      return _demoLeaderboard();
    }
  }

  // ── 국가 코드 감지 (IP 기반) ──────────────────────────────────────
  // ipapi.co: 무료, API 키 불필요, 1000 req/day
  // 캐시: localStorage에 당일 결과 저장 → 매 세션마다 호출 안 함
  var _CC_CACHE_KEY = 'earthbeyond_cc';
  var _ccPromise = null;   // 중복 호출 방지

  function _langFallback() {
    // IP 조회 실패 시 브라우저 언어로 최선 추측
    try {
      var langs = (navigator.languages && navigator.languages.length)
        ? Array.from(navigator.languages) : [navigator.language || ''];
      var map = { ko:'KR', ja:'JP', zh:'CN', de:'DE', fr:'FR', es:'ES',
                  pt:'BR', ru:'RU', ar:'SA', hi:'IN', id:'ID', tr:'TR',
                  vi:'VN', th:'TH', nl:'NL', pl:'PL', it:'IT', sv:'SE' };
      for (var i = 0; i < langs.length; i++) {
        var p = langs[i].split('-');
        if (p.length >= 2) return p[p.length - 1].toUpperCase();
      }
      for (var j = 0; j < langs.length; j++) {
        var lc = langs[j].split('-')[0].toLowerCase();
        if (map[lc]) return map[lc];
      }
    } catch (_) {}
    return 'US';
  }

  // 비동기 IP 조회 + 캐시. 결과: ISO 3166-1 alpha-2 문자열
  async function detectCountryAsync() {
    if (_ccPromise) return _ccPromise;
    _ccPromise = (async function () {
      // 캐시: 오늘 날짜 키로 저장
      try {
        var cached = JSON.parse(localStorage.getItem(_CC_CACHE_KEY) || 'null');
        var today  = new Date().toISOString().slice(0, 10);
        if (cached && cached.date === today && cached.cc) return cached.cc;
      } catch (_) {}
      try {
        var r  = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
        var d  = await r.json();
        var cc = (d.country_code || '').toUpperCase() || _langFallback();
        try {
          localStorage.setItem(_CC_CACHE_KEY, JSON.stringify({
            date: new Date().toISOString().slice(0, 10), cc: cc,
          }));
        } catch (_) {}
        return cc;
      } catch (_) {
        return _langFallback();
      }
    })();
    return _ccPromise;
  }

  // 동기 버전 — 캐시 있으면 즉시, 없으면 fallback (submitScore에서 사용)
  function detectCountry() {
    try {
      var cached = JSON.parse(localStorage.getItem(_CC_CACHE_KEY) || 'null');
      var today  = new Date().toISOString().slice(0, 10);
      if (cached && cached.date === today && cached.cc) return cached.cc;
    } catch (_) {}
    return _langFallback();
  }

  // ISO 3166-1 alpha-2 → 국기 이모지 (flag emoji = regional indicator letters)
  function countryFlag(cc) {
    try {
      if (!cc || cc.length !== 2) return '🌐';
      var base = 0x1F1E6 - 65;
      return String.fromCodePoint(base + cc.charCodeAt(0)) +
             String.fromCodePoint(base + cc.charCodeAt(1));
    } catch (_) { return '🌐'; }
  }

  function _demoLeaderboard() {
    return [
      { playerId: 'demo_1', score: 9800, country: 'KR' },
      { playerId: 'demo_2', score: 7200, country: 'US' },
      { playerId: 'demo_3', score: 5100, country: 'JP' },
      { playerId: 'demo_4', score: 3400, country: 'DE' },
      { playerId: 'demo_5', score: 1200, country: 'BR' },
    ];
  }

  SG.FB = { init, isConnected, getPlayerId, submitScore, fetchLeaderboard,
            detectCountry, countryFlag, _demoRows: _demoLeaderboard };

})(typeof window !== 'undefined' ? window : global);
