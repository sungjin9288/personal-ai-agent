import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const evidencePath = path.join(docsDir, 'execution-v1-evidence.md');
const closeoutPath = path.join(docsDir, 'execution-v1-closeout.md');
const handoffPath = path.join(docsDir, 'execution-v1-handoff.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');
const productionSloOperatingPath = path.join(docsDir, 'production-slo-operating-v1.md');
const productionRetentionOperatingPath = path.join(docsDir, 'production-retention-operating-v1.md');
const productionProviderReadinessPath = path.join(docsDir, 'production-provider-readiness-v1.md');
const productionEnterpriseControlsPath = path.join(docsDir, 'production-enterprise-controls-v1.md');
const targetDeploymentContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const backupRestoreDrillPath = path.join(docsDir, 'backup-restore-drill-v1.md');
const identitySessionAdminPath = path.join(docsDir, 'identity-session-admin-v1.md');
const tenantStorageAdminPath = path.join(docsDir, 'tenant-storage-admin-v1.md');
const customerSupportOperationsPath = path.join(docsDir, 'customer-support-operations-v1.md');
const supportEscalationReviewPath = path.join(docsDir, 'support-escalation-review-v1.md');
const secretManagementPath = path.join(docsDir, 'secret-management-v1.md');
const targetSecretManagerPath = path.join(docsDir, 'target-secret-manager-v1.md');
const observabilityTelemetryPath = path.join(docsDir, 'observability-telemetry-v1.md');
const targetObservabilityOperationsPath = path.join(docsDir, 'target-observability-operations-v1.md');
const pilotExportPackagePath = path.join(docsDir, 'pilot-export-package-v1.md');
const productionLikeDrillPath = path.join(docsDir, 'production-like-release-drill-v1.md');
const runtimeIsolationPath = path.join(docsDir, 'runtime-isolation-v1.md');
const retentionDeletePath = path.join(docsDir, 'retention-delete-v1.md');
const cleanDeploymentReleasePath = path.join(docsDir, 'clean-deployment-release-v1.md');

const releaseReadiness = readRequiredFile(releaseReadinessPath);
const evidence = readRequiredFile(evidencePath);
const closeout = readRequiredFile(closeoutPath);
const handoff = readRequiredFile(handoffPath);
const incidentSlo = readRequiredFile(incidentSloPath);
const productionSloOperating = readRequiredFile(productionSloOperatingPath);
const productionRetentionOperating = readRequiredFile(productionRetentionOperatingPath);
const productionProviderReadiness = readRequiredFile(productionProviderReadinessPath);
const productionEnterpriseControls = readRequiredFile(productionEnterpriseControlsPath);
const targetDeploymentContract = readRequiredFile(targetDeploymentContractPath);
const backupRestoreDrill = readRequiredFile(backupRestoreDrillPath);
const identitySessionAdmin = readRequiredFile(identitySessionAdminPath);
const tenantStorageAdmin = readRequiredFile(tenantStorageAdminPath);
const customerSupportOperations = readRequiredFile(customerSupportOperationsPath);
const supportEscalationReview = readRequiredFile(supportEscalationReviewPath);
const secretManagement = readRequiredFile(secretManagementPath);
const targetSecretManager = readRequiredFile(targetSecretManagerPath);
const observabilityTelemetry = readRequiredFile(observabilityTelemetryPath);
const targetObservabilityOperations = readRequiredFile(targetObservabilityOperationsPath);
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
assert.match(pilotReadySection, /^Status: pass, scoped to OpenAI-backed local-first\/self-hosted pilot\./m);
assert.match(pilotReadySection, /Pilot-ready can be claimed only for the validated provider and approved deployment boundary\./);
assert.match(productionReadySection, /^Status: blocked\./m);
assert.match(productionReadySection, /Production-ready must not be claimed from the current state\./);

for (const blocker of [
  /Anthropic, local, and Hermes live validations are not complete/,
  /identity-backed hosted RBAC\/session administration is not implemented/,
  /hosted tenant isolation is out of v1 scope/,
  /target secret manager injection, rotation, access policy, break-glass, revocation, and audit evidence is not generated from a production-like environment/,
  /target observability telemetry, alert delivery, on-call routing, retention, customer communication, and incident review evidence is not generated from a production-like environment/,
  /target deployment contract is not satisfied by target-environment evidence/,
  /production retention\/export\/delete verification is not complete/,
  /production SLO\/SLA operating evidence is not generated from a production-like environment/,
  /staffed customer support operations, support audit history, and incident review evidence are not generated from a production-like environment/,
  /clean deployment release evidence is not generated/,
]) {
  assert.match(productionReadySection, blocker);
}

assert.match(releaseReadiness, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(releaseReadiness, /\[production-slo-operating-v1\.md\]\(production-slo-operating-v1\.md\)/);
assert.match(releaseReadiness, /\[production-retention-operating-v1\.md\]\(production-retention-operating-v1\.md\)/);
assert.match(releaseReadiness, /\[production-provider-readiness-v1\.md\]\(production-provider-readiness-v1\.md\)/);
assert.match(releaseReadiness, /\[production-enterprise-controls-v1\.md\]\(production-enterprise-controls-v1\.md\)/);
assert.match(releaseReadiness, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(releaseReadiness, /\[backup-restore-drill-v1\.md\]\(backup-restore-drill-v1\.md\)/);
assert.match(releaseReadiness, /\[identity-session-admin-v1\.md\]\(identity-session-admin-v1\.md\)/);
assert.match(releaseReadiness, /\[tenant-storage-admin-v1\.md\]\(tenant-storage-admin-v1\.md\)/);
assert.match(releaseReadiness, /\[customer-support-operations-v1\.md\]\(customer-support-operations-v1\.md\)/);
assert.match(releaseReadiness, /\[support-escalation-review-v1\.md\]\(support-escalation-review-v1\.md\)/);
assert.match(releaseReadiness, /\[secret-management-v1\.md\]\(secret-management-v1\.md\)/);
assert.match(releaseReadiness, /\[target-secret-manager-v1\.md\]\(target-secret-manager-v1\.md\)/);
assert.match(releaseReadiness, /\[observability-telemetry-v1\.md\]\(observability-telemetry-v1\.md\)/);
assert.match(
  releaseReadiness,
  /\[target-observability-operations-v1\.md\]\(target-observability-operations-v1\.md\)/,
);
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
assert.match(secretManagement, /^# Secret Management v1$/m);
assert.match(secretManagement, /^- status: local-secret-management-current$/m);
assert.match(secretManagement, /^- productionReadyClaim: false$/m);
assert.match(secretManagement, /not target secret manager evidence/);
assert.match(secretManagement, /Secret management remains blocked for production-ready claims/);
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
assert.match(targetObservabilityOperations, /^# Target Observability Operations v1$/m);
assert.match(targetObservabilityOperations, /^- status: local-target-observability-operations-current$/m);
assert.match(targetObservabilityOperations, /^- productionReadyClaim: false$/m);
assert.match(targetObservabilityOperations, /not target observability evidence/);
assert.match(targetObservabilityOperations, /Target observability operations remain blocked for production-ready claims/);
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
  /local provider live validation is blocked by missing approved endpoint\/model runtime configuration/,
  /Hermes live validation is blocked by missing approved endpoint\/model runtime configuration/,
  /target deployment contract is blocked until hosted identity\/session administration, tenant storage\/encryption, target secret manager injection\/audit, target observability operations, backup, retention, SLO\/SLA, clean deployment, support operations, and support escalation review have target-environment evidence/,
  /production release label cannot be claimed until all target production providers and enterprise controls are verified/,
]) {
  assert.match(currentOpenBlockersSection, blocker);
}

assert.match(liveValidation.get('openai') || '', /^passed /);
assert.match(liveValidation.get('anthropic') || '', /^failed /);
assert.equal(currentStatus.get('openai live validation'), 'passed');
assert.match(currentStatus.get('anthropic live validation') || '', /^failed /);
assert.equal(currentStatus.get('local live validation'), 'missing-env');
assert.equal(currentStatus.get('hermes live validation'), 'missing-env');

assert.equal(operationalState.get('OpenAI live validation'), 'passed');
assert.match(operationalState.get('Anthropic live validation') || '', /^failed /);
assert.equal(operationalState.get('local provider live validation'), 'blocked by missing `LOCAL_PROVIDER_BASE_URL`');
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
      pilotExportPackage: 'present',
      pilotIncidentSloPolicy: 'present',
      pilotSecretManagement: 'present',
      pilotTargetSecretManager: 'present',
      pilotObservabilityTelemetry: 'present',
      pilotTargetObservabilityOperations: 'present',
      pilotProductionEnterpriseControls: 'present',
      pilotProductionProviderReadiness: 'present',
      pilotProductionRetentionOperating: 'present',
      pilotProductionSloOperating: 'present',
      pilotRetentionDeletePolicy: 'present',
      pilotRuntimeIsolation: 'present',
      pilotTargetDeploymentContract: 'present',
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
