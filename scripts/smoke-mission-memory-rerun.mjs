import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-memory-rerun-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'memory-rerun-workspace'],
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
    'Carry rejection memory into rerun',
    '--objective',
    'Verify that mission-scoped decision memory is reused on a later run.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(firstRun.status, 'awaiting_approval');
assert.ok(firstRun.approvalId);

const rejection = runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    firstRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Narrow the verification path before attempting workspace execution.',
  ],
});

assert.equal(rejection.mission.status, 'failed');

const missionMemory = runCli({
  rootDir: tempRoot,
  args: ['memory', 'list', '--scope', 'mission', '--mission', mission.id],
});

assert.equal(missionMemory.some((entry) => entry.kind === 'decision'), true);
assert.equal(
  missionMemory.some((entry) => entry.content.includes('Narrow the verification path before attempting workspace execution.')),
  true,
);

const rerun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(rerun.status, 'awaiting_approval');

const latestSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

const managerContextArtifact = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-context.md');
const plannerArtifact = latestSession.artifacts.find((artifact) => artifact.fileName === 'planner-plan.md');
const deliverableArtifact = latestSession.artifacts.find((artifact) => artifact.fileName === 'implementation-proposal.md');

assert.ok(managerContextArtifact);
assert.ok(plannerArtifact);
assert.ok(deliverableArtifact);
assert.match(
  fs.readFileSync(managerContextArtifact.path, 'utf8'),
  /Narrow the verification path before attempting workspace execution\./,
);
assert.match(
  fs.readFileSync(plannerArtifact.path, 'utf8'),
  /Narrow the verification path before requesting workspace execution again\./,
);
assert.match(
  fs.readFileSync(deliverableArtifact.path, 'utf8'),
  /## Prior Memory Signals/,
);
assert.match(
  fs.readFileSync(deliverableArtifact.path, 'utf8'),
  /Narrow the verification path before attempting workspace execution\./,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'memory-rerun',
      missionId: mission.id,
      initialApprovalId: firstRun.approvalId,
      rerunApprovalId: rerun.approvalId,
    },
    null,
    2,
  ),
);
