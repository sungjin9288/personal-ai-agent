import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionWorkspace,
} from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ENVELOPE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ADMISSION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-admission/v1';

const BINDING_FIELDS = Object.freeze([
  'assessmentHash',
  'collectionPlanHash',
  'datasetHash',
  'datasetManifestHash',
  'envelopeHash',
  'evaluationManifestHash',
  'executionRequestHash',
  'executionResolutionHash',
  'policyHash',
  'privateCollectionPlanHash',
  'readinessHash',
  'requestHash',
  'resolutionHash',
  'trainSha256',
  'validationSha256',
  'workspaceHash',
]);

const TARGETS = Object.freeze({
  answerQualityCases: {
    countsTowardReviewedExampleMinimum: false,
    minimumAdditionalItems: 8,
  },
  reviewedExamples: {
    minimumAdditionalItems: 16,
    observedTrainGap: 13,
    observedValidationGap: 3,
    requiredNewMissionScopes: 6,
    splitAssignmentAuthorized: false,
    splitMustBeRebuiltAndRemeasured: true,
  },
});

const REQUESTED_ACTIONS = Object.freeze([
  'prepare-private-owner-only-collection-workspace',
  'record-source-lineage-and-usage-basis',
  'record-consent-purpose-and-privacy-check',
  'apply-redaction-and-approved-training-record-gate',
  'record-retention-and-deletion-evidence',
  'collect-bounded-reviewed-example-and-answer-quality-batches',
  'rebuild-readiness-and-reassess',
]);

const LANE_CAPACITY = Object.freeze({
  'answer-quality-cases': 8,
  'reviewed-examples': 16,
});

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Fine-tuning private collection item admission ${fieldName} must be a valid timestamp.`,
    );
  }
  return new Date(timestamp).toISOString();
}

function requireExactKeys(value, keys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...keys].sort())
  ) {
    throw new Error(
      `Fine-tuning private collection item admission ${fieldName} fields are invalid.`,
    );
  }
}

function normalizeWorkspaceReference(workspace) {
  requireExactKeys(workspace, ['id', 'workspaceHash'], 'envelope.workspace');
  if (
    !isSha256(workspace.workspaceHash) ||
    workspace.id !==
      `fine-tuning-private-collection-workspace-${workspace.workspaceHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection item admission envelope workspace is invalid.',
    );
  }
  return {
    id: workspace.id,
    workspaceHash: workspace.workspaceHash,
  };
}

function normalizeEnvelope(envelope, admittedAt, expiresAt) {
  requireExactKeys(
    envelope,
    [
      'lane',
      'privacy',
      'redaction',
      'retention',
      'schemaVersion',
      'source',
      'submittedBy',
      'workspace',
    ],
    'envelope',
  );
  if (envelope.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_ENVELOPE_SCHEMA_VERSION) {
    throw new Error('Fine-tuning private collection item admission envelope schema is invalid.');
  }
  if (!Object.hasOwn(LANE_CAPACITY, envelope.lane)) {
    throw new Error('Fine-tuning private collection item admission envelope lane is invalid.');
  }
  if (envelope.submittedBy !== 'local-operator-role') {
    throw new Error('Fine-tuning private collection item admission envelope submitter is invalid.');
  }
  requireExactKeys(
    envelope.source,
    [
      'lineageSha256',
      'referenceSha256',
      'scopeReferenceSha256',
      'usageBasis',
      'usageBasisEvidenceSha256',
    ],
    'envelope.source',
  );
  if (
    envelope.source.usageBasis !==
      'owner-attested-private-quality-improvement' ||
    [
      envelope.source.referenceSha256,
      envelope.source.lineageSha256,
      envelope.source.scopeReferenceSha256,
      envelope.source.usageBasisEvidenceSha256,
    ].some((value) => !isSha256(value))
  ) {
    throw new Error('Fine-tuning private collection item admission envelope source is invalid.');
  }
  requireExactKeys(
    envelope.privacy,
    ['consentStatus', 'evidenceSha256', 'purpose'],
    'envelope.privacy',
  );
  if (
    !['recorded', 'not-required-owner-authored'].includes(
      envelope.privacy.consentStatus,
    ) ||
    !isSha256(envelope.privacy.evidenceSha256) ||
    envelope.privacy.purpose !==
      'private-answer-quality-improvement-and-readiness-review'
  ) {
    throw new Error('Fine-tuning private collection item admission envelope privacy is invalid.');
  }
  requireExactKeys(
    envelope.redaction,
    ['evidenceSha256', 'policyId'],
    'envelope.redaction',
  );
  if (
    envelope.redaction.policyId !== 'deidentify-before-content-admission-v1' ||
    !isSha256(envelope.redaction.evidenceSha256)
  ) {
    throw new Error('Fine-tuning private collection item admission envelope redaction is invalid.');
  }
  requireExactKeys(
    envelope.retention,
    ['deleteBy', 'evidenceSha256', 'policyId', 'withdrawalReferenceSha256'],
    'envelope.retention',
  );
  const deleteBy = requireTimestamp(envelope.retention.deleteBy, 'envelope.retention.deleteBy');
  if (
    envelope.retention.policyId !== 'delete-by-expiry-or-withdrawal-v1' ||
    !isSha256(envelope.retention.evidenceSha256) ||
    !isSha256(envelope.retention.withdrawalReferenceSha256) ||
    Date.parse(deleteBy) <= Date.parse(admittedAt) ||
    Date.parse(deleteBy) > Date.parse(expiresAt)
  ) {
    throw new Error('Fine-tuning private collection item admission envelope retention is invalid.');
  }
  return {
    lane: envelope.lane,
    privacy: {
      consentStatus: envelope.privacy.consentStatus,
      evidenceSha256: envelope.privacy.evidenceSha256,
      purpose: envelope.privacy.purpose,
    },
    redaction: {
      evidenceSha256: envelope.redaction.evidenceSha256,
      policyId: envelope.redaction.policyId,
    },
    retention: {
      deleteBy,
      evidenceSha256: envelope.retention.evidenceSha256,
      policyId: envelope.retention.policyId,
      withdrawalReferenceSha256: envelope.retention.withdrawalReferenceSha256,
    },
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ENVELOPE_SCHEMA_VERSION,
    source: {
      lineageSha256: envelope.source.lineageSha256,
      referenceSha256: envelope.source.referenceSha256,
      scopeReferenceSha256: envelope.source.scopeReferenceSha256,
      usageBasis: envelope.source.usageBasis,
      usageBasisEvidenceSha256: envelope.source.usageBasisEvidenceSha256,
    },
    submittedBy: 'local-operator-role',
    workspace: normalizeWorkspaceReference(envelope.workspace),
  };
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error('Fine-tuning private collection item admission bindings are invalid.');
  }
  return Object.fromEntries(BINDING_FIELDS.map((field) => [field, bindings[field]]));
}

function normalizeTargets(targets) {
  if (JSON.stringify(targets) !== JSON.stringify(TARGETS)) {
    throw new Error('Fine-tuning private collection item admission targets are invalid.');
  }
  return structuredClone(TARGETS);
}

function buildBindings(workspace, envelopeHash) {
  return {
    ...workspace.bindings,
    envelopeHash,
    workspaceHash: workspace.workspaceHash,
  };
}

function assembleContent({ admittedAt, bindings, envelope, expiresAt, targets, workspace }) {
  return {
    admittedAt,
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    approvedTrainingRecordCreated: false,
    answerQualityCaseCollectionAuthorized: true,
    answerQualityCaseCreated: false,
    bindings,
    candidateTrainingReviewAllowed: false,
    collectionExecutionAuthorized: true,
    collectionItemCount: 0,
    collectionEnvelopeCount: 1,
    collectionItemEnvelopeAdmitted: true,
    collectionMetadataRecorded: true,
    collectionStarted: false,
    collectionContentStored: false,
    consentIndependentlyVerified: false,
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    deidentificationIndependentlyVerified: false,
    deletionExecuted: false,
    envelope,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    operatorAttestationBound: true,
    operatorAttestationRecorded: true,
    privateCollectionWorkspaceCreationAuthorized: true,
    privateCollectionWorkspacePrepared: true,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    retentionDeadlineRecorded: true,
    retentionPolicyIndependentlyVerified: false,
    requestedActions: [...REQUESTED_ACTIONS],
    reviewedExampleCollectionAuthorized: true,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ADMISSION_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: 'private-collection-item-envelope-admitted-content-not-collected',
    syntheticTrainingRecordsCreated: false,
    targets,
    trainingAuthorized: false,
    usageBasisIndependentlyVerified: false,
    withdrawalExecuted: false,
    withdrawalReferenceRecorded: true,
    workspace,
    workspaceContainsCollectionData: false,
    workspaceMutationPerformed: false,
  };
}

function buildContent({
  admittedAt,
  assessment,
  collectionPlan,
  envelope,
  executionRequest,
  executionResolution,
  intakeRequest,
  intakeResolution,
  privateCollectionPlan,
  workspace,
}) {
  const normalizedAdmittedAt = requireTimestamp(admittedAt, 'admittedAt');
  assertFineTuningPrivateCollectionWorkspace(workspace, {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    now: normalizedAdmittedAt,
    privateCollectionPlan,
  });
  const expiresAt = requireTimestamp(workspace.expiresAt, 'expiresAt');
  if (Date.parse(normalizedAdmittedAt) >= Date.parse(expiresAt)) {
    throw new Error('Fine-tuning private collection item admission approval expired.');
  }
  const normalizedEnvelope = normalizeEnvelope(
    envelope,
    normalizedAdmittedAt,
    expiresAt,
  );
  if (
    normalizedEnvelope.workspace.id !== workspace.id ||
    normalizedEnvelope.workspace.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission must bind the exact workspace.');
  }
  const envelopeHash = hashRecord(normalizedEnvelope);
  return assembleContent({
    admittedAt: normalizedAdmittedAt,
    bindings: normalizeBindings(buildBindings(workspace, envelopeHash)),
    envelope: normalizedEnvelope,
    expiresAt,
    targets: normalizeTargets(workspace.targets),
    workspace: normalizeWorkspaceReference({
      id: workspace.id,
      workspaceHash: workspace.workspaceHash,
    }),
  });
}

function rebuildStoredContent(content) {
  const admittedAt = requireTimestamp(content?.admittedAt, 'admittedAt');
  const expiresAt = requireTimestamp(content?.expiresAt, 'expiresAt');
  if (Date.parse(admittedAt) >= Date.parse(expiresAt)) {
    throw new Error('Fine-tuning private collection item admission must be admitted before expiry.');
  }
  const envelope = normalizeEnvelope(content?.envelope, admittedAt, expiresAt);
  const bindings = normalizeBindings(content?.bindings);
  const workspace = normalizeWorkspaceReference(content?.workspace);
  if (
    bindings.workspaceHash !== workspace.workspaceHash ||
    bindings.envelopeHash !== hashRecord(envelope) ||
    envelope.workspace.id !== workspace.id ||
    envelope.workspace.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission references are inconsistent.');
  }
  return assembleContent({
    admittedAt,
    bindings,
    envelope,
    expiresAt,
    targets: normalizeTargets(content?.targets),
    workspace,
  });
}

export function buildFineTuningPrivateCollectionItemAdmission(input = {}) {
  const content = buildContent(input);
  const admissionHash = hashRecord(content);
  return {
    ...content,
    admissionHash,
    id: `fine-tuning-private-collection-item-admission-${admissionHash}`,
  };
}

export function assertFineTuningPrivateCollectionItemAdmissionRecord(admission) {
  const { admissionHash, id, ...content } = admission || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    admissionHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-admission-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item admission integrity failed.');
  }
  return admission;
}

export function assertFineTuningPrivateCollectionItemAdmission(admission, sources = {}) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  const { workspace } = sources;
  if (
    !workspace ||
    admission.workspace?.id !== workspace.id ||
    admission.workspace?.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item admission must bind the exact workspace.');
  }
  const expected = buildContent({
    ...sources,
    admittedAt: admission.admittedAt,
    envelope: admission.envelope,
  });
  const expectedHash = hashRecord(expected);
  if (JSON.stringify(admission) !== JSON.stringify({
    ...expected,
    admissionHash: expectedHash,
    id: `fine-tuning-private-collection-item-admission-${expectedHash}`,
  })) {
    throw new Error('Fine-tuning private collection item admission does not match the current F1 chain.');
  }
  if (sources.now !== undefined) {
    const now = requireTimestamp(sources.now, 'now');
    if (Date.parse(now) < Date.parse(admission.admittedAt)) {
      throw new Error('Fine-tuning private collection item admission is not active yet.');
    }
    if (Date.parse(now) >= Date.parse(admission.expiresAt)) {
      throw new Error('Fine-tuning private collection item admission approval expired.');
    }
    if (Date.parse(now) >= Date.parse(admission.envelope.retention.deleteBy)) {
      throw new Error('Fine-tuning private collection item admission retention expired.');
    }
    assertFineTuningPrivateCollectionWorkspace(workspace, {
      ...sources,
      now,
    });
  }
  return admission;
}

export function getFineTuningPrivateCollectionLaneCapacity(lane) {
  if (!Object.hasOwn(LANE_CAPACITY, lane)) {
    throw new Error('Fine-tuning private collection item admission envelope lane is invalid.');
  }
  return LANE_CAPACITY[lane];
}
