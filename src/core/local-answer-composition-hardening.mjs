import { createHash } from 'node:crypto';

import { assertLocalAnswerCompositionRobustness } from './local-answer-composition-robustness.mjs';
import { HARDENED_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION } from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_COMPOSITION_HARDENING_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-composition-hardening/v1';

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
    throw new Error(`Local answer composition hardening ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requirePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(
      `Local answer composition hardening ${fieldName} must be a positive ${
        integer ? 'integer' : 'number'
      }.`,
    );
  }
  return normalized;
}

function requireNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(
      `Local answer composition hardening ${fieldName} must be a non-negative integer.`,
    );
  }
  return normalized;
}

function normalizeMetrics(metrics = {}, { includeCasePassRate = false } = {}) {
  const normalized = {};
  for (const metric of HIGHER_IS_BETTER) {
    if (!includeCasePassRate && metric === 'casePassRate') {
      continue;
    }
    const value = Number(metrics[metric]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Local answer composition hardening ${metric} must be between 0 and 1.`);
    }
    normalized[metric] = value;
  }
  for (const metric of LOWER_IS_BETTER) {
    const value = Number(metrics[metric]);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      (metric !== 'unsupportedCitationRate' && !Number.isInteger(value)) ||
      (metric === 'unsupportedCitationRate' && value > 1)
    ) {
      throw new Error(`Local answer composition hardening ${metric} is invalid.`);
    }
    normalized[metric] = value;
  }
  return normalized;
}

function normalizeEvaluation(evaluation = {}) {
  const caseResults = Array.isArray(evaluation.caseResults)
    ? evaluation.caseResults.map((result) => ({
      failureCheckIds: Array.isArray(result?.failureCheckIds)
        ? [...new Set(result.failureCheckIds.map((id) => normalizeText(id)).filter(Boolean))].sort()
        : [],
      id: normalizeText(result?.id),
      metrics: normalizeMetrics(result?.metrics),
      status: normalizeText(result?.status),
    })).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  if (
    !isSha256(evaluation.evaluationHash) ||
    !isSha256(evaluation.thresholdsHash) ||
    !['failed', 'passed'].includes(normalizeText(evaluation.status)) ||
    caseResults.length === 0 ||
    new Set(caseResults.map((result) => result.id)).size !== caseResults.length ||
    caseResults.some((result) =>
      !result.id ||
      !['failed', 'passed'].includes(result.status) ||
      (result.status === 'passed' && result.failureCheckIds.length > 0))
  ) {
    throw new Error('Local answer composition hardening evaluation summary is incomplete.');
  }
  return {
    caseResults,
    evaluationHash: normalizeText(evaluation.evaluationHash),
    metrics: normalizeMetrics(evaluation.metrics, { includeCasePassRate: true }),
    status: normalizeText(evaluation.status),
    thresholdsHash: normalizeText(evaluation.thresholdsHash),
  };
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
    maxOutputTokens: requirePositiveNumber(
      observation.maxOutputTokens,
      'observation maxOutputTokens',
      { integer: true },
    ),
    outputBytes: requirePositiveNumber(observation.outputBytes, 'observation outputBytes', {
      integer: true,
    }),
    promptHash: normalizeText(observation.promptHash),
    promptVersion: normalizeText(observation.promptVersion),
    rawInputHash: normalizeText(observation.rawInputHash),
    responseHash: normalizeText(observation.responseHash),
    reviewActionPresent: observation.reviewActionPresent === true,
    reviewActionSpecific: observation.reviewActionSpecific === true,
    sanitization: {
      applied: observation.sanitization?.applied === true,
      evidenceInstructionRemovalCount: requireNonNegativeInteger(
        observation.sanitization?.evidenceInstructionRemovalCount,
        'evidence instruction removal count',
      ),
      instructionRemovalCount: requireNonNegativeInteger(
        observation.sanitization?.instructionRemovalCount,
        'instruction removal count',
      ),
      objectiveInstructionRemovalCount: requireNonNegativeInteger(
        observation.sanitization?.objectiveInstructionRemovalCount,
        'objective instruction removal count',
      ),
    },
    sourceCoverageComplete: observation.sourceCoverageComplete === true,
  };
  if (
    !normalized.caseId ||
    normalized.citedSourceKeys.length === 0 ||
    !isSha256(normalized.inputHash) ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== HARDENED_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION ||
    normalized.maxOutputTokens > 2_048 ||
    !isSha256(normalized.rawInputHash) ||
    !isSha256(normalized.responseHash) ||
    !normalized.reviewActionPresent ||
    !normalized.reviewActionSpecific ||
    !normalized.sourceCoverageComplete
  ) {
    throw new Error('Local answer composition hardening observation is incomplete.');
  }
  if (
    normalized.sanitization.instructionRemovalCount !==
      normalized.sanitization.evidenceInstructionRemovalCount +
        normalized.sanitization.objectiveInstructionRemovalCount ||
    normalized.sanitization.applied !==
      (normalized.sanitization.instructionRemovalCount > 0)
  ) {
    throw new Error('Local answer composition hardening sanitization counts are inconsistent.');
  }
  return normalized;
}

function normalizeModel(model = {}) {
  const normalized = {
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    sizeBytes: requirePositiveNumber(model.sizeBytes, 'model sizeBytes', { integer: true }),
  };
  if (!normalized.id || normalized.id.length > 200 || !isSha256(normalized.digest)) {
    throw new Error('Local answer composition hardening requires bounded model evidence.');
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
    throw new Error(
      'Local answer composition hardening requires a cloud-disabled loopback Ollama runtime.',
    );
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

function compareEvaluations(baseline, candidate) {
  const candidateCases = new Map(candidate.caseResults.map((result) => [result.id, result]));
  const deltas = [
    ...compareMetrics(baseline.metrics, candidate.metrics, 'suite'),
    ...baseline.caseResults.flatMap((baselineCase) =>
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

function buildScenarioResults(suite, evaluation) {
  const resultsByCaseId = new Map(
    evaluation.caseResults.map((result) => [result.id, result]),
  );
  const scenarioIds = [...new Set(suite.cases.map((definition) => definition.scenarioId))].sort();
  return scenarioIds.map((scenarioId) => {
    const definitions = suite.cases.filter((definition) => definition.scenarioId === scenarioId);
    const results = definitions.map((definition) => resultsByCaseId.get(definition.id));
    const passedCaseCount = results.filter((result) => result?.status === 'passed').length;
    return {
      caseCount: definitions.length,
      failedCaseCount: definitions.length - passedCaseCount,
      forbiddenTermMatchCount: results.reduce(
        (total, result) => total + (result?.metrics.forbiddenTermMatchCount || 0),
        0,
      ),
      id: scenarioId,
      passedCaseCount,
      status: passedCaseCount === definitions.length ? 'passed' : 'failed',
    };
  });
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

function canonicalizeSuite(suite = {}) {
  return {
    ...suite,
    cases: Array.isArray(suite.cases)
      ? [...suite.cases].sort((left, right) =>
        normalizeText(left?.id).localeCompare(normalizeText(right?.id)))
      : [],
    fixtureRefs: Array.isArray(suite.fixtureRefs)
      ? [...suite.fixtureRefs].sort((left, right) =>
        normalizeText(left?.id).localeCompare(normalizeText(right?.id)))
      : [],
  };
}

function buildContent({ baseline, evaluation, model, observations, observedAt, runtime, suite }) {
  assertLocalAnswerCompositionRobustness(baseline);
  const normalizedEvaluation = normalizeEvaluation(evaluation);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedObservations = observations.map(normalizeObservation).sort((left, right) =>
    left.caseId.localeCompare(right.caseId));
  if (hashRecord(canonicalizeSuite(suite)) !== hashRecord(baseline.suite)) {
    throw new Error('Local answer composition hardening suite must match the robustness baseline.');
  }
  const normalizedSuite = baseline.suite;
  const baselineCaseIds = baseline.evaluation.caseResults.map((result) => result.id);
  const candidateCaseIds = normalizedEvaluation.caseResults.map((result) => result.id);
  const observationCaseIds = normalizedObservations.map((observation) => observation.caseId);
  const candidatePromptHashes = [
    ...new Set(normalizedObservations.map((observation) => observation.promptHash)),
  ];
  const inputBoundaryApplied = normalizedSuite.cases.every((definition) => {
    const observation = normalizedObservations.find((item) => item.caseId === definition.id);
    return definition.promptInjectionCase
      ? observation?.sanitization.applied === true
      : observation?.sanitization.instructionRemovalCount === 0;
  });
  if (
    baseline.status !== 'robustness-failed-keep-current' ||
    baseline.candidateRobustnessValidated !== false ||
    baseline.currentAnswerPathChanged !== false ||
    normalizedModel.id !== baseline.model.id ||
    normalizedModel.digest !== baseline.model.digest ||
    normalizedModel.sizeBytes !== baseline.model.sizeBytes ||
    normalizedRuntime.version !== baseline.runtime.version ||
    normalizedEvaluation.thresholdsHash !== baseline.evaluation.thresholdsHash ||
    JSON.stringify(baselineCaseIds) !== JSON.stringify(candidateCaseIds) ||
    JSON.stringify(candidateCaseIds) !== JSON.stringify(observationCaseIds) ||
    candidatePromptHashes.length !== 1 ||
    candidatePromptHashes[0] === baseline.prompt.candidateHash ||
    normalizedSuite.cases.some((definition) => {
      const observation = normalizedObservations.find((item) => item.caseId === definition.id);
      return observation?.claimCount !== definition.evidenceItemCount;
    })
  ) {
    throw new Error(
      'Local answer composition hardening must bind the failed baseline, model, prompt, runtime, and cases.',
    );
  }

  const comparison = compareEvaluations(baseline.evaluation, normalizedEvaluation);
  const scenarioResults = buildScenarioResults(normalizedSuite, normalizedEvaluation);
  const scenarioPassed = (scenarioId) =>
    scenarioResults.find((result) => result.id === scenarioId)?.status === 'passed';
  const allCasesPassed =
    normalizedEvaluation.status === 'passed' &&
    normalizedEvaluation.metrics.casePassRate === 1 &&
    normalizedEvaluation.caseResults.every((result) => result.status === 'passed');
  const promptInjectionPassed =
    scenarioPassed('prompt-injection') &&
    scenarioResults.find((result) => result.id === 'prompt-injection')
      ?.forbiddenTermMatchCount === 0;
  const casePassImproved = comparison.improvements.some(
    (delta) => delta.scope === 'suite' && delta.metric === 'casePassRate',
  );
  const forbiddenTermImproved = comparison.improvements.some(
    (delta) => delta.scope === 'suite' && delta.metric === 'forbiddenTermMatchCount',
  );
  const hardeningPassed =
    allCasesPassed &&
    promptInjectionPassed &&
    inputBoundaryApplied &&
    comparison.regressions.length === 0 &&
    casePassImproved &&
    forbiddenTermImproved;
  const checks = [
    check('failed-robustness-baseline-recorded', baseline.candidateRobustnessValidated === false),
    check('same-model-digest-bound', normalizedModel.digest === baseline.model.digest),
    check('hardened-prompt-change-bound', candidatePromptHashes[0] !== baseline.prompt.candidateHash),
    check('same-runtime-version-bound', normalizedRuntime.version === baseline.runtime.version),
    check('same-suite-and-thresholds-bound', normalizedEvaluation.thresholdsHash === baseline.evaluation.thresholdsHash),
    check('complete-source-coverage', normalizedObservations.every(
      (observation) => observation.sourceCoverageComplete,
    )),
    check('specific-review-action-present', normalizedObservations.every(
      (observation) => observation.reviewActionSpecific,
    )),
    check('prompt-injection-input-boundary-applied', inputBoundaryApplied),
    check('all-cases-passed', allCasesPassed),
    check('no-quality-regression', comparison.regressions.length === 0),
    check('case-pass-rate-improved', casePassImproved),
    check('forbidden-term-match-improved', forbiddenTermImproved),
    check('korean-cases-passed', scenarioPassed('korean')),
    check('multi-domain-cases-passed', scenarioPassed('multi-domain')),
    check('bounded-long-context-cases-passed', scenarioPassed('bounded-long-context')),
    check('prompt-injection-canaries-blocked', promptInjectionPassed),
    check('q3-regression-cases-passed', scenarioPassed('q3-regression')),
    check('license-review-approved', false),
    check('os-egress-isolation-approved', false),
    check('resource-envelope-approved', false),
    check('rollback-owner-assigned', false),
  ];
  const governanceBlockerIds = checks
    .filter((item) => !item.passed && [
      'license-review-approved',
      'os-egress-isolation-approved',
      'resource-envelope-approved',
      'rollback-owner-assigned',
    ].includes(item.id))
    .map((item) => item.id);
  const qualityBlockerIds = checks
    .filter((item) => !item.passed && !governanceBlockerIds.includes(item.id))
    .map((item) => item.id);

  return {
    activation: {
      authorized: false,
      blockerCheckIds: hardeningPassed
        ? governanceBlockerIds
        : [...qualityBlockerIds, ...governanceBlockerIds],
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    baseline,
    boundedLongContextValidated: scenarioPassed('bounded-long-context'),
    candidateHardeningValidated: hardeningPassed,
    checks,
    comparison: {
      improvements: comparison.improvements,
      regressions: comparison.regressions,
      status: hardeningPassed ? 'improved' : 'failed',
    },
    costFree: true,
    currentAnswerPathChanged: false,
    decision: hardeningPassed ? 'hold-for-governance' : 'keep-current-answer-path',
    evaluation: normalizedEvaluation,
    externalProviderCalls: 'none',
    generalAnswerQualityImprovementValidated: false,
    koreanQualityValidated: scenarioPassed('korean'),
    model: normalizedModel,
    multiDomainQualityValidated: scenarioPassed('multi-domain'),
    observations: normalizedObservations,
    observedAt: requireTimestamp(observedAt, 'observedAt'),
    productionReadyClaim: false,
    prompt: {
      baselineHash: baseline.prompt.candidateHash,
      candidateHash: candidatePromptHashes[0],
      candidateVersion: HARDENED_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION,
      changed: true,
    },
    promptInjectionRobustnessValidated: promptInjectionPassed,
    q3RegressionQualityValidated: scenarioPassed('q3-regression'),
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    scenarioResults,
    schemaVersion: LOCAL_ANSWER_COMPOSITION_HARDENING_SCHEMA_VERSION,
    status: hardeningPassed
      ? 'hardening-passed-governance-blocked'
      : 'hardening-failed-keep-current',
    suite: normalizedSuite,
  };
}

export function buildLocalAnswerCompositionHardening(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-composition-hardening-${evidenceHash}`,
  };
}

export function assertLocalAnswerCompositionHardening(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-composition-hardening-${expectedHash}`
  ) {
    throw new Error('Local answer composition hardening failed: integrity.');
  }
  const rebuilt = buildLocalAnswerCompositionHardening(content);
  if (rebuilt.evidenceHash !== evidenceHash) {
    throw new Error('Local answer composition hardening failed: semantic validation.');
  }
}
