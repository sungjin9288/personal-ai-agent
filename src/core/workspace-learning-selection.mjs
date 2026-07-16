export const WORKSPACE_LEARNING_SELECTION_POLICY_ID =
  'workspace-decision-latest-revision-v1';
export const WORKSPACE_LEARNING_SELECTION_SCHEMA_VERSION =
  'personal-ai-agent-workspace-learning-selection/v1';

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

function isWorkspaceDecisionRecord(record, workspaceId) {
  return (
    record?.sourceType === 'memory' &&
    record.scope?.type === 'workspace' &&
    record.scope?.id === workspaceId &&
    record.provenance?.kind === 'decision'
  );
}

function isWorkspaceDecisionMemory(entry, workspaceId) {
  return (
    entry?.scope === 'workspace' &&
    entry.scopeId === workspaceId &&
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

export function selectWorkspaceLearningMemory({
  memoryEntries = [],
  retrievalCorpusRecords = [],
  workspaceId = '',
} = {}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const memoryById = new Map(
    memoryEntries
      .filter((entry) => isWorkspaceDecisionMemory(entry, normalizedWorkspaceId))
      .map((entry) => [entry.id, entry]),
  );
  const seen = new Set();
  const candidates = retrievalCorpusRecords
    .map((record, index) => {
      const memoryId = normalizeText(record?.provenance?.sourceId || record?.sourceId);
      const entry = memoryById.get(memoryId);
      if (
        !memoryId ||
        seen.has(memoryId) ||
        !entry ||
        !isWorkspaceDecisionRecord(record, normalizedWorkspaceId)
      ) {
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
    policyId: WORKSPACE_LEARNING_SELECTION_POLICY_ID,
    productionReadyClaim: false,
    reason: selected
      ? 'latest effective timestamp, then descending memory id'
      : 'no retrieved workspace decision candidate',
    schemaVersion: WORKSPACE_LEARNING_SELECTION_SCHEMA_VERSION,
    selectedContentHash: selected?.contentHash || null,
    selectedMemoryId: selected?.memoryId || null,
    status: selected ? 'selected' : 'not-applicable',
    workspaceId: normalizedWorkspaceId || null,
  };
}

export function applyWorkspaceLearningSelection({
  memoryEntries = [],
  retrievalContext = [],
  retrievalCorpusRecords = [],
  selection,
  workspaceId = '',
} = {}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const selectedMemoryId = normalizeText(selection?.selectedMemoryId);
  const selectedIndexes = new Set();

  retrievalCorpusRecords.forEach((record, index) => {
    if (!isWorkspaceDecisionRecord(record, normalizedWorkspaceId)) {
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
      (entry) =>
        !isWorkspaceDecisionMemory(entry, normalizedWorkspaceId) ||
        entry.id === selectedMemoryId,
    ),
    retrievalContext: retrievalContext.filter((_, index) => selectedIndexes.has(index)),
    retrievalCorpusRecords: retrievalCorpusRecords.filter((_, index) =>
      selectedIndexes.has(index),
    ),
  };
}

export function formatWorkspaceLearningSelectionArtifact(selection) {
  return `${JSON.stringify(selection, null, 2)}\n`;
}
