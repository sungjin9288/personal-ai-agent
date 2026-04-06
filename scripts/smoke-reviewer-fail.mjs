import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-review-fail-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'review-fail-workspace'],
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
    'Force reviewer fail',
    '--objective',
    'Exercise the deterministic reviewer failure path.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const result = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(result.status, 'failed');
assert.equal(result.reviewerVerdict, 'fail');

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

const missionMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', mission.id],
});

assert.equal(session.session.status, 'failed');
assert.equal(session.approvals.length, 0);
assert.equal(missionMemory.some((entry) => entry.kind === 'fact'), true);
assert.equal(missionMemory.some((entry) => entry.content.includes('Reviewer failed checklist')), true);
assert.match(
  fs.readFileSync(session.artifacts.find((artifact) => artifact.fileName === 'reviewer-report.md').path, 'utf8'),
  /Checklist section does not contain checkbox items/,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'reviewer-fail',
      missionId: mission.id,
    },
    null,
    2,
  ),
);
