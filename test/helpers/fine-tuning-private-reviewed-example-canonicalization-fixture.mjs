import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { buildApprovedTrainingRecordFixture } from '../../scripts/approved-training-record-fixture.mjs';
import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { deriveFineTuningPrivateReviewedExampleSourceHashes } from '../../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { withSyntheticLifecycleFixture, writeJson } from './fine-tuning-private-collection-item-lifecycle-fixture.mjs';

export function withReviewedExampleCanonicalizationFixture(callback, options = {}) {
  return withSyntheticLifecycleFixture(callback, {
    ...options,
    sourceHashes: deriveFineTuningPrivateReviewedExampleSourceHashes(sourceProjection(trainingSource())),
  });
}

export function prepareReviewedExampleCanonicalizationFixture(
  fixture,
  { artifactDecision = 'approve' } = {},
) {
  const chainFilenames = writeCurrentF1Chain(fixture);
  const at = (value) => new Date(Date.parse(value) + 1_000).toISOString();
  const reviewTarget = fixture.item.lane === 'reviewed-examples'
    ? 'reviewed-example-candidate-review'
    : 'answer-quality-case-enrichment-review';
  const artifactTarget = fixture.item.lane === 'reviewed-examples'
    ? 'reviewed-example-canonicalization'
    : 'answer-quality-case-enrichment';
  const projectionAt = at(fixture.item.storedAt);
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt: projectionAt,
    request: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      requestedAt: projectionAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: reviewTarget,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewedAt = at(projectionAt);
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: ref(fixture.admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: hash('review'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: reviewedAt,
    workspace: fixture.workspace,
  });
  const requestedAt = at(reviewedAt);
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: ref(reviewResolution, 'resolutionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: artifactTarget,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item: fixture.item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  const decidedAt = at(requestedAt);
  const artifactPreparationResolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission: fixture.admission,
    artifactRequest,
    decision: {
      artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
      confirmationToken: `${artifactDecision}-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
      decidedAt,
      decidedByRole: 'quality-reviewer',
      decision: artifactDecision,
      evidenceSha256: hash('preparation'),
      item: ref(fixture.item, 'itemHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
      target: artifactTarget,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: decidedAt,
    reviewResolution,
    workspace: fixture.workspace,
  });
  const projectionDirectory = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    fixture.workspace.workspaceHash,
  );
  fs.mkdirSync(projectionDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(projectionDirectory, 0o700);
  writeJson(path.join(projectionDirectory, `${fixture.item.itemHash}.json`), projection);

  const reviewResolutionDirectory = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
  fs.mkdirSync(reviewResolutionDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(reviewResolutionDirectory, 0o700);
  writeJson(path.join(reviewResolutionDirectory, 'decision.json'), {
    admission: reviewResolution.admission,
    confirmationTokenSha256: reviewResolution.decisionRecord.confirmationTokenSha256,
    decidedAt: reviewResolution.decisionRecord.decidedAt,
    decidedByRole: reviewResolution.decisionRecord.decidedByRole,
    decision: reviewResolution.decision,
    decisionHash: reviewResolution.decisionHash,
    evidenceSha256: reviewResolution.decisionRecord.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${reviewResolution.decisionHash}`,
    item: reviewResolution.item,
    projection: reviewResolution.projection,
    schemaVersion: reviewResolution.decisionRecord.schemaVersion,
    target: reviewResolution.target,
    workspace: reviewResolution.workspace,
  });
  writeJson(path.join(reviewResolutionDirectory, 'resolution.json'), reviewResolution);

  const artifactRequestDirectory = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-requests',
    fixture.workspace.workspaceHash,
  );
  fs.mkdirSync(artifactRequestDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(artifactRequestDirectory, 0o700);
  writeJson(
    path.join(artifactRequestDirectory, `${fixture.item.itemHash}.json`),
    artifactRequest,
  );
  const directory = path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-artifact-preparation-resolutions', fixture.workspace.workspaceHash, fixture.item.itemHash);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  writeJson(path.join(directory, 'decision.json'), {
    artifactPreparationDecisionHash: artifactPreparationResolution.bindings.artifactPreparationDecisionHash,
    artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
    decisionRecord: artifactPreparationResolution.decisionRecord,
    id: `fine-tuning-private-collection-item-artifact-preparation-decision-${artifactPreparationResolution.bindings.artifactPreparationDecisionHash}`,
    item: ref(fixture.item, 'itemHash'),
    workspace: ref(fixture.workspace, 'workspaceHash'),
  });
  const resolutionFilename = path.join(directory, 'resolution.json');
  writeJson(resolutionFilename, artifactPreparationResolution);
  const training = trainingSource();
  const sourceBundle = {
    admission: ref(fixture.admission, 'admissionHash'),
    artifacts: training.artifacts,
    candidate: training.candidate,
    example: structuredClone(fixture.item.example),
    item: ref(fixture.item, 'itemHash'),
    lineageSha256: fixture.admission.envelope.source.lineageSha256,
    mission: training.mission,
    referenceSha256: fixture.admission.envelope.source.referenceSha256,
    reviewerArtifactId: training.reviewerArtifactId,
    schemaVersion: 'personal-ai-agent-fine-tuning-private-reviewed-example-source-bundle/v1',
    scopeReferenceSha256: fixture.admission.envelope.source.scopeReferenceSha256,
    session: training.session,
    sourceArtifactId: training.sourceArtifactId,
    trainingWorkspace: training.workspace,
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
  const sourceBundleFilename = path.join(fixture.rootDir, 'var', 'inputs', 'reviewed-example-source-bundle.json');
  writeJson(sourceBundleFilename, sourceBundle);
  return {
    ...chainFilenames,
    artifactPreparationResolution,
    resolutionFilename,
    sourceBundle,
    sourceBundleFilename,
  };
}

function writeCurrentF1Chain(fixture) {
  const trackedDirectory = path.join(
    fixture.rootDir,
    'evidence',
    'output-artifacts',
  );
  fs.mkdirSync(trackedDirectory, { recursive: true });
  writeTrackedJson(
    path.join(trackedDirectory, 'fine-tuning-data-sufficiency.json'),
    fixture.sources.assessment,
  );
  writeTrackedJson(
    path.join(trackedDirectory, 'fine-tuning-data-collection-plan.json'),
    fixture.sources.collectionPlan,
  );
  writeTrackedJson(
    path.join(trackedDirectory, 'fine-tuning-data-intake-request.json'),
    fixture.sources.intakeRequest,
  );

  const inputs = {
    executionRequestFilename: [
      'execution-request.json',
      fixture.sources.executionRequest,
    ],
    executionResolutionFilename: [
      'execution-resolution.json',
      fixture.sources.executionResolution,
    ],
    intakeResolutionFilename: [
      'intake-resolution.json',
      fixture.sources.intakeResolution,
    ],
    privateCollectionPlanFilename: [
      'private-collection-plan.json',
      fixture.sources.privateCollectionPlan,
    ],
  };
  return Object.fromEntries(
    Object.entries(inputs).map(([key, [name, value]]) => {
      const filename = path.join(fixture.rootDir, 'var', 'inputs', name);
      writeJson(filename, value);
      return [key, filename];
    }),
  );
}

function writeTrackedJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function ref(value, field) {
  return { id: value.id, [field]: value[field] };
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function trainingSource() {
  return buildApprovedTrainingRecordFixture({
    example: {
      instruction: 'Explain synthetic lifecycle case.',
      response: 'Synthetic lifecycle response.',
    },
    missionId: 'source-mission',
    suffix: 'private-reviewed-example-source',
    workspaceId: 'source-workspace',
  });
}

function sourceProjection(training) {
  return {
    artifacts: training.artifacts,
    candidate: training.candidate,
    mission: training.mission,
    reviewerArtifactId: training.reviewerArtifactId,
    session: training.session,
    sourceArtifactId: training.sourceArtifactId,
    trainingWorkspace: training.workspace,
  };
}
