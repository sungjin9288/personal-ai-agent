import {
  buildAttachmentCorpusRecord,
  buildMemoryCorpusRecord,
  RETRIEVAL_CORPUS_SCHEMA_VERSION,
} from './retrieval-corpus.mjs';
import { splitRetrievalChunks } from './retrieval-service.mjs';
import { validateEmbeddingBatchResult } from './embedding-adapter.mjs';

export const SEMANTIC_RETRIEVAL_EXPERIMENT_SCHEMA_VERSION =
  'personal-ai-agent-semantic-retrieval-experiment/v1';

const DEFAULT_ATTACHMENT_CHUNK_CHARS = 900;
const DEFAULT_K = 6;

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

function scopeKey(scope = {}) {
  return `${normalizeText(scope.type, 'unknown')}:${normalizeText(scope.id) || '-'}`;
}

function sourceKey(record) {
  return `${record.sourceType}:${record.sourceId}`;
}

function validateCorpusRecord(record) {
  if (record?.schemaVersion !== RETRIEVAL_CORPUS_SCHEMA_VERSION) {
    throw new Error(`Unsupported retrieval corpus schema: ${normalizeText(record?.schemaVersion, '<empty>')}`);
  }
  if (!normalizeText(record.content)) {
    throw new Error(`Corpus record content is required: ${normalizeText(record.chunkId, '<unknown>')}`);
  }
  if (!normalizeText(record.sourceId) || !normalizeText(record.sourceType)) {
    throw new Error('Corpus record source identity is required.');
  }
  return record;
}

export function buildSemanticCorpusRecords({ attachments = [], memoryEntries = [] } = {}) {
  const records = [];

  for (const entry of ensureArray(memoryEntries)) {
    const record = buildMemoryCorpusRecord(entry);
    if (record) {
      records.push(record);
    }
  }

  for (const attachment of ensureArray(attachments)) {
    const content = normalizeText(attachment?.promptContent, attachment?.excerpt);
    const chunks = splitRetrievalChunks(content, DEFAULT_ATTACHMENT_CHUNK_CHARS);
    chunks.forEach((chunk, index) => {
      const record = buildAttachmentCorpusRecord(attachment, {
        chunkCount: chunks.length,
        chunkIndex: index + 1,
        content: chunk,
      });
      if (record) {
        records.push(record);
      }
    });
  }

  return records;
}

export function calculateCosineSimilarity(leftVector, rightVector) {
  if (!Array.isArray(leftVector) || !leftVector.length || !Array.isArray(rightVector)) {
    throw new Error('Cosine similarity requires two non-empty vectors.');
  }
  if (leftVector.length !== rightVector.length) {
    throw new Error('Cosine similarity vectors must use one dimension size.');
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < leftVector.length; index += 1) {
    const left = Number(leftVector[index]);
    const right = Number(rightVector[index]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      throw new Error('Cosine similarity vectors must contain finite numbers.');
    }
    dotProduct += left * right;
    leftMagnitude += left * left;
    rightMagnitude += right * right;
  }
  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }
  return Number((dotProduct / Math.sqrt(leftMagnitude * rightMagnitude)).toFixed(6));
}

export async function runSemanticRetrievalExperiment({
  adapter,
  allowedScopes,
  corpusRecords,
  k = DEFAULT_K,
  queryText,
} = {}) {
  if (!adapter || typeof adapter.embedTexts !== 'function') {
    throw new Error('Semantic retrieval requires an embedding adapter.');
  }
  const query = normalizeText(queryText);
  if (!query) {
    throw new Error('Semantic retrieval query text is required.');
  }
  const normalizedK = normalizePositiveInteger(k, DEFAULT_K, 'k');
  const allowedScopeSet = new Set(ensureArray(allowedScopes).map((scope) => normalizeText(scope)).filter(Boolean));
  if (!allowedScopeSet.size) {
    throw new Error('Semantic retrieval allowedScopes are required.');
  }

  const records = ensureArray(corpusRecords).map(validateCorpusRecord);
  const disallowedRecord = records.find((record) => !allowedScopeSet.has(scopeKey(record.scope)));
  if (disallowedRecord) {
    throw new Error(`Corpus scope is not allowed: ${scopeKey(disallowedRecord.scope)}.`);
  }
  const activeRecords = records.filter((record) => normalizeText(record.status, 'active') === 'active');
  if (!activeRecords.length) {
    throw new Error('Semantic retrieval requires at least one active corpus record.');
  }

  const embedded = await adapter.embedTexts({
    purpose: 'semantic-retrieval-experiment',
    texts: [query, ...activeRecords.map((record) => record.content)],
  });
  const batch = validateEmbeddingBatchResult(embedded, {
    expectedCount: activeRecords.length + 1,
  });
  const queryVector = batch.vectors[0];
  const rankedChunks = activeRecords
    .map((record, index) => ({
      chunkId: record.chunkId,
      corpusId: record.corpusId,
      score: calculateCosineSimilarity(queryVector, batch.vectors[index + 1]),
      sourceId: record.sourceId,
      sourceKey: sourceKey(record),
      sourceLabel: record.sourceLabel,
      sourceType: record.sourceType,
    }))
    .sort((left, right) =>
      right.score - left.score ||
      left.sourceKey.localeCompare(right.sourceKey) ||
      left.chunkId.localeCompare(right.chunkId),
    );
  const retrievedItems = [...new Map(rankedChunks.map((item) => [item.sourceKey, item])).values()]
    .slice(0, normalizedK)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    algorithmId: `semantic:${normalizeText(adapter.id, 'embedding-adapter')}:${batch.modelId}`,
    embedding: {
      adapterId: normalizeText(adapter.id, 'embedding-adapter'),
      dimensions: batch.dimensions,
      modelId: batch.modelId,
      protocolVersion: batch.schemaVersion,
    },
    evidence: {
      activeCorpusRecordCount: activeRecords.length,
      allowedScopes: [...allowedScopeSet].sort(),
      inactiveCorpusRecordCount: records.length - activeRecords.length,
    },
    productionReadyClaim: false,
    retrievedItems,
    runtimeActivation: false,
    schemaVersion: SEMANTIC_RETRIEVAL_EXPERIMENT_SCHEMA_VERSION,
  };
}
