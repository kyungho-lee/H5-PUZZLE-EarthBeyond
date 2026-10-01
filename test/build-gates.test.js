'use strict';
// v0.9.1 scripts/playgama-gates.js — 진짜 src/(DEV 제거 + 스텁) 는 통과하고, 규칙 위반은 하나씩 걸린다
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../scripts/playgama-gates.js');

const ROOT = path.join(__dirname, '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const EXCLUDE = [/^\./, /\.example\.js$/, /^firebase-config\.js$/, /\.md$/];   // build-playgama.mjs 와 같게
function rawSrcFiles(dir = path.join(ROOT, 'src'), rel = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.some(re => re.test(d.name))) continue;
    const r = rel ? rel + '/' + d.name : d.name;
    if (d.isDirectory()) out.push(...rawSrcFiles(path.join(dir, d.name), r));
    else out.push({ name: r, data: fs.readFileSync(path.join(dir, d.name)) });
  }
  return out;
}
const buildFiles = () => G.applyStubs(G.stripDev(rawSrcFiles()));
const withFile = (files, name, text) => files.filter(f => f.name !== name).concat({ name, data: Buffer.from(text) });
const edit = (files, name, fn) => withFile(files, name, fn(files.find(f => f.name === name).data.toString('utf8')));
const has = (errs, re) => errs.some(e => re.test(e));

test('the real src/ (DEV stripped, stubs applied) passes every gate', () => {
  assert.deepStrictEqual(G.checkBuild(buildFiles(), VERSION), []);
});

test('unstripped src/ fails (dev bar / cheats would ship) and the real firebase.js / crazygames.js fail', () => {
  const raw = G.stripDev(rawSrcFiles()).concat();         // stripped but NOT stubbed
  const errs = G.checkBuild(raw, VERSION);
  assert.ok(has(errs, /external URL in firebase\.js/), errs.join('\n'));
  assert.ok(has(errs, /external URL in crazygames\.js/), errs.join('\n'));
  assert.ok(has(errs, /firebase\.js must be the no-op stub/), errs.join('\n'));
  const unstripped = G.checkBuild(G.applyStubs(rawSrcFiles()), VERSION);
  assert.ok(has(unstripped, /dev tool leftover in index\.html/), unstripped.join('\n'));
});

test('DEV strip removes HTML and JS dev blocks and leaves valid script', () => {
  const idx = rawSrcFiles().find(f => f.name === 'index.html').data.toString('utf8');
  assert.ok(/<!-- DEV-BEGIN -->/.test(idx) && /\/\/ DEV-BEGIN/.test(idx), 'src keeps the dev tools for local checks');
  const out = G.stripDev([{ name: 'index.html', data: Buffer.from(idx) }])[0].data.toString('utf8');
  assert.ok(!/DEV-BEGIN|DEV-END|id="dev-bar"|devResetAll|sg_dev/.test(out), 'build copy has no dev tool');
  assert.deepStrictEqual(G.inlineScriptErrors(out), []);
  assert.ok(/SG\.DEV = false;/.test(out), 'DEV switch stays false in the build');
});

test('an inline <script> that does not parse fails the build', () => {
  const f = edit(buildFiles(), 'index.html', s => s.replace("const APP_VERSION =", "const q = 'oops;\nconst APP_VERSION ="));
  assert.ok(has(G.checkBuild(f, VERSION), /inline <script> #\d+ in index\.html does not parse/));
  assert.strictEqual(G.inlineScriptErrors("<script>let a = 'x;</script>").length, 1);
  assert.deepStrictEqual(G.inlineScriptErrors('<script src="a.js"></script><script>let a = 1;</script>'), []);
});

test('version: package.json must equal APP_VERSION (0.9.1 ↔ v0.9.1)', () => {
  assert.strictEqual(G.expectedAppVersion('0.9.1'), 'v0.9.1');
  assert.strictEqual(G.expectedAppVersion('0.9.0'), 'v0.9');
  assert.ok(has(G.checkBuild(buildFiles(), '9.9.9'), /version mismatch/));
});

test('external URL, analytics, direct storage, non-latin names, missing Bridge tag each fail', () => {
  const B = buildFiles();
  assert.ok(has(G.checkBuild(edit(B, 'sound.js', s => s + '\nfetch("https://cdn.example.com/x");'), VERSION), /external URL in sound\.js/));
  assert.ok(has(G.checkBuild(withFile(B, 'extra.js', 'gtag("event","x");'), VERSION), /analytics/));
  assert.ok(has(G.checkBuild(withFile(B, 'extra.js', 'firebase.initializeApp({})'), VERSION), /analytics/));
  assert.ok(has(G.checkBuild(withFile(B, 'extra.js', 'localStorage.setItem("a", 1);'), VERSION), /direct browser storage in extra\.js/));
  assert.ok(has(G.checkBuild(withFile(B, 'themes/Bad Name.png', 'x'), VERSION), /not latin/));
  assert.ok(has(G.checkBuild(edit(B, 'index.html', s => s.replace(/<script src="https:\/\/bridge\.playgama\.com[^>]*><\/script>/, '')), VERSION), /Bridge SDK/));
  assert.ok(has(G.checkBuild(B.filter(f => f.name !== 'index.html'), VERSION), /index\.html missing/));
});

test('bridge config must list playgama_sandbox for SaaS leaderboards', () => {
  const f = edit(buildFiles(), 'playgama-bridge-config.json', s => s.replace('"playgama_sandbox", ', ''));
  assert.ok(has(G.checkBuild(f, VERSION), /playgama_sandbox/));
});
