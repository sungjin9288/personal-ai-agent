import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repoDir, relativePath), 'utf8'),
  );
}

const admission = readJson(
  'evidence/output-artifacts/local-candidate-evaluation-admission.json',
);
const runtime = readJson(
  'evidence/output-artifacts/local-candidate-evaluation-runtime.json',
);

assert.equal(
  admission.schemaVersion,
  'personal-ai-agent-local-candidate-evaluation-admission-evidence/v4',
);
assert.equal(
  runtime.schemaVersion,
  'personal-ai-agent-local-candidate-evaluation-runtime-evidence/v3',
);
assert.equal(
  admission.failureGuards.evaluatorProvenanceIntegrityRequired,
  true,
);
assert.equal(
  runtime.failureGuards.evaluatorSnapshotPostVerificationRequired,
  true,
);
assert.equal(admission.request.evaluatorBundleFileCount, 5);
assert.equal(
  admission.request.evaluatorBundleArtifactSetSha256,
  runtime.execution.evaluatorBundleArtifactSetSha256,
);
assert.equal(
  admission.request.evaluatorExecutableSha256,
  runtime.execution.evaluatorExecutableSha256,
);
assert.equal(runtime.security.evaluatorProvenanceBound, true);
assert.equal(
  runtime.security.evaluatorBundleSnapshot,
  'hash-bound-read-only-temporary-copy',
);
assert.equal(
  runtime.security.evaluatorExecutableVerification,
  'sha256-before-and-after',
);

const docs = [
  fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8'),
  fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  ),
  fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-gallery.md'),
    'utf8',
  ),
  fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  ),
].join('\n');
for (const term of [
  'F2c.14 Evaluator bundle provenance',
  'actualLocalCandidateEvaluatorProvenanceValidated: true',
  'npm run smoke:local-candidate-evaluator-provenance',
]) {
  assert.ok(
    docs.includes(term),
    `Candidate evaluator provenance docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  evaluatorBundleArtifactSetSha256:
    runtime.execution.evaluatorBundleArtifactSetSha256,
  evaluatorBundleFileCount:
    admission.request.evaluatorBundleFileCount,
  externalProviderCalls: 'none',
  mode: 'local-candidate-evaluator-provenance',
  ok: true,
  productionReadyClaim: false,
}, null, 2));
