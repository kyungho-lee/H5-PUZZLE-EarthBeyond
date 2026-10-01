/* build-playgama.mjs — Playgama submission zip from src/. Names use '/'.
   v0.9.1 (LH 게이트 이식 — scripts/playgama-gates.js):
     DEV 블록 제거 → firebase.js · crazygames.js · firebase-config.js 를 no-op 스텁으로 → 게이트 검사
     (index.html 최상위 · '/' · 라틴 파일명 · Bridge CDN 외 외부 URL 없음 · 분석 도구 없음 ·
      save-store.js 외 직접 저장소 없음 · DEV 잔존 없음 · 인라인 스크립트 문법 · Bridge 태그 1개 ·
      package.json ↔ APP_VERSION · config 에 playgama_sandbox) → themes/ 전부 포함 확인 → zip.
   실패하면 exit 1, zip 없음. 작업 트리가 더러우면 거절(--force 로 무시).
   Usage: npm run build:playgama [-- --force] */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { writeZip, listZip } = require('./zip-writer.js');
const { checkBuild, stripDev, applyStubs } = require('./playgama-gates.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'build');
const EXCLUDE = [/^\./, /\.example\.js$/, /^firebase-config\.js$/, /\.md$/];

const git = (...a) => (spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout || '').trim();
if (git('status', '--porcelain') && !process.argv.includes('--force')) {
  console.error('working tree is dirty — commit first or pass --force');
  process.exit(1);
}

function walk(dir, rel = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.some(re => re.test(d.name))) continue;
    const r = rel ? rel + '/' + d.name : d.name;
    if (d.isDirectory()) out.push(...walk(path.join(dir, d.name), r));
    else out.push(r);
  }
  return out.sort();
}

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const srcNames = walk(SRC);
const files = applyStubs(stripDev(srcNames.map(name => ({ name, data: fs.readFileSync(path.join(SRC, ...name.split('/'))) }))));
const errs = checkBuild(files, version);
if (errs.length) {
  console.error('build:playgama FAILED\n  - ' + errs.join('\n  - '));
  process.exit(1);
}

const zip = writeZip(files);
const names = listZip(zip);
const themeFiles = srcNames.filter(f => f.startsWith('themes/'));
const bad = names.filter(n => n.includes('\\'));
const missing = themeFiles.filter(f => !names.includes(f));
if (bad.length || missing.length || !names.includes('index.html') || names.length !== files.length) {
  console.error('zip check failed', { bad, missing });
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `earth-and-beyond-${version}-${git('rev-parse', '--short', 'HEAD')}.zip`);
fs.writeFileSync(out, zip);
const dirty = git('status', '--porcelain', '--', 'src') ? ' (src has uncommitted changes)' : '';
console.log(`✓ ${path.relative(ROOT, out).split(path.sep).join('/')}  ${names.length} files (${themeFiles.length} under themes/)  ${zip.length} bytes${dirty}`);
