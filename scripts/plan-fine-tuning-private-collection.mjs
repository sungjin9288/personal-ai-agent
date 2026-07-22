import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionPlan,
  assertFineTuningPrivateCollectionPlanRecord,
  buildFineTuningPrivateCollectionPlan,
} from '../src/core/fine-tuning-private-collection-plan.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const resolutionFilename = parsePrivateFilename(process.argv.slice(2));
const sources = readSources();
const resolution = readOwnerOnlyJson(resolutionFilename);
const plannedAt = new Date().toISOString();
const plan = buildFineTuningPrivateCollectionPlan({
  ...sources,
  plannedAt,
  resolution,
});
assertFineTuningPrivateCollectionPlan(plan, {
  ...sources,
  now: plannedAt,
  resolution,
});

const outputDir = prepareOutputDirectory();
assertResolutionNotPlanned(outputDir, { ...sources, resolution });
const outputPath = path.join(
  outputDir,
  `fine-tuning-private-collection-plan-${resolution.resolutionHash}.json`,
);
writePlan(outputPath, plan, resolution.id);
fs.chmodSync(outputPath, 0o600);

console.log(JSON.stringify({
  actualUserDataCollected: plan.actualUserDataCollected,
  collectionExecutionApprovalRequired:
    plan.collectionExecutionApprovalRequired,
  collectionExecutionAuthorized: plan.collectionExecutionAuthorized,
  externalProviderCalls: plan.externalProviderCalls,
  mode: 'fine-tuning-private-collection-plan',
  ok: true,
  outputPath: toRepoRelativePath(outputPath),
  planId: plan.id,
  privateCollectionPlanAllowed: plan.privateCollectionPlanAllowed,
  productionReadyClaim: plan.productionReadyClaim,
  resolutionId: plan.resolution.id,
  status: plan.status,
  stepCount: plan.steps.length,
  trainingAuthorized: plan.trainingAuthorized,
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
    request: readTrackedJson(path.join(
      artifactDir,
      'fine-tuning-data-intake-request.json',
    )),
  };
}

function parsePrivateFilename(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--resolution' ||
    !String(args[1] || '').trim()
  ) {
    throw new Error('Expected --resolution <private-json-path>.');
  }
  const filename = path.resolve(repoDir, args[1]);
  const varDir = path.join(repoDir, 'var');
  let canonicalFilename;
  try {
    canonicalFilename = fs.realpathSync(filename);
  } catch {
    throw new Error(
      'Fine-tuning private collection resolution must be an owner-only bounded regular file.',
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
      'Fine-tuning private collection resolution must remain private under var/ or outside the repository.',
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

function readOwnerOnlyJson(
  filename,
  errorPrefix = 'Fine-tuning private collection resolution',
) {
  let descriptor;
  try {
    descriptor = fs.openSync(
      filename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyFile(before, errorPrefix);
    const text = fs.readFileSync(descriptor, 'utf8');
    const after = fs.fstatSync(descriptor);
    if (!sameFileObservation(before, after)) {
      throw new Error(
        `${errorPrefix} changed while it was read.`,
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `${errorPrefix} JSON is invalid.`,
      );
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
      'Fine-tuning private collection tracked input must be a bounded regular file.',
    );
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error(
      'Fine-tuning private collection tracked input JSON is invalid.',
    );
  }
}

function prepareOutputDirectory() {
  let current = repoDir;
  const segments = ['var', 'fine-tuning', 'private-collection-plans'];
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
          'Fine-tuning private collection plan directory must be owner-only and contain no symbolic links.',
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
      'Fine-tuning private collection plan directory escaped var/.',
    );
  }
  return canonicalPath;
}

function assertResolutionNotPlanned(outputDir, currentSources) {
  for (const name of fs.readdirSync(outputDir)) {
    if (
      !name.startsWith('fine-tuning-private-collection-plan-') ||
      !name.endsWith('.json')
    ) {
      continue;
    }
    const filename = path.join(outputDir, name);
    let existing;
    try {
      existing = readOwnerOnlyJson(
        filename,
        'Fine-tuning private collection plan history',
      );
      assertFineTuningPrivateCollectionPlanRecord(existing);
    } catch {
      throw new Error(
        'Fine-tuning private collection plan history is invalid.',
      );
    }
    const expectedName =
      `fine-tuning-private-collection-plan-${existing.resolution.resolutionHash}.json`;
    if (name !== expectedName) {
      throw new Error(
        'Fine-tuning private collection plan history is invalid.',
      );
    }
    if (
      existing.resolution.id === currentSources.resolution.id ||
      existing.resolution.resolutionHash ===
        currentSources.resolution.resolutionHash
    ) {
      try {
        assertFineTuningPrivateCollectionPlan(existing, {
          ...currentSources,
          now: existing.plannedAt,
        });
      } catch {
        throw new Error(
          'Fine-tuning private collection plan history is invalid.',
        );
      }
      throw new Error(
        `Fine-tuning data intake resolution is already planned: ${currentSources.resolution.id}`,
      );
    }
  }
}

function writePlan(filename, plan, resolutionId) {
  try {
    fs.writeFileSync(filename, `${JSON.stringify(plan, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        `Fine-tuning data intake resolution is already planned: ${resolutionId}`,
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
