/* make-screenshots.mjs  [Earth & Beyond]
   Playgama submission screenshots — 5 scenes at 560×900 (mobile portrait).
   Output: scripts/_submit/
     ss-01-menu.png        — START 메뉴 (DAILY·PRACTICE·COLLECTION·지갑칩)
     ss-02-daily-play.png  — Daily 인게임 (보드 채워진 상태)
     ss-03-collection.png  — Collection 인게임 (step HUD + 블록)
     ss-04-gameover-lb.png — Daily 게임오버 (CLAIM + RETRY + 리더보드)
     ss-05-star-fx.png     — 별 획득 FX (64 머지 → 스타 플라이)
   Run: node scripts/make-screenshots.mjs */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '_submit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ?dev 없이 — 검수용 빌드 그대로 (STORY/START 버튼 숨김)
const url = 'http://localhost:8081';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 560, height: 900 } });

const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(url);
await page.waitForTimeout(1200);  // SDK init + wallet chip 렌더 대기

// ── Shot 1: START 메뉴 ───────────────────────────────────────────────
// DAILY · PRACTICE · COLLECTION 버튼 + 지갑 칩 노출 확인
await page.screenshot({ path: path.join(outDir, 'ss-01-menu.png') });
console.log('✓ ss-01-menu.png');

// ── Shot 2: Daily 인게임 ─────────────────────────────────────────────
await page.evaluate(() => window.openDaily && window.openDaily());
await page.waitForTimeout(500);

// 보드를 채우는 이동 시퀀스
const warmupMoves = ['left','down','right','up','left','down','right','up',
                     'left','down','right','up'];
for (const d of warmupMoves) {
  await page.evaluate(dir => window.doMove && window.doMove(dir), d);
  await page.waitForTimeout(160);
}
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, 'ss-02-daily-play.png') });
console.log('✓ ss-02-daily-play.png');

// ── 헬퍼: 모든 팝업 오버레이 강제 닫기 ──────────────────────────────
async function closeAllPopups() {
  await page.evaluate(() => {
    const ids = [
      'ol-unlock','ol-daily-over','ol-practice-over',
      'ol-collection-over','ol-theme-complete','ol-settings',
      'ol-gallery',
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    // unlock 팝업 resolve 처리
    if (window._unlockResolve) { window._unlockResolve(); window._unlockResolve = null; }
    // modalNav 스택 초기화
    if (window._modalStack) window._modalStack.length = 0;
  });
  await page.waitForTimeout(200);
}

// ── Shot 3: Collection 인게임 보드 장면 ──────────────────────────────
await closeAllPopups();
await page.evaluate(() => window.startCollection && window.startCollection());
await page.waitForTimeout(500);
await closeAllPopups();   // 시작 직후 unlock 팝업 닫기

// 이동해서 보드 채우기 (팝업 뜨면 즉시 닫기 반복)
const collMoves = ['right','down','left','up','right','down','left','up',
                   'right','down','left','up'];
for (const d of collMoves) {
  await closeAllPopups();
  await page.evaluate(dir => window.doMove && window.doMove(dir), d);
  await page.waitForTimeout(200);
}
await closeAllPopups();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outDir, 'ss-03-collection.png') });
console.log('✓ ss-03-collection.png');

// ── Shot 4: Daily 게임오버 (CLAIM + RETRY + 리더보드) ────────────────
await closeAllPopups();
await page.evaluate(() => window.openDaily && window.openDaily());
await page.waitForTimeout(400);

// 몇 번 이동 후 강제 game-over 호출
const preMoves = ['left','down','right','up','left','down'];
for (const d of preMoves) {
  await page.evaluate(dir => window.doMove && window.doMove(dir), d);
  await page.waitForTimeout(150);
}
await page.evaluate(() => {
  // gameRunning=false 후 직접 dailyGameOver — 광고 없이 즉시
  if (window.dailyGameOver) window.dailyGameOver();
});
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(outDir, 'ss-04-gameover-lb.png') });
console.log('✓ ss-04-gameover-lb.png');

// ── Shot 5: Collection 인게임 — 머지 FX + 보드 (팝업 없는 플레이 장면)
// ss-03 이후 이미 Collection 상태 → 팝업만 닫고 추가 이동으로 FX 포착
await closeAllPopups();

// 추가 이동: 머지 FX(+숫자 플로팅) 포함 장면
const fxMoves = ['up','right','down','left','up','right'];
for (const d of fxMoves) {
  await closeAllPopups();
  await page.evaluate(dir => window.doMove && window.doMove(dir), d);
  await page.waitForTimeout(190);
}
// 마지막 이동 직후 FX 플로팅 중에 캡처
await page.evaluate(dir => window.doMove && window.doMove(dir), 'down');
await page.waitForTimeout(120);  // FX 중간 타이밍
await page.screenshot({ path: path.join(outDir, 'ss-05-star-fx.png') });
console.log('✓ ss-05-star-fx.png');

await browser.close();

if (errors.length) {
  console.warn('\n⚠ Page errors during capture:');
  errors.forEach(e => console.warn(' -', e));
}
console.log('\n✅ Screenshots saved to:', outDir);
