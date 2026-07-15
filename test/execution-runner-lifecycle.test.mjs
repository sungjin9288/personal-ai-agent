import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeExecutionSession,
  completeExecutionStep,
  failExecutionSession,
  failExecutionStep,
  startExecutionSession,
  startExecutionStep,
} from '../src/core/execution-runner-lifecycle.mjs';

test('startExecutionSession preserves the first start time', () => {
  assert.deepEqual(
    startExecutionSession({ id: 'execution-1', startedAt: 'earlier' }, 'now'),
    {
      id: 'execution-1',
      startedAt: 'earlier',
      status: 'running',
      updatedAt: 'now',
    },
  );
});

test('step lifecycle records start, success, and mutation evidence', () => {
  const running = startExecutionStep({ id: 'step-1', status: 'pending' }, 'start');
  const completed = completeExecutionStep(running, {
    at: 'end',
    mutationAudit: { filePath: 'note.md' },
  });

  assert.deepEqual(running, {
    id: 'step-1',
    startedAt: 'start',
    status: 'running',
  });
  assert.deepEqual(completed, {
    id: 'step-1',
    startedAt: 'start',
    endedAt: 'end',
    exitCode: 0,
    mutationAudit: { filePath: 'note.md' },
    status: 'completed',
  });
});

test('completeExecutionStep preserves an existing audit when no new audit is produced', () => {
  const mutationAudit = { filePath: 'existing.md' };
  const completed = completeExecutionStep(
    { id: 'step-1', mutationAudit },
    { at: 'end', mutationAudit: null },
  );

  assert.equal(completed.mutationAudit, mutationAudit);
});

test('failExecutionStep distinguishes operator stop from execution failure', () => {
  const error = new Error('command failed');

  assert.equal(failExecutionStep({}, { at: 'end', error, stopRequested: false }).status, 'failed');
  assert.equal(failExecutionStep({}, { at: 'end', error, stopRequested: true }).status, 'stopped');
  assert.equal(failExecutionStep({}, { at: 'end', error, stopRequested: false }).error, 'command failed');
});

test('completeExecutionSession records verification and mutation evidence', () => {
  const completed = completeExecutionSession(
    { id: 'execution-1', workspacePath: '/workspace' },
    {
      at: 'end',
      changedFiles: ['M note.md'],
      mutationAudits: [{ filePath: 'note.md' }],
      mutationBatchAudit: { status: 'complete' },
      verification: { status: 'passed' },
    },
  );

  assert.equal(completed.status, 'completed');
  assert.equal(completed.endedAt, 'end');
  assert.deepEqual(completed.changedFiles, ['M note.md']);
  assert.deepEqual(completed.verification, { status: 'passed' });
});

test('failExecutionSession keeps stopped sessions distinct from failed sessions', () => {
  const stopped = failExecutionSession(
    { id: 'execution-1' },
    {
      at: 'end',
      changedFiles: [],
      error: new Error('Execution stopped by operator.'),
      mutationAudits: [],
      mutationBatchAudit: { status: 'partial' },
      stopRequested: true,
      verification: { status: 'not-run' },
    },
  );
  const failed = failExecutionSession(
    { id: 'execution-1' },
    {
      at: 'end',
      changedFiles: [],
      error: 'command failed',
      mutationAudits: [],
      mutationBatchAudit: { status: 'partial' },
      stopRequested: false,
      verification: { status: 'failed' },
    },
  );

  assert.equal(stopped.status, 'stopped');
  assert.deepEqual(stopped.blockedReasons, []);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.blockedReasons, ['command failed']);
});
