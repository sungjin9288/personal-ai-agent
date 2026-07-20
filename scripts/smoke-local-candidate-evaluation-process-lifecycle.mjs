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
  'personal-ai-agent-local-candidate-evaluation-runtime-evidence/v5',
);
assert.equal(
  evidence.failureGuards.processGroupAbsenceRequired,
  true,
);
assert.equal(
  evidence.failureGuards.processLifecycleContentFree,
  true,
);
assert.equal(
  evidence.failureGuards.processLifecycleIntegrityBound,
  true,
);
assert.equal(evidence.execution.processGroupQuiesced, true);
assert.match(
  evidence.execution.processLifecycleHash,
  /^[a-f0-9]{64}$/u,
);
assert.equal(
  evidence.security.processGroupIsolation,
  'detached-posix-process-group',
);
assert.equal(
  evidence.security.workspaceCleanupPolicy,
  'close-and-process-group-absence',
);
assert.equal(
  evidence.claimBoundary.actualModelEvaluated,
  false,
);
assert.equal(
  evidence.claimBoundary.externalProviderCalls,
  'none',
);
assert.equal(
  evidence.claimBoundary.productionReadyClaim,
  false,
);

const docs = [
  fs.readFileSync(
    path.join(repoDir, 'README.md'),
    'utf8',
  ),
  fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-checklist.md'),
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
  'F2c.16 Post-spawn evaluator process lifecycle',
  'npm run smoke:local-candidate-evaluation-process-lifecycle',
  'actualLocalCandidateEvaluationProcessLifecycleValidated: true',
]) {
  assert.ok(
    docs.includes(term),
    `Candidate evaluation process lifecycle docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  actualLocalCandidateEvaluationProcessLifecycleValidated:
    true,
  externalProviderCalls: 'none',
  mode: 'local-candidate-evaluation-process-lifecycle',
  ok: true,
  osRestartRecoveryValidated: false,
  productionReadyClaim: false,
}, null, 2));
