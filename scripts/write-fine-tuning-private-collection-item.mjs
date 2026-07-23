import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
  buildFineTuningPrivateCollectionItem,
  getFineTuningPrivateCollectionItemLaneCapacity,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItemTombstone,
} from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const privateInputs = parsePrivateFilenames(process.argv.slice(2));
const trackedSources = readSources();
const sources = trackedSources.values;
const executionResolutionInput = readOwnerOnlyJson(
  privateInputs.executionResolution,
  'Fine-tuning private collection execution resolution',
);
const executionRequestInput = readOwnerOnlyJson(
  privateInputs.executionRequest,
  'Fine-tuning private collection execution request',
);
const privateCollectionPlanInput = readOwnerOnlyJson(
  privateInputs.plan,
  'Fine-tuning private collection plan',
);
const intakeResolutionInput = readOwnerOnlyJson(
  privateInputs.intakeResolution,
  'Fine-tuning private collection intake resolution',
);
const workspaceInput = readWorkspace(
  privateInputs.workspace,
  executionResolutionInput.value,
);
const admissionInput = readAdmission(
  privateInputs.admission,
  workspaceInput.workspace,
);
const contentInput = readOwnerOnlyJson(
  privateInputs.content,
  'Fine-tuning private collection sanitized item input',
);
const currentSources = {
  ...sources,
  admission: admissionInput.value,
  executionRequest: executionRequestInput.value,
  executionResolution: executionResolutionInput.value,
  intakeResolution: intakeResolutionInput.value,
  privateCollectionPlan: privateCollectionPlanInput.value,
  workspace: workspaceInput.workspace,
};
const storedAt = new Date().toISOString();

assertFineTuningPrivateCollectionWorkspace(workspaceInput.workspace, {
  ...currentSources,
  now: storedAt,
});
assertFineTuningPrivateCollectionItemAdmission(admissionInput.value, {
  ...currentSources,
  now: storedAt,
});
const item = buildFineTuningPrivateCollectionItem({
  admission: admissionInput.value,
  content: contentInput.value,
  storedAt,
});
const workspaceLock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: workspaceInput.workspace.workspaceHash,
});

try {
  assertLaneCapacityAvailable(item, assertWorkspaceItems(workspaceInput.workspaceDirectory, currentSources));
  assertAdmissionHistory(admissionInput, currentSources);
  assertNoTerminalTombstone(workspaceInput.workspace, admissionInput.value, workspaceInput.workspaceDirectory, currentSources);
  publishItem({
    admissionInput,
    currentSources,
    item,
    privateInputs,
    trackedSourceStates: trackedSources.states,
    privateInputStates: {
      admission: capturePrivateInputState(privateInputs.admission, admissionInput.bytes),
      content: capturePrivateInputState(privateInputs.content, contentInput.bytes),
      executionRequest: capturePrivateInputState(
        privateInputs.executionRequest,
        executionRequestInput.bytes,
      ),
      executionResolution: capturePrivateInputState(
        privateInputs.executionResolution,
        executionResolutionInput.bytes,
      ),
      intakeResolution: capturePrivateInputState(
        privateInputs.intakeResolution,
        intakeResolutionInput.bytes,
      ),
      plan: capturePrivateInputState(privateInputs.plan, privateCollectionPlanInput.bytes),
      workspace: capturePrivateInputState(privateInputs.workspace, workspaceInput.bytes),
    },
    workspaceInput,
  });
} finally {
  workspaceLock.release();
}

console.log(JSON.stringify({
  actualUserDataCollected: item.actualUserDataCollected,
  collectionContentStored: item.collectionContentStored,
  externalProviderCalls: item.externalProviderCalls,
  mode: 'fine-tuning-private-collection-item-write',
  ok: true,
  productionReadyClaim: item.productionReadyClaim,
  status: item.status,
  trainingAuthorized: item.trainingAuthorized,
  workspaceMutationPerformed: item.workspaceMutationPerformed,
}, null, 2));

function readSources() {
  const artifactDir = path.join(repoDir, 'evidence', 'output-artifacts');
  const states = {
    assessment: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json')),
    collectionPlan: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json')),
    intakeRequest: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json')),
  };
  return {
    states,
    values: {
      assessment: states.assessment.value,
      collectionPlan: states.collectionPlan.value,
      intakeRequest: states.intakeRequest.value,
    },
  };
}

function parsePrivateFilenames(args) {
  if (
    args.length !== 14 ||
    args[0] !== '--workspace' || !String(args[1] || '').trim() ||
    args[2] !== '--admission' || !String(args[3] || '').trim() ||
    args[4] !== '--content' || !String(args[5] || '').trim() ||
    args[6] !== '--execution-resolution' || !String(args[7] || '').trim() ||
    args[8] !== '--execution-request' || !String(args[9] || '').trim() ||
    args[10] !== '--plan' || !String(args[11] || '').trim() ||
    args[12] !== '--intake-resolution' || !String(args[13] || '').trim()
  ) {
    throw new Error(
      'Expected --workspace <private-json-path> --admission <private-json-path> --content <private-json-path> --execution-resolution <private-json-path> --execution-request <private-json-path> --plan <private-json-path> --intake-resolution <private-json-path>.',
    );
  }
  return {
    admission: validatePrivateFilename(args[3], 'Fine-tuning private collection item admission'),
    content: validatePrivateFilename(args[5], 'Fine-tuning private collection sanitized item input'),
    executionRequest: validatePrivateFilename(args[9], 'Fine-tuning private collection execution request'),
    executionResolution: validatePrivateFilename(args[7], 'Fine-tuning private collection execution resolution'),
    intakeResolution: validatePrivateFilename(args[13], 'Fine-tuning private collection intake resolution'),
    plan: validatePrivateFilename(args[11], 'Fine-tuning private collection plan'),
    workspace: validatePrivateFilename(args[1], 'Fine-tuning private collection workspace'),
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
    if (!sameFileObservation(initialFile, observedFile) || !sameFileObservation(initialFile, canonicalFile)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }

  const repoRelativePath = findRelativePathFromDirectory(repoDir, filename);
  const lexicalInsideRepo = repoRelativePath !== null;
  const lexicalInsideVar = repoRelativePath === 'var' || repoRelativePath?.startsWith(`var${path.sep}`);
  const canonicalInsideRepo = isPathWithin(repoDir, canonicalFilename);
  const canonicalInsideVar = isPathWithin(varDir, canonicalFilename);
  if (
    (lexicalInsideRepo && (!lexicalInsideVar || !canonicalInsideVar)) ||
    (canonicalInsideRepo && !canonicalInsideVar)
  ) {
    throw new Error(`${errorPrefix} must remain private under var/ or outside the repository.`);
  }
  return { canonicalFilename, filename, initialFile };
}

function readOwnerOnlyJson(input, errorPrefix, { includeBytes = true } = {}) {
  const { canonicalFilename, filename, initialFile } = input;
  let descriptor;
  try {
    descriptor = fs.openSync(canonicalFilename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
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
    if (currentCanonicalFilename !== canonicalFilename || currentCanonicalTarget !== canonicalFilename) {
      throw new Error(`${errorPrefix} changed before it was read.`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameFileObservation(before, after)) {
      throw new Error(`${errorPrefix} changed while it was read.`);
    }
    let value;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(`${errorPrefix} JSON is invalid.`);
    }
    return includeBytes ? { bytes, value } : value;
  } finally {
    fs.closeSync(descriptor);
  }
}

function readWorkspace(input, executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) {
    throw new Error('Fine-tuning private collection workspace resolution hash is invalid.');
  }
  const layout = capturePreparedWorkspaceLayout(executionResolution.resolutionHash);
  const expectedFilename = path.join(layout.workspaceDirectory, 'workspace.json');
  let canonicalExpectedFilename;
  try {
    canonicalExpectedFilename = fs.realpathSync(expectedFilename);
  } catch {
    throw new Error('Fine-tuning private collection workspace must use the exact prepared workspace location.');
  }
  if (input.canonicalFilename !== canonicalExpectedFilename || !isPathWithin(layout.workspaceRootCanonical, canonicalExpectedFilename)) {
    throw new Error('Fine-tuning private collection workspace must use the exact prepared workspace location.');
  }
  const workspaceInput = readOwnerOnlyJson(input, 'Fine-tuning private collection workspace');
  assertFineTuningPrivateCollectionWorkspaceRecord(workspaceInput.value);
  if (
    workspaceInput.value.executionResolution?.id !== executionResolution.id ||
    workspaceInput.value.executionResolution?.resolutionHash !== executionResolution.resolutionHash
  ) {
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
  return {
    ...workspaceInput,
    ancestors: layout.ancestors,
    canonicalFilename: input.canonicalFilename,
    filename: expectedFilename,
    initialFile: input.initialFile,
    workspace: workspaceInput.value,
    workspaceDirectory: layout.workspaceDirectory,
    workspaceDirectoryCanonical: layout.workspaceDirectoryCanonical,
    workspaceRootCanonical: layout.workspaceRootCanonical,
    lanes: capturePreparedWorkspaceLanes(
      layout.workspaceDirectory,
      layout.workspaceDirectoryCanonical,
    ),
  };
}

function readAdmission(input, workspace) {
  const admissionInput = readOwnerOnlyJson(input, 'Fine-tuning private collection item admission');
  assertFineTuningPrivateCollectionItemAdmissionRecord(admissionInput.value);
  const expectedFilename = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-admissions',
    admissionInput.value.id,
    'admission.json',
  );
  let canonicalExpectedFilename;
  try {
    canonicalExpectedFilename = fs.realpathSync(expectedFilename);
  } catch {
    throw new Error('Fine-tuning private collection item admission must use the exact admission history location.');
  }
  if (input.canonicalFilename !== canonicalExpectedFilename) {
    throw new Error('Fine-tuning private collection item admission must use the exact admission history location.');
  }
  if (
    admissionInput.value.workspace.id !== workspace.id ||
    admissionInput.value.workspace.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission is invalid.');
  }
  return {
    ...admissionInput,
    canonicalFilename: input.canonicalFilename,
    filename: expectedFilename,
    initialFile: input.initialFile,
  };
}

function capturePreparedWorkspaceLayout(resolutionHash) {
  const varDirectory = path.join(repoDir, 'var');
  const fineTuningDirectory = path.join(varDirectory, 'fine-tuning');
  const workspaceRoot = path.join(fineTuningDirectory, 'private-collection-workspaces');
  const workspaceDirectory = path.join(workspaceRoot, `fine-tuning-private-collection-workspace-${resolutionHash}`);
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
  if (!isPathWithin(fineTuningDirectory, workspaceRootCanonical) || !isPathWithin(workspaceRootCanonical, workspaceDirectoryCanonical)) {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  return {
    ancestors,
    workspaceDirectory,
    workspaceDirectoryCanonical,
    workspaceRootCanonical,
  };
}

function capturePreparedWorkspaceDirectory(directory, { allowGroupRead = false } = {}) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
  if (!stat.isDirectory() || stat.isSymbolicLink() || !isCurrentUserOwned(stat) || (stat.mode & forbiddenMode) !== 0) {
    throw new Error('Fine-tuning private collection workspace ancestors are invalid.');
  }
  return { dev: stat.dev, directory, ino: stat.ino, mode: stat.mode & 0o777 };
}

function capturePreparedWorkspaceLanes(workspaceDirectory, workspaceDirectoryCanonical) {
  return Object.fromEntries(
    ['reviewed-examples', 'answer-quality-cases'].map((lane) => {
      const directory = path.join(workspaceDirectory, lane);
      const expectedCanonicalDirectory = path.join(workspaceDirectoryCanonical, lane);
      const observation = capturePreparedWorkspaceDirectory(directory);
      let canonicalDirectory;
      try {
        canonicalDirectory = fs.realpathSync(directory);
      } catch {
        throw new Error('Fine-tuning private collection workspace lanes are invalid.');
      }
      if (canonicalDirectory !== expectedCanonicalDirectory) {
        throw new Error('Fine-tuning private collection workspace lanes are invalid.');
      }
      return [lane, { ...observation, canonicalDirectory }];
    }),
  );
}

function assertWorkspaceLaneUnchanged(lane) {
  let current;
  try {
    current = capturePreparedWorkspaceDirectory(lane.directory);
    if (fs.realpathSync(lane.directory) !== lane.canonicalDirectory) {
      throw new Error();
    }
  } catch {
    throw new Error('Fine-tuning private collection workspace lane changed during write.');
  }
  if (
    current.dev !== lane.dev ||
    current.ino !== lane.ino ||
    current.mode !== lane.mode
  ) {
    throw new Error('Fine-tuning private collection workspace lane changed during write.');
  }
}

function assertWorkspaceItems(directory, currentSources, { knownStagingDirectory } = {}) {
  try {
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection workspace is invalid.');
    if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['answer-quality-cases', 'reviewed-examples', 'workspace.json'])) {
      throw new Error();
    }
    const counts = {};
    for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
      const laneDirectory = path.join(directory, lane);
      assertOwnerOnlyDirectory(laneDirectory, 'Fine-tuning private collection workspace is invalid.');
      let count = 0;
      for (const name of fs.readdirSync(laneDirectory)) {
        const itemDirectory = path.join(laneDirectory, name);
        if (itemDirectory === knownStagingDirectory) {
          continue;
        }
        if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
          throw new Error();
        }
        assertOwnerOnlyDirectory(itemDirectory, 'Fine-tuning private collection workspace is invalid.');
        if (JSON.stringify(fs.readdirSync(itemDirectory).sort()) !== JSON.stringify(['item.json'])) {
          throw new Error();
        }
        const stored = readOwnerOnlyJson(
          validatePrivateFilename(path.join(itemDirectory, 'item.json'), 'Fine-tuning private collection workspace'),
          'Fine-tuning private collection workspace',
        );
        assertFineTuningPrivateCollectionItemRecord(stored.value);
        if (
          stored.value.lane !== lane ||
          name !== `fine-tuning-private-collection-item-${stored.value.admission.admissionHash}` ||
          stored.value.workspace.id !== currentSources.workspace.id ||
          stored.value.workspace.workspaceHash !== currentSources.workspace.workspaceHash
        ) {
          throw new Error();
        }
        const admission = readStoredAdmission(stored.value.admission, currentSources.workspace);
        assertFineTuningPrivateCollectionItem(stored.value, {
          ...currentSources,
          admission,
          now: new Date().toISOString(),
        });
        count += 1;
      }
      if (count > getFineTuningPrivateCollectionItemLaneCapacity(lane)) {
        throw new Error();
      }
      counts[lane] = count;
    }
    return counts;
  } catch (error) {
    if (error?.message?.includes('expired')) {
      throw error;
    }
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
}

function assertLaneCapacityAvailable(item, counts) {
  if (counts[item.lane] >= getFineTuningPrivateCollectionItemLaneCapacity(item.lane)) {
    throw new Error('Fine-tuning private collection item lane capacity is exhausted.');
  }
}

function readStoredAdmission(reference, workspace) {
  const admission = readAdmissionHistoryRecord(reference);
  if (
    admission.workspace.id !== workspace.id ||
    admission.workspace.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission history is invalid.');
  }
  return admission;
}

function readAdmissionHistoryRecord(reference) {
  const expected = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-admissions',
    reference.id,
    'admission.json',
  );
  const input = validatePrivateFilename(expected, 'Fine-tuning private collection item admission history');
  const admission = readOwnerOnlyJson(input, 'Fine-tuning private collection item admission history').value;
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  if (admission.id !== reference.id || admission.admissionHash !== reference.admissionHash) {
    throw new Error('Fine-tuning private collection item admission history is invalid.');
  }
  return admission;
}

function assertAdmissionHistory(admissionInput, currentSources) {
  const admission = readStoredAdmission(admissionInput.value, currentSources.workspace);
  const currentInput = validatePrivateFilename(
    admissionInput.filename,
    'Fine-tuning private collection item admission',
  );
  const current = readOwnerOnlyJson(
    currentInput,
    'Fine-tuning private collection item admission',
  );
  if (
    currentInput.canonicalFilename !== admissionInput.canonicalFilename ||
    !sameFileObservation(admissionInput.initialFile, currentInput.initialFile) ||
    !admissionInput.bytes.equals(current.bytes) ||
    JSON.stringify(admission) !== JSON.stringify(admissionInput.value)
  ) {
    throw new Error('Fine-tuning private collection item admission changed during write.');
  }
  assertFineTuningPrivateCollectionItemAdmission(admission, {
    ...currentSources,
    admission,
    now: new Date().toISOString(),
  });
  assertBoundedAdmissionHistory(admission, currentSources);
}

function assertBoundedAdmissionHistory(candidate, currentSources) {
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions');
  let candidateFound = false;
  const counts = {
    'answer-quality-cases': 0,
    'reviewed-examples': 0,
  };
  const sourceReferences = {
    lineageSha256: new Set(),
    referenceSha256: new Set(),
    withdrawalReferenceSha256: new Set(),
  };
  try {
    assertOwnerOnlyDirectory(root, 'Fine-tuning private collection item admission history is invalid.');
    for (const name of fs.readdirSync(root)) {
      if (!/^fine-tuning-private-collection-item-admission-[a-f0-9]{64}$/u.test(name)) {
        throw new Error();
      }
      const directory = path.join(root, name);
      assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item admission history is invalid.');
      if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['admission.json'])) {
        throw new Error();
      }
      const stored = readAdmissionHistoryRecord({
        admissionHash: name.slice('fine-tuning-private-collection-item-admission-'.length),
        id: name,
      });
      if (
        stored.workspace.id === currentSources.workspace.id &&
        stored.workspace.workspaceHash === currentSources.workspace.workspaceHash
      ) {
        assertFineTuningPrivateCollectionItemAdmission(stored, {
          ...currentSources,
          admission: stored,
        });
        const references = {
          lineageSha256: stored.envelope.source.lineageSha256,
          referenceSha256: stored.envelope.source.referenceSha256,
          withdrawalReferenceSha256: stored.envelope.retention.withdrawalReferenceSha256,
        };
        for (const [field, value] of Object.entries(references)) {
          if (sourceReferences[field].has(value)) {
            throw new Error();
          }
          sourceReferences[field].add(value);
        }
        counts[stored.envelope.lane] += 1;
        if (stored.id === candidate.id && stored.admissionHash === candidate.admissionHash) {
          candidateFound = true;
        }
      }
    }
    if (!candidateFound || Object.entries(counts).some(([lane, count]) => count > getFineTuningPrivateCollectionItemLaneCapacity(lane))) {
      throw new Error();
    }
  } catch {
    throw new Error('Fine-tuning private collection item admission history is invalid.');
  }
}

function assertNoTerminalTombstone(workspace, admission, workspaceDirectory, currentSources) {
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-tombstones');
  if (!fs.existsSync(root)) {
    return;
  }
  try {
    assertOwnerOnlyDirectory(root, 'Fine-tuning private collection item tombstone history is invalid.');
    for (const workspaceHash of fs.readdirSync(root)) {
      if (!/^[a-f0-9]{64}$/u.test(workspaceHash)) {
        throw new Error();
      }
      const workspaceRoot = path.join(root, workspaceHash);
      assertOwnerOnlyDirectory(workspaceRoot, 'Fine-tuning private collection item tombstone history is invalid.');
      for (const withdrawalHash of fs.readdirSync(workspaceRoot)) {
        if (!/^[a-f0-9]{64}$/u.test(withdrawalHash)) {
          throw new Error();
        }
        const directory = path.join(workspaceRoot, withdrawalHash);
        assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item tombstone history is invalid.');
        if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['tombstone.json'])) {
          throw new Error();
        }
        const tombstone = readOwnerOnlyJson(
          validatePrivateFilename(path.join(directory, 'tombstone.json'), 'Fine-tuning private collection item tombstone history'),
          'Fine-tuning private collection item tombstone history',
        ).value;
        assertFineTuningPrivateCollectionItemTombstone(tombstone);
        if (
          tombstone.workspace.workspaceHash !== workspaceHash ||
          tombstone.withdrawalReferenceSha256 !== withdrawalHash
        ) {
          throw new Error();
        }
        const tombstoneAdmission = readStoredAdmission(
          tombstone.admission,
          tombstone.workspace,
        );
        if (
          tombstoneAdmission.envelope.retention.withdrawalReferenceSha256 !== withdrawalHash
        ) {
          throw new Error();
        }
        if (
          workspaceHash === workspace.workspaceHash
        ) {
          if (tombstone.workspace.id !== workspace.id) {
            throw new Error();
          }
          if (Date.parse(tombstone.recordedAt) < Date.parse(tombstoneAdmission.admittedAt)) {
            throw new Error();
          }
          assertFineTuningPrivateCollectionItemAdmission(tombstoneAdmission, {
            ...currentSources,
            admission: tombstoneAdmission,
          });
          assertWorkspaceTombstoneHasNoItem(workspaceDirectory, tombstone);
          if (
            withdrawalHash === admission.envelope.retention.withdrawalReferenceSha256 ||
            tombstone.admission.id === admission.id ||
            tombstone.admission.admissionHash === admission.admissionHash
          ) {
            if (
              tombstone.admission.id !== admission.id ||
              tombstone.admission.admissionHash !== admission.admissionHash ||
              withdrawalHash !== admission.envelope.retention.withdrawalReferenceSha256
            ) {
              throw new Error();
            }
            throw new Error('Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.');
          }
        }
      }
    }
  } catch (error) {
    if (
      error?.message?.includes('permanently blocked') ||
      error?.message?.includes('tombstone conflict')
    ) {
      throw error;
    }
    throw new Error('Fine-tuning private collection item tombstone history is invalid.');
  }
}

function assertWorkspaceTombstoneHasNoItem(workspaceDirectory, tombstone) {
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of fs.readdirSync(laneDirectory)) {
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        continue;
      }
      const item = readOwnerOnlyJson(
        validatePrivateFilename(path.join(laneDirectory, name, 'item.json'), 'Fine-tuning private collection workspace'),
        'Fine-tuning private collection workspace',
      ).value;
      assertFineTuningPrivateCollectionItemRecord(item);
      if (
        item.retention.withdrawalReferenceSha256 === tombstone.withdrawalReferenceSha256 ||
        item.admission.id === tombstone.admission.id ||
        item.admission.admissionHash === tombstone.admission.admissionHash
      ) {
        throw new Error('Fine-tuning private collection item and tombstone conflict must be resolved outside this writer.');
      }
    }
  }
}

function publishItem({ admissionInput, currentSources, item, privateInputs, privateInputStates, trackedSourceStates, workspaceInput }) {
  const laneDirectory = path.join(workspaceInput.workspaceDirectory, item.lane);
  const lane = workspaceInput.lanes[item.lane];
  if (!lane || lane.directory !== laneDirectory) {
    throw new Error('Fine-tuning private collection workspace lane is invalid.');
  }
  const destination = path.join(laneDirectory, `fine-tuning-private-collection-item-${item.admission.admissionHash}`);
  if (fs.existsSync(destination)) {
    throw new Error('Fine-tuning private collection admission already has an item.');
  }
  const stagingDirectory = createStagingDirectory(lane);
  let committed = false;
  try {
    writeItem(stagingDirectory, item, currentSources);
    assertLaneCapacityAvailable(
      item,
      assertWorkspaceItems(workspaceInput.workspaceDirectory, currentSources, { knownStagingDirectory: stagingDirectory }),
    );
    assertNoTerminalTombstone(workspaceInput.workspace, admissionInput.value, workspaceInput.workspaceDirectory, currentSources);
    assertPublishInputsUnchanged(privateInputs, privateInputStates);
    assertTrackedSourcesUnchanged(trackedSourceStates);
    assertWorkspaceUnchanged(workspaceInput, currentSources);
    assertAdmissionHistory(admissionInput, currentSources);
    assertItemDirectory(stagingDirectory, item, currentSources);
    assertFineTuningPrivateCollectionItem(item, {
      ...currentSources,
      admission: admissionInput.value,
      now: new Date().toISOString(),
    });
    if (fs.existsSync(destination)) {
      throw new Error('Fine-tuning private collection admission already has an item.');
    }
    assertWorkspaceLaneUnchanged(lane);
    fs.renameSync(stagingDirectory, destination);
    committed = true;
    assertItemDirectory(destination, item);
    fsyncDirectory(lane.canonicalDirectory);
    assertWorkspaceLaneUnchanged(lane);
    assertTrackedSourcesUnchanged(trackedSourceStates);
  } catch (error) {
    if (!committed) {
      removeKnownStagingDirectory(stagingDirectory, item, currentSources);
    }
    if (committed) {
      throw new Error('Fine-tuning private collection item committed but durability confirmation failed; manual recovery required.');
    }
    if (
      error?.message?.includes('expired') ||
      error?.message?.includes('already has an item') ||
      error?.message?.includes('permanently blocked') ||
      error?.message?.includes('conflict')
    ) {
      throw error;
    }
    throw new Error('Fine-tuning private collection item publish failed.');
  }
}

function assertTrackedSourcesUnchanged(states) {
  for (const state of Object.values(states)) {
    let current;
    try {
      current = readTrackedJson(state.filename);
    } catch {
      throw new Error('Fine-tuning private collection item tracked input changed during write.');
    }
    if (
      current.canonicalFilename !== state.canonicalFilename ||
      !sameSerializedFileObservation(state.observation, current.initialFile) ||
      !state.bytes.equals(current.bytes)
    ) {
      throw new Error('Fine-tuning private collection item tracked input changed during write.');
    }
  }
}

function capturePrivateInputState(input, bytes) {
  return {
    bytes,
    canonicalFilename: input.canonicalFilename,
    observation: serializeFileObservation(input.initialFile),
  };
}

function assertPublishInputsUnchanged(inputs, states) {
  const expected = [
    ['admission', 'Fine-tuning private collection item admission'],
    ['content', 'Fine-tuning private collection sanitized item input'],
    ['executionResolution', 'Fine-tuning private collection execution resolution'],
    ['executionRequest', 'Fine-tuning private collection execution request'],
    ['plan', 'Fine-tuning private collection plan'],
    ['intakeResolution', 'Fine-tuning private collection intake resolution'],
    ['workspace', 'Fine-tuning private collection workspace'],
  ];
  for (const [key, errorPrefix] of expected) {
    assertPrivateInputUnchanged(inputs[key], states[key], errorPrefix);
  }
}

function assertPrivateInputUnchanged(input, state, errorPrefix) {
  const currentInput = validatePrivateFilename(input.filename, errorPrefix);
  if (
    currentInput.canonicalFilename !== state.canonicalFilename ||
    !sameSerializedFileObservation(state.observation, currentInput.initialFile)
  ) {
    throw new Error(`${errorPrefix} changed during write.`);
  }
  const current = readOwnerOnlyJson(currentInput, errorPrefix);
  if (!state.bytes.equals(current.bytes)) {
    throw new Error(`${errorPrefix} changed during write.`);
  }
}

function assertWorkspaceUnchanged(workspaceInput, currentSources) {
  for (const ancestor of workspaceInput.ancestors) {
    const current = capturePreparedWorkspaceDirectory(ancestor.directory, {
      allowGroupRead: ancestor.directory === path.join(repoDir, 'var'),
    });
    if (current.dev !== ancestor.dev || current.ino !== ancestor.ino || current.mode !== ancestor.mode) {
      throw new Error('Fine-tuning private collection workspace changed during write.');
    }
  }
  const currentInput = validatePrivateFilename(
    workspaceInput.filename,
    'Fine-tuning private collection workspace',
  );
  const current = readOwnerOnlyJson(
    currentInput,
    'Fine-tuning private collection workspace',
  );
  if (
    currentInput.canonicalFilename !== workspaceInput.canonicalFilename ||
    !sameFileObservation(workspaceInput.initialFile, currentInput.initialFile) ||
    !workspaceInput.bytes.equals(current.bytes) ||
    current.value.id !== workspaceInput.workspace.id
  ) {
    throw new Error('Fine-tuning private collection workspace changed during write.');
  }
  assertFineTuningPrivateCollectionWorkspace(current.value, {
    ...currentSources,
    workspace: current.value,
    now: new Date().toISOString(),
  });
}

function createStagingDirectory(lane) {
  try {
    assertWorkspaceLaneUnchanged(lane);
    const directory = fs.mkdtempSync(path.join(lane.directory, '.fine-tuning-private-collection-item-staging-'));
    fs.chmodSync(directory, 0o700);
    assertWorkspaceLaneUnchanged(lane);
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item staging is invalid.');
    return directory;
  } catch {
    throw new Error('Fine-tuning private collection item staging is invalid.');
  }
}

function writeItem(directory, item, currentSources) {
  const filename = path.join(directory, 'item.json');
  fs.writeFileSync(filename, `${JSON.stringify(item, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
  fsyncDirectory(directory);
  assertItemDirectory(directory, item, currentSources);
}

function assertItemDirectory(directory, item, currentSources) {
  assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item staging is invalid.');
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(['item.json'])) {
    throw new Error('Fine-tuning private collection item staging is invalid.');
  }
  const stored = readOwnerOnlyJson(
    validatePrivateFilename(path.join(directory, 'item.json'), 'Fine-tuning private collection item staging'),
    'Fine-tuning private collection item staging',
  ).value;
  assertFineTuningPrivateCollectionItemRecord(stored);
  if (currentSources) {
    assertFineTuningPrivateCollectionItem(stored, {
      ...currentSources,
      admission: currentSources.admission,
      now: new Date().toISOString(),
    });
  }
  if (JSON.stringify(stored) !== JSON.stringify(item)) {
    throw new Error('Fine-tuning private collection item staging is invalid.');
  }
}

function removeKnownStagingDirectory(directory, item, currentSources) {
  try {
    assertItemDirectory(directory, item, currentSources);
    fs.unlinkSync(path.join(directory, 'item.json'));
    fs.rmdirSync(directory);
  } catch {
    // Partial or unexpected staging is intentionally retained for manual inspection.
  }
}

function readTrackedJson(filename) {
  let initialFile;
  let canonicalFilename;
  let bytes;
  try {
    initialFile = fs.lstatSync(filename);
    canonicalFilename = fs.realpathSync(filename);
    if (!initialFile.isFile() || initialFile.isSymbolicLink() || initialFile.nlink !== 1 || initialFile.size <= 0 || initialFile.size > MAX_JSON_BYTES) {
      throw new Error();
    }
    bytes = fs.readFileSync(canonicalFilename);
    const currentFile = fs.lstatSync(filename);
    const canonicalFile = fs.statSync(canonicalFilename);
    if (!sameFileObservation(initialFile, currentFile) || !sameFileObservation(initialFile, canonicalFile)) {
      throw new Error();
    }
  } catch {
    throw new Error('Fine-tuning private collection item tracked input must be a bounded regular file.');
  }
  try {
    return {
      bytes,
      canonicalFilename,
      filename,
      initialFile,
      observation: serializeFileObservation(initialFile),
      value: JSON.parse(bytes.toString('utf8')),
    };
  } catch {
    throw new Error('Fine-tuning private collection item tracked input JSON is invalid.');
  }
}

function assertOwnerOnlyFile(stat, errorPrefix) {
  if (!stat.isFile() || stat.nlink !== 1 || stat.size <= 0 || stat.size > MAX_JSON_BYTES || (stat.mode & 0o077) !== 0 || !isCurrentUserOwned(stat)) {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
}

function assertOwnerOnlyDirectory(directory, errorMessage) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !isCurrentUserOwned(stat) || (stat.mode & 0o077) !== 0) {
    throw new Error(errorMessage);
  }
}

function sameFileObservation(before, after) {
  return before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs;
}

function serializeFileObservation(stat) {
  return {
    ctimeMs: stat.ctimeMs,
    dev: stat.dev,
    ino: stat.ino,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };
}

function sameSerializedFileObservation(expected, actual) {
  return expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.size === actual.size &&
    expected.mtimeMs === actual.mtimeMs &&
    expected.ctimeMs === actual.ctimeMs;
}

function findRelativePathFromDirectory(directory, candidate) {
  const directoryStat = fs.statSync(directory);
  let current = candidate;
  while (true) {
    try {
      const currentStat = fs.statSync(current);
      if (currentStat.dev === directoryStat.dev && currentStat.ino === directoryStat.ino) {
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

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
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
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}
