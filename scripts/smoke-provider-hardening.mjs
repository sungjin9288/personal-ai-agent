import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { createOpenAIProvider } from '../src/providers/openai-provider.mjs';
import { extractProviderFailure } from '../src/providers/provider-runtime-utils.mjs';

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-hardening-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

function buildKnowledgeInput() {
  return {
    memoryEntries: [],
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: 'mission_test',
      mode: 'knowledge',
      objective: 'Validate provider hardening behavior.',
      title: 'Provider hardening smoke',
    },
    pack: {
      artifactFileName: 'decision-memo.md',
      artifactTitle: 'Decision Memo',
      plannerGuidance: ['Keep the scope bounded.'],
      requiredSections: ['Context', 'Options', 'Recommendation', 'Why This Path', 'Next Action'],
      reviewRules: [],
      riskProfile: {
        actionKind: 'document-draft',
        reason: 'none',
        requiresApproval: false,
        title: 'No approval required',
      },
    },
    previousOutputs: {},
    role: 'manager',
    workspace: {
      id: 'workspace_test',
      name: 'Provider Hardening Workspace',
      path: workspacePath,
    },
  };
}

function buildOpenAIProvider(fetchImpl) {
  return createOpenAIProvider({
    env: {
      OPENAI_API_KEY: 'test-openai-key',
      OPENAI_BASE_URL: 'https://api.openai.test/v1',
      OPENAI_MODEL: 'gpt-5.2',
    },
    fetchImpl,
    rootDir: repoRoot,
  });
}

function buildResponse({ payload, status = 200, ok = true, text = '' }) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
    async text() {
      return text;
    },
  };
}

const managerInput = buildKnowledgeInput();

const proseWrappedProvider = buildOpenAIProvider(async () =>
  buildResponse({
    payload: {
      id: 'resp_prose_wrapped',
      output_text: `Here is the requested JSON payload:

\`\`\`json
${JSON.stringify({
  artifactContent:
    '# Manager Context\n\n## Mission\n- title: Provider hardening smoke\n\n## Objective\nValidate provider hardening behavior.\n\n## Relevant Memory\n- no relevant memory found\n\n## Governance\n- approval likely: no\n- risk reason: none\n',
  summaryText: 'Manager context generated from prose-wrapped JSON.',
})}
\`\`\`
`,
    },
  }),
);

const proseWrappedRun = await proseWrappedProvider.run(managerInput);
const proseWrappedOutput = proseWrappedProvider.normalizeOutput(proseWrappedRun, managerInput);
assert.equal(proseWrappedRun.attemptCount, 1);
assert.equal(proseWrappedRun.providerResponseId, 'resp_prose_wrapped');
assert.equal(proseWrappedOutput.summaryText, 'Manager context generated from prose-wrapped JSON.');

const emptyOutputProvider = buildOpenAIProvider(async () =>
  buildResponse({
    payload: {
      id: 'resp_empty_output',
      output_text: '',
    },
  }),
);

await assert.rejects(
  () => emptyOutputProvider.run(managerInput),
  (error) => {
    const failure = extractProviderFailure(error);
    assert.equal(failure.failureKind, 'empty-output');
    assert.equal(failure.recoverable, false);
    assert.equal(failure.providerResponseId, 'resp_empty_output');
    return true;
  },
);

const proseOnlyProvider = buildOpenAIProvider(async () =>
  buildResponse({
    payload: {
      id: 'resp_non_json',
      output_text: 'I cannot comply with the JSON contract.',
    },
  }),
);

await assert.rejects(
  () => proseOnlyProvider.run(managerInput),
  (error) => {
    const failure = extractProviderFailure(error);
    assert.equal(failure.failureKind, 'non-json-output');
    assert.equal(failure.recoverable, false);
    assert.equal(failure.providerResponseId, 'resp_non_json');
    return true;
  },
);

const schemaInvalidProvider = buildOpenAIProvider(async () =>
  buildResponse({
    payload: {
      id: 'resp_schema_invalid',
      output_text: JSON.stringify({
        summaryText: 'Artifact content is missing on purpose.',
      }),
    },
  }),
);

const schemaInvalidRun = await schemaInvalidProvider.run(managerInput);
await assert.rejects(
  async () => schemaInvalidProvider.normalizeOutput(schemaInvalidRun, managerInput),
  (error) => {
    const failure = extractProviderFailure(error);
    assert.equal(failure.failureKind, 'schema-invalid');
    assert.equal(failure.recoverable, false);
    return true;
  },
);

let retryProbeAttempts = 0;
const retrySuccessProbeProvider = buildOpenAIProvider(async () => {
  retryProbeAttempts += 1;
  if (retryProbeAttempts === 1) {
    return buildResponse({
      ok: false,
      payload: {},
      status: 503,
      text: 'upstream unavailable',
    });
  }

  return buildResponse({
    payload: {
      data: [{ id: 'gpt-5.2' }, { id: 'gpt-5.1' }],
    },
  });
});

const retrySuccessProbe = await retrySuccessProbeProvider.probe();
assert.equal(retrySuccessProbe.attemptCount, 2);
assert.equal(retryProbeAttempts, 2);
assert.equal(retrySuccessProbe.modelAvailable, true);

let noRetryAttempts = 0;
const noRetryProbeProvider = buildOpenAIProvider(async () => {
  noRetryAttempts += 1;
  return buildResponse({
    ok: false,
    payload: {},
    status: 400,
    text: 'bad request',
  });
});

await assert.rejects(
  () => noRetryProbeProvider.probe(),
  (error) => {
    const failure = extractProviderFailure(error);
    assert.equal(failure.failureKind, 'http-status');
    assert.equal(failure.httpStatus, 400);
    assert.equal(failure.recoverable, false);
    assert.equal(failure.attemptCount, 1);
    assert.equal(noRetryAttempts, 1);
    return true;
  },
);

let timeoutAttempts = 0;
const timeoutProbeProvider = buildOpenAIProvider(async () => {
  timeoutAttempts += 1;
  const error = new Error('request timed out');
  error.name = 'AbortError';
  throw error;
});

await assert.rejects(
  () => timeoutProbeProvider.probe(),
  (error) => {
    const failure = extractProviderFailure(error);
    assert.equal(failure.failureKind, 'timeout');
    assert.equal(failure.timedOut, true);
    assert.equal(failure.recoverable, true);
    assert.equal(failure.attemptCount, 2);
    assert.equal(timeoutAttempts, 2);
    return true;
  },
);

const originalFetch = globalThis.fetch;
const originalEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
};

let serviceRunAttempts = 0;

try {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.OPENAI_BASE_URL = 'https://api.openai.test/v1';
  process.env.OPENAI_MODEL = 'gpt-5.2';

  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.test/v1/responses');
    assert.equal(init?.method, 'POST');
    serviceRunAttempts += 1;

    const outputs = [
      {
        artifactContent:
          '# Manager Context\n\n## Mission\n- title: OpenAI execution failure mission\n\n## Objective\nPersist failure metadata.\n\n## Relevant Memory\n- no relevant memory found\n\n## Governance\n- approval likely: no\n- risk reason: none\n',
        summaryText: 'Manager context completed.',
      },
      {
        adaptationNotes: [],
        artifactContent:
          '# Planner Plan\n\n## Mission\n- title: OpenAI execution failure mission\n- workspace: provider-hardening-workspace\n- deliverable: decision-memo\n\n## Plan\n1. Draft the decision memo.\n\n## Adaptation Signals\n- No prior mission memory influenced this plan.\n\n## Verification Lens\n- preserve required sections exactly once\n',
        planSteps: ['Draft the decision memo.'],
        summaryText: 'Planner plan completed.',
      },
      {
        adaptationNotes: [],
        artifactContent:
          '# Decision Memo\n\n## Context\nExecution failure metadata should persist.\n\n## Options\n- Keep the draft path bounded.\n\n## Recommendation\nInspect provider failure metadata.\n\n## Why This Path\nIt validates failure envelope propagation.\n\n## Next Action\nShare the memo with the owner.\n',
        nextAction: 'Share the memo with the owner.',
        summaryText: 'Executor draft completed.',
      },
      'This reviewer output is prose only and should fail JSON parsing.',
    ];

    const payload =
      serviceRunAttempts === 4
        ? outputs[3]
        : `Wrapped response:\n\n\`\`\`json\n${JSON.stringify(outputs[serviceRunAttempts - 1])}\n\`\`\``;

    return buildResponse({
      payload: {
        id: `resp_service_${serviceRunAttempts}`,
        output_text: payload,
      },
    });
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ rootDir: tempRoot, store });

  const workspace = service.addWorkspace({
    name: 'provider-hardening-workspace',
    workspacePath,
  });

  const mission = service.createMission({
    constraints: [],
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Persist provider failure metadata across read models.',
    title: 'OpenAI execution failure mission',
    workspaceId: workspace.id,
  });

  const failedRun = await service.runMission(mission.id, {
    provider: 'openai',
    providerSpecified: true,
  });

  assert.equal(failedRun.mission.status, 'failed');
  assert.equal(serviceRunAttempts, 4);

  const attentionInbox = service.getProviderAttentionInbox({ missionId: mission.id, providerId: 'openai' });
  assert.equal(attentionInbox.items.length, 1);
  assert.equal(attentionInbox.items[0].failureKind, 'non-json-output');
  assert.equal(attentionInbox.items[0].recoverable, false);
  assert.equal(attentionInbox.items[0].timedOut, false);
  assert.equal(attentionInbox.items[0].attemptCount, 1);
  assert.equal(attentionInbox.items[0].providerResponseId, 'resp_service_4');

  const providerCheck = service.checkProvider('openai');
  assert.equal(providerCheck.latestExecution.failureKind, 'non-json-output');
  assert.equal(providerCheck.pendingAttentionNeedsReminder, false);
  assert.equal(providerCheck.latestPendingAttention.failureKind, 'non-json-output');

  const providerActivity = service.getProviderExecutionHistory({ providerId: 'openai', status: 'failed' });
  assert.equal(providerActivity.summary.failureKindCounts['non-json-output'], 1);
  assert.equal(providerActivity.summary.retryableFailureCount, 0);
  assert.equal(providerActivity.summary.timedOutFailureCount, 0);
  assert.equal(providerActivity.executions[0].failureKind, 'non-json-output');
  assert.equal(providerActivity.executions[0].providerResponseId, 'resp_service_4');

  const providerEvents = service.getProviderEventTimeline({
    family: 'execution',
    providerId: 'openai',
    status: 'failed',
  });
  assert.equal(providerEvents.summary.executionFailureKindCounts['non-json-output'], 1);
  assert.equal(providerEvents.timeline[0].failureKind, 'non-json-output');
  assert.equal(providerEvents.timeline[0].providerResponseId, 'resp_service_4');

  const missionShow = service.showMission(mission.id);
  assert.equal(missionShow.summary.providerExecutionFailureKindCounts['non-json-output'], 1);
  assert.equal(missionShow.summary.providerExecutionRetryableFailureCount, 0);
  assert.equal(missionShow.summary.providerExecutionTimedOutFailureCount, 0);

  const workspaceOverview = service.getWorkspaceOverview(workspace.id);
  assert.equal(workspaceOverview.summary.providerExecutionFailureKindCounts['non-json-output'], 1);
  assert.equal(workspaceOverview.summary.providerExecutionRetryableFailureCount, 0);
  assert.equal(workspaceOverview.summary.providerExecutionTimedOutFailureCount, 0);

  const providerOverview = service.getProviderOverview();
  assert.equal(providerOverview.summary.executionFailureKindCounts['non-json-output'], 1);
  assert.equal(providerOverview.summary.executionRetryableFailureCount, 0);
  assert.equal(providerOverview.summary.executionTimedOutFailureCount, 0);

  const globalOverview = service.getGlobalOverview();
  assert.equal(globalOverview.summary.providerExecutionFailureKindCounts['non-json-output'], 1);
  assert.equal(globalOverview.summary.providerExecutionRetryableFailureCount, 0);
  assert.equal(globalOverview.summary.providerExecutionTimedOutFailureCount, 0);
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
      mode: 'provider-hardening',
      ok: true,
      validatedCases: [
        'prose-wrapped-json',
        'empty-output',
        'non-json-output',
        'schema-invalid',
        'retry-success-503',
        'no-retry-400',
        'timeout-retry-exhausted',
        'execution-failure-persistence',
      ],
    },
    null,
    2,
  ),
);
