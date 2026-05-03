import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHermesProvider } from '../src/providers/hermes-provider.mjs';
import { formatHermesToolCall, parseHermesToolCalls } from '../src/providers/hermes-tool-call-parser.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-hermes-provider-'));
const workspacePath = path.join(tempRoot, 'workspace');
const cliPath = path.join(repoRoot, 'src', 'cli.mjs');

fs.mkdirSync(workspacePath, { recursive: true });

function runCli({ args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      HERMES_PROVIDER_MODEL: env.HERMES_PROVIDER_MODEL || '',
      PERSONAL_AI_AGENT_ROOT: tempRoot,
    },
  });

  return {
    status: result.status,
    stderr: String(result.stderr || ''),
    stdout: String(result.stdout || ''),
  };
}

const closedToolCall = formatHermesToolCall({
  arguments: { command: 'npm test', cwd: '.' },
  name: 'terminal.run',
});
const parsedClosedToolCall = parseHermesToolCalls(`before ${closedToolCall} after`);
assert.equal(parsedClosedToolCall.toolCalls.length, 1);
assert.equal(parsedClosedToolCall.toolCalls[0].name, 'terminal.run');
assert.deepEqual(parsedClosedToolCall.toolCalls[0].arguments, { command: 'npm test', cwd: '.' });
assert.equal(parsedClosedToolCall.toolCalls[0].closed, true);
assert.equal(parsedClosedToolCall.contentWithoutToolCalls, 'before  after');

const parsedUnclosedToolCall = parseHermesToolCalls('<tool_call>{"name":"file.read","arguments":{"path":"README.md"}}');
assert.equal(parsedUnclosedToolCall.toolCalls.length, 1);
assert.equal(parsedUnclosedToolCall.toolCalls[0].closed, false);
assert.equal(parsedUnclosedToolCall.malformedToolCallCount, 0);

const parsedMalformedToolCall = parseHermesToolCalls('<tool_call>{"name":</tool_call>');
assert.equal(parsedMalformedToolCall.toolCalls.length, 0);
assert.equal(parsedMalformedToolCall.malformedToolCallCount, 1);

const workspaceCreate = runCli({
  args: ['workspace', 'add', workspacePath, '--name', 'hermes-provider-workspace'],
});
assert.equal(workspaceCreate.status, 0);
const workspace = JSON.parse(workspaceCreate.stdout);

const missionCreate = runCli({
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
    'Hermes provider env validation',
    '--objective',
    'Verify Hermes-compatible provider wiring and tool-call parsing.',
  ],
});
assert.equal(missionCreate.status, 0);
const mission = JSON.parse(missionCreate.stdout);

const missingModelRun = runCli({
  args: ['mission', 'run', mission.id, '--provider', 'hermes'],
  env: {
    HERMES_PROVIDER_MODEL: '',
  },
});

assert.equal(missingModelRun.status, 0);
assert.equal(missingModelRun.stderr, '');
const missingModelResult = JSON.parse(missingModelRun.stdout);
assert.equal(missingModelResult.missionId, mission.id);
assert.equal(missingModelResult.provider, 'hermes');
assert.equal(missingModelResult.status, 'failed');
assert.equal(missingModelResult.artifactPath, null);
assert.equal(missingModelResult.reviewerVerdict, null);

const failedActivityRun = runCli({
  args: ['provider', 'activity', '--provider', 'hermes', '--status', 'failed'],
});

assert.equal(failedActivityRun.status, 0);
const failedActivity = JSON.parse(failedActivityRun.stdout);
assert.equal(failedActivity.executions.length, 1);
assert.equal(failedActivity.executions[0].providerId, 'hermes');
assert.equal(failedActivity.executions[0].role, 'manager');
assert.equal(failedActivity.executions[0].status, 'failed');
assert.equal(failedActivity.executions[0].failureKind, 'config');
assert.equal(failedActivity.executions[0].recoverable, false);
assert.equal(failedActivity.executions[0].timedOut, false);

let capturedRunRequest = null;
let capturedProbeRequest = null;
const provider = createHermesProvider({
  rootDir: repoRoot,
  env: {
    HERMES_PROVIDER_API_KEY: 'hermes-test-key',
    HERMES_PROVIDER_BASE_URL: 'http://127.0.0.1:8088/v1',
    HERMES_PROVIDER_MAX_TOKENS: '1024',
    HERMES_PROVIDER_MODEL: 'nous-hermes-4-test',
  },
  fetchImpl: async (url, init = {}) => {
    if (init.method === 'GET') {
      capturedProbeRequest = {
        headers: init.headers,
        method: init.method,
        url,
      };
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'nous-hermes-4-test' }, { id: 'other-model' }],
          };
        },
      };
    }

    capturedRunRequest = {
      body: JSON.parse(init.body),
      headers: init.headers,
      method: init.method,
      url,
    };

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: [
                  formatHermesToolCall({
                    arguments: { path: 'docs/reference-repos.md' },
                    name: 'file.read',
                  }),
                  JSON.stringify({
                    artifactContent:
                      '# Manager Context\n\n## Mission\n- title: Hermes provider smoke\n\n## Objective\nValidate the Hermes adapter.\n\n## Relevant Memory\n- no relevant memory found\n\n## Governance\n- approval likely: no\n- risk reason: none\n',
                    summaryText: 'Manager context generated by mocked Hermes-compatible provider.',
                  }),
                ].join('\n'),
                role: 'assistant',
              },
            },
          ],
          id: 'chatcmpl_hermes_test',
          usage: {
            completion_tokens: 25,
            prompt_tokens: 50,
            total_tokens: 75,
          },
        };
      },
    };
  },
});

const providerInput = {
  role: 'manager',
  mission: {
    constraints: [],
    deliverableType: 'decision-memo',
    id: 'mission_test',
    mode: 'knowledge',
    objective: 'Validate the Hermes adapter.',
    title: 'Hermes provider smoke',
  },
  workspace: {
    id: 'workspace_test',
    name: 'Smoke Workspace',
    path: workspacePath,
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
  memoryEntries: [],
  previousOutputs: {},
};

const probeOutput = await provider.probe();
const rawOutput = await provider.run(providerInput);
const normalizedOutput = provider.normalizeOutput(rawOutput, providerInput);

assert.equal(capturedProbeRequest.method, 'GET');
assert.equal(capturedProbeRequest.url, 'http://127.0.0.1:8088/v1/models');
assert.equal(capturedProbeRequest.headers.Authorization, 'Bearer hermes-test-key');
assert.equal(probeOutput.ok, true);
assert.equal(probeOutput.modelAvailable, true);
assert.equal(probeOutput.transport, 'openai-compatible-hermes-chat-completions');

assert.equal(capturedRunRequest.method, 'POST');
assert.equal(capturedRunRequest.url, 'http://127.0.0.1:8088/v1/chat/completions');
assert.equal(capturedRunRequest.body.model, 'nous-hermes-4-test');
assert.equal(capturedRunRequest.body.max_tokens, 1024);
assert.equal(capturedRunRequest.body.temperature, 0);
assert.equal(capturedRunRequest.body.messages[0].role, 'system');
assert.match(capturedRunRequest.body.messages[0].content, /Hermes-compatible agent profile/);
assert.match(capturedRunRequest.body.messages[0].content, /<tool_call>/);
assert.equal(capturedRunRequest.body.messages[1].role, 'user');
assert.match(capturedRunRequest.body.messages[1].content, /Structured Output Contract/);
assert.equal(capturedRunRequest.headers.Authorization, 'Bearer hermes-test-key');
assert.equal(rawOutput.hermesToolCallCount, 1);
assert.equal(rawOutput.hermesMalformedToolCallCount, 0);
assert.equal(rawOutput.usageInputTokens, 50);
assert.equal(rawOutput.usageOutputTokens, 25);
assert.equal(rawOutput.usageTotalTokens, 75);
assert.equal(normalizedOutput.type, 'manager');
assert.equal(normalizedOutput.artifactFileName, 'manager-context.md');
assert.equal(normalizedOutput.artifactTitle, 'Manager Context');
assert.equal(normalizedOutput.summaryText, 'Manager context generated by mocked Hermes-compatible provider.');
assert.match(normalizedOutput.artifactContent, /# Manager Context/);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'hermes-provider',
      parsedToolCalls: parsedClosedToolCall.toolCalls.length + parsedUnclosedToolCall.toolCalls.length,
      requestModel: capturedRunRequest.body.model,
      validatedMissingModelPath: true,
    },
    null,
    2,
  ),
);
