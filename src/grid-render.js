/* grid-render.js — Canvas renderer + slide tween for Neon Drift.
   Depends on SG.COLOR_PALETTE + SG.BLOCK_TYPES (palette.js),
   SG.ParticleSystem/SG.FloatText/SG.Ring (particles.js).
   Browser global: SG.Renderer. No game-rule logic. */
(function (global) {
  'use strict';
  const { COLOR_PALETTE } = global.SG;
  const BLOCK_TYPES = global.SG.BLOCK_TYPES || [];

  const TWEEN_MS = 120;                 // total slide tween (NFR-1)
  const POP_MS = 140;                   // merged-tile scale-pop duration

  // ── Image placeholder cache (main mode: BLOCK_TYPES by color index) ─
  const _imgCache = {};
  function tileImage(typeIdx) {
    const def = BLOCK_TYPES[typeIdx];
    if (!def || !def.image) return null;
    let entry = _imgCache[typeIdx];
    if (entry === undefined) {
      const img = new Image();
      img.src = def.image;
      img.onerror = () => { _imgCache[typeIdx] = null; };
      _imgCache[typeIdx] = img;
      entry = img;
    }
    return entry && entry.complete && entry.naturalWidth > 0 ? entry : null;
  }

  // ── Collection tile image cache (size → SVG step image) ───────────
  const _collImgCache = {};  // "themeId:size" → HTMLImageElement | null
  function collTileImage(theme, size) {
    if (!theme) return null;
    // 테마별 stepSizes를 우선 사용 (per-theme support). 없으면 전역 SIZE_TO_STEP 폴백.
    let step;
    if (theme.stepSizes && theme.stepSizes.length) {
      step = theme.stepSizes.indexOf(size);
      step = step !== -1 ? step + 1 : null;
    } else {
      const SIZE_TO_STEP = global.SG && global.SG.Collection && global.SG.Collection.SIZE_TO_STEP;
      step = SIZE_TO_STEP ? SIZE_TO_STEP[size] : null;
    }
    if (!step) return null;
    const key = theme.id + ':' + size;
    let entry = _collImgCache[key];
    if (entry === undefined) {
      const path = theme.svgPaths && theme.svgPaths[step - 1];
      if (!path) { _collImgCache[key] = null; return null; }
      const img = new Image();
      img.src = path;
      img.onerror = () => { _collImgCache[key] = null; };
      img.onload = () => { _collImgCache[key] = img; };
      _collImgCache[key] = img;
      entry = img;
    }
    return entry && entry.complete && entry.naturalWidth > 0 ? entry : null;
  }

  // ── 테마 보드/슬롯 배경 이미지 캐시 ────────────────────────────────
  // key: "themeId:board" | "themeId:slot1" | "themeId:slot2"
  const _skinCache = {};
  // 로드 완료 후 렌더러에 알려서 즉시 리드로 — 지연 없이 반영.
  let _skinRendererRef = null;  // Renderer 인스턴스 (생성 시 주입)
  function _loadSkinImg(key, path) {
    if (_skinCache[key] !== undefined) return _skinCache[key];
    const img = new Image();
    img.src = path;
    img.onerror = () => { _skinCache[key] = null; };
    img.onload  = () => {
      _skinCache[key] = img;
      // 로드 완료 시 현재 grid를 다시 그려서 즉시 스킨 반영
      if (_skinRendererRef && _skinRendererRef.grid) {
        _skinRendererRef.drawGrid(_skinRendererRef.grid);
      }
    };
    _skinCache[key] = img;
    return img;
  }
  function _skinImg(theme, type) {
    if (!theme) return null;
    const key = theme.id + ':' + type;
    let path;
    if (type === 'board')  path = theme.boardBg;
    else if (type === 'slot1') path = theme.slotBg1;
    else if (type === 'slot2') path = theme.slotBg2 || theme.slotBg1; // slot2 없으면 slot1 공유
    if (!path) { if (_skinCache[key] === undefined) _skinCache[key] = null; return null; }
    const img = _loadSkinImg(key, path);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }
  const DEV = (() => {
    try {
      return /(\?|&)dev\b/.test(location.search) || localStorage.getItem('sg_dev') === '1';
    } catch (_) { return false; }
  })();

  const easeOut = t => 1 - (1 - t) * (1 - t);

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.n = 8;                 // board size; setMode('daily') → 4
      this.colorBySize = false;   // daily: color tiles by size + draw numbers
      this.ctx = canvas.getContext('2d');
      this.particles = new global.SG.ParticleSystem(600);
      this.floats = [];
      this.rings = [];                  // expanding glow rings (merge FX)
      this.pops = new Map();            // key "r,c" → {t, life} scale-pop on merged tiles
      this.flash = null;                // { life, maxLife, color } screen flash on big merges
      this.edge = null;                 // { dir, life, maxLife } directional board-edge glow
      this.grid = null;                 // last known static grid (drawn every frame)
      this.cell = 0;
      this.pad = 0;
      this.tween = null;                // { from, result, start, dur, onDone, firedMerges }
      this._lastTs = 0;
      this.collectionTheme = null;      // set via setCollectionTheme() in collection mode
      this._stepBgPath = null;          // Chronicles: per-step bg override
      this._stepBgImg = null;
      this._stepBgFade = 0;            // 0→1 fade-in progress
      this._stepBgFadeStart = 0;
      this._stepBgFadeDur = 800;       // ms
      _skinRendererRef = this;          // 스킨 이미지 onload → 즉시 리드로용 참조
      this.resize();
    }

    setCollectionTheme(theme) {
      this.collectionTheme = theme || null;
    }

    // Chronicles: step 완료 시 배경 교체 (페이드인)
    setStepBg(path) {
      if (!path || this._stepBgPath === path) return;
      this._stepBgPath = path;
      const img = new Image();
      img.onload = () => {
        this._stepBgImg = img;
        this._stepBgFadeStart = performance.now();
        this._stepBgFade = 0;
      };
      img.src = path;
    }

    clearStepBg() {
      this._stepBgPath = null;
      this._stepBgImg = null;
      this._stepBgFade = 0;
    }

    resize() {
      const dpr = global.devicePixelRatio || 1;
      const size = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) || 360;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.pad = Math.round(size * 0.02);
      this.cell = (size - this.pad * 2) / this.n;
    }

    // gridSize: 명시적 크기. 생략 시 daily=4, main=8 기본값.
    setMode(mode, gridSize) {
      if (mode === 'daily') { this.n = gridSize || 4; this.colorBySize = true; }
      else { this.n = gridSize || 8; this.colorBySize = false; }
      // n just changed: the old grid/tween belong to the previous board size.
      // Drop them so a tick between setMode() and the next drawGrid() can't draw
      // an N-sized loop over a differently-sized grid (grid[r] undefined → crash).
      this.grid = null;
      this.tween = null;
      this.pops.clear();
      this.resize();
    }

    cellXY(r, c) {
      return [this.pad + c * this.cell + this.cell / 2, this.pad + r * this.cell + this.cell / 2];
    }

    // The palette ({fill,glow}) a tile is drawn with. Daily colors by size,
    // main by color index. Shared so FX (rings/particles/flash) sync to the
    // tile's actual color — a same-color ring over the tile reads as a
    // translucent ripple rather than a mismatched flash.
    _tilePal(tile) {
      if (this.colorBySize && global.SG && global.SG.sizeColor) {
        return global.SG.sizeColor(tile.size);
      }
      return COLOR_PALETTE[tile.color] || COLOR_PALETTE[0];
    }

    drawTile(cx, cy, tile, alpha = 1, scale = 1) {
      const ctx = this.ctx;
      const pal = this._tilePal(tile);
      const s = this.cell * 0.86 * scale;
      const x = cx - s / 2, y = cy - s / 2, rad = s * 0.18;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 12;

      // 콜렉션 모드: 테마 이미지 자체가 블록(숫자/그림 포함) → 이미지 위에 숫자 중복 표기 금지
      const isCollection = !!this.collectionTheme;
      const img = isCollection
        ? collTileImage(this.collectionTheme, tile.size)
        : tileImage(tile.color);
      const drewImage = !!img;
      if (img) {
        ctx.drawImage(img, x, y, s, s);
      } else {
        // Default: color block (rounded rect).
        ctx.fillStyle = pal.fill;
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + s, y, x + s, y + s, rad);
        ctx.arcTo(x + s, y + s, x, y + s, rad);
        ctx.arcTo(x, y + s, x, y, rad);
        ctx.arcTo(x, y, x + s, y, rad);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      // 이미지를 그린 경우 숫자 오버레이 생략 (이미지에 이미 표기됨).
      // 콜렉션 이미지가 아직 로드 안 된 fallback 블록은 숫자를 그려 단계를 식별.
      const drawNumber = drewImage ? false : (DEV || this.colorBySize);
      if (drawNumber) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.colorBySize ? '#0a0e16' : '#6b7299';
        ctx.font = `bold ${Math.round(this.cell * (this.colorBySize ? 0.30 : 0.28))}px 'Rajdhani','Share Tech Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.size), cx, cy);
      }

      // 콜렉션 모드 + 이미지 표시 중: 우측 상단에 단계 번호 배지
      // 테마에 showStepBadge: false 설정 시 생략 (숫자 테마처럼 이미지 자체가 단계 정보인 경우)
      if (isCollection && drewImage && this.collectionTheme.showStepBadge !== false) {
        const theme = this.collectionTheme;
        const sizes = (theme && theme.stepSizes) ||
          (global.SG && global.SG.Collection && global.SG.Collection.STEP_SIZES) || [];
        const stepNum = sizes.indexOf(tile.size) + 1;  // 0-based → 1-based, 없으면 0
        if (stepNum > 0) {
          const r = this.cell * 0.13;          // 배지 반지름
          const bx = cx + s / 2 - r * 0.9;    // 우측
          const by = cy - s / 2 + r * 0.9;    // 상단
          ctx.shadowBlur = 0;
          ctx.globalAlpha = alpha;
          // 배지 원 배경
          ctx.fillStyle = 'rgba(6,8,16,0.82)';
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.fill();
          // 배지 테두리
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = Math.max(0.8, r * 0.12);
          ctx.stroke();
          // 단계 숫자
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(r * 1.1)}px 'Rajdhani','Share Tech Mono',monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(stepNum), bx, by);
        }
      }

      ctx.restore();
    }

    // 빈 슬롯 배경 한 칸. (r+c) % 2 로 slot-bg01 / slot-bg02 번갈아 사용.
    // slot-bg02 미지정 시 slot-bg01 단독 사용. 이미지 없으면 기본 색 폴백.
    _drawCellBg(cx, cy, r, c) {
      const ctx = this.ctx;
      const even = (((r || 0) + (c || 0)) % 2 === 0);
      const slotImg = _skinImg(this.collectionTheme, even ? 'slot1' : 'slot2');
      const sz = this.cell * 0.86;
      const x = cx - sz / 2, y = cy - sz / 2;
      ctx.save();
      if (slotImg) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(slotImg, x, y, sz, sz);
      } else {
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#1e2235';
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.restore();
    }

    // 보드 전체 배경 이미지를 보드 영역에 맞춰 그린다.
    // 슬롯 이미지 없을 때만 개별 셀 배경이 이 위에 얹힌다.
    _drawBoardBg() {
      const ctx = this.ctx;
      const boardSize = this.cell * this.n;
      const x = this.pad, y = this.pad;

      // 1) 테마 기본 배경 (흐리게 — 블록 강조를 위해 alpha 0.45, dim 오버레이 추가)
      const boardImg = _skinImg(this.collectionTheme, 'board');
      if (boardImg) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(boardImg, x, y, boardSize, boardSize);
        ctx.restore();

        // dim 레이어: 배경을 더 눌러 블록 대비 확보
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#050810';
        ctx.fillRect(x, y, boardSize, boardSize);
        ctx.restore();
      }

      // 2) Chronicles step 배경 — 페이드인 후 위에 얹힘 (alpha 최대 0.55, dim 동일)
      if (this._stepBgImg) {
        const elapsed = performance.now() - this._stepBgFadeStart;
        this._stepBgFade = Math.min(1, elapsed / this._stepBgFadeDur);
        const t = this._stepBgFade;
        // easeOut
        const alpha = (1 - (1 - t) * (1 - t)) * 0.55;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(this._stepBgImg, x, y, boardSize, boardSize);
        ctx.restore();

        // step bg용 dim 오버레이
        ctx.save();
        ctx.globalAlpha = (1 - (1 - t) * (1 - t)) * 0.3;
        ctx.fillStyle = '#050810';
        ctx.fillRect(x, y, boardSize, boardSize);
        ctx.restore();
      }
    }

    // Draw the board (cell backgrounds + tiles) WITHOUT clearing. Applies any
    // active scale-pop to merged tiles. Skip cells listed in `skip` (set of "r,c").
    _drawBoard(grid, skip) {
      if (!grid || grid.length !== this.n) return;   // size mismatch → skip (don't crash)
      // 보드 배경 이미지가 있으면 먼저 그린다 (슬롯 배경 아래 레이어).
      this._drawBoardBg();
      for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) {
        const [cx, cy] = this.cellXY(r, c);
        this._drawCellBg(cx, cy, r, c);
        if (skip && skip.has(r + ',' + c)) continue;
        if (grid[r][c]) {
          const pop = this.pops.get(r + ',' + c);
          this.drawTile(cx, cy, grid[r][c], 1, pop ? pop.scale : 1);
        }
      }
    }

    // Public: set the current static grid and redraw it (clears first).
    drawGrid(grid) {
      this.grid = grid;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this._drawBoard(grid);
    }

    animate(fromGrid, result, onDone) {
      this.tween = {
        from: fromGrid, result, start: null, dur: TWEEN_MS, onDone, firedMerges: false,
      };
    }

    _fireMerges(result) {
      let maxStep = 0;
      let flashColor = null;
      for (const m of result.merges) {
        const [cx, cy] = this.cellXY(m.at[0], m.at[1]);
        const tile = result.grid[m.at[0]][m.at[1]];
        // Sync FX color to the MERGED tile (daily: by size, main: by color) so
        // the ring reads as a translucent ripple over the same-colored tile.
        // On a 2048 target the tile is removed → fall back to its merge size.
        const pal = tile ? this._tilePal(tile) : (this._tilePal({ color: 0, size: m.size }));
        const step = Math.max(1, Math.round(Math.log2(m.size)));   // size→intensity step
        if (step > maxStep) { maxStep = step; flashColor = pal.glow; }
        // Intensity by size: more particles + bigger ring the higher the step.
        const count = Math.min(5 + step * 3, 22);
        this.particles.emit(cx, cy, pal, count);
        const ringEnd = this.cell * (0.85 + step * 0.18);
        this.rings.push(new global.SG.Ring(cx, cy, this.cell * 0.40, ringEnd, pal.glow, 240 + step * 40));
        // Scale-pop grows slightly with size (bigger merges feel weightier).
        this.pops.set(m.at[0] + ',' + m.at[1], { life: POP_MS, scale: 1.2 + Math.min(step * 0.06, 0.25) });
        const fscale = Math.min(1 + Math.log2(m.size), 3.5);
        this.floats.push(new global.SG.FloatText(cx, cy, '+' + m.size, pal.fill, fscale));
      }
      // Screen flash for sizable merges (step >= 3, i.e. size >= 8). Stronger
      // with bigger maxStep but always subtle (cap alpha).
      if (maxStep >= 3) {
        this.flash = { life: 220, maxLife: 220, color: flashColor || '#ffffff',
                       peak: Math.min(0.10 + (maxStep - 3) * 0.05, 0.28) };
      }

      // Star-target hits (daily): a merge that completed a target grants stars.
      // Celebrate with a gold "⭐+N" float + a gold ring so the reward reads.
      // Drawn ABOVE the merge float (offset up) and never reuses tile color.
      const completed = result.completed || [];
      for (const cinfo of completed) {
        const [cx, cy] = this.cellXY(cinfo.at[0], cinfo.at[1]);
        const gold = { fill: '#ffd23f', glow: '#ffe98a' };
        const fscale = Math.min(1.6 + Math.log2(cinfo.size) * 0.18, 3.5);
        this.floats.push(new global.SG.FloatText(cx, cy - this.cell * 0.30,
          '⭐+' + cinfo.stars, gold.fill, fscale));
        this.particles.emit(cx, cy, gold, 14);
        this.rings.push(new global.SG.Ring(cx, cy, this.cell * 0.42,
          this.cell * 1.15, gold.glow, 360));
        // A brief warm flash on a big target so it feels like an achievement.
        if (cinfo.stars >= 3) {
          this.flash = { life: 260, maxLife: 260, color: gold.glow,
                         peak: Math.min(0.14 + cinfo.stars * 0.02, 0.30) };
        }
      }
    }

    _drawFlash() {
      if (!this.flash) return;
      const f = this.flash;
      const t = f.life / f.maxLife;                 // 1→0
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = f.peak * t;                 // fade out
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    // Directional board-edge glow: a bright accent line on the edge the push
    // moves toward, telling the player which way the board slid.
    flashEdge(dir) { this.edge = { dir: dir, life: 200, maxLife: 200 }; }

    _drawEdge() {
      if (!this.edge) return;
      const e = this.edge;
      const t = e.life / e.maxLife;                  // 1→0
      const ctx = this.ctx;
      // Board bounds in CSS px (cellXY uses pad + cell grid). Use full board box.
      const x0 = this.pad, y0 = this.pad;
      const x1 = this.pad + this.cell * this.n, y1 = this.pad + this.cell * this.n;
      const thick = Math.max(3, this.cell * 0.10);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.shadowColor = '#00f5c8';
      ctx.shadowBlur = 18 * t + 6;
      // gradient along the lit edge for a sleek look
      let x, y, w, h;
      if (e.dir === 'left')  { x = x0; y = y0; w = thick; h = y1 - y0; }
      else if (e.dir === 'right') { x = x1 - thick; y = y0; w = thick; h = y1 - y0; }
      else if (e.dir === 'up')    { x = x0; y = y0; w = x1 - x0; h = thick; }
      else /* down */             { x = x0; y = y1 - thick; w = x1 - x0; h = thick; }
      ctx.fillStyle = '#00f5c8';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    tick(ts) {
      const dt = this._lastTs ? Math.min((ts - this._lastTs) / 1000, 0.05) : 0;
      this._lastTs = ts;
      const ctx = this.ctx;

      // (1) Always clear — prevents particle/ring afterimage trails.
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // (2) Advance scale-pop timers BEFORE drawing the board, so _drawBoard
      // reads the current scale (1.25 → 1.0). Expired pops are removed.
      if (this.pops.size) {
        for (const [key, p] of this.pops) {
          p.life -= dt * 1000;
          if (p.life <= 0) { this.pops.delete(key); continue; }
          const prog = 1 - p.life / POP_MS;        // 0→1
          p.scale = 1.25 - 0.25 * easeOut(prog);   // 1.25 → 1.0
        }
      }

      // (3) Board: tween in progress → draw sliding tiles; else static grid.
      if (this.tween) {
        if (this.tween.start == null) this.tween.start = ts;
        const t = Math.min((ts - this.tween.start) / this.tween.dur, 1);
        const k = easeOut(t);
        this._drawBoardBg();
        for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) {
          this._drawCellBg(...this.cellXY(r, c), r, c);
        }
        for (const mv of this.tween.result.moves) {
          const [fr, fc] = mv.from, [tr, tc] = mv.to;
          const [fx, fy] = this.cellXY(fr, fc);
          const [txp, typ] = this.cellXY(tr, tc);
          const tile = this.tween.from[fr][fc];
          if (tile) this.drawTile(fx + (txp - fx) * k, fy + (typ - fy) * k, tile);
        }
        if (t >= 1) {
          const done = this.tween.onDone;
          const result = this.tween.result;
          const firedMerges = this.tween.firedMerges;
          this.grid = result.grid;
          this.tween = null;                       // clear first so a throw can't relock the tween
          try {
            if (!firedMerges) this._fireMerges(result);   // spawns pops/rings/particles
            this._drawBoard(this.grid);                   // settled board (pops apply next frames)
          } finally {
            if (done) done();                      // always release the shell's isAnimating gate
          }
        }
      } else if (this.grid) {
        this._drawBoard(this.grid);
      }

      // (3.5) Screen flash (big merges) — tints board, drawn under overlays.
      if (this.flash) {
        this._drawFlash();
        this.flash.life -= dt * 1000;
        if (this.flash.life <= 0) this.flash = null;
      }

      // (3.6) Directional board-edge glow — shows which way the board slid.
      if (this.edge) {
        this._drawEdge();
        this.edge.life -= dt * 1000;
        if (this.edge.life <= 0) this.edge = null;
      }

      // (4) Overlays: rings, particles, float texts.
      this.rings = this.rings.filter(r => r.alive);
      this.rings.forEach(r => { r.update(dt); r.draw(ctx); });
      this.particles.update(dt);
      this.particles.draw(ctx);
      this.floats = this.floats.filter(f => f.alive);
      this.floats.forEach(f => { f.update(dt); f.draw(ctx); });
    }
  }

  global.SG = global.SG || {};
  global.SG.Renderer = Renderer;
})(typeof self !== 'undefined' ? self : this);
