import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { buildApprovedTrainingRecordFixture } from '../scripts/approved-training-record-fixture.mjs';
import { buildDeterministicFineTuningBaselineContext } from '../scripts/local-training-permission-fixture.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  assertFineTuningPrivateReviewedExampleDatasetImpactShadow,
  buildFineTuningPrivateReviewedExampleDatasetImpactShadow,
} from '../src/core/fine-tuning-private-reviewed-example-dataset-impact.mjs';
import {
  prepareReviewedExampleCanonicalizationFixture,
  withReviewedExampleCanonicalizationFixture,
} from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function receiptForRecord(receipt, record) {
  const next = {
    ...receipt,
    contentHash: record.contentHash,
    recordId: record.id,
    recordSha256: hash(record),
  };
  next.id = `private-reviewed-example-canonicalization-receipt-${hash({
    itemHash: next.item.itemHash,
    recordId: record.id,
  })}`;
  return next;
}

function buildRecord({
  acceptedRisk,
  example,
  missionId,
  suffix,
  workspaceId = 'workspace-1',
}) {
  const fixture = buildApprovedTrainingRecordFixture({
    example,
    missionId,
    suffix,
    workspaceId,
  });
  fixture.acceptedRisk = acceptedRisk || null;
  return buildApprovedTrainingRecord(fixture);
}

function rehashProjection(value) {
  const { id: _id, projectionHash: _projectionHash, ...content } = value;
  const projectionHash = hash(content);
  return {
    ...content,
    id: `private-reviewed-example-dataset-impact-shadow-${projectionHash}`,
    projectionHash,
  };
}

function withProjectionFixture(callback) {
  return withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const record = buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    });
    const receipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
      admission: fixture.admission,
      artifactPreparationResolution: prepared.artifactPreparationResolution,
      item: fixture.item,
      record,
      sourceBundle: prepared.sourceBundle,
      workspace: fixture.workspace,
    });
    return callback({
      baselineContext: buildDeterministicFineTuningBaselineContext(),
      receipt,
      record,
    });
  });
}

test('F1.22 projects one eligible record without changing actual sufficiency', () => {
  withProjectionFixture(({ baselineContext, receipt, record }) => {
    const result = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt,
      record,
    });

    assertFineTuningPrivateReviewedExampleDatasetImpactShadow(result);
    assert.equal(result.projection.disposition, 'accepted-in-shadow');
    assert.deepEqual(result.baseline.measurements, {
      acceptedExamples: 4,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 2,
      missionScopes: 4,
      trainExamples: 3,
      validationExamples: 1,
    });
    assert.deepEqual(result.projection.measurements, {
      acceptedExamples: 5,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 2,
      missionScopes: 5,
      trainExamples: 4,
      validationExamples: 1,
    });
    assert.equal(result.projection.failedCheckIds.length, 5);
    assert.equal(result.actualPrivateDatasetRebuilt, false);
    assert.equal(JSON.stringify(result).includes(record.example.response), false);
  });
});

test('F1.22 reports exact, content, and near-response exclusions with zero accepted delta', () => {
  withProjectionFixture(({ baselineContext, receipt }) => {
    const exact = baselineContext.records[0];
    const exactResult = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, exact),
      record: exact,
    });
    assert.equal(exactResult.projection.disposition, 'excluded-exact');
    assert.equal(exactResult.projection.delta.acceptedExamples, 0);

    const content = buildRecord({
      example: baselineContext.records[0].example,
      missionId: 'mission-content-duplicate',
      suffix: 'f1-22-content-duplicate',
    });
    const contentResult = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, content),
      record: content,
    });
    assert.equal(contentResult.projection.disposition, 'excluded-content');
    assert.equal(contentResult.projection.delta.acceptedExamples, 0);

    const source = baselineContext.records[0];
    let suffix = 0;
    let near;
    do {
      suffix += 1;
      near = buildRecord({
        example: {
          instruction: 'Prepare another reviewed decision statement.',
          response: `${source.example.response} reviewed`,
        },
        missionId: 'mission-near-duplicate',
        suffix: `f1-22-near-${suffix}`,
      });
    } while (near.id.localeCompare(source.id) < 0);
    const nearResult = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, near),
      record: near,
    });
    assert.equal(nearResult.projection.disposition, 'excluded-near-response');
    assert.equal(nearResult.projection.delta.acceptedExamples, 0);
  });
});

test('F1.22 keeps answer quality unchanged and does not invent a new mission scope', () => {
  withProjectionFixture(({ baselineContext, receipt }) => {
    const acceptedScope = baselineContext.datasetManifest.splits.train[0].scope;
    const sameMission = buildRecord({
      example: {
        instruction: 'Record the verified decision owner.',
        response: 'Name one accountable owner and preserve the next review date.',
      },
      missionId: acceptedScope.id,
      suffix: 'f1-22-same-mission',
      workspaceId: acceptedScope.workspaceId,
    });
    const result = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, sameMission),
      record: sameMission,
    });

    assert.equal(result.projection.disposition, 'accepted-in-shadow');
    assert.equal(result.projection.delta.missionScopes, 0);
    assert.equal(result.projection.delta.answerQualityCases, 0);
  });
});

test('F1.22 distinguishes accepted membership from zero net growth after displacement', () => {
  withProjectionFixture(({ baselineContext, receipt }) => {
    const acceptedEntry = [
      ...baselineContext.datasetManifest.splits.train,
      ...baselineContext.datasetManifest.splits.validation,
    ].find((entry) => entry.scope.id === 'mission-provider-failure');
    const displaced = baselineContext.records.find(
      (record) => record.id === acceptedEntry.id,
    );
    let suffix = 0;
    let incoming;
    do {
      suffix += 1;
      incoming = buildRecord({
        example: displaced.example,
        missionId: 'mission-incoming-content-duplicate',
        suffix: `f1-22-displacing-${suffix}`,
      });
    } while (incoming.id.localeCompare(displaced.id) > 0);

    const result = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, incoming),
      record: incoming,
    });

    assert.equal(result.projection.disposition, 'accepted-in-shadow');
    assert.equal(result.projection.baselineRecordDisplaced, true);
    assert.equal(result.projection.delta.acceptedExamples, 0);
    assert.equal(
      result.projection.delta.trainExamples +
        result.projection.delta.validationExamples,
      0,
    );
  });
});

test('F1.22 preserves a valid accepted-risk gate regression in the projection', () => {
  withProjectionFixture(({ baselineContext, receipt }) => {
    const missionId = 'mission-accepted-risk-shadow';
    const record = buildRecord({
      acceptedRisk: {
        approvedAt: '2026-07-16T09:30:00.000Z',
        approvedBy: 'workspace-owner',
        expiresAt: '2026-07-20T00:00:00.000Z',
        id: 'accepted-risk-f1-22',
        note: 'Monitor the bounded formatting variance.',
        resolutionKind: 'accepted-risk',
        scope: 'mission',
        scopeId: missionId,
      },
      example: {
        instruction: 'Record a bounded accepted-risk decision.',
        response: 'Name the approver, expiration, scope, and monitoring action.',
      },
      missionId,
      suffix: 'f1-22-accepted-risk',
    });
    const result = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt: receiptForRecord(receipt, record),
      record,
    });

    assert.equal(result.projection.measurements.acceptedRiskExamples, 1);
    assert.equal(result.projection.measurements.acceptedRiskRate, 0.2);
    assert.equal(
      result.projection.failedCheckIds.includes(
        'accepted-risk-rate-within-limit',
      ),
      true,
    );
  });
});

test('F1.22 fails closed on baseline drift and projection tampering', () => {
  withProjectionFixture(({ baselineContext, receipt, record }) => {
    const trackedAssessment = structuredClone(
      buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
        baselineContext,
        receipt,
        record,
      }).baseline,
    );
    assert.throws(
      () =>
        buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
          baselineContext,
          receipt,
          record,
          trackedAssessment,
        }),
      /tracked sufficiency baseline drifted/,
    );

    const result = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt,
      record,
    });
    result.actualPrivateDatasetRebuilt = true;
    assert.throws(
      () => assertFineTuningPrivateReviewedExampleDatasetImpactShadow(result),
      /shadow is invalid/,
    );

    const extraBinding = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
      baselineContext,
      receipt,
      record,
    });
    extraBinding.projection.bindings.workspaceId = 'private-workspace';
    assert.throws(
      () =>
        assertFineTuningPrivateReviewedExampleDatasetImpactShadow(
          rehashProjection(extraBinding),
        ),
      /shadow is invalid/,
    );

    const fakeFailures =
      buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
        baselineContext,
        receipt,
        record,
      });
    fakeFailures.projection.failedCheckIds = [
      'invented-1',
      'invented-2',
      'invented-3',
      'invented-4',
      'invented-5',
    ];
    assert.throws(
      () =>
        assertFineTuningPrivateReviewedExampleDatasetImpactShadow(
          rehashProjection(fakeFailures),
        ),
      /shadow is invalid/,
    );

    const impossibleMeasurements =
      buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
        baselineContext,
        receipt,
        record,
      });
    impossibleMeasurements.projection.measurements.acceptedRiskExamples = -1;
    impossibleMeasurements.projection.measurements.acceptedRiskRate = -0.2;
    impossibleMeasurements.projection.delta.acceptedRiskExamples = -1;
    impossibleMeasurements.projection.delta.acceptedRiskRate = -0.2;
    assert.throws(
      () =>
        assertFineTuningPrivateReviewedExampleDatasetImpactShadow(
          rehashProjection(impossibleMeasurements),
        ),
      /measurements are invalid/,
    );
  });
});
