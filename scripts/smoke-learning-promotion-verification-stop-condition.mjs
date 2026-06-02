import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-promotion-stop-condition-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

function readState() {
  return JSON.parse(fs.readFileSync(path.join(tempRoot, 'var', 'state.json'), 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(path.join(tempRoot, 'var', 'state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'learning-promotion-stop-condition-workspace'],
});

const mission = runCli({
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
    'Learning promotion verification stop condition',
    '--objective',
    'Create a success-pattern candidate and then block unsafe promotion with a verification stop-condition.',
  ],
});

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(run.status, 'completed');
assert.ok(run.learningCandidateId);

const unsafeState = readState();
const unsafeCandidate = unsafeState.learningCandidates.find((candidate) => candidate.id === run.learningCandidateId);
assert.ok(unsafeCandidate);
unsafeCandidate.safety.noRawSecrets = false;
unsafeCandidate.summary = `${unsafeCandidate.summary} Fixture intentionally marks noRawSecrets=false.`;
writeState(unsafeState);

const blockedResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    run.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Attempt to approve unsafe memory promotion; verification must stop before mutation.',
  ],
});

assert.equal(blockedResult.memoryEntry, null);
assert.equal(blockedResult.learningCandidate.promotionStatus, 'verification-blocked');
assert.equal(blockedResult.learningCandidate.promotionDecision.decision, 'blocked');
assert.equal(blockedResult.learningCandidate.promotionDecision.requestedDecision, 'approve');
assert.equal(blockedResult.learningCandidate.promotionDecision.memoryId, null);
assert.equal(blockedResult.learningCandidate.promotionDecision.rollback.action, 'ignore-learning-candidate-decision');
assert.equal(
  blockedResult.learningCandidate.promotionDecision.verificationId,
  blockedResult.learningCandidate.promotionVerification.id,
);
assert.equal(blockedResult.learningCandidate.promotionStopCondition.status, 'blocked');
assert.equal(blockedResult.learningCandidate.promotionStopCondition.requestedDecision, 'approve');
assert.equal(
  blockedResult.learningCandidate.promotionStopCondition.reason,
  'learning-promotion-verification-no-raw-secrets',
);

const blockedVerification = blockedResult.learningCandidate.promotionVerification;
assert.equal(blockedVerification.status, 'failed');
assert.equal(blockedVerification.stopReason, 'learning-promotion-verification-no-raw-secrets');
assert.equal(blockedVerification.verificationPhase, 'pre-mutation');
assert.equal(blockedVerification.rollbackTarget.action, 'ignore-learning-candidate-decision');
assert.equal(blockedVerification.rollbackTarget.memoryId, null);
assert.equal(blockedVerification.checkCounts.failed, 1);
assert.equal(
  blockedVerification.checks.some(
    (check) => check.id === 'no-raw-secrets' && check.status === 'failed' && check.passed === false,
  ),
  true,
);
assert.equal(blockedVerification.productionReadyClaim, false);
assert.equal(blockedVerification.autonomousPromotionEnabled, false);

const missionMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', mission.id],
});
assert.equal(missionMemory.length, 0);

const blockedSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id, '--session', run.sessionId],
});
const blockedArtifact = blockedSession.artifacts.find((artifact) => artifact.fileName === 'learning-candidate.json');
assert.ok(blockedArtifact);
const blockedArtifactPayload = JSON.parse(fs.readFileSync(blockedArtifact.path, 'utf8'));
assert.equal(blockedArtifactPayload.promotionStatus, 'verification-blocked');
assert.equal(blockedArtifactPayload.promotionVerification.status, 'failed');
assert.equal(blockedArtifactPayload.promotionStopCondition.reason, 'learning-promotion-verification-no-raw-secrets');

const blockedAudit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--mission', mission.id, '--status', 'verification-blocked'],
});
assert.equal(blockedAudit.summary.recordCount, 1);
assert.equal(blockedAudit.summary.promotionStatusCounts['verification-blocked'], 1);
assert.equal(blockedAudit.summary.promotionDecisionResultCounts.blocked, 1);
assert.equal(blockedAudit.summary.promotionStopConditionCount, 1);
assert.equal(blockedAudit.summary.promotionStopConditionReasonCounts['learning-promotion-verification-no-raw-secrets'], 1);
assert.equal(blockedAudit.summary.promotionVerificationCount, 1);
assert.equal(blockedAudit.summary.promotionVerificationFailedCount, 1);
assert.equal(blockedAudit.summary.promotionVerificationStatusCounts.failed, 1);
assert.equal(
  blockedAudit.summary.promotionVerificationStopReasonCounts['learning-promotion-verification-no-raw-secrets'],
  1,
);
assert.equal(blockedAudit.records[0].promotionStopCondition.reason, 'learning-promotion-verification-no-raw-secrets');
assert.equal(blockedAudit.records[0].promotionVerificationStatus, 'failed');
assert.equal(blockedAudit.records[0].memoryPromotionId, null);
assert.equal(blockedAudit.records[0].rollbackEligible, false);

const blockedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', mission.id, '--status', 'verification-blocked'],
});
assert.equal(blockedQueue.items.length, 1);
assert.equal(blockedQueue.summary.statusCounts['verification-blocked'], 1);
assert.equal(blockedQueue.items[0].actionClass, 'blocked');
assert.equal(blockedQueue.items[0].priority, 'high');
assert.equal(blockedQueue.items[0].recommendedOwner, 'human-approver');
assert.equal(blockedQueue.items[0].recommendedCommand.includes('--decision reject'), true);
assert.equal(blockedQueue.items[0].promotionVerificationStatus, 'failed');
assert.equal(blockedQueue.items[0].promotionStopReason, 'learning-promotion-verification-no-raw-secrets');
assert.equal(blockedQueue.items[0].rollbackEligible, false);
assert.equal(blockedQueue.items[0].stopConditionRejectCommand.includes('resolve-learning-promotion'), true);
assert.equal(blockedQueue.items[0].stopConditionRejectCommand.includes('--decision reject'), true);

const operatorActiveQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', mission.id, '--status', 'operator-active'],
});
assert.equal(operatorActiveQueue.items.length, 1);
assert.equal(operatorActiveQueue.items[0].promotionStatus, 'verification-blocked');
assert.equal(operatorActiveQueue.items[0].actionClass, 'blocked');

const blockedActionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--mission', mission.id, '--class', 'blocked'],
});
assert.equal(blockedActionInbox.summary.pendingActionCount, 1);
assert.equal(blockedActionInbox.summary.actionCounts.learningPromotion, 1);
assert.equal(blockedActionInbox.summary.actionClassCounts.blocked, 1);
assert.equal(blockedActionInbox.items[0].actionType, 'learning-promotion');
assert.equal(blockedActionInbox.items[0].learningCandidateId, run.learningCandidateId);
assert.equal(blockedActionInbox.items[0].promotionStatus, 'verification-blocked');

const blockedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});
const blockedTimelineEvent = blockedTimeline.timeline.find(
  (event) =>
    event.kind === 'learning-candidate-promotion-verification-blocked' &&
    event.learningCandidateId === run.learningCandidateId,
);
assert.ok(blockedTimelineEvent);
assert.equal(blockedTimelineEvent.requestedDecision, 'approve');
assert.equal(blockedTimelineEvent.memoryId, null);
assert.equal(blockedTimelineEvent.promotionVerificationStatus, 'failed');
assert.equal(blockedTimelineEvent.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');

const stopConditionReject = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    run.learningCandidateId,
    '--decision',
    'reject',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Reject the unsafe blocked promotion so the operator queue closes without mutating memory.',
  ],
});
assert.equal(stopConditionReject.memoryEntry, null);
assert.equal(stopConditionReject.learningCandidate.promotionStatus, 'rejected');
assert.equal(stopConditionReject.learningCandidate.promotionDecision.decision, 'blocked');
assert.equal(stopConditionReject.learningCandidate.promotionDecision.remediationDecision, 'reject');
assert.equal(stopConditionReject.learningCandidate.promotionStopCondition.status, 'resolved');
assert.equal(stopConditionReject.learningCandidate.promotionStopCondition.resolution, 'rejected');
assert.equal(stopConditionReject.learningCandidate.promotionStopCondition.resolvedBy, 'local-operator');
assert.equal(
  stopConditionReject.learningCandidate.promotionStopCondition.reason,
  'learning-promotion-verification-no-raw-secrets',
);

const closedOperatorActiveQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', mission.id, '--status', 'operator-active'],
});
assert.equal(
  closedOperatorActiveQueue.items.some((item) => item.learningCandidateId === run.learningCandidateId),
  false,
);

const closedBlockedActionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--mission', mission.id, '--class', 'blocked'],
});
assert.equal(closedBlockedActionInbox.summary.pendingActionCount, 0);

const rejectedAudit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--mission', mission.id, '--status', 'rejected'],
});
assert.equal(rejectedAudit.summary.recordCount, 1);
assert.equal(rejectedAudit.summary.promotionStatusCounts.rejected, 1);
assert.equal(rejectedAudit.records[0].promotionStopCondition.status, 'resolved');
assert.equal(rejectedAudit.records[0].promotionStopCondition.resolution, 'rejected');
assert.equal(rejectedAudit.records[0].promotionDecision.remediationDecision, 'reject');

const resolvedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});
const resolvedTimelineEvent = resolvedTimeline.timeline.find(
  (event) =>
    event.kind === 'learning-candidate-promotion-stop-condition-resolved' &&
    event.learningCandidateId === run.learningCandidateId,
);
assert.ok(resolvedTimelineEvent);
assert.equal(resolvedTimelineEvent.resolution, 'rejected');
assert.equal(resolvedTimelineEvent.promotionStopReason, 'learning-promotion-verification-no-raw-secrets');

console.log(
  JSON.stringify(
    {
      mode: 'learning-promotion-verification-stop-condition',
      ok: true,
      blockedCandidateId: run.learningCandidateId,
      stopReason: blockedResult.learningCandidate.promotionStopCondition.reason,
    },
    null,
    2,
  ),
);
