/* playgama-gates.js — Earth & Beyond 빌드를 zip 전에 Playgama 규칙으로 검사한다 (v0.9.1, LH scripts/playgama-gates.js 이식).
   Pure: [{ name, data: Buffer }] + package version → 문제 목록([] = 통과).
   scripts/build-playgama.mjs 와 test/build-gates.test.js 가 쓴다.
   EB 에 맞춘 곳: 저장 허용 파일 = save-store.js · firebase.js / crazygames.js / firebase-config.js 는 Playgama zip 에서
   no-op 스텁(scripts/playgama-stubs/)으로 바꾼다 · DEV 블록은 JS(// DEV-BEGIN … // DEV-END)와 HTML(<!-- DEV-BEGIN --> … <!-- DEV-END -->) 둘 다. */
'use strict';
const fs = require('fs');
const path = require('path');

const BRIDGE_URL = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';
const ALLOWED_URL_PREFIXES = [BRIDGE_URL, 'http://www.w3.org/'];          // w3.org = SVG namespace 문자열, 요청하지 않음
const TEXT = /\.(html|js|json|css|txt|svg)$/;
const NAME_OK = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
const STORE_FILE = 'save-store.js';                                       // 브라우저 저장소를 만져도 되는 유일한 파일
// 실제 분석 · 추적 SDK 의 흔적 (EB 는 'Firebase' 를 주석 · 파일명으로 부르므로 SDK 호출 형태만 잡는다)
const ANALYTICS = /google-analytics|googletagmanager|gtag\(|firebasejs|firebaseio\.com|firebase\.(initializeApp|firestore|analytics|auth)\b|ipapi\.co|mc\.yandex|metrika|amplitude|mixpanel|segment\.(io|com)|hotjar|clarity\.ms|connect\.facebook|sentry\.io|Sentry\.init/i;
const DEV_LEFTOVERS = /DEV-BEGIN|DEV-END|id="dev-bar"|devResetAll|devUnlockActiveTheme|devStartDaily|devToggleCheat|\bsg_dev\b/;
// Playgama zip 에서 스텁으로 바꾸는 파일 — 스텁에는 이 표식이 있어야 한다
const STUBS = ['firebase.js', 'crazygames.js', 'firebase-config.js'];
const STUB_MARK = 'PLAYGAMA-STUB';
const STUB_DIR = path.join(__dirname, 'playgama-stubs');

// 폰트 라이선스 본문(OFL)은 게임이 요청하지 않는 문서라 URL 검사에서 뺀다 (본문에 http://scripts.sil.org/OFL 이 있다)
const LICENSE_TEXT = /^fonts\/OFL[A-Za-z0-9._-]*\.txt$/;
// v0.9.2 엔딩 영상: zip 안 로컬 mp4 만, 한 파일 6MB 이하(저가 모바일 엔딩 진입 대기 기준 — docs/ending/ending-credits-plan.md 4장)
const MEDIA = /\.(mp4|webm|mov|m4v)$/i;
const MEDIA_MAX_BYTES = 6 * 1024 * 1024;

const DEV_BLOCK_JS = /^[ \t]*\/\/ DEV-BEGIN[\s\S]*?\/\/ DEV-END[^\n]*\n?/gm;
const DEV_BLOCK_HTML = /^[ \t]*<!-- DEV-BEGIN -->[\s\S]*?<!-- DEV-END -->[^\n]*\n?/gm;
function stripDev(files) {
  return files.map(f => {
    if (!/\.(html|js)$/.test(f.name)) return f;
    const s = f.data.toString('utf8'), out = s.replace(DEV_BLOCK_JS, '').replace(DEV_BLOCK_HTML, '');
    return out === s ? f : { name: f.name, data: Buffer.from(out) };
  });
}
// firebase.js · crazygames.js · firebase-config.js → no-op 스텁 (없던 firebase-config.js 도 넣는다: index.html 이 부르므로 404 방지)
function applyStubs(files) {
  const out = files.filter(f => !STUBS.includes(f.name));
  for (const name of STUBS) out.push({ name, data: fs.readFileSync(path.join(STUB_DIR, name)) });
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
// index.html 의 인라인 <script> 가 문법 오류 없이 읽히는지 — 실행하지 않고 컴파일만.
function inlineScriptErrors(html) {
  const errs = [], re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, k = 0;
  while ((m = re.exec(html))) {
    if (m[1] && /\bsrc\s*=/.test(m[1])) continue;
    k++;
    try { new Function(m[2]); } catch (e) { errs.push('inline <script> #' + k + ' in index.html does not parse: ' + e.message); }
  }
  return errs;
}

// package.json 0.9.1 → 'v0.9.1', 0.9.0 → 'v0.9' (EB 표기 — 패치 0 은 생략)
function expectedAppVersion(version) {
  const [maj, min, pat] = String(version).split('.');
  return 'v' + maj + '.' + min + (pat && pat !== '0' ? '.' + pat : '');
}

function checkBuild(files, version) {
  const errs = [];
  const byName = new Map(files.map(f => [f.name, f]));
  const text = f => (TEXT.test(f.name) ? f.data.toString('utf8') : null);

  if (!byName.has('index.html')) errs.push('index.html missing at the zip root');
  for (const f of files) {
    if (f.name.includes('\\')) errs.push('backslash in file name: ' + f.name);
    else if (!NAME_OK.test(f.name)) errs.push('file name not latin: ' + f.name);
  }

  for (const f of files) {
    const s = text(f);
    if (s == null) continue;
    for (const m of (LICENSE_TEXT.test(f.name) ? [] : s.matchAll(/https?:\/\/[^\s'"`)<>]+/g))) {
      if (!ALLOWED_URL_PREFIXES.some(p => m[0].startsWith(p))) errs.push('external URL in ' + f.name + ': ' + m[0]);
    }
    if (/(src|href)\s*=\s*["']\/\//i.test(s)) errs.push('protocol-relative URL in ' + f.name);
    if (ANALYTICS.test(s)) errs.push('analytics / tracking reference in ' + f.name + ': ' + s.match(ANALYTICS)[0]);
    if (f.name !== STORE_FILE && /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/.test(s)) {
      errs.push('direct browser storage in ' + f.name + ' (only ' + STORE_FILE + ' may)');
    }
    if (DEV_LEFTOVERS.test(s)) errs.push('dev tool leftover in ' + f.name + ': ' + s.match(DEV_LEFTOVERS)[0]);
  }

  for (const f of files) {
    if (!MEDIA.test(f.name)) continue;
    if (!/\.mp4$/i.test(f.name)) errs.push('video must be H.264 .mp4 (one file, iOS Safari): ' + f.name);
    if (f.data.length > MEDIA_MAX_BYTES) errs.push('video over 6MB: ' + f.name + ' (' + f.data.length + ' bytes)');
  }
  // 폰트 파일을 재배포하면 OFL 본문을 함께 넣는다
  const fonts = files.filter(f => /^fonts\/.+\.(woff2?|ttf|otf)$/.test(f.name));
  if (fonts.length && !files.some(f => LICENSE_TEXT.test(f.name))) errs.push('fonts/ ships font files without an OFL license text (fonts/OFL-*.txt)');

  for (const name of STUBS) {
    const f = byName.get(name);
    if (f && !f.data.toString('utf8').includes(STUB_MARK)) errs.push(name + ' must be the no-op stub in the Playgama zip');
  }

  const idx = byName.get('index.html');
  if (idx) {
    const s = idx.data.toString('utf8');
    const tags = s.split(BRIDGE_URL).length - 1;
    if (!new RegExp('<script src="' + BRIDGE_URL.replace(/[.\/]/g, '\\$&') + '"></script>').test(s) || tags !== 1) {
      errs.push('index.html must load the Bridge SDK with exactly one static <script src="' + BRIDGE_URL + '">');
    }
    const v = s.match(/const APP_VERSION = '([^']+)'/);
    if (!v) errs.push('APP_VERSION not found in index.html');
    else if (v[1] !== expectedAppVersion(version)) errs.push(`version mismatch: package.json ${version} → expected APP_VERSION '${expectedAppVersion(version)}', index.html has '${v[1]}'`);
    errs.push(...inlineScriptErrors(s));
  }

  const cfg = byName.get('playgama-bridge-config.json');
  if (!cfg) errs.push('playgama-bridge-config.json missing');
  else {
    try {
      const c = JSON.parse(cfg.data.toString('utf8'));
      const pf = (((c.saas || {}).leaderboards || {}).platforms) || [];
      if (!pf.includes('playgama_sandbox')) errs.push('playgama-bridge-config.json: saas.leaderboards.platforms must include playgama_sandbox');
    } catch (e) { errs.push('playgama-bridge-config.json is not valid JSON'); }
  }
  return errs;
}

module.exports = { MEDIA_MAX_BYTES, checkBuild, stripDev, applyStubs, inlineScriptErrors, expectedAppVersion, BRIDGE_URL, STORE_FILE, STUBS };
