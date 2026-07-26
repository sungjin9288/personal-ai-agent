import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFineTuningDataCollectionPlan } from '../../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionItem } from '../../src/core/fine-tuning-private-collection-item.mjs';
import { buildFineTuningPrivateCollectionItemAdmission } from '../../src/core/fine-tuning-private-collection-item-admission.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../../src/core/fine-tuning-private-collection-plan.mjs';
import { buildFineTuningPrivateCollectionWorkspace } from '../../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../../scripts/local-training-permission-fixture.mjs';

export function withSyntheticLifecycleFixture(callback, {
  deleteByOffset = 30 * 60 * 1000,
  expiresAtOffset = 60 * 60 * 1000,
  lane = 'reviewed-examples',
  sourceHashes,
} = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-lifecycle-'));
  try {
    const fixture = createSyntheticLifecycleFixture(rootDir, {
      deleteByOffset,
      expiresAtOffset,
      lane,
      sourceHashes,
    });
    return callback(fixture);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

export function createSyntheticLifecycleFixture(rootDir, {
  deleteByOffset = 30 * 60 * 1000,
  expiresAtOffset = 60 * 60 * 1000,
  lane = 'reviewed-examples',
  sourceHashes,
} = {}) {
  const now = Date.now();
  const time = (offset) => new Date(now + offset).toISOString();
  const assessment = assessFineTuningDataSufficiency({ readinessPackage: buildDeterministicFineTuningReadinessFixture() });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: time(expiresAtOffset),
    requestedAt: time(-10 * 60 * 1000),
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: time(-9 * 60 * 1000),
    reviews: intakeRequest.requiredReviews.map((review, index) => approval(review, time(-9 * 60 * 1000), String(index + 1))),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt: time(-8 * 60 * 1000),
    request: intakeRequest,
    resolution: intakeResolution,
  });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: time(-7 * 60 * 1000),
    requestedBy: 'local-operator-role',
  });
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: time(-6 * 60 * 1000),
    reviews: executionRequest.requiredReviews.map((review, index) => approval(review, time(-6 * 60 * 1000), ['a', 'b', 'c', 'd', 'e'][index])),
  });
  const sources = { assessment, collectionPlan, executionRequest, executionResolution, intakeRequest, intakeResolution, privateCollectionPlan };
  const workspace = buildFineTuningPrivateCollectionWorkspace({ ...sources, preparedAt: time(-5 * 60 * 1000) });
  const marker = digest('lifecycle', 1);
  const admission = buildFineTuningPrivateCollectionItemAdmission({
    ...sources,
    admittedAt: time(-4 * 60 * 1000),
    workspace,
    envelope: {
      lane,
      privacy: { consentStatus: 'not-required-owner-authored', evidenceSha256: digest(marker, 1), purpose: 'private-answer-quality-improvement-and-readiness-review' },
      redaction: { evidenceSha256: digest(marker, 2), policyId: 'deidentify-before-content-admission-v1' },
      retention: { deleteBy: time(deleteByOffset), evidenceSha256: digest(marker, 3), policyId: 'delete-by-expiry-or-withdrawal-v1', withdrawalReferenceSha256: digest(marker, 4) },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
      source: { lineageSha256: sourceHashes?.lineageSha256 || digest(marker, 5), referenceSha256: sourceHashes?.referenceSha256 || digest(marker, 6), scopeReferenceSha256: sourceHashes?.scopeReferenceSha256 || digest(marker, 7), usageBasis: 'owner-attested-private-quality-improvement', usageBasisEvidenceSha256: digest(marker, 8) },
      submittedBy: 'local-operator-role',
      workspace: { id: workspace.id, workspaceHash: workspace.workspaceHash },
    },
  });
  const storedAt = time(-3 * 60 * 1000);
  const item = buildFineTuningPrivateCollectionItem({
    admission,
    content: {
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1',
      admission: { id: admission.id, admissionHash: admission.admissionHash },
      dataOrigin: 'curated-synthetic',
      example: { instruction: 'Explain synthetic lifecycle case.', response: 'Synthetic lifecycle response.' },
      sanitization: { policyId: 'deidentify-before-content-admission-v1', evidenceSha256: admission.envelope.redaction.evidenceSha256, methodVersion: 'private-sanitized-training-text-v1', reviewedAt: storedAt, reviewerRole: 'quality-reviewer', directIdentifiersRemoved: true, freeTextReviewed: true, secretsScanned: true, reidentificationProhibited: true },
    },
    storedAt,
  });
  const workspaceDirectory = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`);
  for (const directory of [
    path.join(rootDir, 'var'),
    path.join(rootDir, 'var', 'fine-tuning'),
    path.join(rootDir, 'var', 'fine-tuning', 'private-collection-workspaces'),
    workspaceDirectory,
    path.join(workspaceDirectory, 'reviewed-examples'),
    path.join(workspaceDirectory, 'answer-quality-cases'),
  ]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
  const workspaceFilename = path.join(workspaceDirectory, 'workspace.json');
  writeJson(workspaceFilename, workspace);
  const admissionDirectory = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admissions', admission.id);
  fs.mkdirSync(admissionDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(admissionDirectory, 0o700);
  const admissionFilename = path.join(admissionDirectory, 'admission.json');
  writeJson(admissionFilename, admission);
  const itemDirectory = path.join(workspaceDirectory, admission.envelope.lane, `fine-tuning-private-collection-item-${admission.admissionHash}`);
  fs.mkdirSync(itemDirectory, { mode: 0o700 });
  fs.chmodSync(itemDirectory, 0o700);
  const itemFilename = path.join(itemDirectory, 'item.json');
  writeJson(itemFilename, item);
  const inputDirectory = path.join(rootDir, 'var', 'inputs');
  fs.mkdirSync(inputDirectory, { mode: 0o700 });
  fs.chmodSync(inputDirectory, 0o700);
  return {
    admission,
    admissionFilename,
    decisionFilename: path.join(inputDirectory, 'decision.json'),
    item,
    itemFilename,
    rootDir,
    sources,
    workspace,
    workspaceDirectory,
    workspaceFilename,
  };
}

export function writeLifecycleDecision(fixture, action, decidedAt = new Date().toISOString()) {
  const decision = {
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
    action,
    item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
    admission: { id: fixture.admission.id, admissionHash: fixture.admission.admissionHash },
    workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
    withdrawalReferenceSha256: fixture.admission.envelope.retention.withdrawalReferenceSha256,
    evidenceSha256: digest(`decision-${action}`, 1),
    decidedAt,
    decidedBy: 'retention-deletion-owner-role',
    confirmationToken: `${action === 'withdraw' ? 'withdraw' : 'retention-delete'}-private-collection-item:${fixture.item.itemHash}`,
  };
  writeJson(fixture.decisionFilename, decision);
  return decision;
}

export function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
}

function approval(review, decidedAt, marker) {
  return { decision: 'approve', decidedAt, evidenceSha256: marker.repeat(64), id: review.id, ownerRole: review.ownerRole, reason: 'Synthetic attestation.' };
}

function digest(marker, offset) {
  return createHash('sha256').update(`${marker}-${offset}`).digest('hex');
}
