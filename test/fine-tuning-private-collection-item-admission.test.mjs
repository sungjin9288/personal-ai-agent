import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
  buildFineTuningPrivateCollectionItemAdmission,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const INTAKE_REQUESTED_AT = '2026-07-23T00:00:00.000Z';
const INTAKE_RESOLVED_AT = '2026-07-23T01:00:00.000Z';
const PLANNED_AT = '2026-07-23T02:00:00.000Z';
const EXECUTION_REQUESTED_AT = '2026-07-23T03:00:00.000Z';
const EXECUTION_RESOLVED_AT = '2026-07-23T04:00:00.000Z';
const PREPARED_AT = '2026-07-23T05:00:00.000Z';
const ADMITTED_AT = '2026-07-23T06:00:00.000Z';
const EXPIRES_AT = '2026-07-24T00:00:00.000Z';

test('content-free envelopes admit both fixed lanes with sixteen exact bindings', () => {
  const sources = buildSources();
  for (const [lane, marker] of [
    ['reviewed-examples', 'a'],
    ['answer-quality-cases', 'b'],
  ]) {
    const admission = buildAdmission(sources, lane, marker);
    assert.doesNotThrow(() =>
      assertFineTuningPrivateCollectionItemAdmission(admission, {
        ...sources,
        now: ADMITTED_AT,
      }));
    assert.equal(
      admission.status,
      'private-collection-item-envelope-admitted-content-not-collected',
    );
    assert.equal(admission.envelope.lane, lane);
    assert.equal(Object.keys(admission.bindings).length, 16);
    assert.equal(admission.bindings.workspaceHash, sources.workspace.workspaceHash);
    assert.equal(admission.bindings.envelopeHash, hash(admission.envelope));
    assert.equal(admission.collectionEnvelopeCount, 1);
    assert.equal(admission.collectionItemCount, 0);
    assert.equal(admission.workspaceMutationPerformed, false);
    assert.equal(admission.actualUserDataCollected, false);
    assert.equal(admission.rawTrainingContentStored, false);
    assert.equal(admission.trainingAuthorized, false);
    assert.equal(admission.productionReadyClaim, false);
    assert.equal(admission.externalProviderCalls, 'none');
    for (const field of [
      'answerQualityCaseCollectionAuthorized',
      'collectionExecutionAuthorized',
      'privateCollectionWorkspaceCreationAuthorized',
      'privateCollectionWorkspacePrepared',
      'reviewedExampleCollectionAuthorized',
      'operatorAttestationBound',
      'operatorAttestationRecorded',
      'dataHandlingEvidenceReferencesRecorded',
      'collectionItemEnvelopeAdmitted',
      'collectionMetadataRecorded',
      'retentionDeadlineRecorded',
      'withdrawalReferenceRecorded',
    ]) {
      assert.equal(admission[field], true, field);
    }
    for (const field of [
      'dataHandlingEvidenceRecorded',
      'dataHandlingEvidenceIndependentlyVerified',
      'usageBasisIndependentlyVerified',
      'consentIndependentlyVerified',
      'deidentificationIndependentlyVerified',
      'retentionPolicyIndependentlyVerified',
      'collectionStarted',
      'collectionContentStored',
      'workspaceContainsCollectionData',
      'workspaceMutationPerformed',
      'approvedTrainingRecordCreated',
      'answerQualityCaseCreated',
      'withdrawalExecuted',
      'deletionExecuted',
      'actualUserDataCollected',
      'rawTrainingContentStored',
      'sourceDataIncluded',
      'candidateTrainingReviewAllowed',
      'trainingAuthorized',
      'externalSubmissionAuthorized',
      'productionReadyClaim',
    ]) {
      assert.equal(admission[field], false, field);
    }
  }
});

test('envelope schema, enum, hash, and retention limits fail closed', () => {
  const sources = buildSources();
  const valid = buildEnvelope(sources.workspace, 'reviewed-examples', 'a');
  for (const mutate of [
    (envelope) => { envelope.extra = true; },
    (envelope) => { envelope.lane = 'other'; },
    (envelope) => { envelope.source.referenceSha256 = 'A'.repeat(64); },
    (envelope) => { envelope.privacy.consentStatus = 'approved'; },
    (envelope) => { envelope.redaction.policyId = 'other'; },
    (envelope) => { envelope.retention.deleteBy = ADMITTED_AT; },
    (envelope) => { envelope.retention.deleteBy = '2026-07-24T00:00:00.001Z'; },
    (envelope) => { envelope.workspace.workspaceHash = 'f'.repeat(64); },
  ]) {
    const envelope = structuredClone(valid);
    mutate(envelope);
    assert.throws(
      () => buildFineTuningPrivateCollectionItemAdmission({
        ...sources,
        admittedAt: ADMITTED_AT,
        envelope,
      }),
      /envelope|workspace|retention/i,
    );
  }
  assert.throws(
    () => buildFineTuningPrivateCollectionItemAdmission({
      ...sources,
      admittedAt: EXPIRES_AT,
      envelope: valid,
    }),
    /expired/,
  );
});

test('record integrity, semantic drift, and current chain revalidation reject tampering', () => {
  const sources = buildSources();
  const admission = buildAdmission(sources, 'reviewed-examples', 'a');

  const changedContent = structuredClone(admission);
  changedContent.collectionItemCount = 1;
  rehashAdmission(changedContent);
  assert.throws(
    () => assertFineTuningPrivateCollectionItemAdmissionRecord(changedContent),
    /integrity failed/,
  );

  const changedHash = structuredClone(admission);
  changedHash.bindings.assessmentHash = 'f'.repeat(64);
  rehashAdmission(changedHash);
  assert.throws(
    () => assertFineTuningPrivateCollectionItemAdmission(changedHash, {
      ...sources,
      now: ADMITTED_AT,
    }),
    /current F1 chain|does not match|integrity/,
  );

  const extra = structuredClone(admission);
  extra.unexpected = true;
  assert.throws(
    () => assertFineTuningPrivateCollectionItemAdmissionRecord(extra),
    /integrity failed/,
  );

  const driftedWorkspace = structuredClone(sources.workspace);
  driftedWorkspace.lanes[0].itemCount = 1;
  assert.throws(
    () => assertFineTuningPrivateCollectionItemAdmission(admission, {
      ...sources,
      workspace: driftedWorkspace,
      now: ADMITTED_AT,
    }),
    /lanes are invalid|integrity|current F1 chain/,
  );

  assert.throws(
    () => assertFineTuningPrivateCollectionItemAdmission(admission, {
      ...sources,
      now: admission.envelope.retention.deleteBy,
    }),
    /retention expired/,
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
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: EXECUTION_RESOLVED_AT,
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: EXECUTION_RESOLVED_AT,
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Bounded private collection review.',
    })),
  });
  const sources = {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
  return {
    ...sources,
    workspace: buildFineTuningPrivateCollectionWorkspace({
      ...sources,
      preparedAt: PREPARED_AT,
    }),
  };
}

function buildAdmission(sources, lane, marker) {
  return buildFineTuningPrivateCollectionItemAdmission({
    ...sources,
    admittedAt: ADMITTED_AT,
    envelope: buildEnvelope(sources.workspace, lane, marker),
  });
}

function buildEnvelope(workspace, lane, marker) {
  return {
    lane,
    privacy: {
      consentStatus: 'recorded',
      evidenceSha256: `${marker}1`.slice(0, 1).repeat(64),
      purpose: 'private-answer-quality-improvement-and-readiness-review',
    },
    redaction: {
      evidenceSha256: `${marker}2`.slice(0, 1).repeat(64),
      policyId: 'deidentify-before-content-admission-v1',
    },
    retention: {
      deleteBy: '2026-07-23T23:00:00.000Z',
      evidenceSha256: `${marker}3`.slice(0, 1).repeat(64),
      policyId: 'delete-by-expiry-or-withdrawal-v1',
      withdrawalReferenceSha256: `${marker}4`.slice(0, 1).repeat(64),
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
    source: {
      lineageSha256: `${marker}5`.slice(0, 1).repeat(64),
      referenceSha256: `${marker}6`.slice(0, 1).repeat(64),
      scopeReferenceSha256: `${marker}7`.slice(0, 1).repeat(64),
      usageBasis: 'owner-attested-private-quality-improvement',
      usageBasisEvidenceSha256: `${marker}8`.slice(0, 1).repeat(64),
    },
    submittedBy: 'local-operator-role',
    workspace: {
      id: workspace.id,
      workspaceHash: workspace.workspaceHash,
    },
  };
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rehashAdmission(admission) {
  const content = structuredClone(admission);
  delete content.admissionHash;
  delete content.id;
  const admissionHash = hash(content);
  admission.admissionHash = admissionHash;
  admission.id = `fine-tuning-private-collection-item-admission-${admissionHash}`;
}
