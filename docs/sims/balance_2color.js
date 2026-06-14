const ND = require(__dirname+'/../../src/neon-drift.js');
const TIERS=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.75],[2,0.18],[4,0.07]]},
  {maxAtMost:512,dist:[[1,0.60],[2,0.25],[4,0.10],[8,0.05]]},
  {maxAtMost:Infinity,dist:[[1,0.45],[4,0.30],[8,0.18],[16,0.07]]},
];
function makeOpts(uniform){ return { n:8,mergeRule:'colorAndSize',colors:2,bias:0.55,clampThreshold:2,gradedTiers:TIERS,noColorWin:true,uniformColor:uniform }; }
function emptyGrid(n){return Array.from({length:n},()=>Array(n).fill(null));}
function spawnTile(g,rng,opts){ const sp=ND.spawnTile(g,rng,opts); return sp; }
const DIRS=['up','down','left','right'];
function greedyMove(g,opts){ let best=null; for(const d of DIRS){ const r=ND.applyMove(g,d,()=>0,opts); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!best||sc>best.sc)best={d,sc}; } return best?best.d:null; }
function cornerMove(g,opts){ for(const d of['down','left','right','up']){ const r=ND.applyMove(g,d,()=>0,opts); if(r.moved)return d; } return null; }
function runGame(ai,uniform,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const opts=makeOpts(uniform); let g=emptyGrid(8);
  for(let i=0;i<6;i++){ const sp=spawnTile(g,rng,opts); if(sp)g[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  const reached=new Set(); let turns=0; const cap=15000;
  while(turns<cap){
    if(ND.checkGameOver(g,'colorAndSize'))break;
    let dir=ai==='greedy'?greedyMove(g,opts):cornerMove(g,opts);
    if(!dir)break;
    const res=ND.applyMove(g,dir,rng,opts); g=res.grid;
    const bc=ND.maxSizeByColor(g); bc.forEach((sz,c)=>{ if(sz>=1024) reached.add(c); });
    turns++; if(reached.size>=2)break;
  }
  return { turns, reached:reached.size, completed:reached.size>=2 };
}
function summarize(ai,uniform,N){
  let tt=0,cp=0; const rs=[];
  for(let i=0;i<N;i++){ const r=runGame(ai,uniform,3000+i*7); tt+=r.turns; rs.push(r.reached); if(r.completed)cp++; }
  const avgReached=(rs.reduce((a,b)=>a+b,0)/N).toFixed(2);
  return { ai, uniformColor:uniform, avgTurns:(tt/N).toFixed(0), avgColorsReached:avgReached, complete2colors:((cp/N)*100).toFixed(1)+'%' };
}
const N=200; const rows=[];
for(const ai of['greedy','corner']) for(const u of[true,false]) rows.push(summarize(ai,u,N));
console.log('=== 본게임 8x8 · 2색 colorAndSize · 목표:두 색 각 1024 · '+N+'판 ===');
console.table(rows);
