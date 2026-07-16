import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  assertFineTuningReadinessPackage,
  buildFineTuningReadinessPackage,
  FINE_TUNING_EVALUATION_MANIFEST_SCHEMA_VERSION,
  FINE_TUNING_EXAMPLE_SCHEMA_VERSION,
  FINE_TUNING_READINESS_SCHEMA_VERSION,
} from '../src/core/fine-tuning-readiness.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

const SEED = 'fine-tuning-readiness-v1';

function buildRecord({ acceptedRisk = false, instruction, missionId, response, suffix }) {
  const fixture = buildApprovedTrainingRecordFixture({
    example: { instruction, response },
    missionId,
    suffix,
  });
  if (acceptedRisk) {
    fixture.acceptedRisk = {
      approvedAt: '2026-07-16T09:30:00.000Z',
      approvedBy: 'workspace-owner',
      expiresAt: '2026-07-20T00:00:00.000Z',
      id: `accepted-risk-${suffix}`,
      note: 'Monitor the bounded formatting variance.',
      resolutionKind: 'accepted-risk',
      scope: 'mission',
      scopeId: missionId,
    };
  }
  return buildApprovedTrainingRecord(fixture);
}

function buildRecords() {
  return [
    buildRecord({
      instruction: 'Write a decision memo from reviewed evidence.',
      missionId: 'mission-a',
      response: 'State the decision, cite the evidence, and preserve the next action.',
      suffix: 'a',
    }),
    buildRecord({
      instruction: 'Summarize a failed provider attempt.',
      missionId: 'mission-b',
      response: 'Name the failure, record the stop reason, and keep the fallback decision auditable.',
      suffix: 'b',
    }),
    buildRecord({
      instruction: 'Prepare a reviewer handoff.',
      missionId: 'mission-c',
      response: 'Identify the owner, required evidence, deadline, and explicit resolution condition.',
      suffix: 'c',
    }),
    buildRecord({
      instruction: 'Explain a retrieval result.',
      missionId: 'mission-d',
      response: 'Answer from the cited source and separate unsupported assumptions from confirmed facts.',
      suffix: 'd',
    }),
  ];
}

function buildPassingQualityCase(id) {
  return {
    answer: {
      citedSourceKeys: ['memory:workspace/fact'],
      text: 'The reviewed evidence confirms the decision and preserves the next action.',
    },
    expectedSourceKeys: ['memory:workspace/fact'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    id,
    requiredAnswerTerms: ['reviewed evidence', 'decision'],
    retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
    reviewerVerdict: 'pass',
  };
}

function buildFixture() {
  const records = buildRecords();
  return {
    baselineEvaluation: evaluateAnswerQualitySuite({
      cases: [buildPassingQualityCase('baseline-a'), buildPassingQualityCase('baseline-b')],
    }),
    datasetManifest: buildTrainingDatasetManifest({ records, seed: SEED }),
    records,
  };
}

function parseJsonl(content) {
  return content
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line));
}

test('fine-tuning readiness package is deterministic and does not mutate its inputs', () => {
  const fixture = buildFixture();
  const before = JSON.stringify(fixture);
  const readiness = buildFineTuningReadinessPackage(fixture);
  const replayed = buildFineTuningReadinessPackage({
    ...fixture,
    records: [...fixture.records].reverse(),
  });

  assert.deepEqual(replayed, readiness);
  assert.equal(JSON.stringify(fixture), before);
  assert.equal(readiness.schemaVersion, FINE_TUNING_READINESS_SCHEMA_VERSION);
  assert.equal(readiness.status, 'ready-for-local-review');
  assert.match(readiness.readinessHash, /^[a-f0-9]{64}$/);
});

test('provider-neutral exports preserve split order and parse as one example per line', () => {
  const fixture = buildFixture();
  const readiness = buildFineTuningReadinessPackage(fixture);
  const train = parseJsonl(readiness.exports.train.content);
  const validation = parseJsonl(readiness.exports.validation.content);

  assert.equal(readiness.exports.format, 'provider-neutral-conversation-jsonl-v1');
  assert.equal(readiness.exports.providerAdapterRequired, true);
  assert.equal(readiness.exports.train.lineCount, fixture.datasetManifest.counts.train);
  assert.equal(readiness.exports.validation.lineCount, fixture.datasetManifest.counts.validation);
  assert.deepEqual(
    train.map((example) => example.recordId),
    fixture.datasetManifest.splits.train.map((record) => record.id),
  );
  assert.deepEqual(
    validation.map((example) => example.recordId),
    fixture.datasetManifest.splits.validation.map((record) => record.id),
  );
  for (const example of [...train, ...validation]) {
    assert.equal(example.schemaVersion, FINE_TUNING_EXAMPLE_SCHEMA_VERSION);
    assert.deepEqual(example.messages.map((message) => message.role), ['user', 'assistant']);
    assert.match(example.metadata.contentHash, /^[a-f0-9]{64}$/);
    assert.match(example.metadata.lineageHash, /^[a-f0-9]{64}$/);
  }
});

test('evaluation manifest binds the dataset and answer-quality baseline without training text', () => {
  const fixture = buildFixture();
  const readiness = buildFineTuningReadinessPackage(fixture);
  const manifest = readiness.evaluationManifest;
  const serialized = JSON.stringify(manifest);

  assert.equal(manifest.schemaVersion, FINE_TUNING_EVALUATION_MANIFEST_SCHEMA_VERSION);
  assert.equal(manifest.dataset.datasetHash, fixture.datasetManifest.datasetHash);
  assert.equal(manifest.dataset.acceptedRiskRecordCount, 0);
  assert.deepEqual(manifest.dataset.acceptedRiskRecordIds, []);
  assert.equal(manifest.exports.train.sha256, readiness.exports.train.sha256);
  assert.equal(manifest.exports.validation.sha256, readiness.exports.validation.sha256);
  assert.equal(Object.hasOwn(manifest.exports.train, 'content'), false);
  assert.equal(manifest.answerQualityBaseline.status, 'passed');
  assert.equal(manifest.answerQualityBaseline.caseResults.length, 2);
  assert.equal(manifest.review.status, 'ready-for-review');
  assert.equal(manifest.review.decision, 'pending');
  assert.equal(manifest.review.reviewedBy, null);
  assert.equal(manifest.review.checks.every((check) => check.status === 'passed'), true);
  assert.equal(manifest.rollback.owner, null);
  assert.equal(manifest.rollback.ownerRequired, true);
  for (const record of fixture.records) {
    assert.equal(serialized.includes(record.example.instruction), false);
    assert.equal(serialized.includes(record.example.response), false);
  }
});

test('fine-tuning readiness rejects tampered dataset manifests', () => {
  const fixture = buildFixture();
  fixture.datasetManifest.splits.train[0].contentHash = '0'.repeat(64);

  assert.throws(
    () => buildFineTuningReadinessPackage(fixture),
    /Training dataset manifest failed: dataset-hash, manifest-hash/,
  );
});

test('fine-tuning readiness rejects missing, extra, and changed source records', () => {
  const missing = buildFixture();
  missing.records.pop();
  assert.throws(
    () => buildFineTuningReadinessPackage(missing),
    /complete source record set/,
  );

  const changed = buildFixture();
  const includedId = changed.datasetManifest.splits.train[0].id;
  changed.records.find((record) => record.id === includedId).example.response = 'Changed response.';
  assert.throws(
    () => buildFineTuningReadinessPackage(changed),
    /content-hash/,
  );

  const extra = buildFixture();
  extra.records.push(
    buildRecord({
      instruction: 'Unexpected input.',
      missionId: 'mission-extra',
      response: 'This record is not in the dataset manifest.',
      suffix: 'extra',
    }),
  );
  assert.throws(
    () => buildFineTuningReadinessPackage(extra),
    /complete source record set/,
  );
});

test('fine-tuning readiness rejects a valid manifest paired with a different source set', () => {
  const fixture = buildFixture();
  const replacement = buildRecord({
    instruction: 'Replace one approved dataset record.',
    missionId: 'mission-replacement',
    response: 'This independently approved record is absent from the original manifest.',
    suffix: 'replacement',
  });
  fixture.records[0] = replacement;

  assert.throws(
    () => buildFineTuningReadinessPackage(fixture),
    /does not match its complete source record set/,
  );
});

test('fine-tuning readiness rejects a failed answer-quality baseline', () => {
  const fixture = buildFixture();
  fixture.baselineEvaluation = evaluateAnswerQualitySuite({
    cases: [
      buildPassingQualityCase('baseline-pass'),
      {
        ...buildPassingQualityCase('baseline-fail'),
        reviewerVerdict: 'fail',
      },
    ],
  });

  assert.throws(
    () => buildFineTuningReadinessPackage(fixture),
    /Answer quality baseline failed readiness/,
  );
});

test('evaluation manifest exposes accepted-risk record ids without copying risk notes', () => {
  const records = buildRecords();
  records[0] = buildRecord({
    acceptedRisk: true,
    instruction: 'Write a decision memo from reviewed evidence.',
    missionId: 'mission-a',
    response: 'State the decision, cite the evidence, and preserve the next action.',
    suffix: 'a',
  });
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: [buildPassingQualityCase('baseline-a'), buildPassingQualityCase('baseline-b')],
  });
  const readiness = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: buildTrainingDatasetManifest({ records, seed: SEED }),
    records,
  });
  const exportedExamples = [
    ...parseJsonl(readiness.exports.train.content),
    ...parseJsonl(readiness.exports.validation.content),
  ];

  assert.equal(readiness.evaluationManifest.dataset.acceptedRiskRecordCount, 1);
  assert.deepEqual(readiness.evaluationManifest.dataset.acceptedRiskRecordIds, [records[0].id]);
  assert.equal(
    exportedExamples.find((example) => example.recordId === records[0].id).metadata.acceptedRisk,
    true,
  );
  assert.equal(
    JSON.stringify(readiness.evaluationManifest).includes('Monitor the bounded formatting variance.'),
    false,
  );
});

test('readiness package never authorizes submission or training execution', () => {
  const readiness = buildFineTuningReadinessPackage(buildFixture());

  assert.equal(readiness.externalSubmissionAuthorized, false);
  assert.equal(readiness.fineTuningExecutionAuthorized, false);
  assert.equal(readiness.productionReadyClaim, false);
  assert.equal(readiness.evaluationManifest.externalSubmissionAuthorized, false);
  assert.equal(readiness.evaluationManifest.fineTuningExecutionAuthorized, false);
  assert.equal(readiness.evaluationManifest.productionReadyClaim, false);
  assert.deepEqual(readiness.evaluationManifest.submissionRequirements, [
    'reviewer-approval',
    'provider-account-approval',
    'model-pin',
    'budget-limit',
    'data-transfer-approval',
    'rollback-owner',
  ]);
});

test('readiness integrity validator rejects JSONL, baseline, and review boundary tampering', () => {
  const readiness = buildFineTuningReadinessPackage(buildFixture());
  assert.doesNotThrow(() => assertFineTuningReadinessPackage(readiness));

  const jsonlTampered = structuredClone(readiness);
  jsonlTampered.exports.train.content = jsonlTampered.exports.train.content.replace(
    'State the decision',
    'Change the decision',
  );
  assert.throws(
    () => assertFineTuningReadinessPackage(jsonlTampered),
    /train-export-integrity/,
  );

  const unsafeJsonl = structuredClone(readiness);
  const unsafeExamples = parseJsonl(unsafeJsonl.exports.train.content);
  unsafeExamples[0].messages[1].content = 'password=customer-secret-value';
  unsafeJsonl.exports.train.content = `${unsafeExamples.map((example) => JSON.stringify(example)).join('\n')}\n`;
  unsafeJsonl.exports.train.byteLength = Buffer.byteLength(
    unsafeJsonl.exports.train.content,
    'utf8',
  );
  unsafeJsonl.exports.train.sha256 = createHash('sha256')
    .update(unsafeJsonl.exports.train.content)
    .digest('hex');
  assert.throws(
    () => assertFineTuningReadinessPackage(unsafeJsonl),
    /train-example-shape/,
  );

  const baselineTampered = structuredClone(readiness);
  baselineTampered.evaluationManifest.answerQualityBaseline.status = 'failed';
  assert.throws(
    () => assertFineTuningReadinessPackage(baselineTampered),
    /evaluation-manifest-integrity, baseline-integrity/,
  );

  const reviewed = structuredClone(readiness);
  reviewed.evaluationManifest.review.decision = 'approve';
  reviewed.evaluationManifest.review.reviewedBy = 'reviewer';
  assert.throws(
    () => assertFineTuningReadinessPackage(reviewed),
    /evaluation-manifest-integrity, review-boundary/,
  );
});
