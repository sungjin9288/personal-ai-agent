import { GLOBAL_USER_SCOPE_ID } from './constants.mjs';

export const USER_LEARNING_SELECTION_POLICY_ID =
  'user-decision-latest-revision-v1';
export const USER_LEARNING_OPERATOR_OVERRIDE_POLICY_ID =
  'user-decision-operator-override-v1';
export const USER_LEARNING_SELECTION_SCHEMA_VERSION =
  'personal-ai-agent-user-learning-selection/v1';
export const USER_LEARNING_SELECTION_OVERRIDE_SCHEMA_VERSION =
  'personal-ai-agent-user-learning-selection/v2';

function normalizeText(value) {
  return String(value || '').trim();
}

function effectiveTimestamp(entry, record) {
  for (const value of [entry.updatedAt, entry.createdAt, record.revision?.at]) {
    const timestamp = normalizeText(value);
    if (timestamp && Number.isFinite(Date.parse(timestamp))) {
      return timestamp;
    }
  }
  return null;
}

function isUserDecisionRecord(record) {
  return (
    record?.sourceType === 'memory' &&
    record.scope?.type === 'user' &&
    record.scope?.id === GLOBAL_USER_SCOPE_ID &&
    record.provenance?.kind === 'decision'
  );
}

function isUserDecisionMemory(entry) {
  return (
    entry?.scope === 'user' &&
    entry.scopeId === GLOBAL_USER_SCOPE_ID &&
    entry.kind === 'decision'
  );
}

function compareCandidates(left, right) {
  const leftTimestamp = left.effectiveAt ? Date.parse(left.effectiveAt) : 0;
  const rightTimestamp = right.effectiveAt ? Date.parse(right.effectiveAt) : 0;
  const timestampDifference = rightTimestamp - leftTimestamp;
  if (timestampDifference) {
    return timestampDifference;
  }
  return right.memoryId.localeCompare(left.memoryId);
}

function compareOverrides(left, right) {
  const timestampDifference = Date.parse(right.setAt) - Date.parse(left.setAt);
  if (timestampDifference) {
    return timestampDifference;
  }
  return right.id.localeCompare(left.id);
}

function isHash(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function normalizeOverride(candidate, observedAt) {
  const override = candidate?.userLearningSelectionOverride;
  if (!override) {
    return null;
  }

  const normalized = {
    candidateId: normalizeText(candidate.id),
    expiresAt: normalizeText(override.expiresAt),
    id: normalizeText(override.id),
    memoryId: normalizeText(override.memoryId),
    noteHash: normalizeText(override.noteHash),
    scope: normalizeText(override.scope),
    scopeId: normalizeText(override.scopeId),
    setAt: normalizeText(override.setAt),
    status: normalizeText(override.status),
  };
  const promotion = candidate.promotionDecision;
  const eligible =
    normalized.id &&
    normalized.memoryId &&
    normalized.candidateId &&
    normalized.scope === 'user' &&
    normalized.scopeId === GLOBAL_USER_SCOPE_ID &&
    isHash(normalized.noteHash) &&
    Number.isFinite(Date.parse(normalized.setAt)) &&
    Number.isFinite(Date.parse(normalized.expiresAt)) &&
    candidate.promotionStatus === 'promoted' &&
    candidate.promotionVerification?.status === 'passed' &&
    candidate.promotionScopeAuthorization?.status === 'consumed' &&
    promotion?.decision === 'approve' &&
    promotion?.target === 'memory' &&
    promotion?.scope === 'user' &&
    promotion?.scopeId === GLOBAL_USER_SCOPE_ID &&
    promotion?.memoryId === normalized.memoryId;

  if (!eligible || !['active', 'cleared'].includes(normalized.status)) {
    return { ...normalized, status: 'invalid' };
  }
  if (
    normalized.status === 'active' &&
    Date.parse(normalized.expiresAt) <= Date.parse(observedAt)
  ) {
    return { ...normalized, status: 'expired' };
  }
  return normalized;
}

export function buildUserLearningSelectionOverrides({
  learningCandidates = [],
  observedAt = new Date().toISOString(),
} = {}) {
  const normalizedObservedAt = normalizeText(observedAt);
  if (!normalizedObservedAt || !Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('User learning selection observedAt is invalid.');
  }

  return learningCandidates
    .map((candidate) => normalizeOverride(candidate, normalizedObservedAt))
    .filter(Boolean)
    .sort(compareOverrides);
}

function summarizeOverrides(overrides, candidateMemoryIds) {
  const currentOverride = overrides[0] || null;
  const selectedOverride =
    currentOverride?.status === 'active' && candidateMemoryIds.has(currentOverride.memoryId)
      ? currentOverride
      : null;
  return {
    activeCount: overrides.filter((override) => override.status === 'active').length,
    clearedCount: overrides.filter((override) => override.status === 'cleared').length,
    currentOverrideId: currentOverride?.id || null,
    expiredCount: overrides.filter((override) => override.status === 'expired').length,
    invalidCount: overrides.filter((override) => override.status === 'invalid').length,
    records: overrides,
    selectedOverrideId: selectedOverride?.id || null,
    unretrievedActiveCount: overrides.filter(
      (override) => override.status === 'active' && !candidateMemoryIds.has(override.memoryId),
    ).length,
  };
}

export function selectUserLearningMemory({
  memoryEntries = [],
  retrievalCorpusRecords = [],
  selectionOverrides = [],
} = {}) {
  const memoryById = new Map(
    memoryEntries
      .filter(isUserDecisionMemory)
      .map((entry) => [entry.id, entry]),
  );
  const seen = new Set();
  const candidatesByRevision = retrievalCorpusRecords
    .map((record, index) => {
      const memoryId = normalizeText(record?.provenance?.sourceId || record?.sourceId);
      const entry = memoryById.get(memoryId);
      if (!memoryId || seen.has(memoryId) || !entry || !isUserDecisionRecord(record)) {
        return null;
      }

      seen.add(memoryId);
      return {
        contentHash: normalizeText(record.contentHash),
        effectiveAt: effectiveTimestamp(entry, record),
        memoryId,
        retrievalRank: index + 1,
      };
    })
    .filter(Boolean)
    .sort(compareCandidates);
  const overrides = Array.isArray(selectionOverrides) ? selectionOverrides : [];
  const candidateMemoryIds = new Set(candidatesByRevision.map((candidate) => candidate.memoryId));
  const overrideEvaluation = summarizeOverrides(overrides, candidateMemoryIds);
  const selectedOverride = overrides.find(
    (override) =>
      override.id === overrideEvaluation.selectedOverrideId &&
      candidateMemoryIds.has(override.memoryId),
  );
  const orderedCandidates = selectedOverride
    ? [
        candidatesByRevision.find((candidate) => candidate.memoryId === selectedOverride.memoryId),
        ...candidatesByRevision.filter(
          (candidate) => candidate.memoryId !== selectedOverride.memoryId,
        ),
      ]
    : candidatesByRevision;
  const candidates = orderedCandidates.map((candidate, index) => ({
    ...candidate,
    priority: index + 1,
    selected: index === 0,
  }));
  const selected = candidates[0] || null;

  const selection = {
    candidateCount: candidates.length,
    candidates,
    policyId: selectedOverride
      ? USER_LEARNING_OPERATOR_OVERRIDE_POLICY_ID
      : USER_LEARNING_SELECTION_POLICY_ID,
    productionReadyClaim: false,
    reason: selectedOverride
      ? 'active operator override among retrieved user decisions'
      : selected
        ? 'latest effective timestamp, then descending memory id'
        : 'no retrieved user decision candidate',
    schemaVersion: overrides.length
      ? USER_LEARNING_SELECTION_OVERRIDE_SCHEMA_VERSION
      : USER_LEARNING_SELECTION_SCHEMA_VERSION,
    scope: 'user',
    scopeId: GLOBAL_USER_SCOPE_ID,
    selectedContentHash: selected?.contentHash || null,
    selectedMemoryId: selected?.memoryId || null,
    status: selected ? 'selected' : 'not-applicable',
  };
  if (!overrides.length) {
    return selection;
  }
  return {
    ...selection,
    overrideEvaluation,
    selectionSource: selectedOverride ? 'operator-override' : 'latest-revision-fallback',
  };
}

export function applyUserLearningSelection({
  memoryEntries = [],
  retrievalContext = [],
  retrievalCorpusRecords = [],
  selection,
} = {}) {
  const selectedMemoryId = normalizeText(selection?.selectedMemoryId);
  const selectedIndexes = new Set();

  retrievalCorpusRecords.forEach((record, index) => {
    if (!isUserDecisionRecord(record)) {
      selectedIndexes.add(index);
      return;
    }
    const memoryId = normalizeText(record?.provenance?.sourceId || record?.sourceId);
    if (memoryId === selectedMemoryId) {
      selectedIndexes.add(index);
    }
  });

  return {
    memoryEntries: memoryEntries.filter(
      (entry) => !isUserDecisionMemory(entry) || entry.id === selectedMemoryId,
    ),
    retrievalContext: retrievalContext.filter((_, index) => selectedIndexes.has(index)),
    retrievalCorpusRecords: retrievalCorpusRecords.filter((_, index) =>
      selectedIndexes.has(index),
    ),
  };
}

export function formatUserLearningSelectionArtifact(selection) {
  return `${JSON.stringify(selection, null, 2)}\n`;
}
