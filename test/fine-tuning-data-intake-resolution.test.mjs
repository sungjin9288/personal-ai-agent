import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertApprovedFineTuningDataIntakeResolution,
  assertFineTuningDataIntakeResolution,
  resolveFineTuningDataIntakeRequest,
} from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const EXPIRES_AT = '2026-07-30T00:00:00.000Z';

function buildSources() {
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
  return { assessment, collectionPlan, request };
}

function buildReviews(request, decision = 'approve') {
  return request.requiredReviews.map((review, index) => ({
    decision: index === 0 ? decision : 'approve',
    decidedAt: RESOLVED_AT,
    evidenceSha256: String(index + 1).repeat(64),
    id: review.id,
    ownerRole: review.ownerRole,
    reason: 'Private owner review recorded.',
  }));
}

test('all exact owner approvals permit only private collection planning', () => {
  const sources = buildSources();
  const resolution = resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt: RESOLVED_AT,
    reviews: buildReviews(sources.request),
  });

  assert.doesNotThrow(() => assertApprovedFineTuningDataIntakeResolution(
    resolution,
    { ...sources, now: RESOLVED_AT, request: sources.request },
  ));
  assert.equal(resolution.status, 'approved-for-private-collection-planning');
  assert.equal(resolution.privateCollectionPlanAllowed, true);
  assert.equal(resolution.dataHandlingEvidenceRecorded, false);
  assert.equal(resolution.dataHandlingEvidenceReferencesRecorded, true);
  assert.equal(resolution.dataHandlingEvidenceIndependentlyVerified, false);
  assert.equal(resolution.operatorAttestationRecorded, true);
  assert.equal(resolution.ownerDecisionRecorded, false);
  assert.equal(resolution.ownerIdentityVerified, false);
  for (const field of [
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
    assert.equal(resolution[field], false);
  }
  assert.equal(resolution.externalProviderCalls, 'none');
  assert.equal(JSON.stringify(resolution).includes('Private owner review recorded.'), false);
});

test('one rejection denies private collection planning', () => {
  const sources = buildSources();
  const resolution = resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt: RESOLVED_AT,
    reviews: buildReviews(sources.request, 'reject'),
  });

  assert.equal(resolution.status, 'rejected');
  assert.equal(resolution.privateCollectionPlanAllowed, false);
  assert.throws(() => assertApprovedFineTuningDataIntakeResolution(
    resolution,
    { ...sources, now: RESOLVED_AT, request: sources.request },
  ), /not approved/);
});

test('approved resolution requires an explicit current time and cannot outlive its request', () => {
  const sources = buildSources();
  const resolution = resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt: RESOLVED_AT,
    reviews: buildReviews(sources.request),
  });
  assert.throws(() => assertApprovedFineTuningDataIntakeResolution(
    resolution,
    { ...sources, request: sources.request },
  ), /explicit current time/);
  assert.throws(() => assertApprovedFineTuningDataIntakeResolution(
    resolution,
    { ...sources, now: EXPIRES_AT, request: sources.request },
  ), /expired/);
});

test('integrity rejects resolution and request tampering', () => {
  const sources = buildSources();
  const resolution = resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt: RESOLVED_AT,
    reviews: buildReviews(sources.request),
  });
  const tampered = structuredClone(resolution);
  tampered.reviews[0].reasonHash = 'f'.repeat(64);
  assert.throws(() => assertFineTuningDataIntakeResolution(
    tampered,
    { ...sources, now: RESOLVED_AT, request: sources.request },
  ), /integrity failed/);
  const changedRequest = structuredClone(sources.request);
  changedRequest.requestHash = '0'.repeat(64);
  assert.throws(() => assertFineTuningDataIntakeResolution(
    resolution,
    { ...sources, now: RESOLVED_AT, request: changedRequest },
  ), /bind the exact request/);

  const changedPlan = structuredClone(sources.collectionPlan);
  changedPlan.gaps.missionScopes.remaining = 5;
  assert.throws(() => resolveFineTuningDataIntakeRequest({
    ...sources,
    collectionPlan: changedPlan,
    resolvedAt: RESOLVED_AT,
    reviews: buildReviews(sources.request),
  }), /collection plan integrity/);
});

test('stale request and invalid review lifecycles fail closed', () => {
  const sources = buildSources();
  assert.throws(() => resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt: EXPIRES_AT,
    reviews: buildReviews(sources.request),
  }), /expired/);

  for (const mutate of [
    (reviews) => reviews.pop(),
    (reviews) => { reviews[1] = { ...reviews[0] }; },
    (reviews) => reviews.reverse(),
    (reviews) => { reviews[0].ownerRole = 'wrong-role'; },
    (reviews) => { reviews[0].decision = 'defer'; },
    (reviews) => { reviews[0].evidenceSha256 = 'not-a-hash'; },
    (reviews) => { reviews[0].evidenceSha256 = ` ${'a'.repeat(64)} `; },
    (reviews) => { reviews[0].decidedAt = '2026-07-22T23:59:59.999Z'; },
    (reviews) => { reviews[0].decidedAt = '2026-07-23T01:00:00.001Z'; },
    (reviews) => { reviews[0].decidedAt = EXPIRES_AT; },
    (reviews) => { reviews[0].reason = 'customerEmail=private@example.com'; },
    (reviews) => { reviews[0].extra = true; },
  ]) {
    const reviews = buildReviews(sources.request);
    mutate(reviews);
    assert.throws(() => resolveFineTuningDataIntakeRequest({
      ...sources,
      resolvedAt: RESOLVED_AT,
      reviews,
    }));
  }
});
