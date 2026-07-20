import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalCandidateEvaluationRuntime,
} from './evaluate-local-candidate-evaluation-runtime.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-runtime.json',
);
const expected =
  await evaluateLocalCandidateEvaluationRuntime({
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
  `local-candidate-evaluation-runtime-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(
  Object.values(stored.failureGuards).every(Boolean),
  true,
);
assert.equal(
  stored.execution.candidateEvaluationAuthorized,
  true,
);
assert.equal(
  stored.execution.gateStatus,
  'ready-for-review',
);
assert.equal(
  stored.security.artifactReverifiedBeforeSpawn,
  true,
);
assert.equal(
  stored.security
    .authorityRevalidatedAfterInputVerification,
  true,
);
assert.equal(
  stored.security.candidateSnapshot,
  'bounded-read-only-temporary-copy',
);
assert.equal(
  stored.security.currentAdmissionRevalidated,
  true,
);
assert.equal(
  stored.security.evaluationSuiteBytesBound,
  true,
);
assert.equal(
  stored.security.postExecutionInputVerification,
  true,
);
assert.equal(stored.security.sourceWorkspaceAsCwd, false);
assert.equal(
  stored.security.temporaryInputViewCleanup,
  'completed',
);
assert.equal(stored.claimBoundary.actualModelEvaluated, false);
assert.equal(
  stored.claimBoundary.externalProviderCalls,
  'none',
);
assert.equal(
  stored.claimBoundary.trainingAuthorized,
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
  '| F2c.12 Local candidate evaluation runtime | 완료 · fixture 증적 |',
  '| F2c.13 Immutable evaluation input view | 완료 · fixture 증적 |',
  'npm run smoke:local-candidate-evaluation-runtime',
  'npm run smoke:local-candidate-evaluation-input-view',
  'actualLocalCandidateEvaluationRuntimeValidated: true',
  'actualLocalCandidateEvaluationInputViewValidated: true',
  'actualModelEvaluated: false',
]) {
  assert.ok(
    docs.plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-candidate-evaluation-runtime',
  ),
);
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-candidate-evaluation-input-view',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Local candidate evaluation runtime | `evidence/output-artifacts/local-candidate-evaluation-runtime.json` |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local candidate evaluation runtime: verified with `npm run smoke:local-candidate-evaluation-runtime`',
  ),
);

console.log(JSON.stringify({
  actualModelEvaluated: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount:
    Object.keys(stored.failureGuards).length,
  gateStatus: stored.execution.gateStatus,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
