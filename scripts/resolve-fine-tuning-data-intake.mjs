import fs from 'node:fs';
import path from 'node:path';

import {
  assertApprovedFineTuningDataIntakeResolution,
  assertFineTuningDataIntakeResolution,
  assertFineTuningDataIntakeResolutionRecord,
  FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION,
  resolveFineTuningDataIntakeRequest,
} from '../src/core/fine-tuning-data-intake-resolution.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const decisionPath = parseDecisionFilename(process.argv.slice(2));
const sources = readSources();
const decision = readPrivateDecision(decisionPath);
const resolvedAt = new Date().toISOString();
const resolution = resolveFineTuningDataIntakeRequest({
  ...sources,
  request: sources.request,
  resolvedAt,
  reviews: decision.reviews,
});

if (resolution.status === 'approved-for-private-collection-planning') {
  assertApprovedFineTuningDataIntakeResolution(resolution, {
    ...sources,
    now: resolvedAt,
    request: sources.request,
  });
} else {
  assertFineTuningDataIntakeResolution(resolution, {
    ...sources,
    now: resolvedAt,
    request: sources.request,
  });
}

const outputDir = prepareOutputDirectory();
assertRequestNotResolved(outputDir, sources);
const outputPath = path.join(
  outputDir,
  `fine-tuning-data-intake-resolution-${sources.request.requestHash}.json`,
);
writeResolution(outputPath, resolution, sources.request.id);
fs.chmodSync(outputPath, 0o600);

console.log(JSON.stringify({
  actualModelTrainingExecuted: resolution.actualModelTrainingExecuted,
  actualUserDataCollected: resolution.actualUserDataCollected,
  collectionExecutionAuthorized: resolution.collectionExecutionAuthorized,
  externalProviderCalls: resolution.externalProviderCalls,
  mode: 'fine-tuning-data-intake-resolution',
  ok: true,
  outputPath: toRepoRelativePath(outputPath),
  privateCollectionPlanAllowed: resolution.privateCollectionPlanAllowed,
  productionReadyClaim: resolution.productionReadyClaim,
  requestId: resolution.request.id,
  resolutionId: resolution.id,
  status: resolution.status,
  trainingAuthorized: resolution.trainingAuthorized,
}, null, 2));

function readSources() {
  const artifactDir = path.join(repoDir, 'evidence', 'output-artifacts');
  return {
    assessment: readBoundedJson(path.join(
      artifactDir,
      'fine-tuning-data-sufficiency.json',
    )),
    collectionPlan: readBoundedJson(path.join(
      artifactDir,
      'fine-tuning-data-collection-plan.json',
    )),
    request: readBoundedJson(path.join(
      artifactDir,
      'fine-tuning-data-intake-request.json',
    )),
  };
}

function parseDecisionFilename(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--decision' ||
    !String(args[1] || '').trim()
  ) {
    throw new Error('Expected --decision <private-json-path>.');
  }
  const filename = path.resolve(repoDir, args[1]);
  const varDir = path.join(repoDir, 'var');
  let canonicalFilename;
  try {
    canonicalFilename = fs.realpathSync(filename);
  } catch {
    throw new Error(
      'Fine-tuning data intake decision must be an owner-only bounded regular file.',
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
      'Fine-tuning data intake decision must remain private under var/ or outside the repository.',
    );
  }
  return filename;
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

function readPrivateDecision(filename) {
  const decision = readOwnerOnlyJson(filename);
  requireExactKeys(
    decision,
    ['requestHash', 'requestId', 'reviews', 'schemaVersion'],
    'decision',
  );
  if (
    decision.schemaVersion !==
      FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION ||
    typeof decision.requestId !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(decision.requestHash || '') ||
    !Array.isArray(decision.reviews)
  ) {
    throw new Error('Fine-tuning data intake private decision is invalid.');
  }
  if (
    decision.requestId !== sources.request.id ||
    decision.requestHash !== sources.request.requestHash
  ) {
    throw new Error(
      'Fine-tuning data intake private decision must bind the current request.',
    );
  }
  return decision;
}

function readOwnerOnlyJson(filename) {
  let descriptor;
  try {
    descriptor = fs.openSync(
      filename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
  } catch {
    throw new Error(
      'Fine-tuning data intake decision must be an owner-only bounded regular file.',
    );
  }

  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyDecisionStat(before);
    const text = fs.readFileSync(descriptor, 'utf8');
    const after = fs.fstatSync(descriptor);
    if (!sameFileObservation(before, after)) {
      throw new Error(
        'Fine-tuning data intake decision changed while it was read.',
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        'Fine-tuning data intake private decision JSON is invalid.',
      );
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertOwnerOnlyDecisionStat(stat) {
  if (
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    (stat.mode & 0o077) !== 0 ||
    !isCurrentUserOwned(stat)
  ) {
    throw new Error(
      'Fine-tuning data intake decision must be an owner-only bounded regular file.',
    );
  }
}

function sameFileObservation(before, after) {
  return before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs;
}

function readBoundedJson(filename) {
  const stat = fs.lstatSync(filename);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES
  ) {
    throw new Error('Fine-tuning data intake input must be a bounded regular file.');
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error('Fine-tuning data intake tracked input JSON is invalid.');
  }
}

function prepareOutputDirectory() {
  let current = repoDir;
  const segments = [
    'var',
    'fine-tuning',
    'data-intake-resolutions',
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
          'Fine-tuning data intake resolution directory must be owner-only and contain no symbolic links.',
        );
      }
      continue;
    }
    fs.mkdirSync(current, { mode: 0o700 });
    fs.chmodSync(current, 0o700);
  }
  const canonicalPath = fs.realpathSync(current);
  if (!isPathWithin(path.join(repoDir, 'var'), canonicalPath)) {
    throw new Error('Fine-tuning data intake resolution directory escaped var/.');
  }
  return canonicalPath;
}

function assertRequestNotResolved(outputDir, currentSources) {
  for (const name of fs.readdirSync(outputDir)) {
    if (!name.startsWith('fine-tuning-data-intake-resolution-') || !name.endsWith('.json')) {
      continue;
    }
    const filename = path.join(outputDir, name);
    const stat = fs.lstatSync(filename);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      stat.size <= 0 ||
      stat.size > MAX_JSON_BYTES ||
      (stat.mode & 0o077) !== 0 ||
      !isCurrentUserOwned(stat)
    ) {
      throw new Error('Fine-tuning data intake resolution history is invalid.');
    }
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(filename, 'utf8'));
      assertFineTuningDataIntakeResolutionRecord(existing);
    } catch {
      throw new Error(
        'Fine-tuning data intake resolution history is invalid.',
      );
    }
    const expectedName =
      `fine-tuning-data-intake-resolution-${existing.request.requestHash}.json`;
    if (name !== expectedName) {
      throw new Error(
        'Fine-tuning data intake resolution history is invalid.',
      );
    }
    if (
      existing.request.id === currentSources.request.id ||
      existing.request.requestHash === currentSources.request.requestHash
    ) {
      try {
        assertFineTuningDataIntakeResolution(existing, {
          ...currentSources,
          request: currentSources.request,
        });
      } catch {
        throw new Error(
          'Fine-tuning data intake resolution history is invalid.',
        );
      }
      throw new Error(
        `Fine-tuning data intake request is already resolved: ${currentSources.request.id}`,
      );
    }
  }
}

function writeResolution(filename, resolution, requestId) {
  try {
    fs.writeFileSync(filename, `${JSON.stringify(resolution, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        `Fine-tuning data intake request is already resolved: ${requestId}`,
      );
    }
    throw error;
  }
}

function requireExactKeys(value, expectedKeys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    throw new Error(
      `Fine-tuning data intake private ${fieldName} fields are invalid.`,
    );
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
