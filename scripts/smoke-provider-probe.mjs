import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProviderRegistry } from '../src/providers/index.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'src', 'cli.mjs');

function runCli({ args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    status: result.status,
    stderr: String(result.stderr || ''),
    stdout: String(result.stdout || ''),
  };
}

const missingOpenAIProbeResult = runCli({
  args: ['provider', 'probe', 'openai'],
  env: {
    OPENAI_API_KEY: '',
  },
});

assert.equal(missingOpenAIProbeResult.status, 0);
const missingOpenAIProbe = JSON.parse(missingOpenAIProbeResult.stdout);
assert.equal(missingOpenAIProbe.id, 'openai');
assert.equal(missingOpenAIProbe.ok, false);
assert.equal(missingOpenAIProbe.attempted, false);
assert.match(missingOpenAIProbe.reason, /Missing required env: OPENAI_API_KEY/);

const stubProbeResult = runCli({
  args: ['provider', 'probe', 'stub'],
});

assert.equal(stubProbeResult.status, 0);
const stubProbe = JSON.parse(stubProbeResult.stdout);
assert.equal(stubProbe.id, 'stub');
assert.equal(stubProbe.ok, true);
assert.equal(stubProbe.attempted, true);
assert.equal(stubProbe.transport, 'deterministic-local');

const capturedRequests = [];
const registry = createProviderRegistry({
  rootDir: repoRoot,
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_BASE_URL: 'https://api.openai.test/v1',
    OPENAI_MODEL: 'gpt-5.2',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.test/v1',
    ANTHROPIC_MODEL: 'claude-sonnet-4-6',
    ANTHROPIC_VERSION: '2023-06-01',
    LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:1234/v1',
    LOCAL_PROVIDER_MODEL: 'llama3.1-local',
    LOCAL_PROVIDER_API_KEY: 'test-local-key',
    HERMES_PROVIDER_API_KEY: 'test-hermes-key',
    HERMES_PROVIDER_BASE_URL: 'http://127.0.0.1:8088/v1',
    HERMES_PROVIDER_MODEL: 'nous-hermes-4-test',
  },
  fetchImpl: async (url, init) => {
    capturedRequests.push({
      headers: init?.headers || {},
      method: init?.method || 'GET',
      url,
    });

    if (url === 'https://api.openai.test/v1/models') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'gpt-5.2' }, { id: 'gpt-5.4-mini' }],
          };
        },
      };
    }

    if (url === 'https://api.anthropic.test/v1/models') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'claude-sonnet-4-6' }, { id: 'claude-opus-4-1-20250805' }],
          };
        },
      };
    }

    if (url === 'http://127.0.0.1:1234/v1/models') {
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

    if (url === 'http://127.0.0.1:8088/v1/models') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'nous-hermes-4-test' }, { id: 'hermes-reasoning-test' }],
          };
        },
      };
    }

    throw new Error(`Unexpected probe url: ${url}`);
  },
});

const openAIProbe = await registry.probeProvider('openai');
const anthropicProbe = await registry.probeProvider('anthropic');
const localProbe = await registry.probeProvider('local');
const hermesProbe = await registry.probeProvider('hermes');

assert.equal(openAIProbe.ok, true);
assert.equal(openAIProbe.attempted, true);
assert.equal(openAIProbe.modelAvailable, true);
assert.equal(openAIProbe.modelCount, 2);
assert.equal(openAIProbe.endpoint, 'https://api.openai.test/v1/models');

assert.equal(anthropicProbe.ok, true);
assert.equal(anthropicProbe.attempted, true);
assert.equal(anthropicProbe.modelAvailable, true);
assert.equal(anthropicProbe.modelCount, 2);
assert.equal(anthropicProbe.endpoint, 'https://api.anthropic.test/v1/models');

assert.equal(localProbe.ok, true);
assert.equal(localProbe.attempted, true);
assert.equal(localProbe.modelAvailable, true);
assert.equal(localProbe.modelCount, 2);
assert.equal(localProbe.endpoint, 'http://127.0.0.1:1234/v1/models');

assert.equal(hermesProbe.ok, true);
assert.equal(hermesProbe.attempted, true);
assert.equal(hermesProbe.modelAvailable, true);
assert.equal(hermesProbe.modelCount, 2);
assert.equal(hermesProbe.endpoint, 'http://127.0.0.1:8088/v1/models');

const openAIRequest = capturedRequests.find((request) => request.url === 'https://api.openai.test/v1/models');
const anthropicRequest = capturedRequests.find((request) => request.url === 'https://api.anthropic.test/v1/models');
const localRequest = capturedRequests.find((request) => request.url === 'http://127.0.0.1:1234/v1/models');
const hermesRequest = capturedRequests.find((request) => request.url === 'http://127.0.0.1:8088/v1/models');

assert.equal(openAIRequest.method, 'GET');
assert.equal(openAIRequest.headers.Authorization, 'Bearer test-openai-key');
assert.equal(anthropicRequest.method, 'GET');
assert.equal(anthropicRequest.headers['x-api-key'], 'test-anthropic-key');
assert.equal(anthropicRequest.headers['anthropic-version'], '2023-06-01');
assert.equal(localRequest.method, 'GET');
assert.equal(localRequest.headers.Authorization, 'Bearer test-local-key');
assert.equal(hermesRequest.method, 'GET');
assert.equal(hermesRequest.headers.Authorization, 'Bearer test-hermes-key');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-probe',
      probedProviders: ['stub', 'openai', 'anthropic', 'local', 'hermes'],
    },
    null,
    2,
  ),
);
