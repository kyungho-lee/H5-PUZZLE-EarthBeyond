const ND = require(__dirname+'/../../src/neon-drift.js');
function makeOpts(n){ return { n, mergeRule:'sizeOnly', colors:4, bias:0.6, clampThreshold:3 }; }
function emptyGrid(n){ return Array.from({length:n},()=>Array(n).fill(null)); }
function maxOnBoard(g){ let m=0; for(const row of g)for(const t of row)if(t&&t.size>m)m=t.size; return m; }

// 스폰 size 결정 — 전략별
//  always1          : 항상 1
//  graded(진행도연동): 보드 최고값↑ → 큰 시작블록 섞기 (한 단계 아래까지만, 부드럽게)
function spawnSize(strategy, grid, rng){
  if(strategy==='always1') return 1;
  const mx = maxOnBoard(grid);
  // graded: 최고값 구간별 분포
  let table;
  if (mx <= 16)       table = [[1,1.0]];
  else if (mx <= 128) table = [[1,0.70],[2,0.20],[4,0.10]];
  else                table = [[1,0.50],[4,0.30],[8,0.20]];
  let roll = rng(), acc=0;
  for(const [sz,p] of table){ acc+=p; if(roll<acc) return sz; }
  return 1;
}
function spawnTile(grid,rng,opts,strategy){
  const e=[]; for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c])e.push([r,c]);
  if(!e.length)return null; const at=e[Math.floor(rng()*e.length)];
  return { at, color:Math.floor(rng()*opts.colors), size:spawnSize(strategy,grid,rng) };
}
const DIRS=['up','down','left','right'];
function greedyMove(grid,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(grid,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
function cornerMove(grid,opts){ for(const d of ['down','left','right','up']){ const r=ND.applyMove(grid,d,()=>0,opts); if(r.moved) return d; } return null; }

function runGame(n, ai, strategy, goal, seed){
  let s=seed|0; const rng=()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  const opts=makeOpts(n); let grid=emptyGrid(n);
  for(let i=0;i<2;i++){ const sp=spawnTile(grid,rng,opts,strategy); if(sp) grid[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  let turns=0, maxR=1;
  const cap = 8000;
  while(turns<cap){
    if(ND.checkGameOver(grid,'sizeOnly'))break;
    let dir = ai==='greedy'?greedyMove(grid,opts):cornerMove(grid,opts);
    if(!dir)break;
    const res=ND.applyMove(grid,dir,rng,opts); grid=res.grid;
    // applyMove는 내부에서 size1 스폰 → 전략 반영해 재설정
    if(res.spawned && strategy!=='always1'){ const sp=res.spawned; grid[sp.at[0]][sp.at[1]]={color:sp.color,size:spawnSize(strategy,grid,rng)}; }
    turns++; const m=maxOnBoard(grid); if(m>maxR)maxR=m; if(maxR>=goal)break;
  }
  return { turns, maxR, completed:maxR>=goal };
}
function summarize(n, ai, strategy, goal, N){
  let tt=0,cp=0; const ms=[];
  for(let i=0;i<N;i++){ const r=runGame(n,ai,strategy,goal,1000+i*7); tt+=r.turns; ms.push(r.maxR); if(r.completed)cp++; }
  ms.sort((a,b)=>a-b);
  return { board:n+'x'+n, ai, spawn:strategy, goal, avgTurns:(tt/N).toFixed(0), medianMax:ms[Math.floor(N/2)], complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=300; const rows=[];
// 기준선: 10단계(1024) 4x4 always1
for(const ai of ['greedy','corner']) rows.push(summarize(4, ai, 'always1', 1024, N));
console.log('=== 기준: 10단계(1024) 4x4 always1 ===');
console.table(rows);

// 12단계(4096): 보드 5/6 × 스폰 always1/graded
const rows2=[];
for(const ai of ['greedy','corner']) for(const n of [5,6]) for(const st of ['always1','graded'])
  rows2.push(summarize(n, ai, st, 4096, N));
console.log('=== 12단계(4096) 보드×스폰 매트릭스 ===');
console.table(rows2);
