import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-specialist-follow-up-remediation-'));
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

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'specialist-remediation-workspace',
  workspacePath,
});

const qualityGateMission = service.createMission({
  constraints: ['orchestration-profile:knowledge-triad', 'parallel-abandon:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify profile-aware specialist remediation routing for verification quality-gate follow-up.',
  title: 'Specialist quality gate remediation mission',
  workspaceId: workspace.id,
});

const qualityGateFirstRun = await service.runMission(qualityGateMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(qualityGateFirstRun.mission.status, 'failed');

const qualityGateInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'specialist-follow-up-required', '--mission', qualityGateMission.id],
});

assert.equal(qualityGateInbox.items.length, 1);
assert.equal(qualityGateInbox.items[0].specialistKind, 'verification');
assert.equal(qualityGateInbox.items[0].followUpSource, 'quality-gate');
assert.equal(qualityGateInbox.items[0].retryPolicy, 'resume-verification-fast');
assert.equal(qualityGateInbox.items[0].remediationRoute.routeType, 'priority-verification-remediation');
assert.equal(qualityGateInbox.items[0].remediationRoute.routeUrgency, 'fast');
assert.match(qualityGateInbox.items[0].recommendedCommand, /^node src\/cli\.mjs action remediate-specialist-follow-up /);
assert.equal(
  qualityGateInbox.items[0].fallbackRecommendedCommand,
  `node src/cli.mjs mission run ${qualityGateMission.id} --provider stub`,
);

store.updateMission(qualityGateMission.id, (current) => ({
  ...current,
  constraints: ['orchestration-profile:knowledge-triad'],
}));

const qualityGateRemediation = runCli({
  rootDir: tempRoot,
  args: ['action', 'remediate-specialist-follow-up', qualityGateInbox.items[0].actionId],
});

assert.equal(qualityGateRemediation.remediationKind, 'mission-rerun');
assert.equal(qualityGateRemediation.retryPolicy, 'resume-verification-fast');
assert.equal(qualityGateRemediation.remediationRoute.routeType, 'priority-verification-remediation');
assert.equal(qualityGateRemediation.recommendedCommand, qualityGateInbox.items[0].recommendedCommand);
assert.equal(
  qualityGateRemediation.fallbackRecommendedCommand,
  `node src/cli.mjs mission run ${qualityGateMission.id} --provider stub`,
);
assert.equal(qualityGateRemediation.result.missionStatus, 'completed');
assert.equal(qualityGateRemediation.postFollowUp.status, 'clear');

const mission = service.createMission({
  constraints: ['parallel-specialists:research,implementation', 'parallel-fail:implementation'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Verify dedicated specialist follow-up remediation reruns the failed branch and preserves lineage.',
  title: 'Specialist follow-up remediation mission',
  workspaceId: workspace.id,
});

const firstRun = await service.runMission(mission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(firstRun.mission.status, 'failed');

const initialFollowUpInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'specialist-follow-up-required', '--mission', mission.id],
});

assert.equal(initialFollowUpInbox.items.length, 1);
assert.equal(initialFollowUpInbox.items[0].specialistKind, 'implementation');
assert.equal(initialFollowUpInbox.items[0].status, 'failed');
assert.equal(initialFollowUpInbox.items[0].providerId, 'stub');

const firstParallelGroup = getLatestParallelGroupRuns(store, mission.id);
const failedImplementationRun = firstParallelGroup.runs.find(
  (run) => run.role === 'specialist' && run.specialistKind === 'implementation' && run.status === 'failed',
);

assert.ok(firstParallelGroup.parallelGroupId);
assert.ok(failedImplementationRun);

store.updateMission(mission.id, (current) => ({
  ...current,
  constraints: ['parallel-specialists:research,implementation'],
}));

const remediation = runCli({
  rootDir: tempRoot,
  args: ['action', 'remediate-specialist-follow-up', initialFollowUpInbox.items[0].actionId],
});

assert.equal(remediation.remediationKind, 'mission-rerun');
assert.equal(remediation.previousStatus, 'failed');
assert.equal(remediation.providerId, 'stub');
assert.equal(remediation.specialistKind, 'implementation');
assert.equal(remediation.parallelGroupId, firstParallelGroup.parallelGroupId);
assert.equal(remediation.result.missionStatus, 'completed');
assert.equal(remediation.result.provider, 'stub');
assert.equal(remediation.result.parallelGroupId, firstParallelGroup.parallelGroupId);
assert.equal(remediation.postFollowUp.status, 'clear');
assert.equal(remediation.postFollowUp.pendingCount, 0);

const resolvedFollowUpInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'specialist-follow-up-required', '--mission', mission.id],
});

assert.equal(resolvedFollowUpInbox.items.length, 0);

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionShow.summary.specialistFollowUpRequiredCount, 0);
assert.equal(missionShow.summary.specialistMergeCompletedCount, 1);
assert.equal(missionShow.mission.status, 'completed');

const secondParallelGroup = getLatestParallelGroupRuns(store, mission.id);
const implementationRuns = secondParallelGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'implementation',
);
const researchRuns = secondParallelGroup.runs.filter(
  (run) => run.role === 'specialist' && run.specialistKind === 'research',
);
const resumedImplementationRun = implementationRuns.at(-1);
const mergeRun = secondParallelGroup.runs.find((run) => run.stageKind === 'parallel-merge' && run.status === 'completed');

assert.equal(secondParallelGroup.parallelGroupId, firstParallelGroup.parallelGroupId);
assert.equal(implementationRuns.length, 2);
assert.equal(researchRuns.length, 1);
assert.equal(resumedImplementationRun.resumeFromRunId, failedImplementationRun.id);
assert.equal(
  resumedImplementationRun.specialistRootRunId,
  failedImplementationRun.specialistRootRunId || failedImplementationRun.id,
);
assert.ok(resumedImplementationRun.specialistHandoff);
assert.ok(resumedImplementationRun.specialistHandoff.currentState);
assert.ok(resumedImplementationRun.specialistHandoff.deliverables.length > 0);
assert.equal(resumedImplementationRun.specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');
assert.ok(mergeRun);

console.log(
  JSON.stringify(
    {
      mode: 'specialist-follow-up-remediation',
      ok: true,
      qualityGateMissionId: qualityGateMission.id,
      parallelGroupId: remediation.parallelGroupId,
      resumedRunId: resumedImplementationRun.id,
    },
    null,
    2,
  ),
);
