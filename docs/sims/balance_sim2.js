const ND = require(__dirname+'/../../src/neon-drift.js');
function makeOpts(strategy){ return { n:4, mergeRule:'sizeOnly', colors:4, bias:0.6, clampThreshold:3, _strategy:strategy }; }
function emptyGrid(n){ return Array.from({length:n},()=>Array(n).fill(null)); }
function spawnSizeFor(strategy, grid, rng){
  if (strategy==='always1') return 1;
  let mx=1; for(const row of grid) for(const t of row) if(t&&t.size>mx) mx=t.size;
  const cand=[{size:1,w:1}]; if(mx>=4)cand.push({size:mx/4,w:2}); if(mx>=2)cand.push({size:mx/2,w:3});
  const tot=cand.reduce((s,c)=>s+c.w,0); let roll=rng()*tot;
  for(const c of cand){ if(roll<c.w) return c.size; roll-=c.w; } return 1;
}
function spawnTile(grid,rng,opts){
  const e=[]; for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c])e.push([r,c]);
  if(!e.length)return null; const at=e[Math.floor(rng()*e.length)];
  return { at, color:Math.floor(rng()*opts.colors), size:spawnSizeFor(opts._strategy,grid,rng) };
}
const DIRS=['up','down','left','right'];
function greedyMove(grid,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(grid,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
// 코너 전략: down/left 우선 (사람 흔한 플레이), 불가 시 다른 방향
function cornerMove(grid,opts){ for(const d of ['down','left','right','up']){ const r=ND.applyMove(grid,d,()=>0,opts); if(r.moved) return d; } return null; }
function randomMove(grid,opts,rng){ const ok=DIRS.filter(d=>ND.applyMove(grid,d,()=>0,opts).moved); return ok.length?ok[Math.floor(rng()*ok.length)]:null; }
function maxOnBoard(g){ let m=0; for(const row of g)for(const t of row)if(t&&t.size>m)m=t.size; return m; }
function runGame(strategy, ai, seed){
  let s=seed|0; const rng=()=>{ s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  const opts=makeOpts(strategy); let grid=emptyGrid(4);
  for(let i=0;i<2;i++){ const sp=spawnTile(grid,rng,opts); if(sp) grid[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  let turns=0, maxR=1;
  while(turns<5000){
    if(ND.checkGameOver(grid,'sizeOnly'))break;
    let dir = ai==='greedy'?greedyMove(grid,opts) : ai==='corner'?cornerMove(grid,opts) : randomMove(grid,opts,rng);
    if(!dir)break;
    const res=ND.applyMove(grid,dir,rng,opts); grid=res.grid;
    if(res.spawned && strategy==='near-max'){ const sp=res.spawned; grid[sp.at[0]][sp.at[1]]={color:sp.color,size:spawnSizeFor(strategy,grid,rng)}; }
    turns++; const m=maxOnBoard(grid); if(m>maxR)maxR=m; if(maxR>=1024)break;
  }
  return { turns, maxR, completed:maxR>=1024 };
}
function summarize(strategy, ai, N){
  let tt=0,tm=0,cp=0; const ms=[];
  for(let i=0;i<N;i++){ const r=runGame(strategy,ai,1000+i*7); tt+=r.turns; tm+=Math.log2(r.maxR); ms.push(r.maxR); if(r.completed)cp++; }
  ms.sort((a,b)=>a-b);
  return { ai, strategy, avgTurns:(tt/N).toFixed(1), avgMaxStep:(tm/N).toFixed(2), medianMax:ms[Math.floor(N/2)], complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=500; const rows=[];
for(const ai of ['greedy','corner','random']) for(const st of ['always1','near-max']) rows.push(summarize(st,ai,N));
console.log('=== 콜렉션 4x4 · AI별 비교 · '+N+'판 ===');
console.table(rows);
