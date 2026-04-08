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

const failedRun = await service.runMission(failedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});
const blockedRun = await service.runMission(blockedMission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(failedRun.mission.status, 'failed');
assert.equal(blockedRun.mission.status, 'failed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-04-01T00:00:00.000Z';

state.agentRuns = state.agentRuns.map((agentRun) => {
  if (
    (agentRun.missionId === failedMission.id && agentRun.specialistKind === 'implementation' && agentRun.status === 'failed') ||
    (agentRun.missionId === blockedMission.id && agentRun.specialistKind === 'verification' && agentRun.status === 'blocked')
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

assert.equal(inbox.items.length, 2);
assert.equal(inbox.summary.total, 2);
assert.equal(inbox.summary.overdueCount, 2);
assert.equal(inbox.summary.providerCounts.stub, 2);
assert.equal(inbox.summary.statusCounts.failed, 1);
assert.equal(inbox.summary.statusCounts.blocked, 1);
assert.equal(inbox.summary.specialistKindCounts.implementation, 1);
assert.equal(inbox.summary.specialistKindCounts.verification, 1);

const failedOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--status', 'failed'],
});

assert.equal(failedOnly.filters.status, 'failed');
assert.equal(failedOnly.items.length, 1);
assert.equal(failedOnly.items[0].missionId, failedMission.id);
assert.equal(failedOnly.items[0].specialistKind, 'implementation');
assert.equal(failedOnly.items[0].providerId, 'stub');
assert.ok(failedOnly.items[0].specialistHandoff);
assert.ok(failedOnly.items[0].specialistHandoff.currentState.includes('failed'));
assert.ok(failedOnly.items[0].specialistHandoff.blockers.length >= 1);
assert.equal(failedOnly.items[0].specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');

const blockedOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--status', 'blocked'],
});

assert.equal(blockedOnly.filters.status, 'blocked');
assert.equal(blockedOnly.items.length, 1);
assert.equal(blockedOnly.items[0].missionId, blockedMission.id);
assert.equal(blockedOnly.items[0].specialistKind, 'verification');
assert.ok(blockedOnly.items[0].specialistHandoff);
assert.ok(blockedOnly.items[0].specialistHandoff.currentState.includes('blocked'));
assert.ok(blockedOnly.items[0].specialistHandoff.blockers.length >= 1);
assert.equal(blockedOnly.items[0].specialistHandoff.nextHandoff.recommendedOwner, 'workspace-owner');

const overdueOnly = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--overdue'],
});

assert.equal(overdueOnly.filters.overdueOnly, true);
assert.equal(overdueOnly.items.length, 2);
assert.equal(overdueOnly.summary.overdueCount, 2);

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
assert.equal(providerScoped.items.length, 2);
assert.equal(providerScoped.items.every((item) => item.providerId === 'stub'), true);

const genericInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'specialist-follow-up-required'],
});

assert.equal(genericInbox.items.length, 2);
assert.equal(genericInbox.summary.actionClassCounts.specialistFollowUpRequired, 2);
assert.equal(genericInbox.summary.specialistFollowUpProviderCounts.stub, 2);
assert.equal(genericInbox.summary.specialistFollowUpKindCounts.implementation, 1);
assert.equal(genericInbox.summary.specialistFollowUpKindCounts.verification, 1);
assert.equal(genericInbox.summary.specialistFollowUpStatusCounts.failed, 1);
assert.equal(genericInbox.summary.specialistFollowUpStatusCounts.blocked, 1);
assert.equal(genericInbox.summary.specialistFollowUpOverdueCount, 2);
assert.equal(genericInbox.summary.specialistFollowUpNeedsReminderCount, 2);
assert.equal(genericInbox.summary.specialistFollowUpReminderCountTotal, 0);
assert.equal(genericInbox.summary.specialistFollowUpLatestReminderAt, null);
assert.ok(genericInbox.summary.specialistFollowUpNextReminderAt);

console.log(
  JSON.stringify(
    {
      blockedMissionId: blockedMission.id,
      failedMissionId: failedMission.id,
      mode: 'specialist-follow-up-inbox',
      ok: true,
    },
    null,
    2,
  ),
);
