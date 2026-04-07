import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-attention-remediation-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const originalFetch = globalThis.fetch;
const originalEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION,
};

try {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.test/v1';
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
  process.env.ANTHROPIC_VERSION = '2023-06-01';

  const fetchState = {
    anthropicMode: 'fail',
  };

  globalThis.fetch = async (url) => {
    if (url === 'https://api.anthropic.test/v1/models') {
      if (fetchState.anthropicMode === 'success') {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              data: [{ id: 'claude-sonnet-4-6' }],
            };
          },
        };
      }

      return {
        ok: false,
        status: 503,
        async text() {
          return 'upstream unavailable';
        },
      };
    }

    throw new Error(`Unexpected provider attention remediation url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  const workspace = service.addWorkspace({
    name: 'provider-remediation-workspace',
    workspacePath,
  });

  await service.probeProvider('anthropic');

  const anthropicPending = service.getProviderAttentionInbox({
    providerId: 'anthropic',
  });

  assert.equal(anthropicPending.items.length, 1);

  fetchState.anthropicMode = 'success';

  const probeRemediation = await service.remediateProviderAttention(anthropicPending.items[0].actionId);

  assert.equal(probeRemediation.remediationKind, 'probe');
  assert.equal(probeRemediation.previousStatus, 'pending');
  assert.equal(probeRemediation.providerId, 'anthropic');
  assert.equal(probeRemediation.result.ok, true);
  assert.equal(probeRemediation.postAttention.status, 'recovered');
  assert.equal(probeRemediation.postAttention.recoveredCount, 1);

  const failedMission = service.createMission({
    workspaceId: workspace.id,
    mode: 'knowledge',
    deliverableType: 'checklist',
    title: 'Stub provider remediation mission',
    objective: 'Create one failed run and remediate it via the dedicated provider attention command.',
    constraints: ['force-rubric-fail'],
  });

  const failedRun = await service.runMission(failedMission.id, {
    provider: 'stub',
    providerSpecified: true,
  });

  assert.equal(failedRun.mission.status, 'failed');

  const stubPending = service.getProviderAttentionInbox({
    missionId: failedMission.id,
    providerId: 'stub',
    workspaceId: workspace.id,
  });

  assert.equal(stubPending.items.length, 1);

  store.updateMission(failedMission.id, (current) => ({
    ...current,
    constraints: [],
  }));

  const executionRemediation = runCli({
    rootDir: tempRoot,
    args: ['action', 'remediate-provider-attention', stubPending.items[0].actionId],
  });

  assert.equal(executionRemediation.remediationKind, 'mission-rerun');
  assert.equal(executionRemediation.previousStatus, 'pending');
  assert.equal(executionRemediation.providerId, 'stub');
  assert.equal(executionRemediation.missionId, failedMission.id);
  assert.equal(executionRemediation.result.missionStatus, 'completed');
  assert.equal(executionRemediation.result.provider, 'stub');
  assert.equal(executionRemediation.postAttention.status, 'recovered');
  assert.equal(executionRemediation.postAttention.pendingCount, 0);
  assert.equal(executionRemediation.postAttention.recoveredCount, 1);

  const recoveredAttention = runCli({
    rootDir: tempRoot,
    args: ['action', 'provider-attention', '--status', 'recovered', '--provider', 'stub', '--workspace', workspace.id],
  });

  assert.equal(recoveredAttention.items.length, 1);
  assert.equal(recoveredAttention.items[0].missionId, failedMission.id);

  const providerCheck = runCli({
    rootDir: tempRoot,
    args: ['provider', 'check', 'stub'],
  });

  assert.equal(providerCheck.attentionStatus, 'recovered');
  assert.equal(providerCheck.latestAttentionRecovery.providerId, 'stub');

  console.log(
    JSON.stringify(
      {
        anthropicProbeRemediation: probeRemediation.result.ok,
        mode: 'provider-attention-remediation',
        ok: true,
        stubExecutionRemediationStatus: executionRemediation.result.missionStatus,
      },
      null,
      2,
    ),
  );
} finally {
  globalThis.fetch = originalFetch;

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
