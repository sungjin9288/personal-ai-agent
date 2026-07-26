import { createHash } from 'node:crypto';

import { assertAnswerInputBoundaryEvaluation } from './answer-input-boundary-evaluation.mjs';
import { assertLocalAnswerCompositionHardening } from './local-answer-composition-hardening.mjs';
import { ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION } from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_COMPOSITION_BOUNDARY_REGRESSION_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-composition-boundary-regression/v1';

const GOVERNANCE_BLOCKERS = Object.freeze([
  'license-review-approved',
  'os-egress-isolation-approved',
  'resource-envelope-approved',
  'rollback-owner-assigned',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function canonicalizeRecord(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeRecord);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalizeRecord(item)]),
  );
}

function recordsEqual(left, right) {
  return JSON.stringify(canonicalizeRecord(left)) ===
    JSON.stringify(canonicalizeRecord(right));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function requireTimestamp(value) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error('Answer boundary regression observedAt must be a valid timestamp.');
  }
  return normalized;
}

function normalizeModel(model = {}) {
  const normalized = {
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    sizeBytes: Number(model.sizeBytes),
  };
  if (
    !normalized.id ||
    normalized.id.length > 200 ||
    !isSha256(normalized.digest) ||
    !Number.isInteger(normalized.sizeBytes) ||
    normalized.sizeBytes <= 0
  ) {
    throw new Error('Answer boundary regression model evidence is incomplete.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  if (
    runtime.kind !== 'ollama' ||
    !normalizeText(runtime.version) ||
    runtime.transportLoopback !== true ||
    runtime.cloudFeaturesDisabled !== true
  ) {
    throw new Error('Answer boundary regression requires cloud-disabled loopback Ollama.');
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

function normalizeEvaluation(evaluation = {}) {
  const caseResults = Array.isArray(evaluation.caseResults)
    ? evaluation.caseResults.map((result) => ({
      failureCheckIds: Array.isArray(result?.failureCheckIds)
        ? result.failureCheckIds.map(normalizeText).filter(Boolean).sort()
        : [],
      id: normalizeText(result?.id),
      metrics: result?.metrics,
      status: normalizeText(result?.status),
    })).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  if (
    !isSha256(evaluation.evaluationHash) ||
    !isSha256(evaluation.thresholdsHash) ||
    !evaluation.metrics ||
    !['failed', 'passed'].includes(normalizeText(evaluation.status)) ||
    caseResults.length === 0 ||
    new Set(caseResults.map((result) => result.id)).size !== caseResults.length ||
    caseResults.some((result) =>
      !result.id ||
      !result.metrics ||
      !['failed', 'passed'].includes(result.status))
  ) {
    throw new Error('Answer boundary regression evaluation is incomplete.');
  }
  return {
    caseResults,
    evaluationHash: normalizeText(evaluation.evaluationHash),
    metrics: evaluation.metrics,
    status: normalizeText(evaluation.status),
    thresholdsHash: normalizeText(evaluation.thresholdsHash),
  };
}

function normalizeObservation(observation = {}) {
  const normalizationKinds = Array.isArray(observation.sanitization?.normalizationKinds)
    ? [...new Set(
      observation.sanitization.normalizationKinds.map(normalizeText).filter(Boolean),
    )].sort()
    : [];
  const normalized = {
    caseId: normalizeText(observation.caseId),
    citedSourceKeys: Array.isArray(observation.citedSourceKeys)
      ? [...new Set(observation.citedSourceKeys.map(normalizeText).filter(Boolean))].sort()
      : [],
    claimCount: Number(observation.claimCount),
    durationMs: Number(observation.durationMs),
    identifierRestorationCount: Number(observation.identifierRestorationCount),
    inputHash: normalizeText(observation.inputHash),
    maxOutputTokens: Number(observation.maxOutputTokens),
    outputBytes: Number(observation.outputBytes),
    promptHash: normalizeText(observation.promptHash),
    promptVersion: normalizeText(observation.promptVersion),
    rawInputHash: normalizeText(observation.rawInputHash),
    responseHash: normalizeText(observation.responseHash),
    reviewActionPresent: observation.reviewActionPresent === true,
    reviewActionSpecific: observation.reviewActionSpecific === true,
    sanitization: {
      applied: observation.sanitization?.applied === true,
      evidenceInstructionRemovalCount:
        Number(observation.sanitization?.evidenceInstructionRemovalCount),
      instructionRemovalCount: Number(observation.sanitization?.instructionRemovalCount),
      normalizationApplied: observation.sanitization?.normalizationApplied === true,
      normalizationKinds,
      objectiveInstructionRemovalCount:
        Number(observation.sanitization?.objectiveInstructionRemovalCount),
    },
    sourceCoverageComplete: observation.sourceCoverageComplete === true,
  };
  const counts = [
    normalized.sanitization.evidenceInstructionRemovalCount,
    normalized.sanitization.instructionRemovalCount,
    normalized.sanitization.objectiveInstructionRemovalCount,
  ];
  if (
    !normalized.caseId ||
    normalized.citedSourceKeys.length === 0 ||
    !Number.isInteger(normalized.claimCount) ||
    normalized.claimCount <= 0 ||
    !Number.isFinite(normalized.durationMs) ||
    normalized.durationMs <= 0 ||
    !Number.isInteger(normalized.identifierRestorationCount) ||
    normalized.identifierRestorationCount < 0 ||
    !isSha256(normalized.inputHash) ||
    !Number.isInteger(normalized.maxOutputTokens) ||
    normalized.maxOutputTokens <= 0 ||
    normalized.maxOutputTokens > 2_048 ||
    !Number.isInteger(normalized.outputBytes) ||
    normalized.outputBytes <= 0 ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION ||
    !isSha256(normalized.rawInputHash) ||
    !isSha256(normalized.responseHash) ||
    !normalized.reviewActionPresent ||
    !normalized.reviewActionSpecific ||
    !normalized.sourceCoverageComplete ||
    counts.some((count) => !Number.isInteger(count) || count < 0) ||
    normalized.sanitization.instructionRemovalCount !==
      normalized.sanitization.evidenceInstructionRemovalCount +
        normalized.sanitization.objectiveInstructionRemovalCount ||
    normalized.sanitization.applied !==
      (normalized.sanitization.instructionRemovalCount > 0) ||
    normalized.sanitization.normalizationApplied !==
      (normalized.sanitization.normalizationKinds.length > 0)
  ) {
    throw new Error('Answer boundary regression observation is incomplete.');
  }
  return normalized;
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

export function buildLocalAnswerCompositionBoundaryRegression({
  baseline,
  boundaryEvaluation,
  evaluation,
  model,
  observations = [],
  observedAt,
  runtime,
  suite,
} = {}) {
  assertLocalAnswerCompositionHardening(baseline);
  assertAnswerInputBoundaryEvaluation(boundaryEvaluation);
  const normalizedEvaluation = normalizeEvaluation(evaluation);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedObservations = observations.map(normalizeObservation)
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  const suiteHash = hashRecord(canonicalizeSuite(suite));
  const baselineSuiteHash = hashRecord(canonicalizeSuite(baseline.suite));
  const baselineCaseIds = baseline.evaluation.caseResults.map((result) => result.id);
  const candidateCaseIds = normalizedEvaluation.caseResults.map((result) => result.id);
  const observationCaseIds = normalizedObservations.map((observation) => observation.caseId);
  const promptHashes = [...new Set(
    normalizedObservations.map((observation) => observation.promptHash),
  )];
  if (
    baseline.status !== 'hardening-passed-governance-blocked' ||
    baseline.candidateHardeningValidated !== true ||
    boundaryEvaluation.status !== 'boundary-fixture-passed-local-only' ||
    normalizedModel.id !== baseline.model.id ||
    normalizedModel.digest !== baseline.model.digest ||
    normalizedModel.sizeBytes !== baseline.model.sizeBytes ||
    normalizedRuntime.version !== baseline.runtime.version ||
    suiteHash !== baselineSuiteHash ||
    normalizedEvaluation.thresholdsHash !== baseline.evaluation.thresholdsHash ||
    JSON.stringify(candidateCaseIds) !== JSON.stringify(baselineCaseIds) ||
    JSON.stringify(observationCaseIds) !== JSON.stringify(baselineCaseIds) ||
    promptHashes.length !== 1 ||
    promptHashes[0] === baseline.prompt.candidateHash ||
    normalizedObservations.some((observation) => {
      const definition = baseline.suite.cases.find(
        (candidate) => candidate.id === observation.caseId,
      );
      return observation.claimCount !== definition?.evidenceItemCount ||
        observation.sanitization.applied !== definition?.promptInjectionCase;
    })
  ) {
    throw new Error(
      'Answer boundary regression must bind the Q4 baseline, boundary, model, runtime, suite, and observations.',
    );
  }

  const evaluationMatchesBaseline =
    normalizedEvaluation.status === 'passed' &&
    recordsEqual(normalizedEvaluation.metrics, baseline.evaluation.metrics) &&
    recordsEqual(normalizedEvaluation.caseResults, baseline.evaluation.caseResults);
  const boundaryPassed = Object.values(boundaryEvaluation.metrics)
    .every((value) => value === 1);
  const checks = [
    check('q4-hardening-baseline-passed', baseline.candidateHardeningValidated),
    check('same-model-digest-bound', normalizedModel.digest === baseline.model.digest),
    check('same-runtime-version-bound', normalizedRuntime.version === baseline.runtime.version),
    check('same-suite-and-thresholds-bound', suiteHash === baselineSuiteHash),
    check('adversarial-boundary-fixture-passed', boundaryPassed),
    check('all-model-cases-observed', observationCaseIds.length === baselineCaseIds.length),
    check('complete-source-coverage', normalizedObservations.every(
      (observation) => observation.sourceCoverageComplete,
    )),
    check('specific-review-action-present', normalizedObservations.every(
      (observation) => observation.reviewActionSpecific,
    )),
    check('q4-quality-regression-free', evaluationMatchesBaseline),
    ...GOVERNANCE_BLOCKERS.map((id) => check(id, false)),
  ];
  const qualityBlockerIds = checks
    .filter((item) => !item.passed && !GOVERNANCE_BLOCKERS.includes(item.id))
    .map((item) => item.id);
  const passed = qualityBlockerIds.length === 0;
  const content = {
    activation: {
      authorized: false,
      blockerCheckIds: passed
        ? [...GOVERNANCE_BLOCKERS]
        : [...qualityBlockerIds, ...GOVERNANCE_BLOCKERS],
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    actualUserQueryData: false,
    actualUserQueryQualityValidated: false,
    adversarialBoundaryValidated: boundaryPassed,
    baseline: {
      evidenceHash: baseline.evidenceHash,
      evaluationHash: baseline.evaluation.evaluationHash,
      promptHash: baseline.prompt.candidateHash,
    },
    boundaryEvaluation: {
      evidenceHash: boundaryEvaluation.evidenceHash,
      fixtureHash: boundaryEvaluation.fixtureHash,
      metrics: boundaryEvaluation.metrics,
    },
    broadPromptInjectionResistanceValidated: false,
    candidateBoundaryRegressionValidated: passed,
    checks,
    costFree: true,
    currentAnswerPathChanged: false,
    decision: passed ? 'hold-for-governance' : 'keep-current-answer-path',
    evaluation: normalizedEvaluation,
    externalProviderCalls: 'none',
    generalAnswerQualityImprovementValidated: false,
    model: normalizedModel,
    observations: normalizedObservations,
    observedAt: requireTimestamp(observedAt),
    productionReadyClaim: false,
    prompt: {
      baselineHash: baseline.prompt.candidateHash,
      candidateHash: promptHashes[0],
      candidateVersion: ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION,
      changed: true,
    },
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_ANSWER_COMPOSITION_BOUNDARY_REGRESSION_SCHEMA_VERSION,
    status: passed
      ? 'boundary-regression-passed-governance-blocked'
      : 'boundary-regression-failed-keep-current',
    suiteHash,
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-composition-boundary-regression-${evidenceHash}`,
  };
}

export function assertLocalAnswerCompositionBoundaryRegression(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-composition-boundary-regression-${expectedHash}` ||
    content.schemaVersion !== LOCAL_ANSWER_COMPOSITION_BOUNDARY_REGRESSION_SCHEMA_VERSION ||
    content.productionReadyClaim !== false ||
    content.currentAnswerPathChanged !== false ||
    content.actualModelTrainingExecuted !== false ||
    content.actualUserQueryData !== false ||
    content.actualUserQueryQualityValidated !== false ||
    content.broadPromptInjectionResistanceValidated !== false ||
    content.externalProviderCalls !== 'none'
  ) {
    throw new Error('Answer boundary regression failed integrity validation.');
  }
  return evidence;
}
