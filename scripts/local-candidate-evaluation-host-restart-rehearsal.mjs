import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalCandidateEvaluationHostBootIdentity,
  readLocalCandidateEvaluationHostBootIdentity,
} from '../src/core/local-candidate-evaluation-host-boot-identity.mjs';
import {
  createLocalCandidateEvaluationWorkspace,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_RECOVERY_SCHEMA_VERSION,
  recoverStaleLocalCandidateEvaluationWorkspaces,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';

export const LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_REHEARSAL_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-restart-rehearsal/v1';
export const LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_RESULT_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-restart-result/v1';
const RESUME_INTENT_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-host-restart-resume-intent/v1';

const REHEARSAL_DIRECTORY =
  'local-candidate-evaluation/host-restart-rehearsals';
const REHEARSAL_ID_PATTERN = /^[a-f0-9]{24}$/u;
const WORKSPACE_NAME_PATTERN = /^workspace-[A-Za-z0-9]{6}$/u;
const SESSION_FILE = 'session.json';
const RESULT_FILE = 'result.json';
const RESULT_PENDING_FILE = '.result.pending.json';
const RESUME_INTENT_FILE = 'resume-intent.json';
const WORKSPACE_ROOT_DIRECTORY = 'workspace-root';
const FIXTURE_FILE = 'rehearsal-fixture.json';
const LEASE_FILE = '.workspace-lease.json';
const NAMESPACE_FILE = '.namespace.json';
const MAX_PRIVATE_RECORD_BYTES = 4 * 1024;
const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1_000;

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
    Object.keys(value).every((key) =>
      expectedKeys.includes(key)),
  );
}

function currentUserId(value) {
  const userId =
    value ??
    (typeof process.getuid === 'function'
      ? process.getuid()
      : null);
  if (!Number.isSafeInteger(userId) || userId < 0) {
    throw new Error(
      'Host restart rehearsal requires a current user id.',
    );
  }
  return userId;
}

function requireTimestamp(value, fieldName) {
  const timestamp = String(value || '').trim();
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error(
      `Host restart rehearsal ${fieldName} must be a timestamp.`,
    );
  }
  return timestamp;
}

function ownerOnly(stat) {
  return (stat.mode & 0o077) === 0;
}

function assertRegularDirectory({
  directory,
  exactCanonicalPath = true,
  fileSystem,
  ownerUserId,
  requireOwnerOnly = false,
}) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(directory);
    canonical = fileSystem.realpathSync(directory);
  } catch {
    throw new Error(
      'Host restart rehearsal directory is missing.',
    );
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== ownerUserId ||
    (exactCanonicalPath &&
      path.resolve(directory) !== canonical) ||
    (requireOwnerOnly && !ownerOnly(stat))
  ) {
    throw new Error(
      'Host restart rehearsal directory is unsafe.',
    );
  }
  return canonical;
}

function hardenOwnerOnlyDirectory({
  directory,
  fileSystem,
  ownerUserId,
}) {
  const canonical = assertRegularDirectory({
    directory,
    fileSystem,
    ownerUserId,
  });
  const before = fileSystem.lstatSync(directory);
  const noFollow = fs.constants.O_NOFOLLOW;
  const directoryOnly = fs.constants.O_DIRECTORY;
  if (
    !Number.isInteger(noFollow) ||
    !Number.isInteger(directoryOnly)
  ) {
    throw new Error(
      'Host restart rehearsal requires no-follow directory access.',
    );
  }
  const descriptor = fileSystem.openSync(
    directory,
    fs.constants.O_RDONLY |
      noFollow |
      directoryOnly,
  );
  try {
    const opened = fileSystem.fstatSync(descriptor);
    if (
      !opened.isDirectory() ||
      opened.uid !== ownerUserId ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino
    ) {
      throw new Error(
        'Host restart rehearsal directory changed before hardening.',
      );
    }
    fileSystem.fchmodSync(descriptor, 0o700);
    fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
  assertRegularDirectory({
    directory: canonical,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  return canonical;
}

function ensureDirectory({
  directory,
  fileSystem,
  mode,
  ownerUserId,
  requireOwnerOnly = false,
}) {
  try {
    fileSystem.mkdirSync(directory, {
      mode,
      recursive: false,
    });
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw error;
    }
  }
  if (requireOwnerOnly) {
    return hardenOwnerOnlyDirectory({
      directory,
      fileSystem,
      ownerUserId,
    });
  }
  return assertRegularDirectory({
    directory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly,
  });
}

function resolveRehearsalBase({
  fileSystem,
  ownerUserId,
  repoDir,
}) {
  const requestedRepo = path.resolve(repoDir);
  const canonicalRepo = assertRegularDirectory({
    directory: requestedRepo,
    exactCanonicalPath: false,
    fileSystem,
    ownerUserId,
  });
  const varDirectory = path.join(canonicalRepo, 'var');
  ensureDirectory({
    directory: varDirectory,
    fileSystem,
    mode: 0o700,
    ownerUserId,
  });
  const localCandidateDirectory = path.join(
    varDirectory,
    'local-candidate-evaluation',
  );
  ensureDirectory({
    directory: localCandidateDirectory,
    fileSystem,
    mode: 0o700,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const rehearsalBase = path.join(
    canonicalRepo,
    'var',
    REHEARSAL_DIRECTORY,
  );
  ensureDirectory({
    directory: rehearsalBase,
    fileSystem,
    mode: 0o700,
    ownerUserId,
    requireOwnerOnly: true,
  });
  return rehearsalBase;
}

function createRehearsalDirectory({
  fileSystem,
  ownerUserId,
  rehearsalBase,
  randomId,
}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rehearsalId = randomId();
    if (!REHEARSAL_ID_PATTERN.test(rehearsalId)) {
      throw new Error(
        'Host restart rehearsal id source is invalid.',
      );
    }
    const rehearsalDirectory = path.join(
      rehearsalBase,
      rehearsalId,
    );
    try {
      fileSystem.mkdirSync(rehearsalDirectory, {
        mode: 0o700,
      });
      hardenOwnerOnlyDirectory({
        directory: rehearsalDirectory,
        fileSystem,
        ownerUserId,
      });
      return {
        rehearsalDirectory,
        rehearsalId,
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  throw new Error(
    'Host restart rehearsal could not allocate an id.',
  );
}

function assertPrivateFile({
  filePath,
  fileSystem,
  ownerUserId,
}) {
  let stat;
  try {
    stat = fileSystem.lstatSync(filePath);
  } catch {
    throw new Error(
      'Host restart rehearsal private record is missing.',
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.uid !== ownerUserId ||
    !ownerOnly(stat) ||
    stat.size <= 0 ||
    stat.size > MAX_PRIVATE_RECORD_BYTES
  ) {
    throw new Error(
      'Host restart rehearsal private record is unsafe.',
    );
  }
}

function isSafeInterruptedPrivateFile({
  filePath,
  fileSystem,
  ownerUserId,
}) {
  try {
    const stat = fileSystem.lstatSync(filePath);
    return (
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.uid === ownerUserId &&
      ownerOnly(stat) &&
      stat.size <= MAX_PRIVATE_RECORD_BYTES
    );
  } catch {
    return false;
  }
}

function writePrivateJson({
  filePath,
  fileSystem,
  value,
}) {
  const descriptor = fileSystem.openSync(
    filePath,
    'wx',
    0o600,
  );
  try {
    fileSystem.writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
    );
    fileSystem.fchmodSync(descriptor, 0o600);
    fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
  syncDirectory({
    directory: path.dirname(filePath),
    fileSystem,
  });
}

function syncDirectory({
  directory,
  fileSystem,
}) {
  const directoryDescriptor = fileSystem.openSync(
    directory,
    'r',
  );
  try {
    fileSystem.fsyncSync(directoryDescriptor);
  } finally {
    fileSystem.closeSync(directoryDescriptor);
  }
}

function writePrivateJsonAtomically({
  fileSystem,
  pendingPath,
  targetPath,
  value,
}) {
  writePrivateJson({
    filePath: pendingPath,
    fileSystem,
    value,
  });
  fileSystem.renameSync(pendingPath, targetPath);
  syncDirectory({
    directory: path.dirname(targetPath),
    fileSystem,
  });
}

function readPrivateJson({
  filePath,
  fileSystem,
  ownerUserId,
}) {
  assertPrivateFile({
    filePath,
    fileSystem,
    ownerUserId,
  });
  try {
    return JSON.parse(
      fileSystem.readFileSync(filePath, 'utf8'),
    );
  } catch {
    throw new Error(
      'Host restart rehearsal private record is malformed.',
    );
  }
}

function buildSession({
  lease,
  observationSource,
  preparedAt,
  rehearsalId,
  workspaceName,
}) {
  const content = {
    leaseExpiresAt: lease.leaseExpiresAt,
    leaseId: lease.leaseId,
    observationSource,
    preparedAt,
    preparedBootIdentityHash:
      lease.ownerBootIdentityHash,
    rehearsalId,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_REHEARSAL_SCHEMA_VERSION,
    status: 'prepared',
    workspaceName,
  };
  return {
    ...content,
    sessionHash: hashRecord(content),
  };
}

function assertSession(session, rehearsalId) {
  const contentKeys = [
    'leaseExpiresAt',
    'leaseId',
    'observationSource',
    'preparedAt',
    'preparedBootIdentityHash',
    'rehearsalId',
    'schemaVersion',
    'status',
    'workspaceName',
  ];
  if (
    !hasExactKeys(session, [
      ...contentKeys,
      'sessionHash',
    ]) ||
    session.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_REHEARSAL_SCHEMA_VERSION ||
    session.rehearsalId !== rehearsalId ||
    session.status !== 'prepared' ||
    ![
      'host-kernel-reader',
      'injected-fixture',
    ].includes(session.observationSource) ||
    !/^local-candidate-evaluation-workspace-lease-[a-f0-9]{64}$/u.test(
      session.leaseId,
    ) ||
    !/^[a-f0-9]{64}$/u.test(
      session.preparedBootIdentityHash,
    ) ||
    !WORKSPACE_NAME_PATTERN.test(
      session.workspaceName,
    ) ||
    hashRecord(
      Object.fromEntries(
        contentKeys.map((key) => [
          key,
          session[key],
        ]),
      ),
    ) !== session.sessionHash
  ) {
    throw new Error(
      'Host restart rehearsal session failed: integrity.',
    );
  }
  requireTimestamp(session.preparedAt, 'preparedAt');
  requireTimestamp(
    session.leaseExpiresAt,
    'leaseExpiresAt',
  );
  return session;
}

function assertRehearsalWorkspace({
  fileSystem,
  ownerUserId,
  rehearsalDirectory,
  session,
}) {
  const temporaryDirectory = path.join(
    rehearsalDirectory,
    WORKSPACE_ROOT_DIRECTORY,
  );
  assertRegularDirectory({
    directory: temporaryDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const namespaceDirectory = path.join(
    temporaryDirectory,
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );
  assertRegularDirectory({
    directory: namespaceDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const namespaceEntries = fileSystem
    .readdirSync(namespaceDirectory)
    .sort();
  if (
    JSON.stringify(namespaceEntries) !==
    JSON.stringify([
      NAMESPACE_FILE,
      session.workspaceName,
    ].sort())
  ) {
    throw new Error(
      'Host restart rehearsal workspace failed: exact-scope.',
    );
  }
  const workspaceDirectory = path.join(
    namespaceDirectory,
    session.workspaceName,
  );
  assertRegularDirectory({
    directory: workspaceDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const workspaceEntries = fileSystem
    .readdirSync(workspaceDirectory)
    .sort();
  if (
    JSON.stringify(workspaceEntries) !==
    JSON.stringify([
      FIXTURE_FILE,
      LEASE_FILE,
    ].sort())
  ) {
    throw new Error(
      'Host restart rehearsal workspace failed: exact-scope.',
    );
  }
  const fixture = readPrivateJson({
    filePath: path.join(
      workspaceDirectory,
      FIXTURE_FILE,
    ),
    fileSystem,
    ownerUserId,
  });
  if (
    !hasExactKeys(fixture, [
      'purpose',
      'rehearsalId',
    ]) ||
    fixture.purpose !==
      'host-restart-workspace-recovery-rehearsal' ||
    fixture.rehearsalId !== session.rehearsalId
  ) {
    throw new Error(
      'Host restart rehearsal fixture failed: integrity.',
    );
  }
  const lease = readPrivateJson({
    filePath: path.join(
      workspaceDirectory,
      LEASE_FILE,
    ),
    fileSystem,
    ownerUserId,
  });
  if (
    lease.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION ||
    lease.leaseId !== session.leaseId ||
    lease.leaseExpiresAt !==
      session.leaseExpiresAt ||
    lease.ownerBootIdentityHash !==
      session.preparedBootIdentityHash ||
    lease.phase !== 'spawning'
  ) {
    throw new Error(
      'Host restart rehearsal lease failed: binding.',
    );
  }
  return temporaryDirectory;
}

function inspectRehearsalWorkspace({
  fileSystem,
  ownerUserId,
  rehearsalDirectory,
  session,
}) {
  const temporaryDirectory = path.join(
    rehearsalDirectory,
    WORKSPACE_ROOT_DIRECTORY,
  );
  assertRegularDirectory({
    directory: temporaryDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const namespaceDirectory = path.join(
    temporaryDirectory,
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );
  assertRegularDirectory({
    directory: namespaceDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const entries = fileSystem
    .readdirSync(namespaceDirectory)
    .sort();
  if (
    JSON.stringify(entries) ===
    JSON.stringify([NAMESPACE_FILE])
  ) {
    return {
      temporaryDirectory,
      workspacePresent: false,
    };
  }
  assertRehearsalWorkspace({
    fileSystem,
    ownerUserId,
    rehearsalDirectory,
    session,
  });
  return {
    temporaryDirectory,
    workspacePresent: true,
  };
}

function buildExpectedRecovery(session, scannedAt) {
  const content = {
    bootIdentityAvailable: true,
    recoveredLeaseIds: [session.leaseId],
    recoveredPriorBootSpawningLeaseIds: [
      session.leaseId,
    ],
    scannedAt,
    scannedWorkspaceCount: 1,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_WORKSPACE_RECOVERY_SCHEMA_VERSION,
    skippedActiveWorkspaceCount: 0,
    skippedUnsafeWorkspaceCount: 0,
  };
  return {
    ...content,
    recoveryHash: hashRecord(content),
  };
}

function buildResumeIntent({
  actualObservationEligible,
  currentBootIdentityHash,
  expectedRecovery,
  resumedAt,
  session,
}) {
  const content = {
    actualObservationEligible,
    currentBootIdentityHash,
    expectedRecoveryHash:
      expectedRecovery.recoveryHash,
    rehearsalId: session.rehearsalId,
    resumedAt,
    schemaVersion: RESUME_INTENT_SCHEMA_VERSION,
    sessionHash: session.sessionHash,
    status: 'recovering',
  };
  return {
    ...content,
    intentHash: hashRecord(content),
  };
}

function assertResumeIntent(intent, session) {
  const contentKeys = [
    'actualObservationEligible',
    'currentBootIdentityHash',
    'expectedRecoveryHash',
    'rehearsalId',
    'resumedAt',
    'schemaVersion',
    'sessionHash',
    'status',
  ];
  if (
    !hasExactKeys(intent, [
      ...contentKeys,
      'intentHash',
    ]) ||
    intent.schemaVersion !==
      RESUME_INTENT_SCHEMA_VERSION ||
    intent.rehearsalId !==
      session.rehearsalId ||
    intent.sessionHash !== session.sessionHash ||
    intent.status !== 'recovering' ||
    typeof intent.actualObservationEligible !==
      'boolean' ||
    !/^[a-f0-9]{64}$/u.test(
      intent.currentBootIdentityHash,
    ) ||
    !/^[a-f0-9]{64}$/u.test(
      intent.expectedRecoveryHash,
    ) ||
    hashRecord(
      Object.fromEntries(
        contentKeys.map((key) => [
          key,
          intent[key],
        ]),
      ),
    ) !== intent.intentHash
  ) {
    throw new Error(
      'Host restart rehearsal resume intent failed: integrity.',
    );
  }
  requireTimestamp(intent.resumedAt, 'resumedAt');
  return intent;
}

function buildResult({
  intent,
  session,
}) {
  const content = {
    actualHostRestartObserved:
      intent.actualObservationEligible,
    bootIdentityChangedObserved: true,
    priorBootSpawningLeaseRecovered: true,
    recoveryHash: intent.expectedRecoveryHash,
    rehearsalId: session.rehearsalId,
    resumedAt: intent.resumedAt,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_RESULT_SCHEMA_VERSION,
    sessionHash: session.sessionHash,
    status: 'recovered',
  };
  return {
    ...content,
    resultHash: hashRecord(content),
  };
}

function assertResult(result, session) {
  const contentKeys = [
    'actualHostRestartObserved',
    'bootIdentityChangedObserved',
    'priorBootSpawningLeaseRecovered',
    'recoveryHash',
    'rehearsalId',
    'resumedAt',
    'schemaVersion',
    'sessionHash',
    'status',
  ];
  if (
    !hasExactKeys(result, [
      ...contentKeys,
      'resultHash',
    ]) ||
    result.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_HOST_RESTART_RESULT_SCHEMA_VERSION ||
    result.rehearsalId !==
      session.rehearsalId ||
    result.sessionHash !== session.sessionHash ||
    result.status !== 'recovered' ||
    typeof result.actualHostRestartObserved !==
      'boolean' ||
    result.bootIdentityChangedObserved !== true ||
    result.priorBootSpawningLeaseRecovered !== true ||
    !/^[a-f0-9]{64}$/u.test(
      result.recoveryHash,
    ) ||
    hashRecord(
      Object.fromEntries(
        contentKeys.map((key) => [
          key,
          result[key],
        ]),
      ),
    ) !== result.resultHash
  ) {
    throw new Error(
      'Host restart rehearsal result failed: integrity.',
    );
  }
  requireTimestamp(result.resumedAt, 'resumedAt');
  return result;
}

function removeResumeIntent({
  fileSystem,
  rehearsalDirectory,
}) {
  const intentPath = path.join(
    rehearsalDirectory,
    RESUME_INTENT_FILE,
  );
  if (fileSystem.existsSync(intentPath)) {
    fileSystem.unlinkSync(intentPath);
    syncDirectory({
      directory: rehearsalDirectory,
      fileSystem,
    });
  }
}

function resolveRehearsal({
  fileSystem,
  ownerUserId,
  rehearsalBase,
  rehearsalId,
}) {
  if (!REHEARSAL_ID_PATTERN.test(rehearsalId)) {
    throw new Error(
      'Host restart rehearsal id is invalid.',
    );
  }
  const rehearsalDirectory = path.join(
    rehearsalBase,
    rehearsalId,
  );
  assertRegularDirectory({
    directory: rehearsalDirectory,
    fileSystem,
    ownerUserId,
    requireOwnerOnly: true,
  });
  const entries = fileSystem
    .readdirSync(rehearsalDirectory)
    .sort();
  const knownEntries = new Set([
    RESUME_INTENT_FILE,
    RESULT_FILE,
    RESULT_PENDING_FILE,
    SESSION_FILE,
    WORKSPACE_ROOT_DIRECTORY,
  ]);
  if (
    !entries.includes(SESSION_FILE) ||
    !entries.includes(WORKSPACE_ROOT_DIRECTORY) ||
    entries.some((entry) => !knownEntries.has(entry)) ||
    (entries.includes(RESULT_FILE) &&
      entries.includes(RESULT_PENDING_FILE)) ||
    (entries.includes(RESULT_PENDING_FILE) &&
      !entries.includes(RESUME_INTENT_FILE))
  ) {
    throw new Error(
      'Host restart rehearsal state failed: exact-scope.',
    );
  }
  const session = assertSession(
    readPrivateJson({
      filePath: path.join(
        rehearsalDirectory,
        SESSION_FILE,
      ),
      fileSystem,
      ownerUserId,
    }),
    rehearsalId,
  );
  const workspace = inspectRehearsalWorkspace({
    fileSystem,
    ownerUserId,
    rehearsalDirectory,
    session,
  });
  const intent = entries.includes(
    RESUME_INTENT_FILE,
  )
    ? assertResumeIntent(
        readPrivateJson({
          filePath: path.join(
            rehearsalDirectory,
            RESUME_INTENT_FILE,
          ),
          fileSystem,
          ownerUserId,
        }),
        session,
      )
    : null;
  if (entries.includes(RESULT_PENDING_FILE)) {
    const pendingPath = path.join(
      rehearsalDirectory,
      RESULT_PENDING_FILE,
    );
    let pendingResult;
    try {
      pendingResult = assertResult(
        readPrivateJson({
          filePath: pendingPath,
          fileSystem,
          ownerUserId,
        }),
        session,
      );
    } catch (error) {
      if (
        !workspace.workspacePresent &&
        intent &&
        isSafeInterruptedPrivateFile({
          filePath: pendingPath,
          fileSystem,
          ownerUserId,
        })
      ) {
        fileSystem.unlinkSync(pendingPath);
        syncDirectory({
          directory: rehearsalDirectory,
          fileSystem,
        });
        return {
          intent,
          phase: 'recovering',
          rehearsalDirectory,
          session,
          temporaryDirectory:
            workspace.temporaryDirectory,
          workspacePresent: false,
        };
      }
      throw error;
    }
    if (workspace.workspacePresent) {
      throw new Error(
        'Host restart rehearsal result failed: workspace-present.',
      );
    }
    fileSystem.renameSync(
      pendingPath,
      path.join(
        rehearsalDirectory,
        RESULT_FILE,
      ),
    );
    syncDirectory({
      directory: rehearsalDirectory,
      fileSystem,
    });
    removeResumeIntent({
      fileSystem,
      rehearsalDirectory,
    });
    return {
      phase: 'recovered',
      rehearsalDirectory,
      result: pendingResult,
      session,
      temporaryDirectory:
        workspace.temporaryDirectory,
      workspacePresent: false,
    };
  }
  if (entries.includes(RESULT_FILE)) {
    const result = assertResult(
      readPrivateJson({
        filePath: path.join(
          rehearsalDirectory,
          RESULT_FILE,
        ),
        fileSystem,
        ownerUserId,
      }),
      session,
    );
    if (workspace.workspacePresent) {
      throw new Error(
        'Host restart rehearsal result failed: workspace-present.',
      );
    }
    removeResumeIntent({
      fileSystem,
      rehearsalDirectory,
    });
    return {
      phase: 'recovered',
      rehearsalDirectory,
      result,
      session,
      temporaryDirectory:
        workspace.temporaryDirectory,
      workspacePresent: false,
    };
  }
  if (!workspace.workspacePresent && !intent) {
    throw new Error(
      'Host restart rehearsal state failed: missing-recovery-receipt.',
    );
  }
  return {
    intent,
    phase: intent ? 'recovering' : 'prepared',
    rehearsalDirectory,
    session,
    temporaryDirectory: workspace.temporaryDirectory,
    workspacePresent: workspace.workspacePresent,
  };
}

function publicPrepareResult(session) {
  return {
    actualHostRestartObserved: false,
    automaticRebootPerformed: false,
    externalProviderCalls: 'none',
    leaseExpiresAt: session.leaseExpiresAt,
    leaseId: session.leaseId,
    mode: 'local-candidate-evaluation-host-restart-prepare',
    productionReadyClaim: false,
    rehearsalId: session.rehearsalId,
    status: session.status,
  };
}

function publicResumeResult(result) {
  return {
    actualHostRestartObserved:
      result.actualHostRestartObserved,
    automaticEvaluatorRelaunchPerformed: false,
    bootIdentityChangedObserved:
      result.bootIdentityChangedObserved,
    externalProviderCalls: 'none',
    mode: 'local-candidate-evaluation-host-restart-resume',
    priorBootSpawningLeaseRecovered:
      result.priorBootSpawningLeaseRecovered,
    productionReadyClaim: false,
    rehearsalId: result.rehearsalId,
    resultHash: result.resultHash,
    status: result.status,
  };
}

export function prepareLocalCandidateEvaluationHostRestartRehearsal({
  bootIdentityProvider =
    readLocalCandidateEvaluationHostBootIdentity,
  clock = () => new Date().toISOString(),
  fileSystem = fs,
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  ownerUserId: requestedUserId,
  processId = process.pid,
  randomId = () => randomBytes(12).toString('hex'),
  repoDir = process.cwd(),
} = {}) {
  if (
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs <= 0
  ) {
    throw new Error(
      'Host restart rehearsal lease duration must be positive.',
    );
  }
  const preparedAt = requireTimestamp(
    clock(),
    'preparedAt',
  );
  const ownerUserId = currentUserId(requestedUserId);
  const bootIdentity =
    assertLocalCandidateEvaluationHostBootIdentity(
      bootIdentityProvider({
        fileSystem,
        platform: process.platform,
      }),
    );
  if (
    !bootIdentity?.available ||
    !/^[a-f0-9]{64}$/u.test(
      bootIdentity.identityHash,
    )
  ) {
    throw new Error(
      'Host restart rehearsal prepare failed: boot-identity-unavailable.',
    );
  }
  const rehearsalBase = resolveRehearsalBase({
    fileSystem,
    ownerUserId,
    repoDir,
  });
  const {
    rehearsalDirectory,
    rehearsalId,
  } = createRehearsalDirectory({
    fileSystem,
    ownerUserId,
    randomId,
    rehearsalBase,
  });
  const temporaryDirectory = path.join(
    rehearsalDirectory,
    WORKSPACE_ROOT_DIRECTORY,
  );
  fileSystem.mkdirSync(temporaryDirectory, {
    mode: 0o700,
  });
  hardenOwnerOnlyDirectory({
    directory: temporaryDirectory,
    fileSystem,
    ownerUserId,
  });
  let workspace;
  try {
    const leaseExpiresAt = new Date(
      Date.parse(preparedAt) +
        leaseDurationMs,
    ).toISOString();
    workspace =
      createLocalCandidateEvaluationWorkspace({
        bootIdentityProvider,
        createdAt: preparedAt,
        currentUserId: ownerUserId,
        leaseExpiresAt,
        processId,
        temporaryDirectory,
      });
    if (
      workspace.lease.ownerBootIdentityHash !==
      bootIdentity.identityHash
    ) {
      throw new Error(
        'Host restart rehearsal prepare failed: boot-identity-changed.',
      );
    }
    writePrivateJson({
      filePath: path.join(
        workspace.rootDir,
        FIXTURE_FILE,
      ),
      fileSystem,
      value: {
        purpose:
          'host-restart-workspace-recovery-rehearsal',
        rehearsalId,
      },
    });
    const lease = workspace.markSpawning();
    const session = buildSession({
      lease,
      observationSource:
        bootIdentityProvider ===
          readLocalCandidateEvaluationHostBootIdentity &&
        fileSystem === fs
          ? 'host-kernel-reader'
          : 'injected-fixture',
      preparedAt,
      rehearsalId,
      workspaceName: path.basename(
        workspace.rootDir,
      ),
    });
    writePrivateJson({
      filePath: path.join(
        rehearsalDirectory,
        SESSION_FILE,
      ),
      fileSystem,
      value: session,
    });
    return publicPrepareResult(session);
  } catch (error) {
    workspace?.cleanup();
    fileSystem.rmSync(rehearsalDirectory, {
      force: true,
      recursive: true,
    });
    throw error;
  }
}

export function resumeLocalCandidateEvaluationHostRestartRehearsal({
  bootIdentityProvider =
    readLocalCandidateEvaluationHostBootIdentity,
  clock = () => new Date().toISOString(),
  fileSystem = fs,
  ownerUserId: requestedUserId,
  processId = process.pid,
  rehearsalId,
  repoDir = process.cwd(),
} = {}) {
  const resumedAt = requireTimestamp(
    clock(),
    'resumedAt',
  );
  const ownerUserId = currentUserId(requestedUserId);
  const rehearsalBase = resolveRehearsalBase({
    fileSystem,
    ownerUserId,
    repoDir,
  });
  const rehearsal = resolveRehearsal({
    fileSystem,
    ownerUserId,
    rehearsalBase,
    rehearsalId,
  });
  if (rehearsal.phase === 'recovered') {
    return publicResumeResult(rehearsal.result);
  }
  const {
    rehearsalDirectory,
    session,
    temporaryDirectory,
    workspacePresent,
  } = rehearsal;
  const currentBootIdentity =
    assertLocalCandidateEvaluationHostBootIdentity(
      bootIdentityProvider({
        fileSystem,
        platform: process.platform,
      }),
    );
  if (
    !currentBootIdentity?.available ||
    !/^[a-f0-9]{64}$/u.test(
      currentBootIdentity.identityHash,
    )
  ) {
    throw new Error(
      'Host restart rehearsal resume failed: boot-identity-unavailable.',
    );
  }
  if (
    currentBootIdentity.identityHash ===
    session.preparedBootIdentityHash
  ) {
    throw new Error(
      'Host restart rehearsal resume failed: same-boot.',
    );
  }
  if (
    Date.parse(resumedAt) <
    Date.parse(session.leaseExpiresAt)
  ) {
    throw new Error(
      'Host restart rehearsal resume failed: lease-unexpired.',
    );
  }
  let intent = rehearsal.intent;
  if (intent) {
    if (
      intent.currentBootIdentityHash !==
      currentBootIdentity.identityHash
    ) {
      throw new Error(
        'Host restart rehearsal resume failed: boot-changed-during-recovery.',
      );
    }
  } else {
    const expectedRecovery =
      buildExpectedRecovery(session, resumedAt);
    intent = buildResumeIntent({
      actualObservationEligible:
        session.observationSource ===
          'host-kernel-reader' &&
        bootIdentityProvider ===
          readLocalCandidateEvaluationHostBootIdentity &&
        fileSystem === fs,
      currentBootIdentityHash:
        currentBootIdentity.identityHash,
      expectedRecovery,
      resumedAt,
      session,
    });
    writePrivateJson({
      filePath: path.join(
        rehearsalDirectory,
        RESUME_INTENT_FILE,
      ),
      fileSystem,
      value: intent,
    });
  }
  const expectedRecovery = buildExpectedRecovery(
    session,
    intent.resumedAt,
  );
  if (
    expectedRecovery.recoveryHash !==
    intent.expectedRecoveryHash
  ) {
    throw new Error(
      'Host restart rehearsal resume failed: intent-recovery-binding.',
    );
  }
  if (workspacePresent) {
    const recovery =
      recoverStaleLocalCandidateEvaluationWorkspaces({
        bootIdentityProvider,
        currentUserId: ownerUserId,
        fileSystem,
        isProcessAlive() {
          throw new Error(
            'Host restart rehearsal must not inspect an old process id.',
          );
        },
        now: intent.resumedAt,
        processId,
        temporaryDirectory,
      });
    if (
      JSON.stringify(recovery) !==
      JSON.stringify(expectedRecovery)
    ) {
      throw new Error(
        'Host restart rehearsal resume failed: exact-recovery.',
      );
    }
  }
  const result = buildResult({
    intent,
    session,
  });
  writePrivateJsonAtomically({
    fileSystem,
    pendingPath: path.join(
      rehearsalDirectory,
      RESULT_PENDING_FILE,
    ),
    targetPath: path.join(
      rehearsalDirectory,
      RESULT_FILE,
    ),
    value: result,
  });
  removeResumeIntent({
    fileSystem,
    rehearsalDirectory,
  });
  return publicResumeResult(result);
}
