import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetSecretPath = path.join(docsDir, 'target-secret-manager-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetSecret = readRequiredFile(targetSecretPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const security = readRequiredFile(securityPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-secret-manager'], 'node scripts/smoke-target-secret-manager.mjs');

assert.match(targetSecret, /^# Target Secret Manager v1$/m);
assert.match(targetSecret, /^- status: local-target-secret-manager-current$/m);
assert.match(targetSecret, /^- productionReadyClaim: false$/m);
assert.match(targetSecret, /not target secret manager evidence/);
assert.match(targetSecret, /not permission to claim `production-ready`/);
assert.match(targetSecret, /Target secret manager readiness remains blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Secret Manager Controls',
  '## Rotation Evidence Packet',
  '## Release Blocker Closure Linkage',
  '## Break-Glass Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetSecret, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Secret injection',
  'Access policy',
  'Rotation cadence',
  'Audit trail',
  'Break-glass',
  'Leakage review',
]) {
  assert.match(targetSecret, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  'branch and commit',
  'secret class and provider',
  'secret manager path or logical secret identifier without the value',
  'rotation or revocation timestamp',
  'artifact hygiene result',
]) {
  assert.match(targetSecret, new RegExp(`- ${escapeRegExp(packetItem)}`));
}

assert.match(
  targetSecret,
  /\| Blocker \| Evidence Stop Condition \| Architecture Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  targetSecret,
  /\| target secret manager \| target-secret-manager-evidence-missing \| target-secret-manager-architecture-missing \| target-secret-manager-boundary-missing-or-mismatched \| 3 \| 10 \| 7 \| 6 \| blocked \|/,
);
assert.match(targetSecret, /Target secret manager owns the target injection/);
assert.match(targetSecret, /Target secret manager architecture owns the approved platform and secret manager decision proof/);
assert.match(targetSecret, /Secret management owns the local redaction and artifact hygiene stop condition/);
assert.match(targetSecret, /Target provider operations and target clean deployment operations own provider credential injection and clean deployment secret injection integration proof/);
assert.match(targetSecret, /Target deployment contract and target environment evidence intake own the same-boundary secret manager evidence verification/);
assert.match(
  targetSecret,
  /regenerated execution-v1 snapshot evidence from the same approved production-like or hosted target secret manager boundary/,
);

for (const command of [
  'npm run smoke:target-secret-manager',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:secret-management',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetSecret, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-secret-manager-v1\.md\]\(target-secret-manager-v1\.md\)/);
assert.match(targetSecret, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local target secret manager gate: passed/);
assert.match(targetContract, /local secret management, target secret manager contract, and release artifact hygiene pass/);
assert.match(targetContract, /npm run smoke:target-secret-manager/);
assert.match(deployment, /## Target Secret Manager Gate/);
assert.match(deployment, /npm run smoke:target-secret-manager/);
assert.match(productPlan, /\[x\] Target secret manager gate implemented/);
assert.match(security, /\[target-secret-manager-v1\.md\]\(target-secret-manager-v1\.md\)/);
assert.match(readme, /npm run smoke:target-secret-manager/);

console.log(
  JSON.stringify(
    {
      controlCount: 6,
      mode: 'target-secret-manager',
      ok: true,
      path: 'docs/target-secret-manager-v1.md',
      productionReadyClaim: false,
      rotationPacketItemCount: 10,
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
