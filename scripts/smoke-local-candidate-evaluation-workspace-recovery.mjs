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
  evidence.failureGuards.stalePreparingWorkspaceRecovered,
  true,
);
assert.equal(
  evidence.failureGuards
    .authorityRequiredBeforeWorkspaceRecovery,
  true,
);
assert.equal(
  evidence.failureGuards.workspaceRecoveryContentFree,
  true,
);
assert.equal(
  evidence.security.workspaceRecovery,
  'expired-dead-preparing-only',
);
assert.equal(
  evidence.execution.workspaceRecoveryCount,
  1,
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
  'F2c.15 Pre-spawn workspace recovery',
  'expired + dead PID + preparing',
  'npm run smoke:local-candidate-evaluation-workspace-recovery',
  'actualLocalCandidateEvaluationPreSpawnRecoveryValidated: true',
]) {
  assert.ok(
    docs.includes(term),
    `Candidate evaluation recovery docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  actualLocalCandidateEvaluationPreSpawnRecoveryValidated:
    true,
  mode: 'local-candidate-evaluation-workspace-recovery',
  ok: true,
  postSpawnCrashCleanupValidated: false,
  productionReadyClaim: false,
}, null, 2));
