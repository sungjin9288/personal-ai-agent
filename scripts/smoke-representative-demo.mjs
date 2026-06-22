import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');

const packageJson = JSON.parse(readRequiredFile(path.join(repoDir, 'package.json')));
const readme = readRequiredFile(path.join(repoDir, 'README.md'));
const demoScenarios = readRequiredFile(path.join(docsDir, 'demo-scenarios-v1.md'));
const productPlan = readRequiredFile(path.join(docsDir, 'product-plan-v1.md'));
const handoff = readRequiredFile(path.join(docsDir, 'execution-v1-handoff.md'));
const pilotExport = readRequiredFile(path.join(docsDir, 'pilot-export-package-v1.md'));

assert.equal(
  packageJson.scripts['smoke:representative-demo'],
  'node scripts/smoke-representative-demo.mjs',
);

for (const term of [
  '## Representative Demo',
  'Representative Demo: Release Readiness Evidence Walkthrough',
  '10-minute replay',
  'npm run smoke:representative-demo',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:execution-v1-handoff',
  'npm run smoke:release-artifact-hygiene',
  'provider-scoped pilot ready',
  'production-ready',
  'all-provider completeness',
  'Anthropic',
  'Hermes',
  'target local provider',
  'OpenClaw-style backbone',
  'Hermes-style improvement boundaries',
  'Loop Engineering',
  'Harness Engineering guardrails',
]) {
  assertContains(demoScenarios, term, `demo scenarios must include ${term}`);
}

for (const forbidden of [
  'all providers are ready',
  'production ready by default',
  'Hermes is live-ready',
  'Anthropic is live-ready',
]) {
  assertDoesNotContain(demoScenarios.toLowerCase(), forbidden.toLowerCase(), `demo scenarios must not claim ${forbidden}`);
}

assertContains(readme, '## Representative Demo', 'README must expose the representative demo entry point');
assertContains(readme, 'npm run smoke:representative-demo', 'README must include the representative demo smoke');
assertContains(readme, 'docs/demo-scenarios-v1.md', 'README must link the demo catalog');
assertContains(readme, 'provider-scoped pilot-ready', 'README must keep the readiness claim scoped');
assertContains(readme, 'not production-ready', 'README must keep production readiness blocked');

assertContains(productPlan, 'provider-scoped pilot-ready', 'product plan must keep scoped readiness wording');
assertContains(productPlan, 'Production Ready', 'product plan must preserve production readiness distinction');
assertContains(handoff, 'provider-scoped pilot ready', 'handoff must keep scoped readiness wording');
assertContains(handoff, 'Hermes live validation: blocked', 'handoff must expose Hermes blocker');
assertContains(handoff, 'Anthropic live validation: failed', 'handoff must expose Anthropic blocker');
assertContains(pilotExport, 'productionReadyClaim: false', 'pilot export must keep productionReadyClaim false');
assertContains(pilotExport, 'manifest-only', 'pilot export must remain a manifest-only package');

console.log(
  JSON.stringify(
    {
      mode: 'representative-demo-contract-smoke',
      ok: true,
      demo: 'Release Readiness Evidence Walkthrough',
      credentialFree: true,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(text.includes(needle), message);
}

function assertDoesNotContain(text, needle, message) {
  assert.equal(text.includes(needle), false, message);
}
