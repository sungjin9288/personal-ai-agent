import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateLocalTrainingAcquisitionRuntime } from './evaluate-local-training-acquisition-runtime.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-runtime-contract.json',
);
const expected = await evaluateLocalTrainingAcquisitionRuntime({
  repoDir,
});
const stored = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const readme = fs.readFileSync(
  path.join(repoDir, 'README.md'),
  'utf8',
);
const gallery = fs.readFileSync(
  path.join(repoDir, 'docs', 'evidence-gallery.md'),
  'utf8',
);
const manifest = fs.readFileSync(
  path.join(repoDir, 'evidence', 'evidence_manifest.md'),
  'utf8',
);

const {
  evidenceHash,
  id,
  ...evidenceContent
} = stored;
const expectedEvidenceHash = createHash('sha256')
  .update(JSON.stringify(evidenceContent))
  .digest('hex');
assert.equal(evidenceHash, expectedEvidenceHash);
assert.equal(
  id,
  `local-training-acquisition-runtime-evidence-${expectedEvidenceHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  stored.claimBoundary
    .localTrainingAcquisitionRuntimeContractValidated,
  true,
);
assert.equal(
  stored.claimBoundary.actualDependencyInstallationPerformed,
  false,
);
assert.equal(stored.claimBoundary.actualModelDownloadPerformed, false);
assert.equal(stored.claimBoundary.actualModelTrainingExecuted, false);
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(stored.claimBoundary.externalSubmissionAuthorized, false);
assert.equal(stored.claimBoundary.trainingAuthorized, false);
assert.equal(stored.claimBoundary.rolloutAuthorized, false);
assert.equal(stored.claimBoundary.productionReadyClaim, false);
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(stored.execution.status, 'fixture-validated');
assert.equal(stored.execution.stepCount, 7);
assert.equal(stored.security.inputPolicy, 'content-free-metadata-only');
assert.equal(stored.security.networkIsolation, 'caller-owned');

for (const term of [
  '| F2c.6 Local training acquisition runtime contract | 완료 · 실제 실행 차단 |',
  'npm run smoke:local-training-acquisition-runtime',
  'actualLocalTrainingAcquisitionRuntimeContractValidated: true',
  'actualDependencyInstallationPerformed: false',
]) {
  assert.ok(
    plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  readme.includes('npm run smoke:local-training-acquisition-runtime'),
  'README must expose the acquisition runtime smoke',
);
assert.ok(
  gallery.includes(
    '| Local training acquisition runtime contract | `evidence/output-artifacts/local-training-acquisition-runtime-contract.json` |',
  ),
  'evidence gallery must link acquisition runtime evidence',
);
assert.ok(
  manifest.includes(
    'Local training acquisition runtime contract: verified with `npm run smoke:local-training-acquisition-runtime`',
  ),
  'evidence manifest must record acquisition runtime contract',
);

console.log(JSON.stringify({
  actualDependencyInstallationPerformed: false,
  actualModelDownloadPerformed: false,
  actualModelTrainingExecuted: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: 'local-training-acquisition-runtime-contract',
  ok: true,
  productionReadyClaim: false,
}, null, 2));
