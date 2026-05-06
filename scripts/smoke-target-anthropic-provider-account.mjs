import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-anthropic-provider-account-v1.md');
const providerReadinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const targetProviderIntakePath = path.join(docsDir, 'target-provider-evidence-intake-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const providerReadiness = readRequiredFile(providerReadinessPath);
const targetProviderIntake = readRequiredFile(targetProviderIntakePath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-anthropic-provider-account'],
  'node scripts/smoke-target-anthropic-provider-account.mjs',
);

assert.match(decision, /^# Target Anthropic Provider Account v1$/m);
assert.match(decision, /^- status: local-target-anthropic-provider-account-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetAnthropicProviderApproved: false$/m);
assert.match(decision, /not Anthropic live validation proof/);
assert.match(decision, /not account remediation proof/);
assert.match(decision, /not billing\/credit proof/);
assert.match(decision, /not model access proof/);
assert.match(decision, /not provider terms approval/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Anthropic provider readiness remains blocked/);

for (const area of [
  'Account ownership',
  'Billing and credit',
  'API key and secret injection',
  'Model access',
  'Provider terms and customer approval',
  'Quota and spend guard',
  'Target live validation',
  'Telemetry and failure taxonomy',
  'Fallback and stop condition',
  'Remediation audit',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /account ownership proof with Anthropic account owner, organization\/workspace alias, customer scope, evidence owner, and review date/,
  /billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary/,
  /API key and secret injection proof with target secret manager alias, `ANTHROPIC_API_KEY` owner, rotation path, access audit, break-glass owner, and redaction result/,
  /model access proof with `ANTHROPIC_MODEL`, model availability, region\/workspace access, max token policy, fallback model, and owner approval/,
  /provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript retention policy, support owner, and evidence owner/,
  /quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence/,
  /target live validation proof with `npm run live:execution-v1:anthropic`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference/,
  /telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner/,
  /fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision/,
  /remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date/,
  /migration plan from failed Anthropic account state to approved target Anthropic provider operation/,
  /containment plan for low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:anthropic-provider',
  'npm run preflight:execution-v1:anthropic',
  'npm run live:execution-v1:anthropic',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(providerReadiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(providerReadiness, /target Anthropic provider account/);
assert.match(targetProviderIntake, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(targetProviderIntake, /Anthropic provider account approval/);
assert.match(targetContract, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(targetContract, /target Anthropic provider account is approved/);
assert.match(intake, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(intake, /Anthropic provider account approval/);
assert.match(releaseReadiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /target Anthropic provider account gate: passed/);
assert.match(security, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(deployment, /## Target Anthropic Provider Account/);
assert.match(deployment, /npm run smoke:target-anthropic-provider-account/);
assert.match(productPlan, /\[x\] Target Anthropic provider account gate implemented/);
assert.match(readme, /docs\/target-anthropic-provider-account-v1\.md/);
assert.match(readme, /npm run smoke:target-anthropic-provider-account/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-anthropic-provider-account',
      ok: true,
      path: 'docs/target-anthropic-provider-account-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 10,
      targetAnthropicProviderApproved: false,
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
