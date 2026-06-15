/* make-cover.mjs  [Earth & Beyond]
   Playgama submission cover images — 3 sizes.
   Output: scripts/_submit/
     cover-square.png    800×800   (1:1)
     cover-portrait.png  1080×1920 (9:16)
     cover-landscape.png 1920×1080 (16:9)
   Run: node scripts/make-cover.mjs
   (Requires local server: cd src && python -m http.server 8081) */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '_submit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:8081';
const browser = await chromium.launch();

const SIZES = [
  { name: 'cover-square',    w: 800,  h: 800  },
  { name: 'cover-portrait',  w: 1080, h: 1920 },
  { name: 'cover-landscape', w: 1920, h: 1080 },
];

for (const { name, w, h } of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    storageState: { cookies: [], origins: [] },
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(2000);

  // 히어로 화면만 표시
  await page.evaluate(() => {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    const start = document.getElementById('ol-start');
    if (start) { start.classList.remove('hidden'); start.style.display = ''; }
    if (window.showStart) window.showStart();
    // dev-bar 숨기기
    const devBar = document.getElementById('dev-bar');
    if (devBar) devBar.style.display = 'none';
    const toastRoot = document.getElementById('sg-toast-root');
    if (toastRoot) toastRoot.innerHTML = '';
  });

  await page.waitForTimeout(600);

  const outPath = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: outPath });
  await ctx.close();
  console.log(`✓ ${name}.png  (${w}×${h})`);
}

await browser.close();
console.log('\n✅ Cover images saved to:', outDir);
