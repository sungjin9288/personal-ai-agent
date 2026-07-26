import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertApprovedLocalTrainingAcquisition,
  assertLocalTrainingAcquisitionRequest,
  buildLocalTrainingAcquisitionPlan,
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';

const decision = JSON.parse(
  fs.readFileSync(
    new URL(
      '../evidence/output-artifacts/local-training-toolchain-decision.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

function buildRequest() {
  return buildLocalTrainingAcquisitionRequest({
    decision,
    expiresAt: '2026-07-24T08:00:00.000Z',
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt: '2026-07-17T08:00:00.000Z',
    requestedBy: 'local-operator',
  });
}

function buildOwners() {
  return {
    approvalOwner: 'local-acquisition-owner',
    egressOwner: 'local-security-owner',
    licenseOwner: 'local-license-owner',
    resourceOwner: 'local-resource-owner',
    rollbackOwner: 'local-rollback-owner',
  };
}

test('request binds exact toolchain pins and keeps every authority false', () => {
  const request = buildRequest();

  assert.equal(request.status, 'pending-owner-review');
  assert.equal(request.decision.id, decision.id);
  assert.equal(request.decision.decisionHash, decision.decisionHash);
  assert.equal(request.acquisitionAuthorized, false);
  assert.equal(request.actualDependencyInstallationPerformed, false);
  assert.equal(request.actualModelDownloadPerformed, false);
  assert.equal(request.actualModelTrainingExecuted, false);
  assert.equal(request.trainingAuthorized, false);
  assert.equal(request.rolloutAuthorized, false);

  const tampered = structuredClone(request);
  tampered.proposedResourceEnvelope.maxDiskBytes += 1;
  assert.throws(
    () => assertLocalTrainingAcquisitionRequest(tampered, decision),
    /integrity/,
  );

  const pinTampered = structuredClone(request);
  pinTampered.decision.sourceModel.revision = '0'.repeat(40);
  pinTampered.requestHash = hashRequestContent(pinTampered);
  pinTampered.id =
    `local-training-acquisition-request-${pinTampered.requestHash}`;
  assert.throws(
    () => assertLocalTrainingAcquisitionRequest(pinTampered, decision),
    /current-decision/,
  );
});

test('approved request creates a bounded acquisition plan without running it', () => {
  const request = buildRequest();
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: buildOwners(),
    reason: 'Pinned acquisition scope and proposed limits were reviewed.',
    request,
    resolvedAt: '2026-07-17T09:00:00.000Z',
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision: decision,
  });
  const plan = buildLocalTrainingAcquisitionPlan({
    approval,
    decision,
    now: '2026-07-17T09:30:00.000Z',
  });

  assert.equal(approval.acquisitionAuthorized, true);
  assert.equal(approval.trainingAuthorized, false);
  assert.equal(plan.status, 'approved-acquisition-not-executed');
  assert.equal(plan.steps.length, 7);
  assert.equal(
    plan.steps.every((step) => step.status === 'pending'),
    true,
  );
  assert.equal(plan.actualDependencyInstallationPerformed, false);
  assert.equal(plan.actualModelDownloadPerformed, false);
  assert.equal(plan.actualModelTrainingExecuted, false);
  assert.notEqual(
    approval.resourceEnvelope,
    request.proposedResourceEnvelope,
  );
  assert.notEqual(plan.resourceEnvelope, approval.resourceEnvelope);
  assert.notEqual(plan.toolchainDecision, approval.toolchainDecision);
});

test('approval owner, expiration, and owner completeness fail closed', () => {
  const request = buildRequest();
  assert.throws(
    () => resolveLocalTrainingAcquisitionRequest({
      decision: 'approve',
      owners: buildOwners(),
      reason: 'Owner mismatch.',
      request,
      resolvedAt: '2026-07-17T09:00:00.000Z',
      resolvedBy: 'different-owner',
      toolchainDecision: decision,
    }),
    /approval-owner/,
  );
  assert.throws(
    () => resolveLocalTrainingAcquisitionRequest({
      decision: 'approve',
      owners: {
        ...buildOwners(),
        rollbackOwner: '',
      },
      reason: 'Missing rollback owner.',
      request,
      resolvedAt: '2026-07-17T09:00:00.000Z',
      resolvedBy: 'local-acquisition-owner',
      toolchainDecision: decision,
    }),
    /content-free metadata/,
  );
  assert.throws(
    () => resolveLocalTrainingAcquisitionRequest({
      decision: 'approve',
      owners: buildOwners(),
      reason: 'Expired request.',
      request,
      resolvedAt: '2026-07-24T08:00:00.000Z',
      resolvedBy: 'local-acquisition-owner',
      toolchainDecision: decision,
    }),
    /expired before approval/,
  );
});

test('rejection records a decision without acquisition authority', () => {
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'reject',
    owners: buildOwners(),
    reason: 'Resource envelope needs revision.',
    request: buildRequest(),
    resolvedAt: '2026-07-17T09:00:00.000Z',
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision: decision,
  });

  assert.equal(approval.status, 'rejected');
  assert.equal(approval.acquisitionAuthorized, false);
  assert.throws(
    () => buildLocalTrainingAcquisitionPlan({
      approval,
      decision,
      now: '2026-07-17T09:30:00.000Z',
    }),
    /authority-boundary/,
  );
});

test('approval rejects decision drift, expiry, and semantic tampering', () => {
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: buildOwners(),
    reason: 'Approved fixture.',
    request: buildRequest(),
    resolvedAt: '2026-07-17T09:00:00.000Z',
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision: decision,
  });
  const driftedDecision = structuredClone(decision);
  driftedDecision.decisionHash = '0'.repeat(64);
  assert.throws(
    () => assertApprovedLocalTrainingAcquisition({
      approval,
      decision: driftedDecision,
      now: '2026-07-17T09:30:00.000Z',
    }),
  );
  assert.throws(
    () => assertApprovedLocalTrainingAcquisition({
      approval,
      decision,
      now: approval.expiresAt,
    }),
    /authority-boundary/,
  );

  const tampered = structuredClone(approval);
  tampered.trainingAuthorized = true;
  assert.throws(
    () => assertApprovedLocalTrainingAcquisition({
      approval: tampered,
      decision,
      now: '2026-07-17T09:30:00.000Z',
    }),
    /authority-boundary/,
  );

  const ownerTampered = structuredClone(approval);
  ownerTampered.resolvedBy = 'different-owner';
  ownerTampered.approvalHash = hashApprovalContent(ownerTampered);
  ownerTampered.id =
    `local-training-acquisition-approval-${ownerTampered.approvalHash}`;
  assert.throws(
    () => assertApprovedLocalTrainingAcquisition({
      approval: ownerTampered,
      decision,
      now: '2026-07-17T09:30:00.000Z',
    }),
    /authority-boundary/,
  );
});

function hashApprovalContent(approval) {
  const {
    approvalHash: _approvalHash,
    id: _id,
    ...content
  } = approval;
  return createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
}

function hashRequestContent(request) {
  const {
    id: _id,
    requestHash: _requestHash,
    ...content
  } = request;
  return createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
}
