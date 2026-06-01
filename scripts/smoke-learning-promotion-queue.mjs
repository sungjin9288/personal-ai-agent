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

const promotedTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', promotedMission.id],
});
assert.equal(
  promotedTimeline.timeline.some(
    (event) =>
      event.kind === 'learning-candidate-promotion-approved' &&
      event.learningCandidateId === promotedRun.learningCandidateId &&
      event.memoryId === promotionResult.memoryEntry.id,
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
      /forced regression fixture/i.test(event.detail),
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      mode: 'learning-promotion-queue',
      ok: true,
      promotedCandidateId: promotedRun.learningCandidateId,
      rejectedCandidateId: rejectedRun.learningCandidateId,
    },
    null,
    2,
  ),
);
