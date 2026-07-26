import { createHash } from 'node:crypto';

import { assertLocalRerankerResourceEnvelope } from './local-reranker-resource-envelope.mjs';

export const LOCAL_RERANKER_RUNTIME_STABILITY_SCHEMA_VERSION =
  'personal-ai-agent-local-reranker-runtime-stability/v1';

const EXPECTED_RUNS = Object.freeze([
  { id: 'cold-1', lane: 'cold', workerIndex: null },
  { id: 'warm-1', lane: 'warm', workerIndex: null },
  { id: 'warm-2', lane: 'warm', workerIndex: null },
  { id: 'warm-3', lane: 'warm', workerIndex: null },
  { id: 'concurrent-1', lane: 'concurrent', workerIndex: 1 },
  { id: 'concurrent-2', lane: 'concurrent', workerIndex: 2 },
]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(`${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`);
  }
  return normalized;
}

function normalizeLifecycle(lifecycle = {}, priorEnvelope) {
  if (
    normalizeText(lifecycle.modelId) !== priorEnvelope.resourceSnapshot.modelId ||
    normalizeText(lifecycle.source) !== 'ollama-api-ps-and-conditional-generate-unload' ||
    lifecycle.modelAbsentBeforeCold !== true
  ) {
    throw new Error('Runtime stability requires confirmed model absence before the cold run.');
  }
  return {
    elapsedMs: normalizePositiveNumber(lifecycle.elapsedMs, 'lifecycle elapsedMs'),
    initiallyLoaded: lifecycle.initiallyLoaded === true,
    modelAbsentBeforeCold: true,
    modelId: normalizeText(lifecycle.modelId),
    pollCount: normalizePositiveNumber(lifecycle.pollCount, 'lifecycle pollCount', {
      integer: true,
    }),
    source: 'ollama-api-ps-and-conditional-generate-unload',
    unloadRequested: lifecycle.unloadRequested === true,
  };
}

function normalizeCaseScores(caseScores) {
  return ensureArray(caseScores)
    .map((item) => ({
      firstDurationMs: normalizePositiveNumber(item.firstDurationMs, 'firstDurationMs'),
      id: normalizeText(item.id),
      repeatedScoreMatch: item.repeatedScoreMatch === true,
      secondDurationMs: normalizePositiveNumber(item.secondDurationMs, 'secondDurationMs'),
      sourceScores: ensureArray(item.sourceScores)
        .map((source) => ({
          score: Number(source.score),
          sourceKey: normalizeText(source.sourceKey),
        }))
        .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey)),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function latencyFromCaseScores(caseScores) {
  const durations = caseScores.flatMap((item) => [item.firstDurationMs, item.secondDurationMs]);
  return {
    maximumMs: percentile(durations, 100),
    modelInferenceCount: caseScores.reduce(
      (sum, item) => sum + item.sourceScores.length * 2,
      0,
    ),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    rerankPassCount: durations.length,
    totalMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(3)),
  };
}

function extractRunEvidence(run, priorEnvelope) {
  if (!run.resourceEnvelope) {
    return run;
  }
  const envelope = run.resourceEnvelope;
  assertLocalRerankerResourceEnvelope(envelope);
  if (normalizeText(run.observedAt) !== envelope.observedAt) {
    throw new Error('Runtime stability run observedAt must match its resource envelope.');
  }
  return {
    ...run,
    binding: {
      candidateEvaluationHash: envelope.optimizedEvaluation.candidate.evaluationHash,
      fixtureHash: envelope.optimizedEvaluation.fixtureHash,
      modelDigest: envelope.optimizedEvaluation.model.digest,
      priorEvaluationHash: envelope.priorEvaluation.evaluationHash,
      promptHash: envelope.scorer.promptHash,
      promptVersion: envelope.scorer.promptVersion,
      scorerId: envelope.scorer.id,
    },
    caseScores: envelope.caseScores,
    latency: envelope.latency,
    quality: {
      candidateStatus: envelope.optimizedEvaluation.candidate.status,
      qualityParity: envelope.qualityParity,
      repeatStable: envelope.repeatStable,
      shortlistCoveragePassed: envelope.shortlistCoveragePassed,
    },
    resourceEnvelopeHash: envelope.envelopeHash,
    resourceEnvelopeStatus: envelope.status,
    resourceSnapshot: envelope.resourceSnapshot,
  };
}

function normalizeRun(run = {}, priorEnvelope) {
  const evidence = extractRunEvidence(run, priorEnvelope);
  const observedAt = normalizeText(evidence.observedAt);
  if (!Number.isFinite(Date.parse(observedAt))) {
    throw new Error('Runtime stability run observedAt must be a valid timestamp.');
  }
  const workerIndex = evidence.workerIndex === null || evidence.workerIndex === undefined
    ? null
    : normalizePositiveNumber(evidence.workerIndex, 'workerIndex', { integer: true });
  const caseScores = normalizeCaseScores(evidence.caseScores);
  const expectedCaseIds = priorEnvelope.caseScores.map((item) => item.id).sort();
  if (
    caseScores.length !== expectedCaseIds.length ||
    JSON.stringify(caseScores.map((item) => item.id)) !== JSON.stringify(expectedCaseIds)
  ) {
    throw new Error('Runtime stability run must use the R9 case set.');
  }
  const selectionById = new Map(
    priorEnvelope.selectionRecords.map((item) => [item.id, item.selectedSourceKeys]),
  );
  const expectedTopSourceById = new Map(
    priorEnvelope.optimizedEvaluation.candidate.cases.map((item) => [
      item.id,
      item.evidence.selectedSourceKeys[0],
    ]),
  );
  for (const item of caseScores) {
    const selectedSourceKeys = selectionById.get(item.id);
    if (
      !selectedSourceKeys ||
      item.sourceScores.length !== selectedSourceKeys.length ||
      item.sourceScores.some((source) =>
        !source.sourceKey ||
        !Number.isInteger(source.score) ||
        source.score < 0 ||
        source.score > 100) ||
      JSON.stringify(item.sourceScores.map((source) => source.sourceKey)) !==
        JSON.stringify([...selectedSourceKeys].sort())
    ) {
      throw new Error(`Runtime stability score sources must match the R9 shortlist: ${item.id}.`);
    }
    const baselineIndex = new Map(selectedSourceKeys.map((sourceKey, index) => [sourceKey, index]));
    const topSource = [...item.sourceScores].sort((left, right) =>
      right.score - left.score ||
      baselineIndex.get(left.sourceKey) - baselineIndex.get(right.sourceKey),
    )[0].sourceKey;
    if (topSource !== expectedTopSourceById.get(item.id)) {
      throw new Error(`Runtime stability quality selection drifted from R9: ${item.id}.`);
    }
  }
  const latency = latencyFromCaseScores(caseScores);
  if (JSON.stringify(latency) !== JSON.stringify(evidence.latency)) {
    throw new Error('Runtime stability latency must be derived from the recorded case scores.');
  }
  const expectedBinding = {
    candidateEvaluationHash: priorEnvelope.optimizedEvaluation.candidate.evaluationHash,
    fixtureHash: priorEnvelope.optimizedEvaluation.fixtureHash,
    modelDigest: priorEnvelope.optimizedEvaluation.model.digest,
    priorEvaluationHash: priorEnvelope.priorEvaluation.evaluationHash,
    promptHash: priorEnvelope.scorer.promptHash,
    promptVersion: priorEnvelope.scorer.promptVersion,
    scorerId: priorEnvelope.scorer.id,
  };
  if (JSON.stringify(evidence.binding) !== JSON.stringify(expectedBinding)) {
    throw new Error('Runtime stability run must retain the R9 model, scorer, and quality binding.');
  }
  if (JSON.stringify(evidence.resourceSnapshot) !== JSON.stringify(priorEnvelope.resourceSnapshot)) {
    throw new Error('Runtime stability run resource snapshot drifted from R9.');
  }
  const repeatStable = caseScores.every((item) => item.repeatedScoreMatch);
  const quality = {
    candidateStatus: normalizeText(evidence.quality?.candidateStatus),
    qualityParity: evidence.quality?.qualityParity === true,
    repeatStable: evidence.quality?.repeatStable === true,
    shortlistCoveragePassed: evidence.quality?.shortlistCoveragePassed === true,
  };
  if (
    quality.candidateStatus !== 'passed' ||
    quality.qualityParity !== true ||
    quality.repeatStable !== repeatStable ||
    quality.shortlistCoveragePassed !== true
  ) {
    throw new Error('Runtime stability run must preserve R9 quality and repeat evidence.');
  }
  const resourceEnvelopeHash = normalizeText(evidence.resourceEnvelopeHash);
  const resourceEnvelopeStatus = normalizeText(evidence.resourceEnvelopeStatus);
  if (!/^[a-f0-9]{64}$/.test(resourceEnvelopeHash)) {
    throw new Error('Runtime stability run requires its resource envelope hash.');
  }
  if (![
    'resource-envelope-passed-governance-blocked',
    'failed-keep-r8-full-scan',
  ].includes(resourceEnvelopeStatus)) {
    throw new Error('Runtime stability run requires a supported resource envelope status.');
  }
  return {
    binding: expectedBinding,
    caseScores,
    id: normalizeText(evidence.id),
    lane: normalizeText(evidence.lane),
    latency,
    observedAt,
    quality,
    resourceEnvelopeHash,
    resourceEnvelopeStatus,
    resourceSnapshot: evidence.resourceSnapshot,
    wallDurationMs: normalizePositiveNumber(evidence.wallDurationMs, 'wallDurationMs'),
    workerIndex,
  };
}

function normalizeRuns(runs, priorEnvelope) {
  const normalized = ensureArray(runs).map((run) => normalizeRun(run, priorEnvelope));
  if (normalized.length !== EXPECTED_RUNS.length) {
    throw new Error(`Runtime stability requires exactly ${EXPECTED_RUNS.length} runs.`);
  }
  for (let index = 0; index < EXPECTED_RUNS.length; index += 1) {
    const expected = EXPECTED_RUNS[index];
    const actual = normalized[index];
    if (
      actual.id !== expected.id ||
      actual.lane !== expected.lane ||
      actual.workerIndex !== expected.workerIndex
    ) {
      throw new Error('Runtime stability runs must keep the fixed cold, warm, and concurrent order.');
    }
  }
  return normalized;
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil((percentileValue / 100) * sorted.length) - 1, 0);
  return Number(sorted[index].toFixed(3));
}

function rate(value) {
  return Number(Number(value).toFixed(4));
}

function runDurations(run) {
  return run.caseScores.flatMap((item) => [
    item.firstDurationMs,
    item.secondDurationMs,
  ]);
}

function aggregateLatency(runs) {
  const durations = runs.flatMap(runDurations);
  return {
    maximumMs: percentile(durations, 100),
    modelInferenceCount: runs.reduce(
      (sum, run) => sum + run.latency.modelInferenceCount,
      0,
    ),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    rerankPassCount: durations.length,
    totalMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(3)),
    summedRunWallDurationMs: Number(
      runs.reduce((sum, run) => sum + run.wallDurationMs, 0).toFixed(3),
    ),
  };
}

function buildStabilityContent({
  concurrencyBatchWallMs,
  lifecycle,
  observedAt,
  priorEnvelope,
  runs,
} = {}) {
  assertLocalRerankerResourceEnvelope(priorEnvelope);
  if (
    priorEnvelope.status !== 'resource-envelope-passed-governance-blocked' ||
    priorEnvelope.actualLocalRerankerResourceEnvelopeValidated !== true ||
    priorEnvelope.actualLocalRerankerResourceEnvelopeQualified !== false
  ) {
    throw new Error('Runtime stability requires the current validated and governance-blocked R9 envelope.');
  }
  const normalizedObservedAt = normalizeText(observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('Runtime stability observedAt must be a valid timestamp.');
  }
  const normalizedLifecycle = normalizeLifecycle(lifecycle, priorEnvelope);
  const normalizedRuns = normalizeRuns(runs, priorEnvelope);
  const normalizedConcurrencyBatchWallMs = normalizePositiveNumber(
    concurrencyBatchWallMs,
    'concurrencyBatchWallMs',
  );
  const coldRuns = normalizedRuns.filter((run) => run.lane === 'cold');
  const warmRuns = normalizedRuns.filter((run) => run.lane === 'warm');
  const concurrentRuns = normalizedRuns.filter((run) => run.lane === 'concurrent');
  const coldLatency = aggregateLatency(coldRuns);
  const warmLatency = aggregateLatency(warmRuns);
  const concurrentLatency = aggregateLatency(concurrentRuns);
  const allLatency = aggregateLatency(normalizedRuns);
  const warmP95ByRun = warmRuns.map((run) => run.latency.p95Ms);
  const qualityParity = normalizedRuns.every((run) =>
    run.quality.qualityParity === true &&
    run.quality.repeatStable === true &&
    run.quality.shortlistCoveragePassed === true &&
    run.quality.candidateStatus === 'passed' &&
    run.latency.modelInferenceCount === 60,
  );
  const resourceStable = normalizedRuns.every((run) =>
    JSON.stringify(run.resourceSnapshot) ===
      JSON.stringify(priorEnvelope.resourceSnapshot),
  );
  const warmP95DriftRate = rate(
    (warmP95ByRun.at(-1) - warmP95ByRun[0]) / warmP95ByRun[0],
  );
  const warmP95R9Multiplier = rate(warmLatency.p95Ms / priorEnvelope.latency.p95Ms);
  const concurrencyP95Multiplier = rate(concurrentLatency.p95Ms / warmLatency.p95Ms);
  const coldStartPassMs = coldRuns[0].caseScores[0].firstDurationMs;
  const coldStartOverWarmP50Ms = Number(
    (coldStartPassMs - warmLatency.p50Ms).toFixed(3),
  );
  const thresholds = {
    concurrencyP95MaximumWarmMultiplier: 2.5,
    warmP95MaximumDriftRate: 0.25,
    warmP95MaximumR9Multiplier: 1.25,
  };
  const boundedRuntimeStabilityPassed =
    qualityParity &&
    resourceStable &&
    normalizedLifecycle.modelAbsentBeforeCold &&
    warmP95DriftRate <= thresholds.warmP95MaximumDriftRate &&
    warmP95R9Multiplier <= thresholds.warmP95MaximumR9Multiplier &&
    concurrencyP95Multiplier <= thresholds.concurrencyP95MaximumWarmMultiplier &&
    priorEnvelope.runtime.cloudFeaturesDisabled === true;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRerankerRuntimeStabilityQualified: false,
    actualLocalRerankerRuntimeStabilityValidated: boundedRuntimeStabilityPassed,
    concurrency: {
      batchWallDurationMs: normalizedConcurrencyBatchWallMs,
      clientWorkerCount: concurrentRuns.length,
      p95WarmMultiplier: concurrencyP95Multiplier,
      productionServerParallelism: 'not-proven',
      validated: boundedRuntimeStabilityPassed,
    },
    costFree: true,
    decision: boundedRuntimeStabilityPassed
      ? 'hold-r9-shortlist-for-governance'
      : 'keep-r9-single-run-evidence',
    governance: {
      approvedColdStartSlo: false,
      approvedConcurrencyLimit: false,
      licenseApproved: false,
      longDurationSoakValidated: false,
      networkIsolationProven: false,
      productionSustainedConcurrencyValidated: false,
      rollbackOwnerApproved: false,
      thermalTelemetryAvailable: false,
      thermalEnvelopeValidated: false,
    },
    latency: {
      all: allLatency,
      cold: {
        ...coldLatency,
        firstPassMs: coldStartPassMs,
        firstPassOverWarmP50Ms: coldStartOverWarmP50Ms,
      },
      concurrent: concurrentLatency,
      warm: {
        ...warmLatency,
        p95ByRunMs: warmP95ByRun,
        p95DriftRate: warmP95DriftRate,
        p95R9Multiplier: warmP95R9Multiplier,
      },
    },
    lifecycle: normalizedLifecycle,
    observedAt: normalizedObservedAt,
    priorEnvelope,
    productionReadyClaim: false,
    qualityParity,
    resourceStable,
    rollback: {
      primary: 'r9-shortlist',
      secondary: 'r8-full-scan',
      stateMigrationRequired: false,
      tertiary: 'lexical',
    },
    runContract: {
      coldRunCount: coldRuns.length,
      concurrentRunCount: concurrentRuns.length,
      expectedModelInferenceCount: 360,
      totalRunCount: normalizedRuns.length,
      warmRunCount: warmRuns.length,
    },
    runs: normalizedRuns,
    runtime: priorEnvelope.runtime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RERANKER_RUNTIME_STABILITY_SCHEMA_VERSION,
    status: boundedRuntimeStabilityPassed
      ? 'bounded-runtime-stability-passed-governance-blocked'
      : 'failed-keep-r9-single-run-evidence',
    thresholds,
  };
}

export function buildLocalRerankerRuntimeStability(input = {}) {
  const content = buildStabilityContent(input);
  const stabilityHash = hashRecord(content);
  return {
    ...content,
    id: `local-reranker-runtime-stability-${stabilityHash}`,
    stabilityHash,
  };
}

export function assertLocalRerankerRuntimeStability(stability) {
  const { id, stabilityHash, ...content } = stability || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    stabilityHash !== expectedHash ||
    id !== `local-reranker-runtime-stability-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  if (
    stability?.activation?.authorized !== false ||
    stability?.runtimeActivation !== false ||
    stability?.productionReadyClaim !== false ||
    stability?.runtime?.externalProviderCalls !== 'none'
  ) {
    errors.push('claim-boundary');
  }
  try {
    const rebuilt = buildStabilityContent({
      concurrencyBatchWallMs: stability?.concurrency?.batchWallDurationMs,
      lifecycle: stability?.lifecycle,
      observedAt: stability?.observedAt,
      priorEnvelope: stability?.priorEnvelope,
      runs: stability?.runs,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (errors.length) {
    throw new Error(`Local reranker runtime stability failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
