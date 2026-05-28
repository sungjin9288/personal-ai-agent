import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-data-lifecycle-architecture-v1.md');
const retentionDeletePath = path.join(docsDir, 'retention-delete-v1.md');
const targetRetentionPath = path.join(docsDir, 'target-retention-operations-v1.md');
const targetBackupPath = path.join(docsDir, 'target-backup-operations-v1.md');
const productionRetentionPath = path.join(docsDir, 'production-retention-operating-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const retentionDelete = readRequiredFile(retentionDeletePath);
const targetRetention = readRequiredFile(targetRetentionPath);
const targetBackup = readRequiredFile(targetBackupPath);
const productionRetention = readRequiredFile(productionRetentionPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-data-lifecycle-architecture'],
  'node scripts/smoke-target-data-lifecycle-architecture.mjs',
);

assert.match(decision, /^# Target Data Lifecycle Architecture v1$/m);
assert.match(decision, /^- status: local-target-data-lifecycle-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetDataLifecycleApproved: false$/m);
assert.match(decision, /not target retention implementation/);
assert.match(decision, /not provider transcript deletion proof/);
assert.match(decision, /not encrypted backup storage evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target data lifecycle readiness remains blocked/);

for (const area of [
  'Customer data classes',
  'Retention enforcement',
  'Export boundary',
  'Delete workflow',
  'Provider transcript handling',
  'Post-delete absence',
  'Backup architecture',
  'Restore and tenant isolation',
  'Key ownership and expiry',
  'Disaster recovery',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy/,
  /target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record/,
  /export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt/,
  /delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record/,
  /provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure/,
  /post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries/,
  /backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit/,
  /restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner/,
  /backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry\/delete evidence, and access audit/,
  /disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, and residual risk decision/,
  /migration plan from local pilot retention\/export\/delete and backup workflows to the approved target lifecycle architecture/,
  /explicit rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment plan/,
]) {
  assert.match(decision, packetItem);
}

assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Blocker \| Architecture Stop Condition \| Shared Operations Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| target data lifecycle architecture \| target-data-lifecycle-architecture-missing \| target-retention-backup-operations-missing \| target-retention-backup-boundary-missing-or-mismatched \| 3 \| 19 \| 10 \| 6 \| blocked \|/,
);
assert.match(decision, /Target data lifecycle architecture owns the lifecycle decision proof/);
assert.match(decision, /Target retention operations owns customer-approved data class, retention configuration/);
assert.match(decision, /Target backup operations owns backup schedule, encrypted storage, backup key ownership/);
assert.match(
  decision,
  /Target deployment contract and target environment evidence intake own the same-boundary retention and backup evidence verification/,
);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `targetDataLifecycleApproved: false` until linked closure verifications have target data lifecycle architecture approval proof/,
);
assert.match(decision, /tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof/);
assert.match(decision, /release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved target boundary/);

for (const command of [
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:production-retention-operating',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(retentionDelete, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(targetRetention, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(targetBackup, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(productionRetention, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(targetContract, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(targetContract, /target data lifecycle architecture is approved/);
assert.match(targetContract, /npm run smoke:target-data-lifecycle-architecture/);
assert.match(intake, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(intake, /npm run smoke:target-data-lifecycle-architecture/);
assert.match(releaseReadiness, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target data lifecycle architecture gate: passed/);
assert.match(
  releaseReadiness,
  /target data lifecycle architecture is not approved, and target data lifecycle architecture evidence for customer-approved data class matrix with legal basis, owner, retention window, exportability, delete eligibility, and exception policy, target retention configuration with enforcement timestamp, storage boundary, policy owner, reviewer, and audit record, export request proof with requester, approver, package scope, delivery boundary, encryption mode, package hash, and customer receipt, delete request proof with authorization, confirmation control, execution owner, storage scope, timestamp, and audit record, provider transcript policy proof with provider-side retention, deletion or non-retention evidence, exception review, and customer disclosure, post-delete absence evidence across runtime, tenant storage, backup, provider, export package, support packet, and release artifact boundaries, backup architecture proof with schedule, encrypted storage, storage class, retention class, missed-run handling, owner acknowledgement, and access audit, restore validation proof with objective, duration, restored data class inventory, integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup key ownership proof with key owner, rotation cadence, revocation, break-glass, expiry\/delete evidence, and access audit, disaster recovery evidence with owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, migration plan, rollback, legal hold, delete conflict, provider transcript exception, and customer communication containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target data lifecycle architecture is not approved and target data lifecycle ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.match(security, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(deployment, /## Target Data Lifecycle Architecture/);
assert.match(deployment, /npm run smoke:target-data-lifecycle-architecture/);
assert.match(productPlan, /\[x\] Target data lifecycle architecture gate implemented/);
assert.match(readme, /docs\/target-data-lifecycle-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-data-lifecycle-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-data-lifecycle-architecture',
      ok: true,
      path: 'docs/target-data-lifecycle-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 10,
      targetDataLifecycleApproved: false,
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
