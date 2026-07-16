import { GLOBAL_USER_SCOPE_ID } from './constants.mjs';

export const USER_LEARNING_SELECTION_POLICY_ID =
  'user-decision-latest-revision-v1';
export const USER_LEARNING_SELECTION_SCHEMA_VERSION =
  'personal-ai-agent-user-learning-selection/v1';

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

export function selectUserLearningMemory({
  memoryEntries = [],
  retrievalCorpusRecords = [],
} = {}) {
  const memoryById = new Map(
    memoryEntries
      .filter(isUserDecisionMemory)
      .map((entry) => [entry.id, entry]),
  );
  const seen = new Set();
  const candidates = retrievalCorpusRecords
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
    .sort(compareCandidates)
    .map((candidate, index) => ({
      ...candidate,
      priority: index + 1,
      selected: index === 0,
    }));
  const selected = candidates[0] || null;

  return {
    candidateCount: candidates.length,
    candidates,
    policyId: USER_LEARNING_SELECTION_POLICY_ID,
    productionReadyClaim: false,
    reason: selected
      ? 'latest effective timestamp, then descending memory id'
      : 'no retrieved user decision candidate',
    schemaVersion: USER_LEARNING_SELECTION_SCHEMA_VERSION,
    scope: 'user',
    scopeId: GLOBAL_USER_SCOPE_ID,
    selectedContentHash: selected?.contentHash || null,
    selectedMemoryId: selected?.memoryId || null,
    status: selected ? 'selected' : 'not-applicable',
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
