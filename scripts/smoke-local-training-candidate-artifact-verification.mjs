import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingCandidateArtifactVerification,
} from './evaluate-local-training-candidate-artifact-verification.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-candidate-artifact-verification.json',
);
const expected =
  await evaluateLocalTrainingCandidateArtifactVerification({
    repoDir,
  });
const stored = JSON.parse(
  fs.readFileSync(evidencePath, 'utf8'),
);
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
  `local-training-candidate-artifact-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(
  stored.verification.status,
  'fixture-candidate-artifact-verified-no-training',
);
assert.equal(
  stored.verification
    .independentCandidateArtifactVerificationPassed,
  true,
);
assert.equal(
  stored.verification
    .readyForExplicitCandidateEvaluationRequest,
  false,
);
assert.equal(
  stored.verification.candidateEvaluationAuthorized,
  false,
);
assert.equal(
  stored.claimBoundary.actualCandidateArtifactsObserved,
  false,
);
assert.equal(
  stored.claimBoundary.actualModelTrainingExecuted,
  false,
);
assert.equal(
  stored.claimBoundary.externalProviderCalls,
  'none',
);
assert.equal(
  stored.claimBoundary.externalSubmissionAuthorized,
  false,
);
assert.equal(
  stored.claimBoundary.rolloutAuthorized,
  false,
);
assert.equal(
  stored.claimBoundary.productionReadyClaim,
  false,
);
assert.equal(stored.security.completeInventoryRequired, true);
assert.equal(stored.security.fileContentStored, false);
assert.equal(stored.security.fixedCandidateRoot, true);
assert.equal(stored.security.pathContainment, true);
assert.equal(stored.security.symbolicLinksAllowed, false);

for (const term of [
  '| F2c.10 Local training candidate artifact verification | 완료 · fixture 증적 |',
  'npm run smoke:local-training-candidate-artifact-verification',
  'actualLocalTrainingCandidateArtifactVerificationValidated: true',
  'actualCandidateArtifactsObserved: false',
  'actualModelTrainingExecuted: false',
]) {
  assert.ok(
    docs.plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-candidate-artifact-verification',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Local training candidate artifact verification | `evidence/output-artifacts/local-training-candidate-artifact-verification.json` |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local training candidate artifact verification: verified with `npm run smoke:local-training-candidate-artifact-verification`',
  ),
);

console.log(JSON.stringify({
  actualCandidateArtifactsObserved: false,
  actualModelTrainingExecuted: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
