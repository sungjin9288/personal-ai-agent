export const ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION = 'personal-ai-agent-answer-quality-evaluation/v1';

export const DEFAULT_ANSWER_QUALITY_THRESHOLDS = Object.freeze({
  maximumForbiddenRetrievedSourceCount: 0,
  maximumForbiddenTermMatches: 0,
  maximumUnsupportedCitationRate: 0,
  minimumCasePassRate: 1,
  minimumCitationGroundingRate: 1,
  minimumExpectedSourceCitationRate: 1,
  minimumRequiredTermCoverage: 1,
  minimumRetrievalHitRate: 1,
  requireReviewerPass: true,
});

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeSourceKey(value) {
  return normalizeText(value);
}

function uniqueNormalized(items, normalizer = normalizeText) {
  return [...new Set(ensureArray(items).map((item) => normalizer(item)).filter(Boolean))];
}

function sourceKeyForItem(item) {
  const explicitKey = normalizeSourceKey(item?.sourceKey);
  if (explicitKey) {
    return explicitKey;
  }

  const sourceType = normalizeText(item?.sourceType).toLowerCase();
  const sourceLabel = normalizeText(item?.sourceLabel);
  return sourceType && sourceLabel ? `${sourceType}:${sourceLabel}` : '';
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
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

function normalizeThresholds(thresholds = {}) {
  return {
    maximumForbiddenRetrievedSourceCount: normalizeNonNegativeNumber(
      thresholds.maximumForbiddenRetrievedSourceCount,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.maximumForbiddenRetrievedSourceCount,
      'maximumForbiddenRetrievedSourceCount',
    ),
    maximumForbiddenTermMatches: normalizeNonNegativeNumber(
      thresholds.maximumForbiddenTermMatches,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.maximumForbiddenTermMatches,
      'maximumForbiddenTermMatches',
    ),
    maximumUnsupportedCitationRate: normalizeRate(
      thresholds.maximumUnsupportedCitationRate,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.maximumUnsupportedCitationRate,
      'maximumUnsupportedCitationRate',
    ),
    minimumCasePassRate: normalizeRate(
      thresholds.minimumCasePassRate,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.minimumCasePassRate,
      'minimumCasePassRate',
    ),
    minimumCitationGroundingRate: normalizeRate(
      thresholds.minimumCitationGroundingRate,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.minimumCitationGroundingRate,
      'minimumCitationGroundingRate',
    ),
    minimumExpectedSourceCitationRate: normalizeRate(
      thresholds.minimumExpectedSourceCitationRate,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.minimumExpectedSourceCitationRate,
      'minimumExpectedSourceCitationRate',
    ),
    minimumRequiredTermCoverage: normalizeRate(
      thresholds.minimumRequiredTermCoverage,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.minimumRequiredTermCoverage,
      'minimumRequiredTermCoverage',
    ),
    minimumRetrievalHitRate: normalizeRate(
      thresholds.minimumRetrievalHitRate,
      DEFAULT_ANSWER_QUALITY_THRESHOLDS.minimumRetrievalHitRate,
      'minimumRetrievalHitRate',
    ),
    requireReviewerPass:
      thresholds.requireReviewerPass === undefined
        ? DEFAULT_ANSWER_QUALITY_THRESHOLDS.requireReviewerPass
        : Boolean(thresholds.requireReviewerPass),
  };
}

function belowMinimum(check, actual, required) {
  if (actual === null || actual >= required) {
    return null;
  }
  return { actual, check, required };
}

function aboveMaximum(check, actual, maximum) {
  if (actual <= maximum) {
    return null;
  }
  return { actual, check, maximum };
}

function collectMetricFailures(metrics, thresholds, { includeCasePassRate = false } = {}) {
  return [
    includeCasePassRate
      ? belowMinimum('case-pass-rate', metrics.casePassRate, thresholds.minimumCasePassRate)
      : null,
    belowMinimum('retrieval-hit-rate', metrics.retrievalHitRate, thresholds.minimumRetrievalHitRate),
    belowMinimum(
      'expected-source-citation-rate',
      metrics.expectedSourceCitationRate,
      thresholds.minimumExpectedSourceCitationRate,
    ),
    belowMinimum(
      'citation-grounding-rate',
      metrics.citationGroundingRate,
      thresholds.minimumCitationGroundingRate,
    ),
    belowMinimum(
      'required-term-coverage',
      metrics.requiredTermCoverage,
      thresholds.minimumRequiredTermCoverage,
    ),
    aboveMaximum(
      'unsupported-citation-rate',
      metrics.unsupportedCitationRate,
      thresholds.maximumUnsupportedCitationRate,
    ),
    aboveMaximum(
      'forbidden-retrieved-source-count',
      metrics.forbiddenRetrievedSourceCount,
      thresholds.maximumForbiddenRetrievedSourceCount,
    ),
    aboveMaximum(
      'forbidden-term-matches',
      metrics.forbiddenTermMatchCount,
      thresholds.maximumForbiddenTermMatches,
    ),
  ].filter(Boolean);
}

export function evaluateAnswerQualityCase(caseDefinition, { thresholds: thresholdOverrides = {} } = {}) {
  const id = normalizeText(caseDefinition?.id);
  if (!id) {
    throw new Error('Answer quality case id is required.');
  }

  const thresholds = normalizeThresholds(thresholdOverrides);
  const answerText = normalizeText(caseDefinition?.answer?.text).toLowerCase();
  const retrievedSourceKeys = uniqueNormalized(
    ensureArray(caseDefinition?.retrievedItems).map(sourceKeyForItem),
    normalizeSourceKey,
  );
  const expectedSourceKeys = uniqueNormalized(caseDefinition?.expectedSourceKeys, normalizeSourceKey);
  const forbiddenSourceKeys = uniqueNormalized(caseDefinition?.forbiddenSourceKeys, normalizeSourceKey);
  const citedSourceKeys = uniqueNormalized(caseDefinition?.answer?.citedSourceKeys, normalizeSourceKey);
  const requiredAnswerTerms = uniqueNormalized(caseDefinition?.requiredAnswerTerms, (term) => normalizeText(term).toLowerCase());
  const forbiddenAnswerTerms = uniqueNormalized(caseDefinition?.forbiddenAnswerTerms, (term) => normalizeText(term).toLowerCase());
  const reviewerVerdict = normalizeText(caseDefinition?.reviewerVerdict, 'not-reviewed').toLowerCase();

  const retrievedSourceKeySet = new Set(retrievedSourceKeys);
  const citedSourceKeySet = new Set(citedSourceKeys);
  const retrievedExpectedSourceKeys = expectedSourceKeys.filter((key) => retrievedSourceKeySet.has(key));
  const citedExpectedSourceKeys = expectedSourceKeys.filter((key) => citedSourceKeySet.has(key));
  const groundedCitationKeys = citedSourceKeys.filter((key) => retrievedSourceKeySet.has(key));
  const unsupportedCitationKeys = citedSourceKeys.filter((key) => !retrievedSourceKeySet.has(key));
  const matchedForbiddenRetrievedSourceKeys = forbiddenSourceKeys.filter((key) => retrievedSourceKeySet.has(key));
  const matchedRequiredTerms = requiredAnswerTerms.filter((term) => answerText.includes(term));
  const matchedForbiddenTerms = forbiddenAnswerTerms.filter((term) => answerText.includes(term));

  const counts = {
    citedExpectedSourceCount: citedExpectedSourceKeys.length,
    citedSourceCount: citedSourceKeys.length,
    expectedSourceCount: expectedSourceKeys.length,
    forbiddenRetrievedSourceCount: matchedForbiddenRetrievedSourceKeys.length,
    forbiddenTermMatchCount: matchedForbiddenTerms.length,
    groundedCitationCount: groundedCitationKeys.length,
    requiredTermCount: requiredAnswerTerms.length,
    requiredTermMatchCount: matchedRequiredTerms.length,
    retrievedExpectedSourceCount: retrievedExpectedSourceKeys.length,
    retrievedSourceCount: retrievedSourceKeys.length,
    unsupportedCitationCount: unsupportedCitationKeys.length,
  };
  const metrics = {
    citationGroundingRate: ratio(counts.groundedCitationCount, counts.citedSourceCount),
    expectedSourceCitationRate: ratio(counts.citedExpectedSourceCount, counts.expectedSourceCount),
    forbiddenRetrievedSourceCount: counts.forbiddenRetrievedSourceCount,
    forbiddenTermMatchCount: counts.forbiddenTermMatchCount,
    requiredTermCoverage: ratio(counts.requiredTermMatchCount, counts.requiredTermCount),
    retrievalHitRate: ratio(counts.retrievedExpectedSourceCount, counts.expectedSourceCount),
    unsupportedCitationRate: ratio(counts.unsupportedCitationCount, counts.citedSourceCount) ?? 0,
  };
  const failures = collectMetricFailures(metrics, thresholds);

  if (thresholds.requireReviewerPass && reviewerVerdict !== 'pass') {
    failures.push({
      actual: reviewerVerdict,
      check: 'reviewer-verdict',
      required: 'pass',
    });
  }

  return {
    counts,
    evidence: {
      citedSourceKeys,
      expectedSourceKeys,
      groundedCitationKeys,
      matchedForbiddenTerms,
      matchedForbiddenRetrievedSourceKeys,
      matchedRequiredTerms,
      missingExpectedRetrievalSourceKeys: expectedSourceKeys.filter((key) => !retrievedSourceKeySet.has(key)),
      missingRequiredTerms: requiredAnswerTerms.filter((term) => !answerText.includes(term)),
      retrievedSourceKeys,
      reviewerVerdict,
      uncitedExpectedSourceKeys: expectedSourceKeys.filter((key) => !citedSourceKeySet.has(key)),
      unsupportedCitationKeys,
    },
    failures,
    id,
    metrics,
    status: failures.length ? 'failed' : 'passed',
  };
}

export function evaluateAnswerQualitySuite({ cases, thresholds: thresholdOverrides = {} } = {}) {
  const definitions = ensureArray(cases);
  if (!definitions.length) {
    throw new Error('At least one answer quality case is required.');
  }

  const ids = definitions.map((definition) => normalizeText(definition?.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error('Answer quality case ids must be unique.');
  }

  const thresholds = normalizeThresholds(thresholdOverrides);
  const caseResults = definitions.map((definition) => evaluateAnswerQualityCase(definition, { thresholds }));
  const totals = caseResults.reduce(
    (summary, result) => {
      for (const [key, value] of Object.entries(result.counts)) {
        summary[key] += value;
      }
      if (result.status === 'passed') {
        summary.passedCaseCount += 1;
      }
      return summary;
    },
    {
      citedExpectedSourceCount: 0,
      citedSourceCount: 0,
      expectedSourceCount: 0,
      forbiddenRetrievedSourceCount: 0,
      forbiddenTermMatchCount: 0,
      groundedCitationCount: 0,
      passedCaseCount: 0,
      requiredTermCount: 0,
      requiredTermMatchCount: 0,
      retrievedExpectedSourceCount: 0,
      retrievedSourceCount: 0,
      unsupportedCitationCount: 0,
    },
  );
  const metrics = {
    casePassRate: ratio(totals.passedCaseCount, caseResults.length),
    citationGroundingRate: ratio(totals.groundedCitationCount, totals.citedSourceCount),
    expectedSourceCitationRate: ratio(totals.citedExpectedSourceCount, totals.expectedSourceCount),
    forbiddenRetrievedSourceCount: totals.forbiddenRetrievedSourceCount,
    forbiddenTermMatchCount: totals.forbiddenTermMatchCount,
    requiredTermCoverage: ratio(totals.requiredTermMatchCount, totals.requiredTermCount),
    retrievalHitRate: ratio(totals.retrievedExpectedSourceCount, totals.expectedSourceCount),
    unsupportedCitationRate: ratio(totals.unsupportedCitationCount, totals.citedSourceCount) ?? 0,
  };
  const failures = collectMetricFailures(metrics, thresholds, { includeCasePassRate: true });
  const reviewerFailureCount = caseResults.filter((result) => result.evidence.reviewerVerdict !== 'pass').length;

  if (thresholds.requireReviewerPass && reviewerFailureCount > 0) {
    failures.push({
      actual: reviewerFailureCount,
      check: 'reviewer-failure-count',
      maximum: 0,
    });
  }

  return {
    cases: caseResults,
    failures,
    productionReadyClaim: false,
    schemaVersion: ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION,
    status: failures.length ? 'failed' : 'passed',
    summary: {
      caseCount: caseResults.length,
      failedCaseCount: caseResults.length - totals.passedCaseCount,
      metrics,
      passedCaseCount: totals.passedCaseCount,
      reviewerFailureCount,
      totals,
    },
    thresholds,
  };
}

function formatMetric(value) {
  return value === null ? 'not-applicable' : String(value);
}

export function formatAnswerQualityEvaluationReport(evaluation) {
  const metrics = evaluation?.summary?.metrics || {};
  const caseLines = ensureArray(evaluation?.cases).map(
    (result) =>
      `| ${result.id} | ${result.status} | ${formatMetric(result.metrics.retrievalHitRate)} | ${formatMetric(result.metrics.expectedSourceCitationRate)} | ${formatMetric(result.metrics.citationGroundingRate)} | ${formatMetric(result.metrics.requiredTermCoverage)} | ${result.metrics.unsupportedCitationRate} | ${result.metrics.forbiddenTermMatchCount} |`,
  );

  return `# Answer Quality Evaluation

- schema: ${normalizeText(evaluation?.schemaVersion, ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION)}
- status: ${normalizeText(evaluation?.status, 'unknown')}
- productionReadyClaim: false
- case pass rate: ${formatMetric(metrics.casePassRate)}
- retrieval hit rate: ${formatMetric(metrics.retrievalHitRate)}
- expected source citation rate: ${formatMetric(metrics.expectedSourceCitationRate)}
- citation grounding rate: ${formatMetric(metrics.citationGroundingRate)}
- required term coverage: ${formatMetric(metrics.requiredTermCoverage)}
- unsupported citation rate: ${formatMetric(metrics.unsupportedCitationRate)}
- forbidden retrieved source count: ${metrics.forbiddenRetrievedSourceCount || 0}

| Case | Status | Retrieval hit | Expected source citation | Citation grounding | Required term coverage | Unsupported citation | Forbidden term matches |
|---|---|---:|---:|---:|---:|---:|---:|
${caseLines.join('\n')}
`;
}
