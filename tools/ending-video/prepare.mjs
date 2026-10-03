/* prepare.mjs — 엔딩 컴포지션 준비물을 게임 원본에서 복사한다 (게임 파일은 읽기만).
   src/themes/**  → assets/img/<theme>/  (bg-step-*.webp · board-bg.webp · step-*.webp — 게임에 있는 그림만)
   src/fonts/*.woff2 → assets/fonts/
   src/ending/credits.js → assets/credits.js  (게임과 같은 크레딧 데이터 한 벌)
   Usage: node tools/ending-video/prepare.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..', 'src');
const A = path.join(HERE, 'assets');
const THEMES = ['primordial-earth', 'human-civilization', 'solar-system'];
let n = 0;
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); n++; };

for (const t of THEMES) {
  for (const f of fs.readdirSync(path.join(SRC, 'themes', t))) {
    if (/^(bg-step-\d\d|board-bg|step-\d\d)\.webp$/.test(f)) cp(path.join(SRC, 'themes', t, f), path.join(A, 'img', t, f));
  }
}
for (const f of fs.readdirSync(path.join(SRC, 'fonts'))) if (f.endsWith('.woff2')) cp(path.join(SRC, 'fonts', f), path.join(A, 'fonts', f));
cp(path.join(SRC, 'ending', 'credits.js'), path.join(A, 'credits.js'));
console.log('✓ prepared ' + n + ' files → ' + path.relative(process.cwd(), A));
