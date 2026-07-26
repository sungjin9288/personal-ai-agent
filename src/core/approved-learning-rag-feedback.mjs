import { createHash } from 'node:crypto';

export const APPROVED_LEARNING_RAG_FEEDBACK_SCHEMA_VERSION =
  'personal-ai-agent-approved-learning-rag-feedback/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isHash(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function optionalHash(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const normalized = normalizeText(value);
  if (!isHash(normalized)) {
    throw new Error(`Approved learning RAG feedback ${fieldName} is invalid.`);
  }
  return normalized;
}

function requiredHash(value, fieldName) {
  const normalized = normalizeText(value);
  if (!isHash(normalized)) {
    throw new Error(`Approved learning RAG feedback ${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeFixtureBinding(binding = {}) {
  const normalized = {
    caseId: normalizeText(binding.caseId),
    expectedPlanStepHash: requiredHash(binding.expectedPlanStepHash, 'expectedPlanStepHash'),
    fixtureHash: requiredHash(binding.fixtureHash, 'fixtureHash'),
    objectiveHash: requiredHash(binding.objectiveHash, 'objectiveHash'),
    promotionNoteHash: requiredHash(binding.promotionNoteHash, 'promotionNoteHash'),
  };
  if (!normalized.caseId) {
    throw new Error('Approved learning RAG feedback caseId is required.');
  }
  return {
    ...normalized,
    bindingHash: hashRecord(normalized),
  };
}

function normalizeMission(mission = {}) {
  const normalized = {
    id: normalizeText(mission.id),
    objectiveHash: requiredHash(mission.objectiveHash, 'mission objectiveHash'),
    workspaceId: normalizeText(mission.workspaceId),
  };
  if (!normalized.id || !normalized.workspaceId) {
    throw new Error('Approved learning RAG feedback mission binding is incomplete.');
  }
  return normalized;
}

function normalizePromotion(promotion = {}) {
  const normalized = {
    candidateId: normalizeText(promotion.candidateId),
    finalStatus: normalizeText(promotion.finalStatus),
    memoryContentHash: requiredHash(promotion.memoryContentHash, 'memoryContentHash'),
    memoryId: normalizeText(promotion.memoryId),
    memoryRollbackStatus: normalizeText(promotion.memoryRollbackStatus),
    rollbackAction: normalizeText(promotion.rollbackAction),
    rollbackStatus: normalizeText(promotion.rollbackStatus),
    scope: normalizeText(promotion.scope),
    scopeId: normalizeText(promotion.scopeId),
    target: normalizeText(promotion.target),
    verificationId: normalizeText(promotion.verificationId),
    verificationStatus: normalizeText(promotion.verificationStatus),
  };
  if (
    !normalized.candidateId ||
    !normalized.memoryId ||
    !normalized.scopeId ||
    !normalized.verificationId
  ) {
    throw new Error('Approved learning RAG feedback promotion binding is incomplete.');
  }
  return normalized;
}

function normalizeRun(run = {}, label) {
  const normalized = {
    adaptation: {
      deliverableApplied: run.adaptation?.deliverableApplied === true,
      planStepCount: run.adaptation?.planStepCount,
      plannerApplied: run.adaptation?.plannerApplied === true,
    },
    artifacts: {
      deliverableHash: requiredHash(run.artifacts?.deliverableHash, `${label} deliverableHash`),
      plannerHash: requiredHash(run.artifacts?.plannerHash, `${label} plannerHash`),
      retrievalHash: optionalHash(run.artifacts?.retrievalHash, `${label} retrievalHash`),
    },
    externalProviderCallCount: run.externalProviderCallCount,
    learningMemoryPresent: run.learningMemoryPresent === true,
    providerId: normalizeText(run.providerId),
    retrieval: {
      contentHash: optionalHash(run.retrieval?.contentHash, `${label} retrieval contentHash`),
      matchTermCount: run.retrieval?.matchTermCount,
      scope: normalizeText(run.retrieval?.scope),
      scopeId: normalizeText(run.retrieval?.scopeId),
      sourceId: normalizeText(run.retrieval?.sourceId),
    },
    reviewerVerdict: normalizeText(run.reviewerVerdict),
    sessionId: normalizeText(run.sessionId),
    status: normalizeText(run.status),
  };
  if (
    !normalized.sessionId ||
    !Number.isInteger(normalized.adaptation.planStepCount) ||
    normalized.adaptation.planStepCount < 0 ||
    !Number.isInteger(normalized.externalProviderCallCount) ||
    normalized.externalProviderCallCount < 0 ||
    !Number.isInteger(normalized.retrieval.matchTermCount) ||
    normalized.retrieval.matchTermCount < 0
  ) {
    throw new Error(`Approved learning RAG feedback ${label} run is invalid.`);
  }
  return normalized;
}

function hasNoLearningSignal(run) {
  return (
    run.learningMemoryPresent === false &&
    run.adaptation.plannerApplied === false &&
    run.adaptation.deliverableApplied === false &&
    run.artifacts.retrievalHash === null &&
    run.retrieval.sourceId === '' &&
    run.retrieval.contentHash === null &&
    run.retrieval.matchTermCount === 0
  );
}

function buildContent(input = {}) {
  const observedAt = normalizeText(input.observedAt);
  if (!Number.isFinite(Date.parse(observedAt))) {
    throw new Error('Approved learning RAG feedback observedAt is invalid.');
  }

  const fixtureBinding = normalizeFixtureBinding(input.fixtureBinding);
  const mission = normalizeMission(input.mission);
  const promotion = normalizePromotion(input.promotion);
  const runs = {
    beforePromotion: normalizeRun(input.runs?.beforePromotion, 'beforePromotion'),
    afterPromotion: normalizeRun(input.runs?.afterPromotion, 'afterPromotion'),
    afterRollback: normalizeRun(input.runs?.afterRollback, 'afterRollback'),
  };
  const runList = Object.values(runs);
  const baselineClean = hasNoLearningSignal(runs.beforePromotion);
  const promotionVerified =
    promotion.finalStatus === 'rolled-back' &&
    promotion.memoryRollbackStatus === 'memory-deleted' &&
    promotion.rollbackAction === 'delete-memory-entry' &&
    promotion.rollbackStatus === 'completed' &&
    promotion.scope === 'mission' &&
    promotion.scopeId === mission.id &&
    promotion.target === 'memory' &&
    promotion.verificationStatus === 'passed';
  const retrievalLineageBound =
    runs.afterPromotion.learningMemoryPresent === true &&
    runs.afterPromotion.artifacts.retrievalHash !== null &&
    runs.afterPromotion.retrieval.sourceId === promotion.memoryId &&
    runs.afterPromotion.retrieval.contentHash === promotion.memoryContentHash &&
    runs.afterPromotion.retrieval.scope === 'mission' &&
    runs.afterPromotion.retrieval.scopeId === mission.id &&
    runs.afterPromotion.retrieval.matchTermCount > 0;
  const plannerAndDeliverableAdapted =
    runs.afterPromotion.adaptation.plannerApplied === true &&
    runs.afterPromotion.adaptation.deliverableApplied === true &&
    runs.afterPromotion.adaptation.planStepCount > runs.beforePromotion.adaptation.planStepCount;
  const reviewerPassPreserved = runList.every(
    (run) => run.providerId === 'stub' && run.status === 'completed' && run.reviewerVerdict === 'pass',
  );
  const externalProviderIsolationPassed = runList.every(
    (run) => run.externalProviderCallCount === 0,
  );
  const rollbackRestoredBaseline =
    hasNoLearningSignal(runs.afterRollback) &&
    runs.afterRollback.adaptation.planStepCount === runs.beforePromotion.adaptation.planStepCount;
  const rollbackArtifactParity =
    runs.afterRollback.artifacts.deliverableHash === runs.beforePromotion.artifacts.deliverableHash &&
    runs.afterRollback.artifacts.plannerHash === runs.beforePromotion.artifacts.plannerHash;
  const distinctSessionsPassed = new Set(runList.map((run) => run.sessionId)).size === runList.length;
  const fixtureBindingPassed = mission.objectiveHash === fixtureBinding.objectiveHash;
  const validated = [
    baselineClean,
    distinctSessionsPassed,
    externalProviderIsolationPassed,
    fixtureBindingPassed,
    plannerAndDeliverableAdapted,
    promotionVerified,
    retrievalLineageBound,
    reviewerPassPreserved,
    rollbackArtifactParity,
    rollbackRestoredBaseline,
  ].every(Boolean);

  return {
    actualApprovedLearningRagFeedbackValidated: validated,
    costFree: true,
    externalProviderCalls: 'none',
    fixtureBinding,
    mission,
    observedAt,
    productionReadyClaim: false,
    promotion,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      crossMissionGeneralizationValidated: false,
      generalAnswerQualityImprovementValidated: false,
      missionScopedFeedbackApplicationValidated: validated,
    },
    results: {
      baselineClean,
      distinctSessionsPassed,
      externalProviderIsolationPassed,
      fixtureBindingPassed,
      plannerAndDeliverableAdapted,
      promotionVerified,
      retrievalLineageBound,
      reviewerPassPreserved,
      rollbackArtifactParity,
      rollbackRestoredBaseline,
    },
    runs,
    schemaVersion: APPROVED_LEARNING_RAG_FEEDBACK_SCHEMA_VERSION,
    status: validated
      ? 'approved-learning-rag-feedback-passed-local-only'
      : 'failed-keep-operator-reviewed-memory-only',
  };
}

export function buildApprovedLearningRagFeedbackEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `approved-learning-rag-feedback-${evidenceHash}`,
  };
}

export function assertApprovedLearningRagFeedbackEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evidenceHash !== expectedHash || id !== `approved-learning-rag-feedback-${expectedHash}`) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      fixtureBinding: evidence?.fixtureBinding,
      mission: evidence?.mission,
      observedAt: evidence?.observedAt,
      promotion: evidence?.promotion,
      runs: evidence?.runs,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  const expectedStatus = evidence?.actualApprovedLearningRagFeedbackValidated === true
    ? 'approved-learning-rag-feedback-passed-local-only'
    : 'failed-keep-operator-reviewed-memory-only';
  if (
    evidence?.costFree !== true ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.productionReadyClaim !== false ||
    evidence?.qualityBoundary?.actualModelTrainingExecuted !== false ||
    evidence?.qualityBoundary?.generalAnswerQualityImprovementValidated !== false ||
    evidence?.status !== expectedStatus
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(`Approved learning RAG feedback evidence failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
