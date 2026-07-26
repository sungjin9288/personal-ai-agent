import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalCandidateEvaluationHostBootIdentity,
  readLocalCandidateEvaluationHostBootIdentity,
} from './local-candidate-evaluation-host-boot-identity.mjs';

export const LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-workspace-lease/v2';
export const LOCAL_CANDIDATE_EVALUATION_WORKSPACE_RECOVERY_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-workspace-recovery/v2';
export const LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE =
  'personal-ai-agent-candidate-evaluation-v1';

const LEGACY_WORKSPACE_LEASE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-workspace-lease/v1';
const LEASE_MARKER_NAME = '.workspace-lease.json';
const NAMESPACE_MARKER_NAME = '.namespace.json';
const NAMESPACE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-workspace-namespace/v1';
const WORKSPACE_PREFIX = 'workspace-';
const WORKSPACE_NAME_PATTERN = /^workspace-[A-Za-z0-9]{6}$/u;
const RECOVERY_MARKER_PATTERN =
  /^\.workspace-lease\.recovery-(\d+)\.json$/u;
const MAX_MARKER_BYTES = 4 * 1024;
const MAX_RECOVERY_BYTES = 32 * 1024 ** 3;
const MAX_RECOVERY_DEPTH = 32;
const MAX_RECOVERY_ENTRIES = 512;

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(String(value || ''));
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

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function requireTimestamp(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local candidate evaluation workspace ${fieldName} must be a timestamp.`,
    );
  }
  return normalized;
}

function requireProcessId(value, fieldName = 'ownerPid') {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `Local candidate evaluation workspace ${fieldName} must be a positive integer.`,
    );
  }
  return value;
}

function resolveCurrentUserId(value) {
  const currentUserId =
    value ??
    (typeof process.getuid === 'function'
      ? process.getuid()
      : null);
  if (!Number.isSafeInteger(currentUserId) || currentUserId < 0) {
    throw new Error(
      'Local candidate evaluation workspace recovery requires a current user id.',
    );
  }
  return currentUserId;
}

function resolveHostBootIdentity({
  bootIdentityProvider,
  fileSystem,
  platform,
}) {
  try {
    return assertLocalCandidateEvaluationHostBootIdentity(
      bootIdentityProvider({
        fileSystem,
        platform,
      }),
    );
  } catch {
    return {
      available: false,
      identityHash: null,
    };
  }
}

function assertFileSystem(fileSystem) {
  const methods = [
    'chmodSync',
    'closeSync',
    'fsyncSync',
    'lstatSync',
    'mkdirSync',
    'mkdtempSync',
    'openSync',
    'readFileSync',
    'readdirSync',
    'realpathSync',
    'renameSync',
    'rmSync',
    'rmdirSync',
    'unlinkSync',
    'writeFileSync',
  ];
  if (
    !fileSystem ||
    methods.some(
      (method) => typeof fileSystem[method] !== 'function',
    )
  ) {
    throw new Error(
      'Local candidate evaluation workspace recovery requires a filesystem.',
    );
  }
}

function requireDirectory(
  fileSystem,
  value,
  fieldName,
) {
  let canonical;
  let stat;
  try {
    const requested = path.resolve(value);
    stat = fileSystem.lstatSync(requested);
    canonical = fileSystem.realpathSync(requested);
  } catch {
    throw new Error(
      `Local candidate evaluation workspace ${fieldName} must exist.`,
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      `Local candidate evaluation workspace ${fieldName} must be a regular directory.`,
    );
  }
  return {
    canonical,
    stat,
  };
}

function hasOwnerOnlyMode(stat) {
  return (stat.mode & 0o077) === 0;
}

function writeDurableFile(
  fileSystem,
  filePath,
  content,
  flag,
) {
  const descriptor = fileSystem.openSync(
    filePath,
    flag,
    0o600,
  );
  try {
    fileSystem.writeFileSync(descriptor, content);
    fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
  fileSystem.chmodSync(filePath, 0o600);
}

function readBoundedMarker({
  currentUserId,
  fileSystem,
  markerPath,
}) {
  let stat;
  try {
    stat = fileSystem.lstatSync(markerPath);
  } catch {
    throw new Error(
      'Local candidate evaluation workspace marker is missing.',
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.uid !== currentUserId ||
    !hasOwnerOnlyMode(stat) ||
    stat.size <= 0 ||
    stat.size > MAX_MARKER_BYTES
  ) {
    throw new Error(
      'Local candidate evaluation workspace marker is unsafe.',
    );
  }
  let marker;
  try {
    marker = JSON.parse(
      fileSystem.readFileSync(markerPath, 'utf8'),
    );
  } catch {
    throw new Error(
      'Local candidate evaluation workspace marker is malformed.',
    );
  }
  return marker;
}

function buildNamespaceMarker({
  currentUserId,
  namespacePath,
  temporaryRoot,
}) {
  const content = {
    namespacePathHash: hashValue(namespacePath),
    ownerUserId: currentUserId,
    schemaVersion: NAMESPACE_SCHEMA_VERSION,
    temporaryRootPathHash: hashValue(temporaryRoot),
  };
  return {
    ...content,
    namespaceId:
      `local-candidate-evaluation-workspace-namespace-${hashRecord(content)}`,
  };
}

function assertNamespaceMarker(marker, expected) {
  if (
    !hasExactKeys(marker, [
      'namespaceId',
      'namespacePathHash',
      'ownerUserId',
      'schemaVersion',
      'temporaryRootPathHash',
    ]) ||
    JSON.stringify(marker) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local candidate evaluation workspace namespace failed: marker-binding.',
    );
  }
  return marker;
}

function ensureWorkspaceNamespace({
  currentUserId,
  fileSystem,
  temporaryDirectory,
}) {
  const temporary = requireDirectory(
    fileSystem,
    temporaryDirectory,
    'temporaryDirectory',
  );
  const namespacePath = path.join(
    temporary.canonical,
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );
  let initializationPath;
  try {
    fileSystem.lstatSync(namespacePath);
  } catch {
    initializationPath = fileSystem.mkdtempSync(
      path.join(
        temporary.canonical,
        `.${LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE}-init-`,
      ),
    );
    fileSystem.chmodSync(initializationPath, 0o700);
    const marker = buildNamespaceMarker({
      currentUserId,
      namespacePath,
      temporaryRoot: temporary.canonical,
    });
    try {
      writeDurableFile(
        fileSystem,
        path.join(
          initializationPath,
          NAMESPACE_MARKER_NAME,
        ),
        `${JSON.stringify(marker)}\n`,
        'wx',
      );
      fileSystem.renameSync(
        initializationPath,
        namespacePath,
      );
      initializationPath = null;
    } catch (error) {
      fileSystem.rmSync(initializationPath, {
        force: true,
        recursive: true,
      });
      if (
        error?.code !== 'EEXIST' &&
        error?.code !== 'ENOTEMPTY'
      ) {
        throw error;
      }
    }
  }
  const namespace = requireDirectory(
    fileSystem,
    namespacePath,
    'namespace',
  );
  if (
    namespace.stat.uid !== currentUserId ||
    !hasOwnerOnlyMode(namespace.stat) ||
    !isWithin(temporary.canonical, namespace.canonical) ||
    path.dirname(namespace.canonical) !== temporary.canonical
  ) {
    throw new Error(
      'Local candidate evaluation workspace namespace failed: ownership-or-containment.',
    );
  }
  const expectedMarker = buildNamespaceMarker({
    currentUserId,
    namespacePath: namespace.canonical,
    temporaryRoot: temporary.canonical,
  });
  assertNamespaceMarker(
    readBoundedMarker({
      currentUserId,
      fileSystem,
      markerPath: path.join(
        namespace.canonical,
        NAMESPACE_MARKER_NAME,
      ),
    }),
    expectedMarker,
  );
  return {
    namespacePath: namespace.canonical,
    temporaryRoot: temporary.canonical,
  };
}

function buildLease({
  createdAt,
  leaseExpiresAt,
  namespacePath,
  ownerBootIdentityHash,
  ownerPid,
  phase,
  schemaVersion =
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION,
  workspacePath,
}) {
  const binding =
    schemaVersion ===
    LEGACY_WORKSPACE_LEASE_SCHEMA_VERSION
      ? {
          createdAt,
          leaseExpiresAt,
          namespacePathHash: hashValue(namespacePath),
          ownerPid,
          phase,
          schemaVersion,
          workspacePathHash: hashValue(workspacePath),
        }
      : {
          createdAt,
          leaseExpiresAt,
          namespacePathHash: hashValue(namespacePath),
          ownerBootIdentityHash,
          ownerPid,
          phase,
          schemaVersion,
          workspacePathHash: hashValue(workspacePath),
        };
  return {
    ...binding,
    leaseId:
      `local-candidate-evaluation-workspace-lease-${hashRecord(binding)}`,
  };
}

function assertLease({
  lease,
  namespacePath,
  workspacePath,
}) {
  const legacy =
    lease?.schemaVersion ===
    LEGACY_WORKSPACE_LEASE_SCHEMA_VERSION;
  const expectedKeys = legacy
    ? [
        'createdAt',
        'leaseExpiresAt',
        'leaseId',
        'namespacePathHash',
        'ownerPid',
        'phase',
        'schemaVersion',
        'workspacePathHash',
      ]
    : [
        'createdAt',
        'leaseExpiresAt',
        'leaseId',
        'namespacePathHash',
        'ownerBootIdentityHash',
        'ownerPid',
        'phase',
        'schemaVersion',
        'workspacePathHash',
      ];
  if (
    !hasExactKeys(lease, expectedKeys) ||
    (!legacy &&
      lease?.schemaVersion !==
        LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION)
  ) {
    throw new Error(
      'Local candidate evaluation workspace lease failed: integrity.',
    );
  }
  const expected = buildLease({
    createdAt: requireTimestamp(
      lease.createdAt,
      'createdAt',
    ),
    leaseExpiresAt: requireTimestamp(
      lease.leaseExpiresAt,
      'leaseExpiresAt',
    ),
    namespacePath,
    ownerBootIdentityHash: legacy
      ? undefined
      : lease.ownerBootIdentityHash,
    ownerPid: requireProcessId(lease.ownerPid),
    phase: lease.phase,
    schemaVersion: lease.schemaVersion,
    workspacePath,
  });
  if (
    !['preparing', 'spawning'].includes(lease.phase) ||
    (!legacy &&
      lease.ownerBootIdentityHash !== null &&
      !isSha256(lease.ownerBootIdentityHash)) ||
    Date.parse(lease.createdAt) >=
      Date.parse(lease.leaseExpiresAt) ||
    JSON.stringify(lease) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local candidate evaluation workspace lease failed: binding.',
    );
  }
  return lease;
}

function writeLeaseAtomically({
  fileSystem,
  lease,
  ownerPid,
  workspacePath,
}) {
  const target = path.join(
    workspacePath,
    LEASE_MARKER_NAME,
  );
  const temporary = path.join(
    workspacePath,
    `.workspace-lease.write-${ownerPid}.tmp`,
  );
  writeDurableFile(
    fileSystem,
    temporary,
    `${JSON.stringify(lease)}\n`,
    'wx',
  );
  fileSystem.renameSync(temporary, target);
  fileSystem.chmodSync(target, 0o600);
}

function getProcessState(isProcessAlive, processId) {
  try {
    const result = isProcessAlive(processId);
    if (result === true) {
      return 'live';
    }
    if (result === false) {
      return 'dead';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function defaultIsProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    return null;
  }
}

function inspectRecoveryTree({
  currentUserId,
  fileSystem,
  markerPath,
  rootPath,
}) {
  const state = {
    byteLength: 0,
    entryCount: 0,
  };
  function inspect(currentPath, depth) {
    if (depth > MAX_RECOVERY_DEPTH) {
      throw new Error(
        'Local candidate evaluation workspace recovery exceeded the depth boundary.',
      );
    }
    const stat = fileSystem.lstatSync(currentPath);
    const canonical = fileSystem.realpathSync(currentPath);
    state.entryCount += 1;
    if (
      state.entryCount > MAX_RECOVERY_ENTRIES ||
      stat.uid !== currentUserId ||
      stat.isSymbolicLink() ||
      !isWithin(rootPath, canonical)
    ) {
      throw new Error(
        'Local candidate evaluation workspace recovery found an unsafe entry.',
      );
    }
    if (stat.isFile()) {
      state.byteLength += stat.size;
      if (
        stat.nlink !== 1 ||
        !hasOwnerOnlyMode(stat) ||
        state.byteLength > MAX_RECOVERY_BYTES
      ) {
        throw new Error(
          'Local candidate evaluation workspace recovery found an unsafe file.',
        );
      }
      return;
    }
    if (!stat.isDirectory() || !hasOwnerOnlyMode(stat)) {
      throw new Error(
        'Local candidate evaluation workspace recovery accepts only owner-only files and directories.',
      );
    }
    for (const entry of fileSystem.readdirSync(currentPath, {
      withFileTypes: true,
    })) {
      inspect(path.join(currentPath, entry.name), depth + 1);
    }
  }
  inspect(rootPath, 0);
  if (state.entryCount <= 1 || !isWithin(rootPath, markerPath)) {
    throw new Error(
      'Local candidate evaluation workspace recovery marker is outside its tree.',
    );
  }
  return state;
}

function deleteRecoveryTree({
  currentUserId,
  fileSystem,
  markerPath,
  rootPath,
  rootIdentity,
}) {
  const state = {
    byteLength: 0,
    entryCount: 0,
  };
  function remove(currentPath, depth) {
    if (depth > MAX_RECOVERY_DEPTH) {
      throw new Error(
        'Local candidate evaluation workspace recovery exceeded the deletion depth boundary.',
      );
    }
    const stat = fileSystem.lstatSync(currentPath);
    const canonical = fileSystem.realpathSync(currentPath);
    state.entryCount += 1;
    if (
      state.entryCount > MAX_RECOVERY_ENTRIES ||
      stat.uid !== currentUserId ||
      stat.isSymbolicLink() ||
      !isWithin(rootPath, canonical)
    ) {
      throw new Error(
        'Local candidate evaluation workspace recovery changed during deletion.',
      );
    }
    if (stat.isFile()) {
      state.byteLength += stat.size;
      if (
        stat.nlink !== 1 ||
        !hasOwnerOnlyMode(stat) ||
        state.byteLength > MAX_RECOVERY_BYTES
      ) {
        throw new Error(
          'Local candidate evaluation workspace recovery found an unsafe file during deletion.',
        );
      }
      if (currentPath !== markerPath) {
        fileSystem.unlinkSync(currentPath);
      }
      return;
    }
    if (!stat.isDirectory() || !hasOwnerOnlyMode(stat)) {
      throw new Error(
        'Local candidate evaluation workspace recovery found an unsafe directory during deletion.',
      );
    }
    fileSystem.chmodSync(currentPath, 0o700);
    for (const entry of fileSystem.readdirSync(currentPath, {
      withFileTypes: true,
    })) {
      remove(path.join(currentPath, entry.name), depth + 1);
    }
    if (currentPath !== rootPath) {
      fileSystem.rmdirSync(currentPath);
    }
  }
  const currentRoot = fileSystem.lstatSync(rootPath);
  if (
    currentRoot.dev !== rootIdentity.dev ||
    currentRoot.ino !== rootIdentity.ino
  ) {
    throw new Error(
      'Local candidate evaluation workspace recovery root changed before deletion.',
    );
  }
  remove(rootPath, 0);
  fileSystem.unlinkSync(markerPath);
  fileSystem.rmdirSync(rootPath);
}

function findLeaseMarker(entries) {
  const markerNames = entries
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name === LEASE_MARKER_NAME ||
        name.startsWith('.workspace-lease.'),
    );
  if (markerNames.length !== 1) {
    throw new Error(
      'Local candidate evaluation workspace recovery requires one lease marker.',
    );
  }
  const markerName = markerNames[0];
  const recoveryMatch = markerName.match(
    RECOVERY_MARKER_PATTERN,
  );
  if (
    markerName !== LEASE_MARKER_NAME &&
    !recoveryMatch
  ) {
    throw new Error(
      'Local candidate evaluation workspace recovery found a partial marker.',
    );
  }
  return {
    markerName,
    recoveryOwnerPid: recoveryMatch
      ? requireProcessId(
          Number(recoveryMatch[1]),
          'recoveryOwnerPid',
        )
      : null,
  };
}

function inspectWorkspace({
  currentUserId,
  fileSystem,
  namespacePath,
  workspaceName,
}) {
  if (!WORKSPACE_NAME_PATTERN.test(workspaceName)) {
    throw new Error(
      'Local candidate evaluation workspace name is invalid.',
    );
  }
  const workspacePath = path.join(
    namespacePath,
    workspaceName,
  );
  const stat = fileSystem.lstatSync(workspacePath);
  const canonical = fileSystem.realpathSync(workspacePath);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== currentUserId ||
    !hasOwnerOnlyMode(stat) ||
    path.dirname(canonical) !== namespacePath ||
    path.basename(canonical) !== workspaceName
  ) {
    throw new Error(
      'Local candidate evaluation workspace failed: ownership-or-containment.',
    );
  }
  const marker = findLeaseMarker(
    fileSystem.readdirSync(canonical, {
      withFileTypes: true,
    }),
  );
  const markerPath = path.join(
    canonical,
    marker.markerName,
  );
  const lease = assertLease({
    lease: readBoundedMarker({
      currentUserId,
      fileSystem,
      markerPath,
    }),
    namespacePath,
    workspacePath: canonical,
  });
  return {
    lease,
    markerPath,
    recoveryOwnerPid: marker.recoveryOwnerPid,
    rootIdentity: {
      dev: stat.dev,
      ino: stat.ino,
    },
    workspacePath: canonical,
  };
}

export function assertLocalCandidateEvaluationWorkspaceRecovery(
  recovery,
) {
  const { recoveryHash, ...content } = recovery || {};
  if (
    !hasExactKeys(content, [
      'bootIdentityAvailable',
      'recoveredLeaseIds',
      'recoveredPriorBootSpawningLeaseIds',
      'scannedAt',
      'scannedWorkspaceCount',
      'schemaVersion',
      'skippedActiveWorkspaceCount',
      'skippedUnsafeWorkspaceCount',
    ]) ||
    content.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_WORKSPACE_RECOVERY_SCHEMA_VERSION ||
    typeof content.bootIdentityAvailable !== 'boolean' ||
    !Number.isFinite(Date.parse(content.scannedAt)) ||
    !Array.isArray(content.recoveredLeaseIds) ||
    !Array.isArray(
      content.recoveredPriorBootSpawningLeaseIds,
    ) ||
    content.recoveredLeaseIds.some(
      (leaseId) =>
        !/^local-candidate-evaluation-workspace-lease-[a-f0-9]{64}$/u.test(
          leaseId,
        ),
    ) ||
    new Set(content.recoveredLeaseIds).size !==
      content.recoveredLeaseIds.length ||
    content.recoveredPriorBootSpawningLeaseIds.some(
      (leaseId) =>
        !content.recoveredLeaseIds.includes(leaseId),
    ) ||
    new Set(
      content.recoveredPriorBootSpawningLeaseIds,
    ).size !==
      content.recoveredPriorBootSpawningLeaseIds.length ||
    (!content.bootIdentityAvailable &&
      content.recoveredPriorBootSpawningLeaseIds
        .length > 0) ||
    JSON.stringify(content.recoveredLeaseIds) !==
      JSON.stringify([...content.recoveredLeaseIds].sort()) ||
    JSON.stringify(
      content.recoveredPriorBootSpawningLeaseIds,
    ) !==
      JSON.stringify(
        [
          ...content.recoveredPriorBootSpawningLeaseIds,
        ].sort(),
      ) ||
    !Number.isSafeInteger(content.scannedWorkspaceCount) ||
    content.scannedWorkspaceCount < 0 ||
    !Number.isSafeInteger(
      content.skippedActiveWorkspaceCount,
    ) ||
    content.skippedActiveWorkspaceCount < 0 ||
    !Number.isSafeInteger(
      content.skippedUnsafeWorkspaceCount,
    ) ||
    content.skippedUnsafeWorkspaceCount < 0 ||
    content.recoveredLeaseIds.length +
      content.skippedActiveWorkspaceCount +
      content.skippedUnsafeWorkspaceCount !==
      content.scannedWorkspaceCount ||
    recoveryHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local candidate evaluation workspace recovery failed: integrity.',
    );
  }
  return recovery;
}

function recoverWithHostBootIdentity({
  currentUserId,
  fileSystem = fs,
  hostBootIdentity,
  isProcessAlive = defaultIsProcessAlive,
  now,
  processId = process.pid,
  temporaryDirectory,
} = {}) {
  assertFileSystem(fileSystem);
  const scannedAt = requireTimestamp(now, 'scannedAt');
  const recoveryProcessId = requireProcessId(
    processId,
    'processId',
  );
  const ownerUserId = resolveCurrentUserId(currentUserId);
  const { namespacePath } = ensureWorkspaceNamespace({
    currentUserId: ownerUserId,
    fileSystem,
    temporaryDirectory,
  });
  const recoveredLeaseIds = [];
  const recoveredPriorBootSpawningLeaseIds = [];
  let scannedWorkspaceCount = 0;
  let skippedActiveWorkspaceCount = 0;
  let skippedUnsafeWorkspaceCount = 0;
  const workspaceNames = fileSystem
    .readdirSync(namespacePath, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(WORKSPACE_PREFIX))
    .sort();
  for (const workspaceName of workspaceNames) {
    scannedWorkspaceCount += 1;
    try {
      const workspace = inspectWorkspace({
        currentUserId: ownerUserId,
        fileSystem,
        namespacePath,
        workspaceName,
      });
      if (
        Date.parse(workspace.lease.leaseExpiresAt) >
          Date.parse(scannedAt)
      ) {
        skippedActiveWorkspaceCount += 1;
        continue;
      }
      const fromPriorBoot =
        workspace.lease.schemaVersion ===
          LOCAL_CANDIDATE_EVALUATION_WORKSPACE_LEASE_SCHEMA_VERSION &&
        isSha256(
          workspace.lease.ownerBootIdentityHash,
        ) &&
        hostBootIdentity.available &&
        workspace.lease.ownerBootIdentityHash !==
          hostBootIdentity.identityHash;
      if (
        workspace.recoveryOwnerPid !== null &&
        getProcessState(
          isProcessAlive,
          workspace.recoveryOwnerPid,
        ) !== 'dead'
      ) {
        skippedActiveWorkspaceCount += 1;
        continue;
      }
      if (workspace.lease.phase === 'spawning') {
        if (!fromPriorBoot) {
          skippedActiveWorkspaceCount += 1;
          continue;
        }
      } else if (
        workspace.recoveryOwnerPid === null
      ) {
        if (
          getProcessState(
            isProcessAlive,
            workspace.lease.ownerPid,
          ) !== 'dead'
        ) {
          skippedActiveWorkspaceCount += 1;
          continue;
        }
      }
      inspectRecoveryTree({
        currentUserId: ownerUserId,
        fileSystem,
        markerPath: workspace.markerPath,
        rootPath: workspace.workspacePath,
      });
      const claimPath = path.join(
        workspace.workspacePath,
        `.workspace-lease.recovery-${recoveryProcessId}.json`,
      );
      try {
        fileSystem.renameSync(
          workspace.markerPath,
          claimPath,
        );
      } catch (error) {
        if (error?.code === 'ENOENT') {
          skippedUnsafeWorkspaceCount += 1;
          continue;
        }
        throw error;
      }
      inspectRecoveryTree({
        currentUserId: ownerUserId,
        fileSystem,
        markerPath: claimPath,
        rootPath: workspace.workspacePath,
      });
      deleteRecoveryTree({
        currentUserId: ownerUserId,
        fileSystem,
        markerPath: claimPath,
        rootIdentity: workspace.rootIdentity,
        rootPath: workspace.workspacePath,
      });
      recoveredLeaseIds.push(workspace.lease.leaseId);
      if (
        fromPriorBoot &&
        workspace.lease.phase === 'spawning'
      ) {
        recoveredPriorBootSpawningLeaseIds.push(
          workspace.lease.leaseId,
        );
      }
    } catch {
      skippedUnsafeWorkspaceCount += 1;
    }
  }
  const content = {
    bootIdentityAvailable: hostBootIdentity.available,
    recoveredLeaseIds: recoveredLeaseIds.sort(),
    recoveredPriorBootSpawningLeaseIds:
      recoveredPriorBootSpawningLeaseIds.sort(),
    scannedAt,
    scannedWorkspaceCount,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_WORKSPACE_RECOVERY_SCHEMA_VERSION,
    skippedActiveWorkspaceCount,
    skippedUnsafeWorkspaceCount,
  };
  return assertLocalCandidateEvaluationWorkspaceRecovery({
    ...content,
    recoveryHash: hashRecord(content),
  });
}

export function recoverStaleLocalCandidateEvaluationWorkspaces({
  bootIdentityProvider =
    readLocalCandidateEvaluationHostBootIdentity,
  currentUserId,
  fileSystem = fs,
  isProcessAlive = defaultIsProcessAlive,
  now,
  platform = process.platform,
  processId = process.pid,
  temporaryDirectory,
} = {}) {
  const hostBootIdentity = resolveHostBootIdentity({
    bootIdentityProvider,
    fileSystem,
    platform,
  });
  return recoverWithHostBootIdentity({
    currentUserId,
    fileSystem,
    hostBootIdentity,
    isProcessAlive,
    now,
    processId,
    temporaryDirectory,
  });
}

function unlockTreeForRemoval(fileSystem, root) {
  let stat;
  try {
    stat = fileSystem.lstatSync(root);
  } catch {
    return;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return;
  }
  fileSystem.chmodSync(root, 0o700);
  for (const entry of fileSystem.readdirSync(root, {
    withFileTypes: true,
  })) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      unlockTreeForRemoval(
        fileSystem,
        path.join(root, entry.name),
      );
    }
  }
}

export function createLocalCandidateEvaluationWorkspace({
  bootIdentityProvider =
    readLocalCandidateEvaluationHostBootIdentity,
  createdAt,
  currentUserId,
  fileSystem = fs,
  isProcessAlive = defaultIsProcessAlive,
  leaseExpiresAt,
  platform = process.platform,
  processId = process.pid,
  temporaryDirectory,
} = {}) {
  assertFileSystem(fileSystem);
  const normalizedCreatedAt = requireTimestamp(
    createdAt,
    'createdAt',
  );
  const normalizedExpiresAt = requireTimestamp(
    leaseExpiresAt,
    'leaseExpiresAt',
  );
  if (
    Date.parse(normalizedCreatedAt) >=
    Date.parse(normalizedExpiresAt)
  ) {
    throw new Error(
      'Local candidate evaluation workspace lease must expire after creation.',
    );
  }
  const normalizedProcessId = requireProcessId(processId);
  const ownerUserId = resolveCurrentUserId(currentUserId);
  const hostBootIdentity = resolveHostBootIdentity({
    bootIdentityProvider,
    fileSystem,
    platform,
  });
  const recovery =
    recoverWithHostBootIdentity({
      currentUserId: ownerUserId,
      fileSystem,
      hostBootIdentity,
      isProcessAlive,
      now: normalizedCreatedAt,
      processId: normalizedProcessId,
      temporaryDirectory,
    });
  const { namespacePath } = ensureWorkspaceNamespace({
    currentUserId: ownerUserId,
    fileSystem,
    temporaryDirectory,
  });
  const rootDir = fileSystem.mkdtempSync(
    path.join(namespacePath, WORKSPACE_PREFIX),
  );
  fileSystem.chmodSync(rootDir, 0o700);
  let cleaned = false;
  let lease = buildLease({
    createdAt: normalizedCreatedAt,
    leaseExpiresAt: normalizedExpiresAt,
    namespacePath,
    ownerBootIdentityHash:
      hostBootIdentity.identityHash,
    ownerPid: normalizedProcessId,
    phase: 'preparing',
    workspacePath: rootDir,
  });
  try {
    writeLeaseAtomically({
      fileSystem,
      lease,
      ownerPid: normalizedProcessId,
      workspacePath: rootDir,
    });
  } catch (error) {
    fileSystem.rmSync(rootDir, {
      force: true,
      recursive: true,
    });
    throw error;
  }
  const cleanup = () => {
    if (cleaned) {
      return;
    }
    unlockTreeForRemoval(fileSystem, rootDir);
    fileSystem.rmSync(rootDir, {
      force: true,
      recursive: true,
    });
    cleaned = true;
  };
  return {
    cleanup,
    get lease() {
      return lease;
    },
    markSpawning() {
      if (lease.phase !== 'preparing') {
        throw new Error(
          'Local candidate evaluation workspace can enter spawning only once.',
        );
      }
      const currentLease = assertLease({
        lease: readBoundedMarker({
          currentUserId: ownerUserId,
          fileSystem,
          markerPath: path.join(
            rootDir,
            LEASE_MARKER_NAME,
          ),
        }),
        namespacePath,
        workspacePath: rootDir,
      });
      if (
        JSON.stringify(currentLease) !==
        JSON.stringify(lease)
      ) {
        throw new Error(
          'Local candidate evaluation workspace failed: current-lease-binding.',
        );
      }
      const nextLease = buildLease({
        createdAt: lease.createdAt,
        leaseExpiresAt: lease.leaseExpiresAt,
        namespacePath,
        ownerBootIdentityHash:
          lease.ownerBootIdentityHash,
        ownerPid: lease.ownerPid,
        phase: 'spawning',
        schemaVersion: lease.schemaVersion,
        workspacePath: rootDir,
      });
      writeLeaseAtomically({
        fileSystem,
        lease: nextLease,
        ownerPid: normalizedProcessId,
        workspacePath: rootDir,
      });
      lease = nextLease;
      return lease;
    },
    recovery,
    rootDir,
  };
}
