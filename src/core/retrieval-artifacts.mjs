import fs from 'node:fs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
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

export function formatRetrievalArtifactContent({ providerRole, retrievalContext = [], role, specialistKind = '' }) {
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
        (item) =>
          `- [${item.sourceType}] ${item.sourceLabel}${item.chunkIndex ? ` chunk ${item.chunkIndex}` : ''}\n  - score: ${item.score}\n  - lexicalScore: ${item.lexicalScore ?? item.score}\n  - bm25Score: ${item.bm25Score ?? 0}\n  - phraseBoostScore: ${item.phraseBoostScore ?? 0}\n  - matchTermCount: ${item.matchTermCount ?? 0}\n  - matchedTerms: ${Array.isArray(item.matchedTerms) ? item.matchedTerms.join(', ') : ''}\n  - retrievalReason: ${item.retrievalReason || 'not recorded'}\n  - snippet: ${item.snippet}`,
      )
      .join('\n')
  : '- no retrieval snippets selected'}
`;
}
