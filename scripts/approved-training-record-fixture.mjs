import { LEARNING_CANDIDATE_SCHEMA_VERSION } from '../src/core/learning-candidate-service.mjs';

export const APPROVED_TRAINING_RECORD_GENERATED_AT =
  '2026-07-16T10:00:00.000Z';

export function buildApprovedTrainingRecordFixture({
  example,
  missionId = 'mission-1',
  suffix = '1',
  workspaceId = 'workspace-1',
} = {}) {
  const candidateId = `learningcandidate-${suffix}`;
  const sessionId = `session-${suffix}`;
  const verificationId =
    `${candidateId}:promotion-verification:approve`;
  const candidateArtifactId = `artifact-learning-${suffix}`;
  const reviewerArtifactId = `artifact-reviewer-${suffix}`;
  const sourceArtifactId = `artifact-source-${suffix}`;
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
      checkCounts: { failed: 0, passed: verificationChecks.length },
      checks: verificationChecks,
      decision: 'approve',
      id: verificationId,
      productionReadyClaim: false,
      schemaVersion:
        'personal-ai-agent-learning-promotion-verification/v1',
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
    generatedAt: APPROVED_TRAINING_RECORD_GENERATED_AT,
    mission: { id: missionId, status: 'completed', workspaceId },
    reviewerArtifactId,
    sanitizedExample: example || {
      instruction: '  State a decision and cite the reviewed evidence. ',
      response: 'Preserve the decision, evidence, and next action.',
    },
    session: { id: sessionId, missionId, status: 'completed' },
    sourceArtifactId,
    workspace: { id: workspaceId },
  };
}
