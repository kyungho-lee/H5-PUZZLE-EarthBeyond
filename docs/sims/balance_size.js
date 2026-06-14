const ND = require(__dirname+'/../../src/neon-drift.js');
function makeOpts(n){ return { n, mergeRule:'sizeOnly', colors:4, bias:0.6, clampThreshold:3 }; }
function emptyGrid(n){ return Array.from({length:n},()=>Array(n).fill(null)); }
function spawnTile(grid,rng,opts){
  const e=[]; for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c])e.push([r,c]);
  if(!e.length)return null; const at=e[Math.floor(rng()*e.length)];
  return { at, color:Math.floor(rng()*opts.colors), size:1 }; // always1
}
const DIRS=['up','down','left','right'];
function greedyMove(grid,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(grid,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
function cornerMove(grid,opts){ for(const d of ['down','left','right','up']){ const r=ND.applyMove(grid,d,()=>0,opts); if(r.moved) return d; } return null; }
function maxOnBoard(g){ let m=0; for(const row of g)for(const t of row)if(t&&t.size>m)m=t.size; return m; }

// goal: 도달 목표 size (10단계=1024, 12단계=4096)
function runGame(n, ai, goal, seed){
  let s=seed|0; const rng=()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  const opts=makeOpts(n); let grid=emptyGrid(n);
  for(let i=0;i<2;i++){ const sp=spawnTile(grid,rng,opts); if(sp) grid[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  let turns=0, maxR=1;
  while(turns<20000){
    if(ND.checkGameOver(grid,'sizeOnly'))break;
    let dir = ai==='greedy'?greedyMove(grid,opts):cornerMove(grid,opts);
    if(!dir)break;
    const res=ND.applyMove(grid,dir,rng,opts); grid=res.grid;
    turns++; const m=maxOnBoard(grid); if(m>maxR)maxR=m; if(maxR>=goal)break;
  }
  return { turns, maxR, completed:maxR>=goal };
}
function summarize(n, ai, goal, N){
  let tt=0,cp=0; const ms=[];
  for(let i=0;i<N;i++){ const r=runGame(n,ai,goal,1000+i*7); tt+=r.turns; ms.push(r.maxR); if(r.completed)cp++; }
  ms.sort((a,b)=>a-b);
  const steps = Math.log2(goal); // 목표 단계수
  return { board:n+'x'+n, ai, goalSize:goal, steps, avgTurns:(tt/N).toFixed(0), medianMax:ms[Math.floor(N/2)], complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=400; const rows=[];
// 기준: 10단계(1024) 4x4
for(const ai of ['greedy','corner']) rows.push(summarize(4, ai, 1024, N));
// 12단계(4096) — 보드 4,5,6,7
for(const ai of ['greedy','corner']) for(const n of [4,5,6,7]) rows.push(summarize(n, ai, 4096, N));
console.log('=== always1 · 목표 도달 난이도 · '+N+'판 ===');
console.table(rows);
