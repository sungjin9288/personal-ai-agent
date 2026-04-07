import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-history-'));

function runCli({ args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PERSONAL_AI_AGENT_ROOT: tempRoot,
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
assert.equal(missingOpenAIProbe.failureKind, 'config');
assert.equal(missingOpenAIProbe.attemptCount, 0);
assert.ok(missingOpenAIProbe.probeId);

const originalFetch = globalThis.fetch;
const originalLocalEnv = {
  LOCAL_PROVIDER_API_KEY: process.env.LOCAL_PROVIDER_API_KEY,
  LOCAL_PROVIDER_BASE_URL: process.env.LOCAL_PROVIDER_BASE_URL,
  LOCAL_PROVIDER_MAX_TOKENS: process.env.LOCAL_PROVIDER_MAX_TOKENS,
  LOCAL_PROVIDER_MODEL: process.env.LOCAL_PROVIDER_MODEL,
};

try {
  process.env.LOCAL_PROVIDER_API_KEY = 'test-local-key';
  process.env.LOCAL_PROVIDER_BASE_URL = 'http://127.0.0.1:1234/v1';
  process.env.LOCAL_PROVIDER_MAX_TOKENS = '1024';
  process.env.LOCAL_PROVIDER_MODEL = 'llama3.1-local';

  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:1234/v1/models');
    assert.equal(init?.method, 'GET');
    assert.equal(init?.headers?.Authorization, 'Bearer test-local-key');

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          data: [{ id: 'llama3.1-local' }, { id: 'qwen3-local' }],
        };
      },
    };
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  const localProbe = await service.probeProvider('local');
  assert.equal(localProbe.id, 'local');
  assert.equal(localProbe.ok, true);
  assert.equal(localProbe.attempted, true);
  assert.equal(localProbe.attemptCount, 1);
  assert.ok(localProbe.probeId);

  const localCheck = service.checkProvider('local');
  assert.equal(localCheck.latestProbe.id, localProbe.probeId);

  const providerList = service.listProviders();
  const openAIProvider = providerList.providers.find((provider) => provider.id === 'openai');
  const localProvider = providerList.providers.find((provider) => provider.id === 'local');
  assert.equal(openAIProvider.latestProbe.id, missingOpenAIProbe.probeId);
  assert.equal(localProvider.latestProbe.id, localProbe.probeId);
} finally {
  globalThis.fetch = originalFetch;

  if (originalLocalEnv.LOCAL_PROVIDER_API_KEY === undefined) {
    delete process.env.LOCAL_PROVIDER_API_KEY;
  } else {
    process.env.LOCAL_PROVIDER_API_KEY = originalLocalEnv.LOCAL_PROVIDER_API_KEY;
  }
  if (originalLocalEnv.LOCAL_PROVIDER_BASE_URL === undefined) {
    delete process.env.LOCAL_PROVIDER_BASE_URL;
  } else {
    process.env.LOCAL_PROVIDER_BASE_URL = originalLocalEnv.LOCAL_PROVIDER_BASE_URL;
  }
  if (originalLocalEnv.LOCAL_PROVIDER_MAX_TOKENS === undefined) {
    delete process.env.LOCAL_PROVIDER_MAX_TOKENS;
  } else {
    process.env.LOCAL_PROVIDER_MAX_TOKENS = originalLocalEnv.LOCAL_PROVIDER_MAX_TOKENS;
  }
  if (originalLocalEnv.LOCAL_PROVIDER_MODEL === undefined) {
    delete process.env.LOCAL_PROVIDER_MODEL;
  } else {
    process.env.LOCAL_PROVIDER_MODEL = originalLocalEnv.LOCAL_PROVIDER_MODEL;
  }
}

const historyAllResult = runCli({
  args: ['provider', 'history'],
});
assert.equal(historyAllResult.status, 0);
const historyAll = JSON.parse(historyAllResult.stdout);
assert.equal(historyAll.summary.total, 2);
assert.equal(historyAll.summary.attemptedCount, 1);
assert.equal(historyAll.summary.successCount, 1);
assert.equal(historyAll.summary.failureCount, 1);
assert.equal(historyAll.probes.length, 2);
assert.equal(historyAll.summary.failureKindCounts.config, 1);
assert.equal(historyAll.summary.retryableFailureCount, 0);
assert.equal(historyAll.summary.timedOutFailureCount, 0);

const historyAttemptedFalseResult = runCli({
  args: ['provider', 'history', '--attempted', 'false'],
});
assert.equal(historyAttemptedFalseResult.status, 0);
const historyAttemptedFalse = JSON.parse(historyAttemptedFalseResult.stdout);
assert.equal(historyAttemptedFalse.probes.length, 1);
assert.equal(historyAttemptedFalse.probes[0].providerId, 'openai');
assert.equal(historyAttemptedFalse.probes[0].failureKind, 'config');

const historyLocalSuccessResult = runCli({
  args: ['provider', 'history', '--provider', 'local', '--ok', 'true'],
});
assert.equal(historyLocalSuccessResult.status, 0);
const historyLocalSuccess = JSON.parse(historyLocalSuccessResult.stdout);
assert.equal(historyLocalSuccess.probes.length, 1);
assert.equal(historyLocalSuccess.probes[0].providerId, 'local');
assert.equal(historyLocalSuccess.probes[0].ok, true);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-history',
      totalProbes: historyAll.summary.total,
    },
    null,
    2,
  ),
);
