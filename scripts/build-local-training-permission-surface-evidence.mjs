import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-permission-surface.json',
);
const screenshotOutputPath = path.join(
  repoDir,
  'evidence',
  'screenshots',
  'local-training-permission-surface.png',
);
const browserReportPath = path.join(
  repoDir,
  'output',
  'playwright',
  'local-training-permission-surface-browser.json',
);
const browserScreenshotPath = path.join(
  repoDir,
  'output',
  'playwright',
  'local-training-permission-surface-browser.png',
);

const permissionSurface = runJsonScript('scripts/smoke-local-training-permission-surface.mjs');
const rbac = runJsonScript('scripts/smoke-web-rbac.mjs');
const tenantIsolation = runJsonScript('scripts/smoke-web-tenant-isolation.mjs');
runJsonScript('scripts/smoke-local-training-permission-surface-browser.mjs', 120_000);

const browser = JSON.parse(fs.readFileSync(browserReportPath, 'utf8'));
const screenshot = fs.readFileSync(browserScreenshotPath);
if (
  permissionSurface.ok !== true ||
  rbac.ok !== true ||
  tenantIsolation.ok !== true ||
  browser.ok !== true ||
  browser.actualBrowserInteractionValidated !== true ||
  browser.results?.consoleErrorCount !== 0
) {
  throw new Error('Local training permission evidence requires every local replay to pass.');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(screenshotOutputPath), { recursive: true });
fs.copyFileSync(browserScreenshotPath, screenshotOutputPath);

const evidence = {
  actualBrowserInteractionValidated: true,
  actualModelTrainingExecuted: false,
  browser: {
    approved: browser.results.approved,
    consoleErrorCount: browser.results.consoleErrorCount,
    evidenceVisible: browser.results.evidenceVisible,
    localExecutionAuthorized: browser.results.localExecutionAuthorized,
    screenshot: 'evidence/screenshots/local-training-permission-surface.png',
    screenshotSha256: sha256(screenshot),
  },
  costFree: true,
  externalProviderCalls: 'none',
  flow: ['pending-review', 'approved', 'revoked'],
  permission: {
    approvalKind: permissionSurface.approvalKind,
    eventCount: permissionSurface.eventCount,
    evidenceGates: ['base-model-license', 'os-egress-isolation', 'resource-envelope'],
    ownerBindings: ['approval-owner', 'license-owner', 'security-owner', 'resource-owner', 'rollback-owner'],
    resourceEnforcement: 'caller-owned-with-runtime-timeout-bound',
  },
  productionReadyClaim: false,
  rbac: {
    approve: permissionSurface.rbac.approve,
    revoke: permissionSurface.rbac.revoke,
    validated: rbac.ok,
  },
  schemaVersion: 'personal-ai-agent-local-training-permission-surface-evidence/v1',
  status: 'local-training-permission-surface-passed-local-only',
  tenantIsolation: {
    crossTenantReadAndRevokeBlocked:
      tenantIsolation.tenantChecks?.tenantBLocalTrainingPermissionBlocked === true,
    validated: tenantIsolation.ok,
  },
};
const evidenceHash = sha256(Buffer.from(JSON.stringify(evidence)));
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ ...evidence, evidenceHash }, null, 2)}\n`,
  'utf8',
);

console.log(
  JSON.stringify(
    {
      actualModelTrainingExecuted: false,
      evidenceHash,
      mode: 'local-training-permission-surface-evidence',
      ok: true,
      outputPath: path.relative(repoDir, outputPath).split(path.sep).join('/'),
      productionReadyClaim: false,
      screenshotPath: path.relative(repoDir, screenshotOutputPath).split(path.sep).join('/'),
    },
    null,
    2,
  ),
);

function runJsonScript(relativePath, timeout = 30_000) {
  const result = spawnSync(process.execPath, [path.join(repoDir, relativePath)], {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${relativePath} failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(String(result.stdout || '').trim());
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
