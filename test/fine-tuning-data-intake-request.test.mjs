import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertFineTuningDataIntakeRequest,
  buildFineTuningDataIntakeRequest,
  FINE_TUNING_DATA_INTAKE_OWNER_ROLES,
} from '../src/core/fine-tuning-data-intake-request.mjs';
import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';
import { buildSufficientFineTuningDataSufficiencyFixture } from './helpers/fine-tuning-data-sufficiency-fixture.mjs';

const REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const EXPIRES_AT = '2026-07-30T00:00:00.000Z';

function buildCurrentSources() {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({
    assessment,
  });
  return { assessment, collectionPlan };
}

function buildCurrentRequest(overrides = {}) {
  const sources = buildCurrentSources();
  const request = buildFineTuningDataIntakeRequest({
    ...sources,
    expiresAt: EXPIRES_AT,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-operator-role',
    ...overrides,
  });
  return { ...sources, request };
}

test('current collection plan becomes one hash-bound owner review request', () => {
  const { assessment, collectionPlan, request } = buildCurrentRequest();

  assert.doesNotThrow(() =>
    assertFineTuningDataIntakeRequest(request, {
      assessment,
      collectionPlan,
      now: REQUESTED_AT,
    }));
  assert.equal(request.status, 'pending-owner-review');
  assert.equal(request.bindings.collectionPlanId, collectionPlan.id);
  assert.equal(
    request.bindings.collectionPlanHash,
    collectionPlan.planHash,
  );
  assert.equal(
    request.bindings.assessmentHash,
    assessment.assessmentHash,
  );
  assert.deepEqual(request.targets.reviewedExamples, {
    minimumAdditionalItems: 16,
    observedTrainGap: 13,
    observedValidationGap: 3,
    requiredNewMissionScopes: 6,
    splitAssignmentAuthorized: false,
    splitMustBeRebuiltAndRemeasured: true,
  });
  assert.deepEqual(request.targets.answerQualityCases, {
    countsTowardReviewedExampleMinimum: false,
    minimumAdditionalItems: 8,
  });
});

test('request keeps every owner review pending and grants no authority', () => {
  const { request } = buildCurrentRequest();

  assert.deepEqual(
    request.requiredOwnerRoles,
    FINE_TUNING_DATA_INTAKE_OWNER_ROLES,
  );
  assert.deepEqual(
    request.requiredReviews.map(({ id, status }) => ({ id, status })),
    [
      {
        id: 'private-owner-only-intake',
        status: 'pending-owner-review',
      },
      {
        id: 'source-lineage-and-usage-basis',
        status: 'pending-owner-review',
      },
      {
        id: 'consent-purpose-and-privacy-boundary',
        status: 'pending-owner-review',
      },
      {
        id: 'redaction-and-approved-training-record-gate',
        status: 'pending-owner-review',
      },
      {
        id: 'retention-and-deletion-evidence',
        status: 'pending-owner-review',
      },
    ],
  );
  assert.equal(request.actualModelTrainingExecuted, false);
  assert.equal(request.actualUserDataCollected, false);
  assert.equal(request.answerQualityCaseCollectionAuthorized, false);
  assert.equal(request.candidateTrainingReviewAllowed, false);
  assert.equal(request.collectionExecutionAuthorized, false);
  assert.equal(request.dataHandlingEvidenceRecorded, false);
  assert.equal(request.externalSubmissionAuthorized, false);
  assert.equal(request.ownerDecisionRecorded, false);
  assert.equal(request.productionReadyClaim, false);
  assert.equal(request.rawTrainingContentStored, false);
  assert.equal(request.reviewedExampleCollectionAuthorized, false);
  assert.equal(request.sourceDataIncluded, false);
  assert.equal(request.syntheticTrainingRecordsCreated, false);
  assert.equal(request.trainingAuthorized, false);
});

test('same source and request metadata produce the same request hash', () => {
  const first = buildCurrentRequest().request;
  const second = buildCurrentRequest().request;

  assert.equal(first.requestHash, second.requestHash);
  assert.deepEqual(first, second);
});

test('accepted-risk remediation and sufficient plans fail closed', () => {
  const riskAssessment =
    buildSufficientFineTuningDataSufficiencyFixture({
      acceptedRiskCount: 1,
      answerQualityCaseCount: 2,
      recordCount: 4,
    });
  const riskPlan = buildFineTuningDataCollectionPlan({
    assessment: riskAssessment,
  });
  assert.throws(
    () => buildFineTuningDataIntakeRequest({
      assessment: riskAssessment,
      collectionPlan: riskPlan,
      expiresAt: EXPIRES_AT,
      requestedAt: REQUESTED_AT,
      requestedBy: 'local-operator-role',
    }),
    /accepted-risk remediation required/,
  );

  const sufficientAssessment =
    buildSufficientFineTuningDataSufficiencyFixture();
  const sufficientPlan = buildFineTuningDataCollectionPlan({
    assessment: sufficientAssessment,
  });
  assert.throws(
    () => buildFineTuningDataIntakeRequest({
      assessment: sufficientAssessment,
      collectionPlan: sufficientPlan,
      expiresAt: EXPIRES_AT,
      requestedAt: REQUESTED_AT,
      requestedBy: 'local-operator-role',
    }),
    /reviewed data collection is not required/,
  );
});

test('unsafe requester metadata and invalid request lifetime are rejected', () => {
  const sources = buildCurrentSources();

  for (const requestedBy of [
    'operator@example.com',
    'customerId=customer-1',
    'named-operator-role',
    'sk-secret-token-1234567890',
  ]) {
    assert.throws(
      () => buildFineTuningDataIntakeRequest({
        ...sources,
        expiresAt: EXPIRES_AT,
        requestedAt: REQUESTED_AT,
        requestedBy,
      }),
      /fixed content-free local-operator-role/,
    );
  }

  assert.throws(
    () => buildFineTuningDataIntakeRequest({
      ...sources,
      expiresAt: '2026-07-30T00:00:00.001Z',
      requestedAt: REQUESTED_AT,
      requestedBy: 'local-operator-role',
    }),
    /within 7 days/,
  );
  assert.throws(
    () => buildFineTuningDataIntakeRequest({
      ...sources,
      expiresAt: REQUESTED_AT,
      requestedAt: REQUESTED_AT,
      requestedBy: 'local-operator-role',
    }),
    /within 7 days/,
  );
});

test('request is usable only from requestedAt until expiresAt', () => {
  const { assessment, collectionPlan, request } = buildCurrentRequest();

  assert.throws(
    () => assertFineTuningDataIntakeRequest(request, {
      assessment,
      collectionPlan,
      now: '2026-07-22T23:59:59.999Z',
    }),
    /not active yet/,
  );
  assert.doesNotThrow(() =>
    assertFineTuningDataIntakeRequest(request, {
      assessment,
      collectionPlan,
      now: '2026-07-29T23:59:59.999Z',
    }));
  assert.throws(
    () => assertFineTuningDataIntakeRequest(request, {
      assessment,
      collectionPlan,
      now: EXPIRES_AT,
    }),
    /request expired/,
  );
});

test('request and source plan tampering fail integrity checks', () => {
  const { assessment, collectionPlan, request } = buildCurrentRequest();
  const changedRequest = structuredClone(request);
  changedRequest.targets.reviewedExamples.minimumAdditionalItems = 15;
  assert.throws(
    () => assertFineTuningDataIntakeRequest(changedRequest, {
      assessment,
      collectionPlan,
      now: REQUESTED_AT,
    }),
    /intake request integrity/,
  );

  const changedPlan = structuredClone(collectionPlan);
  changedPlan.gaps.missionScopes.remaining = 5;
  assert.throws(
    () => assertFineTuningDataIntakeRequest(request, {
      assessment,
      collectionPlan: changedPlan,
      now: REQUESTED_AT,
    }),
    /collection plan integrity/,
  );
});
