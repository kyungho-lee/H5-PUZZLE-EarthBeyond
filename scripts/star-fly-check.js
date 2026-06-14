/* star-fly-check.js — headless verification of SG.StarFly.burst().
   Stubs the minimum DOM + a driveable requestAnimationFrame, then asserts:
     (1) burst({count:N}) creates N glyph nodes attached to body
     (2) onArrive fires exactly N times (once per landed star)
     (3) onDone fires exactly once after all land
     (4) all glyph nodes are removed from body when done
     (5) burst with no from/to is a safe no-op
   Drives time forward in fixed steps until the rAF loop goes idle. */
'use strict';

// ── Minimal DOM stub ──────────────────────────────────────────────────────
function makeEl(tag) {
  return {
    tagName: tag, className: '', textContent: '', id: '',
    style: {}, children: [], parentNode: null,
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
    getBoundingClientRect() { return { left: 300, top: 40, width: 80, height: 24 }; },
  };
}
const body = makeEl('body');
const head = makeEl('head');
const byId = {};
const documentStub = {
  body, head, documentElement: makeEl('html'),
  createElement: makeEl,
  getElementById: (id) => byId[id] || null,
};

// ── Driveable requestAnimationFrame ───────────────────────────────────────
let cbs = [];
let now = 0;
const g = globalThis;
g.self = g;
g.document = documentStub;
g.requestAnimationFrame = (fn) => { cbs.push(fn); return cbs.length; };
function pump(steps, stepMs) {
  for (let i = 0; i < steps; i++) {
    now += stepMs;
    const batch = cbs; cbs = [];
    for (const fn of batch) fn(now);
    if (!cbs.length) break;   // loop went idle
  }
}

g.SG = {};
require('../src/star-fly.js');

let pass = true;
const check = (name, cond) => { console.log((cond ? '✓' : '✗') + ' ' + name); if (!cond) pass = false; };

// ── Test 1: burst N=5 ─────────────────────────────────────────────────────
const hud = makeEl('div'); hud.id = 'stat-score'; byId['stat-score'] = hud;
let arrived = 0, doneCount = 0;
g.SG.StarFly.burst({
  from: { x: 100, y: 200 }, to: hud, count: 5, stagger: 40,
  onArrive: () => { arrived++; },
  onDone: () => { doneCount++; },
});
check('5 glyph nodes attached to body at launch', body.children.length === 5);

// drive ~3s in 16ms frames (hold 500 + stagger*4 160 + fly 700 ≈ 1.4s; pad to 3s)
pump(400, 16);

check('onArrive fired 5 times', arrived === 5);
check('onDone fired exactly once', doneCount === 1);
check('all glyph nodes removed when done', body.children.length === 0);
check('rAF loop went idle (no pending callbacks)', cbs.length === 0);

// ── Test 2: count cap ─────────────────────────────────────────────────────
arrived = 0; doneCount = 0;
g.SG.StarFly.burst({ from: { x: 0, y: 0 }, to: hud, count: 99, maxCount: 12, onArrive: () => arrived++ });
check('count capped at maxCount=12', body.children.length === 12);
pump(600, 16);
check('capped burst lands 12', arrived === 12);

// ── Test 3: safe no-op ────────────────────────────────────────────────────
let threw = false;
try {
  g.SG.StarFly.burst({ count: 3 });            // no from/to
  g.SG.StarFly.burst();                         // no opts
} catch (e) { threw = true; }
check('burst without from/to is a safe no-op', !threw && body.children.length === 0);

console.log('\n' + (pass ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗'));
process.exit(pass ? 0 : 1);
