import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { createApprovedTrainingRecordFixtureSet } from './training-record-fixture-runtime.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/fine-tuning-readiness-cases-v1.json'));
const datasetFixture = JSON.parse(readRequiredFile(fixture.datasetFixture));
const answerQualityFixture = JSON.parse(readRequiredFile(fixture.answerQualityFixture));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-fine-tuning-readiness-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);
assert.equal(datasetFixture.schemaVersion, 'personal-ai-agent-training-dataset-quality-fixture/v1');
assert.equal(answerQualityFixture.schemaVersion, 'personal-ai-agent-answer-quality-fixture/v1');

const { records, stateBefore, statePath, tempRoot } = createApprovedTrainingRecordFixtureSet({
  cases: datasetFixture.cases,
  tempPrefix: 'personal-ai-agent-fine-tuning-readiness-',
});
const datasetManifest = buildTrainingDatasetManifest({
  records,
  seed: datasetFixture.seed,
});
const baselineEvaluation = evaluateAnswerQualitySuite({
  cases: answerQualityFixture.cases.map(({ retrievalInput, ...definition }) => ({
    ...definition,
    retrievedItems: buildRetrievalContext(retrievalInput),
  })),
  thresholds: answerQualityFixture.thresholds,
});
const readiness = buildFineTuningReadinessPackage({
  baselineEvaluation,
  datasetManifest,
  records,
});
const replayedReadiness = buildFineTuningReadinessPackage({
  baselineEvaluation,
  datasetManifest,
  records: [...records].reverse(),
});

assert.deepEqual(replayedReadiness, readiness);
assert.equal(readiness.status, fixture.expected.status);
assert.equal(readiness.exports.format, fixture.expected.exportFormat);
assert.equal(readiness.exports.train.lineCount, fixture.expected.trainLineCount);
assert.equal(readiness.exports.validation.lineCount, fixture.expected.validationLineCount);
assert.equal(datasetManifest.counts.source, fixture.expected.sourceRecordCount);
assert.equal(datasetManifest.counts.accepted, fixture.expected.acceptedRecordCount);
assert.equal(
  readiness.evaluationManifest.review.checks.length,
  fixture.expected.reviewCheckCount,
);
assert.equal(
  readiness.evaluationManifest.submissionRequirements.length,
  fixture.expected.submissionRequirementCount,
);
assert.equal(readiness.evaluationManifest.answerQualityBaseline.status, 'passed');
assert.equal(readiness.evaluationManifest.review.decision, 'pending');
assert.equal(readiness.evaluationManifest.review.reviewedBy, null);
assert.equal(readiness.evaluationManifest.rollback.owner, null);
assert.equal(readiness.exports.providerAdapterRequired, true);
assert.equal(readiness.externalSubmissionAuthorized, false);
assert.equal(readiness.fineTuningExecutionAuthorized, false);
assert.equal(readiness.productionReadyClaim, false);

const exportDir = path.join(tempRoot, 'fine-tuning-readiness');
fs.mkdirSync(exportDir, { recursive: true });
const trainPath = path.join(exportDir, readiness.exports.train.fileName);
const validationPath = path.join(exportDir, readiness.exports.validation.fileName);
const evaluationPath = path.join(exportDir, 'evaluation-manifest.json');
fs.writeFileSync(trainPath, readiness.exports.train.content, 'utf8');
fs.writeFileSync(validationPath, readiness.exports.validation.content, 'utf8');
fs.writeFileSync(evaluationPath, `${JSON.stringify(readiness.evaluationManifest, null, 2)}\n`, 'utf8');

const trainExamples = parseJsonl(fs.readFileSync(trainPath, 'utf8'));
const validationExamples = parseJsonl(fs.readFileSync(validationPath, 'utf8'));
const storedEvaluationManifest = JSON.parse(fs.readFileSync(evaluationPath, 'utf8'));
assert.equal(trainExamples.length, fixture.expected.trainLineCount);
assert.equal(validationExamples.length, fixture.expected.validationLineCount);
assert.deepEqual(storedEvaluationManifest, readiness.evaluationManifest);
assert.deepEqual(
  trainExamples.map((example) => example.recordId),
  datasetManifest.splits.train.map((record) => record.id),
);
assert.deepEqual(
  validationExamples.map((example) => example.recordId),
  datasetManifest.splits.validation.map((record) => record.id),
);
for (const example of [...trainExamples, ...validationExamples]) {
  assert.deepEqual(example.messages.map((message) => message.role), ['user', 'assistant']);
  assert.match(example.metadata.contentHash, /^[a-f0-9]{64}$/);
  assert.match(example.metadata.lineageHash, /^[a-f0-9]{64}$/);
}
for (const record of records) {
  assert.equal(JSON.stringify(storedEvaluationManifest).includes(record.example.instruction), false);
  assert.equal(JSON.stringify(storedEvaluationManifest).includes(record.example.response), false);
}
assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'fine-tuning export must not mutate the store');

const failedBaseline = structuredClone(baselineEvaluation);
failedBaseline.status = 'failed';
assert.throws(
  () => buildFineTuningReadinessPackage({
    baselineEvaluation: failedBaseline,
    datasetManifest,
    records,
  }),
  /Answer quality baseline failed readiness/,
);

for (const term of [
  'status: local-relevance-shadow-replay-current',
  '| F1 Fine-tuning readiness | 완료 |',
  '| F2 외부 fine-tuning 실행 | 외부 작업 |',
  'fixtures/fine-tuning-readiness-cases-v1.json',
  'npm run smoke:fine-tuning-readiness',
  'provider-neutral-conversation-jsonl-v1',
  'externalSubmissionAuthorized: false',
  'fineTuningExecutionAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:fine-tuning-readiness'),
  'README must expose the fine-tuning readiness command',
);
assert.ok(
  evidenceGallery.includes('| Fine-tuning readiness export | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the fine-tuning readiness export',
);
assert.ok(
  evidenceManifest.includes(
    'Fine-tuning readiness export: verified with `npm run smoke:fine-tuning-readiness`',
  ),
  'evidence manifest must record the fine-tuning readiness export',
);

console.log(
  JSON.stringify(
    {
      answerQualityCaseCount: baselineEvaluation.summary.caseCount,
      costFree: true,
      datasetHash: datasetManifest.datasetHash,
      evaluationManifestHash: readiness.evaluationManifest.manifestHash,
      externalSubmissionAuthorized: false,
      fineTuningExecutionAuthorized: false,
      mode: 'fine-tuning-readiness',
      ok: true,
      productionReadyClaim: false,
      providerAdapterRequired: true,
      readinessHash: readiness.readinessHash,
      reviewDecision: readiness.evaluationManifest.review.decision,
      trainLineCount: readiness.exports.train.lineCount,
      validationLineCount: readiness.exports.validation.lineCount,
    },
    null,
    2,
  ),
);

function parseJsonl(content) {
  return String(content)
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line));
}

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
