/* capture-gameplay.mjs — 실제 게임(src)을 헤드리스 Chromium 으로 플레이하며 녹화한다 (Playgama 「Make a video」 용 플레이 영상 재료).
   - 화면: CDP Page.startScreencast(JPEG q92)를 목표 해상도 그대로(세로 360×640 ×3 = 1080×1920 · 가로 1280×720 ×1.5 = 1920×1080) — 업스케일 없음.
     프레임 시각대로 이어 30fps 로 고정 → renders/gameplay-raw-<WxH>.mp4 (소리 없음)
   - 입력: 진짜 키 입력(방향키 · Enter · 클릭). 수는 페이지 안에서 매 수 4방향을 미리 밀어 보고 가장 큰 합치기를 고른다.
     짧은 영상 안에 장 클리어까지 보여 주려고 개발용 치트(생성 블록을 같은 크기 짝으로)를 켠다 — 합치기 · 새 그림 공개 · 클리어 연출은 게임 코드 그대로.
     ?dev=1&capture=1 = 개발 바 · DEV 표시만 숨김(Playgama 빌드에서는 DEV 블록째 빠진다).
   - 소리: 게임 사운드 호출(playMerge · playClear · playBlip · playBgm …)을 시각과 함께 기록 → 같은 sound.js 를 OfflineAudioContext 로 같은 시각에 다시 합성
     (헤드리스 Chrome 은 소리를 녹음할 수 없어 같은 합성기로 재현) → assets/audio/gameplay-<WxH>.wav
   - 기록: renders/gameplay-log-<WxH>.json (장 넘어감 · 클리어 시각 등)
   서버: EB_URL (기본 http://localhost:3001/) — src 정적 서버가 떠 있어야 한다.
   Usage: node tools/ending-video/capture-gameplay.mjs [portrait|landscape|both] [--audio-only] */
import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const R = path.join(HERE, 'renders');
const BASE = (process.env.EB_URL || 'http://localhost:3001/').replace(/\/?$/, '/');
const env = { ...process.env };
if (env.FFMPEG_DIR) env.PATH = env.FFMPEG_DIR + path.delimiter + env.PATH;
const MODES = {
  portrait: { name: '1080x1920', viewport: { width: 360, height: 640 }, dsf: 3, w: 1080, h: 1920 },
  landscape: { name: '1920x1080', viewport: { width: 1280, height: 720 }, dsf: 1.5, w: 1920, h: 1080 },
};
const which = process.argv[2] || 'both';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };

async function capture(mode) {
  const M = MODES[mode];
  const frameDir = path.join(R, 'gameplay-frames-' + M.name);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: M.viewport, deviceScaleFactor: M.dsf, hasTouch: mode === 'portrait', isMobile: false });
  const page = await ctx.newPage();
  const url = BASE + '?dev=1&capture=1';
  await page.goto(url);
  await page.waitForFunction(() => !document.body.classList.contains('booting'));
  // 첫 방문 안내 · 튜토리얼 건너뛰기, 영어, 사운드 켬
  await page.evaluate(() => {
    ['earthbeyond_onboarded', 'earthbeyond_tutorial_seen'].forEach(k => SG.Store.setItem(k, '1'));
    SG.Store.setItem('earthbeyond_lang', 'en');
    SG.Store.flush && SG.Store.flush();
  });
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('booting') && !document.getElementById('ol-start').classList.contains('hidden'));
  await sleep(600);
  // 사운드 호출 기록 (원래 동작은 그대로 부른다)
  await page.evaluate(() => {
    window.__snd = [];
    const P = SG.SoundManager.prototype;
    ['playMerge', 'playClear', 'playGameOver', 'playBlip', 'playBgm', 'stopBgm'].forEach(m => {
      const orig = P[m];
      P[m] = function () { window.__snd.push({ t: performance.timeOrigin + performance.now(), m, a: JSON.parse(JSON.stringify(Array.from(arguments))), pack: this._packId }); return orig.apply(this, arguments); };
    });
  });
  const marks = [];
  const mark = async (name) => marks.push({ name, t: await page.evaluate(() => performance.timeOrigin + performance.now()) });

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = 'f' + String(frames.length).padStart(5, '0') + '.jpg';
    frames.push({ file, ts: f.metadata.timestamp * 1000 });
    fs.writeFileSync(path.join(frameDir, file), Buffer.from(f.data, 'base64'));
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (_) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: M.w, maxHeight: M.h, everyNthFrame: 1 });
  await mark('rec_start');
  await sleep(1400);                                         // 로비(제목 · 메뉴)
  await page.evaluate(() => devToggleCheat());
  await page.click('#btn-collection');                       // CHRONICLES → 갤러리
  await sleep(1100);
  await page.click('#btn-gallery-play');                     // 장 시작
  await mark('play_start');
  await sleep(900);

  const vis = id => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden'); }, id);
  const pick = () => page.evaluate(() => {
    if (!gameRunning || isAnimating) return null;
    const opts = Object.assign({}, dailyMode ? dailyOpts : mainOpts);
    let best = null;
    ['left', 'down', 'right', 'up'].forEach(function (d, i) {
      const r = ND.applyMove(ND.cloneGrid(grid), d, function () { return 0.37; }, opts);
      if (!r.moved) return;
      const m = r.merges.reduce(function (a, x) { return Math.max(a, x.size || 0); }, 0);
      const s = m * 100 + r.merges.length * 10 - i;
      if (!best || s > best.s) best = { d: d, s: s };
    });
    return best && best.d;
  });
  let chapter = 1, ch2Moves = 0, guard = 0;
  while (guard++ < 400) {
    if (await vis('ol-unlock')) { await sleep(1500); await page.keyboard.press('Enter'); await sleep(500); continue; }
    if (await vis('ol-chapter-clear')) { if (!marks.find(m => m.name === 'chapter_clear')) await mark('chapter_clear'); await sleep(200); continue; }
    if (await vis('ol-chapter-complete')) {
      await mark('chapter_complete'); await sleep(1700);
      await page.click('#btn-chapter-next'); chapter = 2; await mark('chapter2_start'); await sleep(1200); continue;
    }
    if (await vis('ol-collection-over')) { await mark('game_over'); break; }
    // 2장 소개 카드(BEGIN CHAPTER) · 첫 발견 카드(START) — 잠깐 보여 주고 누른다
    const btn = await page.evaluate(() => ['btn-chapter-start', 'btn-step-reveal-start'].find(id => { const b = document.getElementById(id); return !!b && b.offsetParent !== null; }) || null);
    if (btn) { await sleep(1400); await page.click('#' + btn); await sleep(700); continue; }
    const d = await pick();
    if (!d) { await sleep(120); continue; }
    await page.keyboard.press(KEY[d]);
    if (chapter === 2 && ++ch2Moves >= 9) { await sleep(1400); break; }
    await sleep(chapter === 2 ? 520 : 470);
  }
  await mark('rec_end');
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  const snd = await page.evaluate(() => window.__snd);
  await browser.close();

  // 프레임 → 30fps 영상 (프레임 시각 = 표시 길이)
  frames.sort((a, b) => a.ts - b.ts);
  const t0 = frames[0].ts, tEnd = marks.find(m => m.name === 'rec_end').t;
  let list = '';
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].ts : Math.max(f.ts + 33, tEnd);
    list += `file '${f.file}'\nduration ${Math.max(0.001, (next - f.ts) / 1000).toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].file}'\n`;
  fs.writeFileSync(path.join(frameDir, 'list.txt'), list);
  const out = path.join(R, `gameplay-raw-${M.name}.mp4`);
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-vf', `fps=30,scale=${M.w}:${M.h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', out],
    { cwd: frameDir, env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg concat failed');
  const rel = t => +((t - t0) / 1000).toFixed(3);
  const log = { mode, size: M.name, frames: frames.length, duration: rel(tEnd), fpsAvg: +(frames.length / ((tEnd - t0) / 1000)).toFixed(1),
    marks: marks.map(m => ({ name: m.name, t: rel(m.t) })), sound: snd.map(e => ({ t: rel(e.t), m: e.m, a: e.a, pack: e.pack })).filter(e => e.t >= 0) };
  fs.writeFileSync(path.join(R, `gameplay-log-${M.name}.json`), JSON.stringify(log, null, 1));
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log(`✓ ${path.relative(ROOT, out)}  ${log.duration}s · ${log.frames} frames (avg ${log.fpsAvg} fps) · marks ${log.marks.map(m => m.name + '@' + m.t).join(' ')}`);
  return log;
}

// 기록한 사운드 호출을 같은 sound.js 로 다시 합성 → WAV
async function synthAudio(log) {
  const soundJs = fs.readFileSync(path.join(ROOT, 'src', 'sound.js'), 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: soundJs });
    const res = await page.evaluate(async (log) => {
      const SR = 44100, LEN = Math.ceil(log.duration + 6);   // 끝 카드 동안 BGM 이 이어지게 여유
      const ctx = new OfflineAudioContext(2, SR * LEN, SR);
      const mgr = new SG.SoundManager();
      const T = SG._BGM_THEMES, VOL = mgr.bgmVolume;
      mgr._getCtx = function () { return ctx; };
      // BGM: playBgm(theme) ~ 다음 playBgm/stopBgm/끝
      const bgm = log.sound.filter(e => e.m === 'playBgm' || e.m === 'stopBgm');
      bgm.forEach((e, i) => {
        if (e.m !== 'playBgm' || !T[e.a[0]]) return;
        const end = (bgm.slice(i + 1).find(x => x.t > e.t + 0.01) || { t: LEN }).t;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, 0); g.gain.setValueAtTime(0.0001, e.t);
        g.gain.linearRampToValueAtTime(VOL, e.t + 0.3);
        g.gain.setValueAtTime(VOL, Math.max(e.t + 0.3, end - 0.3)); g.gain.linearRampToValueAtTime(0, end);
        g.connect(ctx.destination);
        const steps = [].concat(...T[e.a[0]].phrases, ...T[e.a[0]].phrases);
        let t = e.t + 0.05, k = 0;
        while (t < end - 0.2) { const s = steps[k % steps.length]; mgr._bgmNote(ctx, g, s.note, s.dur, t, e.a[1] || 'pad'); t += s.gap; k++; }
      });
      // 효과음: 같은 메서드를 같은 시각으로 (지연에 시각을 더한다)
      const voice = mgr._voice.bind(mgr);
      let OFF = 0;
      mgr._voice = function (f, d, delay, bd, gm) { return voice(f, d, OFF + delay, bd, gm); };
      mgr._muted = false;
      log.sound.forEach(e => {
        if (!['playMerge', 'playClear', 'playGameOver', 'playBlip'].includes(e.m)) return;
        OFF = e.t; mgr._packId = e.pack || 'pad';
        mgr[e.m].apply(mgr, e.a);
      });
      const buf = await ctx.startRendering();
      let peak = 0;
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
      const gain = peak > 0 ? 0.84 / peak : 1;
      const n = buf.length, ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
      str(36, 'data'); v.setUint32(40, n * 4, true);
      const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
      for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, L[i] * gain)) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, Rr[i] * gain)) * 32767, true); }
      let bin = ''; const u8 = new Uint8Array(ab);
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { b64: btoa(bin), peak, events: log.sound.length };
    }, log);
    const out = path.join(HERE, 'assets', 'audio', `gameplay-${log.size}.wav`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(res.b64, 'base64'));
    console.log(`✓ ${path.relative(ROOT, out)}  ${res.events} sound calls · peak ${res.peak.toFixed(3)}`);
  } finally { await browser.close(); }
}

fs.mkdirSync(R, { recursive: true });
const audioOnly = process.argv.includes('--audio-only');      // 녹화는 두고 소리만 다시 합성
for (const m of which === 'both' || which.startsWith('--') ? ['portrait', 'landscape'] : [which]) {
  const log = audioOnly ? JSON.parse(fs.readFileSync(path.join(R, `gameplay-log-${MODES[m].name}.json`), 'utf8')) : await capture(m);
  await synthAudio(log);
}
