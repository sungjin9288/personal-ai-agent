import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createReleaseCommandOrchestrator } from '../src/core/release-command-orchestrator.mjs';

function createFixture({
  refreshError = null,
  refreshPreflight = {
    action: 'current-surface',
    allowed: true,
    summary: 'current surface refresh is ready',
  },
  refreshResult = { ok: true, surface: 'current' },
  snapshotError = null,
  snapshotPreflight = {
    action: 'snapshot',
    allowed: true,
    summary: 'snapshot is ready',
  },
  snapshotResult = {
    archiveResult: { verifiedCommit: '1234567890abcdef' },
    status: { snapshot: 'ready' },
  },
} = {}) {
  const state = {
    actions: [],
    archiveCount: 0,
    providerPreflightCalls: [],
    refreshCalls: [],
    runtimeJobs: [],
    statusCount: 0,
  };
  const releaseStatus = { artifactState: 'fixture-current' };

  const orchestrator = createReleaseCommandOrchestrator({
    archiveSnapshot() {
      state.archiveCount += 1;
      if (snapshotError) {
        throw snapshotError;
      }
      return snapshotResult;
    },
    buildRefreshPreflight(args) {
      state.refreshPreflightArgs = args;
      return refreshPreflight;
    },
    buildSnapshotPreflight() {
      state.snapshotPreflightCount = (state.snapshotPreflightCount || 0) + 1;
      return snapshotPreflight;
    },
    buildStatus() {
      state.statusCount += 1;
      return releaseStatus;
    },
    recordAction(action) {
      state.actions.push(action);
    },
    refreshArtifacts(args) {
      state.refreshCalls.push(args);
      if (refreshError) {
        throw refreshError;
      }
      return refreshResult;
    },
    runProviderPreflight(provider) {
      state.providerPreflightCalls.push(provider);
      return {
        missingEnvCount: provider === 'all' ? 4 : 1,
        provider,
        status: 'ready-but-missing-env',
      };
    },
    runtimeJobRunner: {
      run(job) {
        state.runtimeJobs.push(job);
        return {
          job: { id: `runtime-job-${state.runtimeJobs.length}` },
          result: job.task(),
        };
      },
    },
  });

  return {
    orchestrator,
    releaseStatus,
    state,
  };
}

test('current surface refresh stops before execution until rewrite confirmation is present', () => {
  const { orchestrator, releaseStatus, state } = createFixture();

  const command = orchestrator.refresh({ requestId: 'request-current-refresh' });

  assert.deepEqual(command, {
    error: 'refresh-confirmation-required',
    message: 'current surface evidence/closeout/handoff 재생성은 명시적 확인이 필요합니다.',
    ok: false,
    preflight: {
      action: 'current-surface',
      allowed: true,
      summary: 'current surface refresh is ready',
    },
    releaseStatus,
  });
  assert.equal(state.runtimeJobs.length, 0);
  assert.equal(state.refreshCalls.length, 0);
  assert.deepEqual(state.actions[0], {
    action: 'refresh',
    details: {
      args: [],
      confirmField: 'confirmCurrentSurfaceRewrite',
      preflight: command.preflight,
    },
    outcome: 'confirmation-required',
    provider: '',
    scope: 'current-surface',
    summary: command.message,
  });
});

test('blocked live refresh records the provider decision without starting a runtime job', () => {
  const args = ['--live-openai'];
  const { orchestrator, state } = createFixture({
    refreshPreflight: {
      action: 'live-openai',
      allowed: false,
      provider: 'openai',
      summary: 'openai live validation is blocked',
    },
  });

  const command = orchestrator.refresh({
    args,
    confirmLiveValidation: true,
    requestId: 'request-live-blocked',
  });

  assert.equal(command.ok, false);
  assert.equal(command.error, 'refresh-not-allowed');
  assert.equal(state.runtimeJobs.length, 0);
  assert.deepEqual(state.actions[0], {
    action: 'refresh',
    details: { args, preflight: command.preflight },
    outcome: 'blocked',
    provider: 'openai',
    scope: 'live-validation',
    summary: 'openai live validation is blocked',
  });
});

test('confirmed live refresh links the runtime job, command result, and completed audit', () => {
  const args = ['--live-openai'];
  const refreshResult = { generatedAt: '2026-07-14T00:00:00.000Z', ok: true };
  const preflight = {
    action: 'live-openai',
    allowed: true,
    provider: 'openai',
    summary: 'openai live validation is ready',
  };
  const { orchestrator, state } = createFixture({ refreshPreflight: preflight, refreshResult });

  const command = orchestrator.refresh({
    args,
    confirmLiveValidation: true,
    requestId: 'request-live-refresh',
  });

  assert.deepEqual(command, {
    ok: true,
    result: refreshResult,
    runtimeJobId: 'runtime-job-1',
  });
  assert.deepEqual(state.refreshCalls, [args]);
  assert.equal(state.runtimeJobs[0].jobKind, 'execution-v1-refresh');
  assert.equal(state.runtimeJobs[0].requestId, 'request-live-refresh');
  assert.equal(state.runtimeJobs[0].scope, 'live-validation');
  assert.deepEqual(state.runtimeJobs[0].details, {
    args,
    preflight,
    provider: 'openai',
  });
  assert.deepEqual(state.actions[0], {
    action: 'refresh',
    details: {
      args,
      runtimeJobId: 'runtime-job-1',
      preflight,
    },
    outcome: 'completed',
    provider: 'openai',
    scope: 'live-validation',
    summary: 'openai live validation과 current surface 재생성을 완료했습니다.',
  });
});

test('failed refresh records the error and rethrows the original failure', () => {
  const failure = new Error('closeout refresh failed');
  const { orchestrator, state } = createFixture({ refreshError: failure });

  assert.throws(
    () => orchestrator.refresh({
      confirmCurrentSurfaceRewrite: true,
      requestId: 'request-refresh-failed',
    }),
    (error) => error === failure,
  );

  assert.equal(state.runtimeJobs[0].requestId, 'request-refresh-failed');
  assert.deepEqual(state.actions[0], {
    action: 'refresh',
    details: {
      args: [],
      error: 'closeout refresh failed',
      preflight: {
        action: 'current-surface',
        allowed: true,
        summary: 'current surface refresh is ready',
      },
    },
    outcome: 'failed',
    provider: '',
    scope: 'current-surface',
    summary: 'closeout refresh failed',
  });
});

test('refresh, provider, and snapshot preflights keep their audit records beside the command', () => {
  const { orchestrator, releaseStatus, state } = createFixture();

  assert.deepEqual(orchestrator.inspectRefresh(), {
    preflight: {
      action: 'current-surface',
      allowed: true,
      summary: 'current surface refresh is ready',
    },
    releaseStatus,
  });
  assert.deepEqual(orchestrator.preflightProvider(' all '), {
    missingEnvCount: 4,
    provider: 'all',
    status: 'ready-but-missing-env',
  });
  assert.deepEqual(orchestrator.inspectSnapshot(), {
    preflight: {
      action: 'snapshot',
      allowed: true,
      summary: 'snapshot is ready',
    },
    releaseStatus,
  });

  assert.deepEqual(state.providerPreflightCalls, ['all']);
  assert.deepEqual(
    state.actions.map(({ action, outcome, scope }) => ({ action, outcome, scope })),
    [
      { action: 'refresh-preflight', outcome: 'allowed', scope: 'current-surface' },
      { action: 'aggregate-provider-preflight', outcome: 'ready-but-missing-env', scope: 'provider-readiness' },
      { action: 'snapshot-preflight', outcome: 'allowed', scope: 'snapshot' },
    ],
  );
  assert.equal(
    state.actions[1].summary,
    'all provider preflight ready-but-missing-env · missing env 4',
  );
});

test('snapshot stops at eligibility and confirmation gates before archive execution', () => {
  const blockedFixture = createFixture({
    snapshotPreflight: {
      action: 'snapshot',
      allowed: false,
      summary: 'current artifacts are stale',
    },
  });
  const blocked = blockedFixture.orchestrator.snapshot({ confirmSnapshotFreeze: true });

  assert.equal(blocked.error, 'snapshot-not-ready');
  assert.equal(blocked.preflight.summary, 'current artifacts are stale');
  assert.equal(blockedFixture.state.archiveCount, 0);
  assert.equal(blockedFixture.state.actions[0].outcome, 'blocked');

  const confirmationFixture = createFixture();
  const confirmation = confirmationFixture.orchestrator.snapshot();

  assert.equal(confirmation.error, 'snapshot-confirmation-required');
  assert.equal(confirmationFixture.state.archiveCount, 0);
  assert.equal(confirmationFixture.state.actions[0].outcome, 'confirmation-required');
  assert.equal(confirmationFixture.state.actions[0].details.confirmField, 'confirmSnapshotFreeze');
});

test('confirmed snapshot links the archive result to its runtime job and audit', () => {
  const { orchestrator, state } = createFixture();

  const command = orchestrator.snapshot({
    confirmSnapshotFreeze: true,
    requestId: 'request-snapshot',
  });

  assert.equal(command.ok, true);
  assert.equal(command.runtimeJobId, 'runtime-job-1');
  assert.equal(state.archiveCount, 1);
  assert.equal(state.runtimeJobs[0].jobKind, 'execution-v1-snapshot');
  assert.equal(state.runtimeJobs[0].requestId, 'request-snapshot');
  assert.equal(state.runtimeJobs[0].scope, 'snapshot');
  assert.equal(state.actions[0].details.runtimeJobId, 'runtime-job-1');
  assert.equal(state.actions[0].details.archiveResult.verifiedCommit, '1234567890abcdef');
  assert.equal(state.actions[0].outcome, 'completed');
  assert.equal(state.actions[0].summary, 'release snapshot을 고정했습니다. (1234567)');
});

test('failed snapshot records the error and returns a stable command result', () => {
  const { orchestrator, releaseStatus, state } = createFixture({
    snapshotError: new Error('snapshot archive failed'),
  });

  const command = orchestrator.snapshot({
    confirmSnapshotFreeze: true,
    requestId: 'request-snapshot-failed',
  });

  assert.deepEqual(command, {
    error: 'snapshot-not-ready',
    message: 'snapshot archive failed',
    ok: false,
    releaseStatus,
  });
  assert.equal(state.runtimeJobs[0].requestId, 'request-snapshot-failed');
  assert.deepEqual(state.actions[0], {
    action: 'snapshot',
    details: {
      error: 'snapshot archive failed',
      preflight: {
        action: 'snapshot',
        allowed: true,
        summary: 'snapshot is ready',
      },
    },
    outcome: 'failed',
    scope: 'snapshot',
    summary: 'snapshot archive failed',
  });
});
