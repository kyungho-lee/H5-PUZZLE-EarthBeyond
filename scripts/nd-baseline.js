/* nd-baseline.js — pins neon-drift.js behaviour with options absent.
   Run once BEFORE core changes: node scripts/nd-baseline.js  → writes test/fixtures/nd-baseline.json
   test/neon-drift.baseline.test.js replays the same scenarios and compares. */
'use strict';
const path = require('path');
const fs = require('fs');

function mulberry(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = ['left', 'up', 'right', 'down'];

const SCENARIOS = [
  { name: 'daily', opts: { n: 4, mergeRule: 'sizeOnly', daily: true, spawnFourProb: 0.15, collapseSize: 1024,
      targets: [{ size: 64, stars: 1, remove: false }, { size: 128, stars: 2, remove: false },
                { size: 256, stars: 3, remove: false }, { size: 512, stars: 5, remove: false }] } },
  { name: 'chronicles', opts: { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4,
      collapseSize: 1024, targets: [],
      gradedTiers: [{ maxAtMost: 16, dist: [[1, 8], [2, 2]] }, { maxAtMost: 9999, dist: [[1, 6], [2, 3], [4, 1]] }] } },
  { name: 'main', opts: { n: 8, mergeRule: 'colorAndSize', bias: 0.5, clampThreshold: 2, colors: 2, noColorWin: true } },
];

const norm = (grid) => grid.map(row => row.map(t => (t ? [t.color, t.size] : null)));

function runScenarios(ND) {
  const out = [];
  for (const sc of SCENARIOS) {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = mulberry(seed * 7919);
      const dirRng = mulberry(seed * 104729);
      let grid = ND.emptyGrid(sc.opts.n);
      for (let i = 0; i < 2; i++) {
        const s = ND.spawnTile(grid, rng, sc.opts);
        if (s) grid[s.at[0]][s.at[1]] = { color: s.color, size: s.size };
      }
      const steps = [];
      for (let k = 0; k < 80; k++) {
        const dir = DIRS[Math.floor(dirRng() * 4)];
        const r = ND.applyMove(grid, dir, rng, sc.opts);
        steps.push({ dir, grid: norm(r.grid), scoreGained: r.scoreGained, chain: r.chain, moved: r.moved,
          spawned: r.spawned ? { at: r.spawned.at, color: r.spawned.color, size: r.spawned.size } : null,
          starsGained: r.starsGained, collapse: r.collapse });
        grid = r.grid;
        if (ND.checkGameOver(grid, sc.opts.mergeRule)) break;
      }
      out.push({ name: sc.name, seed, steps });
    }
  }
  return out;
}

module.exports = { runScenarios };

if (require.main === module) {
  const ND = require('../src/neon-drift.js');
  const file = path.join(__dirname, '..', 'test', 'fixtures', 'nd-baseline.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(runScenarios(ND)));
  console.log('wrote', file);
}
