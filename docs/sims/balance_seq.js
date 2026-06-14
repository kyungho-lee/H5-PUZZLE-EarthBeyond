const ND = require(__dirname+'/../../src/neon-drift.js');
const TIER_WEAK=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.85],[2,0.12],[4,0.03]]},
  {maxAtMost:Infinity,dist:[[1,0.75],[2,0.18],[4,0.07]]},
];
function makeOpts(bias,clamp){ return { n:8,mergeRule:'colorAndSize',colors:2,bias,clampThreshold:clamp,gradedTiers:TIER_WEAK,noColorWin:true }; }
function emptyGrid(n){return Array.from({length:n},()=>Array(n).fill(null));}
const DIRS=['up','down','left','right'];
function greedyMove(g,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(g,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
// 순차 클리어: 색 1024 도달 → 그 색 소거(실제 게임 로직과 동일)
function runGame(bias,clamp,goal,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const opts=makeOpts(bias,clamp); let g=emptyGrid(8);
  for(let i=0;i<6;i++){ const sp=ND.spawnTile(g,rng,opts); if(sp)g[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  const reached=new Set(); let turns=0; const cap=20000;
  while(turns<cap){
    if(ND.checkGameOver(g,'colorAndSize'))break;
    const dir=greedyMove(g,opts); if(!dir)break;
    const res=ND.applyMove(g,dir,rng,opts); g=res.grid;
    const bc=ND.maxSizeByColor(g);
    let cleared=[];
    bc.forEach((sz,c)=>{ if(sz>=goal && !reached.has(c)){ reached.add(c); cleared.push(c); }});
    if(cleared.length){ for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++) if(g[r][cc]&&cleared.indexOf(g[r][cc].color)!==-1) g[r][cc]=null; }
    turns++; if(reached.size>=2)break;
  }
  return { reached:reached.size, completed:reached.size>=2, turns };
}
function summarize(bias,clamp,goal,N){
  let cp=0,rr=0,tt=0; for(let i=0;i<N;i++){ const r=runGame(bias,clamp,goal,5000+i*7); rr+=r.reached; tt+=r.turns; if(r.completed)cp++; }
  return { bias, clamp, goal, avgColorsReached:(rr/N).toFixed(2), avgTurns:(tt/N).toFixed(0), complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=200; const rows=[];
for(const goal of[512,1024])
  for(const [b,cl] of [[0.6,1],[0.7,1],[0.8,1],[0.85,1]])
    rows.push(summarize(b,cl,goal,N));
console.log('=== 순차클리어(색소거) · weak graded · greedy · '+N+'판 ===');
console.table(rows);
