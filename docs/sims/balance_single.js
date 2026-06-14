const ND = require(__dirname+'/../../src/neon-drift.js');
const TIER_WEAK=[
  {maxAtMost:8,dist:[[1,1.0]]},
  {maxAtMost:64,dist:[[1,0.85],[2,0.12],[4,0.03]]},
  {maxAtMost:Infinity,dist:[[1,0.75],[2,0.18],[4,0.07]]},
];
function opts(){ return { n:8,mergeRule:'colorAndSize',colors:2,bias:0.7,clampThreshold:1,gradedTiers:TIER_WEAK,noColorWin:true }; }
function emptyGrid(n){return Array.from({length:n},()=>Array(n).fill(null));}
const DIRS=['up','down','left','right'];
function greedy(g,o){ let b=null; for(const d of DIRS){ const r=ND.applyMove(g,d,()=>0,o); if(!r.moved)continue; const e=r.grid.flat().filter(x=>!x).length; const sc=r.merges.length*100+e; if(!b||sc>b.sc)b={d,sc}; } return b?b.d:null; }
function corner(g,o){ for(const d of['down','left','right','up']){ const r=ND.applyMove(g,d,()=>0,o); if(r.moved)return d; } return null; }
function run(ai,seed){
  let s=seed|0; const rng=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  const o=opts(); let g=emptyGrid(8);
  for(let i=0;i<6;i++){ const sp=ND.spawnTile(g,rng,o); if(sp)g[sp.at[0]][sp.at[1]]={color:sp.color,size:sp.size}; }
  let turns=0,maxR=1; const cap=15000;
  while(turns<cap){ if(ND.checkGameOver(g,'colorAndSize'))break; const d=ai==='greedy'?greedy(g,o):corner(g,o); if(!d)break; const r=ND.applyMove(g,d,rng,o); g=r.grid; turns++; const m=ND.maxSize(g); if(m>maxR)maxR=m; if(maxR>=1024)break; }
  return { maxR, turns, win:maxR>=1024 };
}
function sum(ai,N){ let cp=0,tt=0; const ms=[]; for(let i=0;i<N;i++){ const r=run(ai,6000+i*7); tt+=r.turns; ms.push(r.maxR); if(r.win)cp++; } ms.sort((a,b)=>a-b); return { ai, avgTurns:(tt/N).toFixed(0), medianMax:ms[Math.floor(N/2)], clear1024:((cp/N)*100).toFixed(1)+'%' }; }
const N=300;
console.log('=== 본게임 단일 1024 클리어 · 8x8 2색 weak graded · '+N+'판 ===');
console.table([sum('greedy',N), sum('corner',N)]);
