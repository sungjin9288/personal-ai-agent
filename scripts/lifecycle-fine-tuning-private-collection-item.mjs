import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItemAbsenceReceiptRecord,
  assertFineTuningPrivateCollectionItemLifecycleDecisionInput,
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleStoredReferences,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding,
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../src/core/fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertFineTuningPrivateAnswerQualityDeletionCascadeFinal,
  finalizeFineTuningPrivateAnswerQualityDeletionCascade,
  prepareFineTuningPrivateAnswerQualityDeletionCascade,
} from './helpers/fine-tuning-private-answer-quality-case-cascade.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const LANES = ['reviewed-examples', 'answer-quality-cases'];
const repoDir = fs.realpathSync(process.cwd());
const inputs = parsePrivateFilenames(process.argv.slice(2));
const initial = readInitialInputs(inputs);
const workspaceLock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private collection item lifecycle lock',
});

let receipt;
try {
  const terminalRoot = prepareTerminalRoot(initial.workspace.workspaceHash, initial.layout.workspaceDirectory);
  receipt = executeLifecycle({ initial, inputs, terminalRoot });
} finally {
  workspaceLock.release();
}

console.log(JSON.stringify({
  externalProviderCalls: receipt.externalProviderCalls,
  itemPathAbsent: receipt.itemPathAbsent,
  matchingAdmissionItemCount: receipt.matchingAdmissionItemCount,
  matchingItemHashCount: receipt.matchingItemHashCount,
  mode: 'fine-tuning-private-collection-item-lifecycle',
  ok: true,
  postDeleteAbsenceObserved: receipt.postDeleteAbsenceObserved,
  productionReadyClaim: receipt.productionReadyClaim,
  status: receipt.status,
  trainingAuthorized: receipt.trainingAuthorized,
}, null, 2));

function executeLifecycle({ initial, inputs: privateInputs, terminalRoot: root }) {
  const current = readCurrentInputs(privateInputs, initial);
  const basePaths = deriveBasePaths(current.admission, current.decision, root);
  assertExactItemFilename(privateInputs.item, basePaths.itemFilename);
  const terminal = inspectTerminal(basePaths, current.decision);
  const paths = terminal.kind === 'pending' || terminal.kind === 'final-v2'
    ? withDecisionPaths(basePaths, terminal.decision)
    : basePaths;
  const itemState = readStoredItem(paths.itemFilename, {
    allowMissing: terminal.kind === 'final-v2' || terminal.kind === 'pending',
  });

  if (terminal.kind === 'final-v2') {
    if (itemState) {
      throw new Error('Fine-tuning private collection item lifecycle item and terminal bundle conflict requires manual recovery.');
    }
    assertFinalAbsence({ current, paths, terminal });
    assertFineTuningPrivateAnswerQualityDeletionCascadeFinal({
      current: { ...current, item: null },
      decision: terminal.decision,
      repoDir,
      terminalBundle: terminal.bundle,
    });
    cleanupEmptyRemoval(paths);
    return terminal.bundle.receipt;
  }
  if (terminal.kind === 'legacy-final') {
    throw new Error('Fine-tuning private collection item lifecycle legacy terminal bundle requires manual recovery.');
  }

  let decision;
  if (terminal.kind === 'pending') {
    decision = terminal.decision;
    assertDecisionInputMatches(decision, current.decision);
  } else {
    if (!itemState) {
      throw new Error('Fine-tuning private collection item lifecycle item is missing without a resumable terminal record.');
    }
    assertInitialInputsUnchanged(privateInputs, initial);
    assertStoredReferences({ ...current, item: itemState.item });
    decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: current.admission,
      executionAt: new Date().toISOString(),
      input: current.decision,
      item: itemState.item,
      workspace: current.workspace,
    });
    Object.assign(paths, withDecisionPaths(basePaths, decision));
  }

  if (terminal.kind === 'pending' && terminal.hasBundle) {
    if (itemState) {
      throw new Error('Fine-tuning private collection item lifecycle terminal publish state requires manual recovery.');
    }
    assertPendingBundleAbsence({ current, paths, terminal });
    const cascadeCurrent = { ...current, item: null };
    const cascade = prepareFineTuningPrivateAnswerQualityDeletionCascade({
      current: cascadeCurrent,
      decision,
      repoDir,
    });
    finalizeFineTuningPrivateAnswerQualityDeletionCascade({
      cascade,
      current: cascadeCurrent,
      decision,
      itemFilename: paths.itemFilename,
      removalDirectory: paths.removalDirectory,
      repoDir,
      terminalBundle: terminal.bundle,
    });
    publishTerminalBundle({
      bundle: terminal.bundle,
      current: cascadeCurrent,
      decision,
      paths,
    });
    return terminal.bundle.receipt;
  }

  if (terminal.kind === 'pending' && terminal.hasTombstone) {
    if (itemState) {
      throw new Error('Fine-tuning private collection item lifecycle tombstone and item conflict requires manual recovery.');
    }
    const absence = assertAbsentAcrossLanes({ current, paths, decision });
    const cascadeCurrent = { ...current, item: null };
    const cascade = prepareFineTuningPrivateAnswerQualityDeletionCascade({
      current: cascadeCurrent,
      decision,
      repoDir,
    });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
      absence,
      decision,
      observedAt: new Date().toISOString(),
      tombstone: terminal.tombstone,
    });
    writePendingReceipt(paths.pendingDirectory, receipt);
    const bundle = { decision, receipt, tombstone: terminal.tombstone };
    finalizeFineTuningPrivateAnswerQualityDeletionCascade({
      cascade,
      current: cascadeCurrent,
      decision,
      itemFilename: paths.itemFilename,
      removalDirectory: paths.removalDirectory,
      repoDir,
      terminalBundle: bundle,
    });
    publishTerminalBundle({
      bundle,
      current: cascadeCurrent,
      decision,
      paths,
    });
    return receipt;
  }

  const removalState = inspectRemoval(paths, itemState);
  if (itemState && removalState) {
    throw new Error('Fine-tuning private collection item lifecycle item and removal directory conflict requires manual recovery.');
  }
  if (!itemState && !removalState) {
    throw new Error('Fine-tuning private collection item lifecycle pending state requires manual recovery.');
  }
  assertNoUnexpectedWorkspaceContent(current, paths);
  const cascadeCurrent = {
    ...current,
    item: itemState?.item || removalState?.item?.item || null,
  };
  if (terminal.kind !== 'pending') {
    createPendingDecision(paths.pendingDirectory, decision);
  }
  const cascade = prepareFineTuningPrivateAnswerQualityDeletionCascade({
    current: cascadeCurrent,
    decision,
    repoDir,
  });
  if (itemState) {
    moveItemToRemoval({ current, itemState, paths });
  }
  unlinkRemovalItem({ current, paths, decision });
  const absence = assertAbsentAcrossLanes({ current, paths, decision });
  const recordedAt = new Date().toISOString();
  const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt });
  const generatedReceipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
    absence,
    decision,
    observedAt: recordedAt,
    tombstone,
  });
  const bundle = {
    decision,
    receipt: generatedReceipt,
    tombstone,
  };
  writePendingBundle(paths.pendingDirectory, bundle);
  if (!absence.removalDirectoryEmpty) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory is not empty.');
  }
  finalizeFineTuningPrivateAnswerQualityDeletionCascade({
    cascade,
    current: cascadeCurrent,
    decision,
    itemFilename: paths.itemFilename,
    removalDirectory: paths.removalDirectory,
    repoDir,
    terminalBundle: bundle,
  });
  publishTerminalBundle({
    bundle,
    current: cascadeCurrent,
    decision,
    paths,
  });
  return generatedReceipt;
}

function readInitialInputs(privateInputs) {
  const workspaceInput = readOwnerOnlyJson(privateInputs.workspace, 'Fine-tuning private collection workspace');
  assertFineTuningPrivateCollectionWorkspaceRecord(workspaceInput.value);
  const layout = captureWorkspaceLayout(workspaceInput.value);
  assertExactFilename(privateInputs.workspace.filename, path.join(layout.workspaceDirectory, 'workspace.json'), 'Fine-tuning private collection workspace');

  const admissionInput = readOwnerOnlyJson(privateInputs.admission, 'Fine-tuning private collection item admission');
  assertFineTuningPrivateCollectionItemAdmissionRecord(admissionInput.value);
  assertExactFilename(
    privateInputs.admission.filename,
    path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions', admissionInput.value.id, 'admission.json'),
    'Fine-tuning private collection item admission',
  );
  if (
    admissionInput.value.workspace.id !== workspaceInput.value.id ||
    admissionInput.value.workspace.workspaceHash !== workspaceInput.value.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item lifecycle admission is invalid.');
  }

  const decisionInput = readOwnerOnlyJson(privateInputs.decision, 'Fine-tuning private collection item lifecycle decision');
  assertFineTuningPrivateCollectionItemLifecycleDecisionInput(decisionInput.value);
  return {
    admission: admissionInput.value,
    admissionState: admissionInput.state,
    decision: decisionInput.value,
    decisionState: decisionInput.state,
    layout,
    workspace: workspaceInput.value,
    workspaceState: workspaceInput.state,
  };
}

function readCurrentInputs(privateInputs, initial) {
  const workspaceInput = readOwnerOnlyJson(privateInputs.workspace, 'Fine-tuning private collection workspace');
  const admissionInput = readOwnerOnlyJson(privateInputs.admission, 'Fine-tuning private collection item admission');
  const decisionInput = readOwnerOnlyJson(privateInputs.decision, 'Fine-tuning private collection item lifecycle decision');
  assertInputUnchanged(initial.workspaceState, workspaceInput, 'Fine-tuning private collection workspace');
  assertInputUnchanged(initial.admissionState, admissionInput, 'Fine-tuning private collection item admission');
  assertInputUnchanged(initial.decisionState, decisionInput, 'Fine-tuning private collection item lifecycle decision');
  assertFineTuningPrivateCollectionWorkspaceRecord(workspaceInput.value);
  assertFineTuningPrivateCollectionItemAdmissionRecord(admissionInput.value);
  assertFineTuningPrivateCollectionItemLifecycleDecisionInput(decisionInput.value);
  assertWorkspaceLayoutUnchanged(initial.layout);
  if (
    JSON.stringify(workspaceInput.value) !== JSON.stringify(initial.workspace) ||
    JSON.stringify(admissionInput.value) !== JSON.stringify(initial.admission)
  ) {
    throw new Error('Fine-tuning private collection item lifecycle stored records changed during execution.');
  }
  return {
    admission: admissionInput.value,
    decision: decisionInput.value,
    layout: initial.layout,
    workspace: workspaceInput.value,
    workspaceState: workspaceInput.state,
  };
}

function assertInitialInputsUnchanged(privateInputs, initial) {
  const workspace = readOwnerOnlyJson(privateInputs.workspace, 'Fine-tuning private collection workspace');
  const admission = readOwnerOnlyJson(privateInputs.admission, 'Fine-tuning private collection item admission');
  const decision = readOwnerOnlyJson(privateInputs.decision, 'Fine-tuning private collection item lifecycle decision');
  assertInputUnchanged(initial.workspaceState, workspace, 'Fine-tuning private collection workspace');
  assertInputUnchanged(initial.admissionState, admission, 'Fine-tuning private collection item admission');
  assertInputUnchanged(initial.decisionState, decision, 'Fine-tuning private collection item lifecycle decision');
  assertFineTuningPrivateCollectionItemLifecycleDecisionInput(decision.value);
}

function deriveBasePaths(admission, decision, root) {
  const itemReference = decision?.item;
  if (!itemReference || typeof itemReference !== 'object' || !/^[a-f0-9]{64}$/u.test(itemReference.itemHash || '')) {
    throw new Error('Fine-tuning private collection item lifecycle decision item reference is invalid.');
  }
  const lane = admission.envelope?.lane;
  if (!LANES.includes(lane)) {
    throw new Error('Fine-tuning private collection item lifecycle admission lane is invalid.');
  }
  const itemDirectory = path.join(
    root.workspaceDirectory,
    lane,
    `fine-tuning-private-collection-item-${admission.admissionHash}`,
  );
  const withdrawalReferenceSha256 = decision.withdrawalReferenceSha256;
  if (!/^[a-f0-9]{64}$/u.test(withdrawalReferenceSha256 || '')) {
    throw new Error('Fine-tuning private collection item lifecycle withdrawal reference is invalid.');
  }
  return {
    finalDirectory: path.join(root.terminalRoot, withdrawalReferenceSha256),
    itemDirectory,
    itemFilename: path.join(itemDirectory, 'item.json'),
    lane,
    laneDirectory: path.join(root.workspaceDirectory, lane),
    terminalRoot: root.terminalRoot,
  };
}

function withDecisionPaths(paths, decision) {
  if (!/^[a-f0-9]{64}$/u.test(decision?.decisionHash || '')) {
    throw new Error('Fine-tuning private collection item lifecycle decision is invalid.');
  }
  return {
    ...paths,
    pendingDirectory: path.join(paths.terminalRoot, `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`),
    removalDirectory: path.join(paths.laneDirectory, `.fine-tuning-private-collection-item-removal-${decision.decisionHash}`),
  };
}

function inspectTerminal(paths, decisionInput) {
  const terminalNames = readPrivateDirectory(paths.terminalRoot, 'Fine-tuning private collection item terminal root');
  for (const name of terminalNames) {
    if (!/^[a-f0-9]{64}$/u.test(name) && !/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private collection item terminal history is invalid.');
    }
    observePrivateDirectory(path.join(paths.terminalRoot, name), 'Fine-tuning private collection item terminal history');
  }
  const finalExists = fs.existsSync(paths.finalDirectory);
  const matchingPendingDirectories = [];
  for (const name of terminalNames) {
    if (!/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) continue;
    const directory = path.join(paths.terminalRoot, name);
    const pending = readPendingTerminal(directory, name);
    if (pending.decision.withdrawalReferenceSha256 !== decisionInput.withdrawalReferenceSha256) {
      continue;
    }
    if (!sameDecisionReference(pending.decision, decisionInput)) {
      throw new Error('Fine-tuning private collection item lifecycle conflicting pending decision requires manual recovery.');
    }
    matchingPendingDirectories.push({ directory, pending });
  }
  if (matchingPendingDirectories.length > 1 || (finalExists && matchingPendingDirectories.length === 1)) {
    throw new Error('Fine-tuning private collection item lifecycle pending and final terminal conflict requires manual recovery.');
  }
  if (finalExists) {
    const names = readPrivateDirectory(paths.finalDirectory, 'Fine-tuning private collection item terminal bundle');
    if (sameNames(names, ['tombstone.json'])) {
      return { kind: 'legacy-final' };
    }
    const bundle = readTerminalBundle(paths.finalDirectory);
    if (!sameDecisionReference(bundle.decision, decisionInput)) {
      throw new Error('Fine-tuning private collection item lifecycle final decision conflicts with the requested action.');
    }
    return { bundle, decision: bundle.decision, kind: 'final-v2' };
  }
  if (matchingPendingDirectories.length === 1) {
    const { directory: pendingDirectory, pending } = matchingPendingDirectories[0];
    return {
      bundle: pending.bundle,
      decision: pending.decision,
      hasBundle: pending.bundle !== undefined,
      hasTombstone: pending.tombstone !== undefined,
      kind: 'pending',
      tombstone: pending.tombstone,
    };
  }
  return { kind: 'none' };
}

function readPendingTerminal(directory, name) {
  const names = readPrivateDirectory(directory, 'Fine-tuning private collection item pending terminal bundle');
  if (
    !sameNames(names, ['decision.json']) &&
    !sameNames(names, ['decision.json', 'tombstone.json']) &&
    !sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])
  ) {
    throw new Error('Fine-tuning private collection item lifecycle pending terminal bundle is invalid.');
  }
  const decision = readRecord(path.join(directory, 'decision.json'), 'Fine-tuning private collection item pending decision');
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
  if (name !== `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`) {
    throw new Error('Fine-tuning private collection item lifecycle pending decision path is invalid.');
  }
  if (names.length === 1) return { decision };
  const tombstone = readRecord(path.join(directory, 'tombstone.json'), 'Fine-tuning private collection item tombstone');
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({ decision, tombstone });
  if (names.length === 2) return { decision, tombstone };
  return {
    bundle: readTerminalBundle(directory),
    decision,
    tombstone,
  };
}

function readTerminalBundle(directory) {
  const names = readPrivateDirectory(directory, 'Fine-tuning private collection item terminal bundle');
  if (!sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
    throw new Error('Fine-tuning private collection item terminal bundle is invalid.');
  }
  const bundle = {
    decision: readRecord(path.join(directory, 'decision.json'), 'Fine-tuning private collection item terminal decision'),
    receipt: readRecord(path.join(directory, 'absence-receipt.json'), 'Fine-tuning private collection item absence receipt'),
    tombstone: readRecord(path.join(directory, 'tombstone.json'), 'Fine-tuning private collection item tombstone'),
  };
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
  return bundle;
}

function assertDecisionInputMatches(decision, input) {
  if (!sameDecisionReference(decision, input)) {
    throw new Error('Fine-tuning private collection item lifecycle decision conflicts with the requested action.');
  }
  if (hashText(input.confirmationToken) !== decision.confirmationTokenSha256) {
    throw new Error('Fine-tuning private collection item lifecycle confirmation token conflicts with the stored decision.');
  }
}

function sameDecisionReference(decision, input) {
  return Boolean(
    input &&
    decision.action === input.action &&
    decision.admission.id === input.admission?.id &&
    decision.admission.admissionHash === input.admission?.admissionHash &&
    sameTimestamp(decision.decidedAt, input.decidedAt) &&
    decision.decidedBy === input.decidedBy &&
    decision.evidenceSha256 === input.evidenceSha256 &&
    decision.item.id === input.item?.id &&
    decision.item.itemHash === input.item?.itemHash &&
    decision.withdrawalReferenceSha256 === input.withdrawalReferenceSha256 &&
    decision.workspace.id === input.workspace?.id &&
    decision.workspace.workspaceHash === input.workspace?.workspaceHash,
  );
}

function sameTimestamp(left, right) {
  const leftMs = Date.parse(String(left || ''));
  const rightMs = Date.parse(String(right || ''));
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

function readStoredItem(filename, { allowMissing }) {
  if (!fs.existsSync(filename)) {
    if (allowMissing) return undefined;
    throw new Error('Fine-tuning private collection item lifecycle item is missing.');
  }
  const input = privateInput(filename, 'Fine-tuning private collection item');
  const stored = readOwnerOnlyJson(input, 'Fine-tuning private collection item');
  assertFineTuningPrivateCollectionItemRecord(stored.value);
  const directory = path.dirname(filename);
  const directoryState = observePrivateDirectory(directory, 'Fine-tuning private collection item directory');
  if (!sameNames(fs.readdirSync(directory), ['item.json'])) {
    throw new Error('Fine-tuning private collection item lifecycle item directory is invalid.');
  }
  return { directory, directoryState, item: stored.value, state: stored.state };
}

function assertStoredReferences({ admission, item, workspace }) {
  assertFineTuningPrivateCollectionItemLifecycleStoredReferences({ admission, item, workspace });
}

function createPendingDecision(directory, decision) {
  if (fs.existsSync(directory)) {
    throw new Error('Fine-tuning private collection item lifecycle pending terminal bundle already exists.');
  }
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  try {
    fsyncDirectory(path.dirname(directory));
    writeRecord(path.join(directory, 'decision.json'), decision);
    fsyncDirectory(directory);
    fsyncDirectory(path.dirname(directory));
  } catch {
    throw new Error('Fine-tuning private collection item lifecycle pending decision could not be persisted.');
  }
}

function inspectRemoval(paths, itemState) {
  if (!fs.existsSync(paths.removalDirectory)) return undefined;
  const names = readPrivateDirectory(paths.removalDirectory, 'Fine-tuning private collection item removal directory');
  if (sameNames(names, [])) return { empty: true };
  if (!sameNames(names, ['item.json'])) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory is invalid.');
  }
  const removed = readStoredItem(path.join(paths.removalDirectory, 'item.json'), { allowMissing: false });
  if (itemState && JSON.stringify(removed.item) !== JSON.stringify(itemState.item)) {
    throw new Error('Fine-tuning private collection item lifecycle removal item changed during execution.');
  }
  return { empty: false, item: removed };
}

function moveItemToRemoval({ current, itemState, paths }) {
  assertStoredReferences({ ...current, item: itemState.item });
  assertItemUnchanged(itemState, paths.itemFilename);
  assertWorkspaceLayoutUnchanged(current.layout);
  if (fs.existsSync(paths.removalDirectory)) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory already exists.');
  }
  fs.renameSync(paths.itemDirectory, paths.removalDirectory);
  fsyncDirectory(paths.laneDirectory);
  assertWorkspaceLaneUnchanged(current.layout.lanes[paths.lane]);
  const moved = readStoredItem(path.join(paths.removalDirectory, 'item.json'), { allowMissing: false });
  if (
    JSON.stringify(moved.item) !== JSON.stringify(itemState.item) ||
    !sameObservation(itemState.directoryState, moved.directoryState) ||
    !sameObservation(itemState.state.initialFile, moved.state.initialFile) ||
    !itemState.state.bytes.equals(moved.state.bytes)
  ) {
    throw new Error('Fine-tuning private collection item lifecycle moved item integrity failed.');
  }
}

function unlinkRemovalItem({ current, paths, decision }) {
  const removal = inspectRemoval(paths);
  if (!removal || removal.empty) return;
  assertStoredReferences({ ...current, item: removal.item.item });
  if (
    removal.item.item.id !== decision.item.id ||
    removal.item.item.itemHash !== decision.item.itemHash ||
    removal.item.item.admission.id !== decision.admission.id
  ) {
    throw new Error('Fine-tuning private collection item lifecycle removal item conflicts with the decision.');
  }
  const itemFilename = path.join(paths.removalDirectory, 'item.json');
  assertItemUnchanged(removal.item, itemFilename);
  assertWorkspaceLaneUnchanged(current.layout.lanes[paths.lane]);
  fs.unlinkSync(itemFilename);
  fsyncDirectory(paths.removalDirectory);
  if (
    !sameObservation(
      removal.item.directoryState,
      observePrivateDirectory(paths.removalDirectory, 'Fine-tuning private collection item removal directory'),
    )
  ) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory changed during unlink.');
  }
  assertWorkspaceLaneUnchanged(current.layout.lanes[paths.lane]);
  if (!sameNames(readPrivateDirectory(paths.removalDirectory, 'Fine-tuning private collection item removal directory'), [])) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory is not empty.');
  }
}

function assertAbsentAcrossLanes({ current, paths, decision, allowMissingRemoval = false }) {
  let matchingAdmissionItemCount = 0;
  let matchingItemHashCount = 0;
  let removalDirectoryEmpty = false;
  assertWorkspaceLayoutUnchanged(current.layout);
  for (const lane of LANES) {
    const laneDirectory = current.layout.lanes[lane].directory;
    for (const name of fs.readdirSync(laneDirectory)) {
      const directory = path.join(laneDirectory, name);
      if (directory === paths.removalDirectory) {
        if (lane !== paths.lane || !sameNames(readPrivateDirectory(directory, 'Fine-tuning private collection item removal directory'), [])) {
          throw new Error('Fine-tuning private collection item lifecycle removal directory is invalid.');
        }
        removalDirectoryEmpty = true;
        continue;
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection item lifecycle workspace contains unexpected content.');
      }
      const item = readStoredItem(path.join(directory, 'item.json'), { allowMissing: false }).item;
      if (item.admission.id === decision.admission.id || item.admission.admissionHash === decision.admission.admissionHash) {
        matchingAdmissionItemCount += 1;
      }
      if (item.itemHash === decision.item.itemHash) {
        matchingItemHashCount += 1;
      }
    }
  }
  if ((!removalDirectoryEmpty && !allowMissingRemoval) || matchingAdmissionItemCount !== 0 || matchingItemHashCount !== 0) {
    throw new Error('Fine-tuning private collection item lifecycle post-delete absence check failed.');
  }
  assertWorkspaceRecordUnchanged(current);
  return {
    itemPathAbsent: true,
    matchingAdmissionItemCount,
    matchingItemHashCount,
    postDeleteAbsenceObserved: true,
    removalDirectoryEmpty: removalDirectoryEmpty || allowMissingRemoval,
    workspaceRecordUnchanged: true,
  };
}

function assertNoUnexpectedWorkspaceContent(current, paths) {
  for (const lane of LANES) {
    const laneDirectory = current.layout.lanes[lane].directory;
    for (const name of fs.readdirSync(laneDirectory)) {
      const directory = path.join(laneDirectory, name);
      if (directory === paths.removalDirectory) {
        inspectRemoval(paths);
        continue;
      }
      if (directory === paths.itemDirectory) {
        const item = readStoredItem(path.join(directory, 'item.json'), { allowMissing: false }).item;
        assertFineTuningPrivateCollectionItemRecord(item);
        continue;
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection item lifecycle workspace contains unexpected content.');
      }
      const item = readStoredItem(path.join(directory, 'item.json'), { allowMissing: false }).item;
      assertFineTuningPrivateCollectionItemRecord(item);
    }
  }
}

function writePendingBundle(directory, bundle) {
  const names = readPrivateDirectory(directory, 'Fine-tuning private collection item pending terminal bundle');
  if (!sameNames(names, ['decision.json'])) {
    throw new Error('Fine-tuning private collection item lifecycle pending terminal bundle is invalid.');
  }
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
  writeRecord(path.join(directory, 'tombstone.json'), bundle.tombstone);
  writeRecord(path.join(directory, 'absence-receipt.json'), bundle.receipt);
  fsyncDirectory(directory);
  if (!sameNames(readPrivateDirectory(directory, 'Fine-tuning private collection item pending terminal bundle'), ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
    throw new Error('Fine-tuning private collection item lifecycle pending terminal bundle is invalid.');
  }
}

function writePendingReceipt(directory, receipt) {
  if (!sameNames(readPrivateDirectory(directory, 'Fine-tuning private collection item pending terminal bundle'), ['decision.json', 'tombstone.json'])) {
    throw new Error('Fine-tuning private collection item lifecycle pending terminal bundle is invalid.');
  }
  assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(receipt);
  writeRecord(path.join(directory, 'absence-receipt.json'), receipt);
  fsyncDirectory(directory);
}

function publishPendingBundle(paths, bundle) {
  if (fs.existsSync(paths.finalDirectory)) {
    throw new Error('Fine-tuning private collection item lifecycle final terminal bundle already exists.');
  }
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
  fs.renameSync(paths.pendingDirectory, paths.finalDirectory);
  fsyncDirectory(paths.terminalRoot);
  cleanupEmptyRemoval(paths);
}

function publishTerminalBundle({ bundle, current, decision, paths }) {
  assertFineTuningPrivateAnswerQualityDeletionCascadeFinal({
    current,
    decision,
    repoDir,
    terminalBundle: bundle,
  });
  publishPendingBundle(paths, bundle);
}

function cleanupEmptyRemoval(paths) {
  if (!fs.existsSync(paths.removalDirectory)) return;
  if (!sameNames(readPrivateDirectory(paths.removalDirectory, 'Fine-tuning private collection item removal directory'), [])) {
    throw new Error('Fine-tuning private collection item lifecycle removal directory is not empty.');
  }
  fs.rmdirSync(paths.removalDirectory);
  fsyncDirectory(paths.laneDirectory);
}

function assertFinalAbsence({ current, paths, terminal }) {
  const { decision, receipt, tombstone } = terminal.bundle;
  assertDecisionInputMatches(decision, current.decision);
  if (
    decision.workspace.id !== current.workspace.id ||
    decision.admission.id !== current.admission.id ||
    tombstone.withdrawalReferenceSha256 !== current.admission.envelope.retention.withdrawalReferenceSha256
  ) {
    throw new Error('Fine-tuning private collection item lifecycle final terminal bundle conflicts with stored records.');
  }
  const absence = assertAbsentAcrossLanes({ current, paths, decision, allowMissingRemoval: true });
  if (
    receipt.itemPathAbsent !== absence.itemPathAbsent ||
    receipt.matchingAdmissionItemCount !== absence.matchingAdmissionItemCount ||
    receipt.matchingItemHashCount !== absence.matchingItemHashCount ||
    receipt.postDeleteAbsenceObserved !== absence.postDeleteAbsenceObserved ||
    receipt.removalDirectoryEmpty !== absence.removalDirectoryEmpty ||
    receipt.workspaceRecordUnchanged !== absence.workspaceRecordUnchanged
  ) {
    throw new Error('Fine-tuning private collection item lifecycle final absence receipt is inconsistent.');
  }
}

function assertPendingBundleAbsence({ current, paths, terminal }) {
  const absence = assertAbsentAcrossLanes({ current, paths, decision: terminal.decision });
  const { receipt } = terminal.bundle;
  if (
    receipt.itemPathAbsent !== absence.itemPathAbsent ||
    receipt.matchingAdmissionItemCount !== absence.matchingAdmissionItemCount ||
    receipt.matchingItemHashCount !== absence.matchingItemHashCount ||
    receipt.postDeleteAbsenceObserved !== absence.postDeleteAbsenceObserved ||
    receipt.removalDirectoryEmpty !== absence.removalDirectoryEmpty ||
    receipt.workspaceRecordUnchanged !== absence.workspaceRecordUnchanged
  ) {
    throw new Error('Fine-tuning private collection item lifecycle pending absence receipt is inconsistent.');
  }
}

function assertWorkspaceRecordUnchanged(current) {
  const workspaceInput = readOwnerOnlyJson(privateInput(path.join(current.layout.workspaceDirectory, 'workspace.json'), 'Fine-tuning private collection workspace'), 'Fine-tuning private collection workspace');
  if (
    !workspaceInput.state.bytes.equals(current.workspaceState.bytes) ||
    !sameObservation(workspaceInput.state.initialFile, current.workspaceState.initialFile) ||
    JSON.stringify(workspaceInput.value) !== JSON.stringify(current.workspace)
  ) {
    throw new Error('Fine-tuning private collection workspace changed during lifecycle execution.');
  }
}

function parsePrivateFilenames(args) {
  if (
    args.length !== 8 ||
    args[0] !== '--workspace' || !args[1] ||
    args[2] !== '--admission' || !args[3] ||
    args[4] !== '--item' || !args[5] ||
    args[6] !== '--decision' || !args[7]
  ) {
    throw new Error('Expected --workspace <private-json-path> --admission <private-json-path> --item <private-json-path> --decision <private-json-path>.');
  }
  return {
    admission: privateInput(args[3], 'Fine-tuning private collection item admission'),
    decision: privateInput(args[7], 'Fine-tuning private collection item lifecycle decision'),
    item: { filename: path.resolve(repoDir, args[5]) },
    workspace: privateInput(args[1], 'Fine-tuning private collection workspace'),
  };
}

function privateInput(value, errorPrefix) {
  const filename = path.resolve(repoDir, value);
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    if (initialFile.isSymbolicLink()) throw new Error();
    assertOwnerOnlyFile(initialFile, errorPrefix);
    canonicalFilename = fs.realpathSync(filename);
    const observed = fs.lstatSync(filename);
    const canonical = fs.statSync(canonicalFilename);
    if (!sameObservation(initialFile, observed) || !sameObservation(initialFile, canonical)) throw new Error();
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  const varDirectory = path.join(repoDir, 'var');
  const relative = findRelativePath(repoDir, filename);
  if (
    (relative !== null && (relative !== 'var' && !relative.startsWith(`var${path.sep}`))) ||
    !isPathWithin(varDirectory, canonicalFilename)
  ) {
    throw new Error(`${errorPrefix} must remain private under var/.`);
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
    let value;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(`${errorPrefix} JSON is invalid.`);
    }
    return { state: { bytes, canonicalFilename: input.canonicalFilename, initialFile: input.initialFile }, value };
  } finally {
    fs.closeSync(descriptor);
  }
}

function readRecord(filename, errorPrefix) {
  return readOwnerOnlyJson(privateInput(filename, errorPrefix), errorPrefix).value;
}

function assertInputUnchanged(expected, observed, errorPrefix) {
  if (
    expected.canonicalFilename !== observed.state.canonicalFilename ||
    !sameObservation(expected.initialFile, observed.state.initialFile) ||
    !expected.bytes.equals(observed.state.bytes)
  ) {
    throw new Error(`${errorPrefix} changed during lifecycle execution.`);
  }
}

function assertItemUnchanged(itemState, filename) {
  const current = readStoredItem(filename, { allowMissing: false });
  if (
    !sameObservation(itemState.directoryState, current.directoryState) ||
    !sameObservation(itemState.state.initialFile, current.state.initialFile) ||
    !itemState.state.bytes.equals(current.state.bytes) ||
    JSON.stringify(itemState.item) !== JSON.stringify(current.item)
  ) {
    throw new Error('Fine-tuning private collection item changed during lifecycle execution.');
  }
}

function captureWorkspaceLayout(workspace) {
  const resolutionHash = workspace.executionResolution?.resolutionHash;
  if (!/^[a-f0-9]{64}$/u.test(resolutionHash || '')) {
    throw new Error('Fine-tuning private collection workspace layout is invalid.');
  }
  const varDirectory = path.join(repoDir, 'var');
  const fineTuningDirectory = path.join(varDirectory, 'fine-tuning');
  const workspaceRoot = path.join(fineTuningDirectory, 'private-collection-workspaces');
  const workspaceDirectory = path.join(workspaceRoot, `fine-tuning-private-collection-workspace-${resolutionHash}`);
  const ancestors = [
    observePrivateDirectory(varDirectory, 'Fine-tuning private collection workspace ancestors', { allowGroupRead: true }),
    observePrivateDirectory(fineTuningDirectory, 'Fine-tuning private collection workspace ancestors'),
    observePrivateDirectory(workspaceRoot, 'Fine-tuning private collection workspace ancestors'),
    observePrivateDirectory(workspaceDirectory, 'Fine-tuning private collection workspace ancestors'),
  ];
  const workspaceCanonical = fs.realpathSync(workspaceDirectory);
  const lanes = Object.fromEntries(LANES.map((lane) => {
    const directory = path.join(workspaceDirectory, lane);
    const observation = observePrivateDirectory(directory, 'Fine-tuning private collection workspace lane');
    const canonicalDirectory = fs.realpathSync(directory);
    if (canonicalDirectory !== path.join(workspaceCanonical, lane)) {
      throw new Error('Fine-tuning private collection workspace lane is invalid.');
    }
    return [lane, { ...observation, canonicalDirectory }];
  }));
  return { ancestors, lanes, workspaceDirectory, workspaceCanonical };
}

function assertWorkspaceLayoutUnchanged(layout) {
  for (const ancestor of layout.ancestors) {
    const current = observePrivateDirectory(ancestor.directory, 'Fine-tuning private collection workspace ancestors', {
      allowGroupRead: ancestor.allowGroupRead,
    });
    if (!sameObservation(ancestor, current)) {
      throw new Error('Fine-tuning private collection workspace changed during lifecycle execution.');
    }
  }
  for (const lane of Object.values(layout.lanes)) {
    assertWorkspaceLaneUnchanged(lane);
  }
}

function assertWorkspaceLaneUnchanged(lane) {
  const current = observePrivateDirectory(lane.directory, 'Fine-tuning private collection workspace lane');
  if (!sameObservation(lane, current) || fs.realpathSync(lane.directory) !== lane.canonicalDirectory) {
    throw new Error('Fine-tuning private collection workspace lane changed during lifecycle execution.');
  }
}

function prepareTerminalRoot(workspaceHash, workspaceDirectory) {
  const varDirectory = path.join(repoDir, 'var');
  const fineTuningDirectory = path.join(varDirectory, 'fine-tuning');
  const tombstoneRoot = path.join(fineTuningDirectory, 'private-collection-item-tombstones');
  const terminalRoot = path.join(tombstoneRoot, workspaceHash);
  for (const [directory, allowGroupRead] of [
    [varDirectory, true],
    [fineTuningDirectory, false],
    [tombstoneRoot, false],
    [terminalRoot, false],
  ]) {
    const created = !fs.existsSync(directory);
    if (created) {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      fsyncDirectory(path.dirname(directory));
      fsyncDirectory(directory);
    }
    observePrivateDirectory(directory, 'Fine-tuning private collection item terminal root', { allowGroupRead });
  }
  if (!isPathWithin(tombstoneRoot, fs.realpathSync(terminalRoot))) {
    throw new Error('Fine-tuning private collection item terminal root is invalid.');
  }
  return { terminalRoot, workspaceDirectory };
}

function writeRecord(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
}

function readPrivateDirectory(directory, errorPrefix) {
  observePrivateDirectory(directory, errorPrefix);
  return fs.readdirSync(directory).sort();
}

function observePrivateDirectory(directory, errorPrefix, { allowGroupRead = false } = {}) {
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
  return { allowGroupRead, dev: stat.dev, directory, ino: stat.ino, mode: stat.mode & 0o777 };
}

function assertOwnerOnlyFile(stat, errorPrefix) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    !isCurrentUserOwned(stat) ||
    (stat.mode & 0o077) !== 0
  ) {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
}

function assertExactFilename(actual, expected, errorPrefix) {
  if (canonicalizePossiblyMissing(actual) !== canonicalizePossiblyMissing(expected)) {
    throw new Error(`${errorPrefix} must use the exact private location.`);
  }
}

function assertExactItemFilename(input, expected) {
  if (canonicalizePossiblyMissing(input.filename) !== canonicalizePossiblyMissing(expected)) {
    throw new Error('Fine-tuning private collection item must use the exact private item location.');
  }
  if (fs.existsSync(expected)) {
    const verified = privateInput(expected, 'Fine-tuning private collection item');
    if (canonicalizePossiblyMissing(verified.filename) !== canonicalizePossiblyMissing(expected) || verified.canonicalFilename !== fs.realpathSync(expected)) {
      throw new Error('Fine-tuning private collection item must use the exact private item location.');
    }
  }
}

function canonicalizePossiblyMissing(filename) {
  const suffix = [];
  let current = path.resolve(filename);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Fine-tuning private collection item lifecycle path is invalid.');
    }
    suffix.unshift(path.basename(current));
    current = parent;
  }
  return path.join(fs.realpathSync(current), ...suffix);
}

function sameNames(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function sameObservation(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fsyncFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
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

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function findRelativePath(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ? null : relative;
}
