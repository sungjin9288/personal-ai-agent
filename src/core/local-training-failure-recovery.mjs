import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalCandidateEvaluationHostBootIdentity,
  readLocalCandidateEvaluationHostBootIdentity,
} from './local-candidate-evaluation-host-boot-identity.mjs';

export const LOCAL_TRAINING_FAILURE_RECOVERY_INTENT_SCHEMA_VERSION =
  'personal-ai-agent-local-training-failure-recovery-intent/v1';
export const LOCAL_TRAINING_FAILURE_RECOVERY_STATE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-failure-recovery-state/v1';
export const LOCAL_TRAINING_FAILURE_RECOVERY_RECEIPT_SCHEMA_VERSION =
  'personal-ai-agent-local-training-failure-recovery-receipt/v1';
export const LOCAL_TRAINING_FAILURE_CLEANUP_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-local-training-failure-cleanup-request/v1';

const OPERATION_STATES = new WeakMap();
const RECOVERY_ROOT = 'var/local-training/recovery';
const CANDIDATE_ROOT = 'var/local-training/candidates';
const WORKSPACE_ROOT = 'var/local-training/workspaces';
const INTENT_FILE = 'intent.json';
const STATE_FILE = 'state.json';
const RECEIPT_FILE = 'receipt.json';
const CLAIM_FILE = 'claim.json';
const CLAIM_EDGE_PREFIX = 'claim-edge-';
const MAX_RECORD_BYTES = 32 * 1024;
const MAX_CLAIM_CHAIN_NODES = 512;
const MAX_TREE_DEPTH = 32;
const MAX_TREE_ENTRIES = 512;
const ALLOWED_PHASES = new Set([
  'preparing',
  'publish-intent',
  'published',
  'success-cleanup-pending',
  'cleanup-pending',
  'workspace-removed',
  'candidate-removal-pending',
  'candidate-removed',
]);
const ALLOWED_FAILURE_CODES = new Set([
  'adapter-execution-failed',
  'successful-run-cleanup-failed',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
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

function requireTimestamp(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training failure recovery ${fieldName} must be a timestamp.`,
    );
  }
  return normalized;
}

function requireSafeText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    normalized.length > 256 ||
    /[\r\n\0/\\]/u.test(normalized)
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} is unsafe.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `Local training failure recovery ${fieldName} must be a positive integer.`,
    );
  }
  return value;
}

function requireHashReference(value, fieldName) {
  if (
    !hasExactKeys(value, ['id', 'hash']) ||
    !requireSafeText(value.id, `${fieldName}.id`) ||
    !isSha256(value.hash)
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} failed integrity.`,
    );
  }
  return {
    hash: value.hash,
    id: value.id,
  };
}

function requireDatasetBinding(value) {
  if (
    !hasExactKeys(value, [
      'datasetHash',
      'readinessHash',
      'trainSha256',
      'validationSha256',
    ]) ||
    !isSha256(value.datasetHash) ||
    !isSha256(value.readinessHash) ||
    !isSha256(value.trainSha256) ||
    !isSha256(value.validationSha256)
  ) {
    throw new Error(
      'Local training failure recovery dataset binding failed integrity.',
    );
  }
  return { ...value };
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function hasPathEntry(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function requireRelativePath(value, fieldName) {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    normalized.includes('\\') ||
    path.posix.isAbsolute(normalized) ||
    path.posix.normalize(normalized) !== normalized ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    /[\r\n\0]/u.test(normalized)
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} must remain relative.`,
    );
  }
  return normalized;
}

function currentUserId() {
  if (typeof process.getuid !== 'function') {
    throw new Error(
      'Local training failure recovery requires a POSIX user identity.',
    );
  }
  const value = process.getuid();
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      'Local training failure recovery requires a valid user identity.',
    );
  }
  return value;
}

function hasOwnerOnlyMode(stat) {
  return (stat.mode & 0o077) === 0;
}

function rootIdentity(stat) {
  return {
    device: String(stat.dev),
    inode: String(stat.ino),
  };
}

function sameIdentity(left, right) {
  return Boolean(
    left &&
    right &&
    left.device === right.device &&
    left.inode === right.inode,
  );
}

function requireRootIdentity(value, fieldName) {
  if (
    !hasExactKeys(value, ['device', 'inode']) ||
    !/^\d+$/u.test(String(value.device || '')) ||
    !/^\d+$/u.test(String(value.inode || ''))
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} failed integrity.`,
    );
  }
  return { ...value };
}

function requireDirectory(fileSystem, value, boundary, fieldName) {
  let canonical;
  let stat;
  try {
    const requested = path.resolve(value);
    stat = fileSystem.lstatSync(requested);
    canonical = fileSystem.realpathSync(requested);
  } catch {
    throw new Error(
      `Local training failure recovery ${fieldName} must be a directory.`,
    );
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (boundary && !isWithin(boundary, canonical))
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} escaped its boundary.`,
    );
  }
  return { canonical, stat };
}

function ensurePrivateDirectory(fileSystem, repoRoot, relativePath) {
  let current = repoRoot;
  for (const segment of requireRelativePath(relativePath, 'directory').split('/')) {
    const parent = current;
    const requested = path.join(parent, segment);
    const created = !fileSystem.existsSync(requested);
    if (created) {
      fileSystem.mkdirSync(requested, { mode: 0o700 });
    }
    const directory = requireDirectory(
      fileSystem,
      requested,
      repoRoot,
      'private directory',
    );
    if (directory.stat.uid !== currentUserId()) {
      throw new Error(
        'Local training failure recovery private directory has a foreign owner.',
      );
    }
    fileSystem.chmodSync(directory.canonical, 0o700);
    fsyncDirectory(fileSystem, directory.canonical);
    if (created) {
      fsyncDirectory(fileSystem, parent);
    }
    current = directory.canonical;
  }
  return current;
}

function fsyncDirectory(fileSystem, directory) {
  const descriptor = fileSystem.openSync(directory, 'r');
  try {
    fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeExclusiveJson(fileSystem, filePath, value) {
  const descriptor = fileSystem.openSync(filePath, 'wx', 0o600);
  try {
    fileSystem.writeFileSync(descriptor, serialize(value));
    fileSystem.fsyncSync(descriptor);
  } finally {
    fileSystem.closeSync(descriptor);
  }
  fileSystem.chmodSync(filePath, 0o600);
  fsyncDirectory(fileSystem, path.dirname(filePath));
}

function writeAtomicJson(fileSystem, filePath, value) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.record-${randomBytes(12).toString('hex')}.tmp`,
  );
  writeExclusiveJson(fileSystem, temporaryPath, value);
  try {
    fileSystem.renameSync(temporaryPath, filePath);
    fsyncDirectory(fileSystem, path.dirname(filePath));
  } catch (error) {
    try {
      fileSystem.unlinkSync(temporaryPath);
    } catch {
      // A failed durable transition is intentionally left fail-closed.
    }
    throw error;
  }
}

function atomicTempPrefix(filePath) {
  return `.${path.basename(filePath)}-`;
}

function removeOrphanAtomicTemps(fileSystem, filePath) {
  const directory = path.dirname(filePath);
  const prefix = atomicTempPrefix(filePath);
  let removed = false;
  for (const name of fileSystem.readdirSync(directory)) {
    if (!name.startsWith(prefix) || !name.endsWith('.tmp')) {
      continue;
    }
    const ownerProcessId = Number.parseInt(
      name.slice(prefix.length).split('-', 1)[0],
      10,
    );
    if (
      !Number.isSafeInteger(ownerProcessId) ||
      ownerProcessId <= 0
    ) {
      throw new Error(
        'Local training failure recovery atomic record staging is unsafe.',
      );
    }
    if (isProcessAlive(ownerProcessId)) {
      continue;
    }
    const temporaryPath = path.join(directory, name);
    const stat = fileSystem.lstatSync(temporaryPath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      stat.uid !== currentUserId() ||
      !hasOwnerOnlyMode(stat)
    ) {
      throw new Error(
        'Local training failure recovery atomic record staging is unsafe.',
      );
    }
    fileSystem.unlinkSync(temporaryPath);
    removed = true;
  }
  if (removed) {
    fsyncDirectory(fileSystem, directory);
  }
}

function repairLinkedAtomicRecord(fileSystem, filePath) {
  let finalStat;
  try {
    finalStat = fileSystem.lstatSync(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  if (finalStat.nlink === 1) {
    return;
  }
  if (
    !finalStat.isFile() ||
    finalStat.isSymbolicLink() ||
    finalStat.nlink !== 2 ||
    finalStat.uid !== currentUserId() ||
    !hasOwnerOnlyMode(finalStat)
  ) {
    throw new Error(
      'Local training failure recovery atomic record link is unsafe.',
    );
  }
  const directory = path.dirname(filePath);
  const prefix = atomicTempPrefix(filePath);
  const matchingTemps = fileSystem.readdirSync(directory)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.tmp'))
    .map((name) => path.join(directory, name))
    .filter((temporaryPath) => {
      const stat = fileSystem.lstatSync(temporaryPath);
      return stat.isFile() &&
        !stat.isSymbolicLink() &&
        stat.uid === currentUserId() &&
        hasOwnerOnlyMode(stat) &&
        sameIdentity(rootIdentity(stat), rootIdentity(finalStat));
    });
  if (matchingTemps.length !== 1) {
    throw new Error(
      'Local training failure recovery atomic record cannot be repaired safely.',
    );
  }
  fileSystem.unlinkSync(matchingTemps[0]);
  fsyncDirectory(fileSystem, directory);
}

function writeAtomicExclusiveJson(fileSystem, filePath, value) {
  removeOrphanAtomicTemps(fileSystem, filePath);
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `${atomicTempPrefix(filePath)}${process.pid}-${randomBytes(12).toString('hex')}.tmp`,
  );
  writeExclusiveJson(fileSystem, temporaryPath, value);
  try {
    fileSystem.linkSync(temporaryPath, filePath);
    fileSystem.unlinkSync(temporaryPath);
    fsyncDirectory(fileSystem, directory);
  } catch (error) {
    try {
      if (fileSystem.existsSync(temporaryPath)) {
        fileSystem.unlinkSync(temporaryPath);
        fsyncDirectory(fileSystem, directory);
      }
    } catch {
      // The repair path validates and removes only the matching private link.
    }
    throw error;
  }
}

function readAtomicRecord(fileSystem, filePath, fieldName) {
  repairLinkedAtomicRecord(fileSystem, filePath);
  return readJsonRecord(fileSystem, filePath, fieldName);
}

function removeOrphanOperationTemps(recoveryRoot, operationId) {
  const prefix = `.${operationId}-`;
  for (const name of fs.readdirSync(recoveryRoot)) {
    if (!name.startsWith(prefix) || !name.endsWith('.tmp')) {
      continue;
    }
    const temporaryRoot = path.join(recoveryRoot, name);
    const rootStat = fs.lstatSync(temporaryRoot);
    if (
      !rootStat.isDirectory() ||
      rootStat.isSymbolicLink() ||
      rootStat.uid !== currentUserId() ||
      !hasOwnerOnlyMode(rootStat)
    ) {
      throw new Error(
        'Local training failure recovery operation staging is unsafe.',
      );
    }
    const entries = fs.readdirSync(temporaryRoot);
    if (
      entries.length > 2 ||
      entries.some((entry) => ![INTENT_FILE, STATE_FILE].includes(entry))
    ) {
      throw new Error(
        'Local training failure recovery operation staging is unexpected.',
      );
    }
    for (const entry of entries) {
      const filePath = path.join(temporaryRoot, entry);
      const stat = fs.lstatSync(filePath);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.nlink !== 1 ||
        stat.uid !== currentUserId() ||
        !hasOwnerOnlyMode(stat)
      ) {
        throw new Error(
          'Local training failure recovery staged operation record is unsafe.',
        );
      }
      fs.unlinkSync(filePath);
    }
    fs.rmdirSync(temporaryRoot);
    fsyncDirectory(fs, recoveryRoot);
  }
}

function readJsonRecord(fileSystem, filePath, fieldName) {
  let stat;
  try {
    stat = fileSystem.lstatSync(filePath);
  } catch {
    throw new Error(
      `Local training failure recovery ${fieldName} is missing.`,
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.uid !== currentUserId() ||
    !hasOwnerOnlyMode(stat) ||
    stat.size <= 0 ||
    stat.size > MAX_RECORD_BYTES
  ) {
    throw new Error(
      `Local training failure recovery ${fieldName} is unsafe.`,
    );
  }
  try {
    return JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(
      `Local training failure recovery ${fieldName} must contain valid JSON.`,
    );
  }
}

function resolveBootIdentity() {
  try {
    const identity = assertLocalCandidateEvaluationHostBootIdentity(
      readLocalCandidateEvaluationHostBootIdentity(),
    );
    return identity.available ? identity.identityHash : null;
  } catch {
    return null;
  }
}

function assertBindings(bindings) {
  if (
    !hasExactKeys(bindings, [
      'acquisitionVerification',
      'approval',
      'contractHash',
      'dataset',
      'maxDiskBytes',
      'permission',
      'postAcquisitionReadiness',
      'rollbackOwner',
    ]) ||
    !isSha256(bindings.contractHash)
  ) {
    throw new Error(
      'Local training failure recovery bindings failed integrity.',
    );
  }
  return {
    acquisitionVerification: requireHashReference(
      bindings.acquisitionVerification,
      'acquisitionVerification',
    ),
    approval: requireHashReference(bindings.approval, 'approval'),
    contractHash: bindings.contractHash,
    dataset: requireDatasetBinding(bindings.dataset),
    maxDiskBytes: requirePositiveInteger(
      bindings.maxDiskBytes,
      'maxDiskBytes',
    ),
    permission: requireHashReference(bindings.permission, 'permission'),
    postAcquisitionReadiness: requireHashReference(
      bindings.postAcquisitionReadiness,
      'postAcquisitionReadiness',
    ),
    rollbackOwner: requireSafeText(bindings.rollbackOwner, 'rollbackOwner'),
  };
}

function operationIdFor(bindings) {
  return `local-training-recovery-${hashRecord({
    acquisitionVerificationHash:
      bindings.acquisitionVerification.hash,
    approvalHash: bindings.approval.hash,
    contractHash: bindings.contractHash,
    postAcquisitionReadinessHash:
      bindings.postAcquisitionReadiness.hash,
  })}`;
}

export function deriveLocalTrainingFailureRecoveryOperationId(
  bindings,
) {
  return operationIdFor(assertBindings(bindings));
}

function operationIdForIntent(intent) {
  return `local-training-recovery-${hashRecord({
    acquisitionVerificationHash:
      intent.acquisitionVerification.hash,
    approvalHash: intent.approval.hash,
    contractHash: intent.contractHash,
    postAcquisitionReadinessHash:
      intent.postAcquisitionReadiness.hash,
  })}`;
}

function operationPaths(repoRoot, operationId) {
  const recoveryRoot = path.join(repoRoot, RECOVERY_ROOT);
  const operationRoot = path.join(recoveryRoot, operationId);
  return {
    claim: path.join(operationRoot, CLAIM_FILE),
    intent: path.join(operationRoot, INTENT_FILE),
    operationRoot,
    receipt: path.join(operationRoot, RECEIPT_FILE),
    recoveryRoot,
    state: path.join(operationRoot, STATE_FILE),
  };
}

function buildIntent({
  bindings,
  candidateRoot,
  leaseExpiresAt,
  operationId,
  startedAt,
  workspaceRoot,
}) {
  const workspaceRelativePath = requireRelativePath(
    path.relative(path.dirname(path.dirname(workspaceRoot)), workspaceRoot)
      .split(path.sep)
      .join('/'),
    'workspace relative path',
  );
  const candidateRelativePath = requireRelativePath(
    path.relative(path.dirname(path.dirname(candidateRoot)), candidateRoot)
      .split(path.sep)
      .join('/'),
    'candidate relative path',
  );
  const workspaceStat = fs.lstatSync(workspaceRoot);
  const content = {
    acquisitionVerification: bindings.acquisitionVerification,
    actualModelTrainingExecuted: false,
    approval: bindings.approval,
    candidate: {
      basename: path.basename(candidateRoot),
      pathHash: sha256(candidateRelativePath),
    },
    contractHash: bindings.contractHash,
    createdAt: startedAt,
    dataset: bindings.dataset,
    leaseExpiresAt,
    maxDiskBytes: bindings.maxDiskBytes,
    operationId,
    owner: {
      bootIdentityHash: resolveBootIdentity(),
      processId: process.pid,
      userId: currentUserId(),
    },
    permission: bindings.permission,
    postAcquisitionReadiness:
      bindings.postAcquisitionReadiness,
    productionReadyClaim: false,
    rollbackOwner: bindings.rollbackOwner,
    schemaVersion:
      LOCAL_TRAINING_FAILURE_RECOVERY_INTENT_SCHEMA_VERSION,
    trainingAuthorized: false,
    workspace: {
      basename: path.basename(workspaceRoot),
      pathHash: sha256(workspaceRelativePath),
      rootIdentity: rootIdentity(workspaceStat),
    },
  };
  return {
    ...content,
    intentHash: hashRecord(content),
  };
}

export function assertLocalTrainingFailureRecoveryIntent(intent) {
  const { intentHash, ...content } = intent || {};
  if (
    !hasExactKeys(content, [
      'acquisitionVerification',
      'actualModelTrainingExecuted',
      'approval',
      'candidate',
      'contractHash',
      'createdAt',
      'dataset',
      'leaseExpiresAt',
      'maxDiskBytes',
      'operationId',
      'owner',
      'permission',
      'postAcquisitionReadiness',
      'productionReadyClaim',
      'rollbackOwner',
      'schemaVersion',
      'trainingAuthorized',
      'workspace',
    ]) ||
    content.schemaVersion !==
      LOCAL_TRAINING_FAILURE_RECOVERY_INTENT_SCHEMA_VERSION ||
    !/^local-training-recovery-[a-f0-9]{64}$/u.test(content.operationId) ||
    content.actualModelTrainingExecuted !== false ||
    content.trainingAuthorized !== false ||
    content.productionReadyClaim !== false ||
    !isSha256(content.contractHash) ||
    !Number.isFinite(Date.parse(content.createdAt)) ||
    !Number.isFinite(Date.parse(content.leaseExpiresAt)) ||
    Date.parse(content.createdAt) >= Date.parse(content.leaseExpiresAt) ||
    !Number.isSafeInteger(content.maxDiskBytes) ||
    content.maxDiskBytes <= 0 ||
    !hasExactKeys(content.candidate, ['basename', 'pathHash']) ||
    !isSha256(content.candidate.pathHash) ||
    !hasExactKeys(content.workspace, [
      'basename',
      'pathHash',
      'rootIdentity',
    ]) ||
    !isSha256(content.workspace.pathHash) ||
    !hasExactKeys(content.owner, [
      'bootIdentityHash',
      'processId',
      'userId',
    ]) ||
    (content.owner.bootIdentityHash !== null &&
      !isSha256(content.owner.bootIdentityHash)) ||
    !Number.isSafeInteger(content.owner.processId) ||
    content.owner.processId <= 0 ||
    !Number.isSafeInteger(content.owner.userId) ||
    content.owner.userId < 0 ||
    intentHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local training failure recovery intent failed integrity.',
    );
  }
  requireHashReference(content.acquisitionVerification, 'acquisitionVerification');
  requireHashReference(content.approval, 'approval');
  requireHashReference(content.permission, 'permission');
  requireHashReference(
    content.postAcquisitionReadiness,
    'postAcquisitionReadiness',
  );
  requireDatasetBinding(content.dataset);
  requireSafeText(content.rollbackOwner, 'rollbackOwner');
  requireSafeText(content.candidate.basename, 'candidate.basename');
  requireSafeText(content.workspace.basename, 'workspace.basename');
  requireRootIdentity(content.workspace.rootIdentity, 'workspace.rootIdentity');
  if (
    content.operationId !== operationIdForIntent(content) ||
    content.candidate.basename !== content.approval.id ||
    !/^mlx-lm-lora-[A-Za-z0-9]{6}$/u.test(
      content.workspace.basename,
    ) ||
    content.candidate.pathHash !== sha256(
      `candidates/${content.candidate.basename}`,
    ) ||
    content.workspace.pathHash !== sha256(
      `workspaces/${content.workspace.basename}`,
    )
  ) {
    throw new Error(
      'Local training failure recovery intent path binding failed.',
    );
  }
  return intent;
}

function buildState({
  candidateBinding = null,
  failureCode = null,
  operationId,
  phase,
  revision,
  updatedAt,
}) {
  const content = {
    candidateBinding,
    failureCode,
    operationId,
    phase,
    revision,
    schemaVersion:
      LOCAL_TRAINING_FAILURE_RECOVERY_STATE_SCHEMA_VERSION,
    updatedAt,
  };
  return {
    ...content,
    stateHash: hashRecord(content),
  };
}

export function assertLocalTrainingFailureRecoveryState(state) {
  const { stateHash, ...content } = state || {};
  const candidateBinding = content.candidateBinding;
  if (
    !hasExactKeys(content, [
      'candidateBinding',
      'failureCode',
      'operationId',
      'phase',
      'revision',
      'schemaVersion',
      'updatedAt',
    ]) ||
    content.schemaVersion !==
      LOCAL_TRAINING_FAILURE_RECOVERY_STATE_SCHEMA_VERSION ||
    !/^local-training-recovery-[a-f0-9]{64}$/u.test(content.operationId) ||
    !ALLOWED_PHASES.has(content.phase) ||
    !Number.isSafeInteger(content.revision) ||
    content.revision < 1 ||
    !Number.isFinite(Date.parse(content.updatedAt)) ||
    (content.failureCode !== null &&
      !ALLOWED_FAILURE_CODES.has(content.failureCode)) ||
    (candidateBinding !== null &&
      (!hasExactKeys(candidateBinding, [
        'manifestHash',
        'rootIdentity',
      ]) ||
        !isSha256(candidateBinding.manifestHash))) ||
    stateHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local training failure recovery state failed integrity.',
    );
  }
  if (candidateBinding !== null) {
    requireRootIdentity(
      candidateBinding.rootIdentity,
      'candidateBinding.rootIdentity',
    );
  }
  if (
    [
      'publish-intent',
      'published',
      'success-cleanup-pending',
      'candidate-removal-pending',
    ].includes(content.phase) &&
    candidateBinding === null
  ) {
    throw new Error(
      'Local training failure recovery state is missing candidate binding.',
    );
  }
  return state;
}

function readOperation(repoRoot, operationId) {
  const paths = operationPaths(repoRoot, operationId);
  const intent = assertLocalTrainingFailureRecoveryIntent(
    readJsonRecord(fs, paths.intent, 'intent'),
  );
  const state = assertLocalTrainingFailureRecoveryState(
    readJsonRecord(fs, paths.state, 'state'),
  );
  if (
    intent.operationId !== operationId ||
    state.operationId !== operationId ||
    intent.owner.userId !== currentUserId()
  ) {
    throw new Error(
      'Local training failure recovery operation binding failed.',
    );
  }
  return { intent, paths, state };
}

function transition(operation, {
  candidateBinding = operation.state.candidateBinding,
  failureCode = operation.state.failureCode,
  phase,
  updatedAt,
}) {
  const normalizedUpdatedAt = requireTimestamp(updatedAt, 'updatedAt');
  if (Date.parse(normalizedUpdatedAt) < Date.parse(operation.state.updatedAt)) {
    throw new Error(
      'Local training failure recovery state cannot move backwards in time.',
    );
  }
  const next = buildState({
    candidateBinding,
    failureCode,
    operationId: operation.intent.operationId,
    phase,
    revision: operation.state.revision + 1,
    updatedAt: normalizedUpdatedAt,
  });
  assertLocalTrainingFailureRecoveryState(next);
  writeAtomicJson(fs, operation.paths.state, next);
  operation.state = next;
  return next;
}

function captureTree(root, parent, maxBytes) {
  const owner = currentUserId();
  const canonicalParent = requireDirectory(
    fs,
    parent,
    null,
    'tree parent',
  ).canonical;
  const rootDirectory = requireDirectory(
    fs,
    root,
    canonicalParent,
    'tree root',
  );
  if (
    rootDirectory.stat.uid !== owner ||
    !hasOwnerOnlyMode(rootDirectory.stat)
  ) {
    throw new Error(
      'Local training failure recovery tree root is not owner-only.',
    );
  }
  const nodes = [];
  let totalBytes = 0;
  function visit(current, depth) {
    if (depth > MAX_TREE_DEPTH) {
      throw new Error(
        'Local training failure recovery tree exceeded its depth boundary.',
      );
    }
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const candidate = path.join(current, entry.name);
      const stat = fs.lstatSync(candidate);
      if (
        stat.isSymbolicLink() ||
        stat.uid !== owner ||
        !hasOwnerOnlyMode(stat)
      ) {
        throw new Error(
          'Local training failure recovery tree contains an unsafe entry.',
        );
      }
      if (stat.isDirectory()) {
        visit(candidate, depth + 1);
        nodes.push({
          identity: rootIdentity(stat),
          kind: 'directory',
          path: candidate,
        });
      } else if (stat.isFile() && stat.nlink === 1) {
        totalBytes += stat.size;
        nodes.push({
          identity: rootIdentity(stat),
          kind: 'file',
          path: candidate,
        });
      } else {
        throw new Error(
          'Local training failure recovery tree accepts only unlinked regular entries.',
        );
      }
      if (nodes.length > MAX_TREE_ENTRIES || totalBytes > maxBytes) {
        throw new Error(
          'Local training failure recovery tree exceeded its resource boundary.',
        );
      }
    }
  }
  visit(rootDirectory.canonical, 0);
  nodes.push({
    identity: rootIdentity(rootDirectory.stat),
    kind: 'directory',
    path: rootDirectory.canonical,
  });
  return {
    nodes,
    rootIdentity: rootIdentity(rootDirectory.stat),
    rootPath: rootDirectory.canonical,
  };
}

function fsyncCapturedTree(tree) {
  for (const node of tree.nodes) {
    const descriptor = fs.openSync(node.path, 'r');
    try {
      const current = fs.fstatSync(descriptor);
      const currentKind = current.isDirectory()
        ? 'directory'
        : current.isFile() && current.nlink === 1
          ? 'file'
          : 'unsafe';
      if (
        current.uid !== currentUserId() ||
        !hasOwnerOnlyMode(current) ||
        currentKind !== node.kind ||
        !sameIdentity(rootIdentity(current), node.identity)
      ) {
        throw new Error(
          'Local training failure recovery tree changed before durable publish.',
        );
      }
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  }
}

function hashBoundCandidateManifest(candidateRoot, maxBytes) {
  const manifestPath = path.join(
    candidateRoot,
    'candidate-manifest.json',
  );
  const before = fs.lstatSync(manifestPath);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    before.uid !== currentUserId() ||
    !hasOwnerOnlyMode(before) ||
    before.size <= 0 ||
    before.size > maxBytes
  ) {
    throw new Error(
      'Local training failure recovery candidate manifest is unsafe.',
    );
  }
  const descriptor = fs.openSync(manifestPath, 'r');
  try {
    const opened = fs.fstatSync(descriptor);
    if (!sameIdentity(rootIdentity(opened), rootIdentity(before))) {
      throw new Error(
        'Local training failure recovery candidate manifest identity drifted.',
      );
    }
    const content = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (
      !sameIdentity(rootIdentity(after), rootIdentity(before)) ||
      content.length !== before.size
    ) {
      throw new Error(
        'Local training failure recovery candidate manifest changed while reading.',
      );
    }
    return sha256(content);
  } finally {
    fs.closeSync(descriptor);
  }
}

function removeBoundTree({
  basename,
  expectedIdentity,
  maxBytes,
  parent,
}) {
  requireSafeText(basename, 'tree basename');
  const root = path.join(parent, basename);
  try {
    fs.lstatSync(root);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    assertBoundTreeNotRelocated(parent, expectedIdentity);
    return false;
  }
  const tree = captureTree(root, parent, maxBytes);
  if (!sameIdentity(tree.rootIdentity, expectedIdentity)) {
    throw new Error(
      'Local training failure recovery tree root identity drifted.',
    );
  }
  for (const node of tree.nodes) {
    const current = fs.lstatSync(node.path);
    const currentKind = current.isDirectory()
      ? 'directory'
      : current.isFile() && !current.isSymbolicLink() && current.nlink === 1
        ? 'file'
        : 'unsafe';
    if (
      current.uid !== currentUserId() ||
      !hasOwnerOnlyMode(current) ||
      currentKind !== node.kind ||
      !sameIdentity(rootIdentity(current), node.identity)
    ) {
      throw new Error(
        'Local training failure recovery tree changed during cleanup.',
      );
    }
    if (node.kind === 'file') {
      fs.unlinkSync(node.path);
    } else {
      fs.rmdirSync(node.path);
    }
    fsyncDirectory(fs, path.dirname(node.path));
  }
  return true;
}

function assertBoundTreeNotRelocated(parent, expectedIdentity) {
  fsyncDirectory(fs, parent);
  const entries = fs.readdirSync(parent);
  if (entries.length > MAX_TREE_ENTRIES) {
    throw new Error(
      'Local training failure recovery tree parent exceeded its inspection boundary.',
    );
  }
  const relocated = entries.some((entry) => {
    const stat = fs.lstatSync(path.join(parent, entry));
    return sameIdentity(rootIdentity(stat), expectedIdentity);
  });
  if (relocated) {
    throw new Error(
      'Local training failure recovery bound tree was relocated.',
    );
  }
}

function resolveCleanupCandidateBinding(operation) {
  if (operation.state.phase !== 'publish-intent') {
    return operation.state.candidateBinding;
  }
  const candidateParent = path.join(
    operation.repoRoot,
    CANDIDATE_ROOT,
  );
  const candidateRoot = path.join(
    candidateParent,
    operation.intent.candidate.basename,
  );
  if (!hasPathEntry(candidateRoot)) {
    assertBoundTreeNotRelocated(
      candidateParent,
      operation.state.candidateBinding.rootIdentity,
    );
    return null;
  }
  const candidate = captureTree(
    candidateRoot,
    candidateParent,
    operation.intent.maxDiskBytes,
  );
  if (
    !sameIdentity(
      candidate.rootIdentity,
      operation.state.candidateBinding.rootIdentity,
    ) ||
    hashBoundCandidateManifest(
      candidate.rootPath,
      operation.intent.maxDiskBytes,
    ) !== operation.state.candidateBinding.manifestHash
  ) {
    throw new Error(
      'Local training failure recovery publish-intent candidate drifted.',
    );
  }
  return operation.state.candidateBinding;
}

function buildReceipt({
  candidatePreserved,
  cleanupRequestHash,
  completedAt,
  operationId,
  status,
}) {
  const content = {
    actualModelTrainingExecuted: false,
    candidatePreserved,
    cleanupRequestHash,
    completedAt,
    externalProviderCalls: 'none',
    operationId,
    productionReadyClaim: false,
    rolloutAuthorized: false,
    schemaVersion:
      LOCAL_TRAINING_FAILURE_RECOVERY_RECEIPT_SCHEMA_VERSION,
    status,
    trainingAuthorized: false,
    workspaceRemoved: true,
  };
  return {
    ...content,
    receiptHash: hashRecord(content),
  };
}

export function assertLocalTrainingFailureRecoveryReceipt(receipt) {
  const { receiptHash, ...content } = receipt || {};
  if (
    !hasExactKeys(content, [
      'actualModelTrainingExecuted',
      'candidatePreserved',
      'cleanupRequestHash',
      'completedAt',
      'externalProviderCalls',
      'operationId',
      'productionReadyClaim',
      'rolloutAuthorized',
      'schemaVersion',
      'status',
      'trainingAuthorized',
      'workspaceRemoved',
    ]) ||
    content.schemaVersion !==
      LOCAL_TRAINING_FAILURE_RECOVERY_RECEIPT_SCHEMA_VERSION ||
    !['failed-cleaned', 'succeeded'].includes(content.status) ||
    typeof content.candidatePreserved !== 'boolean' ||
    content.workspaceRemoved !== true ||
    content.actualModelTrainingExecuted !== false ||
    content.trainingAuthorized !== false ||
    content.rolloutAuthorized !== false ||
    content.productionReadyClaim !== false ||
    content.externalProviderCalls !== 'none' ||
    !Number.isFinite(Date.parse(content.completedAt)) ||
    !/^local-training-recovery-[a-f0-9]{64}$/u.test(
      content.operationId,
    ) ||
    (content.cleanupRequestHash !== null &&
      !isSha256(content.cleanupRequestHash)) ||
    receiptHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local training failure recovery receipt failed integrity.',
    );
  }
  if (
    (content.status === 'succeeded') !== content.candidatePreserved
  ) {
    throw new Error(
      'Local training failure recovery receipt candidate disposition failed.',
    );
  }
  return receipt;
}

function writeReceipt(operation, receipt) {
  assertLocalTrainingFailureRecoveryReceipt(receipt);
  try {
    writeAtomicExclusiveJson(fs, operation.paths.receipt, receipt);
  } catch (error) {
    try {
      if (hasPathEntry(operation.paths.receipt)) {
        const published = assertLocalTrainingFailureRecoveryReceipt(
          readAtomicRecord(fs, operation.paths.receipt, 'receipt'),
        );
        if (published.receiptHash === receipt.receiptHash) {
          fsyncDirectory(fs, operation.paths.operationRoot);
          return published;
        }
      }
    } catch {
      // The original publication failure remains the actionable error.
    }
    throw error;
  }
  return receipt;
}

function cleanupOperation(operation, {
  cleanupRequestHash = null,
  completedAt,
  failureCode,
}) {
  if (![
    'workspace-removed',
    'candidate-removal-pending',
    'candidate-removed',
  ].includes(operation.state.phase)) {
    if (operation.state.phase === 'success-cleanup-pending') {
      transition(operation, {
        failureCode,
        phase: 'cleanup-pending',
        updatedAt: completedAt,
      });
    } else if (operation.state.phase !== 'cleanup-pending') {
      const candidateBinding =
        resolveCleanupCandidateBinding(operation);
      const workspace = captureTree(
        path.join(
          operation.repoRoot,
          WORKSPACE_ROOT,
          operation.intent.workspace.basename,
        ),
        path.join(operation.repoRoot, WORKSPACE_ROOT),
        operation.intent.maxDiskBytes,
      );
      if (!sameIdentity(
        workspace.rootIdentity,
        operation.intent.workspace.rootIdentity,
      )) {
        throw new Error(
          'Local training failure recovery workspace identity drifted before cleanup.',
        );
      }
      transition(operation, {
        candidateBinding,
        failureCode,
        phase: 'cleanup-pending',
        updatedAt: completedAt,
      });
    }
    removeBoundTree({
      basename: operation.intent.workspace.basename,
      expectedIdentity: operation.intent.workspace.rootIdentity,
      maxBytes: operation.intent.maxDiskBytes,
      parent: path.join(operation.repoRoot, WORKSPACE_ROOT),
    });
    transition(operation, {
      failureCode,
      phase: 'workspace-removed',
      updatedAt: completedAt,
    });
  }
  if (operation.state.phase !== 'candidate-removed') {
    const candidateRoot = path.join(
      operation.repoRoot,
      CANDIDATE_ROOT,
      operation.intent.candidate.basename,
    );
    if (
      operation.state.candidateBinding &&
      operation.state.phase !== 'candidate-removal-pending'
    ) {
      const candidate = captureTree(
        candidateRoot,
        path.join(operation.repoRoot, CANDIDATE_ROOT),
        operation.intent.maxDiskBytes,
      );
      if (!sameIdentity(
        candidate.rootIdentity,
        operation.state.candidateBinding.rootIdentity,
      )) {
        throw new Error(
          'Local training failure recovery candidate identity drifted before cleanup.',
        );
      }
      transition(operation, {
        failureCode,
        phase: 'candidate-removal-pending',
        updatedAt: completedAt,
      });
    }
    if (operation.state.candidateBinding) {
      removeBoundTree({
        basename: operation.intent.candidate.basename,
        expectedIdentity:
          operation.state.candidateBinding.rootIdentity,
        maxBytes: operation.intent.maxDiskBytes,
        parent: path.join(operation.repoRoot, CANDIDATE_ROOT),
      });
    } else {
      try {
        fs.lstatSync(candidateRoot);
        throw new Error(
          'Local training failure recovery refuses an unbound candidate.',
        );
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    transition(operation, {
      failureCode,
      phase: 'candidate-removed',
      updatedAt: completedAt,
    });
  }
  return writeReceipt(operation, buildReceipt({
    candidatePreserved: false,
    cleanupRequestHash,
    completedAt,
    operationId: operation.intent.operationId,
    status: 'failed-cleaned',
  }));
}

export function openLocalTrainingFailureRecovery({
  bindings,
  candidateRoot,
  leaseExpiresAt,
  repoDir,
  startedAt,
  workspaceRoot,
} = {}) {
  const normalizedBindings = assertBindings(bindings);
  const normalizedStartedAt = requireTimestamp(startedAt, 'startedAt');
  const normalizedLeaseExpiresAt = requireTimestamp(
    leaseExpiresAt,
    'leaseExpiresAt',
  );
  if (
    Date.parse(normalizedStartedAt) >=
      Date.parse(normalizedLeaseExpiresAt)
  ) {
    throw new Error(
      'Local training failure recovery lease must expire after start.',
    );
  }
  const repoRoot = requireDirectory(
    fs,
    path.resolve(repoDir),
    null,
    'repoDir',
  ).canonical;
  const workspaceParent = requireDirectory(
    fs,
    path.join(repoRoot, WORKSPACE_ROOT),
    repoRoot,
    'workspace parent',
  ).canonical;
  const candidateParent = requireDirectory(
    fs,
    path.join(repoRoot, CANDIDATE_ROOT),
    repoRoot,
    'candidate parent',
  ).canonical;
  const workspace = requireDirectory(
    fs,
    workspaceRoot,
    workspaceParent,
    'workspace root',
  );
  fsyncDirectory(fs, workspaceParent);
  const candidateBasename = path.basename(path.resolve(candidateRoot));
  const requestedCandidateParent = requireDirectory(
    fs,
    path.dirname(path.resolve(candidateRoot)),
    repoRoot,
    'candidate parent',
  ).canonical;
  const requestedCandidateRoot = path.join(
    requestedCandidateParent,
    candidateBasename,
  );
  if (
    requestedCandidateParent !== candidateParent ||
    candidateBasename !==
      normalizedBindings.approval.id ||
    hasPathEntry(requestedCandidateRoot)
  ) {
    throw new Error(
      'Local training failure recovery candidate root must be unused and fixed.',
    );
  }
  const operationId = operationIdFor(normalizedBindings);
  const recoveryRoot = ensurePrivateDirectory(
    fs,
    repoRoot,
    RECOVERY_ROOT,
  );
  const paths = operationPaths(repoRoot, operationId);
  removeOrphanOperationTemps(recoveryRoot, operationId);
  if (paths.recoveryRoot !== recoveryRoot || hasPathEntry(paths.operationRoot)) {
    throw new Error(
      'Local training failure recovery operation already exists.',
    );
  }
  const intent = buildIntent({
    bindings: normalizedBindings,
    candidateRoot: requestedCandidateRoot,
    leaseExpiresAt: normalizedLeaseExpiresAt,
    operationId,
    startedAt: normalizedStartedAt,
    workspaceRoot: workspace.canonical,
  });
  assertLocalTrainingFailureRecoveryIntent(intent);
  const state = buildState({
    operationId,
    phase: 'preparing',
    revision: 1,
    updatedAt: normalizedStartedAt,
  });
  const temporaryRoot = path.join(
    recoveryRoot,
    `.${operationId}-${randomBytes(12).toString('hex')}.tmp`,
  );
  const temporaryIntent = path.join(temporaryRoot, INTENT_FILE);
  const temporaryState = path.join(temporaryRoot, STATE_FILE);
  try {
    fs.mkdirSync(temporaryRoot, { mode: 0o700 });
    fs.chmodSync(temporaryRoot, 0o700);
    writeExclusiveJson(fs, temporaryIntent, intent);
    writeExclusiveJson(fs, temporaryState, state);
    fsyncDirectory(fs, temporaryRoot);
    fs.renameSync(temporaryRoot, paths.operationRoot);
    fsyncDirectory(fs, recoveryRoot);
  } catch (error) {
    try {
      if (hasPathEntry(paths.operationRoot)) {
        const publishedIntent = assertLocalTrainingFailureRecoveryIntent(
          readJsonRecord(fs, paths.intent, 'intent'),
        );
        const publishedState = assertLocalTrainingFailureRecoveryState(
          readJsonRecord(fs, paths.state, 'state'),
        );
        if (
          publishedIntent.intentHash === intent.intentHash &&
          publishedState.stateHash === state.stateHash
        ) {
          fsyncDirectory(fs, recoveryRoot);
        } else {
          throw error;
        }
      } else {
        removeOrphanOperationTemps(recoveryRoot, operationId);
        throw error;
      }
    } catch {
      throw error;
    }
  }
  const operation = Object.freeze({ operationId });
  OPERATION_STATES.set(operation, {
    intent,
    paths,
    repoRoot,
    state,
  });
  return operation;
}

function requireOperation(operation) {
  const value = OPERATION_STATES.get(operation);
  if (!value) {
    throw new Error(
      'Local training failure recovery requires a module-issued operation.',
    );
  }
  return value;
}

export function markLocalTrainingFailureRecoveryPublishIntent(
  operation,
  { candidateManifestHash, stagedCandidateRoot, updatedAt } = {},
) {
  const value = requireOperation(operation);
  if (value.state.phase !== 'preparing' || !isSha256(candidateManifestHash)) {
    throw new Error(
      'Local training failure recovery publish intent is invalid.',
    );
  }
  const staged = captureTree(
    stagedCandidateRoot,
    path.join(
      value.repoRoot,
      WORKSPACE_ROOT,
      value.intent.workspace.basename,
    ),
    value.intent.maxDiskBytes,
  );
  if (
    hashBoundCandidateManifest(
      staged.rootPath,
      value.intent.maxDiskBytes,
    ) !== candidateManifestHash
  ) {
    throw new Error(
      'Local training failure recovery candidate manifest hash drifted.',
    );
  }
  fsyncCapturedTree(staged);
  return transition(value, {
    candidateBinding: {
      manifestHash: candidateManifestHash,
      rootIdentity: staged.rootIdentity,
    },
    phase: 'publish-intent',
    updatedAt,
  });
}

export function markLocalTrainingFailureRecoveryPublished(
  operation,
  { candidateRoot, updatedAt } = {},
) {
  const value = requireOperation(operation);
  if (value.state.phase !== 'publish-intent') {
    throw new Error(
      'Local training failure recovery publish transition is invalid.',
    );
  }
  const expectedCandidateRoot = path.join(
    value.repoRoot,
    CANDIDATE_ROOT,
    value.intent.candidate.basename,
  );
  const published = captureTree(
    candidateRoot,
    path.join(value.repoRoot, CANDIDATE_ROOT),
    value.intent.maxDiskBytes,
  );
  if (published.rootPath !== expectedCandidateRoot) {
    throw new Error(
      'Local training failure recovery published candidate path drifted.',
    );
  }
  fsyncDirectory(fs, path.join(value.repoRoot, CANDIDATE_ROOT));
  fsyncDirectory(
    fs,
    path.join(
      value.repoRoot,
      WORKSPACE_ROOT,
      value.intent.workspace.basename,
    ),
  );
  if (!sameIdentity(
    published.rootIdentity,
    value.state.candidateBinding.rootIdentity,
  )) {
    throw new Error(
      'Local training failure recovery published candidate identity drifted.',
    );
  }
  if (
    hashBoundCandidateManifest(
      published.rootPath,
      value.intent.maxDiskBytes,
    ) !== value.state.candidateBinding.manifestHash
  ) {
    throw new Error(
      'Local training failure recovery published manifest hash drifted.',
    );
  }
  return transition(value, {
    phase: 'published',
    updatedAt,
  });
}

export function commitLocalTrainingFailureRecovery(
  operation,
  { completedAt } = {},
) {
  const value = requireOperation(operation);
  const normalizedCompletedAt = requireTimestamp(
    completedAt,
    'completedAt',
  );
  if (hasPathEntry(value.paths.receipt)) {
    const receipt = assertLocalTrainingFailureRecoveryReceipt(
      readAtomicRecord(fs, value.paths.receipt, 'receipt'),
    );
    if (
      receipt.operationId !== value.intent.operationId ||
      receipt.status !== 'succeeded' ||
      receipt.cleanupRequestHash !== null
    ) {
      throw new Error(
        'Local training failure recovery terminal receipt does not match the operation.',
      );
    }
    return receipt;
  }
  if (
    ![
      'published',
      'success-cleanup-pending',
      'workspace-removed',
    ].includes(value.state.phase) ||
    value.state.failureCode !== null
  ) {
    throw new Error(
      'Local training failure recovery cannot commit an incomplete operation.',
    );
  }
  const candidateRoot = path.join(
    value.repoRoot,
    CANDIDATE_ROOT,
    value.intent.candidate.basename,
  );
  const candidate = captureTree(
    candidateRoot,
    path.join(value.repoRoot, CANDIDATE_ROOT),
    value.intent.maxDiskBytes,
  );
  if (
    !sameIdentity(
      candidate.rootIdentity,
      value.state.candidateBinding.rootIdentity,
    ) ||
    hashBoundCandidateManifest(
      candidate.rootPath,
      value.intent.maxDiskBytes,
    ) !== value.state.candidateBinding.manifestHash
  ) {
    throw new Error(
      'Local training failure recovery candidate changed before commit.',
    );
  }
  if (value.state.phase === 'published') {
    const workspace = captureTree(
      path.join(
        value.repoRoot,
        WORKSPACE_ROOT,
        value.intent.workspace.basename,
      ),
      path.join(value.repoRoot, WORKSPACE_ROOT),
      value.intent.maxDiskBytes,
    );
    if (!sameIdentity(
      workspace.rootIdentity,
      value.intent.workspace.rootIdentity,
    )) {
      throw new Error(
        'Local training failure recovery workspace changed before successful cleanup.',
      );
    }
    transition(value, {
      phase: 'success-cleanup-pending',
      updatedAt: normalizedCompletedAt,
    });
  }
  if (value.state.phase === 'success-cleanup-pending') {
    removeBoundTree({
      basename: value.intent.workspace.basename,
      expectedIdentity: value.intent.workspace.rootIdentity,
      maxBytes: value.intent.maxDiskBytes,
      parent: path.join(value.repoRoot, WORKSPACE_ROOT),
    });
    transition(value, {
      phase: 'workspace-removed',
      updatedAt: normalizedCompletedAt,
    });
  }
  return writeReceipt(value, buildReceipt({
    candidatePreserved: true,
    cleanupRequestHash: null,
    completedAt: normalizedCompletedAt,
    operationId: value.intent.operationId,
    status: 'succeeded',
  }));
}

export function cleanupLocalTrainingFailureRecovery(
  operation,
  { completedAt, failureCode = 'adapter-execution-failed' } = {},
) {
  const value = requireOperation(operation);
  if (!ALLOWED_FAILURE_CODES.has(failureCode)) {
    throw new Error(
      'Local training failure recovery failure code is unsupported.',
    );
  }
  if (hasPathEntry(value.paths.receipt)) {
    const receipt = assertLocalTrainingFailureRecoveryReceipt(
      readAtomicRecord(fs, value.paths.receipt, 'receipt'),
    );
    if (receipt.operationId !== value.intent.operationId) {
      throw new Error(
        'Local training failure recovery terminal receipt does not match the operation.',
      );
    }
    if (receipt.status === 'succeeded') {
      throw new Error(
        'Local training failure recovery refuses cleanup after a successful receipt.',
      );
    }
    if (receipt.cleanupRequestHash !== null) {
      throw new Error(
        'Local training failure recovery cleanup receipt requires its original request.',
      );
    }
    return receipt;
  }
  return cleanupOperation(value, {
    completedAt: requireTimestamp(completedAt, 'completedAt'),
    failureCode,
  });
}

function assertCleanupRequest(request) {
  const { requestHash, ...content } = request || {};
  if (
    !hasExactKeys(content, [
      'cleanupOnly',
      'expiresAt',
      'intentHash',
      'operationId',
      'requestedAt',
      'requestedBy',
      'requestedUserId',
      'schemaVersion',
      'stateHash',
      'trainingAuthorized',
    ]) ||
    content.schemaVersion !==
      LOCAL_TRAINING_FAILURE_CLEANUP_REQUEST_SCHEMA_VERSION ||
    content.cleanupOnly !== true ||
    content.trainingAuthorized !== false ||
    !isSha256(content.intentHash) ||
    !isSha256(content.stateHash) ||
    !Number.isFinite(Date.parse(content.requestedAt)) ||
    !Number.isFinite(Date.parse(content.expiresAt)) ||
    Date.parse(content.requestedAt) >= Date.parse(content.expiresAt) ||
    !Number.isSafeInteger(content.requestedUserId) ||
    content.requestedUserId < 0 ||
    requestHash !== hashRecord(content)
  ) {
    throw new Error(
      'Local training failure cleanup request failed integrity.',
    );
  }
  requireSafeText(content.requestedBy, 'requestedBy');
  return request;
}

export function buildLocalTrainingFailureCleanupRequest({
  expiresAt,
  operationId,
  repoDir,
  requestedAt,
  requestedBy,
} = {}) {
  const repoRoot = requireDirectory(
    fs,
    path.resolve(repoDir),
    null,
    'repoDir',
  ).canonical;
  const operation = readOperation(repoRoot, operationId);
  const normalizedRequestedAt = requireTimestamp(
    requestedAt,
    'requestedAt',
  );
  const normalizedExpiresAt = requireTimestamp(expiresAt, 'expiresAt');
  const normalizedRequestedBy = requireSafeText(
    requestedBy,
    'requestedBy',
  );
  if (
    normalizedRequestedBy !== operation.intent.rollbackOwner ||
    operation.intent.owner.userId !== currentUserId() ||
    Date.parse(normalizedRequestedAt) >= Date.parse(normalizedExpiresAt)
  ) {
    throw new Error(
      'Local training failure cleanup request failed rollback-owner binding.',
    );
  }
  if (!isRecoveryEligible(operation, normalizedRequestedAt)) {
    throw new Error(
      'Local training failure cleanup request is not eligible for recovery.',
    );
  }
  const content = {
    cleanupOnly: true,
    expiresAt: normalizedExpiresAt,
    intentHash: operation.intent.intentHash,
    operationId,
    requestedAt: normalizedRequestedAt,
    requestedBy: normalizedRequestedBy,
    requestedUserId: currentUserId(),
    schemaVersion:
      LOCAL_TRAINING_FAILURE_CLEANUP_REQUEST_SCHEMA_VERSION,
    stateHash: operation.state.stateHash,
    trainingAuthorized: false,
  };
  return assertCleanupRequest({
    ...content,
    requestHash: hashRecord(content),
  });
}

function buildClaimNode({
  cleanupRequest,
  operation,
  previousNodeHash,
  recoveredAt,
}) {
  const content = {
    cleanupRequestHash: cleanupRequest.requestHash,
    claimedAt: recoveredAt,
    kind: 'claim',
    operationId: operation.intent.operationId,
    ownerBootIdentityHash: resolveBootIdentity(),
    ownerProcessId: process.pid,
    previousNodeHash,
  };
  return {
    ...content,
    nodeHash: hashRecord(content),
  };
}

function buildClaimReleaseNode({ claim, releasedAt }) {
  const content = {
    kind: 'release',
    operationId: claim.operationId,
    previousNodeHash: claim.nodeHash,
    releasedAt,
    releasedByProcessId: process.pid,
  };
  return {
    ...content,
    nodeHash: hashRecord(content),
  };
}

function claimEdgePath(operation, nodeHash) {
  return path.join(
    operation.paths.operationRoot,
    `${CLAIM_EDGE_PREFIX}${nodeHash}.json`,
  );
}

function readClaimChain(operation) {
  if (!hasPathEntry(operation.paths.claim)) {
    return null;
  }
  let current = assertClaimNode(
    readAtomicRecord(fs, operation.paths.claim, 'claim'),
  );
  if (current.previousNodeHash !== null) {
    throw new Error(
      'Local training failure cleanup claim chain failed integrity.',
    );
  }
  for (let index = 0; index < MAX_CLAIM_CHAIN_NODES; index += 1) {
    const edgePath = claimEdgePath(operation, current.nodeHash);
    if (!hasPathEntry(edgePath)) {
      return current;
    }
    const next = assertClaimNode(
      readAtomicRecord(fs, edgePath, 'claim edge'),
    );
    if (
      next.operationId !== operation.intent.operationId ||
      next.previousNodeHash !== current.nodeHash
    ) {
      throw new Error(
        'Local training failure cleanup claim chain failed integrity.',
      );
    }
    current = next;
  }
  throw new Error(
    'Local training failure cleanup claim chain exceeds its bound.',
  );
}

function assertClaimNode(node) {
  const { nodeHash, ...content } = node || {};
  const isClaim = content.kind === 'claim';
  const isRelease = content.kind === 'release';
  if (
    !isSha256(nodeHash) ||
    nodeHash !== hashRecord(content) ||
    (!isClaim && !isRelease) ||
    !/^local-training-recovery-[a-f0-9]{64}$/u.test(
      content.operationId,
    )
  ) {
    throw new Error(
      'Local training failure cleanup claim failed integrity.',
    );
  }
  if (isClaim && (
    !hasExactKeys(content, [
      'cleanupRequestHash',
      'claimedAt',
      'kind',
      'operationId',
      'ownerBootIdentityHash',
      'ownerProcessId',
      'previousNodeHash',
    ]) ||
    !isSha256(content.cleanupRequestHash) ||
    !Number.isFinite(Date.parse(content.claimedAt)) ||
    (content.ownerBootIdentityHash !== null &&
      !isSha256(content.ownerBootIdentityHash)) ||
    !Number.isSafeInteger(content.ownerProcessId) ||
    content.ownerProcessId <= 0 ||
    (content.previousNodeHash !== null &&
      !isSha256(content.previousNodeHash))
  )) {
    throw new Error(
      'Local training failure cleanup claim failed integrity.',
    );
  }
  if (isRelease && (
    !hasExactKeys(content, [
      'kind',
      'operationId',
      'previousNodeHash',
      'releasedAt',
      'releasedByProcessId',
    ]) ||
    !isSha256(content.previousNodeHash) ||
    !Number.isFinite(Date.parse(content.releasedAt)) ||
    !Number.isSafeInteger(content.releasedByProcessId) ||
    content.releasedByProcessId <= 0
  )) {
    throw new Error(
      'Local training failure cleanup claim failed integrity.',
    );
  }
  return node;
}

function isExclusiveWriteConflict(error) {
  return error?.code === 'EEXIST';
}

function writeClaim(operation, cleanupRequest, recoveredAt) {
  for (let attempt = 0; attempt < MAX_CLAIM_CHAIN_NODES; attempt += 1) {
    const current = readClaimChain(operation);
    if (current?.kind === 'claim') {
      const currentBootIdentity = resolveBootIdentity();
      const priorBoot = Boolean(
        current.ownerBootIdentityHash &&
        currentBootIdentity &&
        current.ownerBootIdentityHash !== currentBootIdentity,
      );
      if (
        current.ownerProcessId === process.pid &&
        current.cleanupRequestHash === cleanupRequest.requestHash
      ) {
        return current;
      }
      if (!priorBoot && isProcessAlive(current.ownerProcessId)) {
        throw new Error(
          'Local training failure cleanup is already claimed.',
        );
      }
    }
    const claim = buildClaimNode({
      cleanupRequest,
      operation,
      previousNodeHash: current?.nodeHash || null,
      recoveredAt,
    });
    const destination = current
      ? claimEdgePath(operation, current.nodeHash)
      : operation.paths.claim;
    try {
      writeAtomicExclusiveJson(fs, destination, claim);
      return claim;
    } catch (error) {
      if (!isExclusiveWriteConflict(error)) {
        throw error;
      }
    }
  }
  throw new Error(
    'Local training failure cleanup claim contention exceeds its bound.',
  );
}

function releaseClaim(operation, cleanupRequest, releasedAt) {
  for (let attempt = 0; attempt < MAX_CLAIM_CHAIN_NODES; attempt += 1) {
    const current = readClaimChain(operation);
    if (
      current?.kind !== 'claim' ||
      current.ownerProcessId !== process.pid ||
      current.cleanupRequestHash !== cleanupRequest.requestHash
    ) {
      return;
    }
    const release = buildClaimReleaseNode({
      claim: current,
      releasedAt,
    });
    try {
      writeAtomicExclusiveJson(
        fs,
        claimEdgePath(operation, current.nodeHash),
        release,
      );
      return;
    } catch (error) {
      if (!isExclusiveWriteConflict(error)) {
        throw error;
      }
    }
  }
  throw new Error(
    'Local training failure cleanup claim release exceeds its bound.',
  );
}

function isProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function isRecoveryEligible(operation, requestedAt) {
  const failedCleanupStarted =
    operation.state.failureCode !== null &&
    [
      'cleanup-pending',
      'workspace-removed',
      'candidate-removal-pending',
      'candidate-removed',
    ].includes(operation.state.phase);
  if (failedCleanupStarted) {
    return true;
  }
  const currentBootIdentity = resolveBootIdentity();
  const priorBoot = Boolean(
    operation.intent.owner.bootIdentityHash &&
    currentBootIdentity &&
    operation.intent.owner.bootIdentityHash !== currentBootIdentity,
  );
  const ownerInactive = priorBoot ||
    !isProcessAlive(operation.intent.owner.processId);
  return ownerInactive &&
    Date.parse(requestedAt) >=
      Date.parse(operation.intent.leaseExpiresAt);
}

export function recoverLocalTrainingFailure({
  cleanupRequest,
  recoveredAt,
  repoDir,
} = {}) {
  const request = assertCleanupRequest(cleanupRequest);
  const normalizedRecoveredAt = requireTimestamp(
    recoveredAt,
    'recoveredAt',
  );
  const repoRoot = requireDirectory(
    fs,
    path.resolve(repoDir),
    null,
    'repoDir',
  ).canonical;
  const operation = readOperation(repoRoot, request.operationId);
  if (hasPathEntry(operation.paths.receipt)) {
    const receipt = assertLocalTrainingFailureRecoveryReceipt(
      readAtomicRecord(fs, operation.paths.receipt, 'receipt'),
    );
    if (
      receipt.operationId !== request.operationId ||
      receipt.status !== 'failed-cleaned' ||
      receipt.cleanupRequestHash !== request.requestHash
    ) {
      throw new Error(
        'Local training failure cleanup request does not match the terminal receipt.',
      );
    }
    return receipt;
  }
  if (
    Date.parse(normalizedRecoveredAt) < Date.parse(request.requestedAt) ||
    Date.parse(normalizedRecoveredAt) >= Date.parse(request.expiresAt)
  ) {
    throw new Error(
      'Local training failure cleanup request is outside its time window.',
    );
  }
  if (
    request.requestedUserId !== currentUserId() ||
    operation.intent.owner.userId !== request.requestedUserId ||
    !isRecoveryEligible(operation, request.requestedAt)
  ) {
    throw new Error(
      'Local training failure cleanup request is not eligible for recovery.',
    );
  }
  if (
    operation.intent.intentHash !== request.intentHash ||
    operation.state.stateHash !== request.stateHash ||
    operation.intent.rollbackOwner !== request.requestedBy
  ) {
    throw new Error(
      'Local training failure cleanup request is stale or unbound.',
    );
  }
  writeClaim(operation, request, normalizedRecoveredAt);
  try {
    return cleanupOperation({
      ...operation,
      repoRoot,
    }, {
      cleanupRequestHash: request.requestHash,
      completedAt: normalizedRecoveredAt,
      failureCode: operation.state.failureCode ||
        'adapter-execution-failed',
    });
  } catch (error) {
    releaseClaim(operation, request, normalizedRecoveredAt);
    throw error;
  }
}
