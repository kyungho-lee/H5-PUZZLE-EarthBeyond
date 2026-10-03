/* bg-fx.js — 플레이 화면 배경 파티클 (v0.9.2 · AD). 보드 뒤 배경 레이어(<canvas id="bg-fx">)에만 그린다.
   ════════════════════════════════════════════════════════════════════════
   - 장(테마)마다 모양 · 움직임 · 기본 색은 아래 THEMES 데이터. 단계(step)마다 색은 그 단계 배경 그림
     (themes/<장>/bg-step-NN.webp — 같은 출처 파일)에서 밝은 쪽 톤을 뽑아 장 기본색과 섞는다 → 배경과 같은 톤.
   - 보드 가독성: 입자는 작고(1~3px) 흐리다(최대 alpha .6). 보드 캔버스가 위에 덮여 보드 안에는 비치지 않는다.
   - 부하: 입자 수 = 화면 넓이 비례 · 상한 36(저사양 추정이면 ×0.6) · 30fps · DPR 상한 1.5 · 미리 그린 빛 스프라이트.
     paused() 가 참(광고 · 플랫폼 일시정지 · 로비)이거나 탭이 숨겨지면 그리지 않는다.
     prefers-reduced-motion 이면 움직이지 않는 한 장면만 그린다.
   - 외부 리소스 없음. 셸(index.html)은 start({ paused }) · set(themeId, stepBgPath) 만 부른다. */
(function (global) {
  'use strict';

  // kind: ember(아래 → 위로 오르는 불티) · dust(옆으로 흐르는 먼지 · 꽃가루) · star(제자리 반짝 + 아주 느린 흐름)
  // colors: 장 기본색(단계 그림 톤을 못 읽을 때 그대로 쓴다) · density: 기본 수 배율 · speed: 속도 배율
  var THEMES = {
    'primordial-earth':   { kind: 'ember', colors: ['#ff8a3d', '#ffb347', '#ff6a2a'], density: 1.0, speed: 1.0 },
    'human-civilization': { kind: 'dust',  colors: ['#e8c27a', '#f3dfb0', '#c99a4a'], density: 0.9, speed: 1.0 },
    'solar-system':       { kind: 'star',  colors: ['#9fc4ff', '#e6eeff', '#b49cff'], density: 1.1, speed: 1.0 },
    _default:             { kind: 'star',  colors: ['#7aacff', '#dde8f6', '#8e9cff'], density: 0.8, speed: 1.0 },
  };
  var MAX_N = 36, AREA_PER = 15000, MIN_N = 16, DPR_CAP = 1.5, FRAME_MS = 1000 / 30, ALPHA_MAX = 0.6;

  var canvas, ctx, w = 0, h = 0, dpr = 1;
  var parts = [], cfg = THEMES._default, tones = cfg.colors.slice(), sprites = {};
  var themeKey = null, stepKey = null, pausedFn = function () { return false; };
  var reduce = false, lowEnd = false, last = 0, started = false;
  var toneCache = {};

  function rand(a, b) { return a + Math.random() * (b - a); }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var A = hexToRgb(a), B = hexToRgb(b); return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }

  // 빛 알갱이 스프라이트(색마다 1장) — 매 프레임 그라디언트를 만들지 않는다
  function sprite(col) {
    if (sprites[col]) return sprites[col];
    var s = document.createElement('canvas'); s.width = s.height = 32;
    var g = s.getContext('2d'), c = hexToRgb(col);
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(' + c + ',0.95)');
    gr.addColorStop(0.45, 'rgba(' + c + ',0.35)');
    gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    sprites[col] = s; return s;
  }

  // 단계 그림의 밝은 쪽 톤 — 24×24 로 줄여 밝기 상위 20% 픽셀 평균. 같은 출처 파일이라 getImageData 가능, 실패하면 null.
  function sampleTone(path, cb) {
    if (!path) return cb(null);
    if (toneCache[path] !== undefined) return cb(toneCache[path]);
    var img = new Image();
    img.onload = function () {
      var tone = null;
      try {
        var c = document.createElement('canvas'); c.width = c.height = 24;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
        var d = g.getImageData(0, 0, 24, 24).data, px = [];
        for (var i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2], d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11]);
        px.sort(function (a, b) { return b[3] - a[3]; });
        var k = Math.max(1, Math.round(px.length * 0.2)), s = [0, 0, 0];
        for (i = 0; i < k; i++) { s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; }
        s = s.map(function (v) { return v / k; });
        var mx = Math.max(s[0], s[1], s[2], 1), lift = Math.min(2.2, 235 / mx);   // 어두운 그림도 입자는 밝게(색상은 유지)
        tone = rgbToHex(s.map(function (v) { return v * lift; }));
      } catch (_) { tone = null; }
      toneCache[path] = tone; cb(tone);
    };
    img.onerror = function () { toneCache[path] = null; cb(null); };
    img.src = path;
  }

  function applyTone(tone) {
    var base = cfg.colors;
    tones = tone ? [mix(base[0], tone, 0.6), mix(base[1], tone, 0.45), mix(base[2], tone, 0.7)] : base.slice();
    for (var i = 0; i < parts.length; i++) parts[i].col = tones[i % tones.length];
    if (reduce) draw(0);
  }

  function count() {
    var n = Math.round((w * h) / AREA_PER * cfg.density);
    n = Math.max(MIN_N, Math.min(MAX_N, n));
    return lowEnd ? Math.round(n * 0.6) : n;
  }

  function spawn(p, fresh) {
    var k = cfg.kind, sp = cfg.speed;
    p.x = rand(0, w);
    p.y = fresh ? rand(0, h) : (k === 'ember' ? h + rand(4, 30) : rand(0, h));
    if (!fresh && k === 'dust') p.x = -rand(4, 30);
    p.r = k === 'star' ? rand(0.6, 1.6) : rand(0.9, 2.2);
    p.vx = k === 'dust' ? rand(4, 11) * sp : k === 'star' ? rand(-1.5, -0.4) * sp : rand(-2, 2) * sp;
    p.vy = k === 'ember' ? -rand(9, 22) * sp : k === 'dust' ? rand(-2.5, 2.5) * sp : rand(0.6, 2) * sp;
    p.ph = Math.random() * 6.283; p.tw = rand(0.5, 1.4); p.a = rand(0.35, 1);
    return p;
  }

  function rebuild() {
    var n = count(); parts = [];
    for (var i = 0; i < n; i++) { var p = spawn({}, true); p.col = tones[i % tones.length]; parts.push(p); }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(global.devicePixelRatio || 1, DPR_CAP);
    w = canvas.clientWidth || global.innerWidth; h = canvas.clientHeight || global.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
    if (reduce) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    var k = cfg.kind, sec = t / 1000;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a;
      if (k === 'ember') {                        // 위로 갈수록 사그라짐 + 깜박임
        var life = Math.max(0, Math.min(1, p.y / h));
        a = p.a * life * (0.65 + 0.35 * Math.sin(sec * 3 * p.tw + p.ph));
      } else if (k === 'dust') {
        a = p.a * (0.55 + 0.45 * Math.sin(sec * 0.9 * p.tw + p.ph));
      } else {
        a = p.a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(sec * 1.6 * p.tw + p.ph)));
      }
      ctx.globalAlpha = Math.max(0, a) * ALPHA_MAX;
      var s = p.r * 6;
      ctx.drawImage(sprite(p.col), p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function step(dt, t) {
    var k = cfg.kind, sec = t / 1000;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += (p.vx + (k === 'ember' ? Math.sin(sec * 1.3 + p.ph) * 6 : 0)) * dt;
      p.y += p.vy * dt;
      if (k === 'star') {                         // 별은 화면을 감아 돈다(갑자기 생기지 않게)
        if (p.x < -34) p.x = w + 30; if (p.y > h + 34) p.y = -30;
        continue;
      }
      if (p.y < -10 || p.y > h + 34 || p.x < -34 || p.x > w + 34) { var col = p.col; spawn(p, false); p.col = col; }
    }
  }

  function frame(ts) {
    global.requestAnimationFrame(frame);
    if (document.hidden || pausedFn()) { last = 0; return; }
    if (last && ts - last < FRAME_MS) return;
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    step(dt, ts); draw(ts);
  }

  function start(opts) {
    if (started) return;
    canvas = document.getElementById('bg-fx');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    started = true;
    if (opts && typeof opts.paused === 'function') pausedFn = opts.paused;
    try { reduce = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) {}
    var nav = global.navigator || {};
    lowEnd = (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || (nav.deviceMemory && nav.deviceMemory <= 2) || false;
    resize();
    global.addEventListener('resize', resize);
    if (reduce) draw(0); else global.requestAnimationFrame(frame);
  }

  // themeId: 장 id(없으면 기본 별가루) · stepBgPath: 지금 단계 배경 그림 경로(없으면 장 기본색)
  function set(themeId, stepBgPath) {
    var tk = THEMES[themeId] ? themeId : '_default';
    if (tk === themeKey && stepBgPath === stepKey) return;
    var themeChanged = tk !== themeKey;
    themeKey = tk; stepKey = stepBgPath;
    if (themeChanged) { cfg = THEMES[tk]; tones = cfg.colors.slice(); if (started) rebuild(); }
    sampleTone(stepBgPath, function (tone) { if (stepKey === stepBgPath) applyTone(tone); });
  }

  global.SG = global.SG || {};
  global.SG.BgFx = { start: start, set: set, THEMES: THEMES, _state: function () { return { n: parts.length, theme: themeKey, tones: tones.slice(), reduce: reduce, lowEnd: lowEnd }; } };
})(typeof window !== 'undefined' ? window : this);
