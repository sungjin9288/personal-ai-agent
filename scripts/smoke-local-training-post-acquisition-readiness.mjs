import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingPostAcquisitionReadinessEvidence,
} from './evaluate-local-training-post-acquisition-readiness.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-post-acquisition-readiness.json',
);
const expected =
  await evaluateLocalTrainingPostAcquisitionReadinessEvidence({
    repoDir,
  });
const stored = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const docs = {
  gallery: fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-gallery.md'),
    'utf8',
  ),
  manifest: fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  ),
  plan: fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  ),
  readme: fs.readFileSync(
    path.join(repoDir, 'README.md'),
    'utf8',
  ),
};

const {
  evidenceHash,
  id,
  ...content
} = stored;
const expectedHash = createHash('sha256')
  .update(JSON.stringify(content))
  .digest('hex');
assert.equal(evidenceHash, expectedHash);
assert.equal(
  id,
  `local-training-post-acquisition-readiness-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  stored.claimBoundary
    .postAcquisitionReadinessContractValidated,
  true,
);
for (const field of [
  'actualAcquisitionProvenanceReviewed',
  'actualArtifactSetsObserved',
  'actualDependencyInstallationPerformed',
  'actualEgressClosureReviewed',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'actualOfflineResourceCanaryExecuted',
  'actualPostInstallProductPermissionApproved',
  'externalSubmissionAuthorized',
  'productionReadyClaim',
  'rolloutAuthorized',
  'trainingAuthorized',
]) {
  assert.equal(
    stored.claimBoundary[field],
    false,
    `${field} must remain false`,
  );
}
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(
  stored.readiness.status,
  'fixture-readiness-validated-no-acquisition',
);
assert.equal(
  stored.readiness.readyForExplicitTrainingRequest,
  false,
);
assert.equal(stored.readiness.remainingGates.length, 4);
assert.equal(stored.readiness.currentPermissionBound, true);
assert.equal(stored.readiness.trainingTargetBoundToF1, true);
assert.equal(
  stored.security.currentPermissionStateRequired,
  true,
);
assert.equal(
  stored.security.executionAdmissionRevalidation,
  true,
);
assert.equal(stored.security.trainingTargetBoundToF1, true);

for (const term of [
  '| F2c.8 Local training post-acquisition readiness | 완료 · fixture 증적 |',
  '| F2c.9 Local training execution admission | 완료 · fixture 증적 |',
  'npm run smoke:local-training-post-acquisition-readiness',
  'actualLocalTrainingPostAcquisitionReadinessValidated: true',
  'actualLocalTrainingExecutionAdmissionValidated: true',
  'actualPostInstallProductPermissionApproved: false',
]) {
  assert.ok(
    docs.plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-post-acquisition-readiness',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Local training post-acquisition readiness | `evidence/output-artifacts/local-training-post-acquisition-readiness.json` |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local training post-acquisition readiness: verified with `npm run smoke:local-training-post-acquisition-readiness`',
  ),
);

console.log(JSON.stringify({
  actualArtifactSetsObserved: false,
  actualModelTrainingExecuted: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
