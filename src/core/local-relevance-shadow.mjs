import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { selectLocalRelevanceCandidates } from './local-relevance-candidate-selector.mjs';
import { rerankByLocalRelevance } from './local-relevance-reranker.mjs';

export const LOCAL_RELEVANCE_SHADOW_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-observation/v1';
export const LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS = Object.freeze({
  FULL_RETRIEVAL: 'full-retrieval-query-v1',
  MISSION_OBJECTIVE: 'mission-objective-v1',
});

const MAX_SHADOW_CANDIDATES = 2;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildLocalRelevanceShadowQueryText(input = {}) {
  const queryText = normalizeText(input.mission?.objective);
  if (!queryText) {
    throw new Error('Local relevance shadow requires a mission objective.');
  }
  return queryText;
}

function sourceKey(record) {
  return `${normalizeText(record?.sourceType)}:${normalizeText(record?.sourceId)}`;
}

function normalizeScorer(scorer = {}) {
  const normalized = {
    id: normalizeText(scorer.id),
    modelId: normalizeText(scorer.modelId),
    promptHash: normalizeText(scorer.promptHash),
    promptVersion: normalizeText(scorer.promptVersion),
  };
  if (
    !normalized.id ||
    !normalized.modelId ||
    !/^[a-f0-9]{64}$/.test(normalized.promptHash) ||
    !normalized.promptVersion
  ) {
    throw new Error('Local relevance shadow requires bound scorer identity and prompt evidence.');
  }
  return normalized;
}

function buildCandidates(lexical = {}) {
  const candidates = [];
  const seenSources = new Set();
  const corpusRecords = ensureArray(lexical.corpusRecords);
  const items = ensureArray(lexical.items);

  for (let index = 0; index < corpusRecords.length; index += 1) {
    const record = corpusRecords[index];
    const key = sourceKey(record);
    if (!normalizeText(record?.content) || key === ':' || seenSources.has(key)) {
      continue;
    }
    seenSources.add(key);
    candidates.push({
      baselineRank: candidates.length + 1,
      content: record.content,
      sourceId: normalizeText(record.sourceId) || null,
      sourceKey: key,
      sourceLabel: normalizeText(items[index]?.sourceLabel, record.sourceLabel) || null,
      sourceType: normalizeText(record.sourceType) || null,
    });
  }

  return candidates;
}

function buildCandidateBindings(candidates) {
  return candidates.map((candidate) => ({
    baselineRank: candidate.baselineRank,
    contentHash: hashValue(candidate.content),
    sourceKeyHash: hashValue(candidate.sourceKey),
    sourceType: candidate.sourceType,
  }));
}

function buildObservation({
  candidates,
  durationMs,
  failureCode = null,
  input,
  lexical,
  observedAt,
  queryText,
  reranked = null,
  scorer,
  status,
} = {}) {
  const lexicalResultHash = hashRecord(lexical);
  const lexicalSourceKeyHashes = candidates.map((candidate) => hashValue(candidate.sourceKey));
  const shadowSourceKeyHashes = ensureArray(reranked?.retrievedItems)
    .map((item) => hashValue(item.sourceKey));
  const content = {
    activationAuthorized: false,
    candidateBindings: buildCandidateBindings(candidates),
    costFree: true,
    externalProviderCalls: 'none',
    failureCode,
    latencyMs: Math.max(Number(durationMs.toFixed(3)), 0.001),
    networkIsolation: 'not-proven',
    observedAt,
    productionReadyClaim: false,
    providerInput: {
      changed: false,
      lexicalResultHash,
      returnedResultHash: lexicalResultHash,
    },
    queryHash: hashValue(queryText),
    rollback: {
      mode: 'lexical',
      stateMigrationRequired: false,
    },
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_SCHEMA_VERSION,
    scope: {
      missionIdHash: hashValue(normalizeText(input?.mission?.id, '-')),
      providerRole: normalizeText(input?.providerRole),
      role: normalizeText(input?.role),
      workspaceIdHash: hashValue(normalizeText(input?.workspace?.id, '-')),
    },
    scorer,
    selection: {
      inputCandidateCount: candidates.length,
      lexicalSourceKeyHashes,
      shadowSourceKeyHashes,
      topSourceChanged: shadowSourceKeyHashes.length
        ? lexicalSourceKeyHashes[0] !== shadowSourceKeyHashes[0]
        : null,
    },
    status,
    storeMutationRequired: false,
  };
  const observationHash = hashRecord(content);
  return {
    ...content,
    id: `local-relevance-shadow-observation-${observationHash}`,
    observationHash,
  };
}

export function assertLocalRelevanceShadowObservation(observation) {
  const { id, observationHash, ...content } = observation || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    observationHash !== expectedHash ||
    id !== `local-relevance-shadow-observation-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  if (
    observation?.schemaVersion !== LOCAL_RELEVANCE_SHADOW_SCHEMA_VERSION ||
    observation?.activationAuthorized !== false ||
    observation?.runtimeActivation !== false ||
    observation?.productionReadyClaim !== false ||
    observation?.externalProviderCalls !== 'none' ||
    observation?.providerInput?.changed !== false ||
    observation?.providerInput?.lexicalResultHash !==
      observation?.providerInput?.returnedResultHash ||
    observation?.storeMutationRequired !== false
  ) {
    errors.push('claim-boundary');
  }
  if (
    !['observed', 'failed-lexical-preserved', 'skipped-no-candidates'].includes(
      observation?.status,
    ) ||
    !Array.isArray(observation?.candidateBindings) ||
    !Array.isArray(observation?.selection?.lexicalSourceKeyHashes) ||
    !Array.isArray(observation?.selection?.shadowSourceKeyHashes)
  ) {
    errors.push('contract');
  }
  if (
    observation?.status === 'observed' &&
    (!observation.selection.shadowSourceKeyHashes.length || observation.failureCode !== null)
  ) {
    errors.push('observed-result');
  }
  if (
    observation?.status === 'failed-lexical-preserved' &&
    (observation.failureCode !== 'scorer-failed' ||
      observation.selection.shadowSourceKeyHashes.length)
  ) {
    errors.push('failure-result');
  }
  if (errors.length) {
    throw new Error(`Local relevance shadow observation failed: ${[...new Set(errors)].join(', ')}.`);
  }
}

export function createLocalRelevanceShadowEvaluator({
  clock = () => new Date().toISOString(),
  queryTextBuilder = buildLocalRelevanceShadowQueryText,
  recordObservation = () => {},
  scorer,
} = {}) {
  if (typeof scorer?.scoreDocument !== 'function') {
    throw new Error('Local relevance shadow requires a document scorer.');
  }
  if (typeof queryTextBuilder !== 'function') {
    throw new Error('Local relevance shadow requires a query text builder.');
  }
  const scorerIdentity = normalizeScorer(scorer);

  return {
    async observe({ input = {}, lexical = {} } = {}) {
      const startedAt = performance.now();
      const candidates = buildCandidates(lexical);
      const queryText = queryTextBuilder(input);
      let observation;

      if (!candidates.length) {
        observation = buildObservation({
          candidates,
          durationMs: performance.now() - startedAt,
          input,
          lexical,
          observedAt: clock(),
          queryText,
          scorer: scorerIdentity,
          status: 'skipped-no-candidates',
        });
      } else {
        const selection = selectLocalRelevanceCandidates({
          candidates,
          maxCandidates: Math.min(MAX_SHADOW_CANDIDATES, candidates.length),
        });
        try {
          const reranked = await rerankByLocalRelevance({
            candidates: selection.candidates,
            k: selection.candidates.length,
            queryText,
            scorer,
          });
          observation = buildObservation({
            candidates: selection.candidates,
            durationMs: performance.now() - startedAt,
            input,
            lexical,
            observedAt: clock(),
            queryText,
            reranked,
            scorer: scorerIdentity,
            status: 'observed',
          });
        } catch {
          observation = buildObservation({
            candidates: selection.candidates,
            durationMs: performance.now() - startedAt,
            failureCode: 'scorer-failed',
            input,
            lexical,
            observedAt: clock(),
            queryText,
            scorer: scorerIdentity,
            status: 'failed-lexical-preserved',
          });
        }
      }

      assertLocalRelevanceShadowObservation(observation);
      try {
        await recordObservation(observation);
      } catch {
        // Shadow evidence must never alter the lexical provider path.
      }
      return observation;
    },
  };
}
