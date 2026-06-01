import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-gateway-learning-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'gateway-learning-workspace'],
});

const successMission = runCli({
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
    'Gateway event learning candidate',
    '--objective',
    'Verify gateway event bindings and review-only learning candidate creation.',
  ],
});

assert.ok(successMission.gatewayEventId, 'mission create should record a gateway event id');

const successRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', successMission.id, '--provider', 'stub'],
});

assert.equal(successRun.status, 'completed');
assert.ok(successRun.gatewayEventId, 'mission run should expose the gateway event id');
assert.ok(successRun.learningCandidateId, 'mission run should expose the learning candidate id');

const successSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', successMission.id, '--session', successRun.sessionId],
});

assert.equal(successSession.gatewayEvents.length, 1);
assert.equal(successSession.gatewayEvents[0].eventType, 'mission-run');
assert.equal(successSession.gatewayEvents[0].schemaVersion, 'personal-ai-agent-gateway-event/v1');
assert.equal(successSession.gatewayEvents[0].route.name, 'mission.run');
assert.equal(successSession.gatewayEvents[0].source.sourceType, 'cli');
assert.equal(successSession.session.sourceContext.gatewayEventId, successRun.gatewayEventId);
assert.equal(successSession.summary.gatewayEventId, successRun.gatewayEventId);

assert.equal(successSession.learningCandidates.length, 1);
const successCandidate = successSession.learningCandidates[0];
assert.equal(successCandidate.id, successRun.learningCandidateId);
assert.equal(successCandidate.schemaVersion, 'personal-ai-agent-learning-candidate/v1');
assert.equal(successCandidate.recordType, 'success-pattern');
assert.equal(successCandidate.status, 'proposed');
assert.equal(successCandidate.promotionStatus, 'pending-review');
assert.equal(successCandidate.autoPromotion, false);
assert.equal(successCandidate.proposal.approvalRequired, true);
assert.equal(successCandidate.safety.crossScopePromotionAllowed, false);
assert.equal(successCandidate.evidence.gatewayEventId, successRun.gatewayEventId);

const learningArtifact = successSession.artifacts.find((artifact) => artifact.fileName === 'learning-candidate.json');
assert.ok(learningArtifact, 'session should include learning-candidate.json artifact');
const learningArtifactPayload = JSON.parse(fs.readFileSync(learningArtifact.path, 'utf8'));
assert.equal(learningArtifactPayload.id, successCandidate.id);
assert.equal(learningArtifactPayload.artifactId, learningArtifact.id);

const successTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', successMission.id],
});
assert.ok(
  successTimeline.timeline.some((event) => event.kind === 'gateway-event-recorded' && event.gatewayEventId === successRun.gatewayEventId),
  'mission timeline should include the mission-run gateway event',
);
assert.ok(
  successTimeline.timeline.some(
    (event) => event.kind === 'learning-candidate-created' && event.learningCandidateId === successCandidate.id,
  ),
  'mission timeline should include the learning candidate event',
);

const successShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', successMission.id],
});
assert.equal(successShow.summary.gatewayEventCount, 2);
assert.equal(successShow.summary.learningCandidateCount, 1);
assert.equal(successShow.summary.learningCandidateRecordTypeCounts['success-pattern'], 1);
assert.equal(successShow.harness.loops.learning.candidateCount, 1);
assert.equal(successShow.harness.loops.learning.pendingReviewCount, 1);

const failureMission = runCli({
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
    'Gateway reviewer regression',
    '--objective',
    'Force reviewer failure and verify the learning candidate record type.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const failureRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failureMission.id, '--provider', 'stub'],
});

assert.equal(failureRun.status, 'failed');
assert.equal(failureRun.reviewerVerdict, 'fail');
assert.ok(failureRun.learningCandidateId);

const failureSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', failureMission.id, '--session', failureRun.sessionId],
});

assert.equal(failureSession.learningCandidates.length, 1);
assert.equal(failureSession.learningCandidates[0].recordType, 'quality-regression');
assert.equal(failureSession.learningCandidates[0].proposal.target, 'skill');
assert.equal(failureSession.learningCandidates[0].evidence.reviewerVerdict, 'fail');

console.log(
  JSON.stringify(
    {
      failureLearningCandidateId: failureRun.learningCandidateId,
      mode: 'gateway-event-learning-candidate',
      ok: true,
      successLearningCandidateId: successRun.learningCandidateId,
    },
    null,
    2,
  ),
);
