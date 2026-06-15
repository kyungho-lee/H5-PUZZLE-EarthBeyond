/* sound.js — Earth & Beyond — Web Audio synthesizer
   No external audio files — all tones synthesized via Web Audio API.

   SOUND PACKS (6종):
   [Original]  cyber, retro, crystal
   [New]       pad    — Crystal Pad: sine chorus + reverb tail, 신비로운 공간감
               bell   — Ethereal Bell: FM 변조 + 긴 decay, 맑은 차임벨
               choir  — Space Choir: sine × 4 chorus + warm pad, 성악풍 두께감

   BGM THEMES (3종) — Web Audio 시퀀서 루프:
   solar      — Solar System Galaxy: 아르페지오 상승, 광활한 우주
   earth      — Earth Creation: 낮은 옥타브 반복, 원초적 탄생
   civilization — Civilization Birth: 중간 옥타브 리듬감, 활기찬 진보

   BGM은 현재 음색 팩과 독립적으로 동작 (별도 gain 체인).
   SG.Sound.bgm.play(theme) / .stop() / .setVolume(0~1)             */
(function (global) {
  'use strict';

  // ── Note frequency table (MIDI 번호 → Hz) ─────────────────────────
  function midiHz(note) { return 440 * Math.pow(2, (note - 69) / 12); }

  // Named notes used in BGM patterns
  const N = {
    A3:  midiHz(57), C4: midiHz(60), D4: midiHz(62), E4: midiHz(64),
    F4:  midiHz(65), G4: midiHz(67), A4: midiHz(69), B4: midiHz(71),
    C5:  midiHz(72), D5: midiHz(74), E5: midiHz(76), F5: midiHz(77),
    G5:  midiHz(79), A5: midiHz(81),
    F3:  midiHz(53), G3: midiHz(55), B3: midiHz(59), E3: midiHz(52),
  };

  // Pentatonic scale (C major pentatonic, 3 octaves) — merge sound pitch map
  const SCALE = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00,
  ];

  // ── Sound Packs ───────────────────────────────────────────────────
  const SOUND_PACKS = {
    // ── Original 3 ──
    cyber: {
      id: 'cyber', label: 'CYBER', desc: 'Sci-fi synth',
      gain: 0.16, filter: { type: 'lowpass', freq: 2600, sweep: 1600 },
      waves: [
        { type: 'sawtooth', detune: -8, gain: 0.55 },
        { type: 'sawtooth', detune:  8, gain: 0.55 },
        { type: 'square',   detune:  0, gain: 0.30 },
      ],
      blockDetune: [0, 4, 7, -5, 12, -12],
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
        { type: 'sine',     detune:    0, gain: 0.9 },
        { type: 'sine',     detune: 1200, gain: 0.25 },
        { type: 'triangle', detune:    0, gain: 0.2 },
      ],
      blockDetune: [0, 5, 9, -4, 14, -9],
    },

    // ── New: 맑고 신비한 음색 3종 ──

    // Crystal Pad — sine × 3 chorus (±7¢) + 2옥타브 shimmer + 긴 decay
    pad: {
      id: 'pad', label: 'PAD', desc: 'Crystal pad · 신비로운 공간감',
      gain: 0.14,
      attack: 0.04,   // 부드러운 어택
      decay: 0.55,    // 긴 여운
      filter: { type: 'lowpass', freq: 3200, sweep: 400 },
      waves: [
        { type: 'sine', detune:  -7, gain: 0.55 },
        { type: 'sine', detune:   7, gain: 0.55 },
        { type: 'sine', detune:   0, gain: 0.65 },
        { type: 'sine', detune: 1200, gain: 0.20 }, // +1 옥타브 shimmer
        { type: 'sine', detune: 2400, gain: 0.08 }, // +2 옥타브 air
      ],
      blockDetune: [0, 5, 9, -4, 12, -9],
    },

    // Ethereal Bell — sine + FM 변조(OscillatorNode 2개) + 긴 decay
    bell: {
      id: 'bell', label: 'BELL', desc: 'Ethereal bell · 맑은 차임벨',
      gain: 0.15,
      attack: 0.001,  // 즉각적인 공격
      decay: 0.80,    // 매우 긴 여운
      filter: { type: 'highpass', freq: 200, sweep: 0 },
      waves: [
        { type: 'sine',     detune:    0, gain: 0.80 },
        { type: 'sine',     detune: 1900, gain: 0.30 }, // 약 +12.67반음 (bell 배음)
        { type: 'sine',     detune: 2800, gain: 0.15 }, // +19반음 (차임 특유 배음)
        { type: 'triangle', detune:    0, gain: 0.12 },
      ],
      blockDetune: [0, 4, 8, -3, 14, -7],
    },

    // Space Choir — sine × 4 (미세 디튠) + warm lowpass
    choir: {
      id: 'choir', label: 'CHOIR', desc: 'Space choir · 성악풍 두께감',
      gain: 0.13,
      attack: 0.06,   // 가장 부드러운 어택 (보컬 느낌)
      decay: 0.60,
      filter: { type: 'lowpass', freq: 1800, sweep: 200 },
      waves: [
        { type: 'sine', detune:  -12, gain: 0.50 },
        { type: 'sine', detune:   -5, gain: 0.55 },
        { type: 'sine', detune:    5, gain: 0.55 },
        { type: 'sine', detune:   12, gain: 0.50 },
        { type: 'sine', detune: 1200, gain: 0.18 }, // 옥타브 위 shimmer
      ],
      blockDetune: [0, 3, 7, -3, 10, -10],
    },
  };
  const PACK_ORDER = ['cyber', 'retro', 'crystal', 'pad', 'bell', 'choir'];

  // ── BGM Patterns ──────────────────────────────────────────────────
  // note: Hz, dur: 음 길이(초), gap: 다음 음 시작까지 간격(초)
  // silence = gap만 크고 dur 없는 빈 배열 구절로 표현
  // 각 테마 ~90초 루프 (8~10구절). 변주·침묵·음역 이동으로 지루함 방지.

  const BGM_THEMES = {

    // ── 🌌 Solar System Galaxy ─────────────────────────────────────
    // 광활함·신비·팽창. 아르페지오 상승 → 내려앉음 → 확장 → 침묵 → 재등장
    // 총 ~88초 루프
    solar: {
      id: 'solar', label: '🌌 SOLAR SYSTEM', bpm: 72,
      phrases: [
        // [A] 도입 — 낮게 시작, 서서히 올라오는 첫 아르페지오
        [
          { note: N.C5,  dur: 1.2, gap: 0.70 },
          { note: N.E5,  dur: 1.2, gap: 0.70 },
          { note: N.G5,  dur: 1.2, gap: 0.70 },
          { note: N.A5,  dur: 2.0, gap: 1.60 },
        ],
        // [B] 주제 — A4→E5→G5→C5→A5 (사용자 제시 코드 1)
        [
          { note: N.A4,  dur: 1.0, gap: 0.58 },
          { note: N.E5,  dur: 1.0, gap: 0.58 },
          { note: N.G5,  dur: 1.0, gap: 0.58 },
          { note: N.C5,  dur: 1.0, gap: 0.58 },
          { note: N.A5,  dur: 1.8, gap: 1.40 },
        ],
        // [C] 반복 변주 — E5→G5→A5→F5→E5 (사용자 제시 코드 2), 짧고 빠르게
        [
          { note: N.E5,  dur: 0.75, gap: 0.44 },
          { note: N.G5,  dur: 0.75, gap: 0.44 },
          { note: N.A5,  dur: 0.75, gap: 0.44 },
          { note: N.F5,  dur: 0.75, gap: 0.44 },
          { note: N.E5,  dur: 1.40, gap: 1.10 },
        ],
        // [D] 확장 — C5→D5→E5→G5→A5 (사용자 제시 코드 3)
        [
          { note: N.C5,  dur: 0.80, gap: 0.48 },
          { note: N.D5,  dur: 0.80, gap: 0.48 },
          { note: N.E5,  dur: 0.80, gap: 0.48 },
          { note: N.G5,  dur: 0.80, gap: 0.48 },
          { note: N.A5,  dur: 1.80, gap: 1.40 },
        ],
        // [E] 침묵 구간 — 긴 여운만 남기고 쉼 (~4초)
        [
          { note: N.A5,  dur: 2.5, gap: 4.00 },
        ],
        // [F] 재등장 — 옥타브 낮춰서 심도 있게, 느린 아르페지오
        [
          { note: N.A4,  dur: 1.4, gap: 0.90 },
          { note: N.C5,  dur: 1.4, gap: 0.90 },
          { note: N.E5,  dur: 1.4, gap: 0.90 },
          { note: N.G5,  dur: 2.2, gap: 1.80 },
        ],
        // [G] 클라이맥스 — 빠른 상승 아르페지오, 음역 최고점
        [
          { note: N.E5,  dur: 0.60, gap: 0.36 },
          { note: N.G5,  dur: 0.60, gap: 0.36 },
          { note: N.A5,  dur: 0.60, gap: 0.36 },
          { note: N.C5,  dur: 0.60, gap: 0.36 },
          { note: N.E5,  dur: 0.60, gap: 0.36 },
          { note: N.A5,  dur: 1.80, gap: 1.50 },
        ],
        // [H] 하강 해소 — 천천히 내려앉으며 마무리
        [
          { note: N.G5,  dur: 1.0, gap: 0.65 },
          { note: N.E5,  dur: 1.0, gap: 0.65 },
          { note: N.C5,  dur: 1.0, gap: 0.65 },
          { note: N.A4,  dur: 2.5, gap: 2.00 },
        ],
        // [I] 여백 — 루프 전 긴 숨고르기 (~3초 침묵)
        [
          { note: N.C5,  dur: 1.5, gap: 3.50 },
        ],
      ],
    },

    // ── 🌍 Earth Creation ─────────────────────────────────────────
    // 원초적·무거움·생명의 씨앗. 낮은 옥타브 중심, 느리고 묵직한 박동.
    // 총 ~96초 루프
    earth: {
      id: 'earth', label: '🌍 EARTH CREATION', bpm: 54,
      phrases: [
        // [A] 심연 — 아주 낮고 긴 단음들, 지구 핵의 고동
        [
          { note: N.E3,  dur: 2.0, gap: 1.40 },
          { note: N.A3,  dur: 2.0, gap: 1.40 },
          { note: N.E3,  dur: 3.0, gap: 2.60 },
        ],
        // [B] 주제 1 — A3→C4→E4→A4 (사용자 제시 코드 1)
        [
          { note: N.A3,  dur: 1.4, gap: 0.85 },
          { note: N.C4,  dur: 1.4, gap: 0.85 },
          { note: N.E4,  dur: 1.4, gap: 0.85 },
          { note: N.A4,  dur: 2.4, gap: 1.90 },
        ],
        // [C] 변주 — F3→A3→D4→F4 (사용자 제시 코드 2), 낮고 어두운 색채
        [
          { note: N.F3,  dur: 1.3, gap: 0.78 },
          { note: N.A3,  dur: 1.3, gap: 0.78 },
          { note: N.D4,  dur: 1.3, gap: 0.78 },
          { note: N.F4,  dur: 2.0, gap: 1.60 },
        ],
        // [D] 생명의 씨앗 — E3→G3→B3→E4 (사용자 제시 코드 3), 조금 밝아짐
        [
          { note: N.E3,  dur: 1.2, gap: 0.72 },
          { note: N.G3,  dur: 1.2, gap: 0.72 },
          { note: N.B3,  dur: 1.2, gap: 0.72 },
          { note: N.E4,  dur: 2.6, gap: 2.10 },
        ],
        // [E] 팽창 — 4음 코드가 위로 올라가며 지각 형성
        [
          { note: N.A3,  dur: 1.0, gap: 0.62 },
          { note: N.E4,  dur: 1.0, gap: 0.62 },
          { note: N.A4,  dur: 1.0, gap: 0.62 },
          { note: N.C4,  dur: 1.0, gap: 0.62 },
          { note: N.E4,  dur: 2.2, gap: 1.80 },
        ],
        // [F] 침묵+여운 — 지구가 식으며 조용해지는 구간 (~5초)
        [
          { note: N.A3,  dur: 3.0, gap: 5.50 },
        ],
        // [G] 재출현 — 주제 1 반복, 조금 더 빠르게
        [
          { note: N.A3,  dur: 1.1, gap: 0.68 },
          { note: N.C4,  dur: 1.1, gap: 0.68 },
          { note: N.E4,  dur: 1.1, gap: 0.68 },
          { note: N.A4,  dur: 1.9, gap: 1.50 },
        ],
        // [H] 고조 — 위로 계속 올라가는 느낌, 생명 탄생 직전
        [
          { note: N.C4,  dur: 0.9, gap: 0.58 },
          { note: N.E4,  dur: 0.9, gap: 0.58 },
          { note: N.G4,  dur: 0.9, gap: 0.58 },
          { note: N.A4,  dur: 0.9, gap: 0.58 },
          { note: N.C5,  dur: 2.5, gap: 2.00 },
        ],
        // [I] 회귀+긴 쉼 — 다시 낮은 E3로 돌아와 루프 준비 (~4초)
        [
          { note: N.E4,  dur: 1.2, gap: 0.80 },
          { note: N.A3,  dur: 1.8, gap: 4.20 },
        ],
      ],
    },

    // ── 🏛️ Civilization Birth ──────────────────────────────────────
    // 활기·리듬감·창조성. 중간 옥타브, 반복 동기에서 점점 복잡해지는 구조.
    // 총 ~80초 루프
    civilization: {
      id: 'civilization', label: '🏛️ CIVILIZATION', bpm: 88,
      phrases: [
        // [A] 도입 — 단순 2음 동기, 문명의 첫 불꽃
        [
          { note: N.A4,  dur: 0.55, gap: 0.33 },
          { note: N.E5,  dur: 0.55, gap: 0.33 },
          { note: N.A4,  dur: 0.55, gap: 0.33 },
          { note: N.E5,  dur: 1.10, gap: 0.90 },
        ],
        // [B] 주제 — A4→C5→E5→G5 (사용자 제시 코드 1), 활기찬 시작
        [
          { note: N.A4,  dur: 0.62, gap: 0.38 },
          { note: N.C5,  dur: 0.62, gap: 0.38 },
          { note: N.E5,  dur: 0.62, gap: 0.38 },
          { note: N.G5,  dur: 1.20, gap: 0.95 },
        ],
        // [C] 문화 확장 — D4→F4→A4→C5 (사용자 제시 코드 2)
        [
          { note: N.D4,  dur: 0.58, gap: 0.35 },
          { note: N.F4,  dur: 0.58, gap: 0.35 },
          { note: N.A4,  dur: 0.58, gap: 0.35 },
          { note: N.C5,  dur: 1.10, gap: 0.88 },
        ],
        // [D] 문명 발전 — E4→G4→B4→D5 (사용자 제시 코드 3)
        [
          { note: N.E4,  dur: 0.52, gap: 0.32 },
          { note: N.G4,  dur: 0.52, gap: 0.32 },
          { note: N.B4,  dur: 0.52, gap: 0.32 },
          { note: N.D5,  dur: 1.10, gap: 0.88 },
        ],
        // [E] 시퀀스 합주 — B, C, D 주제를 빠르게 연결, 복잡해지는 사회
        [
          { note: N.A4,  dur: 0.45, gap: 0.28 },
          { note: N.C5,  dur: 0.45, gap: 0.28 },
          { note: N.D4,  dur: 0.45, gap: 0.28 },
          { note: N.F4,  dur: 0.45, gap: 0.28 },
          { note: N.E4,  dur: 0.45, gap: 0.28 },
          { note: N.G4,  dur: 0.45, gap: 0.28 },
          { note: N.B4,  dur: 1.20, gap: 1.00 },
        ],
        // [F] 정점 — 빠른 상승 아르페지오, 문명의 절정
        [
          { note: N.C5,  dur: 0.40, gap: 0.25 },
          { note: N.E5,  dur: 0.40, gap: 0.25 },
          { note: N.G5,  dur: 0.40, gap: 0.25 },
          { note: N.A5,  dur: 0.40, gap: 0.25 },
          { note: N.G5,  dur: 0.40, gap: 0.25 },
          { note: N.E5,  dur: 1.50, gap: 1.20 },
        ],
        // [G] 침묵+성찰 — 잠깐의 쉼 (~3초), 다음 사이클 준비
        [
          { note: N.A4,  dur: 1.80, gap: 3.20 },
        ],
        // [H] 재건 — 주제 B로 돌아와 조금 느리게, 새로운 시대
        [
          { note: N.A4,  dur: 0.70, gap: 0.42 },
          { note: N.C5,  dur: 0.70, gap: 0.42 },
          { note: N.E5,  dur: 0.70, gap: 0.42 },
          { note: N.G5,  dur: 1.40, gap: 1.10 },
        ],
        // [I] 마무리+쉼 — 루프 연결 전 여백 (~2초)
        [
          { note: N.E5,  dur: 0.55, gap: 0.34 },
          { note: N.A4,  dur: 0.55, gap: 0.34 },
          { note: N.E4,  dur: 1.40, gap: 2.20 },
        ],
      ],
    },
  };
  const BGM_ORDER = ['solar', 'earth', 'civilization'];

  // ── Reverb tail builder (simple convolution approximation via gain nodes) ─
  // Web Audio ConvolutionReverb는 impulse response 파일 필요 → 대신
  // 여러 딜레이 탭(comb filter 근사)으로 공간감 구현.
  function buildReverb(ctx, dryGain, wetGain) {
    // 3-tap comb delay (15ms, 31ms, 57ms) at decreasing levels
    const taps = [0.015, 0.031, 0.057];
    const gains = [0.35, 0.22, 0.12];
    taps.forEach(function (t, i) {
      const delay = ctx.createDelay(0.1);
      delay.delayTime.value = t;
      const g = ctx.createGain();
      g.gain.value = gains[i];
      dryGain.connect(delay);
      delay.connect(g);
      g.connect(wetGain);
    });
  }

  // ── SoundManager ─────────────────────────────────────────────────
  class SoundManager {
    constructor() {
      this._ctx   = null;
      this._muted = false;
      let saved = null;
      try { saved = localStorage.getItem('earthbeyond_soundpack'); } catch (_) {}
      this._packId = (saved && SOUND_PACKS[saved]) ? saved : 'pad';

      // BGM state
      this._bgmThemeId  = null;
      this._bgmRunning  = false;
      this._bgmStop     = false;
      this._bgmGain     = null;
      this._bgmVolume   = 0.38;
      this._bgmPackId   = 'pad'; // BGM 전용 음색 (기본 pad)
    }

    _getCtx() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    }

    get muted() { return this._muted; }
    toggleMute() {
      this._muted = !this._muted;
      try { if (this._bgmGain) this._bgmGain.gain.value = this._muted ? 0 : this._bgmVolume; } catch (_) {}
      return this._muted;
    }
    setMuted(val) {
      this._muted = !!val;
      try { if (this._bgmGain) this._bgmGain.gain.value = this._muted ? 0 : this._bgmVolume; } catch (_) {}
      return this._muted;
    }

    // ── Sound pack (merge FX) ─────────────────────────────────────
    get packs() {
      return PACK_ORDER.map(id => ({
        id,
        label: SOUND_PACKS[id].label,
        desc:  SOUND_PACKS[id].desc,
      }));
    }
    get pack() { return this._packId; }
    setPack(id) {
      if (!SOUND_PACKS[id]) return this._packId;
      this._packId = id;
      try { localStorage.setItem('earthbeyond_soundpack', id); } catch (_) {}
      return id;
    }

    // ── Low-level voice (merge FX) ────────────────────────────────
    _voice(freq, dur, delay, blockDetune, gainMul) {
      const ctx  = this._getCtx();
      const pack = SOUND_PACKS[this._packId] || SOUND_PACKS.pad;
      const t0   = ctx.currentTime + delay;
      const attack = pack.attack || 0.006;
      const decay  = pack.decay  || dur;

      const out = ctx.createGain();
      const peak = pack.gain * gainMul;
      out.gain.setValueAtTime(0, t0);
      out.gain.linearRampToValueAtTime(peak, t0 + attack);
      out.gain.exponentialRampToValueAtTime(0.0008, t0 + Math.max(dur, decay));

      // Reverb for new packs
      const useReverb = (this._packId === 'pad' || this._packId === 'bell' || this._packId === 'choir');
      let node = out;
      if (useReverb) {
        const dry = ctx.createGain(); dry.gain.value = 0.72;
        const wet = ctx.createGain(); wet.gain.value = 0.28;
        out.connect(dry); out.connect(wet);
        buildReverb(ctx, dry, wet);
        dry.connect(ctx.destination);
        wet.connect(ctx.destination);
        node = out;
      } else if (pack.filter) {
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
        const g   = ctx.createGain();
        osc.type = w.type;
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime((w.detune || 0) + (blockDetune || 0), t0);
        g.gain.setValueAtTime(w.gain, t0);
        osc.connect(g); g.connect(node);
        osc.start(t0);
        osc.stop(t0 + Math.max(dur, decay) + 0.05);
      });
    }

    _seq(notes, gainMul = 1) {
      if (this._muted) return;
      notes.forEach(n => this._voice(n.freq, n.dur, n.delay || 0, n.detune || 0, gainMul * (n.gainMul || 1)));
    }

    // ── Merge FX ─────────────────────────────────────────────────
    playMerge(merges) {
      if (this._muted || !merges || !merges.length) return;
      const pack = SOUND_PACKS[this._packId] || SOUND_PACKS.pad;
      merges.forEach((m, i) => {
        const step = Math.max(1, Math.round(Math.log2(m.size || 2)));
        const idx  = Math.min(step, SCALE.length - 1);
        const freq = SCALE[idx];
        const bd   = (pack.blockDetune[m.blockType] || 0);
        const gainMul = Math.min(1 + (step - 1) * 0.18, 2.2);
        const dur     = 0.16 + Math.min(step * 0.02, 0.12);
        this._voice(freq, dur, i * 0.06, bd, gainMul);
        if (step >= 3) this._voice(freq / 2, dur * 1.1, i * 0.06, bd, gainMul * 0.5);
      });
    }

    playClear() {
      this._seq([
        { freq: SCALE[5],  dur: 0.12, delay: 0.00 },
        { freq: SCALE[7],  dur: 0.12, delay: 0.10 },
        { freq: SCALE[8],  dur: 0.12, delay: 0.20 },
        { freq: SCALE[10], dur: 0.12, delay: 0.30 },
        { freq: SCALE[12], dur: 0.26, delay: 0.40, gainMul: 1.3 },
      ], 1);
    }

    playGameOver() {
      this._seq([
        { freq: SCALE[6], dur: 0.16, delay: 0.00 },
        { freq: SCALE[4], dur: 0.16, delay: 0.16 },
        { freq: SCALE[2], dur: 0.16, delay: 0.32 },
        { freq: SCALE[0], dur: 0.40, delay: 0.48, gainMul: 1.2 },
      ], 1);
    }

    playBlip(up) {
      this._seq([{ freq: up ? SCALE[6] : SCALE[3], dur: 0.05 }], 0.7);
    }

    // ── BGM Engine ────────────────────────────────────────────────
    get bgmThemes() {
      return BGM_ORDER.map(id => ({ id, label: BGM_THEMES[id].label }));
    }
    get bgmTheme() { return this._bgmThemeId; }
    get bgmVolume() { return this._bgmVolume; }
    setBgmVolume(v) {
      this._bgmVolume = Math.max(0, Math.min(1, v));
      if (this._bgmGain && !this._muted) this._bgmGain.gain.value = this._bgmVolume;
    }

    // BGM 전용 음색 (기본 pad — 변경 가능)
    get bgmPack() { return this._bgmPackId; }
    setBgmPack(id) {
      if (SOUND_PACKS[id]) this._bgmPackId = id;
    }

    // 한 음 재생 (BGM 전용 voice — gainNode를 외부에서 주입)
    _bgmNote(ctx, masterGain, freq, dur, t0, packId) {
      const pack = SOUND_PACKS[packId] || SOUND_PACKS.pad;
      const attack = pack.attack || 0.04;
      const decay  = pack.decay  || dur;

      const out = ctx.createGain();
      const peak = 0.22; // BGM은 FX보다 낮게
      out.gain.setValueAtTime(0, t0);
      out.gain.linearRampToValueAtTime(peak, t0 + attack);
      out.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, decay));

      // BGM reverb — 항상 적용
      const dry = ctx.createGain(); dry.gain.value = 0.65;
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      out.connect(dry); out.connect(wet);
      buildReverb(ctx, dry, wet);
      dry.connect(masterGain);
      wet.connect(masterGain);

      pack.waves.forEach(w => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = w.type;
        osc.frequency.setValueAtTime(freq, t0);
        osc.detune.setValueAtTime(w.detune || 0, t0);
        g.gain.setValueAtTime(w.gain, t0);
        osc.connect(g); g.connect(out);
        osc.start(t0);
        osc.stop(t0 + Math.max(dur, decay) + 0.08);
      });
    }

    // BGM 한 루프 스케줄링
    _scheduleBgmLoop(ctx, masterGain, theme, startTime, packId) {
      let t = startTime;
      theme.phrases.forEach(phrase => {
        phrase.forEach(step => {
          if (!this._bgmStop) {
            this._bgmNote(ctx, masterGain, step.note, step.dur, t, packId);
          }
          t += step.gap;
        });
      });
      return t; // 다음 루프 시작 시간
    }

    // BGM 전용 AudioContext — FX(merge/blip)와 분리해서 close()로 완전 종료 가능
    _getBgmCtx() {
      if (!this._bgmCtx || this._bgmCtx.state === 'closed') {
        this._bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._bgmCtx.state === 'suspended') this._bgmCtx.resume();
      return this._bgmCtx;
    }

    stopBgm() {
      this._bgmStop = true;
      if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null; }
      // BGM 전용 ctx를 close() → 모든 오실레이터 즉시 종료
      if (this._bgmCtx && this._bgmCtx.state !== 'closed') {
        try { this._bgmCtx.close(); } catch (_) {}
      }
      this._bgmCtx     = null;
      this._bgmGain    = null;
      this._bgmThemeId = null;
      this._bgmRunning = false;
    }

    // BGM 시작 — stopBgm() 후 새 ctx로 재생
    playBgm(themeId, packId) {
      const theme = BGM_THEMES[themeId];
      if (!theme) return;
      this.stopBgm();  // 이전 ctx 완전 종료

      const ctx = this._getBgmCtx();
      const usePack = packId || this._bgmPackId;

      const masterGain = ctx.createGain();
      masterGain.gain.value = this._muted ? 0 : this._bgmVolume;
      masterGain.connect(ctx.destination);
      this._bgmGain    = masterGain;
      this._bgmThemeId = themeId;
      this._bgmRunning = true;
      this._bgmStop    = false;

      const loop = (startTime) => {
        if (this._bgmStop) { this._bgmRunning = false; return; }
        const nextStart = this._scheduleBgmLoop(ctx, masterGain, theme, startTime, usePack);
        const waitMs = Math.max(0, (nextStart - ctx.currentTime - 0.3) * 1000);
        this._bgmTimer = setTimeout(() => loop(nextStart), waitMs);
      };
      loop(ctx.currentTime + 0.05);
    }

    // 미리듣기: 구절 2개 재생 후 자동 종료
    previewBgm(themeId, packId, onEnd) {
      const theme = BGM_THEMES[themeId];
      if (!theme) { if (onEnd) onEnd(); return; }
      this.stopBgm();  // 이전 ctx 완전 종료

      const ctx = this._getBgmCtx();
      const usePack = packId || this._bgmPackId;

      const masterGain = ctx.createGain();
      masterGain.gain.value = this._muted ? 0 : this._bgmVolume;
      masterGain.connect(ctx.destination);
      this._bgmGain    = masterGain;
      this._bgmThemeId = themeId + '_preview';
      this._bgmRunning = true;
      this._bgmStop    = false;

      // 첫 2개 구절만 재생
      let t = ctx.currentTime + 0.05;
      const previewPhrases = theme.phrases.slice(0, 2);
      previewPhrases.forEach(phrase => {
        phrase.forEach(step => {
          this._bgmNote(ctx, masterGain, step.note, step.dur, t, usePack);
          t += step.gap;
        });
      });

      // 재생 끝나면 ctx 종료
      const waitMs = Math.max(100, (t - ctx.currentTime + 0.1) * 1000);
      this._bgmTimer = setTimeout(() => {
        this.stopBgm();
        if (onEnd) onEnd();
      }, waitMs);
    }

    get bgmRunning() { return this._bgmRunning; }
  }

  const SG = global.SG = global.SG || {};
  SG.SoundManager = SoundManager;
  // BGM_THEMES / SOUND_PACKS 외부 접근 (Settings UI용)
  SG._BGM_THEMES = BGM_THEMES;
  SG._BGM_ORDER  = BGM_ORDER;
  SG._PACK_ORDER = PACK_ORDER;

})(typeof window !== 'undefined' ? window : global);
