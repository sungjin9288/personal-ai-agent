import assert from 'node:assert/strict';
import test from 'node:test';

import { assertApprovedTrainingRecordForDataset } from '../src/core/training-dataset-quality.mjs';
import { buildFineTuningPrivateReviewedExampleCanonicalRecord, deriveFineTuningPrivateReviewedExampleSourceHashes } from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { prepareReviewedExampleCanonicalizationFixture, withReviewedExampleCanonicalizationFixture } from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';

test('F1.21 builds a dataset-compatible record from an approved reviewed-example source', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const record = buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    });
    assertApprovedTrainingRecordForDataset(record);
    assert.deepEqual(record.example, fixture.item.example);
    assert.equal(record.fineTuningExecutionAuthorized, false);
  });
});

test('F1.21 rejects a source bundle that injects content not present in the admitted item', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    prepared.sourceBundle.example.response = 'different';
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    }), /content does not match/);
  });
});

test('F1.21 rejects coordinated source-bundle rehash drift that is not bound by the admission envelope', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const source = structuredClone(prepared.sourceBundle);
    source.candidate.id = 'learningcandidate-rehashed';
    Object.assign(source, deriveFineTuningPrivateReviewedExampleSourceHashes(source));
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: source,
      workspace: fixture.workspace,
    }), /source lineage is invalid/);
  });
});

test('F1.21 rejects a materialization time outside the approved item and F1.15 window', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: fixture.item.storedAt,
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    }), /source lineage is invalid/);
  });
});

test('F1.21 rejects coordinated candidate approval drift even when the source bundle hashes are recomputed', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const source = structuredClone(prepared.sourceBundle);
    source.candidate.promotionDecision.decision = 'reject';
    Object.assign(source, deriveFineTuningPrivateReviewedExampleSourceHashes(source));
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: source,
      workspace: fixture.workspace,
    }), /source lineage is invalid/);
  });
});

test('F1.21 core rejects a valid wrong-lane lineage and a rejected F1.15 decision', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    }), /source lineage is invalid/);
  }, { lane: 'answer-quality-cases' });

  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture, {
      artifactDecision: 'reject',
    });
    assert.throws(() => buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    }), /source lineage is invalid/);
  });
});
