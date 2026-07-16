import { GLOBAL_USER_SCOPE_ID } from './constants.mjs';
import { createLocalCommandEmbeddingAdapter } from './embedding-adapter.mjs';
import {
  buildRetrievalContextWithCorpus,
  buildRetrievalQueryText,
} from './retrieval-service.mjs';
import { rerankRetrievalCandidates } from './retrieval-reranker.mjs';
import {
  buildSemanticCorpusRecords,
  runSemanticRetrievalExperiment,
} from './semantic-retrieval.mjs';

export const RETRIEVAL_RUNTIME_MODES = Object.freeze({
  LEXICAL: 'lexical',
  LOCAL_RELEVANCE_SHADOW: 'local-relevance-shadow',
  SEMANTIC_RERANK: 'semantic-rerank',
});

const MAX_ITEMS = 6;
const MAX_SNIPPET_CHARS = 420;
const MAX_TOTAL_CHARS = 2_400;

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeWhitespace(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim();
}

function truncateText(value, maxChars) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(maxChars - 3, 0)).trim()}...`;
}

function sourceKey(record) {
  return `${record.sourceType}:${record.sourceId}`;
}

function buildAllowedScopes({ mission, workspace } = {}) {
  return [
    `user:${GLOBAL_USER_SCOPE_ID}`,
    normalizeText(workspace?.id) ? `workspace:${workspace.id}` : null,
    normalizeText(mission?.id) ? `mission:${mission.id}` : null,
  ].filter(Boolean);
}

function mapLexicalSources(retrieval) {
  const sources = new Map();
  retrieval.corpusRecords.forEach((record, index) => {
    const key = sourceKey(record);
    if (!sources.has(key)) {
      sources.set(key, {
        item: retrieval.items[index],
        record,
      });
    }
  });
  return sources;
}

function normalizeLexicalScore(item, maximumScore) {
  const score = Math.max(Number(item?.score || 0), 0);
  return maximumScore > 0 ? Number((score / maximumScore).toFixed(6)) : 0;
}

function buildRuntimeItems({ lexical, reranked, semantic, semanticCorpusRecords }) {
  const lexicalSources = mapLexicalSources(lexical);
  const semanticItems = new Map(semantic.retrievedItems.map((item) => [item.sourceKey, item]));
  const corpusByChunkId = new Map(semanticCorpusRecords.map((record) => [record.chunkId, record]));
  const items = [];
  const corpusRecords = [];
  let remainingChars = MAX_TOTAL_CHARS;

  for (const candidate of reranked.retrievedItems) {
    const semanticItem = semanticItems.get(candidate.sourceKey);
    const corpusRecord = corpusByChunkId.get(semanticItem?.chunkId);
    if (!semanticItem || !corpusRecord || remainingChars <= 0) {
      continue;
    }

    const snippet = truncateText(
      corpusRecord.content,
      Math.min(MAX_SNIPPET_CHARS, remainingChars),
    );
    if (!snippet) {
      continue;
    }

    const lexicalItem = lexicalSources.get(candidate.sourceKey)?.item;
    items.push({
      bm25Score: lexicalItem?.bm25Score || 0,
      chunkIndex: corpusRecord.chunkIndex || null,
      fileName: corpusRecord.sourceType === 'attachment'
        ? normalizeText(corpusRecord.provenance?.fileName) || null
        : null,
      lexicalScore: candidate.lexicalScore,
      matchedTerms: Array.isArray(lexicalItem?.matchedTerms) ? lexicalItem.matchedTerms : [],
      matchTermCount: Array.isArray(lexicalItem?.matchedTerms) ? lexicalItem.matchedTerms.length : 0,
      phraseBoostScore: lexicalItem?.phraseBoostScore || 0,
      retrievalReason: [
        `semantic ${candidate.semanticScore}`,
        `normalized lexical ${candidate.lexicalScore}`,
        `local model ${semantic.embedding.modelId}`,
      ].join('; '),
      score: candidate.combinedScore,
      snippet,
      sourceLabel: corpusRecord.sourceLabel,
      sourceType: corpusRecord.sourceType,
    });
    corpusRecords.push(corpusRecord);
    remainingChars -= snippet.length;
  }

  return { corpusRecords, items };
}

async function retrieveWithSemanticReranking({ adapter, input, lexical }) {
  const semanticCorpusRecords = buildSemanticCorpusRecords(input);
  if (!semanticCorpusRecords.length) {
    return lexical;
  }

  const semantic = await runSemanticRetrievalExperiment({
    adapter,
    allowedScopes: buildAllowedScopes(input),
    corpusRecords: semanticCorpusRecords,
    k: MAX_ITEMS,
    queryText: buildRetrievalQueryText(input),
  });
  const lexicalSources = mapLexicalSources(lexical);
  const maximumLexicalScore = Math.max(
    0,
    ...[...lexicalSources.values()].map(({ item }) => Number(item?.score || 0)),
  );
  const reranked = rerankRetrievalCandidates({
    baselineAlgorithmId: semantic.algorithmId,
    candidates: semantic.retrievedItems.map((item) => ({
      ...item,
      baselineRank: item.rank,
      lexicalScore: normalizeLexicalScore(
        lexicalSources.get(item.sourceKey)?.item,
        maximumLexicalScore,
      ),
      semanticScore: item.score,
    })),
    k: MAX_ITEMS,
  });

  return buildRuntimeItems({
    lexical,
    reranked,
    semantic,
    semanticCorpusRecords,
  });
}

export function createRetrievalRuntimeService({
  embeddingAdapter = null,
  localRelevanceShadow = null,
  mode = RETRIEVAL_RUNTIME_MODES.LEXICAL,
} = {}) {
  const normalizedMode = normalizeText(mode, RETRIEVAL_RUNTIME_MODES.LEXICAL);
  if (!Object.values(RETRIEVAL_RUNTIME_MODES).includes(normalizedMode)) {
    throw new Error(`Unsupported retrieval runtime mode: ${normalizedMode}.`);
  }
  if (
    normalizedMode === RETRIEVAL_RUNTIME_MODES.SEMANTIC_RERANK &&
    typeof embeddingAdapter?.embedTexts !== 'function'
  ) {
    throw new Error('Semantic rerank runtime requires an embedding adapter.');
  }
  if (
    normalizedMode === RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW &&
    typeof localRelevanceShadow?.observe !== 'function'
  ) {
    throw new Error('Local relevance shadow runtime requires an observer.');
  }

  return {
    mode: normalizedMode,
    productionReadyClaim: false,
    rollbackMode: RETRIEVAL_RUNTIME_MODES.LEXICAL,
    runtimeActivation: normalizedMode === RETRIEVAL_RUNTIME_MODES.SEMANTIC_RERANK,
    shadowFailurePolicy: 'preserve-lexical',
    async retrieve(input = {}) {
      const lexical = buildRetrievalContextWithCorpus(input);
      if (normalizedMode === RETRIEVAL_RUNTIME_MODES.LEXICAL) {
        return lexical;
      }
      if (normalizedMode === RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW) {
        try {
          await localRelevanceShadow.observe({ input, lexical });
        } catch {
          // Shadow comparison is never allowed to change the provider path.
        }
        return lexical;
      }
      return retrieveWithSemanticReranking({
        adapter: embeddingAdapter,
        input,
        lexical,
      });
    },
  };
}

function parseCommandArgs(value) {
  const source = normalizeText(value, '[]');
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON must be valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.some((argument) => typeof argument !== 'string')) {
    throw new Error('PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON must be a JSON string array.');
  }
  return parsed;
}

export function createRetrievalRuntimeServiceFromEnvironment({
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const mode = normalizeText(
    env.PERSONAL_AI_AGENT_RETRIEVAL_MODE,
    RETRIEVAL_RUNTIME_MODES.LEXICAL,
  );
  if (mode === RETRIEVAL_RUNTIME_MODES.LEXICAL) {
    return createRetrievalRuntimeService();
  }
  if (mode === RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW) {
    throw new Error('Local relevance shadow runtime is available through explicit preflight injection only.');
  }
  if (mode !== RETRIEVAL_RUNTIME_MODES.SEMANTIC_RERANK) {
    throw new Error(`Unsupported retrieval runtime mode: ${mode}.`);
  }

  const command = normalizeText(env.PERSONAL_AI_AGENT_EMBEDDING_COMMAND);
  if (!command) {
    throw new Error(
      'PERSONAL_AI_AGENT_EMBEDDING_COMMAND is required for semantic-rerank retrieval.',
    );
  }
  const embeddingAdapter = createLocalCommandEmbeddingAdapter({
    args: parseCommandArgs(env.PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON),
    command,
    cwd,
    env,
  });
  return createRetrievalRuntimeService({ embeddingAdapter, mode });
}
