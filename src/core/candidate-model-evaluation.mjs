import { createHash } from 'node:crypto';

import { ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION } from './answer-quality-evaluation.mjs';
import {
  assertFineTuningReadinessPackage,
  summarizeAnswerQualityEvaluationForReview,
} from './fine-tuning-readiness.mjs';

export const CANDIDATE_MODEL_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-candidate-model-evidence/v1';
export const CANDIDATE_MODEL_GATE_SCHEMA_VERSION =
  'personal-ai-agent-candidate-model-gate/v1';

const EVALUATION_SOURCES = Object.freeze([
  'fixture-simulated',
  'recorded-model-evaluation',
]);
const HIGHER_IS_BETTER = Object.freeze([
  'casePassRate',
  'citationGroundingRate',
  'expectedSourceCitationRate',
  'requiredTermCoverage',
  'retrievalHitRate',
]);
const LOWER_IS_BETTER = Object.freeze([
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
  'unsupportedCitationRate',
]);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isValidTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function validateCandidateEvaluation(evaluation) {
  if (
    evaluation?.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !Array.isArray(evaluation?.cases) ||
    evaluation.cases.length === 0 ||
    !Array.isArray(evaluation?.failures) ||
    !evaluation?.summary ||
    !evaluation?.thresholds ||
    evaluation?.productionReadyClaim !== false
  ) {
    throw new Error('Candidate model evaluation must use the answer quality evaluation contract.');
  }
}

export function buildCandidateModelEvidence({
  actualModelEvaluated = false,
  candidateEvaluation,
  candidateId,
  evaluatedAt,
  evaluationRunId,
  evaluationSource = 'fixture-simulated',
  evidenceRefs = [],
  modelId,
  provider,
  readinessPackage,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  validateCandidateEvaluation(candidateEvaluation);
  const normalizedSource = normalizeText(evaluationSource);
  const normalizedEvidenceRefs = Array.isArray(evidenceRefs)
    ? [...new Set(evidenceRefs.map((reference) => normalizeText(reference)).filter(Boolean))].sort()
    : [];
  if (
    !normalizeText(candidateId) ||
    !normalizeText(modelId) ||
    !normalizeText(provider) ||
    !normalizeText(evaluationRunId) ||
    !isValidTimestamp(evaluatedAt) ||
    !EVALUATION_SOURCES.includes(normalizedSource) ||
    normalizedEvidenceRefs.length === 0 ||
    (normalizedSource === 'fixture-simulated' && actualModelEvaluated !== false) ||
    (normalizedSource === 'recorded-model-evaluation' && actualModelEvaluated !== true)
  ) {
    throw new Error(
      'Candidate model evidence requires identity, timestamp, source-consistent model status, and evidence references.',
    );
  }

  const evaluation = summarizeAnswerQualityEvaluationForReview(candidateEvaluation);
  const evidence = {
    actualModelEvaluated,
    candidateId: normalizeText(candidateId),
    datasetHash: readinessPackage.dataset.datasetHash,
    evaluatedAt: normalizeText(evaluatedAt),
    evaluationHash: evaluation.evaluationHash,
    evaluationRunId: normalizeText(evaluationRunId),
    evaluationSource: normalizedSource,
    evidenceRefs: normalizedEvidenceRefs,
    externalSubmissionAuthorized: false,
    modelId: normalizeText(modelId),
    productionReadyClaim: false,
    provider: normalizeText(provider),
    readinessHash: readinessPackage.readinessHash,
    rolloutAuthorized: false,
    schemaVersion: CANDIDATE_MODEL_EVIDENCE_SCHEMA_VERSION,
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `candidate-model-evidence-${evidenceHash}`,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function candidateEvidencePassed({ candidateEvidence, candidateSummary, readinessPackage }) {
  const source = candidateEvidence?.evaluationSource;
  const { evidenceHash, id, ...evidenceContent } = candidateEvidence || {};
  const expectedEvidenceHash = hashRecord(evidenceContent);
  return (
    candidateEvidence?.schemaVersion === CANDIDATE_MODEL_EVIDENCE_SCHEMA_VERSION &&
    normalizeText(candidateEvidence?.candidateId) &&
    normalizeText(candidateEvidence?.modelId) &&
    normalizeText(candidateEvidence?.provider) &&
    normalizeText(candidateEvidence?.evaluationRunId) &&
    isValidTimestamp(candidateEvidence?.evaluatedAt) &&
    EVALUATION_SOURCES.includes(source) &&
    Array.isArray(candidateEvidence?.evidenceRefs) &&
    candidateEvidence.evidenceRefs.length > 0 &&
    candidateEvidence.evidenceRefs.every((reference) => normalizeText(reference)) &&
    candidateEvidence?.evaluationHash === candidateSummary.evaluationHash &&
    candidateEvidence?.datasetHash === readinessPackage.dataset.datasetHash &&
    candidateEvidence?.readinessHash === readinessPackage.readinessHash &&
    candidateEvidence?.externalSubmissionAuthorized === false &&
    candidateEvidence?.rolloutAuthorized === false &&
    candidateEvidence?.productionReadyClaim === false &&
    evidenceHash === expectedEvidenceHash &&
    id === `candidate-model-evidence-${expectedEvidenceHash}` &&
    ((source === 'fixture-simulated' && candidateEvidence?.actualModelEvaluated === false) ||
      (source === 'recorded-model-evaluation' && candidateEvidence?.actualModelEvaluated === true))
  );
}

function metricRegression(metric, baseline, candidate, direction, scope) {
  if (baseline === null && candidate === null) {
    return null;
  }
  if (!Number.isFinite(baseline) || !Number.isFinite(candidate)) {
    return { baseline, candidate, direction, metric, scope };
  }
  if (
    (direction === 'higher-or-equal' && candidate < baseline) ||
    (direction === 'lower-or-equal' && candidate > baseline)
  ) {
    return { baseline, candidate, direction, metric, scope };
  }
  return null;
}

function compareMetrics(baselineMetrics, candidateMetrics, scope, { includeCasePassRate = true } = {}) {
  const higherMetrics = includeCasePassRate
    ? HIGHER_IS_BETTER
    : HIGHER_IS_BETTER.filter((metric) => metric !== 'casePassRate');
  return [
    ...higherMetrics.map((metric) =>
      metricRegression(
        metric,
        baselineMetrics?.[metric],
        candidateMetrics?.[metric],
        'higher-or-equal',
        scope,
      ),
    ),
    ...LOWER_IS_BETTER.map((metric) =>
      metricRegression(
        metric,
        baselineMetrics?.[metric],
        candidateMetrics?.[metric],
        'lower-or-equal',
        scope,
      ),
    ),
  ].filter(Boolean);
}

function compareCaseMetrics(baselineCases, candidateCases) {
  const candidateById = new Map(candidateCases.map((result) => [result.id, result]));
  return baselineCases.flatMap((baseline) => {
    const candidate = candidateById.get(baseline.id);
    if (!candidate) {
      return [];
    }
    return compareMetrics(baseline.metrics, candidate.metrics, `case:${baseline.id}`, {
      includeCasePassRate: false,
    });
  });
}

function buildCheck(id, passed, evidence = {}) {
  return {
    ...evidence,
    id,
    passed: Boolean(passed),
    status: passed ? 'passed' : 'failed',
  };
}

export function evaluateCandidateModelGate({
  candidateEvaluation,
  candidateEvidence,
  readinessPackage,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  validateCandidateEvaluation(candidateEvaluation);
  const baseline = readinessPackage.evaluationManifest.answerQualityBaseline;
  const candidate = summarizeAnswerQualityEvaluationForReview(candidateEvaluation);
  const baselineCaseIds = baseline.caseResults.map((result) => result.id).sort();
  const candidateCaseIds = candidate.caseResults.map((result) => result.id).sort();
  const suiteRegressions = compareMetrics(baseline.metrics, candidate.metrics, 'suite');
  const caseRegressions = compareCaseMetrics(baseline.caseResults, candidate.caseResults);
  const comparisonChecks = [
    buildCheck('readiness-package-current', true, {
      readinessHash: readinessPackage.readinessHash,
    }),
    buildCheck(
      'candidate-evidence-bound',
      candidateEvidencePassed({ candidateEvidence, candidateSummary: candidate, readinessPackage }),
      { evaluationHash: candidate.evaluationHash },
    ),
    buildCheck('case-set-matched', sameJson(baselineCaseIds, candidateCaseIds), {
      baselineCaseIds,
      candidateCaseIds,
    }),
    buildCheck('thresholds-matched', sameJson(baseline.thresholds, candidate.thresholds)),
    buildCheck('candidate-gate-passed', candidate.status === 'passed' && candidateEvaluation.failures.length === 0),
    buildCheck(
      'candidate-reviewer-passed',
      candidateEvaluation.cases.every(
        (result) => result.status === 'passed' && result.evidence?.reviewerVerdict === 'pass',
      ),
    ),
    buildCheck('suite-metrics-no-regression', suiteRegressions.length === 0, {
      regressions: suiteRegressions,
    }),
    buildCheck('case-metrics-no-regression', caseRegressions.length === 0, {
      regressions: caseRegressions,
    }),
  ];
  const failedComparisonChecks = comparisonChecks.filter((check) => !check.passed);
  const comparisonPassed = failedComparisonChecks.length === 0;
  const rolloutChecks = [
    buildCheck('actual-model-evaluated', candidateEvidence?.actualModelEvaluated === true),
    buildCheck('reviewer-approved-rollout', false),
    buildCheck('rollout-authorized', candidateEvidence?.rolloutAuthorized === true),
    buildCheck('rollback-owner-assigned', false),
  ];
  const gate = {
    baseline,
    candidate: {
      actualModelEvaluated: candidateEvidence?.actualModelEvaluated === true,
      candidateId: normalizeText(candidateEvidence?.candidateId),
      evaluation: candidate,
      evaluationRunId: normalizeText(candidateEvidence?.evaluationRunId),
      evaluationSource: normalizeText(candidateEvidence?.evaluationSource),
      evidenceHash: normalizeText(candidateEvidence?.evidenceHash),
      evidenceId: normalizeText(candidateEvidence?.id),
      evidenceRefs: Array.isArray(candidateEvidence?.evidenceRefs)
        ? [...candidateEvidence.evidenceRefs]
        : [],
      modelId: normalizeText(candidateEvidence?.modelId),
      provider: normalizeText(candidateEvidence?.provider),
    },
    comparison: {
      checkCounts: {
        failed: failedComparisonChecks.length,
        passed: comparisonChecks.length - failedComparisonChecks.length,
      },
      checks: comparisonChecks,
      status: comparisonPassed ? 'passed' : 'failed',
    },
    decision: comparisonPassed ? 'hold-for-review' : 'keep-baseline',
    externalSubmissionAuthorized: false,
    productionReadyClaim: false,
    rollback: {
      action: comparisonPassed ? 'available' : 'keep-baseline',
      baseline: readinessPackage.evaluationManifest.rollback.baseline,
      owner: null,
      ownerRequired: true,
      required: !comparisonPassed,
      triggerCheckIds: failedComparisonChecks.map((check) => check.id),
    },
    rollout: {
      activationAuthorized: false,
      checkCounts: {
        failed: rolloutChecks.filter((check) => !check.passed).length,
        passed: rolloutChecks.filter((check) => check.passed).length,
      },
      checks: rolloutChecks,
      reviewerDecision: 'pending',
      status: 'blocked',
    },
    schemaVersion: CANDIDATE_MODEL_GATE_SCHEMA_VERSION,
    status: comparisonPassed ? 'ready-for-review' : 'rollback-required',
  };
  const gateHash = hashRecord(gate);
  return {
    ...gate,
    gateHash,
    id: `candidate-model-gate-${gateHash}`,
  };
}
