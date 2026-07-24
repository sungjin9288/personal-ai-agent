import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const manifestPath = path.join(repoDir, 'docs', 'pilot-export-package-v1.md');
const changelogPath = path.join(repoDir, 'CHANGELOG.md');
const linksPath = path.join(repoDir, 'links.md');
const portfolioManifestPath = path.join(repoDir, 'portfolio_manifest.md');
const supportPath = path.join(repoDir, 'SUPPORT.md');
const contributingPath = path.join(repoDir, 'CONTRIBUTING.md');
const securityPolicyPath = path.join(repoDir, 'SECURITY.md');
const releaseReadinessPath = path.join(repoDir, 'docs', 'release-readiness-v1.md');
const productPlanPath = path.join(repoDir, 'docs', 'product-plan-v1.md');
const deploymentPath = path.join(repoDir, 'docs', 'deployment-pilot-v1.md');
const operatorRunbookPath = path.join(repoDir, 'docs', 'operator-runbook-v1.md');
const pilotOnboardingPath = path.join(repoDir, 'docs', 'pilot-onboarding-v1.md');
const demoScenariosPath = path.join(repoDir, 'docs', 'demo-scenarios-v1.md');
const demoEvidenceIndexPath = path.join(repoDir, 'docs', 'demo-evidence-index-v1.md');
const recordedWalkthroughPath = path.join(repoDir, 'docs', 'recorded-walkthrough-v1.md');
const architectureCodeWalkthroughPath = path.join(repoDir, 'docs', 'architecture-code-walkthrough-v1.md');
const providerReadinessMatrixPath = path.join(repoDir, 'docs', 'provider-readiness-matrix-v1.md');
const providerFailureRecoveryDemoPath = path.join(repoDir, 'docs', 'provider-failure-recovery-demo-v1.md');
const memoryRetrievalQualityFixturePath = path.join(repoDir, 'docs', 'memory-retrieval-quality-fixture-v1.md');
const mlRagDevelopmentPlanPath = path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md');
const actualUserQueryEvaluationPath = path.join(repoDir, 'docs', 'actual-user-query-evaluation-v1.md');
const smokeValidationSummaryPath = path.join(repoDir, 'docs', 'smoke-validation-summary-v1.md');
const externalEvidenceBlockersPath = path.join(repoDir, 'docs', 'external-evidence-blockers-v1.md');
const forkOnboardingPath = path.join(repoDir, 'docs', 'fork-onboarding-v1.md');
const customerSupportOperationsPath = path.join(repoDir, 'docs', 'customer-support-operations-v1.md');
const targetProviderEvidenceIntakePath = path.join(repoDir, 'docs', 'target-provider-evidence-intake-v1.md');
const targetProviderOperationsPath = path.join(repoDir, 'docs', 'target-provider-operations-v1.md');
const targetDeploymentContractPath = path.join(repoDir, 'docs', 'target-deployment-contract-v1.md');
const securityPath = path.join(repoDir, 'docs', 'security-model-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const manifest = readRequiredFile(manifestPath);
const changelog = readRequiredFile(changelogPath);
const links = readRequiredFile(linksPath);
const portfolioManifest = readRequiredFile(portfolioManifestPath);
const support = readRequiredFile(supportPath);
const contributing = readRequiredFile(contributingPath);
const securityPolicy = readRequiredFile(securityPolicyPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const productPlan = readRequiredFile(productPlanPath);
const deployment = readRequiredFile(deploymentPath);
const operatorRunbook = readRequiredFile(operatorRunbookPath);
const pilotOnboarding = readRequiredFile(pilotOnboardingPath);
const demoScenarios = readRequiredFile(demoScenariosPath);
const demoEvidenceIndex = readRequiredFile(demoEvidenceIndexPath);
const recordedWalkthrough = readRequiredFile(recordedWalkthroughPath);
const architectureCodeWalkthrough = readRequiredFile(architectureCodeWalkthroughPath);
const providerReadinessMatrix = readRequiredFile(providerReadinessMatrixPath);
const providerFailureRecoveryDemo = readRequiredFile(providerFailureRecoveryDemoPath);
const memoryRetrievalQualityFixture = readRequiredFile(memoryRetrievalQualityFixturePath);
const mlRagDevelopmentPlan = readRequiredFile(mlRagDevelopmentPlanPath);
const actualUserQueryEvaluation = readRequiredFile(actualUserQueryEvaluationPath);
const smokeValidationSummary = readRequiredFile(smokeValidationSummaryPath);
const externalEvidenceBlockers = readRequiredFile(externalEvidenceBlockersPath);
const forkOnboarding = readRequiredFile(forkOnboardingPath);
const customerSupportOperations = readRequiredFile(customerSupportOperationsPath);
const targetProviderEvidenceIntake = readRequiredFile(targetProviderEvidenceIntakePath);
const targetProviderOperations = readRequiredFile(targetProviderOperationsPath);
const targetDeploymentContract = readRequiredFile(targetDeploymentContractPath);
const security = readRequiredFile(securityPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['package:pilot-export'], 'node scripts/build-pilot-export-package.mjs');
assert.equal(packageJson.scripts['smoke:pilot-export-package'], 'node scripts/smoke-pilot-export-package.mjs');

assert.match(manifest, /^# Pilot Export Package v1$/m);
assert.match(manifest, /^- status: dry-run-package-current$/m);
assert.match(manifest, /^- packageMode: manifest-only$/m);
assert.match(manifest, /^- productionReadyClaim: false$/m);
assert.match(manifest, /^- shareable: yes-after-hygiene-pass$/m);
assert.match(manifest, /^- bundleSha256: [a-f0-9]{64}$/m);
assert.match(manifest, /^- fileCount: \d+$/m);
assert.match(manifest, /It is not production deployment evidence/);
assert.match(manifest, /not permission to claim `production-ready`/);

const verifiedCommit = extractBulletValue(manifest, 'verifiedCommit');
assert.match(verifiedCommit, /^[a-f0-9]{40}$/);
const zipSha256 = extractBacktickValue(portfolioManifest, '압축 파일 SHA-256');
assert.match(zipSha256, /^[a-f0-9]{64}$/);
const manifestEntries = parseManifestEntries(manifest);
const requiredPaths = [
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
  'evidence/output-artifacts/fine-tuning-data-sufficiency.json',
  'evidence/output-artifacts/fine-tuning-data-collection-plan.json',
  'evidence/output-artifacts/fine-tuning-data-intake-request.json',
  'evidence/output-artifacts/local-training-runtime-contract.json',
  'evidence/output-artifacts/local-training-permission-surface.json',
  'evidence/output-artifacts/local-training-environment-preflight.json',
  'evidence/output-artifacts/local-training-toolchain-decision.json',
  'evidence/output-artifacts/local-training-acquisition-request.json',
  'evidence/output-artifacts/local-training-acquisition-runtime-contract.json',
  'evidence/output-artifacts/local-training-acquisition-artifact-verification.json',
  'evidence/output-artifacts/local-training-post-acquisition-readiness.json',
  'evidence/output-artifacts/mlx-lm-lora-training-adapter.json',
  'evidence/output-artifacts/local-training-runtime-closure-provenance.json',
  'evidence/output-artifacts/local-training-process-supervisor.json',
  'evidence/output-artifacts/local-training-os-isolation.json',
  'evidence/output-artifacts/local-training-runtime-exec-observation.json',
  'evidence/output-artifacts/local-training-runtime-image-provenance.json',
  'evidence/output-artifacts/local-training-darwin-suspended-exec.json',
  'evidence/output-artifacts/local-training-failure-recovery.json',
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
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-evidence.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-closeout.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`,
  `docs/releases/execution-v1/${verifiedCommit}/snapshot.json`,
];
const expectedEntries = requiredPaths.map(buildFileEntry);

assert.equal(Number(extractBulletValue(manifest, 'fileCount')), expectedEntries.length);
assert.equal(manifestEntries.size, expectedEntries.length);

for (const expectedEntry of expectedEntries) {
  const requiredPath = expectedEntry.path;
  assert.match(manifest, new RegExp(`\\| \`${escapeRegExp(requiredPath)}\` \\| \\d+ \\| \`[a-f0-9]{64}\` \\|`));
  assert.deepEqual(manifestEntries.get(requiredPath), {
    bytes: expectedEntry.bytes,
    sha256: expectedEntry.sha256,
  }, requiredPath);
}

const expectedBundleSha256 = crypto
  .createHash('sha256')
  .update(expectedEntries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}`).join('\n'))
  .digest('hex');
assert.equal(extractBulletValue(manifest, 'bundleSha256'), expectedBundleSha256);

assert.doesNotMatch(manifest, /\/Users\/|\/private\/var\/folders\/|\/var\/folders\//);
assert.match(releaseReadiness, /\[pilot-export-package-v1\.md\]\(pilot-export-package-v1\.md\)/);
assert.match(releaseReadiness, /pilot export package manifest: passed/);
assert.match(
  releaseReadiness,
  /target local provider architecture remains blocked until endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded/,
);
assert.match(deployment, /## Pilot Export Package/);
assert.match(deployment, /npm run package:pilot-export/);
assert.match(deployment, /npm run smoke:pilot-export-package/);
assert.match(
  deployment,
  /local provider production claims remain blocked until endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence are recorded/,
);
assert.match(security, /pilot export package manifest/);
assert.match(security, /retention\/export\/delete policy gate/);
assert.match(
  productPlan,
  /run `npm run refresh:execution-v1-artifacts` after each intentional provider proof refresh or source-of-record change/,
);
assert.match(
  productPlan,
  /pilot export package stay aligned while preserving archived live proof by default/,
);
assert.match(
  productPlan,
  /Broaden live validation coverage beyond the archived OpenAI\/local pilot proof/,
);
assert.match(
  productPlan,
  /attach target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  productPlan,
  /target local provider architecture evidence, enforced enterprise controls, and production-like deployment evidence are not complete/,
);
assert.match(
  pilotOnboarding,
  /OpenAI and configured local provider live validation are archived/,
);
assert.match(
  pilotOnboarding,
  /target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence before any production provider claim/,
);
assert.match(
  pilotOnboarding,
  /The remaining blockers are Anthropic billing\/account remediation, target Hermes provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary Hermes live validation, release artifact hygiene, regenerated execution snapshot, target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, regenerated execution snapshot, and target clean deployment controls for source provenance, artifact registry, dependency installation, runtime bootstrap, secret injection, environment boundary, smoke\/health verification, rollback\/recovery, release approval, and failed-deployment containment/,
);
assert.match(
  demoScenarios,
  /OpenAI and configured local provider live validation are archived only for the pilot boundary/,
);
assert.match(
  demoScenarios,
  /Hermes target provider architecture evidence for endpoint ownership proof, HERMES_PROVIDER_MODEL model pinning proof, target secret injection proof, tool-call parsing proof, session lifecycle proof, data and transcript policy proof, quota and rate guard proof, telemetry proof, fallback and stop-condition proof, customer approval proof, target-boundary live validation, release artifact hygiene, and regenerated execution snapshot still required before any provider claim/,
);
assert.match(
  demoScenarios,
  /show Hermes target provider architecture evidence gap and target-boundary live validation requirement if still unapproved/,
);
assert.doesNotMatch(demoScenarios, /Hermes missing runtime env/);
assert.match(
  demoScenarios,
  /target local provider architecture evidence for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot still required for production claims/,
);
assert.match(demoEvidenceIndex, /# Demo Evidence Index v1/);
assert.match(demoEvidenceIndex, /publicHostedDemoUrl: none/);
assert.match(demoEvidenceIndex, /productionReadyClaim: false/);
assert.match(demoEvidenceIndex, /Representative Demo: Release Readiness Evidence Walkthrough/);
assert.match(demoEvidenceIndex, /not a public hosted demo URL/);
assert.match(recordedWalkthrough, /status: recording-script-ready/);
assert.match(recordedWalkthrough, /publicHostedDemoUrl: none/);
assert.match(recordedWalkthrough, /privateRecordedWalkthroughUrl: pending/);
assert.match(recordedWalkthrough, /productionReadyClaim: false/);
assert.match(recordedWalkthrough, /not a hosted demo link/);
assert.match(architectureCodeWalkthrough, /# Architecture Code Walkthrough v1/);
assert.match(architectureCodeWalkthrough, /status: code-walkthrough-current/);
assert.match(architectureCodeWalkthrough, /productionReadyClaim: false/);
assert.match(architectureCodeWalkthrough, /createMissionService/);
assert.match(architectureCodeWalkthrough, /createProviderRegistry/);
assert.match(providerReadinessMatrix, /# Provider Readiness Matrix v1/);
assert.match(providerReadinessMatrix, /status: provider-readiness-matrix-current/);
assert.match(providerReadinessMatrix, /allProviderComplete: false/);
assert.match(providerReadinessMatrix, /OPENAI_API_KEY/);
assert.match(providerReadinessMatrix, /ANTHROPIC_API_KEY/);
assert.match(providerReadinessMatrix, /HERMES_PROVIDER_MODEL/);
assert.match(providerFailureRecoveryDemo, /# Provider Failure Recovery Demo v1/);
assert.match(providerFailureRecoveryDemo, /status: provider-failure-recovery-demo-current/);
assert.match(providerFailureRecoveryDemo, /productionReadyClaim: false/);
assert.match(providerFailureRecoveryDemo, /credentialFreeReplay: yes/);
assert.match(providerFailureRecoveryDemo, /provider attention inbox/);
assert.match(providerFailureRecoveryDemo, /recoverable-provider-failure-only/);
assert.match(providerFailureRecoveryDemo, /non-recoverable-provider-failure/);
assert.match(providerFailureRecoveryDemo, /npm run smoke:provider-failure-recovery-demo/);
assert.match(memoryRetrievalQualityFixture, /# Memory Retrieval Quality Fixture v1/);
assert.match(memoryRetrievalQualityFixture, /status: memory-retrieval-quality-fixture-current/);
assert.match(memoryRetrievalQualityFixture, /productionReadyClaim: false/);
assert.match(memoryRetrievalQualityFixture, /credentialFreeReplay: yes/);
assert.match(memoryRetrievalQualityFixture, /retrieval ranking/);
assert.match(memoryRetrievalQualityFixture, /source diversity/);
assert.match(memoryRetrievalQualityFixture, /fact graph provenance/);
assert.match(memoryRetrievalQualityFixture, /instruction boundary/);
assert.match(memoryRetrievalQualityFixture, /npm run smoke:memory-retrieval-quality-fixture/);
assert.match(mlRagDevelopmentPlan, /# ML, RAG, and Fine-tuning Development Plan v1/);
assert.match(
  mlRagDevelopmentPlan,
  /status: local-synthetic-answer-quality-payload-lifecycle-current/,
);
assert.match(mlRagDevelopmentPlan, /productionReadyClaim: false/);
assert.match(mlRagDevelopmentPlan, /costFreeDefault: true/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:answer-quality-evaluation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:retrieval-corpus-contract/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:retrieval-quality-evaluation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:semantic-retrieval-experiment/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:retrieval-reranking-experiment/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:approved-training-record/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:training-dataset-quality/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-readiness/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-data-sufficiency/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-data-collection-plan/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-data-intake-request/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-data-intake-resolution/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-private-collection-plan/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-private-collection-execution-request/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:fine-tuning-private-collection-execution-resolution/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-runtime/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-environment-preflight/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-toolchain-decision/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-acquisition-request/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-acquisition-resolution/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-training-acquisition-execution-plan/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:candidate-model-evaluation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-answer-quality-baseline/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-answer-composition-candidate/);
assert.match(mlRagDevelopmentPlan, /\| Q3 Evidence-first answer composition \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-answer-composition-robustness/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-answer-composition-hardening/);
assert.match(mlRagDevelopmentPlan, /\| Q4 Answer composition robustness and hardening \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:answer-input-boundary/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-answer-composition-boundary-regression/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:user-query-evaluation-intake/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-user-query-quality/);
assert.match(
  mlRagDevelopmentPlan,
  /npm run smoke:local-answer-review-action-generalization/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| Q7 Reviewer action generalization \| 완료 \|/,
);
assert.match(mlRagDevelopmentPlan, /npm run smoke:actual-user-query-evaluation-readiness/);
assert.match(
  mlRagDevelopmentPlan,
  /\| Q8 Actual user-query evaluation protocol \| 프로토콜 완료 · 데이터 대기 \|/,
);
assert.match(actualUserQueryEvaluation, /^# Actual User-Query Evaluation v1$/m);
assert.match(actualUserQueryEvaluation, /^- actualUserQueryData: false$/m);
assert.match(actualUserQueryEvaluation, /Q7 v5 reviewer-action baseline/);
assert.match(mlRagDevelopmentPlan, /\| Q5 Adversarial input boundary and user-query intake \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| Q2 Actual local answer-quality baseline \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:workspace-learning-conflict-revocation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:workspace-learning-operator-override/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:workspace-learning-operator-surface/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-user-learning-personalization/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:user-learning-conflict-revocation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:user-learning-operator-override/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:user-learning-operator-surface/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-relevance-shadow-cache/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-relevance-shadow-cache-lifecycle/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-relevance-shadow-cache-process-isolation/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:local-relevance-shadow-cache-termination-soak/);
assert.match(mlRagDevelopmentPlan, /npm run smoke:approved-learning-rag-feedback/);
assert.match(mlRagDevelopmentPlan, /\| R1 Corpus contract \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R2 Retrieval evaluation \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R3 Optional semantic retrieval \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R4 Reranking \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R13 Bounded shadow score cache \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R14 Shadow cache lifecycle stress \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R15 Shadow cache process isolation \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| R16 Shadow cache termination recovery and bounded soak \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| F2a Local training runtime contract \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| F2b Local training product permission surface \| 완료 \|/);
assert.match(
  mlRagDevelopmentPlan,
  /\| F2c\.1 Local training environment preflight \| 완료 · 실행 차단 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| F2c\.2 Local training toolchain decision \| 완료 · 승인 대기 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| F2c\.3 Local training acquisition approval contract \| 완료 · owner 승인 대기 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| F2c\.4 Local training acquisition resolution surface \| 완료 · 실제 decision 대기 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| F2c\.5 Local training acquisition execution plan \| 완료 · 실제 승인 대기 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /\| F1\.19 Private answer-quality case payload lifecycle \| 완료 · 실제 owner decision 대기 \|/,
);
assert.match(
  mlRagDevelopmentPlan,
  /npm run smoke:fine-tuning-private-answer-quality-case-payload/,
);
assert.match(
  mlRagDevelopmentPlan,
  /npm run smoke:fine-tuning-private-answer-quality-case-payload-lifecycle/,
);
assert.match(mlRagDevelopmentPlan, /\| P1 Approved learning RAG feedback \| 완료 \|/);
assert.match(mlRagDevelopmentPlan, /\| L1 승인된 학습 데이터 \| 완료 \|/);
assert.match(smokeValidationSummary, /# Smoke Validation Summary v1/);
assert.match(smokeValidationSummary, /status: smoke-validation-summary-current/);
assert.match(smokeValidationSummary, /productionReadyClaim: false/);
assert.match(smokeValidationSummary, /allProviderComplete: false/);
assert.match(smokeValidationSummary, /deterministic local smoke summary/);
assert.match(smokeValidationSummary, /npm run smoke:smoke-validation-summary/);
assert.match(smokeValidationSummary, /npm run smoke:portfolio-zip/);
assert.match(smokeValidationSummary, /not live all-provider validation/);
assert.match(externalEvidenceBlockers, /# External Evidence Blockers v1/);
assert.match(externalEvidenceBlockers, /status: external-evidence-blockers-current/);
assert.match(externalEvidenceBlockers, /externalEvidenceRequired: true/);
assert.match(externalEvidenceBlockers, /Anthropic billing and live validation/);
assert.match(externalEvidenceBlockers, /Hermes target provider architecture and live validation/);
assert.match(externalEvidenceBlockers, /Public or private walkthrough URL/);
assert.match(externalEvidenceBlockers, /Actual pilot feedback and metrics/);
assert.match(externalEvidenceBlockers, /npm run smoke:external-evidence-blockers/);
assert.match(demoEvidenceIndex, /evidence\/screenshots\/representative-release-demo-release-status\.png/);
assert.match(demoEvidenceIndex, /npm run smoke:demo-evidence-index/);
assert.match(contributing, /# Contributing/);
assert.match(contributing, /Current validated claim: `provider-scoped pilot-ready`/);
assert.match(contributing, /npm run smoke:changelog/);
assert.match(contributing, /npm run smoke:support-policy/);
assert.match(contributing, /npm run smoke:contributor-onboarding/);
assert.match(contributing, /not a public hosted demo URL/);
assert.match(securityPolicy, /# Security Policy/);
assert.match(securityPolicy, /local-first PoC\/MVP harness/);
assert.match(securityPolicy, /no production service endpoint or public hosted demo URL/);
assert.match(securityPolicy, /\[SUPPORT\.md\]\(SUPPORT\.md\)/);
assert.match(support, /# Support/);
assert.match(support, /local-first PoC\/MVP harness/);
assert.match(support, /npm run smoke:support-policy/);
assert.match(support, /productionReadyClaim: false/);
assert.match(support, /There is no public hosted demo URL/);
assert.match(links, /- Support: SUPPORT\.md/);
assert.match(links, /- Bug report template: \.github\/ISSUE_TEMPLATE\/bug_report\.yml/);
assert.match(links, /Issue handoff: blank issues are disabled/);
assert.match(links, /npm run doctor:summary/);
assert.match(links, /Doctor diagnostics summary/);
assert.match(forkOnboarding, /# Fork Onboarding v1/);
assert.match(forkOnboarding, /publicHostedDemoUrl: none/);
assert.match(forkOnboarding, /productionReadyClaim: false/);
assert.match(forkOnboarding, /npm run smoke:contributor-onboarding/);
assert.match(forkOnboarding, /There is no public hosted demo URL/);
assert.match(
  operatorRunbook,
  /target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence before a production provider claim/,
);
assert.match(
  customerSupportOperations,
  /optional Anthropic\/Hermes validation or target local provider architecture approval is excluded or pending/,
);
assert.match(
  targetProviderEvidenceIntake,
  /configured local provider pilot proof is archived but target local provider architecture remains unapproved/,
);
assert.match(
  targetProviderOperations,
  /OpenAI and configured local provider archived pilot live validations exist; Anthropic account blocker, target local provider architecture approval gap for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot evidence, and target Hermes provider architecture approval gap are explicit/,
);
assert.doesNotMatch(
  targetProviderOperations,
  /target local provider architecture approval gap for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot, and target Hermes provider architecture approval gap are explicit/,
);
assert.match(
  targetDeploymentContract,
  /OpenAI and configured local provider live evidence are archived for the pilot boundary; Anthropic account blocker, target local provider architecture approval gap for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot evidence, and target Hermes provider architecture approval gap are explicit/,
);
assert.doesNotMatch(
  targetDeploymentContract,
  /target local provider architecture approval gap for endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof, target-boundary local live validation, release artifact hygiene, and regenerated execution snapshot, and target Hermes provider architecture approval gap are explicit/,
);
assert.match(
  security,
  /run `npm run refresh:execution-v1-artifacts` after selected-provider evidence refresh or source-of-record changes/,
);
assert.match(
  security,
  /closeout, handoff, provider readiness, immutable snapshot, and pilot export package stay aligned while preserving archived live proof by default/,
);
assert.match(
  security,
  /document any accepted risk in the handoff or target evidence accepted risk register with owner and next review date/,
);
assert.match(
  security,
  /selected-provider live validation must be regenerated into evidence before expanding provider-backed readiness beyond the current archived OpenAI\/local pilot proof/,
);
assert.match(
  security,
  /OpenAI and local provider live evidence are archived in the current evidence pack, with local provider proof scoped to the configured local rehearsal/,
);
assert.match(
  security,
  /target local provider architecture remains blocked until endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence is recorded/,
);
assert.match(
  readme,
  /target local provider architecture still requires endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, secret and credential policy proof, runtime lifecycle proof, session and artifact provenance proof with mission id, execution session id, provider response id or equivalent, retry lineage, artifact provenance, and handoff reference, data residency and transcript policy proof, quota and resource guard proof, telemetry proof, fallback and customer approval proof with fallback policy id, stop reason, and recoverable-provider-failure-only stop evidence, provider operations proof, target-boundary live:execution-v1:local proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(readme, /npm run package:pilot-export/);
assert.match(readme, /npm run doctor/);
assert.match(readme, /npm run smoke:doctor/);
assert.match(readme, /npm run smoke:ui-doctor-surface/);
assert.match(readme, /Changelog: \[CHANGELOG\.md\]\(CHANGELOG\.md\)/);
assert.match(readme, /Support: \[SUPPORT\.md\]\(SUPPORT\.md\)/);
assert.match(readme, /npm run smoke:changelog/);
assert.match(readme, /npm run smoke:support-policy/);
assert.match(changelog, /# Changelog/);
assert.match(changelog, /SUPPORT\.md/);
assert.match(changelog, /## v0\.1\.0 - 2026-06-23/);
assert.match(changelog, /\/api\/doctor/);
assert.match(changelog, /productionReadyClaim: false/);
assert.match(changelog, new RegExp(escapeRegExp(zipSha256)));

console.log(
  JSON.stringify(
    {
      fileCount: expectedEntries.length,
      mode: 'pilot-export-package',
      ok: true,
      path: 'docs/pilot-export-package-v1.md',
      verifiedCommit,
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

function extractBacktickValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+\`([^\`]+)\`$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function buildFileEntry(relativePath) {
  const absolutePath = path.join(repoDir, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, relativePath);
  const content = fs.readFileSync(absolutePath);
  return {
    bytes: content.byteLength,
    path: relativePath,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

function parseManifestEntries(markdown) {
  const entries = new Map();
  const rowPattern = /^\| `([^`]+)` \| (\d+) \| `([a-f0-9]{64})` \|$/gm;
  let match;
  while ((match = rowPattern.exec(String(markdown || ''))) !== null) {
    entries.set(match[1], {
      bytes: Number(match[2]),
      sha256: match[3],
    });
  }
  return entries;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
