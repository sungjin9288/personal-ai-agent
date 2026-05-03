import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-smoke-'));
const workspacePath = path.join(tempRoot, 'example-workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'example-workspace'],
});

const workspaceList = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'list'],
});

const workspaceShow = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'show', workspace.id],
});

assert.equal(workspaceList.length, 1);
assert.equal(workspaceShow.path, workspacePath);

const userMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'add', '--scope', 'user', '--kind', 'preference', '--content', 'Prefer concise decision memos.'],
});

const workspaceMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'add', '--scope', 'workspace', '--workspace', workspace.id, '--kind', 'fact', '--content', 'Workspace uses local smoke scripts.'],
});

const listedUserMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'user'],
});

assert.equal(userMemory.scope, 'user');
assert.equal(workspaceMemory.scope, 'workspace');
assert.equal(listedUserMemory.length, 1);

const prdMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'prd',
    '--title',
    'Draft roadmap PRD',
    '--objective',
    'Create a first-pass PRD for the next milestone.',
  ],
});

const prdRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', prdMission.id, '--provider', 'stub'],
});

assert.equal(prdRun.status, 'completed');
assert.equal(prdRun.reviewerVerdict, 'pass');
assert.ok(fs.existsSync(prdRun.artifactPath));
assert.match(fs.readFileSync(prdRun.artifactPath, 'utf8'), /# Product Requirements Document/);
assert.match(fs.readFileSync(prdRun.artifactPath, 'utf8'), /## Next Action/);

const decisionMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Capture release decision',
    '--objective',
    'Document the current release approach and next action.',
  ],
});

const decisionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', decisionMission.id],
});

assert.equal(decisionRun.status, 'completed');
const decisionSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', decisionMission.id, '--session', decisionRun.sessionId],
});
assert.equal(decisionSession.session.sourceContext.sourceType, 'cli');
assert.equal(decisionSession.session.sourceContext.channel, 'cli');
assert.match(
  fs.readFileSync(decisionSession.artifacts.find((artifact) => artifact.fileName === 'manager-context.md').path, 'utf8'),
  /## Session Source[\s\S]*source type: cli/,
);

const engineeringMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Stabilize release smoke',
    '--objective',
    'Produce a bounded implementation proposal for release smoke stabilization.',
    '--constraints',
    'Keep blast radius small|Preserve release evidence flow',
  ],
});

const missionList = runCli({
  rootDir: tempRoot,
  args: ['mission', 'list'],
});

assert.equal(missionList.length, 3);

const engineeringRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', engineeringMission.id, '--provider', 'stub'],
});

assert.equal(engineeringRun.status, 'awaiting_approval');
assert.ok(engineeringRun.approvalId);

const engineeringSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', engineeringMission.id],
});

assert.equal(engineeringSession.session.status, 'awaiting_approval');
assert.equal(engineeringSession.agentRuns.length, 4);
assert.deepEqual(
  engineeringSession.agentRuns.map((run) => run.role),
  ['manager', 'planner', 'executor', 'reviewer'],
);
assert.equal(engineeringSession.approvals.length, 1);
assert.match(
  fs.readFileSync(engineeringSession.artifacts.find((artifact) => artifact.fileName === 'reviewer-report.md').path, 'utf8'),
  /pass: engineering-approval-next-action/,
);

const pendingApprovals = runCli({
  rootDir: tempRoot,
  args: ['approval', 'list', '--status', 'pending'],
});

assert.equal(pendingApprovals.length, 1);
assert.equal(pendingApprovals[0].id, engineeringRun.approvalId);

const approvalResolution = runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    engineeringRun.approvalId,
    '--decision',
    'approve',
    '--reason',
    'Proposal reviewed and approved for the next execution step.',
  ],
});

assert.equal(approvalResolution.mission.status, 'completed');
assert.ok(fs.existsSync(approvalResolution.artifactPath));
assert.ok(fs.existsSync(approvalResolution.resolutionArtifactPath));
assert.match(fs.readFileSync(approvalResolution.artifactPath, 'utf8'), /# Execution Ready Brief/);

const completedEngineeringSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', engineeringMission.id],
});

assert.equal(completedEngineeringSession.session.status, 'completed');
assert.equal(completedEngineeringSession.approvals[0].status, 'approved');
assert.equal(
  completedEngineeringSession.artifacts.some((artifact) => artifact.fileName === 'execution-ready-brief.md'),
  true,
);

const devlogResult = runCli({
  rootDir: tempRoot,
  args: ['doc', 'log', '--type', 'devlog', '--title', 'Smoke note', '--content', 'Verified the managed runtime smoke path.'],
});

const incidentResult = runCli({
  rootDir: tempRoot,
  args: ['doc', 'log', '--type', 'incident', '--title', 'Sample issue', '--content', 'Recorded a placeholder incident entry for CLI coverage.'],
});

const devlogResultPath = path.resolve(tempRoot, devlogResult.path);
const incidentResultPath = path.resolve(tempRoot, incidentResult.path);
assert.ok(fs.existsSync(devlogResultPath));
assert.ok(fs.existsSync(incidentResultPath));
assert.match(fs.readFileSync(devlogResultPath, 'utf8'), /Smoke note/);
assert.match(fs.readFileSync(incidentResultPath, 'utf8'), /Sample issue/);
assert.match(fs.readFileSync(prdRun.artifactPath, 'utf8'), /## Acceptance Signals/);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'personal-ai-agent-smoke',
      workspaceId: workspace.id,
      completedMissionIds: [prdMission.id, decisionMission.id, engineeringMission.id],
      approvalId: engineeringRun.approvalId,
    },
    null,
    2,
  ),
);
