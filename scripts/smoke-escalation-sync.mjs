import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-sync-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'escalation-sync-workspace'],
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
    'Escalation sync lifecycle',
    '--objective',
    'Track escalation tier transitions and breach count.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(firstRun.status, 'failed');

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
    'Accept this gap and monitor it through escalation sync.',
  ],
});

assert.ok(resolution.escalation);

const initialSync = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

assert.equal(initialSync.summary.syncedCount, 1);
assert.equal(initialSync.summary.transitionedCount, 0);
assert.equal(initialSync.summary.breachCountTotal, 0);

const initialEscalated = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id],
});

assert.equal(initialEscalated.items[0].escalationTier, 'normal');
assert.equal(initialEscalated.items[0].breachCount, 0);
assert.equal(initialEscalated.items[0].escalationTierHistoryCount, 1);
assert.equal(initialEscalated.items[0].tierHistory[0].to, 'normal');

const statePath = path.join(tempRoot, 'var', 'state.json');
const warningState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
warningState.escalations = warningState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      dueAt: '2026-04-05T23:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(warningState, null, 2)}\n`, 'utf8');

const warningSync = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

assert.equal(warningSync.summary.transitionedCount, 1);
assert.equal(warningSync.summary.breachCountTotal, 1);

const warningEscalated = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--tier', 'warning'],
});

assert.equal(warningEscalated.items.length, 1);
assert.equal(warningEscalated.items[0].escalationTier, 'warning');
assert.equal(warningEscalated.items[0].breachCount, 1);
assert.equal(warningEscalated.items[0].escalationTierHistoryCount, 2);
assert.equal(warningEscalated.items[0].tierHistory.at(-1).from, 'normal');
assert.equal(warningEscalated.items[0].tierHistory.at(-1).to, 'warning');

const criticalState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
criticalState.escalations = criticalState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      dueAt: '2026-04-03T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(criticalState, null, 2)}\n`, 'utf8');

const criticalSync = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

assert.equal(criticalSync.summary.transitionedCount, 1);
assert.equal(criticalSync.summary.breachCountTotal, 2);

const criticalEscalated = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--tier', 'critical'],
});

assert.equal(criticalEscalated.items.length, 1);
assert.equal(criticalEscalated.items[0].escalationTier, 'critical');
assert.equal(criticalEscalated.items[0].breachCount, 2);
assert.equal(criticalEscalated.items[0].escalationTierHistoryCount, 3);
assert.equal(criticalEscalated.items[0].tierHistory.at(-1).from, 'warning');
assert.equal(criticalEscalated.items[0].tierHistory.at(-1).to, 'critical');
assert.ok(criticalEscalated.items[0].lastBreachAt);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    resolution.escalation.id,
    '--note',
    'Monitoring complete after escalation sync validation.',
  ],
});

const resolvedSync = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id, '--status', 'resolved'],
});

assert.equal(resolvedSync.summary.transitionedCount, 1);

const resolvedEscalated = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--status', 'resolved', '--tier', 'resolved'],
});

assert.equal(resolvedEscalated.items.length, 1);
assert.equal(resolvedEscalated.items[0].escalationTier, 'resolved');
assert.equal(resolvedEscalated.items[0].breachCount, 2);
assert.equal(resolvedEscalated.items[0].escalationTierHistoryCount, 4);
assert.equal(resolvedEscalated.items[0].tierHistory.at(-1).from, 'critical');
assert.equal(resolvedEscalated.items[0].tierHistory.at(-1).to, 'resolved');

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionShow.summary.escalationBreachCountTotal, 2);
assert.equal(missionShow.summary.escalationTierCounts.resolved, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'escalation-sync',
      tierHistoryCount: resolvedEscalated.items[0].escalationTierHistoryCount,
    },
    null,
    2,
  ),
);
