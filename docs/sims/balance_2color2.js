const ND = require(__dirname+'/../../src/neon-drift.js');
const TIERS=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.75],[2,0.18],[4,0.07]]},
  {maxAtMost:512,dist:[[1,0.60],[2,0.25],[4,0.10],[8,0.05]]},
  {maxAtMost:Infinity,dist:[[1,0.45],[4,0.30],[8,0.18],[16,0.07]]},
];
// bias: majority 색으로 치우치는 확률. clampThreshold: distinct색≤이값이면 majority강제
function makeOpts(bias,clamp){ return { n:8,mergeRule:'colorAndSize',colors:2,bias,clampThreshold:clamp,gradedTiers:TIERS,noColorWin:true }; }
function emptyGrid(n){return Array.from({length:n},()=>Array(n).fill(null));}
const DIRS=['up','down','left','right'];
function greedyMove(g,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(g,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
function runGame(bias,clamp,goal,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const opts=makeOpts(bias,clamp); let g=emptyGrid(8);
  for(let i=0;i<6;i++){ const sp=ND.spawnTile(g,rng,opts); if(sp)g[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  const reached=new Set(); let turns=0; const cap=15000;
  while(turns<cap){
    if(ND.checkGameOver(g,'colorAndSize'))break;
    const dir=greedyMove(g,opts); if(!dir)break;
    const res=ND.applyMove(g,dir,rng,opts); g=res.grid;
    const bc=ND.maxSizeByColor(g); bc.forEach((sz,c)=>{ if(sz>=goal) reached.add(c); });
    turns++; if(reached.size>=2)break;
  }
  return { reached:reached.size, completed:reached.size>=2 };
}
function summarize(bias,clamp,goal,N){
  let cp=0,rr=0; for(let i=0;i<N;i++){ const r=runGame(bias,clamp,goal,3000+i*7); rr+=r.reached; if(r.completed)cp++; }
  return { bias, clamp, goal, avgColorsReached:(rr/N).toFixed(2), complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=200; const rows=[];
// 다양한 bias × clampThreshold × 목표(512/1024) 탐색 (greedy)
for(const goal of[512,1024])
  for(const [bias,clamp] of [[0.5,1],[0.6,1],[0.7,1],[0.8,1],[0.7,2]])
    rows.push(summarize(bias,clamp,goal,N));
console.log('=== 두 색 각 목표 도달 클리어율 (greedy, 200판) ===');
console.table(rows);
