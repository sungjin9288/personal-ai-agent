export function normalizeUiParam(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function normalizeReleaseProductionBlockerStateIndex(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) {
    return '';
  }
  const index = Number(normalized);
  return Number.isSafeInteger(index) ? String(index) : '';
}

export function normalizeReleaseProductionBlockerQueryIndex(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) {
    return '';
  }
  const ordinal = Number(normalized);
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    return '';
  }
  return String(ordinal - 1);
}

export function getReleaseProductionBlockerOrdinal(value) {
  const normalizedIndex = normalizeReleaseProductionBlockerStateIndex(value);
  return normalizedIndex === '' ? '' : String(Number(normalizedIndex) + 1);
}

export function getSanitizedReleaseHistoryOutcome(outcome) {
  const normalized = normalizeUiParam(outcome);
  return normalized === 'attention' ? normalized : null;
}

export function getSanitizedRetrievalSourceType(sourceType) {
  const normalized = normalizeUiParam(sourceType);
  return normalized === 'memory' || normalized === 'attachment' ? normalized : null;
}

export function getSanitizedMissionActionsFilter(filter) {
  const normalized = normalizeUiParam(filter);
  return normalized === 'needs-reminder' || normalized === 'overdue' ? normalized : 'all';
}

export function getRetrievalSourceKey(sourceType = '', sourceLabel = '') {
  const normalizedType = getSanitizedRetrievalSourceType(sourceType);
  const normalizedLabel = normalizeUiParam(sourceLabel);
  if (!normalizedType || !normalizedLabel) {
    return '';
  }
  return `${normalizedType}:${normalizedLabel}`;
}

export function getRetrievalArtifactTargetLabel(artifact = {}) {
  return String(artifact.path || artifact.fileName || artifact.id || 'retrieval evidence').trim();
}

export function getReleaseHandoffStructuredSummaryDetailCopyKey(artifactId = '', detailKey = '') {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  if (!normalizedArtifactId || !normalizedDetailKey) {
    return '';
  }
  return `${normalizedArtifactId}:${normalizedDetailKey}`;
}

export function getReleaseHandoffStructuredSummaryStableLineCopyKey(artifactId = '', detailKey = '', lineIndex = -1) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const normalizedLineIndex = Number.isInteger(lineIndex) ? lineIndex : Number.parseInt(lineIndex, 10);
  if (!normalizedArtifactId || !normalizedDetailKey || normalizedLineIndex < 0) {
    return '';
  }
  return `${normalizedArtifactId}:${normalizedDetailKey}:${normalizedLineIndex}`;
}

export function getReleaseCommandCopyKey(command = '', label = '') {
  const normalizedCommand = normalizeUiParam(command);
  const normalizedLabel = normalizeUiParam(label);
  if (!normalizedCommand) {
    return '';
  }
  return `${normalizedLabel || 'release command'}:${normalizedCommand}`;
}

export function getReleaseLinkCopyKey(action = '', value = '') {
  const normalizedAction = normalizeUiParam(action);
  const normalizedValue = normalizeUiParam(value);
  if (!normalizedAction || !normalizedValue) {
    return '';
  }
  return `${normalizedAction}:${normalizedValue}`;
}
