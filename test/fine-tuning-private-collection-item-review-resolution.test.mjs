import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  assertFineTuningPrivateCollectionItemReviewResolution,
  assertFineTuningPrivateCollectionItemReviewResolutionDecisionInput,
  assertFineTuningPrivateCollectionItemReviewResolutionRecord,
  buildFineTuningPrivateCollectionItemReviewResolution,
} from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.13 records an approved reviewed-example request without creating a training record', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    const resolution = buildFineTuningPrivateCollectionItemReviewResolution({
      admission: fixture.admission,
      decision,
      item: fixture.item,
      projection,
      resolvedAt: decision.decidedAt,
      workspace: fixture.workspace,
    });

    assertFineTuningPrivateCollectionItemReviewResolution(resolution, {
      admission: fixture.admission,
      decision,
      item: fixture.item,
      projection,
      workspace: fixture.workspace,
    });
    assert.equal(resolution.status, 'approved-for-reviewed-example-canonicalization-request');
    assert.equal(resolution.reviewedExampleCanonicalizationRequestAllowed, true);
    assert.equal(resolution.answerQualityCaseEnrichmentRequestAllowed, false);
    assert.equal(resolution.approvedTrainingRecordCreated, false);
    assert.equal(resolution.candidateTrainingReviewAllowed, false);
    assert.equal(resolution.trainingAuthorized, false);
    assert.equal(resolution.externalProviderCalls, 'none');
    assert.equal(resolution.ownerAttestationRecorded, true);
    assert.equal(resolution.ownerIdentityVerified, false);
    assert.equal(resolution.evidenceIndependentlyVerified, false);
    assert.equal(resolution.decisionRecord.confirmationTokenSha256, sha256(decision.confirmationToken));
    assert.equal(JSON.stringify(resolution).includes(decision.confirmationToken), false);
    assert.equal(JSON.stringify(resolution).includes('Synthetic lifecycle response.'), false);
  });
});

test('F1.13 maps both answer-quality decisions to their non-training authority states', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const approved = buildFineTuningPrivateCollectionItemReviewResolution({
      admission: fixture.admission,
      decision: decisionFor(fixture, projection, 'approve'),
      item: fixture.item,
      projection,
      resolvedAt: new Date().toISOString(),
      workspace: fixture.workspace,
    });
    const rejectedDecision = decisionFor(fixture, projection, 'reject');
    const rejected = buildFineTuningPrivateCollectionItemReviewResolution({
      admission: fixture.admission,
      decision: rejectedDecision,
      item: fixture.item,
      projection,
      resolvedAt: rejectedDecision.decidedAt,
      workspace: fixture.workspace,
    });

    assert.equal(approved.status, 'approved-for-answer-quality-case-enrichment-request');
    assert.equal(approved.answerQualityCaseEnrichmentRequestAllowed, true);
    assert.equal(approved.reviewedExampleCanonicalizationRequestAllowed, false);
    assert.equal(rejected.status, 'rejected-by-owner-review');
    assert.equal(rejected.answerQualityCaseEnrichmentRequestAllowed, false);
    assert.equal(rejected.reviewedExampleCanonicalizationRequestAllowed, false);
  }, { lane: 'answer-quality-cases' });
});

test('F1.13 rejects extra decision fields, wrong role, target, reference, and confirmation token', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const input = decisionFor(fixture, projection, 'approve');
    for (const candidate of [
      { ...input, reason: 'content is prohibited here' },
      { ...input, decidedByRole: 'local-operator-role' },
      { ...input, evidenceSha256: 'not-a-sha256' },
      { ...input, projection: { ...input.projection, projectionHash: 'f'.repeat(64) } },
      { ...input, confirmationToken: 'approve-private-collection-item-review:wrong' },
    ]) {
      assert.throws(
        () => assertFineTuningPrivateCollectionItemReviewResolutionDecisionInput(candidate),
        /decision input|decision projection/,
      );
    }
    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision: { ...input, target: 'answer-quality-case-enrichment-review' },
        item: fixture.item,
        projection,
        resolvedAt: input.decidedAt,
        workspace: fixture.workspace,
      }),
      /must bind one live exact/,
    );
  });
});

test('F1.13 rejects rehashed semantic projection drift and expiry equality', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    const drift = structuredClone(projection);
    drift.bindings.policyHash = 'f'.repeat(64);
    const { id: _id, projectionHash: _projectionHash, ...content } = drift;
    drift.projectionHash = hash(content);
    drift.id = `fine-tuning-private-collection-item-review-projection-${drift.projectionHash}`;

    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision: decisionFor(fixture, drift, 'approve'),
        item: fixture.item,
        projection: drift,
        resolvedAt: decision.decidedAt,
        workspace: fixture.workspace,
      }),
      /does not match the live F1\.10 item/,
    );
  });
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decision = decisionFor(fixture, projection, 'approve', fixture.item.expiresAt);
    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision,
        item: fixture.item,
        projection,
        resolvedAt: fixture.item.expiresAt,
        workspace: fixture.workspace,
      }),
      /must bind one live exact/,
    );
  });
});

test('F1.13 rejects decisions before projection, resolutions before decision, and deleteBy equality', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const beforeProjection = new Date(Date.parse(projection.projectedAt) - 1).toISOString();
    const decision = decisionFor(fixture, projection, 'approve', beforeProjection);

    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision,
        item: fixture.item,
        projection,
        resolvedAt: projection.projectedAt,
        workspace: fixture.workspace,
      }),
      /must bind one live exact/,
    );
  });

  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decidedAt = new Date(Date.parse(projection.projectedAt) + 1_000).toISOString();
    const decision = decisionFor(fixture, projection, 'approve', decidedAt);

    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision,
        item: fixture.item,
        projection,
        resolvedAt: projection.projectedAt,
        workspace: fixture.workspace,
      }),
      /must bind one live exact/,
    );
  });

  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decision = decisionFor(fixture, projection, 'approve', fixture.item.retention.deleteBy);

    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewResolution({
        admission: fixture.admission,
        decision,
        item: fixture.item,
        projection,
        resolvedAt: fixture.item.retention.deleteBy,
        workspace: fixture.workspace,
      }),
      /must bind one live exact/,
    );
  });
});

test('F1.13 record integrity binds every projection hash and decision hash', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const projection = projectionFor(fixture);
    const decision = decisionFor(fixture, projection, 'reject');
    const resolution = buildFineTuningPrivateCollectionItemReviewResolution({
      admission: fixture.admission,
      decision,
      item: fixture.item,
      projection,
      resolvedAt: decision.decidedAt,
      workspace: fixture.workspace,
    });
    assert.equal(resolution.bindings.projectionHash, projection.projectionHash);
    assert.equal(resolution.bindings.decisionHash, resolution.decisionHash);
    assert.equal(resolution.bindings.itemHash, fixture.item.itemHash);
    assert.throws(
      () => assertFineTuningPrivateCollectionItemReviewResolutionRecord({
        ...resolution,
        bindings: { ...resolution.bindings, projectionHash: 'f'.repeat(64) },
      }),
      /integrity failed/,
    );
  });
});

function projectionFor(fixture) {
  const requestedAt = new Date().toISOString();
  const target = fixture.item.lane === 'reviewed-examples'
    ? 'reviewed-example-candidate-review'
    : 'answer-quality-case-enrichment-review';
  return buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt: requestedAt,
    request: {
      admission: { id: fixture.admission.id, admissionHash: fixture.admission.admissionHash },
      item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
      requestedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target,
      workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
    },
    workspace: fixture.workspace,
  });
}

function decisionFor(fixture, projection, decision, decidedAt = new Date().toISOString()) {
  return {
    admission: { id: fixture.admission.id, admissionHash: fixture.admission.admissionHash },
    confirmationToken: `${decision}-private-collection-item-review:${projection.projectionHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: sha256(`evidence-${decision}`),
    item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
    projection: { id: projection.id, projectionHash: projection.projectionHash },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
    target: projection.projectionKind,
    workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
  };
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
