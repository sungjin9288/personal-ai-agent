import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-reviewer-follow-up-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'reviewer-follow-up-workspace'],
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
    'Reviewer follow-up lifecycle',
    '--objective',
    'Capture and close a reviewer follow-up.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const result = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(result.status, 'failed');

const openFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', mission.id],
});

assert.equal(openFollowUps.filters.status, 'open');
assert.equal(openFollowUps.summary.statusCounts.open, 1);
assert.equal(openFollowUps.items.length, 1);
assert.equal(openFollowUps.items[0].actionType, 'reviewer-follow-up');
assert.match(openFollowUps.items[0].resolveCommand, /resolve-reviewer-follow-up/);

const resolvedFollowUp = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    openFollowUps.items[0].actionId,
    '--note',
    'Checklist remediation was captured in a narrower follow-up plan.',
  ],
});

assert.equal(resolvedFollowUp.status, 'resolved');
assert.match(resolvedFollowUp.resolutionNote, /narrower follow-up plan/i);

const retryReadyInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'retry-ready'],
});

assert.equal(retryReadyInbox.summary.pendingActionCount, 0);

const resolvedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', mission.id, '--status', 'resolved'],
});

assert.equal(resolvedQueue.filters.status, 'resolved');
assert.equal(resolvedQueue.summary.statusCounts.resolved, 1);
assert.equal(resolvedQueue.items.length, 1);
assert.match(resolvedQueue.items[0].resolutionNote, /narrower follow-up plan/i);

const missionMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', mission.id],
});

assert.equal(
  missionMemory.some((entry) => /Reviewer follow-up resolved/.test(entry.content) && /narrower follow-up plan/i.test(entry.content)),
  true,
);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some((event) => event.kind === 'reviewer-follow-up-opened' && event.missionId === mission.id),
  true,
);
assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'reviewer-follow-up-resolved' &&
      event.missionId === mission.id &&
      /narrower follow-up plan/i.test(event.detail),
  ),
  true,
);

for (let index = 1; index < missionTimeline.timeline.length; index += 1) {
  assert.ok(String(missionTimeline.timeline[index - 1].at) <= String(missionTimeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      missionId: mission.id,
      mode: 'reviewer-follow-up-lifecycle',
      resolvedCount: resolvedQueue.items.length,
    },
    null,
    2,
  ),
);
