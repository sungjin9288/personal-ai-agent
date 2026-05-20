import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const contractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const contract = readRequiredFile(contractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-deployment-contract'], 'node scripts/smoke-target-deployment-contract.mjs');

assert.match(contract, /^# Target Deployment Contract v1$/m);
assert.match(contract, /^- status: target-contract-current$/m);
assert.match(contract, /^- productionReadyClaim: false$/m);
assert.match(contract, /not permission to claim `production-ready`/);
assert.match(contract, /OpenAI-scoped pilot-ready only/);

for (const heading of [
  '## Decision Boundary',
  '## Target Deployment Profiles',
  '## Mandatory Controls',
  '## Target Evidence Capture Template',
  '## Required Commands',
  '## Blocking Rules',
  '## Operator Handoff',
]) {
  assert.match(contract, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const profile of [
  'Self-hosted local-first pilot',
  'Production-like single-tenant deployment',
  'Hosted multi-tenant SaaS',
  'Hybrid control plane',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(profile)} \\|`));
}
assert.match(contract, /blocked by unapproved ADR/);

for (const control of [
  'Hosted SaaS architecture decision',
  'Hosted identity session architecture',
  'Target identity session operations',
  'Hosted tenant isolation architecture',
  'Target tenant isolation operations',
  'Target secret manager architecture',
  'Target provider validation',
  'Target provider operations',
  'Target OpenAI provider account',
  'Target Anthropic provider account',
  'Target local provider architecture',
  'Target Hermes provider architecture',
  'Identity-backed RBAC and session administration',
  'Hosted tenant isolation',
  'Secret management',
  'Target observability architecture',
  'Target SLO architecture',
  'Target SLO operations',
  'Target support architecture',
  'Target data lifecycle architecture',
  'Target clean deployment architecture',
  'Target clean deployment operations',
  'Retention, export, delete',
  'SLO/SLA operations',
  'Clean deployment release',
  'Customer support operations',
  'Target environment evidence intake',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

assert.match(contract, /## Target Evidence Capture Template/);
assert.match(
  contract,
  /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, customer personal data, tenant payloads, private account identifiers, or machine-local absolute paths/,
);
for (const field of [
  'targetDeploymentName',
  'deploymentProfileDecision',
  'mandatoryControlEvidence',
  'providerReadinessEvidence',
  'identityTenantEvidence',
  'secretObservabilityEvidence',
  'dataLifecycleSupportEvidence',
  'cleanReleaseArtifactEvidence',
  'stopConditionDecision',
  'productionReadyClaimDecision',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(contract, /must map the deployment to one target deployment profile without claiming an unapproved profile/);
assert.match(contract, /must prove every control row was reviewed against target evidence from the same boundary/);
assert.match(contract, /must record why `productionReadyClaim` remains false when any mandatory target evidence is missing/);
assert.match(
  contract,
  /target environment evidence intake, target provider evidence intake, target provider operations, target identity\/session operations, target tenant isolation operations, target SLO operations, target clean deployment operations, release artifact hygiene, production-like release drill, clean deployment release, and production readiness gate evidence/,
);

for (const command of [
  'npm run smoke:target-deployment-contract',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:hosted-saas-architecture-decision',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:identity-session-admin',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:production-retention-operating',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:secret-management',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:target-clean-deployment-architecture',
  'npm run smoke:target-clean-deployment-operations',
  'npm run smoke:production-slo-operating',
  'npm run smoke:clean-deployment-release',
]) {
  assert.match(contract, new RegExp(escapeRegExp(command)));
}

for (const blocker of [
  /stop production-ready claims if any provider included in the production claim lacks provider account approval, target secret injection, target-boundary live validation, quota\/cost guard, model\/endpoint pinning, and fallback evidence/,
  /stop target provider operations claims until provider inventory, account approval, target secret injection, target-boundary live validation, model\/endpoint pinning, quota\/cost\/resource guard, fallback\/disable path, provider fallback runtime audit, telemetry, incident triage, data\/transcript handling, remediation\/renewal, evidence retention, and provider failure containment evidence are captured/,
  /stop OpenAI production provider claims until the target OpenAI provider account record is approved and OpenAI target-boundary live validation evidence is generated/,
  /stop Anthropic provider claims until the target Anthropic provider account record is approved and Anthropic live validation evidence is generated/,
  /stop local provider claims until the target local provider architecture record is approved and target-boundary endpoint\/model, network isolation, telemetry, quota\/resource guard, and local provider live validation evidence are generated/,
  /stop Hermes provider claims until the target Hermes provider architecture record is approved and endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and Hermes live validation evidence are generated/,
  /stop production-ready claims if the target environment evidence intake packet is incomplete/,
  /stop hosted SaaS claims until the hosted SaaS architecture decision record is approved and target evidence is generated/,
  /stop hosted identity-backed RBAC claims until the hosted identity session architecture record is approved and target identity\/session evidence is generated/,
  /stop target identity\/session operations claims until customer IdP integration, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, retention, and customer access containment evidence are captured/,
  /stop hosted multi-tenant isolation claims until the hosted tenant isolation architecture record is approved and target isolation evidence is generated/,
  /stop target tenant isolation operations claims until tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment evidence are captured/,
  /stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist/,
  /stop enterprise RBAC claims until identity-backed user\/session lifecycle/,
  /stop target secret manager claims until the target secret manager architecture record is approved and target secret manager evidence is generated/,
  /stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured/,
  /stop target observability claims until the target observability architecture record is approved and target observability evidence is generated/,
  /stop target SLO\/SLA claims until the target SLO architecture record is approved and target SLO evidence is generated/,
  /stop target SLO operations claims until customer-approved SLO\/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance\/degradation, service credit, evidence retention, and missed-SLO containment evidence are captured/,
  /stop target support claims until the target support architecture record is approved and target support evidence is generated/,
  /stop target data lifecycle claims until the target data lifecycle architecture record is approved and target data lifecycle evidence is generated/,
  /stop retention\/delete claims until target retention configuration, export approval, delete workflow, provider transcript handling, target backup execution, encrypted storage, backup expiry, and post-delete absence evidence are captured/,
  /stop observability claims until target observability telemetry, alert delivery, log\/trace retention, staffed on-call route, customer status communication, and incident review evidence are captured/,
  /stop SLO\/SLA claims until target telemetry, alerting, on-call, incident response, customer SLO terms, error budget, and service credit evidence exist/,
  /stop target clean deployment claims until the target clean deployment architecture record is approved and source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke\/health verification, rollback\/recovery, release approval, and failed-deployment containment evidence are generated/,
  /stop target clean deployment operations claims until source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, evidence retention, and failed-deployment containment evidence are captured/,
  /stop clean deployment claims until source provenance, artifact registry, dependency install, runtime bootstrap, secret injection, environment boundary, smoke\/health, rollback, and release approval evidence are captured/,
  /stop customer support claims until staffed ownership, support queue routing, customer communication route, ticket audit history, on-call handoff, and incident review cadence are proven in the target environment/,
]) {
  assert.match(contract, blocker);
}

assert.match(releaseReadiness, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(contract, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(contract, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(contract, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(contract, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(contract, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(contract, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(contract, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(contract, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(contract, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(contract, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(contract, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(contract, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(contract, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(contract, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(contract, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(contract, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(contract, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(contract, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(contract, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(contract, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(releaseReadiness, /target deployment contract gate: passed/);
assert.match(
  releaseReadiness,
  /target deployment contract evidence for target deployment name with approved target environment name, company\/workspace scope, deployment owner, evidence owner, review date, and release label, deployment profile decision with selected deployment profile, approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval reference, mandatory control evidence with every mandatory control, required command output, production readiness gate result, and unresolved blocker list, provider readiness evidence with completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection, target-boundary live validation, quota\/cost\/resource guard, fallback evidence, and provider failure containment proof, identity and tenant evidence with hosted identity\/session approval, target identity\/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC\/session audit, tenant storage boundary, encryption\/key ownership, and cross-tenant denial evidence, secret and observability evidence with target secret manager approval, rotation\/revocation evidence, telemetry backend, alert route, log\/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence, data lifecycle and support evidence with target data lifecycle approval, retention\/export\/delete proof, provider transcript handling, backup\/restore evidence, support architecture approval, staffed support route, escalation audit, customer communication route, and incident review cadence, clean release artifact evidence with target clean deployment architecture, target clean deployment operations, clean deployment run, dependency\/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, and failed-deployment containment, stop-condition decision with explicit stop conditions, residual blockers, accepted risks, blocker owner, remediation owner, and next review date, and production-ready claim decision with decision owner, approval or rejection summary, allowed claim text, evidence commit, snapshot path, and regeneration command references is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('target deployment contract is not satisfied by target-environment evidence'),
);
assert.match(security, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(security, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(deployment, /## Target Deployment Contract/);
assert.match(deployment, /npm run smoke:target-deployment-contract/);
assert.match(productPlan, /\[x\] Target deployment contract gate implemented/);
assert.match(readme, /npm run smoke:target-deployment-contract/);

console.log(
  JSON.stringify(
    {
      controlCount: 27,
      mode: 'target-deployment-contract',
      ok: true,
      path: 'docs/target-deployment-contract-v1.md',
      productionReadyClaim: false,
      profileCount: 4,
      targetCaptureTemplate: true,
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
