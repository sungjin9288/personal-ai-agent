import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-owner-history-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'owner-history-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Escalation owner history',
    '--objective',
    'Persist owner chain transitions for accepted-risk monitoring escalation.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'failed');

const openFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', mission.id],
});

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    openFollowUps.items[0].actionId,
    '--kind',
    'accepted-risk',
    '--note',
    'Owner history should capture escalation to human approver.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const initialState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
initialState.escalations = initialState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      createdAt: '2026-03-01T00:00:00.000Z',
      dueAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');

const firstSync = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

assert.equal(firstSync.summary.syncedCount, 1);
assert.equal(firstSync.summary.ownerTransitionedCount, 0);

runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspace.id, '--due'],
});

const afterReminderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterReminderState.escalations = afterReminderState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      lastReminderAt: '2026-04-05T00:00:00.000Z',
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterReminderState, null, 2)}\n`, 'utf8');

const escalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder', '--effective-owner', 'human-approver'],
});

assert.equal(escalatedInbox.items.length, 1);
assert.equal(escalatedInbox.items[0].effectiveRecommendedOwner, 'human-approver');
assert.equal(escalatedInbox.items[0].ownerHistoryCount, 2);
assert.ok(escalatedInbox.items[0].lastOwnerEscalatedAt);
assert.equal(escalatedInbox.summary.ownerTransitionCountTotal, 1);
assert.equal(escalatedInbox.summary.effectiveOwnerCounts['human-approver'], 1);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'escalation-owner-changed' &&
      event.escalationId === resolution.escalation.id &&
      /workspace-owner -> human-approver/.test(event.detail),
  ),
  true,
);
assert.equal(missionTimeline.summary.escalationOwnerTransitionCountTotal, 1);
assert.ok(missionTimeline.summary.escalationLatestOwnerEscalatedAt);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(
  operatorTimeline.timeline.some(
    (event) =>
      event.kind === 'escalation-owner-changed' &&
      event.escalationId === resolution.escalation.id &&
      /workspace-owner -> human-approver/.test(event.detail),
  ),
  true,
);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.escalationOwnerTransitionCountTotal, 1);
assert.ok(globalOverview.summary.escalationLatestOwnerEscalatedAt);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'escalation-owner-history',
      ownerHistoryCount: escalatedInbox.items[0].ownerHistoryCount,
    },
    null,
    2,
  ),
);
