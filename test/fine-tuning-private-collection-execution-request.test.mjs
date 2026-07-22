import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import {
  assertFineTuningPrivateCollectionExecutionRequest,
  assertFineTuningPrivateCollectionExecutionRequestRecord,
  buildFineTuningPrivateCollectionExecutionRequest,
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS,
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES,
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS,
} from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const INTAKE_REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const PLANNED_AT = '2026-07-23T02:00:00.000Z';
const EXECUTION_REQUESTED_AT = '2026-07-23T03:00:00.000Z';
const EXPIRES_AT = '2026-07-24T00:00:00.000Z';

test('private plan creates only a pending collection execution approval request', () => {
  const sources = buildSources();
  const request = buildExecutionRequest(sources);

  assert.doesNotThrow(() =>
    assertFineTuningPrivateCollectionExecutionRequest(request, {
      ...sources,
      now: EXECUTION_REQUESTED_AT,
    }));
  assert.equal(
    request.status,
    'pending-private-collection-execution-owner-review',
  );
  assert.equal(request.requestedBy, 'local-operator-role');
  assert.equal(request.requestedAt, EXECUTION_REQUESTED_AT);
  assert.equal(request.expiresAt, sources.privateCollectionPlan.expiresAt);
  assert.deepEqual(
    request.requestedActions,
    FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS,
  );
  assert.deepEqual(
    request.requiredOwnerRoles,
    FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES,
  );
  assert.deepEqual(
    request.requiredReviews,
    FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS.map(
      (review) => ({ ...review, status: 'pending-owner-review' }),
    ),
  );
  assert.deepEqual(request.targets, sources.privateCollectionPlan.targets);
  assert.equal(request.targets.reviewedExamples.minimumAdditionalItems, 16);
  assert.equal(request.targets.reviewedExamples.requiredNewMissionScopes, 6);
  assert.equal(request.targets.reviewedExamples.observedTrainGap, 13);
  assert.equal(request.targets.reviewedExamples.observedValidationGap, 3);
  assert.equal(request.targets.answerQualityCases.minimumAdditionalItems, 8);
  assert.equal(request.bindings.assessmentHash, sources.assessment.assessmentHash);
  assert.equal(request.bindings.collectionPlanHash, sources.collectionPlan.planHash);
  assert.equal(request.bindings.requestHash, sources.intakeRequest.requestHash);
  assert.equal(request.bindings.resolutionHash, sources.intakeResolution.resolutionHash);
  assert.equal(
    request.bindings.privateCollectionPlanHash,
    sources.privateCollectionPlan.planHash,
  );
  assert.equal(request.intakeRequest.id, sources.intakeRequest.id);
  assert.equal(request.intakeResolution.id, sources.intakeResolution.id);
  assert.equal(request.privateCollectionPlan.id, sources.privateCollectionPlan.id);
  for (const field of [
    'operatorAttestationRecorded',
    'operatorAttestationBound',
    'dataHandlingEvidenceReferencesRecorded',
    'privateCollectionPlanAllowed',
    'collectionExecutionApprovalRequestCreated',
    'collectionExecutionApprovalRequired',
  ]) {
    assert.equal(request[field], true, field);
  }
  for (const field of [
    'ownerDecisionRecorded',
    'ownerIdentityVerified',
    'dataHandlingEvidenceRecorded',
    'dataHandlingEvidenceIndependentlyVerified',
    'privateCollectionWorkspaceCreationAuthorized',
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
    assert.equal(request[field], false, field);
  }
  assert.equal(request.externalProviderCalls, 'none');
});

test('same current chain and requestedAt produce one deterministic request', () => {
  const sources = buildSources();
  assert.deepEqual(
    buildExecutionRequest(sources),
    buildExecutionRequest(sources),
  );
});

test('request time, expiry, and requester role fail closed', () => {
  const sources = buildSources();
  assert.throws(
    () => buildExecutionRequest(sources, {
      requestedAt: '2026-07-23T01:59:59.999Z',
    }),
    /not active before plannedAt|cannot predate/,
  );
  assert.throws(
    () => buildExecutionRequest(sources, { requestedAt: EXPIRES_AT }),
    /expired/,
  );
  assert.throws(
    () => buildExecutionRequest(sources, { requestedBy: ' local-operator-role' }),
    /must be local-operator-role/,
  );

  const rejectedResolution = resolveFineTuningDataIntakeRequest({
    assessment: sources.assessment,
    collectionPlan: sources.collectionPlan,
    request: sources.intakeRequest,
    resolvedAt: RESOLVED_AT,
    reviews: sources.intakeRequest.requiredReviews.map((review, index) => ({
      decision: index === 0 ? 'reject' : 'approve',
      decidedAt: RESOLVED_AT,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Operator attestation recorded.',
    })),
  });
  assert.throws(
    () => buildExecutionRequest({
      ...sources,
      intakeResolution: rejectedResolution,
    }),
    /not approved|current F1 chain/,
  );
});

test('record and current assertions reject tampering and chain drift', () => {
  const sources = buildSources();
  const request = buildExecutionRequest(sources);
  assert.doesNotThrow(() =>
    assertFineTuningPrivateCollectionExecutionRequestRecord(request));

  const tampered = structuredClone(request);
  tampered.requiredReviews[0].status = 'approved';
  assert.throws(
    () => assertFineTuningPrivateCollectionExecutionRequestRecord(tampered),
    /reviews are invalid|integrity failed/,
  );

  const reorderedActions = structuredClone(request);
  [
    reorderedActions.requestedActions[0],
    reorderedActions.requestedActions[1],
  ] = [
    reorderedActions.requestedActions[1],
    reorderedActions.requestedActions[0],
  ];
  rehashRequest(reorderedActions);
  assert.throws(
    () => assertFineTuningPrivateCollectionExecutionRequestRecord(
      reorderedActions,
    ),
    /actions are invalid/,
  );

  const extraField = structuredClone(request);
  extraField.collectionExecutionApproved = true;
  rehashRequest(extraField);
  assert.throws(
    () => assertFineTuningPrivateCollectionExecutionRequestRecord(extraField),
    /integrity failed/,
  );

  const inconsistent = structuredClone(request);
  inconsistent.bindings.privateCollectionPlanHash = 'f'.repeat(64);
  const inconsistentContent = structuredClone(inconsistent);
  delete inconsistentContent.id;
  delete inconsistentContent.requestHash;
  const inconsistentHash = createHash('sha256')
    .update(JSON.stringify(inconsistentContent))
    .digest('hex');
  inconsistent.id =
    `fine-tuning-private-collection-execution-request-${inconsistentHash}`;
  inconsistent.requestHash = inconsistentHash;
  assert.throws(
    () => assertFineTuningPrivateCollectionExecutionRequestRecord(inconsistent),
    /references are inconsistent/,
  );

  const changedPlan = structuredClone(sources.privateCollectionPlan);
  changedPlan.planHash = 'f'.repeat(64);
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionRequest(request, {
      ...sources,
      now: EXECUTION_REQUESTED_AT,
      privateCollectionPlan: changedPlan,
    }));
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionRequest(request, {
      ...sources,
      now: '2026-07-23T02:59:59.999Z',
    }), /not active yet/);
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionRequest(request, {
      ...sources,
      now: EXPIRES_AT,
    }), /expired/);
});

test('published execution request constants are immutable', () => {
  assert.equal(
    Object.isFrozen(FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS),
    true,
  );
  assert.equal(
    Object.isFrozen(FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES),
    true,
  );
  assert.equal(
    Object.isFrozen(FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS),
    true,
  );
  assert.equal(
    FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS.every(
      (review) => Object.isFrozen(review),
    ),
    true,
  );
});

function buildExecutionRequest(sources, {
  requestedAt = EXECUTION_REQUESTED_AT,
  requestedBy = 'local-operator-role',
} = {}) {
  return buildFineTuningPrivateCollectionExecutionRequest({
    ...sources,
    requestedAt,
    requestedBy,
  });
}

function rehashRequest(request) {
  const content = structuredClone(request);
  delete content.id;
  delete content.requestHash;
  const requestHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  request.id =
    `fine-tuning-private-collection-execution-request-${requestHash}`;
  request.requestHash = requestHash;
}

function buildSources() {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: EXPIRES_AT,
    requestedAt: INTAKE_REQUESTED_AT,
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: RESOLVED_AT,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: RESOLVED_AT,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Operator attestation recorded.',
    })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt: PLANNED_AT,
    request: intakeRequest,
    resolution: intakeResolution,
  });
  return {
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
}
