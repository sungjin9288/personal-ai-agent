import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const controlsPath = path.join(docsDir, 'production-enterprise-controls-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const controls = readRequiredFile(controlsPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['rehearsal:production-enterprise-controls'],
  'node scripts/build-production-enterprise-controls.mjs',
);
assert.equal(
  packageJson.scripts['smoke:production-enterprise-controls'],
  'node scripts/smoke-production-enterprise-controls.mjs',
);

assert.match(controls, /^# Production Enterprise Controls Rehearsal v1$/m);
assert.match(controls, /^- status: local-enterprise-controls-current$/m);
assert.match(controls, /^- productionReadyClaim: false$/m);
assert.match(controls, /not identity-backed hosted RBAC/);
assert.match(controls, /not hosted tenant isolation/);
assert.match(controls, /not centralized permission administration/);
assert.match(controls, /not permission to claim `production-ready`/);
assert.match(controls, /Production-ready remains blocked/);
assert.match(controls, /identity provider integration/);
assert.match(controls, /session lifecycle management/);
assert.match(controls, /persistent role assignment/);
assert.match(controls, /OIDC\/JWKS bearer authentication/);
assert.match(controls, /issuer, audience, RS256 signature, expiry, and role claim mapping/);
assert.match(controls, /API tenant\/workspace binding/);
assert.match(controls, /rejects cross-tenant workspace and mission access/);
assert.match(controls, /prevents OIDC viewer tokens from escalating through spoofed role headers/);

for (const command of [
  'npm run smoke:web-auth-rbac',
  'npm run smoke:web-oidc-rbac',
  'npm run smoke:web-tenant-isolation',
  'npm run smoke:web-rbac',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-isolation',
  'npm run smoke:production-provider-readiness',
]) {
  assert.match(controls, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`));
}

assert.match(releaseReadiness, /\[production-enterprise-controls-v1\.md\]\(production-enterprise-controls-v1\.md\)/);
assert.match(releaseReadiness, /local enterprise controls rehearsal: passed/);
assert.match(deployment, /## Production Enterprise Controls Rehearsal/);
assert.match(deployment, /npm run rehearsal:production-enterprise-controls/);
assert.match(deployment, /npm run smoke:production-enterprise-controls/);
assert.match(security, /\[production-enterprise-controls-v1\.md\]\(production-enterprise-controls-v1\.md\)/);
assert.match(security, /local enterprise controls evidence/);
assert.match(productPlan, /\[x\] Production enterprise controls rehearsal gate implemented/);
assert.match(readme, /npm run rehearsal:production-enterprise-controls/);
assert.match(readme, /npm run smoke:production-enterprise-controls/);

console.log(
  JSON.stringify(
    {
      commandCount: 7,
      mode: 'production-enterprise-controls',
      ok: true,
      path: 'docs/production-enterprise-controls-v1.md',
      productionReadyClaim: false,
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
