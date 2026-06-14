/**
 * collection_balance.js — 콜렉션 모드 광고 노출 밸런스 시뮬레이션
 *
 * 접근: 실제 보드 엔진 대신 확률 기반 추상 모델 사용
 *
 * 실제 4×4 sizeOnly 보드 greedy AI 실험 결과 (100판):
 *   size ≤32 : 100% 도달
 *   size 64  :  95% 도달
 *   size 128 :  57% 도달
 *   size 256 :  13% 도달
 *   size 512 :   0% 도달 (greedy AI 한계)
 *
 * 사람 플레이 추정 (실수·비최적 but 더 나은 전략):
 *   - 소수 실수, 중간 정도 최적화 → greedy보다 나음
 *   - 플레이어 수준별 도달 확률 파라미터화
 */

'use strict';

// ── 파라미터 ───────────────────────────────────────────────────────────────────
const STEP_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const FINAL_SIZE = 1024;
const CONTINUE_COSTS = [5, 10, 20, 40];
function continueCost(n) { return CONTINUE_COSTS[Math.min(n, CONTINUE_COSTS.length - 1)]; }

// 한 세션(게임오버 전까지)에서 각 size를 최초로 달성할 확률
// 사람 플레이 3단계: 초보/중급/고수
// 근거: greedy AI 실측 + 사람은 AI보다 50~70% 더 나음
const REACH_PROB = {
  beginner: {
    1:1.0, 2:1.0, 4:1.0, 8:1.0, 16:1.0, 32:1.0,
    64:0.70, 128:0.30, 256:0.08, 512:0.02, 1024:0.005
  },
  intermediate: {
    1:1.0, 2:1.0, 4:1.0, 8:1.0, 16:1.0, 32:1.0,
    64:0.90, 128:0.55, 256:0.22, 512:0.07, 1024:0.02
  },
  expert: {
    1:1.0, 2:1.0, 4:1.0, 8:1.0, 16:1.0, 32:1.0,
    64:0.98, 128:0.80, 256:0.45, 512:0.18, 1024:0.06
  },
};

// ── RNG ───────────────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = (seed | 0) >>> 0;
  return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/0x100000000; };
}

// ── 단일 세션 시뮬레이션 (추상) ───────────────────────────────────────────────
// 반환: sizes gained this run (Set), adsUsed, starsSpent, continueCount
function runSession(rng, wallet, acquiredSizes, skill, continueProbability, maxContinues) {
  const prob = REACH_PROB[skill];
  let continueCount = 0;
  let adsUsed = 0;
  let starsSpent = 0;
  const gained = new Set();

  // 초기 한 번 플레이 결과 계산
  function playOnce() {
    for (const sz of STEP_SIZES) {
      if (acquiredSizes.has(sz) || gained.has(sz)) continue;
      if (rng() < prob[sz]) gained.add(sz);
      if (gained.has(FINAL_SIZE)) return true; // 완성
    }
    return false;
  }

  if (playOnce()) return { gained, adsUsed, starsSpent, continueCount };

  // 게임오버 → CONTINUE 루프
  while (continueCount < maxContinues) {
    if (rng() > continueProbability) break; // 유저가 CONTINUE 안 함

    const cost = continueCost(continueCount);
    if (wallet.v >= cost) {
      wallet.v -= cost;
      starsSpent += cost;
    } else {
      adsUsed++;
    }
    continueCount++;

    // CONTINUE 후 추가 진행: 남은 step 획득 확률 (절반 감소)
    for (const sz of STEP_SIZES) {
      if (acquiredSizes.has(sz) || gained.has(sz)) continue;
      const p = prob[sz] * 0.5; // CONTINUE 후 보드 일부 제거로 진행 어려움
      if (rng() < p) gained.add(sz);
      if (gained.has(FINAL_SIZE)) return { gained, adsUsed, starsSpent, continueCount };
    }
  }

  return { gained, adsUsed, starsSpent, continueCount };
}

// ── 테마 완성까지 전체 시뮬레이션 ────────────────────────────────────────────
function simulateTheme(seed, skill, dailyStars, continueProbability, maxContinues) {
  const rng = makeRng(seed);
  const acquired = new Set([1]); // size=1은 자동
  const wallet = { v: 0 };
  let day = 0, totalAds = 0, totalSessions = 0;

  while (!acquired.has(FINAL_SIZE) && day < 365) {
    day++;
    wallet.v += dailyStars; // daily CLAIM

    // 하루 최대 3세션
    for (let s = 0; s < 3 && !acquired.has(FINAL_SIZE); s++) {
      const r = runSession(rng, wallet, acquired, skill, continueProbability, maxContinues);
      for (const sz of r.gained) acquired.add(sz);
      totalAds += r.adsUsed;
      totalSessions++;
    }
  }

  return {
    completed: acquired.has(FINAL_SIZE),
    days: day,
    totalSessions,
    totalAds,
    stepsCompleted: acquired.size,
  };
}

// ── 실행 ──────────────────────────────────────────────────────────────────────
const N = 2000;

console.log('=== 콜렉션 모드 광고 밸런스 시뮬레이션 ===');
console.log(`모델: 확률 추상, N=${N}회 몬테카를로`);
console.log('CONTINUE 비용: 1회=5⭐, 2회=10⭐, 3회=20⭐, 4회+=40⭐ (잔액 부족→광고)\n');

const SCENARIOS = [
  { skill:'beginner',    dailyStars:1, label:'초보 (64달성, 1⭐/일)' },
  { skill:'intermediate',dailyStars:2, label:'중급 (128달성, 2⭐/일)' },
  { skill:'intermediate',dailyStars:3, label:'중급+ (256달성, 3⭐/일)' },
  { skill:'expert',      dailyStars:5, label:'고수 (512달성, 5⭐/일)' },
];
const PLAY_STYLES = [
  { prob:0.30, mc:2, label:'소극 (30% CONTINUE, 최대2회)' },
  { prob:0.70, mc:4, label:'적극 (70% CONTINUE, 최대4회)' },
  { prob:0.90, mc:4, label:'열심 (90% CONTINUE, 최대4회)' },
];

for (const ps of PLAY_STYLES) {
  console.log(`\n▶ 플레이 성향: ${ps.label}`);
  console.log('─'.repeat(72));
  const rows = [];
  for (const sc of SCENARIOS) {
    let sumDays=0, sumAds=0, sumSess=0, ok=0;
    const adArr=[];
    for (let i=0; i<N; i++) {
      const r = simulateTheme(10007+i*31337, sc.skill, sc.dailyStars, ps.prob, ps.mc);
      if (r.completed) { ok++; sumDays+=r.days; sumAds+=r.totalAds; sumSess+=r.totalSessions; adArr.push(r.totalAds); }
    }
    adArr.sort((a,b)=>a-b);
    const p = pct => ok ? adArr[Math.floor(ok*pct)] : '-';
    rows.push({
      '플레이어': sc.label,
      '완성율': ((ok/N)*100).toFixed(0)+'%',
      '평균 일수': ok?(sumDays/ok).toFixed(1):'-',
      '평균 세션': ok?(sumSess/ok).toFixed(1):'-',
      '광고 중앙값': p(0.50),
      '광고 75분위': p(0.75),
      '광고 90분위': p(0.90),
      '광고 평균': ok?(sumAds/ok).toFixed(1):'-',
    });
  }
  console.table(rows);
}

// ── 별 수입 없을 때 (daily 안 함) ────────────────────────────────────────────
console.log('\n\n=== 별 수입 0 (daily 미플레이) — 광고만으로 CONTINUE ===');
{
  const rows=[];
  for (const ps of PLAY_STYLES) {
    for (const sc of SCENARIOS) {
      let sumAds=0,ok=0;const adArr=[];
      for(let i=0;i<N;i++){
        const r=simulateTheme(20013+i*11117, sc.skill, 0, ps.prob, ps.mc);
        if(r.completed){ok++;sumAds+=r.totalAds;adArr.push(r.totalAds);}
      }
      adArr.sort((a,b)=>a-b);
      const p=pct=>ok?adArr[Math.floor(ok*pct)]:'-';
      rows.push({'성향':ps.label,'플레이어':sc.skill,'광고중앙':p(0.50),'광고75%':p(0.75),'완성율':((ok/N)*100).toFixed(0)+'%'});
    }
  }
  console.table(rows);
}

// ── step별 누적 도달 일수 (중급 적극 기준) ────────────────────────────────────
console.log('\n\n=== step별 최초 달성까지 평균 일수 (중급, CONTINUE 70%, 3⭐/일) ===');
{
  const stepDays={};
  for(const sz of STEP_SIZES) stepDays[sz]=[];

  for(let i=0;i<N;i++){
    const rng=makeRng(33333+i*9999);
    const prob=REACH_PROB.intermediate;
    const acquired=new Set([1]);
    const wallet={v:0};
    let day=0;
    const firstDay={};

    while(!acquired.has(FINAL_SIZE)&&day<365){
      day++;
      wallet.v+=3;
      for(let s=0;s<3&&!acquired.has(FINAL_SIZE);s++){
        const r=runSession(rng,wallet,acquired,'intermediate',0.70,4);
        for(const sz of r.gained){
          if(!acquired.has(sz)){acquired.add(sz);if(!firstDay[sz])firstDay[sz]=day;}
        }
      }
    }
    for(const sz of STEP_SIZES) if(firstDay[sz]) stepDays[sz].push(firstDay[sz]);
  }

  const stepRows=STEP_SIZES.slice(1).map(sz=>{
    const arr=stepDays[sz].sort((a,b)=>a-b);
    return{
      'size':sz,
      '도달률':(arr.length/N*100).toFixed(0)+'%',
      '중앙 일수':arr.length?arr[Math.floor(arr.length*0.5)]:'-',
      '75% 일수':arr.length?arr[Math.floor(arr.length*0.75)]:'-',
    };
  });
  console.table(stepRows);
}

console.log('\n=== 해석 ===');
console.log('광고: CONTINUE 선택 시 별 부족 → 광고 1회 노출');
console.log('별이 쌓이면 광고 0회 가능. Daily 꾸준히 → 광고 대폭 감소');
console.log('초보는 step 9(256) 이후 진행이 매우 느려 테마 완성에 수개월 소요');
