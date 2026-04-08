import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-orchestration-profiles-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'orchestration-profiles-workspace',
  workspacePath,
});

const knowledgeMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-triad'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify orchestration profile usage overview for a completed triad mission.',
  title: 'Knowledge triad mission',
  workspaceId: workspace.id,
});

await service.runMission(knowledgeMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

const gateMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-triad', 'parallel-abandon:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify blocked quality gate pressure is grouped under the owning orchestration profile.',
  title: 'Knowledge triad gate mission',
  workspaceId: workspace.id,
});

await service.runMission(gateMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

const engineeringMission = service.createMission({
  constraints: ['orchestration-profile:engineering-implementation-verification'],
  deliverableType: 'implementation-proposal',
  mode: 'engineering',
  objective: 'Verify unused-vs-selected profile coverage for engineering presets.',
  title: 'Engineering implementation verification mission',
  workspaceId: workspace.id,
});

const overview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles'],
});

assert.deepEqual(overview.filters, {
  mode: null,
  usedOnly: false,
});
assert.equal(overview.healthDrift.status, 'follow-up-required');
assert.equal(overview.healthDrift.profileCount, 1);
assert.equal(overview.healthDrift.statusCounts['follow-up-required'], 1);
assert.equal(overview.healthDrift.statusCounts.watch, 0);
assert.equal(overview.healthDrift.reasonCodeCounts['quality-gate-blocked'], 1);
assert.equal(overview.healthDrift.reasonCodeCounts['specialist-follow-up-open'], 1);
assert.equal(overview.healthDrift.latestProfile.id, 'knowledge-triad');
assert.equal(overview.summary.total, 4);
assert.equal(overview.summary.usedCount, 2);
assert.equal(overview.summary.unusedCount, 2);
assert.equal(overview.summary.modeCounts.knowledge, 2);
assert.equal(overview.summary.modeCounts.engineering, 2);
assert.equal(overview.summary.qualityGateCounts['manager-merge-ready'], 1);
assert.equal(overview.summary.qualityGateCounts['verification-signal-required'], 2);
assert.equal(overview.summary.qualityGateCounts['research-and-verification-signal-required'], 1);
assert.equal(overview.summary.retryPolicyCounts['resume-blocked-or-failed-branch'], 1);
assert.equal(overview.summary.retryPolicyCounts['resume-verification-fast'], 2);
assert.equal(overview.summary.retryPolicyCounts['resume-research-and-verification-fast'], 1);
assert.equal(overview.summary.missionCountTotal, 3);
assert.equal(overview.summary.parallelGroupCountTotal, 2);
assert.equal(overview.summary.mergedParallelGroupCountTotal, 1);
assert.equal(overview.summary.qualityGateBlockedGroupCountTotal, 1);
assert.equal(overview.summary.specialistFollowUpRequiredCountTotal, 1);
assert.equal(overview.summary.specialistFollowUpNeedsReminderCountTotal, 0);
assert.equal(overview.summary.specialistFollowUpOverdueCountTotal, 0);
assert.equal(overview.summary.specialistFollowUpReminderCountTotal, 0);
assert.equal(overview.summary.specialistFollowUpRetryPolicyCounts['resume-verification-fast'], 1);
assert.equal(overview.summary.specialistFollowUpRemediationRouteCounts['priority-verification-remediation'], 1);
assert.equal(overview.summary.specialistFollowUpLatestReminderAt, null);
assert.equal(overview.summary.specialistFollowUpNextReminderAt, null);
assert.equal(overview.summary.healthDriftProfileCount, 1);
assert.equal(overview.summary.healthDriftStatusCounts['follow-up-required'], 1);
assert.equal(overview.summary.healthDriftStatusCounts.watch, 0);
assert.equal(overview.summary.healthDriftStatusCounts.stable, 3);
assert.equal(overview.summary.healthDriftReasonCodeCounts['quality-gate-blocked'], 1);
assert.equal(overview.summary.healthDriftReasonCodeCounts['specialist-follow-up-open'], 1);
assert.equal(overview.summary.latestHealthDriftProfile.id, 'knowledge-triad');
assert.deepEqual(overview.summary.touchedProfileIds, [
  'engineering-implementation-verification',
  'knowledge-triad',
]);
assert.equal(overview.summary.latestUsedProfile.id, 'engineering-implementation-verification');

const knowledgeTriad = overview.items.find((item) => item.id === 'knowledge-triad');
assert.ok(knowledgeTriad);
assert.equal(knowledgeTriad.used, true);
assert.equal(knowledgeTriad.missionCount, 2);
assert.equal(knowledgeTriad.parallelGroupCount, 2);
assert.equal(knowledgeTriad.mergedParallelGroupCount, 1);
assert.equal(knowledgeTriad.qualityGateBlockedGroupCount, 1);
assert.equal(knowledgeTriad.specialistFollowUpRequiredCount, 1);
assert.equal(knowledgeTriad.specialistFollowUpReminderCountTotal, 0);
assert.equal(knowledgeTriad.specialistFollowUpRetryPolicyCounts['resume-verification-fast'], 1);
assert.equal(knowledgeTriad.specialistFollowUpRemediationRouteCounts['priority-verification-remediation'], 1);
assert.equal(knowledgeTriad.specialistFollowUpKindCounts.verification, 1);
assert.equal(knowledgeTriad.specialistFollowUpLatestReminderAt, null);
assert.equal(knowledgeTriad.specialistFollowUpNextReminderAt, null);
assert.equal(knowledgeTriad.specialistFollowUpStatusCounts.blocked, 1);
assert.equal(knowledgeTriad.healthDrift.status, 'follow-up-required');
assert.deepEqual(knowledgeTriad.healthDrift.reasonCodes, [
  'quality-gate-blocked',
  'specialist-follow-up-open',
]);
assert.equal(knowledgeTriad.missionStatusCounts.completed, 1);
assert.equal(knowledgeTriad.missionStatusCounts.failed, 1);
assert.equal(knowledgeTriad.latestMission.id, gateMission.id);
assert.equal(knowledgeTriad.latestParallelGroup.missionId, gateMission.id);
assert.equal(knowledgeTriad.latestParallelGroup.qualityGate.status, 'blocked');
assert.deepEqual(knowledgeTriad.touchedMissionIds, [gateMission.id, knowledgeMission.id].sort((left, right) => String(left).localeCompare(String(right))));

const engineeringImplementationVerification = overview.items.find(
  (item) => item.id === 'engineering-implementation-verification',
);
assert.ok(engineeringImplementationVerification);
assert.equal(engineeringImplementationVerification.used, true);
assert.equal(engineeringImplementationVerification.missionCount, 1);
assert.equal(engineeringImplementationVerification.parallelGroupCount, 0);
assert.equal(engineeringImplementationVerification.specialistFollowUpRequiredCount, 0);
assert.deepEqual(engineeringImplementationVerification.specialistFollowUpRetryPolicyCounts, {});
assert.deepEqual(engineeringImplementationVerification.specialistFollowUpRemediationRouteCounts, {});
assert.equal(engineeringImplementationVerification.healthDrift.status, 'stable');
assert.deepEqual(engineeringImplementationVerification.healthDrift.reasonCodes, []);
assert.equal(engineeringImplementationVerification.missionStatusCounts.created, 1);
assert.equal(engineeringImplementationVerification.latestMission.id, engineeringMission.id);

const usedOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--used-only'],
});

assert.equal(usedOnlyOverview.summary.total, 2);
assert.equal(usedOnlyOverview.summary.usedCount, 2);
assert.equal(usedOnlyOverview.summary.unusedCount, 0);
assert.equal(usedOnlyOverview.items.every((item) => item.used), true);

const knowledgeOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--mode', 'knowledge', '--used-only'],
});

assert.deepEqual(knowledgeOnlyOverview.filters, {
  mode: 'knowledge',
  usedOnly: true,
});
assert.equal(knowledgeOnlyOverview.summary.total, 1);
assert.equal(knowledgeOnlyOverview.summary.missionCountTotal, 2);
assert.equal(knowledgeOnlyOverview.items.length, 1);
assert.equal(knowledgeOnlyOverview.items[0].id, 'knowledge-triad');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'orchestration-profiles-overview',
      touchedProfileIds: overview.summary.touchedProfileIds,
      usedCount: overview.summary.usedCount,
    },
    null,
    2,
  ),
);
