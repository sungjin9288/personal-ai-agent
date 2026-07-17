import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-permission-surface.json',
);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const { evidenceHash, ...content } = evidence;
const screenshotPath = path.join(repoDir, evidence.browser.screenshot);
const screenshot = fs.readFileSync(screenshotPath);

assert.equal(
  evidence.schemaVersion,
  'personal-ai-agent-local-training-permission-surface-evidence/v1',
);
assert.equal(evidence.status, 'local-training-permission-surface-passed-local-only');
assert.equal(evidence.actualBrowserInteractionValidated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.costFree, true);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.rbac.approve, 'approver');
assert.equal(evidence.rbac.revoke, 'approver');
assert.equal(evidence.tenantIsolation.crossTenantReadAndRevokeBlocked, true);
assert.deepEqual(evidence.flow, ['pending-review', 'approved', 'revoked']);
assert.equal(evidenceHash, sha256(Buffer.from(JSON.stringify(content))));
assert.equal(evidence.browser.screenshotSha256, sha256(screenshot));
assert.equal(screenshot.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), true);

console.log(
  JSON.stringify(
    {
      actualModelTrainingExecuted: false,
      evidenceHash,
      mode: 'local-training-permission-evidence',
      ok: true,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
