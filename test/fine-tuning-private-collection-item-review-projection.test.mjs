import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
  assertFineTuningPrivateCollectionItemReviewProjectionRequest,
  buildFineTuningPrivateCollectionItemReviewProjection,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItem } from '../src/core/fine-tuning-private-collection-item.mjs';
import { buildFineTuningPrivateCollectionItemAdmission } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('reviewed-example projection is deterministic, content-free, and still pending', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const requestedAt = new Date().toISOString();
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt: requestedAt,
      request: requestFor(fixture, requestedAt),
      workspace: fixture.workspace,
    });

    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection));
    assert.equal(projection.lane, 'reviewed-examples');
    assert.equal(projection.projectionKind, 'reviewed-example-candidate-review');
    assert.equal(projection.status, 'pending-owner-review');
    assert.equal(projection.contentCopied, false);
    assert.equal(projection.itemPathStored, false);
    assert.deepEqual(projection.reviewedExample, {
      canonicalGateId: 'approved-training-record-v1',
      eligibilityEvaluated: false,
      gateRequired: true,
    });
    assert.equal(projection.trainingAuthorized, false);
    assert.equal(projection.fineTuningExecutionAuthorized, false);
    assert.equal(projection.approvedTrainingRecordCreated, false);
    assert.equal(projection.answerQualityCaseCreated, false);
    assert.equal(projection.externalProviderCalls, 'none');
    assert.equal(projection.externalSubmissionAuthorized, false);
    assert.equal(projection.providerSubmissionAuthorized, false);
    assert.equal(projection.providerSubmissionCreated, false);
    assert.equal(projection.productionReadyClaim, false);
    assert.equal(JSON.stringify(projection).includes('Synthetic lifecycle response'), false);

    const same = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt: requestedAt,
      request: requestFor(fixture, requestedAt),
      workspace: fixture.workspace,
    });
    assert.deepEqual(same, projection);
  });
});

test('answer-quality lane stays an unsatisfied content-free Q1 enrichment projection', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const admittedAt = new Date(Date.now() - 60_000).toISOString();
    const admission = buildFineTuningPrivateCollectionItemAdmission({
      ...fixture.sources,
      admittedAt,
      workspace: fixture.workspace,
      envelope: answerQualityEnvelope(fixture, admittedAt),
    });
    const storedAt = new Date(Date.now() - 30_000).toISOString();
    const item = buildFineTuningPrivateCollectionItem({
      admission,
      content: {
        admission: { admissionHash: admission.admissionHash, id: admission.id },
        dataOrigin: 'curated-synthetic',
        example: { instruction: 'Synthetic answer-quality projection.', response: 'Synthetic answer-quality projection response.' },
        sanitization: {
          directIdentifiersRemoved: true,
          evidenceSha256: admission.envelope.redaction.evidenceSha256,
          freeTextReviewed: true,
          methodVersion: 'private-sanitized-training-text-v1',
          policyId: 'deidentify-before-content-admission-v1',
          reidentificationProhibited: true,
          reviewedAt: storedAt,
          reviewerRole: 'quality-reviewer',
          secretsScanned: true,
        },
        schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1',
      },
      storedAt,
    });
    const requestedAt = new Date().toISOString();
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission,
      item,
      projectedAt: requestedAt,
      request: requestFor({ admission, item, workspace: fixture.workspace }, requestedAt),
      workspace: fixture.workspace,
    });

    assert.equal(projection.projectionKind, 'answer-quality-case-enrichment-review');
    assert.deepEqual(projection.answerQualityCase, {
      contractSatisfied: false,
      enrichmentRequired: true,
      missingQ1Fields: [
        'answer',
        'expectedSourceKeys',
        'forbiddenAnswerTerms',
        'forbiddenSourceKeys',
        'id',
        'requiredAnswerTerms',
        'retrievalInput',
        'reviewerVerdict',
      ],
    });
  });
});

test('request, exact references, target, timing, and record tampering fail closed', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const requestedAt = new Date().toISOString();
    const request = requestFor(fixture, requestedAt);
    assert.throws(
      () => assertFineTuningPrivateCollectionItemReviewProjectionRequest({ ...request, target: 'reviewed-examples' }),
      /request is invalid/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewProjection({
        admission: fixture.admission,
        item: fixture.item,
        projectedAt: requestedAt,
        request: { ...request, item: { ...request.item, itemHash: 'f'.repeat(64) } },
        workspace: fixture.workspace,
      }),
      /request item is invalid|exact F1.10 item/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionItemReviewProjection({
        admission: fixture.admission,
        item: fixture.item,
        projectedAt: fixture.item.retention.deleteBy,
        request,
        workspace: fixture.workspace,
      }),
      /exact F1.10 item/,
    );
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt: requestedAt,
      request,
      workspace: fixture.workspace,
    });
    const tampered = structuredClone(projection);
    tampered.review.decisionRecorded = true;
    assert.throws(() => assertFineTuningPrivateCollectionItemReviewProjectionRecord(tampered), /integrity failed|review state/);

    const semanticDrift = structuredClone(projection);
    semanticDrift.bindings.policyHash = 'f'.repeat(64);
    const {
      id: _id,
      projectionHash: _projectionHash,
      ...driftedContent
    } = semanticDrift;
    semanticDrift.projectionHash = hashRecord(driftedContent);
    semanticDrift.id =
      `fine-tuning-private-collection-item-review-projection-${semanticDrift.projectionHash}`;
    assertFineTuningPrivateCollectionItemReviewProjectionRecord(semanticDrift);
    assert.throws(
      () =>
        assertFineTuningPrivateCollectionItemReviewProjection(semanticDrift, {
          admission: fixture.admission,
          item: fixture.item,
          request,
          workspace: fixture.workspace,
        }),
      /does not match the live F1\.10 item/,
    );
  });
});

function requestFor({ admission, item, workspace }, requestedAt) {
  return {
    admission: { admissionHash: admission.admissionHash, id: admission.id },
    item: { id: item.id, itemHash: item.itemHash },
    requestedAt,
    requestedByRole: 'local-operator-role',
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
    target: item.lane === 'reviewed-examples'
      ? 'reviewed-example-candidate-review'
      : 'answer-quality-case-enrichment-review',
    workspace: { id: workspace.id, workspaceHash: workspace.workspaceHash },
  };
}

function answerQualityEnvelope(fixture, admittedAt) {
  const digest = (label) => createHash('sha256').update(label).digest('hex');
  return {
    lane: 'answer-quality-cases',
    privacy: {
      consentStatus: 'not-required-owner-authored',
      evidenceSha256: digest('privacy'),
      purpose: 'private-answer-quality-improvement-and-readiness-review',
    },
    redaction: { evidenceSha256: digest('redaction'), policyId: 'deidentify-before-content-admission-v1' },
    retention: {
      deleteBy: fixture.item.retention.deleteBy,
      evidenceSha256: digest('retention'),
      policyId: 'delete-by-expiry-or-withdrawal-v1',
      withdrawalReferenceSha256: digest(`withdrawal-${admittedAt}`),
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
    source: {
      lineageSha256: digest('lineage'),
      referenceSha256: digest('reference'),
      scopeReferenceSha256: digest('scope'),
      usageBasis: 'owner-attested-private-quality-improvement',
      usageBasisEvidenceSha256: digest('usage'),
    },
    submittedBy: 'local-operator-role',
    workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
  };
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
