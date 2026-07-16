import { createHash } from 'node:crypto';

export const USER_LEARNING_CONFLICT_REVOCATION_SCHEMA_VERSION =
  'personal-ai-agent-user-learning-conflict-revocation/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = normalizeText(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`User learning conflict ${fieldName} is invalid.`);
  }
  return normalized;
}

function optionalHash(value, fieldName) {
  return value ? requireHash(value, fieldName) : null;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`User learning conflict ${fieldName} is invalid.`);
  }
  return value;
}

function normalizeRate(value, fieldName) {
  if (value === null) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new Error(`User learning conflict ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`User learning conflict ${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeBinding(binding = {}) {
  const normalized = {
    caseId: normalizeText(binding.caseId),
    fixtureHash: requireHash(binding.fixtureHash, 'fixtureHash'),
    newerObjectiveHash: requireHash(binding.newerObjectiveHash, 'newerObjectiveHash'),
    newerPromotionNoteHash: requireHash(
      binding.newerPromotionNoteHash,
      'newerPromotionNoteHash',
    ),
    newerScopeAuthorizationNoteHash: requireHash(
      binding.newerScopeAuthorizationNoteHash,
      'newerScopeAuthorizationNoteHash',
    ),
    olderObjectiveHash: requireHash(binding.olderObjectiveHash, 'olderObjectiveHash'),
    olderPromotionNoteHash: requireHash(
      binding.olderPromotionNoteHash,
      'olderPromotionNoteHash',
    ),
    olderScopeAuthorizationNoteHash: requireHash(
      binding.olderScopeAuthorizationNoteHash,
      'olderScopeAuthorizationNoteHash',
    ),
    targetObjectiveHash: requireHash(binding.targetObjectiveHash, 'targetObjectiveHash'),
  };
  if (!normalized.caseId) {
    throw new Error('User learning conflict caseId is required.');
  }
  return { ...normalized, bindingHash: hashRecord(normalized) };
}

function normalizeMission(mission = {}, label) {
  const normalized = {
    id: normalizeText(mission.id),
    objectiveHash: requireHash(mission.objectiveHash, `${label} objectiveHash`),
    workspaceId: normalizeText(mission.workspaceId),
  };
  if (!normalized.id || !normalized.workspaceId) {
    throw new Error(`User learning conflict ${label} mission is incomplete.`);
  }
  return normalized;
}

function normalizeTopology(topology = {}) {
  const normalized = {
    crossWorkspaceId: normalizeText(topology.crossWorkspaceId),
    crossWorkspaceMission: normalizeMission(topology.crossWorkspaceMission, 'cross-workspace'),
    newerSourceMission: normalizeMission(topology.newerSourceMission, 'newer source'),
    olderSourceMission: normalizeMission(topology.olderSourceMission, 'older source'),
    primaryWorkspaceId: normalizeText(topology.primaryWorkspaceId),
    targetMission: normalizeMission(topology.targetMission, 'target'),
  };
  if (!normalized.crossWorkspaceId || !normalized.primaryWorkspaceId) {
    throw new Error('User learning conflict topology is incomplete.');
  }
  return normalized;
}

function normalizePromotion(promotion = {}, label) {
  const normalized = {
    candidateId: normalizeText(promotion.candidateId),
    finalStatus: normalizeText(promotion.finalStatus),
    memoryContentHash: requireHash(promotion.memoryContentHash, `${label} memoryContentHash`),
    memoryCreatedAt: requireTimestamp(promotion.memoryCreatedAt, `${label} memoryCreatedAt`),
    memoryId: normalizeText(promotion.memoryId),
    memoryRollbackStatus: normalizeText(promotion.memoryRollbackStatus),
    promotionDecisionNoteHash: requireHash(
      promotion.promotionDecisionNoteHash,
      `${label} promotionDecisionNoteHash`,
    ),
    rollbackAction: normalizeText(promotion.rollbackAction),
    rollbackStatus: normalizeText(promotion.rollbackStatus),
    scope: normalizeText(promotion.scope),
    scopeAuthorizationFromScope: normalizeText(promotion.scopeAuthorizationFromScope),
    scopeAuthorizationFromScopeId: normalizeText(promotion.scopeAuthorizationFromScopeId),
    scopeAuthorizationId: normalizeText(promotion.scopeAuthorizationId),
    scopeAuthorizationNoteHash: requireHash(
      promotion.scopeAuthorizationNoteHash,
      `${label} scopeAuthorizationNoteHash`,
    ),
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
    throw new Error(`User learning conflict ${label} promotion is incomplete.`);
  }
  return normalized;
}

function normalizeLifecycle(lifecycle = {}, label) {
  const normalized = {
    authorizationAt: requireTimestamp(lifecycle.authorizationAt, `${label} authorizationAt`),
    candidateId: normalizeText(lifecycle.candidateId),
    memoryId: normalizeText(lifecycle.memoryId),
    missionId: normalizeText(lifecycle.missionId),
    promotionAt: requireTimestamp(lifecycle.promotionAt, `${label} promotionAt`),
    rollbackAt: requireTimestamp(lifecycle.rollbackAt, `${label} rollbackAt`),
    scopeAuthorizationId: normalizeText(lifecycle.scopeAuthorizationId),
  };
  if (
    !normalized.candidateId ||
    !normalized.memoryId ||
    !normalized.missionId ||
    !normalized.scopeAuthorizationId
  ) {
    throw new Error(`User learning conflict ${label} lifecycle is incomplete.`);
  }
  return normalized;
}

function normalizeExposure(exposure = {}) {
  return {
    deliverableContainsMemory: exposure.deliverableContainsMemory === true,
    plannerPromptContainsMemory: exposure.plannerPromptContainsMemory === true,
    retrievalContainsMemory: exposure.retrievalContainsMemory === true,
  };
}

function normalizeSelection(selection, label) {
  if (selection === null || selection === undefined) {
    return null;
  }
  const candidates = (Array.isArray(selection.candidates) ? selection.candidates : []).map(
    (candidate, index) => ({
      contentHash: requireHash(candidate.contentHash, `${label} candidate ${index} contentHash`),
      effectiveAt: requireTimestamp(candidate.effectiveAt, `${label} candidate ${index} effectiveAt`),
      memoryId: normalizeText(candidate.memoryId),
      priority: requireInteger(candidate.priority, `${label} candidate ${index} priority`),
      retrievalRank: requireInteger(
        candidate.retrievalRank,
        `${label} candidate ${index} retrievalRank`,
      ),
      selected: candidate.selected === true,
    }),
  );
  const normalized = {
    candidateCount: requireInteger(selection.candidateCount, `${label} candidateCount`),
    candidates,
    policyId: normalizeText(selection.policyId),
    productionReadyClaim: selection.productionReadyClaim === true,
    reason: normalizeText(selection.reason),
    schemaVersion: normalizeText(selection.schemaVersion),
    selectedContentHash: requireHash(
      selection.selectedContentHash,
      `${label} selectedContentHash`,
    ),
    selectedMemoryId: normalizeText(selection.selectedMemoryId),
    scope: normalizeText(selection.scope),
    scopeId: normalizeText(selection.scopeId),
    status: normalizeText(selection.status),
  };
  if (
    !normalized.policyId ||
    !normalized.reason ||
    !normalized.schemaVersion ||
    !normalized.selectedMemoryId ||
    normalized.scope !== 'user' ||
    normalized.scopeId !== 'user' ||
    normalized.candidateCount !== candidates.length
  ) {
    throw new Error(`User learning conflict ${label} selection is incomplete.`);
  }
  return normalized;
}

function normalizeRun(run = {}, label) {
  const normalized = {
    artifacts: {
      deliverableHash: requireHash(run.artifacts?.deliverableHash, `${label} deliverableHash`),
      plannerHash: requireHash(run.artifacts?.plannerHash, `${label} plannerHash`),
      retrievalHash: optionalHash(run.artifacts?.retrievalHash, `${label} retrievalHash`),
    },
    externalProviderCallCount: requireInteger(
      run.externalProviderCallCount,
      `${label} externalProviderCallCount`,
    ),
    exposures: {
      newer: normalizeExposure(run.exposures?.newer),
      older: normalizeExposure(run.exposures?.older),
    },
    planStepCount: requireInteger(run.planStepCount, `${label} planStepCount`),
    providerId: normalizeText(run.providerId),
    retrieval: {
      contentHash: optionalHash(run.retrieval?.contentHash, `${label} retrieval contentHash`),
      matchTermCount: requireInteger(run.retrieval?.matchTermCount, `${label} matchTermCount`),
      scope: normalizeText(run.retrieval?.scope),
      scopeId: normalizeText(run.retrieval?.scopeId),
      sourceId: normalizeText(run.retrieval?.sourceId),
    },
    reviewerVerdict: normalizeText(run.reviewerVerdict),
    selection: normalizeSelection(run.selection, `${label} selection`),
    sessionId: normalizeText(run.sessionId),
    status: normalizeText(run.status),
  };
  if (!normalized.providerId || !normalized.reviewerVerdict || !normalized.sessionId || !normalized.status) {
    throw new Error(`User learning conflict ${label} run is incomplete.`);
  }
  return normalized;
}

function normalizeQuality(result = {}, label) {
  const normalized = {
    id: normalizeText(result.id),
    metrics: {
      expectedSourceCitationRate: normalizeRate(
        result.metrics?.expectedSourceCitationRate ?? null,
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
        result.metrics?.requiredTermCoverage ?? null,
        `${label} requiredTermCoverage`,
      ),
      retrievalHitRate: normalizeRate(
        result.metrics?.retrievalHitRate ?? null,
        `${label} retrievalHitRate`,
      ),
      unsupportedCitationRate: normalizeRate(
        result.metrics?.unsupportedCitationRate ?? null,
        `${label} unsupportedCitationRate`,
      ),
    },
    status: normalizeText(result.status),
  };
  if (!normalized.id || !['passed', 'failed'].includes(normalized.status)) {
    throw new Error(`User learning conflict ${label} quality is invalid.`);
  }
  return { ...normalized, resultHash: hashRecord(normalized) };
}

function hasExposure(run, key) {
  return Object.values(run.exposures[key]).every(Boolean);
}

function hasNoExposure(run) {
  return Object.values(run.exposures).every((exposure) =>
    Object.values(exposure).every((value) => value === false),
  );
}

function selectionMatches(run, promotion, candidateCount) {
  return (
    run.selection?.candidateCount === candidateCount &&
    run.selection?.policyId === 'user-decision-latest-revision-v1' &&
    run.selection?.productionReadyClaim === false &&
    run.selection?.selectedMemoryId === promotion.memoryId &&
    run.selection?.selectedContentHash === promotion.memoryContentHash &&
    run.selection?.status === 'selected' &&
    run.retrieval.sourceId === promotion.memoryId &&
    run.retrieval.contentHash === promotion.memoryContentHash
  );
}

function promotionMatchesUser({
  authorizationNoteHash,
  mission,
  promotion,
  promotionNoteHash,
}) {
  return (
    promotion.finalStatus === 'rolled-back' &&
    promotion.promotionDecisionNoteHash === promotionNoteHash &&
    promotion.memoryRollbackStatus === 'memory-deleted' &&
    promotion.rollbackAction === 'delete-memory-entry' &&
    promotion.rollbackStatus === 'completed' &&
    promotion.scope === 'user' &&
    promotion.scopeAuthorizationFromScope === 'mission' &&
    promotion.scopeAuthorizationFromScopeId === mission.id &&
    promotion.scopeAuthorizationNoteHash === authorizationNoteHash &&
    promotion.scopeAuthorizationStatus === 'consumed' &&
    promotion.scopeAuthorizationToScope === 'user' &&
    promotion.scopeAuthorizationToScopeId === 'user' &&
    promotion.scopeId === 'user' &&
    promotion.target === 'memory' &&
    promotion.verificationStatus === 'passed'
  );
}

function lifecycleOrdered(lifecycle, promotion, missionId) {
  return (
    lifecycle.candidateId === promotion.candidateId &&
    lifecycle.memoryId === promotion.memoryId &&
    lifecycle.missionId === missionId &&
    lifecycle.scopeAuthorizationId === promotion.scopeAuthorizationId &&
    Date.parse(lifecycle.authorizationAt) <= Date.parse(lifecycle.promotionAt) &&
    Date.parse(lifecycle.promotionAt) <= Date.parse(lifecycle.rollbackAt)
  );
}

function buildContent(input = {}) {
  const fixtureBinding = normalizeBinding(input.fixtureBinding);
  const topology = normalizeTopology(input.topology);
  const promotions = {
    newer: normalizePromotion(input.promotions?.newer, 'newer'),
    older: normalizePromotion(input.promotions?.older, 'older'),
  };
  const lifecycle = {
    newer: normalizeLifecycle(input.lifecycle?.newer, 'newer'),
    older: normalizeLifecycle(input.lifecycle?.older, 'older'),
  };
  const phases = {
    afterFullRollback: normalizeRun(input.phases?.afterFullRollback, 'afterFullRollback'),
    afterNewerRevocation: normalizeRun(
      input.phases?.afterNewerRevocation,
      'afterNewerRevocation',
    ),
    baseline: normalizeRun(input.phases?.baseline, 'baseline'),
    conflict: normalizeRun(input.phases?.conflict, 'conflict'),
    crossWorkspaceConflict: normalizeRun(
      input.phases?.crossWorkspaceConflict,
      'crossWorkspaceConflict',
    ),
    olderOnly: normalizeRun(input.phases?.olderOnly, 'olderOnly'),
  };
  const sourceRuns = {
    newer: normalizeRun(input.sourceRuns?.newer, 'newer source'),
    older: normalizeRun(input.sourceRuns?.older, 'older source'),
  };
  const quality = {
    afterFullRollback: normalizeQuality(input.quality?.afterFullRollback, 'afterFullRollback'),
    afterNewerRevocation: normalizeQuality(
      input.quality?.afterNewerRevocation,
      'afterNewerRevocation',
    ),
    baseline: normalizeQuality(input.quality?.baseline, 'baseline'),
    conflict: normalizeQuality(input.quality?.conflict, 'conflict'),
    crossWorkspaceConflict: normalizeQuality(
      input.quality?.crossWorkspaceConflict,
      'crossWorkspaceConflict',
    ),
    olderOnly: normalizeQuality(input.quality?.olderOnly, 'olderOnly'),
  };
  const observedAt = requireTimestamp(input.observedAt, 'observedAt');
  const runList = [...Object.values(sourceRuns), ...Object.values(phases)];

  const topologyBound =
    topology.primaryWorkspaceId !== topology.crossWorkspaceId &&
    topology.olderSourceMission.workspaceId === topology.primaryWorkspaceId &&
    topology.newerSourceMission.workspaceId === topology.crossWorkspaceId &&
    topology.targetMission.workspaceId === topology.primaryWorkspaceId &&
    topology.crossWorkspaceMission.workspaceId === topology.crossWorkspaceId &&
    new Set([
      topology.olderSourceMission.id,
      topology.newerSourceMission.id,
      topology.targetMission.id,
      topology.crossWorkspaceMission.id,
    ]).size === 4 &&
    topology.olderSourceMission.objectiveHash === fixtureBinding.olderObjectiveHash &&
    topology.newerSourceMission.objectiveHash === fixtureBinding.newerObjectiveHash &&
    topology.targetMission.objectiveHash === fixtureBinding.targetObjectiveHash &&
    topology.crossWorkspaceMission.objectiveHash === fixtureBinding.targetObjectiveHash;
  const promotionsVerified =
    promotionMatchesUser({
      authorizationNoteHash: fixtureBinding.olderScopeAuthorizationNoteHash,
      mission: topology.olderSourceMission,
      promotion: promotions.older,
      promotionNoteHash: fixtureBinding.olderPromotionNoteHash,
    }) &&
    promotionMatchesUser({
      authorizationNoteHash: fixtureBinding.newerScopeAuthorizationNoteHash,
      mission: topology.newerSourceMission,
      promotion: promotions.newer,
      promotionNoteHash: fixtureBinding.newerPromotionNoteHash,
    }) &&
    Date.parse(promotions.older.memoryCreatedAt) < Date.parse(promotions.newer.memoryCreatedAt);
  const lifecycleAuditOrdered =
    lifecycleOrdered(lifecycle.older, promotions.older, topology.olderSourceMission.id) &&
    lifecycleOrdered(lifecycle.newer, promotions.newer, topology.newerSourceMission.id) &&
    Date.parse(lifecycle.older.promotionAt) < Date.parse(lifecycle.newer.promotionAt) &&
    Date.parse(lifecycle.newer.rollbackAt) < Date.parse(lifecycle.older.rollbackAt);
  const baselineClean =
    phases.baseline.selection === null &&
    hasNoExposure(phases.baseline) &&
    phases.baseline.artifacts.retrievalHash === null &&
    quality.baseline.status === 'failed';
  const olderSelectedAlone =
    selectionMatches(phases.olderOnly, promotions.older, 1) &&
    hasExposure(phases.olderOnly, 'older') &&
    Object.values(phases.olderOnly.exposures.newer).every((value) => value === false) &&
    phases.olderOnly.selection.candidates[0]?.selected === true &&
    quality.olderOnly.status === 'passed';
  const newerWinsConflict =
    selectionMatches(phases.conflict, promotions.newer, 2) &&
    hasExposure(phases.conflict, 'newer') &&
    Object.values(phases.conflict.exposures.older).every((value) => value === false) &&
    phases.conflict.selection.candidates[0]?.memoryId === promotions.newer.memoryId &&
    phases.conflict.selection.candidates[0]?.priority === 1 &&
    phases.conflict.selection.candidates[1]?.memoryId === promotions.older.memoryId &&
    phases.conflict.selection.candidates[1]?.priority === 2 &&
    quality.conflict.status === 'passed';
  const crossWorkspaceConflictApplied =
    selectionMatches(phases.crossWorkspaceConflict, promotions.newer, 2) &&
    hasExposure(phases.crossWorkspaceConflict, 'newer') &&
    Object.values(phases.crossWorkspaceConflict.exposures.older).every(
      (value) => value === false,
    ) &&
    quality.crossWorkspaceConflict.status === 'passed';
  const newerRevocationFallsBack =
    selectionMatches(phases.afterNewerRevocation, promotions.older, 1) &&
    hasExposure(phases.afterNewerRevocation, 'older') &&
    Object.values(phases.afterNewerRevocation.exposures.newer).every(
      (value) => value === false,
    ) &&
    phases.afterNewerRevocation.artifacts.deliverableHash ===
      phases.olderOnly.artifacts.deliverableHash &&
    phases.afterNewerRevocation.artifacts.plannerHash ===
      phases.olderOnly.artifacts.plannerHash &&
    quality.afterNewerRevocation.resultHash === quality.olderOnly.resultHash;
  const fullRollbackRestoresBaseline =
    phases.afterFullRollback.selection === null &&
    hasNoExposure(phases.afterFullRollback) &&
    phases.afterFullRollback.artifacts.retrievalHash === null &&
    phases.afterFullRollback.artifacts.deliverableHash ===
      phases.baseline.artifacts.deliverableHash &&
    phases.afterFullRollback.artifacts.plannerHash === phases.baseline.artifacts.plannerHash &&
    quality.afterFullRollback.resultHash === quality.baseline.resultHash;
  const reviewerPassPreserved = runList.every((run) => run.reviewerVerdict === 'pass');
  const externalProviderIsolationPassed = runList.every(
    (run) => run.providerId === 'stub' && run.externalProviderCallCount === 0,
  );
  const distinctSessionsPassed = new Set(runList.map((run) => run.sessionId)).size === runList.length;
  const results = {
    baselineClean,
    crossWorkspaceConflictApplied,
    distinctSessionsPassed,
    externalProviderIsolationPassed,
    fullRollbackRestoresBaseline,
    lifecycleAuditOrdered,
    newerRevocationFallsBack,
    newerWinsConflict,
    olderSelectedAlone,
    promotionsVerified,
    reviewerPassPreserved,
    topologyBound,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualUserLearningConflictRevocationValidated: validated,
    costFree: true,
    externalProviderCalls: 'none',
    fixtureBinding,
    lifecycle,
    observedAt,
    phases,
    productionReadyClaim: false,
    promotions,
    quality,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      controlledCrossWorkspaceUserSelectionValidated: validated,
      controlledUserConflictResolutionValidated: validated,
      controlledUserRevocationFallbackValidated: validated,
      generalAnswerQualityImprovementValidated: false,
      generalUserPersonalizationValidated: false,
      hostedTenantUserPersonalizationValidated: false,
      learnedConflictResolutionValidated: false,
      multiUserIsolationValidated: false,
    },
    results,
    schemaVersion: USER_LEARNING_CONFLICT_REVOCATION_SCHEMA_VERSION,
    sourceRuns,
    status: validated
      ? 'user-learning-conflict-revocation-passed-local-only'
      : 'failed-keep-single-user-decision-only',
    topology,
  };
}

export function buildUserLearningConflictRevocationEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `user-learning-conflict-revocation-${evidenceHash}`,
  };
}

export function assertUserLearningConflictRevocationEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `user-learning-conflict-revocation-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      fixtureBinding: evidence?.fixtureBinding,
      lifecycle: evidence?.lifecycle,
      observedAt: evidence?.observedAt,
      phases: evidence?.phases,
      promotions: evidence?.promotions,
      quality: evidence?.quality,
      sourceRuns: evidence?.sourceRuns,
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
    evidence?.qualityBoundary?.learnedConflictResolutionValidated !== false ||
    evidence?.qualityBoundary?.multiUserIsolationValidated !== false
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `User learning conflict evidence failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
