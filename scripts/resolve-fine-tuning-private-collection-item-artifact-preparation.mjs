import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput,
  assertFineTuningPrivateCollectionItemArtifactPreparationResolution,
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord,
  buildFineTuningPrivateCollectionItemArtifactPreparationResolution,
} from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemArtifactRequest,
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
} from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewResolutionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmission } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { assertFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const LANES = ['reviewed-examples', 'answer-quality-cases'];
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseFilenames(process.argv.slice(2));
const initial = loadInputs(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private collection item artifact preparation resolution lock',
});

let resolution;
try {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  resolution = resolve(current);
} finally {
  lock.release();
}

console.log(JSON.stringify({
  answerQualityCaseEnrichmentPreparationAllowed: resolution.answerQualityCaseEnrichmentPreparationAllowed,
  artifactPreparationAuthorized: resolution.artifactPreparationAuthorized,
  artifactPreparationApprovalResolved: resolution.artifactPreparationApprovalResolved,
  externalProviderCalls: resolution.externalProviderCalls,
  productionReadyClaim: resolution.productionReadyClaim,
  reviewedExampleCanonicalizationPreparationAllowed: resolution.reviewedExampleCanonicalizationPreparationAllowed,
  status: resolution.status,
  trainingAuthorized: resolution.trainingAuthorized,
}, null, 2));

function resolve(current) {
  assertNoTerminalOrRemovalHistory(current);
  assertPredecessorHistories(current);
  const generated = buildResolution(current, new Date().toISOString());
  const root = prepareHistoryRoot(current.workspace.workspaceHash, current.item.itemHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingName =
    '.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-'
    + `${current.item.itemHash}-${generated.bindings.artifactPreparationDecisionHash}`;
  const pendingDirectory = path.join(
    root,
    pendingName,
  );
  const history = inspectHistory({ current, finalDirectory, pendingDirectory, generated, root });
  if (history.final) return history.final.resolution;
  if (history.pending?.resolution) {
    assertReadyToPublish(current);
    publishPending({ bundle: history.pending, finalDirectory, pendingDirectory });
    return history.pending.resolution;
  }
  if (history.pending?.decision) {
    const resumed = buildResolution(current, new Date().toISOString());
    writePendingResolution(pendingDirectory, resumed);
    const bundle = { decision: history.pending.decision, resolution: resumed };
    assertReadyToPublish(current);
    publishPending({ bundle, finalDirectory, pendingDirectory });
    return resumed;
  }
  writePendingDecision(pendingDirectory, bundleFor(generated).decision);
  const complete = buildResolution(current, new Date().toISOString());
  const bundle = { decision: bundleFor(complete).decision, resolution: complete };
  writePendingResolution(pendingDirectory, complete);
  assertReadyToPublish(current);
  publishPending({ bundle, finalDirectory, pendingDirectory });
  return complete;
}

function buildResolution(current, resolvedAt) {
  return buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission: current.admission,
    artifactRequest: current.artifactRequest,
    decision: current.decision,
    item: current.item,
    projection: current.projection,
    resolvedAt,
    reviewResolution: current.reviewResolution,
    workspace: current.workspace,
  });
}

function bundleFor(resolution) {
  const decision = {
    artifactRequest: resolution.artifactRequest,
    artifactPreparationDecisionHash: resolution.bindings.artifactPreparationDecisionHash,
    decisionRecord: resolution.decisionRecord,
    id: `fine-tuning-private-collection-item-artifact-preparation-decision-${resolution.bindings.artifactPreparationDecisionHash}`,
    item: resolution.item,
    workspace: resolution.workspace,
  };
  return { decision, resolution };
}

function loadInputs(names) {
  const tracked = readTrackedSources();
  const executionResolution = readPrivateJson(names.executionResolution, 'Fine-tuning private collection execution resolution');
  const executionRequest = readPrivateJson(names.executionRequest, 'Fine-tuning private collection execution request');
  const plan = readPrivateJson(names.plan, 'Fine-tuning private collection plan');
  const intakeResolution = readPrivateJson(names.intakeResolution, 'Fine-tuning private collection intake resolution');
  const workspace = readPrivateJson(names.workspace, 'Fine-tuning private collection workspace');
  const admission = readPrivateJson(names.admission, 'Fine-tuning private collection item admission');
  const item = readPrivateJson(names.item, 'Fine-tuning private collection item');
  const projection = readPrivateJson(names.projection, 'Fine-tuning private collection item review projection');
  const reviewResolution = readPrivateJson(names.reviewResolution, 'Fine-tuning private collection item review resolution');
  const artifactRequest = readPrivateJson(names.artifactRequest, 'Fine-tuning private collection item artifact request');
  const decision = readPrivateJson(names.decision, 'Fine-tuning private collection item artifact preparation decision');
  const files = {
    admission,
    artifactRequest,
    decision,
    executionRequest,
    executionResolution,
    intakeResolution,
    item,
    plan,
    projection,
    reviewResolution,
    workspace,
  };

  const sources = {
    ...tracked.values,
    admission: admission.value,
    executionRequest: executionRequest.value,
    executionResolution: executionResolution.value,
    intakeResolution: intakeResolution.value,
    privateCollectionPlan: plan.value,
    workspace: workspace.value,
  };
  const now = new Date().toISOString();
  assertFineTuningPrivateCollectionWorkspace(workspace.value, { ...sources, now });
  assertFineTuningPrivateCollectionItemAdmission(admission.value, { ...sources, now });
  assertFineTuningPrivateCollectionItem(item.value, { ...sources, now });
  assertFineTuningPrivateCollectionItemReviewProjection(projection.value, {
    admission: admission.value,
    item: item.value,
    request: projectionInput(projection.value),
    workspace: workspace.value,
  });
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution.value);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(artifactRequest.value);
  assertFineTuningPrivateCollectionItemArtifactRequest(artifactRequest.value, {
    admission: admission.value,
    artifactRequestInput: artifactInput(artifactRequest.value),
    item: item.value,
    projection: projection.value,
    reviewResolution: reviewResolution.value,
    tracked,
    workspace: workspace.value,
  });
  assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput(decision.value);
  assertExactLineage({
    admission: admission.value,
    artifactRequest: artifactRequest.value,
    decision: decision.value,
    executionResolution: executionResolution.value,
    item: item.value,
    projection: projection.value,
    reviewResolution: reviewResolution.value,
    tracked,
    workspace: workspace.value,
    names: files,
  });

  return {
    admission: admission.value,
    artifactRequest: artifactRequest.value,
    decision: decision.value,
    files,
    item: item.value,
    projection: projection.value,
    reviewResolution: reviewResolution.value,
    tracked,
    workspace: workspace.value,
    workspaceDirectory: workspaceDirectory(executionResolution.value),
  };
}

function artifactInput(request) {
  return {
    admission: request.admission,
    item: request.item,
    projection: request.projection,
    requestedAt: request.artifactRequestInput.requestedAt,
    requestedByRole: request.artifactRequestInput.requestedByRole,
    reviewResolution: request.reviewResolution,
    schemaVersion: request.artifactRequestInput.schemaVersion,
    target: request.artifactRequestInput.target,
    workspace: request.workspace,
  };
}

function projectionInput(projection) {
  return {
    admission: projection.admission,
    item: projection.item,
    requestedAt: projection.projectionRequest.requestedAt,
    requestedByRole: projection.projectionRequest.requestedByRole,
    schemaVersion: projection.projectionRequest.schemaVersion,
    target: projection.projectionRequest.target,
    workspace: projection.workspace,
  };
}

function assertExactLineage(current) {
  const {
    admission,
    artifactRequest,
    decision,
    executionResolution,
    item,
    names,
    projection,
    reviewResolution,
    workspace,
  } = current;
  const workspaceRoot = workspaceDirectory(executionResolution);
  assertCanonical(
    names.workspace,
    path.join(workspaceRoot, 'workspace.json'),
    'Fine-tuning private collection workspace must use the exact prepared workspace location.',
  );
  assertCanonical(
    names.admission,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-admissions',
      admission.id,
      'admission.json',
    ),
    'Fine-tuning private collection item admission must use the exact admission history location.',
  );
  assertCanonical(
    names.item,
    path.join(
      workspaceRoot,
      item.lane,
      `fine-tuning-private-collection-item-${admission.admissionHash}`,
      'item.json',
    ),
    'Fine-tuning private collection item must use the exact F1.10 stored item location.',
  );
  assertCanonical(
    names.projection,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-projections',
      workspace.workspaceHash,
      `${item.itemHash}.json`,
    ),
    'Fine-tuning private collection item review projection must use the exact canonical F1.12 final history path.',
  );
  const reviewDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    workspace.workspaceHash,
    item.itemHash,
  );
  assertCanonical(
    names.reviewResolution,
    path.join(reviewDirectory, 'resolution.json'),
    'Fine-tuning private collection item review resolution must use the exact canonical F1.13 final history path.',
  );
  assertDirectoryNames(
    reviewDirectory,
    ['decision.json', 'resolution.json'],
    'Fine-tuning private collection item review resolution history',
  );
  const reviewDecision = readPrivateJson(
    path.join(reviewDirectory, 'decision.json'),
    'Fine-tuning private collection item review decision history',
  );
  names.reviewDecision = reviewDecision;
  assertReviewDecisionMatchesResolution(reviewDecision.value, reviewResolution);
  assertCanonical(
    names.artifactRequest,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      workspace.workspaceHash,
      `${item.itemHash}.json`,
    ),
    'Fine-tuning private collection item artifact request must use the exact canonical F1.14 final history path.',
  );
  if (
    admission.workspace.id !== workspace.id ||
    item.admission.id !== admission.id ||
    item.workspace.id !== workspace.id ||
    projection.item.id !== item.id ||
    reviewResolution.projection.id !== projection.id ||
    artifactRequest.reviewResolution.id !== reviewResolution.id ||
    artifactRequest.id !== decision.artifactRequest.id ||
    artifactRequest.artifactRequestHash !== decision.artifactRequest.artifactRequestHash ||
    decision.workspace.id !== workspace.id ||
    decision.item.id !== item.id ||
    decision.target !== artifactRequest.target
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution must bind one exact current F1.14 request.');
  }
}

function assertReviewDecisionMatchesResolution(decision, resolution) {
  const expectedKeys = [
    'admission',
    'confirmationTokenSha256',
    'decidedAt',
    'decidedByRole',
    'decision',
    'decisionHash',
    'evidenceSha256',
    'id',
    'item',
    'projection',
    'schemaVersion',
    'target',
    'workspace',
  ];
  if (
    !decision ||
    typeof decision !== 'object' ||
    Array.isArray(decision) ||
    !sameNames(Object.keys(decision), expectedKeys) ||
    decision.id !== `fine-tuning-private-collection-item-review-resolution-decision-${resolution.decisionHash}` ||
    decision.decisionHash !== resolution.decisionHash ||
    decision.confirmationTokenSha256 !== resolution.decisionRecord.confirmationTokenSha256 ||
    decision.decidedAt !== resolution.decisionRecord.decidedAt ||
    decision.decidedByRole !== resolution.decisionRecord.decidedByRole ||
    decision.decision !== resolution.decision ||
    decision.evidenceSha256 !== resolution.decisionRecord.evidenceSha256 ||
    decision.schemaVersion !== resolution.decisionRecord.schemaVersion ||
    decision.target !== resolution.target ||
    JSON.stringify(decision.admission) !== JSON.stringify(resolution.admission) ||
    JSON.stringify(decision.item) !== JSON.stringify(resolution.item) ||
    JSON.stringify(decision.projection) !== JSON.stringify(resolution.projection) ||
    JSON.stringify(decision.workspace) !== JSON.stringify(resolution.workspace)
  ) {
    throw new Error('Fine-tuning private collection item review resolution history is invalid.');
  }
}

function inspectHistory({ current, finalDirectory, pendingDirectory, generated, root }) {
  const expectedDecision = bundleFor(generated).decision;
  let final;
  let pending;
  const emptyPending = [];
  for (const name of readDirectory(root, 'Fine-tuning private collection item artifact preparation resolution history')) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending =
      /^\.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u
        .test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private collection item artifact preparation resolution history is invalid.');
    }
    const candidate = path.join(root, name);
    if (isFinal) {
      const bundle = readBundle(candidate, 'final history');
      if (
        bundle.resolution.workspace.workspaceHash !== current.workspace.workspaceHash ||
        name !== bundle.resolution.item.itemHash
      ) {
        throw new Error('Fine-tuning private collection item artifact preparation resolution history is invalid.');
      }
      if (name !== current.item.itemHash) continue;
      final = bundle;
      if (JSON.stringify(final.decision) !== JSON.stringify(expectedDecision)) {
        throw new Error('Fine-tuning private collection item artifact preparation resolution conflicts with a different decision.');
      }
      assertResolutionMatchesCurrent(final.resolution, current);
    }
    if (isPending) {
      const names = readDirectory(candidate, 'Fine-tuning private collection item artifact preparation resolution pending history');
      if (sameNames(names, [])) {
        emptyPending.push({ candidate, name });
        continue;
      }
      const bundle = readPendingBundle(candidate, 'pending history');
      const stored = bundle.decision;
      const expectedName =
        '.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-'
        + `${stored.item.itemHash}-${stored.artifactPreparationDecisionHash}`;
      if (
        stored.workspace.workspaceHash !== current.workspace.workspaceHash ||
        name !== expectedName
      ) {
        throw new Error('Fine-tuning private collection item artifact preparation resolution pending history is invalid.');
      }
      if (stored.item.itemHash !== current.item.itemHash) continue;
      if (pending) {
        throw new Error('Fine-tuning private collection item artifact preparation resolution pending history is ambiguous.');
      }
      pending = bundle;
      const validPending = JSON.stringify(pending.decision) === JSON.stringify(expectedDecision);
      if (!validPending) {
        throw new Error('Fine-tuning private collection item artifact preparation resolution pending history is invalid.');
      }
      if (pending.resolution) assertResolutionMatchesCurrent(pending.resolution, current);
    }
  }
  if (final && (pending || emptyPending.length > 0)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution final history conflicts with pending state.');
  }
  if (emptyPending.length > 0) {
    if (
      emptyPending.length !== 1 ||
      emptyPending[0].name !== path.basename(pendingDirectory) ||
      pending
    ) {
      throw new Error('Fine-tuning private collection item artifact preparation resolution pending history is invalid.');
    }
    fs.rmdirSync(emptyPending[0].candidate);
    fsyncDirectory(root);
  }
  return { final, pending };
}

function assertResolutionMatchesCurrent(resolution, current) {
  assertFineTuningPrivateCollectionItemArtifactPreparationResolution(resolution, {
    admission: current.admission,
    artifactRequest: current.artifactRequest,
    decision: current.decision,
    item: current.item,
    projection: current.projection,
    reviewResolution: current.reviewResolution,
    workspace: current.workspace,
  });
  const request = current.artifactRequest;
  const exactReferences = [
    [resolution.workspace, current.workspace, 'workspaceHash'],
    [resolution.admission, current.admission, 'admissionHash'],
    [resolution.item, current.item, 'itemHash'],
    [resolution.projection, current.projection, 'projectionHash'],
    [resolution.reviewResolution, current.reviewResolution, 'resolutionHash'],
    [resolution.artifactRequest, request, 'artifactRequestHash'],
  ];
  if (
    exactReferences.some(([stored, live, hashField]) => stored.id !== live.id || stored[hashField] !== live[hashField]) ||
    resolution.bindings.artifactRequestHash !== request.artifactRequestHash ||
    resolution.bindings.artifactRequestInputHash !== request.artifactRequestInputHash ||
    resolution.bindings.itemReviewResolutionHash !== current.reviewResolution.resolutionHash ||
    resolution.bindings.projectionHash !== current.projection.projectionHash ||
    resolution.bindings.itemHash !== current.item.itemHash ||
    resolution.bindings.admissionHash !== current.admission.admissionHash ||
    resolution.bindings.workspaceHash !== current.workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution history is invalid.');
  }
}

function readBundle(directory, label) {
  assertDirectoryNames(
    directory,
    ['decision.json', 'resolution.json'],
    `Fine-tuning private collection item artifact preparation resolution ${label}`,
  );
  const decision = readHistoryDecision(path.join(directory, 'decision.json'));
  const resolution = readHistoryResolution(path.join(directory, 'resolution.json'));
  if (JSON.stringify(decision) !== JSON.stringify(bundleFor(resolution).decision)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution history is invalid.');
  }
  return { decision, resolution };
}

function readPendingBundle(directory, label) {
  const names = readDirectory(directory, `Fine-tuning private collection item artifact preparation resolution ${label}`);
  if (sameNames(names, ['decision.json'])) {
    return { decision: readHistoryDecision(path.join(directory, 'decision.json')) };
  }
  return readBundle(directory, label);
}

function readHistoryDecision(filename) {
  const value = readPrivateJson(filename, 'Fine-tuning private collection item artifact preparation resolution decision history').value;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !isSha256(value.artifactPreparationDecisionHash) ||
    value.id !== `fine-tuning-private-collection-item-artifact-preparation-decision-${value.artifactPreparationDecisionHash}` ||
    !sameNames(Object.keys(value).sort(), [
      'artifactPreparationDecisionHash',
      'artifactRequest',
      'decisionRecord',
      'id',
      'item',
      'workspace',
    ])
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution decision history is invalid.');
  }
  const record = value.decisionRecord;
  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record) ||
    !sameNames(Object.keys(record), [
      'confirmationTokenSha256',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'schemaVersion',
      'target',
    ]) ||
    !isSha256(record.confirmationTokenSha256) ||
    !isSha256(record.evidenceSha256) ||
    record.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(record.decision) ||
    record.schemaVersion !== 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1' ||
    !['reviewed-example-canonicalization', 'answer-quality-case-enrichment'].includes(record.target) ||
    !Number.isFinite(Date.parse(record.decidedAt))
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution decision history is invalid.');
  }
  if (!sameReference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash')) {
    throw new Error(
      'Fine-tuning private collection item artifact preparation resolution decision workspace is invalid.',
    );
  }
  if (!sameReference(value.item, 'fine-tuning-private-collection-item-', 'itemHash')) {
    throw new Error(
      'Fine-tuning private collection item artifact preparation resolution decision item is invalid.',
    );
  }
  if (
    !sameReference(
      value.artifactRequest,
      'fine-tuning-private-collection-item-artifact-request-',
      'artifactRequestHash',
    )
  ) {
    throw new Error(
      'Fine-tuning private collection item artifact preparation resolution decision request is invalid.',
    );
  }
  if (value.artifactPreparationDecisionHash !== hashRecord(record)) {
    throw new Error(
      'Fine-tuning private collection item artifact preparation resolution decision hash is invalid.',
    );
  }
  return value;
}

function readHistoryResolution(filename) {
  const value = readPrivateJson(filename, 'Fine-tuning private collection item artifact preparation resolution history').value;
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(value);
  return value;
}

function writePendingDecision(directory, decision) {
  if (fs.existsSync(directory)) {
    throw new Error(
      'Fine-tuning private collection item artifact preparation resolution pending history conflicts with the exact decision.',
    );
  }
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  fsyncDirectory(path.dirname(directory));
  writePrivateJson(path.join(directory, 'decision.json'), decision);
  fsyncDirectory(directory);
}

function writePendingResolution(directory, resolution) {
  const decision = readHistoryDecision(path.join(directory, 'decision.json'));
  if (JSON.stringify(decision) !== JSON.stringify(bundleFor(resolution).decision)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution pending decision is invalid.');
  }
  assertDirectoryNames(directory, ['decision.json'], 'Fine-tuning private collection item artifact preparation resolution pending history');
  writePrivateJson(path.join(directory, 'resolution.json'), resolution);
  fsyncDirectory(directory);
}

function publishPending({ bundle, finalDirectory, pendingDirectory }) {
  const pending = readBundle(pendingDirectory, 'pending history');
  if (JSON.stringify(pending) !== JSON.stringify(bundle) || fs.existsSync(finalDirectory)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution cannot publish inconsistent history.');
  }
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncDirectory(path.dirname(finalDirectory));
  if (JSON.stringify(readBundle(finalDirectory, 'final history')) !== JSON.stringify(bundle)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution published but integrity confirmation failed.');
  }
}

function assertReadyToPublish(initial) {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  assertNoTerminalOrRemovalHistory(current);
  assertPredecessorHistories(current);
}

function assertPredecessorHistories(current) {
  const workspaceHash = current.workspace.workspaceHash;
  const itemHash = current.item.itemHash;
  const projectionRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    workspaceHash,
  );
  let projectionFinal = false;
  for (const name of readDirectory(projectionRoot, 'Fine-tuning private collection item review projection history')) {
    if (/^[a-f0-9]{64}\.json$/u.test(name)) {
      const projection = readPrivateJson(
        path.join(projectionRoot, name),
        'Fine-tuning private collection item review projection history',
      ).value;
      assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
      if (
        projection.workspace.workspaceHash !== workspaceHash ||
        name !== `${projection.item.itemHash}.json`
      ) {
        throw new Error('Fine-tuning private collection item review projection history is invalid.');
      }
      if (projection.item.itemHash === itemHash) projectionFinal = true;
      continue;
    }
    if (/^\.fine-tuning-private-collection-item-review-projection-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name)) {
      const directory = path.join(projectionRoot, name);
      assertDirectoryNames(
        directory,
        ['projection.json'],
        'Fine-tuning private collection item review projection pending history',
      );
      const projection = readPrivateJson(
        path.join(directory, 'projection.json'),
        'Fine-tuning private collection item review projection pending history',
      ).value;
      assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
      const expectedName =
        `.fine-tuning-private-collection-item-review-projection-pending-`
        + `${projection.item.itemHash}-${projection.bindings.projectionRequestHash}`;
      if (projection.workspace.workspaceHash !== workspaceHash || name !== expectedName) {
        throw new Error('Fine-tuning private collection item review projection pending history is invalid.');
      }
      if (projection.item.itemHash === itemHash) {
        throw new Error('Fine-tuning private collection item review projection has pending or ambiguous history.');
      }
      continue;
    }
    throw new Error('Fine-tuning private collection item review projection history is invalid.');
  }
  if (!projectionFinal) {
    throw new Error(
      'Fine-tuning private collection item review projection must use the exact canonical F1.12 final history path.',
    );
  }

  const reviewRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    workspaceHash,
  );
  let reviewFinal = false;
  for (const name of readDirectory(reviewRoot, 'Fine-tuning private collection item review resolution history')) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = /^\.fine-tuning-private-collection-item-review-resolution-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private collection item review resolution history is invalid.');
    }
    const directory = path.join(reviewRoot, name);
    const names = readDirectory(directory, 'Fine-tuning private collection item review resolution history');
    const decisionOnly = sameNames(names, ['decision.json']);
    const completeBundle = sameNames(names, ['decision.json', 'resolution.json']);
    if (isFinal && !completeBundle) {
      throw new Error('Fine-tuning private collection item review resolution final history is invalid.');
    }
    if (isPending && !decisionOnly && !completeBundle) {
      throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
    }
    const decision = readPrivateJson(
      path.join(directory, 'decision.json'),
      'Fine-tuning private collection item review decision history',
    ).value;
    assertReviewDecisionShape(decision);
    const expectedName = isFinal
      ? decision.item.itemHash
      : `.fine-tuning-private-collection-item-review-resolution-pending-${decision.item.itemHash}-${decision.decisionHash}`;
    if (decision.workspace.workspaceHash !== workspaceHash || name !== expectedName) {
      throw new Error('Fine-tuning private collection item review resolution history is invalid.');
    }
    if (names.includes('resolution.json')) {
      const resolution = readPrivateJson(
        path.join(directory, 'resolution.json'),
        'Fine-tuning private collection item review resolution history',
      ).value;
      assertFineTuningPrivateCollectionItemReviewResolutionRecord(resolution);
      assertReviewDecisionMatchesResolution(decision, resolution);
    }
    if (decision.item.itemHash === itemHash) {
      if (isPending || reviewFinal) {
        throw new Error('Fine-tuning private collection item review resolution has pending or ambiguous history.');
      }
      reviewFinal = true;
    }
  }
  if (!reviewFinal) {
    throw new Error(
      'Fine-tuning private collection item review resolution must use the exact canonical F1.13 final history path.',
    );
  }

  const requestRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-requests',
    workspaceHash,
  );
  let requestFinal = false;
  for (const name of readDirectory(requestRoot, 'Fine-tuning private collection item artifact request history')) {
    const isFinal = /^[a-f0-9]{64}\.json$/u.test(name);
    const isPending = /^\.fine-tuning-private-collection-item-artifact-request-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private collection item artifact request history is invalid.');
    }
    const filename = isFinal ? path.join(requestRoot, name) : path.join(requestRoot, name, 'request.json');
    if (isPending) {
      assertDirectoryNames(
        path.join(requestRoot, name),
        ['request.json'],
        'Fine-tuning private collection item artifact request pending history',
      );
    }
    const request = readPrivateJson(filename, 'Fine-tuning private collection item artifact request history').value;
    assertFineTuningPrivateCollectionItemArtifactRequestRecord(request);
    const expectedName = isFinal
      ? `${request.item.itemHash}.json`
      : `.fine-tuning-private-collection-item-artifact-request-pending-${request.item.itemHash}-${request.artifactRequestInputHash}`;
    if (request.workspace.workspaceHash !== workspaceHash || name !== expectedName) {
      throw new Error('Fine-tuning private collection item artifact request history is invalid.');
    }
    if (request.item.itemHash === itemHash) {
      if (isPending || requestFinal) {
        throw new Error('Fine-tuning private collection item artifact request has pending or ambiguous history.');
      }
      requestFinal = true;
    }
  }
  if (!requestFinal) {
    throw new Error(
      'Fine-tuning private collection item artifact request must use the exact canonical F1.14 final history path.',
    );
  }
}

function assertReviewDecisionShape(value) {
  const keys = [
    'admission',
    'confirmationTokenSha256',
    'decidedAt',
    'decidedByRole',
    'decision',
    'decisionHash',
    'evidenceSha256',
    'id',
    'item',
    'projection',
    'schemaVersion',
    'target',
    'workspace',
  ];
  const timestamp = Date.parse(String(value?.decidedAt || ''));
  const decidedAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
  const record = {
    confirmationTokenSha256: value?.confirmationTokenSha256,
    decidedAt,
    decidedByRole: value?.decidedByRole,
    decision: value?.decision,
    evidenceSha256: value?.evidenceSha256,
    schemaVersion: value?.schemaVersion,
    target: value?.target,
  };
  if (
    !value ||
    !sameNames(Object.keys(value).sort(), keys) ||
    !sameReference(
      value.admission,
      'fine-tuning-private-collection-item-admission-',
      'admissionHash',
    ) ||
    !sameReference(value.item, 'fine-tuning-private-collection-item-', 'itemHash') ||
    !sameReference(
      value.projection,
      'fine-tuning-private-collection-item-review-projection-',
      'projectionHash',
    ) ||
    !sameReference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash') ||
    !isSha256(record.confirmationTokenSha256) ||
    !isSha256(record.evidenceSha256) ||
    value.id !== `fine-tuning-private-collection-item-review-resolution-decision-${value.decisionHash}` ||
    value.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(value.decision) ||
    record.schemaVersion !==
      'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1' ||
    ![
      'reviewed-example-candidate-review',
      'answer-quality-case-enrichment-review',
    ].includes(record.target) ||
    value.decidedAt !== decidedAt ||
    value.decisionHash !== hashRecord(record)
  ) {
    throw new Error('Fine-tuning private collection item review resolution decision history is invalid.');
  }
}

function assertNoTerminalOrRemovalHistory(current) {
  assertNoRemovalDirectories(current.workspaceDirectory);
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-tombstones');
  if (!fs.existsSync(root)) return;
  assertDirectory(root, 'Fine-tuning private collection item tombstone history');
  const workspaceRoot = path.join(root, current.workspace.workspaceHash);
  if (!fs.existsSync(workspaceRoot)) return;
  for (const name of readDirectory(workspaceRoot, 'Fine-tuning private collection item tombstone history')) {
    const directory = path.join(workspaceRoot, name);
    if (/^[a-f0-9]{64}$/u.test(name)) {
      const names = readDirectory(directory, 'Fine-tuning private collection item terminal history');
      if (sameNames(names, ['tombstone.json'])) {
        const tombstone = readPrivateJson(
          path.join(directory, 'tombstone.json'),
          'Fine-tuning private collection item tombstone history',
        ).value;
        assertFineTuningPrivateCollectionItemTombstone(tombstone);
        if (
          name !== tombstone.withdrawalReferenceSha256 ||
          tombstone.workspace.workspaceHash !== current.workspace.workspaceHash
        ) {
          throw new Error('Fine-tuning private collection item terminal history is invalid.');
        }
        if (matchesTerminal(tombstone, current)) {
          throw new Error(
            'Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.',
          );
        }
        continue;
      }
      if (sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
        const bundle = {
          decision: readPrivateJson(
            path.join(directory, 'decision.json'),
            'Fine-tuning private collection item terminal decision',
          ).value,
          receipt: readPrivateJson(
            path.join(directory, 'absence-receipt.json'),
            'Fine-tuning private collection item absence receipt',
          ).value,
          tombstone: readPrivateJson(
            path.join(directory, 'tombstone.json'),
            'Fine-tuning private collection item tombstone history',
          ).value,
        };
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
        if (
          name !== bundle.decision.withdrawalReferenceSha256 ||
          name !== bundle.tombstone.withdrawalReferenceSha256 ||
          bundle.decision.workspace.workspaceHash !== current.workspace.workspaceHash ||
          bundle.tombstone.workspace.workspaceHash !== current.workspace.workspaceHash
        ) {
          throw new Error('Fine-tuning private collection item terminal history is invalid.');
        }
        if (matchesTerminal(bundle.tombstone, current)) {
          throw new Error(
            'Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.',
          );
        }
        continue;
      }
      throw new Error('Fine-tuning private collection item terminal history is invalid.');
    }
    if (/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) {
      const names = readDirectory(directory, 'Fine-tuning private collection item pending terminal history');
      if (
        !sameNames(names, ['decision.json']) &&
        !sameNames(names, ['decision.json', 'tombstone.json']) &&
        !sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])
      ) {
        throw new Error('Fine-tuning private collection item pending terminal history is invalid.');
      }
      const decision = readPrivateJson(
        path.join(directory, 'decision.json'),
        'Fine-tuning private collection item pending terminal decision',
      ).value;
      assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
      if (
        name !== `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}` ||
        decision.workspace.workspaceHash !== current.workspace.workspaceHash
      ) {
        throw new Error('Fine-tuning private collection item pending terminal history is invalid.');
      }
      if (names.includes('tombstone.json')) {
        const tombstone = readPrivateJson(
          path.join(directory, 'tombstone.json'),
          'Fine-tuning private collection item pending tombstone',
        ).value;
        if (names.includes('absence-receipt.json')) {
          const receipt = readPrivateJson(
            path.join(directory, 'absence-receipt.json'),
            'Fine-tuning private collection item pending absence receipt',
          ).value;
          assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({ decision, receipt, tombstone });
        } else {
          assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({ decision, tombstone });
        }
      }
      if (matchesTerminal(decision, current)) {
        throw new Error('Fine-tuning private collection item has pending terminal lifecycle history.');
      }
      continue;
    }
    throw new Error('Fine-tuning private collection item tombstone history is invalid.');
  }
}

function matchesTerminal(record, current) {
  return record.admission?.id === current.admission.id ||
    record.admission?.admissionHash === current.admission.admissionHash ||
    record.item?.id === current.item.id ||
    record.item?.itemHash === current.item.itemHash ||
    record.withdrawalReferenceSha256 === current.item.retention.withdrawalReferenceSha256;
}

function assertNoRemovalDirectories(workspaceDirectory) {
  for (const lane of LANES) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of readDirectory(laneDirectory, 'Fine-tuning private collection workspace')) {
      if (/^\.fine-tuning-private-collection-item-removal-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection item removal history requires manual recovery.');
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
      const directory = path.join(laneDirectory, name);
      assertDirectoryNames(directory, ['item.json'], 'Fine-tuning private collection workspace item');
      const item = readPrivateJson(path.join(directory, 'item.json'), 'Fine-tuning private collection workspace item').value;
      assertFineTuningPrivateCollectionItemRecord(item);
      if (
        item.lane !== lane ||
        name !== `fine-tuning-private-collection-item-${item.admission.admissionHash}`
      ) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
    }
  }
}

function prepareHistoryRoot(workspaceHash, itemHash) {
  const directories = [
    [path.join(repoDir, 'var'), true],
    [path.join(repoDir, 'var', 'fine-tuning'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions', workspaceHash), false],
  ];
  for (const [directory, allowGroupRead] of directories) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      fsyncDirectory(path.dirname(directory));
    }
    assertDirectory(directory, 'Fine-tuning private collection item artifact preparation resolution history', { allowGroupRead });
  }
  if (!isSha256(itemHash)) throw new Error('Fine-tuning private collection item artifact preparation resolution item hash is invalid.');
  return fs.realpathSync(directories.at(-1)[0]);
}

function workspaceDirectory(executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) {
    throw new Error('Fine-tuning private collection workspace resolution hash is invalid.');
  }
  return path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`,
  );
}

function readTrackedSources() {
  const directory = path.join(repoDir, 'evidence', 'output-artifacts');
  const states = {
    assessment: readTrackedJson(path.join(directory, 'fine-tuning-data-sufficiency.json')),
    collectionPlan: readTrackedJson(path.join(directory, 'fine-tuning-data-collection-plan.json')),
    intakeRequest: readTrackedJson(path.join(directory, 'fine-tuning-data-intake-request.json')),
  };
  return {
    states,
    values: Object.fromEntries(Object.entries(states).map(([key, state]) => [key, state.value])),
  };
}

function readTrackedJson(filename) {
  const input = validatePrivateFilename(
    filename,
    'Fine-tuning private collection item artifact preparation resolution tracked F1 chain',
    { tracked: true },
  );
  return readPrivateJson(input, 'Fine-tuning private collection item artifact preparation resolution tracked F1 chain');
}

function readPrivateJson(value, label) {
  const input = typeof value === 'string' ? validatePrivateFilename(value, label) : value;
  let descriptor;
  try {
    descriptor = fs.openSync(input.canonicalFilename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const before = fs.fstatSync(descriptor);
    assertFile(before, label, { tracked: input.tracked });
    if (!sameFile(input.initialFile, before) || fs.realpathSync(input.filename) !== input.canonicalFilename) throw new Error();
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameFile(before, after)) throw new Error();
    return { ...input, bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function validatePrivateFilename(value, label, { tracked = false } = {}) {
  const filename = path.resolve(repoDir, value);
  const varDir = path.join(repoDir, 'var');
  try {
    const initialFile = fs.lstatSync(filename);
    if (initialFile.isSymbolicLink()) throw new Error();
    assertFile(initialFile, label, { tracked });
    const canonicalFilename = fs.realpathSync(filename);
    if (!sameFile(initialFile, fs.lstatSync(filename)) || !sameFile(initialFile, fs.statSync(canonicalFilename))) throw new Error();
    const relative = path.relative(repoDir, filename);
    const insideRepository = !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
    if (!tracked && insideRepository && !isPathWithin(varDir, canonicalFilename)) throw new Error();
    if (insideRepository && fs.realpathSync(path.dirname(filename)) !== path.dirname(filename)) throw new Error();
    if (insideRepository) {
      let ancestor = repoDir;
      for (const part of relative.split(path.sep)) {
        ancestor = path.join(ancestor, part);
        if (fs.lstatSync(ancestor).isSymbolicLink()) throw new Error();
      }
    }
    return { canonicalFilename, filename, initialFile, tracked };
  } catch {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  }
}

function writePrivateJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
}

function parseFilenames(args) {
  const expected = [
    '--workspace', 'workspace',
    '--admission', 'admission',
    '--item', 'item',
    '--projection', 'projection',
    '--review-resolution', 'reviewResolution',
    '--artifact-request', 'artifactRequest',
    '--decision', 'decision',
    '--execution-resolution', 'executionResolution',
    '--execution-request', 'executionRequest',
    '--plan', 'plan',
    '--intake-resolution', 'intakeResolution',
  ];
  if (
    args.length !== expected.length ||
    expected.some((value, index) => index % 2 === 0 && args[index] !== value) ||
    expected.some((_, index) => index % 2 === 1 && !String(args[index] || '').trim())
  ) {
    throw new Error(
      'Expected --workspace <private-json-path> --admission <private-json-path> '
      + '--item <private-json-path> --projection <private-json-path> '
      + '--review-resolution <private-json-path> --artifact-request <private-json-path> '
      + '--decision <private-json-path> --execution-resolution <private-json-path> '
      + '--execution-request <private-json-path> --plan <private-json-path> '
      + '--intake-resolution <private-json-path>.',
    );
  }
  return Object.fromEntries(expected.filter((_, index) => index % 2 === 1).map((key, index) => [key, args[index * 2 + 1]]));
}

function assertSameInputs(left, right) {
  for (const key of Object.keys(left.files)) {
    if (
      !left.files[key] ||
      !right.files[key] ||
      left.files[key].canonicalFilename !== right.files[key].canonicalFilename ||
      !sameFile(left.files[key].initialFile, right.files[key].initialFile) ||
      !left.files[key].bytes.equals(right.files[key].bytes)
    ) {
      throw new Error('Fine-tuning private collection item artifact preparation resolution input changed while resolving.');
    }
  }
  for (const key of Object.keys(left.tracked.states)) {
    const previous = left.tracked.states[key];
    const current = right.tracked.states[key];
    if (
      previous.canonicalFilename !== current.canonicalFilename ||
      !sameFile(previous.initialFile, current.initialFile) ||
      !previous.bytes.equals(current.bytes)
    ) {
      throw new Error('Fine-tuning private collection item artifact preparation resolution tracked F1 chain changed while resolving.');
    }
  }
}

function assertCanonical(input, expected, error) {
  if (input.canonicalFilename !== expected || !isPathWithin(repoDir, expected)) throw new Error(error);
  let current = repoDir;
  for (const part of path.relative(repoDir, expected).split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(error);
  }
}

function assertDirectoryNames(directory, expected, label) {
  if (!sameNames(readDirectory(directory, label), expected)) throw new Error(`${label} is invalid.`);
}

function readDirectory(directory, label) {
  assertDirectory(directory, label);
  return fs.readdirSync(directory).sort();
}

function assertDirectory(directory, label, { allowGroupRead = false } = {}) {
  try {
    const stat = fs.lstatSync(directory);
    const forbidden = allowGroupRead ? 0o022 : 0o077;
    if (!stat.isDirectory() || stat.isSymbolicLink() || !ownedByCurrentUser(stat) || (stat.mode & forbidden) !== 0) throw new Error();
  } catch {
    throw new Error(`${label} is invalid.`);
  }
}

function assertFile(stat, label, { tracked = false } = {}) {
  const forbidden = tracked ? 0o022 : 0o077;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    !ownedByCurrentUser(stat) ||
    (stat.mode & forbidden) !== 0
  ) {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  }
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    (left.mode & 0o777) === (right.mode & 0o777)
  );
}

function sameNames(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function sameReference(value, prefix, hashField) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    sameNames(Object.keys(value).sort(), ['id', hashField]) &&
    isSha256(value[hashField]) && value.id === `${prefix}${value[hashField]}`;
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function ownedByCurrentUser(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function fsyncFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}
