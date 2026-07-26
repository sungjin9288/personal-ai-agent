import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { listProviderSpecs } from '../src/providers/provider-catalog.mjs';

const repoDir = process.cwd();
const envExamplePath = path.join(repoDir, '.env.example');
const gitignorePath = path.join(repoDir, '.gitignore');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');

const envExample = fs.readFileSync(envExamplePath, 'utf8');
const gitignore = fs.readFileSync(gitignorePath, 'utf8');
const readme = fs.readFileSync(readmePath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

assert.equal(packageJson.scripts['smoke:env-example'], 'node scripts/smoke-env-example.mjs');

const parsedEnv = parseEnvExample(envExample);
const envKeys = new Set(parsedEnv.map((entry) => entry.key));
const ignoredFiles = new Set(
  gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

for (const ignored of ['.env', '.env.local']) {
  assert.equal(ignoredFiles.has(ignored), true, `.gitignore must ignore ${ignored}`);
}

const providerEnvKeys = new Set();
for (const spec of listProviderSpecs()) {
  for (const key of [...spec.requiredEnv, ...spec.optionalEnv]) {
    providerEnvKeys.add(key);
  }
}

for (const key of providerEnvKeys) {
  assert.equal(envKeys.has(key), true, `.env.example missing provider env ${key}`);
}

for (const key of [
  'PERSONAL_AI_AGENT_UI_HOST',
  'PERSONAL_AI_AGENT_UI_PORT',
  'PERSONAL_AI_AGENT_ROOT',
  'PERSONAL_AI_AGENT_DEFAULT_ROLE',
  'PERSONAL_AI_AGENT_WEB_AUTH_MODE',
  'PERSONAL_AI_AGENT_WEB_AUTH_TOKEN',
  'PERSONAL_AI_AGENT_RBAC_MODE',
  'PERSONAL_AI_AGENT_OIDC_ISSUER',
  'PERSONAL_AI_AGENT_OIDC_AUDIENCE',
  'PERSONAL_AI_AGENT_OIDC_JWKS_URL',
  'PERSONAL_AI_AGENT_OIDC_ROLE_CLAIM',
  'PERSONAL_AI_AGENT_TENANT_MODE',
  'PERSONAL_AI_AGENT_TENANT_CLAIM',
  'PERSONAL_AI_AGENT_MARKITDOWN_BIN',
  'PERSONAL_AI_AGENT_RETRIEVAL_MODE',
  'PERSONAL_AI_AGENT_EMBEDDING_COMMAND',
  'PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON',
]) {
  assert.equal(envKeys.has(key), true, `.env.example missing runtime env ${key}`);
}

for (const entry of parsedEnv) {
  assert.doesNotMatch(entry.value, /sk-[A-Za-z0-9_-]{10,}/, `${entry.key} looks like a secret`);
  assert.doesNotMatch(entry.value, /[A-Za-z0-9_/-]{20,}\.[A-Za-z0-9_/-]{20,}\.[A-Za-z0-9_/-]{20,}/, `${entry.key} looks like a JWT`);
  assert.doesNotMatch(entry.value, /\/Users\/|\/private\/var\/folders\/|\/var\/folders\//, `${entry.key} has a machine-local path`);
}

for (const term of [
  '.env.example',
  'The default stub provider works without credentials',
  'cp .env.example .env',
  'does not load `.env` automatically',
]) {
  assert.equal(readme.includes(term), true, `README missing env onboarding term: ${term}`);
}

console.log(
  JSON.stringify(
    {
      envKeyCount: envKeys.size,
      mode: 'env-example-smoke',
      ok: true,
      providerEnvKeyCount: providerEnvKeys.size,
    },
    null,
    2,
  ),
);

function parseEnvExample(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      assert.notEqual(index, -1, `invalid env line: ${line}`);
      return {
        key: line.slice(0, index),
        value: line.slice(index + 1),
      };
    });
}
