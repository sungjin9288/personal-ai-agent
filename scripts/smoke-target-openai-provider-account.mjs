import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-openai-provider-account-v1.md');
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
  packageJson.scripts['smoke:target-openai-provider-account'],
  'node scripts/smoke-target-openai-provider-account.mjs',
);

assert.match(decision, /^# Target OpenAI Provider Account v1$/m);
assert.match(decision, /^- status: local-target-openai-provider-account-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetOpenAIProviderApproved: false$/m);
assert.match(decision, /not OpenAI pilot live validation proof/);
assert.match(decision, /not target account approval proof/);
assert.match(decision, /not billing\/quota proof/);
assert.match(decision, /not model access approval proof/);
assert.match(decision, /not provider terms approval/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /OpenAI target production provider readiness remains blocked/);

for (const area of [
  'Account ownership',
  'Billing and quota',
  'API key and secret injection',
  'Model access',
  'Provider terms and customer approval',
  'Usage and cost guard',
  'Target live validation',
  'Telemetry and failure taxonomy',
  'Fallback and stop condition',
  'Renewal and review audit',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date/,
  /billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary/,
  /API key and secret injection proof with target secret manager alias, `OPENAI_API_KEY` owner, rotation path, access audit, break-glass owner, and redaction result/,
  /model access proof with `OPENAI_MODEL`, model availability, region\/project access, max token policy, fallback model, and owner approval/,
  /provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner/,
  /usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence/,
  /target live validation proof with `npm run live:execution-v1:openai`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference/,
  /telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner/,
  /fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision/,
  /renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date/,
  /migration plan from OpenAI-scoped local-first pilot account usage to approved target OpenAI provider operation/,
  /containment plan for missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure/,
]) {
  assert.match(decision, packetItem);
}

assert.match(decision, /## Target Evidence Capture Template/);
assert.match(decision, /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, or machine-local absolute paths/);
for (const field of [
  'targetEnvironmentName',
  'approvedAccountAlias',
  'billingQuotaStatus',
  'openaiModelAccess',
  'secretInjectionPolicy',
  'providerTermsCustomerApproval',
  'usageCostGuard',
  'liveValidationEvidence',
  'telemetryIncidentRoute',
  'fallbackStopCondition',
  'renewalReviewAudit',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(decision, /must reference a passed live validation generated from the approved target boundary/);
assert.match(decision, /must prove secret values are injected and redacted through approved controls/);
assert.match(decision, /target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/);

for (const command of [
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:openai-provider',
  'npm run preflight:execution-v1:openai',
  'npm run live:execution-v1:openai',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(providerReadiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(providerReadiness, /target OpenAI provider account/);
assert.match(targetProviderIntake, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(targetProviderIntake, /OpenAI provider account approval/);
assert.match(targetContract, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(targetContract, /target OpenAI provider account is approved/);
assert.match(intake, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(intake, /OpenAI provider account approval/);
assert.match(releaseReadiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /target OpenAI provider account gate: passed/);
assert.match(
  releaseReadiness,
  /target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary, API key and secret injection proof with target secret manager alias, OPENAI_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with OPENAI_MODEL, model availability, region\/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target OpenAI provider account is not approved and OpenAI target-boundary live ' +
      'validation evidence is not generated from a production-like environment',
  ),
);
assert.match(security, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(deployment, /## Target OpenAI Provider Account/);
assert.match(deployment, /npm run smoke:target-openai-provider-account/);
assert.match(productPlan, /\[x\] Target OpenAI provider account gate implemented/);
assert.match(readme, /docs\/target-openai-provider-account-v1\.md/);
assert.match(readme, /npm run smoke:target-openai-provider-account/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-openai-provider-account',
      ok: true,
      path: 'docs/target-openai-provider-account-v1.md',
      productionReadyClaim: false,
      targetCaptureTemplate: true,
      requiredCommandCount: 10,
      targetOpenAIProviderApproved: false,
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
