import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-reviewer-accepted-risk-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'accepted-risk-workspace'],
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
    'Accepted risk reviewer follow-up',
    '--objective',
    'Resolve reviewer follow-up with accepted risk and keep it visible through escalation.',
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

assert.equal(openFollowUps.items.length, 1);

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    openFollowUps.items[0].actionId,
    '--kind',
    'accepted-risk',
    '--note',
    'Accept the checklist gap until the next release window.',
  ],
});

assert.equal(resolution.followUp.status, 'resolved');
assert.equal(resolution.followUp.resolutionKind, 'accepted-risk');
assert.ok(resolution.escalation);
assert.equal(resolution.escalation.status, 'open');
assert.equal(resolution.escalation.actionType, 'reviewer-accepted-risk');
assert.equal(resolution.escalation.recommendedOwner, 'workspace-owner');
assert.equal(resolution.escalation.sourceResolutionKind, 'accepted-risk');
assert.equal(resolution.escalation.sourceReviewerFollowUpActionId, openFollowUps.items[0].actionId);
assert.match(resolution.escalation.title, /Accepted risk monitoring/i);

const escalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id],
});

assert.equal(escalatedInbox.summary.statusCounts.open, 1);
assert.equal(escalatedInbox.items.length, 1);
assert.equal(escalatedInbox.items[0].actionType, 'reviewer-accepted-risk');
assert.equal(escalatedInbox.items[0].recommendedOwner, 'workspace-owner');
assert.match(escalatedInbox.items[0].reason, /next release window/i);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.escalationCounts.open, 1);
assert.equal(workspaceOverview.summary.openEscalationIds.length, 1);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.openEscalationCount, 1);
assert.equal(globalOverview.summary.escalatedWorkspaceIds.includes(workspace.id), true);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'reviewer-follow-up-resolved' &&
      /accepted-risk:/.test(event.detail) &&
      /next release window/i.test(event.detail),
  ),
  true,
);
assert.equal(
  missionTimeline.timeline.some(
    (event) => event.kind === 'escalation-opened' && /Accepted risk monitoring/i.test(event.detail),
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
      escalationId: resolution.escalation.id,
      missionId: mission.id,
      mode: 'reviewer-follow-up-accepted-risk',
    },
    null,
    2,
  ),
);
