import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-promotion-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'learning-promotion-workspace'],
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
    'Learning promotion approve',
    '--objective',
    'Create a success-pattern candidate and promote it as scoped mission memory.',
  ],
});

const promotedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', promotedMission.id, '--provider', 'stub'],
});

assert.equal(promotedRun.status, 'completed');
assert.ok(promotedRun.learningCandidateId);

const pendingQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', promotedMission.id],
});

assert.equal(pendingQueue.filters.status, 'pending-review');
assert.equal(pendingQueue.items.length, 1);
assert.equal(pendingQueue.summary.pendingCount, 1);
assert.equal(pendingQueue.items[0].actionType, 'learning-promotion');
assert.equal(pendingQueue.items[0].actionClass, 'awaiting-human-decision');
assert.equal(pendingQueue.items[0].expirationPolicy.policyId, 'pending-review-expires-unpromoted');
assert.equal(pendingQueue.items[0].expirationPolicy.reviewTtlHours, 168);
assert.equal(pendingQueue.items[0].expirationPolicy.status, 'active');
assert.match(pendingQueue.items[0].expireCommand, /expire-learning-promotions/);
assert.equal(pendingQueue.items[0].learningCandidateId, promotedRun.learningCandidateId);
assert.match(pendingQueue.items[0].resolveCommand, /resolve-learning-promotion/);

const actionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--mission', promotedMission.id, '--class', 'awaiting-human-decision'],
});

assert.equal(actionInbox.summary.actionCounts.learningPromotion, 1);
assert.equal(actionInbox.items.some((item) => item.learningCandidateId === promotedRun.learningCandidateId), true);

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
    'Promote successful decision memo pattern as mission-scoped memory only.',
  ],
});

assert.equal(promotionResult.learningCandidate.promotionStatus, 'promoted');
assert.equal(promotionResult.learningCandidate.promotionDecision.decision, 'approve');
assert.equal(promotionResult.learningCandidate.promotionDecision.target, 'memory');
assert.equal(promotionResult.learningCandidate.promotionDecision.scope, 'mission');
assert.ok(promotionResult.memoryEntry.id);
assert.equal(
  promotionResult.learningCandidate.promotionDecision.verificationId,
  promotionResult.learningCandidate.promotionVerification.id,
);
assert.equal(promotionResult.learningCandidate.promotionVerification.status, 'passed');
assert.equal(promotionResult.learningCandidate.promotionVerification.rollbackTarget.memoryId, promotionResult.memoryEntry.id);
assert.equal(promotionResult.memoryEntry.scope, 'mission');
assert.equal(promotionResult.memoryEntry.scopeId, promotedMission.id);

const promotedSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', promotedMission.id, '--session', promotedRun.sessionId],
});
const promotedArtifact = promotedSession.artifacts.find((artifact) => artifact.fileName === 'learning-candidate.json');
assert.ok(promotedArtifact);
const promotedArtifactPayload = JSON.parse(fs.readFileSync(promotedArtifact.path, 'utf8'));
assert.equal(promotedArtifactPayload.promotionStatus, 'promoted');
assert.equal(promotedArtifactPayload.promotionDecision.memoryId, promotionResult.memoryEntry.id);
assert.equal(promotedArtifactPayload.retention.policy, 'pending-review-expires-unpromoted');
assert.equal(promotedArtifactPayload.retention.reviewTtlHours, 168);
assert.ok(promotedArtifactPayload.retention.expiresAt);

const missionMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', promotedMission.id],
});

assert.equal(
  missionMemory.some(
    (entry) =>
      entry.id === promotionResult.memoryEntry.id &&
      /Learning candidate promoted \[memory\]/.test(entry.content) &&
      /mission-scoped memory only/i.test(entry.content),
  ),
  true,
);

const postPromotionQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', promotedMission.id],
});
assert.equal(postPromotionQueue.items.length, 0);
assert.equal(postPromotionQueue.summary.pendingCount, 0);

const promotedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', promotedMission.id, '--status', 'promoted'],
});
assert.equal(promotedQueue.items.length, 1);
assert.equal(promotedQueue.summary.statusCounts.promoted, 1);
assert.equal(promotedQueue.items[0].rollbackEligible, true);
assert.match(promotedQueue.items[0].rollbackCommand, /rollback-learning-promotion/);

const promotedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', promotedMission.id],
});
assert.equal(
  promotedTimeline.timeline.some(
    (event) =>
      event.kind === 'learning-candidate-promotion-approved' &&
      event.learningCandidateId === promotedRun.learningCandidateId &&
      event.memoryId === promotionResult.memoryEntry.id &&
      event.promotionVerificationStatus === 'passed',
  ),
  true,
);

const rollbackResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'rollback-learning-promotion',
    promotedRun.learningCandidateId,
    '--note',
    'Rollback promoted mission memory after operator review.',
  ],
});

assert.equal(rollbackResult.learningCandidate.promotionStatus, 'rolled-back');
assert.equal(rollbackResult.learningCandidate.promotionRollback.memoryRollbackStatus, 'memory-deleted');
assert.equal(rollbackResult.learningCandidate.promotionDecision.rollback.status, 'completed');
assert.equal(rollbackResult.removedMemoryEntry.id, promotionResult.memoryEntry.id);

const postRollbackMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', promotedMission.id],
});
assert.equal(postRollbackMemory.some((entry) => entry.id === promotionResult.memoryEntry.id), false);

const rolledBackQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', promotedMission.id, '--status', 'rolled-back'],
});
assert.equal(rolledBackQueue.items.length, 1);
assert.equal(rolledBackQueue.summary.statusCounts['rolled-back'], 1);
assert.equal(rolledBackQueue.items[0].rollbackEligible, false);

const rollbackTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', promotedMission.id],
});
assert.equal(
  rollbackTimeline.timeline.some(
    (event) =>
      event.kind === 'learning-candidate-promotion-rolled-back' &&
      event.learningCandidateId === promotedRun.learningCandidateId &&
      event.memoryRollbackStatus === 'memory-deleted',
  ),
  true,
);

const expiredMission = runCli({
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
    'Learning promotion expiration',
    '--objective',
    'Create a candidate that should expire from the review queue.',
  ],
});

const expiredRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', expiredMission.id, '--provider', 'stub'],
});

assert.equal(expiredRun.status, 'completed');
assert.ok(expiredRun.learningCandidateId);

const expirationResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'expire-learning-promotions',
    '--mission',
    expiredMission.id,
    '--before',
    '2999-01-01T00:00:00.000Z',
    '--note',
    'Expire stale review-only candidate instead of leaving it pending forever.',
  ],
});

assert.equal(expirationResult.summary.expiredCount, 1);
assert.equal(expirationResult.expiredCandidates[0].id, expiredRun.learningCandidateId);
assert.equal(expirationResult.expiredCandidates[0].promotionStatus, 'expired');
assert.equal(expirationResult.expiredCandidates[0].promotionExpiration.policyId, 'pending-review-expires-unpromoted');

const expiredPendingQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', expiredMission.id],
});
assert.equal(expiredPendingQueue.items.length, 0);
assert.equal(expiredPendingQueue.summary.pendingCount, 0);

const expiredQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', expiredMission.id, '--status', 'expired'],
});
assert.equal(expiredQueue.items.length, 1);
assert.equal(expiredQueue.summary.statusCounts.expired, 1);
assert.equal(expiredQueue.items[0].expirationPolicy.status, 'expired');

const expirationTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', expiredMission.id],
});
assert.equal(
  expirationTimeline.timeline.some(
    (event) =>
      event.kind === 'learning-candidate-promotion-expired' &&
      event.learningCandidateId === expiredRun.learningCandidateId &&
      /pending-review-expires-unpromoted/.test(event.detail),
  ),
  true,
);

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
    'Learning promotion reject',
    '--objective',
    'Create a quality-regression candidate and reject promotion.',
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

const rejectResult = runCli({
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
    'Do not promote this forced regression fixture.',
  ],
});

assert.equal(rejectResult.learningCandidate.promotionStatus, 'rejected');
assert.equal(rejectResult.learningCandidate.promotionDecision.decision, 'reject');
assert.equal(
  rejectResult.learningCandidate.promotionDecision.verificationId,
  rejectResult.learningCandidate.promotionVerification.id,
);
assert.equal(rejectResult.learningCandidate.promotionVerification.status, 'passed');
assert.equal(rejectResult.learningCandidate.promotionVerification.rollbackTarget.action, 'ignore-learning-candidate-decision');
assert.equal(rejectResult.memoryEntry, null);

const rejectedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', rejectedMission.id, '--status', 'rejected'],
});
assert.equal(rejectedQueue.items.length, 1);
assert.equal(rejectedQueue.items[0].recordType, 'quality-regression');

const rejectedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', rejectedMission.id],
});
assert.equal(
  rejectedTimeline.timeline.some(
    (event) =>
      event.kind === 'learning-candidate-promotion-rejected' &&
      event.learningCandidateId === rejectedRun.learningCandidateId &&
      event.promotionVerificationStatus === 'passed' &&
      /forced regression fixture/i.test(event.detail),
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      mode: 'learning-promotion-queue',
      ok: true,
      expiredCandidateId: expiredRun.learningCandidateId,
      promotedCandidateId: promotedRun.learningCandidateId,
      rejectedCandidateId: rejectedRun.learningCandidateId,
      rolledBackCandidateId: promotedRun.learningCandidateId,
    },
    null,
    2,
  ),
);
