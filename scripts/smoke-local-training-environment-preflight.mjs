import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalTrainingEnvironmentPreflight,
} from '../src/core/local-training-environment-preflight.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-environment-preflight.json',
);
const evidenceText = fs.readFileSync(evidencePath, 'utf8');
const preflight = JSON.parse(evidenceText);
const packageJson = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'package.json'),
  'utf8',
));
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const gallery = fs.readFileSync(
  path.join(repoDir, 'docs', 'evidence-gallery.md'),
  'utf8',
);
const manifest = fs.readFileSync(
  path.join(repoDir, 'evidence', 'evidence_manifest.md'),
  'utf8',
);

assert.equal(
  packageJson.scripts['preflight:local-training-environment'],
  'node scripts/evaluate-local-training-environment-preflight.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-environment-preflight'],
  'node scripts/smoke-local-training-environment-preflight.mjs',
);
assert.doesNotThrow(() =>
  assertLocalTrainingEnvironmentPreflight(preflight));
assert.equal(preflight.status, 'blocked-before-local-training');
assert.equal(preflight.decision, 'stop-before-local-training');
assert.equal(preflight.readyForExplicitTrainingRequest, false);
assert.equal(preflight.actualModelTrainingExecuted, false);
assert.equal(preflight.trainingAuthorized, false);
assert.equal(preflight.externalProviderCalls, 'none');
assert.equal(preflight.externalSubmissionAuthorized, false);
assert.equal(preflight.rolloutAuthorized, false);
assert.equal(preflight.productionReadyClaim, false);
assert.equal(preflight.machineIdentityStored, false);
assert.equal(preflight.baseModel.id, 'qwen2.5:3b');
assert.equal(preflight.baseModel.installed, true);
assert.equal(preflight.baseModel.artifactFormat, 'gguf');
assert.equal(preflight.baseModel.artifactHashVerified, true);
assert.equal(preflight.baseModel.trainableSourceVerified, false);
assert.equal(preflight.baseModel.license.hashVerified, true);
assert.equal(
  preflight.baseModel.license.title,
  'Qwen RESEARCH LICENSE AGREEMENT',
);
assert.equal(preflight.trainer.selectedCandidateId, null);
assert.equal(
  preflight.trainer.candidates.every((candidate) => !candidate.available),
  true,
);
assert.deepEqual(preflight.blockerCheckIds, [
  'trainable-source-model-verified',
  'trainer-available',
  'license-review-approved',
  'network-isolation-approved',
  'resource-enforcement-approved',
  'product-permission-approved',
  'rollback-owner-assigned',
]);
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\/|https?:\/\//u);
assert.doesNotMatch(
  evidenceText,
  /Prepare reviewed instruction|Return grounded response/u,
);
assert.doesNotMatch(
  evidenceText,
  /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/u,
);

for (const term of [
  '| F2c.1 Local training environment preflight | 완료 · 실행 차단 |',
  'npm run preflight:local-training-environment',
  'npm run smoke:local-training-environment-preflight',
  'actualModelTrainingExecuted: false',
  'stop-before-local-training',
]) {
  assert.ok(plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-training-environment-preflight'),
  'README must expose the local training environment preflight smoke',
);
assert.ok(
  gallery.includes('| Local training environment preflight |'),
  'evidence gallery must link local training environment preflight',
);
assert.ok(
  manifest.includes(
    'Local training environment preflight: verified with `npm run smoke:local-training-environment-preflight`',
  ),
  'evidence manifest must record local training environment preflight',
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: preflight.actualModelTrainingExecuted,
  blockerCount: preflight.blockerCheckIds.length,
  costFree: preflight.costFree,
  externalProviderCalls: preflight.externalProviderCalls,
  mode: 'local-training-environment-preflight',
  modelId: preflight.baseModel.id,
  ok: true,
  productionReadyClaim: preflight.productionReadyClaim,
  readyForExplicitTrainingRequest:
    preflight.readyForExplicitTrainingRequest,
  status: preflight.status,
}, null, 2));
