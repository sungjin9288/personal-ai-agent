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
assert.match(
  decision,
  /Anthropic provider readiness remains blocked until this account decision is approved and target account evidence is generated for account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence from the approved production-like or hosted target environment/,
);
assert.doesNotMatch(
  decision,
  /Anthropic provider readiness remains blocked until this account decision is approved and Anthropic live validation evidence is generated from the approved production-like or hosted target environment/,
);

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
  /API key and secret injection proof with approved secret manager platform proof, `ANTHROPIC_API_KEY` owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof/,
  /model access proof with `ANTHROPIC_MODEL`, model availability, region\/workspace access, max token policy, fallback model, and owner approval/,
  /provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript retention policy, support owner, and evidence owner/,
  /quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence/,
  /target live validation proof with `npm run live:execution-v1:anthropic`, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference/,
  /telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner/,
  /fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence/,
  /remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date/,
  /migration plan from failed Anthropic account state to approved target Anthropic provider operation/,
  /containment plan for low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure/,
]) {
  assert.match(decision, packetItem);
}

assert.match(decision, /## Target Evidence Capture Template/);
assert.match(decision, /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, credit balances, or machine-local absolute paths/);
for (const field of [
  'targetEnvironmentName',
  'approvedAccountAlias',
  'billingCreditStatus',
  'anthropicModelAccess',
  'secretInjectionPolicy',
  'providerTermsCustomerApproval',
  'quotaSpendGuard',
  'liveValidationEvidence',
  'telemetryIncidentRoute',
  'fallbackStopCondition',
  'remediationReviewAudit',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(decision, /must reference a passed live validation generated from the approved target boundary after account remediation/);
assert.match(decision, /must prove secret values are injected and redacted through approved controls/);
assert.doesNotMatch(decision, /target secret manager alias, `ANTHROPIC_API_KEY` owner/);
assert.doesNotMatch(decision, /API key and secret injection proof with target secret manager alias/);
assert.match(decision, /target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/);
assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Provider \| Provider-Specific Blocker \| Stop Condition \| Target Stop Condition \| Evidence Command \| Shared Operations Blocker \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| anthropic \| anthropic-live-validation-remains-blocked-until-target-anthropic \| anthropic-live-env-missing \| anthropic-live-validation-missing-or-failed \| `node scripts\/build-execution-v1-evidence\.mjs --live-anthropic` \| target-provider-operations-evidence-remains-blocked-until-comple \| 2 \| 14 \| 12 \| 6 \| blocked \|/,
);
assert.match(decision, /Anthropic provider approval owns the provider-specific account and billing\/credit remediation proof/);
assert.match(decision, /Target provider operations owns the shared runtime operations proof/);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `targetAnthropicProviderApproved: false` until both linked closure verifications have same-boundary target evidence, matching Stop Condition Handoff details, accepted decision owner proof, Anthropic fallback policy and stop reason proof, release artifact hygiene result, and regenerated execution-v1 snapshot evidence/,
);
assert.match(
  decision,
  /Anthropic provider readiness remains blocked until a replacement account decision is approved, implementation is completed in the target environment, account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved boundary/,
);
assert.doesNotMatch(decision, /target-boundary `npm run live:execution-v1:anthropic` pass/);
assert.doesNotMatch(
  decision,
  /Anthropic provider readiness remains blocked until a replacement account decision is approved, billing\/credit is remediated, implementation is completed in the target environment, `npm run live:execution-v1:anthropic` passes from the approved boundary/,
);

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
assert.match(
  targetContract,
  /Target Anthropic provider account \| target Anthropic provider account is approved with account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  targetContract,
  /Target Anthropic provider account \| target Anthropic provider account is approved with account ownership, billing\/credit, API key injection, model access, provider terms, quota\/spend guard, live validation, telemetry, fallback, and remediation audit decisions/,
);
assert.match(intake, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(intake, /Anthropic provider account approval/);
assert.match(releaseReadiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /target Anthropic provider account gate: passed/);
assert.match(
  releaseReadiness,
  /target Anthropic provider account gate: passed, with targetAnthropicProviderApproved false, account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, regenerated execution snapshot evidence requirements, and `productionReadyClaim: false`/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target Anthropic provider account gate: passed, with targetAnthropicProviderApproved false, account ownership, billing\/credit, API key injection, model access, provider terms, quota\/spend guard, target live validation, telemetry, fallback, remediation audit requirements/,
);
assert.match(
  releaseReadiness,
  /target Anthropic provider account is not approved, and target Anthropic provider account evidence for account ownership proof with Anthropic account owner, organization\/workspace alias, customer scope, evidence owner, and review date, billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary, API key and secret injection proof with approved secret manager platform proof, ANTHROPIC_API_KEY owner proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage and redaction review proof, and credential containment proof, model access proof with ANTHROPIC_MODEL, model availability, region\/workspace access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript retention policy, support owner, and evidence owner, quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, customer impact rule, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date, migration plan, low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target Anthropic provider account is not approved and Anthropic live validation ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.match(security, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(deployment, /## Target Anthropic Provider Account/);
assert.match(deployment, /npm run smoke:target-anthropic-provider-account/);
assert.match(
  deployment,
  /Do not include Anthropic in a target provider claim until the target Anthropic provider account is approved and account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved production-like or hosted target environment/,
);
assert.doesNotMatch(
  deployment,
  /Do not include Anthropic in a target provider claim until the target Anthropic provider account is approved, billing\/credit is remediated, and `npm run live:execution-v1:anthropic` passes from the approved production-like or hosted target environment/,
);
assert.match(productPlan, /\[x\] Target Anthropic provider account gate implemented/);
assert.match(readme, /docs\/target-anthropic-provider-account-v1\.md/);
assert.match(readme, /npm run smoke:target-anthropic-provider-account/);
assert.match(
  readme,
  /target Anthropic provider account evidence can be verified with `npm run smoke:target-anthropic-provider-account`; it proves account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetAnthropicProviderApproved: false`/,
);
assert.doesNotMatch(
  readme,
  /target Anthropic provider account evidence can be verified with `npm run smoke:target-anthropic-provider-account`; it proves account ownership, billing\/credit, API key injection, model access, provider terms, quota\/spend guard, live validation, telemetry, fallback, and remediation audit requirements are present/,
);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-anthropic-provider-account',
      ok: true,
      path: 'docs/target-anthropic-provider-account-v1.md',
      productionReadyClaim: false,
      targetCaptureTemplate: true,
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
