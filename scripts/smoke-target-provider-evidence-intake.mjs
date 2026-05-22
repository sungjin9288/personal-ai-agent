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
assert.match(
  intake,
  /approved account status proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, provider blocker closure verification proof, rollback proof, and fallback decision proof/,
);
assert.doesNotMatch(
  intake,
  /quota\/cost guard evidence|rollback\/fallback evidence|model\/endpoint pinning|quota\/cost\/resource guard|fallback\/disable path|data\/transcript handling|remediation\/renewal/,
);
assert.doesNotMatch(
  intake,
  /billing\/credit status|customer\/account approval|endpoint\/base URL alias|retry\/concurrency limits|quota\/spend owner|regenerated release artifact references/,
);

for (const evidenceItem of [
  'Provider account approval',
  'Target secret injection',
  'Target live validation',
  'Quota and cost guard',
  'Model and endpoint pinning',
  'Failure triage route',
  'Provider blocker closure verification',
  'Target provider operations',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(evidenceItem)} \\|`));
}
assert.match(
  intake,
  /target OpenAI provider account contract is present with targetOpenAIProviderApproved false and account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence are missing/,
);
assert.match(
  intake,
  /target Anthropic provider account contract is present with targetAnthropicProviderApproved false and account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence are missing/,
);
assert.match(
  intake,
  /Provider account approval \| account owner proof, billing and credit or quota status proof, allowed workspace or customer proof, provider terms proof, OpenAI provider account approval proof when OpenAI is included, Anthropic provider account approval proof when Anthropic is included, local provider architecture approval proof when local provider is included, and Hermes provider architecture approval proof when Hermes is included/,
);
assert.match(
  intake,
  /Quota and cost guard \| quota proof, concurrency limit proof, timeout proof, spend owner proof, and retry guard proof are documented before live use/,
);
assert.match(
  intake,
  /Model and endpoint pinning \| provider model proof, endpoint or base URL alias proof, timeout proof, and fallback route proof are recorded without secrets/,
);
assert.match(
  intake,
  /Failure triage route \| account failure owner proof, missing environment owner proof, live runtime failure owner proof, and fallback decision owner proof are recorded/,
);
assert.match(
  intake,
  /Provider blocker closure verification \| provider-specific blocker state proof, next verification command proof, required closing evidence proof, stop-condition id proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded/,
);
assert.doesNotMatch(
  intake,
  /target OpenAI provider account contract is present with targetOpenAIProviderApproved false; Anthropic account execution remains failed; target Anthropic provider account contract is present with targetAnthropicProviderApproved false/,
);

for (const checklistItem of [
  /provider owner proof and customer or account approval proof/,
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
  /model name proof, endpoint or base URL alias proof, timeout proof, and retry and concurrency limit proof/,
  /live validation command and archived execution-v1 evidence commit/,
  /quota and spend owner proof and expected usage envelope proof/,
  /fallback provider or stop condition when live validation fails/,
  /provider-specific blocker closure verification matrix row with current state proof, next verification command proof, required closing evidence proof, stop-condition id proof, artifact hygiene result, regenerated execution snapshot evidence, refreshed release artifact references, and decision owner proof/,
  /account remediation proof for billing, credit, region, or terms blockers/,
  /artifact hygiene result after evidence refresh/,
  /target provider operations evidence with provider failure containment plan/,
  /completed target provider operations evidence capture template for every provider included in the target provider claim/,
  /blockerClosureVerificationEvidence from target provider operations for every provider included in the target provider claim/,
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
assert.match(targetProviderOperations, /## Target Evidence Capture Template/);
assert.match(targetProviderOperations, /blockerClosureVerificationEvidence/);
assert.match(targetProviderOperations, /cannot bypass `productionReadyClaim: false` while any stop-condition remains/);
assert.match(intake, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(
  intake,
  /target provider operations evidence remains the runtime operations gate for model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment/i,
);
assert.match(intake, /Provider blocker closure verification/);
assert.match(intake, /provider blocker closure verification/);
assert.match(intake, /target environment blocker closure verification matrix/);
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
assert.match(
  targetContract,
  /provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, and fallback and stop-condition evidence/,
);
assert.match(releaseReadiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(
  releaseReadiness,
  /target provider evidence intake gate: passed, with provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, failure triage route proof, provider blocker closure verification proof, and `productionReadyClaim: false`/,
);
assert.match(security, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(deployment, /## Target Provider Evidence Intake/);
assert.match(deployment, /npm run smoke:target-provider-evidence-intake/);
assert.match(productPlan, /\[x\] Target provider evidence intake gate implemented/);
assert.match(readme, /docs\/target-provider-evidence-intake-v1\.md/);
assert.match(readme, /npm run smoke:target-provider-evidence-intake/);
assert.match(
  readme,
  /local target provider evidence intake can be verified with `npm run smoke:target-provider-evidence-intake`; it proves provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, fallback route proof, and blocker closure verification proof requirements are present/,
);

console.log(
  JSON.stringify(
    {
      evidenceItemCount: 8,
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
