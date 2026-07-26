import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import {
  assertApprovedFineTuningPrivateCollectionExecutionResolution,
  assertFineTuningPrivateCollectionExecutionResolution,
  resolveFineTuningPrivateCollectionExecutionRequest,
} from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const INTAKE_REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const INTAKE_RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const PLANNED_AT = '2026-07-23T02:00:00.000Z';
const EXECUTION_REQUESTED_AT = '2026-07-23T03:00:00.000Z';
const EXECUTION_RESOLVED_AT = '2026-07-23T04:00:00.000Z';
const EXPIRES_AT = '2026-07-24T00:00:00.000Z';

test('unanimous reviews authorize only bounded private collection execution', () => {
  const sources = buildSources();
  const resolution = buildResolution(sources);

  assert.doesNotThrow(() =>
    assertApprovedFineTuningPrivateCollectionExecutionResolution(
      resolution,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ));
  assert.equal(
    resolution.status,
    'approved-for-bounded-private-collection-execution',
  );
  assert.equal(resolution.expiresAt, sources.executionRequest.expiresAt);
  assert.deepEqual(
    resolution.requestedActions,
    sources.executionRequest.requestedActions,
  );
  assert.deepEqual(resolution.targets, sources.executionRequest.targets);
  assert.equal(resolution.reviews.length, 5);
  assert.deepEqual(
    Object.keys(resolution.bindings),
    [
      'assessmentHash',
      'collectionPlanHash',
      'datasetHash',
      'datasetManifestHash',
      'evaluationManifestHash',
      'executionRequestHash',
      'policyHash',
      'privateCollectionPlanHash',
      'readinessHash',
      'requestHash',
      'resolutionHash',
      'trainSha256',
      'validationSha256',
    ],
  );
  assert.equal(
    resolution.bindings.executionRequestHash,
    sources.executionRequest.requestHash,
  );
  for (const review of resolution.reviews) {
    assert.deepEqual(Object.keys(review), [
      'decision',
      'decidedAt',
      'evidenceSha256',
      'id',
      'ownerRole',
      'reasonHash',
    ]);
    assert.match(review.reasonHash, /^[a-f0-9]{64}$/u);
    assert.equal('reason' in review, false);
  }
  assert.equal(resolution.collectionExecutionApprovalResolved, true);
  for (const field of [
    'privateCollectionWorkspaceCreationAuthorized',
    'reviewedExampleCollectionAuthorized',
    'answerQualityCaseCollectionAuthorized',
    'collectionExecutionAuthorized',
  ]) {
    assert.equal(resolution[field], true, field);
  }
  for (const field of [
    'ownerDecisionRecorded',
    'ownerIdentityVerified',
    'dataHandlingEvidenceRecorded',
    'dataHandlingEvidenceIndependentlyVerified',
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
    assert.equal(resolution[field], false, field);
  }
  assert.equal(resolution.externalProviderCalls, 'none');
  assert.equal(
    JSON.stringify(resolution).includes('Bounded collection review.'),
    false,
  );
});

test('one rejection records no workspace or collection authority', () => {
  const sources = buildSources();
  const resolution = buildResolution(sources, 'reject');

  assert.equal(resolution.status, 'rejected');
  for (const field of [
    'privateCollectionWorkspaceCreationAuthorized',
    'reviewedExampleCollectionAuthorized',
    'answerQualityCaseCollectionAuthorized',
    'collectionExecutionAuthorized',
  ]) {
    assert.equal(resolution[field], false, field);
  }
  assert.throws(
    () => assertApprovedFineTuningPrivateCollectionExecutionResolution(
      resolution,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ),
    /not approved/,
  );
});

test('same request, reviews, and resolution time produce one deterministic record', () => {
  const sources = buildSources();
  assert.deepEqual(buildResolution(sources), buildResolution(sources));
});

test('review order, time, evidence, reason, and exact fields fail closed', () => {
  const sources = buildSources();
  for (const mutate of [
    (reviews) => reviews.pop(),
    (reviews) => reviews.reverse(),
    (reviews) => { reviews[1] = { ...reviews[0] }; },
    (reviews) => { reviews[0].decision = 'defer'; },
    (reviews) => { reviews[0].ownerRole = 'wrong-role'; },
    (reviews) => { reviews[0].evidenceSha256 = 'not-a-hash'; },
    (reviews) => { reviews[0].decidedAt = 'not-a-timestamp'; },
    (reviews) => { reviews[0].decidedAt = '2026-07-23T02:59:59.999Z'; },
    (reviews) => { reviews[0].decidedAt = '2026-07-23T04:00:00.001Z'; },
    (reviews) => { reviews[0].decidedAt = EXPIRES_AT; },
    (reviews) => { reviews[0].reason = 'customerEmail=private@example.com'; },
    (reviews) => { reviews[0].extra = true; },
  ]) {
    const reviews = buildReviews(sources.executionRequest);
    mutate(reviews);
    assert.throws(() =>
      resolveFineTuningPrivateCollectionExecutionRequest({
        ...sources,
        resolvedAt: EXECUTION_RESOLVED_AT,
        reviews,
      }));
  }
});

test('expiry, record tampering, and current F1 chain drift fail closed', () => {
  const sources = buildSources();
  const resolution = buildResolution(sources);

  assert.throws(
    () => assertApprovedFineTuningPrivateCollectionExecutionResolution(
      resolution,
      sources,
    ),
    /explicit current time/,
  );
  assert.throws(
    () => assertApprovedFineTuningPrivateCollectionExecutionResolution(
      resolution,
      { ...sources, now: '2026-07-23T03:59:59.999Z' },
    ),
    /not active yet/,
  );
  assert.throws(
    () => assertApprovedFineTuningPrivateCollectionExecutionResolution(
      resolution,
      { ...sources, now: EXPIRES_AT },
    ),
    /expired/,
  );

  const tamperedAction = structuredClone(resolution);
  tamperedAction.requestedActions.reverse();
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionResolution(
      tamperedAction,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ),
    /actions are invalid|integrity failed/,
  );

  const tamperedFlag = structuredClone(resolution);
  tamperedFlag.trainingAuthorized = true;
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionResolution(
      tamperedFlag,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ),
    /integrity failed/,
  );

  const rehashedAuthorityEscalation = buildResolution(sources, 'reject');
  rehashedAuthorityEscalation.collectionExecutionAuthorized = true;
  rehashResolution(rehashedAuthorityEscalation);
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionResolution(
      rehashedAuthorityEscalation,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ),
    /integrity failed/,
  );

  const driftedPlan = structuredClone(sources.privateCollectionPlan);
  driftedPlan.targets.reviewedExamples.requiredNewMissionScopes = 5;
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionResolution(
      resolution,
      {
        ...sources,
        now: EXECUTION_RESOLVED_AT,
        privateCollectionPlan: driftedPlan,
      },
    ),
    /integrity|current F1 chain|targets are invalid/,
  );

  const extraField = structuredClone(resolution);
  extraField.unexpected = true;
  assert.throws(() =>
    assertFineTuningPrivateCollectionExecutionResolution(
      extraField,
      { ...sources, now: EXECUTION_RESOLVED_AT },
    ),
    /integrity failed/,
  );
});

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
    resolvedAt: INTAKE_RESOLVED_AT,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: INTAKE_RESOLVED_AT,
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
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: EXECUTION_REQUESTED_AT,
    requestedBy: 'local-operator-role',
  });
  return {
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
}

function buildReviews(executionRequest, firstDecision = 'approve') {
  const hashes = ['a', 'b', 'c', 'd', 'e'];
  return executionRequest.requiredReviews.map((review, index) => ({
    decision: index === 0 ? firstDecision : 'approve',
    decidedAt: EXECUTION_RESOLVED_AT,
    evidenceSha256: hashes[index].repeat(64),
    id: review.id,
    ownerRole: review.ownerRole,
    reason: 'Bounded collection review.',
  }));
}

function buildResolution(sources, firstDecision = 'approve') {
  return resolveFineTuningPrivateCollectionExecutionRequest({
    ...sources,
    resolvedAt: EXECUTION_RESOLVED_AT,
    reviews: buildReviews(sources.executionRequest, firstDecision),
  });
}

function rehashResolution(resolution) {
  const content = structuredClone(resolution);
  delete content.id;
  delete content.resolutionHash;
  const resolutionHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  resolution.id =
    `fine-tuning-private-collection-execution-resolution-${resolutionHash}`;
  resolution.resolutionHash = resolutionHash;
}
