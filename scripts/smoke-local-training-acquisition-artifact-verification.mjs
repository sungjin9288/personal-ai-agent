import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateLocalTrainingAcquisitionArtifactVerification } from './evaluate-local-training-acquisition-artifact-verification.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-artifact-verification.json',
);
const expected =
  await evaluateLocalTrainingAcquisitionArtifactVerification({
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
  `local-training-acquisition-artifact-verification-evidence-${expectedEvidenceHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  stored.claimBoundary
    .independentArtifactVerificationContractValidated,
  true,
);
assert.equal(
  stored.claimBoundary.actualArtifactSetsObserved,
  false,
);
assert.equal(
  stored.claimBoundary.actualDependencyInstallationPerformed,
  false,
);
assert.equal(
  stored.claimBoundary.actualModelDownloadPerformed,
  false,
);
assert.equal(
  stored.claimBoundary.actualModelTrainingExecuted,
  false,
);
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(
  stored.claimBoundary.externalSubmissionAuthorized,
  false,
);
assert.equal(stored.claimBoundary.trainingAuthorized, false);
assert.equal(stored.claimBoundary.rolloutAuthorized, false);
assert.equal(stored.claimBoundary.productionReadyClaim, false);
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(stored.artifacts.sourceModel.fileCount, 2);
assert.equal(stored.artifacts.trainerPackage.fileCount, 1);
assert.equal(
  stored.verification.status,
  'fixture-artifacts-verified-no-acquisition',
);
assert.deepEqual(stored.verification.remainingGates, [
  'acquisition-provenance-reviewed',
  'egress-closure-independently-reviewed',
  'offline-resource-canary-passed',
  'post-install-product-permission-approved',
]);
assert.equal(stored.security.fileContentStored, false);
assert.equal(stored.security.symlinksRejected, true);

for (const term of [
  '| F2c.7 Local training acquisition artifact verification | 완료 · fixture 증적 |',
  'npm run smoke:local-training-acquisition-artifact-verification',
  'actualLocalTrainingAcquisitionArtifactVerificationValidated: true',
  'actualArtifactSetsObserved: false',
]) {
  assert.ok(
    plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  readme.includes(
    'npm run smoke:local-training-acquisition-artifact-verification',
  ),
  'README must expose the artifact verification smoke',
);
assert.ok(
  gallery.includes(
    '| Local training acquisition artifact verification | `evidence/output-artifacts/local-training-acquisition-artifact-verification.json` |',
  ),
  'evidence gallery must link artifact verification evidence',
);
assert.ok(
  manifest.includes(
    'Local training acquisition artifact verification: verified with `npm run smoke:local-training-acquisition-artifact-verification`',
  ),
  'evidence manifest must record artifact verification',
);

console.log(JSON.stringify({
  actualArtifactSetsObserved: false,
  actualDependencyInstallationPerformed: false,
  actualModelDownloadPerformed: false,
  actualModelTrainingExecuted: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: 'local-training-acquisition-artifact-verification',
  ok: true,
  productionReadyClaim: false,
}, null, 2));
