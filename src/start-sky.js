/* start-sky.js — 로비(#ol-start) 하늘 연출: 사선으로 지나가는 유성 + 트레일, 은은한 배경 별.
   ════════════════════════════════════════════════════════════════════════
   #ol-start 안의 <canvas id="start-sky"> 에만 그린다. 로비가 보일 때만 돈다 —
   #ol-start 의 class 변화(hidden)를 MutationObserver 로 보고 스스로 켜고 끈다.
   그래서 로비를 여닫는 여러 경로(showStart, 모드 시작 등)를 하나하나 고칠 필요가 없다.
   탭이 숨겨지면 멈춘다. prefers-reduced-motion 이면 유성 없이 배경 별만 정지 상태로 그린다.
   이미지 에셋 없음 — 전부 Canvas 벡터. */
(function (global) {
  'use strict';

  var STAR_COUNT = 22;              // 배경 별
  var MAX_METEORS = 3;              // 동시에 떠 있는 유성 수
  var GAP_MIN = 800, GAP_MAX = 2500; // 유성 생성 간격 (ms)
  var ANGLE = Math.PI * (180 - 35) / 180; // 우상단 → 좌하단, 수평에서 35°
  var DPR_CAP = 2;

  var canvas, ctx, overlay;
  var w = 0, h = 0, dpr = 1;
  var stars = [], meteors = [];
  var running = false, rafId = 0, lastTs = 0, nextSpawnIn = 0;
  var reduceMotion = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(global.devicePixelRatio || 1, DPR_CAP);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h * 0.62,
                   r: rand(0.5, 1.4), phase: Math.random() * Math.PI * 2, speed: rand(0.6, 1.6) });
    }
  }

  function spawnMeteor() {
    var speed = rand(520, 820);                 // px/s
    meteors.push({
      x: rand(w * 0.35, w * 1.1), y: rand(-h * 0.05, h * 0.30),
      vx: Math.cos(ANGLE) * speed, vy: Math.sin(ANGLE) * speed,
      len: Math.min(140, Math.max(60, speed * 0.17)),
      life: rand(900, 1400), age: 0, head: rand(1.6, 2.4),
    });
  }

  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = reduceMotion ? 0.55 : 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t / 1000 * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMeteor(m) {
    var k = m.age / m.life;                      // 0→1
    var fade = k < 0.15 ? k / 0.15 : (k > 0.75 ? (1 - k) / 0.25 : 1);
    var sp = Math.hypot(m.vx, m.vy);
    var ux = m.vx / sp, uy = m.vy / sp;
    var tx = m.x - ux * m.len, ty = m.y - uy * m.len;

    // 트레일: 머리에서 멀어질수록 가늘고 투명해진다. 배경 그림의 톤을 덮지 않도록
    // 색을 입히지 않고 옅은 흰색만 쓴다.
    var g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.7 * fade) + ')');
    g.addColorStop(0.4, 'rgba(235,242,255,' + (0.22 * fade) + ')');
    g.addColorStop(1, 'rgba(235,242,255,0)');
    var nx = -uy, ny = ux, hw = m.head * 0.9;    // 트레일 폭의 절반 (머리 쪽)
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(m.x + nx * hw, m.y + ny * hw);
    ctx.lineTo(tx, ty);
    ctx.lineTo(m.x - nx * hw, m.y - ny * hw);
    ctx.closePath();
    ctx.fill();

    // 머리: 글로우 없는 작은 흰 코어 — 주변을 번지게 하지 않는다 (사용자 지시 2026-09-27:
    // 별 주변 글로우가 배경 그림의 톤앤매너를 약화시킨다). 살짝 반짝임만 둔다.
    var tw = 0.85 + 0.15 * Math.sin(m.age / 45);
    ctx.save();
    ctx.globalAlpha = 0.9 * fade;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(m.x, m.y, m.head * 0.8 * tw, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
    lastTs = ts;
    ctx.clearRect(0, 0, w, h);
    drawStars(ts);

    nextSpawnIn -= dt;
    if (nextSpawnIn <= 0 && meteors.length < MAX_METEORS) {
      spawnMeteor();
      nextSpawnIn = rand(GAP_MIN, GAP_MAX);
    }
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.age += dt;
      m.x += m.vx * dt / 1000; m.y += m.vy * dt / 1000;
      if (m.age >= m.life || m.x < -m.len || m.y > h + m.len) { meteors.splice(i, 1); continue; }
      drawMeteor(m);
    }
    rafId = global.requestAnimationFrame(frame);
  }

  function isLobbyVisible() {
    return overlay && !overlay.classList.contains('hidden') && !global.document.hidden;
  }

  function start() {
    if (running || !canvas) return;
    resize();
    if (reduceMotion) { ctx.clearRect(0, 0, w, h); drawStars(0); return; }
    running = true; lastTs = 0; nextSpawnIn = rand(200, 700);
    rafId = global.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = 0; meteors = [];
  }

  function sync() { if (isLobbyVisible()) start(); else stop(); }

  function init() {
    var doc = global.document;
    canvas = doc.getElementById('start-sky');
    overlay = doc.getElementById('ol-start');
    if (!canvas || !overlay || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    reduceMotion = !!(mq && mq.matches);
    new global.MutationObserver(sync).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    doc.addEventListener('visibilitychange', sync);
    global.addEventListener('resize', function () { if (isLobbyVisible()) { stop(); start(); } });
    sync();
  }

  global.SG = global.SG || {};
  global.SG.StartSky = { init: init, start: start, stop: stop };
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof self !== 'undefined' ? self : this);
