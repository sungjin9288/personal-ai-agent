import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-workspace-timeline-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'workspace-timeline'],
});

const approvalMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Workspace timeline approval mission',
    '--objective',
    'Create workspace-scoped approval history for timeline audit.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

assert.equal(approvalRun.status, 'awaiting_approval');

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    approvalRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Workspace timeline smoke requires a resolved approval.',
  ],
});

const providerMission = runCli({
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
    'Workspace timeline provider mission',
    '--objective',
    'Create provider failure events for workspace timeline audit.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const providerRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', providerMission.id],
});

assert.equal(providerRun.status, 'failed');

const recentProviderSince = '2026-01-01T00:00:00.000Z';
const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id, '--provider-since', recentProviderSince],
});

assert.equal(workspaceTimeline.workspace.id, workspace.id);
assert.equal(workspaceTimeline.summary.eventCounts['approval-requested'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['approval-resolved'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['provider-execution-failed'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['sandbox-decision-recorded'], 4);
assert.equal(workspaceTimeline.summary.sandboxDecisionCount, 4);
assert.equal(workspaceTimeline.summary.sandboxDecisionModeCounts['local-runtime'], 4);
assert.equal(workspaceTimeline.summary.sandboxDecisionPolicyCounts['local-runtime-sandbox-policy/v1'], 4);
assert.equal(workspaceTimeline.summary.providerRecentSince, recentProviderSince);
assert.equal(workspaceTimeline.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(workspaceTimeline.summary.providerRecentExecutionCount > 0, true);
assert.equal(workspaceTimeline.timeline.every((event) => event.workspaceId === workspace.id), true);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-execution-failed' &&
      event.missionId === providerMission.id &&
      event.providerId === 'stub',
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      mode: 'workspace-timeline',
      ok: true,
      providerRecentExecutionCount: workspaceTimeline.summary.providerRecentExecutionCount,
      timelineLength: workspaceTimeline.timeline.length,
      workspaceId: workspace.id,
    },
    null,
    2,
  ),
);
