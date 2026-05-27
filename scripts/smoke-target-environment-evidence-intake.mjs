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
  /completed target environment evidence capture template for the approved production-like or hosted boundary/,
  /target environment name, owner, profile, and deployment boundary/,
  /hosted identity\/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, target identity session operations evidence, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /completed target identity\/session operations evidence capture template for the approved production-like or hosted boundary/,
  /target tenant isolation operations evidence for tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /completed target tenant isolation operations evidence capture template for the approved production-like or hosted boundary/,
  /selected production providers and completed provider evidence intake references/,
  /target OpenAI provider account approval when OpenAI is included/,
  /target Anthropic provider account approval when Anthropic is included/,
  /target local provider architecture approval when local provider is included/,
  /target Hermes provider architecture approval when Hermes is included/,
  /target provider operations evidence for account approval proof, target secret injection proof, target-boundary live validation proof, model and endpoint pinning proof, quota, cost, and resource guard proof, fallback and disable path proof, provider fallback runtime audit proof, telemetry proof, incident triage proof, data and transcript handling proof, remediation and renewal review proof, evidence retention proof, and provider failure containment/,
  /identity provider owner, role owner, session policy owner, permission audit evidence, break-glass governance owner, support impersonation owner, compliance\/retention owner, and customer access containment evidence/,
  /tenant storage boundary, storage partitioning proof, encryption\/key policy, backup\/restore isolation proof, tenant admin evidence, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target secret manager architecture approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, credential containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert delivery proof, log and trace retention proof, staffed on-call routing and acknowledgement proof, customer status communication proof, incident response proof, incident review proof, audit export proof, disaster recovery proof, target SLO architecture approval proof, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, provider outage handling proof, maintenance and degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target SLO operations evidence for customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target retention operations evidence for customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target backup operations evidence for backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /target support operations evidence for target support architecture approval, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
  /clean deployment architecture approval, target clean deployment operations evidence for source provenance proof, artifact registry proof, dependency installation proof, runtime bootstrap proof, target secret injection proof, environment boundary proof, migration\/data readiness proof, smoke\/health proof, rollback\/recovery proof, release approval proof, evidence retention proof, and failed-deployment containment, clean deployment run, rollback proof, release snapshot, export package, artifact hygiene result, and failed-deployment containment/,
  /completed target environment evidence submission packet with sanitized manifest, evidence register, reviewer decision, command rerun log, and residual blocker register/,
  /completed target blocker disposition register with owner, current state, required closing evidence, allowed claim impact, and next verification command/,
  /accepted risks, decision owner, and next review date/,
]) {
  assert.match(intake, checklistItem);
}

assert.match(intake, /## Target Evidence Capture Template/);
assert.match(intake, /Do not record raw API keys, tokens, private endpoint credentials, customer secrets, billing identifiers, customer personal data, tenant payloads, or machine-local absolute paths/);
for (const field of [
  'targetEnvironmentName',
  'deploymentBoundaryEvidence',
  'identitySessionEvidence',
  'tenantIsolationEvidence',
  'providerSecretEvidence',
  'observabilitySloEvidence',
  'retentionBackupEvidence',
  'supportOperationsEvidence',
  'cleanReleaseEvidence',
  'acceptedRiskDecision',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(intake, /must reference target identity session operations evidence generated from the same boundary/);
assert.match(intake, /must prove provider credentials and provider live validation are target-approved without exposing secret values/);
assert.match(
  intake,
  /Identity and sessions \| hosted identity\/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, target identity session operations evidence, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  intake,
  /identitySessionEvidence \| hosted identity\/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment evidence, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /Tenant storage and encryption \| tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, target tenant isolation operations evidence, tenant data containment proof, release artifact hygiene, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  intake,
  /tenantIsolationEvidence \| tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-scoped authorization proof, service-to-service tenant propagation proof, stale permission denial proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment evidence, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  intake,
  /Identity and sessions \| user lifecycle, session lifecycle, role assignment\/revocation, logout\/revocation behavior, audit trail, target identity session operations evidence, and customer IdP proof are proven/,
);
assert.doesNotMatch(
  intake,
  /identitySessionEvidence \| customer IdP proof, user lifecycle, session lifecycle, role assignment\/revocation, permission propagation, audit export, break-glass, support impersonation, compliance, and retention evidence/,
);
assert.doesNotMatch(
  intake,
  /Tenant storage and encryption \| tenant partitioning, tenant admin workflow, per-tenant encryption\/key policy, backup\/restore isolation, cross-tenant denial, target tenant isolation operations evidence, and tenant data containment proof are proven/,
);
assert.doesNotMatch(
  intake,
  /tenantIsolationEvidence \| tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment evidence/,
);
assert.match(
  intake,
  /Provider and secret manager \| provider account approval, OpenAI provider account approval when OpenAI is included, Anthropic provider account approval when Anthropic is included, local provider architecture approval when local provider is included, Hermes provider architecture approval when Hermes is included, target provider operations evidence, target secret manager architecture approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, target secret manager injection, revocation, and live validation are proven/,
);
assert.match(
  intake,
  /Observability and SLO\/SLA \| target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert delivery proof, log and trace retention proof, staffed on-call routing and acknowledgement proof, customer status communication proof, incident response proof, incident review proof, audit export proof, disaster recovery proof, target SLO architecture approval proof, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, provider outage handling proof, maintenance and degradation proof, service credit proof, target SLO operations evidence, evidence retention proof, missed-SLO containment proof, customer SLO\/SLA review proof, release artifact hygiene result, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  intake,
  /providerSecretEvidence \| selected providers, completed provider evidence intake references, provider account\/architecture approvals, target secret manager architecture approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation proof, audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, credential containment proof, release artifact hygiene result, regenerated execution snapshot evidence, and target-boundary live validation evidence/,
);
assert.match(
  intake,
  /observabilitySloEvidence \| target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, alert acknowledgement proof, staffed on-call coverage proof, log and trace retention proof, customer status communication proof, incident response proof, incident review proof, audit export proof, disaster recovery proof, target SLO architecture approval proof, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, staffed on-call response proof, customer communication proof, provider outage handling proof, maintenance and degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /Retention, export, delete, and backup \| target data lifecycle approval, customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  intake,
  /retentionBackupEvidence \| customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /Support operations \| target support architecture approval, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence are proven/,
);
assert.match(
  intake,
  /supportOperationsEvidence \| target support architecture approval, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /target deployment contract, target provider evidence intake, target provider operations, target secret manager architecture, target secret manager, target identity\/session operations, target tenant isolation operations, target observability architecture, target observability operations, target SLO architecture, target SLO operations, target clean deployment operations, release artifact hygiene, and production readiness gate evidence/,
);
assert.match(
  intake,
  /Clean release and artifact hygiene \| clean deployment architecture approval, target clean deployment operations proof packet, clean checkout deployment, dependency\/runtime proof, rollback proof, release approval proof, release snapshot, export package, and hygiene report are generated from the target boundary/,
);
assert.match(
  intake,
  /cleanReleaseEvidence \| target clean deployment operations evidence for source provenance proof, artifact registry proof, dependency installation proof, runtime bootstrap proof, target secret injection proof, environment boundary proof, migration\/data readiness proof, smoke\/health proof, rollback\/recovery proof, release approval proof, evidence retention proof, and failed-deployment containment, clean deployment run, dependency\/runtime proof, release snapshot, pilot\/export package, artifact hygiene result, rollback proof, release approval proof, and failed-deployment containment/,
);
assert.doesNotMatch(
  intake,
  /cleanReleaseEvidence \| target clean deployment operations evidence, clean deployment run, dependency\/runtime proof, release snapshot, pilot\/export package, artifact hygiene result, rollback proof, and failed-deployment containment/,
);
assert.doesNotMatch(
  intake,
  /Observability and SLO\/SLA \| target SLO architecture approval, target SLO operations evidence, telemetry backend approval, telemetry ingestion, alert delivery, log\/trace retention, staffed on-call routing, incident review, and customer SLO\/SLA review are proven/,
);
assert.doesNotMatch(
  intake,
  /observabilitySloEvidence \| SLO\/SLA terms, error budget owner, telemetry backend, telemetry ingestion, alert route, alert acknowledgement, on-call owner, customer status route, incident review, provider outage handling, and missed-SLO containment/,
);
assert.doesNotMatch(
  intake,
  /target secret manager aliases, rotation evidence, revocation path, and break-glass approval/,
);
assert.doesNotMatch(
  intake,
  /providerSecretEvidence \| selected providers, completed provider evidence intake references, provider account\/architecture approvals, target secret manager aliases, rotation proof, revocation path, break-glass approval, and target-boundary live validation evidence/,
);
assert.doesNotMatch(
  intake,
  /retentionBackupEvidence \| retention classes, export approval, delete execution proof, provider transcript policy, post-delete absence evidence, backup schedule, restore validation, backup expiry\/deletion, and disaster recovery evidence/,
);

assert.match(intake, /## Target Evidence Submission Packet/);
assert.match(
  intake,
  /Do not attach raw tenant payloads, customer personal data, provider secret values, raw API tokens, private endpoint credentials, private tenant identifiers, billing identifiers, or machine-local absolute paths/,
);
for (const packetItem of [
  'submissionManifest',
  'sanitizedEvidenceRegister',
  'boundaryConsistencyMap',
  'commandRerunLog',
  'reviewerDecisionRecord',
  'blockerDispositionRegister',
  'releaseRefreshEvidence',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(packetItem)} \\|`), packetItem);
}
assert.match(intake, /must identify the exact target boundary and artifact set under review/);
assert.match(intake, /must prove every evidence reference is sanitized, reproducible, and free of local machine paths or secret values/);
assert.match(intake, /must prove every evidence domain was generated from the same approved target boundary or explicitly record an accepted exception/);
assert.match(intake, /must include fresh results for every required smoke\/release command after target evidence is attached/);
assert.match(intake, /must keep `productionReadyClaim` false unless every mandatory target control has target-boundary evidence/);
assert.match(intake, /must record whether each blocker is resolved, accepted with scope, or still blocking before any release claim changes/);
assert.match(intake, /must prove all review artifacts were regenerated after the target evidence packet was accepted/);
assert.match(intake, /The submission packet is the review envelope for target evidence, not the evidence itself/);

assert.match(intake, /## Target Blocker Disposition Register/);
assert.match(
  intake,
  /do not record customer personal data, private tenant identifiers, billing identifiers, raw provider account ids, secret names that reveal credentials, raw endpoint credentials, or machine-local absolute paths/,
);
for (const blocker of [
  'target OpenAI provider approval',
  'Anthropic billing/live validation',
  'target Hermes provider approval',
  'target local provider approval',
  'hosted identity/session approval',
  'hosted tenant isolation approval',
  'target tenant evidence',
  'target environment evidence',
  'customer-specific exceptions',
]) {
  assert.match(intake, new RegExp(`\\| ${escapeRegExp(blocker)} \\|`), blocker);
}
assert.match(
  intake,
  /target OpenAI provider approval \| account-approval-required \| target OpenAI provider account evidence with account ownership proof for account owner, organization\/project alias, customer scope, evidence owner, reviewer, and review date; billing and quota proof with active billing plan, quota tier, spend cap, payment owner, and alert route/,
);
assert.match(
  intake,
  /hosted identity\/session approval \| customer-approval-required \| hosted identity\/session architecture approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /hosted tenant isolation approval \| customer-approval-required \| hosted tenant isolation architecture approval, tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact\/memory\/search\/export\/index partitioning proof, per-tenant encryption and key ownership proof, key rotation\/revocation\/escrow\/break-glass proof, backup creation\/restore authorization\/non-interference\/post-restore denial proof, tenant administration approval\/audit proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  intake,
  /target tenant evidence \| target-evidence-required \| completed target tenant isolation operations evidence capture template, tenant identity source proof, tenant-scoped authorization proof, negative cross-tenant test matrix, tenant storage\/encryption proof, backup\/restore non-interference proof, observability\/support isolation proof, lifecycle proof, artifact hygiene, regenerated execution snapshot evidence, and production readiness gate result/,
);
assert.doesNotMatch(
  intake,
  /hosted identity\/session approval \| customer-approval-required \| hosted identity\/session architecture approval, customer IdP onboarding, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention proof/,
);
assert.doesNotMatch(
  intake,
  /hosted tenant isolation approval \| customer-approval-required \| hosted tenant isolation architecture approval, tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant containment proof/,
);
assert.doesNotMatch(
  intake,
  /target tenant evidence \| target-evidence-required \| completed target tenant isolation operations evidence capture template, negative cross-tenant test matrix, tenant storage\/encryption proof, backup\/restore non-interference proof, lifecycle proof, artifact hygiene, and production readiness gate result/,
);
assert.match(
  intake,
  /target Hermes provider architecture evidence with endpoint ownership proof for approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check result/,
);
assert.match(
  intake,
  /target-boundary live:execution-v1:hermes proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference/,
);
assert.doesNotMatch(
  intake,
  /target Hermes provider architecture approval, endpoint ownership, model pinning, target secret injection proof, tool-call parsing proof, session lifecycle\/provenance, transcript policy, quota guard, telemetry, fallback\/customer approval, target-boundary `live:execution-v1:hermes` pass, provider operations evidence, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  intake,
  /endpoint ownership, model pinning, target secret injection proof, tool-call parsing proof, session lifecycle\/provenance, transcript policy, quota guard, telemetry, fallback\/customer approval, Hermes live validation pass, release artifact hygiene pass, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  intake,
  /target Hermes provider architecture approval, endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary `live:execution-v1:hermes` pass, provider operations evidence, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  intake,
  /endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation pass, release artifact hygiene pass, and regenerated execution snapshot evidence/,
);
for (const state of [
  'still-blocking',
  'configuration-required',
  'customer-approval-required',
  'target-evidence-required',
  'accepted-scope-required',
]) {
  assert.match(intake, new RegExp(escapeRegExp(state)), state);
}
assert.match(intake, /target-boundary `npm run live:execution-v1:anthropic`/);
assert.match(intake, /target-boundary `npm run live:execution-v1:hermes`/);
assert.match(
  intake,
  /target Anthropic provider account evidence with account ownership proof for account owner, organization\/workspace alias, customer scope, evidence owner, reviewer, and review date/,
);
assert.match(
  intake,
  /target-boundary live:execution-v1:anthropic proof with mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference/,
);
assert.match(
  intake,
  /fallback and stop-condition proof with fallback provider, fallback policy id, stop reason, degraded mode, manual approval path, rollback owner, residual risk decision, and recoverable-provider-failure-only stop evidence/,
);
assert.match(
  intake,
  /provider operations proof with fallback runtime audit policy and stop reason, data transcript handling, remediation renewal evidence, evidence retention, and provider failure containment/,
);
assert.doesNotMatch(
  intake,
  /target Anthropic provider account approval, billing\/credit remediation proof, target secret injection, target-boundary `live:execution-v1:anthropic` pass, provider operations evidence, release artifact hygiene, and regenerated execution-v1 artifacts/,
);
assert.doesNotMatch(
  intake,
  /account approval, billing\/credit remediation proof, target secret injection proof, provider operations evidence, release artifact hygiene pass, and regenerated execution-v1 artifacts/,
);
assert.doesNotMatch(
  intake,
  /target Anthropic provider account approval, account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, telemetry proof, fallback and stop-condition proof, remediation audit proof, provider operations evidence, release artifact hygiene result, and regenerated execution-v1 artifacts/,
);
assert.doesNotMatch(
  intake,
  /account ownership proof, billing and credit remediation proof, API key and secret injection proof, ANTHROPIC_MODEL model access proof, provider terms and customer approval proof, quota and spend guard proof, target-boundary Anthropic live validation pass, telemetry proof, fallback and stop-condition proof, remediation audit proof, provider operations evidence, release artifact hygiene pass, and regenerated execution-v1 artifacts/,
);
assert.match(
  intake,
  /target local provider architecture evidence with endpoint ownership proof for approved base URL alias, runtime owner, network boundary, transport, availability owner, health check result, and customer approval/,
);
assert.match(
  intake,
  /target-boundary live:execution-v1:local proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference/,
);
assert.doesNotMatch(
  intake,
  /target-boundary endpoint\/model ownership, network isolation, data residency, quota\/resource guard, telemetry, fallback evidence, target-boundary local provider live validation pass, and customer acceptance/,
);
assert.doesNotMatch(
  intake,
  /customer approval, target-boundary endpoint\/model ownership, network isolation, data residency, quota\/resource guard, telemetry, fallback evidence, target-boundary local provider live validation pass, and acceptance record/,
);
assert.doesNotMatch(
  intake,
  /target local provider architecture approval, endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation pass, release artifact hygiene result, regenerated execution snapshot evidence, and customer acceptance/,
);
assert.doesNotMatch(
  intake,
  /endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local provider live validation pass, release artifact hygiene pass, regenerated execution snapshot evidence, and acceptance record/,
);
assert.match(intake, /negative cross-tenant test matrix/);
assert.match(intake, /boundary consistency map, command rerun log, reviewer decision, blocker disposition register, release refresh evidence/);
assert.match(intake, /exceptions cannot convert a blocked production-ready claim into production-ready/);
assert.match(intake, /Blocker disposition is a stop-condition input, not a waiver/);
assert.match(intake, /allowed claim text remains narrower than `production-ready`/);
assert.match(
  intake,
  /execution evidence, closeout, handoff, immutable snapshot, pilot export package, production-like release drill, clean deployment release, and production readiness gate are regenerated/,
);

assert.match(intake, /## Blocker Closure Verification Matrix/);
assert.match(intake, /Every blocker disposition change must carry a matching verification row/);
assert.match(intake, /the stop-condition that remains in force when the command is missing, stale, or generated from the wrong boundary/);
for (const stopCondition of [
  'target-openai-provider-account-approval-missing',
  'anthropic-live-validation-missing-or-failed',
  'target-hermes-provider-approval-missing',
  'target-local-provider-approval-missing',
  'hosted-identity-session-approval-missing',
  'hosted-tenant-isolation-approval-missing',
  'target-tenant-evidence-missing',
  'target-environment-evidence-missing',
  'customer-exception-scope-missing',
]) {
  assert.match(intake, new RegExp(`\\| \`${escapeRegExp(stopCondition)}\` \\|`), stopCondition);
}
assert.match(
  intake,
  /target OpenAI provider approval \| `npm run smoke:target-openai-provider-account` and target-boundary `npm run live:execution-v1:openai` \| account ownership proof with account owner, organization\/project alias, customer scope, evidence owner, reviewer, and review date; billing and quota proof with active billing plan, quota tier, spend cap, payment owner, and alert route/,
);
assert.match(
  intake,
  /hosted identity\/session approval \| `npm run smoke:hosted-identity-session-architecture` and `npm run smoke:target-identity-session-operations` \| hosted identity architecture approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene pass, and regenerated execution snapshot evidence \| `hosted-identity-session-approval-missing`/,
);
assert.match(
  intake,
  /hosted tenant isolation approval \| `npm run smoke:hosted-tenant-isolation-architecture` and `npm run smoke:target-tenant-isolation-operations` \| hosted tenant architecture approval, tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact\/memory\/search\/export\/index partitioning proof, per-tenant encryption and key ownership proof, key rotation\/revocation\/escrow\/break-glass proof, backup creation\/restore authorization\/non-interference\/post-restore denial proof, tenant administration approval\/audit proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene pass, and regenerated execution snapshot evidence \| `hosted-tenant-isolation-approval-missing`/,
);
assert.match(
  intake,
  /target tenant evidence \| `npm run smoke:target-tenant-isolation-operations` and `npm run smoke:production-readiness-gate` \| completed tenant isolation evidence capture template, tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore non-interference proof, negative cross-tenant test matrix, observability\/support isolation proof, lifecycle proof, tenant data containment, release artifact hygiene pass, regenerated execution snapshot evidence, and production readiness gate result \| `target-tenant-evidence-missing`/,
);
assert.doesNotMatch(
  intake,
  /hosted identity\/session approval \| `npm run smoke:hosted-identity-session-architecture` and `npm run smoke:target-identity-session-operations` \| hosted identity architecture approval, customer IdP onboarding, user lifecycle, session lifecycle, role administration, audit export, break-glass, support impersonation, compliance, and retention proof/,
);
assert.doesNotMatch(
  intake,
  /hosted tenant isolation approval \| `npm run smoke:hosted-tenant-isolation-architecture` and `npm run smoke:target-tenant-isolation-operations` \| hosted tenant architecture approval, tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and containment proof/,
);
for (const closureCommand of [
  'npm run live:execution-v1:openai',
  'npm run live:execution-v1:anthropic',
  'npm run live:execution-v1:hermes',
  'npm run live:execution-v1:local',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(intake, new RegExp(escapeRegExp(closureCommand)), closureCommand);
}
assert.match(intake, /matching target boundary, release artifact hygiene, and regenerated release artifacts/);
assert.match(intake, /must keep `productionReadyClaim: false` and must be recorded as a stop-condition/);

for (const command of [
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:target-provider-operations',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
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
assert.match(
  readRequiredFile(path.join(docsDir, 'target-identity-session-operations-v1.md')),
  /## Target Evidence Capture Template/,
);
assert.match(intake, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(intake, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(
  readRequiredFile(path.join(docsDir, 'target-tenant-isolation-operations-v1.md')),
  /## Target Evidence Capture Template/,
);
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
      targetCaptureTemplate: true,
      targetSubmissionPacket: true,
      blockerDispositionRegister: true,
      blockerClosureVerificationMatrix: true,
      submissionPacketItemCount: 7,
      blockerDispositionItemCount: 9,
      blockerClosureVerificationItemCount: 9,
      requiredCommandCount: 30,
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
