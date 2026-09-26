'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ND = require('../src/neon-drift.js');
const { runScenarios } = require('../scripts/nd-baseline.js');
const baseline = require('./fixtures/nd-baseline.json');

test('core without comet/observatory options matches the pre-change baseline', () => {
  const now = JSON.parse(JSON.stringify(runScenarios(ND)));
  assert.strictEqual(now.length, baseline.length);
  for (let i = 0; i < baseline.length; i++) {
    assert.deepStrictEqual(now[i], baseline[i], `${baseline[i].name} seed ${baseline[i].seed}`);
  }
});
