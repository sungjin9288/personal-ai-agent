import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-specialist-follow-up-inbox-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'specialist-follow-up-workspace',
  workspacePath,
});

const failedMission = service.createMission({
  constraints: ['parallel-specialists:research,implementation', 'parallel-fail:implementation'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Create one failed specialist follow-up item.',
  title: 'Specialist failed follow-up mission',
  workspaceId: workspace.id,
});

const blockedMission = service.createMission({
  constraints: ['parallel-specialists:research,verification', 'parallel-block:verification'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Create one blocked specialist follow-up item.',
  title: 'Specialist blocked follow-up mission',
  workspaceId: workspace.id,
});

const designMission = service.createMission({
  constraints: ['parallel-specialists:design,documentation', 'parallel-block:design'],
  deliverableType: 'decision-memo',
  mode: 'knowledge',
  objective: 'Create one blocked follow-up item on a post-triad specialist lane.',
  title: 'Specialist design follow-up mission',
  workspaceId: workspace.id,
});

const failedRun = await service.runMission(failedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});
const blockedRun = await service.runMission(blockedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});
const designRun = await service.runMission(designMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(failedRun.mission.status, 'failed');
assert.equal(blockedRun.mission.status, 'failed');
assert.equal(designRun.mission.status, 'failed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-04-01T00:00:00.000Z';

state.agentRuns = state.agentRuns.map((agentRun) => {
  if (
    (agentRun.missionId === failedMission.id && agentRun.specialistKind === 'implementation' && agentRun.status === 'failed') ||
    (agentRun.missionId === blockedMission.id && agentRun.specialistKind === 'verification' && agentRun.status === 'blocked') ||
    (agentRun.missionId === designMission.id && agentRun.specialistKind === 'design' && agentRun.status === 'blocked')
  ) {
    return {
      ...agentRun,
      endedAt: overdueTimestamp,
      startedAt: overdueTimestamp,
    };
  }

  return agentRun;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const inbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups'],
});

assert.equal(inbox.items.length, 3);
assert.equal(inbox.summary.total, 3);
assert.equal(inbox.summary.overdueCount, 3);
assert.equal(inbox.summary.providerCounts.stub, 3);
assert.equal(inbox.summary.statusCounts.failed, 1);
assert.equal(inbox.summary.statusCounts.blocked, 2);
assert.equal(inbox.summary.specialistKindCounts.implementation, 1);
assert.equal(inbox.summary.specialistKindCounts.verification, 1);
assert.equal(inbox.summary.specialistKindCounts.design, 1);

const failedOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--status', 'failed'],
});

assert.equal(failedOnly.filters.status, 'failed');
assert.equal(failedOnly.items.length, 1);
assert.equal(failedOnly.items[0].missionId, failedMission.id);
assert.equal(failedOnly.items[0].specialistKind, 'implementation');
assert.equal(failedOnly.items[0].providerId, 'stub');
assert.match(failedOnly.items[0].recommendedCommand, /^node src\/cli\.mjs action remediate-specialist-follow-up /);
assert.equal(
  failedOnly.items[0].fallbackRecommendedCommand,
  `node src/cli.mjs mission run ${failedMission.id} --provider stub`,
);
assert.equal(failedOnly.items[0].remediationRoute.routeType, 'standard-branch-remediation');
assert.equal(failedOnly.items[0].remediationRoute.routeUrgency, 'standard');
assert.ok(failedOnly.items[0].specialistHandoff);
assert.ok(failedOnly.items[0].specialistHandoff.currentState.includes('failed'));
assert.ok(failedOnly.items[0].specialistHandoff.blockers.length >= 1);
assert.equal(failedOnly.items[0].specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');

const blockedOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--status', 'blocked'],
});

assert.equal(blockedOnly.filters.status, 'blocked');
assert.equal(blockedOnly.items.length, 2);
assert.deepEqual(
  blockedOnly.items.map((item) => item.specialistKind).sort((left, right) => String(left).localeCompare(String(right))),
  ['design', 'verification'],
);
for (const item of blockedOnly.items) {
  assert.ok(item.specialistHandoff);
  assert.ok(item.specialistHandoff.currentState.includes('blocked'));
  assert.ok(item.specialistHandoff.blockers.length >= 1);
  assert.equal(item.specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');
}

const overdueOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--overdue'],
});

assert.equal(overdueOnly.filters.overdueOnly, true);
assert.equal(overdueOnly.items.length, 3);
assert.equal(overdueOnly.summary.overdueCount, 3);

const missionScoped = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--mission', failedMission.id],
});

assert.equal(missionScoped.items.length, 1);
assert.equal(missionScoped.items[0].missionId, failedMission.id);

const providerScoped = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--provider', 'stub', '--workspace', workspace.id],
});

assert.equal(providerScoped.filters.providerId, 'stub');
assert.equal(providerScoped.filters.workspaceId, workspace.id);
assert.equal(providerScoped.items.length, 3);
assert.equal(providerScoped.items.every((item) => item.providerId === 'stub'), true);

const genericInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'specialist-follow-up-required'],
});

assert.equal(genericInbox.items.length, 3);
assert.equal(genericInbox.summary.actionClassCounts.specialistFollowUpRequired, 3);
assert.equal(genericInbox.summary.specialistFollowUpProviderCounts.stub, 3);
assert.equal(genericInbox.summary.specialistFollowUpKindCounts.implementation, 1);
assert.equal(genericInbox.summary.specialistFollowUpKindCounts.verification, 1);
assert.equal(genericInbox.summary.specialistFollowUpKindCounts.design, 1);
assert.equal(genericInbox.summary.specialistFollowUpRemediationRouteCounts['standard-branch-remediation'], 3);
assert.equal(genericInbox.summary.specialistFollowUpStatusCounts.failed, 1);
assert.equal(genericInbox.summary.specialistFollowUpStatusCounts.blocked, 2);
assert.equal(genericInbox.summary.specialistFollowUpOverdueCount, 3);
assert.equal(genericInbox.summary.specialistFollowUpNeedsReminderCount, 3);
assert.equal(genericInbox.summary.specialistFollowUpReminderCountTotal, 0);
assert.equal(genericInbox.summary.specialistFollowUpLatestReminderAt, null);
assert.ok(genericInbox.summary.specialistFollowUpNextReminderAt);

console.log(
  JSON.stringify(
    {
      blockedMissionId: blockedMission.id,
      designMissionId: designMission.id,
      failedMissionId: failedMission.id,
      mode: 'specialist-follow-up-inbox',
      ok: true,
    },
    null,
    2,
  ),
);
