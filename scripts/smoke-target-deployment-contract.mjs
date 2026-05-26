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
  'Target support operations',
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
assert.match(
  contract,
  /Hosted identity session architecture \| hosted identity session architecture is approved with customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target identity session operations \| target identity session operations evidence is captured with customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Hosted tenant isolation architecture \| hosted tenant isolation architecture is approved with tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact\/memory\/search\/export\/index partitioning proof, per-tenant encryption and key ownership proof, key rotation\/revocation\/escrow\/break-glass proof, backup creation\/restore authorization\/non-interference\/post-restore denial proof, tenant administration approval\/audit proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, migration plan, rollback, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target tenant isolation operations \| target tenant isolation operations evidence is captured with tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target provider validation \| every provider in the production claim has provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, and fallback and stop-condition evidence \| OpenAI and configured local provider live evidence are archived for the pilot boundary; Anthropic account blocker, target local provider architecture approval gap for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target provider operations \| target provider operations evidence is captured with provider account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment proof \| local target provider operations contract is present without target environment evidence \| blocked/,
);
assert.match(
  contract,
  /Target local provider architecture \| target local provider architecture is approved with endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target OpenAI provider account \| target OpenAI provider account is approved with account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary OpenAI live validation, telemetry proof, fallback and stop-condition proof, renewal and review audit proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target Anthropic provider account \| target Anthropic provider account is approved with account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation, telemetry proof, fallback and stop-condition proof, remediation audit proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target secret manager architecture \| target secret manager architecture is approved with approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target observability architecture \| target observability architecture is approved with approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, migration plan, rollback, false-positive triage, alert fatigue, customer communication containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target SLO architecture \| target SLO architecture is approved with customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage playbook proof, maintenance\/degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire containment, false-positive alert containment, alert fatigue containment, missed-SLO containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target support operations \| target support operations evidence is captured with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target SLO operations \| target SLO operations evidence is captured with customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /Target clean deployment operations \| target clean deployment operations evidence is captured with source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval, artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull\/download proof, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner, secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration\/data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke\/health proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback\/recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and failed-deployment containment plan/,
);
assert.doesNotMatch(contract, /target secret manager alias, injection path/);
assert.doesNotMatch(contract, /secret injection proof with target secret manager alias/);
assert.doesNotMatch(
  contract,
  /Target clean deployment operations \| target clean deployment operations evidence is captured with source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, and evidence retention proof/,
);
assert.match(
  contract,
  /cleanReleaseArtifactEvidence \| target clean deployment architecture, target clean deployment operations proof packet, clean deployment run, dependency\/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, release approval proof, residual risk decision, and failed-deployment containment/,
);
assert.match(
  contract,
  /SLO\/SLA operations \| customer-approved SLO\/SLA terms proof, error budget policy proof, target telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident response proof, incident review proof, provider outage handling proof, service credit proof, release artifact hygiene, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  contract,
  /Retention, export, delete \| target retention operations evidence is captured with customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence, and target backup operations evidence is captured with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  contract,
  /Hosted identity session architecture \| hosted identity session architecture is approved with customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit, break-glass, support impersonation, compliance, and retention decisions/,
);
assert.doesNotMatch(
  contract,
  /Target identity session operations \| target identity session operations evidence is captured with customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, audit export, break-glass, support impersonation, compliance, and retention proof/,
);
assert.doesNotMatch(
  contract,
  /Hosted tenant isolation architecture \| hosted tenant isolation architecture is approved with tenant identity, authorization, storage partitioning, encryption, backup\/restore, administration, cross-tenant denial, observability\/support, and lifecycle decisions/,
);
assert.doesNotMatch(
  contract,
  /Target tenant isolation operations \| target tenant isolation operations evidence is captured with tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant containment proof/,
);
assert.doesNotMatch(
  contract,
  /Target OpenAI provider account \| target OpenAI provider account is approved with account ownership, billing\/quota, API key injection, model access, provider terms, usage\/cost guard, live validation, telemetry, fallback, and renewal\/review audit decisions/,
);
assert.doesNotMatch(
  contract,
  /Target Anthropic provider account \| target Anthropic provider account is approved with account ownership, billing\/credit, API key injection, model access, provider terms, quota\/spend guard, live validation, telemetry, fallback, and remediation audit decisions/,
);
assert.doesNotMatch(
  contract,
  /Target local provider architecture \| target local provider architecture is approved with endpoint ownership, model pinning, network isolation, credential policy, runtime lifecycle, session provenance, data residency, quota\/resource guard, telemetry, fallback, and customer approval decisions/,
);
assert.doesNotMatch(
  contract,
  /Target secret manager architecture \| target secret manager architecture is approved with platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, and disaster recovery decisions/,
);

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
assert.match(
  contract,
  /providerReadinessEvidence \| completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection proof, target-boundary live validation proof, quota, cost, and resource guard proof, fallback and stop-condition evidence, and provider failure containment proof \| must prove all providers included in the target claim are approved and live-validated from the target boundary/,
);
assert.match(
  contract,
  /identityTenantEvidence \| hosted identity\/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, target identity\/session operations, hosted tenant isolation approval, tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, target tenant isolation operations, RBAC\/session audit, tenant storage boundary, storage partitioning proof, encryption\/key ownership proof, backup\/restore isolation proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  contract,
  /identityTenantEvidence \| hosted identity\/session approval, target identity\/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC\/session audit, tenant storage boundary, encryption\/key ownership, and cross-tenant denial evidence/,
);
assert.match(
  contract,
  /secretObservabilityEvidence \| target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  contract,
  /dataLifecycleSupportEvidence \| target data lifecycle approval, target retention operations evidence with customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence, target backup operations evidence with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence, target support operations evidence with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  contract,
  /secretObservabilityEvidence \| target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, telemetry backend, alert route, log\/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence/,
);
assert.match(contract, /must record why `productionReadyClaim` remains false when any mandatory target evidence is missing/);
assert.match(
  contract,
  /target environment evidence intake, target provider evidence intake, target provider operations, target identity\/session operations, target tenant isolation operations, target observability architecture, target observability operations, target SLO architecture, target SLO operations, target clean deployment operations, release artifact hygiene, production-like release drill, clean deployment release, and production readiness gate evidence/,
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
  /stop production-ready claims if any provider included in the production claim lacks provider account approval proof, target secret injection proof, target-boundary live validation proof, quota and cost guard proof, model and endpoint pinning proof, and fallback and stop-condition evidence/,
  /stop target provider operations claims until provider inventory proof, account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment evidence are captured/,
  /stop OpenAI production provider claims until the target OpenAI provider account record is approved and account ownership proof, billing and quota proof, API key and secret injection proof, OPENAI_MODEL model access proof, provider terms and customer approval proof, usage and cost guard proof, target-boundary live:execution-v1:openai proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, renewal and review audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop Anthropic provider claims until the target Anthropic provider account record is approved and account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, remediation audit proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop local provider claims until the target local provider architecture record is approved and endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop Hermes provider claims until the target Hermes provider architecture record is approved and endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, customer approval proof, provider operations proof, target-boundary live:execution-v1:hermes proof, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop production-ready claims if the target environment evidence intake packet is incomplete/,
  /stop hosted SaaS claims until the hosted SaaS architecture decision record is approved and target evidence is generated/,
  /stop hosted identity-backed RBAC claims until the hosted identity session architecture record is approved and customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop target identity\/session operations claims until customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop hosted multi-tenant isolation claims until the hosted tenant isolation architecture record is approved and tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact\/memory\/search\/export\/index partitioning proof, per-tenant encryption and key ownership proof, key rotation\/revocation\/escrow\/break-glass proof, backup creation\/restore authorization\/non-interference\/post-restore denial proof, tenant administration approval\/audit proof, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof, lifecycle isolation proof, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop target tenant isolation operations claims until tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop target secret manager claims until the target secret manager architecture record is approved and approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop target observability claims until the target observability architecture record is approved and approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, migration plan, rollback, false-positive triage, alert fatigue, customer communication containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist/,
  /stop enterprise RBAC claims until identity-backed user\/session lifecycle/,
  /stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured/,
  /stop target SLO\/SLA claims until the target SLO architecture record is approved and customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, customer communication proof, incident review proof, provider outage playbook proof, maintenance\/degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire containment, false-positive alert containment, alert fatigue containment, missed-SLO containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
  /stop target SLO operations claims until customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop target support claims until the target support architecture record is approved and staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop target data lifecycle claims until the target data lifecycle architecture record is approved and target data lifecycle evidence is generated/,
  /stop retention\/delete claims until customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop observability claims until telemetry ingestion proof, alert delivery proof, trace\/log retention proof, staffed on-call routing and acknowledgement proof, customer-facing status communication proof, incident response proof, incident review history proof, audit export proof, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
  /stop SLO\/SLA claims until customer-approved SLO\/SLA terms proof, error budget policy proof, target telemetry measurement proof, alert acknowledgement proof, staffed on-call proof, incident response proof, customer communication proof, service credit proof, release artifact hygiene result, and regenerated execution snapshot evidence exist/,
  /stop target clean deployment claims until the target clean deployment architecture record is approved and source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke\/health verification, rollback\/recovery, release approval, and failed-deployment containment evidence are generated/,
  /stop target clean deployment operations claims until source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval, artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull\/download proof, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner, secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration\/data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke\/health proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback\/recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and failed-deployment containment plan are captured/,
  /stop clean deployment claims until source provenance, artifact registry, dependency install, runtime bootstrap, secret injection, environment boundary, smoke\/health, rollback, and release approval evidence are captured/,
  /stop customer support claims until staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence are proven in the target environment/,
]) {
  assert.match(contract, blocker);
}
assert.doesNotMatch(contract, /target-boundary npm run live:execution-v1:(openai|anthropic|local|hermes) pass/);
assert.doesNotMatch(
  contract,
  /quota\/cost guard|model\/endpoint pinning|quota\/cost\/resource guard|fallback\/disable path|data\/transcript handling|remediation\/renewal/,
);
assert.doesNotMatch(
  contract,
  /stop target secret manager claims until the target secret manager architecture record is approved and target secret manager evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop target observability claims until the target observability architecture record is approved and target observability evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop target SLO\/SLA claims until the target SLO architecture record is approved and target SLO evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop target SLO operations claims until customer-approved SLO\/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance\/degradation, service credit, evidence retention, and missed-SLO containment evidence are captured/,
);
assert.doesNotMatch(
  contract,
  /stop SLO\/SLA claims until target telemetry, alerting, on-call, incident response, customer SLO terms, error budget, and service credit evidence exist/,
);
assert.doesNotMatch(
  contract,
  /stop observability claims until target observability telemetry, alert delivery, log\/trace retention, staffed on-call route, customer status communication, and incident review evidence are captured/,
);
assert.doesNotMatch(
  contract,
  /stop retention\/delete claims until target retention configuration, export approval, delete workflow, provider transcript handling, target backup execution, encrypted storage, backup expiry, and post-delete absence evidence are captured/,
);
assert.doesNotMatch(
  contract,
  /stop Hermes provider claims until the target Hermes provider architecture record is approved and endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and Hermes live validation evidence are generated/,
);
assert.doesNotMatch(
  contract,
  /stop hosted multi-tenant isolation claims until the hosted tenant isolation architecture record is approved and target isolation evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop target tenant isolation operations claims until tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment evidence are captured/,
);
assert.doesNotMatch(
  contract,
  /stop OpenAI production provider claims until the target OpenAI provider account record is approved and OpenAI target-boundary live validation evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop Anthropic provider claims until the target Anthropic provider account record is approved and Anthropic live validation evidence is generated/,
);
assert.doesNotMatch(
  contract,
  /stop target clean deployment operations claims until source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, evidence retention, and failed-deployment containment evidence are captured/,
);

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
  /secret and observability evidence with target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  releaseReadiness,
  /target deployment contract remains blocked until target deployment name proof with approved environment, company\/workspace scope, deployment owner, evidence owner, review date, and release label, deployment profile decision proof with approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval, mandatory control evidence with required command output, production readiness gate result, and unresolved blocker list, provider readiness evidence, identity and tenant evidence, secret and observability evidence, data lifecycle and support evidence, clean release artifact evidence, stop-condition decision, production-ready claim decision, target environment submission packet, artifact hygiene result, production-like drill result, reviewer decision, and regenerated execution snapshot are recorded from the same approved target boundary/,
);
assert.doesNotMatch(
  releaseReadiness,
  /secret and observability evidence with target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture, target SLO operations, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  releaseReadiness,
  /identity and tenant evidence with hosted identity\/session approval, target identity\/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC\/session audit, tenant storage boundary, encryption\/key ownership, and cross-tenant denial evidence/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('target deployment contract is not satisfied by target-environment evidence'),
);
assert.doesNotMatch(
  releaseReadiness,
  /target deployment contract is blocked until hosted identity\/session proof, target identity\/session operations proof, hosted tenant isolation proof, target tenant isolation operations proof, target provider operations, target OpenAI provider account, target Anthropic provider account, target local provider architecture, target Hermes provider architecture, target secret manager architecture proof, target secret manager injection\/audit, target observability architecture proof, target observability operations proof, target SLO architecture proof, target SLO operations proof, target data lifecycle architecture, target retention operations, target backup operations, target support architecture, target support operations, target clean deployment architecture, target clean deployment operations, SLO\/SLA, clean deployment, and support escalation review have target-environment evidence/,
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
