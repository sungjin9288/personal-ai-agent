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
  /release artifact hygiene result and regenerated execution snapshot evidence from the approved target boundary/,
]) {
  assert.match(decision, packetItem);
}
assert.match(
  decision,
  /Target secret manager readiness remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved production-like or hosted environment for approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  decision,
  /Target secret manager readiness remains blocked until a replacement architecture decision is approved, implementation is completed, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated from the approved production-like or hosted environment/,
);
assert.doesNotMatch(
  decision,
  /Target secret manager readiness remains blocked until a replacement architecture decision is approved and target evidence is generated from the approved production-like or hosted environment\./,
);
assert.doesNotMatch(
  decision,
  /Target secret manager readiness remains blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved production-like or hosted environment/,
);

assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Blocker \| Architecture Stop Condition \| Shared Operations Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| target secret manager architecture \| target-secret-manager-architecture-missing \| target-secret-manager-evidence-missing \| target-secret-manager-boundary-missing-or-mismatched \| 3 \| 17 \| 7 \| 6 \| blocked \|/,
);
assert.match(
  decision,
  /Target secret manager architecture owns the approved platform, secret class inventory, runtime injection, access policy, rotation\/revocation, audit, break-glass, leakage review, and disaster recovery decision proof/,
);
assert.match(
  decision,
  /Target secret manager owns the rotation packet, break-glass, target injection, and target audit evidence contract/,
);
assert.match(decision, /Secret management owns the local redaction and artifact hygiene stop condition/);
assert.match(
  decision,
  /Target provider operations and target clean deployment operations own provider credential injection and clean deployment secret injection integration proof/,
);
assert.match(
  decision,
  /Target deployment contract and target environment evidence intake own the same-boundary secret manager evidence verification/,
);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `targetSecretManagerApproved: false` until linked closure verifications have target secret manager architecture approval proof/,
);
assert.match(
  decision,
  /credential containment proof, provider credential injection proof, clean deployment secret injection proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved target boundary/,
);

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
assert.match(
  targetContract,
  /Target secret manager architecture \| target secret manager architecture is approved with approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  targetContract,
  /secretObservabilityEvidence \| target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  targetContract,
  /secretObservabilityEvidence \| target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, telemetry backend, alert route, log\/trace retention, target observability operations, target SLO architecture, target SLO operations, and incident review evidence/,
);
assert.match(
  targetContract,
  /stop target secret manager claims until the target secret manager architecture record is approved and approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence are generated/,
);
assert.doesNotMatch(
  targetContract,
  /Target secret manager architecture \| target secret manager architecture is approved with platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, and disaster recovery decisions/,
);
assert.doesNotMatch(
  targetContract,
  /stop target secret manager claims until the target secret manager architecture record is approved and target secret manager evidence is generated/,
);
assert.match(targetContract, /npm run smoke:target-secret-manager-architecture/);
assert.match(releaseReadiness, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target secret manager architecture gate: passed/);
assert.match(
  releaseReadiness,
  /target secret manager architecture gate: passed, with targetSecretManagerApproved false, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, regenerated execution snapshot evidence requirements, and `productionReadyClaim: false`/,
);
assert.match(
  releaseReadiness,
  /target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform proof with provider, region, tenancy boundary, owner, and fallback decision, secret class inventory proof with provider, environment, owner, rotation cadence, and allowed consumers, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy proof with reader, writer, admin, reviewer, service binding, and deny-by-default evidence, rotation and revocation event proof with previous secret invalidation and downstream redeploy or reload result, secret access audit log proof for read, write, rotate, revoke, break-glass, and failed access attempts, break-glass governance proof with approval, expiry, monitoring, customer notification, revocation, and post-use review, leakage review proof across production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery proof for secret backup, restore, key recovery, region outage, rollback, and compromised-secret containment, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target secret manager architecture is not approved and target secret manager ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  releaseReadiness,
  /target secret manager architecture gate: passed, with targetSecretManagerApproved false, platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, disaster recovery decision requirements, and `productionReadyClaim: false`/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target secret manager architecture is not approved, and target secret manager architecture evidence for approved platform, region, tenancy boundary, owner and fallback decision, secret class inventory, runtime injection proof for CLI, UI, worker, live validation, clean deployment, rollback, and support paths, least-privilege access policy, service binding, deny-by-default rules, rotation and revocation event proof, secret access audit logs, break-glass approval and post-use review, leakage review across logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors, disaster recovery, migration plan, rollback, lockout recovery, and credential containment is not generated from a production-like environment/,
);
assert.match(security, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(
  security,
  /target secret manager architecture contract for approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, regenerated execution snapshot evidence, and the remaining target evidence gap/,
);
assert.doesNotMatch(
  security,
  /target secret manager architecture contract for platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, disaster recovery, and the remaining target evidence gap/,
);
assert.match(deployment, /## Target Secret Manager Architecture/);
assert.match(deployment, /npm run smoke:target-secret-manager-architecture/);
assert.match(
  deployment,
  /It requires approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence while keeping `targetSecretManagerApproved: false`/,
);
assert.doesNotMatch(
  deployment,
  /It requires secret manager platform, secret classes, injection path, access policy, rotation\/revocation, audit\/monitoring, break-glass, leakage controls, disaster recovery, migration, rollback, and credential containment decisions while keeping `targetSecretManagerApproved: false`/,
);
assert.match(productPlan, /\[x\] Target secret manager architecture gate implemented/);
assert.match(readme, /docs\/target-secret-manager-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-secret-manager-architecture/);
assert.match(
  readme,
  /target secret manager architecture evidence can be verified with `npm run smoke:target-secret-manager-architecture`; it proves approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation and revocation event proof, secret access audit log proof, break-glass governance proof, leakage review proof, disaster recovery proof, migration plan, rollback, lockout recovery, credential containment, release artifact hygiene, and regenerated execution snapshot evidence requirements are present, but it keeps `targetSecretManagerApproved: false`/,
);
assert.doesNotMatch(
  readme,
  /target secret manager architecture evidence can be verified with `npm run smoke:target-secret-manager-architecture`; it proves platform, secret classes, injection path, access policy, rotation, audit, break-glass, leakage controls, and disaster recovery decision requirements are present, but it keeps `targetSecretManagerApproved: false`/,
);

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
