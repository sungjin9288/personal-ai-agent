import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-execution-flow-'));

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

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'execution-flow',
      missionId: mission.id,
      approvalId: preflight.approval.id,
      executionSessionId: executionSession.id,
      verificationStatus: executionSession.verification.status,
      changedFileCount: executionSession.changedFiles.length,
    },
    null,
    2,
  ),
);
