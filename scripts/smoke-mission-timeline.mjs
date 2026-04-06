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
assert.equal(missionShow.summary.memoryCounts.decision >= 1, true);
assert.equal(missionShow.summary.latestSession.status, 'awaiting_approval');

assert.equal(timeline.summary.sessionCount, 2);
assert.equal(timeline.timeline.some((event) => event.kind === 'mission-created'), true);
assert.equal(timeline.timeline.filter((event) => event.kind === 'session-started').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-requested').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-resolved').length, 1);
assert.equal(timeline.timeline.some((event) => event.kind === 'memory-recorded' && /Timeline smoke needs a rejected first attempt/.test(event.detail)), true);

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
