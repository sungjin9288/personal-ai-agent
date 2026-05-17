import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
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
assert.match(pilotReadySection, /Pilot-ready can be claimed only for the validated provider and approved deployment boundary\./);
assert.match(productionReadySection, /^Status: blocked\./m);
assert.match(productionReadySection, /Production-ready must not be claimed from the current state\./);
assert.doesNotMatch(releaseReadiness, /commit\/push remains deferred by operator request/);

for (const blocker of [
  /Anthropic and Hermes live validations are not complete/,
  /target OpenAI provider account is not approved and OpenAI target-boundary live validation evidence is not generated from a production-like environment/,
  /target provider operations evidence is not generated from a production-like environment/,
  /target Anthropic provider account is not approved and Anthropic live validation evidence is not generated from a production-like environment/,
  /target local provider architecture is not approved and target-boundary local provider evidence is not generated from a production-like environment/,
  /target Hermes provider architecture is not approved and Hermes live validation evidence is not generated from a production-like environment/,
  /hosted identity session architecture is not approved and target identity\/session evidence is not generated/,
  /target identity\/session operations evidence is not generated from a production-like environment/,
  /hosted tenant isolation architecture is not approved and target tenant isolation evidence is not generated/,
  /target tenant isolation operations evidence is not generated from a production-like environment/,
  /target secret manager architecture is not approved and target secret manager evidence is not generated from a production-like environment/,
  /target observability architecture is not approved and target observability evidence is not generated from a production-like environment/,
  /target observability telemetry, alert delivery, on-call routing, retention, customer communication, and incident review evidence is not generated from a production-like environment/,
  /target deployment contract is not satisfied by target-environment evidence/,
  /target SLO architecture is not approved and target SLO\/SLA evidence is not generated from a production-like environment/,
  /target SLO operations evidence is not generated from a production-like environment/,
  /target data lifecycle architecture is not approved and target data lifecycle evidence is not generated from a production-like environment/,
  /target retention, export, delete, provider transcript handling, target backup, and post-delete absence evidence is not generated from a production-like environment/,
  /production SLO\/SLA operating evidence is not generated from a production-like environment/,
  /target support architecture is not approved and target support evidence is not generated from a production-like environment/,
  /target support operations, staffed coverage, support audit history, on-call handoff, and incident review evidence are not generated from a production-like environment/,
  /target clean deployment architecture is not approved and target clean deployment evidence is not generated from a production-like environment/,
  /target clean deployment operations evidence is not generated from a production-like environment/,
  /clean deployment release evidence is not generated/,
]) {
  assert.match(productionReadySection, blocker);
}

assert.match(releaseReadiness, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(productPlan, /^- \[x\] Live OpenAI validation archived$/m);
assert.match(productPlan, /^- \[ \] Live Anthropic validation archived$/m);
assert.match(productPlan, /^- \[x\] Live local provider validation archived$/m);
assert.match(productPlan, /^- \[ \] Live Hermes validation archived$/m);
assert.match(
  productPlan,
  /archived local provider validation evidence for the configured local rehearsal/,
);
assert.match(productPlan, /target local provider architecture remains a production gate/);
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
assert.match(targetEnvironmentEvidenceIntake, /hermes-runtime-config-missing/);
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
  /Anthropic live validation is blocked by provider account billing\/credit/,
  /target local provider architecture remains blocked until approved endpoint\/model runtime configuration and target-boundary live validation evidence are recorded/,
  /Hermes live validation is blocked by missing approved endpoint\/model runtime configuration/,
  /target deployment contract is blocked until hosted identity\/session administration, target identity\/session operations, tenant storage\/encryption, target tenant isolation operations, target provider operations, target OpenAI provider account, target Anthropic provider account, target local provider architecture, target Hermes provider architecture, target secret manager injection\/audit, target observability architecture\/operations, target SLO architecture, target SLO operations, target data lifecycle architecture, target retention operations, target backup operations, target support architecture, target support operations, target clean deployment architecture, target clean deployment operations, SLO\/SLA, clean deployment, and support escalation review have target-environment evidence/,
  /production release label cannot be claimed until all target production providers and enterprise controls are verified/,
]) {
  assert.match(currentOpenBlockersSection, blocker);
}

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
