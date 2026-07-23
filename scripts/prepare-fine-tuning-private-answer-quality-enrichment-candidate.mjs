import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
  assertFineTuningPrivateAnswerQualityEnrichmentInput,
  buildFineTuningPrivateAnswerQualityEnrichmentCandidate,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemArtifactRequest,
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
} from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { assertFineTuningPrivateCollectionItemReviewResolutionRecord } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { assertFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const LANES = ['reviewed-examples', 'answer-quality-cases'];
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseFilenames(process.argv.slice(2));
const initial = loadInputs(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private answer quality enrichment candidate lock',
});

let candidate;
try {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  candidate = prepareCandidate(current);
} finally {
  lock.release();
}

console.log(JSON.stringify({
  answerQualityCaseCreated: candidate.answerQualityCaseCreated,
  answerQualityCaseEnrichmentCandidateCreated: candidate.answerQualityCaseEnrichmentCandidateCreated,
  externalProviderCalls: candidate.externalProviderCalls,
  productionReadyClaim: candidate.productionReadyClaim,
  q1ContractSatisfied: candidate.q1ContractSatisfied,
  reviewerReviewRequired: candidate.reviewerReviewRequired,
  status: candidate.status,
  trainingAuthorized: candidate.trainingAuthorized,
}, null, 2));

function prepareCandidate(current) {
  assertNoTerminalOrRemovalHistory(current);
  assertPredecessorHistories(current);
  const root = prepareHistoryRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(
    root,
    `.private-answer-quality-case-pending-${current.item.itemHash}-${current.enrichmentInputHash}`,
  );
  const history = inspectCandidateHistory({ current, pendingDirectory, root });
  if (history.final) {
    return assertStoredCandidateMatchesCurrent(current, history.final);
  }
  if (history.pending) {
    const pending = assertStoredCandidateMatchesCurrent(current, history.pending);
    assertReadyToPublish(current, pending);
    publishPending(pending, finalDirectory, pendingDirectory);
    return pending;
  }

  const generated = buildCandidate(current, new Date().toISOString());
  fs.mkdirSync(pendingDirectory, { mode: 0o700 });
  fs.chmodSync(pendingDirectory, 0o700);
  fsyncDirectory(root);
  writePrivateJson(path.join(pendingDirectory, 'candidate.json'), generated);
  fsyncDirectory(pendingDirectory);
  assertReadyToPublish(current, generated);
  publishPending(generated, finalDirectory, pendingDirectory);
  return generated;
}

function buildCandidate(current, observedAt) {
  return buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    artifactRequest: current.artifactRequest,
    input: current.enrichmentInput,
    item: current.item,
    observedAt,
    projection: current.projection,
    reviewResolution: current.reviewResolution,
    workspace: current.workspace,
  });
}

function loadInputs(names) {
  const tracked = {
    assessment: readJson(path.join(repoDir, 'evidence', 'output-artifacts', 'fine-tuning-data-sufficiency.json'), 'tracked F1 chain', { tracked: true }),
    collectionPlan: readJson(path.join(repoDir, 'evidence', 'output-artifacts', 'fine-tuning-data-collection-plan.json'), 'tracked F1 chain', { tracked: true }),
    intakeRequest: readJson(path.join(repoDir, 'evidence', 'output-artifacts', 'fine-tuning-data-intake-request.json'), 'tracked F1 chain', { tracked: true }),
  };
  const files = Object.fromEntries(Object.entries(names).map(([key, filename]) => [key, readJson(filename, `F1.16 ${key}`)]));
  const values = Object.fromEntries(Object.entries(files).map(([key, state]) => [key, state.value]));
  const workspace = values.workspace;
  const item = values.item;
  const resolution = values.artifactPreparationResolution;

  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(values.projection);
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(values.reviewResolution);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(values.artifactRequest);
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(resolution);
  const normalizedEnrichmentInput =
    assertFineTuningPrivateAnswerQualityEnrichmentInput(values.enrichmentInput);

  const sources = {
    assessment: tracked.assessment.value,
    collectionPlan: tracked.collectionPlan.value,
    intakeRequest: tracked.intakeRequest.value,
    intakeResolution: values.intakeResolution,
    executionRequest: values.executionRequest,
    executionResolution: values.executionResolution,
    privateCollectionPlan: values.plan,
    admission: values.admission,
    workspace,
  };
  const now = new Date().toISOString();
  assertFineTuningPrivateCollectionWorkspace(workspace, { ...sources, now });
  assertFineTuningPrivateCollectionItemAdmission(values.admission, { ...sources, now });
  assertFineTuningPrivateCollectionItem(item, { ...sources, now });
  assertFineTuningPrivateCollectionItemReviewProjection(values.projection, {
    admission: values.admission,
    item,
    request: projectionInput(values.projection),
    workspace,
  });
  assertFineTuningPrivateCollectionItemArtifactRequest(values.artifactRequest, {
    admission: values.admission,
    artifactRequestInput: artifactInput(values.artifactRequest),
    item,
    projection: values.projection,
    reviewResolution: values.reviewResolution,
    workspace,
  });

  assertExactLineage({ files, tracked, values });
  if (
    Date.parse(now) >= Date.parse(item.expiresAt) ||
    Date.parse(now) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private answer quality enrichment item is expired.');
  }
  return {
    ...values,
    enrichmentInputHash: hashRecord(normalizedEnrichmentInput),
    files,
    tracked,
    workspaceDirectory: workspaceDirectory(values.executionResolution),
  };
}

function assertExactLineage({ files, tracked, values }) {
  const { admission, artifactPreparationResolution: resolution, artifactRequest, item, projection, reviewResolution, workspace } = values;
  const workspaceRoot = workspaceDirectory(values.executionResolution);
  assertCanonical(files.workspace, path.join(workspaceRoot, 'workspace.json'), 'workspace');
  assertCanonical(files.admission, path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions', admission.id, 'admission.json'), 'admission');
  assertCanonical(files.item, path.join(workspaceRoot, item.lane, `fine-tuning-private-collection-item-${admission.admissionHash}`, 'item.json'), 'item');
  assertCanonical(files.projection, path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', workspace.workspaceHash, `${item.itemHash}.json`), 'projection');
  assertCanonical(files.reviewResolution, path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions', workspace.workspaceHash, item.itemHash, 'resolution.json'), 'review resolution');
  assertCanonical(files.artifactRequest, path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-requests', workspace.workspaceHash, `${item.itemHash}.json`), 'artifact request');
  assertCanonical(files.artifactPreparationResolution, path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions', workspace.workspaceHash, item.itemHash, 'resolution.json'), 'artifact preparation resolution');
  if (
    admission.workspace.id !== workspace.id || item.admission.id !== admission.id || item.workspace.id !== workspace.id ||
    projection.item.id !== item.id || reviewResolution.projection.id !== projection.id ||
    artifactRequest.reviewResolution.id !== reviewResolution.id || resolution.artifactRequest.id !== artifactRequest.id ||
    resolution.item.id !== item.id || resolution.workspace.id !== workspace.id ||
    resolution.decision !== 'approve' || !resolution.artifactPreparationAuthorized ||
    !resolution.answerQualityCaseEnrichmentPreparationAllowed || resolution.target !== 'answer-quality-case-enrichment' ||
    values.enrichmentInput.workspace.id !== workspace.id || values.enrichmentInput.item.id !== item.id ||
    values.enrichmentInput.artifactPreparationResolution.id !== resolution.id
  ) {
    throw new Error('Fine-tuning private answer quality enrichment must bind one exact approved F1.15 lineage.');
  }
  for (const state of Object.values(tracked)) {
    if (!state.value || typeof state.value !== 'object') throw new Error('Fine-tuning private answer quality enrichment tracked F1 chain is invalid.');
  }
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

function assertPredecessorHistories(current) {
  assertProjectionHistory(current);
  assertReviewResolutionHistory(current);
  assertArtifactRequestHistory(current);
  assertArtifactPreparationResolutionHistory(current);
}

function assertProjectionHistory(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    current.workspace.workspaceHash,
  );
  let currentFinal = false;
  for (const name of readDirectory(root, 'F1.16 F1.12 projection history')) {
    if (/^[a-f0-9]{64}\.json$/u.test(name)) {
      const projection = readJson(path.join(root, name), 'F1.16 F1.12 projection history').value;
      assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
      if (
        projection.workspace.workspaceHash !== current.workspace.workspaceHash ||
        name !== `${projection.item.itemHash}.json`
      ) {
        throw new Error('Fine-tuning private answer quality enrichment F1.12 history is invalid.');
      }
      if (projection.item.itemHash === current.item.itemHash) {
        if (currentFinal || JSON.stringify(projection) !== JSON.stringify(current.projection)) {
          throw new Error('Fine-tuning private answer quality enrichment F1.12 final history is ambiguous.');
        }
        currentFinal = true;
      }
      continue;
    }
    if (!/^\.fine-tuning-private-collection-item-review-projection-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private answer quality enrichment F1.12 history is invalid.');
    }
    const directory = path.join(root, name);
    assertDirectoryNames(directory, ['projection.json'], 'F1.16 F1.12 pending history');
    const projection = readJson(path.join(directory, 'projection.json'), 'F1.16 F1.12 pending history').value;
    assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
    const expectedName =
      `.fine-tuning-private-collection-item-review-projection-pending-`
      + `${projection.item.itemHash}-${projection.bindings.projectionRequestHash}`;
    if (
      projection.workspace.workspaceHash !== current.workspace.workspaceHash ||
      name !== expectedName
    ) {
      throw new Error('Fine-tuning private answer quality enrichment F1.12 pending history is invalid.');
    }
    if (projection.item.itemHash === current.item.itemHash) {
      throw new Error('Fine-tuning private answer quality enrichment F1.12 history is pending.');
    }
  }
  if (!currentFinal) {
    throw new Error('Fine-tuning private answer quality enrichment F1.12 canonical final is missing.');
  }
}

function assertReviewResolutionHistory(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    current.workspace.workspaceHash,
  );
  let currentFinal = false;
  for (const name of readDirectory(root, 'F1.16 F1.13 review resolution history')) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending =
      /^\.fine-tuning-private-collection-item-review-resolution-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private answer quality enrichment F1.13 history is invalid.');
    }
    const directory = path.join(root, name);
    const names = readDirectory(directory, 'F1.16 F1.13 review resolution history');
    const decisionOnly = sameNames(names, ['decision.json']);
    const complete = sameNames(names, ['decision.json', 'resolution.json']);
    if ((isFinal && !complete) || (isPending && !decisionOnly && !complete)) {
      throw new Error('Fine-tuning private answer quality enrichment F1.13 bundle is invalid.');
    }
    const decision = readJson(path.join(directory, 'decision.json'), 'F1.16 F1.13 decision history').value;
    assertReviewDecisionShape(decision);
    const expectedName = isFinal
      ? decision.item.itemHash
      : `.fine-tuning-private-collection-item-review-resolution-pending-${decision.item.itemHash}-${decision.decisionHash}`;
    if (
      decision.workspace.workspaceHash !== current.workspace.workspaceHash ||
      name !== expectedName
    ) {
      throw new Error('Fine-tuning private answer quality enrichment F1.13 history is invalid.');
    }
    let resolution;
    if (complete) {
      resolution = readJson(
        path.join(directory, 'resolution.json'),
        'F1.16 F1.13 resolution history',
      ).value;
      assertFineTuningPrivateCollectionItemReviewResolutionRecord(resolution);
      assertReviewDecisionMatchesResolution(decision, resolution);
    }
    if (decision.item.itemHash === current.item.itemHash) {
      if (
        isPending ||
        currentFinal ||
        !resolution ||
        JSON.stringify(resolution) !== JSON.stringify(current.reviewResolution)
      ) {
        throw new Error('Fine-tuning private answer quality enrichment F1.13 history is pending or ambiguous.');
      }
      currentFinal = true;
    }
  }
  if (!currentFinal) {
    throw new Error('Fine-tuning private answer quality enrichment F1.13 canonical final is missing.');
  }
}

function assertArtifactRequestHistory(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-requests',
    current.workspace.workspaceHash,
  );
  let currentFinal = false;
  for (const name of readDirectory(root, 'F1.16 F1.14 artifact request history')) {
    const isFinal = /^[a-f0-9]{64}\.json$/u.test(name);
    const isPending =
      /^\.fine-tuning-private-collection-item-artifact-request-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private answer quality enrichment F1.14 history is invalid.');
    }
    const directory = path.join(root, name);
    const filename = isFinal ? directory : path.join(directory, 'request.json');
    if (isPending) {
      assertDirectoryNames(directory, ['request.json'], 'F1.16 F1.14 pending history');
    }
    const request = readJson(filename, 'F1.16 F1.14 artifact request history').value;
    assertFineTuningPrivateCollectionItemArtifactRequestRecord(request);
    const expectedName = isFinal
      ? `${request.item.itemHash}.json`
      : `.fine-tuning-private-collection-item-artifact-request-pending-${request.item.itemHash}-${request.artifactRequestInputHash}`;
    if (
      request.workspace.workspaceHash !== current.workspace.workspaceHash ||
      name !== expectedName
    ) {
      throw new Error('Fine-tuning private answer quality enrichment F1.14 history is invalid.');
    }
    if (request.item.itemHash === current.item.itemHash) {
      if (
        isPending ||
        currentFinal ||
        JSON.stringify(request) !== JSON.stringify(current.artifactRequest)
      ) {
        throw new Error('Fine-tuning private answer quality enrichment F1.14 history is pending or ambiguous.');
      }
      currentFinal = true;
    }
  }
  if (!currentFinal) {
    throw new Error('Fine-tuning private answer quality enrichment F1.14 canonical final is missing.');
  }
}

function assertArtifactPreparationResolutionHistory(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-preparation-resolutions',
    current.workspace.workspaceHash,
  );
  let currentFinal = false;
  for (const name of readDirectory(root, 'F1.16 F1.15 artifact preparation history')) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending =
      /^\.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error('Fine-tuning private answer quality enrichment F1.15 history is invalid.');
    }
    const directory = path.join(root, name);
    const names = readDirectory(directory, 'F1.16 F1.15 artifact preparation history');
    const decisionOnly = sameNames(names, ['decision.json']);
    const complete = sameNames(names, ['decision.json', 'resolution.json']);
    if ((isFinal && !complete) || (isPending && !decisionOnly && !complete)) {
      throw new Error('Fine-tuning private answer quality enrichment F1.15 bundle is invalid.');
    }
    const decision = readArtifactPreparationDecision(
      path.join(directory, 'decision.json'),
      'F1.16 F1.15 decision history',
    );
    const expectedName = isFinal
      ? decision.item.itemHash
      : `.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-`
        + `${decision.item.itemHash}-${decision.artifactPreparationDecisionHash}`;
    if (
      decision.workspace.workspaceHash !== current.workspace.workspaceHash ||
      name !== expectedName
    ) {
      throw new Error('Fine-tuning private answer quality enrichment F1.15 history is invalid.');
    }
    let resolution;
    if (complete) {
      resolution = readJson(
        path.join(directory, 'resolution.json'),
        'F1.16 F1.15 resolution history',
      ).value;
      assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(resolution);
      assertArtifactPreparationDecisionMatchesResolution(decision, resolution);
    }
    if (decision.item.itemHash === current.item.itemHash) {
      if (
        isPending ||
        currentFinal ||
        !resolution ||
        JSON.stringify(resolution) !== JSON.stringify(current.artifactPreparationResolution)
      ) {
        throw new Error('Fine-tuning private answer quality enrichment F1.15 history is pending or ambiguous.');
      }
      currentFinal = true;
    }
  }
  if (!currentFinal) {
    throw new Error('Fine-tuning private answer quality enrichment F1.15 canonical final is missing.');
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
  const parsed = Date.parse(String(value?.decidedAt || ''));
  const decidedAt = Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !sameNames(Object.keys(value), keys) ||
    !sameReference(value.admission, 'fine-tuning-private-collection-item-admission-', 'admissionHash') ||
    !sameReference(value.item, 'fine-tuning-private-collection-item-', 'itemHash') ||
    !sameReference(
      value.projection,
      'fine-tuning-private-collection-item-review-projection-',
      'projectionHash',
    ) ||
    !sameReference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash') ||
    !isSha256(record.confirmationTokenSha256) ||
    !isSha256(record.evidenceSha256) ||
    !isSha256(value.decisionHash) ||
    value.id !== `fine-tuning-private-collection-item-review-resolution-decision-${value.decisionHash}` ||
    value.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(value.decision) ||
    record.schemaVersion !==
      'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1' ||
    !['reviewed-example-candidate-review', 'answer-quality-case-enrichment-review'].includes(record.target) ||
    value.decidedAt !== decidedAt ||
    value.decisionHash !== hashRecord(record)
  ) {
    throw new Error('Fine-tuning private answer quality enrichment F1.13 decision history is invalid.');
  }
}

function assertReviewDecisionMatchesResolution(decision, resolution) {
  if (
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
    throw new Error('Fine-tuning private answer quality enrichment F1.13 bundle is invalid.');
  }
}

function readArtifactPreparationDecision(filename, label) {
  const value = readJson(filename, label).value;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !sameNames(Object.keys(value), [
      'artifactPreparationDecisionHash',
      'artifactRequest',
      'decisionRecord',
      'id',
      'item',
      'workspace',
    ]) ||
    !isSha256(value.artifactPreparationDecisionHash) ||
    value.id !==
      `fine-tuning-private-collection-item-artifact-preparation-decision-${value.artifactPreparationDecisionHash}` ||
    !sameReference(
      value.artifactRequest,
      'fine-tuning-private-collection-item-artifact-request-',
      'artifactRequestHash',
    ) ||
    !sameReference(value.item, 'fine-tuning-private-collection-item-', 'itemHash') ||
    !sameReference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash')
  ) {
    throw new Error('Fine-tuning private answer quality enrichment F1.15 decision history is invalid.');
  }
  const record = value.decisionRecord;
  const parsed = Date.parse(String(record?.decidedAt || ''));
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
    record.decidedAt !== (Number.isFinite(parsed) ? new Date(parsed).toISOString() : null) ||
    record.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(record.decision) ||
    record.schemaVersion !==
      'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1' ||
    !['reviewed-example-canonicalization', 'answer-quality-case-enrichment'].includes(record.target) ||
    value.artifactPreparationDecisionHash !== hashRecord(record)
  ) {
    throw new Error('Fine-tuning private answer quality enrichment F1.15 decision history is invalid.');
  }
  return value;
}

function assertArtifactPreparationDecisionMatchesResolution(decision, resolution) {
  if (
    decision.artifactPreparationDecisionHash !==
      resolution.bindings.artifactPreparationDecisionHash ||
    JSON.stringify(decision.decisionRecord) !== JSON.stringify(resolution.decisionRecord) ||
    JSON.stringify(decision.artifactRequest) !== JSON.stringify(resolution.artifactRequest) ||
    JSON.stringify(decision.item) !== JSON.stringify(resolution.item) ||
    JSON.stringify(decision.workspace) !== JSON.stringify(resolution.workspace)
  ) {
    throw new Error('Fine-tuning private answer quality enrichment F1.15 bundle is invalid.');
  }
}

function assertNoTerminalOrRemovalHistory(current) {
  assertNoRemovalDirectories(current.workspaceDirectory);
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-tombstones');
  if (!fs.existsSync(root)) return;
  assertDirectory(root, 'F1.16 tombstone history');
  const workspaceRoot = path.join(root, current.workspace.workspaceHash);
  if (!fs.existsSync(workspaceRoot)) return;

  for (const name of readDirectory(workspaceRoot, 'F1.16 tombstone history')) {
    const directory = path.join(workspaceRoot, name);
    if (/^[a-f0-9]{64}$/u.test(name)) {
      const names = readDirectory(directory, 'F1.16 terminal history');
      if (sameNames(names, ['tombstone.json'])) {
        const tombstone = readJson(path.join(directory, 'tombstone.json'), 'F1.16 v1 tombstone').value;
        assertFineTuningPrivateCollectionItemTombstone(tombstone);
        if (
          name !== tombstone.withdrawalReferenceSha256 ||
          tombstone.workspace.workspaceHash !== current.workspace.workspaceHash
        ) {
          throw new Error('Fine-tuning private answer quality enrichment terminal history is invalid.');
        }
        if (matchesTerminal(tombstone, current)) {
          throw new Error('Fine-tuning private answer quality enrichment is blocked by terminal history.');
        }
        continue;
      }
      if (sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
        const bundle = {
          decision: readJson(path.join(directory, 'decision.json'), 'F1.16 terminal decision').value,
          receipt: readJson(path.join(directory, 'absence-receipt.json'), 'F1.16 absence receipt').value,
          tombstone: readJson(path.join(directory, 'tombstone.json'), 'F1.16 v2 tombstone').value,
        };
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
        if (
          name !== bundle.decision.withdrawalReferenceSha256 ||
          name !== bundle.tombstone.withdrawalReferenceSha256 ||
          bundle.decision.workspace.workspaceHash !== current.workspace.workspaceHash ||
          bundle.tombstone.workspace.workspaceHash !== current.workspace.workspaceHash
        ) {
          throw new Error('Fine-tuning private answer quality enrichment terminal history is invalid.');
        }
        if (matchesTerminal(bundle.tombstone, current)) {
          throw new Error('Fine-tuning private answer quality enrichment is blocked by terminal history.');
        }
        continue;
      }
      throw new Error('Fine-tuning private answer quality enrichment terminal history is invalid.');
    }

    if (!/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private answer quality enrichment terminal history is invalid.');
    }
    const names = readDirectory(directory, 'F1.16 pending terminal history');
    if (
      !sameNames(names, ['decision.json']) &&
      !sameNames(names, ['decision.json', 'tombstone.json']) &&
      !sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])
    ) {
      throw new Error('Fine-tuning private answer quality enrichment pending terminal history is invalid.');
    }
    const decision = readJson(path.join(directory, 'decision.json'), 'F1.16 pending terminal decision').value;
    assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
    if (
      name !== `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}` ||
      decision.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('Fine-tuning private answer quality enrichment pending terminal history is invalid.');
    }
    if (names.includes('tombstone.json')) {
      const tombstone = readJson(path.join(directory, 'tombstone.json'), 'F1.16 pending tombstone').value;
      if (names.includes('absence-receipt.json')) {
        const receipt = readJson(path.join(directory, 'absence-receipt.json'), 'F1.16 pending receipt').value;
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({ decision, receipt, tombstone });
      } else {
        assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({ decision, tombstone });
      }
    }
    if (matchesTerminal(decision, current)) {
      throw new Error('Fine-tuning private answer quality enrichment has pending terminal history.');
    }
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
    for (const name of readDirectory(laneDirectory, 'F1.16 private collection workspace')) {
      if (/^\.fine-tuning-private-collection-item-removal-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private answer quality enrichment removal history requires recovery.');
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private answer quality enrichment workspace lane is invalid.');
      }
      const directory = path.join(laneDirectory, name);
      assertDirectoryNames(directory, ['item.json'], 'F1.16 workspace item');
      const item = readJson(path.join(directory, 'item.json'), 'F1.16 workspace item').value;
      assertFineTuningPrivateCollectionItemRecord(item);
      if (
        item.lane !== lane ||
        name !== `fine-tuning-private-collection-item-${item.admission.admissionHash}`
      ) {
        throw new Error('Fine-tuning private answer quality enrichment workspace item is invalid.');
      }
    }
  }
}

function inspectCandidateHistory({ current, pendingDirectory, root }) {
  let final = null;
  let pending = null;
  for (const name of readDirectory(root, 'F1.16 candidate history')) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = /^\.private-answer-quality-case-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) throw new Error('Fine-tuning private answer quality enrichment candidate history is invalid.');
    const directory = path.join(root, name);
    const names = readDirectory(directory, 'F1.16 candidate history entry');
    if (names.length === 0 && isPending && name === path.basename(pendingDirectory)) {
      fs.rmdirSync(directory);
      fsyncDirectory(root);
      continue;
    }
    if (JSON.stringify(names) !== JSON.stringify(['candidate.json'])) {
      throw new Error('Fine-tuning private answer quality enrichment candidate history is invalid.');
    }
    const stored = readJson(path.join(directory, 'candidate.json'), 'F1.16 candidate history').value;
    assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(stored);
    if (stored.workspace.workspaceHash !== current.workspace.workspaceHash) {
      throw new Error('Fine-tuning private answer quality enrichment candidate history is invalid.');
    }
    const expectedPending = `.private-answer-quality-case-pending-${stored.item.itemHash}-${stored.bindings.answerQualityCaseEnrichmentInputHash}`;
    if ((isFinal && name !== stored.item.itemHash) || (isPending && name !== expectedPending)) {
      throw new Error('Fine-tuning private answer quality enrichment candidate history is invalid.');
    }
    if (stored.item.itemHash !== current.item.itemHash) continue;
    if (
      stored.inputSummary.inputHash !== current.enrichmentInputHash ||
      stored.bindings.answerQualityCaseEnrichmentInputHash !== current.enrichmentInputHash ||
      stored.workspace.workspaceHash !== current.workspace.workspaceHash ||
      stored.admission.admissionHash !== current.admission.admissionHash ||
      stored.item.itemHash !== current.item.itemHash ||
      stored.projection.projectionHash !== current.projection.projectionHash ||
      stored.reviewResolution.resolutionHash !== current.reviewResolution.resolutionHash ||
      stored.artifactRequest.artifactRequestHash !== current.artifactRequest.artifactRequestHash ||
      stored.artifactPreparationResolution.artifactPreparationResolutionHash !==
        current.artifactPreparationResolution.artifactPreparationResolutionHash
    ) {
      throw new Error('Fine-tuning private answer quality enrichment candidate conflicts with current input or lineage.');
    }
    if (isFinal) {
      if (final) {
        throw new Error('Fine-tuning private answer quality enrichment candidate history is ambiguous.');
      }
      final = stored;
    } else {
      if (pending) {
        throw new Error('Fine-tuning private answer quality enrichment candidate pending history is ambiguous.');
      }
      pending = stored;
    }
  }
  if (final && pending) {
    throw new Error('Fine-tuning private answer quality enrichment candidate final history conflicts with pending state.');
  }
  return { final, pending };
}

function assertStoredCandidateMatchesCurrent(current, stored) {
  const expected = buildCandidate(current, stored.observedAt);
  if (JSON.stringify(stored) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality enrichment stored candidate does not match current input.');
  }
  return stored;
}

function publishPending(candidate, finalDirectory, pendingDirectory) {
  const stored = readJson(path.join(pendingDirectory, 'candidate.json'), 'F1.16 pending candidate').value;
  if (JSON.stringify(stored) !== JSON.stringify(candidate) || fs.existsSync(finalDirectory)) {
    throw new Error('Fine-tuning private answer quality enrichment candidate cannot publish inconsistent history.');
  }
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncDirectory(path.dirname(finalDirectory));
  const published = readJson(path.join(finalDirectory, 'candidate.json'), 'F1.16 published candidate').value;
  if (JSON.stringify(published) !== JSON.stringify(candidate)) {
    throw new Error('Fine-tuning private answer quality enrichment candidate publish integrity failed.');
  }
}

function assertReadyToPublish(initial, candidate) {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  assertNoTerminalOrRemovalHistory(current);
  assertPredecessorHistories(current);
  assertStoredCandidateMatchesCurrent(current, candidate);
}

function prepareHistoryRoot(workspaceHash) {
  const directories = [
    [path.join(repoDir, 'var'), true],
    [path.join(repoDir, 'var', 'fine-tuning'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-answer-quality-enrichment-candidates'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-answer-quality-enrichment-candidates', workspaceHash), false],
  ];
  for (const [directory, allowGroupRead] of directories) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      fsyncDirectory(path.dirname(directory));
    }
    assertDirectory(directory, 'F1.16 candidate history', { allowGroupRead });
  }
  return fs.realpathSync(directories.at(-1)[0]);
}

function workspaceDirectory(executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) {
    throw new Error('Fine-tuning private answer quality enrichment execution resolution is invalid.');
  }
  return path.join(repoDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`);
}

function readJson(filename, label, options = {}) {
  const input = typeof filename === 'string' ? validateFilename(filename, label, options) : filename;
  let descriptor;
  try {
    descriptor = fs.openSync(input.canonicalFilename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const before = fs.fstatSync(descriptor);
    assertFile(before, label, options);
    if (!sameFile(before, input.initialFile) || fs.realpathSync(input.filename) !== input.canonicalFilename) {
      throw new Error();
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameFile(before, after)) {
      throw new Error();
    }
    return { ...input, bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
}

function validateFilename(value, label, { tracked = false } = {}) {
  const filename = path.resolve(repoDir, value);
  const varDir = path.join(repoDir, 'var');
  try {
    const initialFile = fs.lstatSync(filename);
    assertFile(initialFile, label, { tracked });
    const canonicalFilename = fs.realpathSync(filename);
    if (initialFile.isSymbolicLink() || !sameFile(initialFile, fs.statSync(canonicalFilename))) {
      throw new Error();
    }
    const inside = isPathWithin(repoDir, filename);
    if (inside) {
      assertNoSymlinkAncestors(filename, repoDir);
    }
    if (!tracked && inside && !isPathWithin(varDir, canonicalFilename)) {
      throw new Error();
    }
    if (isPathWithin(repoDir, canonicalFilename)) {
      assertNoSymlinkAncestors(canonicalFilename, repoDir);
    }
    return { canonicalFilename, filename, initialFile, tracked };
  } catch {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  }
}

function assertNoSymlinkAncestors(filename, root) {
  let current = root;
  if (fs.lstatSync(current).isSymbolicLink()) throw new Error();
  for (const part of path.relative(root, filename).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error();
  }
}

function writePrivateJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
}

function parseFilenames(args) {
  const expected = [
    '--workspace', 'workspace', '--admission', 'admission', '--item', 'item', '--projection', 'projection',
    '--review-resolution', 'reviewResolution', '--artifact-request', 'artifactRequest',
    '--artifact-preparation-resolution', 'artifactPreparationResolution', '--enrichment-input', 'enrichmentInput',
    '--execution-resolution', 'executionResolution', '--execution-request', 'executionRequest', '--plan', 'plan', '--intake-resolution', 'intakeResolution',
  ];
  const namesMatch = expected.every((value, index) => index % 2 !== 0 || args[index] === value);
  const valuesPresent = expected.every((_, index) => index % 2 === 0 || String(args[index] || '').trim());
  if (args.length !== expected.length || !namesMatch || !valuesPresent) {
    throw new Error('Expected exact private F1.1-F1.16 input filenames.');
  }
  const fields = expected.filter((_, index) => index % 2 === 1);
  return Object.fromEntries(fields.map((key, index) => [key, args[index * 2 + 1]]));
}

function assertSameInputs(left, right) {
  for (const group of [left.files, left.tracked]) {
    for (const key of Object.keys(group)) {
      const before = group[key];
      const otherGroup = group === left.files ? right.files : right.tracked;
      const after = otherGroup[key];
      if (
        !after ||
        before.canonicalFilename !== after.canonicalFilename ||
        !sameFile(before.initialFile, after.initialFile) ||
        !before.bytes.equals(after.bytes)
      ) {
        throw new Error('Fine-tuning private answer quality enrichment input changed while preparing.');
      }
    }
  }
}

function assertCanonical(input, expected, label) {
  if (input.canonicalFilename !== expected || !isPathWithin(repoDir, expected)) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} must use its exact prepared location.`);
  }
}

function readDirectory(directory, label) {
  assertDirectory(directory, label);
  return fs.readdirSync(directory).sort();
}

function assertDirectoryNames(directory, expected, label) {
  if (!sameNames(readDirectory(directory, label), expected)) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertDirectory(directory, label, { allowGroupRead = false } = {}) {
  try {
    const stat = fs.lstatSync(directory);
    const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
    if (!stat.isDirectory() || stat.isSymbolicLink() || !owned(stat) || (stat.mode & forbiddenMode) !== 0) {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} is invalid.`);
  }
}

function assertFile(stat, label, { tracked = false } = {}) {
  const forbiddenMode = tracked ? 0o022 : 0o077;
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    !owned(stat) ||
    (stat.mode & forbiddenMode) !== 0
  ) {
    throw new Error(`${label} must be an owner-only bounded regular file.`);
  }
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size &&
    left.nlink === right.nlink && (left.mode & 0o777) === (right.mode & 0o777);
}

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function sameReference(value, prefix, hashField) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), ['id', hashField]) &&
    isSha256(value[hashField]) &&
    value.id === `${prefix}${value[hashField]}`;
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

function owned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
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
