import { createHash } from 'node:crypto';

export const WORKSPACE_LEARNING_PERSONALIZATION_SCHEMA_VERSION =
  'personal-ai-agent-workspace-learning-personalization/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = normalizeText(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Workspace learning personalization ${fieldName} is invalid.`);
  }
  return normalized;
}

function optionalHash(value, fieldName) {
  return value ? requireHash(value, fieldName) : null;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Workspace learning personalization ${fieldName} is invalid.`);
  }
  return value;
}

function normalizeRate(value, fieldName) {
  if (value === null) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new Error(`Workspace learning personalization ${fieldName} is invalid.`);
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
    throw new Error('Workspace learning personalization caseId is required.');
  }
  return {
    ...normalized,
    bindingHash: hashRecord(normalized),
  };
}

function normalizeMission(mission = {}, label) {
  const normalized = {
    id: normalizeText(mission.id),
    objectiveHash: requireHash(mission.objectiveHash, `${label} objectiveHash`),
    workspaceId: normalizeText(mission.workspaceId),
  };
  if (!normalized.id || !normalized.workspaceId) {
    throw new Error(`Workspace learning personalization ${label} mission is incomplete.`);
  }
  return normalized;
}

function normalizeTopology(topology = {}) {
  const normalized = {
    foreignMission: normalizeMission(topology.foreignMission, 'foreign'),
    foreignWorkspaceId: normalizeText(topology.foreignWorkspaceId),
    siblingMission: normalizeMission(topology.siblingMission, 'sibling'),
    sourceMission: normalizeMission(topology.sourceMission, 'source'),
    sourceWorkspaceId: normalizeText(topology.sourceWorkspaceId),
  };
  if (!normalized.foreignWorkspaceId || !normalized.sourceWorkspaceId) {
    throw new Error('Workspace learning personalization workspace topology is incomplete.');
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
    throw new Error('Workspace learning personalization promotion is incomplete.');
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
    throw new Error(`Workspace learning personalization ${label} audit event is incomplete.`);
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
    throw new Error(`Workspace learning personalization ${label} run is incomplete.`);
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
    throw new Error(`Workspace learning personalization ${label} quality result is invalid.`);
  }
  return {
    ...normalized,
    resultHash: hashRecord(normalized),
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

function buildContent(input = {}) {
  const fixtureBinding = normalizeFixtureBinding(input.fixtureBinding);
  const topology = normalizeTopology(input.topology);
  const promotion = normalizePromotion(input.promotion);
  const audit = normalizeAudit(input.audit);
  const sourceRun = normalizeRun(input.sourceRun, 'source');
  const phases = {
    afterPromotion: {
      foreign: normalizeRun(input.phases?.afterPromotion?.foreign, 'afterPromotion foreign'),
      sibling: normalizeRun(input.phases?.afterPromotion?.sibling, 'afterPromotion sibling'),
    },
    afterRollback: {
      foreign: normalizeRun(input.phases?.afterRollback?.foreign, 'afterRollback foreign'),
      sibling: normalizeRun(input.phases?.afterRollback?.sibling, 'afterRollback sibling'),
    },
    beforePromotion: {
      foreign: normalizeRun(input.phases?.beforePromotion?.foreign, 'beforePromotion foreign'),
      sibling: normalizeRun(input.phases?.beforePromotion?.sibling, 'beforePromotion sibling'),
    },
  };
  const quality = {
    afterPromotion: {
      foreign: normalizeQualityResult(input.quality?.afterPromotion?.foreign, 'afterPromotion foreign'),
      sibling: normalizeQualityResult(input.quality?.afterPromotion?.sibling, 'afterPromotion sibling'),
    },
    afterRollback: {
      foreign: normalizeQualityResult(input.quality?.afterRollback?.foreign, 'afterRollback foreign'),
      sibling: normalizeQualityResult(input.quality?.afterRollback?.sibling, 'afterRollback sibling'),
    },
    beforePromotion: {
      foreign: normalizeQualityResult(input.quality?.beforePromotion?.foreign, 'beforePromotion foreign'),
      sibling: normalizeQualityResult(input.quality?.beforePromotion?.sibling, 'beforePromotion sibling'),
    },
  };
  const observedAt = normalizeText(input.observedAt);
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
    throw new Error('Workspace learning personalization observedAt is invalid.');
  }

  const runList = [
    sourceRun,
    phases.beforePromotion.sibling,
    phases.beforePromotion.foreign,
    phases.afterPromotion.sibling,
    phases.afterPromotion.foreign,
    phases.afterRollback.sibling,
    phases.afterRollback.foreign,
  ];
  const topologyBound =
    topology.sourceWorkspaceId !== topology.foreignWorkspaceId &&
    topology.sourceMission.workspaceId === topology.sourceWorkspaceId &&
    topology.siblingMission.workspaceId === topology.sourceWorkspaceId &&
    topology.foreignMission.workspaceId === topology.foreignWorkspaceId &&
    new Set([
      topology.sourceMission.id,
      topology.siblingMission.id,
      topology.foreignMission.id,
    ]).size === 3 &&
    topology.sourceMission.objectiveHash === fixtureBinding.sourceObjectiveHash &&
    topology.siblingMission.objectiveHash === fixtureBinding.targetObjectiveHash &&
    topology.foreignMission.objectiveHash === fixtureBinding.targetObjectiveHash;
  const promotionVerified =
    promotion.finalStatus === 'rolled-back' &&
    promotion.memoryRollbackStatus === 'memory-deleted' &&
    promotion.rollbackAction === 'delete-memory-entry' &&
    promotion.rollbackStatus === 'completed' &&
    promotion.scope === 'workspace' &&
    promotion.scopeAuthorizationFromScope === 'mission' &&
    promotion.scopeAuthorizationFromScopeId === topology.sourceMission.id &&
    promotion.scopeAuthorizationStatus === 'consumed' &&
    promotion.scopeAuthorizationToScope === 'workspace' &&
    promotion.scopeAuthorizationToScopeId === topology.sourceWorkspaceId &&
    promotion.scopeId === topology.sourceWorkspaceId &&
    promotion.target === 'memory' &&
    promotion.verificationStatus === 'passed';
  const auditOrderingPreserved =
    audit.authorization.kind === 'learning-candidate-promotion-scope-authorized' &&
    audit.authorization.status === 'authorized' &&
    audit.promotion.kind === 'learning-candidate-promotion-approved' &&
    audit.promotion.status === 'passed' &&
    audit.rollback.kind === 'learning-candidate-promotion-rolled-back' &&
    audit.rollback.status === 'memory-deleted' &&
    audit.authorization.candidateId === promotion.candidateId &&
    audit.promotion.candidateId === promotion.candidateId &&
    audit.rollback.candidateId === promotion.candidateId &&
    audit.authorization.missionId === topology.sourceMission.id &&
    audit.promotion.missionId === topology.sourceMission.id &&
    audit.rollback.missionId === topology.sourceMission.id &&
    audit.authorization.scopeAuthorizationId === promotion.scopeAuthorizationId &&
    audit.promotion.scopeAuthorizationId === promotion.scopeAuthorizationId &&
    audit.rollback.scopeAuthorizationId === promotion.scopeAuthorizationId &&
    audit.authorization.index < audit.promotion.index &&
    audit.promotion.index < audit.rollback.index &&
    Date.parse(audit.authorization.at) <= Date.parse(audit.promotion.at) &&
    Date.parse(audit.promotion.at) <= Date.parse(audit.rollback.at);
  const siblingBaselineClean = noMemorySignal(phases.beforePromotion.sibling);
  const siblingFeedbackApplied =
    phases.afterPromotion.sibling.adaptation.deliverableApplied === true &&
    phases.afterPromotion.sibling.adaptation.plannerApplied === true &&
    phases.afterPromotion.sibling.adaptation.planStepCount >
      phases.beforePromotion.sibling.adaptation.planStepCount &&
    Object.values(phases.afterPromotion.sibling.memoryExposure).every(Boolean) &&
    phases.afterPromotion.sibling.artifacts.retrievalHash !== null &&
    phases.afterPromotion.sibling.retrieval.contentHash === promotion.memoryContentHash &&
    phases.afterPromotion.sibling.retrieval.matchTermCount > 0 &&
    phases.afterPromotion.sibling.retrieval.scope === 'workspace' &&
    phases.afterPromotion.sibling.retrieval.scopeId === topology.sourceWorkspaceId &&
    phases.afterPromotion.sibling.retrieval.sourceId === promotion.memoryId &&
    perfectAppliedQuality(quality.afterPromotion.sibling);
  const foreignWorkspaceIsolated =
    noMemorySignal(phases.beforePromotion.foreign) &&
    noMemorySignal(phases.afterPromotion.foreign) &&
    noMemorySignal(phases.afterRollback.foreign) &&
    Object.values(quality).every((phase) => phase.foreign.status === 'passed') &&
    quality.beforePromotion.foreign.resultHash === quality.afterPromotion.foreign.resultHash &&
    quality.beforePromotion.foreign.resultHash === quality.afterRollback.foreign.resultHash;
  const siblingRollbackRestored =
    noMemorySignal(phases.afterRollback.sibling) &&
    phases.afterRollback.sibling.adaptation.planStepCount ===
      phases.beforePromotion.sibling.adaptation.planStepCount &&
    phases.afterRollback.sibling.artifacts.deliverableHash ===
      phases.beforePromotion.sibling.artifacts.deliverableHash &&
    phases.afterRollback.sibling.artifacts.plannerHash ===
      phases.beforePromotion.sibling.artifacts.plannerHash &&
    quality.beforePromotion.sibling.resultHash === quality.afterRollback.sibling.resultHash;
  const foreignArtifactParity =
    phases.beforePromotion.foreign.artifacts.deliverableHash ===
      phases.afterPromotion.foreign.artifacts.deliverableHash &&
    phases.beforePromotion.foreign.artifacts.deliverableHash ===
      phases.afterRollback.foreign.artifacts.deliverableHash &&
    phases.beforePromotion.foreign.artifacts.plannerHash ===
      phases.afterPromotion.foreign.artifacts.plannerHash &&
    phases.beforePromotion.foreign.artifacts.plannerHash ===
      phases.afterRollback.foreign.artifacts.plannerHash;
  const controlledQualityDelta =
    quality.beforePromotion.sibling.status === 'failed' &&
    quality.afterPromotion.sibling.status === 'passed' &&
    quality.afterRollback.sibling.status === 'failed';
  const reviewerPassPreserved = runList.every((run) => run.reviewerVerdict === 'pass');
  const externalProviderIsolationPassed = runList.every(
    (run) => run.providerId === 'stub' && run.externalProviderCallCount === 0,
  );
  const distinctSessionsPassed = new Set(runList.map((run) => run.sessionId)).size === runList.length;
  const results = {
    auditOrderingPreserved,
    controlledQualityDelta,
    distinctSessionsPassed,
    externalProviderIsolationPassed,
    foreignArtifactParity,
    foreignWorkspaceIsolated,
    promotionVerified,
    reviewerPassPreserved,
    siblingBaselineClean,
    siblingFeedbackApplied,
    siblingRollbackRestored,
    topologyBound,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualWorkspaceLearningPersonalizationValidated: validated,
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
      controlledCrossMissionApplicationValidated: validated,
      controlledWorkspacePersonalizationValidated: validated,
      crossMissionGeneralizationValidated: false,
      generalAnswerQualityImprovementValidated: false,
      generalWorkspacePersonalizationValidated: false,
      userScopedPersonalizationValidated: false,
    },
    results,
    schemaVersion: WORKSPACE_LEARNING_PERSONALIZATION_SCHEMA_VERSION,
    sourceRun,
    status: validated
      ? 'workspace-learning-personalization-passed-local-only'
      : 'failed-keep-mission-scoped-learning-only',
    topology,
  };
}

export function buildWorkspaceLearningPersonalizationEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `workspace-learning-personalization-${evidenceHash}`,
  };
}

export function assertWorkspaceLearningPersonalizationEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evidenceHash !== expectedHash || id !== `workspace-learning-personalization-${expectedHash}`) {
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
    evidence?.qualityBoundary?.crossMissionGeneralizationValidated !== false ||
    evidence?.qualityBoundary?.generalWorkspacePersonalizationValidated !== false ||
    evidence?.qualityBoundary?.userScopedPersonalizationValidated !== false
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Workspace learning personalization evidence failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
