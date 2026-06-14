import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.resolve(__dirname, '../src/index.html').replace(/\\/g, '/') + '?dev';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
await page.goto(url);
await page.waitForTimeout(600);

let pass = true;
const check = (n, c) => { console.log((c ? '✓' : '✗') + ' ' + n); if (!c) pass = false; };

// ── 1) Settings opened from START screen: MENU button should be hidden ──
await page.evaluate(() => window.openSettings && window.openSettings());
await page.waitForTimeout(100);
const menuHiddenOnStart = await page.evaluate(() => {
  const b = document.getElementById('btn-settings-menu');
  return b && b.style.display === 'none';
});
check('MENU hidden when opened from START screen', menuHiddenOnStart);

// CLOSE → back on START screen
await page.evaluate(() => window.closeSettings && window.closeSettings());
await page.waitForTimeout(100);
const startVisibleAfterClose = await page.evaluate(() =>
  !document.getElementById('ol-start').classList.contains('hidden'));
check('CLOSE restores START screen', startVisibleAfterClose);

// ── 2) Settings opened during Practice: MENU button should be visible ──
await page.evaluate(() => window.startPractice && window.startPractice());
await page.waitForTimeout(300);
await page.evaluate(() => window.openSettings && window.openSettings());
await page.waitForTimeout(100);
const menuVisibleInGame = await page.evaluate(() => {
  const b = document.getElementById('btn-settings-menu');
  return b && b.style.display !== 'none';
});
check('MENU visible when opened during game', menuVisibleInGame);

// ── 3) Click MENU → back on START screen, game stopped ──
await page.evaluate(() => window.settingsToMenu && window.settingsToMenu());
await page.waitForTimeout(200);
const startShownAfterMenu = await page.evaluate(() =>
  !document.getElementById('ol-start').classList.contains('hidden'));
const settingsHiddenAfterMenu = await page.evaluate(() =>
  document.getElementById('ol-settings').classList.contains('hidden'));
const gameStoppedAfterMenu = await page.evaluate(() =>
  window._testGetGameRunning ? !window._testGetGameRunning() : true);
check('START screen shown after MENU', startShownAfterMenu);
check('Settings panel hidden after MENU', settingsHiddenAfterMenu);
check('Game stopped after MENU', gameStoppedAfterMenu);

// ── 4) Settings opened during Daily: MENU button visible ──
await page.evaluate(() => {
  document.getElementById('ol-start').classList.add('hidden');
  window.startDailyRun && window.startDailyRun();
});
await page.waitForTimeout(300);
await page.evaluate(() => window.openSettings && window.openSettings());
const menuVisibleInDaily = await page.evaluate(() => {
  const b = document.getElementById('btn-settings-menu');
  return b && b.style.display !== 'none';
});
check('MENU visible during Daily', menuVisibleInDaily);
await page.evaluate(() => window.closeSettings && window.closeSettings());

await browser.close();
console.log('\n' + (pass ? 'SETTINGS-MENU CHECK PASSED ✓' : 'SETTINGS-MENU CHECK FAILED ✗'));
process.exit(pass ? 0 : 1);
