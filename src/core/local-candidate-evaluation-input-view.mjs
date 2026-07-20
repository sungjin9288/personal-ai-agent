import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

import {
  assertCurrentLocalCandidateEvaluator,
  assertLocalCandidateEvaluatorProvenance,
  copyLocalCandidateEvaluatorBundle,
} from './local-candidate-evaluator-provenance.mjs';
import {
  createLocalCandidateEvaluationWorkspace,
} from './local-candidate-evaluation-workspace-recovery.mjs';
import {
  assertLocalTrainingCandidateArtifactVerification,
  buildLocalTrainingCandidateArtifactManifest,
  createLocalTrainingCandidateArtifactVerifier,
} from './local-training-candidate-artifact-verification.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_CANDIDATE_EVALUATION_SUITE_SCHEMA_VERSION =
  'personal-ai-agent-answer-quality-fixture/v1';

const CANDIDATE_ROOT = 'var/local-training/candidates';
const EVALUATION_SUITE_PATH =
  'evaluation/evaluation-suite.json';
const MAX_CANDIDATE_MANIFEST_BYTES = 256 * 1024;
const MAX_EVALUATION_SUITE_BYTES = 1024 * 1024;

function normalizeText(value) {
  return String(value || '').trim();
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
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

function assertSafeSuiteValue(value) {
  if (typeof value === 'string') {
    if (
      containsTrainingSecret(value) ||
      containsRawCustomerPayload(value)
    ) {
      throw new Error(
        'Local candidate evaluation suite must not contain secrets or direct customer identifiers.',
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertSafeSuiteValue);
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(assertSafeSuiteValue);
  }
}

function parseEvaluationSuite(content) {
  if (typeof content !== 'string') {
    throw new Error(
      'Local candidate evaluation suite content must be a JSON string.',
    );
  }
  const byteLength = Buffer.byteLength(content, 'utf8');
  if (
    byteLength <= 0 ||
    byteLength > MAX_EVALUATION_SUITE_BYTES
  ) {
    throw new Error(
      'Local candidate evaluation suite content exceeds the byte boundary.',
    );
  }
  let suite;
  try {
    suite = JSON.parse(content);
  } catch {
    throw new Error(
      'Local candidate evaluation suite content must contain valid JSON.',
    );
  }
  if (
    !hasExactKeys(suite, [
      'cases',
      'productionReadyClaim',
      'schemaVersion',
      'thresholds',
    ]) ||
    suite.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_SUITE_SCHEMA_VERSION ||
    suite.productionReadyClaim !== false ||
    !Array.isArray(suite.cases) ||
    suite.cases.length === 0 ||
    !suite.thresholds ||
    typeof suite.thresholds !== 'object' ||
    Array.isArray(suite.thresholds)
  ) {
    throw new Error(
      'Local candidate evaluation suite content has an invalid contract.',
    );
  }
  assertSafeSuiteValue(suite);
  const caseIds = suite.cases
    .map((item) => normalizeText(item?.id))
    .sort();
  if (
    caseIds.some((id) => !id || id.length > 240) ||
    new Set(caseIds).size !== caseIds.length
  ) {
    throw new Error(
      'Local candidate evaluation suite requires unique case ids.',
    );
  }
  return {
    byteLength,
    caseIds,
    suite,
  };
}

export function describeLocalCandidateEvaluationSuite(
  content,
  {
    caseIds: expectedCaseIds,
    thresholdsHash: expectedThresholdsHash,
  } = {},
) {
  const parsed = parseEvaluationSuite(content);
  if (
    JSON.stringify(parsed.caseIds) !==
      JSON.stringify(expectedCaseIds) ||
    hashRecord(parsed.suite.thresholds) !==
      expectedThresholdsHash
  ) {
    throw new Error(
      'Local candidate evaluation suite content does not match the admitted case and threshold contract.',
    );
  }
  return {
    byteLength: parsed.byteLength,
    path: EVALUATION_SUITE_PATH,
    schemaVersion: parsed.suite.schemaVersion,
    sha256: hashValue(content),
  };
}

export function assertLocalCandidateEvaluationSuiteArtifact({
  artifact,
  content,
  evaluationSuite,
} = {}) {
  const expected = describeLocalCandidateEvaluationSuite(
    content,
    evaluationSuite,
  );
  if (
    !hasExactKeys(artifact, [
      'byteLength',
      'path',
      'schemaVersion',
      'sha256',
    ]) ||
    JSON.stringify(artifact) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local candidate evaluation suite artifact failed: integrity-or-binding.',
    );
  }
  return artifact;
}

function assertFileSystem(fileSystem) {
  const methods = [
    'chmodSync',
    'createReadStream',
    'createWriteStream',
    'lstatSync',
    'mkdirSync',
    'mkdtempSync',
    'readFileSync',
    'readdirSync',
    'realpathSync',
    'rmSync',
    'writeFileSync',
  ];
  if (
    !fileSystem ||
    methods.some(
      (method) => typeof fileSystem[method] !== 'function',
    )
  ) {
    throw new Error(
      'Local candidate evaluation input view requires a filesystem.',
    );
  }
}

function requireDirectory(fileSystem, value, fieldName) {
  let canonical;
  let stat;
  try {
    const requested = path.resolve(value);
    stat = fileSystem.lstatSync(requested);
    canonical = fileSystem.realpathSync(requested);
  } catch {
    throw new Error(
      `Local candidate evaluation input view ${fieldName} must exist.`,
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      `Local candidate evaluation input view ${fieldName} must be a regular directory.`,
    );
  }
  return canonical;
}

async function copyFileBounded({
  destination,
  fileSystem,
  maximumBytes,
  source,
  state,
}) {
  const counter = new Transform({
    transform(chunk, encoding, callback) {
      state.bytes += chunk.length;
      if (state.bytes > maximumBytes) {
        callback(new Error(
          'Local candidate evaluation input view exceeded the candidate byte boundary.',
        ));
        return;
      }
      callback(null, chunk);
    },
  });
  await pipeline(
    fileSystem.createReadStream(source),
    counter,
    fileSystem.createWriteStream(destination, {
      flags: 'wx',
      mode: 0o600,
    }),
  );
}

function requireRegularFile({
  boundary,
  fileSystem,
  source,
  fieldName,
}) {
  let canonical;
  let stat;
  try {
    stat = fileSystem.lstatSync(source);
    canonical = fileSystem.realpathSync(source);
  } catch {
    throw new Error(
      `Local candidate evaluation input view ${fieldName} must exist.`,
    );
  }
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    !isWithin(boundary, canonical)
  ) {
    throw new Error(
      `Local candidate evaluation input view ${fieldName} must be a contained regular file.`,
    );
  }
  return {
    bytes: stat.size,
    path: canonical,
  };
}

function listCandidateFiles(
  fileSystem,
  artifactRoot,
  maximumEntries,
  currentDirectory = artifactRoot,
  files = [],
  state = { entries: 0 },
) {
  const entries = fileSystem
    .readdirSync(currentDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    state.entries += 1;
    if (state.entries > maximumEntries) {
      throw new Error(
        'Local candidate evaluation input view exceeded the inventory boundary.',
      );
    }
    const candidate = path.join(currentDirectory, entry.name);
    const stat = fileSystem.lstatSync(candidate);
    const canonical = fileSystem.realpathSync(candidate);
    if (
      stat.isSymbolicLink() ||
      !isWithin(artifactRoot, canonical)
    ) {
      throw new Error(
        'Local candidate evaluation input view rejects symbolic links and path escapes.',
      );
    }
    if (stat.isDirectory()) {
      listCandidateFiles(
        fileSystem,
        artifactRoot,
        maximumEntries,
        canonical,
        files,
        state,
      );
      continue;
    }
    if (!stat.isFile()) {
      throw new Error(
        'Local candidate evaluation input view accepts only regular files.',
      );
    }
    files.push(
      path.relative(artifactRoot, canonical)
        .split(path.sep)
        .join('/'),
    );
  }
  return files.sort();
}

function readCandidateManifest({
  candidateArtifactVerification,
  candidateVerificationInput,
  fileSystem,
  sourceCandidateRoot,
}) {
  const manifestFile = requireRegularFile({
    boundary: sourceCandidateRoot,
    fieldName: 'candidate manifest',
    fileSystem,
    source: path.join(
      sourceCandidateRoot,
      'candidate-manifest.json',
    ),
  });
  if (
    manifestFile.bytes <= 0 ||
    manifestFile.bytes > MAX_CANDIDATE_MANIFEST_BYTES ||
    manifestFile.bytes >
      candidateArtifactVerification.observedDiskBytes
  ) {
    throw new Error(
      'Local candidate evaluation input view candidate manifest exceeded the byte boundary.',
    );
  }
  let manifest;
  try {
    manifest = JSON.parse(
      fileSystem.readFileSync(manifestFile.path, 'utf8'),
    );
  } catch {
    throw new Error(
      'Local candidate evaluation input view candidate manifest must contain valid JSON.',
    );
  }
  const expected =
    buildLocalTrainingCandidateArtifactManifest({
      approval: candidateVerificationInput.approval,
      artifactFormat:
        candidateVerificationInput.run.candidate.artifactFormat,
      files: manifest?.files,
      modelId:
        candidateVerificationInput.run.candidate.modelId,
      readinessPackage:
        candidateVerificationInput.readinessPackage,
    });
  const verificationFiles = expected.files.map((file) => ({
    bytes: file.bytes,
    pathHash: hashValue(file.path),
    sha256: file.sha256,
  }));
  if (
    JSON.stringify(manifest) !== JSON.stringify(expected) ||
    expected.artifactSetSha256 !==
      candidateArtifactVerification.candidate.artifactSetSha256 ||
    JSON.stringify(verificationFiles) !==
      JSON.stringify(
        candidateArtifactVerification.candidate.files,
      )
  ) {
    throw new Error(
      'Local candidate evaluation input view failed: manifest-binding.',
    );
  }
  return {
    file: manifestFile,
    manifest: expected,
  };
}

async function copyCandidateFiles({
  destinationCandidateRoot,
  fileSystem,
  manifestRecord,
  maximumBytes,
  sourceCandidateRoot,
}) {
  const state = { bytes: 0, files: 0 };
  fileSystem.mkdirSync(destinationCandidateRoot, {
    mode: 0o700,
    recursive: true,
  });
  await copyFileBounded({
    destination: path.join(
      destinationCandidateRoot,
      'candidate-manifest.json',
    ),
    fileSystem,
    maximumBytes,
    source: manifestRecord.file.path,
    state,
  });
  state.files += 1;

  const sourceArtifactRoot = requireDirectory(
    fileSystem,
    path.join(
      sourceCandidateRoot,
      manifestRecord.manifest.artifactRoot,
    ),
    'artifactRoot',
  );
  if (!isWithin(sourceCandidateRoot, sourceArtifactRoot)) {
    throw new Error(
      'Local candidate evaluation input view artifact root escaped the candidate root.',
    );
  }
  const listedFiles = listCandidateFiles(
    fileSystem,
    sourceArtifactRoot,
    manifestRecord.manifest.files.length * 4 + 16,
  );
  const expectedFiles =
    manifestRecord.manifest.files.map((file) => file.path);
  if (
    JSON.stringify(listedFiles) !==
      JSON.stringify(expectedFiles)
  ) {
    throw new Error(
      'Local candidate evaluation input view failed: complete-inventory.',
    );
  }
  for (const expected of manifestRecord.manifest.files) {
    const sourceFile = requireRegularFile({
      boundary: sourceArtifactRoot,
      fieldName: `candidate file ${expected.path}`,
      fileSystem,
      source: path.resolve(sourceArtifactRoot, expected.path),
    });
    if (sourceFile.bytes !== expected.bytes) {
      throw new Error(
        'Local candidate evaluation input view failed: file-size-binding.',
      );
    }
    const destination = path.resolve(
      destinationCandidateRoot,
      manifestRecord.manifest.artifactRoot,
      expected.path,
    );
    if (!isWithin(destinationCandidateRoot, destination)) {
      throw new Error(
        'Local candidate evaluation input view destination escaped the temporary candidate root.',
      );
    }
    fileSystem.mkdirSync(path.dirname(destination), {
      mode: 0o700,
      recursive: true,
    });
    await copyFileBounded({
      destination,
      fileSystem,
      maximumBytes,
      source: sourceFile.path,
      state,
    });
    state.files += 1;
  }
  return state;
}

function lockTree(fileSystem, root) {
  const entries = fileSystem.readdirSync(root, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    const stat = fileSystem.lstatSync(target);
    if (stat.isDirectory()) {
      lockTree(fileSystem, target);
      fileSystem.chmodSync(target, 0o500);
    } else if (stat.isFile()) {
      fileSystem.chmodSync(target, 0o400);
    } else {
      throw new Error(
        'Local candidate evaluation input view accepts only regular files and directories.',
      );
    }
  }
}

export async function createLocalCandidateEvaluationInputView({
  bootIdentityProvider,
  candidateArtifactVerification,
  candidateVerificationInput,
  createdAt,
  evaluationSuite,
  evaluatorDefinition,
  evaluatorProvenance,
  fileSystem,
  isProcessAlive,
  leaseExpiresAt,
  maximumDiskBytes,
  platform,
  processId,
  repoDir,
  suiteContent,
  temporaryDirectory,
  verifierFactory =
    createLocalTrainingCandidateArtifactVerifier,
} = {}) {
  assertFileSystem(fileSystem);
  assertLocalTrainingCandidateArtifactVerification(
    candidateArtifactVerification,
  );
  assertLocalCandidateEvaluatorProvenance(
    evaluatorProvenance,
  );
  const suiteArtifact =
    assertLocalCandidateEvaluationSuiteArtifact({
      artifact: evaluationSuite?.artifact,
      content: suiteContent,
      evaluationSuite,
    });
  if (
    !Number.isSafeInteger(maximumDiskBytes) ||
    maximumDiskBytes <= 0 ||
    candidateArtifactVerification.observedDiskBytes +
      suiteArtifact.byteLength +
      evaluatorProvenance.bundle.byteLength >
      maximumDiskBytes
  ) {
    throw new Error(
      'Local candidate evaluation input view failed: resource-envelope.',
    );
  }
  const repoRoot = requireDirectory(
    fileSystem,
    repoDir,
    'repoDir',
  );
  const sourceCandidateRoot = requireDirectory(
    fileSystem,
    path.join(
      repoRoot,
      CANDIDATE_ROOT,
      candidateArtifactVerification.approval.id,
    ),
    'candidateRoot',
  );
  if (!isWithin(repoRoot, sourceCandidateRoot)) {
    throw new Error(
      'Local candidate evaluation input view candidate root escaped the repository.',
    );
  }

  const workspace =
    createLocalCandidateEvaluationWorkspace({
      bootIdentityProvider,
      createdAt,
      fileSystem,
      isProcessAlive,
      leaseExpiresAt,
      platform,
      processId,
      temporaryDirectory,
    });
  const { cleanup, rootDir } = workspace;

  try {
    const candidateRoot = path.join(
      rootDir,
      CANDIDATE_ROOT,
      candidateArtifactVerification.approval.id,
    );
    const manifestRecord = readCandidateManifest({
      candidateArtifactVerification,
      candidateVerificationInput,
      fileSystem,
      sourceCandidateRoot,
    });
    const copied = await copyCandidateFiles({
      destinationCandidateRoot: candidateRoot,
      fileSystem,
      manifestRecord,
      maximumBytes:
        candidateArtifactVerification.observedDiskBytes,
      sourceCandidateRoot,
    });
    if (
      copied.bytes !==
        candidateArtifactVerification.observedDiskBytes ||
      copied.files !==
        candidateArtifactVerification.candidate.fileCount + 1
    ) {
      throw new Error(
        'Local candidate evaluation input view failed: complete-candidate-copy.',
      );
    }

    const suitePath = path.join(
      rootDir,
      ...suiteArtifact.path.split('/'),
    );
    fileSystem.mkdirSync(path.dirname(suitePath), {
      mode: 0o700,
      recursive: true,
    });
    fileSystem.writeFileSync(suitePath, suiteContent, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o400,
    });
    const evaluatorRoot = path.join(rootDir, 'evaluator');
    const evaluatorSnapshot =
      copyLocalCandidateEvaluatorBundle({
        definition: evaluatorDefinition,
        destinationRoot: evaluatorRoot,
        expectedProvenance: evaluatorProvenance,
        fileSystem,
      });
    lockTree(fileSystem, candidateRoot);
    lockTree(fileSystem, path.dirname(suitePath));
    lockTree(fileSystem, evaluatorRoot);

    return {
      candidateArtifactRoot: path.posix.join(
        CANDIDATE_ROOT,
        candidateArtifactVerification.approval.id,
        'artifact',
      ),
      cleanup,
      evaluatorEntryPath: evaluatorSnapshot.entryPath,
      evaluatorProvenance,
      markSpawning: workspace.markSpawning,
      rootDir,
      suiteArtifact,
      workspaceRecovery: workspace.recovery,
      async verifyInputs(observedAt) {
        const currentSuiteContent = fileSystem.readFileSync(
          suitePath,
          'utf8',
        );
        assertLocalCandidateEvaluationSuiteArtifact({
          artifact: suiteArtifact,
          content: currentSuiteContent,
          evaluationSuite,
        });
        assertCurrentLocalCandidateEvaluator({
          definition: {
            ...evaluatorDefinition,
            fileSystem,
          },
          expectedProvenance: evaluatorProvenance,
        });
        assertCurrentLocalCandidateEvaluator({
          definition: {
            ...evaluatorSnapshot.definition,
            fileSystem,
          },
          expectedProvenance: evaluatorProvenance,
        });
        const verifier = verifierFactory({
          clock: () => observedAt,
          fileSystem,
          repoDir: rootDir,
        });
        const candidateVerification =
          await verifier.verify(candidateVerificationInput);
        return {
          candidateVerification,
          evaluatorProvenance,
          suiteArtifact,
        };
      },
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
