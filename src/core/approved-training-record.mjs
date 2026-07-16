import { createHash } from 'node:crypto';

import { LEARNING_CANDIDATE_SCHEMA_VERSION } from './learning-candidate-service.mjs';

export const APPROVED_TRAINING_RECORD_SCHEMA_VERSION =
  'personal-ai-agent-approved-training-record/v1';

const PROMOTION_VERIFICATION_SCHEMA_VERSION =
  'personal-ai-agent-learning-promotion-verification/v1';
const REQUIRED_PROMOTION_CHECK_IDS = Object.freeze([
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
]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeTrainingText(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isValidTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function containsSecret(value) {
  const text = normalizeText(value);
  return [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\b(?:sk|sk-ant|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{16,}\b/i,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
    /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*\S+/i,
  ].some((pattern) => pattern.test(text));
}

function containsRawCustomerPayload(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }

  if (/^[\[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return true;
      }
    } catch {
      // Non-JSON prose may begin with punctuation; continue with explicit markers.
    }
  }

  return [
    /\b(?:customer|tenant|user)(?:Id|Name|Email|Phone|Payload)\s*[:=]/i,
    /\b(?:rawCustomerPayload|requestBody|request\.body|tenantData)\s*[:=]/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  ].some((pattern) => pattern.test(text));
}

function artifactMatches(artifact, { id, kind, missionId, role, sessionId }) {
  return (
    artifact?.id === id &&
    artifact?.kind === kind &&
    artifact?.missionId === missionId &&
    artifact?.role === role &&
    artifact?.sessionId === sessionId
  );
}

function normalizeAcceptedRisk(acceptedRisk, { generatedAt, missionId }) {
  if (!acceptedRisk) {
    return null;
  }

  const normalized = {
    approvedAt: normalizeText(acceptedRisk.approvedAt),
    approvedBy: normalizeText(acceptedRisk.approvedBy),
    expiresAt: normalizeText(acceptedRisk.expiresAt),
    id: normalizeText(acceptedRisk.id),
    note: normalizeText(acceptedRisk.note),
    resolutionKind: normalizeText(acceptedRisk.resolutionKind),
    scope: normalizeText(acceptedRisk.scope),
    scopeId: normalizeText(acceptedRisk.scopeId),
  };
  const safetyText = [normalized.id, normalized.approvedBy, normalized.note].join(' ');
  const valid =
    normalized.id &&
    normalized.resolutionKind === 'accepted-risk' &&
    normalized.approvedBy &&
    isValidTimestamp(normalized.approvedAt) &&
    Date.parse(normalized.approvedAt) <= Date.parse(generatedAt) &&
    normalized.scope === 'mission' &&
    normalized.scopeId === missionId &&
    isValidTimestamp(normalized.expiresAt) &&
    Date.parse(normalized.expiresAt) > Date.parse(generatedAt) &&
    normalized.note &&
    !containsSecret(safetyText) &&
    !containsRawCustomerPayload(safetyText);

  if (!valid) {
    throw new Error(
      'Accepted risk requires an id, approver, mission scope, sanitized note, and future expiration.',
    );
  }
  return normalized;
}

function buildEligibilityChecks({
  artifacts,
  candidate,
  generatedAt,
  mission,
  reviewerArtifactId,
  sanitizedExample,
  session,
  sourceArtifactId,
  workspace,
}) {
  const artifactList = ensureArray(artifacts);
  const evidenceArtifactIds = new Set(ensureArray(candidate?.evidence?.artifactIds));
  const candidateArtifact = artifactList.find((artifact) => artifact.id === candidate?.artifactId);
  const reviewerArtifact = artifactList.find((artifact) => artifact.id === reviewerArtifactId);
  const sourceArtifact = artifactList.find((artifact) => artifact.id === sourceArtifactId);
  const instruction = normalizeTrainingText(sanitizedExample?.instruction);
  const response = normalizeTrainingText(sanitizedExample?.response);
  const verificationCheckMap = new Map(
    ensureArray(candidate?.promotionVerification?.checks).map((check) => [check?.id, check]),
  );
  const verificationChecksPassed = REQUIRED_PROMOTION_CHECK_IDS.every((checkId) => {
    const check = verificationCheckMap.get(checkId);
    return check?.passed === true && check?.status === 'passed';
  });
  const checks = [
    {
      id: 'approved-promotion',
      passed:
        ['approved', 'promoted'].includes(candidate?.promotionStatus) &&
        candidate?.promotionDecision?.decision === 'approve' &&
        candidate?.promotionDecision?.decidedBy === 'local-operator',
    },
    {
      id: 'promotion-verification-passed',
      passed:
        candidate?.promotionVerification?.schemaVersion === PROMOTION_VERIFICATION_SCHEMA_VERSION &&
        candidate?.promotionVerification?.status === 'passed' &&
        candidate?.promotionVerification?.decision === 'approve' &&
        candidate?.promotionVerification?.stopReason === '' &&
        candidate?.promotionVerification?.verificationType === 'local-deterministic-promotion-gate' &&
        candidate?.promotionVerification?.autonomousPromotionEnabled === false &&
        candidate?.promotionVerification?.productionReadyClaim === false &&
        candidate?.promotionDecision?.verificationId === candidate?.promotionVerification?.id &&
        verificationChecksPassed,
    },
    {
      id: 'approval-history-valid',
      passed:
        isValidTimestamp(candidate?.promotionDecision?.decidedAt) &&
        isValidTimestamp(candidate?.promotionVerification?.verifiedAt) &&
        Date.parse(candidate.promotionDecision.decidedAt) <= Date.parse(generatedAt) &&
        Date.parse(candidate.promotionVerification.verifiedAt) <= Date.parse(generatedAt),
    },
    {
      id: 'reviewer-passed',
      passed: candidate?.evidence?.reviewerVerdict === 'pass',
    },
    {
      id: 'completed-source-run',
      passed: candidate?.missionStatus === 'completed' && mission?.status === 'completed' && session?.status === 'completed',
    },
    {
      id: 'scope-locked',
      passed:
        candidate?.scope === 'mission' &&
        candidate?.scopeId === mission?.id &&
        candidate?.missionId === mission?.id &&
        candidate?.sessionId === session?.id &&
        candidate?.workspaceId === workspace?.id &&
        mission?.workspaceId === workspace?.id &&
        session?.missionId === mission?.id &&
        candidate?.promotionDecision?.scope === 'mission' &&
        candidate?.promotionDecision?.scopeId === mission?.id &&
        candidate?.promotionVerification?.scope === 'mission' &&
        candidate?.promotionVerification?.scopeId === mission?.id &&
        candidate?.safety?.scopeLocked === true &&
        candidate?.safety?.crossScopePromotionAllowed !== true,
    },
    {
      id: 'candidate-artifact-bound',
      passed: artifactMatches(candidateArtifact, {
        id: candidate?.artifactId,
        kind: 'learning-candidate',
        missionId: mission?.id,
        role: 'reviewer',
        sessionId: session?.id,
      }),
    },
    {
      id: 'reviewer-artifact-bound',
      passed:
        evidenceArtifactIds.has(reviewerArtifactId) &&
        artifactMatches(reviewerArtifact, {
          id: reviewerArtifactId,
          kind: 'agent-output',
          missionId: mission?.id,
          role: 'reviewer',
          sessionId: session?.id,
        }),
    },
    {
      id: 'source-artifact-bound',
      passed:
        evidenceArtifactIds.has(sourceArtifactId) &&
        artifactMatches(sourceArtifact, {
          id: sourceArtifactId,
          kind: 'deliverable',
          missionId: mission?.id,
          role: 'executor',
          sessionId: session?.id,
        }),
    },
    {
      id: 'sanitized-example-present',
      passed: Boolean(instruction && response),
    },
    {
      id: 'no-raw-secrets',
      passed:
        candidate?.safety?.noRawSecrets === true &&
        !containsSecret(instruction) &&
        !containsSecret(response),
    },
    {
      id: 'no-raw-customer-payloads',
      passed:
        candidate?.safety?.noRawCustomerPayloads === true &&
        !containsRawCustomerPayload(instruction) &&
        !containsRawCustomerPayload(response),
    },
  ].map((check) => ({
    ...check,
    status: check.passed ? 'passed' : 'failed',
  }));

  return {
    checks,
    instruction,
    response,
  };
}

export function evaluateApprovedTrainingRecordEligibility(input = {}) {
  const { candidate, generatedAt } = input;
  if (candidate?.schemaVersion !== LEARNING_CANDIDATE_SCHEMA_VERSION) {
    throw new Error(`Unsupported learning candidate schema: ${normalizeText(candidate?.schemaVersion, '<empty>')}`);
  }
  if (!isValidTimestamp(generatedAt)) {
    throw new Error('Approved training record generatedAt must be an ISO timestamp.');
  }

  const evaluation = buildEligibilityChecks(input);
  const failedChecks = evaluation.checks.filter((check) => !check.passed);
  return {
    checks: evaluation.checks,
    eligible: failedChecks.length === 0,
    failedCheckIds: failedChecks.map((check) => check.id),
    instruction: evaluation.instruction,
    response: evaluation.response,
  };
}

export function buildApprovedTrainingRecord(input = {}) {
  const {
    acceptedRisk = null,
    candidate,
    generatedAt,
    mission,
    reviewerArtifactId,
    session,
    sourceArtifactId,
    workspace,
  } = input;
  const evaluation = evaluateApprovedTrainingRecordEligibility(input);
  if (!evaluation.eligible) {
    throw new Error(`Approved training record is not eligible: ${evaluation.failedCheckIds.join(', ')}.`);
  }

  const normalizedAcceptedRisk = normalizeAcceptedRisk(acceptedRisk, {
    generatedAt,
    missionId: mission.id,
  });
  const example = {
    instruction: evaluation.instruction,
    response: evaluation.response,
  };
  const lineage = {
    candidateArtifactId: candidate.artifactId,
    candidateId: candidate.id,
    missionId: mission.id,
    reviewerArtifactId,
    sessionId: session.id,
    sourceArtifactId,
    workspaceId: workspace.id,
  };
  const contentHash = hashRecord(example);
  const lineageHash = hashRecord(lineage);

  return {
    acceptedRisk: normalizedAcceptedRisk,
    approval: {
      decidedAt: candidate.promotionDecision.decidedAt,
      decidedBy: candidate.promotionDecision.decidedBy,
      decision: candidate.promotionDecision.decision,
      scope: candidate.promotionDecision.scope,
      scopeId: candidate.promotionDecision.scopeId,
      target: candidate.promotionDecision.target,
      verificationId: candidate.promotionDecision.verificationId,
    },
    contentHash,
    createdAt: generatedAt,
    example,
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    id: `trainingrecord-${hashRecord([candidate.id, contentHash, lineageHash])}`,
    lineage,
    lineageHash,
    productionReadyClaim: false,
    promotionVerification: {
      checkCounts: candidate.promotionVerification.checkCounts,
      id: candidate.promotionVerification.id,
      schemaVersion: candidate.promotionVerification.schemaVersion,
      status: candidate.promotionVerification.status,
      verifiedAt: candidate.promotionVerification.verifiedAt,
    },
    recordType: candidate.recordType,
    reviewer: {
      artifactId: reviewerArtifactId,
      verdict: candidate.evidence.reviewerVerdict,
    },
    safety: {
      checks: evaluation.checks,
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      scopeLocked: true,
    },
    schemaVersion: APPROVED_TRAINING_RECORD_SCHEMA_VERSION,
    scope: {
      id: mission.id,
      type: 'mission',
      workspaceId: workspace.id,
    },
    status: 'approved-for-local-dataset-build',
  };
}
