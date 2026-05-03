import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-owner-chain-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'owner-chain-workspace'],
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
    'Escalation owner chain',
    '--objective',
    'Escalate accepted-risk monitoring ownership after repeated due reminders.',
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
    'Track this through escalation owner escalation chain.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const initialState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
initialState.escalations = initialState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      createdAt: isoHoursAgo(50),
      dueAt: isoHoursAgo(25),
      updatedAt: isoHoursAgo(50),
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

const firstDueInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(firstDueInbox.items.length, 1);
assert.equal(firstDueInbox.items[0].effectiveRecommendedOwner, 'workspace-owner');
assert.equal(firstDueInbox.items[0].ownerEscalationLevel, 'base');
assert.equal(firstDueInbox.summary.effectiveOwnerCounts['workspace-owner'], 1);

runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspace.id, '--due'],
});

const afterReminderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterReminderState.escalations = afterReminderState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      lastReminderAt: isoHoursAgo(7),
      updatedAt: isoHoursAgo(7),
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterReminderState, null, 2)}\n`, 'utf8');

const escalatedOwnerInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder', '--effective-owner', 'human-approver'],
});

assert.equal(escalatedOwnerInbox.items.length, 1);
assert.equal(escalatedOwnerInbox.items[0].effectiveRecommendedOwner, 'human-approver');
assert.equal(escalatedOwnerInbox.items[0].ownerEscalationLevel, 'final');
assert.equal(escalatedOwnerInbox.items[0].ownerEscalationStep, 1);
assert.equal(escalatedOwnerInbox.summary.effectiveOwnerCounts['human-approver'], 1);

const handoffInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--class', 'handoff-required', '--effective-owner', 'human-approver'],
});

assert.equal(handoffInbox.items.length, 1);
assert.equal(handoffInbox.items[0].effectiveRecommendedOwner, 'human-approver');
assert.equal(handoffInbox.summary.effectiveOwnerCounts['human-approver'], 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      effectiveOwner: escalatedOwnerInbox.items[0].effectiveRecommendedOwner,
      mode: 'escalation-owner-chain',
    },
    null,
    2,
  ),
);

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
