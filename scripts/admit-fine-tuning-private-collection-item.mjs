import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
  buildFineTuningPrivateCollectionItemAdmission,
  getFineTuningPrivateCollectionLaneCapacity,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

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
const workspaceInput = readWorkspace(
  privateInputs.workspace,
  executionResolution,
);
const envelope = readOwnerOnlyJson(
  privateInputs.envelope,
  'Fine-tuning private collection item envelope',
);
const currentSources = {
  ...sources,
  executionRequest,
  executionResolution,
  intakeResolution,
  privateCollectionPlan,
  workspace: workspaceInput.workspace,
};
const admittedAt = new Date().toISOString();
assertFineTuningPrivateCollectionWorkspace(workspaceInput.workspace, {
  ...currentSources,
  now: admittedAt,
});
assertWorkspaceContents(workspaceInput.workspaceDirectory, currentSources);
const admission = buildFineTuningPrivateCollectionItemAdmission({
  ...currentSources,
  admittedAt,
  envelope,
});
const outputRoot = prepareOutputRoot();
const admissionLock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: admission.workspace.workspaceHash,
});
try {
  assertAdmissionHistory(outputRoot, currentSources, admission);
  publishAdmission(outputRoot, admission, currentSources, workspaceInput);
} finally {
  admissionLock.release();
}

console.log(JSON.stringify({
  actualUserDataCollected: admission.actualUserDataCollected,
  collectionItemCount: admission.collectionItemCount,
  collectionEnvelopeCount: admission.collectionEnvelopeCount,
  externalProviderCalls: admission.externalProviderCalls,
  mode: 'fine-tuning-private-collection-item-admission',
  ok: true,
  productionReadyClaim: admission.productionReadyClaim,
  status: admission.status,
  trainingAuthorized: admission.trainingAuthorized,
  workspaceMutationPerformed: admission.workspaceMutationPerformed,
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
    args.length !== 12 ||
    args[0] !== '--workspace' || !String(args[1] || '').trim() ||
    args[2] !== '--envelope' || !String(args[3] || '').trim() ||
    args[4] !== '--execution-resolution' || !String(args[5] || '').trim() ||
    args[6] !== '--execution-request' || !String(args[7] || '').trim() ||
    args[8] !== '--plan' || !String(args[9] || '').trim() ||
    args[10] !== '--intake-resolution' || !String(args[11] || '').trim()
  ) {
    throw new Error(
      'Expected --workspace <private-json-path> --envelope <private-json-path> --execution-resolution <private-json-path> --execution-request <private-json-path> --plan <private-json-path> --intake-resolution <private-json-path>.',
    );
  }
  return {
    envelope: validatePrivateFilename(
      args[3],
      'Fine-tuning private collection item envelope',
    ),
    executionRequest: validatePrivateFilename(
      args[7],
      'Fine-tuning private collection execution request',
    ),
    executionResolution: validatePrivateFilename(
      args[5],
      'Fine-tuning private collection execution resolution',
    ),
    intakeResolution: validatePrivateFilename(
      args[11],
      'Fine-tuning private collection intake resolution',
    ),
    plan: validatePrivateFilename(
      args[9],
      'Fine-tuning private collection plan',
    ),
    workspace: validatePrivateFilename(
      args[1],
      'Fine-tuning private collection workspace',
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
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
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

function readOwnerOnlyJson(input, errorPrefix, { includeBytes = false } = {}) {
  const { canonicalFilename, filename, initialFile } = input;
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
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameFileObservation(before, after)) {
      throw new Error(`${errorPrefix} changed while it was read.`);
    }
    try {
      const value = JSON.parse(bytes.toString('utf8'));
      return includeBytes ? { bytes, value } : value;
    } catch {
      throw new Error(`${errorPrefix} JSON is invalid.`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function readWorkspace(input, executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) {
    throw new Error('Fine-tuning private collection workspace resolution hash is invalid.');
  }
  const layout = capturePreparedWorkspaceLayout(executionResolution.resolutionHash);
  const expectedFilename = path.join(
    layout.workspaceDirectory,
    'workspace.json',
  );
  let canonicalExpectedFilename;
  try {
    canonicalExpectedFilename = fs.realpathSync(expectedFilename);
  } catch {
    throw new Error('Fine-tuning private collection workspace must use the exact prepared workspace location.');
  }
  if (
    input.canonicalFilename !== canonicalExpectedFilename ||
    !isPathWithin(layout.workspaceRootCanonical, canonicalExpectedFilename)
  ) {
    throw new Error('Fine-tuning private collection workspace must use the exact prepared workspace location.');
  }
  assertWorkspaceContents(layout.workspaceDirectory);
  const { bytes, value: workspace } = readOwnerOnlyJson(
    input,
    'Fine-tuning private collection workspace',
    { includeBytes: true },
  );
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  if (
    workspace.executionResolution?.id !== executionResolution.id ||
    workspace.executionResolution?.resolutionHash !== executionResolution.resolutionHash
  ) {
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
  return {
    bytes,
    ancestors: layout.ancestors,
    canonicalFilename: input.canonicalFilename,
    filename: expectedFilename,
    workspace,
    workspaceDirectory: layout.workspaceDirectory,
    workspaceRootCanonical: layout.workspaceRootCanonical,
  };
}

function capturePreparedWorkspaceLayout(resolutionHash) {
  const varDirectory = path.join(repoDir, 'var');
  const fineTuningDirectory = path.join(varDirectory, 'fine-tuning');
  const workspaceRoot = path.join(
    fineTuningDirectory,
    'private-collection-workspaces',
  );
  const workspaceDirectory = path.join(
    workspaceRoot,
    `fine-tuning-private-collection-workspace-${resolutionHash}`,
  );
  const ancestors = [
    capturePreparedWorkspaceDirectory(varDirectory, { allowGroupRead: true }),
    capturePreparedWorkspaceDirectory(fineTuningDirectory),
    capturePreparedWorkspaceDirectory(workspaceRoot),
    capturePreparedWorkspaceDirectory(workspaceDirectory),
  ];
  let workspaceRootCanonical;
  let workspaceDirectoryCanonical;
  try {
    workspaceRootCanonical = fs.realpathSync(workspaceRoot);
    workspaceDirectoryCanonical = fs.realpathSync(workspaceDirectory);
  } catch {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  if (
    !isPathWithin(fineTuningDirectory, workspaceRootCanonical) ||
    !isPathWithin(workspaceRootCanonical, workspaceDirectoryCanonical)
  ) {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  return {
    ancestors,
    workspaceDirectory,
    workspaceRootCanonical,
  };
}

function capturePreparedWorkspaceDirectory(
  directory,
  { allowGroupRead = false } = {},
) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !isCurrentUserOwned(stat) ||
    (stat.mode & forbiddenMode) !== 0
  ) {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  return {
    dev: stat.dev,
    directory,
    ino: stat.ino,
    mode: stat.mode & 0o777,
  };
}

function assertPreparedWorkspaceAncestorsUnchanged(ancestors) {
  for (const ancestor of ancestors) {
    const current = capturePreparedWorkspaceDirectory(ancestor.directory, {
      allowGroupRead: ancestor.directory === path.join(repoDir, 'var'),
    });
    if (
      current.dev !== ancestor.dev ||
      current.ino !== ancestor.ino ||
      current.mode !== ancestor.mode
    ) {
      throw new Error('Fine-tuning private collection workspace changed during admission.');
    }
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
    throw new Error('Fine-tuning private collection item admission tracked input must be a bounded regular file.');
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new Error('Fine-tuning private collection item admission tracked input JSON is invalid.');
  }
}

function prepareOutputRoot() {
  return preparePrivateRoot('private-collection-item-admissions');
}

function preparePrivateRoot(leafDirectory) {
  try {
    let current = repoDir;
    const segments = [
      'var',
      'fine-tuning',
      leafDirectory,
    ];
    for (const [index, segment] of segments.entries()) {
      current = path.join(current, segment);
      if (fs.existsSync(current)) {
        assertOwnerOnlyDirectory(current, {
          allowGroupWrite: index === 0,
          errorMessage: 'Fine-tuning private collection item admission directory must be owner-only and contain no symbolic links.',
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
    throw new Error('Fine-tuning private collection item admission directory must be owner-only and contain no symbolic links.');
  }
}

function assertAdmissionHistory(
  outputRoot,
  currentSources,
  candidate,
  { knownStagingDirectory } = {},
) {
  let names;
  try {
    names = fs.readdirSync(outputRoot);
  } catch {
    throw new Error('Fine-tuning private collection item admission history is invalid.');
  }
  const matchingLane = [];
  for (const name of names) {
    const directory = path.join(outputRoot, name);
    if (directory === knownStagingDirectory) {
      continue;
    }
    let existing;
    try {
      if (!/^fine-tuning-private-collection-item-admission-[a-f0-9]{64}$/u.test(name)) {
        throw new Error();
      }
      assertOwnerOnlyDirectory(directory, {
        errorMessage: 'Fine-tuning private collection item admission history is invalid.',
      });
      if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['admission.json'])) {
        throw new Error();
      }
      existing = readOwnerOnlyJson(
        validatePrivateFilename(
          path.join(directory, 'admission.json'),
          'Fine-tuning private collection item admission history',
        ),
        'Fine-tuning private collection item admission history',
      );
      assertFineTuningPrivateCollectionItemAdmissionRecord(existing);
      if (name !== existing.id) {
        throw new Error();
      }
      if (
        existing.workspace.id === currentSources.workspace.id &&
        existing.workspace.workspaceHash === currentSources.workspace.workspaceHash
      ) {
        assertFineTuningPrivateCollectionItemAdmission(existing, {
          ...currentSources,
          now: existing.admittedAt,
        });
        if (candidate) {
          assertNoDuplicateReference(existing, candidate);
          if (existing.envelope.lane === candidate.envelope.lane) {
            matchingLane.push(existing);
          }
        }
      }
    } catch (error) {
      if (error?.message?.includes('duplicate')) {
        throw error;
      }
      throw new Error('Fine-tuning private collection item admission history is invalid.');
    }
  }
  if (candidate && matchingLane.length >= getFineTuningPrivateCollectionLaneCapacity(candidate.envelope.lane)) {
    throw new Error('Fine-tuning private collection item admission lane capacity is exhausted.');
  }
}

function assertNoDuplicateReference(existing, candidate) {
  const existingSource = existing.envelope.source;
  const candidateSource = candidate.envelope.source;
  if (
    existingSource.referenceSha256 === candidateSource.referenceSha256 ||
    existingSource.lineageSha256 === candidateSource.lineageSha256 ||
    existing.envelope.retention.withdrawalReferenceSha256 ===
      candidate.envelope.retention.withdrawalReferenceSha256
  ) {
    throw new Error('Fine-tuning private collection item admission duplicate reference is not allowed.');
  }
}

function assertWorkspaceContents(directory, currentSources) {
  try {
    assertOwnerOnlyDirectory(directory, {
      errorMessage: 'Fine-tuning private collection workspace is invalid.',
    });
    const expected = ['answer-quality-cases', 'reviewed-examples', 'workspace.json'];
    if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(expected)) {
      throw new Error();
    }
    for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
      const laneDirectory = path.join(directory, lane);
      assertOwnerOnlyDirectory(laneDirectory, {
        errorMessage: 'Fine-tuning private collection workspace is invalid.',
      });
      for (const name of fs.readdirSync(laneDirectory)) {
        if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
          throw new Error();
        }
        const itemDirectory = path.join(laneDirectory, name);
        assertOwnerOnlyDirectory(itemDirectory, {
          errorMessage: 'Fine-tuning private collection workspace is invalid.',
        });
        if (JSON.stringify(fs.readdirSync(itemDirectory).sort()) !== JSON.stringify(['item.json'])) {
          throw new Error();
        }
        const item = readOwnerOnlyJson(
          validatePrivateFilename(
            path.join(itemDirectory, 'item.json'),
            'Fine-tuning private collection workspace',
          ),
          'Fine-tuning private collection workspace',
        );
        assertFineTuningPrivateCollectionItemRecord(item);
        if (
          item.lane !== lane ||
          name !== `fine-tuning-private-collection-item-${item.admission.admissionHash}` ||
          (currentSources && (
            item.workspace.id !== currentSources.workspace.id ||
            item.workspace.workspaceHash !== currentSources.workspace.workspaceHash
          ))
        ) {
          throw new Error();
        }
        if (currentSources) {
          const admission = readStoredAdmission(item.admission);
          assertFineTuningPrivateCollectionItem(item, {
            ...currentSources,
            admission,
            now: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    if (error?.message?.includes('expired')) {
      throw error;
    }
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
}

function readStoredAdmission(reference) {
  const filename = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-admissions',
    reference.id,
    'admission.json',
  );
  const admission = readOwnerOnlyJson(
    validatePrivateFilename(
      filename,
      'Fine-tuning private collection workspace',
    ),
    'Fine-tuning private collection workspace',
  );
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  if (
    admission.id !== reference.id ||
    admission.admissionHash !== reference.admissionHash
  ) {
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
  return admission;
}

function publishAdmission(outputRoot, admission, currentSources, workspaceInput) {
  const directory = path.join(outputRoot, admission.id);
  if (fs.existsSync(directory)) {
    throw new Error('Fine-tuning private collection item envelope is already admitted.');
  }
  const stagingDirectory = createStagingDirectory(outputRoot);
  try {
    writeAdmission(stagingDirectory, admission);
    assertAdmissionHistory(outputRoot, currentSources, admission, {
      knownStagingDirectory: stagingDirectory,
    });
    assertWorkspaceUnchanged(workspaceInput, currentSources);
    assertAdmissionDirectory(stagingDirectory, admission);
    assertFineTuningPrivateCollectionItemAdmission(admission, {
      ...currentSources,
      now: new Date().toISOString(),
    });
    if (fs.existsSync(directory)) {
      throw new Error('Fine-tuning private collection item envelope is already admitted.');
    }
    fs.renameSync(stagingDirectory, directory);
    assertAdmissionDirectory(directory, admission);
    fsyncDirectory(outputRoot);
  } catch (error) {
    removeKnownStagingDirectory(stagingDirectory, admission);
    if (
      error?.message === 'Fine-tuning private collection item envelope is already admitted.' ||
      error?.message?.includes('expired') ||
      error?.message?.includes('duplicate') ||
      error?.message?.includes('capacity')
    ) {
      throw error;
    }
    throw new Error('Fine-tuning private collection item admission publish failed.');
  }
}

function assertWorkspaceUnchanged(workspaceInput, currentSources) {
  assertPreparedWorkspaceAncestorsUnchanged(workspaceInput.ancestors);
  assertWorkspaceContents(workspaceInput.workspaceDirectory, currentSources);
  let currentInput;
  try {
    currentInput = validatePrivateFilename(
      workspaceInput.filename,
      'Fine-tuning private collection workspace',
    );
  } catch {
    throw new Error('Fine-tuning private collection workspace changed during admission.');
  }
  if (currentInput.canonicalFilename !== workspaceInput.canonicalFilename) {
    throw new Error('Fine-tuning private collection workspace changed during admission.');
  }
  if (!isPathWithin(workspaceInput.workspaceRootCanonical, currentInput.canonicalFilename)) {
    throw new Error('Fine-tuning private collection workspace changed during admission.');
  }
  const { bytes } = readOwnerOnlyJson(
    currentInput,
    'Fine-tuning private collection workspace',
    { includeBytes: true },
  );
  if (!bytes.equals(workspaceInput.bytes)) {
    throw new Error('Fine-tuning private collection workspace changed during admission.');
  }
}

function createStagingDirectory(outputRoot) {
  try {
    const directory = fs.mkdtempSync(path.join(
      outputRoot,
      '.fine-tuning-private-collection-item-admission-staging-',
    ));
    fs.chmodSync(directory, 0o700);
    assertOwnerOnlyDirectory(directory, {
      errorMessage: 'Fine-tuning private collection item admission staging is invalid.',
    });
    return directory;
  } catch {
    throw new Error('Fine-tuning private collection item admission staging is invalid.');
  }
}

function writeAdmission(directory, admission) {
  const filename = path.join(directory, 'admission.json');
  fs.writeFileSync(filename, `${JSON.stringify(admission, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  fs.chmodSync(filename, 0o600);
  assertAdmissionDirectory(directory, admission);
  fsyncFile(filename);
  fsyncDirectory(directory);
}

function assertAdmissionDirectory(directory, admission) {
  assertOwnerOnlyDirectory(directory, {
    errorMessage: 'Fine-tuning private collection item admission staging is invalid.',
  });
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['admission.json'])) {
    throw new Error('Fine-tuning private collection item admission staging is invalid.');
  }
  const stored = readOwnerOnlyJson(
    validatePrivateFilename(
      path.join(directory, 'admission.json'),
      'Fine-tuning private collection item admission staging',
    ),
    'Fine-tuning private collection item admission staging',
  );
  assertFineTuningPrivateCollectionItemAdmissionRecord(stored);
  if (JSON.stringify(stored) !== JSON.stringify(admission)) {
    throw new Error('Fine-tuning private collection item admission staging is invalid.');
  }
}

function removeKnownStagingDirectory(directory, admission) {
  try {
    assertAdmissionDirectory(directory, admission);
    fs.unlinkSync(path.join(directory, 'admission.json'));
    fs.rmdirSync(directory);
  } catch {
    // Preserve partial or unexpected staging content for manual inspection.
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

function assertOwnerOnlyDirectory(directory, { allowGroupWrite = false, errorMessage }) {
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

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}
