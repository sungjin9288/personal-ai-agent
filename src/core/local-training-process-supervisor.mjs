import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const LOCAL_TRAINING_PROCESS_SUPERVISOR_SCHEMA_VERSION =
  'personal-ai-agent-local-training-process-supervisor/v1';

const DEFAULT_AUTHORITY_POLL_MS = 25;
const DEFAULT_QUIESCENCE_POLL_MS = 20;
const DEFAULT_QUIESCENCE_TIMEOUT_MS = 2_000;
const FAILURE_CODES = Object.freeze([
  'authority-drift',
  'authority-expired',
  'authority-revoked',
  'authority-unavailable',
  'invalid-result',
  'process-exit',
  'process-start',
  'process-stdin',
  'quiescence-unconfirmed',
  'stderr-limit',
  'stdout-limit',
  'timeout',
]);

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
      `Local training process supervisor ${fieldName} must be a positive integer.`,
    );
  }
  return value;
}

function requireSha256(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(
      `Local training process supervisor ${fieldName} must be a sha256.`,
    );
  }
  return normalized;
}

function requireText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized || /[\r\n\0]/u.test(normalized)) {
    throw new Error(
      `Local training process supervisor ${fieldName} is required.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training process supervisor ${fieldName} must be a timestamp.`,
    );
  }
  return normalized;
}

function defaultProcessGroupState(processGroupId) {
  try {
    process.kill(-processGroupId, 0);
    return 'live';
  } catch (error) {
    return error?.code === 'ESRCH' ? 'absent' : 'unknown';
  }
}

function defaultSignalProcessGroup(processGroupId, signal) {
  process.kill(-processGroupId, signal);
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function createFailure(code, cleanupAuthorized, lifecycle = null) {
  const error = new Error(
    `Local training process supervisor failed: ${code}.`,
  );
  for (const [key, value] of Object.entries({
    failureCode: code,
    lifecycle,
    workspaceCleanupAuthorized: cleanupAuthorized,
  })) {
    Object.defineProperty(error, key, {
      configurable: false,
      enumerable: false,
      value,
      writable: false,
    });
  }
  return error;
}

function createAuthorityFailure(code) {
  const error = new Error(code);
  Object.defineProperty(error, 'authorityFailureCode', {
    configurable: false,
    enumerable: false,
    value: code,
    writable: false,
  });
  return error;
}

function buildLifecycle({
  authorityChecks,
  cleanupAuthorized,
  leaderCloseObserved,
  processGroupAbsenceConfirmed,
  terminationReason,
  terminationRequested,
}) {
  const record = {
    authorityChecks: {
      beforeResult: authorityChecks.beforeResult,
      beforeSpawn: authorityChecks.beforeSpawn,
      periodic: authorityChecks.periodic,
    },
    authorityMonitoring: 'before-spawn-periodic-before-result',
    cleanupAuthorized,
    leaderCloseObserved,
    processGroupAbsenceConfirmed,
    processGroupIsolation: 'detached-posix-process-group',
    schemaVersion: LOCAL_TRAINING_PROCESS_SUPERVISOR_SCHEMA_VERSION,
    signalPolicy: 'live-leader-sigkill',
    terminationReason,
    terminationRequested,
  };
  return {
    ...record,
    lifecycleHash: hashRecord(record),
  };
}

function assertAuthorityExpectation(value) {
  if (
    !hasExactKeys(value, [
      'approvalHash',
      'approvalId',
      'expiresAt',
      'permissionHash',
      'permissionId',
    ])
  ) {
    throw new Error(
      'Local training process supervisor authority expectation is invalid.',
    );
  }
  return {
    approvalHash: requireSha256(value.approvalHash, 'approvalHash'),
    approvalId: requireText(value.approvalId, 'approvalId'),
    expiresAt: requireTimestamp(value.expiresAt, 'expiresAt'),
    permissionHash: requireSha256(
      value.permissionHash,
      'permissionHash',
    ),
    permissionId: requireText(value.permissionId, 'permissionId'),
  };
}

function assertAuthoritySnapshot(snapshot, expected, now) {
  if (
    !hasExactKeys(snapshot, [
      'approvalHash',
      'approvalId',
      'permissionHash',
      'permissionId',
      'revocation',
    ])
  ) {
    throw createAuthorityFailure('authority-unavailable');
  }
  if (snapshot.revocation !== null) {
    throw createAuthorityFailure('authority-revoked');
  }
  if (
    snapshot.approvalHash !== expected.approvalHash ||
    snapshot.approvalId !== expected.approvalId ||
    snapshot.permissionHash !== expected.permissionHash ||
    snapshot.permissionId !== expected.permissionId
  ) {
    throw createAuthorityFailure('authority-drift');
  }
  const nowMs = Date.parse(now);
  if (
    !Number.isFinite(nowMs) ||
    nowMs >= Date.parse(expected.expiresAt)
  ) {
    throw createAuthorityFailure('authority-expired');
  }
}

async function waitForProcessGroupAbsence({
  monotonicNow,
  processGroupId,
  processGroupState,
  quiescencePollMs,
  quiescenceTimeoutMs,
}) {
  let startedAt;
  try {
    startedAt = monotonicNow();
  } catch {
    return false;
  }
  while (true) {
    let elapsed;
    let state;
    try {
      state = processGroupState(processGroupId);
      elapsed = monotonicNow() - startedAt;
    } catch {
      return false;
    }
    if (state === 'absent') {
      return true;
    }
    if (
      state === 'unknown' ||
      !Number.isFinite(elapsed) ||
      elapsed >= quiescenceTimeoutMs
    ) {
      return false;
    }
    await delay(quiescencePollMs);
  }
}

export function buildLocalTrainingProcessSupervisorContract() {
  const contract = {
    actualMlxProcessSpawned: false,
    actualModelTrainingExecuted: false,
    authorityCheckpoints: [
      'before-spawn',
      'periodic-while-running',
      'before-result-acceptance',
    ],
    cleanupGate: 'leader-close-and-process-group-absence',
    externalProviderCalls: 'none',
    failureCodes: [...FAILURE_CODES],
    processGroupIsolation: 'detached-posix-process-group',
    productionReadyClaim: false,
    schemaVersion: LOCAL_TRAINING_PROCESS_SUPERVISOR_SCHEMA_VERSION,
    signalPolicy: 'live-leader-sigkill',
    trainingAuthorized: false,
  };
  return {
    ...contract,
    contractHash: hashRecord(contract),
  };
}

export function assertLocalTrainingProcessSupervisorContract(value) {
  const { contractHash, ...contract } = value || {};
  const expected = buildLocalTrainingProcessSupervisorContract();
  if (
    !hasExactKeys(contract, Object.keys(expected).filter(
      (key) => key !== 'contractHash',
    )) ||
    contractHash !== hashRecord(contract) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training process supervisor contract failed: integrity.',
    );
  }
  return value;
}

export function assertLocalTrainingProcessSupervisorLifecycle(value) {
  const { lifecycleHash, ...record } = value || {};
  if (
    !hasExactKeys(record, [
      'authorityChecks',
      'authorityMonitoring',
      'cleanupAuthorized',
      'leaderCloseObserved',
      'processGroupAbsenceConfirmed',
      'processGroupIsolation',
      'schemaVersion',
      'signalPolicy',
      'terminationReason',
      'terminationRequested',
    ]) ||
    !hasExactKeys(record.authorityChecks, [
      'beforeResult',
      'beforeSpawn',
      'periodic',
    ]) ||
    Object.values(record.authorityChecks).some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    ) ||
    record.authorityChecks.beforeSpawn !== 1 ||
    record.authorityChecks.beforeResult > 1 ||
    lifecycleHash !== hashRecord(record) ||
    record.authorityMonitoring !==
      'before-spawn-periodic-before-result' ||
    record.cleanupAuthorized !== true ||
    record.leaderCloseObserved !== true ||
    record.processGroupAbsenceConfirmed !== true ||
    record.processGroupIsolation !==
      'detached-posix-process-group' ||
    record.schemaVersion !==
      LOCAL_TRAINING_PROCESS_SUPERVISOR_SCHEMA_VERSION ||
    record.signalPolicy !== 'live-leader-sigkill' ||
    !['none', ...FAILURE_CODES].includes(record.terminationReason) ||
    typeof record.terminationRequested !== 'boolean' ||
    (record.terminationReason === 'none' &&
      record.terminationRequested !== false)
  ) {
    throw new Error(
      'Local training process supervisor lifecycle failed: integrity-or-quiescence.',
    );
  }
  return value;
}

export function isLocalTrainingProcessCleanupAuthorized(error) {
  return error?.workspaceCleanupAuthorized === true;
}

export async function superviseLocalTrainingProcess({
  args = [],
  authorityPollMs = DEFAULT_AUTHORITY_POLL_MS,
  clock = () => new Date().toISOString(),
  command,
  cwd,
  environment = {},
  expectedAuthority,
  maxOutputBytes,
  monotonicNow = () => performance.now(),
  payload,
  platform = process.platform,
  processGroupState = defaultProcessGroupState,
  quiescencePollMs = DEFAULT_QUIESCENCE_POLL_MS,
  quiescenceTimeoutMs = DEFAULT_QUIESCENCE_TIMEOUT_MS,
  readCurrentAuthority,
  signalProcessGroup = defaultSignalProcessGroup,
  spawnProcess = nodeSpawn,
  timeoutMs,
} = {}) {
  if (platform === 'win32') {
    throw createFailure('process-start', true);
  }
  let executable;
  try {
    executable = requireText(command, 'command');
    if (
      !Array.isArray(args) ||
      args.some(
        (argument) =>
          typeof argument !== 'string' || argument.includes('\0'),
      ) ||
      !environment ||
      typeof environment !== 'object' ||
      Array.isArray(environment)
    ) {
      throw new Error('invalid launch input');
    }
  } catch {
    throw createFailure('process-start', true);
  }
  const expected = assertAuthorityExpectation(expectedAuthority);
  requirePositiveInteger(authorityPollMs, 'authorityPollMs');
  requirePositiveInteger(maxOutputBytes, 'maxOutputBytes');
  requirePositiveInteger(quiescencePollMs, 'quiescencePollMs');
  requirePositiveInteger(
    quiescenceTimeoutMs,
    'quiescenceTimeoutMs',
  );
  requirePositiveInteger(timeoutMs, 'timeoutMs');
  if (
    typeof readCurrentAuthority !== 'function' ||
    typeof spawnProcess !== 'function' ||
    typeof processGroupState !== 'function' ||
    typeof signalProcessGroup !== 'function'
  ) {
    throw createFailure('process-start', true);
  }

  const authorityChecks = {
    beforeResult: 0,
    beforeSpawn: 0,
    periodic: 0,
  };

  async function checkAuthority(stage) {
    authorityChecks[stage] += 1;
    let snapshot;
    try {
      snapshot = await readCurrentAuthority();
    } catch {
      throw createAuthorityFailure('authority-unavailable');
    }
    let now;
    try {
      now = clock();
    } catch {
      throw createAuthorityFailure('authority-unavailable');
    }
    assertAuthoritySnapshot(snapshot, expected, now);
  }

  try {
    await checkAuthority('beforeSpawn');
  } catch (error) {
    throw createFailure(
      error?.authorityFailureCode || 'authority-unavailable',
      true,
    );
  }

  return new Promise((resolve, reject) => {
    let authorityTimer;
    let child;
    let closeObserved = false;
    let executionTimer;
    let failureCode = '';
    let finalizing = false;
    let leaderExited = false;
    let periodicCheck = null;
    let processGroupId;
    let settled = false;
    let spawned = false;
    let stderrBytes = 0;
    let stdout = '';
    let terminationRequested = false;
    let terminationTimer;

    function clearTimers() {
      clearTimeout(authorityTimer);
      clearTimeout(executionTimer);
      clearTimeout(terminationTimer);
    }

    function settle(error, result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }

    function preserveWorkspace() {
      settle(
        createFailure(
          failureCode || 'quiescence-unconfirmed',
          false,
        ),
      );
    }

    function requestTermination(code) {
      if (!failureCode) {
        failureCode = code;
      }
      if (!spawned || terminationRequested) {
        return;
      }
      terminationRequested = true;
      terminationTimer = setTimeout(
        preserveWorkspace,
        quiescenceTimeoutMs,
      );
      terminationTimer.unref?.();
      if (leaderExited || closeObserved) {
        return;
      }
      try {
        signalProcessGroup(processGroupId, 'SIGKILL');
      } catch {
        // Close and group-absence checks decide whether cleanup is safe.
      }
    }

    function scheduleAuthorityCheck() {
      if (finalizing || failureCode || settled) {
        return;
      }
      authorityTimer = setTimeout(() => {
        periodicCheck = checkAuthority('periodic')
          .catch((error) => {
            requestTermination(
              error?.authorityFailureCode ||
                'authority-unavailable',
            );
          })
          .finally(() => {
            periodicCheck = null;
            scheduleAuthorityCheck();
          });
      }, authorityPollMs);
      authorityTimer.unref?.();
    }

    async function finalize(exitCode) {
      if (finalizing || settled) {
        return;
      }
      finalizing = true;
      clearTimeout(authorityTimer);
      clearTimeout(executionTimer);
      if (periodicCheck) {
        await periodicCheck;
      }
      if (!failureCode && exitCode !== 0) {
        failureCode = 'process-exit';
      }
      if (!failureCode) {
        try {
          await checkAuthority('beforeResult');
        } catch (error) {
          failureCode =
            error?.authorityFailureCode ||
            'authority-unavailable';
        }
      }
      const groupAbsent = await waitForProcessGroupAbsence({
        monotonicNow,
        processGroupId,
        processGroupState,
        quiescencePollMs,
        quiescenceTimeoutMs,
      });
      if (!groupAbsent) {
        settle(
          createFailure('quiescence-unconfirmed', false),
        );
        return;
      }
      let result;
      if (!failureCode) {
        try {
          result = JSON.parse(stdout);
        } catch {
          failureCode = 'invalid-result';
        }
      }
      const lifecycle = buildLifecycle({
        authorityChecks,
        cleanupAuthorized: true,
        leaderCloseObserved: closeObserved,
        processGroupAbsenceConfirmed: true,
        terminationReason: failureCode || 'none',
        terminationRequested,
      });
      assertLocalTrainingProcessSupervisorLifecycle(lifecycle);
      if (failureCode) {
        settle(createFailure(failureCode, true, lifecycle));
        return;
      }
      settle(null, { lifecycle, result });
    }

    try {
      child = spawnProcess(executable, args, {
        cwd,
        detached: true,
        env: environment,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      settle(createFailure('process-start', true));
      return;
    }

    child.once('spawn', () => {
      spawned = true;
      processGroupId = child.pid;
      if (
        !Number.isSafeInteger(processGroupId) ||
        processGroupId <= 0
      ) {
        settle(createFailure('process-start', false));
        return;
      }
      executionTimer = setTimeout(() => {
        requestTermination('timeout');
      }, timeoutMs);
      executionTimer.unref?.();
      scheduleAuthorityCheck();
      try {
        child.stdin.end(JSON.stringify(payload));
      } catch {
        requestTermination('process-stdin');
      }
    });
    child.on('error', () => {
      if (!spawned) {
        settle(createFailure('process-start', true));
        return;
      }
      requestTermination('process-start');
    });
    child.stdout.on('data', (chunk) => {
      const next = stdout + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > maxOutputBytes) {
        requestTermination('stdout-limit');
        return;
      }
      stdout = next;
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += Buffer.byteLength(chunk);
      if (stderrBytes > maxOutputBytes) {
        requestTermination('stderr-limit');
      }
    });
    child.on('exit', () => {
      leaderExited = true;
    });
    child.on('close', (exitCode) => {
      closeObserved = true;
      finalize(exitCode);
    });
    child.stdin.on('error', () => {
      requestTermination('process-stdin');
    });
  });
}
