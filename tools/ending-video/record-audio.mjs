/* record-audio.mjs — 엔딩 영상 음악을 게임 사운드(src/sound.js)에서 그대로 녹음한다 (외부 음원 없음).
   헤드리스 Chromium 의 OfflineAudioContext 로 sound.js 의 BGM 3곡(earth · civilization · solar)과 playClear 를
   AD 콘티(docs/ending/ending-credits-plan.md 2장 음악 큐) 시각에 맞춰 스케줄 → 60초 스테레오 WAV.
   출력: assets/audio/ending-mix.wav (렌더 준비물, 커밋 안 함)
   Usage: node tools/ending-video/record-audio.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'assets', 'audio', 'ending-mix.wav');
const soundJs = fs.readFileSync(path.join(ROOT, 'src', 'sound.js'), 'utf8');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: soundJs });
  const b64 = await page.evaluate(async () => {
    const SR = 44100, LEN = 60;
    const ctx = new OfflineAudioContext(2, SR * LEN, SR);
    const mgr = new SG.SoundManager();
    const T = SG._BGM_THEMES;
    const VOL = mgr.bgmVolume;                       // 게임 BGM 기본 볼륨(0.38)과 같은 감
    // 곡 하나를 [from, to) 동안 — 페이드 인/아웃 포함, 루프 반복. phraseFrom = 몇 번째 구절부터.
    function track(themeId, from, to, fadeIn, fadeOut, level, phraseFrom) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.setValueAtTime(0.0001, from);
      g.gain.linearRampToValueAtTime(VOL * level, from + fadeIn);
      g.gain.setValueAtTime(VOL * level, Math.max(from + fadeIn, to - fadeOut));
      g.gain.linearRampToValueAtTime(0, to);
      g.connect(ctx.destination);
      const steps = [].concat(...T[themeId].phrases.slice(phraseFrom || 0), ...T[themeId].phrases);
      let t = from, i = 0;
      while (t < to - 0.2) {
        const s = steps[i % steps.length];
        mgr._bgmNote(ctx, g, s.note, s.dur, t, 'pad');
        t += s.gap; i++;
      }
      return g;
    }
    // 장면 사이 0.8초 교차 (C07→C08 15.5s, C13→C14 28.0s)
    track('earth', 0.0, 15.9, 2.0, 0.8, 1.0, 1);
    track('civilization', 15.1, 28.4, 0.8, 0.8, 1.0, 1);
    // M3 solar — C20(40.5~46) 동안 줄어듦 → THE END 직전 페이드 아웃
    const solar = track('solar', 27.6, 47.0, 0.8, 1.2, 1.0, 1);
    solar.gain.setValueAtTime(VOL, 40.5);
    solar.gain.linearRampToValueAtTime(VOL * 0.55, 45.8);
    // THE END 종소리 — 게임의 playClear 그대로 (C21 46.0~49.0, 글자 페이드 인과 함께)
    mgr._getCtx = function () { return ctx; };
    mgr._muted = false;
    mgr._packId = 'pad';
    const origVoice = mgr._voice.bind(mgr);
    mgr._voice = function (freq, dur, delay, bd, gm) { return origVoice(freq, dur, 46.3 + delay, bd, gm); };
    mgr.playClear();
    // 크레딧 — M3 조용히 재진입, 마지막 2초 페이드 아웃
    track('solar', 49.0, 60.0, 1.5, 2.0, 0.6, 5);

    const buf = await ctx.startRendering();
    // 피크 정규화(-1.5 dBFS) — 게임 안 합성 레벨이 낮아 영상에서는 작게 들린다
    let peak = 0;
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let k = 0; k < d.length; k++) peak = Math.max(peak, Math.abs(d[k])); }
    const gain = peak > 0 ? 0.84 / peak : 1;
    // 16-bit PCM WAV
    const n = buf.length, bytes = 44 + n * 4, ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
    str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true);
    v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let k = 0, o = 44; k < n; k++, o += 4) {
      v.setInt16(o, Math.max(-1, Math.min(1, L[k] * gain)) * 32767, true);
      v.setInt16(o + 2, Math.max(-1, Math.min(1, R[k] * gain)) * 32767, true);
    }
    let bin = ''; const u8 = new Uint8Array(ab);
    for (let k = 0; k < u8.length; k += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
    return { b64: btoa(bin), peak, gain };
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(b64.b64, 'base64'));
  console.log('✓ ' + path.relative(ROOT, OUT) + '  peak ' + b64.peak.toFixed(3) + ' → gain ×' + b64.gain.toFixed(2));
} finally {
  await browser.close();
}
