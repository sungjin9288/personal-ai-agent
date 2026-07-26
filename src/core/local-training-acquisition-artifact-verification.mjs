import { createHash } from 'node:crypto';
import path from 'node:path';

import {
  assertLocalTrainingAcquisitionRequest,
  buildLocalTrainingAcquisitionPlan,
} from './local-training-acquisition-approval.mjs';
import {
  assertLocalTrainingAcquisitionRun,
} from './local-training-acquisition-runtime.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_ACQUISITION_ARTIFACT_MANIFEST_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-artifact-set/v1';
export const LOCAL_TRAINING_ACQUISITION_ARTIFACT_VERIFICATION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-artifact-verification/v1';

const ARTIFACT_KINDS = {
  'source-model': {
    identityKeys: ['id', 'licenseId', 'revision'],
    root: 'source-model',
  },
  'trainer-package': {
    identityKeys: [
      'id',
      'packageName',
      'releaseCommit',
      'version',
    ],
    root: 'trainer',
  },
};
const VERIFICATION_MODES = new Set([
  'fixture-simulated',
  'recorded-local-acquisition',
]);
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_MANIFEST_FILES = 1_000;
const REMAINING_GATES = Object.freeze([
  'acquisition-provenance-reviewed',
  'egress-closure-independently-reviewed',
  'offline-resource-canary-passed',
  'post-install-product-permission-approved',
]);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function hashValue(value) {
  return createHash('sha256')
    .update(String(value))
    .digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...expectedKeys].sort()),
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
      `Local training artifact verification ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local training artifact verification ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training artifact verification ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requireArtifactKind(value) {
  const normalized = normalizeText(value);
  if (!ARTIFACT_KINDS[normalized]) {
    throw new Error(
      'Unsupported local training artifact kind.',
    );
  }
  return normalized;
}

function requireVerificationMode(value) {
  const normalized = normalizeText(value);
  if (!VERIFICATION_MODES.has(normalized)) {
    throw new Error(
      'Unsupported local training artifact verification mode.',
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
      `Local training artifact verification ${fieldName} must remain relative.`,
    );
  }
  return normalized;
}

function normalizeIdentity(artifactKind, identity) {
  const definition = ARTIFACT_KINDS[artifactKind];
  if (!hasExactKeys(identity, definition.identityKeys)) {
    throw new Error(
      `Local training ${artifactKind} identity has invalid fields.`,
    );
  }
  return Object.fromEntries(
    definition.identityKeys.map((key) => [
      key,
      requireMetadata(identity[key], `${artifactKind}.${key}`),
    ]),
  );
}

function normalizeFiles(files) {
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.length > MAX_MANIFEST_FILES
  ) {
    throw new Error(
      'Local training artifact manifest requires a bounded file list.',
    );
  }
  const normalized = files.map((file, index) => {
    if (!hasExactKeys(file, ['bytes', 'path', 'sha256'])) {
      throw new Error(
        'Local training artifact manifest file has invalid fields.',
      );
    }
    if (!isSha256(file.sha256)) {
      throw new Error(
        `Local training artifact manifest files[${index}].sha256 must be SHA-256.`,
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
  const paths = normalized.map((file) => file.path);
  const sortedPaths = [...paths].sort();
  if (
    new Set(paths).size !== paths.length ||
    JSON.stringify(paths) !== JSON.stringify(sortedPaths)
  ) {
    throw new Error(
      'Local training artifact manifest files must be unique and sorted.',
    );
  }
  return normalized;
}

function buildManifestContent({
  artifactKind,
  files,
  identity,
}) {
  const normalizedArtifactKind = requireArtifactKind(artifactKind);
  return {
    artifactKind: normalizedArtifactKind,
    artifactRoot: ARTIFACT_KINDS[normalizedArtifactKind].root,
    files: normalizeFiles(files),
    identity: normalizeIdentity(
      normalizedArtifactKind,
      identity,
    ),
    schemaVersion:
      LOCAL_TRAINING_ACQUISITION_ARTIFACT_MANIFEST_SCHEMA_VERSION,
  };
}

export function buildLocalTrainingAcquisitionArtifactManifest(input = {}) {
  const content = buildManifestContent(input);
  return {
    ...content,
    artifactSetSha256: hashRecord(content),
  };
}

function normalizeManifest(manifest, {
  artifactKind,
  expectedIdentity,
}) {
  if (!hasExactKeys(manifest, [
    'artifactKind',
    'artifactRoot',
    'artifactSetSha256',
    'files',
    'identity',
    'schemaVersion',
  ])) {
    throw new Error(
      'Local training artifact manifest has invalid fields.',
    );
  }
  const expected = buildLocalTrainingAcquisitionArtifactManifest({
    artifactKind,
    files: manifest.files,
    identity: manifest.identity,
  });
  if (
    manifest.schemaVersion !== expected.schemaVersion ||
    manifest.artifactKind !== expected.artifactKind ||
    manifest.artifactRoot !== expected.artifactRoot ||
    manifest.artifactSetSha256 !== expected.artifactSetSha256 ||
    JSON.stringify(manifest.identity) !==
      JSON.stringify(expectedIdentity)
  ) {
    throw new Error(
      `Local training ${artifactKind} manifest failed: integrity-or-pin.`,
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

function requireDirectory(fileSystem, directory, boundary, fieldName) {
  let stat;
  let canonical;
  try {
    stat = fileSystem.lstatSync(directory);
    canonical = fileSystem.realpathSync(directory);
  } catch {
    throw new Error(
      `Local training artifact verification ${fieldName} must be an accessible directory.`,
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      `Local training artifact verification ${fieldName} must be a regular directory.`,
    );
  }
  if (boundary && !isWithin(boundary, canonical)) {
    throw new Error(
      `Local training artifact verification ${fieldName} escaped its approved boundary.`,
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
      `Local training artifact verification ${fieldName} escaped its approved boundary.`,
    );
  }
  let stat;
  let canonical;
  try {
    stat = fileSystem.lstatSync(candidate);
    canonical = fileSystem.realpathSync(candidate);
  } catch {
    throw new Error(
      `Local training artifact verification ${fieldName} must be an accessible file.`,
    );
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      `Local training artifact verification ${fieldName} must be a regular file.`,
    );
  }
  if (!isWithin(rootPath, canonical)) {
    throw new Error(
      `Local training artifact verification ${fieldName} escaped its approved boundary.`,
    );
  }
  return {
    bytes: stat.size,
    path: canonical,
  };
}

function readManifest(fileSystem, rootPath, relativePath, fieldName) {
  const file = requireFile(
    fileSystem,
    rootPath,
    relativePath,
    fieldName,
  );
  if (file.bytes <= 0 || file.bytes > MAX_MANIFEST_BYTES) {
    throw new Error(
      `Local training artifact verification ${fieldName} must be bounded.`,
    );
  }
  try {
    return JSON.parse(fileSystem.readFileSync(file.path, 'utf8'));
  } catch {
    throw new Error(
      `Local training artifact verification ${fieldName} must contain valid JSON.`,
    );
  }
}

function hashFile(fileSystem, filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fileSystem.createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', () => {
      reject(new Error(
        'Local training artifact verification could not read an artifact file.',
      ));
    });
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyManifestFiles({
  artifactRoot,
  fileSystem,
  manifest,
}) {
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
        'Local training artifact verification failed: file-integrity.',
      );
    }
    totalBytes += actual.bytes;
    if (!Number.isSafeInteger(totalBytes)) {
      throw new Error(
        'Local training artifact verification exceeded the size boundary.',
      );
    }
    files.push({
      bytes: actual.bytes,
      pathHash: hashValue(expected.path),
      sha256,
    });
  }
  return {
    artifactSetSha256: manifest.artifactSetSha256,
    fileCount: files.length,
    files,
    totalBytes,
  };
}

function expectedIdentities(plan) {
  return {
    'source-model': {
      id: plan.toolchainDecision.sourceModel.id,
      licenseId: plan.toolchainDecision.sourceModel.licenseId,
      revision: plan.toolchainDecision.sourceModel.revision,
    },
    'trainer-package': {
      id: plan.toolchainDecision.trainer.id,
      packageName: plan.toolchainDecision.trainer.packageName,
      releaseCommit: plan.toolchainDecision.trainer.releaseCommit,
      version: plan.toolchainDecision.trainer.version,
    },
  };
}

function buildVerificationRecord({
  approval,
  artifacts,
  mode,
  observedAt,
  request,
  run,
}) {
  const actualArtifactSetsObserved =
    mode === 'recorded-local-acquisition';
  const record = {
    acquisitionProvenanceVerified: false,
    actualArtifactSetsObserved,
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    artifacts,
    externalProviderCalls:
      mode === 'fixture-simulated'
        ? 'none'
        : 'not-observed-by-verifier',
    externalSubmissionAuthorized: false,
    fileContentStored: false,
    independentArtifactVerificationPassed: true,
    mode,
    observedAt,
    productionReadyClaim: false,
    remainingGates: [...REMAINING_GATES],
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    rolloutAuthorized: false,
    run: {
      id: run.id,
      runHash: run.runHash,
    },
    schemaVersion:
      LOCAL_TRAINING_ACQUISITION_ARTIFACT_VERIFICATION_SCHEMA_VERSION,
    status:
      mode === 'fixture-simulated'
        ? 'fixture-artifacts-verified-no-acquisition'
        : 'artifact-sets-observed-provenance-required',
    trainingAuthorized: false,
  };
  const verificationHash = hashRecord(record);
  return {
    ...record,
    id: `local-training-acquisition-artifact-verification-${verificationHash}`,
    verificationHash,
  };
}

function assertArtifactSummary(summary) {
  if (
    !hasExactKeys(summary, [
      'artifactSetSha256',
      'fileCount',
      'files',
      'totalBytes',
    ]) ||
    !isSha256(summary.artifactSetSha256) ||
    !Number.isSafeInteger(summary.fileCount) ||
    summary.fileCount <= 0 ||
    !Number.isSafeInteger(summary.totalBytes) ||
    summary.totalBytes <= 0 ||
    !Array.isArray(summary.files) ||
    summary.files.length !== summary.fileCount
  ) {
    throw new Error(
      'Local training artifact verification record failed: artifacts.',
    );
  }

  let totalBytes = 0;
  for (const file of summary.files) {
    if (
      !hasExactKeys(file, ['bytes', 'pathHash', 'sha256']) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes <= 0 ||
      !isSha256(file.pathHash) ||
      !isSha256(file.sha256)
    ) {
      throw new Error(
        'Local training artifact verification record failed: artifacts.',
      );
    }
    totalBytes += file.bytes;
  }
  if (totalBytes !== summary.totalBytes) {
    throw new Error(
      'Local training artifact verification record failed: artifacts.',
    );
  }
}

export function assertLocalTrainingAcquisitionArtifactVerification(
  verification,
) {
  const {
    id,
    verificationHash,
    ...record
  } = verification || {};
  const expectedHash = hashRecord(record);
  const mode = record.mode;
  const isFixture = mode === 'fixture-simulated';
  const expectedStatus = isFixture
    ? 'fixture-artifacts-verified-no-acquisition'
    : 'artifact-sets-observed-provenance-required';
  const expectedExternalCalls = isFixture
    ? 'none'
    : 'not-observed-by-verifier';

  if (
    !hasExactKeys(record, [
      'acquisitionProvenanceVerified',
      'actualArtifactSetsObserved',
      'actualDependencyInstallationPerformed',
      'actualModelDownloadPerformed',
      'actualModelTrainingExecuted',
      'approval',
      'artifacts',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'fileContentStored',
      'independentArtifactVerificationPassed',
      'mode',
      'observedAt',
      'productionReadyClaim',
      'remainingGates',
      'request',
      'rolloutAuthorized',
      'run',
      'schemaVersion',
      'status',
      'trainingAuthorized',
    ]) ||
    !hasExactKeys(record.approval, ['approvalHash', 'id']) ||
    !hasExactKeys(record.artifacts, [
      'sourceModel',
      'trainerPackage',
    ]) ||
    !hasExactKeys(record.request, ['id', 'requestHash']) ||
    !hasExactKeys(record.run, ['id', 'runHash']) ||
    !VERIFICATION_MODES.has(mode) ||
    record.schemaVersion !==
      LOCAL_TRAINING_ACQUISITION_ARTIFACT_VERIFICATION_SCHEMA_VERSION ||
    record.status !== expectedStatus ||
    record.acquisitionProvenanceVerified !== false ||
    record.actualArtifactSetsObserved !== !isFixture ||
    record.actualDependencyInstallationPerformed !== false ||
    record.actualModelDownloadPerformed !== false ||
    record.actualModelTrainingExecuted !== false ||
    record.externalProviderCalls !== expectedExternalCalls ||
    record.externalSubmissionAuthorized !== false ||
    record.fileContentStored !== false ||
    record.independentArtifactVerificationPassed !== true ||
    record.productionReadyClaim !== false ||
    record.rolloutAuthorized !== false ||
    record.trainingAuthorized !== false ||
    JSON.stringify(record.remainingGates) !==
      JSON.stringify(REMAINING_GATES) ||
    !isSha256(record.approval.approvalHash) ||
    record.approval.id !==
      `local-training-acquisition-approval-${record.approval.approvalHash}` ||
    !isSha256(record.request.requestHash) ||
    record.request.id !==
      `local-training-acquisition-request-${record.request.requestHash}` ||
    !isSha256(record.run.runHash) ||
    record.run.id !==
      `local-training-acquisition-run-${record.run.runHash}` ||
    !Number.isFinite(Date.parse(record.observedAt)) ||
    verificationHash !== expectedHash ||
    id !==
      `local-training-acquisition-artifact-verification-${expectedHash}`
  ) {
    throw new Error(
      'Local training artifact verification record failed: integrity.',
    );
  }

  assertArtifactSummary(record.artifacts.sourceModel);
  assertArtifactSummary(record.artifacts.trainerPackage);
  return verification;
}

export function createLocalTrainingAcquisitionArtifactVerifier({
  clock = () => new Date().toISOString(),
  fileSystem,
  repoDir,
} = {}) {
  if (
    !fileSystem ||
    typeof fileSystem.createReadStream !== 'function' ||
    typeof fileSystem.lstatSync !== 'function' ||
    typeof fileSystem.readFileSync !== 'function' ||
    typeof fileSystem.realpathSync !== 'function'
  ) {
    throw new Error(
      'Local training artifact verification requires a filesystem.',
    );
  }
  if (!normalizeText(repoDir)) {
    throw new Error(
      'Local training artifact verification requires repoDir.',
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
      mode = 'recorded-local-acquisition',
      plan,
      request,
      run,
      sourceModelManifestPath,
      toolchainDecision,
      trainerPackageManifestPath,
    } = {}) {
      const normalizedMode = requireVerificationMode(mode);
      const observedAt = requireTimestamp(clock(), 'observedAt');
      assertLocalTrainingAcquisitionRequest(request, toolchainDecision);
      const expectedPlan = buildLocalTrainingAcquisitionPlan({
        approval,
        decision: toolchainDecision,
        now: observedAt,
      });
      if (JSON.stringify(plan) !== JSON.stringify(expectedPlan)) {
        throw new Error(
          'Local training artifact verification failed: plan-integrity.',
        );
      }
      assertLocalTrainingAcquisitionRun(run);
      if (
        run.execution.kind !== 'local-acquisition' ||
        run.status !==
          'adapter-completed-independent-verification-required' ||
        run.approval.id !== approval.id ||
        run.approval.approvalHash !== approval.approvalHash ||
        run.request.id !== request.id ||
        run.request.requestHash !== request.requestHash ||
        Date.parse(run.startedAt) < Date.parse(approval.resolvedAt) ||
        Date.parse(run.completedAt) > Date.parse(observedAt)
      ) {
        throw new Error(
          'Local training artifact verification failed: run-binding.',
        );
      }

      const approvedRoot = path.resolve(
        repoRoot,
        expectedPlan.mutableRoot,
      );
      if (!isWithin(repoRoot, approvedRoot)) {
        throw new Error(
          'Local training artifact verification root escaped the repository.',
        );
      }
      const artifactRoot = requireDirectory(
        fileSystem,
        approvedRoot,
        repoRoot,
        'artifactRoot',
      );
      const identities = expectedIdentities(expectedPlan);
      const trainerManifest = normalizeManifest(
        readManifest(
          fileSystem,
          artifactRoot,
          trainerPackageManifestPath,
          'trainerPackageManifestPath',
        ),
        {
          artifactKind: 'trainer-package',
          expectedIdentity: identities['trainer-package'],
        },
      );
      const sourceManifest = normalizeManifest(
        readManifest(
          fileSystem,
          artifactRoot,
          sourceModelManifestPath,
          'sourceModelManifestPath',
        ),
        {
          artifactKind: 'source-model',
          expectedIdentity: identities['source-model'],
        },
      );
      const trainerRoot = requireDirectory(
        fileSystem,
        path.join(artifactRoot, trainerManifest.artifactRoot),
        artifactRoot,
        'trainerRoot',
      );
      const sourceRoot = requireDirectory(
        fileSystem,
        path.join(artifactRoot, sourceManifest.artifactRoot),
        artifactRoot,
        'sourceModelRoot',
      );
      const artifacts = {
        sourceModel: await verifyManifestFiles({
          artifactRoot: sourceRoot,
          fileSystem,
          manifest: sourceManifest,
        }),
        trainerPackage: await verifyManifestFiles({
          artifactRoot: trainerRoot,
          fileSystem,
          manifest: trainerManifest,
        }),
      };
      if (
        artifacts.sourceModel.artifactSetSha256 !==
          run.adapterReport.artifactEvidence.sourceModelSha256 ||
        artifacts.trainerPackage.artifactSetSha256 !==
          run.adapterReport.artifactEvidence.trainerPackageSha256
      ) {
        throw new Error(
          'Local training artifact verification failed: adapter-hash-binding.',
        );
      }
      if (
        artifacts.sourceModel.totalBytes >
          expectedPlan.resourceEnvelope.maxDownloadBytes ||
        artifacts.sourceModel.totalBytes +
          artifacts.trainerPackage.totalBytes >
          expectedPlan.resourceEnvelope.maxDiskBytes
      ) {
        throw new Error(
          'Local training artifact verification failed: resource-envelope.',
        );
      }
      const verification = buildVerificationRecord({
        approval,
        artifacts,
        mode: normalizedMode,
        observedAt,
        request,
        run,
      });
      return assertLocalTrainingAcquisitionArtifactVerification(
        verification,
      );
    },
  };
}
