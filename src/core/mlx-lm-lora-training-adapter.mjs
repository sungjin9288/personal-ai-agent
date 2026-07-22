import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildLocalTrainingAcquisitionArtifactManifest,
  assertLocalTrainingAcquisitionArtifactVerification,
} from './local-training-acquisition-artifact-verification.mjs';
import {
  buildLocalTrainingAcquisitionPlan,
} from './local-training-acquisition-approval.mjs';
import {
  buildLocalTrainingCandidateArtifactManifest,
} from './local-training-candidate-artifact-verification.mjs';
import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  assertLocalTrainingExecutionApproval,
  LOCAL_TRAINING_PROTOCOL_VERSION,
} from './local-training-runtime.mjs';
import {
  assertLocalTrainingPostAcquisitionAdmission,
} from './local-training-post-acquisition-readiness.mjs';
import {
  assertLocalTrainingToolchainDecision,
} from './local-training-toolchain-decision.mjs';
import {
  buildLocalTrainingFailureCleanupRequest,
  cleanupLocalTrainingFailureRecovery,
  commitLocalTrainingFailureRecovery,
  deriveLocalTrainingFailureRecoveryOperationId,
  markLocalTrainingFailureRecoveryPublished,
  markLocalTrainingFailureRecoveryPublishIntent,
  openLocalTrainingFailureRecovery,
  recoverLocalTrainingFailure,
} from './local-training-failure-recovery.mjs';

export const MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION =
  'personal-ai-agent-mlx-lm-lora-training-adapter/v2';

const ADAPTER_STATES = new WeakMap();

const ACQUISITION_ROOT =
  'var/local-training/mlx-lm-lora-qwen2.5-1.5b';
const CANDIDATE_ROOT = 'var/local-training/candidates';
const WORKSPACE_ROOT = 'var/local-training/workspaces';
const SOURCE_MODEL_ROOT = 'source-model';
const TRAINER_ROOT = 'trainer';
const TRAINER_ENTRY = 'bin/mlx_lm.lora';
const SOURCE_MANIFEST_KIND = 'source-model';
const TRAINER_MANIFEST_KIND = 'trainer-package';
const MAX_ARTIFACT_FILES = 128;
const MAX_MANIFEST_BYTES = 256 * 1024;
const REQUIRED_OUTPUT_FILES = Object.freeze([
  'adapter_config.json',
  'adapters.safetensors',
]);
const REMAINING_GATES = Object.freeze([
  'training-runtime-closure-provenance',
  'os-enforced-network-isolation',
  'os-enforced-resource-limits',
  'process-group-lifecycle-and-revocation-monitoring',
  'explicit-actual-training-request',
]);

const EXPECTED_TOOLCHAIN = Object.freeze({
  sourceModel: {
    id: 'Qwen/Qwen2.5-1.5B-Instruct',
    revision: '989aa7980e4cf806f80c7fef2b1adb7bc71aa306',
  },
  trainer: {
    command: 'mlx_lm.lora',
    id: 'mlx-lm-lora',
    releaseCommit: 'ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd',
    version: '0.31.3',
  },
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
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
      `MLX-LM training adapter ${fieldName} must remain relative.`,
    );
  }
  return normalized;
}

function requireDirectory(fileSystem, value, boundary, fieldName) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(value);
    canonical = fileSystem.realpathSync(value);
  } catch {
    throw new Error(
      `MLX-LM training adapter ${fieldName} must be an accessible directory.`,
    );
  }
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (boundary && !isWithin(boundary, canonical))
  ) {
    throw new Error(
      `MLX-LM training adapter ${fieldName} escaped its approved boundary.`,
    );
  }
  return canonical;
}

function requireRegularFile(fileSystem, root, relativePath, fieldName) {
  const normalized = requireRelativePath(relativePath, fieldName);
  const candidate = path.resolve(root, normalized);
  if (!isWithin(root, candidate)) {
    throw new Error(
      `MLX-LM training adapter ${fieldName} escaped its approved boundary.`,
    );
  }
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(candidate);
    canonical = fileSystem.realpathSync(candidate);
  } catch {
    throw new Error(
      `MLX-LM training adapter ${fieldName} must be an accessible file.`,
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    !isWithin(root, canonical) ||
    stat.size <= 0
  ) {
    throw new Error(
      `MLX-LM training adapter ${fieldName} must be a contained regular file.`,
    );
  }
  return {
    bytes: stat.size,
    path: canonical,
  };
}

function ensurePrivateDirectory(fileSystem, repoRoot, relativePath) {
  let current = repoRoot;
  for (const segment of requireRelativePath(relativePath, 'directory').split('/')) {
    current = path.join(current, segment);
    if (!fileSystem.existsSync(current)) {
      fileSystem.mkdirSync(current, { mode: 0o700 });
    }
    const stat = fileSystem.lstatSync(current);
    const canonical = fileSystem.realpathSync(current);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      !isWithin(repoRoot, canonical)
    ) {
      throw new Error(
        'MLX-LM training adapter private directory is unsafe.',
      );
    }
    fileSystem.chmodSync(canonical, 0o700);
    current = canonical;
  }
  return current;
}

function writePrivateFile(fileSystem, filename, content) {
  fileSystem.writeFileSync(filename, content, {
    flag: 'wx',
    mode: 0o600,
  });
  fileSystem.chmodSync(filename, 0o600);
  const stat = fileSystem.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
    throw new Error(
      'MLX-LM training adapter private file mode validation failed.',
    );
  }
}

function listRegularFiles(
  fileSystem,
  root,
  current = root,
  files = [],
) {
  const entries = fileSystem
    .readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const candidate = path.join(current, entry.name);
    const stat = fileSystem.lstatSync(candidate);
    const canonical = fileSystem.realpathSync(candidate);
    if (stat.isSymbolicLink() || !isWithin(root, canonical)) {
      throw new Error(
        'MLX-LM training adapter rejects symbolic links and path escapes.',
      );
    }
    if (stat.isDirectory()) {
      listRegularFiles(fileSystem, root, canonical, files);
      continue;
    }
    if (!stat.isFile() || stat.size <= 0) {
      throw new Error(
        'MLX-LM training adapter accepts only non-empty regular files.',
      );
    }
    files.push(
      path.relative(root, canonical).split(path.sep).join('/'),
    );
    if (files.length > MAX_ARTIFACT_FILES) {
      throw new Error(
        'MLX-LM training adapter artifact inventory is too large.',
      );
    }
  }
  return files.sort();
}

function hashFile(fileSystem, filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fileSystem.createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', () => {
      reject(new Error('MLX-LM training adapter could not hash an artifact.'));
    });
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function readManifest(fileSystem, root, relativePath, fieldName) {
  const file = requireRegularFile(
    fileSystem,
    root,
    relativePath,
    fieldName,
  );
  if (file.bytes > MAX_MANIFEST_BYTES) {
    throw new Error(
      `MLX-LM training adapter ${fieldName} exceeds its byte boundary.`,
    );
  }
  try {
    return JSON.parse(fileSystem.readFileSync(file.path, 'utf8'));
  } catch {
    throw new Error(
      `MLX-LM training adapter ${fieldName} must contain valid JSON.`,
    );
  }
}

async function verifyCompleteArtifactSet({
  expectedIdentity,
  expectedSummary,
  fileSystem,
  kind,
  manifest,
  root,
}) {
  const expectedManifest = buildLocalTrainingAcquisitionArtifactManifest({
    artifactKind: kind,
    files: manifest?.files,
    identity: manifest?.identity,
  });
  if (
    JSON.stringify(manifest) !== JSON.stringify(expectedManifest) ||
    JSON.stringify(manifest.identity) !== JSON.stringify(expectedIdentity) ||
    manifest.artifactSetSha256 !== expectedSummary.artifactSetSha256
  ) {
    throw new Error(
      `MLX-LM training adapter ${kind} manifest failed: integrity-or-pin.`,
    );
  }

  const actualPaths = listRegularFiles(fileSystem, root);
  const expectedPaths = manifest.files.map((file) => file.path);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `MLX-LM training adapter ${kind} inventory is incomplete or contains unlisted files.`,
    );
  }

  const files = [];
  let totalBytes = 0;
  for (const expected of manifest.files) {
    const actual = requireRegularFile(
      fileSystem,
      root,
      expected.path,
      `${kind}.${expected.path}`,
    );
    const digest = await hashFile(fileSystem, actual.path);
    if (actual.bytes !== expected.bytes || digest !== expected.sha256) {
      throw new Error(
        `MLX-LM training adapter ${kind} file integrity failed.`,
      );
    }
    totalBytes += actual.bytes;
    files.push({
      bytes: actual.bytes,
      pathHash: sha256(expected.path),
      sha256: digest,
    });
  }
  if (
    totalBytes !== expectedSummary.totalBytes ||
    JSON.stringify(files) !== JSON.stringify(expectedSummary.files)
  ) {
    throw new Error(
      `MLX-LM training adapter ${kind} verification binding failed.`,
    );
  }
}

function assertPinnedToolchain(decision, plan) {
  assertLocalTrainingToolchainDecision(decision);
  const track = decision.recommendedTrack;
  if (
    plan.mutableRoot !== ACQUISITION_ROOT ||
    track.id !== 'mlx-lm-lora-qwen2.5-1.5b' ||
    Object.entries(EXPECTED_TOOLCHAIN.trainer).some(
      ([key, value]) => track.trainer[key] !== value,
    ) ||
    Object.entries(EXPECTED_TOOLCHAIN.sourceModel).some(
      ([key, value]) => track.sourceModel[key] !== value,
    ) ||
    track.training.fineTuneType !== 'lora' ||
    track.training.dataFormat !== 'chat-jsonl' ||
    track.training.networkPolicy !==
      'acquisition-only-then-offline-training'
  ) {
    throw new Error('MLX-LM training adapter toolchain pin drifted.');
  }
}

function assertPayload(payload, approval, readinessPackage) {
  if (
    !hasExactKeys(payload, [
      'approvalId',
      'baseModelId',
      'dataset',
      'executionKind',
      'schemaVersion',
      'trainerId',
    ]) ||
    !hasExactKeys(payload.dataset, [
      'datasetHash',
      'readinessHash',
      'train',
      'validation',
    ]) ||
    payload.schemaVersion !== LOCAL_TRAINING_PROTOCOL_VERSION ||
    payload.approvalId !== approval.id ||
    payload.baseModelId !== approval.baseModelId ||
    payload.trainerId !== EXPECTED_TOOLCHAIN.trainer.id ||
    payload.executionKind !== 'fixture-simulated' ||
    payload.dataset.datasetHash !== readinessPackage.dataset.datasetHash ||
    payload.dataset.readinessHash !== readinessPackage.readinessHash ||
    JSON.stringify(payload.dataset.train) !==
      JSON.stringify(readinessPackage.exports.train) ||
    JSON.stringify(payload.dataset.validation) !==
      JSON.stringify(readinessPackage.exports.validation)
  ) {
    throw new Error(
      'MLX-LM training adapter payload failed: integrity-or-binding.',
    );
  }
}

function buildPayload(approval, readinessPackage) {
  return {
    approvalId: approval.id,
    baseModelId: approval.baseModelId,
    dataset: {
      datasetHash: readinessPackage.dataset.datasetHash,
      readinessHash: readinessPackage.readinessHash,
      train: readinessPackage.exports.train,
      validation: readinessPackage.exports.validation,
    },
    executionKind: approval.executionKind,
    schemaVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
    trainerId: approval.trainerId,
  };
}

function buildRecoveryBindings({
  acquisitionVerification,
  approval,
  contract,
  currentPermission,
  postAcquisitionReadiness,
  readinessPackage,
}) {
  return {
    acquisitionVerification: {
      hash: acquisitionVerification.verificationHash,
      id: acquisitionVerification.id,
    },
    approval: {
      hash: approval.approvalHash,
      id: approval.id,
    },
    contractHash: contract.contractHash,
    dataset: {
      datasetHash: readinessPackage.dataset.datasetHash,
      readinessHash: readinessPackage.readinessHash,
      trainSha256: readinessPackage.exportDigests.train,
      validationSha256:
        readinessPackage.exportDigests.validation,
    },
    maxDiskBytes:
      currentPermission.evidence.resource.limits.maxDiskBytes,
    permission: {
      hash: currentPermission.permissionHash,
      id: currentPermission.id,
    },
    postAcquisitionReadiness: {
      hash: postAcquisitionReadiness.readinessHash,
      id: postAcquisitionReadiness.id,
    },
    rollbackOwner: approval.rollbackOwner,
  };
}

function buildRecoveryLeaseExpiration({
  approval,
  currentPermission,
  startedAt,
}) {
  const startedAtMs = Date.parse(startedAt);
  const runtimeLimitMs = Number(
    currentPermission.evidence.resource.limits.maxRuntimeMs,
  );
  const leaseExpiresAtMs = Math.min(
    Date.parse(approval.expiresAt),
    startedAtMs + runtimeLimitMs,
  );
  if (
    !Number.isFinite(startedAtMs) ||
    !Number.isFinite(runtimeLimitMs) ||
    runtimeLimitMs <= 0 ||
    !Number.isFinite(leaseExpiresAtMs) ||
    leaseExpiresAtMs <= startedAtMs
  ) {
    throw new Error(
      'MLX-LM training adapter recovery lease is invalid.',
    );
  }
  return new Date(leaseExpiresAtMs).toISOString();
}

function assertSafeSourceModel(fileSystem, sourceRoot) {
  const files = listRegularFiles(fileSystem, sourceRoot);
  if (files.some((filename) => filename.endsWith('.py'))) {
    throw new Error(
      'MLX-LM training adapter rejects source-model Python code.',
    );
  }
  const configFile = requireRegularFile(
    fileSystem,
    sourceRoot,
    'config.json',
    'source model config',
  );
  let config;
  try {
    config = JSON.parse(fileSystem.readFileSync(configFile.path, 'utf8'));
  } catch {
    throw new Error(
      'MLX-LM training adapter source model config must contain valid JSON.',
    );
  }
  if (
    config?.auto_map !== undefined ||
    config?.trust_remote_code === true
  ) {
    throw new Error(
      'MLX-LM training adapter rejects custom source-model code.',
    );
  }
}

function buildContract() {
  const content = {
    actualModelTrainingExecuted: false,
    actualMlxProcessSpawned: false,
    adapterFormat: 'mlx-lm-lora-adapter-safetensors',
    dataFiles: ['train.jsonl', 'valid.jsonl'],
    executionMode: 'fixture-simulated',
    fixedArgumentOrder: [
      '--model',
      '--train',
      '--data',
      '--fine-tune-type',
      'lora',
      '--adapter-path',
    ],
    networkPolicy: 'fixed-offline-environment-no-inherited-values',
    productionReadyClaim: false,
    remainingGates: [...REMAINING_GATES],
    schemaVersion: MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION,
    sourceModel: { ...EXPECTED_TOOLCHAIN.sourceModel },
    trainer: { ...EXPECTED_TOOLCHAIN.trainer },
    trainingAuthorized: false,
  };
  return {
    ...content,
    contractHash: hashRecord(content),
  };
}

function buildEnvironment(workspace) {
  return {
    HF_DATASETS_OFFLINE: '1',
    HF_HUB_OFFLINE: '1',
    HOME: path.join(workspace, 'home'),
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    TOKENIZERS_PARALLELISM: 'false',
    TRANSFORMERS_OFFLINE: '1',
    TMPDIR: path.join(workspace, 'tmp'),
  };
}

function runFixtureTrainingAdapter({
  args,
  command,
  environment,
  expectedTrain,
  expectedValidation,
  fileSystem,
}) {
  const modelIndex = args.indexOf('--model');
  const dataIndex = args.indexOf('--data');
  const typeIndex = args.indexOf('--fine-tune-type');
  const adapterIndex = args.indexOf('--adapter-path');
  if (
    !path.isAbsolute(command) ||
    modelIndex !== 0 ||
    args[modelIndex + 1] === undefined ||
    args[2] !== '--train' ||
    dataIndex !== 3 ||
    typeIndex !== 5 ||
    args[typeIndex + 1] !== 'lora' ||
    adapterIndex !== 7 ||
    args.length !== 9 ||
    environment.HF_HUB_OFFLINE !== '1' ||
    environment.TRANSFORMERS_OFFLINE !== '1'
  ) {
    throw new Error(
      'MLX-LM training adapter fixture invocation drifted.',
    );
  }

  const dataRoot = args[dataIndex + 1];
  if (
    fileSystem.readFileSync(
      path.join(dataRoot, 'train.jsonl'),
      'utf8',
    ) !== expectedTrain ||
    fileSystem.readFileSync(
      path.join(dataRoot, 'valid.jsonl'),
      'utf8',
    ) !== expectedValidation
  ) {
    throw new Error(
      'MLX-LM training adapter fixture data bytes drifted.',
    );
  }

  const artifactRoot = args[adapterIndex + 1];
  writePrivateFile(
    fileSystem,
    path.join(artifactRoot, 'adapter_config.json'),
    '{"fine_tune_type":"lora","fixture":true}\n',
  );
  writePrivateFile(
    fileSystem,
    path.join(artifactRoot, 'adapters.safetensors'),
    'fixture-only-adapter-contract',
  );
  return {
    actualProcessSpawned: false,
    externalProviderCalls: 'none',
    fixtureInvocationContractExercised: true,
    status: 'completed',
  };
}

async function inventoryCandidate(fileSystem, artifactRoot) {
  const files = listRegularFiles(fileSystem, artifactRoot);
  if (JSON.stringify(files) !== JSON.stringify(REQUIRED_OUTPUT_FILES)) {
    throw new Error(
      'MLX-LM training adapter candidate output is incomplete or unsupported.',
    );
  }
  return Promise.all(files.map(async (relativePath) => {
    const file = requireRegularFile(
      fileSystem,
      artifactRoot,
      relativePath,
      `candidate.${relativePath}`,
    );
    fileSystem.chmodSync(file.path, 0o600);
    return {
      bytes: file.bytes,
      path: relativePath,
      sha256: await hashFile(fileSystem, file.path),
    };
  }));
}

export function createMlxLmLoraTrainingAdapter({
  acquisition,
  executionMode = 'fixture-simulated',
  repoDir,
} = {}) {
  if (executionMode !== 'fixture-simulated') {
    throw new Error(
      'Actual MLX-LM training is blocked until OS execution guards are implemented.',
    );
  }
  const fileSystem = fs;
  const requiredFileSystemMethods = [
    'chmodSync',
    'createReadStream',
    'existsSync',
    'lstatSync',
    'mkdirSync',
    'mkdtempSync',
    'readFileSync',
    'readdirSync',
    'realpathSync',
    'renameSync',
    'rmSync',
    'writeFileSync',
  ];
  if (
    !fileSystem ||
    requiredFileSystemMethods.some(
      (method) => typeof fileSystem[method] !== 'function',
    )
  ) {
    throw new Error('MLX-LM training adapter requires a filesystem.');
  }
  if (!acquisition || !repoDir) {
    throw new Error(
      'MLX-LM training adapter requires acquisition evidence and repoDir.',
    );
  }

  const repoRoot = requireDirectory(
    fileSystem,
    path.resolve(repoDir),
    null,
    'repoDir',
  );
  const contract = deepFreeze(buildContract());
  let lastObservation = null;

  function assertBoundTrainingInputs({
    approval,
    currentPermission,
    now,
    permissionRevocation,
    postAcquisitionReadiness,
    readinessPackage,
  }) {
    assertFineTuningReadinessPackage(readinessPackage);
    assertLocalTrainingExecutionApproval({
      approval,
      currentPermission,
      now,
      permissionRevocation,
      postAcquisitionReadiness,
      readinessPackage,
      timeoutMs: 1,
      trainerId: EXPECTED_TOOLCHAIN.trainer.id,
    });
    assertLocalTrainingPostAcquisitionAdmission({
      now,
      permission: currentPermission,
      permissionRevocation,
      readiness: postAcquisitionReadiness,
      readinessPackage,
    });
    const trainingTarget = postAcquisitionReadiness.trainingTarget;
    if (
      approval.baseModelId !== trainingTarget.baseModelId ||
      approval.baseModelId !==
        acquisition.plan.toolchainDecision.sourceModel.id ||
      approval.trainerId !== trainingTarget.trainerId ||
      approval.trainerId !== EXPECTED_TOOLCHAIN.trainer.id ||
      approval.rollbackOwner !== trainingTarget.rollbackOwner
    ) {
      throw new Error(
        'MLX-LM training adapter approval target is unbound.',
      );
    }
    const payload = buildPayload(approval, readinessPackage);
    assertPayload(payload, approval, readinessPackage);
    assertLocalTrainingAcquisitionArtifactVerification(
      acquisition.verification,
    );
    assertPinnedToolchain(
      acquisition.toolchainDecision,
      acquisition.plan,
    );
    const currentPlan = buildLocalTrainingAcquisitionPlan({
      approval: acquisition.approval,
      decision: acquisition.toolchainDecision,
      now: acquisition.verification.observedAt,
    });
    if (
      JSON.stringify(currentPlan) !== JSON.stringify(acquisition.plan) ||
      acquisition.verification.mode !== 'recorded-local-acquisition' ||
      acquisition.verification.approval.id !== acquisition.approval.id ||
      acquisition.verification.approval.approvalHash !==
        acquisition.approval.approvalHash ||
      postAcquisitionReadiness.artifactVerification.id !==
        acquisition.verification.id ||
      postAcquisitionReadiness.artifactVerification.verificationHash !==
        acquisition.verification.verificationHash
    ) {
      throw new Error(
        'MLX-LM training adapter acquisition evidence is stale or unbound.',
      );
    }
    return buildRecoveryBindings({
      acquisitionVerification: acquisition.verification,
      approval,
      contract,
      currentPermission,
      postAcquisitionReadiness,
      readinessPackage,
    });
  }

  async function verifyAcquisitionArtifacts({
    sourceManifest,
    sourceRoot,
    trainerManifest,
    trainerRoot,
  }) {
    await verifyCompleteArtifactSet({
      expectedIdentity: {
        id: acquisition.plan.toolchainDecision.sourceModel.id,
        licenseId:
          acquisition.plan.toolchainDecision.sourceModel.licenseId,
        revision:
          acquisition.plan.toolchainDecision.sourceModel.revision,
      },
      expectedSummary:
        acquisition.verification.artifacts.sourceModel,
      fileSystem,
      kind: SOURCE_MANIFEST_KIND,
      manifest: sourceManifest,
      root: sourceRoot,
    });
    await verifyCompleteArtifactSet({
      expectedIdentity: {
        id: acquisition.plan.toolchainDecision.trainer.id,
        packageName:
          acquisition.plan.toolchainDecision.trainer.packageName,
        releaseCommit:
          acquisition.plan.toolchainDecision.trainer.releaseCommit,
        version:
          acquisition.plan.toolchainDecision.trainer.version,
      },
      expectedSummary:
        acquisition.verification.artifacts.trainerPackage,
      fileSystem,
      kind: TRAINER_MANIFEST_KIND,
      manifest: trainerManifest,
      root: trainerRoot,
    });
    assertSafeSourceModel(fileSystem, sourceRoot);
  }

  async function executeTraining({
    approval,
    currentPermission,
    permissionRevocation,
    postAcquisitionReadiness,
    readinessPackage,
    startedAt,
  } = {}) {
    lastObservation = null;
    const recoveryBindings = assertBoundTrainingInputs({
      approval,
      currentPermission,
      now: startedAt,
      permissionRevocation,
      postAcquisitionReadiness,
      readinessPackage,
    });

    const acquisitionRoot = requireDirectory(
      fileSystem,
      path.join(repoRoot, acquisition.plan.mutableRoot),
      repoRoot,
      'acquisition root',
    );
    const sourceRoot = requireDirectory(
      fileSystem,
      path.join(acquisitionRoot, SOURCE_MODEL_ROOT),
      acquisitionRoot,
      'source model root',
    );
    const trainerRoot = requireDirectory(
      fileSystem,
      path.join(acquisitionRoot, TRAINER_ROOT),
      acquisitionRoot,
      'trainer root',
    );
    const sourceManifest = readManifest(
      fileSystem,
      acquisitionRoot,
      acquisition.sourceModelManifestPath,
      'source model manifest',
    );
    const trainerManifest = readManifest(
      fileSystem,
      acquisitionRoot,
      acquisition.trainerPackageManifestPath,
      'trainer package manifest',
    );
    await verifyAcquisitionArtifacts({
      sourceManifest,
      sourceRoot,
      trainerManifest,
      trainerRoot,
    });

    const trainerEntry = requireRegularFile(
      fileSystem,
      trainerRoot,
      TRAINER_ENTRY,
      'trainer entry',
    );
    const trainerEntryStat = fileSystem.lstatSync(trainerEntry.path);
    if ((trainerEntryStat.mode & 0o111) === 0) {
      throw new Error(
        'MLX-LM training adapter trainer entry must be executable.',
      );
    }
    const trainerEntrySha256 = await hashFile(
      fileSystem,
      trainerEntry.path,
    );

    const candidateParent = ensurePrivateDirectory(
      fileSystem,
      repoRoot,
      CANDIDATE_ROOT,
    );
    const candidateRoot = path.join(candidateParent, approval.id);
    if (fileSystem.existsSync(candidateRoot)) {
      throw new Error(
        'MLX-LM training adapter refuses to overwrite an existing candidate.',
      );
    }
    const workspaceParent = ensurePrivateDirectory(
      fileSystem,
      repoRoot,
      WORKSPACE_ROOT,
    );
    const workspace = fileSystem.mkdtempSync(
      path.join(workspaceParent, 'mlx-lm-lora-'),
    );
    fileSystem.chmodSync(workspace, 0o700);
    let recoveryOperation;
    let completion;

    try {
      recoveryOperation = openLocalTrainingFailureRecovery({
        bindings: recoveryBindings,
        candidateRoot,
        leaseExpiresAt: buildRecoveryLeaseExpiration({
          approval,
          currentPermission,
          startedAt,
        }),
        repoDir: repoRoot,
        startedAt,
        workspaceRoot: workspace,
      });
      const dataRoot = path.join(workspace, 'data');
      const stagedCandidate = path.join(workspace, 'candidate');
      const artifactRoot = path.join(stagedCandidate, 'artifact');
      const homeRoot = path.join(workspace, 'home');
      const tempRoot = path.join(workspace, 'tmp');
      for (const directory of [
        dataRoot,
        stagedCandidate,
        artifactRoot,
        homeRoot,
        tempRoot,
      ]) {
        fileSystem.mkdirSync(directory, { mode: 0o700 });
        fileSystem.chmodSync(directory, 0o700);
      }
      writePrivateFile(
        fileSystem,
        path.join(dataRoot, 'train.jsonl'),
        readinessPackage.exports.train.content,
      );
      writePrivateFile(
        fileSystem,
        path.join(dataRoot, 'valid.jsonl'),
        readinessPackage.exports.validation.content,
      );

      const environment = buildEnvironment(workspace);
      const args = [
        '--model',
        sourceRoot,
        '--train',
        '--data',
        dataRoot,
        '--fine-tune-type',
        'lora',
        '--adapter-path',
        artifactRoot,
      ];
      const fixtureResult = runFixtureTrainingAdapter({
        args,
        command: trainerEntry.path,
        environment,
        expectedTrain: readinessPackage.exports.train.content,
        expectedValidation:
          readinessPackage.exports.validation.content,
        fileSystem,
      });
      if (
        !hasExactKeys(fixtureResult, [
          'actualProcessSpawned',
          'externalProviderCalls',
          'fixtureInvocationContractExercised',
          'status',
        ]) ||
        fixtureResult.actualProcessSpawned !== false ||
        fixtureResult.externalProviderCalls !== 'none' ||
        fixtureResult.fixtureInvocationContractExercised !== true ||
        fixtureResult.status !== 'completed'
      ) {
        throw new Error(
          'MLX-LM training adapter fixture result failed its contract.',
        );
      }

      const files = await inventoryCandidate(
        fileSystem,
        artifactRoot,
      );
      const modelId =
        `mlx-lm-lora-candidate-${sha256(approval.id).slice(0, 16)}`;
      const artifactFormat =
        'mlx-lm-lora-adapter-safetensors';
      const manifest = buildLocalTrainingCandidateArtifactManifest({
        approval,
        artifactFormat,
        files,
        modelId,
        readinessPackage,
      });
      const candidateManifestContent =
        `${JSON.stringify(manifest, null, 2)}\n`;
      writePrivateFile(
        fileSystem,
        path.join(stagedCandidate, 'candidate-manifest.json'),
        candidateManifestContent,
      );

      await verifyAcquisitionArtifacts({
        sourceManifest,
        sourceRoot,
        trainerManifest,
        trainerRoot,
      });
      if (
        await hashFile(fileSystem, trainerEntry.path) !==
          trainerEntrySha256
      ) {
        throw new Error(
          'MLX-LM training adapter trainer entry changed during preparation.',
        );
      }
      assertLocalTrainingPostAcquisitionAdmission({
        now: startedAt,
        permission: currentPermission,
        permissionRevocation,
        readiness: postAcquisitionReadiness,
        readinessPackage,
      });
      if (fileSystem.existsSync(candidateRoot)) {
        throw new Error(
          'MLX-LM training adapter refuses to overwrite an existing candidate.',
        );
      }
      markLocalTrainingFailureRecoveryPublishIntent(
        recoveryOperation,
        {
          candidateManifestHash: sha256(candidateManifestContent),
          stagedCandidateRoot: stagedCandidate,
          updatedAt: startedAt,
        },
      );
      fileSystem.renameSync(stagedCandidate, candidateRoot);
      markLocalTrainingFailureRecoveryPublished(
        recoveryOperation,
        {
          candidateRoot,
          updatedAt: startedAt,
        },
      );

      const publishedRoot = requireDirectory(
        fileSystem,
        candidateRoot,
        candidateParent,
        'published candidate root',
      );
      const publishedManifest = readManifest(
        fileSystem,
        publishedRoot,
        'candidate-manifest.json',
        'published candidate manifest',
      );
      const publishedArtifactRoot = requireDirectory(
        fileSystem,
        path.join(publishedRoot, 'artifact'),
        publishedRoot,
        'published candidate artifact root',
      );
      const publishedFiles = await inventoryCandidate(
        fileSystem,
        publishedArtifactRoot,
      );
      if (
        JSON.stringify(publishedManifest) !== JSON.stringify(manifest) ||
        JSON.stringify(publishedFiles) !== JSON.stringify(files)
      ) {
        throw new Error(
          'MLX-LM training adapter published candidate failed reinspection.',
        );
      }

      completion = {
        observation: {
          actualModelTrainingExecuted: false,
          actualMlxProcessSpawned: false,
          candidateArtifactSha256: manifest.artifactSetSha256,
          candidateFileCount: files.length,
          candidatePublished: true,
          commandSha256: trainerEntrySha256,
          contractHash: contract.contractHash,
          dataDigests: {
            train: sha256(readinessPackage.exports.train.content),
            valid: sha256(readinessPackage.exports.validation.content),
          },
          environmentKeys: Object.keys(environment).sort(),
          externalProviderCalls: 'none',
          fixedArgumentOrder: args.filter(
            (value) => value.startsWith('--') || value === 'lora',
          ),
          fixtureInvocationContractExercised: true,
          productionReadyClaim: false,
          remainingGates: [...REMAINING_GATES],
          trainingAuthorized: false,
        },
        result: {
          baseModelId: approval.baseModelId,
          candidate: {
            artifactFormat,
            artifactSha256: manifest.artifactSetSha256,
            modelId,
          },
          datasetHash: readinessPackage.dataset.datasetHash,
          executionKind: approval.executionKind,
          readinessHash: readinessPackage.readinessHash,
          schemaVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
          status: 'completed',
          trainerReportedActualModelTrainingExecuted: false,
          trainerId: approval.trainerId,
          trainSha256: readinessPackage.exportDigests.train,
          validationSha256: readinessPackage.exportDigests.validation,
        },
      };
      const recoveryReceipt = commitLocalTrainingFailureRecovery(
        recoveryOperation,
        { completedAt: startedAt },
      );
      completion.observation.durableFailureRecoveryValidated = true;
      completion.observation.recoveryOperationId =
        recoveryOperation.operationId;
      completion.observation.recoveryReceiptHash =
        recoveryReceipt.receiptHash;
      completion.observation.workspaceRemovedBeforeObservation =
        recoveryReceipt.workspaceRemoved;
    } catch (error) {
      lastObservation = null;
      if (!recoveryOperation) {
        try {
          fileSystem.rmSync(workspace, {
            force: true,
            recursive: true,
          });
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'MLX-LM training adapter failed and could not clean every staged artifact.',
          );
        }
        throw error;
      }
      try {
        cleanupLocalTrainingFailureRecovery(recoveryOperation, {
          completedAt: startedAt,
          failureCode: completion
            ? 'successful-run-cleanup-failed'
            : 'adapter-execution-failed',
        });
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          completion
            ? 'MLX-LM training adapter workspace cleanup and candidate rollback failed.'
            : 'MLX-LM training adapter failed and could not clean every staged artifact.',
        );
      }
      if (completion) {
        throw new Error(
          'MLX-LM training adapter workspace cleanup failed; published candidate was removed.',
          { cause: error },
        );
      }
      throw error;
    }

    lastObservation = completion.observation;
    return completion.result;
  }

  function buildCleanupRequest({
    approval,
    currentPermission,
    expiresAt,
    postAcquisitionReadiness,
    readinessPackage,
    requestedAt,
    requestedBy,
  } = {}) {
    const bindings = assertBoundTrainingInputs({
      approval,
      currentPermission,
      now: postAcquisitionReadiness?.observedAt,
      permissionRevocation: null,
      postAcquisitionReadiness,
      readinessPackage,
    });
    return buildLocalTrainingFailureCleanupRequest({
      expiresAt,
      operationId:
        deriveLocalTrainingFailureRecoveryOperationId(bindings),
      repoDir: repoRoot,
      requestedAt,
      requestedBy,
    });
  }

  function recoverFailure({ cleanupRequest, recoveredAt } = {}) {
    lastObservation = null;
    return recoverLocalTrainingFailure({
      cleanupRequest,
      recoveredAt,
      repoDir: repoRoot,
    });
  }

  const adapter = Object.freeze({
    contract,
    getLastObservation() {
      return lastObservation
        ? structuredClone(lastObservation)
        : null;
    },
    trainerId: EXPECTED_TOOLCHAIN.trainer.id,
  });
  ADAPTER_STATES.set(adapter, {
    buildCleanupRequest,
    executeTraining,
    recoverFailure,
  });
  return adapter;
}

export function executeMlxLmLoraTrainingAdapter({
  adapter,
  ...input
} = {}) {
  const state = ADAPTER_STATES.get(adapter);
  if (!state) {
    throw new Error(
      'Local training runtime requires a module-issued MLX-LM adapter.',
    );
  }
  return state.executeTraining(input);
}

export function buildMlxLmLoraTrainingCleanupRequest({
  adapter,
  ...input
} = {}) {
  const state = ADAPTER_STATES.get(adapter);
  if (!state) {
    throw new Error(
      'Local training recovery requires a module-issued MLX-LM adapter.',
    );
  }
  return state.buildCleanupRequest(input);
}

export function recoverMlxLmLoraTrainingAdapter({
  adapter,
  ...input
} = {}) {
  const state = ADAPTER_STATES.get(adapter);
  if (!state) {
    throw new Error(
      'Local training recovery requires a module-issued MLX-LM adapter.',
    );
  }
  return state.recoverFailure(input);
}
