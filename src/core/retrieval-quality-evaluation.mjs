export const RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION =
  'personal-ai-agent-retrieval-quality-evaluation/v1';

export const DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS = Object.freeze({
  maximumNoiseRateAtK: 0,
  maximumUnlabeledRetrievedSourceCount: 0,
  minimumCasePassRate: 1,
  minimumPrecisionAtK: 1,
  minimumRecallAtK: 1,
  minimumSourceDiversityRate: 1,
});

const HIGHER_IS_BETTER_METRICS = [
  'precisionAtK',
  'recallAtK',
  'sourceDiversityRate',
];
const LOWER_IS_BETTER_METRICS = ['noiseRateAtK', 'unlabeledRetrievedSourceCount'];

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(4));
}

function ratio(numerator, denominator) {
  return denominator ? roundMetric(numerator / denominator) : null;
}

function normalizeRate(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new Error(`${fieldName} must be a number between 0 and 1.`);
  }
  return normalized;
}

function normalizeNonNegativeNumber(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`);
  }
  return normalized;
}

function normalizePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeThresholds(thresholds = {}) {
  return {
    maximumNoiseRateAtK: normalizeRate(
      thresholds.maximumNoiseRateAtK,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.maximumNoiseRateAtK,
      'maximumNoiseRateAtK',
    ),
    maximumUnlabeledRetrievedSourceCount: normalizeNonNegativeNumber(
      thresholds.maximumUnlabeledRetrievedSourceCount,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.maximumUnlabeledRetrievedSourceCount,
      'maximumUnlabeledRetrievedSourceCount',
    ),
    minimumCasePassRate: normalizeRate(
      thresholds.minimumCasePassRate,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.minimumCasePassRate,
      'minimumCasePassRate',
    ),
    minimumPrecisionAtK: normalizeRate(
      thresholds.minimumPrecisionAtK,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.minimumPrecisionAtK,
      'minimumPrecisionAtK',
    ),
    minimumRecallAtK: normalizeRate(
      thresholds.minimumRecallAtK,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.minimumRecallAtK,
      'minimumRecallAtK',
    ),
    minimumSourceDiversityRate: normalizeRate(
      thresholds.minimumSourceDiversityRate,
      DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS.minimumSourceDiversityRate,
      'minimumSourceDiversityRate',
    ),
  };
}

function sourceTypeFromKey(sourceKey) {
  return normalizeText(sourceKey).split(':', 1)[0].toLowerCase();
}

function normalizeSourceDefinition(source, fieldName) {
  const key = normalizeText(source?.key);
  if (!key) {
    throw new Error(`${fieldName} source key is required.`);
  }

  const keyType = sourceTypeFromKey(key);
  const type = normalizeText(source?.type, keyType).toLowerCase();
  if (!type) {
    throw new Error(`${fieldName} source type is required for ${key}.`);
  }
  if (key.includes(':') && type !== keyType) {
    throw new Error(`${fieldName} source type must match its key prefix: ${key}.`);
  }

  return { key, type };
}

function normalizeSourceDefinitions(sources, fieldName) {
  const normalized = ensureArray(sources).map((source) => normalizeSourceDefinition(source, fieldName));
  const keys = normalized.map((source) => source.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${fieldName} source keys must be unique.`);
  }
  return normalized;
}

function sourceKeyForItem(item) {
  const explicitKey = normalizeText(item?.sourceKey);
  if (explicitKey) {
    return explicitKey;
  }

  const sourceType = normalizeText(item?.sourceType).toLowerCase();
  const sourceLabel = normalizeText(item?.sourceLabel);
  return sourceType && sourceLabel ? `${sourceType}:${sourceLabel}` : '';
}

function normalizeRetrievedItem(item, rank) {
  const sourceKey = sourceKeyForItem(item);
  if (!sourceKey) {
    throw new Error(`Retrieved item at rank ${rank} requires a source key.`);
  }

  return {
    rank,
    sourceKey,
  };
}

function belowMinimum(check, actual, required) {
  return actual < required ? { actual, check, required } : null;
}

function aboveMaximum(check, actual, maximum) {
  return actual > maximum ? { actual, check, maximum } : null;
}

function collectMetricFailures(metrics, thresholds, { includeCasePassRate = false } = {}) {
  return [
    includeCasePassRate
      ? belowMinimum('case-pass-rate', metrics.casePassRate, thresholds.minimumCasePassRate)
      : null,
    belowMinimum('precision-at-k', metrics.precisionAtK, thresholds.minimumPrecisionAtK),
    belowMinimum('recall-at-k', metrics.recallAtK, thresholds.minimumRecallAtK),
    belowMinimum(
      'source-diversity-rate',
      metrics.sourceDiversityRate,
      thresholds.minimumSourceDiversityRate,
    ),
    aboveMaximum('noise-rate-at-k', metrics.noiseRateAtK, thresholds.maximumNoiseRateAtK),
    aboveMaximum(
      'unlabeled-retrieved-source-count',
      metrics.unlabeledRetrievedSourceCount,
      thresholds.maximumUnlabeledRetrievedSourceCount,
    ),
  ].filter(Boolean);
}

function average(values) {
  return values.length
    ? roundMetric(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length)
    : null;
}

export function evaluateRetrievalQualityCase(
  caseDefinition,
  { thresholds: thresholdOverrides = {} } = {},
) {
  const id = normalizeText(caseDefinition?.id);
  if (!id) {
    throw new Error('Retrieval quality case id is required.');
  }

  const k = normalizePositiveInteger(caseDefinition?.k, 6, 'k');
  const expectedSources = normalizeSourceDefinitions(caseDefinition?.expectedSources, 'Expected');
  if (!expectedSources.length) {
    throw new Error('At least one expected source is required.');
  }
  const irrelevantSources = normalizeSourceDefinitions(caseDefinition?.irrelevantSources, 'Irrelevant');
  const expectedSourceKeySet = new Set(expectedSources.map((source) => source.key));
  const overlappingSourceKeys = irrelevantSources
    .map((source) => source.key)
    .filter((key) => expectedSourceKeySet.has(key));
  if (overlappingSourceKeys.length) {
    throw new Error(`Expected and irrelevant sources overlap: ${overlappingSourceKeys.join(', ')}`);
  }

  const selectedItems = ensureArray(caseDefinition?.retrievedItems)
    .slice(0, k)
    .map((item, index) => normalizeRetrievedItem(item, index + 1));
  const selectedSources = [...new Map(selectedItems.map((item) => [item.sourceKey, item])).values()];
  const selectedSourceKeySet = new Set(selectedSources.map((source) => source.sourceKey));
  const irrelevantSourceKeySet = new Set(irrelevantSources.map((source) => source.key));
  const retrievedExpectedSources = expectedSources.filter((source) => selectedSourceKeySet.has(source.key));
  const retrievedIrrelevantSources = selectedSources.filter((source) => irrelevantSourceKeySet.has(source.sourceKey));
  const unlabeledRetrievedSources = selectedSources.filter(
    (source) => !expectedSourceKeySet.has(source.sourceKey) && !irrelevantSourceKeySet.has(source.sourceKey),
  );
  const expectedSourceTypes = [...new Set(expectedSources.map((source) => source.type))];
  const retrievedExpectedSourceTypes = [
    ...new Set(retrievedExpectedSources.map((source) => source.type)),
  ];
  const counts = {
    expectedSourceCount: expectedSources.length,
    expectedSourceTypeCount: expectedSourceTypes.length,
    retrievedExpectedSourceCount: retrievedExpectedSources.length,
    retrievedExpectedSourceTypeCount: retrievedExpectedSourceTypes.length,
    retrievedIrrelevantSourceCount: retrievedIrrelevantSources.length,
    retrievedSourceCount: selectedSources.length,
    unlabeledRetrievedSourceCount: unlabeledRetrievedSources.length,
  };
  const metrics = {
    noiseRateAtK: ratio(counts.retrievedIrrelevantSourceCount, counts.retrievedSourceCount) ?? 0,
    precisionAtK: ratio(counts.retrievedExpectedSourceCount, counts.retrievedSourceCount) ?? 0,
    recallAtK: ratio(counts.retrievedExpectedSourceCount, counts.expectedSourceCount),
    sourceDiversityRate: ratio(
      counts.retrievedExpectedSourceTypeCount,
      counts.expectedSourceTypeCount,
    ),
    unlabeledRetrievedSourceCount: counts.unlabeledRetrievedSourceCount,
  };
  const thresholds = normalizeThresholds(thresholdOverrides);
  const failures = collectMetricFailures(metrics, thresholds);

  return {
    counts,
    evidence: {
      expectedSourceKeys: expectedSources.map((source) => source.key),
      expectedSourceTypes,
      irrelevantSourceKeys: irrelevantSources.map((source) => source.key),
      missingExpectedSourceKeys: expectedSources
        .map((source) => source.key)
        .filter((key) => !selectedSourceKeySet.has(key)),
      retrievedExpectedSourceKeys: retrievedExpectedSources.map((source) => source.key),
      retrievedIrrelevantSourceKeys: retrievedIrrelevantSources.map((source) => source.sourceKey),
      selectedSourceKeys: selectedSources.map((source) => source.sourceKey),
      unlabeledRetrievedSourceKeys: unlabeledRetrievedSources.map((source) => source.sourceKey),
    },
    failures,
    id,
    k,
    metrics,
    status: failures.length ? 'failed' : 'passed',
  };
}

export function evaluateRetrievalQualitySuite({
  algorithmId,
  cases,
  thresholds: thresholdOverrides = {},
} = {}) {
  const normalizedAlgorithmId = normalizeText(algorithmId);
  if (!normalizedAlgorithmId) {
    throw new Error('Retrieval quality algorithm id is required.');
  }

  const definitions = ensureArray(cases);
  if (!definitions.length) {
    throw new Error('At least one retrieval quality case is required.');
  }
  const ids = definitions.map((definition) => normalizeText(definition?.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error('Retrieval quality case ids must be unique.');
  }

  const thresholds = normalizeThresholds(thresholdOverrides);
  const caseResults = definitions.map((definition) =>
    evaluateRetrievalQualityCase(definition, { thresholds }),
  );
  const metrics = {
    casePassRate: ratio(
      caseResults.filter((result) => result.status === 'passed').length,
      caseResults.length,
    ),
    noiseRateAtK: average(caseResults.map((result) => result.metrics.noiseRateAtK)),
    precisionAtK: average(caseResults.map((result) => result.metrics.precisionAtK)),
    recallAtK: average(caseResults.map((result) => result.metrics.recallAtK)),
    sourceDiversityRate: average(
      caseResults.map((result) => result.metrics.sourceDiversityRate),
    ),
    unlabeledRetrievedSourceCount: caseResults.reduce(
      (sum, result) => sum + result.metrics.unlabeledRetrievedSourceCount,
      0,
    ),
  };
  const failures = collectMetricFailures(metrics, thresholds, { includeCasePassRate: true });

  return {
    algorithmId: normalizedAlgorithmId,
    cases: caseResults,
    failures,
    metrics,
    productionReadyClaim: false,
    schemaVersion: RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION,
    status: failures.length ? 'failed' : 'passed',
    thresholds,
  };
}

export function buildRetrievalQualityBaselineSnapshot(evaluation) {
  return {
    algorithmId: normalizeText(evaluation?.algorithmId),
    cases: ensureArray(evaluation?.cases).map((result) => ({
      id: result.id,
      k: result.k,
      metrics: result.metrics,
      selectedSourceKeys: result.evidence.selectedSourceKeys,
    })),
    metrics: evaluation?.metrics || {},
    schemaVersion: RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION,
  };
}

function compareMetric({ baselineValue, candidateValue, caseId = null, direction, metric }) {
  const baseline = Number(baselineValue);
  const candidate = Number(candidateValue);
  if (!Number.isFinite(baseline) || !Number.isFinite(candidate)) {
    return null;
  }

  const regressed = direction === 'higher' ? candidate < baseline : candidate > baseline;
  return regressed
    ? {
        baseline,
        candidate,
        caseId,
        check: `regression:${metric}`,
        direction,
      }
    : null;
}

export function compareRetrievalQualityEvaluations({ baseline, candidate } = {}) {
  if (!baseline?.cases || !candidate?.cases) {
    throw new Error('Baseline and candidate retrieval evaluations are required.');
  }
  if (
    baseline.schemaVersion !== RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION ||
    candidate.schemaVersion !== RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION
  ) {
    throw new Error('Baseline and candidate retrieval evaluation schema versions must match.');
  }

  const failures = [];
  const baselineCaseMap = new Map(baseline.cases.map((result) => [result.id, result]));
  const candidateCaseMap = new Map(candidate.cases.map((result) => [result.id, result]));
  const baselineCaseIds = [...baselineCaseMap.keys()].sort();
  const candidateCaseIds = [...candidateCaseMap.keys()].sort();
  if (JSON.stringify(baselineCaseIds) !== JSON.stringify(candidateCaseIds)) {
    failures.push({
      actual: candidateCaseIds,
      check: 'case-set',
      required: baselineCaseIds,
    });
  }

  for (const metric of HIGHER_IS_BETTER_METRICS) {
    failures.push(
      compareMetric({
        baselineValue: baseline.metrics?.[metric],
        candidateValue: candidate.metrics?.[metric],
        direction: 'higher',
        metric,
      }),
    );
  }
  for (const metric of LOWER_IS_BETTER_METRICS) {
    failures.push(
      compareMetric({
        baselineValue: baseline.metrics?.[metric],
        candidateValue: candidate.metrics?.[metric],
        direction: 'lower',
        metric,
      }),
    );
  }

  for (const caseId of baselineCaseIds) {
    const baselineCase = baselineCaseMap.get(caseId);
    const candidateCase = candidateCaseMap.get(caseId);
    if (!candidateCase) {
      continue;
    }
    for (const metric of HIGHER_IS_BETTER_METRICS) {
      failures.push(
        compareMetric({
          baselineValue: baselineCase.metrics?.[metric],
          candidateValue: candidateCase.metrics?.[metric],
          caseId,
          direction: 'higher',
          metric,
        }),
      );
    }
    for (const metric of LOWER_IS_BETTER_METRICS) {
      failures.push(
        compareMetric({
          baselineValue: baselineCase.metrics?.[metric],
          candidateValue: candidateCase.metrics?.[metric],
          caseId,
          direction: 'lower',
          metric,
        }),
      );
    }
  }

  const compactFailures = failures.filter(Boolean);
  if (candidate.status !== 'passed') {
    compactFailures.push({ actual: candidate.status, check: 'candidate-gate', required: 'passed' });
  }

  return {
    baselineAlgorithmId: normalizeText(baseline.algorithmId),
    candidateAlgorithmId: normalizeText(candidate.algorithmId),
    failures: compactFailures,
    status: compactFailures.length ? 'failed' : 'passed',
  };
}

export function formatRetrievalQualityEvaluationReport(evaluation) {
  const metricRows = [
    ['case pass rate', evaluation.metrics.casePassRate],
    ['precision@k', evaluation.metrics.precisionAtK],
    ['recall@k', evaluation.metrics.recallAtK],
    ['noise@k', evaluation.metrics.noiseRateAtK],
    ['source diversity', evaluation.metrics.sourceDiversityRate],
    ['unlabeled sources', evaluation.metrics.unlabeledRetrievedSourceCount],
  ];
  const caseRows = evaluation.cases
    .map(
      (result) =>
        `| ${result.id} | ${result.status} | ${result.k} | ${result.metrics.precisionAtK} | ${result.metrics.recallAtK} | ${result.metrics.noiseRateAtK} | ${result.metrics.sourceDiversityRate} |`,
    )
    .join('\n');

  return `# Retrieval Quality Evaluation

- schemaVersion: ${evaluation.schemaVersion}
- algorithmId: ${evaluation.algorithmId}
- status: ${evaluation.status}
- productionReadyClaim: false

## Suite Metrics

| Metric | Value |
| --- | ---: |
${metricRows.map(([label, value]) => `| ${label} | ${value} |`).join('\n')}

## Cases

| Case | Status | k | Precision | Recall | Noise | Diversity |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${caseRows}
`;
}
