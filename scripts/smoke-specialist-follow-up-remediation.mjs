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
assert.ok(mergeRun);

console.log(
  JSON.stringify(
    {
      mode: 'specialist-follow-up-remediation',
      ok: true,
      parallelGroupId: remediation.parallelGroupId,
      resumedRunId: resumedImplementationRun.id,
    },
    null,
    2,
  ),
);
