import { createHash } from 'node:crypto';

export const WORKSPACE_LEARNING_OPERATOR_OVERRIDE_SCHEMA_VERSION =
  'personal-ai-agent-workspace-learning-operator-override/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function text(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = text(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Workspace learning operator override ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = text(value);
  if (!normalized || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(`Workspace learning operator override ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Workspace learning operator override ${fieldName} is invalid.`);
  }
  return value;
}

function normalizeBinding(value = {}) {
  const normalized = {
    caseId: text(value.caseId),
    clearOverrideNoteHash: requireHash(value.clearOverrideNoteHash, 'clearOverrideNoteHash'),
    firstOverrideNoteHash: requireHash(value.firstOverrideNoteHash, 'firstOverrideNoteHash'),
    fixtureHash: requireHash(value.fixtureHash, 'fixtureHash'),
    newerObjectiveHash: requireHash(value.newerObjectiveHash, 'newerObjectiveHash'),
    newerPromotionNoteHash: requireHash(value.newerPromotionNoteHash, 'newerPromotionNoteHash'),
    olderObjectiveHash: requireHash(value.olderObjectiveHash, 'olderObjectiveHash'),
    olderPromotionNoteHash: requireHash(value.olderPromotionNoteHash, 'olderPromotionNoteHash'),
    secondOverrideNoteHash: requireHash(value.secondOverrideNoteHash, 'secondOverrideNoteHash'),
    targetObjectiveHash: requireHash(value.targetObjectiveHash, 'targetObjectiveHash'),
  };
  if (!normalized.caseId) {
    throw new Error('Workspace learning operator override caseId is required.');
  }
  return { ...normalized, bindingHash: hashRecord(normalized) };
}

function normalizeMission(value = {}, label) {
  const normalized = {
    id: text(value.id),
    objectiveHash: requireHash(value.objectiveHash, `${label} objectiveHash`),
    workspaceId: text(value.workspaceId),
  };
  if (!normalized.id || !normalized.workspaceId) {
    throw new Error(`Workspace learning operator override ${label} mission is incomplete.`);
  }
  return normalized;
}

function normalizePromotion(value = {}, label) {
  const normalized = {
    candidateId: text(value.candidateId),
    memoryContentHash: requireHash(value.memoryContentHash, `${label} memoryContentHash`),
    memoryCreatedAt: requireTimestamp(value.memoryCreatedAt, `${label} memoryCreatedAt`),
    memoryId: text(value.memoryId),
    promotionNoteHash: requireHash(value.promotionNoteHash, `${label} promotionNoteHash`),
    promotionStatus: text(value.promotionStatus),
    scope: text(value.scope),
    scopeAuthorizationStatus: text(value.scopeAuthorizationStatus),
    scopeId: text(value.scopeId),
    target: text(value.target),
    verificationId: text(value.verificationId),
    verificationStatus: text(value.verificationStatus),
  };
  if (!normalized.candidateId || !normalized.memoryId || !normalized.scopeId || !normalized.verificationId) {
    throw new Error(`Workspace learning operator override ${label} promotion is incomplete.`);
  }
  return normalized;
}

function normalizeOverrideEvent(value = {}, label) {
  const action = text(value.action);
  const normalized = {
    action,
    at: requireTimestamp(value.at, `${label} at`),
    expiresAt: action === 'set' ? requireTimestamp(value.expiresAt, `${label} expiresAt`) : null,
    memoryId: text(value.memoryId),
    noteHash: requireHash(value.noteHash, `${label} noteHash`),
    overrideId: text(value.overrideId),
    performedBy: text(value.performedBy),
    workspaceId: text(value.workspaceId),
  };
  if (
    !['set', 'clear'].includes(action) ||
    !normalized.memoryId ||
    !normalized.overrideId ||
    !normalized.performedBy ||
    !normalized.workspaceId
  ) {
    throw new Error(`Workspace learning operator override ${label} event is incomplete.`);
  }
  return normalized;
}

function normalizeSelection(value, label) {
  if (value === null || value === undefined) {
    return null;
  }
  const candidates = (Array.isArray(value.candidates) ? value.candidates : []).map(
    (candidate, index) => ({
      contentHash: requireHash(candidate.contentHash, `${label} candidate ${index} contentHash`),
      effectiveAt: requireTimestamp(candidate.effectiveAt, `${label} candidate ${index} effectiveAt`),
      memoryId: text(candidate.memoryId),
      priority: requireInteger(candidate.priority, `${label} candidate ${index} priority`),
      retrievalRank: requireInteger(
        candidate.retrievalRank,
        `${label} candidate ${index} retrievalRank`,
      ),
      selected: candidate.selected === true,
    }),
  );
  const overrideEvaluation = value.overrideEvaluation
    ? {
        activeCount: requireInteger(value.overrideEvaluation.activeCount, `${label} activeCount`),
        clearedCount: requireInteger(value.overrideEvaluation.clearedCount, `${label} clearedCount`),
        expiredCount: requireInteger(value.overrideEvaluation.expiredCount, `${label} expiredCount`),
        invalidCount: requireInteger(value.overrideEvaluation.invalidCount, `${label} invalidCount`),
        records: (value.overrideEvaluation.records || []).map((record, index) => ({
          candidateId: text(record.candidateId),
          expiresAt: requireTimestamp(record.expiresAt, `${label} override ${index} expiresAt`),
          id: text(record.id),
          memoryId: text(record.memoryId),
          noteHash: requireHash(record.noteHash, `${label} override ${index} noteHash`),
          setAt: requireTimestamp(record.setAt, `${label} override ${index} setAt`),
          status: text(record.status),
          workspaceId: text(record.workspaceId),
        })),
        currentOverrideId: value.overrideEvaluation.currentOverrideId || null,
        selectedOverrideId: value.overrideEvaluation.selectedOverrideId || null,
        unretrievedActiveCount: requireInteger(
          value.overrideEvaluation.unretrievedActiveCount,
          `${label} unretrievedActiveCount`,
        ),
      }
    : null;
  const normalized = {
    candidateCount: requireInteger(value.candidateCount, `${label} candidateCount`),
    candidates,
    overrideEvaluation,
    policyId: text(value.policyId),
    productionReadyClaim: value.productionReadyClaim === true,
    schemaVersion: text(value.schemaVersion),
    selectedContentHash: requireHash(value.selectedContentHash, `${label} selectedContentHash`),
    selectedMemoryId: text(value.selectedMemoryId),
    selectionSource: text(value.selectionSource),
    status: text(value.status),
    workspaceId: text(value.workspaceId),
  };
  if (
    normalized.candidateCount !== candidates.length ||
    !normalized.policyId ||
    !normalized.schemaVersion ||
    !normalized.selectedMemoryId ||
    !normalized.workspaceId
  ) {
    throw new Error(`Workspace learning operator override ${label} selection is incomplete.`);
  }
  return normalized;
}

function normalizeExposure(value = {}) {
  return {
    deliverableContainsMemory: value.deliverableContainsMemory === true,
    plannerPromptContainsMemory: value.plannerPromptContainsMemory === true,
    retrievalContainsMemory: value.retrievalContainsMemory === true,
  };
}

function normalizeRun(value = {}, label) {
  const normalized = {
    artifacts: {
      deliverableHash: requireHash(value.artifacts?.deliverableHash, `${label} deliverableHash`),
      plannerHash: requireHash(value.artifacts?.plannerHash, `${label} plannerHash`),
    },
    externalProviderCallCount: requireInteger(
      value.externalProviderCallCount,
      `${label} externalProviderCallCount`,
    ),
    exposures: {
      newer: normalizeExposure(value.exposures?.newer),
      older: normalizeExposure(value.exposures?.older),
    },
    providerId: text(value.providerId),
    reviewerVerdict: text(value.reviewerVerdict),
    selection: normalizeSelection(value.selection, `${label} selection`),
    sessionId: text(value.sessionId),
    status: text(value.status),
  };
  if (!normalized.providerId || !normalized.reviewerVerdict || !normalized.sessionId || !normalized.status) {
    throw new Error(`Workspace learning operator override ${label} run is incomplete.`);
  }
  return normalized;
}

function normalizeQuality(value = {}, label) {
  const normalized = {
    id: text(value.id),
    metricsHash: requireHash(value.metricsHash, `${label} metricsHash`),
    status: text(value.status),
  };
  if (!normalized.id || !['passed', 'failed'].includes(normalized.status)) {
    throw new Error(`Workspace learning operator override ${label} quality is invalid.`);
  }
  return { ...normalized, resultHash: hashRecord(normalized) };
}

function hasExposure(run, kind) {
  return Object.values(run.exposures[kind]).every(Boolean);
}

function hasNoExposure(run) {
  return Object.values(run.exposures).every((exposure) =>
    Object.values(exposure).every((value) => value === false),
  );
}

function selectedBy(run, { contentHash, memoryId, policyId, source }) {
  return (
    run.selection?.candidateCount === 2 &&
    run.selection?.policyId === policyId &&
    run.selection?.productionReadyClaim === false &&
    run.selection?.selectedContentHash === contentHash &&
    run.selection?.selectedMemoryId === memoryId &&
    run.selection?.selectionSource === source &&
    run.selection?.status === 'selected'
  );
}

function buildContent(input = {}) {
  const fixtureBinding = normalizeBinding(input.fixtureBinding);
  const topology = {
    foreignMission: normalizeMission(input.topology?.foreignMission, 'foreign'),
    foreignWorkspaceId: text(input.topology?.foreignWorkspaceId),
    newerSourceMission: normalizeMission(input.topology?.newerSourceMission, 'newer source'),
    olderSourceMission: normalizeMission(input.topology?.olderSourceMission, 'older source'),
    sourceWorkspaceId: text(input.topology?.sourceWorkspaceId),
    targetMission: normalizeMission(input.topology?.targetMission, 'target'),
  };
  const promotions = {
    newer: normalizePromotion(input.promotions?.newer, 'newer'),
    older: normalizePromotion(input.promotions?.older, 'older'),
  };
  const overrideLifecycle = {
    cleared: normalizeOverrideEvent(input.overrideLifecycle?.cleared, 'cleared'),
    expiredObservedAt: requireTimestamp(
      input.overrideLifecycle?.expiredObservedAt,
      'expiredObservedAt',
    ),
    firstSet: normalizeOverrideEvent(input.overrideLifecycle?.firstSet, 'firstSet'),
    secondSet: normalizeOverrideEvent(input.overrideLifecycle?.secondSet, 'secondSet'),
  };
  const phases = Object.fromEntries(
    ['activeOverride', 'baseline', 'cleared', 'expired', 'foreignActive', 'repinned'].map(
      (name) => [name, normalizeRun(input.phases?.[name], name)],
    ),
  );
  const sourceRuns = {
    newer: normalizeRun(input.sourceRuns?.newer, 'newer source'),
    older: normalizeRun(input.sourceRuns?.older, 'older source'),
  };
  const quality = Object.fromEntries(
    ['activeOverride', 'baseline', 'cleared', 'expired', 'foreignActive', 'repinned'].map(
      (name) => [name, normalizeQuality(input.quality?.[name], name)],
    ),
  );
  const timeline = (input.timeline || []).map((event, index) => ({
    at: requireTimestamp(event.at, `timeline ${index} at`),
    index: requireInteger(event.index, `timeline ${index} index`),
    kind: text(event.kind),
    overrideId: text(event.overrideId),
  }));
  const observedAt = requireTimestamp(input.observedAt, 'observedAt');
  const runs = [...Object.values(sourceRuns), ...Object.values(phases)];

  const topologyBound =
    topology.sourceWorkspaceId &&
    topology.foreignWorkspaceId &&
    topology.sourceWorkspaceId !== topology.foreignWorkspaceId &&
    topology.olderSourceMission.workspaceId === topology.sourceWorkspaceId &&
    topology.newerSourceMission.workspaceId === topology.sourceWorkspaceId &&
    topology.targetMission.workspaceId === topology.sourceWorkspaceId &&
    topology.foreignMission.workspaceId === topology.foreignWorkspaceId &&
    new Set(Object.values(topology).filter((item) => item?.id).map((mission) => mission.id)).size === 4 &&
    topology.olderSourceMission.objectiveHash === fixtureBinding.olderObjectiveHash &&
    topology.newerSourceMission.objectiveHash === fixtureBinding.newerObjectiveHash &&
    topology.targetMission.objectiveHash === fixtureBinding.targetObjectiveHash &&
    topology.foreignMission.objectiveHash === fixtureBinding.targetObjectiveHash;
  const promotionsVerified =
    Object.values(promotions).every(
      (promotion) =>
        promotion.promotionStatus === 'promoted' &&
        promotion.scope === 'workspace' &&
        promotion.scopeAuthorizationStatus === 'consumed' &&
        promotion.scopeId === topology.sourceWorkspaceId &&
        promotion.target === 'memory' &&
        promotion.verificationStatus === 'passed',
    ) &&
    promotions.older.promotionNoteHash === fixtureBinding.olderPromotionNoteHash &&
    promotions.newer.promotionNoteHash === fixtureBinding.newerPromotionNoteHash &&
    Date.parse(promotions.older.memoryCreatedAt) < Date.parse(promotions.newer.memoryCreatedAt);
  const lifecycleOrdered =
    overrideLifecycle.firstSet.action === 'set' &&
    overrideLifecycle.secondSet.action === 'set' &&
    overrideLifecycle.cleared.action === 'clear' &&
    overrideLifecycle.firstSet.memoryId === promotions.older.memoryId &&
    overrideLifecycle.secondSet.memoryId === promotions.older.memoryId &&
    overrideLifecycle.cleared.memoryId === promotions.older.memoryId &&
    overrideLifecycle.firstSet.noteHash === fixtureBinding.firstOverrideNoteHash &&
    overrideLifecycle.secondSet.noteHash === fixtureBinding.secondOverrideNoteHash &&
    overrideLifecycle.cleared.noteHash === fixtureBinding.clearOverrideNoteHash &&
    Date.parse(overrideLifecycle.firstSet.at) < Date.parse(overrideLifecycle.expiredObservedAt) &&
    Date.parse(overrideLifecycle.firstSet.expiresAt) <= Date.parse(overrideLifecycle.expiredObservedAt) &&
    Date.parse(overrideLifecycle.expiredObservedAt) < Date.parse(overrideLifecycle.secondSet.at) &&
    Date.parse(overrideLifecycle.secondSet.at) <= Date.parse(overrideLifecycle.cleared.at) &&
    timeline.length === 3 &&
    timeline[0]?.kind === 'workspace-learning-selection-override-set' &&
    timeline[1]?.kind === 'workspace-learning-selection-override-set' &&
    timeline[2]?.kind === 'workspace-learning-selection-override-cleared' &&
    timeline[0].overrideId === overrideLifecycle.firstSet.overrideId &&
    timeline[1].overrideId === overrideLifecycle.secondSet.overrideId &&
    timeline[2].overrideId === overrideLifecycle.cleared.overrideId &&
    timeline[0].at === overrideLifecycle.firstSet.at &&
    timeline[1].at === overrideLifecycle.secondSet.at &&
    timeline[2].at === overrideLifecycle.cleared.at &&
    timeline[0].index < timeline[1].index &&
    timeline[1].index < timeline[2].index;
  const baselineLatest =
    selectedBy(phases.baseline, {
      contentHash: promotions.newer.memoryContentHash,
      memoryId: promotions.newer.memoryId,
      policyId: 'workspace-decision-latest-revision-v1',
      source: '',
    }) &&
    hasExposure(phases.baseline, 'newer') &&
    Object.values(phases.baseline.exposures.older).every((value) => value === false);
  const activeOverrideApplied =
    selectedBy(phases.activeOverride, {
      contentHash: promotions.older.memoryContentHash,
      memoryId: promotions.older.memoryId,
      policyId: 'workspace-decision-operator-override-v1',
      source: 'operator-override',
    }) &&
    phases.activeOverride.selection.overrideEvaluation?.activeCount === 1 &&
    phases.activeOverride.selection.overrideEvaluation?.selectedOverrideId ===
      overrideLifecycle.firstSet.overrideId &&
    hasExposure(phases.activeOverride, 'older') &&
    Object.values(phases.activeOverride.exposures.newer).every((value) => value === false);
  const foreignWorkspaceIsolated =
    phases.foreignActive.selection === null &&
    hasNoExposure(phases.foreignActive) &&
    quality.foreignActive.status === 'passed';
  const expirationFallsBack =
    selectedBy(phases.expired, {
      contentHash: promotions.newer.memoryContentHash,
      memoryId: promotions.newer.memoryId,
      policyId: 'workspace-decision-latest-revision-v1',
      source: 'latest-revision-fallback',
    }) &&
    phases.expired.selection.overrideEvaluation?.expiredCount === 1 &&
    phases.expired.selection.overrideEvaluation?.selectedOverrideId === null &&
    phases.expired.artifacts.plannerHash === phases.baseline.artifacts.plannerHash &&
    phases.expired.artifacts.deliverableHash === phases.baseline.artifacts.deliverableHash &&
    quality.expired.resultHash === quality.baseline.resultHash;
  const repinApplied =
    selectedBy(phases.repinned, {
      contentHash: promotions.older.memoryContentHash,
      memoryId: promotions.older.memoryId,
      policyId: 'workspace-decision-operator-override-v1',
      source: 'operator-override',
    }) &&
    phases.repinned.selection.overrideEvaluation?.selectedOverrideId ===
      overrideLifecycle.secondSet.overrideId &&
    phases.repinned.artifacts.plannerHash === phases.activeOverride.artifacts.plannerHash &&
    phases.repinned.artifacts.deliverableHash === phases.activeOverride.artifacts.deliverableHash &&
    quality.repinned.resultHash === quality.activeOverride.resultHash;
  const clearRestoresLatest =
    selectedBy(phases.cleared, {
      contentHash: promotions.newer.memoryContentHash,
      memoryId: promotions.newer.memoryId,
      policyId: 'workspace-decision-latest-revision-v1',
      source: 'latest-revision-fallback',
    }) &&
    phases.cleared.selection.overrideEvaluation?.clearedCount === 1 &&
    phases.cleared.selection.overrideEvaluation?.selectedOverrideId === null &&
    phases.cleared.artifacts.plannerHash === phases.baseline.artifacts.plannerHash &&
    phases.cleared.artifacts.deliverableHash === phases.baseline.artifacts.deliverableHash &&
    quality.cleared.resultHash === quality.baseline.resultHash;
  const reviewerPassPreserved = runs.every((run) => run.reviewerVerdict === 'pass');
  const externalProviderIsolationPassed = runs.every(
    (run) => run.providerId === 'stub' && run.externalProviderCallCount === 0,
  );
  const distinctSessionsPassed = new Set(runs.map((run) => run.sessionId)).size === runs.length;
  const results = {
    activeOverrideApplied,
    baselineLatest,
    clearRestoresLatest,
    distinctSessionsPassed,
    expirationFallsBack,
    externalProviderIsolationPassed,
    foreignWorkspaceIsolated,
    lifecycleOrdered,
    promotionsVerified,
    repinApplied,
    reviewerPassPreserved,
    topologyBound,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualWorkspaceLearningOperatorOverrideValidated: validated,
    costFree: true,
    externalProviderCalls: 'none',
    fixtureBinding,
    observedAt,
    overrideLifecycle,
    phases,
    productionReadyClaim: false,
    promotions,
    quality,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      controlledOperatorOverrideValidated: validated,
      generalAnswerQualityImprovementValidated: false,
      generalWorkspacePersonalizationValidated: false,
      learnedConflictResolutionValidated: false,
      userScopedPersonalizationValidated: false,
    },
    results,
    schemaVersion: WORKSPACE_LEARNING_OPERATOR_OVERRIDE_SCHEMA_VERSION,
    sourceRuns,
    status: validated
      ? 'workspace-learning-operator-override-passed-local-only'
      : 'failed-keep-latest-revision-only',
    timeline,
    topology,
  };
}

export function buildWorkspaceLearningOperatorOverrideEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `workspace-learning-operator-override-${evidenceHash}`,
  };
}

export function assertWorkspaceLearningOperatorOverrideEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evidenceHash !== expectedHash || id !== `workspace-learning-operator-override-${expectedHash}`) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent(evidence);
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
    evidence?.qualityBoundary?.generalWorkspacePersonalizationValidated !== false ||
    evidence?.qualityBoundary?.learnedConflictResolutionValidated !== false ||
    evidence?.qualityBoundary?.userScopedPersonalizationValidated !== false
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Workspace learning operator override evidence failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
