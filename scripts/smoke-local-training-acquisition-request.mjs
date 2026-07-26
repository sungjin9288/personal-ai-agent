import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalTrainingAcquisitionRequest } from '../src/core/local-training-acquisition-approval.mjs';
import { assertLocalTrainingToolchainDecision } from '../src/core/local-training-toolchain-decision.mjs';

const repoDir = process.cwd();
const requestPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-request.json',
);
const requestText = fs.readFileSync(requestPath, 'utf8');
const request = JSON.parse(requestText);
const decision = JSON.parse(
  fs.readFileSync(
    path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'local-training-toolchain-decision.json',
    ),
    'utf8',
  ),
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const gallery = fs.readFileSync(
  path.join(repoDir, 'docs', 'evidence-gallery.md'),
  'utf8',
);
const manifest = fs.readFileSync(
  path.join(repoDir, 'evidence', 'evidence_manifest.md'),
  'utf8',
);

assert.doesNotThrow(() =>
  assertLocalTrainingToolchainDecision(decision));
assert.doesNotThrow(() =>
  assertLocalTrainingAcquisitionRequest(request, decision));
assert.equal(
  packageJson.scripts['plan:local-training-acquisition'],
  'node scripts/build-local-training-acquisition-request.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-acquisition-request'],
  'node scripts/smoke-local-training-acquisition-request.mjs',
);
assert.equal(request.status, 'pending-owner-review');
assert.equal(request.acquisitionAuthorized, false);
assert.equal(request.actualDependencyInstallationPerformed, false);
assert.equal(request.actualModelDownloadPerformed, false);
assert.equal(request.actualModelTrainingExecuted, false);
assert.equal(request.trainingAuthorized, false);
assert.equal(request.externalProviderCalls, 'none');
assert.equal(request.productionReadyClaim, false);
assert.equal(request.mutableRoot, 'var/local-training/mlx-lm-lora-qwen2.5-1.5b');
assert.equal(request.decision.id, decision.id);
assert.equal(request.decision.decisionHash, decision.decisionHash);
assert.equal(request.decision.preflightHash, decision.preflight.preflightHash);
assert.equal(request.proposedResourceEnvelope.status, 'proposed-not-measured');
assert.deepEqual(request.requestedActions, [
  'create-isolated-python-environment',
  'install-pinned-trainer-package',
  'download-pinned-trainable-source',
  'record-package-and-model-hashes',
  'close-acquisition-egress',
  'run-offline-resource-canary',
  'request-post-install-product-permission',
]);
assert.doesNotMatch(requestText, /\/Users\/|\/private\/|https?:\/\//u);
assert.doesNotMatch(
  requestText,
  /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/u,
);

for (const term of [
  '| F2c.3 Local training acquisition approval contract | 완료 · owner 승인 대기 |',
  'npm run plan:local-training-acquisition',
  'npm run smoke:local-training-acquisition-request',
  'pending-owner-review',
]) {
  assert.ok(plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  gallery.includes('| Local training acquisition request |'),
  'evidence gallery must link local training acquisition request',
);
assert.ok(
  manifest.includes(
    'Local training acquisition request: verified with `npm run smoke:local-training-acquisition-request`',
  ),
  'evidence manifest must record local training acquisition request',
);

console.log(JSON.stringify({
  acquisitionAuthorized: request.acquisitionAuthorized,
  actualDependencyInstallationPerformed:
    request.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed: request.actualModelDownloadPerformed,
  actualModelTrainingExecuted: request.actualModelTrainingExecuted,
  mode: 'local-training-acquisition-request',
  ok: true,
  status: request.status,
}, null, 2));
