const MAX_CANDIDATES = 20;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeCandidate(candidate, index) {
  const baselineRank = normalizePositiveInteger(candidate?.baselineRank, 'baselineRank');
  const sourceKey = normalizeText(candidate?.sourceKey);
  if (!sourceKey) {
    throw new Error(`Local relevance candidate ${index + 1} sourceKey is required.`);
  }
  return { baselineRank, candidate, sourceKey };
}

export function selectLocalRelevanceCandidates({ candidates, maxCandidates } = {}) {
  const normalizedCandidates = ensureArray(candidates).map(normalizeCandidate);
  if (!normalizedCandidates.length || normalizedCandidates.length > MAX_CANDIDATES) {
    throw new Error(`Local relevance candidate selection requires 1-${MAX_CANDIDATES} candidates.`);
  }
  if (
    new Set(normalizedCandidates.map((item) => item.sourceKey)).size !==
    normalizedCandidates.length
  ) {
    throw new Error('Local relevance candidate source keys must be unique.');
  }
  if (
    new Set(normalizedCandidates.map((item) => item.baselineRank)).size !==
    normalizedCandidates.length
  ) {
    throw new Error('Local relevance candidate baseline ranks must be unique.');
  }
  const normalizedMaxCandidates = normalizePositiveInteger(maxCandidates, 'maxCandidates');
  const ordered = [...normalizedCandidates].sort((left, right) =>
    left.baselineRank - right.baselineRank || left.sourceKey.localeCompare(right.sourceKey),
  );
  const selected = ordered.slice(0, normalizedMaxCandidates);
  const dropped = ordered.slice(normalizedMaxCandidates);

  return {
    candidates: selected.map((item) => item.candidate),
    selection: {
      algorithmId: 'lexical-baseline-prefix-v1',
      droppedSourceKeys: dropped.map((item) => item.sourceKey),
      inputCandidateCount: ordered.length,
      maxCandidates: normalizedMaxCandidates,
      selectedCandidateCount: selected.length,
      selectedSourceKeys: selected.map((item) => item.sourceKey),
      stateMigrationRequired: false,
    },
  };
}
