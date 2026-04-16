import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-parallel-specialists-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

function getMissionRuns(store, missionId) {
  return store
    .loadState()
    .agentRuns.filter((run) => run.missionId === missionId)
    .sort((left, right) => String(left.startedAt || '').localeCompare(String(right.startedAt || '')));
}

function getLatestParallelGroupRuns(store, missionId) {
  const runs = getMissionRuns(store, missionId).filter((run) => run.parallelGroupId);
  const latestGroupId = runs.at(-1)?.parallelGroupId || null;
  return {
    parallelGroupId: latestGroupId,
    runs: latestGroupId ? runs.filter((run) => run.parallelGroupId === latestGroupId) : [],
  };
}

function getDeliverableArtifact(store, run) {
  const artifactId = (run.artifactIds || [])
    .map((artifactId) => store.getArtifact(artifactId))
    .find((artifact) => artifact?.kind === 'deliverable')?.id;
  return artifactId ? store.getArtifact(artifactId) : null;
}

function getHourDelta(from, to) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (60 * 60 * 1000));
}

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'parallel-specialists-workspace',
  workspacePath,
});

const successMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify two-branch specialist fan-out and merge.',
  title: 'Parallel specialist success mission',
  workspaceId: workspace.id,
});

const successRun = await service.runMission(successMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(successRun.mission.status, 'completed');

const successSummary = service.showMission(successMission.id).summary;
assert.equal(successSummary.specialistRunCount, 2);
assert.equal(successSummary.specialistMergeRunCount, 1);
assert.equal(successSummary.specialistMergeCompletedCount, 1);
assert.equal(successSummary.specialistStatusCounts.completed, 2);
assert.deepEqual(successSummary.specialistTouchedKinds, ['implementation', 'research']);

const successGroup = getLatestParallelGroupRuns(store, successMission.id);
assert.ok(successGroup.parallelGroupId);
assert.equal(successGroup.runs.filter((run) => run.role === 'specialist').length, 2);
assert.equal(successGroup.runs.filter((run) => run.stageKind === 'parallel-merge').length, 1);
assert.equal(
  successGroup.runs
    .filter((run) => run.role === 'specialist')
    .every((run) => run.status === 'completed' && run.mergeStatus === 'merged'),
  true,
);
assert.equal(
  successGroup.runs
    .filter((run) => run.role === 'specialist')
    .every(
      (run) =>
        Boolean(run.specialistHandoff?.currentState) &&
        Array.isArray(run.specialistHandoff?.deliverables) &&
        run.specialistHandoff.deliverables.length > 0 &&
        Boolean(run.specialistHandoff?.nextHandoff?.request),
    ),
  true,
);

const successMergeRun = successGroup.runs.find((run) => run.stageKind === 'parallel-merge' && run.status === 'completed');
const successMergeArtifact = getDeliverableArtifact(store, successMergeRun);
const successMergeContent = fs.readFileSync(successMergeArtifact.path, 'utf8');
assert.match(successMergeContent, /## Specialist Inputs/);
assert.match(successMergeContent, /next=Merge the research specialist artifact into the manager-controlled executor draft\./);
assert.match(successMergeContent, /next=Merge the implementation specialist artifact into the manager-controlled executor draft\./);

const successTimeline = service.getMissionTimeline(successMission.id);
assert.equal(successTimeline.timeline.filter((event) => event.kind === 'specialist-branch-completed').length, 2);
assert.equal(successTimeline.timeline.filter((event) => event.kind === 'specialist-merge-completed').length, 1);

const profileMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-triad'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify orchestration profile specialist preset selection.',
  title: 'Parallel specialist profile mission',
  workspaceId: workspace.id,
});

const profileRun = await service.runMission(profileMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(profileRun.mission.status, 'completed');

const profileSummary = service.showMission(profileMission.id).summary;
assert.equal(profileSummary.specialistRunCount, 3);
assert.equal(profileSummary.specialistOrchestrationProfileId, 'knowledge-triad');
assert.equal(profileSummary.specialistOrchestrationProfileDisplayName, 'Knowledge Triad');
assert.equal(profileSummary.specialistOrchestrationProfileQualityGate, 'verification-signal-required');
assert.equal(profileSummary.specialistOrchestrationProfileRetryPolicy, 'resume-verification-fast');
assert.equal(profileSummary.specialistOrchestrationProfileSource, 'orchestration-profile');
assert.deepEqual(profileSummary.specialistConfiguredKinds, ['research', 'implementation', 'verification']);
assert.equal(profileSummary.specialistLatestParallelGroup?.orchestrationProfile?.id, 'knowledge-triad');
assert.equal(profileSummary.specialistLatestOrchestrationProfile?.id, 'knowledge-triad');

const profileTimeline = service.getMissionTimeline(profileMission.id);
assert.equal(profileTimeline.summary.specialistOrchestrationProfileId, 'knowledge-triad');
assert.equal(profileTimeline.summary.specialistLatestParallelGroup?.orchestrationProfile?.id, 'knowledge-triad');
assert.equal(profileTimeline.timeline.filter((event) => event.kind === 'specialist-branch-completed').length, 3);

const fullSpectrumMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation,verification,design,documentation'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify five-lane specialist fan-out and merge.',
  title: 'Parallel specialist full spectrum mission',
  workspaceId: workspace.id,
});

const fullSpectrumRun = await service.runMission(fullSpectrumMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(fullSpectrumRun.mission.status, 'completed');

const fullSpectrumSummary = service.showMission(fullSpectrumMission.id).summary;
assert.equal(fullSpectrumSummary.specialistRunCount, 5);
assert.equal(fullSpectrumSummary.specialistMergeRunCount, 1);
assert.deepEqual(
  fullSpectrumSummary.specialistConfiguredKinds,
  ['research', 'implementation', 'verification', 'design', 'documentation'],
);
assert.deepEqual(
  fullSpectrumSummary.specialistTouchedKinds,
  ['design', 'documentation', 'implementation', 'research', 'verification'],
);

const fullSpectrumGroup = getLatestParallelGroupRuns(store, fullSpectrumMission.id);
assert.ok(fullSpectrumGroup.parallelGroupId);
assert.equal(fullSpectrumGroup.runs.filter((run) => run.role === 'specialist').length, 5);
assert.equal(fullSpectrumGroup.runs.filter((run) => run.stageKind === 'parallel-merge').length, 1);
assert.equal(
  fullSpectrumGroup.runs
    .filter((run) => run.role === 'specialist')
    .every((run) => run.status === 'completed' && run.mergeStatus === 'merged'),
  true,
);

const fullSpectrumKinds = fullSpectrumGroup.runs
  .filter((run) => run.role === 'specialist')
  .map((run) => run.specialistKind)
  .sort();
assert.deepEqual(fullSpectrumKinds, ['design', 'documentation', 'implementation', 'research', 'verification']);

const fullSpectrumProfileMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-full-spectrum'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify knowledge full-spectrum orchestration profile selection.',
  title: 'Parallel specialist full-spectrum profile mission',
  workspaceId: workspace.id,
});

const fullSpectrumProfileRun = await service.runMission(fullSpectrumProfileMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(fullSpectrumProfileRun.mission.status, 'completed');

const fullSpectrumProfileSummary = service.showMission(fullSpectrumProfileMission.id).summary;
assert.equal(fullSpectrumProfileSummary.specialistRunCount, 5);
assert.equal(fullSpectrumProfileSummary.specialistOrchestrationProfileId, 'knowledge-full-spectrum');
assert.equal(fullSpectrumProfileSummary.specialistOrchestrationProfileDisplayName, 'Knowledge Full Spectrum');
assert.equal(fullSpectrumProfileSummary.specialistOrchestrationProfileQualityGate, 'research-and-verification-signal-required');
assert.equal(fullSpectrumProfileSummary.specialistOrchestrationProfileRetryPolicy, 'resume-research-and-verification-fast');
assert.deepEqual(
  fullSpectrumProfileSummary.specialistConfiguredKinds,
  ['research', 'implementation', 'verification', 'design', 'documentation'],
);

const qualityGateMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-triad', 'parallel-abandon:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify profile quality gate blocks merge until verification reruns successfully.',
  title: 'Parallel specialist quality gate mission',
  workspaceId: workspace.id,
});

const qualityGateFirstRun = await service.runMission(qualityGateMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(qualityGateFirstRun.mission.status, 'failed');

const qualityGateFirstSummary = service.showMission(qualityGateMission.id).summary;
assert.equal(qualityGateFirstSummary.specialistRunCount, 3);
assert.equal(qualityGateFirstSummary.specialistMergeRunCount, 0);
assert.equal(qualityGateFirstSummary.specialistFollowUpRequiredCount, 1);
assert.equal(qualityGateFirstSummary.specialistStatusCounts.completed, 2);
assert.equal(qualityGateFirstSummary.specialistStatusCounts.abandoned, 1);
assert.equal(qualityGateFirstSummary.specialistQualityGate, 'verification-signal-required');
assert.equal(qualityGateFirstSummary.specialistQualityGateStatus, 'blocked');
assert.equal(qualityGateFirstSummary.specialistQualityGateBlockedCount, 1);
assert.equal(qualityGateFirstSummary.specialistQualityGateViolationCount, 1);
assert.deepEqual(qualityGateFirstSummary.specialistQualityGateRequiredKinds, ['verification']);
assert.equal(qualityGateFirstSummary.specialistLatestQualityGateViolation?.specialistKind, 'verification');
assert.equal(qualityGateFirstSummary.specialistLatestQualityGateViolation?.actualStatus, 'abandoned');
assert.equal(qualityGateFirstSummary.specialistLatestParallelGroup?.qualityGate?.status, 'blocked');
assert.deepEqual(qualityGateFirstSummary.specialistLatestParallelGroup?.qualityGate?.rerunKinds, ['verification']);

const qualityGateInbox = service.getActionInbox({
  actionClass: 'specialist-follow-up-required',
  missionId: qualityGateMission.id,
});
assert.equal(qualityGateInbox.items.length, 1);
assert.equal(qualityGateInbox.summary.specialistFollowUpRetryPolicyCounts['resume-verification-fast'], 1);
assert.equal(qualityGateInbox.items[0].followUpSource, 'quality-gate');
assert.equal(qualityGateInbox.items[0].specialistKind, 'verification');
assert.equal(qualityGateInbox.items[0].status, 'blocked');
assert.equal(qualityGateInbox.items[0].priority, 'high');
assert.equal(qualityGateInbox.items[0].retryPolicy, 'resume-verification-fast');
assert.equal(qualityGateInbox.items[0].reminderCadenceHours, 12);
assert.equal(qualityGateInbox.items[0].slaHours, 12);
assert.equal(getHourDelta(qualityGateInbox.items[0].createdAt, qualityGateInbox.items[0].dueAt), 12);
assert.equal(qualityGateInbox.items[0].nextReminderAt, null);
assert.ok(qualityGateInbox.items[0].specialistHandoff);
assert.match(qualityGateInbox.items[0].specialistHandoff.nextHandoff.request, /satisfy the verification-signal-required gate/i);

const qualityGateFirstGroup = getLatestParallelGroupRuns(store, qualityGateMission.id);
const abandonedVerificationRun = qualityGateFirstGroup.runs.find(
  (run) => run.role === 'specialist' && run.specialistKind === 'verification' && run.status === 'abandoned',
);
assert.ok(qualityGateFirstGroup.parallelGroupId);
assert.ok(abandonedVerificationRun);

const qualityGateTimeline = service.getMissionTimeline(qualityGateMission.id);
assert.equal(qualityGateTimeline.timeline.filter((event) => event.kind === 'specialist-quality-gate-blocked').length, 1);
assert.equal(qualityGateTimeline.timeline.filter((event) => event.kind === 'specialist-merge-completed').length, 0);
const qualityGateWorkspaceTimeline = service.getWorkspaceTimeline(workspace.id);
assert.equal(
  qualityGateWorkspaceTimeline.timeline.some(
    (event) => event.kind === 'specialist-quality-gate-blocked' && event.missionId === qualityGateMission.id,
  ),
  true,
);
const qualityGateOperatorTimeline = service.getGlobalOperatorTimeline();
assert.equal(
  qualityGateOperatorTimeline.timeline.some(
    (event) => event.kind === 'specialist-quality-gate-blocked' && event.missionId === qualityGateMission.id,
  ),
  true,
);

store.updateMission(qualityGateMission.id, (current) => ({
  ...current,
  constraints: ['orchestration-profile:knowledge-triad'],
}));

const qualityGateSecondRun = await service.runMission(qualityGateMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(qualityGateSecondRun.mission.status, 'completed');

const qualityGateSecondSummary = service.showMission(qualityGateMission.id).summary;
assert.equal(qualityGateSecondSummary.specialistFollowUpRequiredCount, 0);
assert.equal(qualityGateSecondSummary.specialistMergeCompletedCount, 1);
assert.equal(qualityGateSecondSummary.specialistQualityGateStatus, 'passed');
assert.equal(qualityGateSecondSummary.specialistQualityGateBlockedCount, 0);
assert.equal(qualityGateSecondSummary.specialistQualityGateViolationCount, 0);
assert.equal(qualityGateSecondSummary.specialistLatestParallelGroup?.qualityGate?.status, 'passed');

const qualityGateSecondGroup = getLatestParallelGroupRuns(store, qualityGateMission.id);
const qualityGateVerificationRuns = qualityGateSecondGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'verification',
);
const qualityGateResearchRuns = qualityGateSecondGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'research',
);
const qualityGateImplementationRuns = qualityGateSecondGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'implementation',
);
const resumedVerificationRun = qualityGateVerificationRuns.at(-1);

assert.equal(qualityGateSecondGroup.parallelGroupId, qualityGateFirstGroup.parallelGroupId);
assert.equal(qualityGateVerificationRuns.length, 2);
assert.equal(qualityGateResearchRuns.length, 1);
assert.equal(qualityGateImplementationRuns.length, 1);
assert.equal(resumedVerificationRun.resumeFromRunId, abandonedVerificationRun.id);
assert.equal(
  resumedVerificationRun.specialistRootRunId,
  abandonedVerificationRun.specialistRootRunId || abandonedVerificationRun.id,
);

const mixedMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation,verification', 'parallel-abandon:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify mixed specialist completion with one abandoned branch.',
  title: 'Parallel specialist mixed completion mission',
  workspaceId: workspace.id,
});

const mixedRun = await service.runMission(mixedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(mixedRun.mission.status, 'completed');

const mixedSummary = service.showMission(mixedMission.id).summary;
assert.equal(mixedSummary.specialistRunCount, 3);
assert.equal(mixedSummary.specialistMergeRunCount, 1);
assert.equal(mixedSummary.specialistStatusCounts.completed, 2);
assert.equal(mixedSummary.specialistStatusCounts.abandoned, 1);
assert.deepEqual(mixedSummary.specialistTouchedKinds, ['implementation', 'research', 'verification']);

const mixedTimeline = service.getMissionTimeline(mixedMission.id);
assert.equal(mixedTimeline.timeline.filter((event) => event.kind === 'specialist-branch-abandoned').length, 1);
assert.equal(mixedTimeline.timeline.filter((event) => event.kind === 'specialist-merge-completed').length, 1);

const failedResumeMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation', 'parallel-fail:implementation'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify failed specialist branch resume and lineage preservation.',
  title: 'Parallel specialist failed resume mission',
  workspaceId: workspace.id,
});

const failedResumeFirstRun = await service.runMission(failedResumeMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(failedResumeFirstRun.mission.status, 'failed');

const failedResumeFirstSummary = service.showMission(failedResumeMission.id).summary;
assert.equal(failedResumeFirstSummary.specialistFollowUpRequiredCount, 1);
assert.equal(failedResumeFirstSummary.specialistStatusCounts.failed, 1);
assert.equal(failedResumeFirstSummary.specialistStatusCounts.completed, 1);

const failedResumeInbox = service.getActionInbox({
  actionClass: 'specialist-follow-up-required',
  missionId: failedResumeMission.id,
});
assert.equal(failedResumeInbox.items.length, 1);
assert.equal(failedResumeInbox.items[0].specialistKind, 'implementation');
assert.equal(failedResumeInbox.items[0].status, 'failed');
assert.ok(failedResumeInbox.items[0].specialistHandoff);
assert.ok(failedResumeInbox.items[0].specialistHandoff.currentState.includes('failed'));
assert.equal(failedResumeInbox.items[0].specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');
assert.ok(failedResumeInbox.items[0].specialistHandoff.blockers.length >= 1);

const failedResumeFirstGroup = getLatestParallelGroupRuns(store, failedResumeMission.id);
const failedImplementationRun = failedResumeFirstGroup.runs.find(
  (run) => run.role === 'specialist' && run.specialistKind === 'implementation' && run.status === 'failed',
);
const completedResearchRun = failedResumeFirstGroup.runs.find(
  (run) => run.role === 'specialist' && run.specialistKind === 'research' && run.status === 'completed',
);

assert.ok(failedImplementationRun);
assert.ok(completedResearchRun);

store.updateMission(failedResumeMission.id, (current) => ({
  ...current,
  constraints: ['parallel-specialists:research,implementation'],
}));

const failedResumeSecondRun = await service.runMission(failedResumeMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(failedResumeSecondRun.mission.status, 'completed');

const failedResumeSecondSummary = service.showMission(failedResumeMission.id).summary;
assert.equal(failedResumeSecondSummary.specialistFollowUpRequiredCount, 0);
assert.equal(failedResumeSecondSummary.specialistMergeCompletedCount, 1);
assert.equal(failedResumeSecondSummary.specialistStatusCounts.completed, 2);

const failedResumeSecondGroup = getLatestParallelGroupRuns(store, failedResumeMission.id);
assert.equal(failedResumeSecondGroup.parallelGroupId, failedResumeFirstGroup.parallelGroupId);

const implementationRuns = failedResumeSecondGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'implementation',
);
const researchRuns = failedResumeSecondGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'research',
);
const resumedImplementationRun = implementationRuns.at(-1);
const latestMergeRun = failedResumeSecondGroup.runs.find((run) => run.stageKind === 'parallel-merge' && run.status === 'completed');

assert.equal(implementationRuns.length, 2);
assert.equal(researchRuns.length, 1);
assert.equal(resumedImplementationRun.resumeFromRunId, failedImplementationRun.id);
assert.equal(
  resumedImplementationRun.specialistRootRunId,
  failedImplementationRun.specialistRootRunId || failedImplementationRun.id,
);
assert.ok(resumedImplementationRun.specialistHandoff?.currentState);
assert.ok(resumedImplementationRun.specialistHandoff?.deliverables?.length > 0);
assert.ok(latestMergeRun);
assert.equal(
  failedResumeSecondGroup.runs
    .filter((run) => run.role === 'specialist')
    .every((run) => ['completed', 'failed'].includes(run.status) ? Boolean(run.specialistRootRunId) : true),
  true,
);
assert.equal(
  failedResumeSecondGroup.runs
    .filter((run) => run.role === 'specialist' && ['completed', 'abandoned'].includes(run.status))
    .every((run) => run.mergeStatus === 'merged'),
  true,
);

const blockedMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation,verification', 'parallel-block:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify blocked specialist follow-up visibility.',
  title: 'Parallel specialist blocked mission',
  workspaceId: workspace.id,
});

const blockedRun = await service.runMission(blockedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(blockedRun.mission.status, 'failed');

const blockedSummary = service.showMission(blockedMission.id).summary;
assert.equal(blockedSummary.specialistFollowUpRequiredCount, 1);
assert.equal(blockedSummary.specialistStatusCounts.blocked, 1);

const blockedInbox = service.getActionInbox({
  actionClass: 'specialist-follow-up-required',
  missionId: blockedMission.id,
});

assert.equal(blockedInbox.items.length, 1);
assert.equal(blockedInbox.items[0].specialistKind, 'verification');
assert.equal(blockedInbox.items[0].status, 'blocked');
assert.equal(blockedInbox.items[0].parallelGroupId, getLatestParallelGroupRuns(store, blockedMission.id).parallelGroupId);
assert.ok(blockedInbox.items[0].specialistHandoff);
assert.ok(blockedInbox.items[0].specialistHandoff.blockers.length >= 1);
assert.equal(blockedInbox.items[0].specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');

const blockedTimeline = service.getMissionTimeline(blockedMission.id);
assert.equal(blockedTimeline.timeline.filter((event) => event.kind === 'specialist-branch-blocked').length, 1);

const workspaceOverview = service.getWorkspaceOverview(workspace.id);
assert.ok(workspaceOverview.summary.specialistRunCount >= 13);
assert.ok(workspaceOverview.summary.specialistMergeCompletedCount >= 4);
assert.ok(workspaceOverview.summary.specialistFollowUpRequiredCount >= 1);
assert.ok(workspaceOverview.summary.specialistOrchestrationProfileCounts['knowledge-triad'] >= 1);
assert.equal(workspaceOverview.summary.specialistTouchedOrchestrationProfileIds.includes('knowledge-triad'), true);
assert.equal(workspaceOverview.summary.specialistTouchedKinds.includes('verification'), true);
assert.equal(workspaceOverview.summary.specialistQualityGateStatusCounts.blocked, 0);

const workspaceTimeline = service.getWorkspaceTimeline(workspace.id);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) => event.kind === 'specialist-branch-blocked' && event.missionId === blockedMission.id,
  ),
  true,
);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) => event.kind === 'specialist-quality-gate-blocked' && event.missionId === qualityGateMission.id,
  ),
  false,
);
assert.ok(workspaceTimeline.summary.specialistOrchestrationProfileCounts['knowledge-triad'] >= 1);
assert.equal(workspaceTimeline.summary.specialistTouchedOrchestrationProfileIds.includes('knowledge-triad'), true);
assert.equal(workspaceTimeline.summary.specialistQualityGateStatusCounts.blocked, 0);

const globalOverview = service.getGlobalOverview();
assert.ok(globalOverview.summary.specialistRunCount >= workspaceOverview.summary.specialistRunCount);
assert.ok(globalOverview.summary.specialistMergeCompletedCount >= 4);
assert.ok(globalOverview.summary.specialistFollowUpRequiredCount >= 1);
assert.ok(globalOverview.summary.specialistOrchestrationProfileCounts['knowledge-triad'] >= 1);
assert.equal(globalOverview.summary.specialistTouchedOrchestrationProfileIds.includes('knowledge-triad'), true);
assert.equal(globalOverview.summary.specialistTouchedKinds.includes('verification'), true);
assert.equal(globalOverview.summary.specialistQualityGateStatusCounts.blocked, 0);
assert.equal(globalOverview.summary.specialistLatestQualityGateViolation, null);

const globalOperatorTimeline = service.getGlobalOperatorTimeline();
assert.equal(
  globalOperatorTimeline.timeline.some(
    (event) => event.kind === 'specialist-branch-blocked' && event.missionId === blockedMission.id,
  ),
  true,
);
assert.equal(
  globalOperatorTimeline.timeline.some(
    (event) => event.kind === 'specialist-quality-gate-blocked' && event.missionId === qualityGateMission.id,
  ),
  false,
);
assert.equal(
  globalOperatorTimeline.timeline.some(
    (event) => event.kind === 'specialist-merge-completed' && event.missionId === successMission.id,
  ),
  true,
);
assert.ok(globalOperatorTimeline.summary.specialistOrchestrationProfileCounts['knowledge-triad'] >= 1);
assert.equal(globalOperatorTimeline.summary.specialistTouchedOrchestrationProfileIds.includes('knowledge-triad'), true);
assert.equal(globalOperatorTimeline.summary.specialistQualityGateStatusCounts.blocked, 0);

console.log(
  JSON.stringify(
    {
      blockedMissionId: blockedMission.id,
      failedResumeMissionId: failedResumeMission.id,
      mode: 'parallel-specialists',
      ok: true,
      profileMissionId: profileMission.id,
      qualityGateMissionId: qualityGateMission.id,
      successMissionId: successMission.id,
    },
    null,
    2,
  ),
);
