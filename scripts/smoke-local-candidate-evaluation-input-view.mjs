import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidence = JSON.parse(
  fs.readFileSync(
    path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'local-candidate-evaluation-runtime.json',
    ),
    'utf8',
  ),
);

assert.equal(
  evidence.schemaVersion,
  'personal-ai-agent-local-candidate-evaluation-runtime-evidence/v4',
);
assert.equal(
  evidence.failureGuards.evaluationSuiteBytesRequired,
  true,
);
assert.equal(
  evidence.failureGuards
    .authorityRequiredAfterInputVerification,
  true,
);
assert.equal(
  evidence.failureGuards
    .candidateSnapshotPostVerificationRequired,
  true,
);
assert.equal(
  evidence.failureGuards
    .suiteSnapshotPostVerificationRequired,
  true,
);
assert.equal(
  evidence.failureGuards
    .evaluatorSnapshotPostVerificationRequired,
  true,
);
assert.equal(
  evidence.failureGuards.temporaryInputViewCleaned,
  true,
);
assert.equal(
  evidence.security.candidateSnapshot,
  'bounded-read-only-temporary-copy',
);
assert.equal(
  evidence.security.evaluatorBundleSnapshot,
  'hash-bound-read-only-temporary-copy',
);
assert.equal(
  evidence.security.postExecutionInputVerification,
  true,
);
assert.equal(evidence.security.sourceWorkspaceAsCwd, false);
assert.equal(
  evidence.security.temporaryInputViewCleanup,
  'completed',
);
assert.match(
  evidence.execution.suiteArtifactSha256,
  /^[a-f0-9]{64}$/u,
);
assert.equal(
  JSON.stringify(evidence).includes('Weekend hiking routes'),
  false,
);

const docs = [
  fs.readFileSync(
    path.join(repoDir, 'README.md'),
    'utf8',
  ),
  fs.readFileSync(
    path.join(
      repoDir,
      'docs',
      'ml-rag-development-plan-v1.md',
    ),
    'utf8',
  ),
].join('\n');
for (const term of [
  'F2c.13 Immutable evaluation input view',
  'actualLocalCandidateEvaluationInputViewValidated: true',
  'npm run smoke:local-candidate-evaluation-input-view',
]) {
  assert.ok(
    docs.includes(term),
    `Candidate evaluation input-view docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  evaluationSuiteBytesBound: true,
  mode: 'local-candidate-evaluation-input-view',
  ok: true,
  postExecutionInputVerification: true,
  productionReadyClaim: false,
  sourceWorkspaceAsCwd: false,
}, null, 2));
