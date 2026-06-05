import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createClosedLocalhostBaseUrl, runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-fallback-learning-'));
const workspacePath = path.join(tempRoot, 'workspace');
const recoverableFailureBaseUrl = await createClosedLocalhostBaseUrl();
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'provider-fallback-learning-workspace'],
});

const fallbackMission = runCli({
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
    'Provider fallback learning extraction',
    '--objective',
    'Verify provider fallback events become review-only provider lessons.',
  ],
});

const fallbackResult = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackMission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});

assert.equal(fallbackResult.status, 'completed');
assert.equal(fallbackResult.providerFallback.fallbackUsed, true);
assert.equal(fallbackResult.providerFallback.policyId, 'provider-failure-only');

const fallbackQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'learning-promotions', '--mission', fallbackMission.id, '--status', 'all'],
});
const fallbackProviderLessons = fallbackQueue.items.filter((item) => item.recordType === 'provider-lesson');
assert.equal(fallbackProviderLessons.length, 2);
assert.ok(fallbackProviderLessons.every((item) => item.proposalTarget === 'provider-policy'));
assert.ok(fallbackProviderLessons.every((item) => /Provider fallback policy provider-failure-only/.test(item.reason)));
assert.equal(fallbackQueue.summary.recordTypeCounts['provider-lesson'], 2);
assert.equal(fallbackQueue.summary.targetCounts['provider-policy'], 2);

const finalFallbackSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', fallbackMission.id, '--session', fallbackResult.sessionId],
});
const finalFallbackCandidate = finalFallbackSession.learningCandidates.find(
  (candidate) => candidate.id === fallbackResult.learningCandidateId,
);
assert.ok(finalFallbackCandidate);
assert.equal(finalFallbackCandidate.recordType, 'provider-lesson');
assert.equal(finalFallbackCandidate.proposal.target, 'provider-policy');
assert.equal(finalFallbackCandidate.evidence.providerFallbackPolicy, 'provider-failure-only');
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.fallbackUsed, true);
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.primaryProviderId, 'anthropic');
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.selectedProviderId, 'stub');
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.attempts.length, 2);
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureKind, 'config');
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureRecoverable, false);
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.attempts[0].fallbackStopReason, 'eligible-provider-failure');
assert.equal(finalFallbackCandidate.evidence.providerFallbackSummary.attempts[0].nextProviderId, 'stub');
assert.equal(
  finalFallbackCandidate.evidence.providerFallbackStopReasonCounts['mission-status-completed'],
  1,
);
assert.doesNotMatch(JSON.stringify(finalFallbackCandidate.evidence.providerFallbackSummary), /ANTHROPIC_API_KEY/);

const finalFallbackArtifact = finalFallbackSession.artifacts.find((artifact) => artifact.fileName === 'learning-candidate.json');
assert.ok(finalFallbackArtifact);
const finalFallbackArtifactPayload = JSON.parse(fs.readFileSync(finalFallbackArtifact.path, 'utf8'));
assert.equal(finalFallbackArtifactPayload.recordType, 'provider-lesson');
assert.equal(finalFallbackArtifactPayload.evidence.providerFallbackSummary.selectedProviderId, 'stub');

const primaryFallbackSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', fallbackMission.id, '--session', fallbackResult.providerFallback.attempts[0].sessionId],
});
const primaryFallbackCandidate = primaryFallbackSession.learningCandidates[0];
assert.equal(primaryFallbackCandidate.recordType, 'provider-lesson');
assert.equal(primaryFallbackCandidate.evidence.providerFailure.failureKind, 'config');
assert.equal(primaryFallbackCandidate.evidence.providerFallbackSummary.selectedProviderId, 'stub');
assert.equal(primaryFallbackCandidate.evidence.providerFallbackSummary.fallbackUsed, true);

const fallbackTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', fallbackMission.id],
});
const fallbackLearningEvents = fallbackTimeline.timeline.filter((event) => event.kind === 'learning-candidate-created');
assert.equal(fallbackLearningEvents.length, 2);
assert.ok(fallbackLearningEvents.every((event) => event.recordType === 'provider-lesson'));
assert.ok(
  fallbackLearningEvents.every(
    (event) =>
      event.providerFallbackPolicy === 'provider-failure-only' &&
      event.providerFallbackSummary.selectedProviderId === 'stub',
  ),
);

const recoverableStopMission = runCli({
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
    'Recoverable-only provider fallback lesson',
    '--objective',
    'Verify non-recoverable stop conditions become provider policy lessons.',
  ],
});

const recoverableStopResult = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: [
    'mission',
    'run',
    recoverableStopMission.id,
    '--provider',
    'anthropic',
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'recoverable-provider-failure-only',
  ],
});

assert.equal(recoverableStopResult.status, 'failed');
assert.equal(recoverableStopResult.providerFallback.fallbackUsed, false);
assert.equal(recoverableStopResult.providerFallback.attempts[0].fallbackStopReason, 'non-recoverable-provider-failure');

const recoverableStopSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', recoverableStopMission.id, '--session', recoverableStopResult.sessionId],
});
const recoverableStopCandidate = recoverableStopSession.learningCandidates[0];
assert.equal(recoverableStopCandidate.recordType, 'provider-lesson');
assert.equal(recoverableStopCandidate.proposal.target, 'provider-policy');
assert.equal(recoverableStopCandidate.evidence.providerFallbackPolicy, 'recoverable-provider-failure-only');
assert.equal(recoverableStopCandidate.evidence.providerFallbackSummary.fallbackUsed, false);
assert.equal(
  recoverableStopCandidate.evidence.providerFallbackStopReasonCounts['non-recoverable-provider-failure'],
  1,
);
assert.equal(recoverableStopCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureKind, 'config');
assert.equal(recoverableStopCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureRecoverable, false);

const recoverableStopPromotionQueue = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'learning-promotions',
    '--mission',
    recoverableStopMission.id,
    '--status',
    'all',
    '--provider-fallback-stop-reason',
    'non-recoverable-provider-failure',
  ],
});
assert.equal(recoverableStopPromotionQueue.filters.providerFallbackStopReason, 'non-recoverable-provider-failure');
assert.equal(recoverableStopPromotionQueue.items.length, 1);
assert.equal(recoverableStopPromotionQueue.items[0].learningCandidateId, recoverableStopCandidate.id);
assert.equal(
  recoverableStopPromotionQueue.items[0].providerFallbackStopReasonCounts['non-recoverable-provider-failure'],
  1,
);

const recoverableStopInbox = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'inbox',
    '--mission',
    recoverableStopMission.id,
    '--provider-fallback-stop-reason',
    'non-recoverable-provider-failure',
  ],
});
assert.equal(recoverableStopInbox.filters.providerFallbackStopReason, 'non-recoverable-provider-failure');
assert.equal(recoverableStopInbox.items.length, 1);
assert.equal(recoverableStopInbox.items[0].learningCandidateId, recoverableStopCandidate.id);

const emptyRecoverableStopInbox = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'inbox',
    '--mission',
    recoverableStopMission.id,
    '--provider-fallback-stop-reason',
    'eligible-provider-failure',
  ],
});
assert.equal(emptyRecoverableStopInbox.items.length, 0);

const deterministicFailureMission = runCli({
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
    'Reviewer failure remains quality regression',
    '--objective',
    'Verify non-provider failures are not reclassified as provider lessons by fallback metadata.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const deterministicFailureResult = runCli({
  rootDir: tempRoot,
  env: {
    OPENAI_API_KEY: '',
  },
  args: ['mission', 'run', deterministicFailureMission.id, '--provider', 'stub', '--fallback-provider', 'openai'],
});

assert.equal(deterministicFailureResult.status, 'failed');
assert.equal(deterministicFailureResult.providerFallback.fallbackUsed, false);
assert.equal(deterministicFailureResult.providerFallback.attempts[0].fallbackStopReason, 'no-provider-failure-metadata');

const deterministicFailureSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', deterministicFailureMission.id, '--session', deterministicFailureResult.sessionId],
});
const deterministicFailureCandidate = deterministicFailureSession.learningCandidates[0];
assert.equal(deterministicFailureCandidate.recordType, 'quality-regression');
assert.equal(deterministicFailureCandidate.proposal.target, 'skill');
assert.equal(deterministicFailureCandidate.evidence.providerFallbackPolicy, 'provider-failure-only');
assert.equal(
  deterministicFailureCandidate.evidence.providerFallbackStopReasonCounts['no-provider-failure-metadata'],
  1,
);

const recoverableSuccessMission = runCli({
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
    'Recoverable transport fallback learning',
    '--objective',
    'Verify recoverable transport fallback records recoverable provider lesson evidence.',
  ],
});

const recoverableSuccessResult = runCli({
  rootDir: tempRoot,
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_BASE_URL: recoverableFailureBaseUrl,
  },
  args: [
    'mission',
    'run',
    recoverableSuccessMission.id,
    '--provider',
    'openai',
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'recoverable-provider-failure-only',
  ],
});

assert.equal(recoverableSuccessResult.status, 'completed');
assert.equal(recoverableSuccessResult.providerFallback.fallbackUsed, true);
const recoverableSuccessSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', recoverableSuccessMission.id, '--session', recoverableSuccessResult.sessionId],
});
const recoverableSuccessCandidate = recoverableSuccessSession.learningCandidates[0];
assert.equal(recoverableSuccessCandidate.recordType, 'provider-lesson');
assert.equal(recoverableSuccessCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureKind, 'transport');
assert.equal(recoverableSuccessCandidate.evidence.providerFallbackSummary.attempts[0].providerFailureRecoverable, true);
assert.equal(recoverableSuccessCandidate.evidence.providerFallbackSummary.selectedProviderId, 'stub');

console.log(
  JSON.stringify(
    {
      deterministicFailureRecordType: deterministicFailureCandidate.recordType,
      fallbackProviderLessonCount: fallbackProviderLessons.length,
      mode: 'provider-fallback-learning-lessons',
      ok: true,
      recoverableStopRecordType: recoverableStopCandidate.recordType,
      recoverableSuccessRecordType: recoverableSuccessCandidate.recordType,
    },
    null,
    2,
  ),
);
