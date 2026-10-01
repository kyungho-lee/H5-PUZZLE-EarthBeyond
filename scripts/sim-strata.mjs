// scripts/sim-strata.mjs — 지층(Strata) 최소판 출고 게이트 sim
// 실제 규칙(src/neon-drift.js applyMove) + src/strata.js, Chronicles 1장 옵션(startCollection 그대로).
// 사용: node scripts/sim-strata.mjs [--runs 400] [--players 300] [--mpm 60]
// 출력은 docs/sandbox-kpi-debate/strata-gate.md 에 옮겨 적는다.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ND = require('../src/neon-drift.js');
const S = require('../src/strata.js');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const RUNS = arg('--runs', 400);       // 판당 지표용 판 수(봇별)
const PLAYERS = arg('--players', 300); // 첫 클리어까지 판 수 지표용 가상 플레이어 수
const MPM = arg('--mpm', 60);          // 분당 수(가정). 1수 ≈ 1초
const CAP = 6000;                      // 한 판 수 상한 — 닿으면 소프트락으로 센다

function mkRng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const DIRS = ['up', 'down', 'left', 'right'];
const FIXED = () => 0.99;
const empties = g => g.flat().filter(x => !x).length;

// 봇: greedy(합치기 최다 · 숙련 상한), corner(down→left→right→up · 흔한 사람), mixed(greedy 75% + 무작위 25% · 초보형)
const BOTS = {
  greedy(g, o) { let b = null; for (const d of DIRS) { const r = ND.applyMove(g, d, FIXED, o); if (!r.moved) continue; const sc = r.merges.length * 100 + empties(r.grid); if (!b || sc > b.sc) b = { d, sc }; } return b && b.d; },
  corner(g, o) { for (const d of ['down', 'left', 'right', 'up']) if (ND.applyMove(g, d, FIXED, o).moved) return d; return null; },
  mixed(g, o, rng) {
    if (rng() < 0.25) { const ok = DIRS.filter(d => ND.applyMove(g, d, FIXED, o).moved); return ok.length ? ok[Math.floor(rng() * ok.length)] : null; }
    return BOTS.greedy(g, o);
  },
};

// index.html continueRemovableCells 와 같다: 보드의 상위 3종 크기 외 전부 제거
function continueCells(g) {
  const distinct = [...new Set(g.flat().filter(Boolean).map(t => t.size))].sort((a, b) => b - a);
  const keep = new Set(distinct.slice(0, 3)); const out = [];
  g.forEach((row, r) => row.forEach((t, c) => { if (t && !keep.has(t.size)) out.push([r, c]); }));
  return out;
}

function opts(strata) {
  return { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4,
    gradedTiers: strata ? S.gradedTiers() : null, collapseSize: 1024 };
}

// 한 판. 반환 { cleared, moves, best, softlock, fossilEvents, fossilTiles, continues }
function playRun(seed, bot, strata, maxCont) {
  const rng = mkRng(seed), brng = mkRng(seed ^ 0x5bd1e995);
  const o = opts(strata);
  const ctx = S.newRun(strata ? 'primordial-earth' : 'off');
  let g = ND.emptyGrid(4);
  for (let k = 0; k < 2; k++) { const s = ND.spawnTile(g, rng, o); g[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; }
  let moves = 0, cont = 0, fe = 0, ft = 0, softlock = null;
  while (true) {
    if (moves >= CAP) { softlock = 'cap'; break; }
    if (ND.checkGameOver(g, 'sizeOnly')) {
      if (strata && S.fossilCells(g, ND.maxSize(g)).length) { softlock = 'gameover-with-pending-fossils'; break; }
      if (cont < maxCont) { const cells = continueCells(g); if (cells.length) { S.clearCells(g, cells); cont++; continue; } }
      break;
    }
    const d = BOTS[bot](g, o, brng);
    if (!d) { softlock = 'canMove-but-no-dir'; break; }
    const r = ND.applyMove(g, d, rng, o);
    g = r.grid; moves++;
    if (r.collapse) return { cleared: true, moves, best: 1024, softlock: null, fossilEvents: fe, fossilTiles: ft, continues: cont };
    // 셸 배선과 같은 순서: 이동 → 지층(화석 정리) → 게임오버 판정
    const before = ND.maxSize(g);
    const res = S.onNewBest(g, null, ctx);
    if (res.fossils.length) { fe++; ft += S.clearCells(g, res.fossils); }
    if (ND.maxSize(g) !== before) { softlock = 'fossil-removed-best'; break; }
    if (g.flat().every(t => !t)) { softlock = 'empty-board'; break; }
  }
  return { cleared: false, moves, best: ND.maxSize(g), softlock, fossilEvents: fe, fossilTiles: ft, continues: cont };
}

const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const P = x => (x * 100).toFixed(1) + '%';
const mins = m => (m / MPM).toFixed(1);

function perRun(bot, strata, maxCont) {
  const R = []; for (let i = 0; i < RUNS; i++) R.push(playRun(11 + i * 7919, bot, strata, maxCont));
  const cl = R.filter(r => r.cleared);
  const reach512 = R.filter(r => r.best >= 512).length / RUNS;
  return {
    clear: cl.length / RUNS, reach512,
    movesMed: pct(R.map(r => r.moves), 0.5), movesP25: pct(R.map(r => r.moves), 0.25), movesP75: pct(R.map(r => r.moves), 0.75),
    clearMovesMed: pct(cl.map(r => r.moves), 0.5),
    softlocks: R.filter(r => r.softlock).length, softlockKinds: [...new Set(R.filter(r => r.softlock).map(r => r.softlock))],
    fossilEventsMed: pct(R.map(r => r.fossilEvents), 0.5), fossilTilesMed: pct(R.map(r => r.fossilTiles), 0.5),
  };
}

// 첫 클리어까지 판 수(단계는 판을 넘어 유지 → 1024 를 처음 만든 판 = 1장 클리어)
function firstClear(bot, strata, maxCont, maxRuns = 30) {
  const N = []; let in3 = 0, never = 0, minsToClear = [];
  for (let p = 0; p < PLAYERS; p++) {
    let total = 0, got = 0;
    for (let run = 1; run <= maxRuns; run++) {
      const r = playRun(100003 * (p + 1) + run * 31, bot, strata, maxCont); total += r.moves;
      if (r.cleared) { got = run; break; }
    }
    if (got) { N.push(got); if (got <= 3) in3++; minsToClear.push(total / MPM); } else never++;
  }
  const all = N.concat(Array(never).fill(Infinity));
  return { median: pct(all, 0.5), within3: in3 / PLAYERS, never: never / PLAYERS, minsMed: pct(minsToClear, 0.5) };
}

const out = { runs: RUNS, players: PLAYERS, mpm: MPM, window: S.WINDOW, rows: [] };
for (const bot of Object.keys(BOTS)) {
  for (const [label, strata, k] of [['off · CONT 0', false, 0], ['strata · CONT 0', true, 0], ['strata · CONT 1', true, 1]]) {
    const a = perRun(bot, strata, k);
    const f = strata ? firstClear(bot, strata, k) : { median: null, within3: 0, never: 1, minsMed: null };
    out.rows.push({ bot, label, ...a, first: f });
  }
}

console.log(`# sim-strata  window=${S.WINDOW}  runs/bot=${RUNS}  players=${PLAYERS}  ${MPM} moves/min  cap=${CAP}`);
console.log('| bot | variant | clear/run | reach 512 | moves med (p25–p75) | min/run | clear-run moves | 1st clear med runs | ≤3 runs | never(30) | min to 1st clear | soft-locks | fossil events/run | fossil tiles/run |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of out.rows) {
  console.log(`| ${r.bot} | ${r.label} | ${P(r.clear)} | ${P(r.reach512)} | ${r.movesMed} (${r.movesP25}–${r.movesP75}) | ${mins(r.movesMed)} | ${r.clearMovesMed ?? '—'} (${r.clearMovesMed ? mins(r.clearMovesMed) : '—'} min) | ${r.first.median === Infinity ? '>30' : (r.first.median ?? '—')} | ${P(r.first.within3)} | ${P(r.first.never)} | ${r.first.minsMed == null ? '—' : r.first.minsMed.toFixed(1)} | ${r.softlocks}${r.softlockKinds.length ? ' ' + r.softlockKinds.join(',') : ''} | ${r.fossilEventsMed} | ${r.fossilTilesMed} |`);
}
