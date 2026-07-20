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
      'local-candidate-evaluation-host-restart-rehearsal.json',
    ),
    'utf8',
  ),
);

assert.equal(
  evidence.schemaVersion,
  'personal-ai-agent-local-candidate-evaluation-host-restart-rehearsal-evidence/v1',
);
assert.equal(
  evidence.protocol.prepareResumeProtocolValidated,
  true,
);
assert.equal(
  evidence.protocol.ownerOnlyPrivateState,
  true,
);
assert.equal(
  evidence.recovery.bootIdentityChangedObserved,
  true,
);
assert.equal(
  evidence.recovery
    .priorBootSpawningLeaseRecovered,
  true,
);
for (const value of Object.values(
  evidence.failureGuards,
)) {
  assert.equal(value, true);
}
assert.equal(
  evidence.claimBoundary
    .actualEvaluatorRelaunchPerformed,
  false,
);
assert.equal(
  evidence.claimBoundary.actualHostRestartObserved,
  false,
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
  evidence.claimBoundary.trainingAuthorized,
  false,
);
assert.equal(
  evidence.claimBoundary.rolloutAuthorized,
  false,
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
  'F2c.18 Manual host restart rehearsal',
  'npm run prepare:local-candidate-evaluation-host-restart-rehearsal',
  'npm run resume:local-candidate-evaluation-host-restart-rehearsal',
  'actualHostRestartObserved: false',
]) {
  assert.ok(
    docs.includes(term),
    `Host restart rehearsal docs missing ${term}`,
  );
}

console.log(JSON.stringify({
  actualHostRestartObserved: false,
  externalProviderCalls: 'none',
  hostRestartRehearsalProtocolValidated: true,
  mode:
    'local-candidate-evaluation-host-restart-rehearsal',
  ok: true,
  productionReadyClaim: false,
}, null, 2));
