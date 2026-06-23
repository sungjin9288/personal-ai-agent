import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const demoScript = path.join(repoDir, 'scripts', 'demo-local.mjs');

assert.equal(packageJson.scripts['demo:local'], 'node scripts/demo-local.mjs');
assert.equal(packageJson.scripts['smoke:demo-local'], 'node scripts/smoke-demo-local.mjs');

const planResult = spawnSync(process.execPath, [demoScript, '--plan'], {
  cwd: repoDir,
  encoding: 'utf8',
});

assert.equal(planResult.status, 0, planResult.stderr || planResult.stdout);
assert.equal(planResult.stderr, '');

const plan = JSON.parse(planResult.stdout);

assert.equal(plan.mode, 'local-demo-plan');
assert.equal(plan.credentialFree, true);
assert.equal(plan.productionReadyClaim, false);
assert.deepEqual(
  plan.steps.map((step) => step.command),
  [
    'npm run bootstrap:local',
    'npm run smoke:representative-demo',
    'npm run smoke:representative-demo-evidence',
    'npm run smoke:demo-evidence-index',
    'npm run smoke:release-artifact-hygiene',
    'npm run smoke:portfolio-zip',
    'npm run smoke:pilot-export-package',
  ],
);

for (const evidencePath of [
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/screenshots/representative-release-demo-preview.png',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'docs/demo-evidence-index-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/pilot-export-package-v1.md',
]) {
  assert.equal(plan.evidence.includes(evidencePath), true, `plan missing evidence path ${evidencePath}`);
  assert.equal(readme.includes(evidencePath) || readme.includes('docs/demo-scenarios-v1.md'), true);
}

for (const term of [
  'npm run demo:local',
  '## Representative Demo',
  'credential-free',
  'provider-scoped pilot-ready',
  'not production-ready',
  'not all-provider-complete',
  'not a hosted SaaS product',
]) {
  assert.equal(readme.includes(term), true, `README missing ${term}`);
}

console.log(
  JSON.stringify(
    {
      commandCount: plan.steps.length,
      credentialFree: plan.credentialFree,
      mode: 'demo-local-smoke',
      ok: true,
      productionReadyClaim: plan.productionReadyClaim,
    },
    null,
    2,
  ),
);
