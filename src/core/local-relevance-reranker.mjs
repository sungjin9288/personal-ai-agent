export const LOCAL_RELEVANCE_RERANKER_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-reranker/v1';

const DEFAULT_K = 6;
const MAX_CANDIDATES = 20;
const MAX_DOCUMENT_CHARS = 12_000;
const MAX_QUERY_CHARS = 4_000;

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

function normalizeCandidate(candidate, index) {
  const content = normalizeText(candidate?.content);
  const sourceKey = normalizeText(candidate?.sourceKey);
  if (!content || content.length > MAX_DOCUMENT_CHARS) {
    throw new Error(`Local relevance candidate ${index + 1} content is required and bounded.`);
  }
  if (!sourceKey) {
    throw new Error(`Local relevance candidate ${index + 1} sourceKey is required.`);
  }
  return {
    baselineRank: normalizePositiveInteger(candidate?.baselineRank, index + 1, 'baselineRank'),
    content,
    sourceId: normalizeText(candidate?.sourceId) || null,
    sourceKey,
    sourceLabel: normalizeText(candidate?.sourceLabel) || null,
    sourceType: normalizeText(candidate?.sourceType) || null,
  };
}

function normalizeScore(value, sourceKey) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`Local relevance score must be an integer between 0 and 100: ${sourceKey}.`);
  }
  return score;
}

export async function rerankByLocalRelevance({
  candidates,
  k = DEFAULT_K,
  queryText,
  scorer,
} = {}) {
  if (!scorer || typeof scorer.scoreDocument !== 'function') {
    throw new Error('Local relevance reranking requires a document scorer.');
  }
  const query = normalizeText(queryText);
  if (!query || query.length > MAX_QUERY_CHARS) {
    throw new Error('Local relevance query is required and bounded.');
  }
  const normalizedCandidates = ensureArray(candidates).map(normalizeCandidate);
  if (!normalizedCandidates.length || normalizedCandidates.length > MAX_CANDIDATES) {
    throw new Error(`Local relevance reranking requires 1-${MAX_CANDIDATES} candidates.`);
  }
  if (
    new Set(normalizedCandidates.map((candidate) => candidate.sourceKey)).size !==
    normalizedCandidates.length
  ) {
    throw new Error('Local relevance candidate source keys must be unique.');
  }
  if (
    new Set(normalizedCandidates.map((candidate) => candidate.baselineRank)).size !==
    normalizedCandidates.length
  ) {
    throw new Error('Local relevance candidate baseline ranks must be unique.');
  }
  const normalizedK = normalizePositiveInteger(k, DEFAULT_K, 'k');
  const scoringOrder = [...normalizedCandidates].sort((left, right) =>
    left.sourceKey.localeCompare(right.sourceKey),
  );
  const scored = [];
  for (const candidate of scoringOrder) {
    const result = await scorer.scoreDocument({
      documentText: candidate.content,
      queryText: query,
    });
    scored.push({
      baselineRank: candidate.baselineRank,
      relevanceScore: normalizeScore(result?.score, candidate.sourceKey),
      sourceId: candidate.sourceId,
      sourceKey: candidate.sourceKey,
      sourceLabel: candidate.sourceLabel,
      sourceType: candidate.sourceType,
    });
  }

  const rollbackSourceKeys = [...normalizedCandidates]
    .sort((left, right) => left.baselineRank - right.baselineRank)
    .slice(0, normalizedK)
    .map((candidate) => candidate.sourceKey);
  const retrievedItems = scored
    .sort((left, right) =>
      right.relevanceScore - left.relevanceScore ||
      left.baselineRank - right.baselineRank ||
      left.sourceKey.localeCompare(right.sourceKey),
    )
    .slice(0, normalizedK)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    algorithmId: `local-relevance:${normalizeText(scorer.id, 'document-scorer')}`,
    modelId: normalizeText(scorer.modelId) || null,
    productionReadyClaim: false,
    promptHash: normalizeText(scorer.promptHash) || null,
    promptVersion: normalizeText(scorer.promptVersion) || null,
    retrievedItems,
    rollback: {
      sourceKeys: rollbackSourceKeys,
      stateMigrationRequired: false,
      strategy: 'keep-lexical',
    },
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_RERANKER_SCHEMA_VERSION,
    scoringStrategy: 'independent-query-document',
  };
}
