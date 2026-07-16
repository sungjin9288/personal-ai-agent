import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { createApprovedTrainingRecordFixtureSet } from './training-record-fixture-runtime.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/training-dataset-quality-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
assert.equal(fixture.schemaVersion, 'personal-ai-agent-training-dataset-quality-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);

const { records, stateBefore, statePath, tempRoot } = createApprovedTrainingRecordFixtureSet({
  cases: fixture.cases,
  tempPrefix: 'personal-ai-agent-training-dataset-',
});

const manifest = buildTrainingDatasetManifest({ records, seed: fixture.seed });
const replayedManifest = buildTrainingDatasetManifest({
  records: [...records].reverse(),
  seed: fixture.seed,
});
assert.deepEqual(replayedManifest, manifest);
assert.equal(manifest.status, fixture.expected.status);
assert.equal(manifest.counts.source, fixture.expected.source);
assert.equal(manifest.counts.accepted, fixture.expected.accepted);
assert.equal(manifest.counts.excludedDuplicates, fixture.expected.excludedDuplicates);
assert.equal(manifest.counts.train + manifest.counts.validation, fixture.expected.accepted);
assert.equal(manifest.leakageGate.status, 'passed');
assert.equal(manifest.leakageGate.checks.length, fixture.expected.leakageCheckCount);
assert.equal(manifest.leakageGate.checks.every((check) => check.status === 'passed'), true);
assert.deepEqual(
  manifest.deduplication.excludedRecords.map((record) => record.reason).sort(),
  ['exact-content', 'near-response'],
);
assert.equal(manifest.externalSubmissionAuthorized, false);
assert.equal(manifest.fineTuningExecutionAuthorized, false);
assert.equal(manifest.productionReadyClaim, false);
assert.equal(JSON.stringify(manifest).includes(tempRoot), false);
for (const record of records) {
  assert.equal(JSON.stringify(manifest).includes(record.example.instruction), false);
  assert.equal(JSON.stringify(manifest).includes(record.example.response), false);
}
assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'dataset builder must not mutate the store');

for (const term of [
  'status: local-relevance-shadow-cache-current',
  '| L2 Dataset quality gate | 완료 |',
  '| F1 Fine-tuning readiness | 완료 |',
  'fixtures/training-dataset-quality-cases-v1.json',
  'npm run smoke:training-dataset-quality',
  'externalSubmissionAuthorized: false',
  'fineTuningExecutionAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:training-dataset-quality'),
  'README must expose the training dataset quality command',
);
assert.ok(
  evidenceGallery.includes('| Training dataset quality gate | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the training dataset quality gate',
);
assert.ok(
  evidenceManifest.includes(
    'Training dataset quality gate: verified with `npm run smoke:training-dataset-quality`',
  ),
  'evidence manifest must record the training dataset quality gate',
);

console.log(
  JSON.stringify(
    {
      acceptedRecordCount: manifest.counts.accepted,
      costFree: true,
      datasetHash: manifest.datasetHash,
      excludedDuplicateCount: manifest.counts.excludedDuplicates,
      externalSubmissionAuthorized: false,
      fineTuningExecutionAuthorized: false,
      leakageCheckCount: manifest.leakageGate.checks.length,
      manifestHash: manifest.manifestHash,
      mode: 'training-dataset-quality',
      ok: true,
      productionReadyClaim: false,
      sourceRecordCount: manifest.counts.source,
      trainCount: manifest.counts.train,
      validationCount: manifest.counts.validation,
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
