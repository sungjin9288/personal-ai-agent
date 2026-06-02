import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-candidate-audit-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const help = spawnSync(process.execPath, [cliPath, 'overview', 'learning-candidates', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
  },
});
assert.equal(help.status, 0);
assert.match(help.stdout, /overview learning-candidates/);
assert.match(help.stdout, /learningCandidate records/);
assert.match(help.stdout, /retention\/expiration policy/);
assert.match(help.stdout, /without enabling autonomous promotion/);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'learning-candidate-audit-workspace'],
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
    'Learning candidate audit success',
    '--objective',
    'Create a success pattern candidate that will be promoted as mission memory.',
  ],
});

const successRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', successMission.id, '--provider', 'stub'],
});
assert.equal(successRun.status, 'completed');
assert.ok(successRun.learningCandidateId);

const promotionResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    successRun.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'mission',
    '--note',
    'Promote one scoped success pattern after operator review.',
  ],
});
assert.equal(promotionResult.learningCandidate.promotionStatus, 'promoted');
assert.ok(promotionResult.memoryEntry.id);

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
    'Learning candidate audit quality regression',
    '--objective',
    'Create a quality regression candidate that will expire from review.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const failureRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failureMission.id, '--provider', 'stub'],
});
assert.equal(failureRun.status, 'failed');
assert.ok(failureRun.learningCandidateId);

const expirationResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'expire-learning-promotions',
    '--mission',
    failureMission.id,
    '--before',
    '2999-01-01T00:00:00.000Z',
    '--note',
    'Expire a stale regression candidate instead of promoting it.',
  ],
});
assert.equal(expirationResult.summary.expiredCount, 1);
assert.equal(expirationResult.expiredCandidates[0].id, failureRun.learningCandidateId);

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
    'Learning candidate audit provider lesson',
    '--objective',
    'Create provider fallback lesson candidates for audit summaries.',
  ],
});

const fallbackRun = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackMission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});
assert.equal(fallbackRun.status, 'completed');
assert.equal(fallbackRun.providerFallback.fallbackUsed, true);

const audit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--status', 'all'],
});

assert.equal(audit.summary.recordCount, 4);
assert.equal(audit.summary.recordTypeCounts['success-pattern'], 1);
assert.equal(audit.summary.recordTypeCounts['quality-regression'], 1);
assert.equal(audit.summary.recordTypeCounts['provider-lesson'], 2);
assert.equal(audit.summary.promotionStatusCounts.promoted, 1);
assert.equal(audit.summary.promotionStatusCounts.expired, 1);
assert.equal(audit.summary.promotionStatusCounts['pending-review'], 2);
assert.equal(audit.summary.proposalTargetCounts.template, 1);
assert.equal(audit.summary.proposalTargetCounts.skill, 1);
assert.equal(audit.summary.proposalTargetCounts['provider-policy'], 2);
assert.equal(audit.summary.promotionDecisionResultCounts.approve, 1);
assert.equal(audit.summary.promotionDecisionTargetCounts.memory, 1);
assert.equal(audit.summary.promotionVerificationCount, 1);
assert.equal(audit.summary.promotionVerificationPassedCount, 1);
assert.equal(audit.summary.promotionVerificationFailedCount, 0);
assert.equal(audit.summary.promotionVerificationStatusCounts.passed, 1);
assert.equal(audit.summary.promotionVerificationTypeCounts['local-deterministic-promotion-gate'], 1);
assert.equal(audit.summary.providerFallbackPolicyCounts['provider-failure-only'], 2);
assert.equal(audit.summary.providerFallbackUsedCount, 2);
assert.equal(audit.summary.providerFallbackStopReasonCounts['eligible-provider-failure'], 2);
assert.equal(audit.summary.providerFallbackStopReasonCounts['mission-status-completed'], 2);
assert.equal(audit.summary.providerFailureKindCounts.config, 2);
assert.equal(audit.summary.workspaceCounts[workspace.id], 4);
assert.equal(audit.summary.gatewayEventRouteCounts['mission.run'], 4);
assert.equal(audit.summary.gatewayEventTypeCounts['mission-run'], 4);
assert.equal(audit.summary.approvalRequiredCount, 4);
assert.equal(audit.summary.reviewerRequiredCount, 4);
assert.equal(audit.summary.rollbackEligibleCount, 1);
assert.equal(audit.summary.autoPromotionCount, 0);
assert.equal(audit.summary.autonomousPromotionEnabled, false);
assert.equal(audit.summary.evidencePolicy.noRawSecretsCount, 4);
assert.equal(audit.summary.evidencePolicy.noRawCustomerPayloadsCount, 4);
assert.equal(audit.summary.evidencePolicy.scopeLockedCount, 4);
assert.equal(audit.summary.evidencePolicy.crossScopePromotionAllowedCount, 0);
assert.equal(audit.summary.evidencePolicy.rawPayloadIncluded, false);
assert.equal(audit.summary.stopReason, '');
assert.equal(audit.summary.productionReadyClaim, false);

const promotedRecord = audit.records.find((record) => record.learningCandidateId === successRun.learningCandidateId);
assert.ok(promotedRecord);
assert.equal(promotedRecord.promotionStatus, 'promoted');
assert.equal(promotedRecord.promotionDecision.decision, 'approve');
assert.equal(promotedRecord.promotionDecision.target, 'memory');
assert.equal(promotedRecord.memoryPromotionId, promotionResult.memoryEntry.id);
assert.equal(promotedRecord.promotionDecision.verificationId, promotedRecord.promotionVerificationId);
assert.equal(promotedRecord.promotionVerification.status, 'passed');
assert.equal(promotedRecord.promotionVerificationPassed, true);
assert.equal(promotedRecord.promotionVerification.rollbackTarget.memoryId, promotionResult.memoryEntry.id);
assert.equal(promotedRecord.rollbackEligible, true);
assert.equal(promotedRecord.evidencePolicy.rawPayloadIncluded, false);

const expiredRecord = audit.records.find((record) => record.learningCandidateId === failureRun.learningCandidateId);
assert.ok(expiredRecord);
assert.equal(expiredRecord.recordType, 'quality-regression');
assert.equal(expiredRecord.promotionStatus, 'expired');
assert.equal(expiredRecord.expirationPolicy.status, 'expired');
assert.equal(expiredRecord.reviewerVerdict, 'fail');

const providerLessonRecords = audit.records.filter((record) => record.recordType === 'provider-lesson');
assert.equal(providerLessonRecords.length, 2);
assert.ok(providerLessonRecords.every((record) => record.providerFallbackPolicy === 'provider-failure-only'));
assert.ok(providerLessonRecords.some((record) => record.providerId === 'anthropic'));
assert.ok(providerLessonRecords.some((record) => record.providerId === 'stub'));

const missionFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--mission', successMission.id, '--status', 'all'],
});
assert.equal(missionFiltered.summary.recordCount, 1);
assert.equal(missionFiltered.records[0].learningCandidateId, successRun.learningCandidateId);

const sessionFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--session', successRun.sessionId, '--status', 'all'],
});
assert.equal(sessionFiltered.summary.recordCount, 1);
assert.equal(sessionFiltered.records[0].sessionId, successRun.sessionId);

const providerLessonFiltered = runCli({
  rootDir: tempRoot,
  args: [
    'overview',
    'learning-candidates',
    '--record-type',
    'provider-lesson',
    '--target',
    'provider-policy',
    '--provider-fallback-policy',
    'provider-failure-only',
    '--status',
    'all',
  ],
});
assert.equal(providerLessonFiltered.summary.recordCount, 2);
assert.equal(providerLessonFiltered.summary.filter.recordType, 'provider-lesson');
assert.equal(providerLessonFiltered.summary.filter.target, 'provider-policy');
assert.equal(providerLessonFiltered.summary.filter.providerFallbackPolicy, 'provider-failure-only');

const promotedFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--status', 'promoted', '--scope', 'mission'],
});
assert.equal(promotedFiltered.summary.recordCount, 1);
assert.equal(promotedFiltered.records[0].promotionStatus, 'promoted');

const emptySince = runCli({
  rootDir: tempRoot,
  args: ['overview', 'learning-candidates', '--since', '2999-01-01T00:00:00.000Z'],
});
assert.equal(emptySince.summary.recordCount, 0);
assert.equal(emptySince.summary.stopReason, 'no-learning-candidates');

console.log(
  JSON.stringify(
    {
      learningCandidateAuditCount: audit.summary.recordCount,
      mode: 'learning-candidate-audit-surface',
      ok: true,
      providerLessonCount: audit.summary.recordTypeCounts['provider-lesson'],
    },
    null,
    2,
  ),
);
