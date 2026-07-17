import assert from 'node:assert/strict';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const result = runReleaseArtifactHygiene();

assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
assert.equal(result.secretFindingCount, 0, JSON.stringify(result.findings, null, 2));
assert.equal(result.machinePathFindingCount, 0, JSON.stringify(result.findings, null, 2));
assert.equal(result.scannedFiles.includes('CHANGELOG.md'), true);
assert.equal(result.scannedFiles.includes('SUPPORT.md'), true);
assert.equal(result.scannedFiles.includes('CONTRIBUTING.md'), true);
assert.equal(result.scannedFiles.includes('SECURITY.md'), true);
assert.equal(result.scannedFiles.includes('.github/ISSUE_TEMPLATE/bug_report.yml'), true);
assert.equal(result.scannedFiles.includes('.github/ISSUE_TEMPLATE/security_report.yml'), true);
assert.equal(result.scannedFiles.includes('.github/ISSUE_TEMPLATE/config.yml'), true);
assert.equal(result.scannedFiles.includes('docs/execution-v1-evidence.md'), true);
assert.equal(result.scannedFiles.includes('docs/execution-v1-closeout.md'), true);
assert.equal(result.scannedFiles.includes('docs/execution-v1-handoff.md'), true);
assert.equal(result.scannedFiles.includes('docs/demo-evidence-index-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/recorded-walkthrough-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/architecture-code-walkthrough-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/provider-readiness-matrix-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/provider-failure-recovery-demo-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/memory-retrieval-quality-fixture-v1.md'), true);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-training-runtime-contract.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-training-permission-surface.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-answer-quality-baseline.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-answer-composition-candidate.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-answer-composition-robustness.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-answer-composition-hardening.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/answer-input-boundary-evaluation.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-answer-composition-boundary-regression.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/user-query-evaluation-intake.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/output-artifacts/local-user-query-quality.json'),
  true,
);
assert.equal(
  result.scannedFiles.includes(
    'evidence/output-artifacts/local-answer-review-action-generalization.json',
  ),
  true,
);
assert.equal(
  result.scannedFiles.includes('evidence/screenshots/local-training-permission-surface.png'),
  true,
);
assert.equal(result.scannedFiles.includes('docs/smoke-validation-summary-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/external-evidence-blockers-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/fork-onboarding-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/pilot-export-package-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-like-release-drill-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/retention-delete-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/clean-deployment-release-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-slo-operating-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-retention-operating-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-provider-readiness-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-provider-evidence-intake-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-provider-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-openai-provider-account-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-anthropic-provider-account-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-local-provider-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-hermes-provider-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-enterprise-controls-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-deployment-contract-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/hosted-saas-architecture-decision-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/hosted-identity-session-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-identity-session-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/hosted-tenant-isolation-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-tenant-isolation-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-secret-manager-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-environment-evidence-intake-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/backup-restore-drill-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-data-lifecycle-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-clean-deployment-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-clean-deployment-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-retention-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/identity-session-admin-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/tenant-storage-admin-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/customer-support-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/support-escalation-review-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-support-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-support-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/secret-management-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-secret-manager-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/observability-telemetry-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-observability-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-observability-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-slo-architecture-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-slo-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-backup-operations-v1.md'), true);
assert.equal(Boolean(result.verifiedCommit), true);
assert.equal(
  result.scannedFiles.some(
    (filePath) =>
      filePath === `docs/releases/execution-v1/${result.verifiedCommit}/execution-v1-evidence.md`,
  ),
  true,
);
assert.equal(
  result.scannedFiles.some(
    (filePath) =>
      filePath === `docs/releases/execution-v1/${result.verifiedCommit}/execution-v1-handoff.md`,
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      machinePathFindingCount: result.machinePathFindingCount,
      mode: 'release-artifact-hygiene',
      ok: true,
      scannedFileCount: result.scannedFiles.length,
      secretFindingCount: result.secretFindingCount,
      verifiedCommit: result.verifiedCommit,
    },
    null,
    2,
  ),
);
