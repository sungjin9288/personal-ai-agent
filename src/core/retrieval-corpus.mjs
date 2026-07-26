import { createHash } from 'node:crypto';

export const RETRIEVAL_CORPUS_SCHEMA_VERSION = 'personal-ai-agent-retrieval-corpus/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeContent(value) {
  return normalizeText(value).replace(/\r\n?/g, '\n');
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashParts(parts) {
  return hashValue(JSON.stringify(parts));
}

function normalizePositiveInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function buildSourceId({ contentHash, directId, scope, sourceLabel, sourceType }) {
  const sourceId = normalizeText(directId);
  if (sourceId) {
    return { derived: false, value: sourceId };
  }

  return {
    derived: true,
    value: `derived-${hashParts([sourceType, sourceLabel, scope.type, scope.id, contentHash]).slice(0, 24)}`,
  };
}

function buildRevision({ contentHash, createdAt, revisionNumber, sourceId, sourceType, updatedAt, validFrom }) {
  const at = normalizeText(updatedAt, createdAt || validFrom) || null;
  const number = normalizePositiveInteger(revisionNumber);
  const id = hashParts([sourceType, sourceId, number, at, contentHash]);

  return {
    at,
    id: `revision-${id}`,
    number,
  };
}

function buildCorpusRecord({
  chunkCount = 1,
  chunkIndex = 1,
  content,
  createdAt,
  provenance,
  revisionNumber,
  scopeId,
  scopeType,
  sourceId,
  sourceLabel,
  sourceType,
  status = 'active',
  updatedAt,
  validFrom,
}) {
  const normalizedContent = normalizeContent(content);
  if (!normalizedContent) {
    return null;
  }

  const normalizedSourceType = normalizeText(sourceType, 'source');
  const normalizedSourceLabel = normalizeText(sourceLabel, normalizedSourceType);
  const scope = {
    id: normalizeText(scopeId) || null,
    type: normalizeText(scopeType, 'unknown'),
  };
  const contentHash = hashValue(normalizedContent);
  const normalizedSourceId = buildSourceId({
    contentHash,
    directId: sourceId,
    scope,
    sourceLabel: normalizedSourceLabel,
    sourceType: normalizedSourceType,
  });
  const revision = buildRevision({
    contentHash,
    createdAt,
    revisionNumber,
    sourceId: normalizedSourceId.value,
    sourceType: normalizedSourceType,
    updatedAt,
    validFrom,
  });
  const normalizedChunkIndex = normalizePositiveInteger(chunkIndex, 1);
  const normalizedChunkCount = Math.max(normalizePositiveInteger(chunkCount, 1), normalizedChunkIndex);
  const corpusId = `corpus-${hashParts([
    RETRIEVAL_CORPUS_SCHEMA_VERSION,
    normalizedSourceType,
    normalizedSourceId.value,
    revision.id,
  ])}`;
  const chunkId = `chunk-${hashParts([corpusId, normalizedChunkIndex, contentHash])}`;

  return {
    schemaVersion: RETRIEVAL_CORPUS_SCHEMA_VERSION,
    corpusId,
    chunkId,
    chunkIndex: normalizedChunkIndex,
    chunkCount: normalizedChunkCount,
    content: normalizedContent,
    contentHash,
    provenance,
    revision,
    scope,
    sourceId: normalizedSourceId.value,
    sourceIdDerived: normalizedSourceId.derived,
    sourceLabel: normalizedSourceLabel,
    sourceType: normalizedSourceType,
    status: normalizeText(status, 'active'),
  };
}

export function buildMemoryCorpusRecord(entry = {}, options = {}) {
  return buildCorpusRecord({
    chunkCount: options.chunkCount,
    chunkIndex: options.chunkIndex,
    content: options.content ?? entry.content,
    createdAt: entry.createdAt,
    provenance: {
      kind: normalizeText(entry.kind, 'note'),
      sourceCreatedAt: normalizeText(entry.createdAt) || null,
      sourceId: normalizeText(entry.id) || null,
      sourceType: 'memory',
      sourceUpdatedAt: normalizeText(entry.updatedAt) || null,
    },
    revisionNumber: entry.version,
    scopeId: entry.scopeId,
    scopeType: entry.scope,
    sourceId: entry.id,
    sourceLabel: options.sourceLabel || `${normalizeText(entry.scope, 'memory')}/${normalizeText(entry.kind, 'note')}`,
    sourceType: 'memory',
    updatedAt: entry.updatedAt,
  });
}

export function buildAttachmentCorpusRecord(attachment = {}, options = {}) {
  return buildCorpusRecord({
    chunkCount: options.chunkCount,
    chunkIndex: options.chunkIndex,
    content: options.content ?? attachment.promptContent ?? attachment.excerpt,
    createdAt: attachment.createdAt,
    provenance: {
      fileName: normalizeText(attachment.fileName, 'attachment'),
      mimeType: normalizeText(attachment.mimeType) || null,
      source: normalizeText(attachment.source) || null,
      sourceCreatedAt: normalizeText(attachment.createdAt) || null,
      sourceId: normalizeText(attachment.id) || null,
      sourceType: 'attachment',
      sourceUpdatedAt: normalizeText(attachment.updatedAt) || null,
    },
    revisionNumber: attachment.version,
    scopeId: attachment.missionId,
    scopeType: 'mission',
    sourceId: attachment.id,
    sourceLabel: options.sourceLabel || normalizeText(attachment.fileName, 'attachment'),
    sourceType: 'attachment',
    updatedAt: attachment.updatedAt,
  });
}

export function buildFactCorpusRecord(node = {}, options = {}) {
  const sourceProvenance = Array.isArray(node.provenance) ? node.provenance.at(-1) || {} : {};

  return buildCorpusRecord({
    chunkCount: options.chunkCount,
    chunkIndex: options.chunkIndex,
    content: options.content ?? node.statement,
    createdAt: node.createdAt,
    provenance: {
      memoryKind: normalizeText(sourceProvenance.kind) || null,
      sourceCreatedAt: normalizeText(sourceProvenance.sourceCreatedAt, node.createdAt) || null,
      sourceId: normalizeText(node.sourceId, sourceProvenance.sourceId) || null,
      sourceType: normalizeText(node.sourceType, sourceProvenance.sourceType) || null,
      sourceUpdatedAt: normalizeText(sourceProvenance.sourceUpdatedAt, node.updatedAt) || null,
    },
    revisionNumber: node.version,
    scopeId: node.scopeId,
    scopeType: node.scope,
    sourceId: node.id,
    sourceLabel: options.sourceLabel || `${normalizeText(node.scope, 'fact')}/fact`,
    sourceType: 'fact',
    status: node.status,
    updatedAt: node.updatedAt,
    validFrom: node.validFrom,
  });
}

export function hashRetrievalContent(value) {
  const content = normalizeContent(value);
  return content ? hashValue(content) : null;
}
