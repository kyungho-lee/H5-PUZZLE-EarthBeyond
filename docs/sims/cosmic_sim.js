/* cosmic_sim.js — Daily with/without comet+observatory, greedy-corner bot.
   Run: node docs/sims/cosmic_sim.js */
'use strict';
const ND = require('../../src/neon-drift.js');
function mulberry(seed) { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const BASE = { n: 4, mergeRule: 'sizeOnly', daily: true, spawnFourProb: 0.15, collapseSize: 1024,
  targets: [{ size: 64, stars: 1 }, { size: 128, stars: 2 }, { size: 256, stars: 3 }, { size: 512, stars: 5 }] };
const COMET = { chance: 0.08, ttl: 6, minTurn: 5, mult: 3 };
const PREF = ['down', 'left', 'right', 'up'];

function play(seed, cosmic) {
  const rng = mulberry(seed);
  const opts = Object.assign({}, BASE);
  if (cosmic) { opts.comet = COMET; opts.observatory = ND.pickObservatory(mulberry(seed ^ 0xabc), 4); }
  let grid = ND.emptyGrid(4);
  for (let i = 0; i < 2; i++) { const s = ND.spawnTile(grid, rng, opts); grid[s.at[0]][s.at[1]] = { color: 0, size: s.size }; }
  let score = 0, stars = 0, moves = 0, spawned = 0, caught = 0, expired = 0;
  for (let guard = 0; guard < 5000; guard++) {
    opts.turn = moves;
    let r = null;
    for (const d of PREF) { const t = ND.applyMove(grid, d, rng, opts); if (t.moved) { r = t; break; } }
    if (!r) break;
    moves++; score += r.scoreGained; stars += r.starsGained;
    if (r.spawned && r.spawned.comet) spawned++;
    if (r.cometCaught) caught++;
    expired += (r.expired || []).length;
    grid = r.grid;
    if (r.collapse) { grid = ND.emptyGrid(4); for (let i = 0; i < 2; i++) { const s = ND.spawnTile(grid, rng, opts); grid[s.at[0]][s.at[1]] = { color: 0, size: s.size }; } }
    if (ND.checkGameOver(grid, 'sizeOnly')) break;
  }
  return { score, stars, moves, spawned, caught, expired };
}

const N = 1000;
for (const cosmic of [false, true]) {
  const agg = { score: 0, stars: 0, moves: 0, spawned: 0, caught: 0, expired: 0 };
  for (let s = 1; s <= N; s++) { const r = play(s, cosmic); for (const k in agg) agg[k] += r[k]; }
  const avg = k => (agg[k] / N).toFixed(2);
  console.log(cosmic ? 'WITH cosmic' : 'BASELINE   ', 'score', avg('score'), 'stars', avg('stars'), 'moves', avg('moves'),
    'comets', avg('spawned'), 'caught', avg('caught'), 'expired', avg('expired'),
    'catchRate', agg.spawned ? (agg.caught / agg.spawned * 100).toFixed(1) + '%' : '-');
}
