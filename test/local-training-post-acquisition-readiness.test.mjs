import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalTrainingAcquisitionArtifactVerification,
} from '../src/core/local-training-acquisition-artifact-verification.mjs';
import {
  assertLocalTrainingPostAcquisitionAdmission,
  buildLocalTrainingAcquisitionProvenanceReview,
  buildLocalTrainingEgressClosureReview,
  buildLocalTrainingOfflineResourceCanary,
  evaluateLocalTrainingPostAcquisitionReadiness,
} from '../src/core/local-training-post-acquisition-readiness.mjs';
import {
  buildLocalTrainingPermissionRequest,
  resolveLocalTrainingPermissionRequest,
} from '../src/core/local-training-permission.mjs';
import {
  createLocalTrainingAcquisitionArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-acquisition-artifact-verification.mjs';
import {
  buildLocalTrainingReadinessFixture,
} from '../scripts/local-training-permission-fixture.mjs';

const TIMESTAMPS = {
  canary: '2026-07-17T08:35:00.000Z',
  egress: '2026-07-17T08:34:00.000Z',
  now: '2026-07-17T08:40:00.000Z',
  permissionRequested: '2026-07-17T08:36:00.000Z',
  permissionResolved: '2026-07-17T08:37:00.000Z',
  provenance: '2026-07-17T08:33:00.000Z',
};
let readinessFixture;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function reseal(record, { hashField, prefix }) {
  const {
    id: ignoredId,
    [hashField]: ignoredHash,
    ...content
  } = record;
  const recordHash = hashRecord(content);
  return {
    ...content,
    id: `${prefix}-${recordHash}`,
    [hashField]: recordHash,
  };
}

async function buildFixture(t, {
  mode = 'fixture-simulated',
  permissionEvidence = {},
  permissionLimits = {},
} = {}) {
  const fixture =
    await createLocalTrainingAcquisitionArtifactVerificationFixture({
      mode,
    });
  t.after(fixture.cleanup);
  readinessFixture ||= buildLocalTrainingReadinessFixture();
  const readinessPackage = structuredClone(readinessFixture);
  const artifactBytes =
    fixture.verification.artifacts.sourceModel.totalBytes +
    fixture.verification.artifacts.trainerPackage.totalBytes;
  const provenanceReview =
    buildLocalTrainingAcquisitionProvenanceReview({
      evidenceSha256: sha256('provenance-review'),
      mode,
      owner: fixture.approval.owners.licenseOwner,
      reviewedAt: TIMESTAMPS.provenance,
      verification: fixture.verification,
    });
  const egressReview = buildLocalTrainingEgressClosureReview({
    evidenceSha256: sha256('egress-closure-review'),
    mode,
    owner: fixture.approval.owners.egressOwner,
    reviewedAt: TIMESTAMPS.egress,
    run: fixture.run,
    verification: fixture.verification,
  });
  const resourceCanary = buildLocalTrainingOfflineResourceCanary({
    evidenceSha256: sha256('offline-resource-canary'),
    mode,
    observedAt: TIMESTAMPS.canary,
    observedDiskBytes: artifactBytes,
    observedRuntimeMs: 1_000,
    owner: fixture.approval.owners.resourceOwner,
    verification: fixture.verification,
  });
  const permissionRequest = buildLocalTrainingPermissionRequest({
    approvalOwner: 'fixture-training-owner',
    baseModelId: fixture.approval.toolchainDecision.sourceModel.id,
    evidence: {
      egress: {
        evidenceSha256:
          permissionEvidence.egress ||
          egressReview.evidenceSha256,
        owner: fixture.approval.owners.egressOwner,
      },
      license: {
        evidenceSha256:
          permissionEvidence.license ||
          provenanceReview.evidenceSha256,
        owner: fixture.approval.owners.licenseOwner,
      },
      resource: {
        evidenceSha256:
          permissionEvidence.resource ||
          resourceCanary.evidenceSha256,
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes:
            permissionLimits.maxDiskBytes ??
            fixture.approval.resourceEnvelope.maxDiskBytes,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs:
            permissionLimits.maxRuntimeMs ??
            fixture.approval.resourceEnvelope.maxRuntimeMs,
        },
        owner: fixture.approval.owners.resourceOwner,
      },
    },
    expiresAt: '2026-07-17T09:30:00.000Z',
    readinessPackage,
    requestedAt: TIMESTAMPS.permissionRequested,
    rollbackOwner: fixture.approval.owners.rollbackOwner,
    trainerId: fixture.approval.toolchainDecision.trainer.id,
  });
  const permission = resolveLocalTrainingPermissionRequest({
    decision: 'approve',
    reason: 'Approve post-acquisition local training request.',
    request: permissionRequest,
    resolvedAt: TIMESTAMPS.permissionResolved,
    resolvedBy: permissionRequest.approvalOwner,
  });
  return {
    ...fixture,
    egressReview,
    mode,
    permission,
    provenanceReview,
    readinessPackage,
    resourceCanary,
  };
}

function evaluate(fixture, overrides = {}) {
  return evaluateLocalTrainingPostAcquisitionReadiness({
    approval: fixture.approval,
    egressReview: fixture.egressReview,
    mode: fixture.mode,
    now: TIMESTAMPS.now,
    permission: fixture.permission,
    permissionRevocation: null,
    provenanceReview: fixture.provenanceReview,
    readinessPackage: fixture.readinessPackage,
    resourceCanary: fixture.resourceCanary,
    run: fixture.run,
    toolchainDecision: fixture.toolchainDecision,
    verification: fixture.verification,
    ...overrides,
  });
}

test('fixture validates the readiness contract without closing actual gates', async (t) => {
  const fixture = await buildFixture(t);
  const readiness = evaluate(fixture);

  assert.equal(
    readiness.status,
    'fixture-readiness-validated-no-acquisition',
  );
  assert.equal(readiness.readyForExplicitTrainingRequest, false);
  assert.equal(readiness.actualArtifactSetsObserved, false);
  assert.equal(
    readiness.actualAcquisitionProvenanceReviewed,
    false,
  );
  assert.equal(readiness.actualEgressClosureReviewed, false);
  assert.equal(
    readiness.actualOfflineResourceCanaryExecuted,
    false,
  );
  assert.equal(
    readiness.actualPostInstallProductPermissionApproved,
    false,
  );
  assert.equal(readiness.actualModelTrainingExecuted, false);
  assert.equal(readiness.externalProviderCalls, 'none');
  assert.equal(readiness.trainingAuthorized, false);
  assert.equal(readiness.rolloutAuthorized, false);
  assert.equal(readiness.productionReadyClaim, false);
  assert.equal(readiness.remainingGates.length, 4);
  assert.throws(
    () => assertLocalTrainingPostAcquisitionAdmission({
      now: TIMESTAMPS.now,
      permission: fixture.permission,
      permissionRevocation: null,
      readiness,
      readinessPackage: fixture.readinessPackage,
    }),
    /claim-boundary/,
  );
});

test('recorded evidence becomes ready only for an explicit training request', async (t) => {
  const fixture = await buildFixture(t, {
    mode: 'recorded-local-acquisition',
  });
  const readiness = evaluate(fixture);

  assert.equal(
    readiness.status,
    'ready-for-explicit-training-request',
  );
  assert.equal(readiness.readyForExplicitTrainingRequest, true);
  assert.equal(readiness.actualArtifactSetsObserved, true);
  assert.equal(
    readiness.actualAcquisitionProvenanceReviewed,
    true,
  );
  assert.equal(readiness.actualEgressClosureReviewed, true);
  assert.equal(
    readiness.actualOfflineResourceCanaryExecuted,
    true,
  );
  assert.equal(
    readiness.actualPostInstallProductPermissionApproved,
    true,
  );
  assert.deepEqual(readiness.remainingGates, []);
  assert.equal(readiness.trainingAuthorized, false);
  assert.equal(readiness.actualModelTrainingExecuted, false);
  assert.equal(
    readiness.externalProviderCalls,
    'not-observed-by-readiness',
  );
  assert.equal(
    readiness.productPermission.permissionHash,
    fixture.permission.permissionHash,
  );
  assert.equal(
    readiness.trainingTarget.readinessHash,
    fixture.readinessPackage.readinessHash,
  );
  assert.equal(
    assertLocalTrainingPostAcquisitionAdmission({
      now: TIMESTAMPS.now,
      permission: fixture.permission,
      permissionRevocation: null,
      readiness,
      readinessPackage: fixture.readinessPackage,
    }),
    readiness,
  );
});

test('recorded admission revalidates current permission, revocation, and F1 target binding', async (t) => {
  const fixture = await buildFixture(t, {
    mode: 'recorded-local-acquisition',
  });
  const readiness = evaluate(fixture);
  const changedTarget = reseal({
    ...readiness,
    trainingTarget: {
      ...readiness.trainingTarget,
      datasetHash: sha256('different-dataset'),
    },
  }, {
    hashField: 'readinessHash',
    prefix: 'local-training-post-acquisition-readiness',
  });

  assert.throws(
    () => assertLocalTrainingPostAcquisitionAdmission({
      now: TIMESTAMPS.now,
      permission: fixture.permission,
      permissionRevocation: null,
      readiness: changedTarget,
      readinessPackage: fixture.readinessPackage,
    }),
    /training-target/,
  );
  assert.throws(
    () => assertLocalTrainingPostAcquisitionAdmission({
      now: TIMESTAMPS.now,
      permission: fixture.permission,
      permissionRevocation: {
        status: 'revoked',
      },
      readiness,
      readinessPackage: fixture.readinessPackage,
    }),
    /product-permission/,
  );
  assert.throws(
    () => assertLocalTrainingPostAcquisitionAdmission({
      now: TIMESTAMPS.now,
      permission: {
        ...fixture.permission,
        id: 'local-training-permission-stale',
      },
      permissionRevocation: null,
      readiness,
      readinessPackage: fixture.readinessPackage,
    }),
    /product-permission/,
  );
});

test('artifact verification integrity and acquisition binding fail closed', async (t) => {
  const fixture = await buildFixture(t);
  const tampered = structuredClone(fixture.verification);
  tampered.artifacts.sourceModel.totalBytes += 1;
  assert.throws(
    () => assertLocalTrainingAcquisitionArtifactVerification(
      tampered,
    ),
    /integrity/,
  );
  assert.throws(
    () => evaluate(fixture, {
      verification: {
        ...fixture.verification,
        approval: {
          ...fixture.verification.approval,
          id: 'local-training-acquisition-approval-wrong',
        },
      },
    }),
    /integrity/,
  );
});

test('provenance review requires the bound owner, time, and sealed record', async (t) => {
  const fixture = await buildFixture(t);
  const wrongOwner =
    buildLocalTrainingAcquisitionProvenanceReview({
      evidenceSha256: fixture.provenanceReview.evidenceSha256,
      mode: fixture.mode,
      owner: 'different-license-owner',
      reviewedAt: TIMESTAMPS.provenance,
      verification: fixture.verification,
    });
  assert.throws(
    () => evaluate(fixture, { provenanceReview: wrongOwner }),
    /evidence failed: binding/,
  );

  const beforeVerification =
    buildLocalTrainingAcquisitionProvenanceReview({
      evidenceSha256: fixture.provenanceReview.evidenceSha256,
      mode: fixture.mode,
      owner: fixture.approval.owners.licenseOwner,
      reviewedAt: '2026-07-17T08:31:00.000Z',
      verification: fixture.verification,
    });
  assert.throws(
    () => evaluate(fixture, {
      provenanceReview: beforeVerification,
    }),
    /evidence failed: binding/,
  );

  assert.throws(
    () => evaluate(fixture, {
      provenanceReview: {
        ...fixture.provenanceReview,
        rawLicense: 'not-allowed',
      },
    }),
    /evidence failed: integrity/,
  );
});

test('egress review stays bound to the run and closed network policy', async (t) => {
  const fixture = await buildFixture(t);
  const changedPolicy = reseal({
    ...fixture.egressReview,
    networkPolicy: 'network-open',
  }, {
    hashField: 'reviewHash',
    prefix: 'local-training-egress-closure-review',
  });
  assert.throws(
    () => evaluate(fixture, { egressReview: changedPolicy }),
    /egress-closure/,
  );

  const wrongRun = reseal({
    ...fixture.egressReview,
    run: {
      ...fixture.egressReview.run,
      id: 'local-training-acquisition-run-wrong',
    },
  }, {
    hashField: 'reviewHash',
    prefix: 'local-training-egress-closure-review',
  });
  assert.throws(
    () => evaluate(fixture, { egressReview: wrongRun }),
    /egress-closure/,
  );
});

test('offline canary enforces artifact bytes, runtime, and no external calls', async (t) => {
  const fixture = await buildFixture(t);
  for (const changed of [
    {
      observedDiskBytes:
        fixture.resourceCanary.observedDiskBytes + 1,
    },
    {
      observedRuntimeMs:
        fixture.approval.resourceEnvelope.maxRuntimeMs + 1,
    },
    {
      externalProviderCalls: 'observed',
    },
  ]) {
    const resourceCanary = reseal({
      ...fixture.resourceCanary,
      ...changed,
    }, {
      hashField: 'canaryHash',
      prefix: 'local-training-offline-resource-canary',
    });
    assert.throws(
      () => evaluate(fixture, { resourceCanary }),
      /resource-canary/,
    );
  }
});

test('product permission must follow reviews and bind their evidence hashes', async (t) => {
  const wrongEvidenceFixture = await buildFixture(t, {
    permissionEvidence: {
      license: sha256('different-license-review'),
    },
  });
  assert.throws(
    () => evaluate(wrongEvidenceFixture),
    /product-permission/,
  );

  const wrongLimitFixture = await buildFixture(t, {
    permissionLimits: {
      maxDiskBytes: 1,
    },
  });
  assert.throws(
    () => evaluate(wrongLimitFixture),
    /product-permission/,
  );

  const fixture = await buildFixture(t);
  assert.throws(
    () => evaluate(fixture, {
      permissionRevocation: {
        status: 'revoked',
      },
    }),
    /product-permission/,
  );
  assert.throws(
    () => evaluate(fixture, {
      now: '2026-07-17T09:30:00.000Z',
    }),
    /time-window/,
  );
});

test('content-bearing evidence metadata and unsupported modes are rejected', async (t) => {
  const fixture = await buildFixture(t);
  assert.throws(
    () => buildLocalTrainingAcquisitionProvenanceReview({
      evidenceSha256: fixture.provenanceReview.evidenceSha256,
      mode: fixture.mode,
      owner: 'customer@example.com',
      reviewedAt: TIMESTAMPS.provenance,
      verification: fixture.verification,
    }),
    /content-free metadata/,
  );
  assert.throws(
    () => evaluate(fixture, { mode: 'live-auto-training' }),
    /Unsupported/,
  );
});
