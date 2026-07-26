import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import {
  assertApprovedLocalTrainingPermission,
  buildLocalTrainingPermissionRequest,
  revokeLocalTrainingPermission,
  resolveLocalTrainingPermissionRequest,
} from '../src/core/local-training-permission.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildReadinessPackage() {
  const records = ['a', 'b', 'c', 'd'].map((suffix) =>
    buildApprovedTrainingRecord(
      buildApprovedTrainingRecordFixture({
        example: {
          instruction: `Prepare reviewed instruction ${suffix}.`,
          response: `Return grounded response ${suffix} with an explicit next action.`,
        },
        missionId: `mission-${suffix}`,
        suffix,
      }),
    ));
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: ['a', 'b'].map((suffix) => ({
      answer: {
        citedSourceKeys: ['memory:workspace/fact'],
        text: `Reviewed evidence ${suffix} confirms the decision.`,
      },
      expectedSourceKeys: ['memory:workspace/fact'],
      id: `baseline-${suffix}`,
      requiredAnswerTerms: ['reviewed evidence', 'decision'],
      retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
      reviewerVerdict: 'pass',
    })),
  });
  return buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: buildTrainingDatasetManifest({
      records,
      seed: 'local-training-permission-v1',
    }),
    records,
  });
}

function buildRequest(readinessPackage, overrides = {}) {
  return buildLocalTrainingPermissionRequest({
    approvalOwner: 'local-training-operator',
    baseModelId: 'approved-local-base-model',
    evidence: {
      egress: {
        evidenceSha256: sha256('os-egress-isolation-evidence'),
        owner: 'security-owner',
      },
      license: {
        evidenceSha256: sha256('base-model-license-review'),
        owner: 'license-owner',
      },
      resource: {
        evidenceSha256: sha256('resource-envelope-evidence'),
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes: 20_000_000_000,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs: 3_600_000,
        },
        owner: 'resource-owner',
      },
    },
    expiresAt: '2026-07-18T00:00:00.000Z',
    readinessPackage,
    requestedAt: '2026-07-17T10:00:00.000Z',
    rollbackOwner: 'rollback-owner',
    trainerId: 'approved-local-trainer',
    ...overrides,
  });
}

function approveRequest(request, overrides = {}) {
  return resolveLocalTrainingPermissionRequest({
    decision: 'approve',
    reason: 'Reviewed bounded local execution evidence.',
    request,
    resolvedAt: '2026-07-17T10:05:00.000Z',
    resolvedBy: 'local-training-operator',
    ...overrides,
  });
}

test('local training permission request deterministically binds readiness and three owner-reviewed evidence gates', () => {
  const readinessPackage = buildReadinessPackage();
  const request = buildRequest(readinessPackage);
  const replayed = buildRequest(readinessPackage);

  assert.deepEqual(replayed, request);
  assert.equal(request.status, 'pending-review');
  assert.equal(request.localExecutionAuthorized, false);
  assert.equal(request.externalSubmissionAuthorized, false);
  assert.equal(request.rolloutAuthorized, false);
  assert.equal(request.productionReadyClaim, false);
  assert.equal(request.readinessHash, readinessPackage.readinessHash);
  assert.equal(request.datasetHash, readinessPackage.dataset.datasetHash);
  assert.equal(request.evidence.license.review, 'required');
  assert.equal(request.evidence.egress.control, 'os-level-egress-isolation');
  assert.equal(request.evidence.resource.enforcement, 'caller-owned');
  assert.match(request.requestHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(request).includes('Prepare reviewed instruction'), false);
  assert.equal(JSON.stringify(request).includes('Return grounded response'), false);
});

test('local training permission approval is content-free, expiring, and distinct from rejection', () => {
  const readinessPackage = buildReadinessPackage();
  const request = buildRequest(readinessPackage);
  const permission = approveRequest(request);
  const rejected = resolveLocalTrainingPermissionRequest({
    decision: 'reject',
    reason: 'Resource evidence needs another review.',
    request,
    resolvedAt: '2026-07-17T10:05:00.000Z',
    resolvedBy: 'local-training-operator',
  });

  assert.equal(permission.status, 'approved');
  assert.equal(permission.localExecutionAuthorized, true);
  assert.equal(permission.externalSubmissionAuthorized, false);
  assert.equal(permission.rolloutAuthorized, false);
  assert.equal(permission.productionReadyClaim, false);
  assert.equal(permission.reasonHash, sha256('Reviewed bounded local execution evidence.'));
  assert.match(permission.permissionHash, /^[a-f0-9]{64}$/);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.localExecutionAuthorized, false);
  assert.throws(
    () => approveRequest(request, { reason: 'password=operator-secret' }),
    /content-free metadata/,
  );
  assert.throws(
    () => approveRequest(request, { resolvedAt: '2026-07-18T00:00:00.000Z' }),
    /expired/,
  );
});

test('approved local training permission rejects tampering and execution binding drift', () => {
  const readinessPackage = buildReadinessPackage();
  const request = buildRequest(readinessPackage);
  const permission = approveRequest(request);

  assert.doesNotThrow(() =>
    assertApprovedLocalTrainingPermission({
      baseModelId: request.baseModelId,
      now: '2026-07-17T10:06:00.000Z',
      permission,
      readinessPackage,
      rollbackOwner: request.rollbackOwner,
      trainerId: request.trainerId,
    }));

  const tampered = structuredClone(permission);
  tampered.evidence.egress.evidenceSha256 = sha256('different-egress-evidence');
  assert.throws(
    () =>
      assertApprovedLocalTrainingPermission({
        baseModelId: request.baseModelId,
        now: '2026-07-17T10:06:00.000Z',
        permission: tampered,
        readinessPackage,
        rollbackOwner: request.rollbackOwner,
        trainerId: request.trainerId,
      }),
    /integrity/,
  );
  assert.throws(
    () =>
      assertApprovedLocalTrainingPermission({
        baseModelId: 'different-base-model',
        now: '2026-07-17T10:06:00.000Z',
        permission,
        readinessPackage,
        rollbackOwner: request.rollbackOwner,
        trainerId: request.trainerId,
      }),
    /execution-binding/,
  );
  assert.throws(
    () =>
      assertApprovedLocalTrainingPermission({
        baseModelId: request.baseModelId,
        now: '2026-07-18T00:00:00.000Z',
        permission,
        readinessPackage,
        rollbackOwner: request.rollbackOwner,
        trainerId: request.trainerId,
      }),
    /time-window/,
  );
});

test('local training permission request rejects incomplete or unsafe evidence metadata', () => {
  const readinessPackage = buildReadinessPackage();
  const missingEgress = {
    ...buildRequest(readinessPackage).evidence,
    egress: {},
  };

  assert.throws(
    () => buildRequest(readinessPackage, { evidence: missingEgress }),
    /egress evidenceSha256/,
  );
  assert.throws(
    () =>
      buildRequest(readinessPackage, {
        approvalOwner: 'api_key=unsafe-owner',
      }),
    /content-free metadata/,
  );
  assert.throws(
    () =>
      buildRequest(readinessPackage, {
        evidence: {
          ...buildRequest(readinessPackage).evidence,
          resource: {
            ...buildRequest(readinessPackage).evidence.resource,
            limits: {
              ...buildRequest(readinessPackage).evidence.resource.limits,
              maxCpuThreads: 0,
            },
          },
        },
      }),
    /maxCpuThreads must be a positive integer/,
  );
});

test('local training permission revocation is content-free and disables future product execution', () => {
  const readinessPackage = buildReadinessPackage();
  const permission = approveRequest(buildRequest(readinessPackage));
  const revocation = revokeLocalTrainingPermission({
    permission,
    reason: 'Resource owner withdrew the approved envelope.',
    revokedAt: '2026-07-17T10:07:00.000Z',
    revokedBy: 'local-training-operator',
  });

  assert.equal(revocation.status, 'revoked');
  assert.equal(revocation.localExecutionAuthorized, false);
  assert.equal(revocation.externalSubmissionAuthorized, false);
  assert.equal(revocation.rolloutAuthorized, false);
  assert.equal(revocation.productionReadyClaim, false);
  assert.equal(revocation.permission.id, permission.id);
  assert.equal(
    revocation.reasonHash,
    sha256('Resource owner withdrew the approved envelope.'),
  );
  assert.match(revocation.revocationHash, /^[a-f0-9]{64}$/);
  assert.throws(
    () =>
      revokeLocalTrainingPermission({
        permission,
        reason: 'password=unsafe-revocation',
        revokedAt: '2026-07-17T10:07:00.000Z',
        revokedBy: 'local-training-operator',
      }),
    /content-free metadata/,
  );
});
