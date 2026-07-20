import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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
} from './evaluate-local-training-acquisition-artifact-verification.mjs';
import {
  buildLocalTrainingReadinessFixture,
} from './local-training-permission-fixture.mjs';

export const LOCAL_TRAINING_POST_ACQUISITION_READINESS_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-post-acquisition-readiness-evidence/v1';

const MODE = 'fixture-simulated';
const TIMESTAMPS = {
  canary: '2026-07-17T08:35:00.000Z',
  egress: '2026-07-17T08:34:00.000Z',
  now: '2026-07-17T08:40:00.000Z',
  permissionRequested: '2026-07-17T08:36:00.000Z',
  permissionResolved: '2026-07-17T08:37:00.000Z',
  provenance: '2026-07-17T08:33:00.000Z',
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function buildPermission({
  fixture,
  permissionResolved = TIMESTAMPS.permissionResolved,
  permissionRequested = TIMESTAMPS.permissionRequested,
  maxDiskBytes =
    fixture.approval.resourceEnvelope.maxDiskBytes,
  maxRuntimeMs =
    fixture.approval.resourceEnvelope.maxRuntimeMs,
  provenanceEvidenceSha256,
  readinessPackage,
  resourceEvidenceSha256,
  egressEvidenceSha256,
}) {
  const request = buildLocalTrainingPermissionRequest({
    approvalOwner: 'fixture-training-owner',
    baseModelId: fixture.approval.toolchainDecision.sourceModel.id,
    evidence: {
      egress: {
        evidenceSha256: egressEvidenceSha256,
        owner: fixture.approval.owners.egressOwner,
      },
      license: {
        evidenceSha256: provenanceEvidenceSha256,
        owner: fixture.approval.owners.licenseOwner,
      },
      resource: {
        evidenceSha256: resourceEvidenceSha256,
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs,
        },
        owner: fixture.approval.owners.resourceOwner,
      },
    },
    expiresAt: '2026-07-17T09:30:00.000Z',
    readinessPackage,
    requestedAt: permissionRequested,
    rollbackOwner: fixture.approval.owners.rollbackOwner,
    trainerId: fixture.approval.toolchainDecision.trainer.id,
  });
  return resolveLocalTrainingPermissionRequest({
    decision: 'approve',
    reason: 'Validate fixture post-acquisition permission binding.',
    request,
    resolvedAt: permissionResolved,
    resolvedBy: request.approvalOwner,
  });
}

function buildScenario(fixture, mode = MODE) {
  const readinessPackage = buildLocalTrainingReadinessFixture();
  const provenanceReview =
    buildLocalTrainingAcquisitionProvenanceReview({
      evidenceSha256: sha256('fixture-provenance-review'),
      mode,
      owner: fixture.approval.owners.licenseOwner,
      reviewedAt: TIMESTAMPS.provenance,
      verification: fixture.verification,
    });
  const egressReview = buildLocalTrainingEgressClosureReview({
    evidenceSha256: sha256('fixture-egress-closure-review'),
    mode,
    owner: fixture.approval.owners.egressOwner,
    reviewedAt: TIMESTAMPS.egress,
    run: fixture.run,
    verification: fixture.verification,
  });
  const resourceCanary = buildLocalTrainingOfflineResourceCanary({
    evidenceSha256: sha256('fixture-offline-resource-canary'),
    mode,
    observedAt: TIMESTAMPS.canary,
    observedDiskBytes:
      fixture.verification.artifacts.sourceModel.totalBytes +
      fixture.verification.artifacts.trainerPackage.totalBytes,
    observedRuntimeMs: 1_000,
    owner: fixture.approval.owners.resourceOwner,
    verification: fixture.verification,
  });
  const permission = buildPermission({
    egressEvidenceSha256: egressReview.evidenceSha256,
    fixture,
    provenanceEvidenceSha256:
      provenanceReview.evidenceSha256,
    readinessPackage,
    resourceEvidenceSha256: resourceCanary.evidenceSha256,
  });
  return {
    egressReview,
    mode,
    permission,
    provenanceReview,
    readinessPackage,
    resourceCanary,
  };
}

function evaluate(fixture, scenario, overrides = {}) {
  return evaluateLocalTrainingPostAcquisitionReadiness({
    approval: fixture.approval,
    egressReview: scenario.egressReview,
    mode: scenario.mode,
    now: TIMESTAMPS.now,
    permission: scenario.permission,
    permissionRevocation: null,
    provenanceReview: scenario.provenanceReview,
    readinessPackage: scenario.readinessPackage,
    resourceCanary: scenario.resourceCanary,
    run: fixture.run,
    toolchainDecision: fixture.toolchainDecision,
    verification: fixture.verification,
    ...overrides,
  });
}

export async function createLocalTrainingPostAcquisitionReadinessFixture({
  mode = MODE,
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalTrainingAcquisitionArtifactVerificationFixture({
      mode,
      repoDir,
    });
  try {
    const scenario = buildScenario(fixture, mode);
    return {
      ...fixture,
      ...scenario,
      postAcquisitionReadiness: evaluate(fixture, scenario),
    };
  } catch (error) {
    fixture.cleanup();
    throw error;
  }
}

function rejectionMatches(operation, pattern) {
  try {
    operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

function resealReadiness(readiness, changes) {
  const {
    id: ignoredId,
    readinessHash: ignoredHash,
    ...content
  } = readiness;
  const changed = {
    ...content,
    ...changes,
  };
  const readinessHash = hashRecord(changed);
  return {
    ...changed,
    id:
      `local-training-post-acquisition-readiness-${readinessHash}`,
    readinessHash,
  };
}

export async function evaluateLocalTrainingPostAcquisitionReadinessEvidence({
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalTrainingAcquisitionArtifactVerificationFixture({
      repoDir,
    });
  let recordedFixture;
  try {
    const scenario = buildScenario(fixture);
    const readiness = evaluate(fixture, scenario);
    const wrongOwnerReview =
      buildLocalTrainingAcquisitionProvenanceReview({
        evidenceSha256:
          scenario.provenanceReview.evidenceSha256,
        mode: MODE,
        owner: 'different-license-owner',
        reviewedAt: TIMESTAMPS.provenance,
        verification: fixture.verification,
      });
    const oversizedCanary =
      buildLocalTrainingOfflineResourceCanary({
        evidenceSha256:
          scenario.resourceCanary.evidenceSha256,
        mode: MODE,
        observedAt: TIMESTAMPS.canary,
        observedDiskBytes:
          scenario.resourceCanary.observedDiskBytes + 1,
        observedRuntimeMs:
          fixture.approval.resourceEnvelope.maxRuntimeMs + 1,
        owner: fixture.approval.owners.resourceOwner,
        verification: fixture.verification,
      });
    const wrongPermission = buildPermission({
      egressEvidenceSha256:
        scenario.egressReview.evidenceSha256,
      fixture,
      provenanceEvidenceSha256:
        sha256('different-provenance-review'),
      readinessPackage: scenario.readinessPackage,
      resourceEvidenceSha256:
        scenario.resourceCanary.evidenceSha256,
    });
    const earlyPermission = buildPermission({
      egressEvidenceSha256:
        scenario.egressReview.evidenceSha256,
      fixture,
      permissionRequested: '2026-07-17T08:32:10.000Z',
      permissionResolved: '2026-07-17T08:32:20.000Z',
      provenanceEvidenceSha256:
        scenario.provenanceReview.evidenceSha256,
      readinessPackage: scenario.readinessPackage,
      resourceEvidenceSha256:
        scenario.resourceCanary.evidenceSha256,
    });
    const wrongLimitPermission = buildPermission({
      egressEvidenceSha256:
        scenario.egressReview.evidenceSha256,
      fixture,
      maxDiskBytes: 1,
      provenanceEvidenceSha256:
        scenario.provenanceReview.evidenceSha256,
      readinessPackage: scenario.readinessPackage,
      resourceEvidenceSha256:
        scenario.resourceCanary.evidenceSha256,
    });
    const tamperedVerification =
      structuredClone(fixture.verification);
    tamperedVerification.artifacts.sourceModel.totalBytes += 1;
    recordedFixture =
      await createLocalTrainingPostAcquisitionReadinessFixture({
        mode: 'recorded-local-acquisition',
        repoDir,
      });
    const recordedReadiness =
      recordedFixture.postAcquisitionReadiness;
    const changedTarget = resealReadiness(
      recordedReadiness,
      {
        trainingTarget: {
          ...recordedReadiness.trainingTarget,
          datasetHash: sha256('different-dataset'),
        },
      },
    );

    const failureGuards = {
      admissionPermissionRevocationBlocked: rejectionMatches(
        () => assertLocalTrainingPostAcquisitionAdmission({
          now: TIMESTAMPS.now,
          permission: recordedFixture.permission,
          permissionRevocation: {
            status: 'revoked',
          },
          readiness: recordedReadiness,
          readinessPackage: recordedFixture.readinessPackage,
        }),
        /product-permission/,
      ),
      admissionTargetDriftBlocked: rejectionMatches(
        () => assertLocalTrainingPostAcquisitionAdmission({
          now: TIMESTAMPS.now,
          permission: recordedFixture.permission,
          permissionRevocation: null,
          readiness: changedTarget,
          readinessPackage: recordedFixture.readinessPackage,
        }),
        /training-target/,
      ),
      artifactVerificationTamperingBlocked:
        rejectionMatches(
          () => evaluate(fixture, scenario, {
            verification: tamperedVerification,
          }),
          /integrity/,
        ),
      automaticTrainingAuthorizationBlocked:
        readiness.trainingAuthorized === false &&
        readiness.readyForExplicitTrainingRequest === false,
      contentBearingMetadataBlocked: rejectionMatches(
        () => buildLocalTrainingAcquisitionProvenanceReview({
          evidenceSha256:
            scenario.provenanceReview.evidenceSha256,
          mode: MODE,
          owner: 'customer@example.com',
          reviewedAt: TIMESTAMPS.provenance,
          verification: fixture.verification,
        }),
        /content-free metadata/,
      ),
      permissionEvidenceMismatchBlocked:
        rejectionMatches(
          () => evaluate(fixture, scenario, {
            permission: wrongPermission,
          }),
          /product-permission/,
        ),
      permissionOrderingBlocked: rejectionMatches(
        () => evaluate(fixture, scenario, {
          permission: earlyPermission,
        }),
        /product-permission/,
      ),
      permissionResourceEnvelopeMismatchBlocked:
        rejectionMatches(
          () => evaluate(fixture, scenario, {
            permission: wrongLimitPermission,
          }),
          /product-permission/,
        ),
      permissionRevocationBlocked: rejectionMatches(
        () => evaluate(fixture, scenario, {
          permissionRevocation: {
            status: 'revoked',
          },
        }),
        /product-permission/,
      ),
      provenanceOwnerMismatchBlocked:
        rejectionMatches(
          () => evaluate(fixture, scenario, {
            provenanceReview: wrongOwnerReview,
          }),
          /evidence failed: binding/,
        ),
      resourceEnvelopeDriftBlocked: rejectionMatches(
        () => evaluate(fixture, scenario, {
          resourceCanary: oversizedCanary,
        }),
        /resource-canary/,
      ),
      recordedAdmissionBindingValidated:
        assertLocalTrainingPostAcquisitionAdmission({
          now: TIMESTAMPS.now,
          permission: recordedFixture.permission,
          permissionRevocation: null,
          readiness: recordedReadiness,
          readinessPackage: recordedFixture.readinessPackage,
        }) === recordedReadiness,
      unsupportedModeBlocked: rejectionMatches(
        () => evaluate(fixture, scenario, {
          mode: 'automatic-live-training',
        }),
        /Unsupported/,
      ),
    };
    assert.equal(
      Object.values(failureGuards).every(Boolean),
      true,
      'every post-acquisition readiness failure guard must pass',
    );

    const evidence = {
      claimBoundary: {
        actualAcquisitionProvenanceReviewed: false,
        actualArtifactSetsObserved: false,
        actualDependencyInstallationPerformed: false,
        actualEgressClosureReviewed: false,
        actualModelDownloadPerformed: false,
        actualModelTrainingExecuted: false,
        actualOfflineResourceCanaryExecuted: false,
        actualPostInstallProductPermissionApproved: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        postAcquisitionReadinessContractValidated: true,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      failureGuards,
      gates: {
        acquisitionProvenance:
          scenario.provenanceReview.status,
        egressClosure: scenario.egressReview.status,
        offlineResourceCanary: scenario.resourceCanary.status,
        productPermission: 'fixture-contract-validated',
      },
      mode: 'local-training-post-acquisition-readiness',
      readiness: {
        currentPermissionBound:
          readiness.productPermission.id ===
            scenario.permission.id &&
          readiness.productPermission.permissionHash ===
            scenario.permission.permissionHash,
        readyForExplicitTrainingRequest:
          readiness.readyForExplicitTrainingRequest,
        remainingGates: readiness.remainingGates,
        schemaVersion: readiness.schemaVersion,
        status: readiness.status,
        trainingTargetBoundToF1:
          readiness.trainingTarget.readinessHash ===
            scenario.readinessPackage.readinessHash &&
          readiness.trainingTarget.datasetHash ===
            scenario.readinessPackage.dataset.datasetHash &&
          readiness.trainingTarget.exportDigests.train ===
            scenario.readinessPackage.exportDigests.train &&
          readiness.trainingTarget.exportDigests.validation ===
            scenario.readinessPackage.exportDigests.validation,
      },
      schemaVersion:
        LOCAL_TRAINING_POST_ACQUISITION_READINESS_EVIDENCE_SCHEMA_VERSION,
      security: {
        artifactVerificationRevalidated: true,
        contentFreeEvidenceOnly: true,
        currentPermissionStateRequired: true,
        evidenceHashesBoundToProductPermission: true,
        executionAdmissionRevalidation: true,
        ownerBindingsRevalidated: true,
        permissionApprovedAfterGateReviews: true,
        trainingTargetBoundToF1: true,
      },
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id:
        `local-training-post-acquisition-readiness-evidence-${evidenceHash}`,
    };
  } finally {
    recordedFixture?.cleanup();
    fixture.cleanup();
  }
}
