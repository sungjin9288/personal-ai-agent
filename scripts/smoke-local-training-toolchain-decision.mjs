import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalTrainingEnvironmentPreflight } from '../src/core/local-training-environment-preflight.mjs';
import { assertLocalTrainingToolchainDecision } from '../src/core/local-training-toolchain-decision.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-toolchain-decision.json',
);
const evidenceText = fs.readFileSync(evidencePath, 'utf8');
const decision = JSON.parse(evidenceText);
const preflight = JSON.parse(
  fs.readFileSync(
    path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'local-training-environment-preflight.json',
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
  packageJson.scripts['plan:local-training-toolchain'],
  'node scripts/evaluate-local-training-toolchain-decision.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-toolchain-decision'],
  'node scripts/smoke-local-training-toolchain-decision.mjs',
);
assert.doesNotThrow(() =>
  assertLocalTrainingToolchainDecision(decision));
assert.doesNotThrow(() =>
  assertLocalTrainingEnvironmentPreflight(preflight));
assert.equal(decision.preflight.id, preflight.id);
assert.equal(decision.preflight.preflightHash, preflight.preflightHash);
assert.equal(decision.preflight.status, preflight.status);
assert.deepEqual(
  decision.preflight.blockerCheckIds,
  preflight.blockerCheckIds,
);
assert.equal(decision.status, 'candidate-selected-approval-required');
assert.equal(
  decision.decision,
  'request-explicit-toolchain-acquisition-approval',
);
assert.equal(decision.readyForAcquisitionApprovalRequest, true);
assert.equal(decision.technicalBlockerCheckIds.length, 0);
assert.equal(decision.recommendedTrack.id, 'mlx-lm-lora-qwen2.5-1.5b');
assert.equal(decision.recommendedTrack.trainer.id, 'mlx-lm-lora');
assert.equal(decision.recommendedTrack.trainer.version, '0.31.3');
assert.equal(
  decision.recommendedTrack.trainer.releaseCommit,
  'ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd',
);
assert.equal(
  decision.recommendedTrack.sourceModel.id,
  'Qwen/Qwen2.5-1.5B-Instruct',
);
assert.equal(
  decision.recommendedTrack.sourceModel.revision,
  '989aa7980e4cf806f80c7fef2b1adb7bc71aa306',
);
assert.equal(
  decision.recommendedTrack.sourceModel.licenseId,
  'apache-2.0',
);
assert.equal(decision.environment.platform, 'darwin');
assert.equal(decision.environment.architecture, 'arm64');
assert.equal(decision.environment.python.available, true);
assert.equal(decision.environment.python.venvAvailable, true);
assert.equal(decision.environment.uv.available, true);
assert.equal(decision.environment.trainerInstalled, false);
assert.equal(decision.environment.sourceModelInstalled, false);
assert.equal(decision.acquisitionAuthorized, false);
assert.equal(decision.actualDependencyInstallationPerformed, false);
assert.equal(decision.actualModelDownloadPerformed, false);
assert.equal(decision.actualModelTrainingExecuted, false);
assert.equal(decision.trainingAuthorized, false);
assert.equal(decision.rolloutAuthorized, false);
assert.equal(decision.productionReadyClaim, false);
assert.equal(decision.costBoundary.externalProviderCalls, 'none');
assert.deepEqual(decision.approvalCheckIds, [
  'trainer-install-approved',
  'source-model-download-approved',
  'model-license-owner-review-approved',
  'acquisition-egress-window-approved',
  'resource-canary-owner-assigned',
  'rollback-owner-assigned',
  'product-permission-approved-after-install',
]);
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\//u);
assert.doesNotMatch(
  evidenceText,
  /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/u,
);

for (const term of [
  '| F2c.2 Local training toolchain decision | 완료 · 승인 대기 |',
  'npm run plan:local-training-toolchain',
  'npm run smoke:local-training-toolchain-decision',
  'candidate-selected-approval-required',
]) {
  assert.ok(plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-training-toolchain-decision'),
  'README must expose the local training toolchain decision smoke',
);
assert.ok(
  gallery.includes('| Local training toolchain decision |'),
  'evidence gallery must link the local training toolchain decision',
);
assert.ok(
  manifest.includes(
    'Local training toolchain decision: verified with `npm run smoke:local-training-toolchain-decision`',
  ),
  'evidence manifest must record the local training toolchain decision',
);

console.log(JSON.stringify({
  actualDependencyInstallationPerformed:
    decision.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed: decision.actualModelDownloadPerformed,
  actualModelTrainingExecuted: decision.actualModelTrainingExecuted,
  mode: 'local-training-toolchain-decision',
  ok: true,
  readyForAcquisitionApprovalRequest:
    decision.readyForAcquisitionApprovalRequest,
  sourceModelId: decision.recommendedTrack.sourceModel.id,
  status: decision.status,
  trainerId: decision.recommendedTrack.trainer.id,
}, null, 2));
