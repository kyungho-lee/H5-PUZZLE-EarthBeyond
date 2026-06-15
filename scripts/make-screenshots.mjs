/* make-screenshots.mjs  [Earth & Beyond]
   Playgama submission screenshots — 5 scenes at 560×900 (mobile portrait).
   Output: scripts/_submit/
     ss-01-hero.png        — 히어로 메인 화면 (3분할 배경 + 버튼)
     ss-02-era1.png        — Era 1 Primordial Earth 인게임 (블록 풍성)
     ss-03-era2.png        — Era 2 Human Civilization 인게임
     ss-04-era3.png        — Era 3 Solar System 인게임
     ss-05-gameover-lb.png — Daily 게임오버 + 리더보드
   Run: node scripts/make-screenshots.mjs */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '_submit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:8081';
const DEV  = BASE + '?dev=1';
const browser = await chromium.launch();
const errors = [];

// 완전히 빈 storage 컨텍스트로 새 페이지 생성
async function freshPage(url) {
  const ctx = await browser.newContext({
    viewport: { width: 560, height: 900 },
    storageState: { cookies: [], origins: [] },  // 완전 클린
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  return page;
}

async function hideDevUI(page) {
  await page.evaluate(() => {
    const devBar = document.getElementById('dev-bar');
    if (devBar) devBar.style.display = 'none';
    const toastRoot = document.getElementById('sg-toast-root');
    if (toastRoot) toastRoot.innerHTML = '';
  });
}

async function closePopups(page) {
  await page.evaluate(() => {
    [
      'ol-unlock','ol-daily-over','ol-collection-over','ol-theme-complete',
      'ol-settings','ol-gallery','ol-chapter-intro','ol-step-reveal',
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    if (window._unlockResolve) { window._unlockResolve(); window._unlockResolve = null; }
    if (window._modalStack)    window._modalStack.length = 0;
    if (window._modal)         window._modal = null;
  });
  await page.waitForTimeout(100);
}

async function doMoves(page, dirs, delay = 160) {
  for (const d of dirs) {
    await closePopups(page);
    await page.evaluate(dir => window.doMove && window.doMove(dir), d);
    await page.waitForTimeout(delay);
  }
  await hideDevUI(page);
}

// 보드에 블록 16개 가득 채우고 drawGrid — startCollection 완료 후 호출
async function fillBoard(page) {
  await page.evaluate(() => {
    if (!window.grid || !window.SG || !window.activeThemeObj) return;
    const t = window.activeThemeObj;
    const sizes = window.SG.Collection.getThemeSizes(t);
    // 4×4 전 칸 채우기 — step 1~8을 대각선으로 분산
    const idxMap = [
      [0, 2, 4, 6],
      [1, 3, 5, 7],
      [2, 4, 6, 0],
      [3, 5, 7, 1],
    ];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const sz = sizes[idxMap[r][c]] || sizes[0];
        window.grid[r][c] = { color: (r + c) % 3, size: sz };
      }
    window.gameRunning = true;
    window.renderer && window.renderer.drawGrid(window.grid);
  });
  await page.waitForTimeout(300);
}

// 테마 시작 + 보드를 이미지 블록으로 꽉 채운 뒤 임팩트 있는 상태 만들기
async function setupThemeShot(page, themeIndex) {
  // 1) 테마 해금 + step 획득 + intro-seen 마킹 → localStorage 세팅
  await page.evaluate((idx) => {
    if (!window.SG || !window.SG.CollectionThemes) return;
    const t = window.SG.CollectionThemes[idx];
    if (!t) return;
    const meta = window.SG.Collection.loadMeta(localStorage);
    if (meta.unlockedThemes.indexOf(t.id) === -1) meta.unlockedThemes.push(t.id);
    meta.activeThemeId = t.id;
    window.SG.Collection.saveMeta(localStorage, meta);
    const state = window.SG.Collection.loadTheme(t.id, localStorage, t);
    const sizes = window.SG.Collection.getThemeSizes(t);
    sizes.slice(0, 8).forEach((sz, i) => {
      if (state.acquiredSizes.indexOf(sz) === -1) state.acquiredSizes.push(sz);
      if (state.acquiredSteps.indexOf(i + 1) === -1) state.acquiredSteps.push(i + 1);
    });
    window.SG.Collection.saveTheme(localStorage, state);
    // Chapter Intro 팝업 방지: 모든 테마 intro-seen 마킹
    window.SG.CollectionThemes.forEach(function(th) {
      localStorage.setItem('earthbeyond_intro_seen_' + th.id, '1');
    });
  }, themeIndex);

  // 2) startCollection 호출 (intro 팝업 없음 — intro_seen 마킹됨)
  await page.evaluate(() => {
    window.startCollection && window.startCollection();
  });

  // 3) setTimeout(200) 내부 팝업이 실행될 시간 대기 → 팝업 닫기 → 보드 풀로 채우기
  await page.waitForTimeout(500);
  await closePopups(page);

  // 4) 팝업 닫힌 후 grid 풀보드 덮어쓰기 + 강제 redraw
  await page.evaluate(() => {
    if (!window.grid || !window.SG) return;
    // activeThemeObj는 startCollection 내부 로컬 변수 — window에 없음.
    // activeThemeId (전역)로 테마 객체를 직접 조회.
    const t = window.SG.CollectionThemes.find(function(th) {
      return th.id === window.activeThemeId;
    });
    if (!t) return;
    const sizes = window.SG.Collection.getThemeSizes(t);
    const idxMap = [
      [0, 2, 4, 6],
      [1, 3, 5, 7],
      [2, 4, 6, 0],
      [3, 5, 7, 1],
    ];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const sz = sizes[idxMap[r][c]] || sizes[0];
        window.grid[r][c] = { color: (r + c) % 3, size: sz };
      }
    window.gameRunning = true;
    window.renderer && window.renderer.drawGrid(window.grid);
  });

  // 이미지 onload 콜백 완료 대기 후 최종 redraw
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    const t = window.SG && window.SG.CollectionThemes && window.SG.CollectionThemes.find(function(th) {
      return th.id === window.activeThemeId;
    });
    if (!t || !window.grid) return;
    const sizes = window.SG.Collection.getThemeSizes(t);
    const idxMap = [
      [0, 2, 4, 6],
      [1, 3, 5, 7],
      [2, 4, 6, 0],
      [3, 5, 7, 1],
    ];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const sz = sizes[idxMap[r][c]] || sizes[0];
        window.grid[r][c] = { color: (r + c) % 3, size: sz };
      }
    window.gameRunning = true;
    if (window.renderer) window.renderer.drawGrid(window.grid);
  });

  await hideDevUI(page);
  await page.waitForTimeout(200);
}

// ── Shot 1: 히어로 메인 화면 ─────────────────────────────────────────
{
  const page = await freshPage(BASE);
  await page.waitForTimeout(2200);   // 3분할 이미지 완전 로드 대기
  // localStorage가 비어있어야 ol-start가 표시됨. 혹시 다른 오버레이가 앞에 있으면 제거.
  await page.evaluate(() => {
    // 모든 오버레이 숨기고 ol-start만 표시
    document.querySelectorAll('.overlay').forEach(el => {
      el.classList.add('hidden');
    });
    const start = document.getElementById('ol-start');
    if (start) {
      start.classList.remove('hidden');
      start.style.display = '';
    }
    // showStart() 호출로 정상 복원
    if (window.showStart) window.showStart();
  });
  await page.waitForTimeout(500);   // 히어로 이미지 재렌더 대기
  await hideDevUI(page);
  await page.screenshot({ path: path.join(outDir, 'ss-01-hero.png') });
  console.log('✓ ss-01-hero.png');
  await page.context().close();
}

// ── Shot 2: Era 1 — Primordial Earth ────────────────────────────────
{
  const page = await freshPage(DEV);
  await page.waitForTimeout(1200);
  await setupThemeShot(page, 0);
  await page.screenshot({ path: path.join(outDir, 'ss-02-era1.png') });
  console.log('✓ ss-02-era1.png');
  await page.context().close();
}

// ── Shot 3: Era 2 — Human Civilization ──────────────────────────────
{
  const page = await freshPage(DEV);
  await page.waitForTimeout(1200);
  await setupThemeShot(page, 1);
  await page.screenshot({ path: path.join(outDir, 'ss-03-era2.png') });
  console.log('✓ ss-03-era2.png');
  await page.context().close();
}

// ── Shot 4: Era 3 — Solar System ────────────────────────────────────
{
  const page = await freshPage(DEV);
  await page.waitForTimeout(1200);
  await setupThemeShot(page, 2);
  await page.screenshot({ path: path.join(outDir, 'ss-04-era3.png') });
  console.log('✓ ss-04-era3.png');
  await page.context().close();
}

// ── Shot 5: Daily 게임오버 + 리더보드 ───────────────────────────────
{
  const page = await freshPage(DEV);
  await page.waitForTimeout(1200);
  await hideDevUI(page);

  // devStartDaily + 즉시 별 점수 / 보드 세팅 + game-over 한 번에
  await page.evaluate(() => {
    window.devStartDaily && window.devStartDaily();
    // devStartDaily는 동기 — 완료 직후 덮어쓰기
    window.dailyRunStars   = 32;
    window.dailyStarsShown = 32;
    if (window.dailyState) { window.dailyState.bestRun = 32; window.dailyState.stars = 32; }
    if (window.grid) {
      const layout = [
        [64, 32, 16,  8],
        [32, 16,  8,  4],
        [16,  8,  4,  2],
        [ 8,  4,  2,  1],
      ];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
          window.grid[r][c] = { color: (r+c)%3, size: layout[r][c] };
      if (window.renderer) window.renderer.drawGrid(window.grid);
    }
    window.gameRunning = false;
    window.dailyGameOver && window.dailyGameOver();
  });
  await page.waitForTimeout(1200);
  // 에러 토스트 제거
  await page.evaluate(() => {
    const r = document.getElementById('sg-toast-root');
    if (r) r.innerHTML = '';
  });
  await hideDevUI(page);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'ss-05-gameover-lb.png') });
  console.log('✓ ss-05-gameover-lb.png');
  await page.context().close();
}

await browser.close();

if (errors.length) {
  console.warn('\n⚠ Page errors:');
  errors.forEach(e => console.warn(' -', e));
}
console.log('\n✅ Screenshots saved to:', outDir);
