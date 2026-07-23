import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
  assertFineTuningPrivateCollectionItemReviewProjectionRequest,
  buildFineTuningPrivateCollectionItemReviewProjection,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItemTombstone,
} from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const LANES = ['reviewed-examples', 'answer-quality-cases'];
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseFilenames(process.argv.slice(2));
const initial = loadInputs(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private collection item review projection lock',
});

let projection;
try {
  const current = loadInputs(filenames);
  assertInputsUnchanged(initial, current);
  projection = project(current);
} finally {
  lock.release();
}

console.log(JSON.stringify({
  externalProviderCalls: projection.externalProviderCalls,
  mode: 'fine-tuning-private-collection-item-review-projection',
  ok: true,
  projectionKind: projection.projectionKind,
  productionReadyClaim: projection.productionReadyClaim,
  status: projection.status,
  trainingAuthorized: projection.trainingAuthorized,
  workspaceMutationPerformed: projection.workspaceMutationPerformed,
}, null, 2));

function project(current) {
  const historyRoot = prepareHistoryRoot(current.workspace.workspaceHash);
  assertNoTerminalOrRemovalHistory(current);
  const request = assertFineTuningPrivateCollectionItemReviewProjectionRequest(current.request);
  const requestHash = hashRecord(request);
  const finalFilename = path.join(historyRoot, `${current.item.itemHash}.json`);
  const pendingDirectory = path.join(
    historyRoot,
    `.fine-tuning-private-collection-item-review-projection-pending-${current.item.itemHash}-${requestHash}`,
  );
  const history = inspectHistory({ current, finalFilename, historyRoot, pendingDirectory, requestHash });
  if (history.final) return history.final;
  if (history.pending) {
    const publishCurrent = loadInputs(filenames);
    assertInputsUnchanged(current, publishCurrent);
    assertLiveForPublish(publishCurrent);
    assertNoTerminalOrRemovalHistory(publishCurrent);
    publishPending({ finalFilename, pendingDirectory, projection: history.pending });
    return history.pending;
  }

  const now = new Date().toISOString();
  const generated = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: current.admission,
    item: current.item,
    projectedAt: now,
    request,
    workspace: current.workspace,
  });
  writePending({ pendingDirectory, projection: generated });
  const publishCurrent = loadInputs(filenames);
  assertInputsUnchanged(current, publishCurrent);
  assertLiveForPublish(publishCurrent);
  assertNoTerminalOrRemovalHistory(publishCurrent);
  publishPending({ finalFilename, pendingDirectory, projection: generated });
  return generated;
}

function loadInputs(inputFilenames) {
  const tracked = readTrackedSources();
  const executionResolutionInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.executionResolution, 'Fine-tuning private collection execution resolution'),
    'Fine-tuning private collection execution resolution',
  );
  const executionRequestInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.executionRequest, 'Fine-tuning private collection execution request'),
    'Fine-tuning private collection execution request',
  );
  const planInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.plan, 'Fine-tuning private collection plan'),
    'Fine-tuning private collection plan',
  );
  const intakeResolutionInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.intakeResolution, 'Fine-tuning private collection intake resolution'),
    'Fine-tuning private collection intake resolution',
  );
  const workspace = readWorkspace(
    validatePrivateFilename(inputFilenames.workspace, 'Fine-tuning private collection workspace'),
    executionResolutionInput.value,
  );
  const admission = readAdmission(
    validatePrivateFilename(inputFilenames.admission, 'Fine-tuning private collection item admission'),
    workspace.value,
  );
  const item = readItem(
    validatePrivateFilename(inputFilenames.item, 'Fine-tuning private collection item'),
    admission.value,
    workspace.value,
    workspace.workspaceDirectory,
  );
  const request = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.request, 'Fine-tuning private collection item review projection request'),
    'Fine-tuning private collection item review projection request',
  );
  assertFineTuningPrivateCollectionItemReviewProjectionRequest(request.value);

  const now = new Date().toISOString();
  const sources = {
    ...tracked.values,
    admission: admission.value,
    executionRequest: executionRequestInput.value,
    executionResolution: executionResolutionInput.value,
    intakeResolution: intakeResolutionInput.value,
    privateCollectionPlan: planInput.value,
    workspace: workspace.value,
  };
  assertFineTuningPrivateCollectionWorkspace(workspace.value, { ...sources, now });
  assertFineTuningPrivateCollectionItemAdmission(admission.value, { ...sources, now });
  assertFineTuningPrivateCollectionItem(item.value, { ...sources, now });

  return {
    admission: admission.value,
    files: {
      admission,
      executionRequest: executionRequestInput,
      executionResolution: executionResolutionInput,
      intakeResolution: intakeResolutionInput,
      item,
      plan: planInput,
      request,
      workspace,
    },
    item: item.value,
    request: request.value,
    sources,
    tracked,
    workspace: workspace.value,
    workspaceDirectory: workspace.workspaceDirectory,
  };
}

function assertLiveForPublish(current) {
  const now = new Date().toISOString();
  assertFineTuningPrivateCollectionWorkspace(current.workspace, { ...current.sources, now });
  assertFineTuningPrivateCollectionItemAdmission(current.admission, { ...current.sources, now });
  assertFineTuningPrivateCollectionItem(current.item, { ...current.sources, now });
  if (
    Date.parse(now) >= Date.parse(current.item.expiresAt) ||
    Date.parse(now) >= Date.parse(current.item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item review projection retention or approval expired.');
  }
}

function assertInputsUnchanged(initial, current) {
  if (
    initial.workspace.workspaceHash !== current.workspace.workspaceHash ||
    initial.workspace.id !== current.workspace.id ||
    initial.admission.admissionHash !== current.admission.admissionHash ||
    initial.item.itemHash !== current.item.itemHash ||
    JSON.stringify(initial.request) !== JSON.stringify(current.request)
  ) {
    throw new Error('Fine-tuning private collection item review projection inputs changed before the workspace lock.');
  }
  for (const key of Object.keys(initial.files)) {
    const previous = initial.files[key];
    const observed = current.files[key];
    if (
      previous.canonicalFilename !== observed.canonicalFilename ||
      !sameObservation(previous.initialFile, observed.initialFile) ||
      !previous.bytes.equals(observed.bytes)
    ) {
      throw new Error(`Fine-tuning private collection item review projection ${key} changed before publication.`);
    }
  }
  for (const key of Object.keys(initial.tracked.states)) {
    const previous = initial.tracked.states[key];
    const observed = current.tracked.states[key];
    if (
      previous.canonicalFilename !== observed.canonicalFilename ||
      !sameObservation(previous.initialFile, observed.initialFile) ||
      !previous.bytes.equals(observed.bytes)
    ) {
      throw new Error('Fine-tuning private collection item review projection tracked F1 chain changed before publication.');
    }
  }
}

function inspectHistory({ current, finalFilename, historyRoot, pendingDirectory, requestHash }) {
  const finalName = path.basename(finalFilename);
  const pendingName = path.basename(pendingDirectory);
  let final;
  let pending;
  const emptyPendingDirectories = [];
  for (const name of readPrivateDirectory(historyRoot, 'Fine-tuning private collection item review projection history')) {
    if (!/^[a-f0-9]{64}\.json$/u.test(name) && !/^\.fine-tuning-private-collection-item-review-projection-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private collection item review projection history is invalid.');
    }
    const filename = path.join(historyRoot, name);
    if (name.endsWith('.json')) {
      const projection = readProjection(filename, 'Fine-tuning private collection item review projection history');
      if (name !== `${projection.item.itemHash}.json`) {
        throw new Error('Fine-tuning private collection item review projection history is invalid.');
      }
      if (name === finalName) final = projection;
      continue;
    }
    const names = readPrivateDirectory(filename, 'Fine-tuning private collection item review projection pending history');
    if (sameNames(names, [])) {
      emptyPendingDirectories.push({ directory: filename, name });
      continue;
    }
    if (!sameNames(names, ['projection.json'])) {
      throw new Error('Fine-tuning private collection item review projection pending history is invalid.');
    }
    const projection = readProjection(
      path.join(filename, 'projection.json'),
      'Fine-tuning private collection item review projection pending history',
    );
    if (name !== `.fine-tuning-private-collection-item-review-projection-pending-${projection.item.itemHash}-${projection.projectionRequestHash}`) {
      throw new Error('Fine-tuning private collection item review projection pending history is invalid.');
    }
    if (projection.item.itemHash === current.item.itemHash && name !== pendingName) {
      throw new Error('Fine-tuning private collection item review projection conflicts with a different request.');
    }
    if (name === pendingName) pending = projection;
  }
  if (final) {
    assertProjectionMatchesCurrent(final, current, requestHash);
    if (pending) {
      throw new Error('Fine-tuning private collection item review projection history is ambiguous.');
    }
    if (
      emptyPendingDirectories.length > 1 ||
      (emptyPendingDirectories.length === 1 && emptyPendingDirectories[0].name !== pendingName)
    ) {
      throw new Error('Fine-tuning private collection item review projection history is ambiguous.');
    }
    if (emptyPendingDirectories.length === 1) {
      fs.rmdirSync(emptyPendingDirectories[0].directory);
      fsyncDirectory(historyRoot);
    }
    return { final };
  }
  if (emptyPendingDirectories.length > 0) {
    if (
      emptyPendingDirectories.length === 1 &&
      emptyPendingDirectories[0].name === pendingName &&
      !pending
    ) {
      fs.rmdirSync(emptyPendingDirectories[0].directory);
      fsyncDirectory(historyRoot);
      return {};
    }
    throw new Error('Fine-tuning private collection item review projection pending history is invalid.');
  }
  if (pending) assertProjectionMatchesCurrent(pending, current, requestHash);
  return { pending };
}

function assertProjectionMatchesCurrent(projection, current, requestHash) {
  if (
    projection.workspace.id !== current.workspace.id ||
    projection.workspace.workspaceHash !== current.workspace.workspaceHash ||
    projection.admission.id !== current.admission.id ||
    projection.admission.admissionHash !== current.admission.admissionHash ||
    projection.item.id !== current.item.id ||
    projection.item.itemHash !== current.item.itemHash ||
    projection.projectionRequestHash !== requestHash
  ) {
    throw new Error('Fine-tuning private collection item review projection conflicts with a different request.');
  }
  assertFineTuningPrivateCollectionItemReviewProjection(projection, {
    admission: current.admission,
    item: current.item,
    request: current.request,
    workspace: current.workspace,
  });
}

function writePending({ pendingDirectory, projection }) {
  if (fs.existsSync(pendingDirectory)) {
    throw new Error('Fine-tuning private collection item review projection pending history conflicts with the exact request.');
  }
  fs.mkdirSync(pendingDirectory, { mode: 0o700 });
  fs.chmodSync(pendingDirectory, 0o700);
  assertOwnerOnlyDirectory(pendingDirectory, 'Fine-tuning private collection item review projection pending history');
  fsyncDirectory(path.dirname(pendingDirectory));
  writePrivateJson(path.join(pendingDirectory, 'projection.json'), projection);
  fsyncDirectory(pendingDirectory);
  fsyncDirectory(path.dirname(pendingDirectory));
}

function publishPending({ finalFilename, pendingDirectory, projection }) {
  const pendingFilename = path.join(pendingDirectory, 'projection.json');
  const stored = readProjection(
    pendingFilename,
    'Fine-tuning private collection item review projection pending history',
  );
  if (JSON.stringify(stored) !== JSON.stringify(projection)) {
    throw new Error('Fine-tuning private collection item review projection pending history is invalid.');
  }
  if (fs.existsSync(finalFilename)) {
    throw new Error('Fine-tuning private collection item review projection final history conflicts with pending state.');
  }
  fs.renameSync(pendingFilename, finalFilename);
  fsyncDirectory(path.dirname(finalFilename));
  if (!sameNames(readPrivateDirectory(pendingDirectory, 'Fine-tuning private collection item review projection pending history'), [])) {
    throw new Error('Fine-tuning private collection item review projection published but pending cleanup requires manual recovery.');
  }
  fs.rmdirSync(pendingDirectory);
  fsyncDirectory(path.dirname(finalFilename));
  const final = readProjection(finalFilename, 'Fine-tuning private collection item review projection final history');
  if (JSON.stringify(final) !== JSON.stringify(projection)) {
    throw new Error('Fine-tuning private collection item review projection published but integrity confirmation failed.');
  }
}

function assertNoTerminalOrRemovalHistory(current) {
  assertNoRemovalDirectories(current.workspaceDirectory);
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-tombstones');
  if (!fs.existsSync(root)) return;
  assertOwnerOnlyDirectory(root, 'Fine-tuning private collection item tombstone history');
  const workspaceRoot = path.join(root, current.workspace.workspaceHash);
  if (!fs.existsSync(workspaceRoot)) return;
  for (const name of readPrivateDirectory(workspaceRoot, 'Fine-tuning private collection item tombstone history')) {
      const terminal = path.join(workspaceRoot, name);
      if (/^[a-f0-9]{64}$/u.test(name)) {
        const names = readPrivateDirectory(terminal, 'Fine-tuning private collection item terminal history');
        if (sameNames(names, ['tombstone.json'])) {
          const tombstone = readOwnerOnlyJson(
            validatePrivateFilename(path.join(terminal, 'tombstone.json'), 'Fine-tuning private collection item tombstone history'),
            'Fine-tuning private collection item tombstone history',
          ).value;
          assertFineTuningPrivateCollectionItemTombstone(tombstone);
          if (tombstone.workspace.workspaceHash === current.workspace.workspaceHash && matchesTerminal(tombstone, current)) {
            throw new Error('Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.');
          }
          continue;
        }
        if (sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
          const bundle = {
            decision: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'decision.json'), 'Fine-tuning private collection item terminal decision'), 'Fine-tuning private collection item terminal decision').value,
            receipt: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'absence-receipt.json'), 'Fine-tuning private collection item absence receipt'), 'Fine-tuning private collection item absence receipt').value,
            tombstone: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'tombstone.json'), 'Fine-tuning private collection item tombstone history'), 'Fine-tuning private collection item tombstone history').value,
          };
          assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
          if (bundle.tombstone.workspace.workspaceHash === current.workspace.workspaceHash && matchesTerminal(bundle.tombstone, current)) {
            throw new Error('Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.');
          }
          continue;
        }
        throw new Error('Fine-tuning private collection item terminal history is invalid.');
      }
      if (/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) {
        const names = readPrivateDirectory(terminal, 'Fine-tuning private collection item pending terminal history');
        if (!sameNames(names, ['decision.json'])) {
          throw new Error('Fine-tuning private collection item pending terminal history is invalid.');
        }
        const decision = readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'decision.json'), 'Fine-tuning private collection item pending terminal decision'), 'Fine-tuning private collection item pending terminal decision').value;
        assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
        if (matchesTerminal(decision, current)) {
          throw new Error('Fine-tuning private collection item has pending terminal lifecycle history.');
        }
        continue;
      }
      throw new Error('Fine-tuning private collection item tombstone history is invalid.');
  }
}

function matchesTerminal(record, current) {
  return (
    record.admission?.id === current.admission.id ||
    record.admission?.admissionHash === current.admission.admissionHash ||
    record.item?.id === current.item.id ||
    record.item?.itemHash === current.item.itemHash ||
    record.withdrawalReferenceSha256 === current.item.retention.withdrawalReferenceSha256
  );
}

function assertNoRemovalDirectories(workspaceDirectory) {
  for (const lane of LANES) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of readPrivateDirectory(laneDirectory, 'Fine-tuning private collection workspace')) {
      if (/^\.fine-tuning-private-collection-item-removal-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection item removal history requires manual recovery.');
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
      const itemDirectory = path.join(laneDirectory, name);
      if (!sameNames(readPrivateDirectory(itemDirectory, 'Fine-tuning private collection workspace item'), ['item.json'])) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
      const stored = readOwnerOnlyJson(
        validatePrivateFilename(path.join(itemDirectory, 'item.json'), 'Fine-tuning private collection workspace item'),
        'Fine-tuning private collection workspace item',
      ).value;
      assertFineTuningPrivateCollectionItemRecord(stored);
      if (stored.lane !== lane || name !== `fine-tuning-private-collection-item-${stored.admission.admissionHash}`) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
    }
  }
}

function prepareHistoryRoot(workspaceHash) {
  const directories = [
    [path.join(repoDir, 'var'), true],
    [path.join(repoDir, 'var', 'fine-tuning'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', workspaceHash), false],
  ];
  for (const [directory, allowGroupRead] of directories) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
    }
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item review projection history', { allowGroupRead });
  }
  const root = fs.realpathSync(directories.at(-1)[0]);
  if (!isPathWithin(path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections'), root)) {
    throw new Error('Fine-tuning private collection item review projection history is invalid.');
  }
  return root;
}

function readWorkspace(input, executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) {
    throw new Error('Fine-tuning private collection workspace resolution hash is invalid.');
  }
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`,
  );
  const expected = path.join(workspaceDirectory, 'workspace.json');
  if (input.canonicalFilename !== fs.realpathSync(expected)) {
    throw new Error('Fine-tuning private collection workspace must use the exact prepared workspace location.');
  }
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection workspace');
  assertFineTuningPrivateCollectionWorkspaceRecord(result.value);
  if (
    result.value.executionResolution.id !== executionResolution.id ||
    result.value.executionResolution.resolutionHash !== executionResolution.resolutionHash
  ) {
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
  for (const directory of [workspaceDirectory, ...LANES.map((lane) => path.join(workspaceDirectory, lane))]) {
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection workspace');
  }
  return { ...result, workspaceDirectory };
}

function readAdmission(input, workspace) {
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection item admission');
  assertFineTuningPrivateCollectionItemAdmissionRecord(result.value);
  const expected = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions', result.value.id, 'admission.json');
  if (
    input.canonicalFilename !== fs.realpathSync(expected) ||
    result.value.workspace.id !== workspace.id ||
    result.value.workspace.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission must use the exact admission history location.');
  }
  return result;
}

function readItem(input, admission, workspace, workspaceDirectory) {
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection item');
  assertFineTuningPrivateCollectionItemRecord(result.value);
  const expected = path.join(
    workspaceDirectory,
    admission.envelope.lane,
    `fine-tuning-private-collection-item-${admission.admissionHash}`,
    'item.json',
  );
  if (
    input.canonicalFilename !== fs.realpathSync(expected) ||
    result.value.admission.id !== admission.id ||
    result.value.admission.admissionHash !== admission.admissionHash ||
    result.value.workspace.id !== workspace.id ||
    result.value.workspace.workspaceHash !== workspace.workspaceHash ||
    result.value.lane !== admission.envelope.lane
  ) {
    throw new Error('Fine-tuning private collection item must use the exact F1.10 stored item location.');
  }
  return result;
}

function readTrackedSources() {
  const artifactDir = path.join(repoDir, 'evidence', 'output-artifacts');
  const states = {
    assessment: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json')),
    collectionPlan: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json')),
    intakeRequest: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json')),
  };
  return {
    states,
    values: Object.fromEntries(Object.entries(states).map(([key, value]) => [key, value.value])),
  };
}

function parseFilenames(args) {
  const expected = [
    '--workspace', 'workspace', '--admission', 'admission', '--item', 'item', '--request', 'request',
    '--execution-resolution', 'executionResolution', '--execution-request', 'executionRequest',
    '--plan', 'plan', '--intake-resolution', 'intakeResolution',
  ];
  if (args.length !== expected.length || expected.some((value, index) => index % 2 === 0 && args[index] !== value) || expected.some((_, index) => index % 2 === 1 && !String(args[index] || '').trim())) {
    throw new Error('Expected --workspace <private-json-path> --admission <private-json-path> --item <private-json-path> --request <private-json-path> --execution-resolution <private-json-path> --execution-request <private-json-path> --plan <private-json-path> --intake-resolution <private-json-path>.');
  }
  return Object.fromEntries(expected.filter((_, index) => index % 2 === 1).map((key, index) => [key, args[index * 2 + 1]]));
}

function validatePrivateFilename(value, errorPrefix) {
  const filename = path.resolve(repoDir, value);
  const varDir = path.join(repoDir, 'var');
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    if (initialFile.isSymbolicLink()) throw new Error();
    assertOwnerOnlyFile(initialFile, errorPrefix);
    canonicalFilename = fs.realpathSync(filename);
    if (!sameObservation(initialFile, fs.lstatSync(filename)) || !sameObservation(initialFile, fs.statSync(canonicalFilename))) throw new Error();
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  const relative = findRelativePath(repoDir, filename);
  const lexicalInRepo = relative !== null;
  const lexicalInVar = relative === 'var' || relative?.startsWith(`var${path.sep}`);
  if (
    (lexicalInRepo && (!lexicalInVar || !isPathWithin(varDir, canonicalFilename))) ||
    (isPathWithin(repoDir, canonicalFilename) && !isPathWithin(varDir, canonicalFilename))
  ) {
    throw new Error(`${errorPrefix} must remain private under var/ or outside the repository.`);
  }
  return { canonicalFilename, filename, initialFile };
}

function readOwnerOnlyJson(input, errorPrefix) {
  let descriptor;
  try {
    descriptor = fs.openSync(input.canonicalFilename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyFile(before, errorPrefix);
    if (!sameObservation(input.initialFile, before) || fs.realpathSync(input.filename) !== input.canonicalFilename) {
      throw new Error(`${errorPrefix} changed before it was read.`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameObservation(before, after)) throw new Error(`${errorPrefix} changed while it was read.`);
    try {
      return { ...input, bytes, value: JSON.parse(bytes.toString('utf8')) };
    } catch {
      throw new Error(`${errorPrefix} JSON is invalid.`);
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function readTrackedJson(filename) {
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    canonicalFilename = fs.realpathSync(filename);
    if (!initialFile.isFile() || initialFile.isSymbolicLink() || initialFile.nlink !== 1 || initialFile.size <= 0 || initialFile.size > MAX_JSON_BYTES) throw new Error();
    const bytes = fs.readFileSync(canonicalFilename);
    if (!sameObservation(initialFile, fs.lstatSync(filename)) || !sameObservation(initialFile, fs.statSync(canonicalFilename))) throw new Error();
    return { bytes, canonicalFilename, filename, initialFile, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    throw new Error('Fine-tuning private collection item review projection tracked F1 chain is invalid.');
  }
}

function readProjection(filename, errorPrefix) {
  const value = readOwnerOnlyJson(validatePrivateFilename(filename, errorPrefix), errorPrefix).value;
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(value);
  return value;
}

function writePrivateJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
  const stat = fs.lstatSync(filename);
  assertOwnerOnlyFile(stat, 'Fine-tuning private collection item review projection pending history');
}

function readPrivateDirectory(directory, errorPrefix) {
  assertOwnerOnlyDirectory(directory, errorPrefix);
  return fs.readdirSync(directory).sort();
}

function assertOwnerOnlyDirectory(directory, errorPrefix, { allowGroupRead = false } = {}) {
  let stat;
  try {
    stat = fs.lstatSync(directory);
  } catch {
    throw new Error(`${errorPrefix} is invalid.`);
  }
  const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
  if (!stat.isDirectory() || stat.isSymbolicLink() || !isCurrentUserOwned(stat) || (stat.mode & forbiddenMode) !== 0) {
    throw new Error(`${errorPrefix} is invalid.`);
  }
}

function assertOwnerOnlyFile(stat, errorPrefix) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size <= 0 || stat.size > MAX_JSON_BYTES || !isCurrentUserOwned(stat) || (stat.mode & 0o077) !== 0) {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
}

function fsyncFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function sameObservation(left, right) {
  return left.dev === right.dev && left.ino === right.ino && (left.mode & 0o777) === (right.mode & 0o777) && left.size === right.size && left.nlink === right.nlink;
}

function sameNames(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function findRelativePath(directory, candidate) {
  const directoryStat = fs.statSync(directory);
  let current = candidate;
  while (true) {
    try {
      const stat = fs.statSync(current);
      if (stat.dev === directoryStat.dev && stat.ino === directoryStat.ino) return path.relative(current, candidate);
    } catch {
      // The bounded file check reports unreadable paths.
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
