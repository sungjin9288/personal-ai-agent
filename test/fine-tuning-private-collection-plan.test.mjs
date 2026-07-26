import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import {
  assertFineTuningPrivateCollectionPlan,
  assertFineTuningPrivateCollectionPlanRecord,
  buildFineTuningPrivateCollectionPlan,
  FINE_TUNING_PRIVATE_COLLECTION_PLAN_STEPS,
} from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const PLANNED_AT = '2026-07-23T02:00:00.000Z';
const EXPIRES_AT = '2026-07-24T00:00:00.000Z';

test('approved attestation creates only a pending private collection plan', () => {
  const sources = buildSources();
  const plan = buildFineTuningPrivateCollectionPlan({
    ...sources,
    plannedAt: PLANNED_AT,
  });

  assert.doesNotThrow(() => assertFineTuningPrivateCollectionPlan(plan, {
    ...sources,
    now: PLANNED_AT,
  }));
  assert.equal(plan.status, 'private-collection-plan-created-execution-approval-required');
  assert.equal(plan.expiresAt, EXPIRES_AT);
  assert.equal(plan.steps.length, 7);
  assert.deepEqual(
    plan.steps.map((step) => step.id),
    FINE_TUNING_PRIVATE_COLLECTION_PLAN_STEPS,
  );
  assert.equal(plan.steps.every((step) => step.status === 'pending'), true);
  assert.deepEqual(plan.targets, sources.request.targets);
  assert.equal(plan.bindings.assessmentHash, sources.assessment.assessmentHash);
  assert.equal(plan.bindings.collectionPlanHash, sources.collectionPlan.planHash);
  assert.equal(plan.bindings.requestHash, sources.request.requestHash);
  assert.equal(plan.bindings.resolutionHash, sources.resolution.resolutionHash);
  assert.equal(plan.operatorAttestationRecorded, true);
  assert.equal(plan.operatorAttestationBound, true);
  assert.equal(plan.dataHandlingEvidenceReferencesRecorded, true);
  assert.equal(plan.privateCollectionPlanAllowed, true);
  assert.equal(plan.collectionExecutionApprovalRequired, true);
  for (const field of [
    'ownerDecisionRecorded',
    'ownerIdentityVerified',
    'dataHandlingEvidenceRecorded',
    'dataHandlingEvidenceIndependentlyVerified',
    'reviewedExampleCollectionAuthorized',
    'answerQualityCaseCollectionAuthorized',
    'collectionExecutionAuthorized',
    'candidateTrainingReviewAllowed',
    'trainingAuthorized',
    'externalSubmissionAuthorized',
    'actualUserDataCollected',
    'rawTrainingContentStored',
    'sourceDataIncluded',
    'syntheticTrainingRecordsCreated',
    'actualModelTrainingExecuted',
    'productionReadyClaim',
  ]) {
    assert.equal(plan[field], false, field);
  }
  assert.equal(plan.externalProviderCalls, 'none');
});

test('same current chain and plannedAt produce one deterministic plan', () => {
  const sources = buildSources();
  assert.deepEqual(
    buildFineTuningPrivateCollectionPlan({ ...sources, plannedAt: PLANNED_AT }),
    buildFineTuningPrivateCollectionPlan({ ...sources, plannedAt: PLANNED_AT }),
  );
});

test('rejected, expired, or pre-resolution planning fails closed', () => {
  const rejected = buildSources('reject');
  assert.throws(() => buildFineTuningPrivateCollectionPlan({
    ...rejected,
    plannedAt: PLANNED_AT,
  }), /not approved/);

  const approved = buildSources();
  assert.throws(() => buildFineTuningPrivateCollectionPlan({
    ...approved,
    plannedAt: '2026-07-23T00:59:59.999Z',
  }), /cannot predate/);
  assert.throws(() => buildFineTuningPrivateCollectionPlan({
    ...approved,
    plannedAt: EXPIRES_AT,
  }), /expired/);
});

test('record and current assertions reject tampering and source drift', () => {
  const sources = buildSources();
  const plan = buildFineTuningPrivateCollectionPlan({
    ...sources,
    plannedAt: PLANNED_AT,
  });
  assert.doesNotThrow(() => assertFineTuningPrivateCollectionPlanRecord(plan));

  const tampered = structuredClone(plan);
  tampered.steps[0].status = 'completed';
  assert.throws(
    () => assertFineTuningPrivateCollectionPlanRecord(tampered),
    /steps are invalid|integrity failed/,
  );

  const inconsistent = structuredClone(plan);
  inconsistent.bindings.requestHash = 'f'.repeat(64);
  const inconsistentContent = structuredClone(inconsistent);
  delete inconsistentContent.id;
  delete inconsistentContent.planHash;
  const inconsistentHash = createHash('sha256')
    .update(JSON.stringify(inconsistentContent))
    .digest('hex');
  inconsistent.id = `fine-tuning-private-collection-plan-${inconsistentHash}`;
  inconsistent.planHash = inconsistentHash;
  assert.throws(
    () => assertFineTuningPrivateCollectionPlanRecord(inconsistent),
    /binding references are inconsistent/,
  );

  const changedRequest = structuredClone(sources.request);
  changedRequest.requestHash = 'f'.repeat(64);
  assert.throws(() => assertFineTuningPrivateCollectionPlan(plan, {
    ...sources,
    now: PLANNED_AT,
    request: changedRequest,
  }));
  assert.throws(() => assertFineTuningPrivateCollectionPlan(plan, {
    ...sources,
    now: '2026-07-23T01:59:59.999Z',
  }), /not active before plannedAt/);
  assert.doesNotThrow(() => assertFineTuningPrivateCollectionPlan(plan, {
    ...sources,
    now: PLANNED_AT,
  }));
  assert.throws(() => assertFineTuningPrivateCollectionPlan(plan, {
    ...sources,
    now: EXPIRES_AT,
  }), /expired/);
});

function buildSources(decision = 'approve') {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const request = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: EXPIRES_AT,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-operator-role',
  });
  const resolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request,
    resolvedAt: RESOLVED_AT,
    reviews: request.requiredReviews.map((review, index) => ({
      decision: index === 0 ? decision : 'approve',
      decidedAt: RESOLVED_AT,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Operator attestation recorded.',
    })),
  });
  return { assessment, collectionPlan, request, resolution };
}
