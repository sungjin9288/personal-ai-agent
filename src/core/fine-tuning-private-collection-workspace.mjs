import { createHash } from 'node:crypto';

import {
  assertApprovedFineTuningPrivateCollectionExecutionResolution,
} from './fine-tuning-private-collection-execution-resolution.mjs';
import {
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS,
} from './fine-tuning-private-collection-execution-request.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_WORKSPACE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-workspace/v1';

const BINDING_FIELDS = Object.freeze([
  'assessmentHash',
  'collectionPlanHash',
  'datasetHash',
  'datasetManifestHash',
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

const LANES = Object.freeze([
  {
    directory: 'reviewed-examples',
    id: 'reviewed-examples',
    itemCount: 0,
  },
  {
    directory: 'answer-quality-cases',
    id: 'answer-quality-cases',
    itemCount: 0,
  },
]);

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
      `Fine-tuning private collection workspace ${fieldName} must be a valid timestamp.`,
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
      `Fine-tuning private collection workspace ${fieldName} fields are invalid.`,
    );
  }
}

function buildBindings(executionResolution) {
  return {
    ...executionResolution.bindings,
    executionResolutionHash: executionResolution.resolutionHash,
  };
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error('Fine-tuning private collection workspace bindings are invalid.');
  }
  return Object.fromEntries(
    BINDING_FIELDS.map((field) => [field, bindings[field]]),
  );
}

function normalizeExecutionResolutionReference(reference) {
  requireExactKeys(reference, ['id', 'resolutionHash'], 'executionResolution');
  if (
    !isSha256(reference.resolutionHash) ||
    reference.id !==
      `fine-tuning-private-collection-execution-resolution-${reference.resolutionHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection workspace execution resolution binding is invalid.',
    );
  }
  return {
    id: reference.id,
    resolutionHash: reference.resolutionHash,
  };
}

function normalizeExecutionRequestReference(reference) {
  requireExactKeys(reference, ['id', 'requestHash'], 'executionRequest');
  if (
    !isSha256(reference.requestHash) ||
    reference.id !==
      `fine-tuning-private-collection-execution-request-${reference.requestHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection workspace execution request binding is invalid.',
    );
  }
  return {
    id: reference.id,
    requestHash: reference.requestHash,
  };
}

function normalizeActions(actions) {
  const expected = [...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS];
  if (JSON.stringify(actions) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private collection workspace actions are invalid.');
  }
  return expected;
}

function normalizeTargets(targets) {
  if (JSON.stringify(targets) !== JSON.stringify(TARGETS)) {
    throw new Error('Fine-tuning private collection workspace targets are invalid.');
  }
  return structuredClone(TARGETS);
}

function normalizeLanes(lanes) {
  if (JSON.stringify(lanes) !== JSON.stringify(LANES)) {
    throw new Error('Fine-tuning private collection workspace lanes are invalid.');
  }
  return structuredClone(LANES);
}

function assembleContent({
  bindings,
  executionRequest,
  executionResolution,
  expiresAt,
  lanes,
  preparedAt,
  requestedActions,
  targets,
}) {
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCollectionAuthorized: true,
    bindings,
    candidateTrainingReviewAllowed: false,
    collectionExecutionApprovalRequired: true,
    collectionExecutionApprovalResolved: true,
    collectionExecutionAuthorized: true,
    collectionItemCount: 0,
    collectionStarted: false,
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    executionRequest,
    executionResolution,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    lanes,
    operatorAttestationBound: true,
    operatorAttestationRecorded: true,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    preparedAt,
    privateCollectionPlanAllowed: true,
    privateCollectionWorkspaceCreationAuthorized: true,
    privateCollectionWorkspacePrepared: true,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    requestedActions,
    reviewedExampleCollectionAuthorized: true,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_WORKSPACE_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: 'private-collection-workspace-prepared-collection-not-started',
    syntheticTrainingRecordsCreated: false,
    targets,
    trainingAuthorized: false,
    workspaceContainsCollectionData: false,
    workspacePathStored: false,
  };
}

function buildContent({
  assessment,
  collectionPlan,
  executionRequest,
  executionResolution,
  intakeRequest,
  intakeResolution,
  preparedAt,
  privateCollectionPlan,
}) {
  const normalizedPreparedAt = requireTimestamp(preparedAt, 'preparedAt');
  assertApprovedFineTuningPrivateCollectionExecutionResolution(
    executionResolution,
    {
      assessment,
      collectionPlan,
      executionRequest,
      intakeRequest,
      intakeResolution,
      now: normalizedPreparedAt,
      privateCollectionPlan,
    },
  );
  const expiresAt = requireTimestamp(executionResolution.expiresAt, 'expiresAt');
  if (Date.parse(normalizedPreparedAt) >= Date.parse(expiresAt)) {
    throw new Error('Fine-tuning private collection workspace approval expired.');
  }
  return assembleContent({
    bindings: normalizeBindings(buildBindings(executionResolution)),
    executionRequest: normalizeExecutionRequestReference({
      id: executionRequest.id,
      requestHash: executionRequest.requestHash,
    }),
    executionResolution: normalizeExecutionResolutionReference({
      id: executionResolution.id,
      resolutionHash: executionResolution.resolutionHash,
    }),
    expiresAt,
    preparedAt: normalizedPreparedAt,
    requestedActions: normalizeActions(executionResolution.requestedActions),
    targets: normalizeTargets(executionResolution.targets),
    lanes: normalizeLanes(LANES),
  });
}

function rebuildStoredContent(content) {
  const preparedAt = requireTimestamp(content?.preparedAt, 'preparedAt');
  const expiresAt = requireTimestamp(content?.expiresAt, 'expiresAt');
  if (Date.parse(preparedAt) >= Date.parse(expiresAt)) {
    throw new Error(
      'Fine-tuning private collection workspace must be prepared before expiry.',
    );
  }
  const bindings = normalizeBindings(content?.bindings);
  const executionResolution = normalizeExecutionResolutionReference(
    content?.executionResolution,
  );
  const executionRequest = normalizeExecutionRequestReference(
    content?.executionRequest,
  );
  if (
    bindings.executionResolutionHash !== executionResolution.resolutionHash ||
    bindings.executionRequestHash !== executionRequest.requestHash
  ) {
    throw new Error(
      'Fine-tuning private collection workspace references are inconsistent.',
    );
  }
  return assembleContent({
    bindings,
    executionRequest,
    executionResolution,
    expiresAt,
    lanes: normalizeLanes(content?.lanes),
    preparedAt,
    requestedActions: normalizeActions(content?.requestedActions),
    targets: normalizeTargets(content?.targets),
  });
}

export function buildFineTuningPrivateCollectionWorkspace(input = {}) {
  const content = buildContent(input);
  const workspaceHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-workspace-${workspaceHash}`,
    workspaceHash,
  };
}

export function assertFineTuningPrivateCollectionWorkspaceRecord(workspace) {
  const { id, workspaceHash, ...content } = workspace || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    workspaceHash !== expectedHash ||
    id !== `fine-tuning-private-collection-workspace-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection workspace integrity failed.');
  }
  return workspace;
}

export function assertFineTuningPrivateCollectionWorkspace(
  workspace,
  {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    now,
    privateCollectionPlan,
  } = {},
) {
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  if (
    !executionRequest ||
    workspace.executionRequest?.id !== executionRequest.id ||
    workspace.executionRequest?.requestHash !== executionRequest.requestHash ||
    !executionResolution ||
    workspace.executionResolution?.id !== executionResolution.id ||
    workspace.executionResolution?.resolutionHash !==
      executionResolution.resolutionHash
  ) {
    throw new Error(
      'Fine-tuning private collection workspace must bind the exact execution request and resolution.',
    );
  }
  const expected = buildContent({
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    preparedAt: workspace.preparedAt,
    privateCollectionPlan,
  });
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(workspace) !== JSON.stringify({
      ...expected,
      id: `fine-tuning-private-collection-workspace-${expectedHash}`,
      workspaceHash: expectedHash,
    })
  ) {
    throw new Error(
      'Fine-tuning private collection workspace does not match the current F1 chain.',
    );
  }
  if (now !== undefined) {
    const normalizedNow = requireTimestamp(now, 'now');
    if (Date.parse(normalizedNow) < Date.parse(workspace.preparedAt)) {
      throw new Error('Fine-tuning private collection workspace is not active yet.');
    }
    assertApprovedFineTuningPrivateCollectionExecutionResolution(
      executionResolution,
      {
        assessment,
        collectionPlan,
        executionRequest,
        intakeRequest,
        intakeResolution,
        now: normalizedNow,
        privateCollectionPlan,
      },
    );
  }
  return workspace;
}
