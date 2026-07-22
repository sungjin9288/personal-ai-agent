import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'pilot-export-package-v1.md');

const BASE_PACKAGE_FILES = [
  'README.md',
  'CHANGELOG.md',
  'links.md',
  'SUPPORT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/security_report.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  'docs/product-plan-v1.md',
  'docs/security-model-v1.md',
  'docs/operator-runbook-v1.md',
  'docs/deployment-pilot-v1.md',
  'docs/pilot-onboarding-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/demo-evidence-index-v1.md',
  'docs/recorded-walkthrough-v1.md',
  'docs/architecture-code-walkthrough-v1.md',
  'docs/provider-readiness-matrix-v1.md',
  'docs/provider-failure-recovery-demo-v1.md',
  'docs/memory-retrieval-quality-fixture-v1.md',
  'docs/ml-rag-development-plan-v1.md',
  'docs/actual-user-query-evaluation-v1.md',
  'docs/smoke-validation-summary-v1.md',
  'docs/external-evidence-blockers-v1.md',
  'docs/operator-surface-demo-evidence-v1.md',
  'evidence/output-artifacts/local-embedding-model-qualification.json',
  'evidence/output-artifacts/local-retrieval-robustness.json',
  'evidence/output-artifacts/local-relevance-reranker-evaluation.json',
  'evidence/output-artifacts/local-reranker-resource-envelope.json',
  'evidence/output-artifacts/local-reranker-runtime-stability.json',
  'evidence/output-artifacts/local-relevance-shadow-integration.json',
  'evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json',
  'evidence/output-artifacts/local-relevance-shadow-replay.json',
  'evidence/output-artifacts/local-relevance-shadow-cache.json',
  'evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json',
  'evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json',
  'evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json',
  'evidence/output-artifacts/approved-learning-rag-feedback.json',
  'evidence/output-artifacts/approved-learning-feedback-quality.json',
  'evidence/output-artifacts/workspace-learning-personalization.json',
  'evidence/output-artifacts/workspace-learning-conflict-revocation.json',
  'evidence/output-artifacts/workspace-learning-operator-override.json',
  'evidence/output-artifacts/workspace-learning-operator-surface.json',
  'evidence/output-artifacts/local-user-learning-personalization.json',
  'evidence/output-artifacts/user-learning-conflict-revocation.json',
  'evidence/output-artifacts/user-learning-operator-override.json',
  'evidence/output-artifacts/user-learning-operator-surface.json',
  'evidence/output-artifacts/local-training-runtime-contract.json',
  'evidence/output-artifacts/local-training-permission-surface.json',
  'evidence/output-artifacts/local-training-environment-preflight.json',
  'evidence/output-artifacts/local-training-toolchain-decision.json',
  'evidence/output-artifacts/local-training-acquisition-request.json',
  'evidence/output-artifacts/local-training-acquisition-runtime-contract.json',
  'evidence/output-artifacts/local-training-acquisition-artifact-verification.json',
  'evidence/output-artifacts/local-training-post-acquisition-readiness.json',
  'evidence/output-artifacts/mlx-lm-lora-training-adapter.json',
  'evidence/output-artifacts/local-training-candidate-artifact-verification.json',
  'evidence/output-artifacts/local-candidate-evaluation-admission.json',
  'evidence/output-artifacts/local-candidate-evaluation-runtime.json',
  'evidence/output-artifacts/local-candidate-evaluation-host-restart-rehearsal.json',
  'evidence/output-artifacts/local-candidate-evaluation-host-restart-receipt.json',
  'evidence/output-artifacts/local-answer-quality-baseline.json',
  'evidence/output-artifacts/local-answer-composition-candidate.json',
  'evidence/output-artifacts/local-answer-composition-robustness.json',
  'evidence/output-artifacts/local-answer-composition-hardening.json',
  'evidence/output-artifacts/answer-input-boundary-evaluation.json',
  'evidence/output-artifacts/local-answer-composition-boundary-regression.json',
  'evidence/output-artifacts/user-query-evaluation-intake.json',
  'evidence/output-artifacts/local-user-query-quality.json',
  'evidence/output-artifacts/local-answer-review-action-generalization.json',
  'evidence/screenshots/workspace-learning-operator-surface.png',
  'evidence/screenshots/user-learning-operator-surface.png',
  'evidence/screenshots/local-training-permission-surface.png',
  'docs/fork-onboarding-v1.md',
  'docs/incident-slo-v1.md',
  'docs/customer-support-operations-v1.md',
  'docs/support-escalation-review-v1.md',
  'docs/target-support-architecture-v1.md',
  'docs/target-support-operations-v1.md',
  'docs/secret-management-v1.md',
  'docs/target-secret-manager-v1.md',
  'docs/observability-telemetry-v1.md',
  'docs/target-observability-architecture-v1.md',
  'docs/target-observability-operations-v1.md',
  'docs/target-slo-architecture-v1.md',
  'docs/target-slo-operations-v1.md',
  'docs/runtime-isolation-v1.md',
  'docs/retention-delete-v1.md',
  'docs/backup-restore-drill-v1.md',
  'docs/target-data-lifecycle-architecture-v1.md',
  'docs/target-clean-deployment-architecture-v1.md',
  'docs/target-clean-deployment-operations-v1.md',
  'docs/target-retention-operations-v1.md',
  'docs/target-backup-operations-v1.md',
  'docs/identity-session-admin-v1.md',
  'docs/tenant-storage-admin-v1.md',
  'docs/clean-deployment-release-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/target-provider-evidence-intake-v1.md',
  'docs/target-provider-operations-v1.md',
  'docs/target-openai-provider-account-v1.md',
  'docs/target-anthropic-provider-account-v1.md',
  'docs/target-local-provider-architecture-v1.md',
  'docs/target-hermes-provider-architecture-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/target-deployment-contract-v1.md',
  'docs/hosted-saas-architecture-decision-v1.md',
  'docs/hosted-identity-session-architecture-v1.md',
  'docs/target-identity-session-operations-v1.md',
  'docs/hosted-tenant-isolation-architecture-v1.md',
  'docs/target-tenant-isolation-operations-v1.md',
  'docs/target-secret-manager-architecture-v1.md',
  'docs/target-environment-evidence-intake-v1.md',
  'docs/release-readiness-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-handoff.md',
];

const generatedAt = new Date().toISOString();
const evidence = readRequiredFile(path.join(repoDir, 'docs', 'execution-v1-evidence.md'));
const closeout = readRequiredFile(path.join(repoDir, 'docs', 'execution-v1-closeout.md'));
const verifiedCommit = extractBulletValue(closeout, 'commit') || extractBulletValue(evidence, 'commit');

if (!/^[0-9a-f]{40}$/i.test(verifiedCommit)) {
  throw new Error(`valid verified commit not found in execution-v1 artifacts: ${verifiedCommit || '<empty>'}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (!fs.existsSync(outputPath)) {
  fs.writeFileSync(outputPath, renderPendingManifest({ generatedAt, verifiedCommit }), 'utf8');
}

const snapshotFiles = [
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-evidence.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-closeout.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`,
  `docs/releases/execution-v1/${verifiedCommit}/snapshot.json`,
];
const fileEntries = [...BASE_PACKAGE_FILES, ...snapshotFiles].map(buildFileEntry);
const missingEntries = fileEntries.filter((entry) => !entry.exists);

if (missingEntries.length > 0) {
  throw new Error(`pilot export package is missing required files: ${missingEntries.map((entry) => entry.path).join(', ')}`);
}

const bundleSha256 = crypto
  .createHash('sha256')
  .update(fileEntries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}`).join('\n'))
  .digest('hex');

fs.writeFileSync(
  outputPath,
  renderManifest({
    bundleSha256,
    fileEntries,
    generatedAt,
    verifiedCommit,
  }),
  'utf8',
);

const hygiene = runReleaseArtifactHygiene({ repoDir });
if (!hygiene.ok) {
  throw new Error(`pilot export package hygiene failed: ${JSON.stringify(hygiene.findings, null, 2)}`);
}

console.log(
  JSON.stringify(
    {
      bundleSha256,
      fileCount: fileEntries.length,
      generatedAt,
      hygiene: 'passed',
      mode: 'pilot-export-package',
      ok: true,
      outputPath: path.relative(repoDir, outputPath),
      verifiedCommit,
    },
    null,
    2,
  ),
);

function buildFileEntry(relativePath) {
  const absolutePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return {
      bytes: 0,
      exists: false,
      path: relativePath,
      sha256: '',
    };
  }

  const content = fs.readFileSync(absolutePath);
  return {
    bytes: content.byteLength,
    exists: true,
    path: relativePath,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

function renderManifest({ bundleSha256, fileEntries, generatedAt, verifiedCommit }) {
  const rows = fileEntries
    .map((entry) => `| \`${entry.path}\` | ${entry.bytes} | \`${entry.sha256}\` |`)
    .join('\n');

  return `# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: ${generatedAt}
- verifiedCommit: ${verifiedCommit}
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: ${bundleSha256}
- fileCount: ${fileEntries.length}
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportArchitecture: [target-support-architecture-v1.md](target-support-architecture-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedTargetSloOperations: [target-slo-operations-v1.md](target-slo-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim \`production-ready\`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
${rows}

## Operator Re-Run

\`\`\`bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
\`\`\`

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep \`productionReadyClaim: false\` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
`;
}

function renderPendingManifest({ generatedAt, verifiedCommit }) {
  return `# Pilot Export Package v1

- status: dry-run-package-pending
- generatedAt: ${generatedAt}
- verifiedCommit: ${verifiedCommit}
- packageMode: manifest-only
- productionReadyClaim: false

## Decision Boundary

This pending placeholder exists only so artifact hygiene can scan the export manifest output path while the package manifest is being generated.

It is not production deployment evidence, not a customer production data export, and not permission to claim \`production-ready\`.
`;
}

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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
