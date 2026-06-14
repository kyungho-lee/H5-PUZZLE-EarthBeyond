/* setmode-crash-check.js — regression for the main-start crash.
   setMode() changes n; a tick() before the next drawGrid() must NOT draw an
   n-sized loop over a stale differently-sized grid (grid[r] undefined → throw).
   Reproduces: open daily (4x4) → back to menu → start main (n=8). */
'use strict';
const g = globalThis;
g.self = g;
g.SG = {};
require('../src/palette.js');
require('../src/particles.js');

function stubCtx() { return new Proxy({}, { get: () => () => {} }); }
const canvas = { width: 480, height: 480, clientWidth: 480, clientHeight: 480,
  getContext: () => stubCtx() };
require('../src/grid-render.js');

const r = new g.SG.Renderer(canvas);
let pass = true;
const check = (name, cond) => { console.log((cond ? '✓' : '✗') + ' ' + name); if (!cond) pass = false; };

// 1) Enter daily, draw a 4x4 board (this.grid = 4x4, this.n = 4)
r.setMode('daily');
const board4 = Array.from({ length: 4 }, () => Array(4).fill(null));
board4[0][0] = { color: 0, size: 2 };
r.drawGrid(board4);
check('daily: n=4 and grid is 4x4', r.n === 4 && r.grid.length === 4);

// 2) Switch to main (n=8) WITHOUT drawing a new grid yet (mirrors dailyToMenu)
r.setMode('main');
check('setMode(main): n=8', r.n === 8);
check('setMode(main): stale grid cleared', r.grid === null);

// 3) A tick now must not throw (the reported crash path)
let threw = false;
try { r.tick(16); } catch (e) { threw = true; console.log('    threw:', e.message); }
check('tick() after setMode does not crash', !threw);

// 4) Now start main properly with an 8x8 grid → renders fine
const board8 = Array.from({ length: 8 }, () => Array(8).fill(null));
r.drawGrid(board8);
let threw2 = false;
try { r.tick(32); } catch (e) { threw2 = true; console.log('    threw:', e.message); }
check('main board draws + ticks cleanly', r.grid.length === 8 && !threw2);

console.log('\n' + (pass ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗'));
process.exit(pass ? 0 : 1);
