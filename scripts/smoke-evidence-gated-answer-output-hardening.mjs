import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const outcome = spawnSync(
  process.execPath,
  ['--test', 'test/evidence-gated-answer-output.test.mjs'],
  { cwd: process.cwd(), encoding: 'utf8' },
);

assert.equal(outcome.status, 0, outcome.stderr || outcome.stdout);
console.log(JSON.stringify({
  mode: 'smoke-evidence-gated-answer-output-hardening',
  ok: true,
}, null, 2));
