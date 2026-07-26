import { createHash } from 'node:crypto';

export const USER_LEARNING_OPERATOR_OVERRIDE_SCHEMA_VERSION =
  'personal-ai-agent-user-learning-operator-override/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function text(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = text(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`User learning operator override ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = text(value);
  if (!normalized || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(`User learning operator override ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`User learning operator override ${fieldName} is invalid.`);
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
    throw new Error('User learning operator override caseId is required.');
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
    throw new Error(`User learning operator override ${label} mission is incomplete.`);
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
  if (!normalized.candidateId || !normalized.memoryId || !normalized.verificationId) {
    throw new Error(`User learning operator override ${label} promotion is incomplete.`);
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
    scope: text(value.scope),
    scopeId: text(value.scopeId),
  };
  if (
    !['set', 'clear'].includes(action) ||
    !normalized.memoryId ||
    !normalized.overrideId ||
    !normalized.performedBy
  ) {
    throw new Error(`User learning operator override ${label} event is incomplete.`);
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
        currentOverrideId: value.overrideEvaluation.currentOverrideId || null,
        expiredCount: requireInteger(value.overrideEvaluation.expiredCount, `${label} expiredCount`),
        invalidCount: requireInteger(value.overrideEvaluation.invalidCount, `${label} invalidCount`),
        records: (value.overrideEvaluation.records || []).map((record, index) => ({
          candidateId: text(record.candidateId),
          expiresAt: requireTimestamp(record.expiresAt, `${label} override ${index} expiresAt`),
          id: text(record.id),
          memoryId: text(record.memoryId),
          noteHash: requireHash(record.noteHash, `${label} override ${index} noteHash`),
          scope: text(record.scope),
          scopeId: text(record.scopeId),
          setAt: requireTimestamp(record.setAt, `${label} override ${index} setAt`),
          status: text(record.status),
        })),
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
    scope: text(value.scope),
    scopeId: text(value.scopeId),
    selectedContentHash: requireHash(value.selectedContentHash, `${label} selectedContentHash`),
    selectedMemoryId: text(value.selectedMemoryId),
    selectionSource: text(value.selectionSource),
    status: text(value.status),
  };
  if (
    normalized.candidateCount !== candidates.length ||
    !normalized.policyId ||
    !normalized.schemaVersion ||
    !normalized.selectedMemoryId
  ) {
    throw new Error(`User learning operator override ${label} selection is incomplete.`);
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
  if (!normalized.providerId || !normalized.reviewerVerdict || !normalized.sessionId) {
    throw new Error(`User learning operator override ${label} run is incomplete.`);
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
    throw new Error(`User learning operator override ${label} quality is invalid.`);
  }
  return normalized;
}

function sameArtifacts(left, right) {
  return (
    left.artifacts.plannerHash === right.artifacts.plannerHash &&
    left.artifacts.deliverableHash === right.artifacts.deliverableHash
  );
}

function hasOnlySelectedExposure(run, selected) {
  const selectedExposure = run.exposures[selected];
  const otherExposure = run.exposures[selected === 'older' ? 'newer' : 'older'];
  return (
    Object.values(selectedExposure).every(Boolean) &&
    Object.values(otherExposure).every((value) => value === false)
  );
}

function isSelection(run, { memoryId, policyId, source = '' }) {
  return (
    run.selection?.candidateCount === 2 &&
    run.selection.selectedMemoryId === memoryId &&
    run.selection.policyId === policyId &&
    (!source || run.selection.selectionSource === source)
  );
}

function buildContent(input = {}) {
  const fixtureBinding = normalizeBinding(input.fixtureBinding);
  const topology = {
    crossWorkspaceId: text(input.topology?.crossWorkspaceId),
    crossWorkspaceMission: normalizeMission(
      input.topology?.crossWorkspaceMission,
      'crossWorkspaceMission',
    ),
    newerSourceMission: normalizeMission(input.topology?.newerSourceMission, 'newerSourceMission'),
    olderSourceMission: normalizeMission(input.topology?.olderSourceMission, 'olderSourceMission'),
    sourceWorkspaceId: text(input.topology?.sourceWorkspaceId),
    targetMission: normalizeMission(input.topology?.targetMission, 'targetMission'),
  };
  if (!topology.crossWorkspaceId || !topology.sourceWorkspaceId) {
    throw new Error('User learning operator override topology is incomplete.');
  }
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
  const phaseNames = [
    'activeOverride',
    'baseline',
    'cleared',
    'crossWorkspaceActive',
    'expired',
    'repinned',
  ];
  const phases = Object.fromEntries(
    phaseNames.map((name) => [name, normalizeRun(input.phases?.[name], name)]),
  );
  const sourceRuns = {
    newer: normalizeRun(input.sourceRuns?.newer, 'newer source'),
    older: normalizeRun(input.sourceRuns?.older, 'older source'),
  };
  const quality = Object.fromEntries(
    phaseNames.map((name) => [name, normalizeQuality(input.quality?.[name], name)]),
  );
  const timeline = (Array.isArray(input.timeline) ? input.timeline : []).map((event, index) => ({
    at: requireTimestamp(event.at, `timeline ${index} at`),
    index: requireInteger(event.index, `timeline ${index} index`),
    kind: text(event.kind),
    overrideId: text(event.overrideId),
  }));
  const allRuns = [...Object.values(sourceRuns), ...Object.values(phases)];
  const sessionIds = allRuns.map((run) => run.sessionId);
  const olderMemoryId = promotions.older.memoryId;
  const newerMemoryId = promotions.newer.memoryId;
  const latestPolicy = 'user-decision-latest-revision-v1';
  const overridePolicy = 'user-decision-operator-override-v1';
  const results = {
    activeOverride:
      isSelection(phases.activeOverride, {
        memoryId: olderMemoryId,
        policyId: overridePolicy,
        source: 'operator-override',
      }) && hasOnlySelectedExposure(phases.activeOverride, 'older'),
    baselineLatest:
      isSelection(phases.baseline, { memoryId: newerMemoryId, policyId: latestPolicy }) &&
      hasOnlySelectedExposure(phases.baseline, 'newer'),
    clearedFallback:
      isSelection(phases.cleared, {
        memoryId: newerMemoryId,
        policyId: latestPolicy,
        source: 'latest-revision-fallback',
      }) &&
      hasOnlySelectedExposure(phases.cleared, 'newer') &&
      sameArtifacts(phases.baseline, phases.cleared),
    crossWorkspaceOverride:
      isSelection(phases.crossWorkspaceActive, {
        memoryId: olderMemoryId,
        policyId: overridePolicy,
        source: 'operator-override',
      }) && hasOnlySelectedExposure(phases.crossWorkspaceActive, 'older'),
    expiredFallback:
      isSelection(phases.expired, {
        memoryId: newerMemoryId,
        policyId: latestPolicy,
        source: 'latest-revision-fallback',
      }) &&
      hasOnlySelectedExposure(phases.expired, 'newer') &&
      sameArtifacts(phases.baseline, phases.expired),
    lifecycle:
      overrideLifecycle.firstSet.action === 'set' &&
      overrideLifecycle.secondSet.action === 'set' &&
      overrideLifecycle.cleared.action === 'clear' &&
      overrideLifecycle.firstSet.memoryId === olderMemoryId &&
      overrideLifecycle.secondSet.memoryId === olderMemoryId &&
      overrideLifecycle.cleared.memoryId === olderMemoryId &&
      timeline.length === 3 &&
      timeline[0].kind === 'user-learning-selection-override-set' &&
      timeline[1].kind === 'user-learning-selection-override-set' &&
      timeline[2].kind === 'user-learning-selection-override-cleared' &&
      timeline[0].index < timeline[1].index &&
      timeline[1].index < timeline[2].index,
    promotions:
      Object.values(promotions).every(
        (promotion) =>
          promotion.promotionStatus === 'promoted' &&
          promotion.verificationStatus === 'passed' &&
          promotion.scopeAuthorizationStatus === 'consumed' &&
          promotion.target === 'memory' &&
          promotion.scope === 'user' &&
          promotion.scopeId === 'user',
      ),
    quality: Object.values(quality).every((result) => result.status === 'passed'),
    repinned:
      isSelection(phases.repinned, {
        memoryId: olderMemoryId,
        policyId: overridePolicy,
        source: 'operator-override',
      }) &&
      hasOnlySelectedExposure(phases.repinned, 'older') &&
      sameArtifacts(phases.activeOverride, phases.repinned),
    sessionIsolation: sessionIds.length === 8 && new Set(sessionIds).size === 8,
    stubOnly: allRuns.every(
      (run) =>
        run.providerId === 'stub' &&
        run.reviewerVerdict === 'pass' &&
        run.externalProviderCallCount === 0,
    ),
    topology:
      topology.sourceWorkspaceId !== topology.crossWorkspaceId &&
      topology.targetMission.workspaceId === topology.sourceWorkspaceId &&
      topology.crossWorkspaceMission.workspaceId === topology.crossWorkspaceId,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualUserLearningOperatorOverrideValidated: validated,
    costFree: true,
    externalProviderCalls: 'none',
    fixtureBinding,
    observedAt: requireTimestamp(input.observedAt, 'observedAt'),
    overrideLifecycle,
    phases,
    productionReadyClaim: false,
    promotions,
    quality,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      automaticPreferenceLearningValidated: false,
      controlledCrossWorkspaceUserOverrideValidated: validated,
      controlledUserOperatorOverrideValidated: validated,
      externalProviderValidationExecuted: false,
      generalAnswerQualityImprovementValidated: false,
      generalUserPersonalizationValidated: false,
      hostedTenantUserPersonalizationValidated: false,
      learnedConflictResolutionValidated: false,
      multiUserIsolationValidated: false,
    },
    results,
    schemaVersion: USER_LEARNING_OPERATOR_OVERRIDE_SCHEMA_VERSION,
    sessionCount: sessionIds.length,
    sourceRuns,
    timeline,
    topology,
  };
}

export function buildUserLearningOperatorOverrideEvidence(input) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `user-learning-operator-override-${evidenceHash.slice(0, 16)}`,
  };
}

export function assertUserLearningOperatorOverrideEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (!text(id) || evidenceHash !== expectedHash) {
    throw new Error('User learning operator override evidence integrity check failed.');
  }
  const rebuilt = buildContent(content);
  if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
    throw new Error('User learning operator override evidence contract drifted.');
  }
  if (
    content.schemaVersion !== USER_LEARNING_OPERATOR_OVERRIDE_SCHEMA_VERSION ||
    content.productionReadyClaim !== false ||
    content.qualityBoundary?.actualModelTrainingExecuted !== false ||
    content.qualityBoundary?.automaticPreferenceLearningValidated !== false ||
    content.qualityBoundary?.generalAnswerQualityImprovementValidated !== false ||
    content.qualityBoundary?.hostedTenantUserPersonalizationValidated !== false ||
    content.qualityBoundary?.learnedConflictResolutionValidated !== false ||
    content.qualityBoundary?.multiUserIsolationValidated !== false
  ) {
    throw new Error('User learning operator override claim boundary is invalid.');
  }
  return true;
}
