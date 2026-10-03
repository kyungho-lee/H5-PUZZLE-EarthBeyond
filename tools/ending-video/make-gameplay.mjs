/* make-gameplay.mjs — 플레이 녹화(capture-gameplay.mjs 결과)를 HyperFrames 로 편집 → 공유용 플레이 영상.
   구성: 0~2.4초 훅 문구(녹화 위) → 실제 플레이(합치기 · 새 단계 공개 · 1장 클리어 · 2장 시작, 상단 아이콘 진행 표시) → 끝 카드
   (EARTH & BEYOND · PLAY FREE ON PLAYGAMA · 짧은 크레딧 — URL 글자 없음). 글자는 영문. 소리 = 녹화 중 게임 사운드 호출을 같은 sound.js 로 재합성한 것.
   크기마다 컴포지션을 만든다(녹화 해상도 그대로 — 업스케일 없음): gameplay-1080x1920.html · gameplay-1920x1080.html (생성물, 커밋 안 함)
   → renders/gameplay-1080x1920.mp4 (쇼츠) · renders/gameplay-1920x1080.mp4 (유튜브)
   Usage: npm run ending:gameplay  (= capture-gameplay.mjs both → 이 스크립트) */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(HERE, 'renders');
const HF = 'hyperframes@0.8.115';
const env = { ...process.env };
if (env.FFMPEG_DIR) env.PATH = env.FFMPEG_DIR + path.delimiter + env.PATH;
const CREDITS = createRequire(import.meta.url)(path.resolve(HERE, '..', '..', 'src', 'ending', 'credits.js'));
const director = (CREDITS.find(c => c.role === 'Game Director') || { name: 'Kevin-H5' }).name;
const HOOK = 'Slide. Merge.<br>Grow a universe.';
const END_SEC = 4.2;

function run(cmd, args, opts = {}) {
  console.log('› ' + cmd + ' ' + args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) { console.error('✗ failed: ' + cmd); process.exit(1); }
}

function html(W, H, log) {
  const name = W + 'x' + H, port = H > W;
  const rec = log.duration, total = +(rec + END_SEC - 0.4).toFixed(2), endAt = +(rec - 0.4).toFixed(2);
  const u = port ? W / 1080 : H / 1080;                // 글자 기준 배율
  const cols = port ? 9 : 16, tile = W / cols, rows = Math.ceil(H / tile) + 2;
  const THEMES = ['primordial-earth', 'human-civilization'];
  let mosaic = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) mosaic += `<img src="assets/img/${THEMES[r % 2]}/step-${String((c + r * 3) % 11 + 1).padStart(2, '0')}.webp" alt="">`;
  return `<!doctype html>
<html lang="en">
<!-- 생성물(make-gameplay.mjs) — 고치려면 make-gameplay.mjs 를 고친다. 플레이 녹화 ${name} · ${rec}s -->
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="vendor/gsap.min.js"></script>
<style>
  @font-face { font-family: 'Rajdhani'; font-weight: 700; font-display: block; src: url('assets/fonts/rajdhani-700.woff2') format('woff2'); }
  @font-face { font-family: 'Share Tech Mono'; font-weight: 400; font-display: block; src: url('assets/fonts/share-tech-mono-400.woff2') format('woff2'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
  #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; color: #fff; }
  .clip { position: absolute; inset: 0; overflow: hidden; }
  #play { width: ${W}px; height: ${H}px; object-fit: cover; }
  #hook { display: flex; align-items: center; justify-content: center; text-align: center;
    background: linear-gradient(180deg, rgba(4,6,14,.25) 0%, rgba(4,6,14,.78) 38%, rgba(4,6,14,.78) 62%, rgba(4,6,14,.25) 100%); }
  #hook div { font: 700 ${Math.round(112 * u)}px/1.05 'Rajdhani', sans-serif; letter-spacing: ${Math.round(4 * u)}px; text-shadow: 0 4px 30px rgba(0,0,0,.9); }
  #mosaic { position: absolute; left: 0; top: 0; width: ${W}px; display: grid; grid-template-columns: repeat(${cols}, ${tile}px); }
  #mosaic img { width: ${tile}px; height: ${tile}px; display: block; }
  #dim { position: absolute; inset: 0; background: #000; opacity: .72; }
  #card { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; }
  #card .a { font: 700 ${Math.round(124 * u)}px/1 'Rajdhani', sans-serif; letter-spacing: ${Math.round(12 * u)}px; padding-left: ${Math.round(12 * u)}px; text-shadow: 0 4px 30px rgba(0,0,0,.9); }
  #card .b { margin-top: ${Math.round(44 * u)}px; display: inline-block; padding: ${Math.round(20 * u)}px ${Math.round(52 * u)}px; border: ${Math.max(2, Math.round(3 * u))}px solid #7aacff;
    border-radius: ${Math.round(70 * u)}px; background: rgba(10,20,44,.8); font: 700 ${Math.round(50 * u)}px/1 'Rajdhani', sans-serif; letter-spacing: ${Math.round(5 * u)}px; }
  #card .c { margin-top: ${Math.round(48 * u)}px; font: 400 ${Math.round(26 * u)}px/1.4 'Share Tech Mono', monospace; letter-spacing: 1px; color: #b9cdf2; }
  #fade { position: absolute; inset: 0; background: #000; opacity: 0; }
</style>
</head>
<body>
<div id="root" data-composition-id="gameplay" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}" data-fps="30">
  <video id="play" class="clip" src="renders/gameplay-raw-${name}.mp4" muted data-start="0" data-duration="${rec}" data-track-index="1"></video>
  <div id="hook" class="clip" style="z-index:5" data-start="0" data-duration="2.5" data-track-index="2"><div>${HOOK}</div></div>
  <div id="end" class="clip" style="z-index:6;background:#000" data-start="${endAt}" data-duration="${(total - endAt).toFixed(2)}" data-track-index="3">
    <div id="mosaic">${mosaic}</div><div id="dim"></div>
    <div id="card"><div class="a">EARTH &amp; BEYOND</div><div class="b">PLAY FREE ON PLAYGAMA</div><div class="c">Game Director ${director} · made with an AI agent team</div></div>
  </div>
  <div id="fade" class="clip" style="z-index:9" data-start="0" data-duration="${total}" data-track-index="4"></div>
  <audio id="music" src="assets/audio/gameplay-${name}.wav" data-start="0" data-duration="${total}" data-volume="1" data-fade-out="1.6" data-track-index="5"></audio>
  <!-- 끝 카드 음악: 엔딩 녹음(sound.js solar 테마)의 크레딧 구간을 이어 깐다 — 플레이 BGM 의 쉼 구간이 끝 카드에 걸려도 조용해지지 않게 -->
  <audio id="endbed" src="assets/audio/ending-mix.wav" data-start="${endAt}" data-media-start="50" data-duration="${(total - endAt).toFixed(2)}" data-volume="0.9" data-fade-in="0.6" data-fade-out="1.4" data-track-index="6"></audio>
</div>
<script>
  var tl = gsap.timeline({ paused: true });
  tl.fromTo('#hook', { opacity: 1 }, { opacity: 1, duration: 1.9 }, 0);
  tl.fromTo('#hook div', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.1);
  tl.to('#hook', { opacity: 0, duration: 0.5, ease: 'none' }, 2.0);
  tl.fromTo('#end', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none' }, ${endAt});
  tl.fromTo('#mosaic', { y: 0 }, { y: -${Math.round(tile)}, duration: ${(total - endAt).toFixed(2)}, ease: 'none' }, ${endAt});
  tl.fromTo('#card .a', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, ${(endAt + 0.3).toFixed(2)});
  tl.fromTo('#card .b', { opacity: 0, y: ${Math.round(14 * u)} }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, ${(endAt + 0.9).toFixed(2)});
  tl.fromTo('#card .c', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none' }, ${(endAt + 1.4).toFixed(2)});
  tl.to('#fade', { opacity: 1, duration: 0.7, ease: 'none' }, ${(total - 0.7).toFixed(2)});
  window.__timelines = window.__timelines || {};
  window.__timelines['gameplay'] = tl;
  tl.seek(0);
</script>
</body>
</html>
`;
}

run('node', [path.join(HERE, 'prepare.mjs')]);
if (!fs.existsSync(path.join(HERE, 'assets', 'audio', 'ending-mix.wav'))) run('node', [path.join(HERE, 'record-audio.mjs')]);
for (const [W, H] of [[1080, 1920], [1920, 1080]]) {
  const name = W + 'x' + H;
  const log = JSON.parse(fs.readFileSync(path.join(R, `gameplay-log-${name}.json`), 'utf8'));
  fs.writeFileSync(path.join(HERE, `gameplay-${name}.html`), html(W, H, log));
  run('npx', ['--yes', HF, 'render', '.', '--composition', `gameplay-${name}.html`, '-o', `renders/gameplay-${name}-master.mp4`, '--fps', '30', '--quality', 'delivery', '--quiet'], { cwd: HERE });
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', `renders/gameplay-${name}-master.mp4`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', '60', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', `renders/gameplay-${name}.mp4`], { cwd: HERE });
  console.log(`✓ renders/gameplay-${name}.mp4  ${fs.statSync(path.join(R, `gameplay-${name}.mp4`)).size} bytes`);
}
