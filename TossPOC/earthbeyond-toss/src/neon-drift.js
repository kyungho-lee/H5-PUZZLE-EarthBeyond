/* neon-drift.js — pure game core. Zero dependencies.
   No Date.now() / Math.random(): all randomness is injected (rng). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;     // node test
  else { root.SG = root.SG || {}; root.SG.ND = api; }                          // browser
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const N = 8;

  // Cell-wise equality of two equal-length lines.
  function sameLine(a, b) {
    if (a.length !== b.length) {
      throw new Error('sameLine: lines must be equal length');
    }
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (x == null && y == null) continue;
      if (x == null || y == null) return false;
      if (x.color !== y.color || x.size !== y.size) return false;
    }
    return true;
  }

  // Slide a line left, merging adjacent same-size pairs. Pads back to input length.
  // mergeRule: 'colorAndSize' (default) requires same color too; 'sizeOnly' ignores color.
  // Returns { line, merges: [{index, size}], moved }.
  function slideLine(input, mergeRule) {
    const len = input.length;
    const tiles = input.filter(t => t != null);
    const out = [];
    const merges = [];
    let i = 0;
    while (i < tiles.length) {
      const a = tiles[i], b = tiles[i + 1];
      const sizeMatch = b && a.size === b.size;
      const colorMatch = b && a.color === b.color;
      const canMerge = sizeMatch && (mergeRule === 'sizeOnly' ? true : colorMatch);
      if (i + 1 < tiles.length && canMerge) {
        const size = a.size * 2;
        out.push({ color: a.color, size });
        merges.push({ index: out.length - 1, size });
        i += 2;
      } else {
        out.push({ color: a.color, size: a.size });
        i += 1;
      }
    }
    while (out.length < len) out.push(null);
    const moved = !sameLine(out, input);
    return { line: out, merges, moved };
  }

  // chain 0→0, 1→1, 2→2, 3→3, 4→4, >=5→5
  function chainMultiplier(chain) {
    if (chain <= 0) return 0;
    return Math.min(chain, 5);
  }

  // Distinct colors present === 1 (ignores empty cells). Empty grid → false.
  function checkWin(grid) {
    const n = grid.length;
    let seen = -1;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (seen === -1) seen = t.color;
      else if (t.color !== seen) return false;
    }
    return seen !== -1;
  }

  // Any empty cell, or any adjacent mergeable pair → movable.
  // mergeRule: 'colorAndSize' (default) requires same color AND size;
  //            'sizeOnly' requires same size only.
  function canMove(grid, mergeRule) {
    const n = grid.length;
    const mergeable = (a, b) => {
      if (!a || !b) return false;
      if (a.size !== b.size) return false;
      return mergeRule === 'sizeOnly' ? true : a.color === b.color;
    };
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = grid[r][c];
      if (!t) return true;
      if (c + 1 < n && mergeable(t, grid[r][c + 1])) return true;
      if (r + 1 < n && mergeable(t, grid[r + 1][c])) return true;
    }
    return false;
  }

  function checkGameOver(grid, mergeRule) {
    return !canMove(grid, mergeRule);
  }

  // Pure difficulty function (architecture §3.3). level >= 0.
  function difficulty(level) {
    return {
      colors:         Math.min(3 + level, 6),
      bias:           Math.max(0.6 - level * 0.05, 0.35),
      startBlocks:    Math.min(8 + level * 2, 16),
      clampThreshold: level >= 2 ? 1 : 2,
    };
  }

  // Collect [r,c] of empty cells.
  function emptyCells(grid) {
    const n = grid.length;
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }

  // Count tiles per color; return { counts: Map, majority: colorIdx|−1, distinct }.
  function colorStats(grid) {
    const n = grid.length;
    const counts = new Map();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = grid[r][c];
      if (!t) continue;
      counts.set(t.color, (counts.get(t.color) || 0) + 1);
    }
    let majority = -1, max = -1;
    for (const [color, cnt] of counts) if (cnt > max) { max = cnt; majority = color; }
    return { counts, majority, distinct: counts.size };
  }

  // Highest tile size currently on the board (≥1).
  function maxSize(grid) {
    let m = 1;
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const t = grid[r][c];
      if (t && t.size > m) m = t.size;
    }
    return m;
  }

  // Highest tile size reached per color → Map(color → maxSize).
  function maxSizeByColor(grid) {
    const m = new Map();
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (!m.has(t.color) || t.size > m.get(t.color)) m.set(t.color, t.size);
    }
    return m;
  }

  // Graded spawn size: as the board's max tile grows, occasionally seed a
  // larger starting block to relieve cell-starvation (see balance reports).
  // opts.gradedTiers = [{ maxAtMost, dist: [[size, weight], ...] }, ...]
  //   first tier whose maxAtMost >= board-max wins; dist is weight-picked.
  // Falls back to size 1 if no tier matches or no table given.
  function gradedSpawnSize(grid, rng, opts) {
    const tiers = opts && opts.gradedTiers;
    if (!tiers || !tiers.length) return 1;
    const mx = maxSize(grid);
    let dist = null;
    for (const tier of tiers) {
      if (mx <= tier.maxAtMost) { dist = tier.dist; break; }
    }
    if (!dist) dist = tiers[tiers.length - 1].dist;   // above all tiers → last
    let total = 0;
    for (const [, w] of dist) total += w;
    let roll = rng() * total;
    for (const [size, w] of dist) { if (roll < w) return size; roll -= w; }
    return 1;
  }

  // Spawn one tile at a random empty cell. opts:
  //   main:  { bias, clampThreshold, colors }       → size-1, color-biased
  //   graded:{ ...main, gradedTiers:[...] }          → progress-scaled start size
  //   uniform:{ ...main, uniformColor:true }         → flat 50:50 color (no majority bias)
  //   daily: { daily:true, spawnFourProb }           → size 2 or 4 (classic 2048), color cosmetic
  function spawnTile(grid, rng, opts) {
    const empties = emptyCells(grid);
    if (empties.length === 0) return null;
    const at = empties[Math.floor(rng() * empties.length)];

    if (opts && opts.daily) {
      const size = rng() < (opts.spawnFourProb || 0) ? 4 : 2;
      return { at, color: 0, size };
    }

    const { bias, clampThreshold, colors } = opts;
    let color;
    if (opts && opts.uniformColor) {
      // 균등 무작위 색 — majority bias 없음. 색이 고르게 섞여 난이도↑.
      color = Math.floor(rng() * colors);
    } else {
      const { majority, distinct } = colorStats(grid);
      if (distinct > 0 && distinct <= clampThreshold && majority !== -1) {
        color = majority;
      } else if (majority !== -1 && rng() < bias) {
        color = majority;
      } else {
        color = Math.floor(rng() * colors);
      }
    }
    const size = (opts && opts.gradedTiers) ? gradedSpawnSize(grid, rng, opts) : 1;
    return { at, color, size };
  }

  // Map (line k, packed index j) → original [r,c] per dir, board size n.
  function invMap(dir, k, j, n) {
    switch (dir) {
      case 'left':  return [k, j];
      case 'right': return [k, n - 1 - j];
      case 'up':    return [j, k];
      case 'down':  return [n - 1 - j, k];
      default: throw new Error('bad dir: ' + dir);
    }
  }

  function readLine(grid, dir, k, n) {
    const out = [];
    for (let j = 0; j < n; j++) { const [r, c] = invMap(dir, k, j, n); out.push(grid[r][c]); }
    return out;
  }

  function emptyGrid(n) {
    const sz = n || N;
    return Array.from({ length: sz }, () => Array(sz).fill(null));
  }

  // Full-grid push. opts: { n=8, mergeRule, targets=[], bias, clampThreshold, colors, spawnFourProb, daily }.
  function applyMove(grid, dir, rng, opts) {
    opts = opts || {};
    const n = opts.n || 8;
    const mergeRule = opts.mergeRule || 'colorAndSize';
    const targets = opts.targets || [];
    const next = emptyGrid(n);
    const moves = [];
    const merges = [];
    let chain = 0;
    let scoreGained = 0;
    let moved = false;

    for (let k = 0; k < n; k++) {
      const src = readLine(grid, dir, k, n);
      const res = slideLine(src, mergeRule);
      if (res.moved) moved = true;

      for (let j = 0; j < n; j++) {
        const [r, c] = invMap(dir, k, j, n);
        next[r][c] = res.line[j];
      }

      const srcTiles = [];
      for (let j = 0; j < n; j++) if (src[j] != null) srcTiles.push(j);
      let si = 0;
      for (let outIdx = 0; outIdx < res.line.length && res.line[outIdx] != null; outIdx++) {
        const isMerge = res.merges.some(m => m.index === outIdx);
        const consume = isMerge ? 2 : 1;
        for (let nn = 0; nn < consume; nn++) {
          const fromJ = srcTiles[si++];
          const from = invMap(dir, k, fromJ, n);
          const to = invMap(dir, k, outIdx, n);
          moves.push({ from, to });
        }
      }

      for (const m of res.merges) {
        merges.push({ at: invMap(dir, k, m.index, n), size: m.size });
      }
      chain += res.merges.length;
      for (const m of res.merges) scoreGained += m.size;
    }

    scoreGained *= chainMultiplier(chain);

    // Target blocks (daily): grant stars; optionally remove the completed tile.
    let starsGained = 0;
    const completed = [];
    for (const m of merges) {
      const tgt = targets.find(t => t.size === m.size);
      if (tgt) {
        starsGained += tgt.stars;
        completed.push({ at: m.at, size: m.size, stars: tgt.stars, removed: !!tgt.remove });
        if (tgt.remove) next[m.at[0]][m.at[1]] = null;
      }
    }

    // Collapse: reaching collapseSize (e.g. 1024) is a "clear & ascend" trigger.
    // Report the cell(s) that hit it so the shell can reset the board (keeping
    // score/stars) and continue. The core only DETECTS — reset policy is the
    // shell's. When a collapse fires we suppress the spawn (board is about to
    // be reset anyway), so the shell starts the next cycle from a clean board.
    let collapse = null;
    if (opts.collapseSize) {
      const hits = merges.filter(m => m.size === opts.collapseSize);
      if (hits.length) collapse = { size: opts.collapseSize, at: hits.map(h => h.at) };
    }

    // Win = single-color board (legacy main game only). Daily (sizeOnly) has no
    // color win condition. opts.noColorWin disables it too — used by the new
    // "grow to 4096" main mode, which is endless and must never suppress spawn.
    const won = (mergeRule === 'sizeOnly' || (opts && opts.noColorWin))
      ? false : checkWin(next);

    let spawned = null;
    if (moved && !won && !collapse) {
      const s = spawnTile(next, rng, opts);
      if (s) { next[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; spawned = s; }
    }

    return { grid: next, moves, merges, chain, scoreGained, moved, won, spawned, starsGained, completed, collapse };
  }

  // Level-up: increment level; colors are clamped inside difficulty() at 6.
  function nextLevel(level) {
    return level + 1;
  }

  // Deep clone an 8x8 grid (tiles are plain {color,size}).
  function cloneGrid(grid) {
    return grid.map(row => row.map(t => t ? { color: t.color, size: t.size } : null));
  }

  // Build starting grid for a level. Pure (rng injected). FR-1.
  function initGrid(level, rng) {
    const { startBlocks, colors } = difficulty(level);
    const grid = emptyGrid();
    let placed = 0;
    let guard = 0;
    while (placed < startBlocks && guard < 10000) {
      guard++;
      const r = Math.floor(rng() * N);
      const c = Math.floor(rng() * N);
      if (grid[r][c]) continue;
      grid[r][c] = { color: Math.floor(rng() * colors), size: 1 };
      placed++;
    }
    return grid;
  }

  // Hash a date string ("YYYY-MM-DD") → uint32 seed (FNV-1a). Deterministic, pure.
  function dateSeed(dateStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < dateStr.length; i++) {
      h ^= dateStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Daily difficulty by UTC day-of-week (0=Mon..6=Sun). Pure.
  // startTiles: tiles preset on the board; spawnFourProb: chance a spawn is a 4.
  function dailyType(dayOfWeek) {
    const TYPES = [
      { label: 'WARMUP',   startTiles: [{ size: 2, count: 2 }],                          spawnFourProb: 0.10 },
      { label: 'STEADY',   startTiles: [{ size: 2, count: 2 }],                          spawnFourProb: 0.20 },
      { label: 'SEEDED',   startTiles: [{ size: 4, count: 1 }, { size: 8, count: 1 }],   spawnFourProb: 0.15 },
      { label: 'SCARCE',   startTiles: [{ size: 2, count: 1 }],                          spawnFourProb: 0.05 },
      { label: 'FLOOD',    startTiles: [{ size: 2, count: 6 }],                          spawnFourProb: 0.20 },
      { label: 'HIGHROLL', startTiles: [{ size: 4, count: 2 }],                          spawnFourProb: 0.30 },
      { label: 'GAUNTLET', startTiles: [{ size: 8, count: 1 }, { size: 16, count: 1 }],  spawnFourProb: 0.12 },
    ];
    return TYPES[((dayOfWeek % 7) + 7) % 7];
  }

  return { N, sameLine, slideLine, chainMultiplier, checkWin, canMove, checkGameOver, difficulty, spawnTile, gradedSpawnSize, maxSize, maxSizeByColor, emptyCells, colorStats, applyMove, invMap, readLine, emptyGrid, nextLevel, cloneGrid, initGrid, dateSeed, dailyType };
});
