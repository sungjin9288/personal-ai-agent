import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
  buildFineTuningPrivateCollectionWorkspace,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const INTAKE_REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const INTAKE_RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const PLANNED_AT = '2026-07-23T02:00:00.000Z';
const EXECUTION_REQUESTED_AT = '2026-07-23T03:00:00.000Z';
const EXECUTION_RESOLVED_AT = '2026-07-23T04:00:00.000Z';
const PREPARED_AT = '2026-07-23T05:00:00.000Z';
const EXPIRES_AT = '2026-07-24T00:00:00.000Z';

test('approved resolution prepares an empty two-lane private workspace record', () => {
  const sources = buildSources();
  const workspace = buildWorkspace(sources);

  assert.doesNotThrow(() =>
    assertFineTuningPrivateCollectionWorkspace(workspace, {
      ...sources,
      now: PREPARED_AT,
    }));
  assert.equal(
    workspace.status,
    'private-collection-workspace-prepared-collection-not-started',
  );
  assert.equal(workspace.privateCollectionWorkspacePrepared, true);
  assert.equal(workspace.collectionStarted, false);
  assert.equal(workspace.collectionItemCount, 0);
  assert.equal(workspace.workspaceContainsCollectionData, false);
  assert.equal(workspace.workspacePathStored, false);
  assert.equal(workspace.expiresAt, sources.executionResolution.expiresAt);
  assert.equal(Object.keys(workspace.bindings).length, 14);
  assert.equal(
    workspace.bindings.executionResolutionHash,
    sources.executionResolution.resolutionHash,
  );
  assert.deepEqual(workspace.executionRequest, {
    id: sources.executionRequest.id,
    requestHash: sources.executionRequest.requestHash,
  });
  assert.deepEqual(workspace.lanes, [
    {
      directory: 'reviewed-examples',
      id: 'reviewed-examples',
      itemCount: 0,
    },
    {
      directory: 'answer-quality-cases',
      id: 'answer-quality-cases',
      itemCount: 0,
    },
  ]);
  assert.deepEqual(
    workspace.requestedActions,
    sources.executionResolution.requestedActions,
  );
  assert.deepEqual(workspace.targets, sources.executionResolution.targets);
  for (const field of [
    'privateCollectionWorkspaceCreationAuthorized',
    'reviewedExampleCollectionAuthorized',
    'answerQualityCaseCollectionAuthorized',
    'collectionExecutionAuthorized',
  ]) {
    assert.equal(workspace[field], true, field);
  }
  for (const field of [
    'ownerDecisionRecorded',
    'ownerIdentityVerified',
    'dataHandlingEvidenceRecorded',
    'dataHandlingEvidenceIndependentlyVerified',
    'actualUserDataCollected',
    'rawTrainingContentStored',
    'sourceDataIncluded',
    'syntheticTrainingRecordsCreated',
    'candidateTrainingReviewAllowed',
    'trainingAuthorized',
    'externalSubmissionAuthorized',
    'actualModelTrainingExecuted',
    'productionReadyClaim',
  ]) {
    assert.equal(workspace[field], false, field);
  }
  assert.equal(workspace.externalProviderCalls, 'none');
  assert.equal(Object.hasOwn(workspace, 'workspacePath'), false);
});

test('record integrity and current F1.1-F1.7 revalidation reject drift', () => {
  const sources = buildSources();
  const workspace = buildWorkspace(sources);

  const tamperedLane = structuredClone(workspace);
  tamperedLane.lanes[0].itemCount = 1;
  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspaceRecord(tamperedLane),
    /lanes are invalid|integrity failed/,
  );

  const tamperedAuthority = structuredClone(workspace);
  tamperedAuthority.trainingAuthorized = true;
  rehashWorkspace(tamperedAuthority);
  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspaceRecord(tamperedAuthority),
    /integrity failed/,
  );

  const extraField = structuredClone(workspace);
  extraField.unexpected = true;
  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspaceRecord(extraField),
    /integrity failed/,
  );

  const rehashedBinding = structuredClone(workspace);
  rehashedBinding.bindings.assessmentHash = 'f'.repeat(64);
  rehashWorkspace(rehashedBinding);
  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspace(rehashedBinding, {
      ...sources,
      now: PREPARED_AT,
    }),
    /current F1 chain|does not match|integrity/,
  );

  const driftedRequest = structuredClone(sources.executionRequest);
  driftedRequest.targets.reviewedExamples.minimumAdditionalItems = 15;
  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspace(workspace, {
      ...sources,
      executionRequest: driftedRequest,
      now: PREPARED_AT,
    }),
    /integrity|current F1 chain|targets are invalid/,
  );

  assert.throws(
    () => assertFineTuningPrivateCollectionWorkspace(workspace, {
      ...sources,
      now: EXPIRES_AT,
    }),
    /expired/,
  );

  assert.throws(
    () => buildFineTuningPrivateCollectionWorkspace({
      ...sources,
      preparedAt: '2026-07-23T03:30:00.000Z',
    }),
    /not active yet/,
  );
});

test('a rejected F1.7 decision cannot create a workspace record', () => {
  const sources = buildSources('reject');
  assert.throws(
    () => buildFineTuningPrivateCollectionWorkspace({
      ...sources,
      preparedAt: PREPARED_AT,
    }),
    /not approved/,
  );
});

function buildSources(firstDecision = 'approve') {
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
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: EXECUTION_RESOLVED_AT,
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: index === 0 ? firstDecision : 'approve',
      decidedAt: EXECUTION_RESOLVED_AT,
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Bounded private collection review.',
    })),
  });
  return {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
}

function buildWorkspace(sources) {
  return buildFineTuningPrivateCollectionWorkspace({
    ...sources,
    preparedAt: PREPARED_AT,
  });
}

function rehashWorkspace(workspace) {
  const content = structuredClone(workspace);
  delete content.id;
  delete content.workspaceHash;
  const workspaceHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  workspace.id = `fine-tuning-private-collection-workspace-${workspaceHash}`;
  workspace.workspaceHash = workspaceHash;
}
