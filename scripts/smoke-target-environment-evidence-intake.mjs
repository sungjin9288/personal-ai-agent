import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const intake = readRequiredFile(intakePath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-environment-evidence-intake'],
  'node scripts/smoke-target-environment-evidence-intake.mjs',
);

assert.match(intake, /^# Target Environment Evidence Intake v1$/m);
assert.match(intake, /^- status: local-target-environment-evidence-intake-current$/m);
assert.match(intake, /^- productionReadyClaim: false$/m);
assert.match(intake, /not hosted production evidence/);
assert.match(intake, /not a completed customer deployment/);
assert.match(intake, /not permission to claim `production-ready`/);
assert.match(intake, /Production-ready remains blocked until every target environment domain below has evidence/);

for (const domain of [
  'Deployment boundary',
  'Identity and sessions',
  'Tenant storage and encryption',
  'Provider and secret manager',
  'Observability and SLO/SLA',
  'Retention, export, delete, and backup',
  'Support operations',
  'Clean release and artifact hygiene',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(domain)} \\|`), domain);
}

for (const checklistItem of [
  /target environment name, owner, profile, and deployment boundary/,
  /target identity session operations evidence for customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, and retention/,
  /target tenant isolation operations evidence for tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment/,
  /selected production providers and completed provider evidence intake references/,
  /target OpenAI provider account approval when OpenAI is included/,
  /target Anthropic provider account approval when Anthropic is included/,
  /target local provider architecture approval when local provider is included/,
  /target Hermes provider architecture approval when Hermes is included/,
  /target provider operations evidence for account approval, target secret injection, target-boundary live validation, model\/endpoint pinning, quota\/cost\/resource guard, fallback\/disable path, telemetry, incident triage, data\/transcript handling, remediation\/renewal, evidence retention, and provider failure containment/,
  /identity provider, role owner, session policy, and permission audit evidence/,
  /tenant storage boundary, encryption\/key policy, backup\/restore isolation, and tenant admin evidence/,
  /target secret manager aliases, rotation evidence, revocation path, and break-glass approval/,
  /target SLO\/SLA terms, error budget owner, telemetry backend, alert route, on-call owner, customer status route, and incident review record/,
  /target SLO operations evidence for customer-approved SLO\/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance\/degradation, service credit, evidence retention, and missed-SLO containment/,
  /retention classes, export approval, delete execution proof, provider transcript policy, and post-delete absence evidence/,
  /backup schedule, restore validation, backup expiry\/deletion, and disaster recovery evidence/,
  /target support architecture approval, support queue, staffed coverage, escalation owner, ticket audit trail, and incident review cadence/,
  /clean deployment architecture approval, target clean deployment operations evidence, clean deployment run, rollback proof, release snapshot, export package, artifact hygiene result, and failed-deployment containment/,
  /accepted risks, decision owner, and next review date/,
]) {
  assert.match(intake, checklistItem);
}

for (const command of [
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:target-clean-deployment-architecture',
  'npm run smoke:target-clean-deployment-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:clean-deployment-release',
  'npm run smoke:production-like-release-drill',
  'npm run smoke:pilot-export-package',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(intake, new RegExp(escapeRegExp(command)));
}

assert.match(targetContract, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(intake, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(intake, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(intake, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(intake, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(intake, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(intake, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(intake, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(intake, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(intake, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(intake, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(intake, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(intake, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(intake, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(intake, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(intake, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(intake, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(intake, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(targetContract, /npm run smoke:target-environment-evidence-intake/);
assert.match(targetContract, /target environment evidence intake packet/);
assert.match(releaseReadiness, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /target environment evidence intake gate: passed/);
assert.match(security, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(deployment, /## Target Environment Evidence Intake/);
assert.match(deployment, /npm run smoke:target-environment-evidence-intake/);
assert.match(productPlan, /\[x\] Target environment evidence intake gate implemented/);
assert.match(readme, /docs\/target-environment-evidence-intake-v1\.md/);
assert.match(readme, /npm run smoke:target-environment-evidence-intake/);

console.log(
  JSON.stringify(
    {
      domainCount: 8,
      mode: 'target-environment-evidence-intake',
      ok: true,
      path: 'docs/target-environment-evidence-intake-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 24,
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
