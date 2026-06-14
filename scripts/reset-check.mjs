/* reset-check.mjs — verify devResetAll() wipes daily + all game data.
   Seeds localStorage with daily/best/settings/firebase keys, stubs confirm,
   runs the reset logic, asserts neondrift_* and puzzle_player_id are gone
   while sg_dev is preserved. Run: node scripts/reset-check.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/') + '?dev';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
await page.waitForTimeout(600);

// Seed realistic data (incl. two date-keyed daily states) + dev flag.
await page.evaluate(() => {
  localStorage.setItem('neondrift_best', '12345');
  localStorage.setItem('neondrift_player_id', 'np_abc');
  localStorage.setItem('neondrift_haptic', 'off');
  localStorage.setItem('neondrift_soundpack', 'retro');
  localStorage.setItem('neondrift_daily_2026-06-12', JSON.stringify({ date: '2026-06-12', stars: 9 }));
  localStorage.setItem('neondrift_daily_2026-06-11', JSON.stringify({ date: '2026-06-11', stars: 4 }));
  localStorage.setItem('puzzle_player_id', 'p_xyz');
  localStorage.setItem('sg_dev', '1');
});

const before = await page.evaluate(() => Object.keys(localStorage).sort());

// Call the REAL devResetAll (auto-confirm). It calls location.reload() at the
// end — localStorage survives reload, so read keys after the nav settles.
await page.evaluate(() => { window.confirm = () => true; });
await Promise.all([
  page.waitForLoadState('load'),
  page.evaluate(() => window.devResetAll && window.devResetAll()),
]);
await page.waitForTimeout(400);
const after = await page.evaluate(() => Object.keys(localStorage).sort());

// After reset, boot re-creates TODAY's daily as a FRESH (stars:0) state via
// loadDaily — that's expected. The real test: prior data is gone and today is
// reset to zero. Read today's daily value + leftover keys.
const todayKey = await page.evaluate(() => 'neondrift_daily_' + new Date().toISOString().slice(0, 10));
const todayVal = await page.evaluate((k) => {
  const v = localStorage.getItem(k);
  try { return JSON.parse(v); } catch (_) { return v; }
}, todayKey);

await browser.close();

// Anything other than today's freshly-rebuilt daily must be gone.
const leftover = after.filter(k =>
  k !== 'sg_dev' && k !== todayKey && k.indexOf('neondrift_') === 0);
const yesterdayGone = !after.includes('neondrift_daily_2026-06-11');
const bestGone = !after.includes('neondrift_best');
const fbPlayerGone = !after.includes('puzzle_player_id');
const devKept = after.includes('sg_dev');
const todayReset = todayVal && todayVal.stars === 0 && todayVal.retriesUsed === 0;

let pass = true;
const check = (n, c) => { console.log((c ? '✓' : '✗') + ' ' + n); if (!c) pass = false; };
console.log('before:', before.join(', '));
console.log('after :', after.join(', ') || '(empty)');
console.log("today's daily:", JSON.stringify(todayVal));
console.log('');
check('best score removed', bestGone);
check('past-date daily removed', yesterdayGone);
check('firebase puzzle_player_id removed', fbPlayerGone);
check("today's daily reset to fresh (stars:0, retriesUsed:0)", todayReset);
check('no stale neondrift_* leftovers', leftover.length === 0);
check('sg_dev preserved (dev stays on)', devKept);

console.log('\n' + (pass ? 'RESET CHECK PASSED ✓' : 'RESET CHECK FAILED ✗'));
process.exit(pass ? 0 : 1);
