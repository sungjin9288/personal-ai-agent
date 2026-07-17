import { createHash } from 'node:crypto';

import { ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION } from './answer-quality-evaluation.mjs';
import { assertLocalAnswerCompositionCandidate } from './local-answer-composition-candidate.mjs';
import { ROBUST_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION } from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_COMPOSITION_ROBUSTNESS_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-composition-robustness/v1';

const REQUIRED_SCENARIOS = Object.freeze([
  'bounded-long-context',
  'korean',
  'multi-domain',
  'prompt-injection',
  'q3-regression',
]);
const RATE_METRICS = Object.freeze([
  'casePassRate',
  'citationGroundingRate',
  'expectedSourceCitationRate',
  'requiredTermCoverage',
  'retrievalHitRate',
  'unsupportedCitationRate',
]);
const COUNT_METRICS = Object.freeze([
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
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
    throw new Error(`Local answer composition robustness ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requirePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(
      `Local answer composition robustness ${fieldName} must be a positive ${
        integer ? 'integer' : 'number'
      }.`,
    );
  }
  return normalized;
}

function normalizeMetrics(metrics = {}, { includeCasePassRate = false } = {}) {
  const normalized = {};
  for (const metric of RATE_METRICS) {
    if (!includeCasePassRate && metric === 'casePassRate') {
      continue;
    }
    const value = Number(metrics[metric]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Local answer composition robustness ${metric} must be between 0 and 1.`);
    }
    normalized[metric] = value;
  }
  for (const metric of COUNT_METRICS) {
    const value = Number(metrics[metric]);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Local answer composition robustness ${metric} must be a non-negative integer.`);
    }
    normalized[metric] = value;
  }
  return normalized;
}

function normalizeSuite(suite = {}) {
  const cases = Array.isArray(suite.cases)
    ? suite.cases.map((definition) => ({
      evidenceItemCount: requirePositiveNumber(
        definition?.evidenceItemCount,
        'suite evidenceItemCount',
        { integer: true },
      ),
      id: normalizeText(definition?.id),
      language: normalizeText(definition?.language),
      promptInjectionCase: definition?.promptInjectionCase === true,
      scenarioId: normalizeText(definition?.scenarioId),
    })).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  const fixtureRefs = Array.isArray(suite.fixtureRefs)
    ? suite.fixtureRefs.map((reference) => ({
      id: normalizeText(reference?.id),
      sha256: normalizeText(reference?.sha256),
    })).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  const caseIds = cases.map((definition) => definition.id);
  const scenarioIds = [...new Set(cases.map((definition) => definition.scenarioId))].sort();
  const scenarioCounts = new Map();
  for (const definition of cases) {
    scenarioCounts.set(definition.scenarioId, (scenarioCounts.get(definition.scenarioId) || 0) + 1);
  }
  if (
    !normalizeText(suite.id) ||
    !isSha256(suite.fixtureHash) ||
    !suite.thresholds ||
    typeof suite.thresholds !== 'object' ||
    cases.length < 10 ||
    fixtureRefs.length !== 2 ||
    new Set(fixtureRefs.map((reference) => reference.id)).size !== fixtureRefs.length ||
    fixtureRefs.some((reference) => !reference.id || !isSha256(reference.sha256)) ||
    new Set(caseIds).size !== caseIds.length ||
    cases.some((definition) =>
      !definition.id ||
      !['en', 'ko'].includes(definition.language) ||
      !REQUIRED_SCENARIOS.includes(definition.scenarioId)) ||
    JSON.stringify(scenarioIds) !== JSON.stringify(REQUIRED_SCENARIOS) ||
    REQUIRED_SCENARIOS.some((scenarioId) => (scenarioCounts.get(scenarioId) || 0) < 2) ||
    cases.filter((definition) => definition.promptInjectionCase).length < 2
  ) {
    throw new Error(
      'Local answer composition robustness suite requires ten bounded cases across all scenarios.',
    );
  }
  return {
    cases,
    fixtureHash: normalizeText(suite.fixtureHash),
    fixtureRefs,
    id: normalizeText(suite.id),
    thresholds: suite.thresholds,
  };
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
    throw new Error('Local answer composition robustness evaluation summary is incomplete.');
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
    responseHash: normalizeText(observation.responseHash),
    reviewActionPresent: observation.reviewActionPresent === true,
    sourceCoverageComplete: observation.sourceCoverageComplete === true,
  };
  if (
    !normalized.caseId ||
    normalized.citedSourceKeys.length === 0 ||
    !isSha256(normalized.inputHash) ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== ROBUST_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION ||
    normalized.maxOutputTokens > 2_048 ||
    !isSha256(normalized.responseHash) ||
    !normalized.reviewActionPresent ||
    !normalized.sourceCoverageComplete
  ) {
    throw new Error('Local answer composition robustness observation is incomplete.');
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
      'Local answer composition robustness requires a cloud-disabled loopback Ollama runtime.',
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

function normalizeModel(model = {}) {
  const normalized = {
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    sizeBytes: requirePositiveNumber(model.sizeBytes, 'model sizeBytes', { integer: true }),
  };
  if (
    !normalized.id ||
    normalized.id.length > 200 ||
    !isSha256(normalized.digest)
  ) {
    throw new Error('Local answer composition robustness requires bounded model evidence.');
  }
  return normalized;
}

function buildScenarioResults(suite, evaluation) {
  const resultsByCaseId = new Map(
    evaluation.caseResults.map((result) => [result.id, result]),
  );
  return REQUIRED_SCENARIOS.map((scenarioId) => {
    const definitions = suite.cases.filter((definition) => definition.scenarioId === scenarioId);
    const caseResults = definitions.map((definition) => resultsByCaseId.get(definition.id));
    const passedCaseCount = caseResults.filter((result) => result?.status === 'passed').length;
    const forbiddenTermMatchCount = caseResults.reduce(
      (total, result) => total + (result?.metrics.forbiddenTermMatchCount || 0),
      0,
    );
    return {
      caseCount: definitions.length,
      failedCaseCount: definitions.length - passedCaseCount,
      forbiddenTermMatchCount,
      id: scenarioId,
      passedCaseCount,
      status: passedCaseCount === definitions.length ? 'passed' : 'failed',
    };
  });
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

export function summarizeAnswerCompositionRobustnessEvaluation(evaluation = {}) {
  if (
    evaluation.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    evaluation.productionReadyClaim !== false ||
    !Array.isArray(evaluation.cases) ||
    !evaluation.summary ||
    !evaluation.thresholds
  ) {
    throw new Error('Local answer composition robustness requires an answer-quality evaluation.');
  }
  return normalizeEvaluation({
    caseResults: evaluation.cases.map((result) => ({
      failureCheckIds: result.failures.map((failure) => failure.check),
      id: result.id,
      metrics: result.metrics,
      status: result.status,
    })),
    evaluationHash: hashRecord(evaluation),
    metrics: evaluation.summary.metrics,
    status: evaluation.status,
    thresholdsHash: hashRecord(evaluation.thresholds),
  });
}

function buildContent({ baseline, evaluation, model, observations, observedAt, runtime, suite }) {
  assertLocalAnswerCompositionCandidate(baseline);
  const normalizedEvaluation = normalizeEvaluation(evaluation);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedSuite = normalizeSuite(suite);
  const normalizedObservations = observations.map(normalizeObservation).sort((left, right) =>
    left.caseId.localeCompare(right.caseId));
  const suiteCaseIds = normalizedSuite.cases.map((definition) => definition.id);
  const evaluationCaseIds = normalizedEvaluation.caseResults.map((result) => result.id);
  const observationCaseIds = normalizedObservations.map((observation) => observation.caseId);
  const baselinePromptHashes = [
    ...new Set(baseline.observations.map((observation) => observation.promptHash)),
  ];
  const observationPromptHashes = [
    ...new Set(normalizedObservations.map((observation) => observation.promptHash)),
  ];
  if (
    baseline.candidateQualityValidated !== true ||
    baseline.currentAnswerPathChanged !== false ||
    baseline.activation.authorized !== false ||
    baselinePromptHashes.length !== 1 ||
    observationPromptHashes.length !== 1 ||
    baselinePromptHashes[0] === observationPromptHashes[0] ||
    normalizedModel.id !== baseline.baseline.model.id ||
    normalizedModel.digest !== baseline.baseline.model.digest ||
    normalizedModel.sizeBytes !== baseline.baseline.model.sizeBytes ||
    normalizedRuntime.version !== baseline.runtime.version ||
    hashRecord(normalizedSuite.thresholds) !== normalizedEvaluation.thresholdsHash ||
    JSON.stringify(suiteCaseIds) !== JSON.stringify(evaluationCaseIds) ||
    JSON.stringify(suiteCaseIds) !== JSON.stringify(observationCaseIds) ||
    normalizedSuite.cases.some((definition) => {
      const observation = normalizedObservations.find((item) => item.caseId === definition.id);
      return observation?.claimCount !== definition.evidenceItemCount;
    })
  ) {
    throw new Error(
      'Local answer composition robustness must bind the Q3 baseline, prompt, runtime, suite, and observations.',
    );
  }

  const scenarioResults = buildScenarioResults(normalizedSuite, normalizedEvaluation);
  const scenarioPassed = (scenarioId) =>
    scenarioResults.find((result) => result.id === scenarioId)?.status === 'passed';
  const allCasesPassed =
    normalizedEvaluation.status === 'passed' &&
    normalizedEvaluation.metrics.casePassRate === 1 &&
    normalizedEvaluation.caseResults.every((result) => result.status === 'passed');
  const promptInjectionBlocked =
    scenarioPassed('prompt-injection') &&
    scenarioResults.find((result) => result.id === 'prompt-injection')
      ?.forbiddenTermMatchCount === 0;
  const robustnessPassed =
    allCasesPassed &&
    scenarioResults.every((result) => result.status === 'passed') &&
    promptInjectionBlocked;
  const checks = [
    check('q3-composition-quality-validated', baseline.candidateQualityValidated),
    check('q3-current-path-unchanged', baseline.currentAnswerPathChanged === false),
    check(
      'same-model-digest-bound',
      normalizedModel.digest === baseline.baseline.model.digest,
    ),
    check(
      'robustness-prompt-change-bound',
      baselinePromptHashes[0] !== observationPromptHashes[0],
    ),
    check('same-runtime-version-bound', normalizedRuntime.version === baseline.runtime.version),
    check('suite-thresholds-bound', hashRecord(normalizedSuite.thresholds) === normalizedEvaluation.thresholdsHash),
    check('all-suite-cases-observed', suiteCaseIds.length === observationCaseIds.length),
    check('complete-source-coverage', normalizedObservations.every(
      (observation) => observation.sourceCoverageComplete,
    )),
    check('review-action-present', normalizedObservations.every(
      (observation) => observation.reviewActionPresent,
    )),
    check('all-cases-passed', allCasesPassed),
    check('korean-cases-passed', scenarioPassed('korean')),
    check('multi-domain-cases-passed', scenarioPassed('multi-domain')),
    check('bounded-long-context-cases-passed', scenarioPassed('bounded-long-context')),
    check('prompt-injection-canaries-blocked', promptInjectionBlocked),
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
      blockerCheckIds: robustnessPassed
        ? governanceBlockerIds
        : [...qualityBlockerIds, ...governanceBlockerIds],
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    baseline,
    boundedLongContextValidated: scenarioPassed('bounded-long-context'),
    candidateRobustnessValidated: robustnessPassed,
    checks,
    costFree: true,
    currentAnswerPathChanged: false,
    decision: robustnessPassed ? 'hold-for-governance' : 'keep-current-answer-path',
    evaluation: normalizedEvaluation,
    externalProviderCalls: 'none',
    generalAnswerQualityImprovementValidated: false,
    koreanQualityValidated: scenarioPassed('korean'),
    model: normalizedModel,
    multiDomainQualityValidated: scenarioPassed('multi-domain'),
    observations: normalizedObservations,
    observedAt: requireTimestamp(observedAt, 'observedAt'),
    prompt: {
      baselineHash: baselinePromptHashes[0],
      candidateHash: observationPromptHashes[0],
      candidateVersion: ROBUST_EVIDENCE_FIRST_ANSWER_PROMPT_VERSION,
      changed: true,
    },
    productionReadyClaim: false,
    promptInjectionRobustnessValidated: promptInjectionBlocked,
    q3RegressionQualityValidated: scenarioPassed('q3-regression'),
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    scenarioResults,
    schemaVersion: LOCAL_ANSWER_COMPOSITION_ROBUSTNESS_SCHEMA_VERSION,
    status: robustnessPassed
      ? 'robustness-passed-governance-blocked'
      : 'robustness-failed-keep-current',
    suite: normalizedSuite,
  };
}

export function buildLocalAnswerCompositionRobustness(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-composition-robustness-${evidenceHash}`,
  };
}

export function assertLocalAnswerCompositionRobustness(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-composition-robustness-${expectedHash}`
  ) {
    throw new Error('Local answer composition robustness failed: integrity.');
  }
  const rebuilt = buildLocalAnswerCompositionRobustness(content);
  if (rebuilt.evidenceHash !== evidenceHash) {
    throw new Error('Local answer composition robustness failed: semantic validation.');
  }
}
