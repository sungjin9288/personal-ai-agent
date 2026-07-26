import { createHash } from 'node:crypto';

import { RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION } from './retrieval-quality-evaluation.mjs';

export const RETRIEVAL_ROBUSTNESS_EVALUATION_SCHEMA_VERSION =
  'personal-ai-agent-retrieval-robustness-evaluation/v1';

export const REQUIRED_RETRIEVAL_VARIATION_TYPES = Object.freeze([
  'canonical',
  'paraphrase',
  'noisy-query',
  'cross-language',
  'hard-negative',
]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isValidTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function normalizePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(`${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`);
  }
  return normalized;
}

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(4));
}

function normalizeQualityEvaluation(evaluation, label) {
  if (
    evaluation?.schemaVersion !== RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !normalizeText(evaluation.algorithmId) ||
    !Array.isArray(evaluation.cases) ||
    evaluation.cases.length === 0 ||
    !Array.isArray(evaluation.failures) ||
    !evaluation.metrics ||
    !evaluation.thresholds ||
    evaluation.productionReadyClaim !== false
  ) {
    throw new Error(`${label} must use the retrieval quality evaluation contract.`);
  }

  const cases = evaluation.cases
    .map((result) => ({
      evidence: {
        missingExpectedSourceKeys: ensureArray(result.evidence?.missingExpectedSourceKeys),
        retrievedIrrelevantSourceKeys: ensureArray(result.evidence?.retrievedIrrelevantSourceKeys),
        selectedSourceKeys: ensureArray(result.evidence?.selectedSourceKeys),
        unlabeledRetrievedSourceKeys: ensureArray(result.evidence?.unlabeledRetrievedSourceKeys),
      },
      id: normalizeText(result.id),
      k: normalizePositiveNumber(result.k, `${label} case k`, { integer: true }),
      metrics: result.metrics,
      status: normalizeText(result.status),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (cases.some((result) => !result.id) || new Set(cases.map((result) => result.id)).size !== cases.length) {
    throw new Error(`${label} case ids must be unique and non-empty.`);
  }

  const content = {
    algorithmId: normalizeText(evaluation.algorithmId),
    cases,
    failures: evaluation.failures,
    metrics: evaluation.metrics,
    productionReadyClaim: false,
    schemaVersion: evaluation.schemaVersion,
    status: normalizeText(evaluation.status),
    thresholds: evaluation.thresholds,
  };
  return { ...content, evaluationHash: hashRecord(content) };
}

function normalizeCaseMetadata(caseMetadata) {
  const normalized = ensureArray(caseMetadata)
    .map((item) => ({
      durationMs: normalizePositiveNumber(item.durationMs, 'case durationMs'),
      id: normalizeText(item.id),
      scenarioId: normalizeText(item.scenarioId),
      variationType: normalizeText(item.variationType),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    normalized.length === 0 ||
    normalized.some((item) => !item.id || !item.scenarioId || !item.variationType) ||
    new Set(normalized.map((item) => item.id)).size !== normalized.length
  ) {
    throw new Error('Robustness case metadata requires unique ids, scenarios, and variation types.');
  }
  return normalized;
}

function normalizeCoverage(coverage = {}) {
  const requiredVariationTypes = ensureArray(coverage.requiredVariationTypes)
    .map((value) => normalizeText(value))
    .filter(Boolean);
  if (
    JSON.stringify(requiredVariationTypes) !== JSON.stringify(REQUIRED_RETRIEVAL_VARIATION_TYPES)
  ) {
    throw new Error('Robustness coverage must use the required retrieval variation types in order.');
  }
  return {
    minimumCasesPerVariation: normalizePositiveNumber(
      coverage.minimumCasesPerVariation,
      'minimumCasesPerVariation',
      { integer: true },
    ),
    minimumScenarioCount: normalizePositiveNumber(
      coverage.minimumScenarioCount,
      'minimumScenarioCount',
      { integer: true },
    ),
    requiredVariationTypes,
  };
}

function normalizeModel(model = {}) {
  if (
    !normalizeText(model.id) ||
    !isSha256(model.digest) ||
    !isSha256(model.candidateEvidenceHash) ||
    !isSha256(model.qualificationHash) ||
    model.actualModelEvaluated !== true
  ) {
    throw new Error('Robustness evaluation requires an actual qualified-candidate model binding.');
  }
  return {
    actualModelEvaluated: true,
    candidateEvidenceHash: normalizeText(model.candidateEvidenceHash),
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    qualificationHash: normalizeText(model.qualificationHash),
    qualificationStatus: normalizeText(model.qualificationStatus),
    qualified: model.qualified === true,
    source: 'local-embedding-model-qualification',
  };
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    runtime.transportLoopback !== true
  ) {
    throw new Error('Robustness runtime requires loopback Ollama identity and version.');
  }
  return {
    cloudFeaturesDisabled: runtime.cloudFeaturesDisabled === true,
    externalProviderCalls: 'none',
    kind: 'ollama',
    networkIsolation: 'not-proven',
    transportLoopback: true,
    version: normalizeText(runtime.version),
  };
}

function average(values) {
  return roundMetric(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}

function summarizeGroup(items) {
  return {
    caseCount: items.length,
    casePassRate: average(items.map((item) => item.status === 'passed' ? 1 : 0)),
    noiseRateAtK: average(items.map((item) => item.metrics.noiseRateAtK)),
    precisionAtK: average(items.map((item) => item.metrics.precisionAtK)),
    recallAtK: average(items.map((item) => item.metrics.recallAtK)),
    sourceDiversityRate: average(items.map((item) => item.metrics.sourceDiversityRate)),
    unlabeledRetrievedSourceCount: items.reduce(
      (sum, item) => sum + Number(item.metrics.unlabeledRetrievedSourceCount || 0),
      0,
    ),
  };
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil((percentileValue / 100) * sorted.length) - 1, 0);
  return Number(sorted[index].toFixed(3));
}

function buildEvaluationContent({
  baselineEvaluation,
  candidateEvaluation,
  caseMetadata,
  comparison,
  coverage,
  fixtureHash,
  model,
  observedAt,
  runtime,
} = {}) {
  const normalizedObservedAt = normalizeText(observedAt);
  if (!isValidTimestamp(normalizedObservedAt) || !isSha256(fixtureHash)) {
    throw new Error('Robustness evaluation requires observedAt and fixture SHA-256.');
  }
  const baseline = normalizeQualityEvaluation(baselineEvaluation, 'baselineEvaluation');
  const candidate = normalizeQualityEvaluation(candidateEvaluation, 'candidateEvaluation');
  const metadata = normalizeCaseMetadata(caseMetadata);
  const normalizedCoverage = normalizeCoverage(coverage);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const metadataById = new Map(metadata.map((item) => [item.id, item]));
  const candidateIds = candidate.cases.map((item) => item.id);
  if (
    JSON.stringify(baseline.cases.map((item) => item.id)) !== JSON.stringify(candidateIds) ||
    JSON.stringify(metadata.map((item) => item.id)) !== JSON.stringify(candidateIds)
  ) {
    throw new Error('Robustness baseline, candidate, and case metadata must use the same case set.');
  }
  if (
    normalizeText(comparison?.baselineAlgorithmId) !== baseline.algorithmId ||
    normalizeText(comparison?.candidateAlgorithmId) !== candidate.algorithmId
  ) {
    throw new Error('Robustness comparison must bind the baseline and candidate algorithms.');
  }
  if (
    metadata.some(
      (item) => !normalizedCoverage.requiredVariationTypes.includes(item.variationType),
    )
  ) {
    throw new Error('Robustness case metadata contains an unsupported variation type.');
  }

  const scenarios = [...new Set(metadata.map((item) => item.scenarioId))].sort();
  const variationCounts = Object.fromEntries(
    normalizedCoverage.requiredVariationTypes.map((variationType) => [
      variationType,
      metadata.filter((item) => item.variationType === variationType).length,
    ]),
  );
  const matrixComplete = scenarios.every((scenarioId) =>
    normalizedCoverage.requiredVariationTypes.every((variationType) =>
      metadata.some(
        (item) => item.scenarioId === scenarioId && item.variationType === variationType,
      ),
    ),
  );
  const coveragePassed =
    scenarios.length >= normalizedCoverage.minimumScenarioCount &&
    Object.values(variationCounts).every(
      (count) => count >= normalizedCoverage.minimumCasesPerVariation,
    ) &&
    matrixComplete;
  const candidateCases = candidate.cases.map((item) => ({
    ...item,
    ...metadataById.get(item.id),
  }));
  const variationMetrics = Object.fromEntries(
    normalizedCoverage.requiredVariationTypes.map((variationType) => [
      variationType,
      summarizeGroup(candidateCases.filter((item) => item.variationType === variationType)),
    ]),
  );
  const scenarioMetrics = Object.fromEntries(
    scenarios.map((scenarioId) => [
      scenarioId,
      summarizeGroup(candidateCases.filter((item) => item.scenarioId === scenarioId)),
    ]),
  );
  const qualityPassed =
    coveragePassed &&
    candidate.status === 'passed' &&
    candidate.failures.length === 0 &&
    normalizeText(comparison?.status) === 'passed' &&
    ensureArray(comparison?.failures).length === 0;
  const durationValues = metadata.map((item) => item.durationMs);

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRetrievalRobustnessValidated: qualityPassed,
    baseline,
    candidate,
    cases: metadata,
    comparison: {
      baselineAlgorithmId: normalizeText(comparison?.baselineAlgorithmId),
      candidateAlgorithmId: normalizeText(comparison?.candidateAlgorithmId),
      failures: ensureArray(comparison?.failures),
      status: normalizeText(comparison?.status),
    },
    costFree: true,
    coverage: {
      ...normalizedCoverage,
      matrixComplete,
      passed: coveragePassed,
      scenarioCount: scenarios.length,
      variationCounts,
    },
    decision: qualityPassed ? 'hold-for-governance' : 'keep-lexical',
    fixtureHash: normalizeText(fixtureHash),
    latency: {
      caseCount: durationValues.length,
      maximumMs: percentile(durationValues, 100),
      p50Ms: percentile(durationValues, 50),
      p95Ms: percentile(durationValues, 95),
      totalMs: Number(durationValues.reduce((sum, value) => sum + value, 0).toFixed(3)),
    },
    model: normalizedModel,
    observedAt: normalizedObservedAt,
    productionReadyClaim: false,
    rollback: {
      mode: 'lexical',
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    scenarioMetrics,
    schemaVersion: RETRIEVAL_ROBUSTNESS_EVALUATION_SCHEMA_VERSION,
    status: qualityPassed ? 'passed-governance-blocked' : 'failed-keep-lexical',
    variationMetrics,
  };
}

export function buildLocalRetrievalRobustnessEvaluation(input = {}) {
  const content = buildEvaluationContent(input);
  const evaluationHash = hashRecord(content);
  return {
    ...content,
    evaluationHash,
    id: `local-retrieval-robustness-${evaluationHash}`,
  };
}

export function assertLocalRetrievalRobustnessEvaluation(evaluation) {
  const { evaluationHash, id, ...content } = evaluation || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evaluationHash !== expectedHash || id !== `local-retrieval-robustness-${expectedHash}`) {
    errors.push('integrity');
  }
  if (
    evaluation?.activation?.authorized !== false ||
    evaluation?.productionReadyClaim !== false ||
    evaluation?.costFree !== true ||
    evaluation?.runtime?.externalProviderCalls !== 'none'
  ) {
    errors.push('claim-boundary');
  }
  try {
    const rebuilt = buildEvaluationContent({
      baselineEvaluation: evaluation?.baseline,
      candidateEvaluation: evaluation?.candidate,
      caseMetadata: evaluation?.cases,
      comparison: evaluation?.comparison,
      coverage: evaluation?.coverage,
      fixtureHash: evaluation?.fixtureHash,
      model: evaluation?.model,
      observedAt: evaluation?.observedAt,
      runtime: evaluation?.runtime,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (errors.length) {
    throw new Error(`Local retrieval robustness evaluation failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
