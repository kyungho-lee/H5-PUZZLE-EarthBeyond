/* sound.js — H5 Puzzle Template — Web Audio synthesizer with selectable packs
   No external audio files — all tones synthesized via Web Audio API.

   SOUND PACKS (collection-ready): a pack defines how the game sounds.
   Cyber  = sci-fi synth (detuned saw + lowpass sweep) — default, intense
   Retro  = 8-bit chiptune (square/triangle, clean)
   Crystal= bright bell tones (sine + octave shimmer)
   Selected pack persists in localStorage ('earthbeyond_soundpack'). New packs
   can be added to SOUND_PACKS and later gated behind unlock conditions.

   Merge sound = block timbre (pack voice per block) + pitch by merge SIZE.
   Bigger size → higher note + louder + extra octave layer (intensity scales). */
(function (global) {
  'use strict';

  // Pentatonic scale (C major pentatonic, 3 octaves) — consonant at any step.
  const SCALE = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
  ];

  // Each pack: voice waveforms layered per note, optional lowpass filter,
  // gain, and per-block detune spread (so the 6 block types sound distinct).
  // `waves`: array of {type, detune, gain} layers summed into one voice.
  const SOUND_PACKS = {
    cyber: {
      id: 'cyber', label: 'CYBER', desc: 'Sci-fi synth',
      gain: 0.16, filter: { type: 'lowpass', freq: 2600, sweep: 1600 }, // sweep up over note
      waves: [
        { type: 'sawtooth', detune: -8, gain: 0.55 },
        { type: 'sawtooth', detune: 8,  gain: 0.55 },
        { type: 'square',   detune: 0,  gain: 0.30 },
      ],
      blockDetune: [0, 4, 7, -5, 12, -12],   // per block type (color idx)
    },
    retro: {
      id: 'retro', label: 'RETRO', desc: '8-bit chiptune',
      gain: 0.15, filter: null,
      waves: [
        { type: 'square',   detune: 0, gain: 0.8 },
        { type: 'triangle', detune: 0, gain: 0.3 },
      ],
      blockDetune: [0, 3, 7, 10, 5, -7],
    },
    crystal: {
      id: 'crystal', label: 'CRYSTAL', desc: 'Bright bells',
      gain: 0.18, filter: { type: 'highpass', freq: 300, sweep: 0 },
      waves: [
        { type: 'sine',     detune: 0,  gain: 0.9 },
        { type: 'sine',     detune: 1200, gain: 0.25 }, // +1 octave shimmer
        { type: 'triangle', detune: 0,  gain: 0.2 },
      ],
      blockDetune: [0, 5, 9, -4, 14, -9],
    },
  };
  const PACK_ORDER = ['cyber', 'retro', 'crystal'];

  class SoundManager {
    constructor() {
      this._ctx   = null;
      this._muted = false;
      let saved = null;
      try { saved = localStorage.getItem('earthbeyond_soundpack'); } catch (_) {}
      this._packId = (saved && SOUND_PACKS[saved]) ? saved : 'cyber';
    }

    _getCtx() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    }

    get muted() { return this._muted; }
    toggleMute() { this._muted = !this._muted; return this._muted; }
    setMuted(val) { this._muted = !!val; return this._muted; }

    // ── Sound pack selection (collection) ─────────────────────────────
    get packs() { return PACK_ORDER.map(id => ({ id, label: SOUND_PACKS[id].label, desc: SOUND_PACKS[id].desc })); }
    get pack() { return this._packId; }
    setPack(id) {
      if (!SOUND_PACKS[id]) return this._packId;
      this._packId = id;
      try { localStorage.setItem('earthbeyond_soundpack', id); } catch (_) {}
      return id;
    }

    // Low-level: play one voice (summed wave layers) at freq, with the active
    // pack's filter. gainMul scales loudness (size intensity). Returns nothing.
    _voice(freq, dur, delay, blockDetune, gainMul) {
      const ctx = this._getCtx();
      const pack = SOUND_PACKS[this._packId] || SOUND_PACKS.cyber;
      const t0 = ctx.currentTime + delay;
      const out = ctx.createGain();
      const peak = pack.gain * gainMul;
      out.gain.setValueAtTime(0, t0);
      out.gain.linearRampToValueAtTime(peak, t0 + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

      let node = out;
      if (pack.filter) {
        const flt = ctx.createBiquadFilter();
        flt.type = pack.filter.type;
        flt.frequency.setValueAtTime(pack.filter.freq, t0);
        if (pack.filter.sweep) flt.frequency.linearRampToValueAtTime(pack.filter.freq + pack.filter.sweep, t0 + dur * 0.6);
        out.connect(flt); flt.connect(ctx.destination);
      } else {
        out.connect(ctx.destination);
      }

      pack.waves.forEach(w => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = w.type;
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime((w.detune || 0) + (blockDetune || 0), t0);
        g.gain.setValueAtTime(w.gain, t0);
        osc.connect(g); g.connect(node);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      });
    }

    // Simple multi-note helper (used by clear/gameover) on the active pack voice.
    _seq(notes, gainMul = 1) {
      if (this._muted) return;
      notes.forEach(n => this._voice(n.freq, n.dur, n.delay || 0, n.detune || 0, gainMul * (n.gainMul || 1)));
    }

    // ── Musical merge: block timbre + size→pitch + size→intensity ─────
    // merges: [{ blockType, size }]. Bigger size → higher note, louder, and
    // an added octave layer for punch. Multiple merges stagger into an arpeggio.
    playMerge(merges) {
      if (this._muted || !merges || !merges.length) return;
      const pack = SOUND_PACKS[this._packId] || SOUND_PACKS.cyber;
      merges.forEach((m, i) => {
        const step = Math.max(1, Math.round(Math.log2(m.size || 2)));   // size→step (>=1)
        const idx = Math.min(step, SCALE.length - 1);
        const freq = SCALE[idx];
        const bd = (pack.blockDetune[m.blockType] || 0);
        // Intensity by size: louder + slightly longer the higher the step.
        const gainMul = Math.min(1 + (step - 1) * 0.18, 2.2);
        const dur = 0.16 + Math.min(step * 0.02, 0.12);
        const delay = i * 0.06;
        this._voice(freq, dur, delay, bd, gainMul);
        // Add a sub-octave layer for big merges (step>=3) → extra punch.
        if (step >= 3) this._voice(freq / 2, dur * 1.1, delay, bd, gainMul * 0.5);
      });
    }

    // 스테이지/레벨 클리어 — rising pentatonic flourish on the active pack.
    playClear() {
      this._seq([
        { freq: SCALE[5],  dur: 0.12, delay: 0.00 },
        { freq: SCALE[7],  dur: 0.12, delay: 0.10 },
        { freq: SCALE[8],  dur: 0.12, delay: 0.20 },
        { freq: SCALE[10], dur: 0.12, delay: 0.30 },
        { freq: SCALE[12], dur: 0.26, delay: 0.40, gainMul: 1.3 },
      ], 1);
    }

    // 게임 오버 — descending tones.
    playGameOver() {
      this._seq([
        { freq: SCALE[6], dur: 0.16, delay: 0.00 },
        { freq: SCALE[4], dur: 0.16, delay: 0.16 },
        { freq: SCALE[2], dur: 0.16, delay: 0.32 },
        { freq: SCALE[0], dur: 0.40, delay: 0.48, gainMul: 1.2 },
      ], 1);
    }

    // UI click/move (used by modal navigation) — short blip on active pack.
    playBlip(up) {
      this._seq([{ freq: up ? SCALE[6] : SCALE[3], dur: 0.05 }], 0.7);
    }
  }

  const SG = global.SG = global.SG || {};
  SG.SoundManager = SoundManager;

})(typeof window !== 'undefined' ? window : global);
