import { createHash } from 'node:crypto';

import { CANDIDATE_MODEL_GATE_SCHEMA_VERSION } from './candidate-model-evaluation.mjs';
import { assertLocalAnswerQualityBaseline } from './local-answer-quality-baseline.mjs';
import { EVIDENCE_FIRST_ANSWER_PROMPT_VERSION } from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_COMPOSITION_CANDIDATE_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-composition-candidate/v1';

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

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(`Local answer composition ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requirePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(
      `Local answer composition ${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`,
    );
  }
  return normalized;
}

function normalizeCandidateGate(candidateGate) {
  const { gateHash, id, ...content } = candidateGate || {};
  const expectedHash = hashRecord(content);
  if (
    candidateGate?.schemaVersion !== CANDIDATE_MODEL_GATE_SCHEMA_VERSION ||
    gateHash !== expectedHash ||
    id !== `candidate-model-gate-${expectedHash}` ||
    candidateGate?.candidate?.actualModelEvaluated !== true ||
    candidateGate?.productionReadyClaim !== false ||
    candidateGate?.rollout?.activationAuthorized !== false
  ) {
    throw new Error('Local answer composition requires an intact recorded candidate gate.');
  }
  return candidateGate;
}

function normalizeObservation(observation = {}) {
  const normalized = {
    caseId: normalizeText(observation.caseId),
    citedSourceKeys: Array.isArray(observation.citedSourceKeys)
      ? [...new Set(observation.citedSourceKeys.map((key) => normalizeText(key)).filter(Boolean))].sort()
      : [],
    claimCount: requirePositiveNumber(observation.claimCount, 'observation claimCount', {
      integer: true,
    }),
    durationMs: requirePositiveNumber(observation.durationMs, 'observation durationMs'),
    inputHash: normalizeText(observation.inputHash),
    outputBytes: requirePositiveNumber(observation.outputBytes, 'observation outputBytes', {
      integer: true,
    }),
    promptHash: normalizeText(observation.promptHash),
    promptVersion: normalizeText(observation.promptVersion),
    responseHash: normalizeText(observation.responseHash),
    reviewActionPresent: observation.reviewActionPresent === true,
    sourceCoverageComplete: observation.sourceCoverageComplete === true,
  };
  if (
    !normalized.caseId ||
    normalized.citedSourceKeys.length === 0 ||
    !isSha256(normalized.inputHash) ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== EVIDENCE_FIRST_ANSWER_PROMPT_VERSION ||
    !isSha256(normalized.responseHash) ||
    !normalized.reviewActionPresent ||
    !normalized.sourceCoverageComplete
  ) {
    throw new Error('Local answer composition observation is incomplete.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    !normalizeText(runtime.endpointAlias) ||
    runtime.transportLoopback !== true ||
    runtime.cloudFeaturesDisabled !== true
  ) {
    throw new Error('Local answer composition requires a cloud-disabled loopback Ollama runtime.');
  }
  return {
    cloudFeaturesDisabled: true,
    endpointAlias: normalizeText(runtime.endpointAlias),
    externalProviderCalls: 'none',
    kind: 'ollama',
    transportLoopback: true,
    version: normalizeText(runtime.version),
  };
}

function metricDelta(metric, baseline, candidate, scope, direction) {
  if (!Number.isFinite(baseline) || !Number.isFinite(candidate) || baseline === candidate) {
    return null;
  }
  const improved = direction === 'higher'
    ? candidate > baseline
    : candidate < baseline;
  return {
    baseline,
    candidate,
    direction,
    improved,
    metric,
    scope,
  };
}

function compareMetrics(baselineMetrics, candidateMetrics, scope, { includeCasePassRate = true } = {}) {
  const higherMetrics = includeCasePassRate
    ? HIGHER_IS_BETTER
    : HIGHER_IS_BETTER.filter((metric) => metric !== 'casePassRate');
  return [
    ...higherMetrics.map((metric) =>
      metricDelta(metric, baselineMetrics?.[metric], candidateMetrics?.[metric], scope, 'higher')),
    ...LOWER_IS_BETTER.map((metric) =>
      metricDelta(metric, baselineMetrics?.[metric], candidateMetrics?.[metric], scope, 'lower')),
  ].filter(Boolean);
}

function compareEvaluations(baselineEvaluation, candidateEvaluation) {
  const candidateCases = new Map(
    candidateEvaluation.caseResults.map((result) => [result.id, result]),
  );
  const deltas = [
    ...compareMetrics(baselineEvaluation.metrics, candidateEvaluation.metrics, 'suite'),
    ...baselineEvaluation.caseResults.flatMap((baselineCase) =>
      compareMetrics(
        baselineCase.metrics,
        candidateCases.get(baselineCase.id)?.metrics,
        `case:${baselineCase.id}`,
        { includeCasePassRate: false },
      )),
  ];
  return {
    improvements: deltas.filter((delta) => delta.improved),
    regressions: deltas.filter((delta) => !delta.improved),
  };
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

function buildContent({ baseline, candidateGate, observations, observedAt, runtime }) {
  assertLocalAnswerQualityBaseline(baseline);
  const normalizedGate = normalizeCandidateGate(candidateGate);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedObservations = observations.map(normalizeObservation).sort((left, right) =>
    left.caseId.localeCompare(right.caseId));
  const baselineEvaluation = baseline.candidateGate.candidate.evaluation;
  const candidateEvaluation = normalizedGate.candidate.evaluation;
  const baselineCaseIds = baselineEvaluation.caseResults.map((result) => result.id).sort();
  const candidateCaseIds = candidateEvaluation.caseResults.map((result) => result.id).sort();
  const observationCaseIds = normalizedObservations.map((observation) => observation.caseId);
  const promptHashes = [...new Set(normalizedObservations.map((observation) => observation.promptHash))];
  const expectedRefs = [
    `baseline:${baseline.evidenceHash}`,
    `fixture:${baseline.suite.fixtureHash}`,
    `ollama-model:${baseline.model.digest}`,
    `prompt:${promptHashes[0]}`,
  ];
  const modelDigestBound = normalizedGate.candidate.evidenceRefs.includes(
    `ollama-model:${baseline.model.digest}`,
  );
  const sameCases =
    JSON.stringify(baselineCaseIds) === JSON.stringify(candidateCaseIds) &&
    JSON.stringify(candidateCaseIds) === JSON.stringify(observationCaseIds);
  const sameThresholds =
    hashRecord(baseline.suite.thresholds) === hashRecord(candidateEvaluation.thresholds);
  if (
    normalizedGate.candidate.modelId !== baseline.model.id ||
    normalizedGate.candidate.provider !== 'local-ollama' ||
    promptHashes.length !== 1 ||
    !sameCases ||
    !sameThresholds ||
    expectedRefs.some((reference) => !normalizedGate.candidate.evidenceRefs.includes(reference)) ||
    normalizedRuntime.version !== baseline.runtime.version
  ) {
    throw new Error('Local answer composition evidence must bind the baseline, model, prompt, and suite.');
  }

  const comparison = compareEvaluations(baselineEvaluation, candidateEvaluation);
  const candidateGatePassed =
    normalizedGate.status === 'ready-for-review' &&
    normalizedGate.comparison.status === 'passed';
  const requiredCoverageImproved = comparison.improvements.some(
    (delta) => delta.scope === 'suite' && delta.metric === 'requiredTermCoverage',
  );
  const casePassImproved = comparison.improvements.some(
    (delta) => delta.scope === 'suite' && delta.metric === 'casePassRate',
  );
  const qualityImproved =
    candidateGatePassed &&
    comparison.regressions.length === 0 &&
    requiredCoverageImproved &&
    casePassImproved;
  const checks = [
    check('baseline-quality-regression-recorded', baseline.actualLocalAnswerModelQualityValidated === false),
    check('actual-model-evaluated', normalizedGate.candidate.actualModelEvaluated),
    check('same-model-digest-bound', modelDigestBound),
    check('same-suite-cases-and-thresholds', sameCases && sameThresholds),
    check(
      'cloud-disabled-loopback-runtime',
      normalizedRuntime.cloudFeaturesDisabled && normalizedRuntime.transportLoopback,
    ),
    check('complete-source-coverage', normalizedObservations.every(
      (observation) => observation.sourceCoverageComplete,
    )),
    check('review-action-present', normalizedObservations.every(
      (observation) => observation.reviewActionPresent,
    )),
    check('candidate-gate-passed', candidateGatePassed),
    check('no-quality-regression', comparison.regressions.length === 0),
    check('required-term-coverage-improved', requiredCoverageImproved),
    check('case-pass-rate-improved', casePassImproved),
    check('license-review-approved', false),
    check('os-egress-isolation-approved', false),
    check('resource-envelope-approved', false),
    check('rollback-owner-assigned', false),
  ];
  const governanceBlockerIds = checks
    .filter((item) => !item.passed && ![
      'candidate-gate-passed',
      'no-quality-regression',
      'required-term-coverage-improved',
      'case-pass-rate-improved',
    ].includes(item.id))
    .map((item) => item.id);

  return {
    activation: {
      authorized: false,
      blockerCheckIds: qualityImproved
        ? governanceBlockerIds
        : ['composition-candidate-quality-passed', ...governanceBlockerIds],
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    baseline,
    candidateGate: normalizedGate,
    candidateQualityValidated: qualityImproved,
    checks,
    comparison: {
      improvements: comparison.improvements,
      regressions: comparison.regressions,
      status: qualityImproved ? 'improved' : 'failed',
    },
    costFree: true,
    currentAnswerPathChanged: false,
    decision: qualityImproved ? 'hold-for-governance' : 'keep-current-answer-path',
    externalProviderCalls: 'none',
    observations: normalizedObservations,
    observedAt: requireTimestamp(observedAt, 'observedAt'),
    productionReadyClaim: false,
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_ANSWER_COMPOSITION_CANDIDATE_SCHEMA_VERSION,
    status: qualityImproved
      ? 'quality-improved-governance-blocked'
      : 'quality-not-improved-keep-current',
  };
}

export function buildLocalAnswerCompositionCandidate(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-composition-candidate-${evidenceHash}`,
  };
}

export function assertLocalAnswerCompositionCandidate(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-composition-candidate-${expectedHash}`
  ) {
    throw new Error('Local answer composition candidate failed: integrity.');
  }
  const rebuilt = buildLocalAnswerCompositionCandidate(content);
  if (rebuilt.evidenceHash !== evidenceHash) {
    throw new Error('Local answer composition candidate failed: semantic validation.');
  }
}
