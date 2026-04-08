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

const secondWorkspacePath = path.join(tempRoot, 'workspace-two');
fs.mkdirSync(secondWorkspacePath, { recursive: true });

const secondWorkspace = service.addWorkspace({
  name: 'orchestration-profiles-workspace-two',
  workspacePath: secondWorkspacePath,
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

const engineeringTriadMission = service.createMission({
  constraints: ['orchestration-profile:engineering-triad'],
  deliverableType: 'implementation-proposal',
  mode: 'engineering',
  objective: 'Verify workspace-scoped orchestration profile usage overview.',
  title: 'Engineering triad second workspace mission',
  workspaceId: secondWorkspace.id,
});

const overview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles'],
});

assert.deepEqual(overview.filters, {
  driftOnly: false,
  mode: null,
  status: null,
  usedOnly: false,
  workspaceId: null,
});
assert.equal(overview.healthDrift.status, 'follow-up-required');
assert.equal(overview.healthDrift.profileCount, 1);
assert.equal(overview.healthDrift.statusCounts['follow-up-required'], 1);
assert.equal(overview.healthDrift.statusCounts.watch, 0);
assert.equal(overview.healthDrift.reasonCodeCounts['quality-gate-blocked'], 1);
assert.equal(overview.healthDrift.reasonCodeCounts['specialist-follow-up-open'], 1);
assert.equal(overview.healthDrift.latestProfile.id, 'knowledge-triad');
assert.equal(overview.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(overview.workspaceHealthDrift.workspaceCount, 1);
assert.equal(overview.workspaceHealthDrift.statusCounts['follow-up-required'], 1);
assert.equal(overview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(overview.workspaceHealthDrift.statusCounts.stable, 1);
assert.equal(
  overview.workspaceHealthDrift.reasonCodeCounts['workspace-profile-follow-up-required'],
  1,
);
assert.equal(overview.workspaceHealthDrift.latestWorkspace.id, workspace.id);
assert.equal(overview.workspaceHealthDrift.latestWorkspace.profileId, 'knowledge-triad');
assert.equal(overview.summary.total, 4);
assert.equal(overview.summary.usedCount, 3);
assert.equal(overview.summary.unusedCount, 1);
assert.equal(overview.summary.usedWorkspaceCount, 2);
assert.equal(overview.summary.modeCounts.knowledge, 2);
assert.equal(overview.summary.modeCounts.engineering, 2);
assert.equal(overview.summary.qualityGateCounts['manager-merge-ready'], 1);
assert.equal(overview.summary.qualityGateCounts['verification-signal-required'], 2);
assert.equal(overview.summary.qualityGateCounts['research-and-verification-signal-required'], 1);
assert.equal(overview.summary.retryPolicyCounts['resume-blocked-or-failed-branch'], 1);
assert.equal(overview.summary.retryPolicyCounts['resume-verification-fast'], 2);
assert.equal(overview.summary.retryPolicyCounts['resume-research-and-verification-fast'], 1);
assert.equal(overview.summary.missionCountTotal, 4);
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
  'engineering-triad',
  'knowledge-triad',
]);
assert.deepEqual(overview.summary.touchedWorkspaceIds, [secondWorkspace.id, workspace.id].sort((left, right) => String(left).localeCompare(String(right))));
assert.equal(overview.summary.workspaceHealthDriftProfileCounts[workspace.id], 1);
assert.equal(overview.summary.workspaceHealthDriftStatusCounts['follow-up-required'][workspace.id], 1);
assert.deepEqual(overview.summary.workspaceHealthDriftStatusCounts.watch, {});
assert.equal(overview.summary.workspaceProfileCounts[workspace.id], 2);
assert.equal(overview.summary.workspaceProfileCounts[secondWorkspace.id], 1);
assert.equal(overview.summary.workspaceMissionCounts[workspace.id], 3);
assert.equal(overview.summary.workspaceMissionCounts[secondWorkspace.id], 1);
assert.equal(overview.summary.latestUsedProfile.id, 'engineering-triad');
assert.equal(overview.summary.latestUsedWorkspace.id, secondWorkspace.id);
assert.equal(overview.summary.latestUsedWorkspace.profileId, 'engineering-triad');
assert.equal(overview.summary.latestHealthDriftWorkspace.id, workspace.id);
assert.equal(overview.summary.latestHealthDriftWorkspace.profileId, 'knowledge-triad');
assert.equal(overview.summary.latestHealthDriftWorkspace.status, 'follow-up-required');

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
assert.equal(knowledgeTriad.workspaceMissionCounts[workspace.id], 2);
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
assert.equal(engineeringImplementationVerification.workspaceMissionCounts[workspace.id], 1);
assert.deepEqual(engineeringImplementationVerification.specialistFollowUpRetryPolicyCounts, {});
assert.deepEqual(engineeringImplementationVerification.specialistFollowUpRemediationRouteCounts, {});
assert.equal(engineeringImplementationVerification.healthDrift.status, 'stable');
assert.deepEqual(engineeringImplementationVerification.healthDrift.reasonCodes, []);
assert.equal(engineeringImplementationVerification.missionStatusCounts.created, 1);
assert.equal(engineeringImplementationVerification.latestMission.id, engineeringMission.id);

const engineeringTriad = overview.items.find((item) => item.id === 'engineering-triad');
assert.ok(engineeringTriad);
assert.equal(engineeringTriad.used, true);
assert.equal(engineeringTriad.missionCount, 1);
assert.equal(engineeringTriad.workspaceCount, 1);
assert.deepEqual(engineeringTriad.touchedWorkspaceIds, [secondWorkspace.id]);
assert.equal(engineeringTriad.workspaceMissionCounts[secondWorkspace.id], 1);
assert.equal(engineeringTriad.healthDrift.status, 'stable');
assert.equal(engineeringTriad.latestMission.id, engineeringTriadMission.id);

const usedOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--used-only'],
});

assert.deepEqual(usedOnlyOverview.filters, {
  driftOnly: false,
  mode: null,
  status: null,
  usedOnly: true,
  workspaceId: null,
});
assert.equal(usedOnlyOverview.summary.total, 3);
assert.equal(usedOnlyOverview.summary.usedCount, 3);
assert.equal(usedOnlyOverview.summary.unusedCount, 0);
assert.equal(usedOnlyOverview.items.every((item) => item.used), true);

const workspaceUsedOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace', workspace.id, '--used-only'],
});

assert.deepEqual(workspaceUsedOverview.filters, {
  driftOnly: false,
  mode: null,
  status: null,
  usedOnly: true,
  workspaceId: workspace.id,
});
assert.equal(workspaceUsedOverview.summary.total, 2);
assert.equal(workspaceUsedOverview.summary.usedCount, 2);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(workspaceUsedOverview.workspaceHealthDrift.workspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts['follow-up-required'], 1);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts.stable, 0);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.latestWorkspace.id, workspace.id);
assert.equal(workspaceUsedOverview.summary.usedWorkspaceCount, 1);
assert.deepEqual(workspaceUsedOverview.summary.touchedWorkspaceIds, [workspace.id]);
assert.equal(workspaceUsedOverview.summary.workspaceHealthDriftProfileCounts[workspace.id], 1);
assert.equal(workspaceUsedOverview.summary.workspaceHealthDriftStatusCounts['follow-up-required'][workspace.id], 1);
assert.deepEqual(workspaceUsedOverview.summary.workspaceHealthDriftStatusCounts.watch, {});
assert.equal(workspaceUsedOverview.summary.workspaceProfileCounts[workspace.id], 2);
assert.equal(workspaceUsedOverview.summary.workspaceMissionCounts[workspace.id], 3);
assert.equal(workspaceUsedOverview.summary.latestUsedWorkspace.id, workspace.id);
assert.equal(workspaceUsedOverview.summary.latestHealthDriftWorkspace.id, workspace.id);
assert.deepEqual(
  workspaceUsedOverview.items.map((item) => item.id).sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-implementation-verification', 'knowledge-triad'],
);

const secondWorkspaceUsedOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace', secondWorkspace.id, '--used-only'],
});

assert.deepEqual(secondWorkspaceUsedOverview.filters, {
  driftOnly: false,
  mode: null,
  status: null,
  usedOnly: true,
  workspaceId: secondWorkspace.id,
});
assert.equal(secondWorkspaceUsedOverview.summary.total, 1);
assert.equal(secondWorkspaceUsedOverview.summary.usedCount, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.status, 'stable');
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.workspaceCount, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts['follow-up-required'], 0);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts.stable, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.latestWorkspace, null);
assert.equal(secondWorkspaceUsedOverview.summary.usedWorkspaceCount, 1);
assert.deepEqual(secondWorkspaceUsedOverview.summary.touchedWorkspaceIds, [secondWorkspace.id]);
assert.deepEqual(secondWorkspaceUsedOverview.summary.workspaceHealthDriftProfileCounts, {});
assert.deepEqual(secondWorkspaceUsedOverview.summary.workspaceHealthDriftStatusCounts['follow-up-required'], {});
assert.deepEqual(secondWorkspaceUsedOverview.summary.workspaceHealthDriftStatusCounts.watch, {});
assert.equal(secondWorkspaceUsedOverview.summary.workspaceProfileCounts[secondWorkspace.id], 1);
assert.equal(secondWorkspaceUsedOverview.summary.workspaceMissionCounts[secondWorkspace.id], 1);
assert.equal(secondWorkspaceUsedOverview.summary.latestUsedWorkspace.id, secondWorkspace.id);
assert.equal(secondWorkspaceUsedOverview.summary.latestHealthDriftWorkspace, null);
assert.equal(secondWorkspaceUsedOverview.items[0].id, 'engineering-triad');

const driftOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--drift-only'],
});

assert.deepEqual(driftOnlyOverview.filters, {
  driftOnly: true,
  mode: null,
  status: null,
  usedOnly: false,
  workspaceId: null,
});
assert.equal(driftOnlyOverview.summary.total, 1);
assert.equal(driftOnlyOverview.healthDrift.status, 'follow-up-required');
assert.equal(driftOnlyOverview.items.length, 1);
assert.equal(driftOnlyOverview.items[0].id, 'knowledge-triad');

const stableUsedOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--used-only', '--status', 'stable'],
});

assert.deepEqual(stableUsedOverview.filters, {
  driftOnly: false,
  mode: null,
  status: 'stable',
  usedOnly: true,
  workspaceId: null,
});
assert.equal(stableUsedOverview.summary.total, 2);
assert.equal(stableUsedOverview.healthDrift.status, 'stable');
assert.equal(stableUsedOverview.items.length, 2);
assert.deepEqual(
  stableUsedOverview.items.map((item) => item.id).sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-implementation-verification', 'engineering-triad'],
);

const knowledgeOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--mode', 'knowledge', '--used-only', '--status', 'follow-up-required'],
});

assert.deepEqual(knowledgeOnlyOverview.filters, {
  driftOnly: false,
  mode: 'knowledge',
  status: 'follow-up-required',
  usedOnly: true,
  workspaceId: null,
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
