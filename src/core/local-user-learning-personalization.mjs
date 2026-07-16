import { createHash } from 'node:crypto';

export const LOCAL_USER_LEARNING_PERSONALIZATION_SCHEMA_VERSION =
  'personal-ai-agent-local-user-learning-personalization/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = normalizeText(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Local user learning personalization ${fieldName} is invalid.`);
  }
  return normalized;
}

function optionalHash(value, fieldName) {
  const normalized = normalizeText(value);
  return normalized ? requireHash(normalized, fieldName) : null;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Local user learning personalization ${fieldName} is invalid.`);
  }
  return value;
}

function normalizeRate(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new Error(`Local user learning personalization ${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeFixtureBinding(binding = {}) {
  const normalized = {
    caseId: normalizeText(binding.caseId),
    expectedPlanStepHash: requireHash(binding.expectedPlanStepHash, 'expectedPlanStepHash'),
    fixtureHash: requireHash(binding.fixtureHash, 'fixtureHash'),
    promotionNoteHash: requireHash(binding.promotionNoteHash, 'promotionNoteHash'),
    scopeAuthorizationNoteHash: requireHash(
      binding.scopeAuthorizationNoteHash,
      'scopeAuthorizationNoteHash',
    ),
    sourceObjectiveHash: requireHash(binding.sourceObjectiveHash, 'sourceObjectiveHash'),
    targetObjectiveHash: requireHash(binding.targetObjectiveHash, 'targetObjectiveHash'),
  };
  if (!normalized.caseId) {
    throw new Error('Local user learning personalization caseId is required.');
  }
  return normalized;
}

function normalizeMission(mission = {}, label) {
  const normalized = {
    id: normalizeText(mission.id),
    objectiveHash: requireHash(mission.objectiveHash, `${label} objectiveHash`),
    workspaceId: normalizeText(mission.workspaceId),
  };
  if (!normalized.id || !normalized.workspaceId) {
    throw new Error(`Local user learning personalization ${label} mission is incomplete.`);
  }
  return normalized;
}

function normalizeTopology(topology = {}) {
  const normalized = {
    crossWorkspaceId: normalizeText(topology.crossWorkspaceId),
    crossWorkspaceMission: normalizeMission(topology.crossWorkspaceMission, 'cross-workspace'),
    siblingMission: normalizeMission(topology.siblingMission, 'sibling'),
    sourceMission: normalizeMission(topology.sourceMission, 'source'),
    sourceWorkspaceId: normalizeText(topology.sourceWorkspaceId),
  };
  if (!normalized.crossWorkspaceId || !normalized.sourceWorkspaceId) {
    throw new Error('Local user learning personalization topology is incomplete.');
  }
  return normalized;
}

function normalizePromotion(promotion = {}) {
  const normalized = {
    candidateId: normalizeText(promotion.candidateId),
    finalStatus: normalizeText(promotion.finalStatus),
    memoryContentHash: requireHash(promotion.memoryContentHash, 'memoryContentHash'),
    memoryId: normalizeText(promotion.memoryId),
    memoryRollbackStatus: normalizeText(promotion.memoryRollbackStatus),
    rollbackAction: normalizeText(promotion.rollbackAction),
    rollbackStatus: normalizeText(promotion.rollbackStatus),
    scope: normalizeText(promotion.scope),
    scopeAuthorizationFromScope: normalizeText(promotion.scopeAuthorizationFromScope),
    scopeAuthorizationFromScopeId: normalizeText(promotion.scopeAuthorizationFromScopeId),
    scopeAuthorizationId: normalizeText(promotion.scopeAuthorizationId),
    scopeAuthorizationStatus: normalizeText(promotion.scopeAuthorizationStatus),
    scopeAuthorizationToScope: normalizeText(promotion.scopeAuthorizationToScope),
    scopeAuthorizationToScopeId: normalizeText(promotion.scopeAuthorizationToScopeId),
    scopeId: normalizeText(promotion.scopeId),
    target: normalizeText(promotion.target),
    verificationId: normalizeText(promotion.verificationId),
    verificationStatus: normalizeText(promotion.verificationStatus),
  };
  if (
    !normalized.candidateId ||
    !normalized.memoryId ||
    !normalized.scopeAuthorizationId ||
    !normalized.scopeId ||
    !normalized.verificationId
  ) {
    throw new Error('Local user learning personalization promotion is incomplete.');
  }
  return normalized;
}

function normalizeAuditEvent(event = {}, label) {
  const normalized = {
    at: normalizeText(event.at),
    candidateId: normalizeText(event.candidateId),
    index: requireInteger(event.index, `${label} index`),
    kind: normalizeText(event.kind),
    missionId: normalizeText(event.missionId),
    scopeAuthorizationId: normalizeText(event.scopeAuthorizationId),
    status: normalizeText(event.status),
  };
  if (
    !normalized.at ||
    Number.isNaN(Date.parse(normalized.at)) ||
    !normalized.candidateId ||
    !normalized.kind ||
    !normalized.missionId ||
    !normalized.scopeAuthorizationId
  ) {
    throw new Error(`Local user learning personalization ${label} audit event is incomplete.`);
  }
  return normalized;
}

function normalizeAudit(audit = {}) {
  return {
    authorization: normalizeAuditEvent(audit.authorization, 'authorization'),
    promotion: normalizeAuditEvent(audit.promotion, 'promotion'),
    rollback: normalizeAuditEvent(audit.rollback, 'rollback'),
  };
}

function normalizeRun(run = {}, label) {
  const normalized = {
    adaptation: {
      deliverableApplied: run.adaptation?.deliverableApplied === true,
      planStepCount: requireInteger(run.adaptation?.planStepCount, `${label} planStepCount`),
      plannerApplied: run.adaptation?.plannerApplied === true,
    },
    artifacts: {
      deliverableHash: requireHash(run.artifacts?.deliverableHash, `${label} deliverableHash`),
      plannerHash: requireHash(run.artifacts?.plannerHash, `${label} plannerHash`),
      retrievalHash: optionalHash(run.artifacts?.retrievalHash, `${label} retrievalHash`),
    },
    externalProviderCallCount: requireInteger(
      run.externalProviderCallCount,
      `${label} externalProviderCallCount`,
    ),
    memoryExposure: {
      deliverableContainsMemory: run.memoryExposure?.deliverableContainsMemory === true,
      plannerPromptContainsMemory: run.memoryExposure?.plannerPromptContainsMemory === true,
      retrievalContainsMemory: run.memoryExposure?.retrievalContainsMemory === true,
    },
    providerId: normalizeText(run.providerId),
    retrieval: {
      contentHash: optionalHash(run.retrieval?.contentHash, `${label} retrieval contentHash`),
      matchTermCount: requireInteger(run.retrieval?.matchTermCount, `${label} matchTermCount`),
      scope: normalizeText(run.retrieval?.scope),
      scopeId: normalizeText(run.retrieval?.scopeId),
      sourceId: normalizeText(run.retrieval?.sourceId),
    },
    reviewerVerdict: normalizeText(run.reviewerVerdict),
    sessionId: normalizeText(run.sessionId),
    status: normalizeText(run.status),
  };
  if (!normalized.sessionId || !normalized.providerId || !normalized.status) {
    throw new Error(`Local user learning personalization ${label} run is incomplete.`);
  }
  return normalized;
}

function normalizeQualityResult(result = {}, label) {
  const normalized = {
    failureChecks: [...new Set(
      (Array.isArray(result.failures) ? result.failures : result.failureChecks || [])
        .map((failure) => normalizeText(failure?.check || failure))
        .filter(Boolean),
    )],
    id: normalizeText(result.id),
    metrics: {
      citationGroundingRate: normalizeRate(
        result.metrics?.citationGroundingRate,
        `${label} citationGroundingRate`,
      ),
      expectedSourceCitationRate: normalizeRate(
        result.metrics?.expectedSourceCitationRate,
        `${label} expectedSourceCitationRate`,
      ),
      forbiddenRetrievedSourceCount: requireInteger(
        result.metrics?.forbiddenRetrievedSourceCount,
        `${label} forbiddenRetrievedSourceCount`,
      ),
      forbiddenTermMatchCount: requireInteger(
        result.metrics?.forbiddenTermMatchCount,
        `${label} forbiddenTermMatchCount`,
      ),
      requiredTermCoverage: normalizeRate(
        result.metrics?.requiredTermCoverage,
        `${label} requiredTermCoverage`,
      ),
      retrievalHitRate: normalizeRate(
        result.metrics?.retrievalHitRate,
        `${label} retrievalHitRate`,
      ),
      unsupportedCitationRate: normalizeRate(
        result.metrics?.unsupportedCitationRate,
        `${label} unsupportedCitationRate`,
      ),
    },
    status: normalizeText(result.status),
  };
  if (!normalized.id || !['passed', 'failed'].includes(normalized.status)) {
    throw new Error(`Local user learning personalization ${label} quality result is invalid.`);
  }
  return {
    ...normalized,
    resultHash: hashRecord(normalized),
  };
}

function normalizeTargetPhases(phases = {}, label) {
  return {
    afterPromotion: normalizeRun(phases.afterPromotion, `${label} afterPromotion`),
    afterRollback: normalizeRun(phases.afterRollback, `${label} afterRollback`),
    beforePromotion: normalizeRun(phases.beforePromotion, `${label} beforePromotion`),
  };
}

function normalizeTargetQuality(quality = {}, label) {
  return {
    afterPromotion: normalizeQualityResult(quality.afterPromotion, `${label} afterPromotion`),
    afterRollback: normalizeQualityResult(quality.afterRollback, `${label} afterRollback`),
    beforePromotion: normalizeQualityResult(quality.beforePromotion, `${label} beforePromotion`),
  };
}

function noMemorySignal(run) {
  return (
    run.adaptation.deliverableApplied === false &&
    run.adaptation.plannerApplied === false &&
    Object.values(run.memoryExposure).every((value) => value === false) &&
    run.artifacts.retrievalHash === null &&
    run.retrieval.contentHash === null &&
    run.retrieval.matchTermCount === 0 &&
    run.retrieval.scope === '' &&
    run.retrieval.scopeId === '' &&
    run.retrieval.sourceId === ''
  );
}

function perfectAppliedQuality(result) {
  return (
    result.status === 'passed' &&
    result.metrics.citationGroundingRate === 1 &&
    result.metrics.expectedSourceCitationRate === 1 &&
    result.metrics.forbiddenRetrievedSourceCount === 0 &&
    result.metrics.forbiddenTermMatchCount === 0 &&
    result.metrics.requiredTermCoverage === 1 &&
    result.metrics.retrievalHitRate === 1 &&
    result.metrics.unsupportedCitationRate === 0
  );
}

function userMemoryApplied(run, qualityResult, baselineRun, promotion) {
  return (
    run.adaptation.deliverableApplied === true &&
    run.adaptation.plannerApplied === true &&
    run.adaptation.planStepCount > baselineRun.adaptation.planStepCount &&
    Object.values(run.memoryExposure).every(Boolean) &&
    run.artifacts.retrievalHash !== null &&
    run.retrieval.contentHash === promotion.memoryContentHash &&
    run.retrieval.matchTermCount > 0 &&
    run.retrieval.scope === 'user' &&
    run.retrieval.scopeId === 'user' &&
    run.retrieval.sourceId === promotion.memoryId &&
    perfectAppliedQuality(qualityResult)
  );
}

function rollbackRestored(phases, quality) {
  return (
    noMemorySignal(phases.afterRollback) &&
    phases.afterRollback.adaptation.planStepCount === phases.beforePromotion.adaptation.planStepCount &&
    phases.afterRollback.artifacts.deliverableHash === phases.beforePromotion.artifacts.deliverableHash &&
    phases.afterRollback.artifacts.plannerHash === phases.beforePromotion.artifacts.plannerHash &&
    quality.afterRollback.resultHash === quality.beforePromotion.resultHash
  );
}

function buildContent(input = {}) {
  const fixtureBinding = normalizeFixtureBinding(input.fixtureBinding);
  const topology = normalizeTopology(input.topology);
  const promotion = normalizePromotion(input.promotion);
  const audit = normalizeAudit(input.audit);
  const sourceRun = normalizeRun(input.sourceRun, 'source');
  const phases = {
    crossWorkspace: normalizeTargetPhases(input.phases?.crossWorkspace, 'crossWorkspace'),
    sibling: normalizeTargetPhases(input.phases?.sibling, 'sibling'),
  };
  const quality = {
    crossWorkspace: normalizeTargetQuality(input.quality?.crossWorkspace, 'crossWorkspace'),
    sibling: normalizeTargetQuality(input.quality?.sibling, 'sibling'),
  };
  const observedAt = normalizeText(input.observedAt);
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
    throw new Error('Local user learning personalization observedAt is invalid.');
  }

  const targets = ['sibling', 'crossWorkspace'];
  const runList = [
    sourceRun,
    ...targets.flatMap((target) => [
      phases[target].beforePromotion,
      phases[target].afterPromotion,
      phases[target].afterRollback,
    ]),
  ];
  const topologyBound =
    topology.sourceWorkspaceId !== topology.crossWorkspaceId &&
    topology.sourceMission.workspaceId === topology.sourceWorkspaceId &&
    topology.siblingMission.workspaceId === topology.sourceWorkspaceId &&
    topology.crossWorkspaceMission.workspaceId === topology.crossWorkspaceId &&
    new Set([
      topology.sourceMission.id,
      topology.siblingMission.id,
      topology.crossWorkspaceMission.id,
    ]).size === 3 &&
    topology.sourceMission.objectiveHash === fixtureBinding.sourceObjectiveHash &&
    topology.siblingMission.objectiveHash === fixtureBinding.targetObjectiveHash &&
    topology.crossWorkspaceMission.objectiveHash === fixtureBinding.targetObjectiveHash;
  const promotionVerified =
    promotion.finalStatus === 'rolled-back' &&
    promotion.memoryRollbackStatus === 'memory-deleted' &&
    promotion.rollbackAction === 'delete-memory-entry' &&
    promotion.rollbackStatus === 'completed' &&
    promotion.scope === 'user' &&
    promotion.scopeAuthorizationFromScope === 'mission' &&
    promotion.scopeAuthorizationFromScopeId === topology.sourceMission.id &&
    promotion.scopeAuthorizationStatus === 'consumed' &&
    promotion.scopeAuthorizationToScope === 'user' &&
    promotion.scopeAuthorizationToScopeId === 'user' &&
    promotion.scopeId === 'user' &&
    promotion.target === 'memory' &&
    promotion.verificationStatus === 'passed';
  const auditOrderingPreserved =
    audit.authorization.kind === 'learning-candidate-promotion-scope-authorized' &&
    audit.authorization.status === 'authorized' &&
    audit.promotion.kind === 'learning-candidate-promotion-approved' &&
    audit.promotion.status === 'passed' &&
    audit.rollback.kind === 'learning-candidate-promotion-rolled-back' &&
    audit.rollback.status === 'memory-deleted' &&
    [audit.authorization, audit.promotion, audit.rollback].every(
      (event) =>
        event.candidateId === promotion.candidateId &&
        event.missionId === topology.sourceMission.id &&
        event.scopeAuthorizationId === promotion.scopeAuthorizationId,
    ) &&
    audit.authorization.index < audit.promotion.index &&
    audit.promotion.index < audit.rollback.index &&
    Date.parse(audit.authorization.at) <= Date.parse(audit.promotion.at) &&
    Date.parse(audit.promotion.at) <= Date.parse(audit.rollback.at);
  const baselineClean = targets.every((target) => noMemorySignal(phases[target].beforePromotion));
  const userFeedbackApplied = targets.every((target) =>
    userMemoryApplied(
      phases[target].afterPromotion,
      quality[target].afterPromotion,
      phases[target].beforePromotion,
      promotion,
    ));
  const rollbackParity = targets.every((target) =>
    rollbackRestored(phases[target], quality[target]));
  const controlledQualityDelta = targets.every(
    (target) =>
      quality[target].beforePromotion.status === 'failed' &&
      quality[target].afterPromotion.status === 'passed' &&
      quality[target].afterRollback.status === 'failed',
  );
  const reviewerPassPreserved = runList.every((run) => run.reviewerVerdict === 'pass');
  const externalProviderIsolationPassed = runList.every(
    (run) => run.providerId === 'stub' && run.externalProviderCallCount === 0,
  );
  const distinctSessionsPassed =
    new Set(runList.map((run) => run.sessionId)).size === runList.length;
  const results = {
    auditOrderingPreserved,
    baselineClean,
    controlledQualityDelta,
    distinctSessionsPassed,
    externalProviderIsolationPassed,
    promotionVerified,
    reviewerPassPreserved,
    rollbackParity,
    topologyBound,
    userFeedbackApplied,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualLocalUserScopedPersonalizationValidated: validated,
    audit,
    costFree: true,
    externalProviderCalls: 'none',
    fixtureBinding,
    observedAt,
    phases,
    productionReadyClaim: false,
    promotion,
    quality,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      generalAnswerQualityImprovementValidated: false,
      generalUserPersonalizationValidated: false,
      hostedTenantUserPersonalizationValidated: false,
      multiUserIsolationValidated: false,
      singleUserGlobalScopeValidated: validated,
    },
    results,
    schemaVersion: LOCAL_USER_LEARNING_PERSONALIZATION_SCHEMA_VERSION,
    sourceRun,
    status: validated
      ? 'local-user-learning-personalization-passed-local-only'
      : 'failed-keep-workspace-scoped-learning-only',
    topology,
  };
}

export function buildLocalUserLearningPersonalizationEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-user-learning-personalization-${evidenceHash}`,
  };
}

export function assertLocalUserLearningPersonalizationEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `local-user-learning-personalization-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      audit: evidence?.audit,
      fixtureBinding: evidence?.fixtureBinding,
      observedAt: evidence?.observedAt,
      phases: evidence?.phases,
      promotion: evidence?.promotion,
      quality: evidence?.quality,
      sourceRun: evidence?.sourceRun,
      topology: evidence?.topology,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (
    evidence?.costFree !== true ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.productionReadyClaim !== false ||
    evidence?.qualityBoundary?.actualModelTrainingExecuted !== false ||
    evidence?.qualityBoundary?.generalAnswerQualityImprovementValidated !== false ||
    evidence?.qualityBoundary?.generalUserPersonalizationValidated !== false ||
    evidence?.qualityBoundary?.hostedTenantUserPersonalizationValidated !== false ||
    evidence?.qualityBoundary?.multiUserIsolationValidated !== false
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Local user learning personalization evidence failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
