const ND = require(__dirname+'/../../src/neon-drift.js');
// 본게임: 8x8, colorAndSize, 2색상
function makeOpts(){ return { n:8, mergeRule:'colorAndSize', colors:2, bias:0.55, clampThreshold:2 }; }
function emptyGrid(n){ return Array.from({length:n},()=>Array(n).fill(null)); }
function maxOnBoard(g){ let m=0; for(const row of g)for(const t of row)if(t&&t.size>m)m=t.size; return m; }
// graded 분포 (본게임 8x8용 — 보드가 커서 칸 여유 있으므로 always1보다 후반 가속 필요)
function spawnSize(strategy, grid, rng){
  if(strategy==='always1') return 1;
  const mx=maxOnBoard(grid);
  let table;
  if(mx<=8)        table=[[1,1.0]];
  else if(mx<=64)  table=[[1,0.75],[2,0.18],[4,0.07]];
  else if(mx<=512) table=[[1,0.60],[2,0.25],[4,0.10],[8,0.05]];
  else             table=[[1,0.45],[4,0.30],[8,0.18],[16,0.07]];
  let roll=rng(),acc=0; for(const[s,p]of table){acc+=p;if(roll<acc)return s;} return 1;
}
function spawnTile(grid,rng,opts,strategy){
  const e=[]; for(let r=0;r<grid.length;r++)for(let c=0;c<grid.length;c++)if(!grid[r][c])e.push([r,c]);
  if(!e.length)return null; const at=e[Math.floor(rng()*e.length)];
  return { at, color:Math.floor(rng()*opts.colors), size:spawnSize(strategy,grid,rng) };
}
const DIRS=['up','down','left','right'];
function greedyMove(grid,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(grid,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
function cornerMove(grid,opts){ for(const d of['down','left','right','up']){ const r=ND.applyMove(grid,d,()=>0,opts); if(r.moved)return d; } return null; }
function runGame(ai,strategy,goal,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const opts=makeOpts(); let grid=emptyGrid(8);
  for(let i=0;i<4;i++){ const sp=spawnTile(grid,rng,opts,strategy); if(sp)grid[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  let turns=0,maxR=1; const cap=12000;
  while(turns<cap){
    if(ND.checkGameOver(grid,'colorAndSize'))break;
    let dir=ai==='greedy'?greedyMove(grid,opts):cornerMove(grid,opts);
    if(!dir)break;
    const res=ND.applyMove(grid,dir,rng,opts); grid=res.grid;
    if(res.spawned && strategy!=='always1'){ const sp=res.spawned; grid[sp.at[0]][sp.at[1]]={color:sp.color,size:spawnSize(strategy,grid,rng)}; }
    turns++; const m=maxOnBoard(grid); if(m>maxR)maxR=m; if(maxR>=goal)break;
  }
  return { turns,maxR,completed:maxR>=goal };
}
function summarize(ai,strategy,goal,N){
  let tt=0,cp=0; const ms=[];
  for(let i=0;i<N;i++){ const r=runGame(ai,strategy,goal,2000+i*7); tt+=r.turns; ms.push(r.maxR); if(r.completed)cp++; }
  ms.sort((a,b)=>a-b);
  return { ai,spawn:strategy,goal,avgTurns:(tt/N).toFixed(0),medianMax:ms[Math.floor(N/2)],p90Max:ms[Math.floor(N*0.9)],complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=300; const rows=[];
for(const ai of['greedy','corner']) for(const st of['always1','graded']) rows.push(summarize(ai,st,4096,N));
console.log('=== 본게임 8x8 · colorAndSize · 2색상 · 목표 4096(12단계) · '+N+'판 ===');
console.table(rows);
