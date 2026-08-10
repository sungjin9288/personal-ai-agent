import { createHash } from 'node:crypto';

export const PILOT_FEEDBACK_SCHEMA_VERSION = 'personal-ai-agent-pilot-feedback/v1';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const WORKSPACE_ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertPilotFeedbackRecord(record) {
  exactKeys(record, [
    'authority', 'captureCommit', 'feedback', 'integrityHash', 'limitations', 'participant',
    'recordedAt', 'runEvidence', 'schemaVersion', 'scope', 'status',
  ], 'pilot feedback record');

  const { integrityHash, ...content } = record;
  if (!isSha256(integrityHash) || integrityHash !== digest(content)) {
    throw new Error('Pilot feedback evidence integrity failed.');
  }
  if (
    record.schemaVersion !== PILOT_FEEDBACK_SCHEMA_VERSION ||
    record.status !== 'sanitized-single-participant-evidence' ||
    !COMMIT_PATTERN.test(record.captureCommit) ||
    !isIsoDate(record.recordedAt)
  ) {
    throw new Error('Pilot feedback record metadata is invalid.');
  }

  assertParticipant(record.participant);
  assertScope(record.scope);
  assertRunEvidence(record.runEvidence);
  assertFeedback(record.feedback);
  assertLimitations(record.limitations);
  assertAuthority(record.authority);
  return true;
}

function assertParticipant(participant) {
  exactKeys(participant, [
    'consentRecorded', 'consentScope', 'count', 'identityStored', 'role',
  ], 'participant');
  if (
    participant.count !== 1 ||
    participant.role !== 'engineering-participant' ||
    participant.consentRecorded !== true ||
    participant.consentScope !== 'sanitized-feedback-and-predefined-metrics' ||
    participant.identityStored !== false
  ) {
    throw new Error('Pilot feedback participant contract is invalid.');
  }
}

function assertScope(scope) {
  exactKeys(scope, ['missionTitle', 'providerMode', 'workspaceAlias'], 'pilot scope');
  if (!WORKSPACE_ALIAS_PATTERN.test(scope.workspaceAlias)) {
    throw new Error('Pilot feedback workspace alias must be a non-sensitive slug.');
  }
  if (
    scope.providerMode !== 'deterministic-only' ||
    scope.missionTitle !== 'Verify release readiness for pilot workspace'
  ) {
    throw new Error('Pilot feedback scope is invalid.');
  }
}

function assertRunEvidence(evidence) {
  exactKeys(evidence, [
    'apiCostUsd', 'approvalBehavior', 'artifactSha256', 'demoSteps',
    'externalMessagingEnabled', 'externalProviderCallCount', 'missionIdSha256',
    'missionStatus', 'pendingApprovalCount', 'reviewerVerdict', 'sessionIdSha256',
    'stubRoleRuns', 'workspaceMutationCount',
  ], 'pilot run evidence');
  exactKeys(evidence.artifactSha256, [
    'deliverable', 'executionManifest', 'reviewerReport',
  ], 'pilot artifact hashes');
  assertCompleteCount(evidence.demoSteps, 'demo steps');
  assertCompleteCount(evidence.stubRoleRuns, 'stub role runs');

  const hashes = [
    evidence.missionIdSha256,
    evidence.sessionIdSha256,
    ...Object.values(evidence.artifactSha256),
  ];
  if (hashes.some((value) => !isSha256(value))) {
    throw new Error('Pilot run evidence hash is invalid.');
  }
  if (
    evidence.missionStatus !== 'reviewed' ||
    evidence.reviewerVerdict !== 'pass' ||
    evidence.externalProviderCallCount !== 0 ||
    evidence.apiCostUsd !== 0 ||
    evidence.workspaceMutationCount !== 0 ||
    evidence.externalMessagingEnabled !== false ||
    evidence.approvalBehavior !== 'approval-required-before-execution' ||
    evidence.pendingApprovalCount !== 0
  ) {
    throw new Error('Pilot run evidence exceeded the approved deterministic boundary.');
  }
}

function assertFeedback(feedback) {
  exactKeys(feedback, [
    'approvalPointUnderstandable', 'broaderUsageBlocker', 'decision',
    'evidenceHandoffPossible', 'missionObjectiveClear', 'nextWorkflow',
    'outputUsefulForReview', 'positiveAnswerCount', 'questionCount',
  ], 'pilot feedback');
  const answers = [
    feedback.missionObjectiveClear,
    feedback.outputUsefulForReview,
    feedback.approvalPointUnderstandable,
    feedback.evidenceHandoffPossible,
  ];
  if (answers.some((answer) => typeof answer !== 'boolean')) {
    throw new Error('Pilot feedback answers must be boolean.');
  }
  if (feedback.questionCount !== answers.length) {
    throw new Error('Pilot feedback question count is invalid.');
  }
  if (feedback.positiveAnswerCount !== answers.filter(Boolean).length) {
    throw new Error('Pilot feedback positive answer count is invalid.');
  }
  if (
    feedback.broaderUsageBlocker !== 'none-observed-in-this-single-pilot' ||
    feedback.decision !== 'continue-deterministic-only-pilot' ||
    feedback.nextWorkflow !== 'another-bounded-nonsensitive-engineering-workflow'
  ) {
    throw new Error('Pilot feedback decision is invalid.');
  }
}

function assertLimitations(limitations) {
  exactKeys(limitations, [
    'costSavingsMeasured', 'customerImpactMeasured', 'deterministicOnly',
    'externalProviderValidated', 'generalizable', 'participantCount',
    'productivityMeasured', 'rawLocalArtifactsPublished', 'slaMeasured',
  ], 'pilot limitations');
  const expected = {
    participantCount: 1,
    deterministicOnly: true,
    externalProviderValidated: false,
    customerImpactMeasured: false,
    productivityMeasured: false,
    costSavingsMeasured: false,
    slaMeasured: false,
    generalizable: false,
    rawLocalArtifactsPublished: false,
  };
  if (Object.entries(expected).some(([key, value]) => limitations[key] !== value)) {
    throw new Error('Pilot feedback limitations must preserve the single-pilot boundary.');
  }
}

function assertAuthority(authority) {
  exactKeys(authority, [
    'customerSecretsAuthorized', 'externalProviderCallsAuthorized',
    'privateTrainingAuthorized', 'productionMutationAuthorized', 'productionReadyClaim',
  ], 'pilot authority');
  if (Object.values(authority).some((value) => value !== false)) {
    throw new Error('Pilot feedback authority must remain false.');
  }
}

function assertCompleteCount(counts, label) {
  exactKeys(counts, ['passed', 'total'], label);
  if (
    !Number.isSafeInteger(counts.passed) ||
    !Number.isSafeInteger(counts.total) ||
    counts.total < 1 ||
    counts.passed !== counts.total
  ) {
    throw new Error(`Pilot feedback ${label} must be complete.`);
  }
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Pilot feedback ${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`Pilot feedback ${label} keys are invalid.`);
  }
}

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isSha256(value) {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
