export const RETRIEVAL_RERANKING_EXPERIMENT_SCHEMA_VERSION =
  'personal-ai-agent-retrieval-reranking-experiment/v1';

const ALGORITHM_ID = 'semantic-lexical-weighted-v1';
const FEATURE_WEIGHTS = Object.freeze({
  lexical: 0.3,
  semantic: 0.7,
});

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeScore(value, { fieldName, maximum, minimum }) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum || normalized > maximum) {
    throw new Error(`${fieldName} must be between ${minimum} and ${maximum}.`);
  }
  return normalized;
}

function roundScore(value) {
  return Number(value.toFixed(6));
}

function normalizeCandidate(candidate, index) {
  const sourceKey = normalizeText(candidate?.sourceKey);
  if (!sourceKey) {
    throw new Error(`Reranking candidate ${index + 1} sourceKey is required.`);
  }

  return {
    baselineRank: normalizePositiveInteger(candidate?.baselineRank, null, 'baselineRank'),
    chunkId: normalizeText(candidate?.chunkId) || null,
    corpusId: normalizeText(candidate?.corpusId) || null,
    lexicalScore: normalizeScore(candidate?.lexicalScore ?? 0, {
      fieldName: 'lexicalScore',
      maximum: 1,
      minimum: 0,
    }),
    semanticScore: normalizeScore(candidate?.semanticScore, {
      fieldName: 'semanticScore',
      maximum: 1,
      minimum: -1,
    }),
    sourceId: normalizeText(candidate?.sourceId) || null,
    sourceKey,
    sourceLabel: normalizeText(candidate?.sourceLabel) || null,
    sourceType: normalizeText(candidate?.sourceType) || null,
  };
}

export function rerankRetrievalCandidates({
  baselineAlgorithmId,
  candidates,
  k = 6,
} = {}) {
  const normalizedBaselineAlgorithmId = normalizeText(baselineAlgorithmId);
  if (!normalizedBaselineAlgorithmId) {
    throw new Error('Reranking baselineAlgorithmId is required.');
  }

  const normalizedCandidates = ensureArray(candidates).map(normalizeCandidate);
  if (!normalizedCandidates.length) {
    throw new Error('At least one reranking candidate is required.');
  }
  const sourceKeys = normalizedCandidates.map((candidate) => candidate.sourceKey);
  if (new Set(sourceKeys).size !== sourceKeys.length) {
    throw new Error('Reranking candidate source keys must be unique.');
  }
  const baselineRanks = normalizedCandidates.map((candidate) => candidate.baselineRank);
  if (new Set(baselineRanks).size !== baselineRanks.length) {
    throw new Error('Reranking candidate baseline ranks must be unique.');
  }

  const normalizedK = normalizePositiveInteger(k, 6, 'k');
  const rollbackSourceKeys = [...normalizedCandidates]
    .sort((left, right) => left.baselineRank - right.baselineRank)
    .slice(0, normalizedK)
    .map((candidate) => candidate.sourceKey);
  const retrievedItems = normalizedCandidates
    .map((candidate) => {
      const semanticContribution = Math.max(candidate.semanticScore, 0) * FEATURE_WEIGHTS.semantic;
      const lexicalContribution = candidate.lexicalScore * FEATURE_WEIGHTS.lexical;
      return {
        ...candidate,
        combinedScore: roundScore(semanticContribution + lexicalContribution),
        lexicalContribution: roundScore(lexicalContribution),
        semanticContribution: roundScore(semanticContribution),
      };
    })
    .sort((left, right) =>
      right.combinedScore - left.combinedScore ||
      right.semanticScore - left.semanticScore ||
      right.lexicalScore - left.lexicalScore ||
      left.baselineRank - right.baselineRank ||
      left.sourceKey.localeCompare(right.sourceKey),
    )
    .slice(0, normalizedK)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    algorithmId: ALGORITHM_ID,
    baselineAlgorithmId: normalizedBaselineAlgorithmId,
    featureWeights: FEATURE_WEIGHTS,
    productionReadyClaim: false,
    retrievedItems,
    rollback: {
      algorithmId: normalizedBaselineAlgorithmId,
      sourceKeys: rollbackSourceKeys,
      stateMigrationRequired: false,
      strategy: 'bypass-reranker',
    },
    runtimeActivation: false,
    schemaVersion: RETRIEVAL_RERANKING_EXPERIMENT_SCHEMA_VERSION,
  };
}
