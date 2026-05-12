import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-local-provider-architecture-v1.md');
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
  packageJson.scripts['smoke:target-local-provider-architecture'],
  'node scripts/smoke-target-local-provider-architecture.mjs',
);

assert.match(decision, /^# Target Local Provider Architecture v1$/m);
assert.match(decision, /^- status: local-target-local-provider-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetLocalProviderApproved: false$/m);
assert.match(decision, /not local provider live validation proof/);
assert.match(decision, /not endpoint ownership proof/);
assert.match(decision, /not model availability proof/);
assert.match(decision, /not network isolation proof/);
assert.match(decision, /not data residency proof/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Local provider readiness remains blocked/);

for (const area of [
  'Endpoint ownership',
  'Model pinning',
  'Network isolation',
  'Secret and credential policy',
  'Runtime lifecycle',
  'Session and artifact provenance',
  'Data residency and transcript policy',
  'Quota and resource guard',
  'Telemetry and failure taxonomy',
  'Fallback and customer approval',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record/,
  /model pinning proof with `LOCAL_PROVIDER_MODEL`, model source\/version, compatibility profile, max token policy, fallback model, and owner approval/,
  /network isolation proof with host boundary, ingress policy, egress policy, tenant\/customer boundary, operator access policy, and firewall decision/,
  /secret and credential policy proof with auth mode, API key requirement, target secret manager alias when used, rotation path, redaction result, and access audit/,
  /runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention/,
  /session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference/,
  /data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence/,
  /quota and resource guard proof with CPU\/GPU\/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval/,
  /telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage\/resource metrics, alert route, and incident owner/,
  /fallback and customer approval proof with fallback provider, degraded mode, customer impact rule, manual approval path, provider terms\/local model license decision, and residual risk owner/,
  /migration plan from local provider adapter smoke to approved target local provider operation/,
  /containment plan for missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure/,
]) {
  assert.match(decision, packetItem);
}

assert.match(decision, /## Target Evidence Capture Template/);
assert.match(decision, /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, or machine-local absolute paths/);
for (const field of [
  'targetEnvironmentName',
  'approvedBaseUrlAlias',
  'localProviderModel',
  'networkIsolation',
  'credentialPolicy',
  'runtimeLifecycle',
  'liveValidationEvidence',
  'dataResidencyPolicy',
  'quotaResourceGuard',
  'telemetryAndIncidentRoute',
  'fallbackCustomerApproval',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(decision, /must reference a passed live validation generated from the approved target boundary/);
assert.match(decision, /must prove secret values are injected and redacted through approved controls/);
assert.match(decision, /target provider evidence intake, target provider operations, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/);

for (const command of [
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:local-provider',
  'npm run preflight:execution-v1:local',
  'npm run live:execution-v1:local',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(providerReadiness, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(providerReadiness, /target local provider architecture/);
assert.match(targetProviderIntake, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(targetProviderIntake, /local provider architecture approval/);
assert.match(targetContract, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(targetContract, /target local provider architecture is approved/);
assert.match(intake, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(intake, /local provider architecture approval/);
assert.match(releaseReadiness, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target local provider architecture gate: passed/);
assert.match(security, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(deployment, /## Target Local Provider Architecture/);
assert.match(deployment, /npm run smoke:target-local-provider-architecture/);
assert.match(productPlan, /\[x\] Target local provider architecture gate implemented/);
assert.match(readme, /docs\/target-local-provider-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-local-provider-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-local-provider-architecture',
      ok: true,
      path: 'docs/target-local-provider-architecture-v1.md',
      productionReadyClaim: false,
      targetCaptureTemplate: true,
      requiredCommandCount: 10,
      targetLocalProviderApproved: false,
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
