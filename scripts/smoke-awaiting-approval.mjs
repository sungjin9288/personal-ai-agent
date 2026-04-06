import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-awaiting-approval-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'approval-workspace'],
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
    'Await approval before execution',
    '--objective',
    'Produce an implementation proposal that must stop for approval.',
  ],
});

const result = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(result.status, 'awaiting_approval');
assert.ok(result.approvalId);

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

assert.equal(session.session.status, 'awaiting_approval');
assert.equal(session.approvals.length, 1);
assert.equal(session.approvals[0].status, 'pending');
assert.equal(session.agentRuns.length, 4);
assert.equal(session.artifacts.some((artifact) => artifact.fileName === 'approval-resolution.md'), false);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'awaiting-approval',
      missionId: mission.id,
      approvalId: result.approvalId,
    },
    null,
    2,
  ),
);
