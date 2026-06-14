/* visual-check.mjs — drive the real game in a browser to verify:
   (1) main game starts without the setMode crash
   (2) daily mode loads
   (3) star-fly FX animates into the HUD + counter ticks up
   Screenshots saved to scripts/_shots/. Run: node scripts/visual-check.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexUrl = 'file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/') + '?dev';
const shotDir = path.resolve(__dirname, '_shots');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

await page.goto(indexUrl);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(shotDir, '1-start.png') });

// ── 1) Main game start — must NOT crash (the reported bug) ──
await page.evaluate(() => window.startGame && window.startGame());
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shotDir, '2-main.png') });
const mainCrash = errors.filter(e => e.includes("reading '0'") || e.includes('undefined'));

// ── 2) Daily mode → 3) star-fly FX ──
// openDaily() loads dailyState then starts the run (real entry path).
await page.evaluate(() => window.openDaily && window.openDaily());
await page.waitForTimeout(400);

// Read the HUD count before, trigger a star-fly of 5, capture mid-flight + after.
const before = await page.evaluate(() => document.getElementById('stat-score').textContent);
await page.evaluate(() => {
  // simulate a completed 256 target (3★) + a 64 (1★) at two cells
  window.dailyRunStars += 4;
  window.flyStarsToHud([
    { at: [1, 1], size: 256, stars: 3, removed: false },
    { at: [3, 0], size: 64,  stars: 1, removed: false },
  ]);
});
await page.waitForTimeout(550);                      // mid-hold / launch
await page.screenshot({ path: path.join(shotDir, '3-stars-launch.png') });
await page.waitForTimeout(700);                      // mid-flight
await page.screenshot({ path: path.join(shotDir, '4-stars-flight.png') });
await page.waitForTimeout(900);                      // landed
const after = await page.evaluate(() => document.getElementById('stat-score').textContent);
await page.screenshot({ path: path.join(shotDir, '5-stars-landed.png') });

// count of star nodes left over (should be 0 after landing)
const leftover = await page.evaluate(() => document.querySelectorAll('.sg-star-fly').length);

// ── 4) Daily game-over overlay flow (ad → rank → retry/menu) ──
await page.evaluate(() => window.dailyGameOver && window.dailyGameOver());
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shotDir, '6-daily-gameover.png') });
const overlayShown = await page.evaluate(() =>
  !document.getElementById('ol-daily-over').classList.contains('hidden'));
const retryVisible = await page.evaluate(() => {
  const b = document.getElementById('btn-daily-retry');
  return b && b.style.display !== 'none';
});
// dummy leaderboard rows rendered
const lbRows = await page.evaluate(() => document.querySelectorAll('#daily-lb-rows .lb-row').length);
const lbDemoBadge = await page.evaluate(() => {
  const b = document.getElementById('daily-lb-badge');
  return b && b.style.display !== 'none';
});
await page.screenshot({ path: path.join(shotDir, '6-daily-gameover.png') });

// ── 5) Practice flow: free start → game-over → ad → result overlay ──
// Reset overlays, capture daily-state snapshot to prove practice doesn't persist.
const dailyBefore = await page.evaluate(() => JSON.stringify(window.dailyState));
await page.evaluate(() => {
  document.getElementById('ol-daily-over').classList.add('hidden');
  window.startPractice && window.startPractice();
});
await page.waitForTimeout(300);
const practiceTitle = await page.evaluate(() => document.getElementById('game-title').textContent);
await page.evaluate(() => window.practiceGameOver && window.practiceGameOver());
await page.waitForTimeout(400);
const practiceOverlay = await page.evaluate(() =>
  !document.getElementById('ol-practice-over').classList.contains('hidden'));
const dailyAfter = await page.evaluate(() => JSON.stringify(window.dailyState));
await page.screenshot({ path: path.join(shotDir, '7-practice-result.png') });

// ── 6) Practice 1024-collapse: force a 512+512 merge → collapse fires, board resets ──
await page.evaluate(() => {
  ['ol-practice-over','ol-daily-over','ol-gameover'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  window.startPractice && window.startPractice();
});
await page.waitForTimeout(400);
// Inject sparse grid using test helpers (_testSetGrid exposed via index.html).
await page.evaluate(() => {
  const g = window._testGetGrid();
  if (!g) return;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g[r][c] = null;
  g[0][0] = { color: 0, size: 512 };
  g[0][1] = { color: 1, size: 512 };
  window._testSetGrid(g);
  window._testSetGameRunning(true);
  window._testSetIsAnimating(false);
});
const collapseCountBefore = await page.evaluate(() => window._testGetCollapseCount ? window._testGetCollapseCount() : 0);
await page.evaluate(() => window.doMove && window.doMove('left'));
// animation(120ms) + FX hold(400ms) + ad(~0ms mock) + reset = ~700ms
await page.waitForTimeout(1000);
const collapseCountAfter = await page.evaluate(() => window._testGetCollapseCount ? window._testGetCollapseCount() : -1);
const titleAfterCollapse = await page.evaluate(() => document.getElementById('game-title').textContent);
const gameRunningAfterCollapse = await page.evaluate(() => window._testGetGameRunning ? window._testGetGameRunning() : false);
await page.screenshot({ path: path.join(shotDir, '8-practice-collapse.png') });

// ── 7) Main game (START) gating: ?dev shows it; plain build hides it ──
const startVisibleDev = await page.evaluate(() => {
  const b = document.getElementById('btn-start');
  return b && b.style.display !== 'none';
});

await browser.close();

// Re-open WITHOUT ?dev to confirm START stays hidden in the submission build.
const plainBrowser = await chromium.launch();

const plainPage = await plainBrowser.newPage({ viewport: { width: 420, height: 760 } });
await plainPage.goto('file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/'));
await plainPage.waitForTimeout(700);
const startHiddenPlain = await plainPage.evaluate(() => {
  const b = document.getElementById('btn-start');
  return !b || b.style.display === 'none';
});
const practiceBtnPlain = await plainPage.evaluate(() => !!document.getElementById('btn-practice'));
await plainPage.screenshot({ path: path.join(shotDir, '8-plain-menu.png') });
await plainBrowser.close();

console.log('HUD before fly:', before, '→ after:', after);
console.log('leftover star nodes:', leftover);
console.log('daily game-over overlay shown:', overlayShown ? 'YES ✓' : 'NO ✗');
console.log('retry button visible:', retryVisible ? 'YES ✓' : 'NO ✗');
console.log('daily leaderboard rows:', lbRows, lbRows > 0 ? '✓' : '✗', '| DEMO badge:', lbDemoBadge ? 'shown ✓' : 'hidden');
console.log('practice title:', JSON.stringify(practiceTitle), practiceTitle.includes('PRACTICE') ? '✓' : '✗');
console.log('practice result overlay shown:', practiceOverlay ? 'YES ✓' : 'NO ✗');
console.log('practice did NOT mutate dailyState:', dailyBefore === dailyAfter ? 'OK ✓' : 'CHANGED ✗');
console.log('practice collapse count before:', collapseCountBefore, '→ after:', collapseCountAfter, collapseCountAfter === 1 ? '✓' : '✗');
console.log('game running after collapse:', gameRunningAfterCollapse ? 'YES ✓' : 'NO ✗');
console.log('HUD shows collapse tag:', titleAfterCollapse.includes('×1') ? 'YES ✓' : 'NO (check: ' + titleAfterCollapse + ')');
console.log('START visible in ?dev:', startVisibleDev ? 'YES ✓' : 'NO ✗');
console.log('START hidden in plain build:', startHiddenPlain ? 'YES ✓' : 'NO ✗');
console.log('PRACTICE present in plain build:', practiceBtnPlain ? 'YES ✓' : 'NO ✗');
console.log('main-start crash errors:', mainCrash.length ? mainCrash : 'NONE ✓');
console.log('all page errors:', errors.length ? errors : 'NONE ✓');

const ok = mainCrash.length === 0 && leftover === 0 && after !== before && overlayShown
  && lbRows > 0 && practiceTitle.includes('PRACTICE') && practiceOverlay
  && dailyBefore === dailyAfter
  && collapseCountAfter === 1 && gameRunningAfterCollapse
  && startVisibleDev && startHiddenPlain && practiceBtnPlain;
console.log('\n' + (ok ? 'VISUAL CHECK PASSED ✓' : 'VISUAL CHECK FAILED ✗'));
process.exit(ok ? 0 : 1);
