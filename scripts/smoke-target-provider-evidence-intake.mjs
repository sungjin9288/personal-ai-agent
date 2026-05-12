import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const intakePath = path.join(docsDir, 'target-provider-evidence-intake-v1.md');
const targetProviderOperationsPath = path.join(docsDir, 'target-provider-operations-v1.md');
const providerReadinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const targetOpenAIPath = path.join(docsDir, 'target-openai-provider-account-v1.md');
const targetAnthropicPath = path.join(docsDir, 'target-anthropic-provider-account-v1.md');
const targetLocalPath = path.join(docsDir, 'target-local-provider-architecture-v1.md');
const targetHermesPath = path.join(docsDir, 'target-hermes-provider-architecture-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const intake = readRequiredFile(intakePath);
const targetProviderOperations = readRequiredFile(targetProviderOperationsPath);
const providerReadiness = readRequiredFile(providerReadinessPath);
const targetOpenAI = readRequiredFile(targetOpenAIPath);
const targetAnthropic = readRequiredFile(targetAnthropicPath);
const targetLocal = readRequiredFile(targetLocalPath);
const targetHermes = readRequiredFile(targetHermesPath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-provider-evidence-intake'],
  'node scripts/smoke-target-provider-evidence-intake.mjs',
);

assert.match(intake, /^# Target Provider Evidence Intake v1$/m);
assert.match(intake, /^- status: local-target-provider-evidence-intake-current$/m);
assert.match(intake, /^- productionReadyClaim: false$/m);
assert.match(intake, /not provider account remediation proof/);
assert.match(intake, /not live-provider-complete evidence/);
assert.match(intake, /not permission to claim `production-ready`/);
assert.match(intake, /Production-ready remains blocked until every provider included in the target release/);

for (const evidenceItem of [
  'Provider account approval',
  'Target secret injection',
  'Target live validation',
  'Quota and cost guard',
  'Model and endpoint pinning',
  'Failure triage route',
  'Target provider operations',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(evidenceItem)} \\|`));
}

for (const checklistItem of [
  /provider owner and customer\/account approval/,
  /OpenAI provider account approval when OpenAI is included in the target provider claim/,
  /completed target OpenAI provider account evidence capture template when OpenAI is included in the target provider claim/,
  /Anthropic provider account approval when Anthropic is included in the target provider claim/,
  /completed target Anthropic provider account evidence capture template when Anthropic is included in the target provider claim/,
  /local provider architecture approval when local provider is included in the target provider claim/,
  /completed target local provider evidence capture template when local provider is included in the target provider claim/,
  /Hermes provider architecture approval when Hermes is included in the target provider claim/,
  /completed target Hermes provider evidence capture template when Hermes is included in the target provider claim/,
  /target environment name and deployment boundary/,
  /secret manager path or key alias, never the secret value/,
  /model name, endpoint\/base URL alias, timeout, and retry\/concurrency limits/,
  /live validation command and archived execution-v1 evidence commit/,
  /quota\/spend owner and expected usage envelope/,
  /fallback provider or stop condition when live validation fails/,
  /account remediation note for billing, credit, region, or terms blockers/,
  /artifact hygiene result after evidence refresh/,
  /target provider operations evidence with provider failure containment plan/,
]) {
  assert.match(intake, checklistItem);
}

for (const command of [
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(intake, new RegExp(escapeRegExp(command)));
}

assert.match(providerReadiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(providerReadiness, /target provider evidence intake contract/);
assert.match(targetProviderOperations, /^# Target Provider Operations v1$/m);
assert.match(intake, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(intake, /target provider operations evidence/);
assert.match(targetOpenAI, /^# Target OpenAI Provider Account v1$/m);
assert.match(intake, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(intake, /OpenAI provider account approval/);
assert.match(targetAnthropic, /^# Target Anthropic Provider Account v1$/m);
assert.match(intake, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(intake, /Anthropic provider account approval/);
assert.match(targetLocal, /^# Target Local Provider Architecture v1$/m);
assert.match(intake, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(intake, /local provider architecture approval/);
assert.match(targetHermes, /^# Target Hermes Provider Architecture v1$/m);
assert.match(intake, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(intake, /target Hermes provider architecture approval/);
assert.match(targetContract, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(targetContract, /npm run smoke:target-provider-evidence-intake/);
assert.match(targetContract, /provider account approval, target secret injection, target-boundary live validation, quota\/cost guard, model\/endpoint pinning, and fallback evidence/);
assert.match(releaseReadiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /target provider evidence intake gate: passed/);
assert.match(security, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(deployment, /## Target Provider Evidence Intake/);
assert.match(deployment, /npm run smoke:target-provider-evidence-intake/);
assert.match(productPlan, /\[x\] Target provider evidence intake gate implemented/);
assert.match(readme, /docs\/target-provider-evidence-intake-v1\.md/);
assert.match(readme, /npm run smoke:target-provider-evidence-intake/);

console.log(
  JSON.stringify(
    {
      evidenceItemCount: 7,
      mode: 'target-provider-evidence-intake',
      ok: true,
      path: 'docs/target-provider-evidence-intake-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 10,
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
