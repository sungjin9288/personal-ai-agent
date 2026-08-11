import { createHash } from 'node:crypto';

export const ENGINEERING_APPROVAL_REHEARSAL_SCHEMA_VERSION =
  'personal-ai-agent-engineering-approval-rehearsal/v1';
export const ENGINEERING_APPROVAL_REHEARSAL_FIXTURE_REASON =
  'deterministic-rehearsal-fixture: approve bounded local handoff only.';

export const ENGINEERING_APPROVAL_REHEARSAL_SCENARIO = Object.freeze({
  constraints: Object.freeze([
    'Keep blast radius small.',
    'Do not commit, push, deploy, or mutate production systems.',
    'Require verification before closeout.',
  ]),
  id: 'scenario-2-engineering-mission-with-approval',
  objective: 'Produce a small implementation plan with assumptions, success criteria, verification, and approval boundary.',
  title: 'Prepare bounded implementation plan',
});

const ROLE_ORDER = Object.freeze(['manager', 'planner', 'executor', 'reviewer']);

export function buildEngineeringApprovalRehearsalEvidence(input) {
  const evidence = {
    schemaVersion: ENGINEERING_APPROVAL_REHEARSAL_SCHEMA_VERSION,
    status: input.status,
    generatedAt: input.generatedAt,
    captureCommit: input.captureCommit,
    scenario: input.scenario,
    observed: input.observed,
    safety: input.safety,
    artifactSha256: input.artifactSha256,
    limitations: input.limitations,
  };

  const sealedEvidence = {
    ...evidence,
    integrityHash: hashRecord(evidence),
  };

  assertEngineeringApprovalRehearsalEvidence(sealedEvidence);
  return sealedEvidence;
}

export function assertEngineeringApprovalRehearsalEvidence(evidence) {
  const { integrityHash, ...record } = evidence;

  assertExactKeys(evidence, [
    'artifactSha256',
    'captureCommit',
    'generatedAt',
    'integrityHash',
    'limitations',
    'observed',
    'safety',
    'scenario',
    'schemaVersion',
    'status',
  ], 'evidence');
  if (evidence.schemaVersion !== ENGINEERING_APPROVAL_REHEARSAL_SCHEMA_VERSION) {
    throw new Error('Engineering approval rehearsal schema version is invalid.');
  }
  if (evidence.status !== 'verified-deterministic-rehearsal') {
    throw new Error('Engineering approval rehearsal status is invalid.');
  }
  if (!Number.isFinite(Date.parse(evidence.generatedAt))) {
    throw new Error('Engineering approval rehearsal generated timestamp is invalid.');
  }
  assertSha(evidence.captureCommit, 40, 'Capture commit');
  assertContentFree(evidence);

  assertScenario(evidence.scenario);
  assertObserved(evidence.observed);
  assertSafety(evidence.safety);
  assertArtifactHashes(evidence.artifactSha256);
  assertLimitations(evidence.limitations);
  if (integrityHash !== hashRecord(record)) {
    throw new Error('Engineering approval rehearsal integrity hash is invalid.');
  }

  return evidence;
}

export function inspectFixtureApproval({ approval, handoffArtifact, handoffContent }) {
  if (
    approval?.status !== 'approved'
    || approval.decision !== 'approve'
    || approval.decisionReason !== ENGINEERING_APPROVAL_REHEARSAL_FIXTURE_REASON
  ) {
    throw new Error('Resolved approval is not the deterministic rehearsal fixture.');
  }
  if (
    handoffArtifact?.fileName !== 'execution-ready-brief.md'
    || handoffArtifact.kind !== 'execution-handoff'
    || handoffArtifact.role !== 'manager'
  ) {
    throw new Error('Fixture handoff artifact metadata is invalid.');
  }
  if (!handoffContent.includes(`- reason: ${ENGINEERING_APPROVAL_REHEARSAL_FIXTURE_REASON}`)) {
    throw new Error('Fixture handoff does not retain the deterministic rehearsal marker.');
  }

  return {
    executionReadyBriefInspected: true,
    fixtureApprovalLabel: approval.decisionReason.split(':', 1)[0],
    fixtureDecision: approval.decision,
  };
}

function hashRecord(record) {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

function assertScenario(scenario) {
  assertExactKeys(scenario, [
    'constraints',
    'distinctFromPilotFeedbackMission',
    'id',
    'objective',
    'providerMode',
    'title',
  ], 'scenario');
  assertEqual(scenario.id, ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.id, 'Scenario id');
  assertEqual(scenario.title, ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.title, 'Scenario title');
  assertEqual(scenario.objective, ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.objective, 'Scenario objective');
  assertArrayEqual(scenario.constraints, ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.constraints, 'Scenario constraints');
  assertEqual(scenario.providerMode, 'stub', 'Provider mode');
  assertEqual(scenario.distinctFromPilotFeedbackMission, true, 'Pilot feedback mission distinction');
}

function assertObserved(observed) {
  assertExactKeys(observed, [
    'actionInboxInspected',
    'approvalInboxInspected',
    'executionReadyBriefInspected',
    'fixtureApprovalLabel',
    'fixtureDecision',
    'missionShowInspected',
    'pendingApprovalCountAfter',
    'pendingApprovalCountBefore',
    'postApprovalStatus',
    'preApprovalStatus',
    'reviewerVerdict',
    'roleOrder',
    'timelineInspected',
  ], 'observed');
  assertArrayEqual(observed.roleOrder, ROLE_ORDER, 'Role order');
  assertEqual(observed.reviewerVerdict, 'pass', 'Reviewer verdict');
  assertEqual(observed.preApprovalStatus, 'awaiting_approval', 'Pre-approval status');
  if (observed.pendingApprovalCountBefore !== 1 || observed.pendingApprovalCountAfter !== 0) {
    throw new Error('Pending approval count must transition from 1 to 0.');
  }
  assertEqual(observed.fixtureDecision, 'approve', 'Fixture decision');
  assertEqual(observed.fixtureApprovalLabel, 'deterministic-rehearsal-fixture', 'Fixture approval label');
  assertEqual(observed.postApprovalStatus, 'completed', 'Post-approval status');
  for (const field of [
    'actionInboxInspected',
    'approvalInboxInspected',
    'executionReadyBriefInspected',
    'missionShowInspected',
    'timelineInspected',
  ]) {
    assertEqual(observed[field], true, `${field} observation`);
  }
}

function assertSafety(safety) {
  assertExactKeys(safety, [
    'externalMessagingEnabled',
    'externalProviderCalls',
    'providerCostUsd',
    'rawArtifactContentPublished',
    'runtimeRootCleaned',
    'runtimeRootEphemeral',
    'targetWorkspaceDigestAfter',
    'targetWorkspaceDigestBefore',
  ], 'safety');
  if (safety.externalProviderCalls !== 0) {
    throw new Error('External provider calls must remain zero.');
  }
  assertEqual(safety.providerCostUsd, 0, 'Provider cost safety value');
  assertEqual(safety.externalMessagingEnabled, false, 'External messaging policy');
  assertEqual(safety.rawArtifactContentPublished, false, 'Raw artifact publication safety value');
  assertEqual(safety.runtimeRootEphemeral, true, 'Runtime root ephemeral flag');
  assertEqual(safety.runtimeRootCleaned, true, 'Runtime root cleaned flag');
  assertSha(safety.targetWorkspaceDigestBefore, 64, 'Target workspace digest before');
  assertSha(safety.targetWorkspaceDigestAfter, 64, 'Target workspace digest after');
  if (safety.targetWorkspaceDigestBefore !== safety.targetWorkspaceDigestAfter) {
    throw new Error('Target workspace digest changed during rehearsal.');
  }
}

function assertArtifactHashes(artifactSha256) {
  assertExactKeys(artifactSha256, [
    'executionReadyBrief',
    'executorDeliverable',
    'manager',
    'planner',
    'reviewerReport',
  ], 'artifactSha256');
  for (const [name, sha256] of Object.entries(artifactSha256)) {
    assertSha(sha256, 64, `${name} artifact SHA-256`);
  }
}

function assertLimitations(limitations) {
  assertExactKeys(limitations, [
    'costClaim',
    'customerImpactClaim',
    'externalProviderValidated',
    'generalizableClaim',
    'humanApprovalCollected',
    'humanFeedbackCollected',
    'participantCount',
    'productivityClaim',
    'productionReadyClaim',
    'slaClaim',
  ], 'limitations');
  assertEqual(limitations.participantCount, 0, 'Participant count');
  if (limitations.humanApprovalCollected !== false) {
    throw new Error('Human approval collected must remain false for a deterministic fixture.');
  }
  if (limitations.productionReadyClaim !== false) {
    throw new Error('Production-ready claim must remain false.');
  }
  for (const field of [
    'costClaim',
    'customerImpactClaim',
    'externalProviderValidated',
    'generalizableClaim',
    'humanFeedbackCollected',
    'productivityClaim',
    'slaClaim',
  ]) {
    assertEqual(limitations[field], false, `${field} limitation`);
  }
}

function assertContentFree(evidence) {
  const serialized = JSON.stringify(evidence);
  if (/\/Users\/|\/home\/|\/var\/folders\/|[A-Za-z]:\\\\/.test(serialized)) {
    throw new Error('Engineering approval rehearsal contains a machine-local path.');
  }
  if (/\b(?:artifact|approval|mission|session|workspace)_[A-Za-z0-9_-]+\b/.test(serialized)) {
    throw new Error('Engineering approval rehearsal contains a raw runtime identifier.');
  }
}

function assertExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Engineering approval rehearsal ${label} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw new Error(`Engineering approval rehearsal ${label} keys are invalid.`);
  }
}

function assertArrayEqual(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertSha(value, length, label) {
  const pattern = new RegExp(`^[a-f0-9]{${length}}$`);
  if (!pattern.test(String(value || ''))) {
    throw new Error(`${label} is invalid.`);
  }
}
