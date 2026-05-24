import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetCleanOperationsPath = path.join(docsDir, 'target-clean-deployment-operations-v1.md');
const targetCleanArchitecturePath = path.join(docsDir, 'target-clean-deployment-architecture-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetCleanOperations = readRequiredFile(targetCleanOperationsPath);
const targetCleanArchitecture = readRequiredFile(targetCleanArchitecturePath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-clean-deployment-operations'],
  'node scripts/smoke-target-clean-deployment-operations.mjs',
);

assert.match(targetCleanOperations, /^# Target Clean Deployment Operations v1$/m);
assert.match(targetCleanOperations, /^- status: local-target-clean-deployment-operations-current$/m);
assert.match(targetCleanOperations, /^- productionReadyClaim: false$/m);
assert.match(targetCleanOperations, /not target clean deployment architecture approval/);
assert.match(targetCleanOperations, /not target deployment execution/);
assert.match(targetCleanOperations, /not artifact registry proof/);
assert.match(targetCleanOperations, /not target rollback proof/);
assert.match(targetCleanOperations, /not permission to claim `production-ready`/);
assert.match(targetCleanOperations, /Target clean deployment operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Clean Deployment Operation Controls',
  '## Clean Deployment Evidence Packet',
  '## Clean Deployment Operation Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetCleanOperations, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
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
  assert.match(targetCleanOperations, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /source provenance proof with approved branch, commit, review owner, build actor, release tag, and tamper-control decision/,
  /artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull\/download proof/,
  /dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner/,
  /runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner/,
  /secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof/,
  /environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner/,
  /migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result/,
  /smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results/,
  /rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision/,
  /release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner/,
  /artifact hygiene and production readiness gate result/,
  /residual risk, decision owner, next review date, and failed-deployment containment plan/,
]) {
  assert.match(targetCleanOperations, packetItem);
}
assert.doesNotMatch(targetCleanOperations, /target secret manager alias, injection path/);
assert.doesNotMatch(targetCleanOperations, /secret injection proof with target secret manager alias/);

for (const command of [
  'npm run smoke:target-clean-deployment-operations',
  'npm run smoke:target-clean-deployment-architecture',
  'npm run rehearsal:clean-deployment-release',
  'npm run smoke:clean-deployment-release',
  'npm run drill:production-like-release',
  'npm run smoke:production-like-release-drill',
  'npm run package:pilot-export',
  'npm run smoke:pilot-export-package',
  'npm run smoke:target-secret-manager',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(targetCleanOperations, new RegExp(escapeRegExp(command)));
}

assert.match(targetCleanArchitecture, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(targetContract, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(targetContract, /target clean deployment operations evidence is captured/);
assert.match(targetEnvironment, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(targetEnvironment, /target clean deployment operations evidence/);
assert.match(releaseReadiness, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(releaseReadiness, /target clean deployment operations gate: passed/);
assert.match(
  releaseReadiness,
  /target clean deployment operations evidence for source provenance proof with approved branch, commit, review owner, build actor, release tag, tamper-control decision, and source approval, artifact registry proof with immutable artifact id, registry path, sha256, retention policy, access owner, promotion rule, and pull\/download proof, dependency installation proof with lockfile source, install command, cache policy, vulnerability scan result, reproducibility record, install log, and owner, runtime bootstrap proof with deployment profile, runtime root, process manager, health endpoint result, startup log, restart policy, and bootstrap owner, secret injection proof with approved secret manager platform proof, runtime injection path proof, least-privilege access policy proof, rotation and revocation event proof, redaction and leakage review proof, break-glass governance proof, secret access audit log proof, and credential containment proof, environment boundary proof with target environment name, network boundary, storage boundary, tenant profile, operator access policy, and rollback owner, migration and data readiness proof with migration command, seed\/import policy, backup precheck, rollback point, data owner approval, and validation result, smoke and health verification proof with health, auth, provider, tenant isolation, artifact hygiene, release readiness, and target deployment contract results, rollback and recovery proof with rollback artifact, rollback command, recovery time result, validation command, owner, and residual risk decision, release approval proof with change ticket or equivalent approval, approver, evidence packet, customer communication, freeze exception, and final decision owner, artifact hygiene and production readiness gate result, residual risk, decision owner, next review date, and failed-deployment containment plan is not generated from a production-like environment/,
);
assert.doesNotMatch(releaseReadiness, /secret injection proof with target secret manager alias/);
assert.doesNotMatch(
  releaseReadiness,
  /target clean deployment operations evidence for source provenance, artifact registry, dependency installation, runtime bootstrap, target secret injection, environment boundary, migration\/data readiness, smoke\/health verification, rollback\/recovery, release approval, evidence retention, and failed-deployment containment is not generated/,
);
assert.match(security, /\[target-clean-deployment-operations-v1\.md\]\(target-clean-deployment-operations-v1\.md\)/);
assert.match(deployment, /## Target Clean Deployment Operations/);
assert.match(deployment, /npm run smoke:target-clean-deployment-operations/);
assert.match(productPlan, /\[x\] Target clean deployment operations gate implemented/);
assert.match(readme, /docs\/target-clean-deployment-operations-v1\.md/);
assert.match(readme, /npm run smoke:target-clean-deployment-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 10,
      deploymentPacketItemCount: 14,
      mode: 'target-clean-deployment-operations',
      ok: true,
      path: 'docs/target-clean-deployment-operations-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 13,
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
