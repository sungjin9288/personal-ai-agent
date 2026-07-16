import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  APPROVED_TRAINING_RECORD_SCHEMA_VERSION,
  buildApprovedTrainingRecord,
  evaluateApprovedTrainingRecordEligibility,
} from '../src/core/approved-training-record.mjs';
import { LEARNING_CANDIDATE_SCHEMA_VERSION } from '../src/core/learning-candidate-service.mjs';

const GENERATED_AT = '2026-07-16T10:00:00.000Z';

function buildFixture() {
  const candidateId = 'learningcandidate-1';
  const missionId = 'mission-1';
  const sessionId = 'session-1';
  const workspaceId = 'workspace-1';
  const verificationId = `${candidateId}:promotion-verification:approve`;
  const candidateArtifactId = 'artifact-learning';
  const reviewerArtifactId = 'artifact-reviewer';
  const sourceArtifactId = 'artifact-source';
  const verificationChecks = [
    'manual-approval-recorded',
    'autonomous-promotion-disabled',
    'scope-locked',
    'no-raw-secrets',
    'no-raw-customer-payloads',
    'review-required',
    'retention-policy-present',
    'evidence-bound',
    'target-allowed',
    'rollback-path-present',
  ].map((id) => ({ id, passed: true, status: 'passed' }));
  const candidate = {
    artifactId: candidateArtifactId,
    evidence: {
      artifactIds: [sourceArtifactId, reviewerArtifactId],
      reviewerVerdict: 'pass',
    },
    id: candidateId,
    missionId,
    missionStatus: 'completed',
    promotionDecision: {
      decidedAt: '2026-07-16T09:00:00.000Z',
      decidedBy: 'local-operator',
      decision: 'approve',
      scope: 'mission',
      scopeId: missionId,
      target: 'template',
      verificationId,
    },
    promotionStatus: 'approved',
    promotionVerification: {
      autonomousPromotionEnabled: false,
      checkCounts: { failed: 0, passed: 10 },
      checks: verificationChecks,
      decision: 'approve',
      id: verificationId,
      productionReadyClaim: false,
      schemaVersion: 'personal-ai-agent-learning-promotion-verification/v1',
      scope: 'mission',
      scopeId: missionId,
      status: 'passed',
      stopReason: '',
      verifiedAt: '2026-07-16T09:00:00.000Z',
      verificationType: 'local-deterministic-promotion-gate',
    },
    recordType: 'success-pattern',
    safety: {
      crossScopePromotionAllowed: false,
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      scopeLocked: true,
    },
    schemaVersion: LEARNING_CANDIDATE_SCHEMA_VERSION,
    scope: 'mission',
    scopeId: missionId,
    sessionId,
    workspaceId,
  };
  return {
    artifacts: [
      {
        id: candidateArtifactId,
        kind: 'learning-candidate',
        missionId,
        role: 'reviewer',
        sessionId,
      },
      {
        id: reviewerArtifactId,
        kind: 'agent-output',
        missionId,
        role: 'reviewer',
        sessionId,
      },
      {
        id: sourceArtifactId,
        kind: 'deliverable',
        missionId,
        role: 'executor',
        sessionId,
      },
    ],
    candidate,
    generatedAt: GENERATED_AT,
    mission: { id: missionId, status: 'completed', workspaceId },
    reviewerArtifactId,
    sanitizedExample: {
      instruction: '  State a decision and cite the reviewed evidence. ',
      response: 'Preserve the decision, evidence, and next action.',
    },
    session: { id: sessionId, missionId, status: 'completed' },
    sourceArtifactId,
    workspace: { id: workspaceId },
  };
}

test('approved training record preserves deterministic lineage and sanitized content', () => {
  const fixture = buildFixture();
  const record = buildApprovedTrainingRecord(fixture);

  assert.equal(record.schemaVersion, APPROVED_TRAINING_RECORD_SCHEMA_VERSION);
  assert.equal(record.status, 'approved-for-local-dataset-build');
  assert.equal(record.example.instruction, 'State a decision and cite the reviewed evidence.');
  assert.equal(record.reviewer.verdict, 'pass');
  assert.equal(record.promotionVerification.status, 'passed');
  assert.equal(record.safety.checks.every((check) => check.status === 'passed'), true);
  assert.match(record.contentHash, /^[a-f0-9]{64}$/);
  assert.match(record.lineageHash, /^[a-f0-9]{64}$/);
  assert.match(record.id, /^trainingrecord-[a-f0-9]{64}$/);
  assert.deepEqual(buildApprovedTrainingRecord(fixture), record);
});

test('approved training record does not mutate source records', () => {
  const fixture = buildFixture();
  const before = JSON.stringify(fixture);

  buildApprovedTrainingRecord(fixture);

  assert.equal(JSON.stringify(fixture), before);
});

test('eligibility rejects missing approval, reviewer, and verification evidence', () => {
  const fixture = buildFixture();
  fixture.candidate.promotionStatus = 'pending-review';
  fixture.candidate.evidence.reviewerVerdict = 'fail';
  fixture.candidate.promotionVerification.status = 'failed';
  const result = evaluateApprovedTrainingRecordEligibility(fixture);

  assert.equal(result.eligible, false);
  assert.equal(result.failedCheckIds.includes('approved-promotion'), true);
  assert.equal(result.failedCheckIds.includes('promotion-verification-passed'), true);
  assert.equal(result.failedCheckIds.includes('reviewer-passed'), true);
});

test('eligibility rejects approval history from after the record generation time', () => {
  const fixture = buildFixture();
  fixture.candidate.promotionVerification.verifiedAt = '2026-07-16T10:00:01.000Z';
  const result = evaluateApprovedTrainingRecordEligibility(fixture);

  assert.equal(result.eligible, false);
  assert.equal(result.failedCheckIds.includes('approval-history-valid'), true);
});

test('eligibility requires every promotion verification check', () => {
  const fixture = buildFixture();
  fixture.candidate.promotionVerification.checks = fixture.candidate.promotionVerification.checks.filter(
    (check) => check.id !== 'no-raw-customer-payloads',
  );
  const result = evaluateApprovedTrainingRecordEligibility(fixture);

  assert.equal(result.eligible, false);
  assert.equal(result.failedCheckIds.includes('promotion-verification-passed'), true);
});

test('eligibility rejects cross-scope and mismatched artifact lineage', () => {
  const fixture = buildFixture();
  fixture.candidate.scopeId = 'mission-other';
  fixture.artifacts.find((artifact) => artifact.id === fixture.reviewerArtifactId).sessionId = 'session-other';
  const result = evaluateApprovedTrainingRecordEligibility(fixture);

  assert.equal(result.failedCheckIds.includes('scope-locked'), true);
  assert.equal(result.failedCheckIds.includes('reviewer-artifact-bound'), true);
});

test('eligibility rejects secret-like and raw customer payload content', () => {
  const secretFixture = buildFixture();
  secretFixture.sanitizedExample.response = 'OPENAI_API_KEY=sk-exampleabcdefghijklmnop';
  assert.equal(
    evaluateApprovedTrainingRecordEligibility(secretFixture).failedCheckIds.includes('no-raw-secrets'),
    true,
  );

  const payloadFixture = buildFixture();
  payloadFixture.sanitizedExample.instruction = '{"customerId":"customer-1","request":"do work"}';
  assert.equal(
    evaluateApprovedTrainingRecordEligibility(payloadFixture).failedCheckIds.includes('no-raw-customer-payloads'),
    true,
  );
});

test('accepted risk requires approver, matching scope, note, and future expiration', () => {
  const fixture = buildFixture();
  fixture.acceptedRisk = {
    approvedAt: '2026-07-16T09:30:00.000Z',
    approvedBy: 'workspace-owner',
    expiresAt: '2026-07-20T00:00:00.000Z',
    id: 'accepted-risk-1',
    note: 'Monitor the bounded formatting variance.',
    resolutionKind: 'accepted-risk',
    scope: 'mission',
    scopeId: fixture.mission.id,
  };
  const record = buildApprovedTrainingRecord(fixture);

  assert.equal(record.acceptedRisk.approvedBy, 'workspace-owner');
  assert.equal(record.acceptedRisk.scopeId, fixture.mission.id);

  fixture.acceptedRisk.expiresAt = '2026-07-16T09:59:59.000Z';
  assert.throws(
    () => buildApprovedTrainingRecord(fixture),
    /Accepted risk requires an id, approver, mission scope, sanitized note, and future expiration/,
  );

  fixture.acceptedRisk.expiresAt = '2026-07-20T00:00:00.000Z';
  fixture.acceptedRisk.note = 'password=customer-secret-value';
  assert.throws(
    () => buildApprovedTrainingRecord(fixture),
    /Accepted risk requires an id, approver, mission scope, sanitized note, and future expiration/,
  );
});

test('record remains local-only and does not authorize fine-tuning submission', () => {
  const record = buildApprovedTrainingRecord(buildFixture());

  assert.equal(record.externalSubmissionAuthorized, false);
  assert.equal(record.fineTuningExecutionAuthorized, false);
  assert.equal(record.productionReadyClaim, false);
  assert.equal(record.acceptedRisk, null);
});
