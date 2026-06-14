const ND = require(__dirname+'/../../src/neon-drift.js');
// graded 강도 3종
const TIER_WEAK=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.85],[2,0.12],[4,0.03]]},
  {maxAtMost:Infinity,dist:[[1,0.75],[2,0.18],[4,0.07]]},
];
const TIER_MED=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.75],[2,0.18],[4,0.07]]},
  {maxAtMost:512,dist:[[1,0.60],[2,0.25],[4,0.10],[8,0.05]]},
  {maxAtMost:Infinity,dist:[[1,0.45],[4,0.30],[8,0.18],[16,0.07]]},
];
const TIER_STRONG=[
  {maxAtMost:8,dist:[[1,0.8],[2,0.2]]},
  {maxAtMost:64,dist:[[1,0.5],[2,0.3],[4,0.2]]},
  {maxAtMost:512,dist:[[1,0.35],[4,0.35],[8,0.2],[16,0.1]]},
  {maxAtMost:Infinity,dist:[[1,0.3],[8,0.35],[16,0.25],[32,0.1]]},
];
const TIERS={weak:TIER_WEAK,med:TIER_MED,strong:TIER_STRONG};
function makeOpts(tier){ return { n:8,mergeRule:'colorAndSize',colors:2,bias:0.7,clampThreshold:1,gradedTiers:TIERS[tier],noColorWin:true }; }
function emptyGrid(n){return Array.from({length:n},()=>Array(n).fill(null));}
const DIRS=['up','down','left','right'];
function greedyMove(g,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(g,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
// clearOnGoal: 1024 도달 시 해당 색 전체 보드에서 제거
function runGame(tier,clearOnGoal,goal,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const opts=makeOpts(tier); let g=emptyGrid(8);
  for(let i=0;i<6;i++){ const sp=ND.spawnTile(g,rng,opts); if(sp)g[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  const reached=new Set(); let turns=0; const cap=15000;
  while(turns<cap){
    if(ND.checkGameOver(g,'colorAndSize'))break;
    const dir=greedyMove(g,opts); if(!dir)break;
    const res=ND.applyMove(g,dir,rng,opts); g=res.grid;
    const bc=ND.maxSizeByColor(g);
    bc.forEach((sz,c)=>{ if(sz>=goal && !reached.has(c)){ reached.add(c);
      if(clearOnGoal){ for(let r=0;r<8;r++)for(let cc=0;cc<8;cc++) if(g[r][cc]&&g[r][cc].color===c) g[r][cc]=null; }
    }});
    turns++; if(reached.size>=2)break;
  }
  return { reached:reached.size, completed:reached.size>=2, turns };
}
function summarize(tier,clearOnGoal,goal,N){
  let cp=0,rr=0,tt=0; for(let i=0;i<N;i++){ const r=runGame(tier,clearOnGoal,goal,4000+i*7); rr+=r.reached; tt+=r.turns; if(r.completed)cp++; }
  return { tier, clearOnGoal, goal, avgColorsReached:(rr/N).toFixed(2), avgTurns:(tt/N).toFixed(0), complete:((cp/N)*100).toFixed(1)+'%' };
}
const N=200; const rows=[];
// 가설1: 1024 도달시 해당색 소거 ON/OFF (med graded, goal 1024)
rows.push(summarize('med',false,1024,N));
rows.push(summarize('med',true,1024,N));
// 가설2: graded 강도별 (소거 ON, goal 1024) — 높은수 스폰일수록 쉬워지나?
rows.push(summarize('weak',true,1024,N));
rows.push(summarize('strong',true,1024,N));
console.log('=== bias0.7 · 소거메커니즘 & graded강도 검증 (greedy, '+N+'판) ===');
console.table(rows);
