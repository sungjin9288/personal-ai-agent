import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalTrainingEnvironmentPreflight,
  buildLocalTrainingEnvironmentPreflight,
} from '../src/core/local-training-environment-preflight.mjs';
import {
  buildLocalTrainingPermissionRequest,
  resolveLocalTrainingPermissionRequest,
} from '../src/core/local-training-permission.mjs';
import { buildLocalTrainingReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const readinessPackage = buildLocalTrainingReadinessFixture();

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildSnapshot(overrides = {}) {
  return {
    baseModel: {
      artifactDigest: sha256('model-artifact'),
      artifactFormat: 'gguf',
      artifactHashVerified: true,
      artifactSizeBytes: 1_900_000_000,
      id: 'qwen2.5:3b',
      installed: true,
      license: {
        hashVerified: true,
        textHash: sha256('license'),
        title: 'Fixture Research License',
      },
      manifestHash: sha256('manifest'),
      source: 'ollama-local-cache',
      trainableSourceVerified: false,
    },
    system: {
      architecture: 'arm64',
      availableDiskBytes: 400_000_000_000,
      platform: 'darwin',
      platformVersion: '25.5.0',
      totalMemoryBytes: 24_000_000_000,
    },
    trainer: {
      candidates: [
        {
          available: false,
          command: 'llama-finetune',
          id: 'llama-cpp-finetune',
        },
        {
          available: false,
          command: 'mlx_lm.lora',
          id: 'mlx-lm-lora',
        },
      ],
      selectedCandidateId: null,
    },
    ...overrides,
  };
}

function buildPermission() {
  const request = buildLocalTrainingPermissionRequest({
    approvalOwner: 'local-training-owner',
    baseModelId: 'qwen2.5:3b',
    evidence: {
      egress: {
        evidenceSha256: sha256('egress-evidence'),
        owner: 'security-owner',
      },
      license: {
        evidenceSha256: sha256('license-evidence'),
        owner: 'license-owner',
      },
      resource: {
        evidenceSha256: sha256('resource-evidence'),
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes: 20_000_000_000,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs: 3_600_000,
        },
        owner: 'resource-owner',
      },
    },
    expiresAt: '2026-12-17T00:00:00.000Z',
    readinessPackage,
    requestedAt: '2026-07-17T06:00:00.000Z',
    rollbackOwner: 'local-training-owner',
    trainerId: 'mlx-lm-lora',
  });
  return resolveLocalTrainingPermissionRequest({
    decision: 'approve',
    reason: 'Fixture evidence was independently reviewed.',
    request,
    resolvedAt: '2026-07-17T06:30:00.000Z',
    resolvedBy: 'local-training-owner',
  });
}

test('installed inference model stops before training when trainer and approvals are absent', () => {
  const preflight = buildLocalTrainingEnvironmentPreflight({
    observedAt: '2026-07-17T07:00:00.000Z',
    readinessPackage,
    snapshot: buildSnapshot(),
  });

  assert.equal(preflight.status, 'blocked-before-local-training');
  assert.equal(preflight.decision, 'stop-before-local-training');
  assert.equal(preflight.readyForExplicitTrainingRequest, false);
  assert.equal(preflight.actualModelTrainingExecuted, false);
  assert.equal(preflight.trainingAuthorized, false);
  assert.deepEqual(preflight.blockerCheckIds, [
    'trainable-source-model-verified',
    'trainer-available',
    'license-review-approved',
    'network-isolation-approved',
    'resource-enforcement-approved',
    'product-permission-approved',
    'rollback-owner-assigned',
  ]);
  assert.doesNotThrow(() =>
    assertLocalTrainingEnvironmentPreflight(preflight));
});

test('complete technical and governance inputs become request-ready without starting training', () => {
  const snapshot = buildSnapshot();
  snapshot.baseModel.artifactFormat = 'safetensors';
  snapshot.baseModel.trainableSourceVerified = true;
  snapshot.trainer.candidates[1].available = true;
  snapshot.trainer.selectedCandidateId = 'mlx-lm-lora';
  const permission = buildPermission();
  const preflight = buildLocalTrainingEnvironmentPreflight({
    governance: {
      licenseReview: {
        approved: true,
        evidenceSha256: permission.evidence.license.evidenceSha256,
        reviewedAt: '2026-07-17T06:40:00.000Z',
        reviewedBy: 'independent-license-reviewer',
      },
      networkIsolationReview: {
        approved: true,
        evidenceSha256: permission.evidence.egress.evidenceSha256,
        reviewedAt: '2026-07-17T06:40:00.000Z',
        reviewedBy: 'independent-security-reviewer',
      },
      resourceEnforcementReview: {
        approved: true,
        evidenceSha256: permission.evidence.resource.evidenceSha256,
        reviewedAt: '2026-07-17T06:40:00.000Z',
        reviewedBy: 'independent-resource-reviewer',
      },
    },
    observedAt: '2026-07-17T07:00:00.000Z',
    permission,
    readinessPackage,
    snapshot,
  });

  assert.equal(
    preflight.status,
    'ready-for-explicit-local-training-request',
  );
  assert.equal(
    preflight.decision,
    'request-explicit-local-training-execution',
  );
  assert.equal(preflight.readyForExplicitTrainingRequest, true);
  assert.equal(preflight.blockerCheckIds.length, 0);
  assert.equal(preflight.actualModelTrainingExecuted, false);
  assert.equal(preflight.trainingAuthorized, false);
  assert.doesNotThrow(() =>
    assertLocalTrainingEnvironmentPreflight(preflight));
});

test('preflight rejects readiness drift and semantic evidence tampering', () => {
  const tamperedReadiness = structuredClone(readinessPackage);
  tamperedReadiness.exports.train.content += 'tampered\n';
  assert.throws(
    () => buildLocalTrainingEnvironmentPreflight({
      observedAt: '2026-07-17T07:00:00.000Z',
      readinessPackage: tamperedReadiness,
      snapshot: buildSnapshot(),
    }),
    /Fine-tuning readiness package failed/,
  );

  const preflight = buildLocalTrainingEnvironmentPreflight({
    observedAt: '2026-07-17T07:00:00.000Z',
    readinessPackage,
    snapshot: buildSnapshot(),
  });
  const tampered = structuredClone(preflight);
  tampered.readyForExplicitTrainingRequest = true;
  tampered.trainingAuthorized = true;
  assert.throws(
    () => assertLocalTrainingEnvironmentPreflight(tampered),
    /integrity failed/,
  );
});

test('selected trainer must be an observed available candidate', () => {
  const snapshot = buildSnapshot();
  snapshot.trainer.selectedCandidateId = 'mlx-lm-lora';

  assert.throws(
    () => buildLocalTrainingEnvironmentPreflight({
      observedAt: '2026-07-17T07:00:00.000Z',
      readinessPackage,
      snapshot,
    }),
    /must be an available candidate/,
  );
});

test('tracked preflight metadata rejects secrets and invalid review timestamps', () => {
  const unsafeSnapshot = buildSnapshot();
  unsafeSnapshot.baseModel.license.title =
    'api_key=local-training-secret';
  assert.throws(
    () => buildLocalTrainingEnvironmentPreflight({
      observedAt: '2026-07-17T07:00:00.000Z',
      readinessPackage,
      snapshot: unsafeSnapshot,
    }),
    /must be content-free metadata/,
  );

  const preflight = buildLocalTrainingEnvironmentPreflight({
    observedAt: '2026-07-17T07:00:00.000Z',
    readinessPackage,
    snapshot: buildSnapshot(),
  });
  const invalidReview = structuredClone(preflight);
  invalidReview.governance.licenseReview.reviewedAt = 'not-a-timestamp';
  assert.throws(
    () => assertLocalTrainingEnvironmentPreflight(invalidReview),
    /must be a valid timestamp/,
  );
});
