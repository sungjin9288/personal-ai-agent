import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createRuntimeJobRegistry } from '../src/core/runtime-job-registry.mjs';
import { createRuntimeJobRunner } from '../src/core/runtime-job-runner.mjs';

function createFixture(t, source = 'web-ui') {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-job-runner-'));
  t.after(() => fs.rmSync(rootDir, { force: true, recursive: true }));
  const registry = createRuntimeJobRegistry({ rootDir });
  return {
    registry,
    runner: createRuntimeJobRunner({ registry, source }),
  };
}

test('completed runtime job preserves request linkage and records a compact result', (t) => {
  const { registry, runner } = createFixture(t);
  const payload = {
    archiveResult: { verifiedCommit: 'verified-commit' },
    closeoutResult: {
      checklistPath: '/tmp/execution-v1-closeout.md',
      generatedAt: '2026-07-14T00:00:00.000Z',
    },
    evidenceResult: { outputPath: '/tmp/execution-v1-evidence.md' },
    ok: true,
    stepCount: 8,
  };
  let taskJobId = '';

  const { job, result } = runner.run({
    details: { provider: 'openai' },
    jobKind: 'execution-v1-refresh',
    requestId: 'request-refresh-1',
    scope: 'live-validation',
    summary: 'OpenAI release evidence refresh',
    task: (activeJob) => {
      taskJobId = activeJob.id;
      return payload;
    },
  });

  assert.equal(taskJobId, job.id);
  assert.equal(result, payload);
  const status = registry.summarize();
  assert.equal(status.activeCount, 0);
  assert.equal(status.recentCount, 1);
  assert.equal(status.recent[0].id, job.id);
  assert.equal(status.recent[0].kind, 'execution-v1-refresh');
  assert.equal(status.recent[0].requestId, 'request-refresh-1');
  assert.equal(status.recent[0].scope, 'live-validation');
  assert.equal(status.recent[0].source, 'web-ui');
  assert.equal(status.recent[0].status, 'completed');
  assert.equal(status.recent[0].summary, 'OpenAI release evidence refresh');
  assert.deepEqual(status.recent[0].details, {
    provider: 'openai',
    result: {
      archiveCommit: 'verified-commit',
      evidencePath: '/tmp/execution-v1-evidence.md',
      generatedAt: '2026-07-14T00:00:00.000Z',
      keyCount: 5,
      ok: true,
      outputPath: '/tmp/execution-v1-closeout.md',
    },
  });
});

test('failed runtime job is finalized before the original error is rethrown', (t) => {
  const { registry, runner } = createFixture(t, 'release-console');
  const failure = new Error('snapshot archive failed');

  assert.throws(
    () => runner.run({
      details: { confirmed: true },
      jobKind: 'execution-v1-snapshot',
      requestId: 'request-snapshot-1',
      scope: 'snapshot',
      summary: 'Release snapshot freeze',
      task: () => {
        throw failure;
      },
    }),
    (error) => error === failure,
  );

  const status = registry.summarize();
  assert.equal(status.activeCount, 0);
  assert.equal(status.recentCount, 1);
  assert.equal(status.recent[0].requestId, 'request-snapshot-1');
  assert.equal(status.recent[0].source, 'release-console');
  assert.equal(status.recent[0].status, 'failed');
  assert.equal(status.recent[0].error, 'snapshot archive failed');
  assert.deepEqual(status.recent[0].details, { confirmed: true });
});

test('non-object task result is returned while the stored result summary stays null', (t) => {
  const { registry, runner } = createFixture(t);

  const { result } = runner.run({
    jobKind: 'simple-job',
    requestId: 'request-simple-1',
    task: () => 'completed',
  });

  assert.equal(result, 'completed');
  assert.deepEqual(registry.summarize().recent[0].details, {
    result: null,
  });
});
