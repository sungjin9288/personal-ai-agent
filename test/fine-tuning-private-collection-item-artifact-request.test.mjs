import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertFineTuningPrivateCollectionItemArtifactRequest,
  assertFineTuningPrivateCollectionItemArtifactRequestInput,
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
  buildFineTuningPrivateCollectionItemArtifactRequest,
} from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.14 records an approved reviewed-example preparation request without creating a record', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const resolution = resolutionFor(fixture, projection);
    const input = inputFor(fixture, projection, resolution);
    const request = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: input,
      createdAt: input.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    assertFineTuningPrivateCollectionItemArtifactRequest(request, {
      admission: fixture.admission,
      artifactRequestInput: input,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    assert.equal(request.status, 'pending-reviewed-example-canonicalization-preparation');
    assert.deepEqual(request.reviewedExample, {
      canonicalGateId: 'approved-training-record-v1',
      canonicalizationRequested: true,
      eligibilityEvaluated: false,
    });
    for (const name of [
      'artifactPreparationAuthorized',
      'approvedTrainingRecordCreated',
      'candidateTrainingReviewAllowed',
      'trainingAuthorized',
      'workspaceMutationPerformed',
    ]) {
      assert.equal(request[name], false);
    }
    assert.equal(JSON.stringify(request).includes('Synthetic lifecycle response.'), false);
  });
});

test('F1.14 records an approved answer-quality enrichment request without creating a case', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const resolution = resolutionFor(fixture, projection);
    const input = inputFor(fixture, projection, resolution);
    const request = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: input,
      createdAt: input.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    assert.equal(request.status, 'pending-answer-quality-case-enrichment-preparation');
    assert.equal(request.answerQualityCase.contractSatisfied, false);
    assert.equal(request.answerQualityCase.enrichmentRequested, true);
    assert.equal(request.answerQualityCaseCreated, false);
  }, { lane: 'answer-quality-cases' });
});

test('F1.14 rejects extra input fields, rejected resolutions, wrong lane, and expiry equality', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const resolution = resolutionFor(fixture, projection);
    const input = inputFor(fixture, projection, resolution);
    assert.throws(
      () => assertFineTuningPrivateCollectionItemArtifactRequestInput({ ...input, note: 'not stored' }),
      /input/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionItemArtifactRequest({
        admission: fixture.admission,
        artifactRequestInput: { ...input, target: 'answer-quality-case-enrichment' },
        createdAt: input.requestedAt,
        item: fixture.item,
        projection,
        reviewResolution: resolution,
        workspace: fixture.workspace,
      }),
      /approved live exact/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionItemArtifactRequest({
        admission: fixture.admission,
        artifactRequestInput: input,
        createdAt: fixture.item.expiresAt,
        item: fixture.item,
        projection,
        reviewResolution: resolution,
        workspace: fixture.workspace,
      }),
      /approved live exact/,
    );
    const rejected = resolutionFor(fixture, projection, 'reject');
    assert.throws(
      () => buildFineTuningPrivateCollectionItemArtifactRequest({
        admission: fixture.admission,
        artifactRequestInput: inputFor(fixture, projection, rejected),
        createdAt: input.requestedAt,
        item: fixture.item,
        projection,
        reviewResolution: rejected,
        workspace: fixture.workspace,
      }),
      /approved live exact/,
    );
  });
});

test('F1.14 record integrity rejects semantic rehash drift', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const resolution = resolutionFor(fixture, projection);
    const input = inputFor(fixture, projection, resolution);
    const request = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: input,
      createdAt: input.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    const drift = structuredClone(request);
    drift.artifactPreparationAuthorized = true;
    assert.throws(() => assertFineTuningPrivateCollectionItemArtifactRequestRecord(drift), /integrity/);
  });
});

function projectionFor(fixture) {
  const requestedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  return buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt: requestedAt,
    request: {
      admission: {
        id: fixture.admission.id,
        admissionHash: fixture.admission.admissionHash,
      },
      item: {
        id: fixture.item.id,
        itemHash: fixture.item.itemHash,
      },
      requestedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-candidate-review'
        : 'answer-quality-case-enrichment-review',
      workspace: {
        id: fixture.workspace.id,
        workspaceHash: fixture.workspace.workspaceHash,
      },
    },
    workspace: fixture.workspace,
  });
}

function resolutionFor(fixture, projection, decision = 'approve') {
  const decidedAt = new Date(Date.parse(projection.projectedAt) + 1_000).toISOString();
  const target = projection.projectionKind;
  return buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: {
        id: fixture.admission.id,
        admissionHash: fixture.admission.admissionHash,
      },
      confirmationToken: `${decision}-private-collection-item-review:${projection.projectionHash}`,
      decidedAt,
      decidedByRole: 'quality-reviewer',
      decision,
      evidenceSha256: 'a'.repeat(64),
      item: {
        id: fixture.item.id,
        itemHash: fixture.item.itemHash,
      },
      projection: {
        id: projection.id,
        projectionHash: projection.projectionHash,
      },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target,
      workspace: {
        id: fixture.workspace.id,
        workspaceHash: fixture.workspace.workspaceHash,
      },
    },
    item: fixture.item,
    projection,
    resolvedAt: decidedAt,
    workspace: fixture.workspace,
  });
}

function inputFor(fixture, projection, reviewResolution) {
  const requestedAt = new Date(Date.parse(reviewResolution.resolvedAt) + 1_000).toISOString();
  return {
    admission: {
      id: fixture.admission.id,
      admissionHash: fixture.admission.admissionHash,
    },
    item: {
      id: fixture.item.id,
      itemHash: fixture.item.itemHash,
    },
    projection: {
      id: projection.id,
      projectionHash: projection.projectionHash,
    },
    requestedAt,
    requestedByRole: 'local-operator-role',
    reviewResolution: {
      id: reviewResolution.id,
      resolutionHash: reviewResolution.resolutionHash,
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
    target: fixture.item.lane === 'reviewed-examples'
      ? 'reviewed-example-canonicalization'
      : 'answer-quality-case-enrichment',
    workspace: {
      id: fixture.workspace.id,
      workspaceHash: fixture.workspace.workspaceHash,
    },
  };
}
