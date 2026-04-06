import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-approval-approve-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'approval-approve-workspace'],
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
    'Approve and resume execution handoff',
    '--objective',
    'Verify that approval approval creates a concrete execution-ready handoff artifact.',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'awaiting_approval');
assert.ok(runResult.approvalId);

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    runResult.approvalId,
    '--decision',
    'approve',
    '--reason',
    'The proposal is narrow enough to proceed to the approved execution handoff.',
  ],
});

assert.equal(resolution.mission.status, 'completed');
assert.equal(resolution.approval.status, 'approved');
assert.ok(fs.existsSync(resolution.artifactPath));
assert.ok(fs.existsSync(resolution.resolutionArtifactPath));
assert.match(fs.readFileSync(resolution.artifactPath, 'utf8'), /# Execution Ready Brief/);
assert.match(fs.readFileSync(resolution.artifactPath, 'utf8'), /the bounded proposal has been reviewed and explicitly approved/i);
assert.match(fs.readFileSync(resolution.resolutionArtifactPath, 'utf8'), /decision: approve/);

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

assert.equal(session.session.status, 'completed');
assert.equal(session.approvals[0].status, 'approved');
assert.equal(session.artifacts.some((artifact) => artifact.fileName === 'execution-ready-brief.md'), true);
assert.equal(session.artifacts.some((artifact) => artifact.fileName === 'approval-resolution.md'), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'approval-approve',
      missionId: mission.id,
      approvalId: runResult.approvalId,
    },
    null,
    2,
  ),
);
