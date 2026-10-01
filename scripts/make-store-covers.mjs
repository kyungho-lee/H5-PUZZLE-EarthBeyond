/* make-store-covers.mjs  [Earth & Beyond · v0.9.1]
   Store key-art covers composed from EXISTING tile images (docs/store/cover-keyart.html).
   No server needed (file://). Output: docs/store/v0.9.1/
     cover-square.png    800×800
     cover-portrait.png  1080×1920
     cover-landscape.png 1920×1080
     check-<name>-{160,128,72}.png   downscale previews (thumbnail legibility check, not for upload)
   Run: node scripts/make-store-covers.mjs
   (The older make-cover.mjs captured the start screen; kept for reference.) */

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const page_ = pathToFileURL(path.resolve(__dirname, '../docs/store/cover-keyart.html')).href;
const outDir = path.resolve(__dirname, '../docs/store/v0.9.1');
fs.mkdirSync(outDir, { recursive: true });

const SIZES = [
  { name: 'cover-square',    w: 800,  h: 800  },
  { name: 'cover-portrait',  w: 1080, h: 1920 },
  { name: 'cover-landscape', w: 1920, h: 1080 },
];
const CHECK_WIDTHS = [160, 128, 72];

const browser = await chromium.launch();
for (const { name, w, h } of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(page_);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
  await page.waitForTimeout(300);
  const out = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: out });
  console.log(`✓ ${name}.png (${w}×${h})`);

  // Downscale previews: render the PNG small with smooth scaling
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(out).toString('base64');
  for (const cw of CHECK_WIDTHS) {
    const ch = Math.round(cw * h / w);
    const p2 = await browser.newPage({ viewport: { width: cw, height: ch } });
    await p2.setContent(`<body style="margin:0"><img src="${dataUrl}" style="width:${cw}px;height:${ch}px;display:block"></body>`);
    await p2.waitForTimeout(150);
    await p2.screenshot({ path: path.join(outDir, `check-${name}-${cw}.png`) });
    await p2.close();
  }
  await page.close();
}
await browser.close();
console.log('Saved to', outDir);
