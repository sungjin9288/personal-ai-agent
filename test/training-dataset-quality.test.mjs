import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  buildTrainingDatasetManifest,
  TRAINING_DATASET_MANIFEST_SCHEMA_VERSION,
} from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

const SEED = 'training-dataset-quality-v1';

function buildRecord({ example, missionId, suffix, workspaceId = 'workspace-1' }) {
  return buildApprovedTrainingRecord(
    buildApprovedTrainingRecordFixture({ example, missionId, suffix, workspaceId }),
  );
}

function buildRecords() {
  return [
    buildRecord({
      example: {
        instruction: 'Write a decision memo from reviewed evidence.',
        response: 'State the decision, cite the evidence, and preserve the next action.',
      },
      missionId: 'mission-a',
      suffix: 'a',
    }),
    buildRecord({
      example: {
        instruction: 'Summarize a failed provider attempt.',
        response: 'Name the failure, record the stop reason, and keep the fallback decision auditable.',
      },
      missionId: 'mission-b',
      suffix: 'b',
    }),
    buildRecord({
      example: {
        instruction: 'Prepare a reviewer handoff.',
        response: 'Identify the owner, required evidence, deadline, and explicit resolution condition.',
      },
      missionId: 'mission-c',
      suffix: 'c',
    }),
    buildRecord({
      example: {
        instruction: 'Explain a retrieval result.',
        response: 'Answer from the cited source and separate unsupported assumptions from confirmed facts.',
      },
      missionId: 'mission-d',
      suffix: 'd',
    }),
  ];
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('dataset manifest is deterministic regardless of input order and does not mutate records', () => {
  const records = buildRecords();
  const before = JSON.stringify(records);
  const manifest = buildTrainingDatasetManifest({ records, seed: SEED });
  const replayed = buildTrainingDatasetManifest({ records: [...records].reverse(), seed: SEED });

  assert.deepEqual(replayed, manifest);
  assert.equal(JSON.stringify(records), before);
  assert.equal(manifest.schemaVersion, TRAINING_DATASET_MANIFEST_SCHEMA_VERSION);
  assert.equal(manifest.status, 'approved-for-local-export-review');
  assert.equal(manifest.counts.source, 4);
  assert.equal(manifest.counts.accepted, 4);
  assert.equal(manifest.counts.train + manifest.counts.validation, 4);
  assert.match(manifest.datasetHash, /^[a-f0-9]{64}$/);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
});

test('dataset manifest excludes exact content and near-response duplicates', () => {
  const records = buildRecords();
  records.push(
    buildRecord({
      example: structuredClone(records[0].example),
      missionId: 'mission-exact-duplicate',
      suffix: 'exact-duplicate',
    }),
  );
  records.push(
    buildRecord({
      example: {
        instruction: 'Prepare the reviewed decision statement.',
        response: 'State the decision; cite the evidence and preserve the next action.',
      },
      missionId: 'mission-near-duplicate',
      suffix: 'near-duplicate',
    }),
  );

  const manifest = buildTrainingDatasetManifest({ records, seed: SEED });
  const reasons = manifest.deduplication.excludedRecords.map((record) => record.reason).sort();

  assert.equal(manifest.counts.source, 6);
  assert.equal(manifest.counts.accepted, 4);
  assert.equal(manifest.counts.excludedDuplicates, 2);
  assert.deepEqual(reasons, ['exact-content', 'near-response']);
});

test('dataset manifest keeps every mission scope in only one split', () => {
  const records = buildRecords();
  records.push(
    buildRecord({
      example: {
        instruction: 'Add the final decision owner.',
        response: 'Record one accountable owner and a review date for the approved decision.',
      },
      missionId: 'mission-a',
      suffix: 'a-second-record',
    }),
  );
  const manifest = buildTrainingDatasetManifest({ records, seed: SEED });
  const trainScopes = new Set(
    manifest.splits.train.map((record) => `${record.scope.workspaceId}/${record.scope.id}`),
  );
  const validationScopes = new Set(
    manifest.splits.validation.map((record) => `${record.scope.workspaceId}/${record.scope.id}`),
  );

  assert.equal([...trainScopes].some((scope) => validationScopes.has(scope)), false);
  assert.equal(
    manifest.leakageGate.checks.find((check) => check.id === 'mission-scope-separated').status,
    'passed',
  );
});

test('dataset manifest rejects tampered or unsafe approved records', () => {
  const tampered = buildRecords();
  tampered[0].example.response = 'password=customer-secret-value';

  assert.throws(
    () => buildTrainingDatasetManifest({ records: tampered, seed: SEED }),
    /no-raw-secrets, content-hash/,
  );

  const externallyAuthorized = buildRecords();
  externallyAuthorized[0].externalSubmissionAuthorized = true;
  assert.throws(
    () => buildTrainingDatasetManifest({ records: externallyAuthorized, seed: SEED }),
    /local-only-boundary/,
  );
});

test('dataset manifest rejects conflicting content from the same lineage', () => {
  const records = buildRecords();
  const conflicting = structuredClone(records[0]);
  conflicting.example = {
    instruction: 'Write a materially different reviewed summary.',
    response: 'Preserve a different verified outcome and its evidence trail.',
  };
  conflicting.contentHash = hashRecord(conflicting.example);
  conflicting.id = `trainingrecord-${hashRecord([
    conflicting.lineage.candidateId,
    conflicting.contentHash,
    conflicting.lineageHash,
  ])}`;
  records.push(conflicting);

  assert.throws(
    () => buildTrainingDatasetManifest({ records, seed: SEED }),
    /share lineage with different content/,
  );
});

test('dataset manifest requires two unique mission scopes after deduplication', () => {
  const first = buildRecords()[0];
  const exactDuplicate = structuredClone(first);

  assert.throws(
    () => buildTrainingDatasetManifest({ records: [first, exactDuplicate], seed: SEED }),
    /at least two unique mission scopes/,
  );
});

test('dataset manifest exposes hashes and lineage without copying training text', () => {
  const records = buildRecords();
  const manifest = buildTrainingDatasetManifest({ records, seed: SEED });
  const serialized = JSON.stringify(manifest);

  assert.equal(serialized.includes(records[0].example.instruction), false);
  assert.equal(serialized.includes(records[0].example.response), false);
  assert.equal(manifest.leakageGate.status, 'passed');
  assert.equal(manifest.leakageGate.checkCounts.failed, 0);
  assert.equal(manifest.externalSubmissionAuthorized, false);
  assert.equal(manifest.fineTuningExecutionAuthorized, false);
  assert.equal(manifest.productionReadyClaim, false);
});

test('dataset manifest seed is explicit and contributes to manifest identity', () => {
  const records = buildRecords();
  const first = buildTrainingDatasetManifest({ records, seed: SEED });
  const second = buildTrainingDatasetManifest({ records, seed: 'training-dataset-quality-v2' });

  assert.notEqual(first.manifestHash, second.manifestHash);
  assert.throws(
    () => buildTrainingDatasetManifest({ records, seed: '   ' }),
    /requires a non-empty deterministic seed/,
  );
});
