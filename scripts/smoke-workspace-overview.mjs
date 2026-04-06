import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-workspace-overview-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'workspace-overview-workspace'],
});

runCli({
  rootDir: tempRoot,
  args: ['memory', 'add', '--scope', 'workspace', '--workspace', workspace.id, '--kind', 'fact', '--content', 'Workspace overview smoke context.'],
});

const completedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'prd',
    '--title',
    'Completed mission',
    '--objective',
    'Produce a completed mission for overview aggregation.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', completedMission.id],
});

const awaitingMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Awaiting mission',
    '--objective',
    'Produce a mission that is waiting for approval.',
  ],
});

const awaitingRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', awaitingMission.id],
});

const failedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Failed mission',
    '--objective',
    'Produce a mission that fails after rejection.',
  ],
});

const failedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    failedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Reject one mission so workspace aggregation includes failure.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === awaitingRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === failedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 2);

const reminderReadyState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
reminderReadyState.escalations = reminderReadyState.escalations.map((escalation) => ({
  ...escalation,
  createdAt: overdueTimestamp,
  updatedAt: overdueTimestamp,
}));
fs.writeFileSync(statePath, `${JSON.stringify(reminderReadyState, null, 2)}\n`, 'utf8');

const maintenanceRun = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance', '--workspace', workspace.id, '--note', 'Workspace overview maintenance sweep.'],
});

assert.equal(maintenanceRun.summary.totalRemindedCount, 2);
assert.equal(maintenanceRun.maintenanceRun.id !== undefined, true);

const overview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(overview.summary.missionCount, 3);
assert.equal(overview.summary.missionCounts.completed, 1);
assert.equal(overview.summary.missionCounts.awaiting_approval, 1);
assert.equal(overview.summary.missionCounts.failed, 1);
assert.equal(overview.summary.approvalCounts.pending, 1);
assert.equal(overview.summary.approvalCounts.rejected, 1);
assert.equal(overview.summary.approvalCounts.total, 2);
assert.equal(overview.summary.escalationCounts.open, 2);
assert.equal(overview.summary.escalationCounts.resolved, 0);
assert.equal(overview.summary.escalationCounts.total, 2);
assert.equal(overview.summary.memoryCounts.workspaceScoped, 1);
assert.equal(overview.summary.memoryCounts.missionScoped >= 1, true);
assert.equal(overview.summary.openEscalationIds.length, 2);
assert.equal(overview.summary.latestEscalation.workspaceId, workspace.id);
assert.equal(overview.summary.maintenanceRunCount, 1);
assert.equal(overview.summary.maintenanceTotalRemindedCount, 2);
assert.equal(overview.summary.maintenanceAffectedMissionCount, 2);
assert.equal(overview.summary.latestMaintenanceImpactRun.id, maintenanceRun.maintenanceRun.id);
assert.deepEqual(
  [...overview.summary.maintenanceAffectedMissionIds].sort(),
  [awaitingMission.id, failedMission.id].sort(),
);
assert.deepEqual(
  [...overview.summary.latestMaintenanceImpactAffectedMissionIds].sort(),
  [awaitingMission.id, failedMission.id].sort(),
);
assert.equal(overview.summary.sessionCount, 3);
assert.equal(overview.summary.activeMissionIds.includes(awaitingMission.id), true);
assert.equal(overview.summary.latestMission.mission.id, failedMission.id);
assert.equal(overview.escalations.length, 2);
assert.equal(overview.missions.length, 3);
assert.equal(
  overview.missions.some((entry) => entry.mission.id === failedMission.id && entry.summary.latestSession.status === 'failed'),
  true,
);
assert.equal(
  overview.missions.some((entry) => entry.mission.id === awaitingMission.id && entry.summary.latestSession.status === 'awaiting_approval'),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'workspace-overview',
      workspaceId: workspace.id,
      missionIds: overview.missions.map((entry) => entry.mission.id),
    },
    null,
    2,
  ),
);
