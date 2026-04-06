import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-operator-timeline-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');

fs.mkdirSync(workspaceOnePath, { recursive: true });
fs.mkdirSync(workspaceTwoPath, { recursive: true });

const workspaceOne = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceOnePath, '--name', 'workspace-one'],
});

const workspaceTwo = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceTwoPath, '--name', 'workspace-two'],
});

const operatorMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Operator timeline mission',
    '--objective',
    'Create approval and escalation lifecycle events in workspace one.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', operatorMission.id],
});

assert.equal(firstRun.status, 'awaiting_approval');

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    firstRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Operator timeline requires one rejected approval.',
  ],
});

const secondRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', operatorMission.id],
});

assert.equal(secondRun.status, 'awaiting_approval');

const reviewerMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Reviewer timeline mission',
    '--objective',
    'Create reviewer follow-up activity in workspace two.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const reviewerRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', reviewerMission.id],
});

assert.equal(reviewerRun.status, 'failed');

const reviewerFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--workspace', workspaceTwo.id],
});

assert.equal(reviewerFollowUps.summary.statusCounts.open, 1);
assert.equal(reviewerFollowUps.items.length, 1);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    reviewerFollowUps.items[0].actionId,
    '--note',
    'Reviewer follow-up resolved after remediation planning.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === secondRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  return approval;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--mission', operatorMission.id],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 1);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    escalationLog.escalationIds[0],
    '--note',
    'Workspace timeline escalation resolved.',
  ],
});

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspaceOne.id],
});

assert.equal(workspaceTimeline.workspace.id, workspaceOne.id);
assert.equal(workspaceTimeline.summary.eventCounts['approval-requested'], 2);
assert.equal(workspaceTimeline.summary.eventCounts['approval-resolved'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['escalation-opened'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['escalation-resolved'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['reviewer-follow-up-opened'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['reviewer-follow-up-resolved'] || 0, 0);
assert.equal(workspaceTimeline.timeline.every((event) => event.workspaceId === workspaceOne.id), true);

const reviewerWorkspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspaceTwo.id],
});

assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['reviewer-follow-up-opened'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['reviewer-follow-up-resolved'], 1);
assert.equal(reviewerWorkspaceTimeline.timeline.every((event) => event.workspaceId === workspaceTwo.id), true);

const globalTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(globalTimeline.summary.eventCounts['approval-requested'], 2);
assert.equal(globalTimeline.summary.eventCounts['approval-resolved'], 1);
assert.equal(globalTimeline.summary.eventCounts['escalation-opened'], 1);
assert.equal(globalTimeline.summary.eventCounts['escalation-resolved'], 1);
assert.equal(globalTimeline.summary.eventCounts['reviewer-follow-up-opened'], 1);
assert.equal(globalTimeline.summary.eventCounts['reviewer-follow-up-resolved'], 1);
assert.equal(globalTimeline.summary.workspaceCounts[workspaceOne.id] >= 4, true);
assert.equal(globalTimeline.summary.workspaceCounts[workspaceTwo.id], 2);
assert.equal(globalTimeline.workspaces.some((workspace) => workspace.id === workspaceOne.id), true);
assert.equal(globalTimeline.workspaces.some((workspace) => workspace.id === workspaceTwo.id), true);
assert.equal(
  globalTimeline.timeline.some(
    (event) => event.kind === 'reviewer-follow-up-opened' && event.workspaceId === workspaceTwo.id,
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'reviewer-follow-up-resolved' &&
      event.workspaceId === workspaceTwo.id &&
      /resolved after remediation planning/i.test(event.detail),
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) => event.kind === 'escalation-resolved' && /Workspace timeline escalation resolved/.test(event.detail),
  ),
  true,
);

for (let index = 1; index < globalTimeline.timeline.length; index += 1) {
  assert.ok(String(globalTimeline.timeline[index - 1].at) <= String(globalTimeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      globalEventCount: globalTimeline.summary.total,
      mode: 'operator-timeline',
      workspaceEventCount: workspaceTimeline.summary.total,
    },
    null,
    2,
  ),
);
