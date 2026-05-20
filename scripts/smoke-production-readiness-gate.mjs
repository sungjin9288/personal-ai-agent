import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const operatorRunbookPath = path.join(docsDir, 'operator-runbook-v1.md');
const evidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const closeoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const handoffPath = path.join(docsDir, 'execution-v1-handoff.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');
const productionSloOperatingPath = path.join(docsDir, 'production-slo-operating-v1.md');
const productionRetentionOperatingPath = path.join(docsDir, 'production-retention-operating-v1.md');
const productionProviderReadinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const targetProviderEvidenceIntakePath = path.join(docsDir, 'target-provider-evidence-intake-v1.md');
const targetProviderOperationsPath = path.join(docsDir, 'target-provider-operations-v1.md');
const targetOpenAIProviderAccountPath = path.join(docsDir, 'target-openai-provider-account-v1.md');
const targetAnthropicProviderAccountPath = path.join(docsDir, 'target-anthropic-provider-account-v1.md');
const targetLocalProviderArchitecturePath = path.join(docsDir, 'target-local-provider-architecture-v1.md');
const targetHermesProviderArchitecturePath = path.join(docsDir, 'target-hermes-provider-architecture-v1.md');
const productionEnterpriseControlsPath = path.join(docsDir, 'production-enterprise-controls-v1.md');
const targetDeploymentContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const hostedSaasArchitectureDecisionPath = path.join(docsDir, 'hosted-saas-architecture-decision-v1.md');
const hostedIdentitySessionArchitecturePath = path.join(docsDir, 'hosted-identity-session-architecture-v1.md');
const targetIdentitySessionOperationsPath = path.join(docsDir, 'target-identity-session-operations-v1.md');
const hostedTenantIsolationArchitecturePath = path.join(docsDir, 'hosted-tenant-isolation-architecture-v1.md');
const targetTenantIsolationOperationsPath = path.join(docsDir, 'target-tenant-isolation-operations-v1.md');
const targetEnvironmentEvidenceIntakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const backupRestoreDrillPath = path.join(docsDir, 'backup-restore-drill-v1.md');
const identitySessionAdminPath = path.join(docsDir, 'identity-session-admin-v1.md');
const tenantStorageAdminPath = path.join(docsDir, 'tenant-storage-admin-v1.md');
const customerSupportOperationsPath = path.join(docsDir, 'customer-support-operations-v1.md');
const supportEscalationReviewPath = path.join(docsDir, 'support-escalation-review-v1.md');
const targetSupportArchitecturePath = path.join(docsDir, 'target-support-architecture-v1.md');
const targetSupportOperationsPath = path.join(docsDir, 'target-support-operations-v1.md');
const secretManagementPath = path.join(docsDir, 'secret-management-v1.md');
const targetSecretManagerArchitecturePath = path.join(docsDir, 'target-secret-manager-architecture-v1.md');
const targetSecretManagerPath = path.join(docsDir, 'target-secret-manager-v1.md');
const observabilityTelemetryPath = path.join(docsDir, 'observability-telemetry-v1.md');
const targetObservabilityArchitecturePath = path.join(docsDir, 'target-observability-architecture-v1.md');
const targetObservabilityOperationsPath = path.join(docsDir, 'target-observability-operations-v1.md');
const targetSloArchitecturePath = path.join(docsDir, 'target-slo-architecture-v1.md');
const targetSloOperationsPath = path.join(docsDir, 'target-slo-operations-v1.md');
const targetDataLifecycleArchitecturePath = path.join(docsDir, 'target-data-lifecycle-architecture-v1.md');
const targetCleanDeploymentArchitecturePath = path.join(docsDir, 'target-clean-deployment-architecture-v1.md');
const targetCleanDeploymentOperationsPath = path.join(docsDir, 'target-clean-deployment-operations-v1.md');
const targetRetentionOperationsPath = path.join(docsDir, 'target-retention-operations-v1.md');
const targetBackupOperationsPath = path.join(docsDir, 'target-backup-operations-v1.md');
const pilotExportPackagePath = path.join(docsDir, 'pilot-export-package-v1.md');
const productionLikeDrillPath = path.join(docsDir, 'production-like-release-drill-v1.md');
const runtimeIsolationPath = path.join(docsDir, 'runtime-isolation-v1.md');
const retentionDeletePath = path.join(docsDir, 'retention-delete-v1.md');
const cleanDeploymentReleasePath = path.join(docsDir, 'clean-deployment-release-v1.md');

const productPlan = readRequiredFile(productPlanPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const operatorRunbook = readRequiredFile(operatorRunbookPath);
const evidence = readRequiredFile(evidencePath);
const closeout = readRequiredFile(closeoutPath);
const handoff = readRequiredFile(handoffPath);
const incidentSlo = readRequiredFile(incidentSloPath);
const productionSloOperating = readRequiredFile(productionSloOperatingPath);
const productionRetentionOperating = readRequiredFile(productionRetentionOperatingPath);
const productionProviderReadiness = readRequiredFile(productionProviderReadinessPath);
const targetProviderEvidenceIntake = readRequiredFile(targetProviderEvidenceIntakePath);
const targetProviderOperations = readRequiredFile(targetProviderOperationsPath);
const targetOpenAIProviderAccount = readRequiredFile(targetOpenAIProviderAccountPath);
const targetAnthropicProviderAccount = readRequiredFile(targetAnthropicProviderAccountPath);
const targetLocalProviderArchitecture = readRequiredFile(targetLocalProviderArchitecturePath);
const targetHermesProviderArchitecture = readRequiredFile(targetHermesProviderArchitecturePath);
const productionEnterpriseControls = readRequiredFile(productionEnterpriseControlsPath);
const targetDeploymentContract = readRequiredFile(targetDeploymentContractPath);
const hostedSaasArchitectureDecision = readRequiredFile(hostedSaasArchitectureDecisionPath);
const hostedIdentitySessionArchitecture = readRequiredFile(hostedIdentitySessionArchitecturePath);
const targetIdentitySessionOperations = readRequiredFile(targetIdentitySessionOperationsPath);
const hostedTenantIsolationArchitecture = readRequiredFile(hostedTenantIsolationArchitecturePath);
const targetTenantIsolationOperations = readRequiredFile(targetTenantIsolationOperationsPath);
const targetEnvironmentEvidenceIntake = readRequiredFile(targetEnvironmentEvidenceIntakePath);
const backupRestoreDrill = readRequiredFile(backupRestoreDrillPath);
const identitySessionAdmin = readRequiredFile(identitySessionAdminPath);
const tenantStorageAdmin = readRequiredFile(tenantStorageAdminPath);
const customerSupportOperations = readRequiredFile(customerSupportOperationsPath);
const supportEscalationReview = readRequiredFile(supportEscalationReviewPath);
const targetSupportArchitecture = readRequiredFile(targetSupportArchitecturePath);
const targetSupportOperations = readRequiredFile(targetSupportOperationsPath);
const secretManagement = readRequiredFile(secretManagementPath);
const targetSecretManagerArchitecture = readRequiredFile(targetSecretManagerArchitecturePath);
const targetSecretManager = readRequiredFile(targetSecretManagerPath);
const observabilityTelemetry = readRequiredFile(observabilityTelemetryPath);
const targetObservabilityArchitecture = readRequiredFile(targetObservabilityArchitecturePath);
const targetObservabilityOperations = readRequiredFile(targetObservabilityOperationsPath);
const targetSloArchitecture = readRequiredFile(targetSloArchitecturePath);
const targetSloOperations = readRequiredFile(targetSloOperationsPath);
const targetDataLifecycleArchitecture = readRequiredFile(targetDataLifecycleArchitecturePath);
const targetCleanDeploymentArchitecture = readRequiredFile(targetCleanDeploymentArchitecturePath);
const targetCleanDeploymentOperations = readRequiredFile(targetCleanDeploymentOperationsPath);
const targetRetentionOperations = readRequiredFile(targetRetentionOperationsPath);
const targetBackupOperations = readRequiredFile(targetBackupOperationsPath);
const pilotExportPackage = readRequiredFile(pilotExportPackagePath);
const productionLikeDrill = readRequiredFile(productionLikeDrillPath);
const runtimeIsolation = readRequiredFile(runtimeIsolationPath);
const retentionDelete = readRequiredFile(retentionDeletePath);
const cleanDeploymentRelease = readRequiredFile(cleanDeploymentReleasePath);

const releaseLabel = extractBulletValue(releaseReadiness, 'releaseLabel');
const decision = extractBulletValue(releaseReadiness, 'decision');
const productionReadySection = extractSection(releaseReadiness, '### Production Ready');
const pilotReadySection = extractSection(releaseReadiness, '### Pilot Ready');
const internalAlphaSection = extractSection(releaseReadiness, '### Internal Alpha');
const currentOpenBlockersSection = extractSection(releaseReadiness, '## Current Open Blockers');
const currentStatus = extractStatusMap(closeout, 'Current Status');
const operationalState = extractStatusMap(handoff, 'Operational State');
const liveValidation = extractStatusMap(evidence, 'Live Validation');
const releaseArtifactHygiene = runReleaseArtifactHygiene({ repoDir });

assert.equal(releaseLabel, 'provider-scoped pilot ready for OpenAI-backed local-first path');
assert.match(decision, /pilot-ready only/i);
assert.match(decision, /do not claim production-ready/i);
assert.doesNotMatch(releaseLabel, /production-ready/i);

assert.match(internalAlphaSection, /^Status: pass\./m);
assert.match(
  internalAlphaSection,
  /release artifact publishing is tracked by `smoke:execution-v1-status` and must remain `artifact-sync-current` before handoff/,
);
assert.match(pilotReadySection, /^Status: pass, scoped to OpenAI-backed local-first\/self-hosted pilot\./m);
assert.match(
  pilotReadySection,
  /release evidence is synchronized through the current execution-v1 snapshot and `artifact-sync-current` smoke state/,
);
assert.match(
  pilotReadySection,
  /Hermes live validation remains blocked until target Hermes provider architecture evidence for endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback, customer approval, target-boundary npm run live:execution-v1:hermes pass, release artifact hygiene result, and regenerated execution snapshot is recorded/,
);
assert.doesNotMatch(
  pilotReadySection,
  /Hermes live validation is blocked by missing `HERMES_PROVIDER_MODEL`/,
);
assert.match(pilotReadySection, /Pilot-ready can be claimed only for the validated provider and approved deployment boundary\./);
assert.match(productionReadySection, /^Status: blocked\./m);
assert.match(productionReadySection, /Production-ready must not be claimed from the current state\./);
assert.doesNotMatch(releaseReadiness, /commit\/push remains deferred by operator request/);

for (const blocker of [
  /provider live validation completion evidence for Anthropic and Hermes is incomplete, and production provider live validation evidence for Anthropic billing and credit remediation, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, npm run live:execution-v1:anthropic result, Hermes target provider architecture approval, HERMES_PROVIDER_MODEL pinning, Hermes endpoint and secret injection, npm run live:execution-v1:hermes result, mission id, execution session id, provider response status, retry lineage, artifact provenance, telemetry probe result, failureKind taxonomy, fallback or disable decision, remediation owner, next review date, release artifact hygiene result, and regenerated execution snapshot is not generated from the approved production-like or hosted target environment/,
  /target OpenAI provider account is not approved, and target OpenAI provider account evidence for account ownership proof with OpenAI organization\/project owner, project\/workspace alias, customer scope, evidence owner, and review date, billing and quota proof with active billing plan, quota tier, payment owner, spend cap, low-balance\/quota alert route, and redacted evidence summary, API key and secret injection proof with target secret manager alias, OPENAI_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with OPENAI_MODEL, model availability, region\/project access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript\/retention policy, support owner, and evidence owner, usage and cost guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:openai, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, renewal and review audit proof with account owner recertification, quota review, model access review, artifact hygiene result, accepted risk, and next review date, migration plan, missing API key, revoked key, quota exhaustion, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
  /target provider operations evidence for completed per-provider operations capture template, branch and commit, release label and deployment boundary, provider inventory proof with OpenAI, Anthropic, local, and Hermes inclusion state, owner, customer\/workspace approval, account or architecture record, and operating decision, provider account approval proof with billing\/credit\/quota state, provider terms, model access, and renewal owner, target secret injection proof with secret manager alias, rotation owner, access policy, redaction result, break-glass path, and revocation evidence, target-boundary live validation proof with command, provider, model, endpoint alias, timeout, result, archived evidence commit, and operator owner, model and endpoint pinning proof with model id, endpoint\/base URL alias, retry policy, concurrency limit, fallback route, and approval owner, quota, cost, and resource guard proof with spend owner, usage envelope, timeout, retry cap, concurrency cap, local resource envelope, alert threshold, and escalation route, fallback and disable proof with fallback provider or stop condition, disable switch, degradation mode, customer impact rule, rollback owner, and accepted-risk decision, provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy, mission timeline, workspace timeline, overview operator-timeline, provider events --family fallback, action remediate-provider-attention --fallback-provider --fallback-policy, provider-failure-only failover, recoverable-provider-failure-only stop conditions, selected fallback provider, and deterministic stop conditions, target blocker closure verification proof with provider blocker state, next verification command, required closing evidence, stop-condition id, release artifact hygiene result, and regenerated release artifacts, provider telemetry proof with health signal, latency\/error metrics, token or resource usage, quota alert, fallback event, retention period, and telemetry owner, provider incident triage proof with account failure, missing env, live runtime failure, provider outage, quota exhaustion, customer communication, incident review, and remediation owner routes, data and transcript handling proof with data classification, provider transcript policy, retention class, export\/delete handling, redaction rule, and post-delete absence requirement, remediation and renewal review proof with billing\/credit remediation, endpoint\/model renewal, key rotation, provider terms review, accepted-risk owner, and next review date, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and provider failure containment plan is not generated from a production-like environment/,
  /target Anthropic provider account is not approved, and target Anthropic provider account evidence for account ownership proof with Anthropic account owner, organization\/workspace alias, customer scope, evidence owner, and review date, billing and credit proof with active billing plan, available credit balance, payment owner, renewal path, low-balance alert route, and screenshot-free redacted evidence summary, API key and secret injection proof with target secret manager alias, ANTHROPIC_API_KEY owner, rotation path, access audit, break-glass owner, and redaction result, model access proof with ANTHROPIC_MODEL, model availability, region\/workspace access, max token policy, fallback model, and owner approval, provider terms and customer approval proof with provider terms, data processing approval, allowed customer\/workspace, transcript retention policy, support owner, and evidence owner, quota and spend guard proof with usage envelope, concurrency limit, timeout, retry policy, spend owner, saturation fallback, and budget review cadence, target live validation proof with npm run live:execution-v1:anthropic, mission id, execution session id, provider response status, retry lineage, artifact provenance, and handoff reference, telemetry proof with probe result, provider response status, model availability, run duration, retry count, failureKind taxonomy, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, remediation audit proof with account remediation ticket, billing owner approval, post-remediation live run, artifact hygiene result, accepted risk, and next review date, migration plan, low credit balance, missing API key, revoked key, unavailable model, rate limit exhaustion, provider terms conflict, and fallback failure containment is not generated from a production-like environment/,
  /target local provider architecture is not approved, and target local provider architecture evidence for endpoint ownership proof with approved base URL alias, runtime owner, network boundary, transport, availability owner, and health check record, model pinning proof with LOCAL_PROVIDER_MODEL, model source\/version, compatibility profile, max token policy, fallback model, and owner approval, network isolation proof with host boundary, ingress policy, egress policy, tenant\/customer boundary, operator access policy, and firewall decision, secret and credential policy proof with auth mode, API key requirement, target secret manager alias when used, rotation path, redaction result, and access audit, runtime lifecycle proof with process manager, startup command, health endpoint, restart policy, resource limits, and log retention, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof with prompt data class, local storage path alias, transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and resource guard proof with CPU\/GPU\/memory envelope, concurrency limit, timeout, retry policy, saturation fallback, and resource owner approval, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage\/resource metrics, alert route, and incident owner, fallback and customer approval proof with fallback provider, degraded mode, customer impact rule, manual approval path, provider terms\/local model license decision, and residual risk owner, migration plan, missing base URL, missing model, unavailable runtime, model mismatch, data residency gap, resource exhaustion, and fallback failure containment is not generated from a production-like environment/,
  /target Hermes provider architecture is not approved, and target Hermes provider architecture evidence for endpoint ownership proof with approved base URL alias, endpoint owner, network boundary, transport, availability owner, and health check record, model pinning proof with HERMES_PROVIDER_MODEL, model version\/source, compatibility profile, max token policy, fallback model, and owner approval, secret injection proof with target secret manager alias, API key requirement decision, rotation path, break-glass owner, access audit, and redaction result, tool-call parsing proof with Hermes <tool_call> sample, malformed-call behavior, execution boundary decision, audit record, and no-unapproved-tool-execution evidence, session lifecycle proof with mission id, execution session id, provider response id, retry lineage, artifact provenance, and handoff reference, data and transcript policy proof with prompt data class, provider transcript retention, customer data approval, delete request route, and post-delete absence evidence, quota and rate guard proof with concurrency limit, timeout, retry policy, cost owner, usage envelope, saturation fallback, and spend review, telemetry proof with probe result, model availability, run duration, retry count, failureKind taxonomy, usage metrics, alert route, and incident owner, fallback and stop-condition proof with fallback provider, degraded mode, customer impact rule, manual approval path, rollback owner, and residual risk decision, customer approval proof with provider terms, allowed workspace\/customer, data-processing approval, support owner, evidence owner, and next review date, migration plan, missing model, unavailable endpoint, malformed tool-call output, transcript retention gap, quota exhaustion, and fallback failure containment is not generated from a production-like environment/,
  /hosted identity session architecture is not approved, and hosted identity\/session architecture evidence for customer IdP onboarding, metadata ownership, issuer\/audience policy, JWKS rotation, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance and retention, rollback and lockout recovery, and customer access containment is not generated from a production-like environment/,
  /target identity\/session operations evidence for customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance, retention, and customer access containment is not generated from a production-like environment/,
  /hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability, tenant-scoped telemetry and support visibility, data lifecycle isolation, migration plan, rollback, and tenant data containment is not generated from a production-like environment/,
  /target tenant isolation operations evidence for tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment is not generated from a production-like environment/,
  /target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review across logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery, migration plan, rollback, lockout recovery, and credential containment is not generated from a production-like environment/,
  /target observability architecture is not approved, and target observability architecture evidence for approved telemetry backend, region, tenancy boundary, owner, fallback, and data residency, signal inventory for release, provider, mission, approval, runtime, security, support, and incident domains, ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events, alert routing with severity mapping, primary and secondary routes, retry policy, acknowledgement SLA, and delivery receipts, staffed on-call proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, log and trace retention with storage class, redaction policy, query role, customer export boundary, and deletion path, customer status communication, incident response, audit export, disaster recovery, migration plan, rollback, false-positive triage, alert fatigue, and customer communication containment is not generated from a production-like environment/,
  /target observability operations evidence for telemetry ingestion, alert delivery, trace\/log retention, staffed on-call routing and acknowledgement, customer-facing status communication, incident response, and incident review history is not generated from a production-like environment/,
  /target deployment contract evidence for target deployment name with approved target environment name, company\/workspace scope, deployment owner, evidence owner, review date, and release label, deployment profile decision with selected deployment profile, approved architecture decision, network boundary, runtime root alias, rollback owner, and customer approval reference, mandatory control evidence with every mandatory control, required command output, production readiness gate result, and unresolved blocker list, provider readiness evidence with completed provider evidence intake, target provider operations, provider account or architecture approvals, target secret injection, target-boundary live validation, quota\/cost\/resource guard, fallback evidence, and provider failure containment proof, identity and tenant evidence with hosted identity\/session approval, target identity\/session operations, hosted tenant isolation approval, target tenant isolation operations, RBAC\/session audit, tenant storage boundary, encryption\/key ownership, and cross-tenant denial evidence, secret and observability evidence with target secret manager approval, rotation\/revocation evidence, telemetry backend, alert route, log\/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence, data lifecycle and support evidence with target data lifecycle approval, retention\/export\/delete proof, provider transcript handling, backup\/restore evidence, support architecture approval, staffed support route, escalation audit, customer communication route, and incident review cadence, clean release artifact evidence with target clean deployment architecture, target clean deployment operations, clean deployment run, dependency\/runtime proof, release snapshot, export package, production-like drill, artifact hygiene result, rollback proof, and failed-deployment containment, stop-condition decision with explicit stop conditions, residual blockers, accepted risks, blocker owner, remediation owner, and next review date, and production-ready claim decision with decision owner, approval or rejection summary, allowed claim text, evidence commit, snapshot path, and regeneration command references is not generated from a production-like environment/,
  /target SLO architecture is not approved, and target SLO\/SLA architecture evidence for customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, review cadence, telemetry measurement proof for metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, retention period, alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, audit record, staffed on-call proof with rota, primary and secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, and missed-SLO containment is not generated from a production-like environment/,
  /target SLO operations evidence for customer-approved SLO\/SLA terms, error budget, telemetry measurement, alert acknowledgement, staffed on-call response, customer communication, incident review, provider outage handling, maintenance\/degradation, service credit, evidence retention, and missed-SLO containment is not generated from a production-like environment/,
  /target data lifecycle architecture is not approved, and target data lifecycle architecture evidence for customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy, target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record, export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record, provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit, restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry\/delete evidence, and access audit, disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment is not generated from a production-like environment/,
  /target retention operations evidence for customer-approved data classes, target retention configuration, export approval, delete workflow, provider transcript handling, post-delete absence, and audit history, plus target backup operations evidence for backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry\/deletion, disaster recovery runbook, and audit trail is not generated from a production-like environment/,
  /production SLO\/SLA operating evidence for incident\/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO\/SLA terms, and provider\/deployment evidence is not generated from a production-like environment/,
  /target support architecture is not approved, and target support architecture evidence for staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment is not generated from a production-like environment/,
  /target support operations evidence for staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, incident review cadence, on-call handoff, and closure evidence is not generated from a production-like environment/,
  /target clean deployment architecture is not approved, and target clean deployment architecture evidence for source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision, artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner, secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, migration plan, dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval containment is not generated from a production-like environment/,
  /target clean deployment operations evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, evidence retention, and failed-deployment containment is not generated from a production-like environment/,
  /clean deployment release evidence for clean checkout proof with source branch, source commit, tracked-file mode, file count, excluded runtime state, and clean checkout owner, command replay proof with incident\/SLO, identity\/session, tenant, support, secret, observability, SLO, data lifecycle, clean deployment architecture and operations, retention, backup, provider, target deployment contract, artifact hygiene, runtime lifecycle, runtime isolation, pilot export, and package validation results, artifact synchronization proof with source commit, execution snapshot, clean deployment release artifact, production-like drill, pilot export package, release artifact hygiene, and artifact-sync-current status, production-like environment proof with approved target boundary, runtime bootstrap, secret injection, dependency install, environment boundary, rollback point, release approval, operator, and timestamp, and failure containment for stale checkout, dependency drift, local runtime leakage, missing artifact, failed smoke, failed hygiene, failed rollback, and misleading production-ready claim is not generated from a production-like environment/,
]) {
  assert.match(productionReadySection, blocker);
}
assert.doesNotMatch(
  productionReadySection,
  new RegExp('Anthropic and Hermes live validations are not complete'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target OpenAI provider account is not approved and OpenAI target-boundary live ' +
      'validation evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target provider operations evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target provider operations evidence for provider inventory/account approval, target secret injection, ' +
      'target-boundary live validation, model/endpoint pinning, quota/cost/resource guard, ' +
      'fallback/disable path, provider fallback runtime audit, telemetry, incident triage, ' +
      'data/transcript handling, remediation/renewal, evidence retention, and provider failure ' +
      'containment is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target Anthropic provider account is not approved and Anthropic live validation ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target local provider architecture is not approved, and approved target-boundary ' +
      'endpoint/model, network isolation, telemetry, quota/resource guard, and local provider ' +
      'live validation evidence are not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target Hermes provider architecture is not approved, and endpoint ownership, model pinning, ' +
      'target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, ' +
      'telemetry, fallback, customer approval, and Hermes live validation evidence are not generated ' +
      'from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target deployment contract is not satisfied by target-environment evidence'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'hosted identity session architecture is not approved and target identity/session ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target identity/session operations evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'hosted tenant isolation architecture is not approved and target tenant ' +
      'isolation evidence is not generated',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target secret manager architecture is not approved and target secret manager ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target observability architecture is not approved and target observability ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target tenant isolation operations evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target SLO architecture is not approved and target SLO/SLA ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target SLO operations evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target data lifecycle architecture is not approved and target data lifecycle ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target clean deployment architecture is not approved, and target clean deployment ' +
      'evidence for source provenance, artifact registry, dependency installation',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('target clean deployment operations evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('clean deployment release evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target support operations, staffed coverage, support audit history, ' +
      'on-call handoff, and incident review evidence are not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target observability telemetry, alert delivery, on-call routing, retention, ' +
      'customer communication, and incident review evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target retention, export, delete, provider transcript handling, target backup, ' +
      'and post-delete absence evidence is not generated from a production-like environment',
  ),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp('production SLO/SLA operating evidence is not generated from ' + 'a production-like environment'),
);
assert.doesNotMatch(
  productionReadySection,
  new RegExp(
    'target support architecture is not approved and target support ' +
      'evidence is not generated from a production-like environment',
  ),
);

assert.match(releaseReadiness, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(
  releaseReadiness,
  /live validation: OpenAI passed, Anthropic failed with API billing\/credit blocker, local provider passed for the configured pilot boundary, Hermes remains blocked until target Hermes provider architecture evidence and target-boundary live validation are approved/,
);
assert.doesNotMatch(releaseReadiness, /Hermes missing runtime env/);
assert.match(
  releaseReadiness,
  /target local provider architecture still requires endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota\/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('target local provider architecture still lacks approved ' + 'target-boundary evidence'),
);
assert.doesNotMatch(
  releaseReadiness,
  /target local provider architecture still requires approved target-boundary endpoint\/model, network isolation, telemetry, quota\/resource guard, and local provider live validation evidence/,
);
assert.match(productPlan, /^- \[x\] Live OpenAI validation archived$/m);
assert.match(productPlan, /^- \[ \] Live Anthropic validation archived$/m);
assert.match(productPlan, /^- \[x\] Live local provider validation archived$/m);
assert.match(productPlan, /^- \[ \] Live Hermes validation archived$/m);
assert.match(
  productPlan,
  /archived local provider validation evidence for the configured local rehearsal/,
);
assert.match(productPlan, /target local provider architecture remains a production gate/);
assert.match(
  productPlan,
  /attach target local provider architecture evidence for endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota\/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  operatorRunbook,
  /OpenAI and local provider live validation are archived in the current evidence pack/,
);
assert.match(
  operatorRunbook,
  /local provider live evidence is already archived for the configured local rehearsal/,
);
assert.match(
  operatorRunbook,
  /Hermes remains excluded from provider claims until target Hermes provider architecture evidence covers endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary live validation/,
);
assert.match(
  operatorRunbook,
  /target local provider architecture still requires endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota\/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence before a production provider claim/,
);
assert.match(releaseReadiness, /\[production-slo-operating-v1\.md\]\(production-slo-operating-v1\.md\)/);
assert.match(releaseReadiness, /\[production-retention-operating-v1\.md\]\(production-retention-operating-v1\.md\)/);
assert.match(releaseReadiness, /\[production-provider-readiness-v1\.md\]\(production-provider-readiness-v1\.md\)/);
assert.match(releaseReadiness, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /target provider evidence intake gate: passed, with provider account approval/);
assert.match(releaseReadiness, /provider blocker closure verification, and `productionReadyClaim: false`/);
assert.match(releaseReadiness, /\[target-provider-operations-v1\.md\]\(target-provider-operations-v1\.md\)/);
assert.match(releaseReadiness, /target provider operations gate: passed, with provider account approval/);
assert.match(releaseReadiness, /provider fallback runtime audit, target blocker closure verification matrix, telemetry/);
assert.match(releaseReadiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(releaseReadiness, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[production-enterprise-controls-v1\.md\]\(production-enterprise-controls-v1\.md\)/);
assert.match(releaseReadiness, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(releaseReadiness, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(releaseReadiness, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /target environment evidence intake gate: passed, with deployment boundary/);
assert.match(releaseReadiness, /sanitized submission packet, blocker disposition register/);
assert.match(releaseReadiness, /blocker closure verification matrix/);
assert.match(releaseReadiness, /stop-condition closing evidence, and `productionReadyClaim: false`/);
assert.match(releaseReadiness, /\[backup-restore-drill-v1\.md\]\(backup-restore-drill-v1\.md\)/);
assert.match(releaseReadiness, /\[identity-session-admin-v1\.md\]\(identity-session-admin-v1\.md\)/);
assert.match(releaseReadiness, /\[tenant-storage-admin-v1\.md\]\(tenant-storage-admin-v1\.md\)/);
assert.match(releaseReadiness, /\[customer-support-operations-v1\.md\]\(customer-support-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[support-escalation-review-v1\.md\]\(support-escalation-review-v1\.md\)/);
assert.match(releaseReadiness, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[target-support-operations-v1\.md\]\(target-support-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[secret-management-v1\.md\]\(secret-management-v1\.md\)/);
assert.match(releaseReadiness, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /\[target-secret-manager-v1\.md\]\(target-secret-manager-v1\.md\)/);
assert.match(releaseReadiness, /\[observability-telemetry-v1\.md\]\(observability-telemetry-v1\.md\)/);
assert.match(
  releaseReadiness,
  /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-observability-operations-v1\.md\]\(target-observability-operations-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/,
);
assert.match(
  releaseReadiness,
  /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/,
);
assert.match(releaseReadiness, /\[target-retention-operations-v1\.md\]\(target-retention-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[target-backup-operations-v1\.md\]\(target-backup-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[pilot-export-package-v1\.md\]\(pilot-export-package-v1\.md\)/);
assert.match(releaseReadiness, /\[production-like-release-drill-v1\.md\]\(production-like-release-drill-v1\.md\)/);
assert.match(releaseReadiness, /\[runtime-isolation-v1\.md\]\(runtime-isolation-v1\.md\)/);
assert.match(releaseReadiness, /\[retention-delete-v1\.md\]\(retention-delete-v1\.md\)/);
assert.match(releaseReadiness, /\[clean-deployment-release-v1\.md\]\(clean-deployment-release-v1\.md\)/);
assert.match(incidentSlo, /Severity Levels/);
assert.match(incidentSlo, /Pilot SLO Targets/);
assert.match(incidentSlo, /Incident Entry Criteria/);
assert.match(incidentSlo, /Production Gap/);
assert.match(incidentSlo, /not a production SLO\/SLA commitment/);
assert.match(productionSloOperating, /^# Production SLO Operating Rehearsal v1$/m);
assert.match(productionSloOperating, /^- status: local-slo-operating-current$/m);
assert.match(productionSloOperating, /^- productionReadyClaim: false$/m);
assert.match(productionSloOperating, /npm run smoke:production-slo-operating/);
assert.match(productionSloOperating, /not customer production SLO\/SLA evidence/);
assert.match(productionRetentionOperating, /^# Production Retention Operating Rehearsal v1$/m);
assert.match(productionRetentionOperating, /^- status: local-retention-operating-current$/m);
assert.match(productionRetentionOperating, /^- productionReadyClaim: false$/m);
assert.match(productionRetentionOperating, /npm run smoke:production-retention-operating/);
assert.match(productionRetentionOperating, /not hosted production retention evidence/);
assert.match(productionProviderReadiness, /^# Production Provider Readiness v1$/m);
assert.match(productionProviderReadiness, /^- status: local-provider-readiness-current$/m);
assert.match(productionProviderReadiness, /^- productionReadyClaim: false$/m);
assert.match(productionProviderReadiness, /npm run smoke:production-provider-readiness/);
assert.match(productionProviderReadiness, /not live-provider-complete evidence/);
assert.match(productionProviderReadiness, /\[target-openai-provider-account-v1\.md\]\(target-openai-provider-account-v1\.md\)/);
assert.match(productionProviderReadiness, /\[target-anthropic-provider-account-v1\.md\]\(target-anthropic-provider-account-v1\.md\)/);
assert.match(productionProviderReadiness, /\[target-local-provider-architecture-v1\.md\]\(target-local-provider-architecture-v1\.md\)/);
assert.match(productionProviderReadiness, /\[target-hermes-provider-architecture-v1\.md\]\(target-hermes-provider-architecture-v1\.md\)/);
assert.match(productionProviderReadiness, /provider blocker closure verification/);
assert.match(productionProviderReadiness, /target blocker closure verification matrix/);
assert.match(targetProviderEvidenceIntake, /^# Target Provider Evidence Intake v1$/m);
assert.match(targetProviderEvidenceIntake, /^- status: local-target-provider-evidence-intake-current$/m);
assert.match(targetProviderEvidenceIntake, /^- productionReadyClaim: false$/m);
assert.match(targetProviderEvidenceIntake, /npm run smoke:target-provider-evidence-intake/);
assert.match(targetProviderEvidenceIntake, /not provider account remediation proof/);
assert.match(targetProviderEvidenceIntake, /Provider blocker closure verification/);
assert.match(targetProviderEvidenceIntake, /blockerClosureVerificationEvidence from target provider operations/);
assert.match(targetProviderEvidenceIntake, /Target provider readiness remains blocked for production-ready claims/);
assert.match(targetProviderOperations, /^# Target Provider Operations v1$/m);
assert.match(targetProviderOperations, /^- status: local-target-provider-operations-current$/m);
assert.match(targetProviderOperations, /^- productionReadyClaim: false$/m);
assert.match(targetProviderOperations, /npm run smoke:target-provider-operations/);
assert.match(targetProviderOperations, /not target-boundary live validation proof/);
assert.match(targetProviderOperations, /target blocker closure verification proof/);
assert.match(targetProviderOperations, /blockerClosureVerificationEvidence/);
assert.match(targetProviderOperations, /cannot bypass `productionReadyClaim: false` while any stop-condition remains/);
assert.match(targetProviderOperations, /Target provider operations remain blocked for production-ready claims/);
assert.match(targetOpenAIProviderAccount, /^# Target OpenAI Provider Account v1$/m);
assert.match(targetOpenAIProviderAccount, /^- status: local-target-openai-provider-account-current$/m);
assert.match(targetOpenAIProviderAccount, /^- productionReadyClaim: false$/m);
assert.match(targetOpenAIProviderAccount, /^- targetOpenAIProviderApproved: false$/m);
assert.match(targetOpenAIProviderAccount, /not OpenAI pilot live validation proof/);
assert.match(targetOpenAIProviderAccount, /OpenAI target production provider readiness remains blocked/);
assert.match(targetAnthropicProviderAccount, /^# Target Anthropic Provider Account v1$/m);
assert.match(targetAnthropicProviderAccount, /^- status: local-target-anthropic-provider-account-current$/m);
assert.match(targetAnthropicProviderAccount, /^- productionReadyClaim: false$/m);
assert.match(targetAnthropicProviderAccount, /^- targetAnthropicProviderApproved: false$/m);
assert.match(targetAnthropicProviderAccount, /not Anthropic live validation proof/);
assert.match(targetAnthropicProviderAccount, /Anthropic provider readiness remains blocked/);
assert.match(targetLocalProviderArchitecture, /^# Target Local Provider Architecture v1$/m);
assert.match(targetLocalProviderArchitecture, /^- status: local-target-local-provider-architecture-current$/m);
assert.match(targetLocalProviderArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetLocalProviderArchitecture, /^- targetLocalProviderApproved: false$/m);
assert.match(targetLocalProviderArchitecture, /not local provider live validation proof/);
assert.match(targetLocalProviderArchitecture, /Local provider readiness remains blocked/);
assert.match(targetHermesProviderArchitecture, /^# Target Hermes Provider Architecture v1$/m);
assert.match(targetHermesProviderArchitecture, /^- status: local-target-hermes-provider-architecture-current$/m);
assert.match(targetHermesProviderArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetHermesProviderArchitecture, /^- targetHermesProviderApproved: false$/m);
assert.match(targetHermesProviderArchitecture, /not Hermes live validation proof/);
assert.match(targetHermesProviderArchitecture, /Hermes provider readiness remains blocked/);
assert.match(productionEnterpriseControls, /^# Production Enterprise Controls Rehearsal v1$/m);
assert.match(productionEnterpriseControls, /^- status: local-enterprise-controls-current$/m);
assert.match(productionEnterpriseControls, /^- productionReadyClaim: false$/m);
assert.match(productionEnterpriseControls, /npm run smoke:production-enterprise-controls/);
assert.match(productionEnterpriseControls, /not identity-backed hosted RBAC/);
assert.match(productionEnterpriseControls, /not hosted tenant isolation/);
assert.match(targetDeploymentContract, /^# Target Deployment Contract v1$/m);
assert.match(targetDeploymentContract, /^- status: target-contract-current$/m);
assert.match(targetDeploymentContract, /^- productionReadyClaim: false$/m);
assert.match(targetDeploymentContract, /Hosted multi-tenant SaaS/);
assert.match(targetDeploymentContract, /Target provider validation/);
assert.match(targetDeploymentContract, /Identity-backed RBAC and session administration/);
assert.match(targetDeploymentContract, /Hosted tenant isolation/);
assert.match(targetDeploymentContract, /not permission to claim `production-ready`/);
assert.match(hostedSaasArchitectureDecision, /^# Hosted SaaS Architecture Decision v1$/m);
assert.match(hostedSaasArchitectureDecision, /^- status: local-hosted-saas-architecture-decision-current$/m);
assert.match(hostedSaasArchitectureDecision, /^- productionReadyClaim: false$/m);
assert.match(hostedSaasArchitectureDecision, /^- hostedSaasApproved: false$/m);
assert.match(hostedSaasArchitectureDecision, /npm run smoke:hosted-saas-architecture-decision/);
assert.match(hostedSaasArchitectureDecision, /not hosted SaaS implementation/);
assert.match(hostedSaasArchitectureDecision, /Hosted SaaS and hybrid control-plane readiness remain blocked/);
assert.match(hostedIdentitySessionArchitecture, /^# Hosted Identity Session Architecture v1$/m);
assert.match(hostedIdentitySessionArchitecture, /^- status: local-hosted-identity-session-architecture-current$/m);
assert.match(hostedIdentitySessionArchitecture, /^- productionReadyClaim: false$/m);
assert.match(hostedIdentitySessionArchitecture, /^- hostedIdentitySessionApproved: false$/m);
assert.match(hostedIdentitySessionArchitecture, /npm run smoke:hosted-identity-session-architecture/);
assert.match(hostedIdentitySessionArchitecture, /not hosted identity implementation/);
assert.match(hostedIdentitySessionArchitecture, /Hosted identity-backed RBAC and session administration remain blocked/);
assert.match(targetIdentitySessionOperations, /^# Target Identity Session Operations v1$/m);
assert.match(targetIdentitySessionOperations, /^- status: local-target-identity-session-operations-current$/m);
assert.match(targetIdentitySessionOperations, /^- productionReadyClaim: false$/m);
assert.match(targetIdentitySessionOperations, /npm run smoke:target-identity-session-operations/);
assert.match(targetIdentitySessionOperations, /not target identity\/session evidence/);
assert.match(targetIdentitySessionOperations, /Target identity\/session operations remain blocked for production-ready claims/);
assert.match(hostedTenantIsolationArchitecture, /^# Hosted Tenant Isolation Architecture v1$/m);
assert.match(hostedTenantIsolationArchitecture, /^- status: local-hosted-tenant-isolation-architecture-current$/m);
assert.match(hostedTenantIsolationArchitecture, /^- productionReadyClaim: false$/m);
assert.match(hostedTenantIsolationArchitecture, /^- hostedTenantIsolationApproved: false$/m);
assert.match(hostedTenantIsolationArchitecture, /npm run smoke:hosted-tenant-isolation-architecture/);
assert.match(hostedTenantIsolationArchitecture, /not hosted tenant isolation implementation/);
assert.match(hostedTenantIsolationArchitecture, /Hosted multi-tenant isolation remains blocked/);
assert.match(targetTenantIsolationOperations, /^# Target Tenant Isolation Operations v1$/m);
assert.match(targetTenantIsolationOperations, /^- status: local-target-tenant-isolation-operations-current$/m);
assert.match(targetTenantIsolationOperations, /^- productionReadyClaim: false$/m);
assert.match(targetTenantIsolationOperations, /npm run smoke:target-tenant-isolation-operations/);
assert.match(targetTenantIsolationOperations, /not target tenant isolation evidence/);
assert.match(targetTenantIsolationOperations, /Target tenant isolation operations remain blocked for production-ready claims/);
assert.match(targetEnvironmentEvidenceIntake, /^# Target Environment Evidence Intake v1$/m);
assert.match(targetEnvironmentEvidenceIntake, /^- status: local-target-environment-evidence-intake-current$/m);
assert.match(targetEnvironmentEvidenceIntake, /^- productionReadyClaim: false$/m);
assert.match(targetEnvironmentEvidenceIntake, /npm run smoke:target-environment-evidence-intake/);
assert.match(targetEnvironmentEvidenceIntake, /## Target Evidence Submission Packet/);
assert.match(targetEnvironmentEvidenceIntake, /## Target Blocker Disposition Register/);
assert.match(targetEnvironmentEvidenceIntake, /## Blocker Closure Verification Matrix/);
assert.match(targetEnvironmentEvidenceIntake, /\| blockerDispositionRegister \|/);
assert.match(targetEnvironmentEvidenceIntake, /target-boundary `live:execution-v1:anthropic` pass/);
assert.match(targetEnvironmentEvidenceIntake, /target-boundary `live:execution-v1:hermes` pass/);
assert.match(targetEnvironmentEvidenceIntake, /Blocker disposition is a stop-condition input, not a waiver/);
assert.match(targetEnvironmentEvidenceIntake, /anthropic-live-validation-missing-or-failed/);
assert.match(targetEnvironmentEvidenceIntake, /target-hermes-provider-approval-missing/);
assert.match(targetEnvironmentEvidenceIntake, /target-environment-evidence-missing/);
assert.match(targetEnvironmentEvidenceIntake, /customer-exception-scope-missing/);
assert.match(targetEnvironmentEvidenceIntake, /matching target boundary, release artifact hygiene, and regenerated release artifacts/);
assert.match(targetEnvironmentEvidenceIntake, /exceptions cannot convert a blocked production-ready claim into production-ready/);
assert.match(targetEnvironmentEvidenceIntake, /not hosted production evidence/);
assert.match(targetEnvironmentEvidenceIntake, /Target environment readiness remains blocked for production-ready claims/);
assert.match(backupRestoreDrill, /^# Backup Restore Drill v1$/m);
assert.match(backupRestoreDrill, /^- status: local-backup-restore-current$/m);
assert.match(backupRestoreDrill, /^- productionReadyClaim: false$/m);
assert.match(backupRestoreDrill, /not hosted backup evidence/);
assert.match(backupRestoreDrill, /tenant delete isolation remains true after restore/);
assert.match(identitySessionAdmin, /^# Identity Session Administration v1$/m);
assert.match(identitySessionAdmin, /^- status: local-identity-session-admin-current$/m);
assert.match(identitySessionAdmin, /^- productionReadyClaim: false$/m);
assert.match(identitySessionAdmin, /not hosted identity evidence/);
assert.match(identitySessionAdmin, /Identity-backed RBAC and session administration remain blocked for production-ready claims/);
assert.match(tenantStorageAdmin, /^# Tenant Storage Administration v1$/m);
assert.match(tenantStorageAdmin, /^- status: local-tenant-storage-admin-current$/m);
assert.match(tenantStorageAdmin, /^- productionReadyClaim: false$/m);
assert.match(tenantStorageAdmin, /not hosted tenant isolation evidence/);
assert.match(tenantStorageAdmin, /Hosted tenant isolation remains blocked for production-ready claims/);
assert.match(customerSupportOperations, /^# Customer Support Operations v1$/m);
assert.match(customerSupportOperations, /^- status: local-support-operations-current$/m);
assert.match(customerSupportOperations, /^- productionReadyClaim: false$/m);
assert.match(customerSupportOperations, /not staffed production support evidence/);
assert.match(customerSupportOperations, /Customer support operations remain blocked for production-ready claims/);
assert.match(supportEscalationReview, /^# Support Escalation Review v1$/m);
assert.match(supportEscalationReview, /^- status: local-support-escalation-review-current$/m);
assert.match(supportEscalationReview, /^- productionReadyClaim: false$/m);
assert.match(supportEscalationReview, /not staffed production support evidence/);
assert.match(supportEscalationReview, /Support escalation and incident review remain blocked for production-ready claims/);
assert.match(targetSupportArchitecture, /^# Target Support Architecture v1$/m);
assert.match(targetSupportArchitecture, /^- status: local-target-support-architecture-current$/m);
assert.match(targetSupportArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetSupportArchitecture, /^- targetSupportApproved: false$/m);
assert.match(targetSupportArchitecture, /not staffed support implementation/);
assert.match(targetSupportArchitecture, /Target support readiness remains blocked/);
assert.match(targetSupportOperations, /^# Target Support Operations v1$/m);
assert.match(targetSupportOperations, /^- status: local-target-support-operations-current$/m);
assert.match(targetSupportOperations, /^- productionReadyClaim: false$/m);
assert.match(targetSupportOperations, /not staffed target support evidence/);
assert.match(targetSupportOperations, /Target support operations remain blocked for production-ready claims/);
assert.match(secretManagement, /^# Secret Management v1$/m);
assert.match(secretManagement, /^- status: local-secret-management-current$/m);
assert.match(secretManagement, /^- productionReadyClaim: false$/m);
assert.match(secretManagement, /not target secret manager evidence/);
assert.match(secretManagement, /Secret management remains blocked for production-ready claims/);
assert.match(targetSecretManagerArchitecture, /^# Target Secret Manager Architecture v1$/m);
assert.match(targetSecretManagerArchitecture, /^- status: local-target-secret-manager-architecture-current$/m);
assert.match(targetSecretManagerArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetSecretManagerArchitecture, /^- targetSecretManagerApproved: false$/m);
assert.match(targetSecretManagerArchitecture, /npm run smoke:target-secret-manager-architecture/);
assert.match(targetSecretManagerArchitecture, /not target secret manager implementation/);
assert.match(targetSecretManagerArchitecture, /Target secret manager readiness remains blocked/);
assert.match(targetSecretManager, /^# Target Secret Manager v1$/m);
assert.match(targetSecretManager, /^- status: local-target-secret-manager-current$/m);
assert.match(targetSecretManager, /^- productionReadyClaim: false$/m);
assert.match(targetSecretManager, /not target secret manager evidence/);
assert.match(targetSecretManager, /Target secret manager readiness remains blocked for production-ready claims/);
assert.match(observabilityTelemetry, /^# Observability Telemetry v1$/m);
assert.match(observabilityTelemetry, /^- status: local-observability-telemetry-current$/m);
assert.match(observabilityTelemetry, /^- productionReadyClaim: false$/m);
assert.match(observabilityTelemetry, /not hosted telemetry evidence/);
assert.match(observabilityTelemetry, /Observability and telemetry remain blocked for production-ready claims/);
assert.match(targetObservabilityArchitecture, /^# Target Observability Architecture v1$/m);
assert.match(targetObservabilityArchitecture, /^- status: local-target-observability-architecture-current$/m);
assert.match(targetObservabilityArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetObservabilityArchitecture, /^- targetObservabilityApproved: false$/m);
assert.match(targetObservabilityArchitecture, /npm run smoke:target-observability-architecture/);
assert.match(targetObservabilityArchitecture, /not target telemetry implementation/);
assert.match(targetObservabilityArchitecture, /Target observability readiness remains blocked/);
assert.match(targetObservabilityOperations, /^# Target Observability Operations v1$/m);
assert.match(targetObservabilityOperations, /^- status: local-target-observability-operations-current$/m);
assert.match(targetObservabilityOperations, /^- productionReadyClaim: false$/m);
assert.match(targetObservabilityOperations, /not target observability evidence/);
assert.match(targetObservabilityOperations, /Target observability operations remain blocked for production-ready claims/);
assert.match(targetSloArchitecture, /^# Target SLO Architecture v1$/m);
assert.match(targetSloArchitecture, /^- status: local-target-slo-architecture-current$/m);
assert.match(targetSloArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetSloArchitecture, /^- targetSloApproved: false$/m);
assert.match(targetSloArchitecture, /npm run smoke:target-slo-architecture/);
assert.match(targetSloArchitecture, /not contractual SLA approval/);
assert.match(targetSloArchitecture, /Target SLO readiness remains blocked/);
assert.match(targetSloOperations, /^# Target SLO Operations v1$/m);
assert.match(targetSloOperations, /^- status: local-target-slo-operations-current$/m);
assert.match(targetSloOperations, /^- productionReadyClaim: false$/m);
assert.match(targetSloOperations, /npm run smoke:target-slo-operations/);
assert.match(targetSloOperations, /not contractual SLA approval/);
assert.match(targetSloOperations, /Target SLO operations remain blocked for production-ready claims/);
assert.match(targetDataLifecycleArchitecture, /^# Target Data Lifecycle Architecture v1$/m);
assert.match(targetDataLifecycleArchitecture, /^- status: local-target-data-lifecycle-architecture-current$/m);
assert.match(targetDataLifecycleArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetDataLifecycleArchitecture, /^- targetDataLifecycleApproved: false$/m);
assert.match(targetDataLifecycleArchitecture, /npm run smoke:target-data-lifecycle-architecture/);
assert.match(targetDataLifecycleArchitecture, /not target retention implementation/);
assert.match(targetDataLifecycleArchitecture, /Target data lifecycle readiness remains blocked/);
assert.match(targetCleanDeploymentArchitecture, /^# Target Clean Deployment Architecture v1$/m);
assert.match(targetCleanDeploymentArchitecture, /^- status: local-target-clean-deployment-architecture-current$/m);
assert.match(targetCleanDeploymentArchitecture, /^- productionReadyClaim: false$/m);
assert.match(targetCleanDeploymentArchitecture, /^- targetCleanDeploymentApproved: false$/m);
assert.match(targetCleanDeploymentArchitecture, /npm run smoke:target-clean-deployment-architecture/);
assert.match(targetCleanDeploymentArchitecture, /not target deployment execution/);
assert.match(targetCleanDeploymentArchitecture, /Target clean deployment readiness remains blocked/);
assert.match(targetCleanDeploymentOperations, /^# Target Clean Deployment Operations v1$/m);
assert.match(targetCleanDeploymentOperations, /^- status: local-target-clean-deployment-operations-current$/m);
assert.match(targetCleanDeploymentOperations, /^- productionReadyClaim: false$/m);
assert.match(targetCleanDeploymentOperations, /npm run smoke:target-clean-deployment-operations/);
assert.match(targetCleanDeploymentOperations, /not target deployment execution/);
assert.match(targetCleanDeploymentOperations, /Target clean deployment operations remain blocked for production-ready claims/);
assert.match(targetRetentionOperations, /^# Target Retention Operations v1$/m);
assert.match(targetRetentionOperations, /^- status: local-target-retention-operations-current$/m);
assert.match(targetRetentionOperations, /^- productionReadyClaim: false$/m);
assert.match(targetRetentionOperations, /not target retention evidence/);
assert.match(targetRetentionOperations, /Target retention operations remain blocked for production-ready claims/);
assert.match(targetBackupOperations, /^# Target Backup Operations v1$/m);
assert.match(targetBackupOperations, /^- status: local-target-backup-operations-current$/m);
assert.match(targetBackupOperations, /^- productionReadyClaim: false$/m);
assert.match(targetBackupOperations, /not target backup evidence/);
assert.match(targetBackupOperations, /Target backup operations remain blocked for production-ready claims/);
for (const severity of ['SEV1', 'SEV2', 'SEV3', 'SEV4']) {
  assert.match(incidentSlo, new RegExp(`\\| ${severity} \\|`));
}
assert.match(productionLikeDrill, /^# Production-Like Release Drill v1$/m);
assert.match(productionLikeDrill, /^- status: dry-run-evidence-(current|failed)$/m);
assert.match(productionLikeDrill, /^- productionReadyClaim: false$/m);
assert.match(productionLikeDrill, /not permission to claim `production-ready`/);
assert.match(pilotExportPackage, /^# Pilot Export Package v1$/m);
assert.match(pilotExportPackage, /^- status: dry-run-package-current$/m);
assert.match(pilotExportPackage, /^- productionReadyClaim: false$/m);
assert.match(pilotExportPackage, /not permission to claim `production-ready`/);
assert.match(pilotExportPackage, /^- bundleSha256: [a-f0-9]{64}$/m);
assert.match(runtimeIsolation, /^# Runtime Isolation v1$/m);
assert.match(runtimeIsolation, /^- productionReadyClaim: false$/m);
assert.match(runtimeIsolation, /npm run smoke:runtime-isolation/);
assert.match(runtimeIsolation, /hosted tenant isolation is not implemented/);
assert.match(retentionDelete, /^# Retention And Delete Policy v1$/m);
assert.match(retentionDelete, /^- status: pilot-policy-evidence-current$/m);
assert.match(retentionDelete, /^- productionReadyClaim: false$/m);
assert.match(retentionDelete, /npm run smoke:retention-delete-policy/);
assert.match(retentionDelete, /not production deletion evidence/);
assert.match(cleanDeploymentRelease, /^# Clean Deployment Release Rehearsal v1$/m);
assert.match(cleanDeploymentRelease, /^- status: clean-local-rehearsal-current$/m);
assert.match(cleanDeploymentRelease, /^- productionReadyClaim: false$/m);
assert.match(cleanDeploymentRelease, /npm run smoke:clean-deployment-release/);
assert.match(cleanDeploymentRelease, /not target production deployment evidence/);

for (const blocker of [
  /Anthropic live validation remains blocked until target Anthropic provider account evidence for billing and credit remediation, active billing plan, available credit balance, ANTHROPIC_API_KEY target secret injection, ANTHROPIC_MODEL access, provider terms and customer approval, quota and spend guard, target-boundary npm run live:execution-v1:anthropic pass, mission and execution session provenance, telemetry, fallback and stop-condition decision, remediation audit, release artifact hygiene result, and regenerated execution snapshot is recorded/,
  /target local provider architecture remains blocked until endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota\/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence are recorded/,
  /Hermes live validation is blocked until target Hermes provider architecture evidence for endpoint ownership, model pinning, target secret injection, tool-call parsing, session lifecycle, transcript policy, quota guard, telemetry, fallback, customer approval, and target-boundary Hermes live validation is recorded/,
  /target deployment contract is blocked until hosted identity\/session administration, target identity\/session operations, tenant storage\/encryption, target tenant isolation operations, target provider operations, target OpenAI provider account, target Anthropic provider account, target local provider architecture, target Hermes provider architecture, target secret manager injection\/audit, target observability architecture\/operations, target SLO architecture, target SLO operations, target data lifecycle architecture, target retention operations, target backup operations, target support architecture, target support operations, target clean deployment architecture, target clean deployment operations, SLO\/SLA, clean deployment, and support escalation review have target-environment evidence/,
  /production release label cannot be claimed until all target production providers and enterprise controls are verified/,
]) {
  assert.match(currentOpenBlockersSection, blocker);
}
assert.doesNotMatch(
  currentOpenBlockersSection,
  /target local provider architecture remains blocked until approved target-boundary endpoint\/model, network isolation, telemetry, quota\/resource guard, and local provider live validation evidence are recorded/,
);
assert.doesNotMatch(
  currentOpenBlockersSection,
  new RegExp('Anthropic live validation is blocked by provider account billing/credit'),
);

assert.match(liveValidation.get('openai') || '', /^passed /);
assert.match(liveValidation.get('anthropic') || '', /^failed /);
assert.match(liveValidation.get('local') || '', /^passed /);
assert.equal(currentStatus.get('openai live validation'), 'passed');
assert.match(currentStatus.get('anthropic live validation') || '', /^failed /);
assert.equal(currentStatus.get('local live validation'), 'passed');
assert.equal(currentStatus.get('hermes live validation'), 'missing-env');

assert.equal(operationalState.get('OpenAI live validation'), 'passed');
assert.match(operationalState.get('Anthropic live validation') || '', /^failed /);
assert.equal(operationalState.get('local provider live validation'), 'passed');
assert.equal(operationalState.get('Hermes live validation'), 'blocked by missing `HERMES_PROVIDER_MODEL`');
assert.match(handoff, /Execution v1 is provider-scoped pilot ready/);
assert.match(handoff, /It is not production-ready or live-provider-complete/);
assert.match(
  handoff,
  /target local provider architecture approval still requires endpoint ownership, LOCAL_PROVIDER_MODEL model pinning, network isolation, secret and credential policy, runtime lifecycle, session and artifact provenance, data residency and transcript policy, quota\/resource guard, telemetry, fallback and customer approval, target-boundary npm run live:execution-v1:local pass, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  handoff,
  new RegExp('target local provider architecture approval still requires ' + 'target-boundary evidence'),
);
assert.doesNotMatch(
  handoff,
  /target local provider architecture approval still requires target-boundary endpoint\/model, network isolation, telemetry, quota\/resource guard, and local provider live validation evidence/,
);
assert.match(releaseReadiness, /The product is not yet ready to be sold or represented as production-ready for other companies\./);
assert.equal(releaseArtifactHygiene.ok, true, JSON.stringify(releaseArtifactHygiene.findings, null, 2));
assert.equal(releaseArtifactHygiene.secretFindingCount, 0, JSON.stringify(releaseArtifactHygiene.findings, null, 2));
assert.equal(releaseArtifactHygiene.machinePathFindingCount, 0, JSON.stringify(releaseArtifactHygiene.findings, null, 2));

console.log(
  JSON.stringify(
    {
      blockedProductionReady: true,
      label: releaseLabel,
      mode: 'production-readiness-gate',
      ok: true,
      openaiLiveValidation: currentStatus.get('openai live validation'),
      pilotCleanDeploymentRelease: 'present',
      pilotIdentitySessionAdmin: 'present',
      pilotTenantStorageAdmin: 'present',
      pilotCustomerSupportOperations: 'present',
      pilotSupportEscalationReview: 'present',
      pilotTargetSupportArchitecture: 'present',
      pilotTargetSupportOperations: 'present',
      pilotExportPackage: 'present',
      pilotIncidentSloPolicy: 'present',
      pilotSecretManagement: 'present',
      pilotTargetSecretManagerArchitecture: 'present',
      pilotTargetSecretManager: 'present',
      pilotObservabilityTelemetry: 'present',
      pilotTargetObservabilityArchitecture: 'present',
      pilotTargetObservabilityOperations: 'present',
      pilotTargetSloArchitecture: 'present',
      pilotTargetSloOperations: 'present',
      pilotTargetDataLifecycleArchitecture: 'present',
      pilotTargetCleanDeploymentArchitecture: 'present',
      pilotTargetCleanDeploymentOperations: 'present',
      pilotTargetRetentionOperations: 'present',
      pilotTargetBackupOperations: 'present',
      pilotProductionEnterpriseControls: 'present',
      pilotProductionProviderReadiness: 'present',
      pilotTargetProviderOperations: 'present',
      pilotTargetOpenAIProviderAccount: 'present',
      pilotTargetAnthropicProviderAccount: 'present',
      pilotTargetLocalProviderArchitecture: 'present',
      pilotTargetHermesProviderArchitecture: 'present',
      pilotProductionRetentionOperating: 'present',
      pilotProductionSloOperating: 'present',
      pilotTargetProviderEvidenceIntake: 'present',
      pilotRetentionDeletePolicy: 'present',
      pilotRuntimeIsolation: 'present',
      pilotTargetDeploymentContract: 'present',
      pilotHostedSaasArchitectureDecision: 'present',
      pilotHostedIdentitySessionArchitecture: 'present',
      pilotTargetIdentitySessionOperations: 'present',
      pilotHostedTenantIsolationArchitecture: 'present',
      pilotTargetTenantIsolationOperations: 'present',
      pilotTargetEnvironmentEvidenceIntake: 'present',
      pilotTargetEnvironmentSubmissionPacket: 'present',
      pilotTargetEnvironmentBlockerDisposition: 'present',
      pilotTargetEnvironmentBlockerClosureMatrix: 'present',
      productionLikeReleaseDrill: 'present',
      productionBlockerCount: extractFollowingListItems(productionReadySection, 'Blockers:').length,
      releaseArtifactHygiene: 'passed',
      releaseArtifactHygieneScannedFiles: releaseArtifactHygiene.scannedFiles.length,
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

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const nextHeadingPrefix = heading.startsWith('### ') ? '\\n### ' : '\\n## ';
  const pattern = new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:${nextHeadingPrefix}|$)`);
  const match = String(markdown || '').match(pattern);
  return match ? String(match[1] || '').trim() : '';
}

function extractListItems(markdown, heading = '') {
  const source = heading ? extractSection(markdown, heading) : markdown;
  return String(source || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function extractFollowingListItems(markdown, marker) {
  const lines = String(markdown || '').split('\n');
  const markerIndex = lines.findIndex((line) => line.trim() === marker);
  if (markerIndex === -1) {
    return [];
  }

  const items = [];
  for (const line of lines.slice(markerIndex + 1)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (items.length > 0) {
        break;
      }
      continue;
    }
    if (!trimmedLine.startsWith('- ')) {
      break;
    }
    items.push(trimmedLine.slice(2).trim());
  }
  return items;
}

function extractStatusMap(markdown, heading) {
  return new Map(
    extractListItems(extractSection(markdown, `## ${heading}`))
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
          return null;
        }
        return [
          String(line.slice(0, separatorIndex) || '').trim(),
          String(line.slice(separatorIndex + 1) || '').trim(),
        ];
      })
      .filter(Boolean),
  );
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
