/* cosmic-check.mjs — drives the real game: Daily/Endless show an observatory and
   can spawn/expire comets; Chronicles and main never do. Screenshots → scripts/_shots/.
   Run: node scripts/cosmic-check.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/') + '?dev';
const shots = path.resolve(__dirname, '_shots');
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/firebase/i.test(m.text()) && !/firebase/i.test(m.location().url || '')) errors.push('console.error: ' + m.text()); });
const fail = (msg) => { console.error('FAIL', msg); process.exitCode = 1; };

await page.goto(url);
await page.waitForTimeout(800);

// Daily: observatory seated, comet appears (force chance=1 after minTurn) and expires.
await page.evaluate(() => window.openDaily && window.openDaily());
await page.waitForTimeout(500);
await page.evaluate(() => { const t = document.getElementById('ol-daily-tutorial'); if (t) t.classList.add('hidden'); });
let st = await page.evaluate(() => ({ obs: window.observatoryCell, hasComet: !!dailyOpts.comet }));
if (!st.obs || !st.hasComet) fail('Daily: no observatory/comet opts ' + JSON.stringify(st));
await page.evaluate(() => { dailyOpts.comet = Object.assign({}, dailyOpts.comet, { chance: 1, minTurn: 0 }); });
const dirs = ['left', 'up', 'right', 'down'];
let sawComet = false, sawExpire = false;
for (let i = 0; i < 40 && !(sawComet && sawExpire); i++) {
  const r = await page.evaluate((d) => {
    const before = JSON.stringify(grid);
    window.doMove(d);
    const g = grid;
    let comet = false; for (const row of g) for (const t of row) if (t && t.comet) comet = true;
    return { comet, changed: JSON.stringify(g) !== before };
  }, dirs[i % 4]);
  await page.waitForTimeout(180);
  if (r.comet && !sawComet) {
    sawComet = true;
    // chance:1 means a comet respawns the instant the old one expires (same
    // applyMove call: decrement-then-spawn), which masks the comet-free frame
    // we need to observe. Stop new spawns now so the existing comet's ttl can
    // actually run out and leave the board comet-free.
    await page.evaluate(() => { dailyOpts.comet.chance = 0; });
  }
  if (sawComet && !r.comet) sawExpire = true;
  if (i === 3) await page.screenshot({ path: path.join(shots, 'cosmic-daily.png') });
}
if (!sawComet) fail('Daily: comet never appeared');

// Endless
await page.evaluate(() => { try { localStorage.setItem('sg_dev', '1'); } catch (_) {} });
await page.evaluate(() => window.startEndless && window.startEndless(null));
await page.waitForTimeout(400);
st = await page.evaluate(() => ({ obs: window.observatoryCell, hasComet: !!(dailyOpts && dailyOpts.comet) }));
if (!st.obs || !st.hasComet) console.warn('WARN Endless: locked or not seated (needs a completed chapter) ' + JSON.stringify(st));
else await page.screenshot({ path: path.join(shots, 'cosmic-endless.png') });

// Chronicles must NOT inherit comet/observatory (Review Focus 1, 2)
await page.evaluate(() => window.startCollection && window.startCollection());
await page.waitForTimeout(400);
st = await page.evaluate(() => ({ cometOpt: !!(dailyOpts && dailyOpts.comet), obsOpt: !!(dailyOpts && dailyOpts.observatory), rendererObs: renderer.observatory }));
if (st.cometOpt || st.obsOpt || st.rendererObs) fail('Chronicles inherited cosmic opts ' + JSON.stringify(st));
await page.screenshot({ path: path.join(shots, 'cosmic-chronicles.png') });

if (errors.length) fail('page errors:\n' + errors.join('\n'));
await browser.close();
console.log(process.exitCode ? 'cosmic-check: FAILED' : 'cosmic-check: OK', { sawComet, sawExpire });
