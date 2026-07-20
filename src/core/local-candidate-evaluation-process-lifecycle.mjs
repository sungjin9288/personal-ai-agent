import { createHash } from 'node:crypto';

export const LOCAL_CANDIDATE_EVALUATION_PROCESS_LIFECYCLE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-process-lifecycle/v1';

const DEFAULT_QUIESCENCE_TIMEOUT_MS = 2_000;
const DEFAULT_QUIESCENCE_POLL_MS = 20;

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
}

function requirePositiveInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `Local candidate evaluation process lifecycle ${fieldName} must be a positive integer.`,
    );
  }
  return value;
}

function createRuntimeError(message, cleanupAuthorized) {
  const error = new Error(message);
  Object.defineProperty(error, 'workspaceCleanupAuthorized', {
    configurable: false,
    enumerable: false,
    value: cleanupAuthorized,
    writable: false,
  });
  return error;
}

function defaultProcessGroupState(processGroupId) {
  try {
    process.kill(-processGroupId, 0);
    return 'live';
  } catch (error) {
    return error?.code === 'ESRCH' ? 'absent' : 'unknown';
  }
}

function defaultSignalProcessGroup(
  processGroupId,
  signal,
) {
  process.kill(-processGroupId, signal);
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function waitForProcessGroupAbsence({
  processGroupId,
  processGroupState,
  quiescencePollMs,
  quiescenceTimeoutMs,
}) {
  const deadline = Date.now() + quiescenceTimeoutMs;
  while (true) {
    const state = processGroupState(processGroupId);
    if (state === 'absent') {
      return true;
    }
    if (state === 'unknown' || Date.now() >= deadline) {
      return false;
    }
    await delay(quiescencePollMs);
  }
}

function buildLifecycle({
  terminationRequested,
}) {
  const record = {
    cleanupAuthorized: true,
    leaderCloseObserved: true,
    processGroupAbsenceConfirmed: true,
    processGroupIsolation: 'detached-posix-process-group',
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_PROCESS_LIFECYCLE_SCHEMA_VERSION,
    signalPolicy: 'live-leader-sigkill',
    terminationRequested,
  };
  return {
    ...record,
    lifecycleHash: hashRecord(record),
  };
}

export function assertLocalCandidateEvaluationProcessLifecycle(
  lifecycle,
) {
  const { lifecycleHash, ...record } = lifecycle || {};
  if (
    !hasExactKeys(record, [
      'cleanupAuthorized',
      'leaderCloseObserved',
      'processGroupAbsenceConfirmed',
      'processGroupIsolation',
      'schemaVersion',
      'signalPolicy',
      'terminationRequested',
    ]) ||
    lifecycle?.lifecycleHash !== hashRecord(record) ||
    lifecycle.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_PROCESS_LIFECYCLE_SCHEMA_VERSION ||
    lifecycle.cleanupAuthorized !== true ||
    lifecycle.leaderCloseObserved !== true ||
    lifecycle.processGroupAbsenceConfirmed !== true ||
    lifecycle.processGroupIsolation !==
      'detached-posix-process-group' ||
    lifecycle.signalPolicy !== 'live-leader-sigkill' ||
    typeof lifecycle.terminationRequested !== 'boolean'
  ) {
    throw new Error(
      'Local candidate evaluation process lifecycle failed: integrity-or-quiescence.',
    );
  }
  return lifecycle;
}

export function isLocalCandidateEvaluationWorkspaceCleanupAuthorized(
  error,
) {
  return error?.workspaceCleanupAuthorized !== false;
}

export function runLocalCandidateEvaluationProcess({
  args,
  command,
  cwd,
  environment,
  maxOutputBytes,
  payload,
  platform = process.platform,
  processGroupState = defaultProcessGroupState,
  quiescencePollMs = DEFAULT_QUIESCENCE_POLL_MS,
  quiescenceTimeoutMs = DEFAULT_QUIESCENCE_TIMEOUT_MS,
  signalProcessGroup = defaultSignalProcessGroup,
  spawnProcess,
  timeoutMs,
}) {
  if (platform === 'win32') {
    throw new Error(
      'Local candidate evaluation process lifecycle requires POSIX process groups.',
    );
  }
  requirePositiveInteger(
    quiescencePollMs,
    'quiescencePollMs',
  );
  requirePositiveInteger(
    quiescenceTimeoutMs,
    'quiescenceTimeoutMs',
  );

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnProcess(command, args, {
        cwd,
        detached: true,
        env: environment,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }

    let closeObserved = false;
    let executionTimer;
    let failure;
    let finalizing = false;
    let leaderExited = false;
    let processGroupId;
    let spawned = false;
    let stderrBytes = 0;
    let stdout = '';
    let terminationTimer;
    let terminationRequested = false;

    function rememberFailure(message) {
      if (!failure) {
        failure = message;
      }
    }

    function clearTimers() {
      clearTimeout(executionTimer);
      clearTimeout(terminationTimer);
    }

    function rejectBeforeSpawn(message) {
      if (finalizing) {
        return;
      }
      finalizing = true;
      clearTimers();
      reject(createRuntimeError(message, true));
    }

    function preserveWorkspaceAfterTerminationDeadline() {
      if (finalizing) {
        return;
      }
      finalizing = true;
      clearTimers();
      reject(
        createRuntimeError(
          failure ||
            'Local candidate evaluation runtime failed: process-group-quiescence.',
          false,
        ),
      );
    }

    function startTerminationDeadline() {
      if (terminationTimer) {
        return;
      }
      terminationTimer = setTimeout(
        preserveWorkspaceAfterTerminationDeadline,
        quiescenceTimeoutMs,
      );
      terminationTimer.unref?.();
    }

    function requestTermination(message) {
      rememberFailure(message);
      if (!spawned || terminationRequested) {
        return;
      }
      terminationRequested = true;
      startTerminationDeadline();
      if (leaderExited || closeObserved) {
        return;
      }
      try {
        signalProcessGroup(processGroupId, 'SIGKILL');
      } catch {
        // The bounded deadline preserves the workspace if close never follows.
      }
    }

    async function finalize() {
      if (finalizing) {
        return;
      }
      finalizing = true;
      clearTimers();
      const groupAbsent =
        await waitForProcessGroupAbsence({
          processGroupId,
          processGroupState,
          quiescencePollMs,
          quiescenceTimeoutMs,
        });
      if (!groupAbsent) {
        reject(
          createRuntimeError(
            failure ||
              'Local candidate evaluation runtime failed: process-group-quiescence.',
            false,
          ),
        );
        return;
      }
      if (failure) {
        reject(createRuntimeError(failure, true));
        return;
      }
      let result;
      try {
        result = JSON.parse(stdout);
      } catch {
        reject(
          createRuntimeError(
            'Local candidate evaluation runtime command returned invalid JSON.',
            true,
          ),
        );
        return;
      }
      const processLifecycle = buildLifecycle({
        terminationRequested,
      });
      assertLocalCandidateEvaluationProcessLifecycle(
        processLifecycle,
      );
      resolve({
        processLifecycle,
        result,
      });
    }

    child.once('spawn', () => {
      spawned = true;
      processGroupId = child.pid;
      if (
        !Number.isSafeInteger(processGroupId) ||
        processGroupId <= 0
      ) {
        failure =
          'Local candidate evaluation runtime command failed to start.';
        preserveWorkspaceAfterTerminationDeadline();
        return;
      }
      executionTimer = setTimeout(() => {
        requestTermination(
          `Local candidate evaluation runtime command timed out after ${timeoutMs}ms.`,
        );
      }, timeoutMs);
      executionTimer.unref?.();
      child.stdin.end(JSON.stringify(payload));
    });
    child.on('error', (error) => {
      const message =
        error?.code === 'ENOENT'
          ? 'Local candidate evaluation runtime command not found.'
          : 'Local candidate evaluation runtime command failed to start.';
      if (!spawned) {
        rejectBeforeSpawn(message);
        return;
      }
      requestTermination(message);
    });
    child.stdout.on('data', (chunk) => {
      const next = stdout + String(chunk);
      if (
        Buffer.byteLength(next, 'utf8') >
        maxOutputBytes
      ) {
        requestTermination(
          `Local candidate evaluation runtime stdout exceeds ${maxOutputBytes} bytes.`,
        );
        return;
      }
      stdout = next;
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > maxOutputBytes) {
        requestTermination(
          `Local candidate evaluation runtime stderr exceeds ${maxOutputBytes} bytes.`,
        );
      }
    });
    child.on('exit', () => {
      leaderExited = true;
    });
    child.on('close', (exitCode) => {
      closeObserved = true;
      if (exitCode !== 0 && !failure) {
        rememberFailure(
          `Local candidate evaluation runtime command exited with code ${exitCode}.`,
        );
      }
      finalize();
    });
    child.stdin.on('error', () => {
      requestTermination(
        'Local candidate evaluation runtime command stdin failed.',
      );
    });
  });
}
