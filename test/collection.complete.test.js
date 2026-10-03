'use strict';
// v0.9.2 — 마지막 장(III solar-system)을 끝내도 meta.completedThemes 에 기록된다 + 옛 저장 복구
const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/collection.js');

const THEMES = [
  { id: 'primordial-earth', stepSizes: [1, 2] },
  { id: 'human-civilization', stepSizes: [1, 2], unlockCondition: 'primordial-earth' },
  { id: 'solar-system', stepSizes: [1, 2], unlockCondition: 'human-civilization' },
];
const clear = (st, t) => { const r = C.recordMerges(t.id, [2], st, THEMES, t); assert.strictEqual(r.isComplete, true); };

test('completing a middle chapter unlocks the next and records it (unchanged)', () => {
  const st = {};
  clear(st, THEMES[0]);
  assert.strictEqual(C.unlockNextTheme('primordial-earth', st, THEMES), 'human-civilization');
  const m = C.loadMeta(st);
  assert.deepStrictEqual(m.completedThemes, ['primordial-earth']);
  assert.ok(m.unlockedThemes.includes('human-civilization'));
  assert.strictEqual(m.activeThemeId, 'human-civilization');
});

test('completing the LAST chapter returns null but records solar-system in completedThemes', () => {
  const st = {};
  THEMES.forEach(t => { clear(st, t); C.unlockNextTheme(t.id, st, THEMES); });
  const m = C.loadMeta(st);
  assert.strictEqual(C.unlockNextTheme('solar-system', st, THEMES), null);
  assert.deepStrictEqual(m.completedThemes, ['primordial-earth', 'human-civilization', 'solar-system']);
  assert.strictEqual(m.activeThemeId, 'solar-system', 'active chapter stays on the last one');
});

test('syncCompletedThemes repairs an old save where solar-system was completed but not recorded', () => {
  const st = {};
  THEMES.forEach(t => clear(st, t));
  C.saveMeta(st, { activeThemeId: 'solar-system', unlockedThemes: THEMES.map(t => t.id), completedThemes: ['primordial-earth', 'human-civilization'] });
  assert.deepStrictEqual(C.syncCompletedThemes(st, THEMES), ['solar-system']);
  assert.deepStrictEqual(C.loadMeta(st).completedThemes, ['primordial-earth', 'human-civilization', 'solar-system']);
  assert.deepStrictEqual(C.syncCompletedThemes(st, THEMES), [], 'second call changes nothing');
});

test('syncCompletedThemes never marks an unfinished chapter', () => {
  const st = {};
  clear(st, THEMES[0]);
  assert.deepStrictEqual(C.syncCompletedThemes(st, THEMES), ['primordial-earth']);
  assert.ok(!C.loadMeta(st).completedThemes.includes('human-civilization'));
});
