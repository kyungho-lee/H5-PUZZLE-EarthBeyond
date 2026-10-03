/* ending/credits.js — 엔딩 크레딧 데이터 한 벌 (게임 · 엔딩 영상 컴포지션이 같은 파일을 쓴다).
   형식은 LH CREDITS 와 같다(감독 확인 2026-10-04): { title } · { role, name: string | string[] } · { line }.
   AI 에이전트 역할은 「(AI agent)」 표기 + 페르소나 이름. 사운드는 EB 실제 출처(sound.js Web Audio 합성, 외부 음원 없음).
   이 파일을 고치면 tools/ending-video 로 영상을 다시 렌더해야 영상 속 크레딧도 바뀐다(npm run ending:render).
   UMD: module.exports (node · 렌더 준비 스크립트) / SG.EndingCredits (브라우저 · 컴포지션). */
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else { root.SG = root.SG || {}; root.SG.EndingCredits = data; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return [
    { title: 'EARTH & BEYOND' },
    { role: 'Game Director', name: 'Kevin-H5' },
    { role: 'Producer (AI agent)', name: 'Seo Jihyun' },
    { role: 'Tech Lead (AI agent)', name: 'Han Doyun' },
    { role: 'Art Director (AI agent)', name: 'Moon Sera' },
    { role: 'Game Design & Balance (AI agent)', name: 'Lim Haru' },
    { role: 'LiveOps & Engagement (AI agent)', name: 'Yoon Chaewon' },
    { role: 'Release & Service Ops (AI agent)', name: 'Kang Minjae' },
    { role: 'Outside Consultant (AI agent)', name: 'Game Consultant' },
    { role: 'Illustrations', name: 'Curated & edited from image-generation tools' },
    { role: 'Music & Sound', name: 'Original Web Audio synthesis — no recorded samples' },
    { role: 'Fonts (SIL OFL 1.1)', name: 'Rajdhani · Share Tech Mono' },
    { line: 'Built with Claude Code · Playgama Bridge' },
    { line: 'Ending rendered with HyperFrames · FFmpeg' },
    { line: 'From stardust to the stars — see you beyond.' },
  ];
});
