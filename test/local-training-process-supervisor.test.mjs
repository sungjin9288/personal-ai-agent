import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';

import {
  assertLocalTrainingProcessSupervisorContract,
  assertLocalTrainingProcessSupervisorLifecycle,
  buildLocalTrainingProcessSupervisorContract,
  isLocalTrainingProcessCleanupAuthorized,
  superviseLocalTrainingProcess,
} from '../src/core/local-training-process-supervisor.mjs';

const command = process.execPath;
const fixture = path.resolve(
  'fixtures/local-training-process-supervisor-command.mjs',
);
const lifecycleFixture = path.resolve(
  'fixtures/local-candidate-evaluation-process-worker.mjs',
);
const FIXTURE_COMPLETION_TIMEOUT_MS = 5_000;
const expectedAuthority = {
  approvalHash: createHash('sha256')
    .update('supervisor-approval')
    .digest('hex'),
  approvalId: 'local-training-approval-fixture',
  expiresAt: '2099-01-01T00:00:00.000Z',
  permissionHash: createHash('sha256')
    .update('supervisor-permission')
    .digest('hex'),
  permissionId: 'local-training-permission-fixture',
};

function authority(revocation = null) {
  return {
    approvalHash: expectedAuthority.approvalHash,
    approvalId: expectedAuthority.approvalId,
    permissionHash: expectedAuthority.permissionHash,
    permissionId: expectedAuthority.permissionId,
    revocation,
  };
}

function supervise(options = {}) {
  return superviseLocalTrainingProcess({
    args: [fixture, 'success'],
    authorityPollMs: 10,
    clock: () => '2026-07-22T00:00:00.000Z',
    command,
    cwd: process.cwd(),
    environment: {},
    expectedAuthority,
    maxOutputBytes: 1_024,
    payload: { fixture: true },
    quiescencePollMs: 5,
    quiescenceTimeoutMs: 1_000,
    readCurrentAuthority: () => authority(),
    timeoutMs: 1_000,
    ...options,
  });
}

function controlledProcess(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const child = new EventEmitter();
  child.pid = 42;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const started = once(child.stdin, 'finish');
  const signals = [];
  const execution = supervise({
    monotonicNow: () => Date.now(),
    processGroupState(processGroupId) {
      assert.equal(processGroupId, child.pid);
      return 'absent';
    },
    signalProcessGroup(processGroupId, signal) {
      signals.push({ processGroupId, signal });
    },
    spawnProcess() {
      queueMicrotask(() => child.emit('spawn'));
      return child;
    },
  });
  return { child, execution, signals, started };
}

function isProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function recordProcessGroupSignals(signals) {
  return (processGroupId, signal) => {
    signals.push({ processGroupId, signal });
    // An unexpectedly early timeout must not leave this test's fixture running.
    process.kill(-processGroupId, signal);
  };
}

async function waitForFile(filePath) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(filePath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('fixture descendant pid was not recorded');
}

test('local training process supervisor contract is deterministic and non-authorizing', () => {
  const contract = buildLocalTrainingProcessSupervisorContract();
  assert.deepEqual(
    buildLocalTrainingProcessSupervisorContract(),
    contract,
  );
  assert.equal(
    assertLocalTrainingProcessSupervisorContract(contract),
    contract,
  );
  assert.equal(contract.actualMlxProcessSpawned, false);
  assert.equal(contract.actualModelTrainingExecuted, false);
  assert.equal(contract.signalPolicy, 'live-leader-sigkill');
  assert.equal(contract.trainingAuthorized, false);
  assert.equal(contract.productionReadyClaim, false);
  assert.throws(
    () => assertLocalTrainingProcessSupervisorContract({
      ...contract,
      contractHash: '0'.repeat(64),
    }),
    /contract failed: integrity/,
  );
});

test('local training process supervisor accepts a fixture result only after current authority and group absence', async () => {
  const { lifecycle, result } = await supervise({ timeoutMs: FIXTURE_COMPLETION_TIMEOUT_MS });

  assert.deepEqual(result, { status: 'completed' });
  assert.equal(lifecycle.authorityChecks.beforeSpawn, 1);
  assert.equal(lifecycle.authorityChecks.beforeResult, 1);
  assert.equal(lifecycle.authorityChecks.periodic > 0, true);
  assert.equal(lifecycle.terminationRequested, false);
  assert.equal(lifecycle.terminationReason, 'none');
  assert.equal(lifecycle.cleanupAuthorized, true);
  assert.equal(
    assertLocalTrainingProcessSupervisorLifecycle(lifecycle),
    lifecycle,
  );
});

test('local training process supervisor terminates the process group after mid-run revocation', async () => {
  let reads = 0;
  await assert.rejects(
    supervise({
      args: [fixture, 'hang'],
      readCurrentAuthority() {
        reads += 1;
        return authority(reads > 1 ? { status: 'revoked' } : null);
      },
    }),
    (error) => {
      assert.equal(error.failureCode, 'authority-revoked');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      assert.equal(error.lifecycle.terminationRequested, true);
      assert.equal(
        error.lifecycle.processGroupAbsenceConfirmed,
        true,
      );
      assert.equal(error.lifecycle.authorityChecks.periodic > 0, true);
      return true;
    },
  );
});

test('local training process supervisor refuses authority drift before spawn', async () => {
  let spawnCalled = false;
  await assert.rejects(
    supervise({
      readCurrentAuthority: () => ({
        ...authority(),
        permissionId: 'stale-permission',
      }),
      spawnProcess() {
        spawnCalled = true;
      },
    }),
    (error) => {
      assert.equal(error.failureCode, 'authority-drift');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      return true;
    },
  );
  assert.equal(spawnCalled, false);
});

test('local training process supervisor rejects invalid launch input before authority lookup', async () => {
  let authorityRead = false;
  await assert.rejects(
    supervise({
      args: ['unsafe\0argument'],
      readCurrentAuthority() {
        authorityRead = true;
        return authority();
      },
    }),
    (error) => {
      assert.equal(error.failureCode, 'process-start');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      return true;
    },
  );
  assert.equal(authorityRead, false);
});

test('local training process supervisor kills a timed-out group and keeps raw stderr out of errors', async () => {
  const signals = [];
  await assert.rejects(
    supervise({
      args: [fixture, 'hang'],
      signalProcessGroup: recordProcessGroupSignals(signals),
      timeoutMs: 40,
    }),
    (error) => {
      assert.equal(error.failureCode, 'timeout');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      assert.equal(error.message.includes(command), false);
      assert.equal(error.message.includes(fixture), false);
      return true;
    },
  );
  assert.equal(signals.length, 1);
  assert.equal(signals[0].signal, 'SIGKILL');
});

test('local training process supervisor preserves the workspace without a late group signal', async (t) => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'training-supervisor-'),
  );
  const pidFile = path.join(temporaryDirectory, 'descendant.pid');
  const signals = [];
  let descendantPid;
  t.after(() => {
    if (!descendantPid && fs.existsSync(pidFile)) {
      descendantPid = Number(fs.readFileSync(pidFile, 'utf8'));
      assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 0, 'invalid fixture descendant pid');
    }
    if (descendantPid && isProcessAlive(descendantPid)) {
      process.kill(descendantPid, 'SIGKILL');
    }
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  });

  await assert.rejects(
    supervise({
      args: [
        lifecycleFixture,
        '--mode',
        'leader-exit-open-stdio',
        '--pid-file',
        pidFile,
      ],
      quiescenceTimeoutMs: 100,
      signalProcessGroup: recordProcessGroupSignals(signals),
      timeoutMs: FIXTURE_COMPLETION_TIMEOUT_MS,
    }),
    (error) => {
      assert.equal(error.failureCode, 'timeout');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), false);
      return true;
    },
  );
  await waitForFile(pidFile);
  descendantPid = Number(fs.readFileSync(pidFile, 'utf8'));
  assert.deepEqual(signals, []);
  assert.equal(isProcessAlive(descendantPid), true);
});

test('local training process supervisor rejects invalid output before the deadline without terminating', async (t) => {
  const { child, execution, signals, started } = controlledProcess(t);
  const rejected = assert.rejects(execution, (error) => {
    assert.equal(error.failureCode, 'invalid-result');
    assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
    assert.equal(error.lifecycle.authorityChecks.beforeResult, 1);
    assert.equal(error.lifecycle.processGroupAbsenceConfirmed, true);
    assert.equal(error.lifecycle.terminationRequested, false);
    assert.equal(error.lifecycle.terminationReason, 'invalid-result');
    return true;
  });

  await started;
  t.mock.timers.tick(999);
  child.stdout.write('not-json');
  child.emit('exit', 0, null);
  child.emit('close', 0, null);
  await rejected;
  t.mock.timers.tick(1);
  assert.deepEqual(signals, []);
});

for (const [kind, output] of [
  ['invalid', 'not-json'],
  ['valid', '{"status":"completed"}\n'],
]) {
  test(`local training process supervisor preserves timeout over late ${kind} output`, async (t) => {
    const { child, execution, signals, started } = controlledProcess(t);
    const rejected = assert.rejects(execution, (error) => {
      assert.equal(error.failureCode, 'timeout');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      assert.equal(error.lifecycle.authorityChecks.beforeResult, 0);
      assert.equal(error.lifecycle.processGroupAbsenceConfirmed, true);
      assert.equal(error.lifecycle.terminationRequested, true);
      assert.equal(error.lifecycle.terminationReason, 'timeout');
      return true;
    });

    await started;
    t.mock.timers.tick(999);
    assert.deepEqual(signals, []);
    t.mock.timers.tick(1);
    assert.deepEqual(signals, [{ processGroupId: child.pid, signal: 'SIGKILL' }]);
    child.stdout.write(output);
    child.emit('exit', 0, null);
    child.emit('close', 0, null);
    await rejected;
    assert.deepEqual(signals, [{ processGroupId: child.pid, signal: 'SIGKILL' }]);
  });
}

test('local training process supervisor rejects invalid output after safe quiescence', async () => {
  await assert.rejects(
    supervise({
      args: [fixture, 'invalid-result'],
      // This integration checks parsing; exact deadline precedence is tested above.
      timeoutMs: FIXTURE_COMPLETION_TIMEOUT_MS,
    }),
    (error) => {
      assert.equal(error.failureCode, 'invalid-result');
      assert.equal(isLocalTrainingProcessCleanupAuthorized(error), true);
      assert.equal(error.lifecycle.processGroupAbsenceConfirmed, true);
      return true;
    },
  );
});
