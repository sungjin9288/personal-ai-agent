import { createHash } from 'node:crypto';

import {
  assertApprovedLearningRagFeedbackEvidence,
} from './approved-learning-rag-feedback.mjs';
import {
  ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION,
} from './answer-quality-evaluation.mjs';

export const APPROVED_LEARNING_FEEDBACK_QUALITY_SCHEMA_VERSION =
  'personal-ai-agent-approved-learning-feedback-quality/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function requireHash(value, fieldName) {
  const normalized = normalizeText(value);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Approved learning feedback quality ${fieldName} is invalid.`);
  }
  return normalized;
}

function requireInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Approved learning feedback quality ${fieldName} is invalid.`);
  }
  return value;
}

function normalizeMetric(value, fieldName) {
  if (value === null) {
    return null;
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`Approved learning feedback quality ${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeRate(value, fieldName) {
  const normalized = normalizeMetric(value, fieldName);
  if (normalized !== null && normalized > 1) {
    throw new Error(`Approved learning feedback quality ${fieldName} is invalid.`);
  }
  return normalized;
}

function normalizeIds(value, fieldName) {
  const ids = Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : [];
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Approved learning feedback quality ${fieldName} must be unique.`);
  }
  return ids;
}

function normalizeFixtureBinding(binding = {}) {
  const caseIds = Array.isArray(binding.caseIds)
    ? binding.caseIds.map(normalizeText).filter(Boolean)
    : [];
  if (caseIds.length < 3 || new Set(caseIds).size !== caseIds.length) {
    throw new Error('Approved learning feedback quality requires at least three unique cases.');
  }
  const normalized = {
    caseIds,
    fixtureHash: requireHash(binding.fixtureHash, 'fixtureHash'),
  };
  return {
    ...normalized,
    bindingHash: hashRecord(normalized),
  };
}

function normalizeCaseResult(result = {}) {
  const id = normalizeText(result.id);
  const status = normalizeText(result.status);
  const failures = Array.isArray(result.failures)
    ? result.failures
    : Array.isArray(result.failureChecks)
      ? result.failureChecks.map((check) => ({ check }))
      : [];
  if (!id || !['passed', 'failed'].includes(status)) {
    throw new Error('Approved learning feedback quality case result is invalid.');
  }
  return {
    failureChecks: [...new Set(failures.map((failure) => normalizeText(failure?.check)).filter(Boolean))],
    id,
    metrics: {
      citationGroundingRate: normalizeRate(
        result.metrics?.citationGroundingRate,
        `${id} citationGroundingRate`,
      ),
      expectedSourceCitationRate: normalizeRate(
        result.metrics?.expectedSourceCitationRate,
        `${id} expectedSourceCitationRate`,
      ),
      forbiddenRetrievedSourceCount: normalizeMetric(
        result.metrics?.forbiddenRetrievedSourceCount,
        `${id} forbiddenRetrievedSourceCount`,
      ),
      forbiddenTermMatchCount: normalizeMetric(
        result.metrics?.forbiddenTermMatchCount,
        `${id} forbiddenTermMatchCount`,
      ),
      requiredTermCoverage: normalizeRate(
        result.metrics?.requiredTermCoverage,
        `${id} requiredTermCoverage`,
      ),
      retrievalHitRate: normalizeRate(
        result.metrics?.retrievalHitRate,
        `${id} retrievalHitRate`,
      ),
      unsupportedCitationRate: normalizeRate(
        result.metrics?.unsupportedCitationRate,
        `${id} unsupportedCitationRate`,
      ),
    },
    status,
  };
}

function normalizeEvaluation(evaluation = {}, label) {
  const rawCases = Array.isArray(evaluation.cases)
    ? evaluation.cases
    : Array.isArray(evaluation.caseResults)
      ? evaluation.caseResults
      : [];
  const caseResults = rawCases.map(normalizeCaseResult);
  const summary = evaluation.summary || {};
  if (
    evaluation.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !['passed', 'failed'].includes(evaluation.status) ||
    !caseResults.length
  ) {
    throw new Error(`Approved learning feedback quality ${label} evaluation is invalid.`);
  }
  const normalized = {
    caseResults,
    schemaVersion: evaluation.schemaVersion,
    status: evaluation.status,
    summary: {
      caseCount: requireInteger(summary.caseCount, `${label} caseCount`),
      failedCaseCount: requireInteger(summary.failedCaseCount, `${label} failedCaseCount`),
      metrics: {
        casePassRate: normalizeRate(summary.metrics?.casePassRate, `${label} casePassRate`),
        citationGroundingRate: normalizeRate(
          summary.metrics?.citationGroundingRate,
          `${label} citationGroundingRate`,
        ),
        expectedSourceCitationRate: normalizeRate(
          summary.metrics?.expectedSourceCitationRate,
          `${label} expectedSourceCitationRate`,
        ),
        forbiddenRetrievedSourceCount: normalizeMetric(
          summary.metrics?.forbiddenRetrievedSourceCount,
          `${label} forbiddenRetrievedSourceCount`,
        ),
        forbiddenTermMatchCount: normalizeMetric(
          summary.metrics?.forbiddenTermMatchCount,
          `${label} forbiddenTermMatchCount`,
        ),
        requiredTermCoverage: normalizeRate(
          summary.metrics?.requiredTermCoverage,
          `${label} requiredTermCoverage`,
        ),
        retrievalHitRate: normalizeRate(
          summary.metrics?.retrievalHitRate,
          `${label} retrievalHitRate`,
        ),
        unsupportedCitationRate: normalizeRate(
          summary.metrics?.unsupportedCitationRate,
          `${label} unsupportedCitationRate`,
        ),
      },
      passedCaseCount: requireInteger(summary.passedCaseCount, `${label} passedCaseCount`),
      reviewerFailureCount: requireInteger(
        summary.reviewerFailureCount,
        `${label} reviewerFailureCount`,
      ),
    },
  };
  const passedCaseCount = caseResults.filter((result) => result.status === 'passed').length;
  if (
    normalized.summary.caseCount !== caseResults.length ||
    normalized.summary.passedCaseCount + normalized.summary.failedCaseCount !== caseResults.length ||
    normalized.summary.passedCaseCount !== passedCaseCount ||
    (normalized.status === 'passed' && passedCaseCount !== caseResults.length)
  ) {
    throw new Error(`Approved learning feedback quality ${label} case totals are inconsistent.`);
  }
  return {
    ...normalized,
    evaluationHash: hashRecord(normalized),
  };
}

function normalizeIsolationEntry(entry = {}) {
  const normalized = {
    caseId: normalizeText(entry.caseId),
    expectedMemoryId: normalizeText(entry.expectedMemoryId),
    expectedMemorySourceCount: requireInteger(
      entry.expectedMemorySourceCount,
      'expectedMemorySourceCount',
    ),
    foreignMemoryCandidateCount: requireInteger(
      entry.foreignMemoryCandidateCount,
      'foreignMemoryCandidateCount',
    ),
    foreignMemoryIds: normalizeIds(entry.foreignMemoryIds, 'foreignMemoryIds'),
    foreignMemoryRetrievedCount: requireInteger(
      entry.foreignMemoryRetrievedCount,
      'foreignMemoryRetrievedCount',
    ),
    retrievedExpectedMemorySourceCount: requireInteger(
      entry.retrievedExpectedMemorySourceCount,
      'retrievedExpectedMemorySourceCount',
    ),
    retrievedMemoryIds: normalizeIds(entry.retrievedMemoryIds, 'retrievedMemoryIds'),
  };
  if (!normalized.caseId || !normalized.expectedMemoryId) {
    throw new Error('Approved learning feedback quality isolation binding is incomplete.');
  }
  return normalized;
}

function normalizeFeedbackCases(cases = []) {
  if (!Array.isArray(cases) || !cases.length) {
    throw new Error('Approved learning feedback quality feedback cases are required.');
  }
  return cases.map((evidence) => {
    assertApprovedLearningRagFeedbackEvidence(evidence);
    return structuredClone(evidence);
  });
}

function metricsPassed(metrics = {}) {
  return (
    metrics.casePassRate === 1 &&
    metrics.citationGroundingRate === 1 &&
    metrics.expectedSourceCitationRate === 1 &&
    metrics.forbiddenRetrievedSourceCount === 0 &&
    metrics.forbiddenTermMatchCount === 0 &&
    metrics.requiredTermCoverage === 1 &&
    metrics.retrievalHitRate === 1 &&
    metrics.unsupportedCitationRate === 0
  );
}

function buildContent(input = {}) {
  const fixtureBinding = normalizeFixtureBinding(input.fixtureBinding);
  const feedbackCases = normalizeFeedbackCases(input.feedbackCases);
  const evaluations = {
    afterPromotion: normalizeEvaluation(input.evaluations?.afterPromotion, 'afterPromotion'),
    afterRollback: normalizeEvaluation(input.evaluations?.afterRollback, 'afterRollback'),
    beforePromotion: normalizeEvaluation(input.evaluations?.beforePromotion, 'beforePromotion'),
  };
  const isolation = Array.isArray(input.isolation)
    ? input.isolation.map(normalizeIsolationEntry)
    : [];
  const observedAt = normalizeText(input.observedAt);
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
    throw new Error('Approved learning feedback quality observedAt is invalid.');
  }

  const feedbackCaseIds = feedbackCases.map((evidence) => evidence.fixtureBinding.caseId);
  const missionIds = feedbackCases.map((evidence) => evidence.mission.id);
  const memoryIds = feedbackCases.map((evidence) => evidence.promotion.memoryId);
  const candidateIds = feedbackCases.map((evidence) => evidence.promotion.candidateId);
  const sessionIds = feedbackCases.flatMap((evidence) =>
    Object.values(evidence.runs).map((run) => run.sessionId),
  );
  const workspaceIds = new Set(feedbackCases.map((evidence) => evidence.mission.workspaceId));
  const allFeedbackLoopsPassed = feedbackCases.every(
    (evidence) => evidence.actualApprovedLearningRagFeedbackValidated === true,
  );
  const caseIdentityPassed =
    JSON.stringify(feedbackCaseIds) === JSON.stringify(fixtureBinding.caseIds) &&
    feedbackCases.every(
      (evidence) => evidence.fixtureBinding.fixtureHash === fixtureBinding.fixtureHash,
    ) &&
    Object.values(evaluations).every(
      (evaluation) =>
        evaluation.caseResults.map((result) => result.id).join('|') ===
        fixtureBinding.caseIds.join('|'),
    );
  const distinctIdentityPassed =
    workspaceIds.size === 1 &&
    new Set(missionIds).size === missionIds.length &&
    new Set(memoryIds).size === memoryIds.length &&
    new Set(candidateIds).size === candidateIds.length &&
    new Set(sessionIds).size === sessionIds.length;
  const controlledQualityImprovementPassed =
    evaluations.beforePromotion.status === 'failed' &&
    evaluations.beforePromotion.summary.passedCaseCount === 0 &&
    evaluations.afterPromotion.status === 'passed' &&
    evaluations.afterPromotion.summary.passedCaseCount === fixtureBinding.caseIds.length &&
    metricsPassed(evaluations.afterPromotion.summary.metrics) &&
    evaluations.afterRollback.status === 'failed' &&
    evaluations.afterRollback.summary.passedCaseCount === 0;
  const rollbackQualityParity =
    evaluations.beforePromotion.evaluationHash === evaluations.afterRollback.evaluationHash &&
    feedbackCases.every((evidence) => evidence.results.rollbackArtifactParity === true);
  const foreignMemoryIsolationPassed =
    isolation.length === fixtureBinding.caseIds.length &&
    isolation.every((entry, index) => {
      const foreignMemoryIds = memoryIds.filter((_, memoryIndex) => memoryIndex !== index);
      return (
        entry.caseId === fixtureBinding.caseIds[index] &&
        entry.expectedMemoryId === memoryIds[index] &&
        entry.expectedMemorySourceCount === 1 &&
        entry.foreignMemoryCandidateCount === fixtureBinding.caseIds.length - 1 &&
        JSON.stringify(entry.foreignMemoryIds) === JSON.stringify(foreignMemoryIds) &&
        entry.foreignMemoryRetrievedCount === 0 &&
        entry.retrievedExpectedMemorySourceCount === 1 &&
        JSON.stringify(entry.retrievedMemoryIds) === JSON.stringify([memoryIds[index]])
      );
    }) &&
    evaluations.afterPromotion.summary.metrics.forbiddenRetrievedSourceCount === 0;
  const reviewerPassPreserved =
    evaluations.afterPromotion.summary.reviewerFailureCount === 0 &&
    feedbackCases.every((evidence) => evidence.results.reviewerPassPreserved === true);
  const externalProviderIsolationPassed = feedbackCases.every(
    (evidence) => evidence.results.externalProviderIsolationPassed === true,
  );
  const results = {
    allFeedbackLoopsPassed,
    caseIdentityPassed,
    controlledQualityImprovementPassed,
    distinctIdentityPassed,
    externalProviderIsolationPassed,
    foreignMemoryIsolationPassed,
    reviewerPassPreserved,
    rollbackQualityParity,
  };
  const validated = Object.values(results).every(Boolean);

  return {
    actualApprovedLearningFeedbackQualityValidated: validated,
    costFree: true,
    evaluations,
    externalProviderCalls: 'none',
    feedbackCases,
    fixtureBinding,
    isolation,
    observedAt,
    productionReadyClaim: false,
    qualityBoundary: {
      actualModelTrainingExecuted: false,
      controlledMultiScenarioAnswerQualityValidated: validated,
      crossMissionGeneralizationValidated: false,
      crossMissionIsolationValidated: foreignMemoryIsolationPassed,
      generalAnswerQualityImprovementValidated: false,
      missionScopedFeedbackQualityValidated: validated,
      workspacePersonalizationValidated: false,
    },
    results,
    schemaVersion: APPROVED_LEARNING_FEEDBACK_QUALITY_SCHEMA_VERSION,
    status: validated
      ? 'approved-learning-feedback-quality-passed-local-only'
      : 'failed-keep-single-mission-feedback-only',
  };
}

export function buildApprovedLearningFeedbackQualityEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `approved-learning-feedback-quality-${evidenceHash}`,
  };
}

export function assertApprovedLearningFeedbackQualityEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evidenceHash !== expectedHash || id !== `approved-learning-feedback-quality-${expectedHash}`) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      evaluations: evidence?.evaluations,
      feedbackCases: evidence?.feedbackCases,
      fixtureBinding: evidence?.fixtureBinding,
      isolation: evidence?.isolation,
      observedAt: evidence?.observedAt,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (
    evidence?.costFree !== true ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.productionReadyClaim !== false ||
    evidence?.qualityBoundary?.actualModelTrainingExecuted !== false ||
    evidence?.qualityBoundary?.generalAnswerQualityImprovementValidated !== false ||
    evidence?.qualityBoundary?.crossMissionGeneralizationValidated !== false ||
    evidence?.status !==
      (evidence?.actualApprovedLearningFeedbackQualityValidated === true
        ? 'approved-learning-feedback-quality-passed-local-only'
        : 'failed-keep-single-mission-feedback-only')
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Approved learning feedback quality evidence failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
