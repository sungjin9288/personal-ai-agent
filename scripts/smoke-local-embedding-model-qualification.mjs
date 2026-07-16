import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const evidencePath = 'evidence/output-artifacts/local-embedding-model-qualification.json';
const evidenceText = readRequiredFile(evidencePath);
const qualification = JSON.parse(evidenceText);
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['qualify:local-embedding-model'],
  'node scripts/qualify-local-embedding-model.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-embedding-model-qualification'],
  'node scripts/smoke-local-embedding-model-qualification.mjs',
);
assert.doesNotThrow(() => assertLocalEmbeddingModelQualification(qualification));
assert.equal(qualification.candidates.length, 3);
assert.equal(qualification.actualLocalEmbeddingModelQualityValidated, true);
assert.equal(qualification.actualLocalEmbeddingModelQualified, false);
assert.equal(qualification.selection.modelId, 'qwen2.5:3b');
assert.equal(qualification.status, 'governance-blocked');
assert.equal(qualification.decision, 'hold-for-governance');
assert.equal(qualification.activation.authorized, false);
assert.equal(qualification.productionReadyClaim, false);
assert.equal(qualification.runtime.transportLoopback, true);
assert.equal(qualification.runtime.externalProviderCalls, 'none');
assert.equal(qualification.runtime.cloudFeaturesDisabled, false);

const candidates = Object.fromEntries(
  qualification.candidates.map((candidate) => [candidate.modelId, candidate]),
);
assert.equal(candidates['qwen2.5:0.5b'].qualityPassed, false);
assert.equal(candidates['qwen2.5:0.5b'].quality.metrics.casePassRate, 0.6667);
assert.equal(candidates['qwen2.5:1.5b'].qualityPassed, false);
assert.equal(candidates['qwen2.5:1.5b'].quality.metrics.casePassRate, 0.6667);
assert.equal(candidates['qwen2.5:3b'].qualityPassed, true);
assert.deepEqual(candidates['qwen2.5:3b'].quality.metrics, {
  casePassRate: 1,
  noiseRateAtK: 0,
  precisionAtK: 1,
  recallAtK: 1,
  sourceDiversityRate: 1,
  unlabeledRetrievedSourceCount: 0,
});
assert.equal(candidates['qwen2.5:3b'].dimensions, 2048);
assert.equal(candidates['qwen2.5:3b'].license.title, 'Qwen RESEARCH LICENSE AGREEMENT');
assert.equal(Number(candidates['qwen2.5:3b'].durationMs) > 0, true);

assert.deepEqual(
  qualification.checks.filter((check) => !check.passed).map((check) => check.id),
  [
    'ollama-cloud-features-disabled',
    'license-review-approved',
    'network-isolation-approved',
    'resource-envelope-approved',
    'rollback-owner-assigned',
  ],
);
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\/|https?:\/\//);
assert.doesNotMatch(evidenceText, /Qwen RESEARCH LICENSE AGREEMENT Release Date/);
assert.doesNotMatch(evidenceText, /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/);

for (const term of [
  'status: local-relevance-shadow-cache-current',
  '| R6 Local embedding model qualification | 완료 |',
  'actualLocalEmbeddingModelQualityValidated: true',
  'actualLocalEmbeddingModelQualified: false',
  'npm run qualify:local-embedding-model',
  'npm run smoke:local-embedding-model-qualification',
  'qwen2.5:3b',
  'governance-blocked',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-embedding-model-qualification'),
  'README must expose the local embedding qualification smoke',
);
assert.ok(
  evidenceGallery.includes('| Local embedding model qualification |'),
  'evidence gallery must link local embedding qualification',
);
assert.ok(
  evidenceManifest.includes(
    'Local embedding model qualification: verified with `npm run smoke:local-embedding-model-qualification`',
  ),
  'evidence manifest must record local embedding qualification',
);

console.log(
  JSON.stringify(
    {
      activationAuthorized: qualification.activation.authorized,
      actualLocalEmbeddingModelQualified: qualification.actualLocalEmbeddingModelQualified,
      actualLocalEmbeddingModelQualityValidated:
        qualification.actualLocalEmbeddingModelQualityValidated,
      candidateCount: qualification.candidates.length,
      mode: 'local-embedding-model-qualification-smoke',
      ok: true,
      productionReadyClaim: qualification.productionReadyClaim,
      selectedModelId: qualification.selection.modelId,
      status: qualification.status,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
