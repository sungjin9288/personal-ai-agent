import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-mission-timeline-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'mission-timeline-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Inspect mission timeline',
    '--objective',
    'Verify that mission-level timeline aggregates sessions, approvals, and memory.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
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
    'Timeline smoke needs a rejected first attempt before rerun.',
  ],
});

const secondRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(secondRun.status, 'awaiting_approval');

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
  args: ['action', 'log-overdue', '--mission', mission.id],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 1);
assert.equal(escalationLog.escalationIds.length, 1);

const resolvedEscalation = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    escalationLog.escalationIds[0],
    '--note',
    'Timeline escalation resolved after manual follow-up.',
  ],
});

assert.equal(resolvedEscalation.status, 'resolved');

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

const timeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(missionShow.summary.sessionCount, 2);
assert.equal(missionShow.summary.approvalCounts.rejected, 1);
assert.equal(missionShow.summary.approvalCounts.pending, 1);
assert.equal(missionShow.summary.escalationCounts.open, 0);
assert.equal(missionShow.summary.escalationCounts.resolved, 1);
assert.equal(missionShow.summary.escalationCounts.total, 1);
assert.equal(missionShow.summary.memoryCounts.decision >= 1, true);
assert.equal(missionShow.summary.latestSession.status, 'awaiting_approval');
assert.equal(missionShow.summary.latestEscalation.id, escalationLog.escalationIds[0]);

assert.equal(timeline.summary.sessionCount, 2);
assert.equal(timeline.timeline.some((event) => event.kind === 'mission-created'), true);
assert.equal(timeline.timeline.filter((event) => event.kind === 'session-started').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-requested').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-resolved').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'escalation-opened').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'escalation-resolved').length, 1);
assert.equal(timeline.timeline.some((event) => event.kind === 'memory-recorded' && /Timeline smoke needs a rejected first attempt/.test(event.detail)), true);
assert.equal(
  timeline.timeline.some((event) => event.kind === 'escalation-resolved' && /Timeline escalation resolved after manual follow-up/.test(event.detail)),
  true,
);

for (let index = 1; index < timeline.timeline.length; index += 1) {
  assert.ok(String(timeline.timeline[index - 1].at) <= String(timeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'mission-timeline',
      missionId: mission.id,
      timelineLength: timeline.timeline.length,
    },
    null,
    2,
  ),
);
