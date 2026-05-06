import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-clean-deployment-architecture-v1.md');
const cleanDeploymentPath = path.join(docsDir, 'clean-deployment-release-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const cleanDeployment = readRequiredFile(cleanDeploymentPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-clean-deployment-architecture'],
  'node scripts/smoke-target-clean-deployment-architecture.mjs',
);

assert.match(decision, /^# Target Clean Deployment Architecture v1$/m);
assert.match(decision, /^- status: local-target-clean-deployment-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetCleanDeploymentApproved: false$/m);
assert.match(decision, /not target deployment execution/);
assert.match(decision, /not artifact registry evidence/);
assert.match(decision, /not rollback execution proof/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target clean deployment readiness remains blocked/);

for (const area of [
  'Source provenance',
  'Artifact registry',
  'Dependency installation',
  'Runtime bootstrap',
  'Secret injection',
  'Environment boundary',
  'Migration and data readiness',
  'Smoke and health verification',
  'Rollback and recovery',
  'Release approval',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /source provenance proof with branch, commit, review owner, build actor, release tag, and tamper-control decision/,
  /artifact registry proof with immutable artifact id, sha256, registry path, retention policy, access owner, and promotion rule/,
  /dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, and owner/,
  /runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, and bootstrap owner/,
  /secret injection proof with target secret manager alias, injection path, rotation state, redaction check, break-glass owner, and access audit/,
  /environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner/,
  /migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result/,
  /smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results/,
  /rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision/,
  /release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner/,
  /migration plan from tracked-files-only local clean rehearsal to approved target clean deployment workflow/,
  /explicit containment plan for dependency drift, failed bootstrap, failed secret injection, rollback failure, and misleading release approval/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-clean-deployment-architecture',
  'npm run rehearsal:clean-deployment-release',
  'npm run smoke:clean-deployment-release',
  'npm run drill:production-like-release',
  'npm run smoke:production-like-release-drill',
  'npm run package:pilot-export',
  'npm run smoke:pilot-export-package',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(cleanDeployment, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(targetContract, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(targetContract, /target clean deployment architecture is approved/);
assert.match(intake, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(intake, /npm run smoke:target-clean-deployment-architecture/);
assert.match(releaseReadiness, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target clean deployment architecture gate: passed/);
assert.match(security, /\[target-clean-deployment-architecture-v1\.md\]\(target-clean-deployment-architecture-v1\.md\)/);
assert.match(deployment, /## Target Clean Deployment Architecture/);
assert.match(deployment, /npm run smoke:target-clean-deployment-architecture/);
assert.match(productPlan, /\[x\] Target clean deployment architecture gate implemented/);
assert.match(readme, /docs\/target-clean-deployment-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-clean-deployment-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-clean-deployment-architecture',
      ok: true,
      path: 'docs/target-clean-deployment-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 11,
      targetCleanDeploymentApproved: false,
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
