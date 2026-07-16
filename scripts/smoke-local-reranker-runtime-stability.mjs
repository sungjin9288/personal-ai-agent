import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalRerankerResourceEnvelope } from '../src/core/local-reranker-resource-envelope.mjs';
import { assertLocalRerankerRuntimeStability } from '../src/core/local-reranker-runtime-stability.mjs';

const repoDir = process.cwd();
const evidencePath = 'evidence/output-artifacts/local-reranker-runtime-stability.json';
const priorPath = 'evidence/output-artifacts/local-reranker-resource-envelope.json';
const evidenceText = readRequiredFile(evidencePath);
const stability = JSON.parse(evidenceText);
const prior = JSON.parse(readRequiredFile(priorPath));
const packageJson = JSON.parse(readRequiredFile('package.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-reranker-runtime-stability'],
  'node scripts/evaluate-local-reranker-runtime-stability.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-reranker-runtime-stability'],
  'node scripts/smoke-local-reranker-runtime-stability.mjs',
);
assert.doesNotThrow(() => assertLocalRerankerResourceEnvelope(prior));
assert.doesNotThrow(() => assertLocalRerankerRuntimeStability(stability));
assert.equal(stability.status, 'bounded-runtime-stability-passed-governance-blocked');
assert.equal(stability.decision, 'hold-r9-shortlist-for-governance');
assert.equal(stability.actualLocalRerankerRuntimeStabilityValidated, true);
assert.equal(stability.actualLocalRerankerRuntimeStabilityQualified, false);
assert.equal(stability.activation.authorized, false);
assert.equal(stability.runtimeActivation, false);
assert.equal(stability.productionReadyClaim, false);
assert.equal(stability.runtime.cloudFeaturesDisabled, true);
assert.equal(stability.runtime.networkIsolation, 'not-proven');
assert.equal(stability.runtime.externalProviderCalls, 'none');
assert.equal(stability.qualityParity, true);
assert.equal(stability.resourceStable, true);
assert.equal(stability.lifecycle.modelAbsentBeforeCold, true);
assert.equal(stability.lifecycle.initiallyLoaded, false);
assert.equal(stability.lifecycle.unloadRequested, false);
assert.deepEqual(stability.runContract, {
  coldRunCount: 1,
  concurrentRunCount: 2,
  expectedModelInferenceCount: 360,
  totalRunCount: 6,
  warmRunCount: 3,
});
assert.equal(stability.runs.length, 6);
assert.deepEqual(
  stability.runs.map((run) => run.id),
  ['cold-1', 'warm-1', 'warm-2', 'warm-3', 'concurrent-1', 'concurrent-2'],
);
assert.equal(
  stability.runs.every((run) =>
    run.quality.qualityParity &&
    run.quality.repeatStable &&
    run.quality.shortlistCoveragePassed &&
    run.latency.modelInferenceCount === 60),
  true,
);
assert.equal(stability.latency.all.modelInferenceCount, 360);
assert.equal(stability.latency.all.rerankPassCount, 180);
assert.equal(stability.latency.cold.firstPassMs, 2674.905);
assert.deepEqual(stability.latency.warm.p95ByRunMs, [1009.883, 1026.377, 1003.22]);
assert.equal(stability.latency.warm.p95DriftRate, -0.0066);
assert.equal(stability.latency.warm.p95R9Multiplier, 1.0947);
assert.equal(stability.concurrency.clientWorkerCount, 2);
assert.equal(stability.concurrency.p95WarmMultiplier, 1.5622);
assert.equal(stability.concurrency.productionServerParallelism, 'not-proven');
assert.equal(stability.concurrency.validated, true);
assert.equal(stability.governance.approvedColdStartSlo, false);
assert.equal(stability.governance.approvedConcurrencyLimit, false);
assert.equal(stability.governance.longDurationSoakValidated, false);
assert.equal(stability.governance.productionSustainedConcurrencyValidated, false);
assert.equal(stability.governance.thermalTelemetryAvailable, false);
assert.equal(stability.governance.thermalEnvelopeValidated, false);
assert.equal(stability.priorEnvelope.envelopeHash, prior.envelopeHash);

assertCliFailure(
  ['--endpoint', 'https://example.com', '--model', 'qwen2.5:3b'],
  /loopback HTTP origin/,
);
assertCliFailure(
  [
    '--endpoint',
    'http://127.0.0.1:1',
    '--model',
    'qwen2.5:3b',
    '--output',
    '../runtime-stability-escape.json',
  ],
  /output must stay inside the repository/,
);
assertCliFailure(
  ['--endpoint', 'http://127.0.0.1:1', '--model', 'qwen2.5:3b', '--unknown', 'value'],
  /Expected unique runtime stability options/,
);

for (const forbiddenText of [
  'expird auth token',
  '만료된 인증 토큰',
  'blue button',
  'Lunch menu',
  '/Users/',
  '/private/',
  'http://',
  'https://',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbiddenText), false, `evidence leaked ${forbiddenText}`);
}

for (const term of [
  'status: user-learning-operator-override-current',
  '| R10 Local reranker runtime stability | 완료 |',
  'actualLocalRerankerRuntimeStabilityValidated: true',
  'actualLocalRerankerRuntimeStabilityQualified: false',
  'npm run evaluate:local-reranker-runtime-stability',
  'npm run smoke:local-reranker-runtime-stability',
  'bounded-runtime-stability-passed-governance-blocked',
  'productionSustainedConcurrencyValidated: false',
  'thermalEnvelopeValidated: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-reranker-runtime-stability'),
  'README must expose the runtime stability smoke',
);
for (const limitation of [
  'OS page-cache cold boot',
  'production server parallelism',
  'long-duration soak',
  'thermal behavior',
]) {
  assert.ok(
    readme.includes(limitation),
    `README must keep the runtime stability limitation explicit: ${limitation}`,
  );
}
assert.ok(
  evidenceGallery.includes('| Local reranker runtime stability |'),
  'evidence gallery must link runtime stability evidence',
);
assert.ok(
  evidenceManifest.includes(
    'Local reranker runtime stability: verified with `npm run smoke:local-reranker-runtime-stability`',
  ),
  'evidence manifest must record runtime stability verification',
);

console.log(
  JSON.stringify(
    {
      activationAuthorized: stability.activation.authorized,
      actualLocalRerankerRuntimeStabilityQualified:
        stability.actualLocalRerankerRuntimeStabilityQualified,
      actualLocalRerankerRuntimeStabilityValidated:
        stability.actualLocalRerankerRuntimeStabilityValidated,
      concurrencyP95WarmMultiplier: stability.concurrency.p95WarmMultiplier,
      mode: 'local-reranker-runtime-stability-smoke',
      modelInferenceCount: stability.latency.all.modelInferenceCount,
      ok: true,
      productionReadyClaim: false,
      qualityParity: stability.qualityParity,
      status: stability.status,
      warmP95DriftRate: stability.latency.warm.p95DriftRate,
    },
    null,
    2,
  ),
);

function assertCliFailure(args, pattern) {
  const result = spawnSync(
    process.execPath,
    ['scripts/evaluate-local-reranker-runtime-stability.mjs', ...args],
    { cwd: repoDir, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, `runtime stability CLI unexpectedly passed: ${args.join(' ')}`);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
