import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-retry-telemetry-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  LOCAL_PROVIDER_API_KEY: process.env.LOCAL_PROVIDER_API_KEY,
  LOCAL_PROVIDER_BASE_URL: process.env.LOCAL_PROVIDER_BASE_URL,
  LOCAL_PROVIDER_MODEL: process.env.LOCAL_PROVIDER_MODEL,
};

let modelRequestCount = 0;
let completionRequestCount = 0;

const successfulStageOutputs = [
  {
    artifactContent:
      '# Manager Context\n\n## Mission\n- title: Provider retry success mission\n- workspace: provider-retry-telemetry-workspace\n- mode: knowledge\n- deliverable: decision-memo\n\n## Objective\nValidate retry telemetry propagation.\n\n## Relevant Memory\n- no relevant memory found\n\n## Governance\n- approval likely: no\n- risk reason: none\n',
    summaryText: 'Manager context generated after retry.',
  },
  {
    adaptationNotes: [],
    artifactContent:
      '# Planner Plan\n\n## Mission\n- title: Provider retry success mission\n- workspace: provider-retry-telemetry-workspace\n- deliverable: decision-memo\n\n## Plan\n1. Draft the memo after retry recovery.\n\n## Adaptation Signals\n- No prior mission memory influenced this plan.\n\n## Verification Lens\n- preserve required sections exactly once\n',
    planSteps: ['Draft the memo after retry recovery.'],
    summaryText: 'Planner plan generated after retry.',
  },
  {
    adaptationNotes: [],
    artifactContent:
      '# Decision Memo\n\n## Context\nRetry telemetry context.\n\n## Options\n- Keep the recovery bounded.\n\n## Recommendation\nPersist attempt-level retry telemetry.\n\n## Why This Path\nIt makes provider retries auditable.\n\n## Next Action\nReview the retry summary.\n',
    nextAction: 'Review the retry summary.',
    summaryText: 'Decision memo generated after retry.',
  },
  {
    artifactContent:
      '# Reviewer Report\n\n## Verdict\n- verdict: pass\n\n## Checks\n- pass: content-sections - Required sections are present.\n\n## Findings\n- No findings.\n\n## Next Action\n- continue to completion or approval gate\n',
    checks: [
      {
        description: 'Required sections are present.',
        id: 'content-sections',
        passed: true,
      },
    ],
    findings: [],
    summaryText: 'Reviewer accepted the retried draft.',
    verdict: 'pass',
  },
];

const successfulStageUsage = [
  { input: 120, output: 80, total: 200 },
  { input: 140, output: 100, total: 240 },
  { input: 200, output: 160, total: 360 },
  { input: 90, output: 45, total: 135 },
];

try {
  process.env.LOCAL_PROVIDER_API_KEY = 'test-local-key';
  process.env.LOCAL_PROVIDER_BASE_URL = 'http://127.0.0.1:1234/v1';
  process.env.LOCAL_PROVIDER_MODEL = 'llama3.1-local';

  globalThis.fetch = async (url, init = {}) => {
    if (url === 'http://127.0.0.1:1234/v1/models') {
      modelRequestCount += 1;
      await sleep(5);

      if (modelRequestCount === 1) {
        return {
          ok: false,
          status: 503,
          async text() {
            return 'models upstream unavailable';
          },
        };
      }

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'llama3.1-local' }, { id: 'qwen3-local' }],
          };
        },
      };
    }

    if (url === 'http://127.0.0.1:1234/v1/chat/completions') {
      assert.equal(init.method, 'POST');
      completionRequestCount += 1;
      await sleep(5);

      const attemptIndex = completionRequestCount;
      const shouldFail = attemptIndex % 2 === 1;

      if (attemptIndex <= 8) {
        if (shouldFail) {
          return {
            ok: false,
            status: 503,
            async text() {
              return `stage-${Math.ceil(attemptIndex / 2)} upstream unavailable`;
            },
          };
        }

        const stageIndex = Math.floor((attemptIndex - 1) / 2);
        const usage = successfulStageUsage[stageIndex];
        const output = successfulStageOutputs[stageIndex];

        return {
          ok: true,
          status: 200,
          async json() {
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify(output),
                    role: 'assistant',
                  },
                },
              ],
              id: `chatcmpl_retry_success_${stageIndex + 1}`,
              usage: {
                completion_tokens: usage.output,
                prompt_tokens: usage.input,
                total_tokens: usage.total,
              },
            };
          },
        };
      }

      return {
        ok: false,
        status: 503,
        async text() {
          return `failed-manager-attempt-${attemptIndex - 8}`;
        },
      };
    }

    throw new Error(`Unexpected provider retry telemetry url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  const workspace = service.addWorkspace({
    name: 'provider-retry-telemetry-workspace',
    workspacePath,
  });

  const probeResult = await service.probeProvider('local');
  assert.equal(modelRequestCount, 2);
  assert.equal(probeResult.ok, true);
  assert.equal(probeResult.attemptCount, 2);
  assert.equal(probeResult.retryCount, 1);
  assert.equal(probeResult.attemptHistory.length, 2);
  assert.equal(probeResult.attemptHistory[0].ok, false);
  assert.equal(probeResult.attemptHistory[1].ok, true);

  const successMission = service.createMission({
    workspaceId: workspace.id,
    mode: 'knowledge',
    deliverableType: 'decision-memo',
    title: 'Provider retry success mission',
    objective: 'Validate successful retry telemetry propagation.',
    constraints: [],
  });

  const successRun = await service.runMission(successMission.id, {
    provider: 'local',
    providerSpecified: true,
  });
  assert.equal(successRun.mission.status, 'completed');

  const failureMission = service.createMission({
    workspaceId: workspace.id,
    mode: 'knowledge',
    deliverableType: 'decision-memo',
    title: 'Provider retry failure mission',
    objective: 'Validate failed retry telemetry propagation.',
    constraints: [],
  });

  const failureRun = await service.runMission(failureMission.id, {
    provider: 'local',
    providerSpecified: true,
  });
  assert.equal(failureRun.mission.status, 'failed');
  assert.equal(completionRequestCount, 10);

  const expectedExecutionAttemptCount = 10;
  const expectedExecutionRetryCount = 5;
  const expectedExecutionMultiAttemptCount = 5;
  const expectedExecutionRetrySucceededCount = 4;
  const expectedUsageInputTokensTotal = successfulStageUsage.reduce((sum, item) => sum + item.input, 0);
  const expectedUsageOutputTokensTotal = successfulStageUsage.reduce((sum, item) => sum + item.output, 0);
  const expectedUsageTotalTokensTotal = successfulStageUsage.reduce((sum, item) => sum + item.total, 0);

  const providerCheck = service.checkProvider('local');
  assert.equal(providerCheck.latestProbe.attemptCount, 2);
  assert.equal(providerCheck.latestProbe.retryCount, 1);
  assert.equal(providerCheck.latestProbe.attemptHistory.length, 2);
  assert.equal(providerCheck.latestExecution.status, 'failed');
  assert.equal(providerCheck.latestExecution.attemptCount, 2);
  assert.equal(providerCheck.latestExecution.retryCount, 1);
  assert.equal(providerCheck.latestExecution.attemptHistory.length, 2);
  assert.equal(providerCheck.latestExecution.failureKind, 'http-status');
  assert.equal(providerCheck.latestPendingAttention.retryCount, 1);
  assert.equal(providerCheck.latestPendingAttention.attemptHistoryCount, 2);

  const providerHistory = service.listProviderProbeHistory({ providerId: 'local' });
  assert.equal(providerHistory.summary.totalAttemptCount, 2);
  assert.equal(providerHistory.summary.totalRetryCount, 1);
  assert.equal(providerHistory.summary.multiAttemptCount, 1);
  assert.equal(providerHistory.summary.retrySucceededCount, 1);
  assert.equal(providerHistory.summary.maxAttemptCount, 2);
  assert.equal(providerHistory.summary.attemptHistoryEntryCountTotal, 2);

  const providerActivity = service.getProviderExecutionHistory({ providerId: 'local' });
  assert.equal(providerActivity.executions.length, 5);
  assert.equal(providerActivity.summary.totalAttemptCount, expectedExecutionAttemptCount);
  assert.equal(providerActivity.summary.totalRetryCount, expectedExecutionRetryCount);
  assert.equal(providerActivity.summary.multiAttemptCount, expectedExecutionMultiAttemptCount);
  assert.equal(providerActivity.summary.retrySucceededCount, expectedExecutionRetrySucceededCount);
  assert.equal(providerActivity.summary.maxAttemptCount, 2);
  assert.equal(providerActivity.summary.attemptHistoryEntryCountTotal, expectedExecutionAttemptCount);
  assert.equal(providerActivity.summary.usageInputTokensTotal, expectedUsageInputTokensTotal);
  assert.equal(providerActivity.summary.usageOutputTokensTotal, expectedUsageOutputTokensTotal);
  assert.equal(providerActivity.summary.usageTotalTokensTotal, expectedUsageTotalTokensTotal);

  const failedExecution = providerActivity.executions.at(-1);
  assert.equal(failedExecution.status, 'failed');
  assert.equal(failedExecution.attemptHistory[0].ok, false);
  assert.equal(failedExecution.attemptHistory[1].ok, false);

  const providerEvents = service.getProviderEventTimeline({ providerId: 'local' });
  assert.equal(providerEvents.summary.probeTotalAttemptCount, 2);
  assert.equal(providerEvents.summary.probeTotalRetryCount, 1);
  assert.equal(providerEvents.summary.executionTotalAttemptCount, expectedExecutionAttemptCount);
  assert.equal(providerEvents.summary.executionTotalRetryCount, expectedExecutionRetryCount);
  assert.equal(providerEvents.summary.executionRetrySucceededCount, expectedExecutionRetrySucceededCount);
  assert.equal(providerEvents.summary.executionAttemptHistoryEntryCountTotal, expectedExecutionAttemptCount);
  assert.equal(providerEvents.summary.probeAttemptHistoryEntryCountTotal, 2);

  const pendingAttention = service.getProviderAttentionInbox({ providerId: 'local' });
  assert.equal(pendingAttention.items.length, 1);
  assert.equal(pendingAttention.items[0].retryCount, 1);
  assert.equal(pendingAttention.items[0].attemptHistoryCount, 2);
  assert.equal(pendingAttention.summary.totalRetryCount, 1);
  assert.equal(pendingAttention.summary.totalAttemptCount, 2);

  const providerOverview = service.getProviderOverview();
  assert.equal(providerOverview.summary.executionTotalAttemptCount, expectedExecutionAttemptCount);
  assert.equal(providerOverview.summary.executionTotalRetryCount, expectedExecutionRetryCount);
  assert.equal(providerOverview.summary.executionRetrySucceededCount, expectedExecutionRetrySucceededCount);
  assert.equal(providerOverview.summary.probeTotalAttemptCount, 2);
  assert.equal(providerOverview.summary.probeTotalRetryCount, 1);
  assert.equal(providerOverview.summary.attentionTotalRetryCount, 1);
  assert.equal(providerOverview.summary.attentionTotalAttemptCount, 2);

  const successMissionSummary = service.showMission(successMission.id).summary;
  assert.equal(successMissionSummary.providerExecutionTotalAttemptCount, 8);
  assert.equal(successMissionSummary.providerExecutionTotalRetryCount, 4);
  assert.equal(successMissionSummary.providerExecutionMultiAttemptCount, 4);
  assert.equal(successMissionSummary.providerExecutionRetrySucceededCount, 4);
  assert.equal(successMissionSummary.providerExecutionMaxAttemptCount, 2);

  const failureMissionSummary = service.showMission(failureMission.id).summary;
  assert.equal(failureMissionSummary.providerExecutionTotalAttemptCount, 2);
  assert.equal(failureMissionSummary.providerExecutionTotalRetryCount, 1);
  assert.equal(failureMissionSummary.providerAttentionTotalRetryCount, 1);
  assert.equal(failureMissionSummary.providerAttentionTotalAttemptCount, 2);

  const workspaceOverview = service.getWorkspaceOverview(workspace.id);
  assert.equal(workspaceOverview.summary.providerExecutionTotalAttemptCount, expectedExecutionAttemptCount);
  assert.equal(workspaceOverview.summary.providerExecutionTotalRetryCount, expectedExecutionRetryCount);
  assert.equal(workspaceOverview.summary.providerAttentionTotalRetryCount, 1);
  assert.equal(workspaceOverview.summary.providerAttentionTotalAttemptCount, 2);

  const globalOverview = service.getGlobalOverview();
  assert.equal(globalOverview.summary.providerProbeTotalAttemptCount, 2);
  assert.equal(globalOverview.summary.providerProbeTotalRetryCount, 1);
  assert.equal(globalOverview.summary.providerExecutionTotalAttemptCount, expectedExecutionAttemptCount);
  assert.equal(globalOverview.summary.providerExecutionTotalRetryCount, expectedExecutionRetryCount);
  assert.equal(globalOverview.summary.providerAttentionTotalRetryCount, 1);
  assert.equal(globalOverview.summary.providerAttentionTotalAttemptCount, 2);
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

console.log(
  JSON.stringify(
    {
      mode: 'provider-retry-telemetry',
      ok: true,
      providerId: 'local',
    },
    null,
    2,
  ),
);
