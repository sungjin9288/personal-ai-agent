import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const readinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const readiness = readRequiredFile(readinessPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['rehearsal:production-provider-readiness'],
  'node scripts/build-production-provider-readiness.mjs',
);
assert.equal(
  packageJson.scripts['smoke:production-provider-readiness'],
  'node scripts/smoke-production-provider-readiness.mjs',
);

assert.match(readiness, /^# Production Provider Readiness v1$/m);
assert.match(readiness, /^- status: local-provider-readiness-current$/m);
assert.match(readiness, /^- productionReadyClaim: false$/m);
assert.match(readiness, /not live-provider-complete evidence/);
assert.match(readiness, /not target production provider validation/);
assert.match(readiness, /not permission to claim `production-ready`/);
assert.match(readiness, /Production-ready remains blocked/);
assert.match(readiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(readiness, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(readiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(readiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(readiness, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(readiness, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(readiness, /\| `npm run preflight:execution-v1:all` \| pass \| 0 \|/);
assert.match(readiness, /"blockedCount": 0/);
assert.match(readiness, /"missingEnvCount": 3/);
assert.match(readiness, /"readyForLiveCount": 1/);

for (const [provider, envKey] of [
  ['openai', 'OPENAI_API_KEY'],
  ['anthropic', 'ANTHROPIC_API_KEY'],
  ['local', 'LOCAL_PROVIDER_MODEL'],
  ['hermes', 'HERMES_PROVIDER_MODEL'],
]) {
  assert.match(readiness, new RegExp(`\\| ${provider} \\| .* \\| ${envKey} \\|`), provider);
  assert.match(readiness, new RegExp(`### ${provider}\\n`), provider);
  assert.match(readiness, new RegExp(`- liveCommand: \`npm run live:execution-v1:${provider}\``), provider);
}

for (const phrase of [
  /archived passed live providers in the current release evidence: OpenAI, local/,
  /Anthropic remains blocked/,
  /local provider live validation is archived as passed/,
  /Hermes remains blocked/,
  /deterministic provider preflight passing is necessary but not sufficient/,
  /target provider evidence intake contract remains the gate/,
  /target provider operations contract remains the gate/,
  /target blocker closure verification matrix/,
  /target OpenAI provider account remains the gate/,
  /target Anthropic provider account remains the gate/,
  /target local provider architecture remains the gate/,
  /target Hermes provider architecture remains the gate/,
]) {
  assert.match(readiness, phrase);
}

assert.match(readiness, /\| local \| ready-for-live-validation \| LOCAL_PROVIDER_MODEL \| yes \| passed \|/);
assert.match(readiness, /target local provider architecture remains the production gate/);
assert.match(readiness, /provider fallback runtime audit, target blocker closure verification matrix, telemetry/);

assert.match(releaseReadiness, /\[production-provider-readiness-v1\.md\]\(production-provider-readiness-v1\.md\)/);
assert.match(releaseReadiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(releaseReadiness, /local provider readiness operating rehearsal: passed/);
assert.match(deployment, /## Production Provider Readiness Rehearsal/);
assert.match(deployment, /## Target Provider Evidence Intake/);
assert.match(deployment, /## Target Provider Operations/);
assert.match(deployment, /npm run rehearsal:production-provider-readiness/);
assert.match(deployment, /npm run smoke:production-provider-readiness/);
assert.match(deployment, /npm run smoke:target-provider-evidence-intake/);
assert.match(deployment, /npm run smoke:target-provider-operations/);
assert.match(deployment, /npm run smoke:target-openai-provider-account/);
assert.match(deployment, /npm run smoke:target-anthropic-provider-account/);
assert.match(deployment, /npm run smoke:target-local-provider-architecture/);
assert.match(deployment, /npm run smoke:target-hermes-provider-architecture/);
assert.match(productPlan, /\[x\] Production provider readiness rehearsal gate implemented/);
assert.match(productPlan, /\[x\] Target provider evidence intake gate implemented/);
assert.match(productPlan, /\[x\] Target provider operations gate implemented/);
assert.match(productPlan, /\[x\] Target OpenAI provider account gate implemented/);
assert.match(productPlan, /\[x\] Target Anthropic provider account gate implemented/);
assert.match(productPlan, /\[x\] Target local provider architecture gate implemented/);
assert.match(productPlan, /\[x\] Target Hermes provider architecture gate implemented/);
assert.match(readme, /npm run rehearsal:production-provider-readiness/);
assert.match(readme, /npm run smoke:production-provider-readiness/);
assert.match(readme, /npm run smoke:target-provider-evidence-intake/);
assert.match(readme, /npm run smoke:target-provider-operations/);

console.log(
  JSON.stringify(
    {
      mode: 'production-provider-readiness',
      ok: true,
      path: 'docs/production-provider-readiness-v1.md',
      productionReadyClaim: false,
      providerCount: 4,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
