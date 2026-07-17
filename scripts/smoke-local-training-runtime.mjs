import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateLocalTrainingRuntimeContract } from './evaluate-local-training-runtime.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-contract.json',
);
const expected = await evaluateLocalTrainingRuntimeContract({ repoDir });
const stored = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const gallery = fs.readFileSync(path.join(repoDir, 'docs', 'evidence-gallery.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

const { evidenceHash, id, ...evidenceContent } = stored;
const expectedEvidenceHash = createHash('sha256')
  .update(JSON.stringify(evidenceContent))
  .digest('hex');
assert.equal(evidenceHash, expectedEvidenceHash);
assert.equal(id, `local-training-runtime-evidence-${expectedEvidenceHash}`);
assert.equal(expected.claimBoundary.localTrainingRuntimeContractValidated, true);
assert.equal(expected.claimBoundary.actualModelTrainingExecuted, false);
assert.equal(expected.dataset.trainLineCount, stored.dataset.trainLineCount);
assert.equal(expected.dataset.validationLineCount, stored.dataset.validationLineCount);
assert.deepEqual(expected.security, stored.security);
assert.deepEqual(expected.failureGuards, stored.failureGuards);
assert.equal(stored.claimBoundary.localTrainingRuntimeContractValidated, true);
assert.equal(stored.claimBoundary.actualModelTrainingExecuted, false);
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(stored.claimBoundary.externalSubmissionAuthorized, false);
assert.equal(stored.claimBoundary.rolloutAuthorized, false);
assert.equal(stored.claimBoundary.productionReadyClaim, false);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.security.environmentPolicy, 'allowlist');
assert.equal(stored.security.networkIsolation, 'caller-owned');
assert.equal(stored.security.shell, false);
assert.equal(stored.storeMutation, false);

for (const term of [
  'status: local-training-runtime-contract-current',
  '| F2a Local training runtime contract | 완료 |',
  'npm run smoke:local-training-runtime',
  'actualLocalTrainingRuntimeContractValidated: true',
  'actualModelTrainingExecuted: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-training-runtime'),
  'README must expose the local training runtime smoke',
);
assert.ok(
  gallery.includes('| Local training runtime contract | `evidence/output-artifacts/local-training-runtime-contract.json` |'),
  'evidence gallery must link the local training runtime contract',
);
assert.ok(
  manifest.includes('Local training runtime contract: verified with `npm run smoke:local-training-runtime`'),
  'evidence manifest must record the local training runtime contract',
);

console.log(
  JSON.stringify(
    {
      actualModelTrainingExecuted: false,
      costFree: true,
      evidenceHash: stored.evidenceHash,
      externalProviderCalls: 'none',
      failureGuardCount: Object.keys(stored.failureGuards).length,
      mode: 'local-training-runtime-contract',
      ok: true,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);
