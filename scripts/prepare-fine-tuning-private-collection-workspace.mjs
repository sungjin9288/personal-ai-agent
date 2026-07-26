import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
  buildFineTuningPrivateCollectionWorkspace,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const privateInputs = parsePrivateFilenames(process.argv.slice(2));
const sources = readSources();
const executionResolution = readOwnerOnlyJson(
  privateInputs.executionResolution,
  'Fine-tuning private collection execution resolution',
);
const executionRequest = readOwnerOnlyJson(
  privateInputs.executionRequest,
  'Fine-tuning private collection execution request',
);
const privateCollectionPlan = readOwnerOnlyJson(
  privateInputs.plan,
  'Fine-tuning private collection plan',
);
const intakeResolution = readOwnerOnlyJson(
  privateInputs.intakeResolution,
  'Fine-tuning private collection intake resolution',
);
const currentSources = {
  ...sources,
  executionRequest,
  executionResolution,
  intakeResolution,
  privateCollectionPlan,
};
const outputRoot = prepareOutputRoot();
assertWorkspaceHistory(outputRoot, currentSources);
const preparedAt = new Date().toISOString();
const workspace = buildFineTuningPrivateCollectionWorkspace({
  ...currentSources,
  preparedAt,
});
publishWorkspace(outputRoot, workspace, currentSources);

console.log(JSON.stringify({
  actualUserDataCollected: workspace.actualUserDataCollected,
  collectionExecutionAuthorized: workspace.collectionExecutionAuthorized,
  collectionItemCount: workspace.collectionItemCount,
  collectionStarted: workspace.collectionStarted,
  externalProviderCalls: workspace.externalProviderCalls,
  mode: 'fine-tuning-private-collection-workspace',
  ok: true,
  privateCollectionWorkspacePrepared: workspace.privateCollectionWorkspacePrepared,
  productionReadyClaim: workspace.productionReadyClaim,
  status: workspace.status,
  trainingAuthorized: workspace.trainingAuthorized,
  workspaceContainsCollectionData: workspace.workspaceContainsCollectionData,
  workspaceId: workspace.id,
  workspacePathStored: workspace.workspacePathStored,
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
    args.length !== 8 ||
    args[0] !== '--execution-resolution' ||
    !String(args[1] || '').trim() ||
    args[2] !== '--execution-request' ||
    !String(args[3] || '').trim() ||
    args[4] !== '--plan' ||
    !String(args[5] || '').trim() ||
    args[6] !== '--intake-resolution' ||
    !String(args[7] || '').trim()
  ) {
    throw new Error(
      'Expected --execution-resolution <private-json-path> --execution-request <private-json-path> --plan <private-json-path> --intake-resolution <private-json-path>.',
    );
  }
  return {
    executionResolution: validatePrivateFilename(
      args[1],
      'Fine-tuning private collection execution resolution',
    ),
    executionRequest: validatePrivateFilename(
      args[3],
      'Fine-tuning private collection execution request',
    ),
    intakeResolution: validatePrivateFilename(
      args[7],
      'Fine-tuning private collection intake resolution',
    ),
    plan: validatePrivateFilename(
      args[5],
      'Fine-tuning private collection plan',
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
  const { canonicalFilename, filename, initialFile } = input;
  let descriptor;
  try {
    descriptor = fs.openSync(
      canonicalFilename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
  } catch {
    throw new Error(
      `${errorPrefix} must be an owner-only bounded regular file.`,
    );
  }
  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyFile(before, errorPrefix);
    if (!sameFileObservation(initialFile, before)) {
      throw new Error(`${errorPrefix} changed before it was read.`);
    }
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
    throw new Error(
      `${errorPrefix} must be an owner-only bounded regular file.`,
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
      'Fine-tuning private collection workspace tracked input must be a bounded regular file.',
    );
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error(
      'Fine-tuning private collection workspace tracked input JSON is invalid.',
    );
  }
}

function prepareOutputRoot() {
  try {
    let current = repoDir;
    const segments = [
      'var',
      'fine-tuning',
      'private-collection-workspaces',
    ];
    for (const [index, segment] of segments.entries()) {
      current = path.join(current, segment);
      if (fs.existsSync(current)) {
        assertOwnerOnlyDirectory(current, {
          allowGroupWrite: index === 0,
          errorMessage:
            'Fine-tuning private collection workspace directory must be owner-only and contain no symbolic links.',
        });
        continue;
      }
      fs.mkdirSync(current, { mode: 0o700 });
      fs.chmodSync(current, 0o700);
    }
    const canonicalPath = fs.realpathSync(current);
    if (!isPathWithin(path.join(repoDir, 'var'), canonicalPath)) {
      throw new Error();
    }
    return canonicalPath;
  } catch {
    throw new Error(
      'Fine-tuning private collection workspace directory must be owner-only and contain no symbolic links.',
    );
  }
}

function assertWorkspaceHistory(outputRoot, currentSources) {
  let names;
  try {
    names = fs.readdirSync(outputRoot);
  } catch {
    throw new Error('Fine-tuning private collection workspace history is invalid.');
  }
  for (const name of names) {
    const directory = path.join(outputRoot, name);
    let existing;
    try {
      if (!/^fine-tuning-private-collection-workspace-[a-f0-9]{64}$/u.test(name)) {
        throw new Error();
      }
      assertOwnerOnlyDirectory(directory, {
        errorMessage: 'Fine-tuning private collection workspace history is invalid.',
      });
      existing = readOwnerOnlyJson(
        validatePrivateFilename(
          path.join(directory, 'workspace.json'),
          'Fine-tuning private collection workspace history',
        ),
        'Fine-tuning private collection workspace history',
      );
      assertFineTuningPrivateCollectionWorkspaceRecord(existing);
      if (
        name !==
        `fine-tuning-private-collection-workspace-${existing.executionResolution.resolutionHash}`
      ) {
        throw new Error();
      }
      assertWorkspaceContents(directory);
    } catch {
      throw new Error('Fine-tuning private collection workspace history is invalid.');
    }
    if (
      existing.executionResolution.id === currentSources.executionResolution.id ||
      existing.executionResolution.resolutionHash ===
        currentSources.executionResolution.resolutionHash
    ) {
      try {
        assertFineTuningPrivateCollectionWorkspace(existing, {
          ...currentSources,
          now: existing.preparedAt,
        });
      } catch {
        throw new Error('Fine-tuning private collection workspace history is invalid.');
      }
      throw new Error('Fine-tuning private collection workspace is already prepared.');
    }
  }
}

function assertWorkspaceContents(directory) {
  const expected = ['answer-quality-cases', 'reviewed-examples', 'workspace.json'];
  const names = fs.readdirSync(directory).sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private collection workspace history is invalid.');
  }
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(directory, lane);
    assertOwnerOnlyDirectory(laneDirectory, {
      errorMessage: 'Fine-tuning private collection workspace history is invalid.',
    });
    if (fs.readdirSync(laneDirectory).length !== 0) {
      throw new Error('Fine-tuning private collection workspace history is invalid.');
    }
  }
}

function publishWorkspace(outputRoot, workspace, currentSources) {
  const directory = path.join(
    outputRoot,
    `fine-tuning-private-collection-workspace-${workspace.executionResolution.resolutionHash}`,
  );
  if (fs.existsSync(directory)) {
    throw new Error('Fine-tuning private collection workspace is already prepared.');
  }
  const stagingDirectory = createStagingDirectory(outputRoot);
  try {
    writeWorkspace(stagingDirectory, workspace);
    assertFineTuningPrivateCollectionWorkspace(workspace, {
      ...currentSources,
      now: new Date().toISOString(),
    });
    if (fs.existsSync(directory)) {
      throw new Error('Fine-tuning private collection workspace is already prepared.');
    }
    fs.renameSync(stagingDirectory, directory);
    assertWorkspaceContents(directory);
    fsyncDirectory(outputRoot);
  } catch (error) {
    removeKnownStagingDirectory(stagingDirectory, workspace);
    if (error?.message === 'Fine-tuning private collection workspace is already prepared.') {
      throw error;
    }
    if (error?.message?.includes('expired')) {
      throw error;
    }
    throw new Error('Fine-tuning private collection workspace publish failed.');
  }
}

function createStagingDirectory(outputRoot) {
  try {
    const directory = fs.mkdtempSync(path.join(
      outputRoot,
      '.fine-tuning-private-collection-workspace-staging-',
    ));
    fs.chmodSync(directory, 0o700);
    assertOwnerOnlyDirectory(directory, {
      errorMessage: 'Fine-tuning private collection workspace staging is invalid.',
    });
    return directory;
  } catch {
    throw new Error('Fine-tuning private collection workspace staging is invalid.');
  }
}

function writeWorkspace(directory, workspace) {
  const workspaceFile = path.join(directory, 'workspace.json');
  fs.writeFileSync(
    workspaceFile,
    `${JSON.stringify(workspace, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );
  fs.chmodSync(workspaceFile, 0o600);
  for (const lane of workspace.lanes) {
    const laneDirectory = path.join(directory, lane.directory);
    fs.mkdirSync(laneDirectory, { mode: 0o700 });
    fs.chmodSync(laneDirectory, 0o700);
  }
  assertStagedWorkspace(directory, workspace);
  fsyncFile(workspaceFile);
  for (const lane of workspace.lanes) {
    fsyncDirectory(path.join(directory, lane.directory));
  }
  fsyncDirectory(directory);
}

function removeKnownStagingDirectory(directory, workspace) {
  try {
    assertStagedWorkspace(directory, workspace);
    for (const lane of workspace.lanes) {
      fs.rmdirSync(path.join(directory, lane.directory));
    }
    fs.unlinkSync(path.join(directory, 'workspace.json'));
    fs.rmdirSync(directory);
  } catch {
    // Preserve partial or unexpected staging content for manual inspection.
  }
}

function assertStagedWorkspace(directory, workspace) {
  assertWorkspaceContents(directory);
  const workspaceFile = path.join(directory, 'workspace.json');
  const stored = readOwnerOnlyJson(
    validatePrivateFilename(
      workspaceFile,
      'Fine-tuning private collection workspace staging',
    ),
    'Fine-tuning private collection workspace staging',
  );
  assertFineTuningPrivateCollectionWorkspaceRecord(stored);
  if (JSON.stringify(stored) !== JSON.stringify(workspace)) {
    throw new Error('Fine-tuning private collection workspace staging is invalid.');
  }
}

function fsyncFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function fsyncDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
}

function assertOwnerOnlyDirectory(
  directory,
  { allowGroupWrite = false, errorMessage },
) {
  const stat = fs.lstatSync(directory);
  const forbiddenMode = allowGroupWrite ? 0o022 : 0o077;
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !isCurrentUserOwned(stat) ||
    (stat.mode & forbiddenMode) !== 0
  ) {
    throw new Error(errorMessage);
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

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}
