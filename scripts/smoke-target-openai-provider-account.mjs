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
assert.match(
  decision,
  /OpenAI target production provider readiness remains blocked until this account decision is approved and target account evidence is generated for account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary live:execution-v1:openai proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment/,
);
assert.doesNotMatch(
  decision,
  /OpenAI target production provider readiness remains blocked until this account decision is approved and OpenAI live validation evidence is generated from the approved production-like or hosted target environment/,
);

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
  /API key and secret injection proof with approved secret manager platform proof, `OPENAI_API_KEY` owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof/,
  /model access proof with `OPENAI_MODEL`, model availability, region\/project access, max token policy, fallback model, and owner approval/,
  /provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner/,
  /usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence/,
  /target live validation proof with `npm run live:execution-v1:openai`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference/,
  /telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner/,
  /fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence/,
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
assert.doesNotMatch(decision, /target secret manager alias, `OPENAI_API_KEY` owner/);
assert.doesNotMatch(decision, /API key and secret injection proof with target secret manager alias/);
assert.match(decision, /target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/);
assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Provider \| Provider-Specific Blocker \| Stop Condition \| Target Stop Condition \| Evidence Command \| Shared Operations Blocker \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| openai \| target-openai-provider-account-remains-blocked-until-target-open \| openai-live-env-missing \| target-openai-provider-account-approval-missing \| `node scripts\/build-execution-v1-evidence\.mjs --live-openai` \| target-provider-operations-evidence-remains-blocked-until-comple \| 2 \| 14 \| 12 \| 5 \| blocked \|/,
);
assert.match(decision, /OpenAI provider approval owns the provider-specific account proof/);
assert.match(decision, /Target provider operations owns the shared runtime operations proof/);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `targetOpenAIProviderApproved: false` until both linked closure verifications have same-boundary target evidence, matching Stop Condition Handoff details, accepted decision owner proof, OpenAI fallback policy and stop reason proof, release artifact hygiene result, and regenerated execution-v1 snapshot evidence/,
);
assert.match(
  decision,
  /OpenAI target production provider readiness remains blocked until a target account decision is approved, implementation is completed in the target environment, account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary live:execution-v1:openai proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary/,
);
assert.doesNotMatch(decision, /target-boundary `npm run live:execution-v1:openai` pass/);
assert.doesNotMatch(
  decision,
  /OpenAI target production provider readiness remains blocked until a target account decision is approved, billing\/quota and model access are verified, implementation is completed in the target environment, `npm run live:execution-v1:openai` passes from the approved boundary/,
);

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
assert.match(
  targetContract,
  /Target OpenAI provider account \| target OpenAI provider account is approved with account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  targetContract,
  /Target OpenAI provider account \| target OpenAI provider account is approved with account ownership, billing\/quota, API key injection, model access, provider terms, usage\/cost guard, live validation, telemetry, fallback, and renewal\/review audit decisions/,
);
assert.match(intake, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(intake, /OpenAI provider account approval/);
assert.match(releaseReadiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /target OpenAI provider account gate: passed/);
assert.match(
  releaseReadiness,
  /target OpenAI provider account gate: passed, with targetOpenAIProviderApproved false, account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, regenerated execution snapshot evidence requirements, and `productionReadyClaim: false`/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target OpenAI provider account gate: passed, with targetOpenAIProviderApproved false, account ownership, billing\/quota, API key injection, model access, provider terms, usage\/cost guard, target live validation, telemetry, fallback, renewal\/review audit requirements/,
);
assert.match(
  releaseReadiness,
  /target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary, API key and secret injection proof with approved secret manager platform proof, OPENAI_API_KEY owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof, model access proof with OPENAI_MODEL, model availability, region\/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
);
assert.match(
  releaseReadiness,
  /target OpenAI provider account remains blocked until target OpenAI provider account evidence for account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary, API key and secret injection proof with approved secret manager platform proof, OPENAI_API_KEY owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary live:execution-v1:openai proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded from the approved target boundary/,
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
assert.match(
  deployment,
  /Do not present archived OpenAI pilot live validation as target production provider approval\. Do not include OpenAI in a target production provider claim until the target OpenAI provider account is approved and account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary live:execution-v1:openai proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved production-like or hosted target environment/,
);
assert.doesNotMatch(
  deployment,
  /Do not present archived OpenAI pilot live validation as target production provider approval\. Do not include OpenAI in a target production provider claim until the target OpenAI provider account is approved and `npm run live:execution-v1:openai` passes from the approved production-like or hosted target environment/,
);
assert.match(productPlan, /\[x\] Target OpenAI provider account gate implemented/);
assert.match(readme, /docs\/target-openai-provider-account-v1\.md/);
assert.match(readme, /npm run smoke:target-openai-provider-account/);
assert.match(
  readme,
  /target OpenAI provider account evidence can be verified with `npm run smoke:target-openai-provider-account`; it proves account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetOpenAIProviderApproved: false`/,
);
assert.doesNotMatch(
  readme,
  /target OpenAI provider account evidence can be verified with `npm run smoke:target-openai-provider-account`; it proves account ownership, billing\/quota, API key injection, model access, provider terms, usage\/cost guard, target live validation, telemetry, fallback, and renewal\/review audit requirements are present/,
);

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
