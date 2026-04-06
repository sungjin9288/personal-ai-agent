import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-action-overdue-log-'));
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

const approvalMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Overdue approval action',
    '--objective',
    'Leave one pending approval to be logged as overdue.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

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
    'Reviewer overdue candidate',
    '--objective',
    'Create a reviewer follow-up that remains on time.',
    '--constraints',
    'force-rubric-fail',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', reviewerMission.id],
});

const blockedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Blocked overdue action',
    '--objective',
    'Create a rejected approval follow-up that will be overdue.',
  ],
});

const blockedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', blockedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    blockedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Scope is too broad and must be narrowed before rerun.',
  ],
});

const reviewerSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', reviewerMission.id],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === approvalRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === blockedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

state.artifacts = state.artifacts.map((artifact) => {
  if (artifact.id === reviewerSession.artifacts.find((entry) => entry.fileName === 'reviewer-report.md')?.id) {
    return {
      ...artifact,
      createdAt: '2026-04-06T00:00:00.000Z',
    };
  }

  return artifact;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const incidentLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(incidentLog.logged, true);
assert.equal(incidentLog.count, 2);
assert.ok(incidentLog.path);
assert.equal(incidentLog.itemIds.length, 2);

const incidentsContent = fs.readFileSync(incidentLog.path, 'utf8');
assert.match(incidentsContent, /Overdue Action Escalation \(2 items\)/);
assert.match(incidentsContent, /overdue action count: 2/);
assert.match(incidentsContent, /Approve engineering execution proposal/);
assert.match(incidentsContent, /Blocked after rejected approval/);
assert.match(incidentsContent, /approval resolve/);
assert.match(incidentsContent, /mission show/);
assert.match(incidentsContent, /escalate to the workspace owner/i);

const approvalOnlyLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--owner', 'human-approver'],
});

assert.equal(approvalOnlyLog.logged, true);
assert.equal(approvalOnlyLog.count, 1);

const noOpLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--priority', 'urgent'],
});

assert.equal(noOpLog.logged, false);
assert.equal(noOpLog.count, 0);
assert.equal(noOpLog.path, null);

console.log(
  JSON.stringify(
    {
      ok: true,
      count: incidentLog.count,
      mode: 'action-overdue-log',
      path: incidentLog.path,
    },
    null,
    2,
  ),
);
