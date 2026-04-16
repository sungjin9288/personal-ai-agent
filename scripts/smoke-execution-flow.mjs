import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { buildFallbackExecutionManifest, normalizeExecutionManifest } from '../src/core/execution-utils.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-execution-flow-'));
const siblingWorkspaceDir = fs.mkdtempSync(path.join(path.dirname(repoDir), 'personal-ai-agent-external-workspace-'));

fs.mkdirSync(path.join(siblingWorkspaceDir, 'src'), { recursive: true });
fs.writeFileSync(path.join(siblingWorkspaceDir, 'src', 'cli.mjs'), "console.log('external workspace smoke');\n", 'utf8');
execFileSync('git', ['init'], { cwd: siblingWorkspaceDir, stdio: 'ignore' });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'execution-flow-workspace'],
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
    'Execution Flow Smoke',
    '--objective',
    'Verify the one-time approval lease and execution session lifecycle.',
  ],
});

const siblingWorkspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', siblingWorkspaceDir, '--name', 'external-execution-flow-workspace'],
});

const siblingMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    siblingWorkspace.id,
    '--mode',
    'engineering',
    '--title',
    'External Execution Flow Smoke',
    '--objective',
    'Verify bounded execution lifecycle for a sibling workspace under the trusted root.',
  ],
});

const normalizedProviderManifest = normalizeExecutionManifest(
  {
    source: 'provider',
    steps: [
      {
        kind: 'inspect',
        title: '워크트리 상태 확인',
        command: 'git status --short',
      },
      {
        kind: 'inspect',
        title: 'Suspicious unicode option token',
        command: 'ls -ლა',
      },
      {
        kind: 'artifact',
        title: '제안서 기록',
        command: 'write execution proposal artifact',
      },
      {
        kind: 'test',
        title: 'Placeholder live smoke',
        command: 'TBD_AFTER_INSPECTION (e.g., npm run smoke:openai:live)',
      },
      {
        kind: 'test',
        title: 'Angle bracket placeholder smoke',
        command: '<runner> <live-validate-entrypoint> --provider stub --fixture <fixture-path> --max-steps 2',
      },
      {
        kind: 'edit',
        title: 'Placeholder edit plan',
        filePath: 'scripts/openai_live_validation.{ext}',
        operation: 'write',
        content: 'PLACEHOLDER: To be authored after inspection to match repo language and existing provider/loop APIs.',
      },
    ],
    summary: 'Provider supplied manifest without explicit verification steps.',
  },
  { workspacePath: repoDir },
);

assert.ok(normalizedProviderManifest);
assert.equal(
  normalizedProviderManifest.steps.some((step) => /TBD_AFTER_INSPECTION/.test(step.command || '')),
  false,
);
assert.equal(
  normalizedProviderManifest.steps.some((step) => /ls -ლა/.test(step.command || '')),
  false,
);
assert.equal(
  normalizedProviderManifest.steps.some((step) => /<live-validate-entrypoint>/.test(step.command || '')),
  false,
);
assert.equal(
  normalizedProviderManifest.steps.some((step) => /openai_live_validation\.\{ext\}/.test(step.filePath || '')),
  false,
);
assert.equal(
  normalizedProviderManifest.steps.some(
    (step) => ['test', 'build'].includes(step.kind) && step.command === 'node --check src/cli.mjs',
  ),
  true,
);

const fallbackManifest = buildFallbackExecutionManifest({
  mission: {
    title: 'Hint filtering smoke',
  },
  plannerSteps: [],
  proposalContent: [
    '`npm run smoke:openai`',
    '`python -m tests.smoke_openai`',
    '`git status --short`',
  ].join('\n'),
  workspace,
});

assert.equal(
  fallbackManifest.steps.some((step) => step.command === 'npm run smoke:openai'),
  false,
);
assert.equal(
  fallbackManifest.steps.some((step) => step.command === 'python -m tests.smoke_openai'),
  false,
);
assert.equal(
  fallbackManifest.steps.some((step) => step.command === 'git status --short'),
  true,
);
assert.equal(
  fallbackManifest.steps.some(
    (step) => ['test', 'build'].includes(step.kind) && step.command === 'node --check src/cli.mjs',
  ),
  true,
);

const siblingFallbackManifest = buildFallbackExecutionManifest({
  mission: {
    title: 'Sibling workspace hint filtering smoke',
  },
  plannerSteps: [],
  proposalContent: '`git status --short`',
  workspace: siblingWorkspace,
});

assert.equal(
  siblingFallbackManifest.steps.some((step) => step.command === 'git status --short'),
  true,
);
assert.equal(
  siblingFallbackManifest.steps.some(
    (step) => ['test', 'build'].includes(step.kind) && step.command === 'node --check src/cli.mjs',
  ),
  true,
);

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(runResult.status, 'reviewed');
assert.equal(runResult.approvalId, null);

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

const preflight = service.preflightExecution(mission.id, { requestApproval: true });
assert.equal(preflight.execution.supported, true);
assert.equal(preflight.execution.eligibility, 'pending-approval');
assert.equal(preflight.approval.kind, 'execution_lease');
assert.equal(preflight.approval.status, 'pending');

const approvalResolution = service.resolveApproval(preflight.approval.id, {
  decision: 'approve',
  reason: 'Execution flow smoke approves one bounded execution session.',
});

assert.equal(approvalResolution.approval.kind, 'execution_lease');
assert.equal(approvalResolution.approval.status, 'approved');
assert.equal(approvalResolution.lease.status, 'active');
assert.equal(approvalResolution.mission.status, 'execution_ready');

const startResult = service.startExecution(mission.id);
assert.equal(startResult.execution.status, 'running');

let finalStatus = service.getExecutionStatus(mission.id);
for (let index = 0; index < 40; index += 1) {
  if (finalStatus.execution.latestExecutionSession?.status !== 'running') {
    break;
  }
  await delay(200);
  finalStatus = service.getExecutionStatus(mission.id);
}

const executionSession = finalStatus.execution.latestExecutionSession;
assert.ok(executionSession);
assert.equal(executionSession.status, 'completed');
assert.equal(executionSession.verification.status, 'passed');
assert.equal(finalStatus.execution.latestLease?.status, 'used');
assert.equal(finalStatus.mission.status, 'completed');
assert.equal(
  store
    .listArtifactsBySession(executionSession.reviewSessionId)
    .some((artifact) => artifact.kind === 'execution-manifest' && artifact.fileName === 'execution-manifest.json'),
  true,
);

const executionLogs = service.getExecutionLogs(mission.id, { executionId: executionSession.id });
assert.equal(Array.isArray(executionLogs.lines), true);
assert.match(executionLogs.lines.join('\n'), /execution completed/);

const siblingRunResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', siblingMission.id, '--provider', 'stub'],
});

assert.equal(siblingRunResult.status, 'reviewed');

const siblingPreflight = service.preflightExecution(siblingMission.id, { requestApproval: true });
assert.equal(siblingPreflight.execution.supported, true);
assert.equal(siblingPreflight.execution.eligibility, 'pending-approval');
assert.equal(siblingPreflight.approval.kind, 'execution_lease');

service.resolveApproval(siblingPreflight.approval.id, {
  decision: 'approve',
  reason: 'Sibling workspace execution flow smoke approves one bounded execution session.',
});

const siblingStartResult = service.startExecution(siblingMission.id);
assert.equal(siblingStartResult.execution.status, 'running');

let siblingFinalStatus = service.getExecutionStatus(siblingMission.id);
for (let index = 0; index < 40; index += 1) {
  if (siblingFinalStatus.execution.latestExecutionSession?.status !== 'running') {
    break;
  }
  await delay(200);
  siblingFinalStatus = service.getExecutionStatus(siblingMission.id);
}

const siblingExecutionSession = siblingFinalStatus.execution.latestExecutionSession;
assert.ok(siblingExecutionSession);
assert.equal(siblingExecutionSession.status, 'completed');
assert.equal(siblingExecutionSession.verification.status, 'passed');
assert.equal(siblingFinalStatus.mission.status, 'completed');

fs.rmSync(siblingWorkspaceDir, { recursive: true, force: true });

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'execution-flow',
      missionId: mission.id,
      approvalId: preflight.approval.id,
      executionSessionId: executionSession.id,
      siblingExecutionSessionId: siblingExecutionSession.id,
      verificationStatus: executionSession.verification.status,
      changedFileCount: executionSession.changedFiles.length,
    },
    null,
    2,
  ),
);
