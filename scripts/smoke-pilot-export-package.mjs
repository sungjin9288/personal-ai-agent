import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const manifestPath = path.join(repoDir, 'docs', 'pilot-export-package-v1.md');
const changelogPath = path.join(repoDir, 'CHANGELOG.md');
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
assert.match(manifest, /^- fileCount: 66$/m);
assert.match(manifest, /It is not production deployment evidence/);
assert.match(manifest, /not permission to claim `production-ready`/);

const verifiedCommit = extractBulletValue(manifest, 'verifiedCommit');
assert.match(verifiedCommit, /^[a-f0-9]{40}$/);
const manifestEntries = parseManifestEntries(manifest);
const requiredPaths = [
  'README.md',
  'CHANGELOG.md',
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
assert.match(readme, /Changelog: \[CHANGELOG\.md\]\(CHANGELOG\.md\)/);
assert.match(readme, /Support: \[SUPPORT\.md\]\(SUPPORT\.md\)/);
assert.match(readme, /npm run smoke:changelog/);
assert.match(readme, /npm run smoke:support-policy/);
assert.match(changelog, /# Changelog/);
assert.match(changelog, /SUPPORT\.md/);
assert.match(changelog, /## v0\.1\.0 - 2026-06-23/);
assert.match(changelog, /productionReadyClaim: false/);
assert.match(changelog, /a73b9ec3f5352475c58167dadaa2a6abd4a2ce3814a0d428f93d53ceafd49f07/);

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
