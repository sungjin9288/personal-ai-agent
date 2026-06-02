import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-promotion-verification-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

function assertPassedVerification(verification, { decision, memoryId = null, target }) {
  assert.equal(verification.schemaVersion, 'personal-ai-agent-learning-promotion-verification/v1');
  assert.equal(verification.status, 'passed');
  assert.equal(verification.stopReason, '');
  assert.equal(verification.decision, decision);
  assert.equal(verification.target, target);
  assert.equal(verification.verificationType, 'local-deterministic-promotion-gate');
  assert.equal(verification.autonomousPromotionEnabled, false);
  assert.equal(verification.productionReadyClaim, false);
  assert.equal(verification.checkCounts.failed, 0);
  assert.ok(verification.checkCounts.passed >= 10);
  assert.equal(verification.rollbackTarget.memoryId, memoryId);
  assert.equal(
    verification.rollbackTarget.action,
    memoryId ? 'delete-memory-entry' : 'ignore-learning-candidate-decision',
  );
  assert.equal(verification.evidence.gatewayEventRoute, 'mission.run');

  const checkIds = new Set(verification.checks.map((check) => check.id));
  for (const checkId of [
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
  ]) {
    assert.equal(checkIds.has(checkId), true, `missing verification check: ${checkId}`);
  }
  assert.equal(verification.checks.every((check) => check.status === 'passed' && check.passed === true), true);
}

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'learning-promotion-verification-workspace'],
});

const promotedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Learning promotion verification approve',
    '--objective',
    'Create a success-pattern candidate and verify the manual promotion gate.',
  ],
});

const promotedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', promotedMission.id, '--provider', 'stub'],
});
assert.equal(promotedRun.status, 'completed');
assert.ok(promotedRun.learningCandidateId);

const promotionResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    promotedRun.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Verify promotion before writing this scoped lesson as memory.',
  ],
});

const promotedVerification = promotionResult.learningCandidate.promotionVerification;
assert.equal(promotionResult.learningCandidate.promotionStatus, 'promoted');
assert.ok(promotionResult.memoryEntry.id);
assert.equal(promotionResult.learningCandidate.promotionDecision.verificationId, promotedVerification.id);
assertPassedVerification(promotedVerification, {
  decision: 'approve',
  memoryId: promotionResult.memoryEntry.id,
  target: 'memory',
});

const promotedSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', promotedMission.id, '--session', promotedRun.sessionId],
});
const promotedArtifact = promotedSession.artifacts.find((artifact) => artifact.fileName === 'learning-candidate.json');
assert.ok(promotedArtifact);
const promotedArtifactPayload = JSON.parse(fs.readFileSync(promotedArtifact.path, 'utf8'));
assert.equal(promotedArtifactPayload.promotionVerification.id, promotedVerification.id);
assert.equal(promotedArtifactPayload.promotionDecision.verificationId, promotedVerification.id);

const promotedAudit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--mission', promotedMission.id, '--status', 'promoted'],
});
assert.equal(promotedAudit.summary.recordCount, 1);
assert.equal(promotedAudit.summary.promotionVerificationCount, 1);
assert.equal(promotedAudit.summary.promotionVerificationPassedCount, 1);
assert.equal(promotedAudit.summary.promotionVerificationFailedCount, 0);
assert.equal(promotedAudit.summary.promotionVerificationStatusCounts.passed, 1);
assert.equal(promotedAudit.summary.promotionVerificationTypeCounts['local-deterministic-promotion-gate'], 1);
assert.equal(promotedAudit.records[0].promotionVerificationId, promotedVerification.id);
assert.equal(promotedAudit.records[0].promotionVerificationStatus, 'passed');
assert.equal(promotedAudit.records[0].promotionVerificationPassed, true);
assert.equal(promotedAudit.records[0].promotionVerification.checkCounts.failed, 0);
assert.equal(promotedAudit.records[0].promotionDecision.verificationId, promotedVerification.id);

const promotedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', promotedMission.id],
});
const promotionTimelineEvent = promotedTimeline.timeline.find(
  (event) =>
    event.kind === 'learning-candidate-promotion-approved' &&
    event.learningCandidateId === promotedRun.learningCandidateId,
);
assert.ok(promotionTimelineEvent);
assert.equal(promotionTimelineEvent.promotionVerificationId, promotedVerification.id);
assert.equal(promotionTimelineEvent.promotionVerificationStatus, 'passed');
assert.equal(promotionTimelineEvent.promotionVerificationStopReason, '');

const rejectedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Learning promotion verification reject',
    '--objective',
    'Create a quality-regression candidate and verify the rejection gate.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const rejectedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', rejectedMission.id, '--provider', 'stub'],
});
assert.equal(rejectedRun.status, 'failed');
assert.ok(rejectedRun.learningCandidateId);

const rejectionResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    rejectedRun.learningCandidateId,
    '--decision',
    'reject',
    '--target',
    'skill',
    '--scope',
    'mission',
    '--note',
    'Reject the regression candidate after deterministic verification.',
  ],
});

const rejectedVerification = rejectionResult.learningCandidate.promotionVerification;
assert.equal(rejectionResult.learningCandidate.promotionStatus, 'rejected');
assert.equal(rejectionResult.memoryEntry, null);
assert.equal(rejectionResult.learningCandidate.promotionDecision.verificationId, rejectedVerification.id);
assertPassedVerification(rejectedVerification, {
  decision: 'reject',
  target: 'skill',
});

const rejectedAudit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--mission', rejectedMission.id, '--status', 'rejected'],
});
assert.equal(rejectedAudit.summary.recordCount, 1);
assert.equal(rejectedAudit.summary.promotionVerificationCount, 1);
assert.equal(rejectedAudit.summary.promotionVerificationPassedCount, 1);
assert.equal(rejectedAudit.summary.promotionVerificationStatusCounts.passed, 1);
assert.equal(rejectedAudit.records[0].promotionVerificationId, rejectedVerification.id);
assert.equal(rejectedAudit.records[0].promotionVerification.rollbackTarget.action, 'ignore-learning-candidate-decision');

const rejectedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', rejectedMission.id],
});
const rejectionTimelineEvent = rejectedTimeline.timeline.find(
  (event) =>
    event.kind === 'learning-candidate-promotion-rejected' &&
    event.learningCandidateId === rejectedRun.learningCandidateId,
);
assert.ok(rejectionTimelineEvent);
assert.equal(rejectionTimelineEvent.promotionVerificationId, rejectedVerification.id);
assert.equal(rejectionTimelineEvent.promotionVerificationStatus, 'passed');
assert.equal(rejectionTimelineEvent.promotionVerificationStopReason, '');

console.log(
  JSON.stringify(
    {
      mode: 'learning-promotion-verification-gate',
      ok: true,
      promotedCandidateId: promotedRun.learningCandidateId,
      rejectedCandidateId: rejectedRun.learningCandidateId,
      verificationCount:
        promotedAudit.summary.promotionVerificationCount + rejectedAudit.summary.promotionVerificationCount,
    },
    null,
    2,
  ),
);
