import { createHash } from 'node:crypto';
import path from 'node:path';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  assertLocalTrainingExecutionApproval,
  assertLocalTrainingRun,
} from './local-training-runtime.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_CANDIDATE_ARTIFACT_MANIFEST_SCHEMA_VERSION =
  'personal-ai-agent-local-training-candidate-artifact-manifest/v1';
export const LOCAL_TRAINING_CANDIDATE_ARTIFACT_VERIFICATION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-candidate-artifact-verification/v1';

const CANDIDATE_ROOT = 'var/local-training/candidates';
const MANIFEST_FILENAME = 'candidate-manifest.json';
const ARTIFACT_ROOT = 'artifact';
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_MANIFEST_FILES = 128;
const MODES = new Set([
  'fixture-simulated',
  'recorded-local-training',
]);
const REMAINING_GATES = Object.freeze([
  'training-process-provenance-review',
  'explicit-candidate-evaluation-request',
  'candidate-quality-non-regression',
  'rollout-review',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
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

function requireMetadata(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 240 ||
    /[\r\n\0]/u.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(
      `Local training candidate verification ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local training candidate verification ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training candidate verification ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requireMode(value) {
  const normalized = normalizeText(value);
  if (!MODES.has(normalized)) {
    throw new Error(
      'Unsupported local training candidate verification mode.',
    );
  }
  return normalized;
}

function requireRelativePath(value, fieldName) {
  const normalized = normalizeText(value);
  const canonical = path.posix.normalize(normalized);
  if (
    !normalized ||
    normalized.length > 512 ||
    /[\r\n\0]/u.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized) ||
    normalized.includes('\\') ||
    path.posix.isAbsolute(normalized) ||
    canonical !== normalized ||
    canonical === '.' ||
    canonical.startsWith('../')
  ) {
    throw new Error(
      `Local training candidate verification ${fieldName} must remain relative.`,
    );
  }
  return normalized;
}

function normalizeFiles(files) {
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.length > MAX_MANIFEST_FILES
  ) {
    throw new Error(
      'Local training candidate manifest requires a bounded file list.',
    );
  }
  const normalized = files.map((file, index) => {
    if (
      !hasExactKeys(file, ['bytes', 'path', 'sha256']) ||
      !isSha256(file.sha256)
    ) {
      throw new Error(
        `Local training candidate manifest files[${index}] is invalid.`,
      );
    }
    return {
      bytes: requirePositiveInteger(
        file.bytes,
        `files[${index}].bytes`,
      ),
      path: requireRelativePath(
        file.path,
        `files[${index}].path`,
      ),
      sha256: file.sha256,
    };
  });
  const filePaths = normalized.map((file) => file.path);
  if (
    new Set(filePaths).size !== filePaths.length ||
    JSON.stringify(filePaths) !==
      JSON.stringify([...filePaths].sort())
  ) {
    throw new Error(
      'Local training candidate manifest files must be unique and sorted.',
    );
  }
  return normalized;
}

function buildManifestContent({
  approval,
  artifactFormat,
  files,
  modelId,
  readinessPackage,
}) {
  assertFineTuningReadinessPackage(readinessPackage);
  return {
    artifactRoot: ARTIFACT_ROOT,
    files: normalizeFiles(files),
    identity: {
      approvalId: requireMetadata(
        approval?.id,
        'approvalId',
      ),
      artifactFormat: requireMetadata(
        artifactFormat,
        'artifactFormat',
      ),
      baseModelId: requireMetadata(
        approval?.baseModelId,
        'baseModelId',
      ),
      datasetHash: readinessPackage.dataset.datasetHash,
      modelId: requireMetadata(modelId, 'modelId'),
      readinessHash: readinessPackage.readinessHash,
      trainerId: requireMetadata(
        approval?.trainerId,
        'trainerId',
      ),
    },
    schemaVersion:
      LOCAL_TRAINING_CANDIDATE_ARTIFACT_MANIFEST_SCHEMA_VERSION,
  };
}

export function buildLocalTrainingCandidateArtifactManifest(input = {}) {
  const content = buildManifestContent(input);
  return {
    ...content,
    artifactSetSha256: hashRecord(content),
  };
}

function normalizeManifest(
  manifest,
  {
    approval,
    readinessPackage,
    run,
  },
) {
  if (!hasExactKeys(manifest, [
    'artifactRoot',
    'artifactSetSha256',
    'files',
    'identity',
    'schemaVersion',
  ])) {
    throw new Error(
      'Local training candidate manifest has invalid fields.',
    );
  }
  const expected = buildLocalTrainingCandidateArtifactManifest({
    approval,
    artifactFormat: run.candidate.artifactFormat,
    files: manifest.files,
    modelId: run.candidate.modelId,
    readinessPackage,
  });
  if (
    JSON.stringify(manifest) !== JSON.stringify(expected) ||
    expected.artifactSetSha256 !== run.candidate.artifactSha256
  ) {
    throw new Error(
      'Local training candidate manifest failed: integrity-or-run-binding.',
    );
  }
  return expected;
}

function isWithin(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function requireDirectory(
  fileSystem,
  directory,
  boundary,
  fieldName,
) {
  let stat;
  let canonical;
  try {
    stat = fileSystem.lstatSync(directory);
    canonical = fileSystem.realpathSync(directory);
  } catch {
    throw new Error(
      `Local training candidate verification ${fieldName} must be an accessible directory.`,
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      `Local training candidate verification ${fieldName} must be a regular directory.`,
    );
  }
  if (boundary && !isWithin(boundary, canonical)) {
    throw new Error(
      `Local training candidate verification ${fieldName} escaped its approved boundary.`,
    );
  }
  return canonical;
}

function requireFile(
  fileSystem,
  rootPath,
  relativePath,
  fieldName,
) {
  const normalized = requireRelativePath(relativePath, fieldName);
  const candidate = path.resolve(rootPath, normalized);
  if (!isWithin(rootPath, candidate)) {
    throw new Error(
      `Local training candidate verification ${fieldName} escaped its approved boundary.`,
    );
  }
  let stat;
  let canonical;
  try {
    stat = fileSystem.lstatSync(candidate);
    canonical = fileSystem.realpathSync(candidate);
  } catch {
    throw new Error(
      `Local training candidate verification ${fieldName} must be an accessible file.`,
    );
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      `Local training candidate verification ${fieldName} must be a regular file.`,
    );
  }
  if (!isWithin(rootPath, canonical)) {
    throw new Error(
      `Local training candidate verification ${fieldName} escaped its approved boundary.`,
    );
  }
  return {
    bytes: stat.size,
    path: canonical,
  };
}

function readManifest(fileSystem, candidateRoot) {
  const file = requireFile(
    fileSystem,
    candidateRoot,
    MANIFEST_FILENAME,
    'manifest',
  );
  if (file.bytes <= 0 || file.bytes > MAX_MANIFEST_BYTES) {
    throw new Error(
      'Local training candidate verification manifest must be bounded.',
    );
  }
  try {
    return {
      bytes: file.bytes,
      content: JSON.parse(
        fileSystem.readFileSync(file.path, 'utf8'),
      ),
    };
  } catch {
    throw new Error(
      'Local training candidate verification manifest must contain valid JSON.',
    );
  }
}

function listArtifactFiles(
  fileSystem,
  artifactRoot,
  currentDirectory = artifactRoot,
  files = [],
) {
  let entries;
  try {
    entries = fileSystem
      .readdirSync(currentDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    throw new Error(
      'Local training candidate verification could not inspect the artifact directory.',
    );
  }
  for (const entry of entries) {
    const candidate = path.join(currentDirectory, entry.name);
    let stat;
    let canonical;
    try {
      stat = fileSystem.lstatSync(candidate);
      canonical = fileSystem.realpathSync(candidate);
    } catch {
      throw new Error(
        'Local training candidate verification could not inspect an artifact entry.',
      );
    }
    if (stat.isSymbolicLink()) {
      throw new Error(
        'Local training candidate verification rejects symbolic links.',
      );
    }
    if (!isWithin(artifactRoot, canonical)) {
      throw new Error(
        'Local training candidate verification file escaped the artifact root.',
      );
    }
    if (stat.isDirectory()) {
      listArtifactFiles(
        fileSystem,
        artifactRoot,
        canonical,
        files,
      );
      continue;
    }
    if (!stat.isFile()) {
      throw new Error(
        'Local training candidate verification accepts only regular files.',
      );
    }
    files.push(
      path.relative(artifactRoot, canonical)
        .split(path.sep)
        .join('/'),
    );
    if (files.length > MAX_MANIFEST_FILES) {
      throw new Error(
        'Local training candidate verification exceeded the file-count boundary.',
      );
    }
  }
  return files.sort();
}

function hashFile(fileSystem, filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    let stream;
    try {
      stream = fileSystem.createReadStream(filename);
    } catch {
      reject(new Error(
        'Local training candidate verification could not read an artifact file.',
      ));
      return;
    }
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', () => {
      reject(new Error(
        'Local training candidate verification could not read an artifact file.',
      ));
    });
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyArtifactFiles({
  artifactRoot,
  fileSystem,
  manifest,
}) {
  const actualPaths = listArtifactFiles(
    fileSystem,
    artifactRoot,
  );
  const expectedPaths = manifest.files.map((file) => file.path);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      'Local training candidate verification failed: complete-inventory.',
    );
  }

  const files = [];
  let totalBytes = 0;
  for (const [index, expected] of manifest.files.entries()) {
    const actual = requireFile(
      fileSystem,
      artifactRoot,
      expected.path,
      `files[${index}]`,
    );
    const sha256 = await hashFile(fileSystem, actual.path);
    if (
      actual.bytes !== expected.bytes ||
      sha256 !== expected.sha256
    ) {
      throw new Error(
        'Local training candidate verification failed: file-integrity.',
      );
    }
    totalBytes += actual.bytes;
    if (!Number.isSafeInteger(totalBytes)) {
      throw new Error(
        'Local training candidate verification exceeded the size boundary.',
      );
    }
    files.push({
      bytes: actual.bytes,
      pathHash: hashValue(expected.path),
      sha256,
    });
  }
  return {
    artifactFormat: manifest.identity.artifactFormat,
    artifactSetSha256: manifest.artifactSetSha256,
    fileCount: files.length,
    files,
    modelId: manifest.identity.modelId,
    totalBytes,
  };
}

function buildVerificationRecord({
  approval,
  candidate,
  currentPermission,
  manifestBytes,
  mode,
  observedAt,
  postAcquisitionReadiness,
  run,
}) {
  const actualCandidateArtifactsObserved =
    mode === 'recorded-local-training';
  const record = {
    actualCandidateArtifactsObserved,
    actualModelTrainingExecuted: false,
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    candidate,
    candidateEvaluationAuthorized: false,
    candidateEvaluationRequired: true,
    externalProviderCalls: actualCandidateArtifactsObserved
      ? 'not-observed-by-verifier'
      : 'none',
    externalSubmissionAuthorized: false,
    fileContentStored: false,
    independentCandidateArtifactVerificationPassed: true,
    mode,
    observedAt,
    observedDiskBytes: manifestBytes + candidate.totalBytes,
    postAcquisitionReadiness: {
      id: postAcquisitionReadiness.id,
      readinessHash: postAcquisitionReadiness.readinessHash,
    },
    productPermission: {
      id: currentPermission.id,
      permissionHash: currentPermission.permissionHash,
    },
    productionReadyClaim: false,
    readyForExplicitCandidateEvaluationRequest:
      actualCandidateArtifactsObserved,
    remainingGates: [...REMAINING_GATES],
    rollback: {
      activationAuthorized: false,
      baseline: 'current-provider-model-prompt-and-rag-path',
      owner: approval.rollbackOwner,
    },
    rolloutAuthorized: false,
    run: {
      id: run.id,
      runHash: run.runHash,
    },
    schemaVersion:
      LOCAL_TRAINING_CANDIDATE_ARTIFACT_VERIFICATION_SCHEMA_VERSION,
    status: actualCandidateArtifactsObserved
      ? 'candidate-artifact-observed-provenance-review-required'
      : 'fixture-candidate-artifact-verified-no-training',
    trainerReportedActualModelTrainingExecuted:
      run.trainerReportedActualModelTrainingExecuted,
    trainingProcessProvenanceVerified: false,
  };
  const verificationHash = hashRecord(record);
  return {
    ...record,
    id: `local-training-candidate-artifact-verification-${verificationHash}`,
    verificationHash,
  };
}

function assertCandidate(candidate) {
  const hasValidShape = hasExactKeys(candidate, [
    'artifactFormat',
    'artifactSetSha256',
    'fileCount',
    'files',
    'modelId',
    'totalBytes',
  ]);
  if (!hasValidShape) {
    throw new Error(
      'Local training candidate verification record failed: candidate.',
    );
  }
  requireMetadata(candidate.artifactFormat, 'artifactFormat');
  requireMetadata(candidate.modelId, 'modelId');
  if (
    !isSha256(candidate.artifactSetSha256) ||
    !Number.isSafeInteger(candidate.fileCount) ||
    candidate.fileCount <= 0 ||
    !Number.isSafeInteger(candidate.totalBytes) ||
    candidate.totalBytes <= 0 ||
    !Array.isArray(candidate.files) ||
    candidate.files.length !== candidate.fileCount
  ) {
    throw new Error(
      'Local training candidate verification record failed: candidate.',
    );
  }
  let totalBytes = 0;
  const pathHashes = new Set();
  for (const file of candidate.files) {
    if (
      !hasExactKeys(file, ['bytes', 'pathHash', 'sha256']) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes <= 0 ||
      !isSha256(file.pathHash) ||
      !isSha256(file.sha256)
    ) {
      throw new Error(
        'Local training candidate verification record failed: candidate.',
      );
    }
    pathHashes.add(file.pathHash);
    totalBytes += file.bytes;
  }
  if (
    pathHashes.size !== candidate.fileCount ||
    totalBytes !== candidate.totalBytes
  ) {
    throw new Error(
      'Local training candidate verification record failed: candidate.',
    );
  }
}

export function assertLocalTrainingCandidateArtifactVerification(
  verification,
) {
  const { id, verificationHash, ...record } = verification || {};
  const expectedHash = hashRecord(record);
  const isRecorded = record.mode === 'recorded-local-training';
  const expectedStatus = isRecorded
    ? 'candidate-artifact-observed-provenance-review-required'
    : 'fixture-candidate-artifact-verified-no-training';
  const expectedExternalCalls = isRecorded
    ? 'not-observed-by-verifier'
    : 'none';

  if (
    !hasExactKeys(record, [
      'actualCandidateArtifactsObserved',
      'actualModelTrainingExecuted',
      'approval',
      'candidate',
      'candidateEvaluationAuthorized',
      'candidateEvaluationRequired',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'fileContentStored',
      'independentCandidateArtifactVerificationPassed',
      'mode',
      'observedAt',
      'observedDiskBytes',
      'postAcquisitionReadiness',
      'productPermission',
      'productionReadyClaim',
      'readyForExplicitCandidateEvaluationRequest',
      'remainingGates',
      'rollback',
      'rolloutAuthorized',
      'run',
      'schemaVersion',
      'status',
      'trainerReportedActualModelTrainingExecuted',
      'trainingProcessProvenanceVerified',
    ]) ||
    !hasExactKeys(record.approval, ['approvalHash', 'id']) ||
    !hasExactKeys(record.postAcquisitionReadiness, ['id', 'readinessHash']) ||
    !hasExactKeys(record.productPermission, ['id', 'permissionHash']) ||
    !hasExactKeys(record.rollback, ['activationAuthorized', 'baseline', 'owner']) ||
    !hasExactKeys(record.run, ['id', 'runHash']) ||
    !MODES.has(record.mode) ||
    record.schemaVersion !==
      LOCAL_TRAINING_CANDIDATE_ARTIFACT_VERIFICATION_SCHEMA_VERSION ||
    record.status !== expectedStatus ||
    record.actualCandidateArtifactsObserved !== isRecorded ||
    record.actualModelTrainingExecuted !== false ||
    record.candidateEvaluationAuthorized !== false ||
    record.candidateEvaluationRequired !== true ||
    record.externalProviderCalls !== expectedExternalCalls ||
    record.externalSubmissionAuthorized !== false ||
    record.fileContentStored !== false ||
    record.independentCandidateArtifactVerificationPassed !== true ||
    record.productionReadyClaim !== false ||
    record.readyForExplicitCandidateEvaluationRequest !== isRecorded ||
    JSON.stringify(record.remainingGates) !==
      JSON.stringify(REMAINING_GATES) ||
    record.rollback.activationAuthorized !== false ||
    record.rollback.baseline !==
      'current-provider-model-prompt-and-rag-path' ||
    !requireMetadata(record.rollback.owner, 'rollback owner') ||
    record.rolloutAuthorized !== false ||
    record.trainerReportedActualModelTrainingExecuted !== true ||
    record.trainingProcessProvenanceVerified !== false ||
    !isSha256(record.approval.approvalHash) ||
    record.approval.id !==
      `local-training-approval-${record.approval.approvalHash}` ||
    !isSha256(record.postAcquisitionReadiness.readinessHash) ||
    !requireMetadata(
      record.postAcquisitionReadiness.id,
      'post-acquisition readiness id',
    ) ||
    !isSha256(record.productPermission.permissionHash) ||
    !requireMetadata(
      record.productPermission.id,
      'product permission id',
    ) ||
    !isSha256(record.run.runHash) ||
    record.run.id !== `local-training-run-${record.run.runHash}` ||
    !Number.isFinite(Date.parse(record.observedAt)) ||
    !Number.isSafeInteger(record.observedDiskBytes) ||
    record.observedDiskBytes <= 0 ||
    verificationHash !== expectedHash ||
    id !==
      `local-training-candidate-artifact-verification-${expectedHash}`
  ) {
    throw new Error(
      'Local training candidate verification record failed: integrity.',
    );
  }
  assertCandidate(record.candidate);
  if (record.observedDiskBytes <= record.candidate.totalBytes) {
    throw new Error(
      'Local training candidate verification record failed: disk-evidence.',
    );
  }
  return verification;
}

export function createLocalTrainingCandidateArtifactVerifier({
  clock = () => new Date().toISOString(),
  fileSystem,
  repoDir,
} = {}) {
  if (
    !fileSystem ||
    typeof fileSystem.createReadStream !== 'function' ||
    typeof fileSystem.lstatSync !== 'function' ||
    typeof fileSystem.readFileSync !== 'function' ||
    typeof fileSystem.readdirSync !== 'function' ||
    typeof fileSystem.realpathSync !== 'function'
  ) {
    throw new Error(
      'Local training candidate verification requires a filesystem.',
    );
  }
  if (!normalizeText(repoDir)) {
    throw new Error(
      'Local training candidate verification requires repoDir.',
    );
  }
  const repoRoot = requireDirectory(
    fileSystem,
    path.resolve(repoDir),
    null,
    'repoDir',
  );

  return {
    async verify({
      approval,
      currentPermission,
      mode = 'recorded-local-training',
      permissionRevocation,
      postAcquisitionReadiness,
      readinessPackage,
      run,
    } = {}) {
      const normalizedMode = requireMode(mode);
      const observedAt = requireTimestamp(clock(), 'observedAt');
      assertLocalTrainingExecutionApproval({
        approval,
        currentPermission,
        now: observedAt,
        permissionRevocation,
        postAcquisitionReadiness,
        readinessPackage,
        timeoutMs: 1,
        trainerId: approval?.trainerId,
      });
      assertLocalTrainingRun({
        approval,
        currentPermission,
        postAcquisitionReadiness,
        readinessPackage,
        run,
      });
      if (
        run.execution.kind !== 'local-model-training' ||
        run.trainerReportedActualModelTrainingExecuted !== true ||
        Date.parse(run.completedAt) > Date.parse(observedAt)
      ) {
        throw new Error(
          'Local training candidate verification failed: run-binding.',
        );
      }

      const candidateRoot = path.resolve(
        repoRoot,
        CANDIDATE_ROOT,
        approval.id,
      );
      if (!isWithin(repoRoot, candidateRoot)) {
        throw new Error(
          'Local training candidate verification root escaped the repository.',
        );
      }
      const verifiedCandidateRoot = requireDirectory(
        fileSystem,
        candidateRoot,
        repoRoot,
        'candidateRoot',
      );
      const manifestRecord = readManifest(
        fileSystem,
        verifiedCandidateRoot,
      );
      const manifest = normalizeManifest(
        manifestRecord.content,
        {
          approval,
          readinessPackage,
          run,
        },
      );
      const artifactRoot = requireDirectory(
        fileSystem,
        path.join(
          verifiedCandidateRoot,
          manifest.artifactRoot,
        ),
        verifiedCandidateRoot,
        'artifactRoot',
      );
      const candidate = await verifyArtifactFiles({
        artifactRoot,
        fileSystem,
        manifest,
      });
      const observedDiskBytes =
        manifestRecord.bytes + candidate.totalBytes;
      const maxDiskBytes =
        currentPermission.evidence.resource.limits.maxDiskBytes;
      if (observedDiskBytes > maxDiskBytes) {
        throw new Error(
          'Local training candidate verification failed: resource-envelope.',
        );
      }
      const verification = buildVerificationRecord({
        approval,
        candidate,
        currentPermission,
        manifestBytes: manifestRecord.bytes,
        mode: normalizedMode,
        observedAt,
        postAcquisitionReadiness,
        run,
      });
      return assertLocalTrainingCandidateArtifactVerification(
        verification,
      );
    },
  };
}
