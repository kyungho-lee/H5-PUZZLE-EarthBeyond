// scripts/sim-continue.mjs — CONTINUE · 진행 보존 · 실패 보정 선택지 비교 (1장 + 3시대 엔딩)
// 실제 규칙(src/neon-drift.js applyMove) + src/strata.js. 근거 문서: docs/sandbox-kpi-debate/cont-design.md
// 사용: node scripts/sim-continue.mjs [--players 200] [--maxruns 60] [--mpm 60]
//
// 모델 (index.html v0.9.1 로컬 기준):
//  - 장 1·2·3 = primordial-earth / human-civilization / solar-system, 단계 1..1024, 4×4, sizeOnly.
//    1024 를 만든 판 = 그 장 클리어 → 다음 장 자동 해금(unlockNextTheme). 엔딩 = 3장 클리어.
//  - 스폰: 지층 켜진 장 = EBStrata.gradedTiers(), 꺼진 장 = collectionGradedTiers(progress) 그대로.
//  - 별: 판 안 머지 64/128/256/512 → 1/2/3/5⭐ (buildDailyOpts targets), 판 끝에 지갑 정산. 장 클리어 +20⭐.
//  - CONTINUE: 상위 3종 외 제거(continueRemovableCells), 판당 1회(session-rules CONTINUE_CAP_PER_RUN), 5⭐.
//  - 시간: 수/MPM + 판당 OVERHEAD_MIN(게임오버 화면 · 장면 배너 · 다시 하기).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ND = require('../src/neon-drift.js');
const S = require('../src/strata.js');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const PLAYERS = arg('--players', 200), MAXRUNS = arg('--maxruns', 60), MPM = arg('--mpm', 60);
const OVERHEAD_MIN = 0.25, CONT_COST = 5, CH_REWARD = 20;
const STAR = { 64: 1, 128: 2, 256: 3, 512: 5 };
const CHAPTERS = ['primordial-earth', 'human-civilization', 'solar-system'];

function mkRng(seed) { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DIRS = ['up', 'down', 'left', 'right'], FIXED = () => 0.99;
const empties = g => g.flat().filter(x => !x).length;
const BOTS = {
  greedy(g, o) { let b = null; for (const d of DIRS) { const r = ND.applyMove(g, d, FIXED, o); if (!r.moved) continue; const sc = r.merges.length * 100 + empties(r.grid); if (!b || sc > b.sc) b = { d, sc }; } return b && b.d; },
  corner(g, o) { for (const d of ['down', 'left', 'right', 'up']) if (ND.applyMove(g, d, FIXED, o).moved) return d; return null; },
  novice(g, o, rng) { if (rng() < 0.25) { const ok = DIRS.filter(d => ND.applyMove(g, d, FIXED, o).moved); return ok.length ? ok[Math.floor(rng() * ok.length)] : null; } return BOTS.greedy(g, o); },
};

// index.html collectionGradedTiers(progress) 복사(읽기 전용 원본 기준)
function legacyTiers(progress) {
  if (progress <= 0) return null;
  if (progress === 1) return [{ maxAtMost: 16, dist: [[1, 1.0]] }, { maxAtMost: 128, dist: [[1, 0.80], [2, 0.15], [4, 0.05]] }, { maxAtMost: Infinity, dist: [[1, 0.65], [2, 0.25], [4, 0.10]] }];
  return [{ maxAtMost: 16, dist: [[1, 1.0]] }, { maxAtMost: 128, dist: [[1, 0.65], [2, 0.25], [4, 0.10]] }, { maxAtMost: Infinity, dist: [[1, 0.50], [4, 0.30], [8, 0.20]] }];
}
// strata.js 와 같은 규칙을 창 W 로 일반화(W=6 이면 EBStrata 와 동일 — 아래 assert).
// spawnShift: 연패 보정(F) — 생성 크기만 한 단계 더 올림(best >> (W-1-shift)).
function tiersW(W, shift = 0) { const t = []; for (let k = 0; k <= 10; k++) t.push({ maxAtMost: Math.pow(2, W - 1 - shift + k), dist: [[Math.pow(2, k), 1]] }); return t; }
if (JSON.stringify(tiersW(6)) !== JSON.stringify(S.gradedTiers())) throw new Error('tiersW(6) != EBStrata.gradedTiers()');
function fossilsW(g, W, ctx) { const th = Math.max(1, ND.maxSize(g) >> W); if (th <= ctx.base) return []; ctx.base = th; const out = []; g.forEach((row, r) => row.forEach((t, c) => { if (t && t.size < th) out.push([r, c]); })); return out; }
function continueCells(g) {
  const distinct = [...new Set(g.flat().filter(Boolean).map(t => t.size))].sort((a, b) => b - a);
  const keep = new Set(distinct.slice(0, 3)); const out = [];
  g.forEach((row, r) => row.forEach((t, c) => { if (t && !keep.has(t.size)) out.push([r, c]); }));
  return out;
}

// 한 판. cfg: { strata, progress, conts(이번 판 허용 CONTINUE 수), startTile }
function playRun(seed, bot, cfg) {
  const rng = mkRng(seed), brng = mkRng(seed ^ 0x5bd1e995);
  const o = { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4,
    gradedTiers: cfg.strata ? tiersW(cfg.strata, cfg.shift || 0) : legacyTiers(cfg.progress), collapseSize: 1024 };
  const ctx = { base: 1 };
  let g = ND.emptyGrid(4);
  if (cfg.startTile > 1) { g[3][0] = { color: 0, size: cfg.startTile }; }   // 진행 보존/보정: 시작 칸
  for (let k = 0; k < 2; k++) { const s = ND.spawnTile(g, rng, o); g[s.at[0]][s.at[1]] = { color: s.color, size: s.size }; }
  if (cfg.strata) S.clearCells(g, fossilsW(g, cfg.strata, ctx));
  let moves = 0, used = 0, stars = 0, best = ND.maxSize(g), firstOverBest = 0;
  while (moves < 6000) {
    if (ND.checkGameOver(g, 'sizeOnly')) {
      if (!firstOverBest) firstOverBest = best;
      if (used < cfg.conts) { const c = continueCells(g); if (c.length) { S.clearCells(g, c); used++; continue; } }
      break;
    }
    const d = BOTS[bot](g, o, brng); if (!d) break;
    const r = ND.applyMove(g, d, rng, o); g = r.grid; moves++;
    for (const m of r.merges) stars += STAR[m.size] || 0;
    if (r.collapse) return { cleared: true, moves, stars, best: 1024, used, firstOverBest };
    best = Math.max(best, ND.maxSize(g));
    if (cfg.strata) S.clearCells(g, fossilsW(g, cfg.strata, ctx));
  }
  return { cleared: false, moves, stars, best, used, firstOverBest };
}

// 선택지. win: 장별 지층 창(0 = 꺼짐) ; contMode: none | stars | ad | freeFirst(게임 첫 판만 무료 1회) ; checkpoint(D) ; assist(F)
const OPTIONS = {
  'NOW  · 지층 1장(6) · 별 CONT':                 { win: [6, 0, 0], contMode: 'stars' },
  'S3   · 지층 3장(6/6/6) · CONT 없음':           { win: [6, 6, 6], contMode: 'none' },
  'A    · S3 + 별 CONT(5⭐·판당1)':               { win: [6, 6, 6], contMode: 'stars' },
  'B    · S3 + 광고 CONT(판당1)':                 { win: [6, 6, 6], contMode: 'ad' },
  'C    · S3 + 별 + 게임 첫 판 무료 1회':         { win: [6, 6, 6], contMode: 'freeFirst' },
  'D    · S3 + 별 + 체크포인트':                  { win: [6, 6, 6], contMode: 'stars', checkpoint: true },
  'F    · S3 + 별 + 연패 보정(2연패→생성↑)':      { win: [6, 6, 6], contMode: 'stars', assist: true },
  'A7   · 지층 6/7/7 + 별':                       { win: [6, 7, 7], contMode: 'stars' },
  'R667 · 지층 6/6/7 + 별 + 첫 판 무료 + 연패 보정': { win: [6, 6, 7], contMode: 'freeFirst', assist: true },
  'REC  · 지층 6/7/7 + 별 + 첫 판 무료 + 연패 보정': { win: [6, 7, 7], contMode: 'freeFirst', assist: true },
};

// D 체크포인트: 그 장에서 지금까지 만든 최고 크기 ≥128 이면 다음 판은 bestEver>>3 칸 1개를 들고 시작(최대 64).
const checkpointTile = bestEver => (bestEver >= 128 ? Math.min(64, bestEver >> 3) : 1);
// F 연패 보정: 그 장에서 클리어 없이 연속 3판 이상 실패 → 다음 판 32 칸 1개를 들고 시작(클리어하면 끝). 표시 없음.
// F 연패 보정(개정): 그 장에서 연속 2판 이상 실패 → 다음 판은 생성 크기만 한 단계 위(지층 창 -1 효과, 화석 경계는 그대로). 클리어하면 끝. 표시 없음.
const assistShift = streak => (streak >= 2 ? 1 : 0);

function playPlayer(p, bot, opt) {
  let wallet = 0, ch = 0, runs = 0, mins = 0;
  const per = CHAPTERS.map(() => ({ runs: 0, mins: 0, bestEver: 0, streak: 0, cleared: false }));
  const runLog = [];   // 판마다 {ch, cleared, min, newStep}
  while (ch < 3 && runs < MAXRUNS) {
    const st = per[ch];
    let conts = 0;
    if (opt.contMode === 'ad') conts = 1;
    else if (opt.contMode === 'stars') conts = wallet >= CONT_COST ? 1 : 0;
    else if (opt.contMode === 'freeFirst') conts = (runs === 0 || wallet >= CONT_COST) ? 1 : 0;
    let startTile = 1;
    if (opt.checkpoint) startTile = Math.max(startTile, checkpointTile(st.bestEver));
    const shift = opt.assist ? assistShift(st.streak) : 0;
    const r = playRun(7919 * (p + 1) + 104729 * ch + 31 * st.runs, bot, { strata: opt.win[ch] || 0, progress: ch, conts, startTile, shift });
    if (runs === 0) firstRunStars.push(r.stars);
    if (r.used && !(opt.contMode === 'ad') && !(opt.contMode === 'freeFirst' && runs === 0)) wallet -= CONT_COST;
    wallet += r.stars;
    const m = r.moves / MPM + OVERHEAD_MIN;
    const newStep = r.best > st.bestEver;
    st.bestEver = Math.max(st.bestEver, r.best);
    st.runs++; st.mins += m; runs++; mins += m;
    runLog.push({ ch, cleared: r.cleared, min: m, newStep });
    if (r.cleared) { st.cleared = true; st.streak = 0; wallet += CH_REWARD; ch++; } else st.streak++;
  }
  return { ending: ch >= 3, chReached: ch, runs, mins, per, runLog };
}

// 세션 모델(가정 · cont-design.md §3): 판이 끝날 때마다 그만둘 확률
//  클리어 0.10 / 새 장면(단계)을 얻고 실패 0.20 / 아무것도 못 얻고 실패 0.30 + 연속 무소득 1판마다 +0.10 (최대 0.70)
function sessionStats(runLog) {
  // 첫 세션 길이 기댓값(분)과 첫 세션 안 1장 클리어 확률 — 정확 계산(판 순서는 sim 그대로)
  let alive = 1, expMin = 0, ch1InS1 = 0, dry = 0;
  for (const r of runLog) {
    expMin += alive * r.min;
    if (r.ch === 0 && r.cleared) ch1InS1 += alive;
    let q;
    if (r.cleared) { q = 0.10; dry = 0; }
    else if (r.newStep) { q = 0.20; dry = 0; }
    else { dry++; q = Math.min(0.70, 0.30 + 0.10 * (dry - 1)); }
    alive *= (1 - q);
  }
  return { expMin, ch1InS1 };
}

const firstRunStars = [];
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const P = x => (x * 100).toFixed(0) + '%';
const fmt = x => (x == null || x === Infinity ? '—' : (Math.round(x * 10) / 10).toString());

const GATE = process.argv.includes('--gate');
if (!GATE) {
console.log(`# sim-continue players/bot=${PLAYERS} maxRuns=${MAXRUNS} ${MPM} moves/min +${OVERHEAD_MIN}min/run`);
console.log('| 선택지 | 봇 | 1장 판당 클리어 | 1장 클리어 판(중앙) | 1장까지 분(중앙) | 2장 판당 | 3장 판당 | 엔딩 도달(60판 안) | 엔딩까지 판(중앙) | 엔딩까지 분(중앙) | 첫 세션 분(기댓값) | 첫 세션 1장 클리어 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [name, opt] of Object.entries(OPTIONS)) {
  for (const bot of Object.keys(BOTS)) {
    const R = []; for (let p = 0; p < PLAYERS; p++) R.push(playPlayer(p, bot, opt));
    const chRate = c => { let runs = 0, cl = 0; for (const x of R) for (const l of x.runLog) if (l.ch === c) { runs++; if (l.cleared) cl++; } return runs ? cl / runs : null; };
    const ch1 = R.filter(x => x.per[0].cleared);
    const end = R.filter(x => x.ending);
    const all = arr => arr.concat(Array(R.length - arr.length).fill(Infinity));
    const ss = R.map(x => sessionStats(x.runLog));
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    console.log(`| ${name} | ${bot} | ${P(chRate(0))} | ${fmt(pct(all(ch1.map(x => x.per[0].runs)), 0.5))} | ${fmt(pct(all(ch1.map(x => x.per[0].mins)), 0.5))} | ${chRate(1) == null ? '—' : P(chRate(1))} | ${chRate(2) == null ? '—' : P(chRate(2))} | ${P(end.length / R.length)} | ${fmt(pct(all(end.map(x => x.runs)), 0.5))} | ${fmt(pct(all(end.map(x => x.mins)), 0.5))} | ${fmt(mean(ss.map(s => s.expMin)))} | ${P(mean(ss.map(s => s.ch1InS1)))} |`);
  }
}
console.log(`
첫 판 별(정산 전) 중앙 ${pct(firstRunStars, 0.5)} · 5⭐ 이상 ${P(firstRunStars.filter(x => x >= CONT_COST).length / firstRunStars.length)} (전 선택지 · 봇 합산)`);
}

// ── --gate: 승인 조합(cont-pd-final.md)을 src/strata.js API 그대로 + 셸 규칙(session-rules v0.9.1) 그대로 ──
//  지층 6/7/7(EBStrata.newRun(id) · gradedTiers(ctx) · onNewBest) · CONTINUE 판당 1회
//  · 게임 첫 판(1장 첫 판) 무료 · 그 밖에는 (지갑 + 이번 판 미정산 별) ≥ 5⭐ 이면 5⭐ 결제(판 별 먼저)
//  · 연패 보정: EBStrata.noteRunEnd(id, 'game_over'|'chapter_clear') → 다음 판 ctx.shift (session-rules.assistTiers 와 같은 값)
function playRunModule(seed, bot, chapterId, st) {
  const rng = mkRng(seed), brng = mkRng(seed ^ 0x5bd1e995);
  const ctx = S.newRun(chapterId);
  const o = { n: 4, mergeRule: 'sizeOnly', daily: false, bias: 0.6, clampThreshold: 3, colors: 4, gradedTiers: S.gradedTiers(ctx), collapseSize: 1024 };
  let g = ND.emptyGrid(4);
  for (let k = 0; k < 2; k++) { const s2 = ND.spawnTile(g, rng, o); g[s2.at[0]][s2.at[1]] = { color: s2.color, size: s2.size }; }
  let moves = 0, used = 0, runStars = 0, softlock = false, paidFromWallet = 0, free = false;
  while (true) {
    if (moves >= 6000) { softlock = true; break; }
    if (ND.checkGameOver(g, 'sizeOnly')) {
      if (S.fossilCells(g, ND.maxSize(g), ctx.window).length) { softlock = true; break; }
      const cells = continueCells(g);
      if (used < 1 && cells.length) {
        if (st.firstRunEver) { free = true; used++; S.clearCells(g, cells); continue; }
        if (st.wallet + runStars >= CONT_COST) {
          const fromRun = Math.min(CONT_COST, runStars); runStars -= fromRun; paidFromWallet = CONT_COST - fromRun;
          used++; S.clearCells(g, cells); continue;
        }
      }
      break;
    }
    const d = BOTS[bot](g, o, brng); if (!d) { softlock = true; break; }
    const r = ND.applyMove(g, d, rng, o); g = r.grid; moves++;
    for (const m of r.merges) runStars += STAR[m.size] || 0;
    if (r.collapse) return { cleared: true, moves, runStars, paidFromWallet, used, free, softlock, shift: ctx.shift, best: 1024 };
    const before = ND.maxSize(g);
    S.clearCells(g, S.onNewBest(g, null, ctx).fossils);
    if (ND.maxSize(g) !== before) { softlock = true; break; }
  }
  return { cleared: false, moves, runStars, paidFromWallet, used, free, softlock, shift: ctx.shift, best: ND.maxSize(g) };
}
if (GATE) {
  console.log(`# sim-continue --gate (승인 조합 · src/strata.js API) players/bot=${PLAYERS} maxRuns=${MAXRUNS} ${MPM} moves/min +${OVERHEAD_MIN}min/run · 창 ${CHAPTERS.map(S.windowFor).join('/')}`);
  console.log('| 봇 | 1장 판당 | 2장 판당 | 3장 판당 | 1장까지 판·분(중앙) | 엔딩(60판 안) | 엔딩까지 판(중앙) | 엔딩까지 분(중앙 · p75) | 첫 세션 분(기댓값) | 첫 세션 1장 클리어 | CONTINUE 쓴 판 | 보정 걸린 판 | 소프트락 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const bot of Object.keys(BOTS)) {
    const R = []; let contRuns = 0, assistRuns = 0, totalRuns = 0, soft = 0;
    const chRuns = [0, 0, 0], chClr = [0, 0, 0];
    for (let p = 0; p < PLAYERS; p++) {
      S.resetSession();
      let wallet = 0, ch = 0, runs = 0, mins = 0, ch1Runs = 0, ch1Mins = 0; const runLog = [];
      let bestEver = [0, 0, 0];
      while (ch < 3 && runs < MAXRUNS) {
        const id = CHAPTERS[ch];
        const st = { wallet, firstRunEver: runs === 0 };
        const r = playRunModule(7919 * (p + 1) + 104729 * ch + 31 * runs, bot, id, st);
        wallet = wallet - r.paidFromWallet + r.runStars;
        const m = r.moves / MPM + OVERHEAD_MIN; runs++; mins += m; totalRuns++;
        if (r.used) contRuns++; if (r.shift) assistRuns++; if (r.softlock) soft++;
        chRuns[ch]++; if (ch === 0) { ch1Runs++; ch1Mins += m; }
        runLog.push({ ch, cleared: r.cleared, min: m, newStep: r.best > bestEver[ch] }); bestEver[ch] = Math.max(bestEver[ch], r.best);
        if (r.cleared) { chClr[ch]++; S.noteRunEnd(id, 'chapter_clear'); wallet += CH_REWARD; ch++; }
        else S.noteRunEnd(id, 'game_over');
      }
      R.push({ ending: ch >= 3, runs, mins, ch1: ch > 0, ch1Runs, ch1Mins, runLog });
    }
    const all = (arr, n) => arr.concat(Array(n - arr.length).fill(Infinity));
    const end = R.filter(x => x.ending), c1 = R.filter(x => x.ch1);
    const ss = R.map(x => sessionStats(x.runLog)); const mean = a => a.reduce((s2, v) => s2 + v, 0) / a.length;
    console.log(`| ${bot} | ${P(chClr[0] / chRuns[0])} | ${chRuns[1] ? P(chClr[1] / chRuns[1]) : '—'} | ${chRuns[2] ? P(chClr[2] / chRuns[2]) : '—'} | ${fmt(pct(all(c1.map(x => x.ch1Runs), R.length), 0.5))} · ${fmt(pct(all(c1.map(x => x.ch1Mins), R.length), 0.5))} | ${P(end.length / R.length)} | ${fmt(pct(all(end.map(x => x.runs), R.length), 0.5))} | ${fmt(pct(all(end.map(x => x.mins), R.length), 0.5))} · ${fmt(pct(all(end.map(x => x.mins), R.length), 0.75))} | ${fmt(mean(ss.map(s2 => s2.expMin)))} | ${P(mean(ss.map(s2 => s2.ch1InS1)))} | ${P(contRuns / totalRuns)} | ${P(assistRuns / totalRuns)} | ${soft} |`);
  }
}
