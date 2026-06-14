/* particles.js — render-only FX. Ported from SameGame Grid Protocol render.js.
   Uses Math.random() internally (render-only; core stays deterministic).
   Browser globals: SG.Particle, SG.ParticleSystem, SG.FloatText. */
(function (global) {
  'use strict';

  class Particle {
    constructor() { this.active = false; }
    spawn(x, y, color, vx, vy, life, size) {
      Object.assign(this, { x, y, color, vx, vy, life, maxLife: life, size, active: true });
    }
    update(dt) {
      if (!this.active) return;
      this.x += this.vx * dt;
      this.y += (this.vy + 40 * (1 - this.life / this.maxLife)) * dt;  // gentle drift
      this.vx *= 0.97;
      this.life -= dt * 1000;
      if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
      if (!this.active) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.globalAlpha = alpha * .9;
      ctx.fillStyle = this.color;
      const s = this.size * alpha;
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  class ParticleSystem {
    constructor(maxParticles = 600) {
      this.pool = Array.from({ length: maxParticles }, () => new Particle());
    }
    // Subtle preset: few particles, low speed, short life, near-zero upward drift.
    emit(x, y, colorObj, count = 6) {
      for (let i = 0; i < count; i++) {
        const p = this.pool.find(p => !p.active);
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 70;
        p.spawn(x, y,
          Math.random() < .5 ? colorObj.fill : colorObj.glow,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd - 10,
          260 + Math.random() * 180,
          2 + Math.random() * 3
        );
      }
    }
    update(dt) { this.pool.forEach(p => p.update(dt)); }
    draw(ctx) { this.pool.forEach(p => p.draw(ctx)); }
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
