import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-secret-manager-architecture-v1.md');
const secretManagementPath = path.join(docsDir, 'secret-management-v1.md');
const targetSecretPath = path.join(docsDir, 'target-secret-manager-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const secretManagement = readRequiredFile(secretManagementPath);
const targetSecret = readRequiredFile(targetSecretPath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-secret-manager-architecture'],
  'node scripts/smoke-target-secret-manager-architecture.mjs',
);

assert.match(decision, /^# Target Secret Manager Architecture v1$/m);
assert.match(decision, /^- status: local-target-secret-manager-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetSecretManagerApproved: false$/m);
assert.match(decision, /not target secret manager implementation/);
assert.match(decision, /not cloud KMS evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target secret manager readiness remains blocked/);

for (const area of [
  'Secret manager platform',
  'Secret classes and ownership',
  'Injection path',
  'Access policy',
  'Rotation and revocation',
  'Audit and monitoring',
  'Break-glass process',
  'Leakage controls',
  'Disaster recovery',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /approved secret manager platform, region, tenancy boundary, owner, and fallback decision/,
  /secret class inventory with provider, environment, owner, rotation cadence, and allowed consumers/,
  /runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths/,
  /least-privilege access policy with reader, writer, admin, reviewer, service binding, and deny-by-default evidence/,
  /rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result/,
  /audit log evidence for secret read, write, rotate, revoke, break-glass, and failed access attempts/,
  /break-glass approval, expiry, monitoring, customer notification, revocation, and post-use review evidence/,
  /leakage review across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors/,
  /disaster recovery evidence for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment/,
  /migration plan from local environment injection to target secret manager injection/,
  /explicit rollback, lockout recovery, and credential containment plan/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:secret-management',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(secretManagement, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(targetSecret, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(targetContract, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(targetContract, /target secret manager architecture is approved/);
assert.match(targetContract, /npm run smoke:target-secret-manager-architecture/);
assert.match(releaseReadiness, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target secret manager architecture gate: passed/);
assert.match(
  releaseReadiness,
  /target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review across logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery, migration plan, rollback, lockout recovery, and credential containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target secret manager architecture is not approved and target secret manager ' +
      'evidence is not generated',
  ),
);
assert.match(security, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(deployment, /## Target Secret Manager Architecture/);
assert.match(deployment, /npm run smoke:target-secret-manager-architecture/);
assert.match(productPlan, /\[x\] Target secret manager architecture gate implemented/);
assert.match(readme, /docs\/target-secret-manager-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-secret-manager-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 9,
      mode: 'target-secret-manager-architecture',
      ok: true,
      path: 'docs/target-secret-manager-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 7,
      targetSecretManagerApproved: false,
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
