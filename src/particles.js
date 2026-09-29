/* particles.js — render-only FX. Ported from SameGame Grid Protocol render.js.
   Uses Math.random() internally (render-only; core stays deterministic).
   Browser globals: SG.Particle, SG.ParticleSystem, SG.FloatText. */
(function (global) {
  'use strict';

  const TRAIL_LEN = 8;       // afterimage samples kept per particle
  const COUNT_SCALE = 2;     // every emit() call spreads this many times more particles

  class Particle {
    constructor() { this.active = false; this.trail = []; }
    spawn(x, y, color, vx, vy, life, size) {
      Object.assign(this, { x, y, color, vx, vy, life, maxLife: life, size, active: true });
      this.trail.length = 0;
    }
    update(dt) {
      if (!this.active) return;
      this.trail.push(this.x, this.y);
      if (this.trail.length > TRAIL_LEN * 2) this.trail.splice(0, 2);
      this.x += this.vx * dt;
      this.y += (this.vy + 40 * (1 - this.life / this.maxLife)) * dt;  // gentle drift
      this.vx *= 0.97;
      this.vy *= 0.97;
      this.life -= dt * 1000;
      if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
      if (!this.active) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      // Shrinks only to 40% so the spark stays readable while it fades.
      const s = this.size * (0.4 + 0.6 * alpha);
      ctx.fillStyle = this.color;
      // Afterimage: older samples fainter and smaller.
      const n = this.trail.length / 2;
      for (let i = 0; i < n; i++) {
        const k = (i + 1) / (n + 1);
        const ts = s * (0.35 + 0.65 * k);
        ctx.globalAlpha = alpha * 0.45 * k;
        ctx.fillRect(this.trail[i * 2] - ts / 2, this.trail[i * 2 + 1] - ts / 2, ts, ts);
      }
      ctx.globalAlpha = Math.min(1, alpha * 1.2);
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  class ParticleSystem {
    constructor(maxParticles = 1500) {
      this.pool = Array.from({ length: maxParticles }, () => new Particle());
    }
    // Bold preset: big sparks, long life with afterimage trails.
    emit(x, y, colorObj, count = 6) {
      for (let i = 0; i < count * COUNT_SCALE; i++) {
        const p = this.pool.find(p => !p.active);
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 130;
        p.spawn(x, y,
          Math.random() < .5 ? colorObj.fill : colorObj.glow,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd - 10,
          750 + Math.random() * 450,
          5 + Math.random() * 5
        );
      }
    }
    update(dt) { this.pool.forEach(p => p.update(dt)); }
    // Additive blend so sparks brighten whatever art they cross.
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.pool.forEach(p => p.draw(ctx));
      ctx.restore();
    }
  }

  class FloatText {
    constructor(x, y, text, color, scale = 1) {
      const life = 900 + Math.min(scale, 3.5) * 160;
      const vy = -68 - scale * 14;
      Object.assign(this, { x, y, text, color, scale, life, maxLife: life, vy });
    }
    update(dt) { this.y += this.vy * dt; this.life -= dt * 1000; }
    get alive() { return this.life > 0; }
    draw(ctx) {
      const alpha = Math.min(1, this.life / 280);
      const baseSize = 13 + this.scale * 4.5;
      const fontSize = Math.round(baseSize + (1 - this.life / this.maxLife) * 3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px 'Rajdhani', sans-serif`;
      ctx.textAlign = 'center';
      // Dark outline first so the text reads over same-coloured tiles and busy theme art.
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, fontSize * 0.2);
      ctx.strokeStyle = 'rgba(5,7,13,0.9)';
      ctx.strokeText(this.text, this.x, this.y);
      if (this.scale >= 2) { ctx.shadowColor = this.color; ctx.shadowBlur = 6 + this.scale * 3; }
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // Ring — a single glow ring that expands from a merge point and fades out.
  // r0 = start radius, r1 = end radius, color = stroke color, life in ms.
  class Ring {
    constructor(x, y, r0, r1, color, life = 260) {
      Object.assign(this, { x, y, r0, r1, color, life, maxLife: life });
    }
    update(dt) { this.life -= dt * 1000; }
    get alive() { return this.life > 0; }
    draw(ctx) {
      const t = 1 - this.life / this.maxLife;           // 0→1
      const r = this.r0 + (this.r1 - this.r0) * t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  global.SG = global.SG || {};
  Object.assign(global.SG, { Particle, ParticleSystem, FloatText, Ring });
})(typeof self !== 'undefined' ? self : this);
