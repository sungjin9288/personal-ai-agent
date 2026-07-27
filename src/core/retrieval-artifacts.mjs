import fs from 'node:fs';

import { hashRetrievalContent } from './retrieval-corpus.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isIsoTimestamp(value) {
  const text = normalizeText(value);
  return Boolean(text) && Number.isFinite(Date.parse(text));
}

function retrievalEvidenceCitationId({ artifactDigest, chunkId, index, stageKey }) {
  const basis = [artifactDigest, chunkId || '', index || '', stageKey].join(':');
  return `citation:${hashRetrievalContent(basis).slice(0, 32)}`;
}

function buildGapCitation(stageKey) {
  return {
    citationId: `citation:gap:${stageKey}`,
    freshness: 'unknown',
    sourceSpan: null,
    status: 'gap',
  };
}

function extractRetrievalArtifactBlocks(content) {
  const blocks = String(content || '').split(/(?=^- \[(?:memory|attachment|fact)\] )/m);
  return blocks.filter((block) => /^- \[(?:memory|attachment|fact)\] /m.test(block));
}

function readArtifactField(block, field) {
  const match = String(block || '').match(new RegExp(`^  - ${field}:\\s*(.+)$`, 'm'));
  return normalizeText(match?.[1]);
}

function readArtifactProvenance(block) {
  const raw = readArtifactField(block, 'provenance');
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function buildProjectedCitation({ artifactDigest, block, index, retrievalCorpusRecords, stageKey }) {
  const corpusId = readArtifactField(block, 'corpusId');
  const chunkId = readArtifactField(block, 'chunkId');
  const contentHash = readArtifactField(block, 'contentHash');
  const snippet = readArtifactField(block, 'snippet');
  const snippetHash = readArtifactField(block, 'snippetHash');
  const revisionId = readArtifactField(block, 'revision');
  const provenance = readArtifactProvenance(block);
  const sourceUpdatedAt = normalizeText(provenance?.sourceUpdatedAt || provenance?.sourceCreatedAt) || null;
  const corpusRecord = retrievalCorpusRecords.find((record) => normalizeText(record?.chunkId) === chunkId);
  const chunkIndex = Number(corpusRecord?.chunkIndex);
  const chunkCount = Number(corpusRecord?.chunkCount);
  const available =
    /^corpus-[a-f0-9]{64}$/.test(corpusId) &&
    /^chunk-[a-f0-9]{64}$/.test(chunkId) &&
    isSha256(contentHash) &&
    isSha256(snippetHash) &&
    hashRetrievalContent(snippet) === snippetHash &&
    /^revision-[a-f0-9]{64}$/.test(revisionId) &&
    normalizeText(corpusRecord?.corpusId) === corpusId &&
    normalizeText(corpusRecord?.contentHash) === contentHash &&
    normalizeText(corpusRecord?.revision?.id) === revisionId &&
    Number.isInteger(chunkIndex) &&
    chunkIndex > 0 &&
    Number.isInteger(chunkCount) &&
    chunkCount >= chunkIndex;

  return {
    citationId: retrievalEvidenceCitationId({ artifactDigest, chunkId, index, stageKey }),
    freshness: isIsoTimestamp(sourceUpdatedAt) ? 'known' : 'unknown',
    sourceSpan: available
      ? { chunkId, contentHash, corpusId, count: chunkCount, index: chunkIndex, revisionId, snippetHash }
      : null,
    status: available ? 'available' : 'degraded',
  };
}

export function projectStoredRetrievalArtifactEvidence(
  artifact,
  { retrievalCorpusRecords = [], stageKey = 'stage' } = {},
) {
  const normalizedStageKey = normalizeText(stageKey, 'stage').replace(/[^a-z0-9-]/gi, '-').slice(0, 40) || 'stage';
  if (!artifact?.path || !fs.existsSync(artifact.path)) {
    return {
      artifactDigest: null,
      citations: [buildGapCitation(normalizedStageKey)],
    };
  }

  const content = fs.readFileSync(artifact.path, 'utf8');
  const artifactDigest = `sha256:${hashRetrievalContent(content)}`;
  const blocks = extractRetrievalArtifactBlocks(content);
  if (!blocks.length) {
    const status = /- no retrieval snippets selected\s*$/m.test(content) ? 'gap' : 'degraded';
    return {
      artifactDigest,
      citations: status === 'gap'
        ? [buildGapCitation(normalizedStageKey)]
        : [
            {
              citationId: retrievalEvidenceCitationId({ artifactDigest, index: 1, stageKey: normalizedStageKey }),
              freshness: 'unknown',
              sourceSpan: null,
              status: 'degraded',
            },
          ],
    };
  }

  return {
    artifactDigest,
    citations: blocks
      .slice(0, 6)
      .map((block, index) => buildProjectedCitation({
        artifactDigest,
        block,
        index: index + 1,
        retrievalCorpusRecords,
        stageKey: normalizedStageKey,
      })),
  };
}

function getRetrievalSourceCompareKey(sourceType, sourceLabel) {
  return `${normalizeText(sourceType)}:${normalizeText(sourceLabel)}`;
}

function formatRetrievalSourceSummaryLabel(sourceType, sourceLabel) {
  return `${sourceType === 'memory' ? '메모' : '첨부'} · ${sourceLabel}`;
}

export function summarizeStoredRetrievalArtifact(artifact) {
  if (!artifact?.path || !fs.existsSync(artifact.path)) {
    return null;
  }

  const content = fs.readFileSync(artifact.path, 'utf8');
  const roleMatch = content.match(/^- role:\s+(.+)$/m);
  const snippetEntries = [...content.matchAll(/^- \[(memory|attachment)\]\s+(.+)$/gm)]
    .map((match) => {
      const sourceType = normalizeText(match[1]);
      const sourceLabel = String(match[2] || '')
        .replace(/\s+chunk\s+\d+$/i, '')
        .trim();
      return {
        key: getRetrievalSourceCompareKey(sourceType, sourceLabel),
        label: formatRetrievalSourceSummaryLabel(sourceType, sourceLabel),
        sourceLabel,
        sourceType,
      };
    })
    .filter((entry) => entry.sourceLabel);

  const uniqueEntries = [...new Map(snippetEntries.map((entry) => [entry.key, entry])).values()];

  return {
    attachmentSourceCount: uniqueEntries.filter((entry) => entry.sourceType === 'attachment').length,
    memorySourceCount: uniqueEntries.filter((entry) => entry.sourceType === 'memory').length,
    role: roleMatch?.[1] || artifact.role || null,
    snippetCount: snippetEntries.length,
    sourceEntries: uniqueEntries,
    sourceLabels: uniqueEntries.map((entry) => entry.label),
    sourceKeys: uniqueEntries.map((entry) => entry.key),
  };
}

export function compareRetrievalPreviewWithLatestArtifact(previewItems = [], latestSummary = null) {
  const previewEntries = [...new Map(
    previewItems
      .map((item) => {
        const sourceType = normalizeText(item.sourceType);
        const sourceLabel = normalizeText(item.sourceLabel);
        if (!sourceType || !sourceLabel) {
          return null;
        }
        return [
          getRetrievalSourceCompareKey(sourceType, sourceLabel),
          {
            key: getRetrievalSourceCompareKey(sourceType, sourceLabel),
            label: formatRetrievalSourceSummaryLabel(sourceType, sourceLabel),
            sourceLabel,
            sourceType,
          },
        ];
      })
      .filter(Boolean),
  ).values()];

  if (!latestSummary) {
    return {
      latestSnippetCount: 0,
      latestSourceCount: 0,
      previewOnlyCount: previewEntries.length,
      previewOnlySources: previewEntries.slice(0, 4),
      previewOnlyLabels: previewEntries.map((entry) => entry.label).slice(0, 3),
      previewSnippetCount: previewItems.length,
      previewSourceCount: previewEntries.length,
      sharedSourceCount: 0,
      status: 'no-evidence',
    };
  }

  const latestEntries = latestSummary.sourceEntries || [];
  const latestKeys = new Set(latestEntries.map((entry) => entry.key));
  const previewKeys = new Set(previewEntries.map((entry) => entry.key));
  const sharedSourceCount = previewEntries.filter((entry) => latestKeys.has(entry.key)).length;
  const previewOnlyEntries = previewEntries.filter((entry) => !latestKeys.has(entry.key));
  const latestOnlyEntries = latestEntries.filter((entry) => !previewKeys.has(entry.key));
  let status = 'aligned';

  if (!previewEntries.length && !latestEntries.length) {
    status = 'empty';
  } else if (!sharedSourceCount && (previewEntries.length || latestEntries.length)) {
    status = 'shifted';
  } else if (previewOnlyEntries.length || latestOnlyEntries.length) {
    status = 'partial';
  }

  return {
    latestOnlyCount: latestOnlyEntries.length,
    latestOnlySources: latestOnlyEntries.slice(0, 4),
    latestOnlyLabels: latestOnlyEntries.map((entry) => entry.label).slice(0, 3),
    latestSnippetCount: latestSummary.snippetCount || 0,
    latestSourceCount: latestEntries.length,
    previewOnlyCount: previewOnlyEntries.length,
    previewOnlySources: previewOnlyEntries.slice(0, 4),
    previewOnlyLabels: previewOnlyEntries.map((entry) => entry.label).slice(0, 3),
    previewSnippetCount: previewItems.length,
    previewSourceCount: previewEntries.length,
    sharedSourceCount,
    status,
  };
}

export function formatRetrievalArtifactContent({
  providerRole,
  retrievalContext = [],
  retrievalCorpusRecords = [],
  role,
  specialistKind = '',
}) {
  const specialistLine = specialistKind ? `- specialist kind: ${specialistKind}\n` : '';
  return `# Retrieved Context

## Agent
- role: ${role}
- provider role: ${providerRole}
${specialistLine}

## Snippets
${retrievalContext.length
  ? retrievalContext
      .map(
        (item, index) => {
          const corpusRecord = retrievalCorpusRecords[index] || null;
          const corpusLines = corpusRecord
            ? `\n  - corpusSchema: ${corpusRecord.schemaVersion}\n  - corpusId: ${corpusRecord.corpusId}\n  - chunkId: ${corpusRecord.chunkId}\n  - contentHash: ${corpusRecord.contentHash}\n  - snippetHash: ${hashRetrievalContent(item.snippet)}\n  - scope: ${corpusRecord.scope.type}/${corpusRecord.scope.id || '-'}\n  - revision: ${corpusRecord.revision.id}\n  - provenance: ${JSON.stringify(corpusRecord.provenance)}`
            : '';
          return `- [${item.sourceType}] ${item.sourceLabel}${item.chunkIndex ? ` chunk ${item.chunkIndex}` : ''}\n  - score: ${item.score}\n  - lexicalScore: ${item.lexicalScore ?? item.score}\n  - bm25Score: ${item.bm25Score ?? 0}\n  - phraseBoostScore: ${item.phraseBoostScore ?? 0}\n  - matchTermCount: ${item.matchTermCount ?? 0}\n  - matchedTerms: ${Array.isArray(item.matchedTerms) ? item.matchedTerms.join(', ') : ''}\n  - retrievalReason: ${item.retrievalReason || 'not recorded'}${corpusLines}\n  - snippet: ${item.snippet}`;
        },
      )
      .join('\n')
  : '- no retrieval snippets selected'}
`;
}
