import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput,
  assertFineTuningPrivateCollectionItemArtifactPreparationResolution,
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord,
  buildFineTuningPrivateCollectionItemArtifactPreparationResolution,
} from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.15 approval enables only the requested reviewed-example preparation lane', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const { artifactRequest, projection, reviewResolution } = artifactRequestFor(fixture);
    const decision = decisionFor(fixture, artifactRequest, 'approve');
    const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest,
      decision,
      item: fixture.item,
      projection,
      resolvedAt: decision.decidedAt,
      reviewResolution,
      workspace: fixture.workspace,
    });

    assertFineTuningPrivateCollectionItemArtifactPreparationResolution(resolution, {
      admission: fixture.admission,
      artifactRequest,
      decision,
      item: fixture.item,
      projection,
      reviewResolution,
      workspace: fixture.workspace,
    });
    assert.equal(resolution.status, 'approved-for-reviewed-example-canonicalization-preparation');
    assert.equal(resolution.artifactPreparationAuthorized, true);
    assert.equal(resolution.reviewedExampleCanonicalizationPreparationAllowed, true);
    assert.equal(resolution.answerQualityCaseEnrichmentPreparationAllowed, false);
    for (const flag of [
      'approvedTrainingRecordCreated',
      'answerQualityCaseCreated',
      'candidateTrainingReviewAllowed',
      'contentCopied',
      'trainingAuthorized',
      'workspaceMutationPerformed',
    ]) {
      assert.equal(resolution[flag], false);
    }
    assert.equal(resolution.decisionRecord.confirmationTokenSha256, sha256(decision.confirmationToken));
    assert.equal(JSON.stringify(resolution).includes(decision.confirmationToken), false);
    assert.equal(JSON.stringify(resolution).includes('Synthetic lifecycle response.'), false);
  });
});

test('F1.15 answer-quality approval and reject retain strict lane boundaries', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const { artifactRequest, projection, reviewResolution } = artifactRequestFor(fixture);
    const approvedDecision = decisionFor(fixture, artifactRequest, 'approve');
    const approved = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest,
      decision: approvedDecision,
      item: fixture.item,
      projection,
      resolvedAt: approvedDecision.decidedAt,
      reviewResolution,
      workspace: fixture.workspace,
    });
    const rejectedDecision = decisionFor(fixture, artifactRequest, 'reject');
    const rejected = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest,
      decision: rejectedDecision,
      item: fixture.item,
      projection,
      resolvedAt: rejectedDecision.decidedAt,
      reviewResolution,
      workspace: fixture.workspace,
    });

    assert.equal(approved.status, 'approved-for-answer-quality-case-enrichment-preparation');
    assert.equal(approved.answerQualityCaseEnrichmentPreparationAllowed, true);
    assert.equal(approved.reviewedExampleCanonicalizationPreparationAllowed, false);
    assert.equal(rejected.status, 'rejected-artifact-preparation');
    assert.equal(rejected.artifactPreparationAuthorized, false);
    assert.equal(rejected.answerQualityCaseEnrichmentPreparationAllowed, false);
  }, { lane: 'answer-quality-cases' });
});

test('F1.15 rejects raw-token storage, wrong confirmation binding, and semantic history drift', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const { artifactRequest, projection, reviewResolution } = artifactRequestFor(fixture);
    const decision = decisionFor(fixture, artifactRequest, 'approve');
    assert.throws(
      () => assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput({ ...decision, note: 'not permitted' }),
      /decision input/,
    );
    assert.throws(
      () => assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput({
        ...decision,
        confirmationToken: 'approve-private-collection-item-artifact-preparation:wrong',
      }),
      /decision input/,
    );
    const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest,
      decision,
      item: fixture.item,
      projection,
      resolvedAt: decision.decidedAt,
      reviewResolution,
      workspace: fixture.workspace,
    });
    assert.throws(
      () => assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord({
        ...resolution,
        artifactPreparationAuthorized: false,
      }),
      /integrity failed/,
    );
  });
});

function artifactRequestFor(fixture) {
  const projectedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt,
    request: {
      admission: reference(fixture.admission, 'admissionHash'),
      item: reference(fixture.item, 'itemHash'),
      requestedAt: projectedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-candidate-review'
        : 'answer-quality-case-enrichment-review',
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewDecisionAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: reference(fixture.admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewDecisionAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: 'a'.repeat(64),
      item: reference(fixture.item, 'itemHash'),
      projection: { id: projection.id, projectionHash: projection.projectionHash },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: reviewDecisionAt,
    workspace: fixture.workspace,
  });
  const requestedAt = new Date(Date.parse(reviewResolution.resolvedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: reference(fixture.admission, 'admissionHash'),
      item: reference(fixture.item, 'itemHash'),
      projection: { id: projection.id, projectionHash: projection.projectionHash },
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: { id: reviewResolution.id, resolutionHash: reviewResolution.resolutionHash },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-canonicalization'
        : 'answer-quality-case-enrichment',
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item: fixture.item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  return { artifactRequest, projection, reviewResolution };
}

function decisionFor(fixture, artifactRequest, decision) {
  const decidedAt = new Date(Date.parse(artifactRequest.createdAt) + 1_000).toISOString();
  return {
    artifactRequest: { id: artifactRequest.id, artifactRequestHash: artifactRequest.artifactRequestHash },
    confirmationToken: `${decision}-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: sha256(`artifact-preparation-${decision}`),
    item: reference(fixture.item, 'itemHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
    target: artifactRequest.target,
    workspace: reference(fixture.workspace, 'workspaceHash'),
  };
}

function reference(value, hashField) {
  return { id: value.id, [hashField]: value[hashField] };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
