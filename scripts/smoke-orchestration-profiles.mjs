import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

function getMonthStartDate(isoTimestamp) {
  const date = new Date(isoTimestamp);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

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

store.updateMission(knowledgeMission.id, (mission) => ({
  ...mission,
  createdAt: '2026-04-01T09:00:00.000Z',
  updatedAt: '2026-04-01T09:00:00.000Z',
}));
store.updateMission(gateMission.id, (mission) => ({
  ...mission,
  createdAt: '2026-04-02T09:00:00.000Z',
  updatedAt: '2026-04-02T09:00:00.000Z',
}));
store.updateMission(engineeringMission.id, (mission) => ({
  ...mission,
  createdAt: '2026-03-15T09:00:00.000Z',
  updatedAt: '2026-03-15T09:00:00.000Z',
}));
store.updateMission(engineeringTriadMission.id, (mission) => ({
  ...mission,
  createdAt: '2026-04-03T09:00:00.000Z',
  updatedAt: '2026-04-03T09:00:00.000Z',
}));

const currentMonthStartDate = getMonthStartDate('2026-04-01T09:00:00.000Z');
const previousMonthStartDate = getMonthStartDate('2026-03-15T09:00:00.000Z');

const overview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles'],
});

assert.deepEqual(overview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: false,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(overview.healthDrift.status, 'follow-up-required');
assert.equal(overview.healthDrift.profileCount, 1);
assert.equal(overview.healthDrift.statusCounts['follow-up-required'], 1);
assert.equal(overview.healthDrift.statusCounts.watch, 0);
assert.equal(overview.healthDrift.reasonCodeCounts['quality-gate-blocked'], 1);
assert.equal(overview.healthDrift.reasonCodeCounts['specialist-follow-up-open'], 1);
assert.equal(overview.healthDrift.latestProfile.id, 'knowledge-triad');
assert.equal(overview.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(overview.workspaceHealthDrift.workspaceCount, 2);
assert.equal(overview.workspaceHealthDrift.statusCounts['follow-up-required'], 1);
assert.equal(overview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(overview.workspaceHealthDrift.statusCounts.stable, 1);
assert.equal(
  overview.workspaceHealthDrift.reasonCodeCounts['workspace-profile-follow-up-required'],
  1,
);
assert.equal(overview.workspaceHealthDrift.latestWorkspace.id, workspace.id);
assert.equal(overview.workspaceHealthDrift.latestWorkspace.profileId, 'knowledge-triad');
assert.equal(overview.workspaceAdoptionDrift.status, 'growing');
assert.equal(overview.workspaceAdoptionDrift.workspaceCount, 2);
assert.equal(overview.workspaceAdoptionDrift.statusCounts.growing, 2);
assert.equal(overview.workspaceAdoptionDrift.statusCounts.declining, 0);
assert.equal(overview.workspaceAdoptionDrift.statusCounts.steady, 0);
assert.equal(overview.workspaceAdoptionDrift.statusCounts.unused, 0);
assert.equal(overview.workspaceAdoptionDrift.missionTrendStatusCounts.growing, 2);
assert.equal(overview.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.growing, 1);
assert.equal(overview.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.steady, 1);
assert.equal(overview.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-growing'], 2);
assert.equal(overview.workspaceAdoptionDrift.reasonCodeCounts['workspace-profile-footprint-growing'], 1);
assert.deepEqual(
  overview.workspaceAdoptionDrift.workspaceIdsByStatus.growing,
  [secondWorkspace.id, workspace.id].sort((left, right) => String(left).localeCompare(String(right))),
);
assert.deepEqual(overview.workspaceAdoptionDrift.workspaceIdsByStatus.declining, []);
assert.equal(overview.workspaceAdoptionDrift.latestWorkspace.id, secondWorkspace.id);
assert.equal(overview.workspaceAdoptionDrift.latestWorkspace.adoptionDrift.status, 'growing');
assert.equal(overview.workspaceAdoptionDrift.latestWorkspace.missionTrend.status, 'growing');
assert.equal(overview.workspaceAdoptionDrift.latestWorkspace.profileFootprintTrend.status, 'growing');
assert.equal(overview.adoptionDrift.status, 'growing');
assert.deepEqual(overview.adoptionDrift.reasonCodes, [
  'mission-volume-declining',
  'mission-volume-growing',
  'unused-profile',
  'workspace-footprint-declining',
  'workspace-footprint-growing',
]);
assert.equal(overview.adoptionDrift.profileCount, 4);
assert.equal(overview.adoptionDrift.statusCounts.growing, 2);
assert.equal(overview.adoptionDrift.statusCounts.declining, 1);
assert.equal(overview.adoptionDrift.statusCounts.steady, 0);
assert.equal(overview.adoptionDrift.statusCounts.unused, 1);
assert.equal(overview.adoptionDrift.reasonCodeCounts['mission-volume-growing'], 2);
assert.equal(overview.adoptionDrift.reasonCodeCounts['workspace-footprint-growing'], 2);
assert.equal(overview.adoptionDrift.reasonCodeCounts['mission-volume-declining'], 1);
assert.equal(overview.adoptionDrift.reasonCodeCounts['workspace-footprint-declining'], 1);
assert.equal(overview.adoptionDrift.reasonCodeCounts['unused-profile'], 1);
assert.equal(overview.adoptionDrift.latestProfile.id, 'engineering-triad');
assert.equal(overview.adoptionDrift.latestUnusedProfile.id, 'knowledge-research-implementation');
assert.equal(overview.adoptionDrift.usageTrendStatus, 'growing');
assert.equal(overview.adoptionDrift.workspaceUsageTrendStatus, 'growing');
assert.equal(overview.usageTrend.status, 'growing');
assert.equal(overview.usageTrend.profileCount, 4);
assert.equal(overview.usageTrend.currentMonthStartDate, currentMonthStartDate);
assert.equal(overview.usageTrend.currentMonthMissionCount, 3);
assert.equal(overview.usageTrend.previousMonthMissionCount, 1);
assert.equal(overview.usageTrend.missionCountDelta, 2);
assert.equal(overview.usageTrend.statusCounts.growing, 2);
assert.equal(overview.usageTrend.statusCounts.declining, 1);
assert.equal(overview.usageTrend.statusCounts.steady, 0);
assert.equal(overview.usageTrend.statusCounts.unused, 1);
assert.equal(overview.usageTrend.latestGrowingProfile.id, 'engineering-triad');
assert.equal(overview.usageTrend.latestDecliningProfile.id, 'engineering-implementation-verification');
assert.equal(overview.usageTrend.latestUnusedProfile.id, 'knowledge-research-implementation');
assert.equal(overview.workspaceUsageTrend.status, 'growing');
assert.equal(overview.workspaceUsageTrend.profileCount, 4);
assert.equal(overview.workspaceUsageTrend.currentMonthStartDate, currentMonthStartDate);
assert.equal(overview.workspaceUsageTrend.currentMonthWorkspaceCount, 2);
assert.equal(overview.workspaceUsageTrend.previousMonthWorkspaceCount, 1);
assert.equal(overview.workspaceUsageTrend.workspaceCountDelta, 1);
assert.equal(overview.workspaceUsageTrend.statusCounts.growing, 2);
assert.equal(overview.workspaceUsageTrend.statusCounts.declining, 1);
assert.equal(overview.workspaceUsageTrend.statusCounts.steady, 0);
assert.equal(overview.workspaceUsageTrend.statusCounts.unused, 1);
assert.equal(overview.workspaceUsageTrend.workspaceCount, 2);
assert.equal(overview.workspaceUsageTrend.workspaceProfileCounts[workspace.id], 2);
assert.equal(overview.workspaceUsageTrend.workspaceProfileCounts[secondWorkspace.id], 1);
assert.equal(overview.workspaceUsageTrend.workspaceStatusCounts.growing, 2);
assert.equal(overview.workspaceUsageTrend.workspaceStatusCounts.declining, 1);
assert.equal(overview.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(overview.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(
  overview.workspaceUsageTrend.workspaceIdsByStatus.growing,
  [secondWorkspace.id, workspace.id].sort((left, right) => String(left).localeCompare(String(right))),
);
assert.deepEqual(overview.workspaceUsageTrend.workspaceIdsByStatus.declining, [workspace.id]);
assert.deepEqual(overview.workspaceUsageTrend.workspaceIdsByStatus.steady, []);
assert.deepEqual(overview.workspaceUsageTrend.workspaceIdsByStatus.unused, []);
assert.equal(overview.workspaceUsageTrend.latestGrowingProfile.id, 'engineering-triad');
assert.equal(overview.workspaceUsageTrend.latestGrowingWorkspace.id, secondWorkspace.id);
assert.equal(overview.workspaceUsageTrend.latestGrowingWorkspace.profileId, 'engineering-triad');
assert.equal(overview.workspaceUsageTrend.latestDecliningProfile.id, 'engineering-implementation-verification');
assert.equal(overview.workspaceUsageTrend.latestDecliningWorkspace.id, workspace.id);
assert.equal(
  overview.workspaceUsageTrend.latestDecliningWorkspace.profileId,
  'engineering-implementation-verification',
);
assert.equal(overview.workspaceUsageTrend.latestUnusedProfile.id, 'knowledge-research-implementation');
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
assert.equal(overview.summary.usageMonthlyBucketCount, 2);
assert.equal(overview.summary.usageLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(overview.summary.usageOldestMonthlyBucketStartDate, previousMonthStartDate);
assert.equal(overview.summary.usageMonthlyBuckets[0].missionCount, 3);
assert.equal(overview.summary.usageMonthlyBuckets[0].usedProfileCount, 2);
assert.equal(overview.summary.usageMonthlyBuckets[0].usedWorkspaceCount, 2);
assert.equal(overview.summary.usageMonthlyBuckets[1].missionCount, 1);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.currentMonthStartDate, currentMonthStartDate);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.previousMonthStartDate, previousMonthStartDate);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.missionCountDelta, 2);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.usedProfileCountDelta, 1);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.usedWorkspaceCountDelta, 1);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.modeCountsDelta.knowledge, 2);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.profileCountsDelta['knowledge-triad'], 2);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.profileCountsDelta['engineering-triad'], 1);
assert.equal(
  overview.summary.usageLatestMonthlyBucketDelta.profileCountsDelta['engineering-implementation-verification'],
  -1,
);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.workspaceCountsDelta[workspace.id], 1);
assert.equal(overview.summary.usageLatestMonthlyBucketDelta.workspaceCountsDelta[secondWorkspace.id], 1);
assert.equal(overview.summary.usageTrendCounts.growing, 2);
assert.equal(overview.summary.usageTrendCounts.declining, 1);
assert.equal(overview.summary.usageTrendCounts.steady, 0);
assert.equal(overview.summary.usageTrendCounts.unused, 1);
assert.equal(overview.summary.latestGrowingProfile.id, 'engineering-triad');
assert.equal(overview.summary.latestDecliningProfile.id, 'engineering-implementation-verification');
assert.equal(overview.summary.latestUnusedProfile.id, 'knowledge-research-implementation');
assert.equal(overview.summary.workspaceUsageTrendCounts.growing, 2);
assert.equal(overview.summary.workspaceUsageTrendCounts.declining, 1);
assert.equal(overview.summary.workspaceUsageTrendCounts.steady, 0);
assert.equal(overview.summary.workspaceUsageTrendCounts.unused, 1);
assert.equal(overview.summary.workspaceUsageTrendProfileCounts[workspace.id], 2);
assert.equal(overview.summary.workspaceUsageTrendProfileCounts[secondWorkspace.id], 1);
assert.equal(overview.summary.workspaceUsageTrendStatusCounts.growing[workspace.id], 1);
assert.equal(overview.summary.workspaceUsageTrendStatusCounts.growing[secondWorkspace.id], 1);
assert.equal(overview.summary.workspaceUsageTrendStatusCounts.declining[workspace.id], 1);
assert.deepEqual(overview.summary.workspaceUsageTrendStatusCounts.steady, {});
assert.deepEqual(overview.summary.workspaceUsageTrendStatusCounts.unused, {});
assert.equal(overview.summary.latestGrowingWorkspaceUsageProfile.id, 'engineering-triad');
assert.equal(
  overview.summary.latestDecliningWorkspaceUsageProfile.id,
  'engineering-implementation-verification',
);
assert.equal(
  overview.summary.latestUnusedWorkspaceUsageProfile.id,
  'knowledge-research-implementation',
);
assert.equal(overview.summary.adoptionDriftCounts.growing, 2);
assert.equal(overview.summary.adoptionDriftCounts.declining, 1);
assert.equal(overview.summary.adoptionDriftCounts.steady, 0);
assert.equal(overview.summary.adoptionDriftCounts.unused, 1);
assert.equal(overview.summary.adoptionDriftProfileCount, 4);
assert.equal(overview.summary.adoptionDriftReasonCodeCounts['mission-volume-growing'], 2);
assert.equal(overview.summary.adoptionDriftReasonCodeCounts['workspace-footprint-growing'], 2);
assert.equal(overview.summary.adoptionDriftReasonCodeCounts['mission-volume-declining'], 1);
assert.equal(overview.summary.adoptionDriftReasonCodeCounts['workspace-footprint-declining'], 1);
assert.equal(overview.summary.adoptionDriftReasonCodeCounts['unused-profile'], 1);
assert.equal(overview.summary.latestAdoptionDriftProfile.id, 'engineering-triad');
assert.equal(overview.summary.latestGrowingAdoptionProfile.id, 'engineering-triad');
assert.equal(overview.summary.latestDecliningAdoptionProfile.id, 'engineering-implementation-verification');
assert.equal(overview.summary.latestUnusedAdoptionProfile.id, 'knowledge-research-implementation');

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
assert.equal(knowledgeTriad.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(knowledgeTriad.workspaceHealthDrift.workspaceCount, 1);
assert.equal(knowledgeTriad.workspaceHealthDrift.statusCounts['follow-up-required'], 1);
assert.equal(knowledgeTriad.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(knowledgeTriad.workspaceHealthDrift.statusCounts.stable, 0);
assert.deepEqual(knowledgeTriad.workspaceHealthDrift.workspaceIdsByStatus['follow-up-required'], [workspace.id]);
assert.equal(knowledgeTriad.workspaceHealthDrift.latestWorkspace.id, workspace.id);
assert.deepEqual(knowledgeTriad.healthDrift.reasonCodes, [
  'quality-gate-blocked',
  'specialist-follow-up-open',
]);
assert.equal(knowledgeTriad.adoptionDrift.status, 'growing');
assert.deepEqual(knowledgeTriad.adoptionDrift.reasonCodes, [
  'mission-volume-growing',
  'workspace-footprint-growing',
]);
assert.equal(knowledgeTriad.usageMonthlyBucketCount, 1);
assert.equal(knowledgeTriad.usageLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(knowledgeTriad.usageOldestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(knowledgeTriad.usageMonthlyBuckets[0].missionCount, 2);
assert.equal(knowledgeTriad.usageMonthlyBuckets[0].usedWorkspaceCount, 1);
assert.equal(knowledgeTriad.usageLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(knowledgeTriad.usageTrend.status, 'growing');
assert.equal(knowledgeTriad.usageTrend.currentMonthStartDate, currentMonthStartDate);
assert.equal(knowledgeTriad.usageTrend.missionCountDelta, 2);
assert.equal(knowledgeTriad.workspaceUsageTrend.status, 'growing');
assert.equal(knowledgeTriad.workspaceUsageTrend.currentMonthStartDate, currentMonthStartDate);
assert.equal(knowledgeTriad.workspaceUsageTrend.currentMonthWorkspaceCount, 1);
assert.equal(knowledgeTriad.workspaceUsageTrend.previousMonthWorkspaceCount, 0);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceCountDelta, 1);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceCount, 1);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceStatusCounts.growing, 1);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceStatusCounts.declining, 0);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(knowledgeTriad.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(knowledgeTriad.workspaceUsageTrend.workspaceIdsByStatus.growing, [workspace.id]);
assert.deepEqual(knowledgeTriad.workspaceUsageTrend.workspaceIdsByStatus.declining, []);
assert.deepEqual(knowledgeTriad.workspaceUsageTrend.workspaceIdsByStatus.steady, []);
assert.deepEqual(knowledgeTriad.workspaceUsageTrend.workspaceIdsByStatus.unused, []);
assert.equal(knowledgeTriad.workspaceUsageTrend.latestGrowingWorkspace.id, workspace.id);
assert.equal(knowledgeTriad.workspaceUsageTrend.latestGrowingWorkspace.profileId, 'knowledge-triad');
assert.equal(knowledgeTriad.workspaceUsageTrend.latestDecliningWorkspace, null);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.status, 'growing');
assert.equal(knowledgeTriad.workspaceAdoptionDrift.workspaceCount, 1);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.statusCounts.growing, 1);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.statusCounts.declining, 0);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.missionTrendStatusCounts.growing, 1);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.growing, 1);
assert.equal(
  knowledgeTriad.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-growing'],
  1,
);
assert.equal(
  knowledgeTriad.workspaceAdoptionDrift.reasonCodeCounts['workspace-profile-footprint-growing'],
  1,
);
assert.deepEqual(knowledgeTriad.workspaceAdoptionDrift.workspaceIdsByStatus.growing, [workspace.id]);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.latestWorkspace.id, workspace.id);
assert.equal(knowledgeTriad.workspaceAdoptionDrift.latestWorkspace.adoptionDrift.status, 'growing');
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
assert.equal(engineeringImplementationVerification.workspaceHealthDrift.status, 'stable');
assert.equal(engineeringImplementationVerification.workspaceHealthDrift.workspaceCount, 1);
assert.equal(engineeringImplementationVerification.workspaceHealthDrift.statusCounts.stable, 1);
assert.deepEqual(engineeringImplementationVerification.workspaceHealthDrift.workspaceIdsByStatus.stable, [workspace.id]);
assert.equal(engineeringImplementationVerification.usageMonthlyBucketCount, 1);
assert.equal(
  engineeringImplementationVerification.usageLatestMonthlyBucketStartDate,
  previousMonthStartDate,
);
assert.equal(
  engineeringImplementationVerification.usageOldestMonthlyBucketStartDate,
  previousMonthStartDate,
);
assert.equal(engineeringImplementationVerification.usageMonthlyBuckets[0].missionCount, 1);
assert.equal(engineeringImplementationVerification.usageTrend.status, 'declining');
assert.equal(engineeringImplementationVerification.usageTrend.currentMonthMissionCount, 0);
assert.equal(engineeringImplementationVerification.usageTrend.previousMonthMissionCount, 1);
assert.equal(engineeringImplementationVerification.usageTrend.missionCountDelta, -1);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.status, 'declining');
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.currentMonthWorkspaceCount, 0);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.previousMonthWorkspaceCount, 1);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceCountDelta, -1);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceCount, 1);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceStatusCounts.growing, 0);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceStatusCounts.declining, 1);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(
  engineeringImplementationVerification.workspaceUsageTrend.workspaceIdsByStatus.growing,
  [],
);
assert.deepEqual(
  engineeringImplementationVerification.workspaceUsageTrend.workspaceIdsByStatus.declining,
  [workspace.id],
);
assert.deepEqual(
  engineeringImplementationVerification.workspaceUsageTrend.workspaceIdsByStatus.steady,
  [],
);
assert.deepEqual(
  engineeringImplementationVerification.workspaceUsageTrend.workspaceIdsByStatus.unused,
  [],
);
assert.equal(engineeringImplementationVerification.workspaceUsageTrend.latestGrowingWorkspace, null);
assert.equal(
  engineeringImplementationVerification.workspaceUsageTrend.latestDecliningWorkspace.id,
  workspace.id,
);
assert.equal(
  engineeringImplementationVerification.workspaceUsageTrend.latestDecliningWorkspace.profileId,
  'engineering-implementation-verification',
);
assert.equal(engineeringImplementationVerification.workspaceAdoptionDrift.status, 'declining');
assert.equal(engineeringImplementationVerification.workspaceAdoptionDrift.workspaceCount, 1);
assert.equal(engineeringImplementationVerification.workspaceAdoptionDrift.statusCounts.declining, 1);
assert.equal(
  engineeringImplementationVerification.workspaceAdoptionDrift.missionTrendStatusCounts.declining,
  1,
);
assert.equal(
  engineeringImplementationVerification.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.declining,
  1,
);
assert.equal(
  engineeringImplementationVerification.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-declining'],
  1,
);
assert.equal(
  engineeringImplementationVerification.workspaceAdoptionDrift.reasonCodeCounts['workspace-profile-footprint-declining'],
  1,
);
assert.deepEqual(
  engineeringImplementationVerification.workspaceAdoptionDrift.workspaceIdsByStatus.declining,
  [workspace.id],
);
assert.equal(engineeringImplementationVerification.workspaceAdoptionDrift.latestWorkspace.id, workspace.id);
assert.equal(
  engineeringImplementationVerification.workspaceAdoptionDrift.latestWorkspace.adoptionDrift.status,
  'declining',
);
assert.equal(engineeringImplementationVerification.adoptionDrift.status, 'declining');
assert.deepEqual(engineeringImplementationVerification.adoptionDrift.reasonCodes, [
  'mission-volume-declining',
  'workspace-footprint-declining',
]);
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
assert.equal(engineeringTriad.workspaceHealthDrift.status, 'stable');
assert.equal(engineeringTriad.workspaceHealthDrift.workspaceCount, 1);
assert.equal(engineeringTriad.workspaceHealthDrift.statusCounts.stable, 1);
assert.deepEqual(engineeringTriad.workspaceHealthDrift.workspaceIdsByStatus.stable, [secondWorkspace.id]);
assert.equal(engineeringTriad.usageMonthlyBucketCount, 1);
assert.equal(engineeringTriad.usageLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(engineeringTriad.usageMonthlyBuckets[0].missionCount, 1);
assert.equal(engineeringTriad.usageTrend.status, 'growing');
assert.equal(engineeringTriad.usageTrend.missionCountDelta, 1);
assert.equal(engineeringTriad.workspaceUsageTrend.status, 'growing');
assert.equal(engineeringTriad.workspaceUsageTrend.currentMonthWorkspaceCount, 1);
assert.equal(engineeringTriad.workspaceUsageTrend.previousMonthWorkspaceCount, 0);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceCountDelta, 1);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceCount, 1);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceStatusCounts.growing, 1);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceStatusCounts.declining, 0);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(engineeringTriad.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(
  engineeringTriad.workspaceUsageTrend.workspaceIdsByStatus.growing,
  [secondWorkspace.id],
);
assert.deepEqual(engineeringTriad.workspaceUsageTrend.workspaceIdsByStatus.declining, []);
assert.deepEqual(engineeringTriad.workspaceUsageTrend.workspaceIdsByStatus.steady, []);
assert.deepEqual(engineeringTriad.workspaceUsageTrend.workspaceIdsByStatus.unused, []);
assert.equal(engineeringTriad.workspaceUsageTrend.latestGrowingWorkspace.id, secondWorkspace.id);
assert.equal(engineeringTriad.workspaceUsageTrend.latestGrowingWorkspace.profileId, 'engineering-triad');
assert.equal(engineeringTriad.workspaceUsageTrend.latestDecliningWorkspace, null);
assert.equal(engineeringTriad.workspaceAdoptionDrift.status, 'growing');
assert.equal(engineeringTriad.workspaceAdoptionDrift.workspaceCount, 1);
assert.equal(engineeringTriad.workspaceAdoptionDrift.statusCounts.growing, 1);
assert.equal(engineeringTriad.workspaceAdoptionDrift.missionTrendStatusCounts.growing, 1);
assert.equal(engineeringTriad.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.growing, 1);
assert.equal(
  engineeringTriad.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-growing'],
  1,
);
assert.equal(
  engineeringTriad.workspaceAdoptionDrift.reasonCodeCounts['workspace-profile-footprint-growing'],
  1,
);
assert.deepEqual(
  engineeringTriad.workspaceAdoptionDrift.workspaceIdsByStatus.growing,
  [secondWorkspace.id],
);
assert.equal(engineeringTriad.workspaceAdoptionDrift.latestWorkspace.id, secondWorkspace.id);
assert.equal(engineeringTriad.workspaceAdoptionDrift.latestWorkspace.adoptionDrift.status, 'growing');
assert.equal(engineeringTriad.adoptionDrift.status, 'growing');
assert.deepEqual(engineeringTriad.adoptionDrift.reasonCodes, [
  'mission-volume-growing',
  'workspace-footprint-growing',
]);
assert.equal(engineeringTriad.latestMission.id, engineeringTriadMission.id);

const unusedKnowledgeResearchImplementation = overview.items.find(
  (item) => item.id === 'knowledge-research-implementation',
);
assert.ok(unusedKnowledgeResearchImplementation);
assert.equal(unusedKnowledgeResearchImplementation.used, false);
assert.equal(unusedKnowledgeResearchImplementation.adoptionDrift.status, 'unused');
assert.deepEqual(unusedKnowledgeResearchImplementation.adoptionDrift.reasonCodes, ['unused-profile']);

const usedOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--used-only'],
});

assert.deepEqual(usedOnlyOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
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
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: workspace.id,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(workspaceUsedOverview.summary.total, 2);
assert.equal(workspaceUsedOverview.summary.usedCount, 2);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(workspaceUsedOverview.workspaceHealthDrift.workspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts['follow-up-required'], 1);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.statusCounts.stable, 0);
assert.equal(workspaceUsedOverview.workspaceHealthDrift.latestWorkspace.id, workspace.id);
assert.equal(workspaceUsedOverview.adoptionDrift.status, 'growing');
assert.deepEqual(workspaceUsedOverview.adoptionDrift.reasonCodes, [
  'mission-volume-declining',
  'mission-volume-growing',
  'workspace-footprint-declining',
  'workspace-footprint-growing',
]);
assert.equal(workspaceUsedOverview.usageTrend.status, 'growing');
assert.equal(workspaceUsedOverview.usageTrend.currentMonthMissionCount, 2);
assert.equal(workspaceUsedOverview.usageTrend.previousMonthMissionCount, 1);
assert.equal(workspaceUsedOverview.usageTrend.missionCountDelta, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.status, 'steady');
assert.equal(workspaceUsedOverview.workspaceUsageTrend.currentMonthWorkspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.previousMonthWorkspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceCountDelta, 0);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceProfileCounts[workspace.id], 2);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.growing, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.declining, 1);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(workspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.growing, [workspace.id]);
assert.deepEqual(workspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.declining, [workspace.id]);
assert.deepEqual(workspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.steady, []);
assert.deepEqual(workspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.unused, []);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.latestGrowingWorkspace.id, workspace.id);
assert.equal(workspaceUsedOverview.workspaceUsageTrend.latestGrowingWorkspace.profileId, 'knowledge-triad');
assert.equal(workspaceUsedOverview.workspaceUsageTrend.latestDecliningWorkspace.id, workspace.id);
assert.equal(
  workspaceUsedOverview.workspaceUsageTrend.latestDecliningWorkspace.profileId,
  'engineering-implementation-verification',
);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.status, 'growing');
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.workspaceCount, 1);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.statusCounts.growing, 1);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.statusCounts.declining, 0);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.missionTrendStatusCounts.growing, 1);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.steady, 1);
assert.equal(
  workspaceUsedOverview.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-growing'],
  1,
);
assert.deepEqual(workspaceUsedOverview.workspaceAdoptionDrift.workspaceIdsByStatus.growing, [workspace.id]);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.latestWorkspace.id, workspace.id);
assert.equal(workspaceUsedOverview.workspaceAdoptionDrift.latestWorkspace.profileFootprintTrend.status, 'steady');
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
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: secondWorkspace.id,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(secondWorkspaceUsedOverview.summary.total, 1);
assert.equal(secondWorkspaceUsedOverview.summary.usedCount, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.status, 'stable');
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.workspaceCount, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts['follow-up-required'], 0);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts.watch, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.statusCounts.stable, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceHealthDrift.latestWorkspace, null);
assert.equal(secondWorkspaceUsedOverview.adoptionDrift.status, 'growing');
assert.deepEqual(secondWorkspaceUsedOverview.adoptionDrift.reasonCodes, [
  'mission-volume-growing',
  'workspace-footprint-growing',
]);
assert.equal(secondWorkspaceUsedOverview.usageTrend.status, 'growing');
assert.equal(secondWorkspaceUsedOverview.usageTrend.currentMonthMissionCount, 1);
assert.equal(secondWorkspaceUsedOverview.usageTrend.previousMonthMissionCount, 0);
assert.equal(secondWorkspaceUsedOverview.usageTrend.missionCountDelta, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.status, 'growing');
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.currentMonthWorkspaceCount, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.previousMonthWorkspaceCount, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceCountDelta, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceCount, 1);
assert.equal(
  secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceProfileCounts[secondWorkspace.id],
  1,
);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.growing, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.declining, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.steady, 0);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceStatusCounts.unused, 0);
assert.deepEqual(
  secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.growing,
  [secondWorkspace.id],
);
assert.deepEqual(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.declining, []);
assert.deepEqual(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.steady, []);
assert.deepEqual(secondWorkspaceUsedOverview.workspaceUsageTrend.workspaceIdsByStatus.unused, []);
assert.equal(
  secondWorkspaceUsedOverview.workspaceUsageTrend.latestGrowingWorkspace.id,
  secondWorkspace.id,
);
assert.equal(
  secondWorkspaceUsedOverview.workspaceUsageTrend.latestGrowingWorkspace.profileId,
  'engineering-triad',
);
assert.equal(secondWorkspaceUsedOverview.workspaceUsageTrend.latestDecliningWorkspace, null);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.status, 'growing');
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.workspaceCount, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.statusCounts.growing, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.missionTrendStatusCounts.growing, 1);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.profileFootprintTrendStatusCounts.growing, 1);
assert.equal(
  secondWorkspaceUsedOverview.workspaceAdoptionDrift.reasonCodeCounts['workspace-mission-volume-growing'],
  1,
);
assert.equal(
  secondWorkspaceUsedOverview.workspaceAdoptionDrift.reasonCodeCounts['workspace-profile-footprint-growing'],
  1,
);
assert.deepEqual(
  secondWorkspaceUsedOverview.workspaceAdoptionDrift.workspaceIdsByStatus.growing,
  [secondWorkspace.id],
);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.latestWorkspace.id, secondWorkspace.id);
assert.equal(secondWorkspaceUsedOverview.workspaceAdoptionDrift.latestWorkspace.profileFootprintTrend.status, 'growing');
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
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: true,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: false,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
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
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: 'stable',
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
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
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: 'knowledge',
  reasonCode: null,
  status: 'follow-up-required',
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(knowledgeOnlyOverview.summary.total, 1);
assert.equal(knowledgeOnlyOverview.summary.missionCountTotal, 2);
assert.equal(knowledgeOnlyOverview.items.length, 1);
assert.equal(knowledgeOnlyOverview.items[0].id, 'knowledge-triad');

const workspaceDriftOnlyOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace-drift-only'],
});

assert.deepEqual(workspaceDriftOnlyOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: false,
  workspaceDriftOnly: true,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(workspaceDriftOnlyOverview.summary.total, 1);
assert.equal(workspaceDriftOnlyOverview.workspaceHealthDrift.status, 'follow-up-required');
assert.equal(workspaceDriftOnlyOverview.items.length, 1);
assert.equal(workspaceDriftOnlyOverview.items[0].id, 'knowledge-triad');

const workspaceStatusOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace-status', 'stable', '--used-only'],
});

assert.deepEqual(workspaceStatusOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: 'stable',
  workspaceUsageTrend: null,
});
assert.equal(workspaceStatusOverview.summary.total, 2);
assert.equal(workspaceStatusOverview.items.length, 2);
assert.deepEqual(
  workspaceStatusOverview.items.map((item) => item.id).sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-implementation-verification', 'engineering-triad'],
);

const workspaceScopedStatusOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace', workspace.id, '--workspace-status', 'follow-up-required', '--used-only'],
});

assert.deepEqual(workspaceScopedStatusOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: workspace.id,
  workspaceReasonCode: null,
  workspaceStatus: 'follow-up-required',
  workspaceUsageTrend: null,
});
assert.equal(workspaceScopedStatusOverview.summary.total, 1);
assert.equal(workspaceScopedStatusOverview.items.length, 1);
assert.equal(workspaceScopedStatusOverview.items[0].id, 'knowledge-triad');

const reasonCodeOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--reason-code', 'quality-gate-blocked'],
});

assert.deepEqual(reasonCodeOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: 'quality-gate-blocked',
  status: null,
  usageTrend: null,
  usedOnly: false,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(reasonCodeOverview.summary.total, 1);
assert.equal(reasonCodeOverview.items.length, 1);
assert.equal(reasonCodeOverview.items[0].id, 'knowledge-triad');
assert.deepEqual(reasonCodeOverview.items[0].healthDrift.reasonCodes, [
  'quality-gate-blocked',
  'specialist-follow-up-open',
]);

const workspaceReasonCodeOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace-reason-code', 'specialist-follow-up-open'],
});

assert.deepEqual(workspaceReasonCodeOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: false,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: 'specialist-follow-up-open',
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(workspaceReasonCodeOverview.summary.total, 1);
assert.equal(workspaceReasonCodeOverview.items.length, 1);
assert.equal(workspaceReasonCodeOverview.items[0].id, 'knowledge-triad');
assert.deepEqual(workspaceReasonCodeOverview.items[0].workspaceHealthDrift.reasonCodes, [
  'quality-gate-blocked',
  'specialist-follow-up-open',
]);

const growingUsageOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--usage-trend', 'growing', '--used-only'],
});

assert.deepEqual(growingUsageOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: 'growing',
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(growingUsageOverview.summary.total, 2);
assert.deepEqual(
  growingUsageOverview.items.map((item) => item.id).sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-triad', 'knowledge-triad'],
);

const decliningUsageOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--usage-trend', 'declining', '--used-only'],
});

assert.deepEqual(decliningUsageOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: 'declining',
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(decliningUsageOverview.summary.total, 1);
assert.equal(decliningUsageOverview.items[0].id, 'engineering-implementation-verification');

const growingWorkspaceUsageOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace-usage-trend', 'growing', '--used-only'],
});

assert.deepEqual(growingWorkspaceUsageOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: 'growing',
});
assert.equal(growingWorkspaceUsageOverview.summary.total, 2);
assert.deepEqual(
  growingWorkspaceUsageOverview.items
    .map((item) => item.id)
    .sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-triad', 'knowledge-triad'],
);

const decliningWorkspaceUsageOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--workspace-usage-trend', 'declining', '--used-only'],
});

assert.deepEqual(decliningWorkspaceUsageOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: 'declining',
});
assert.equal(decliningWorkspaceUsageOverview.summary.total, 1);
assert.equal(decliningWorkspaceUsageOverview.items[0].id, 'engineering-implementation-verification');

const growingAdoptionOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--adoption-drift-status', 'growing', '--used-only'],
});

assert.deepEqual(growingAdoptionOverview.filters, {
  adoptionDriftReasonCode: null,
  adoptionDriftStatus: 'growing',
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(growingAdoptionOverview.summary.total, 2);
assert.deepEqual(
  growingAdoptionOverview.items.map((item) => item.id).sort((left, right) => String(left).localeCompare(String(right))),
  ['engineering-triad', 'knowledge-triad'],
);

const decliningAdoptionReasonOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'profiles', '--adoption-drift-reason-code', 'workspace-footprint-declining', '--used-only'],
});

assert.deepEqual(decliningAdoptionReasonOverview.filters, {
  adoptionDriftReasonCode: 'workspace-footprint-declining',
  adoptionDriftStatus: null,
  driftOnly: false,
  mode: null,
  reasonCode: null,
  status: null,
  usageTrend: null,
  usedOnly: true,
  workspaceDriftOnly: false,
  workspaceId: null,
  workspaceReasonCode: null,
  workspaceStatus: null,
  workspaceUsageTrend: null,
});
assert.equal(decliningAdoptionReasonOverview.summary.total, 1);
assert.equal(decliningAdoptionReasonOverview.items[0].id, 'engineering-implementation-verification');

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
