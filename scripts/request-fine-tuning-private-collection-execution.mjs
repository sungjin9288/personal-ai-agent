import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionExecutionRequest,
  assertFineTuningPrivateCollectionExecutionRequestRecord,
  buildFineTuningPrivateCollectionExecutionRequest,
} from '../src/core/fine-tuning-private-collection-execution-request.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const privateInputs = parsePrivateFilenames(process.argv.slice(2));
const sources = readSources();
const privateCollectionPlan = readOwnerOnlyJson(
  privateInputs.plan,
  'Fine-tuning private collection plan',
);
const intakeResolution = readOwnerOnlyJson(
  privateInputs.resolution,
  'Fine-tuning private collection resolution',
);
const requestedAt = new Date().toISOString();
const request = buildFineTuningPrivateCollectionExecutionRequest({
  ...sources,
  intakeResolution,
  privateCollectionPlan,
  requestedAt,
  requestedBy: 'local-operator-role',
});
assertFineTuningPrivateCollectionExecutionRequest(request, {
  ...sources,
  intakeResolution,
  now: requestedAt,
  privateCollectionPlan,
});

const outputDir = prepareOutputDirectory();
assertPlanNotRequested(outputDir, {
  ...sources,
  intakeResolution,
  privateCollectionPlan,
});
const outputPath = path.join(
  outputDir,
  `fine-tuning-private-collection-execution-request-${privateCollectionPlan.planHash}.json`,
);
writeRequest(outputPath, request, privateCollectionPlan.id);
fs.chmodSync(outputPath, 0o600);

console.log(JSON.stringify({
  actionCount: request.requestedActions.length,
  actualUserDataCollected: request.actualUserDataCollected,
  collectionExecutionApprovalRequired:
    request.collectionExecutionApprovalRequired,
  collectionExecutionApprovalRequestCreated:
    request.collectionExecutionApprovalRequestCreated,
  collectionExecutionAuthorized: request.collectionExecutionAuthorized,
  privateCollectionWorkspaceCreationAuthorized:
    request.privateCollectionWorkspaceCreationAuthorized,
  externalProviderCalls: request.externalProviderCalls,
  mode: 'fine-tuning-private-collection-execution-request',
  ok: true,
  outputPath: toRepoRelativePath(outputPath),
  planId: request.privateCollectionPlan.id,
  productionReadyClaim: request.productionReadyClaim,
  requestId: request.id,
  reviewCount: request.requiredReviews.length,
  status: request.status,
  trainingAuthorized: request.trainingAuthorized,
}, null, 2));

function readSources() {
  const artifactDir = path.join(repoDir, 'evidence', 'output-artifacts');
  return {
    assessment: readTrackedJson(path.join(
      artifactDir,
      'fine-tuning-data-sufficiency.json',
    )),
    collectionPlan: readTrackedJson(path.join(
      artifactDir,
      'fine-tuning-data-collection-plan.json',
    )),
    intakeRequest: readTrackedJson(path.join(
      artifactDir,
      'fine-tuning-data-intake-request.json',
    )),
  };
}

function parsePrivateFilenames(args) {
  if (
    args.length !== 4 ||
    args[0] !== '--plan' ||
    !String(args[1] || '').trim() ||
    args[2] !== '--resolution' ||
    !String(args[3] || '').trim()
  ) {
    throw new Error(
      'Expected --plan <private-json-path> --resolution <private-json-path>.',
    );
  }
  return {
    plan: validatePrivateFilename(
      args[1],
      'Fine-tuning private collection plan',
    ),
    resolution: validatePrivateFilename(
      args[3],
      'Fine-tuning private collection resolution',
    ),
  };
}

function validatePrivateFilename(value, errorPrefix) {
  const filename = path.resolve(repoDir, value);
  const varDir = path.join(repoDir, 'var');
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    if (initialFile.isSymbolicLink()) {
      throw new Error();
    }
    assertOwnerOnlyFile(initialFile, errorPrefix);
    canonicalFilename = fs.realpathSync(filename);
    const observedFile = fs.lstatSync(filename);
    const canonicalFile = fs.statSync(canonicalFilename);
    if (
      !sameFileObservation(initialFile, observedFile) ||
      !sameFileObservation(initialFile, canonicalFile)
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      `${errorPrefix} must be an owner-only bounded regular file.`,
    );
  }
  const repoRelativePath = findRelativePathFromDirectory(repoDir, filename);
  const lexicalInsideRepo = repoRelativePath !== null;
  const lexicalInsideVar = repoRelativePath === 'var' ||
    repoRelativePath?.startsWith(`var${path.sep}`);
  const canonicalInsideRepo = isPathWithin(repoDir, canonicalFilename);
  const canonicalInsideVar = isPathWithin(varDir, canonicalFilename);
  if (
    (lexicalInsideRepo && (!lexicalInsideVar || !canonicalInsideVar)) ||
    (canonicalInsideRepo && !canonicalInsideVar)
  ) {
    throw new Error(
      `${errorPrefix} must remain private under var/ or outside the repository.`,
    );
  }
  return { canonicalFilename, filename, initialFile };
}

function findRelativePathFromDirectory(directory, candidate) {
  const directoryStat = fs.statSync(directory);
  let current = candidate;
  while (true) {
    try {
      const currentStat = fs.statSync(current);
      if (
        currentStat.dev === directoryStat.dev &&
        currentStat.ino === directoryStat.ino
      ) {
        return path.relative(current, candidate);
      }
    } catch {
      // The bounded file check reports missing or unreadable paths.
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function readOwnerOnlyJson(input, errorPrefix) {
  const {
    canonicalFilename,
    filename,
    initialFile,
  } = typeof input === 'string'
    ? { canonicalFilename: input, filename: input, initialFile: null }
    : input;
  let descriptor;
  try {
    descriptor = fs.openSync(
      canonicalFilename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyFile(before, errorPrefix);
    if (initialFile && !sameFileObservation(initialFile, before)) {
      throw new Error(`${errorPrefix} changed before it was read.`);
    }
    if (initialFile) {
      let currentCanonicalFilename;
      let currentCanonicalTarget;
      try {
        currentCanonicalFilename = fs.realpathSync(filename);
        currentCanonicalTarget = fs.realpathSync(canonicalFilename);
      } catch {
        throw new Error(`${errorPrefix} changed before it was read.`);
      }
      if (
        currentCanonicalFilename !== canonicalFilename ||
        currentCanonicalTarget !== canonicalFilename
      ) {
        throw new Error(`${errorPrefix} changed before it was read.`);
      }
    }
    const text = fs.readFileSync(descriptor, 'utf8');
    const after = fs.fstatSync(descriptor);
    if (!sameFileObservation(before, after)) {
      throw new Error(`${errorPrefix} changed while it was read.`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${errorPrefix} JSON is invalid.`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertOwnerOnlyFile(stat, errorPrefix) {
  if (
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    (stat.mode & 0o077) !== 0 ||
    !isCurrentUserOwned(stat)
  ) {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
}

function sameFileObservation(before, after) {
  return before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs;
}

function readTrackedJson(filename) {
  const stat = fs.lstatSync(filename);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES
  ) {
    throw new Error(
      'Fine-tuning private collection execution tracked input must be a bounded regular file.',
    );
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error(
      'Fine-tuning private collection execution tracked input JSON is invalid.',
    );
  }
}

function prepareOutputDirectory() {
  let current = repoDir;
  const segments = [
    'var',
    'fine-tuning',
    'private-collection-execution-requests',
  ];
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        !isCurrentUserOwned(stat) ||
        (index === 0
          ? (stat.mode & 0o022) !== 0
          : (stat.mode & 0o077) !== 0)
      ) {
        throw new Error(
          'Fine-tuning private collection execution request directory must be owner-only and contain no symbolic links.',
        );
      }
      continue;
    }
    fs.mkdirSync(current, { mode: 0o700 });
    fs.chmodSync(current, 0o700);
  }
  const canonicalPath = fs.realpathSync(current);
  if (!isPathWithin(path.join(repoDir, 'var'), canonicalPath)) {
    throw new Error(
      'Fine-tuning private collection execution request directory escaped var/.',
    );
  }
  return canonicalPath;
}

function assertPlanNotRequested(outputDir, currentSources) {
  for (const name of fs.readdirSync(outputDir)) {
    if (
      !name.startsWith(
        'fine-tuning-private-collection-execution-request-',
      ) ||
      !name.endsWith('.json')
    ) {
      continue;
    }
    const filename = path.join(outputDir, name);
    let existing;
    try {
      existing = readOwnerOnlyJson(
        filename,
        'Fine-tuning private collection execution request history',
      );
      assertFineTuningPrivateCollectionExecutionRequestRecord(existing);
    } catch {
      throw new Error(
        'Fine-tuning private collection execution request history is invalid.',
      );
    }
    const expectedName =
      `fine-tuning-private-collection-execution-request-${existing.privateCollectionPlan.planHash}.json`;
    if (name !== expectedName) {
      throw new Error(
        'Fine-tuning private collection execution request history is invalid.',
      );
    }
    if (
      existing.privateCollectionPlan.id ===
        currentSources.privateCollectionPlan.id ||
      existing.privateCollectionPlan.planHash ===
        currentSources.privateCollectionPlan.planHash
    ) {
      try {
        assertFineTuningPrivateCollectionExecutionRequest(existing, {
          ...currentSources,
          now: existing.requestedAt,
        });
      } catch {
        throw new Error(
          'Fine-tuning private collection execution request history is invalid.',
        );
      }
      throw new Error(
        `Fine-tuning private collection plan is already requested: ${currentSources.privateCollectionPlan.id}`,
      );
    }
  }
}

function writeRequest(filename, request, planId) {
  try {
    fs.writeFileSync(filename, `${JSON.stringify(request, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        `Fine-tuning private collection plan is already requested: ${planId}`,
      );
    }
    throw error;
  }
}

function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function toRepoRelativePath(filename) {
  return path.relative(repoDir, filename).split(path.sep).join('/');
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}
