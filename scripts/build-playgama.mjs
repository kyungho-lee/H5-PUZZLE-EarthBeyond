/* build-playgama.mjs — Playgama submission zip from src/. Names use '/'.
   Checks before writing: index.html at root, no '\' in names, every file under
   src/themes is in the zip. Refuses a dirty working tree unless --force.
   Usage: npm run build:playgama [-- --force] */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { writeZip, listZip } = require('./zip-writer.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'build');
const EXCLUDE = [/^\./, /\.example\.js$/, /^firebase-config\.js$/];

const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
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

const files = walk(SRC);
if (!files.includes('index.html')) { console.error('index.html missing at src root'); process.exit(1); }
const zip = writeZip(files.map(name => ({ name, data: fs.readFileSync(path.join(SRC, ...name.split('/'))) })));

const names = listZip(zip);
const themeFiles = files.filter(f => f.startsWith('themes/'));
const bad = names.filter(n => n.includes('\\'));
const missing = themeFiles.filter(f => !names.includes(f));
if (bad.length || missing.length || !names.includes('index.html')) {
  console.error('zip check failed', { bad, missing });
  process.exit(1);
}

// 버전 단일화: package.json version(0.9.0) ↔ 화면 표시 APP_VERSION('v0.9', 패치가 있으면 'v0.9.1').
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const [maj, min, pat] = version.split('.');
const expectedAppVersion = 'v' + maj + '.' + min + (pat && pat !== '0' ? '.' + pat : '');
const appVersionMatch = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8').match(/const APP_VERSION = '([^']+)'/);
if (!appVersionMatch || appVersionMatch[1] !== expectedAppVersion) {
  console.error(`version mismatch: package.json ${version} → expected APP_VERSION '${expectedAppVersion}', index.html has '${appVersionMatch && appVersionMatch[1]}'`);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `earth-and-beyond-${version}-${git('rev-parse', '--short', 'HEAD')}.zip`);
fs.writeFileSync(out, zip);
console.log(`✓ ${path.relative(ROOT, out)}  ${names.length} files (${themeFiles.length} under themes/)  ${zip.length} bytes`);
