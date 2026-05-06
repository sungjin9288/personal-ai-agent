import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-hermes-provider-architecture-v1.md');
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
  packageJson.scripts['smoke:target-hermes-provider-architecture'],
  'node scripts/smoke-target-hermes-provider-architecture.mjs',
);

assert.match(decision, /^# Target Hermes Provider Architecture v1$/m);
assert.match(decision, /^- status: local-target-hermes-provider-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetHermesProviderApproved: false$/m);
assert.match(decision, /not Hermes live validation proof/);
assert.match(decision, /not endpoint ownership proof/);
assert.match(decision, /not target secret manager injection proof/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Hermes provider readiness remains blocked/);

for (const area of [
  'Endpoint ownership',
  'Model pinning',
  'Secret injection',
  'Tool-call parsing',
  'Session lifecycle',
  'Data and transcript policy',
  'Quota and rate guard',
  'Telemetry and failure taxonomy',
  'Fallback and stop condition',
  'Customer approval',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record/,
  /model pinning proof with `HERMES_PROVIDER_MODEL`, model version\/source, compatibility profile, max token policy, fallback model, and owner approval/,
  /secret injection proof with target secret manager alias, API key requirement decision, rotation path, break-glass owner, access audit, and redaction result/,
  /tool-call parsing proof with Hermes `<tool_call>` sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence/,
  /session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference/,
  /data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence/,
  /quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review/,
  /telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner/,
  /fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision/,
  /customer approval proof with provider terms, allowed workspace\/customer, data-processing approval, support owner, evidence owner, and next review date/,
  /migration plan from local Hermes adapter smoke to approved target Hermes provider operation/,
  /explicit containment plan for missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:hermes-provider',
  'npm run preflight:execution-v1:hermes',
  'npm run live:execution-v1:hermes',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(providerReadiness, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(providerReadiness, /target Hermes provider architecture/);
assert.match(targetProviderIntake, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(targetProviderIntake, /Hermes provider architecture approval/);
assert.match(targetContract, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(targetContract, /target Hermes provider architecture is approved/);
assert.match(intake, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(intake, /Hermes provider architecture approval/);
assert.match(releaseReadiness, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target Hermes provider architecture gate: passed/);
assert.match(security, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(deployment, /## Target Hermes Provider Architecture/);
assert.match(deployment, /npm run smoke:target-hermes-provider-architecture/);
assert.match(productPlan, /\[x\] Target Hermes provider architecture gate implemented/);
assert.match(readme, /docs\/target-hermes-provider-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-hermes-provider-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-hermes-provider-architecture',
      ok: true,
      path: 'docs/target-hermes-provider-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 10,
      targetHermesProviderApproved: false,
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
