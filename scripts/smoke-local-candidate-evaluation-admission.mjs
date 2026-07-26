import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalCandidateEvaluationAdmission,
} from './evaluate-local-candidate-evaluation-admission.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-admission.json',
);
const expected =
  await evaluateLocalCandidateEvaluationAdmission({
    repoDir,
  });
const stored = JSON.parse(
  fs.readFileSync(evidencePath, 'utf8'),
);
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
  `local-candidate-evaluation-admission-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(
  stored.admission.status,
  'authorized-for-bounded-local-candidate-evaluation',
);
assert.equal(
  stored.admission.candidateEvaluationAuthorized,
  true,
);
assert.equal(stored.security.resourceEnvelopeBound, true);
assert.equal(stored.security.evaluatorProvenanceBound, true);
assert.equal(
  stored.security.f1EvaluationSuiteBytesBound,
  true,
);
assert.equal(
  stored.failureGuards.f1EvaluationSuiteBytesRequired,
  true,
);
assert.match(
  stored.request.evaluationSuiteArtifactSha256,
  /^[a-f0-9]{64}$/u,
);
assert.match(
  stored.request.evaluatorBundleArtifactSetSha256,
  /^[a-f0-9]{64}$/u,
);
assert.match(
  stored.request.evaluatorExecutableSha256,
  /^[a-f0-9]{64}$/u,
);
assert.equal(stored.admission.actualModelEvaluated, false);
assert.equal(
  stored.admission.trainingProcessProvenanceVerified,
  false,
);
assert.equal(
  stored.claimBoundary.actualCandidateArtifactsObserved,
  false,
);
assert.equal(
  stored.claimBoundary.actualModelEvaluated,
  false,
);
assert.equal(
  stored.claimBoundary.trainingAuthorized,
  false,
);
assert.equal(
  stored.claimBoundary.externalProviderCalls,
  'none',
);
assert.equal(
  stored.claimBoundary.rolloutAuthorized,
  false,
);
assert.equal(
  stored.claimBoundary.productionReadyClaim,
  false,
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
for (const term of [
  '| F2c.11 Local candidate evaluation admission | 완료 · fixture 증적 |',
  'npm run smoke:local-candidate-evaluation-admission',
  'actualLocalCandidateEvaluationAdmissionValidated: true',
  'actualModelEvaluated: false',
]) {
  assert.ok(
    docs.plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-candidate-evaluation-admission',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Local candidate evaluation admission | `evidence/output-artifacts/local-candidate-evaluation-admission.json` |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local candidate evaluation admission: verified with `npm run smoke:local-candidate-evaluation-admission`',
  ),
);

console.log(JSON.stringify({
  actualModelEvaluated: false,
  candidateEvaluationAuthorized:
    stored.admission.candidateEvaluationAuthorized,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount:
    Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
