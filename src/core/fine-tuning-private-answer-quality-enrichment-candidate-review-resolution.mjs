import { createHash } from 'node:crypto';

import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from './fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_DECISION_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-decision-input/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_RESOLUTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-resolution/v1';

const TARGET = 'answer-quality-case-q1-review';
const CANDIDATE_BINDING_KEYS = Object.freeze([
  'admissionHash',
  'assessmentHash',
  'collectionPlanHash',
  'contentHash',
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
  'sanitizationHash',
  'trainSha256',
  'validationSha256',
  'workspaceHash',
  'itemHash',
  'projectionRequestHash',
  'withdrawalReferenceSha256',
  'projectionHash',
  'itemReviewResolutionHash',
  'artifactRequestInputHash',
  'artifactRequestHash',
  'artifactPreparationDecisionHash',
  'artifactPreparationResolutionHash',
  'answerQualityCaseEnrichmentInputHash',
]);
const RESOLUTION_BINDING_KEYS = Object.freeze([
  ...CANDIDATE_BINDING_KEYS,
  'candidateHash',
  'candidateReviewDecisionHash',
]);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireExactKeys(value, keys, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())
  ) {
    throw new Error(
      `Fine-tuning private answer quality enrichment candidate review resolution ${label} fields are invalid.`,
    );
  }
}

function requireTimestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Fine-tuning private answer quality enrichment candidate review resolution ${label} timestamp is invalid.`,
    );
  }
  return new Date(parsed).toISOString();
}

function normalizeReference(value, label, prefix, hashField) {
  requireExactKeys(value, ['id', hashField], label);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(
      `Fine-tuning private answer quality enrichment candidate review resolution ${label} is invalid.`,
    );
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function normalizeAdmissionReference(value, label) {
  return normalizeReference(
    value,
    label,
    'fine-tuning-private-collection-item-admission-',
    'admissionHash',
  );
}

function normalizeWorkspaceReference(value, label) {
  return normalizeReference(
    value,
    label,
    'fine-tuning-private-collection-workspace-',
    'workspaceHash',
  );
}

function normalizeItemReference(value, label) {
  return normalizeReference(
    value,
    label,
    'fine-tuning-private-collection-item-',
    'itemHash',
  );
}

function normalizeCandidateReference(value, label) {
  requireExactKeys(value, ['candidateHash', 'id'], label);
  if (
    !isSha256(value.candidateHash) ||
    typeof value.id !== 'string' ||
    !/^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id)
  ) {
    throw new Error(
      `Fine-tuning private answer quality enrichment candidate review resolution ${label} is invalid.`,
    );
  }
  return { candidateHash: value.candidateHash, id: value.id };
}

function normalizeDecisionInput(input) {
  requireExactKeys(
    input,
    [
      'admission',
      'candidate',
      'confirmationToken',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'item',
      'schemaVersion',
      'target',
      'workspace',
    ],
    'decision input',
  );
  const candidate = normalizeCandidateReference(input.candidate, 'decision candidate');
  const item = normalizeItemReference(input.item, 'decision item');
  if (
    input.schemaVersion !==
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_DECISION_INPUT_SCHEMA_VERSION ||
    input.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(input.decision) ||
    input.target !== TARGET ||
    !isSha256(input.evidenceSha256) ||
    candidate.id !== `private-answer-quality-case-${item.itemHash}` ||
    input.confirmationToken !==
      `${input.decision}-private-answer-quality-enrichment-candidate-review:${candidate.candidateHash}`
  ) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution decision input is invalid.',
    );
  }
  return {
    admission: normalizeAdmissionReference(input.admission, 'decision admission'),
    candidate,
    confirmationToken: input.confirmationToken,
    decidedAt: requireTimestamp(input.decidedAt, 'decision decidedAt'),
    decidedByRole: 'quality-reviewer',
    decision: input.decision,
    evidenceSha256: input.evidenceSha256,
    item,
    schemaVersion:
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_DECISION_INPUT_SCHEMA_VERSION,
    target: TARGET,
    workspace: normalizeWorkspaceReference(input.workspace, 'decision workspace'),
  };
}

export function assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput(input) {
  return normalizeDecisionInput(input);
}

function buildDecisionRecord(decision) {
  return {
    confirmationTokenSha256: hashValue(decision.confirmationToken),
    decidedAt: decision.decidedAt,
    decidedByRole: decision.decidedByRole,
    decision: decision.decision,
    evidenceSha256: decision.evidenceSha256,
    schemaVersion: decision.schemaVersion,
    target: decision.target,
  };
}

function sameReference(left, right, hashField) {
  return left?.id === right?.id && left?.[hashField] === right?.[hashField];
}

function assertLiveCandidate({ admission, candidate, item, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);

  const exact =
    item.lane === 'answer-quality-cases' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(admission.workspace, workspace, 'workspaceHash') &&
    sameReference(admission.envelope.workspace, workspace, 'workspaceHash') &&
    sameReference(item.admission, admission, 'admissionHash') &&
    sameReference(item.workspace, workspace, 'workspaceHash') &&
    sameReference(candidate.admission, admission, 'admissionHash') &&
    sameReference(candidate.item, item, 'itemHash') &&
    sameReference(candidate.workspace, workspace, 'workspaceHash') &&
    candidate.id === `private-answer-quality-case-${item.itemHash}` &&
    candidate.sourceObservation.expiresAt === item.expiresAt &&
    candidate.sourceObservation.deleteBy === item.retention.deleteBy &&
    candidate.sourceObservation.itemStoredAt === item.storedAt &&
    candidate.bindings.admissionHash === admission.admissionHash &&
    candidate.bindings.itemHash === item.itemHash &&
    candidate.bindings.workspaceHash === workspace.workspaceHash &&
    candidate.bindings.withdrawalReferenceSha256 ===
      item.retention.withdrawalReferenceSha256 &&
    admission.expiresAt === item.expiresAt &&
    admission.envelope.retention.deleteBy === item.retention.deleteBy &&
    admission.envelope.retention.withdrawalReferenceSha256 ===
      item.retention.withdrawalReferenceSha256 &&
    workspace.expiresAt === item.expiresAt &&
    candidate.answerQualityCaseEnrichmentCandidateCreated === true &&
    candidate.q1ContractSatisfied === false &&
    candidate.reviewerReviewRequired === true &&
    candidate.reviewerVerdict === 'not-reviewed' &&
    candidate.precheck.status === 'passed' &&
    candidate.status ===
      'private-answer-quality-case-enrichment-candidate-awaiting-review';

  if (!exact) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution must bind one exact live F1.16 candidate.',
    );
  }
}

function buildContent({ admission, candidate, decision, item, resolvedAt, workspace }) {
  assertLiveCandidate({ admission, candidate, item, workspace });
  const normalizedDecision = normalizeDecisionInput(decision);
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  const storedDecision = buildDecisionRecord(normalizedDecision);
  const decisionHash = hashRecord(storedDecision);

  const exact =
    sameReference(normalizedDecision.admission, admission, 'admissionHash') &&
    sameReference(normalizedDecision.candidate, candidate, 'candidateHash') &&
    sameReference(normalizedDecision.item, item, 'itemHash') &&
    sameReference(normalizedDecision.workspace, workspace, 'workspaceHash') &&
    Date.parse(item.storedAt) <= Date.parse(candidate.observedAt) &&
    Date.parse(normalizedDecision.decidedAt) >= Date.parse(candidate.observedAt) &&
    Date.parse(normalizedResolvedAt) >= Date.parse(normalizedDecision.decidedAt) &&
    Date.parse(normalizedResolvedAt) < Date.parse(item.expiresAt) &&
    Date.parse(normalizedResolvedAt) < Date.parse(item.retention.deleteBy);
  if (!exact) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution must bind one exact live F1.16 candidate.',
    );
  }

  const bindings = {
    ...candidate.bindings,
    candidateHash: candidate.candidateHash,
    candidateReviewDecisionHash: decisionHash,
  };
  requireExactKeys(bindings, RESOLUTION_BINDING_KEYS, 'resolution bindings');
  if (Object.values(bindings).some((value) => !isSha256(value))) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution bindings are invalid.',
    );
  }

  const approved = normalizedDecision.decision === 'approve';
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: normalizedDecision.admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentCandidateCreated: true,
    answerQualityCaseEvaluationExecuted: false,
    answerQualityCaseMaterializationAllowed: approved,
    bindings,
    candidate: normalizedDecision.candidate,
    candidateReviewCreated: true,
    candidateReviewResolved: true,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    decision: storedDecision.decision,
    decisionHash,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: normalizedDecision.item,
    itemPathStored: false,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    payloadStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: false,
    q1ReviewerGateSatisfied: approved,
    resolvedAt: normalizedResolvedAt,
    reviewerReviewRequired: false,
    reviewerVerdict: approved ? 'pass' : 'fail',
    schemaVersion:
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_RESOLUTION_SCHEMA_VERSION,
    sourceObservation: {
      candidateObservedAt: candidate.observedAt,
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      itemStoredAt: item.storedAt,
    },
    status: approved
      ? 'approved-for-answer-quality-case-materialization'
      : 'rejected-by-answer-quality-review',
    target: TARGET,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: normalizedDecision.workspace,
    workspaceMutationPerformed: false,
  };
}

function rebuildDecisionRecord(value) {
  requireExactKeys(
    value,
    [
      'confirmationTokenSha256',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'schemaVersion',
      'target',
    ],
    'stored decision',
  );
  if (
    !isSha256(value.confirmationTokenSha256) ||
    !isSha256(value.evidenceSha256) ||
    value.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(value.decision) ||
    value.schemaVersion !==
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_DECISION_INPUT_SCHEMA_VERSION ||
    value.target !== TARGET
  ) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution stored decision is invalid.',
    );
  }
  return {
    ...value,
    decidedAt: requireTimestamp(value.decidedAt, 'stored decision decidedAt'),
  };
}

function rebuildContent(content) {
  requireExactKeys(
    content,
    [
      'actualModelTrainingExecuted',
      'actualUserDataCollected',
      'admission',
      'answerQualityCaseCreated',
      'answerQualityCaseEnrichmentCandidateCreated',
      'answerQualityCaseEvaluationExecuted',
      'answerQualityCaseMaterializationAllowed',
      'bindings',
      'candidate',
      'candidateReviewCreated',
      'candidateReviewResolved',
      'contentCopied',
      'dataOrigin',
      'decision',
      'decisionHash',
      'decisionRecord',
      'deploymentAuthorized',
      'evidenceIndependentlyVerified',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'fineTuningExecutionAuthorized',
      'item',
      'itemPathStored',
      'ownerAttestationRecorded',
      'ownerIdentityVerified',
      'payloadStored',
      'productionReadyClaim',
      'providerSubmissionAuthorized',
      'providerSubmissionCreated',
      'q1ContractSatisfied',
      'q1ReviewerGateSatisfied',
      'resolvedAt',
      'reviewerReviewRequired',
      'reviewerVerdict',
      'schemaVersion',
      'sourceObservation',
      'status',
      'target',
      'trainingAuthorized',
      'trainingSubmissionCreated',
      'workspace',
      'workspaceMutationPerformed',
    ],
    'record',
  );

  const admission = normalizeAdmissionReference(content.admission, 'record admission');
  const candidate = normalizeCandidateReference(content.candidate, 'record candidate');
  const item = normalizeItemReference(content.item, 'record item');
  const workspace = normalizeWorkspaceReference(content.workspace, 'record workspace');
  const storedDecision = rebuildDecisionRecord(content.decisionRecord);
  const decisionHash = hashRecord(storedDecision);
  const resolvedAt = requireTimestamp(content.resolvedAt, 'resolvedAt');
  requireExactKeys(
    content.sourceObservation,
    ['candidateObservedAt', 'deleteBy', 'expiresAt', 'itemStoredAt'],
    'source observation',
  );
  const sourceObservation = {
    candidateObservedAt: requireTimestamp(
      content.sourceObservation.candidateObservedAt,
      'source observation candidateObservedAt',
    ),
    deleteBy: requireTimestamp(content.sourceObservation.deleteBy, 'source observation deleteBy'),
    expiresAt: requireTimestamp(content.sourceObservation.expiresAt, 'source observation expiresAt'),
    itemStoredAt: requireTimestamp(
      content.sourceObservation.itemStoredAt,
      'source observation itemStoredAt',
    ),
  };
  requireExactKeys(content.bindings, RESOLUTION_BINDING_KEYS, 'record bindings');
  const bindings = Object.fromEntries(
    RESOLUTION_BINDING_KEYS.map((key) => [key, content.bindings[key]]),
  );
  const approved = storedDecision.decision === 'approve';
  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentCandidateCreated: true,
    answerQualityCaseEvaluationExecuted: false,
    answerQualityCaseMaterializationAllowed: approved,
    bindings,
    candidate,
    candidateReviewCreated: true,
    candidateReviewResolved: true,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    decision: storedDecision.decision,
    decisionHash,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item,
    itemPathStored: false,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    payloadStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: false,
    q1ReviewerGateSatisfied: approved,
    resolvedAt,
    reviewerReviewRequired: false,
    reviewerVerdict: approved ? 'pass' : 'fail',
    schemaVersion:
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_REVIEW_RESOLUTION_SCHEMA_VERSION,
    sourceObservation,
    status: approved
      ? 'approved-for-answer-quality-case-materialization'
      : 'rejected-by-answer-quality-review',
    target: TARGET,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace,
    workspaceMutationPerformed: false,
  };

  const invalid =
    Object.values(bindings).some((value) => !isSha256(value)) ||
    candidate.id !== `private-answer-quality-case-${item.itemHash}` ||
    bindings.admissionHash !== admission.admissionHash ||
    bindings.candidateHash !== candidate.candidateHash ||
    bindings.candidateReviewDecisionHash !== decisionHash ||
    bindings.itemHash !== item.itemHash ||
    bindings.workspaceHash !== workspace.workspaceHash ||
    content.decisionHash !== decisionHash ||
    content.decision !== storedDecision.decision ||
    content.target !== TARGET ||
    Date.parse(sourceObservation.itemStoredAt) >
      Date.parse(sourceObservation.candidateObservedAt) ||
    Date.parse(storedDecision.decidedAt) < Date.parse(sourceObservation.candidateObservedAt) ||
    Date.parse(resolvedAt) < Date.parse(storedDecision.decidedAt) ||
    Date.parse(resolvedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(resolvedAt) >= Date.parse(sourceObservation.deleteBy) ||
    JSON.stringify(content) !== JSON.stringify(expected);
  if (invalid) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution integrity failed.',
    );
  }
  return expected;
}

export function buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(input = {}) {
  const content = buildContent(input);
  const candidateReviewResolutionHash = hashRecord(content);
  return {
    ...content,
    candidateReviewResolutionHash,
    id:
      `fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-` +
      candidateReviewResolutionHash,
  };
}

export function assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
  resolution,
) {
  const { candidateReviewResolutionHash, id, ...content } = resolution || {};
  const expected = rebuildContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    candidateReviewResolutionHash !== expectedHash ||
    id !==
      `fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution integrity failed.',
    );
  }
  return resolution;
}

export function assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(
  resolution,
  { admission, candidate, decision, item, workspace } = {},
) {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(resolution);
  const expected = buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
    admission,
    candidate,
    decision,
    item,
    resolvedAt: resolution.resolvedAt,
    workspace,
  });
  if (JSON.stringify(resolution) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review resolution does not match the live F1.16 candidate.',
    );
  }
  return resolution;
}
