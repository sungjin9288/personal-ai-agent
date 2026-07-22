import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'mlx-lm-lora-training-adapter.json',
);
const expected = await evaluateMlxLmLoraTrainingAdapter({ repoDir });
const stored = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const serialized = JSON.stringify(stored);
const docs = {
  checklist: fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-checklist.md'),
    'utf8',
  ),
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
  readme: fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8'),
  summary: fs.readFileSync(
    path.join(repoDir, 'docs', 'smoke-validation-summary-v1.md'),
    'utf8',
  ),
};
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);

const { evidenceHash, id, ...content } = stored;
const expectedHash = createHash('sha256')
  .update(JSON.stringify(content))
  .digest('hex');
assert.equal(evidenceHash, expectedHash);
assert.equal(
  id,
  `mlx-lm-lora-training-adapter-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(stored.claimBoundary.adapterContractValidated, true);
assert.equal(stored.claimBoundary.staticRuntimeClosureValidated, true);
assert.equal(stored.claimBoundary.verifyToExecClosed, false);
assert.equal(stored.contract.nativeClosureComplete, false);
assert.equal(stored.contract.dynamicRuntimeClosureComplete, false);
assert.equal(stored.contract.verifyToExecClosed, false);
assert.equal(stored.claimBoundary.actualMlxMemoryLimitEnforced, false);
assert.equal(stored.claimBoundary.actualMlxOsIsolationIntegrated, false);
assert.equal(stored.claimBoundary.osIsolationContractValidated, true);
assert.equal(stored.contract.osIsolationContractValidated, true);
assert.match(stored.contract.osIsolation.contractHash, /^[a-f0-9]{64}$/u);
assert.equal(
  stored.claimBoundary.runtimeExecObservationContractValidated,
  true,
);
assert.equal(
  stored.contract.runtimeExecObservationContractValidated,
  true,
);
assert.match(
  stored.contract.runtimeExecObservation.contractHash,
  /^[a-f0-9]{64}$/u,
);
assert.equal(
  stored.claimBoundary.runtimeImageProvenanceContractValidated,
  true,
);
assert.equal(
  stored.contract.runtimeImageProvenanceContractValidated,
  true,
);
assert.match(
  stored.contract.runtimeImageProvenance.contractHash,
  /^[a-f0-9]{64}$/u,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'training-runtime-closure-provenance',
  ),
  false,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'os-bound-dynamic-native-and-exec-closure',
  ),
  false,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'mlx-dynamic-native-runtime-closure',
  ),
  true,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'mlx-verify-to-exec-closure',
  ),
  true,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'mlx-os-isolation-integration',
  ),
  true,
);
assert.equal(
  stored.contract.remainingGates.includes(
    'os-enforced-mlx-unified-memory-limit',
  ),
  true,
);
for (const field of [
  'actualDependencyInstallationPerformed',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'actualMlxMemoryLimitEnforced',
  'actualMlxOsIsolationIntegrated',
  'actualMlxProcessSpawned',
  'candidateEvaluationAuthorized',
  'externalSubmissionAuthorized',
  'productionReadyClaim',
  'readyForExplicitCandidateEvaluationRequest',
  'recordedTrainingRunCreated',
  'rolloutAuthorized',
  'trainingAuthorized',
]) {
  assert.equal(stored.claimBoundary[field], false);
}
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.candidate.independentVerificationPassed, true);
assert.equal(stored.candidate.manifestBoundToAdapterResult, true);
assert.equal(stored.dataset.exactF1TrainBytesMaterialized, true);
assert.equal(
  stored.dataset.exactF1ValidationBytesMaterializedAsValidJsonl,
  true,
);
assert.equal(stored.security.arbitraryArgumentsAccepted, false);
assert.equal(stored.security.inheritedEnvironmentValuesAccepted, false);
assert.equal(
  stored.security.moduleOwnedFixtureInvocationExercised,
  true,
);
assert.equal(serialized.includes('/Users/'), false);
assert.equal(serialized.includes('/private/var/'), false);
assert.equal(serialized.includes('Explain a retrieval result.'), false);
assert.equal(serialized.includes('fixture-adapter-weights'), false);

assert.equal(
  packageJson.scripts['build:mlx-lm-lora-training-adapter-evidence'],
  'node scripts/build-mlx-lm-lora-training-adapter-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:mlx-lm-lora-training-adapter'],
  'node scripts/smoke-mlx-lm-lora-training-adapter.mjs',
);
for (const term of [
  '| F2c.20 MLX-LM LoRA adapter contract | 완료 · fixture 증적 |',
  'actualMlxLmLoraAdapterContractValidated: true',
  'actualMlxProcessSpawned: false',
  'npm run smoke:mlx-lm-lora-training-adapter',
]) {
  assert.ok(
    docs.plan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  docs.readme.includes('npm run smoke:mlx-lm-lora-training-adapter'),
);
assert.ok(
  docs.gallery.includes(
    '| MLX-LM LoRA training adapter contract | `evidence/output-artifacts/mlx-lm-lora-training-adapter.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.20 MLX-LM LoRA adapter contract | 완료 · fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'MLX-LM LoRA training adapter contract: verified with `npm run smoke:mlx-lm-lora-training-adapter`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.20 MLX-LM LoRA adapter contract | `npm run smoke:mlx-lm-lora-training-adapter` |',
  ),
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualMlxProcessSpawned: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
