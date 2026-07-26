import {
  buildAttachmentCorpusRecord,
  buildMemoryCorpusRecord,
} from './retrieval-corpus.mjs';

const RETRIEVAL_MAX_ITEMS = 6;
const RETRIEVAL_MAX_TOTAL_CHARS = 2_400;
const RETRIEVAL_SNIPPET_MAX_CHARS = 420;
const RETRIEVAL_ATTACHMENT_CHUNK_CHARS = 900;
const RETRIEVAL_NEIGHBOR_RADIUS = 1;
const RETRIEVAL_MIN_TOKEN_LENGTH = 2;
const RETRIEVAL_MAX_ITEMS_PER_SOURCE = 3;
const RETRIEVAL_STOP_TOKENS = new Set([
  'about',
  'after',
  'again',
  'and',
  'before',
  'context',
  'deliverable',
  'execution',
  'for',
  'from',
  'into',
  'memory',
  'mission',
  'mode',
  'next',
  'objective',
  'path',
  'prompt',
  'retrieval',
  'role',
  'run',
  'step',
  'that',
  'the',
  'this',
  'through',
  'title',
  'type',
  'verify',
  'with',
  'work',
]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeStringList(items) {
  return ensureArray(items).map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeWhitespace(value) {
  return normalizeText(value).replace(/\s+/g, ' ').trim();
}

function truncateText(value, maxChars) {
  const normalized = normalizeWhitespace(value);
  if (!normalized || normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxChars - 3, 0)).trim()}...`;
}

export function tokenizeRetrievalText(value) {
  return [...new Set(
    tokenizeRetrievalTerms(value),
  )];
}

function getMatchedRetrievalTerms(value, queryTokens = []) {
  const textTokenSet = new Set(tokenizeRetrievalTerms(value));
  return queryTokens.filter((token) => textTokenSet.has(token)).slice(0, 12);
}

function buildRetrievalReason({ bm25Score = 0, lexicalScore = 0, matchedTerms = [], phraseBoostScore = 0 } = {}) {
  if (!matchedTerms.length) {
    return `fallback candidate selected with lexical ${lexicalScore} and bm25 ${bm25Score}`;
  }

  const phraseNote = Number(phraseBoostScore || 0) > 0 ? `; phraseBoost ${phraseBoostScore}` : '';
  return `matched ${matchedTerms.length} query term${matchedTerms.length === 1 ? '' : 's'}: ${matchedTerms.join(', ')}${phraseNote}`;
}

function buildRetrievalPhrasePairs(value) {
  const terms = tokenizeRetrievalTerms(value);
  const pairs = [];
  const seen = new Set();

  for (let index = 0; index < terms.length - 1; index += 1) {
    const left = terms[index];
    const right = terms[index + 1];
    if (!left || !right || left === right) {
      continue;
    }

    const key = `${left}\u0000${right}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    pairs.push([left, right]);
  }

  return pairs.slice(0, 24);
}

function scoreRetrievalPhraseBoost(value, queryPhrasePairs = []) {
  if (!queryPhrasePairs.length) {
    return 0;
  }

  const terms = tokenizeRetrievalTerms(value);
  if (terms.length < 2) {
    return 0;
  }

  let score = 0;
  for (const [left, right] of queryPhrasePairs) {
    let pairScore = 0;
    for (let index = 0; index < terms.length - 1; index += 1) {
      if (terms[index] !== left) {
        continue;
      }
      if (terms[index + 1] === right) {
        pairScore = Math.max(pairScore, 2);
        break;
      }
      const windowEnd = Math.min(index + 5, terms.length - 1);
      for (let rightIndex = index + 2; rightIndex <= windowEnd; rightIndex += 1) {
        if (terms[rightIndex] === right) {
          pairScore = Math.max(pairScore, 1);
          break;
        }
      }
    }
    score += pairScore;
  }

  return score;
}

function getRetrievalSourceKey(candidate = {}) {
  return `${normalizeText(candidate.sourceType, 'source')}:${normalizeText(candidate.sourceLabel, 'unknown')}`;
}

function tokenizeRetrievalTerms(value) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^0-9a-z\u3131-\u318e\uac00-\ud7a3]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= RETRIEVAL_MIN_TOKEN_LENGTH && !RETRIEVAL_STOP_TOKENS.has(token));
}

function calculateBm25Scores({ documents, query, k1 = 1.5, b = 0.75 }) {
  const queryTerms = [...new Set(tokenizeRetrievalTerms(query))];
  const tokenizedDocuments = documents.map((document) => tokenizeRetrievalTerms(document));
  const documentCount = tokenizedDocuments.length;

  if (!queryTerms.length || !documentCount) {
    return documents.map(() => 0);
  }

  const documentLengths = tokenizedDocuments.map((tokens) => tokens.length);
  const averageDocumentLength =
    documentLengths.reduce((sum, length) => sum + length, 0) / Math.max(documentLengths.length, 1) || 1;
  const documentFrequency = new Map(queryTerms.map((term) => [term, 0]));

  for (const tokens of tokenizedDocuments) {
    const seenTerms = new Set(tokens);
    for (const term of queryTerms) {
      if (seenTerms.has(term)) {
        documentFrequency.set(term, documentFrequency.get(term) + 1);
      }
    }
  }

  const inverseDocumentFrequency = new Map(
    queryTerms.map((term) => {
      const frequency = documentFrequency.get(term) || 0;
      return [term, Math.log((documentCount - frequency + 0.5) / (frequency + 0.5) + 1)];
    }),
  );

  return tokenizedDocuments.map((tokens, index) => {
    if (!tokens.length) {
      return 0;
    }

    const termFrequency = new Map();
    for (const token of tokens) {
      if (!inverseDocumentFrequency.has(token)) {
        continue;
      }
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    let score = 0;
    for (const [term, frequency] of termFrequency.entries()) {
      const numerator = frequency * (k1 + 1);
      const denominator = frequency + k1 * (1 - b + (b * documentLengths[index]) / averageDocumentLength);
      score += (inverseDocumentFrequency.get(term) || 0) * (numerator / denominator);
    }
    return score;
  });
}

function normalizeScores(scores) {
  const maxScore = Math.max(...scores, 0);
  if (maxScore <= 0) {
    return scores.map(() => 0);
  }
  return scores.map((score) => score / maxScore);
}

function applyHybridRetrievalScores({ candidates, queryText }) {
  const bm25Scores = calculateBm25Scores({
    documents: candidates.map((candidate) => candidate.matchText || candidate.snippet),
    query: queryText,
  });
  const queryPhrasePairs = buildRetrievalPhrasePairs(queryText);
  const phraseBoostScores = candidates.map((candidate) =>
    scoreRetrievalPhraseBoost(candidate.matchText || candidate.snippet, queryPhrasePairs),
  );
  const lexicalScores = candidates.map((candidate) => Number(candidate.lexicalScore || 0));
  const normalizedBm25Scores = normalizeScores(bm25Scores);
  const normalizedPhraseBoostScores = normalizeScores(phraseBoostScores);
  const normalizedLexicalScores = normalizeScores(lexicalScores);

  return candidates.map((candidate, index) => ({
    ...candidate,
    bm25Score: Number(bm25Scores[index].toFixed(3)),
    lexicalScore: lexicalScores[index],
    phraseBoostScore: Number(phraseBoostScores[index].toFixed(3)),
    score: Number((
      normalizedLexicalScores[index] * 0.5 +
      normalizedBm25Scores[index] * 0.35 +
      normalizedPhraseBoostScores[index] * 0.15
    ).toFixed(3)),
  }));
}

function expandAttachmentCandidateSnippet(candidate, queryTokenSet) {
  if (candidate.sourceType !== 'attachment' || !Array.isArray(candidate.chunks) || !candidate.chunkIndex) {
    return candidate.snippet;
  }

  const currentIndex = candidate.chunkIndex - 1;
  const selectedChunks = [];
  for (
    let index = Math.max(0, currentIndex - RETRIEVAL_NEIGHBOR_RADIUS);
    index <= Math.min(candidate.chunks.length - 1, currentIndex + RETRIEVAL_NEIGHBOR_RADIUS);
    index += 1
  ) {
    if (index === currentIndex || scoreRetrievalSnippet(candidate.chunks[index], queryTokenSet) > 0) {
      selectedChunks.push(candidate.chunks[index]);
    }
  }

  return truncateText(selectedChunks.join('\n\n'), RETRIEVAL_SNIPPET_MAX_CHARS);
}

export function splitRetrievalChunks(value, maxChars = RETRIEVAL_ATTACHMENT_CHUNK_CHARS) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);

  if (!paragraphs.length) {
    return [truncateText(normalized, maxChars)].filter(Boolean);
  }

  const chunks = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      chunks.push(truncateText(paragraph, maxChars));
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxChars) {
      chunks.push(truncateText(paragraph.slice(index, index + maxChars), maxChars));
    }
  }

  return chunks.filter(Boolean);
}

function summarizePreviousOutputsForRetrieval(previousOutputs = {}) {
  const summaries = [];

  for (const [key, value] of Object.entries(previousOutputs)) {
    if (key === 'specialists') {
      for (const item of ensureArray(value)) {
        summaries.push(normalizeText(item?.summaryText));
        summaries.push(normalizeText(item?.handoff?.currentState));
      }
      continue;
    }

    if (value && typeof value === 'object') {
      summaries.push(normalizeText(value.summaryText));
      summaries.push(...normalizeStringList(value.planSteps));
      summaries.push(...normalizeStringList(value.adaptationNotes));
      continue;
    }

    summaries.push(normalizeText(value));
  }

  return summaries.filter(Boolean).join(' ');
}

export function scoreRetrievalSnippet(snippet, queryTokenSet) {
  let score = 0;

  for (const token of tokenizeRetrievalText(snippet)) {
    if (!queryTokenSet.has(token)) {
      continue;
    }

    if (token.length >= 8) {
      score += 4;
    } else if (token.length >= 5) {
      score += 3;
    } else {
      score += 2;
    }
  }

  return score;
}

export function buildRetrievalQueryText({ mission, pack, previousOutputs, providerRole, role } = {}) {
  return [
    mission.title,
    mission.objective,
    mission.deliverableType,
    mission.mode,
    role,
    providerRole,
    ensureArray(mission.constraints).join(' '),
    ensureArray(pack.requiredSections).join(' '),
    ensureArray(pack.reviewRules)
      .map((rule) => normalizeText(rule?.description))
      .join(' '),
    summarizePreviousOutputsForRetrieval(previousOutputs),
  ]
    .filter(Boolean)
    .join(' ');
}

function collectRetrievalContext({ attachments, memoryEntries, mission, pack, previousOutputs, providerRole, role }) {
  const queryText = buildRetrievalQueryText({ mission, pack, previousOutputs, providerRole, role });
  const queryTokens = tokenizeRetrievalText(queryText);
  const queryTokenSet = new Set(queryTokens);
  const candidates = [];
  let sequence = 0;

  for (const entry of ensureArray(memoryEntries)) {
    const snippet = truncateText(entry?.content, RETRIEVAL_SNIPPET_MAX_CHARS);
    if (!snippet) {
      continue;
    }

    const sourceLabel = `${normalizeText(entry.scope, 'memory')}/${normalizeText(entry.kind, 'note')}`;
    candidates.push({
      corpusRecord: buildMemoryCorpusRecord(entry, { content: snippet, sourceLabel }),
      fileName: null,
      lexicalScore: scoreRetrievalSnippet(snippet, queryTokenSet),
      matchText: snippet,
      sequence: sequence += 1,
      snippet,
      sourceLabel,
      sourceType: 'memory',
    });
  }

  for (const attachment of ensureArray(attachments)) {
    const fileName = normalizeText(attachment?.fileName, 'attachment');
    const content = normalizeText(attachment?.promptContent, attachment?.excerpt);
    const chunks = splitRetrievalChunks(content);

    chunks.forEach((chunk, index) => {
      candidates.push({
        corpusRecord: buildAttachmentCorpusRecord(attachment, {
          chunkCount: chunks.length,
          chunkIndex: index + 1,
          content: chunk,
          sourceLabel: fileName,
        }),
        chunkIndex: index + 1,
        chunks,
        fileName,
        lexicalScore: scoreRetrievalSnippet(chunk, queryTokenSet),
        matchText: chunk,
        sequence: sequence += 1,
        snippet: truncateText(chunk, RETRIEVAL_SNIPPET_MAX_CHARS),
        sourceLabel: fileName,
        sourceType: 'attachment',
      });
    });
  }

  const scoredCandidates = applyHybridRetrievalScores({ candidates, queryText });
  const rankedCandidates = (scoredCandidates.some((candidate) => candidate.lexicalScore > 0)
    ? scoredCandidates.filter((candidate) => candidate.lexicalScore > 0)
    : scoredCandidates
  ).sort(
    (left, right) =>
      right.score - left.score ||
      Number(right.lexicalScore || 0) - Number(left.lexicalScore || 0) ||
      left.sequence - right.sequence,
  );

  const selected = [];
  const selectedCorpusRecords = [];
  const seenSnippets = new Set();
  const sourceCounts = new Map();
  const sourceOverflowCandidates = [];
  let remainingChars = RETRIEVAL_MAX_TOTAL_CHARS;

  function selectCandidate(candidate, { enforceSourceCap = true } = {}) {
    if (selected.length >= RETRIEVAL_MAX_ITEMS || remainingChars <= 0) {
      return false;
    }

    const sourceKey = getRetrievalSourceKey(candidate);
    if (enforceSourceCap && Number(sourceCounts.get(sourceKey) || 0) >= RETRIEVAL_MAX_ITEMS_PER_SOURCE) {
      sourceOverflowCandidates.push(candidate);
      return false;
    }

    const expandedSnippet = expandAttachmentCandidateSnippet(candidate, queryTokenSet);
    const snippet = truncateText(expandedSnippet, Math.min(RETRIEVAL_SNIPPET_MAX_CHARS, remainingChars));
    if (!snippet || seenSnippets.has(snippet)) {
      return false;
    }

    const matchedTerms = getMatchedRetrievalTerms(expandedSnippet, queryTokens);
    seenSnippets.add(snippet);
    sourceCounts.set(sourceKey, Number(sourceCounts.get(sourceKey) || 0) + 1);
    const selectedItem = {
      chunkIndex: candidate.chunkIndex || null,
      fileName: candidate.fileName || null,
      bm25Score: candidate.bm25Score,
      lexicalScore: candidate.lexicalScore,
      matchedTerms,
      matchTermCount: matchedTerms.length,
      phraseBoostScore: candidate.phraseBoostScore,
      retrievalReason: buildRetrievalReason({
        bm25Score: candidate.bm25Score,
        lexicalScore: candidate.lexicalScore,
        matchedTerms,
        phraseBoostScore: candidate.phraseBoostScore,
      }),
      score: candidate.score,
      snippet,
      sourceLabel: candidate.sourceLabel,
      sourceType: candidate.sourceType,
    };
    selected.push(selectedItem);
    selectedCorpusRecords.push(candidate.corpusRecord);
    remainingChars = Math.max(remainingChars - snippet.length, 0);
    return true;
  }

  for (const candidate of rankedCandidates) {
    if (selected.length >= RETRIEVAL_MAX_ITEMS || remainingChars <= 0) {
      break;
    }

    selectCandidate(candidate, { enforceSourceCap: true });
  }

  for (const candidate of sourceOverflowCandidates) {
    if (selected.length >= RETRIEVAL_MAX_ITEMS || remainingChars <= 0) {
      break;
    }

    selectCandidate(candidate, { enforceSourceCap: false });
  }

  return {
    corpusRecords: selectedCorpusRecords,
    items: selected,
  };
}

export function buildRetrievalContext(input) {
  return collectRetrievalContext(input).items;
}

export function buildRetrievalContextWithCorpus(input) {
  return collectRetrievalContext(input);
}

function getRetrievalPreviewRoles(specialistKinds = []) {
  const roles = [
    { label: '매니저', providerRole: 'manager', role: 'manager' },
    { label: '플래너', providerRole: 'planner', role: 'planner' },
    { label: '실행', providerRole: 'executor', role: 'executor' },
    { label: '리뷰어', providerRole: 'reviewer', role: 'reviewer' },
  ];

  for (const specialistKind of ensureArray(specialistKinds)) {
    roles.push({
      label: `${specialistKind} specialist`,
      providerRole: 'specialist',
      role: 'specialist',
      specialistKind,
    });
  }

  return roles;
}

export function summarizeMissionRetrievalPreview({ attachments, memoryEntries, mission, pack, specialistKinds = [] }) {
  const rolePreviews = getRetrievalPreviewRoles(specialistKinds).map((roleConfig) => ({
    itemCount: 0,
    items: buildRetrievalContext({
      attachments,
      memoryEntries,
      mission,
      pack,
      previousOutputs: {},
      providerRole: roleConfig.providerRole,
      role: roleConfig.role,
    }),
    label: roleConfig.label,
    providerRole: roleConfig.providerRole,
    role: roleConfig.role,
    specialistKind: roleConfig.specialistKind || null,
  }));

  const previewItemMap = new Map();

  for (const preview of rolePreviews) {
    preview.itemCount = preview.items.length;

    for (const item of preview.items) {
      const key = [item.sourceType, item.sourceLabel, item.fileName || '', item.chunkIndex || '', item.snippet].join('|');
      if (!previewItemMap.has(key)) {
        previewItemMap.set(key, {
          ...item,
          roles: [preview.label],
        });
        continue;
      }

      const current = previewItemMap.get(key);
      current.roles = [...new Set([...current.roles, preview.label])];
    }
  }

  const previewItems = [...previewItemMap.values()]
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, RETRIEVAL_MAX_ITEMS);

  return {
    previewItems,
    roles: rolePreviews.map((preview) => ({
      itemCount: preview.itemCount,
      label: preview.label,
      providerRole: preview.providerRole,
      role: preview.role,
      specialistKind: preview.specialistKind,
    })),
    summary: {
      attachmentSourceCount: new Set(previewItems.filter((item) => item.sourceType === 'attachment').map((item) => item.sourceLabel)).size,
      memorySourceCount: new Set(previewItems.filter((item) => item.sourceType === 'memory').map((item) => item.sourceLabel)).size,
      ready: previewItems.length > 0,
      roleCount: rolePreviews.length,
      snippetCount: previewItems.length,
    },
  };
}
