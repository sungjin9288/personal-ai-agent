import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateReviewedExampleSourceBundle,
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { assertFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { assertFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { assertFineTuningDataSufficiencyAssessment } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { assertApprovedTrainingRecordForDataset } from '../src/core/training-dataset-quality.mjs';
import { assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
} from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewResolutionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertSamePrivateJsonState,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';

const HISTORY_NAME = 'private-reviewed-example-canonical-records';
const PENDING_PREFIX = '.private-reviewed-example-canonical-record-pending-';
const F1_15_PENDING_PREFIX = '.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadAuthority(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Private reviewed example canonicalization lock',
});

let result;
try {
  const authority = loadAuthority(filenames);
  assertSame(initial, authority);
  const current = loadSource(authority, filenames.sourceBundle);
  result = materialize(current);
} finally {
  lock.release();
}

assertWindow(loadAuthority(filenames));
console.log(JSON.stringify({
  status: result.status,
  recordStored: true,
  eligibilityEvaluated: true,
  trainingAuthorized: false,
  externalProviderCalls: 'none',
  productionReadyClaim: false,
}, null, 2));

function materialize(current) {
  assertAuthorityCurrent(current);
  assertSourceCurrent(current);
  const root = historyRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(
    root,
    `${PENDING_PREFIX}${current.item.itemHash}-${current.artifactPreparationResolution.artifactPreparationResolutionHash}`,
  );
  const history = inspectHistory({ current, pendingDirectory, root });
  if (history.final) {
    return assertStoredBundle(current, history.final);
  }
  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.21 canonical record history', { repoDir });
  }

  let bundle = history.pending;
  if (bundle && !bundle.receipt) {
    bundle = {
      record: bundle.record,
      receipt: buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
        admission: current.admission,
        artifactPreparationResolution: current.artifactPreparationResolution,
        item: current.item,
        record: bundle.record,
        sourceBundle: current.sourceBundle,
        workspace: current.workspace,
      }),
    };
    writeExclusivePrivateJson(path.join(pendingDirectory, 'receipt.json'), bundle.receipt, 'F1.21 recovered canonical receipt', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
  }
  if (!bundle) {
    const record = buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: current.admission,
      artifactPreparationResolution: current.artifactPreparationResolution,
      item: current.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: current.sourceBundle,
      workspace: current.workspace,
    });
    const receipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
      admission: current.admission,
      artifactPreparationResolution: current.artifactPreparationResolution,
      item: current.item,
      record,
      sourceBundle: current.sourceBundle,
      workspace: current.workspace,
    });
    bundle = { receipt, record };
    makePrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
    writeExclusivePrivateJson(path.join(pendingDirectory, 'record.json'), record, 'F1.21 pending canonical record', { repoDir });
    writeExclusivePrivateJson(path.join(pendingDirectory, 'receipt.json'), receipt, 'F1.21 pending canonical receipt', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
  }
  assertReady({ current, bundle, pendingDirectory, root });
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error('F1.21 final canonical record already exists.');
  }
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.21 canonical record history', { repoDir });
  const published = readBundle(finalDirectory, 'F1.21 published canonical record');
  if (JSON.stringify(published) !== JSON.stringify(bundle)) {
    throw new Error('F1.21 published canonical record changed.');
  }
  return assertStoredBundle(current, published);
}

function loadAuthority(names) {
  const inputStates = Object.fromEntries(
    Object.entries(names)
      .filter(([key]) => key !== 'sourceBundle')
      .map(([key, filename]) => [
    key,
    readPrivateJsonState(filename, `F1.21 ${key}`, { repoDir }),
      ]),
  );
  const values = Object.fromEntries(
    Object.entries(inputStates).map(([key, state]) => [key, state.value]),
  );
  const tracked = readTrackedF1Chain();
  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(values.artifactPreparationResolution);
  const now = new Date().toISOString();
  const sources = {
    assessment: tracked.assessment.value,
    collectionPlan: tracked.collectionPlan.value,
    executionRequest: values.executionRequest,
    executionResolution: values.executionResolution,
    intakeRequest: tracked.intakeRequest.value,
    intakeResolution: values.intakeResolution,
    privateCollectionPlan: values.privateCollectionPlan,
  };
  assertFineTuningDataSufficiencyAssessment(sources.assessment);
  assertFineTuningDataCollectionPlan(sources.collectionPlan, {
    assessment: sources.assessment,
  });
  assertFineTuningDataIntakeRequest(sources.intakeRequest, {
    assessment: sources.assessment,
    collectionPlan: sources.collectionPlan,
    now,
  });
  assertFineTuningPrivateCollectionWorkspace(values.workspace, {
    ...sources,
    now,
  });
  assertFineTuningPrivateCollectionItemAdmission(values.admission, {
    ...sources,
    now,
    workspace: values.workspace,
  });
  assertFineTuningPrivateCollectionItem(values.item, {
    ...sources,
    admission: values.admission,
    now,
    workspace: values.workspace,
  });
  assertCanonicalPrivateJsonState(
    inputStates.workspace,
    path.join(repoDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${values.workspace.bindings.executionResolutionHash}`, 'workspace.json'),
    'F1.21 workspace',
  );
  assertCanonicalPrivateJsonState(
    inputStates.admission,
    path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions', values.admission.id, 'admission.json'),
    'F1.21 admission',
  );
  assertCanonicalPrivateJsonState(
    inputStates.item,
    path.join(repoDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${values.workspace.bindings.executionResolutionHash}`, values.item.lane, `fine-tuning-private-collection-item-${values.item.admission.admissionHash}`, 'item.json'),
    'F1.21 item',
  );
  assertCanonicalPrivateJsonState(
    inputStates.artifactPreparationResolution,
    path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions', values.workspace.workspaceHash, values.item.itemHash, 'resolution.json'),
    'F1.21 F1.15 resolution',
  );
  assertAuthorityCurrent(values);
  const predecessorStates = readPredecessors(values);
  assertF1_15Bundle(values);
  assertNoTerminalOrRemovalHistory(values);
  return {
    ...values,
    states: { ...inputStates, ...predecessorStates },
    tracked,
  };
}

function loadSource(authority, filename) {
  const sourceState = readPrivateJsonState(
    filename,
    'F1.21 sourceBundle',
    { repoDir },
  );
  const current = {
    ...authority,
    sourceBundle: assertFineTuningPrivateReviewedExampleSourceBundle(
      sourceState.value,
    ),
    states: {
      ...authority.states,
      sourceBundle: sourceState,
    },
  };
  assertSourceCurrent(current);
  return current;
}

function readTrackedF1Chain() {
  const filenames = {
    assessment: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    ),
    collectionPlan: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-collection-plan.json',
    ),
    intakeRequest: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-intake-request.json',
    ),
  };
  return Object.fromEntries(
    Object.entries(filenames).map(([key, filename]) => {
      const before = fs.lstatSync(filename);
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
        throw new Error(`F1.21 tracked ${key} is invalid.`);
      }
      const bytes = fs.readFileSync(filename);
      const after = fs.lstatSync(filename);
      if (
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        !bytes.length
      ) {
        throw new Error(`F1.21 tracked ${key} changed while reading.`);
      }
      return [key, { bytes, filename, value: JSON.parse(bytes.toString('utf8')) }];
    }),
  );
}

function readPredecessors(current) {
  const workspaceHash = current.workspace.workspaceHash;
  const itemHash = current.item.itemHash;
  const filenames = {
    artifactRequest: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      workspaceHash,
      `${itemHash}.json`,
    ),
    projection: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-projections',
      workspaceHash,
      `${itemHash}.json`,
    ),
    reviewResolution: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-resolutions',
      workspaceHash,
      itemHash,
      'resolution.json',
    ),
  };
  const states = Object.fromEntries(
    Object.entries(filenames).map(([key, filename]) => [
      `predecessor:${key}`,
      readPrivateJsonState(filename, `F1.21 ${key}`, { repoDir }),
    ]),
  );
  const projection = states['predecessor:projection'].value;
  const reviewResolution = states['predecessor:reviewResolution'].value;
  const artifactRequest = states['predecessor:artifactRequest'].value;
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(artifactRequest);

  const same = (left, right, field) =>
    left?.id === right?.id && left?.[field] === right?.[field];
  if (
    !same(projection.admission, current.admission, 'admissionHash') ||
    !same(projection.item, current.item, 'itemHash') ||
    !same(projection.workspace, current.workspace, 'workspaceHash') ||
    !same(reviewResolution.projection, projection, 'projectionHash') ||
    !same(reviewResolution.item, current.item, 'itemHash') ||
    !same(reviewResolution.workspace, current.workspace, 'workspaceHash') ||
    !same(artifactRequest.projection, projection, 'projectionHash') ||
    !same(artifactRequest.reviewResolution, reviewResolution, 'resolutionHash') ||
    !same(artifactRequest.item, current.item, 'itemHash') ||
    !same(artifactRequest.workspace, current.workspace, 'workspaceHash') ||
    !same(
      current.artifactPreparationResolution.projection,
      projection,
      'projectionHash',
    ) ||
    !same(
      current.artifactPreparationResolution.reviewResolution,
      reviewResolution,
      'resolutionHash',
    ) ||
    !same(
      current.artifactPreparationResolution.artifactRequest,
      artifactRequest,
      'artifactRequestHash',
    )
  ) {
    throw new Error('F1.21 predecessor lineage is invalid.');
  }

  assertNoCurrentPending(
    path.dirname(filenames.projection),
    itemHash,
    'F1.12 projection',
  );
  assertNoCurrentPending(
    path.dirname(path.dirname(filenames.reviewResolution)),
    itemHash,
    'F1.13 review resolution',
  );
  assertNoCurrentPending(
    path.dirname(filenames.artifactRequest),
    itemHash,
    'F1.14 artifact request',
  );
  return states;
}

function assertNoCurrentPending(root, itemHash, label) {
  for (const name of readPrivateDirectory(root, `F1.21 ${label} history`, { repoDir })) {
    if (name.startsWith('.') && name.includes(itemHash)) {
      throw new Error(`F1.21 ${label} history is pending.`);
    }
  }
}

function assertNoTerminalOrRemovalHistory(current) {
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${current.workspace.bindings.executionResolutionHash}`,
  );
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of readPrivateDirectory(
      laneDirectory,
      'F1.21 private collection workspace',
      { repoDir },
    )) {
      if (name.startsWith('.fine-tuning-private-collection-item-removal-')) {
        throw new Error('F1.21 removal history requires recovery.');
      }
    }
  }

  const terminalRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    current.workspace.workspaceHash,
  );
  if (fs.lstatSync(terminalRoot, { throwIfNoEntry: false })) {
    for (const name of readPrivateDirectory(
      terminalRoot,
      'F1.21 terminal history',
      { repoDir },
    )) {
      const directory = path.join(terminalRoot, name);
      const names = readPrivateDirectory(
        directory,
        'F1.21 terminal history entry',
        { repoDir },
      );
      if (!names.includes('decision.json')) {
        if (name === current.item.retention.withdrawalReferenceSha256) {
          throw new Error('F1.21 is blocked by terminal history.');
        }
        continue;
      }
      const decision = readPrivateJsonState(
        path.join(directory, 'decision.json'),
        'F1.21 terminal decision',
        { repoDir },
      ).value;
      assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
      if (names.includes('absence-receipt.json') && names.includes('tombstone.json')) {
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({
          decision,
          receipt: readPrivateJsonState(
            path.join(directory, 'absence-receipt.json'),
            'F1.21 terminal absence receipt',
            { repoDir },
          ).value,
          tombstone: readPrivateJsonState(
            path.join(directory, 'tombstone.json'),
            'F1.21 terminal tombstone',
            { repoDir },
          ).value,
        });
      }
      if (
        decision.item.itemHash === current.item.itemHash ||
        decision.admission.admissionHash === current.admission.admissionHash ||
        decision.withdrawalReferenceSha256 ===
          current.item.retention.withdrawalReferenceSha256
      ) {
        throw new Error('F1.21 is blocked by terminal history.');
      }
    }
  }

  const cascadeRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-reviewed-example-canonical-record-deletion-cascades',
    current.workspace.workspaceHash,
  );
  if (fs.lstatSync(cascadeRoot, { throwIfNoEntry: false })) {
    for (const name of readPrivateDirectory(
      cascadeRoot,
      'F1.21 deletion cascade history',
      { repoDir },
    )) {
      if (
        name === current.item.retention.withdrawalReferenceSha256 ||
        name.startsWith('.pending-')
      ) {
        throw new Error('F1.21 is blocked by deletion cascade history.');
      }
    }
  }
}

function assertAuthorityCurrent(current) {
  const { admission, artifactPreparationResolution: resolution, item, workspace } = current;
  const same = (left, right, field) => left?.[field] === right?.[field] && left?.id === right?.id;
  if (
    item.lane !== 'reviewed-examples' || item.dataOrigin !== 'curated-synthetic' ||
    !same(admission.workspace, workspace, 'workspaceHash') ||
    !same(item.admission, admission, 'admissionHash') || !same(item.workspace, workspace, 'workspaceHash') ||
    !same(resolution.admission, admission, 'admissionHash') || !same(resolution.item, item, 'itemHash') ||
    !same(resolution.workspace, workspace, 'workspaceHash') ||
    resolution.decision !== 'approve' ||
    resolution.reviewedExampleCanonicalizationPreparationAllowed !== true ||
    resolution.approvedTrainingRecordCreated !== false ||
    resolution.eligibilityEvaluated !== false ||
    resolution.fineTuningExecutionAuthorized !== false ||
    resolution.externalSubmissionAuthorized !== false ||
    resolution.productionReadyClaim !== false
  ) {
    throw new Error('Private reviewed example canonicalization requires one approved live F1.15 reviewed-example source.');
  }
  assertWindow(current);
}

function assertSourceCurrent(current) {
  const { admission, item, sourceBundle, workspace } = current;
  if (
    sourceBundle.admission.admissionHash !== admission.admissionHash ||
    sourceBundle.item.itemHash !== item.itemHash ||
    sourceBundle.workspace.workspaceHash !== workspace.workspaceHash ||
    sourceBundle.lineageSha256 !== admission.envelope.source.lineageSha256 ||
    sourceBundle.referenceSha256 !== admission.envelope.source.referenceSha256 ||
    sourceBundle.scopeReferenceSha256 !== admission.envelope.source.scopeReferenceSha256 ||
    JSON.stringify(sourceBundle.example) !== JSON.stringify(item.example)
  ) {
    throw new Error('Private reviewed example canonicalization requires one approved live F1.15 reviewed-example source.');
  }
}

function assertF1_15Bundle(current) {
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions', current.workspace.workspaceHash);
  let found = null;
  for (const name of readPrivateDirectory(root, 'F1.21 F1.15 history', { repoDir })) {
    const final = /^[a-f0-9]{64}$/u.test(name);
    const pending = new RegExp(`^\\${F1_15_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!final && !pending) throw new Error('F1.21 F1.15 history is invalid.');
    const directory = path.join(root, name);
    const names = readPrivateDirectory(directory, 'F1.21 F1.15 history entry', { repoDir });
    if (JSON.stringify(names) !== JSON.stringify(['decision.json', 'resolution.json'])) {
      throw new Error('F1.21 F1.15 history bundle is invalid.');
    }
    const resolution = readPrivateJsonState(path.join(directory, 'resolution.json'), 'F1.21 F1.15 resolution history', { repoDir }).value;
    const decision = readPrivateJsonState(path.join(directory, 'decision.json'), 'F1.21 F1.15 decision history', { repoDir }).value;
    assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(resolution);
    if (
      resolution.workspace.workspaceHash !== current.workspace.workspaceHash ||
      (final && name !== resolution.item.itemHash) ||
      (pending && name !== `${F1_15_PENDING_PREFIX}${resolution.item.itemHash}-${resolution.bindings.artifactPreparationDecisionHash}`) ||
      decision?.artifactPreparationDecisionHash !== resolution.bindings.artifactPreparationDecisionHash ||
      JSON.stringify(decision?.decisionRecord) !== JSON.stringify(resolution.decisionRecord) ||
      JSON.stringify(decision?.artifactRequest) !== JSON.stringify(resolution.artifactRequest) ||
      JSON.stringify(decision?.item) !== JSON.stringify(resolution.item) ||
      JSON.stringify(decision?.workspace) !== JSON.stringify(resolution.workspace)
    ) throw new Error('F1.21 F1.15 history lineage is invalid.');
    if (resolution.item.itemHash === current.item.itemHash) {
      if (pending) throw new Error('F1.21 requires F1.15 resolution history without current pending state.');
      if (found) throw new Error('F1.21 F1.15 final resolution history is ambiguous.');
      found = resolution;
    }
  }
  if (!found || JSON.stringify(found) !== JSON.stringify(current.artifactPreparationResolution)) {
    throw new Error('F1.21 requires one approved canonical F1.15 resolution.');
  }
}

function inspectHistory({ current, pendingDirectory, root }) {
  let final = null;
  let pending = null;
  let emptyPending = null;
  for (const name of readPrivateDirectory(root, 'F1.21 canonical record history', { repoDir })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(`^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!isFinal && !isPending) throw new Error('F1.21 canonical record history is invalid.');
    const names = readPrivateDirectory(directory, 'F1.21 canonical record history entry', { repoDir });
    if (names.length === 0 && directory === pendingDirectory) {
      if (emptyPending) throw new Error('F1.21 pending canonical record history is ambiguous.');
      emptyPending = directory;
      continue;
    }
    const bundle = names.length === 1 && names[0] === 'record.json'
      ? { receipt: null, record: readRecord(directory, 'F1.21 pending canonical record') }
      : readBundle(directory, 'F1.21 stored canonical record');
    if (!bundle.receipt && directory !== pendingDirectory) {
      throw new Error(
        'F1.21 contains an unresolved sibling record-only pending history.',
      );
    }
    const itemHash = bundle.receipt?.item?.itemHash || current.item.itemHash;
    const resolutionHash = bundle.receipt?.artifactPreparationResolution?.artifactPreparationResolutionHash ||
      current.artifactPreparationResolution.artifactPreparationResolutionHash;
    const expectedName = isFinal ? itemHash : `${PENDING_PREFIX}${itemHash}-${resolutionHash}`;
    if (name !== expectedName || (bundle.receipt && bundle.receipt.workspace.workspaceHash !== current.workspace.workspaceHash)) {
      throw new Error('F1.21 canonical record history lineage is invalid.');
    }
    if (bundle.receipt && bundle.receipt.item.itemHash !== current.item.itemHash) {
      if (isPending) {
        throw new Error('F1.21 contains unresolved sibling pending history.');
      }
      continue;
    }
    if (
      !bundle.receipt &&
      JSON.stringify(bundle.record.example) !== JSON.stringify(current.item.example)
    ) {
      throw new Error('F1.21 canonical record history contains a foreign record.');
    }
    if (isFinal) {
      if (final) throw new Error('F1.21 final canonical record history is ambiguous.');
      final = bundle;
    } else {
      if (pending) throw new Error('F1.21 pending canonical record history is ambiguous.');
      pending = bundle;
    }
  }
  if (final && (pending || emptyPending)) throw new Error('F1.21 final canonical record conflicts with pending history.');
  return { emptyPending, final, pending };
}

function readBundle(directory, label) {
  const names = readPrivateDirectory(directory, label, { repoDir });
  if (JSON.stringify(names) !== JSON.stringify(['receipt.json', 'record.json'])) {
    throw new Error(`${label} bundle is invalid.`);
  }
  const record = readRecord(directory, `${label} record`);
  const receipt = readPrivateJsonState(path.join(directory, 'receipt.json'), `${label} receipt`, { repoDir }).value;
  assertApprovedTrainingRecordForDataset(record);
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record });
  return { receipt, record };
}

function readRecord(directory, label) {
  const record = readPrivateJsonState(path.join(directory, 'record.json'), label, { repoDir }).value;
  assertApprovedTrainingRecordForDataset(record);
  return record;
}

function assertStoredBundle(current, bundle) {
  const expected = buildFineTuningPrivateReviewedExampleCanonicalRecord({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    materializedAt: bundle.record.createdAt,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  if (JSON.stringify(expected) !== JSON.stringify(bundle.record)) {
    throw new Error('F1.21 canonical record drifted from its live source.');
  }
  const expectedReceipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    record: bundle.record,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  if (JSON.stringify(expectedReceipt) !== JSON.stringify(bundle.receipt)) {
    throw new Error('F1.21 canonical record receipt drifted from its live source.');
  }
  return { ...bundle.record, status: 'private-reviewed-example-canonical-record-materialized' };
}

function assertReady({ current, bundle, pendingDirectory, root }) {
  const authority = loadAuthority(filenames);
  const reread = loadSource(authority, filenames.sourceBundle);
  assertSame(current, reread);
  const history = inspectHistory({ current: reread, pendingDirectory, root });
  if (history.final || history.emptyPending || !history.pending || JSON.stringify(history.pending) !== JSON.stringify(bundle)) {
    throw new Error('F1.21 pending canonical record changed before publish.');
  }
  assertStoredBundle(reread, bundle);
}

function assertSame(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(left.states[key], right.states[key], `F1.21 ${key}`);
  }
  for (const key of Object.keys(left.tracked)) {
    if (
      left.tracked[key].filename !== right.tracked[key].filename ||
      !left.tracked[key].bytes.equals(right.tracked[key].bytes)
    ) {
      throw new Error(`F1.21 tracked ${key} changed while resolving.`);
    }
  }
}

function assertWindow(current) {
  const now = Date.now();
  if (now >= Date.parse(current.item.expiresAt) || now >= Date.parse(current.item.retention.deleteBy)) {
    throw new Error('Private reviewed example canonicalization item is expired.');
  }
}

function historyRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash), 'F1.21 canonical record history', { repoDir });
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'intake-resolution',
    'private-collection-plan',
    'execution-request',
    'execution-resolution',
    'artifact-preparation-resolution',
    'source-bundle',
  ];
  if (args.length !== fields.length * 2 || fields.some((field, index) => args[index * 2] !== `--${field}` || !args[index * 2 + 1])) {
    throw new Error('Expected exact private F1.21 input filenames.');
  }
  return Object.fromEntries(fields.map((field, index) => [
    field === 'artifact-preparation-resolution' ? 'artifactPreparationResolution' :
      field === 'execution-request' ? 'executionRequest' :
        field === 'execution-resolution' ? 'executionResolution' :
          field === 'intake-resolution' ? 'intakeResolution' :
            field === 'private-collection-plan' ? 'privateCollectionPlan' :
              field === 'source-bundle' ? 'sourceBundle' : field,
    args[index * 2 + 1],
  ]));
}
