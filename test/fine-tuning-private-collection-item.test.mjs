import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
  buildFineTuningPrivateCollectionItem,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import { buildFineTuningPrivateCollectionItemAdmission } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const TIMES = {
  admittedAt: '2026-07-23T06:00:00.000Z',
  expiresAt: '2026-07-24T00:00:00.000Z',
  storedAt: '2026-07-23T07:00:00.000Z',
};

test('sanitized synthetic items bind both lanes with nineteen hashes and stored-content authority only', () => {
  const sources = buildSources();
  for (const [lane, marker] of [['reviewed-examples', 'a'], ['answer-quality-cases', 'b']]) {
    const admission = buildAdmission(sources, lane, marker, 'not-required-owner-authored');
    const item = buildFineTuningPrivateCollectionItem({
      admission,
      content: buildContent(admission, 'curated-synthetic', marker),
      storedAt: TIMES.storedAt,
    });
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItem(item, {
      ...sources,
      admission,
      now: TIMES.storedAt,
    }));
    assert.equal(Object.keys(item.bindings).length, 19);
    assert.equal(
      item.bindings.contentHash,
      createHash('sha256').update(JSON.stringify(item.example)).digest('hex'),
    );
    assert.equal(item.lane, lane);
    assert.equal(item.actualUserDataCollected, false);
    assert.equal(item.collectionStarted, true);
    assert.equal(item.collectionContentStored, true);
    assert.equal(item.collectionEnvelopeCount, 1);
    assert.equal(item.collectionItemCount, 1);
    assert.equal(item.sanitizedContentStored, true);
    assert.equal(item.workspaceContainsCollectionData, true);
    assert.equal(item.workspaceMutationPerformed, true);
    for (const field of [
      'approvedTrainingRecordCreated',
      'answerQualityCaseCreated',
      'candidateTrainingReviewAllowed',
      'trainingAuthorized',
      'externalSubmissionAuthorized',
      'actualModelTrainingExecuted',
      'productionReadyClaim',
      'deidentificationIndependentlyVerified',
      'dataHandlingEvidenceIndependentlyVerified',
      'consentIndependentlyVerified',
      'retentionPolicyIndependentlyVerified',
      'ownerDecisionRecorded',
    ]) {
      assert.equal(item[field], false, field);
    }
  }
});

test('origin and consent matrix distinguishes synthetic, owner-authored, and consented user data', () => {
  const sources = buildSources();
  for (const [origin, consent, actualUserDataCollected] of [
    ['curated-synthetic', 'not-required-owner-authored', false],
    ['owner-authored', 'not-required-owner-authored', true],
    ['consented-deidentified-user-data', 'recorded', true],
  ]) {
    const admission = buildAdmission(sources, 'reviewed-examples', origin[0], consent);
    const item = buildFineTuningPrivateCollectionItem({
      admission,
      content: buildContent(admission, origin, origin[0]),
      storedAt: TIMES.storedAt,
    });
    assert.equal(item.actualUserDataCollected, actualUserDataCollected);
    assert.equal(item.sourceDataIncluded, origin === 'consented-deidentified-user-data');
  }
  const admission = buildAdmission(sources, 'reviewed-examples', 'x', 'recorded');
  assert.throws(() => buildFineTuningPrivateCollectionItem({
    admission,
    content: buildContent(admission, 'owner-authored', 'x'),
    storedAt: TIMES.storedAt,
  }), /consent matrix/);
});

test('content safety, size limits, controls, admission redaction, and expiry fail closed', () => {
  const sources = buildSources();
  const admission = buildAdmission(sources, 'reviewed-examples', 'z', 'not-required-owner-authored');
  for (const value of [
    '{"email":"person@example.com"}',
    'contact person@example.com',
    'Bearer token-token-token-token-token-token',
    'customerId: 1234',
    'hello\u0000world',
    'left\u202Eright',
    'zero\u200Bwidth',
    'byte\uFEFForder',
    '+82 10 1234 5678',
  ]) {
    const content = buildContent(admission, 'curated-synthetic', 'z');
    content.example.instruction = value;
    assert.throws(() => buildFineTuningPrivateCollectionItem({
      admission,
      content,
      storedAt: TIMES.storedAt,
    }), /secret|customer|control/i);
  }
  const oversized = buildContent(admission, 'curated-synthetic', 'z');
  oversized.example.response = 'x'.repeat(16 * 1024 + 1);
  assert.throws(() => buildFineTuningPrivateCollectionItem({
    admission,
    content: oversized,
    storedAt: TIMES.storedAt,
  }), /size/);
  const mismatched = buildContent(admission, 'curated-synthetic', 'z');
  mismatched.sanitization.evidenceSha256 = 'f'.repeat(64);
  assert.throws(() => buildFineTuningPrivateCollectionItem({
    admission,
    content: mismatched,
    storedAt: TIMES.storedAt,
  }), /redaction/);
  assert.throws(() => buildFineTuningPrivateCollectionItem({
    admission,
    content: buildContent(admission, 'curated-synthetic', 'z'),
    storedAt: admission.envelope.retention.deleteBy,
  }), /expired/);

  for (const reviewedAt of [
    '2026-07-23T05:59:59.999Z',
    '2026-07-23T07:00:00.001Z',
  ]) {
    const content = buildContent(admission, 'curated-synthetic', 'z');
    content.sanitization.reviewedAt = reviewedAt;
    assert.throws(() => buildFineTuningPrivateCollectionItem({
      admission,
      content,
      storedAt: TIMES.storedAt,
    }), /sanitization timing/);
  }
});

test('record integrity and current-chain binding reject semantic drift', () => {
  const sources = buildSources();
  const admission = buildAdmission(sources, 'reviewed-examples', 'q', 'not-required-owner-authored');
  const item = buildFineTuningPrivateCollectionItem({
    admission,
    content: buildContent(admission, 'curated-synthetic', 'q'),
    storedAt: TIMES.storedAt,
  });
  const tampered = structuredClone(item);
  tampered.trainingAuthorized = true;
  assert.throws(() => assertFineTuningPrivateCollectionItemRecord(tampered), /integrity failed/);
  const drifted = structuredClone(sources);
  drifted.workspace = structuredClone(sources.workspace);
  drifted.workspace.bindings.assessmentHash = 'f'.repeat(64);
  assert.throws(() => assertFineTuningPrivateCollectionItem(item, {
    ...drifted,
    admission,
    now: TIMES.storedAt,
  }), /current F1 chain|integrity|does not match/);
});

function buildSources() {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: TIMES.expiresAt,
    requestedAt: '2026-07-23T00:00:00.000Z',
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: '2026-07-23T01:00:00.000Z',
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve', decidedAt: '2026-07-23T01:00:00.000Z', evidenceSha256: String(index + 1).repeat(64), id: review.id, ownerRole: review.ownerRole, reason: 'Synthetic attestation.',
    })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment, collectionPlan, plannedAt: '2026-07-23T02:00:00.000Z', request: intakeRequest, resolution: intakeResolution,
  });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment, collectionPlan, intakeRequest, intakeResolution, privateCollectionPlan, requestedAt: '2026-07-23T03:00:00.000Z', requestedBy: 'local-operator-role',
  });
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment, collectionPlan, executionRequest, intakeRequest, intakeResolution, privateCollectionPlan, resolvedAt: '2026-07-23T04:00:00.000Z',
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: 'approve', decidedAt: '2026-07-23T04:00:00.000Z', evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64), id: review.id, ownerRole: review.ownerRole, reason: 'Synthetic collection review.',
    })),
  });
  const base = { assessment, collectionPlan, executionRequest, executionResolution, intakeRequest, intakeResolution, privateCollectionPlan };
  return {
    ...base,
    workspace: buildFineTuningPrivateCollectionWorkspace({ ...base, preparedAt: '2026-07-23T05:00:00.000Z' }),
  };
}

function buildAdmission(sources, lane, marker, consentStatus) {
  return buildFineTuningPrivateCollectionItemAdmission({
    ...sources,
    admittedAt: TIMES.admittedAt,
    envelope: {
      lane,
      privacy: {
        consentStatus,
        evidenceSha256: digest(marker, 1),
        purpose: 'private-answer-quality-improvement-and-readiness-review',
      },
      redaction: { evidenceSha256: digest(marker, 2), policyId: 'deidentify-before-content-admission-v1' },
      retention: {
        deleteBy: '2026-07-23T23:00:00.000Z', evidenceSha256: digest(marker, 3), policyId: 'delete-by-expiry-or-withdrawal-v1', withdrawalReferenceSha256: digest(marker, 4),
      },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
      source: {
        lineageSha256: digest(marker, 5), referenceSha256: digest(marker, 6), scopeReferenceSha256: digest(marker, 7), usageBasis: 'owner-attested-private-quality-improvement', usageBasisEvidenceSha256: digest(marker, 8),
      },
      submittedBy: 'local-operator-role',
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
    },
  });
}

function buildContent(admission, dataOrigin, marker) {
  return {
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1',
    admission: { id: admission.id, admissionHash: admission.admissionHash },
    dataOrigin,
    example: { instruction: `Explain synthetic case ${marker}.`, response: `Synthetic response ${marker}.` },
    sanitization: {
      policyId: 'deidentify-before-content-admission-v1', evidenceSha256: admission.envelope.redaction.evidenceSha256, methodVersion: 'private-sanitized-training-text-v1', reviewedAt: TIMES.storedAt, reviewerRole: 'quality-reviewer', directIdentifiersRemoved: true, freeTextReviewed: true, secretsScanned: true, reidentificationProhibited: true,
    },
  };
}

function digest(marker, offset) {
  return createHash('sha256').update(`${marker}-${offset}`).digest('hex');
}
