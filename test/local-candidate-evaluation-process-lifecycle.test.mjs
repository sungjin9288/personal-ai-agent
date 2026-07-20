import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalCandidateEvaluationProcessLifecycle,
  isLocalCandidateEvaluationWorkspaceCleanupAuthorized,
  runLocalCandidateEvaluationProcess,
} from '../src/core/local-candidate-evaluation-process-lifecycle.mjs';

const WORKER = path.resolve(
  'fixtures/local-candidate-evaluation-process-worker.mjs',
);

function createTemporaryDirectory(t) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'process-lifecycle-test-'),
  );
  t.after(() => {
    fs.rmSync(directory, {
      force: true,
      recursive: true,
    });
  });
  return directory;
}

function isProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

async function waitForFile(filePath) {
  const deadline = Date.now() + 2_000;
  while (!fs.existsSync(filePath)) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for child pid file.');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
}

async function waitForProcessExit(processId) {
  const deadline = Date.now() + 2_000;
  while (isProcessAlive(processId)) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for process exit.');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
}

function runWorker({
  args = [],
  maxOutputBytes = 1_024,
  mode,
  ...options
}) {
  return runLocalCandidateEvaluationProcess({
    args: [WORKER, '--mode', mode, ...args],
    command: process.execPath,
    cwd: process.cwd(),
    environment: {
      PATH: process.env.PATH,
    },
    maxOutputBytes,
    payload: {
      ok: true,
    },
    quiescencePollMs: 10,
    quiescenceTimeoutMs: 300,
    spawnProcess: spawn,
    timeoutMs: 1_000,
    ...options,
  });
}

test('successful evaluator closes and proves process-group quiescence', async () => {
  const execution = await runWorker({
    mode: 'success',
  });

  assert.deepEqual(execution.result, { ok: true });
  assert.equal(
    execution.processLifecycle.processGroupAbsenceConfirmed,
    true,
  );
  assert.equal(
    execution.processLifecycle.terminationRequested,
    false,
  );
  assertLocalCandidateEvaluationProcessLifecycle(
    execution.processLifecycle,
  );
  assert.equal(
    'pid' in execution.processLifecycle,
    false,
  );
});

test('timeout terminates the evaluator group and waits for its descendant', async (t) => {
  const temporaryDirectory = createTemporaryDirectory(t);
  const pidFile = path.join(
    temporaryDirectory,
    'descendant.pid',
  );
  const execution = runWorker({
    args: ['--pid-file', pidFile],
    mode: 'hang-with-descendant',
    timeoutMs: 500,
  });
  const rejected = assert.rejects(
    execution,
    /command timed out after 500ms/u,
  );
  await waitForFile(pidFile);
  const descendantPid = Number(
    fs.readFileSync(pidFile, 'utf8'),
  );

  await rejected;
  await waitForProcessExit(descendantPid);
});

for (const stream of ['stdout', 'stderr']) {
  test(`${stream} overflow closes the process group before rejecting`, async () => {
    await assert.rejects(
      runWorker({
        maxOutputBytes: 128,
        mode: `large-${stream}`,
      }),
      new RegExp(`${stream} exceeds 128 bytes`, 'u'),
    );
  });
}

test('leader exit with a live descendant denies cleanup authority and sends no late signal', async (t) => {
  const temporaryDirectory = createTemporaryDirectory(t);
  const pidFile = path.join(
    temporaryDirectory,
    'orphan.pid',
  );
  const signals = [];
  let descendantPid;
  try {
    await assert.rejects(
      runWorker({
        args: ['--pid-file', pidFile],
        mode: 'orphan-descendant',
        signalProcessGroup(processGroupId, signal) {
          signals.push({ processGroupId, signal });
        },
      }),
      (error) => {
        assert.equal(
          isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
            error,
          ),
          false,
        );
        return /process-group-quiescence/u.test(
          error.message,
        );
      },
    );
    await waitForFile(pidFile);
    descendantPid = Number(
      fs.readFileSync(pidFile, 'utf8'),
    );
    assert.deepEqual(signals, []);
    assert.equal(isProcessAlive(descendantPid), true);
  } finally {
    if (descendantPid && isProcessAlive(descendantPid)) {
      process.kill(descendantPid, 'SIGKILL');
    }
  }
});

test('leader exit before stdio close never signals a reused process group', async (t) => {
  const temporaryDirectory = createTemporaryDirectory(t);
  const pidFile = path.join(
    temporaryDirectory,
    'open-stdio-descendant.pid',
  );
  const signals = [];
  let descendantPid;
  try {
    await assert.rejects(
      runWorker({
        args: ['--pid-file', pidFile],
        mode: 'leader-exit-open-stdio',
        quiescenceTimeoutMs: 100,
        signalProcessGroup(processGroupId, signal) {
          signals.push({ processGroupId, signal });
        },
        timeoutMs: 500,
      }),
      (error) => {
        assert.equal(
          isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
            error,
          ),
          false,
        );
        return /timed out after 500ms/u.test(error.message);
      },
    );
    await waitForFile(pidFile);
    descendantPid = Number(
      fs.readFileSync(pidFile, 'utf8'),
    );
    assert.deepEqual(signals, []);
    assert.equal(isProcessAlive(descendantPid), true);
  } finally {
    if (descendantPid && isProcessAlive(descendantPid)) {
      process.kill(descendantPid, 'SIGKILL');
    }
  }
});

test('an ineffective group signal reaches a bounded fail-closed deadline', async (t) => {
  const temporaryDirectory = createTemporaryDirectory(t);
  const pidFile = path.join(
    temporaryDirectory,
    'ineffective-signal-descendant.pid',
  );
  let child;
  try {
    await assert.rejects(
      runWorker({
        args: ['--pid-file', pidFile],
        mode: 'hang-with-descendant',
        quiescenceTimeoutMs: 100,
        signalProcessGroup() {},
        spawnProcess(command, args, options) {
          child = spawn(command, args, options);
          return child;
        },
        timeoutMs: 500,
      }),
      (error) => {
        assert.equal(
          isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
            error,
          ),
          false,
        );
        return /timed out after 500ms/u.test(error.message);
      },
    );
  } finally {
    if (child?.pid && child.exitCode === null) {
      const closed = once(child, 'close');
      process.kill(-child.pid, 'SIGKILL');
      await closed;
    }
  }
});

test('missing executable preserves the command-not-found contract without an unhandled error', async () => {
  await assert.rejects(
    runLocalCandidateEvaluationProcess({
      args: [],
      command:
        '/definitely-missing/local-candidate-evaluator',
      cwd: process.cwd(),
      environment: {},
      maxOutputBytes: 128,
      payload: {},
      spawnProcess: spawn,
      timeoutMs: 500,
    }),
    /command not found/u,
  );
});

test('synchronous spawn adapter failures preserve their original error', async () => {
  await assert.rejects(
    runLocalCandidateEvaluationProcess({
      args: [],
      command: process.execPath,
      cwd: process.cwd(),
      environment: {},
      maxOutputBytes: 128,
      payload: {},
      spawnProcess() {
        throw new Error('fixture synchronous spawn failure');
      },
      timeoutMs: 500,
    }),
    (error) => {
      assert.match(
        error.message,
        /fixture synchronous spawn failure/u,
      );
      assert.equal(
        isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
          error,
        ),
        true,
      );
      return true;
    },
  );
});

test('unknown process-group state rejects cleanup even after a normal close', async () => {
  await assert.rejects(
    runWorker({
      mode: 'success',
      processGroupState() {
        return 'unknown';
      },
    }),
    (error) => {
      assert.equal(
        isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
          error,
        ),
        false,
      );
      return true;
    },
  );
});

test('process-group state failures reject cleanup instead of escaping finalization', async () => {
  await assert.rejects(
    runWorker({
      mode: 'success',
      processGroupState() {
        throw new Error('fixture group lookup failure');
      },
    }),
    (error) => {
      assert.equal(
        isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
          error,
        ),
        false,
      );
      return /process-group-quiescence/u.test(
        error.message,
      );
    },
  );
});

test('quiescence uses a monotonic deadline when the group stays live', async () => {
  const observations = [0, 1_000];
  await assert.rejects(
    runWorker({
      mode: 'success',
      monotonicNow() {
        return observations.shift() ?? 1_000;
      },
      processGroupState() {
        return 'live';
      },
      quiescenceTimeoutMs: 300,
    }),
    (error) => {
      assert.equal(
        isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
          error,
        ),
        false,
      );
      return /process-group-quiescence/u.test(
        error.message,
      );
    },
  );
});

test('pre-spawn platform refusal explicitly authorizes workspace cleanup', () => {
  assert.throws(
    () =>
      runLocalCandidateEvaluationProcess({
        args: [],
        command: process.execPath,
        cwd: process.cwd(),
        environment: {},
        maxOutputBytes: 128,
        payload: {},
        platform: 'win32',
        spawnProcess: spawn,
        timeoutMs: 500,
      }),
    (error) => {
      assert.equal(
        isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
          error,
        ),
        true,
      );
      return /requires POSIX process groups/u.test(
        error.message,
      );
    },
  );
});
