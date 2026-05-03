import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const providerListResult = runCli({
  args: ['provider', 'list'],
  env: {
    ANTHROPIC_API_KEY: '',
    HERMES_PROVIDER_MODEL: '',
    LOCAL_PROVIDER_MODEL: '',
    OPENAI_API_KEY: '',
  },
});

assert.equal(providerListResult.status, 0);
const providerList = JSON.parse(providerListResult.stdout);

assert.equal(providerList.summary.total, 5);
assert.equal(providerList.summary.implementedCount, 5);
assert.equal(providerList.summary.configuredCount, 1);
assert.equal(providerList.summary.defaultProviderId, 'stub');
assert.equal(providerList.providers.length, 5);

const stubProvider = providerList.providers.find((provider) => provider.id === 'stub');
const openAIProvider = providerList.providers.find((provider) => provider.id === 'openai');
const anthropicProvider = providerList.providers.find((provider) => provider.id === 'anthropic');
const localProvider = providerList.providers.find((provider) => provider.id === 'local');
const hermesProvider = providerList.providers.find((provider) => provider.id === 'hermes');

assert.equal(stubProvider.configured, true);
assert.deepEqual(stubProvider.requiredEnv, []);
assert.equal(openAIProvider.configured, false);
assert.deepEqual(openAIProvider.missingEnv, ['OPENAI_API_KEY']);
assert.equal(anthropicProvider.configured, false);
assert.deepEqual(anthropicProvider.missingEnv, ['ANTHROPIC_API_KEY']);
assert.equal(localProvider.configured, false);
assert.deepEqual(localProvider.missingEnv, ['LOCAL_PROVIDER_MODEL']);
assert.equal(hermesProvider.configured, false);
assert.deepEqual(hermesProvider.missingEnv, ['HERMES_PROVIDER_MODEL']);

const openAICheckResult = runCli({
  args: ['provider', 'check', 'openai'],
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_BASE_URL: 'https://api.openai.test/v1',
    OPENAI_MODEL: 'gpt-5.2',
  },
});

assert.equal(openAICheckResult.status, 0);
const openAICheck = JSON.parse(openAICheckResult.stdout);
assert.equal(openAICheck.id, 'openai');
assert.equal(openAICheck.configured, true);
assert.equal(openAICheck.configuration.apiKeyPresent, true);
assert.equal(openAICheck.configuration.baseUrl, 'https://api.openai.test/v1');
assert.equal(openAICheck.configuration.model, 'gpt-5.2');

const anthropicCheckResult = runCli({
  args: ['provider', 'check', 'anthropic'],
  env: {
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.test/v1',
    ANTHROPIC_MAX_TOKENS: '2048',
    ANTHROPIC_MODEL: 'claude-sonnet-4-6',
    ANTHROPIC_VERSION: '2023-06-01',
  },
});

assert.equal(anthropicCheckResult.status, 0);
const anthropicCheck = JSON.parse(anthropicCheckResult.stdout);
assert.equal(anthropicCheck.id, 'anthropic');
assert.equal(anthropicCheck.configured, true);
assert.equal(anthropicCheck.configuration.apiKeyPresent, true);
assert.equal(anthropicCheck.configuration.baseUrl, 'https://api.anthropic.test/v1');
assert.equal(anthropicCheck.configuration.model, 'claude-sonnet-4-6');
assert.equal(anthropicCheck.configuration.version, '2023-06-01');

const localCheckResult = runCli({
  args: ['provider', 'check', 'local'],
  env: {
    LOCAL_PROVIDER_API_KEY: 'test-local-key',
    LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:1234/v1',
    LOCAL_PROVIDER_MAX_TOKENS: '1024',
    LOCAL_PROVIDER_MODEL: 'llama3.1-local',
  },
});

assert.equal(localCheckResult.status, 0);
const localCheck = JSON.parse(localCheckResult.stdout);
assert.equal(localCheck.id, 'local');
assert.equal(localCheck.configured, true);
assert.equal(localCheck.configuration.apiKeyPresent, true);
assert.equal(localCheck.configuration.baseUrl, 'http://127.0.0.1:1234/v1');
assert.equal(localCheck.configuration.model, 'llama3.1-local');
assert.equal(localCheck.configuration.maxTokens, '1024');

const hermesCheckResult = runCli({
  args: ['provider', 'check', 'hermes'],
  env: {
    HERMES_PROVIDER_API_KEY: 'test-hermes-key',
    HERMES_PROVIDER_BASE_URL: 'http://127.0.0.1:8088/v1',
    HERMES_PROVIDER_MAX_TOKENS: '1024',
    HERMES_PROVIDER_MODEL: 'nous-hermes-4-test',
    HERMES_PROVIDER_PROBE_TIMEOUT_MS: '3000',
    HERMES_PROVIDER_RUN_TIMEOUT_MS: '12000',
  },
});

assert.equal(hermesCheckResult.status, 0);
const hermesCheck = JSON.parse(hermesCheckResult.stdout);
assert.equal(hermesCheck.id, 'hermes');
assert.equal(hermesCheck.configured, true);
assert.equal(hermesCheck.configuration.apiKeyPresent, true);
assert.equal(hermesCheck.configuration.baseUrl, 'http://127.0.0.1:8088/v1');
assert.equal(hermesCheck.configuration.model, 'nous-hermes-4-test');
assert.equal(hermesCheck.configuration.maxTokens, '1024');
assert.equal(hermesCheck.configuration.probeTimeoutMs, '3000');
assert.equal(hermesCheck.configuration.runTimeoutMs, '12000');

const providerListWithOpenAIResult = runCli({
  args: ['provider', 'list'],
  env: {
    OPENAI_API_KEY: 'test-openai-key',
  },
});

assert.equal(providerListWithOpenAIResult.status, 0);
const providerListWithOpenAI = JSON.parse(providerListWithOpenAIResult.stdout);
assert.equal(providerListWithOpenAI.summary.defaultProviderId, 'openai');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-surface',
      configuredCount: providerList.summary.configuredCount,
      total: providerList.summary.total,
    },
    null,
    2,
  ),
);
