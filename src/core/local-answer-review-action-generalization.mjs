import { createHash } from 'node:crypto';

import {
  assertLocalAnswerCompositionBoundaryRegression,
} from './local-answer-composition-boundary-regression.mjs';
import { assertLocalUserQueryQuality } from './local-user-query-quality.mjs';
import {
  REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
} from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_REVIEW_ACTION_GENERALIZATION_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-review-action-generalization/v1';

const GOVERNANCE_BLOCKERS = Object.freeze([
  'license-review-approved',
  'os-egress-isolation-approved',
  'resource-envelope-approved',
  'rollback-owner-assigned',
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
const GENERATION_FAILURE_KINDS = Object.freeze([
  'generation-contract-error',
  'generation-timeout',
  'incomplete-source-coverage',
  'invalid-review-action',
  'invalid-structured-output',
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

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
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

function requireTimestamp(value) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error('Review action generalization observedAt must be a valid timestamp.');
  }
  return normalized;
}

function requirePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (
    !Number.isFinite(normalized) ||
    normalized <= 0 ||
    (integer && !Number.isInteger(normalized))
  ) {
    throw new Error(`Review action generalization ${fieldName} must be positive.`);
  }
  return normalized;
}

function normalizeMetrics(metrics = {}, { includeCasePassRate = false } = {}) {
  const normalized = {};
  for (const name of RATE_METRICS) {
    if (!includeCasePassRate && name === 'casePassRate') {
      continue;
    }
    const value = Number(metrics[name]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Review action generalization ${name} must be between 0 and 1.`);
    }
    normalized[name] = value;
  }
  for (const name of COUNT_METRICS) {
    const value = Number(metrics[name]);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        `Review action generalization ${name} must be a non-negative integer.`,
      );
    }
    normalized[name] = value;
  }
  return normalized;
}

function normalizeCaseId(result = {}) {
  const idHash = normalizeText(result.idHash);
  if (isSha256(idHash)) {
    return idHash;
  }
  const id = normalizeText(result.id);
  if (!id) {
    throw new Error('Review action generalization case identity is incomplete.');
  }
  return sha256(id);
}

function normalizeCaseResult(result = {}) {
  const failureCheckIds = Array.isArray(result.failureCheckIds)
    ? [...new Set(result.failureCheckIds.map(normalizeText).filter(Boolean))].sort()
    : [];
  const normalized = {
    failureCheckIds,
    idHash: normalizeCaseId(result),
    metrics: normalizeMetrics(result.metrics),
    status: normalizeText(result.status),
  };
  if (
    !['failed', 'passed'].includes(normalized.status) ||
    (normalized.status === 'passed' && normalized.failureCheckIds.length > 0)
  ) {
    throw new Error('Review action generalization case result is incomplete.');
  }
  return normalized;
}

function normalizeBreakdown(items = []) {
  return items.map((item) => ({
    caseCount: requirePositiveNumber(item.caseCount, 'breakdown caseCount', {
      integer: true,
    }),
    id: normalizeText(item.id),
    metrics: normalizeMetrics(item.metrics, { includeCasePassRate: true }),
    status: normalizeText(item.status),
  })).sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeEvaluation(evaluation = {}) {
  const caseResults = Array.isArray(evaluation.caseResults)
    ? evaluation.caseResults.map(normalizeCaseResult)
      .sort((left, right) => left.idHash.localeCompare(right.idHash))
    : [];
  const domainBreakdown = Array.isArray(evaluation.domainBreakdown)
    ? normalizeBreakdown(evaluation.domainBreakdown)
    : [];
  const languageBreakdown = Array.isArray(evaluation.languageBreakdown)
    ? normalizeBreakdown(evaluation.languageBreakdown)
    : [];
  const normalized = {
    caseResults,
    domainBreakdown,
    evaluationHash: normalizeText(evaluation.evaluationHash),
    languageBreakdown,
    metrics: normalizeMetrics(evaluation.metrics, { includeCasePassRate: true }),
    status: normalizeText(evaluation.status),
    thresholdsHash: normalizeText(evaluation.thresholdsHash),
  };
  if (
    !isSha256(normalized.evaluationHash) ||
    !isSha256(normalized.thresholdsHash) ||
    !['failed', 'passed'].includes(normalized.status) ||
    normalized.caseResults.length === 0 ||
    new Set(normalized.caseResults.map((item) => item.idHash)).size !==
      normalized.caseResults.length ||
    (normalized.status === 'passed' &&
      normalized.caseResults.some((item) => item.status !== 'passed')) ||
    [...domainBreakdown, ...languageBreakdown].some(
      (item) => !item.id || !['failed', 'passed'].includes(item.status),
    )
  ) {
    throw new Error('Review action generalization evaluation is incomplete.');
  }
  return normalized;
}

function normalizeObservation(observation = {}) {
  const caseIdHash = isSha256(observation.caseIdHash)
    ? normalizeText(observation.caseIdHash)
    : sha256(normalizeText(observation.caseId));
  const citedSourceKeyHashes = Array.isArray(observation.citedSourceKeyHashes)
    ? [...new Set(observation.citedSourceKeyHashes.map(normalizeText).filter(Boolean))].sort()
    : Array.isArray(observation.citedSourceKeys)
      ? [...new Set(
        observation.citedSourceKeys.map((key) => sha256(normalizeText(key))),
      )].sort()
      : [];
  const normalizationKinds = Array.isArray(
    observation.sanitization?.normalizationKinds,
  )
    ? [...new Set(
      observation.sanitization.normalizationKinds.map(normalizeText).filter(Boolean),
    )].sort()
    : [];
  const normalized = {
    caseIdHash,
    citedSourceKeyHashes,
    claimCount: Number(observation.claimCount),
    durationMs: requirePositiveNumber(observation.durationMs, 'observation durationMs'),
    failureKind: observation.failureKind === null ||
      observation.failureKind === undefined
      ? null
      : normalizeText(observation.failureKind),
    generationStatus: normalizeText(observation.generationStatus) || 'passed',
    identifierRestorationCount: Number(observation.identifierRestorationCount),
    inputHash: normalizeText(observation.inputHash),
    maxOutputTokens: requirePositiveNumber(
      observation.maxOutputTokens,
      'observation maxOutputTokens',
      { integer: true },
    ),
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
      instructionRemovalCount: Number(
        observation.sanitization?.instructionRemovalCount,
      ),
      normalizationApplied:
        observation.sanitization?.normalizationApplied === true,
      normalizationKinds,
      objectiveInstructionRemovalCount:
        Number(observation.sanitization?.objectiveInstructionRemovalCount),
    },
    sourceCoverageComplete: observation.sourceCoverageComplete === true,
  };
  const generationPassed = normalized.generationStatus === 'passed';
  const counts = [
    normalized.sanitization.evidenceInstructionRemovalCount,
    normalized.sanitization.instructionRemovalCount,
    normalized.sanitization.objectiveInstructionRemovalCount,
  ];
  if (
    !isSha256(normalized.caseIdHash) ||
    normalized.citedSourceKeyHashes.some((value) => !isSha256(value)) ||
    !Number.isInteger(normalized.claimCount) ||
    normalized.claimCount < 0 ||
    !['failed', 'passed'].includes(normalized.generationStatus) ||
    (generationPassed && normalized.failureKind !== null) ||
    (!generationPassed && !GENERATION_FAILURE_KINDS.includes(normalized.failureKind)) ||
    !Number.isInteger(normalized.identifierRestorationCount) ||
    normalized.identifierRestorationCount < 0 ||
    !isSha256(normalized.inputHash) ||
    normalized.maxOutputTokens > 2_048 ||
    !Number.isInteger(normalized.outputBytes) ||
    normalized.outputBytes < 0 ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !==
      REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION ||
    !isSha256(normalized.rawInputHash) ||
    !isSha256(normalized.responseHash) ||
    counts.some((value) => !Number.isInteger(value) || value < 0) ||
    normalized.sanitization.instructionRemovalCount !==
      normalized.sanitization.evidenceInstructionRemovalCount +
        normalized.sanitization.objectiveInstructionRemovalCount ||
    normalized.sanitization.applied !==
      (normalized.sanitization.instructionRemovalCount > 0) ||
    normalized.sanitization.normalizationApplied !==
      (normalized.sanitization.normalizationKinds.length > 0) ||
    (generationPassed && (
      normalized.citedSourceKeyHashes.length === 0 ||
      normalized.claimCount === 0 ||
      normalized.outputBytes === 0 ||
      !normalized.reviewActionPresent ||
      !normalized.reviewActionSpecific ||
      !normalized.sourceCoverageComplete
    )) ||
    (!generationPassed && (
      normalized.citedSourceKeyHashes.length > 0 ||
      normalized.claimCount !== 0 ||
      normalized.outputBytes !== 0 ||
      normalized.reviewActionPresent ||
      normalized.reviewActionSpecific ||
      normalized.sourceCoverageComplete
    ))
  ) {
    throw new Error('Review action generalization observation is incomplete.');
  }
  return normalized;
}

function normalizeModel(model = {}) {
  const normalized = {
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    sizeBytes: requirePositiveNumber(model.sizeBytes, 'model sizeBytes', {
      integer: true,
    }),
  };
  if (!normalized.id || normalized.id.length > 200 || !isSha256(normalized.digest)) {
    throw new Error('Review action generalization model evidence is incomplete.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  const normalized = {
    cloudFeaturesDisabled: runtime.cloudFeaturesDisabled === true,
    endpointAlias: normalizeText(runtime.endpointAlias),
    externalProviderCalls: 'none',
    kind: normalizeText(runtime.kind),
    transportLoopback: runtime.transportLoopback === true,
    version: normalizeText(runtime.version),
  };
  if (
    normalized.kind !== 'ollama' ||
    normalized.endpointAlias !== 'loopback-ollama' ||
    !normalized.version ||
    !normalized.cloudFeaturesDisabled ||
    !normalized.transportLoopback
  ) {
    throw new Error(
      'Review action generalization requires cloud-disabled loopback Ollama.',
    );
  }
  return normalized;
}

function canonicalizeSuite(suite = {}) {
  return {
    ...suite,
    cases: Array.isArray(suite.cases)
      ? [...suite.cases].sort((left, right) =>
        normalizeText(left.id ?? left.idHash)
          .localeCompare(normalizeText(right.id ?? right.idHash)))
      : [],
    fixtureRefs: Array.isArray(suite.fixtureRefs)
      ? [...suite.fixtureRefs].sort((left, right) =>
        normalizeText(left.id).localeCompare(normalizeText(right.id)))
      : undefined,
  };
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

function evaluationPassed(evaluation, expectedCaseCount) {
  return evaluation.status === 'passed' &&
    evaluation.metrics.casePassRate === 1 &&
    evaluation.caseResults.length === expectedCaseCount &&
    evaluation.caseResults.every((item) => item.status === 'passed');
}

export function buildLocalAnswerReviewActionGeneralization({
  model,
  observedAt,
  q4Baseline,
  q4Evaluation,
  q4Observations = [],
  q4Suite,
  q6Baseline,
  q6Evaluation,
  q6Observations = [],
  q6Suite,
  runtime,
} = {}) {
  assertLocalAnswerCompositionBoundaryRegression(q4Baseline);
  assertLocalUserQueryQuality(q6Baseline);

  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedQ4Evaluation = normalizeEvaluation(q4Evaluation);
  const normalizedQ6Evaluation = normalizeEvaluation(q6Evaluation);
  const normalizedQ4Observations = q4Observations.map(normalizeObservation)
    .sort((left, right) => left.caseIdHash.localeCompare(right.caseIdHash));
  const normalizedQ6Observations = q6Observations.map(normalizeObservation)
    .sort((left, right) => left.caseIdHash.localeCompare(right.caseIdHash));
  const q4SuiteHash = hashRecord(canonicalizeSuite(q4Suite));
  const q6SuiteHash = hashRecord(canonicalizeSuite(q6Suite));
  const promptHashes = [...new Set([
    ...normalizedQ4Observations,
    ...normalizedQ6Observations,
  ].map((item) => item.promptHash))];

  const expectedQ4CaseIds = q4Baseline.evaluation.caseResults
    .map((item) => sha256(item.id))
    .sort();
  const expectedQ6CaseIds = q6Baseline.evaluation.caseResults
    .map((item) => item.idHash)
    .sort();
  const q4CaseIds = normalizedQ4Evaluation.caseResults.map((item) => item.idHash);
  const q6CaseIds = normalizedQ6Evaluation.caseResults.map((item) => item.idHash);
  const q4ObservationIds = normalizedQ4Observations.map((item) => item.caseIdHash);
  const q6ObservationIds = normalizedQ6Observations.map((item) => item.caseIdHash);

  if (
    q4Baseline.status !== 'boundary-regression-passed-governance-blocked' ||
    q4Baseline.candidateBoundaryRegressionValidated !== true ||
    q6Baseline.status !== 'local-user-query-quality-failed-keep-current' ||
    q6Baseline.localUserQueryEvaluationValidated !== false ||
    q6Baseline.observations.filter(
      (item) => item.failureKind === 'invalid-review-action',
    ).length !== 1 ||
    normalizedModel.id !== q4Baseline.model.id ||
    normalizedModel.digest !== q4Baseline.model.digest ||
    normalizedModel.sizeBytes !== q4Baseline.model.sizeBytes ||
    !recordsEqual(normalizedModel, q6Baseline.model) ||
    normalizedRuntime.version !== q4Baseline.runtime.version ||
    !recordsEqual(normalizedRuntime, q6Baseline.runtime) ||
    q4SuiteHash !== q4Baseline.suiteHash ||
    q6SuiteHash !== q6Baseline.suiteHash ||
    normalizedQ4Evaluation.thresholdsHash !==
      q4Baseline.evaluation.thresholdsHash ||
    normalizedQ6Evaluation.thresholdsHash !==
      q6Baseline.evaluation.thresholdsHash ||
    !recordsEqual(q4CaseIds, expectedQ4CaseIds) ||
    !recordsEqual(q6CaseIds, expectedQ6CaseIds) ||
    !recordsEqual(q4ObservationIds, expectedQ4CaseIds) ||
    !recordsEqual(q6ObservationIds, expectedQ6CaseIds) ||
    promptHashes.length !== 1 ||
    promptHashes[0] === q4Baseline.prompt.candidateHash ||
    promptHashes[0] === q6Baseline.prompt.hash
  ) {
    throw new Error(
      'Review action generalization must bind the Q4 and Q6 baselines, model, runtime, suites, thresholds, prompt, and observations.',
    );
  }

  const q4ClaimCounts = new Map(
    q4Baseline.observations.map((item) => [sha256(item.caseId), item.claimCount]),
  );
  const q6ClaimCounts = new Map(
    q6Baseline.suite.cases.map((item) => [item.idHash, item.evidenceItemCount]),
  );
  if (
    normalizedQ4Observations.some(
      (item) => item.generationStatus === 'passed' &&
        item.claimCount !== q4ClaimCounts.get(item.caseIdHash),
    ) ||
    normalizedQ6Observations.some(
      (item) => item.generationStatus === 'passed' &&
        item.claimCount !== q6ClaimCounts.get(item.caseIdHash),
    )
  ) {
    throw new Error(
      'Review action generalization observations must preserve source coverage counts.',
    );
  }

  const q4RegressionFree = recordsEqual(
    {
      caseResults: q4Evaluation.caseResults,
      metrics: q4Evaluation.metrics,
      status: q4Evaluation.status,
      thresholdsHash: q4Evaluation.thresholdsHash,
    },
    {
      caseResults: q4Baseline.evaluation.caseResults,
      metrics: q4Baseline.evaluation.metrics,
      status: q4Baseline.evaluation.status,
      thresholdsHash: q4Baseline.evaluation.thresholdsHash,
    },
  );
  const q6QualityPassed = evaluationPassed(normalizedQ6Evaluation, 12);
  const allObservations = [
    ...normalizedQ4Observations,
    ...normalizedQ6Observations,
  ];
  const checks = [
    check('q4-boundary-regression-baseline-passed', true),
    check('q6-review-action-stop-condition-recorded', true),
    check('same-model-digest-bound', true),
    check('same-runtime-version-bound', true),
    check('same-suites-and-thresholds-bound', true),
    check('review-action-prompt-changed', true),
    check('q4-quality-regression-free', q4RegressionFree),
    check('q6-synthetic-quality-passed', q6QualityPassed),
    check('all-generations-completed', allObservations.every(
      (item) => item.generationStatus === 'passed',
    )),
    check('complete-source-coverage', allObservations.every(
      (item) => item.sourceCoverageComplete,
    )),
    check('specific-review-actions-present', allObservations.every(
      (item) => item.reviewActionSpecific,
    )),
    check('evaluator-contract-terms-not-sent-to-model', true),
    ...GOVERNANCE_BLOCKERS.map((id) => check(id, false)),
  ];
  const qualityBlockerIds = checks
    .filter((item) => !item.passed && !GOVERNANCE_BLOCKERS.includes(item.id))
    .map((item) => item.id);
  const candidateValidated = qualityBlockerIds.length === 0;
  const content = {
    activation: {
      authorized: false,
      blockerCheckIds: candidateValidated
        ? ['actual-user-query-evaluation-required', ...GOVERNANCE_BLOCKERS]
        : [...qualityBlockerIds, ...GOVERNANCE_BLOCKERS],
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    actualUserQueryData: false,
    actualUserQueryQualityValidated: false,
    baselines: {
      q4: {
        evidenceHash: q4Baseline.evidenceHash,
        evaluationHash: q4Baseline.evaluation.evaluationHash,
        promptHash: q4Baseline.prompt.candidateHash,
        suiteHash: q4Baseline.suiteHash,
      },
      q6: {
        evidenceHash: q6Baseline.evidenceHash,
        evaluationHash: q6Baseline.evaluation.evaluationHash,
        intakeEvidenceHash: q6Baseline.intake.evidenceHash,
        promptHash: q6Baseline.prompt.hash,
        suiteHash: q6Baseline.suiteHash,
      },
    },
    broadPromptInjectionResistanceValidated: false,
    candidate: {
      q4: {
        caseCount: normalizedQ4Evaluation.caseResults.length,
        evaluation: normalizedQ4Evaluation,
        observations: normalizedQ4Observations,
      },
      q6: {
        caseCount: normalizedQ6Evaluation.caseResults.length,
        evaluation: normalizedQ6Evaluation,
        observations: normalizedQ6Observations,
      },
    },
    checks,
    contentRetention: 'hashes-and-metrics-only',
    costFree: true,
    currentAnswerPathChanged: false,
    decision: candidateValidated
      ? 'hold-for-actual-user-query-evaluation'
      : 'keep-current-answer-path',
    evaluatorContractTermsSentToModel: false,
    externalProviderCalls: 'none',
    generalAnswerQualityImprovementValidated: false,
    localUserQueryEvaluationValidated: candidateValidated,
    model: normalizedModel,
    observedAt: requireTimestamp(observedAt),
    productionReadyClaim: false,
    prompt: {
      baselineHash: q6Baseline.prompt.hash,
      candidateHash: promptHashes[0],
      candidateVersion: REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
      changed: true,
    },
    reviewActionGeneralizationValidated: candidateValidated,
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_ANSWER_REVIEW_ACTION_GENERALIZATION_SCHEMA_VERSION,
    status: candidateValidated
      ? 'review-action-generalization-passed-actual-evaluation-required'
      : 'review-action-generalization-failed-keep-current',
    syntheticUserQueryQualityValidated: candidateValidated,
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-review-action-generalization-${evidenceHash}`,
  };
}

export function assertLocalAnswerReviewActionGeneralization(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const qualityPassed = Array.isArray(content.checks) &&
    content.checks
      .filter((item) => !GOVERNANCE_BLOCKERS.includes(item.id))
      .every((item) => item.passed === true && item.status === 'passed');
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-review-action-generalization-${expectedHash}` ||
    content.schemaVersion !==
      LOCAL_ANSWER_REVIEW_ACTION_GENERALIZATION_SCHEMA_VERSION ||
    content.reviewActionGeneralizationValidated !== qualityPassed ||
    content.localUserQueryEvaluationValidated !== qualityPassed ||
    content.syntheticUserQueryQualityValidated !== qualityPassed ||
    content.actualUserQueryData !== false ||
    content.actualUserQueryQualityValidated !== false ||
    content.actualModelTrainingExecuted !== false ||
    content.generalAnswerQualityImprovementValidated !== false ||
    content.broadPromptInjectionResistanceValidated !== false ||
    content.evaluatorContractTermsSentToModel !== false ||
    content.currentAnswerPathChanged !== false ||
    content.externalProviderCalls !== 'none' ||
    content.rolloutAuthorized !== false ||
    content.activation?.authorized !== false ||
    content.productionReadyClaim !== false ||
    content.prompt?.candidateVersion !==
      REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION ||
    content.prompt?.changed !== true ||
    content.prompt?.candidateHash === content.prompt?.baselineHash ||
    content.status !== (qualityPassed
      ? 'review-action-generalization-passed-actual-evaluation-required'
      : 'review-action-generalization-failed-keep-current') ||
    content.decision !== (qualityPassed
      ? 'hold-for-actual-user-query-evaluation'
      : 'keep-current-answer-path')
  ) {
    throw new Error('Review action generalization failed integrity validation.');
  }
  normalizeModel(content.model);
  normalizeRuntime(content.runtime);
  requireTimestamp(content.observedAt);
  for (const scope of ['q4', 'q6']) {
    const candidate = content.candidate?.[scope];
    const evaluation = normalizeEvaluation(candidate?.evaluation);
    const observations = candidate?.observations?.map(normalizeObservation) || [];
    if (
      candidate?.caseCount !== evaluation.caseResults.length ||
      observations.length !== candidate.caseCount ||
      !recordsEqual(
        observations.map((item) => item.caseIdHash).sort(),
        evaluation.caseResults.map((item) => item.idHash).sort(),
      ) ||
      observations.some(
        (item) => item.promptHash !== content.prompt.candidateHash,
      )
    ) {
      throw new Error(
        'Review action generalization failed candidate semantic validation.',
      );
    }
  }
  return evidence;
}
