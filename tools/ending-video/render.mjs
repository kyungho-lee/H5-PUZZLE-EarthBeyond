/* render.mjs — 엔딩 영상 한 번에: 준비물 복사 → 음악 녹음 → HyperFrames 렌더 → 게임용 압축 → src/ending/ 에 넣기.
   게임용: src/ending/ending-720.mp4 (720×720 · 30fps · H.264 High/yuv420p · AAC 128k · faststart · 6MB 이하 확인)
   --promo: 30초 홍보판(promo.html) 1920×1080 · 1080×1920 → renders/promo-30-*.mp4 (게임 파일 안 건드림)
   --share: 공유용 1080×1920 · 1920×1080 (정사각 무대 가운데 + 같은 화면을 흐리게 깐 채움) → renders/ (게임에 안 넣음 · 공개는 감독 승인)
   FFmpeg 가 PATH 에 없으면 FFMPEG_DIR 환경 변수로 bin 폴더를 준다.
   Usage: npm run ending:render [-- --share] · npm run ending:promo */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const R = path.join(HERE, 'renders');
const GAME_OUT = path.join(ROOT, 'src', 'ending', 'ending-720.mp4');
const MAX_BYTES = 6 * 1024 * 1024;
const HF = 'hyperframes@0.8.115';
const env = { ...process.env };
if (env.FFMPEG_DIR) env.PATH = env.FFMPEG_DIR + path.delimiter + env.PATH;

function run(cmd, args, opts = {}) {
  console.log('› ' + cmd + ' ' + args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) { console.error('✗ failed: ' + cmd); process.exit(1); }
}
fs.mkdirSync(R, { recursive: true });
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '3.1', '-pix_fmt', 'yuv420p', '-g', '60',
  '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart'];
const encShare = enc.filter((x, i, a) => !(x === '-level' || a[i - 1] === '-level'));
// 정사각 무대(720)를 짧은 변 100% 로 키우고, 뒤에 같은 화면을 크게 · 흐리게 · 어둡게 깔아 남는 곳을 채운다(새 그림 없음)
function fillVariants(raw, prefix) {
  for (const [name, w, h] of [['1920x1080', 1920, 1080], ['1080x1920', 1080, 1920]]) {
    const s = Math.min(w, h), big = Math.max(w, h);
    const vf = `[0:v]split[a][b];[a]scale=${big}:${big},boxblur=28:2,eq=brightness=-0.18,crop=${w}:${h}[bg];` +
      `[b]scale=${s}:${s}:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p`;
    const out = `renders/${prefix}-${name}.mp4`;
    run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-filter_complex', `"${vf}"`, '-crf', '22', ...encShare, out], { cwd: HERE });
    console.log('✓ ' + out + '  ' + fs.statSync(path.join(HERE, out)).size + ' bytes');
  }
}
run('node', [path.join(HERE, 'prepare.mjs')]);
run('node', [path.join(HERE, 'record-audio.mjs')]);

// --promo: 30초 홍보판(promo.html)만 — 유튜브 1920×1080 · 쇼츠 1080×1920. 게임 파일(src/ending)은 건드리지 않는다.
if (process.argv.includes('--promo')) {
  // 음악: 엔딩 녹음에서 earth 0~12.4초 + civilization 15.1초~ 를 0.8초 교차로 이어 30초, 끝 2.5초 페이드 아웃
  const af = '[0:a]atrim=0:12.4,asetpts=PTS-STARTPTS[a];[0:a]atrim=15.1:33.5,asetpts=PTS-STARTPTS[b];' +
    '[a][b]acrossfade=d=0.8:c1=tri:c2=tri,afade=t=out:st=27.5:d=2.5,atrim=0:30[out]';
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'assets/audio/ending-mix.wav', '-filter_complex', `"${af}"`, '-map', '"[out]"',
    'assets/audio/promo-mix.wav'], { cwd: HERE });
  run('npx', ['--yes', HF, 'render', '.', '--composition', 'promo.html', '-o', 'renders/promo-30-raw.mp4', '--fps', '30', '--quality', 'delivery', '--quiet'], { cwd: HERE });
  fillVariants('renders/promo-30-raw.mp4', 'promo-30');
  process.exit(0);
}

run('npx', ['--yes', HF, 'render', '.', '-o', 'renders/ending-720-raw.mp4', '--fps', '30', '--quality', 'delivery', '--quiet'], { cwd: HERE });
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'renders/ending-720-raw.mp4', '-crf', '27', ...enc, 'renders/ending-720.mp4'], { cwd: HERE });
const size = fs.statSync(path.join(R, 'ending-720.mp4')).size;
if (size > MAX_BYTES) { console.error('✗ ending-720.mp4 is ' + size + ' bytes (> 6MB) — raise -crf'); process.exit(1); }
fs.copyFileSync(path.join(R, 'ending-720.mp4'), GAME_OUT);
console.log('✓ ' + path.relative(ROOT, GAME_OUT) + '  ' + size + ' bytes');

if (process.argv.includes('--share')) fillVariants('renders/ending-720-raw.mp4', 'ending');
