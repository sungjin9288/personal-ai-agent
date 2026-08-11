import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

const repoDir = process.cwd();
const smokePath = path.join(repoDir, 'scripts', 'smoke-council-blueprint-preview.mjs');
const envelopeSmokePath = path.join(repoDir, 'scripts', 'smoke-council-concurrent-envelope-shadow.mjs');
const renameDelayPreload = path.join(repoDir, 'test', 'helpers', 'delay-first-runtime-request-rename.mjs');

test('blueprint preview smoke waits for the first delayed runtime request completion rename', () => {
  const result = spawnSync(process.execPath, [smokePath], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${renameDelayPreload}`].filter(Boolean).join(' '),
      PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_DELAY_MS: '250',
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"status":"passed"/);
  assert.doesNotMatch(result.stderr, /runtime-requests\.json\.[^\s]+\.tmp/);
});

test('concurrent envelope smoke waits for the delayed request terminal audit', () => {
  const result = spawnSync(process.execPath, [envelopeSmokePath], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${renameDelayPreload}`].filter(Boolean).join(' '),
      PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_DELAY_MS: '250',
      PERSONAL_AI_AGENT_TEST_RUNTIME_REQUEST_RENAME_COMPLETION_NUMBER: '2',
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /"status":"passed"/);
});
