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
  'personal-ai-agent-local-candidate-evaluation-runtime-evidence/v6',
);
assert.equal(
  evidence.failureGuards
    .staleSpawningWorkspaceRecoveredAfterBootChange,
  true,
);
assert.equal(
  evidence.execution
    .workspaceRecoveryPriorBootSpawningCount,
  1,
);
assert.equal(
  evidence.security.workspaceRecovery,
  'expired-dead-preparing-or-expired-prior-boot-spawning',
);
assert.equal(
  evidence.claimBoundary.actualHostRestartObserved,
  false,
);
assert.equal(
  JSON.stringify(evidence).includes(
    'fixture-prior-evidence-boot',
  ),
  false,
);
assert.equal(
  JSON.stringify(evidence).includes(
    'fixture-current-evidence-boot',
  ),
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
      'evidence-checklist.md',
    ),
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
  'F2c.17 Host boot identity recovery',
  'expired + prior boot + spawning',
  'npm run smoke:local-candidate-evaluation-host-boot-recovery',
  'localCandidateEvaluationPriorBootRecoveryContractValidated: true',
  'actualHostRestartObserved: false',
]) {
  assert.ok(
    docs.includes(term),
    `Candidate evaluation boot recovery docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  actualHostRestartObserved: false,
  externalProviderCalls: 'none',
  localCandidateEvaluationPriorBootRecoveryContractValidated:
    true,
  mode: 'local-candidate-evaluation-host-boot-recovery',
  ok: true,
  productionReadyClaim: false,
}, null, 2));
