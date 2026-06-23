import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { listProviderSpecs } from '../src/providers/provider-catalog.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/provider-readiness-matrix-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');
const targetProviderOperations = readRequiredFile('docs/target-provider-operations-v1.md');

assert.equal(
  packageJson.scripts['smoke:provider-readiness-matrix'],
  'node scripts/smoke-provider-readiness-matrix.mjs',
);

for (const term of [
  '# Provider Readiness Matrix v1',
  'status: provider-readiness-matrix-current',
  'productionReadyClaim: false',
  'allProviderComplete: false',
  'provider-scoped pilot-ready',
  'src/providers/provider-catalog.mjs',
  'src/providers/index.mjs',
  'createProviderRegistry',
  'npm run smoke:provider-readiness-matrix',
  'npm run live:execution-v1:anthropic',
  'npm run live:execution-v1:hermes',
  'Do not claim',
  'All-provider live validation complete',
  'Production-ready provider operations',
]) {
  assertContains(doc, term, `provider readiness matrix missing ${term}`);
}

const specs = listProviderSpecs();
assert.deepEqual(
  specs.map((spec) => spec.id),
  ['stub', 'openai', 'anthropic', 'local', 'hermes'],
);

for (const spec of specs) {
  const rowPattern = new RegExp(`^\\| \`${escapeRegExp(spec.id)}\` \\| yes \\| ([^|]+) \\| \`${escapeRegExp(spec.transport)}\` \\|`, 'm');
  const rowMatch = doc.match(rowPattern);
  assert.ok(rowMatch, `provider matrix missing row for ${spec.id}`);

  const requiredEnvCell = rowMatch[1].trim();
  if (spec.requiredEnv.length === 0) {
    assert.equal(requiredEnvCell, 'none', `${spec.id} required env should be none`);
  } else {
    for (const envKey of spec.requiredEnv) {
      assertContains(requiredEnvCell, `\`${envKey}\``, `${spec.id} row missing required env ${envKey}`);
      assertContains(doc, envKey, `provider matrix missing env key ${envKey}`);
    }
  }

  assertContains(doc, `\`${spec.transport}\``, `provider matrix missing transport ${spec.transport}`);
}

for (const [providerId, expectedState] of [
  ['stub', 'Credential-free deterministic local replay verified'],
  ['openai', 'OpenAI-backed local-first/self-hosted pilot evidence exists'],
  ['anthropic', 'live validation is blocked by provider account billing/credit evidence'],
  ['local', 'target local provider architecture approval remains blocked'],
  ['hermes', 'target Hermes provider architecture evidence is supplied'],
]) {
  assertContains(doc, providerId, `provider matrix missing ${providerId}`);
  assertContains(doc, expectedState, `provider matrix missing expected state for ${providerId}`);
}

for (const readmeTerm of [
  'Provider readiness matrix: [docs/provider-readiness-matrix-v1.md](docs/provider-readiness-matrix-v1.md)',
  'npm run smoke:provider-readiness-matrix',
]) {
  assertContains(readme, readmeTerm, `README missing provider readiness matrix term ${readmeTerm}`);
}

assertContains(roadmap, '완료: provider readiness matrix와 catalog smoke guard', 'roadmap missing provider readiness matrix completion');
assertContains(releaseReadiness, 'productionReadyClaim: false', 'release readiness must keep productionReadyClaim false');
assertContains(releaseReadiness, 'OpenAI passed', 'release readiness missing OpenAI live evidence state');
assertContains(releaseReadiness, 'Anthropic failed with API billing/credit blocker', 'release readiness missing Anthropic blocker');
assertContains(releaseReadiness, 'local provider passed for the configured pilot boundary', 'release readiness missing local provider pilot state');
assertContains(releaseReadiness, 'Hermes remains blocked', 'release readiness missing Hermes blocker');
assertContains(targetProviderOperations, 'provider readiness matrix records env keys and live commands', 'target provider operations missing matrix linkage');

for (const risky of [
  'all-provider-complete achieved',
  'all providers are live validated',
  'Anthropic readiness achieved',
  'Hermes live readiness achieved',
  'target local provider production readiness achieved',
  'production-ready provider operations achieved',
]) {
  assert.equal(combinedText().toLowerCase().includes(risky.toLowerCase()), false, `provider readiness matrix contains risky claim: ${risky}`);
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      mode: 'provider-readiness-matrix-smoke',
      ok: true,
      providerCount: specs.length,
      productionReadyClaim: false,
      allProviderComplete: false,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function combinedText() {
  return [doc, readme, roadmap, releaseReadiness, targetProviderOperations].join('\n\n');
}
