/* palette.js — Earth & Beyond block definitions.
   COLOR_PALETTE: 우주/자연사 톤 6색 (deep space + earth tones)
   BLOCK_TYPES:   per-block-type definition. image:null → Canvas color block.
                  테마 이미지가 준비되면 image 경로 설정으로 즉시 전환 가능.

   ── Sound (see sound.js) ───────────────────────────────────────────
   `wave`  = oscillator timbre ('square'|'sawtooth'|'triangle'|'sine')
   `detune`= cents offset for distinct voice per block */
(function (global) {
  'use strict';

  const COLOR_PALETTE = [
    { fill: '#3a7bd5', glow: '#00d2ff', dark: '#0d2b5e' }, // 0 Ocean Blue
    { fill: '#11998e', glow: '#38ef7d', dark: '#0a3d38' }, // 1 Teal Earth
    { fill: '#f7971e', glow: '#ffd200', dark: '#5a3500' }, // 2 Solar Orange
    { fill: '#c0392b', glow: '#ff6b6b', dark: '#4a0f0f' }, // 3 Lava Red
    { fill: '#8e44ad', glow: '#c39bd3', dark: '#3b1560' }, // 4 Cosmic Purple
    { fill: '#1a6b3c', glow: '#52c788', dark: '#0a2e1a' }, // 5 Forest Green
  ];

  const BLOCK_TYPES = [
    { name: 'OB', color: COLOR_PALETTE[0], image: null, wave: 'sine',     detune: 0   },
    { name: 'TE', color: COLOR_PALETTE[1], image: null, wave: 'triangle', detune: 0   },
    { name: 'SO', color: COLOR_PALETTE[2], image: null, wave: 'sawtooth', detune: 0   },
    { name: 'LR', color: COLOR_PALETTE[3], image: null, wave: 'square',   detune: 0   },
    { name: 'CP', color: COLOR_PALETTE[4], image: null, wave: 'triangle', detune: 12  },
    { name: 'FG', color: COLOR_PALETTE[5], image: null, wave: 'sine',     detune: -12 },
  ];

  // Deep space / cosmic scale palette keyed by tile size
  const SIZE_PALETTE = {
    1:    { fill: '#0d1b2a', glow: '#1e3a5f' },
    2:    { fill: '#1a2e4a', glow: '#2e5080' },
    4:    { fill: '#1e4d6b', glow: '#2e7da8' },
    8:    { fill: '#11998e', glow: '#38ef7d' },
    16:   { fill: '#1a6b3c', glow: '#52c788' },
    32:   { fill: '#f7971e', glow: '#ffd200' },
    64:   { fill: '#c0392b', glow: '#ff6b6b' },
    128:  { fill: '#8e44ad', glow: '#c39bd3' },
    256:  { fill: '#3a7bd5', glow: '#00d2ff' },
    512:  { fill: '#e74c3c', glow: '#ff9a8b' },
    1024: { fill: '#f5f5f5', glow: '#ffffff' },
    2048: { fill: '#ffffff', glow: '#00f5c8' },
  };
  function sizeColor(size) {
    return SIZE_PALETTE[size] || SIZE_PALETTE[2048];
  }

  global.SG = global.SG || {};
  global.SG.COLOR_PALETTE = COLOR_PALETTE;
  global.SG.BLOCK_TYPES = BLOCK_TYPES;
  global.SG.SIZE_PALETTE = SIZE_PALETTE;
  global.SG.sizeColor = sizeColor;
})(typeof self !== 'undefined' ? self : this);
