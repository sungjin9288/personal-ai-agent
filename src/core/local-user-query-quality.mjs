import { createHash } from 'node:crypto';

import { ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION } from './answer-quality-evaluation.mjs';
import { assertLocalAnswerCompositionBoundaryRegression } from './local-answer-composition-boundary-regression.mjs';
import {
  ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION,
  REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
} from './ollama-answer-generator.mjs';
import { assertUserQueryEvaluationIntake } from './user-query-evaluation-intake.mjs';

export const LOCAL_USER_QUERY_QUALITY_SCHEMA_VERSION =
  'personal-ai-agent-local-user-query-quality/v1';
export const LOCAL_USER_QUERY_QUALITY_THRESHOLDS = Object.freeze({
  maximumForbiddenRetrievedSourceCount: 0,
  maximumForbiddenTermMatches: 0,
  maximumUnsupportedCitationRate: 0,
  minimumCasePassRate: 1,
  minimumCitationGroundingRate: 1,
  minimumExpectedSourceCitationRate: 1,
  minimumRequiredTermCoverage: 1,
  minimumRetrievalHitRate: 1,
  requireReviewerPass: false,
});

const REQUIRED_DOMAINS = Object.freeze([
  'accessibility',
  'data-governance',
  'incident-operations',
  'research',
  'security',
  'software-engineering',
]);
const REQUIRED_LANGUAGES = Object.freeze(['en', 'es', 'ja', 'ko']);
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
const GOVERNANCE_BLOCKERS = Object.freeze([
  'license-review-approved',
  'os-egress-isolation-approved',
  'resource-envelope-approved',
  'rollback-owner-assigned',
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

function recordsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function thresholdsEqual(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const expectedKeys = Object.keys(LOCAL_USER_QUERY_QUALITY_THRESHOLDS).sort();
  const actualKeys = Object.keys(value).sort();
  return recordsEqual(actualKeys, expectedKeys) && expectedKeys.every(
    (key) => value[key] === LOCAL_USER_QUERY_QUALITY_THRESHOLDS[key],
  );
}

export function assertLocalUserQueryQualityThresholds(value) {
  if (!thresholdsEqual(value)) {
    throw new Error('Local user query quality thresholds must remain frozen.');
  }
  return value;
}

function requireTimestamp(value) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error('Local user query quality observedAt must be a valid timestamp.');
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
    throw new Error(`Local user query quality ${fieldName} must be positive.`);
  }
  return normalized;
}

function normalizeMetrics(
  metrics = {},
  { allowNullRates = false, includeCasePassRate = false } = {},
) {
  const normalized = {};
  for (const name of RATE_METRICS) {
    if (!includeCasePassRate && name === 'casePassRate') {
      continue;
    }
    if (allowNullRates && metrics[name] === null) {
      normalized[name] = null;
      continue;
    }
    const value = Number(metrics[name]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Local user query quality ${name} must be between 0 and 1.`);
    }
    normalized[name] = value;
  }
  for (const name of COUNT_METRICS) {
    const value = Number(metrics[name]);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Local user query quality ${name} must be a non-negative integer.`);
    }
    normalized[name] = value;
  }
  return normalized;
}

function normalizeSuite(suite = {}) {
  const cases = Array.isArray(suite.cases)
    ? suite.cases.map((item) => ({
      domain: normalizeText(item?.domain),
      evidenceHash: normalizeText(item?.evidenceHash),
      evidenceItemCount: requirePositiveNumber(
        item?.evidenceItemCount,
        'suite evidenceItemCount',
        { integer: true },
      ),
      expectedAnswerContractHash: normalizeText(item?.expectedAnswerContractHash),
      idHash: normalizeText(item?.idHash),
      language: normalizeText(item?.language),
      queryHash: normalizeText(item?.queryHash),
    })).sort((left, right) => left.idHash.localeCompare(right.idHash))
    : [];
  const domains = [...new Set(cases.map((item) => item.domain))].sort();
  const languages = [...new Set(cases.map((item) => item.language))].sort();
  if (
    typeof suite.actualUserQueryData !== 'boolean' ||
    !isSha256(suite.datasetIdHash) ||
    !isSha256(suite.intakeEvidenceHash) ||
    !thresholdsEqual(suite.thresholds) ||
    cases.length < 12 ||
    new Set(cases.map((item) => item.idHash)).size !== cases.length ||
    cases.some((item) =>
      !REQUIRED_DOMAINS.includes(item.domain) ||
      !REQUIRED_LANGUAGES.includes(item.language) ||
      !isSha256(item.idHash) ||
      !isSha256(item.queryHash) ||
      !isSha256(item.evidenceHash) ||
      !isSha256(item.expectedAnswerContractHash)) ||
    !recordsEqual(domains, REQUIRED_DOMAINS) ||
    !recordsEqual(languages, REQUIRED_LANGUAGES)
  ) {
    throw new Error('Local user query quality suite is incomplete.');
  }
  return {
    actualUserQueryData: suite.actualUserQueryData,
    cases,
    datasetIdHash: normalizeText(suite.datasetIdHash),
    intakeEvidenceHash: normalizeText(suite.intakeEvidenceHash),
    thresholds: { ...LOCAL_USER_QUERY_QUALITY_THRESHOLDS },
  };
}

function normalizeCaseResult(result = {}) {
  const failureCheckIds = Array.isArray(result.failureCheckIds)
    ? [...new Set(result.failureCheckIds.map(normalizeText).filter(Boolean))].sort()
    : [];
  const normalized = {
    failureCheckIds,
    idHash: normalizeText(result.idHash),
    metrics: normalizeMetrics(result.metrics, { allowNullRates: true }),
    status: normalizeText(result.status),
  };
  if (
    !isSha256(normalized.idHash) ||
    !['failed', 'passed'].includes(normalized.status) ||
    (normalized.status === 'passed' && normalized.failureCheckIds.length > 0)
  ) {
    throw new Error('Local user query quality case result is incomplete.');
  }
  return normalized;
}

function normalizeBreakdown(items, expectedIds, fieldName) {
  const normalized = Array.isArray(items)
    ? items.map((item) => ({
      caseCount: requirePositiveNumber(item?.caseCount, `${fieldName} caseCount`, {
        integer: true,
      }),
      id: normalizeText(item?.id),
      metrics: normalizeMetrics(item?.metrics, { includeCasePassRate: true }),
      status: normalizeText(item?.status),
    })).sort((left, right) => left.id.localeCompare(right.id))
    : [];
  if (
    !recordsEqual(normalized.map((item) => item.id), expectedIds) ||
    normalized.some((item) => !['failed', 'passed'].includes(item.status))
  ) {
    throw new Error(`Local user query quality ${fieldName} breakdown is incomplete.`);
  }
  return normalized;
}

function normalizeEvaluation(evaluation = {}) {
  const caseResults = Array.isArray(evaluation.caseResults)
    ? evaluation.caseResults.map(normalizeCaseResult)
      .sort((left, right) => left.idHash.localeCompare(right.idHash))
    : [];
  const status = normalizeText(evaluation.status);
  if (
    !isSha256(evaluation.evaluationHash) ||
    !isSha256(evaluation.thresholdsHash) ||
    !['failed', 'passed'].includes(status) ||
    caseResults.length < 12 ||
    new Set(caseResults.map((item) => item.idHash)).size !== caseResults.length ||
    (status === 'passed' && caseResults.some((item) => item.status !== 'passed'))
  ) {
    throw new Error('Local user query quality evaluation summary is incomplete.');
  }
  return {
    aggregation: 'macro-case-average',
    caseResults,
    domainBreakdown: normalizeBreakdown(
      evaluation.domainBreakdown,
      REQUIRED_DOMAINS,
      'domain',
    ),
    evaluationHash: normalizeText(evaluation.evaluationHash),
    languageBreakdown: normalizeBreakdown(
      evaluation.languageBreakdown,
      REQUIRED_LANGUAGES,
      'language',
    ),
    metrics: normalizeMetrics(evaluation.metrics, { includeCasePassRate: true }),
    status,
    thresholdsHash: normalizeText(evaluation.thresholdsHash),
  };
}

function normalizeObservation(
  observation = {},
  expectedPromptVersion = ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION,
) {
  const citedSourceKeyHashes = Array.isArray(observation.citedSourceKeyHashes)
    ? [...new Set(observation.citedSourceKeyHashes.map(normalizeText).filter(Boolean))].sort()
    : Array.isArray(observation.citedSourceKeys)
      ? [...new Set(observation.citedSourceKeys.map((key) => sha256(normalizeText(key))))].sort()
      : [];
  const normalizationKinds = Array.isArray(observation.sanitization?.normalizationKinds)
    ? [...new Set(
      observation.sanitization.normalizationKinds.map(normalizeText).filter(Boolean),
    )].sort()
    : [];
  const normalized = {
    caseIdHash: normalizeText(observation.caseIdHash),
    citedSourceKeyHashes,
    claimCount: Number(observation.claimCount),
    durationMs: requirePositiveNumber(observation.durationMs, 'observation durationMs'),
    failureKind: observation.failureKind === null
      ? null
      : normalizeText(observation.failureKind),
    generationStatus: normalizeText(observation.generationStatus),
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
  const generationPassed = normalized.generationStatus === 'passed';
  if (
    !isSha256(normalized.caseIdHash) ||
    normalized.citedSourceKeyHashes.some((hash) => !isSha256(hash)) ||
    !Number.isInteger(normalized.claimCount) ||
    normalized.claimCount < 0 ||
    !['failed', 'passed'].includes(normalized.generationStatus) ||
    (generationPassed && normalized.failureKind !== null) ||
    (!generationPassed && !GENERATION_FAILURE_KINDS.includes(normalized.failureKind)) ||
    !Number.isInteger(normalized.identifierRestorationCount) ||
    normalized.identifierRestorationCount < 0 ||
    !isSha256(normalized.inputHash) ||
    normalized.maxOutputTokens > 2_048 ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== expectedPromptVersion ||
    !isSha256(normalized.rawInputHash) ||
    !isSha256(normalized.responseHash) ||
    !Number.isInteger(normalized.outputBytes) ||
    normalized.outputBytes < 0 ||
    (generationPassed && (
      normalized.citedSourceKeyHashes.length === 0 ||
      normalized.claimCount <= 0 ||
      normalized.outputBytes <= 0 ||
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
    )) ||
    counts.some((count) => !Number.isInteger(count) || count < 0) ||
    normalized.sanitization.instructionRemovalCount !==
      normalized.sanitization.evidenceInstructionRemovalCount +
        normalized.sanitization.objectiveInstructionRemovalCount ||
    normalized.sanitization.applied !==
      (normalized.sanitization.instructionRemovalCount > 0) ||
    normalized.sanitization.normalizationApplied !==
      (normalized.sanitization.normalizationKinds.length > 0)
  ) {
    throw new Error('Local user query quality observation is incomplete.');
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
    throw new Error('Local user query quality model evidence is incomplete.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    normalizeText(runtime.endpointAlias) !== 'loopback-ollama' ||
    runtime.transportLoopback !== true ||
    runtime.cloudFeaturesDisabled !== true
  ) {
    throw new Error('Local user query quality requires cloud-disabled loopback Ollama.');
  }
  return {
    cloudFeaturesDisabled: true,
    endpointAlias: 'loopback-ollama',
    externalProviderCalls: 'none',
    kind: 'ollama',
    transportLoopback: true,
    version: normalizeText(runtime.version),
  };
}

function average(values) {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function buildBreakdown(caseResults, suiteCases, fieldName, ids) {
  const resultById = new Map(caseResults.map((result) => [result.idHash, result]));
  return ids.map((id) => {
    const results = suiteCases
      .filter((item) => item[fieldName] === id)
      .map((item) => resultById.get(item.idHash));
    const metrics = {};
    for (const name of RATE_METRICS) {
      if (name === 'casePassRate') {
        metrics[name] = average(results.map((result) => result.status === 'passed' ? 1 : 0));
      } else {
        metrics[name] = average(results.map((result) => result.metrics[name] ?? 0));
      }
    }
    for (const name of COUNT_METRICS) {
      metrics[name] = results.reduce((sum, result) => sum + result.metrics[name], 0);
    }
    return {
      caseCount: results.length,
      id,
      metrics,
      status: results.every((result) => result.status === 'passed') ? 'passed' : 'failed',
    };
  });
}

export function summarizeLocalUserQueryEvaluation({ evaluation, suite } = {}) {
  if (
    evaluation?.schemaVersion !== ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !Array.isArray(evaluation.cases) ||
    !evaluation.summary?.metrics ||
    !evaluation.thresholds
  ) {
    throw new Error('Local user query quality requires answer-quality evaluation evidence.');
  }
  const normalizedSuite = normalizeSuite(suite);
  assertLocalUserQueryQualityThresholds(evaluation.thresholds);
  const suiteIds = normalizedSuite.cases.map((item) => item.idHash);
  const caseResults = evaluation.cases.map((result) => ({
    failureCheckIds: result.failures.map((failure) => normalizeText(failure.check)),
    idHash: normalizeText(result.id),
    metrics: normalizeMetrics(result.metrics),
    status: normalizeText(result.status),
  })).sort((left, right) => left.idHash.localeCompare(right.idHash));
  if (!recordsEqual(caseResults.map((item) => item.idHash), suiteIds)) {
    throw new Error('Local user query evaluation cases do not match the intake suite.');
  }
  return normalizeEvaluation({
    caseResults,
    domainBreakdown: buildBreakdown(
      caseResults,
      normalizedSuite.cases,
      'domain',
      REQUIRED_DOMAINS,
    ),
    evaluationHash: hashRecord(evaluation),
    languageBreakdown: buildBreakdown(
      caseResults,
      normalizedSuite.cases,
      'language',
      REQUIRED_LANGUAGES,
    ),
    metrics: evaluation.summary.metrics,
    status: evaluation.status,
    thresholdsHash: hashRecord(evaluation.thresholds),
  });
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

function resolveBaseline(baseline, actualUserQueryData) {
  if (!actualUserQueryData) {
    assertLocalAnswerCompositionBoundaryRegression(baseline);
    return {
      checkId: 'q4-boundary-regression-baseline-passed',
      evidence: {
        evidenceHash: baseline.evidenceHash,
        evaluationHash: baseline.evaluation.evaluationHash,
        promptHash: baseline.prompt.candidateHash,
      },
      model: baseline.model,
      promptHash: baseline.prompt.candidateHash,
      promptVersion: ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION,
      runtime: baseline.runtime,
      validated: baseline.candidateBoundaryRegressionValidated === true,
    };
  }

  const {
    evidenceHash,
    id,
    ...content
  } = baseline || {};
  const expectedHash = hashRecord(content);
  const q4 = content.candidate?.q4;
  const q6 = content.candidate?.q6;
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-review-action-generalization-${expectedHash}` ||
    content.schemaVersion !==
      'personal-ai-agent-local-answer-review-action-generalization/v1' ||
    content.reviewActionGeneralizationValidated !== true ||
    content.actualUserQueryData !== false ||
    content.currentAnswerPathChanged !== false ||
    content.activation?.authorized !== false ||
    content.productionReadyClaim !== false ||
    content.prompt?.candidateVersion !==
      REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION ||
    !isSha256(content.prompt?.candidateHash) ||
    q4?.caseCount !== 10 ||
    q4?.evaluation?.status !== 'passed' ||
    q4?.evaluation?.metrics?.casePassRate !== 1 ||
    q6?.caseCount !== 12 ||
    q6?.evaluation?.status !== 'passed' ||
    q6?.evaluation?.metrics?.casePassRate !== 1 ||
    q6?.evaluation?.thresholdsHash !==
      hashRecord(LOCAL_USER_QUERY_QUALITY_THRESHOLDS)
  ) {
    throw new Error(
      'Actual user query quality requires the validated Q7 review-action baseline.',
    );
  }
  return {
    checkId: 'q7-review-action-generalization-baseline-passed',
    evidence: {
      evidenceHash,
      evaluationHash: q6.evaluation.evaluationHash,
      kind: 'review-action-generalization-v5',
      promptHash: content.prompt.candidateHash,
    },
    model: content.model,
    promptHash: content.prompt.candidateHash,
    promptVersion: REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
    runtime: content.runtime,
    validated: true,
  };
}

export function buildLocalUserQueryQuality({
  baseline,
  evaluation,
  intake,
  model,
  observations = [],
  observedAt,
  runtime,
  suite,
} = {}) {
  assertUserQueryEvaluationIntake(intake);
  const baselineContract = resolveBaseline(
    baseline,
    intake.actualUserQueryData === true,
  );
  const normalizedObservedAt = requireTimestamp(observedAt);
  const normalizedEvaluation = normalizeEvaluation(evaluation);
  const normalizedSuite = normalizeSuite(suite);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedObservations = observations.map((observation) =>
    normalizeObservation(observation, baselineContract.promptVersion))
    .sort((left, right) => left.caseIdHash.localeCompare(right.caseIdHash));
  const intakeRecords = new Map(intake.records.map((record) => [record.idHash, record]));
  const suiteCaseIds = normalizedSuite.cases.map((item) => item.idHash);
  const evaluationCaseIds = normalizedEvaluation.caseResults.map((item) => item.idHash);
  const observationCaseIds = normalizedObservations.map((item) => item.caseIdHash);
  const promptHashes = [...new Set(
    normalizedObservations.map((item) => item.promptHash),
  )];

  if (
    baselineContract.validated !== true ||
    intake.usage.localModelInputAuthorized !== true ||
    intake.usage.externalTransferAuthorized !== false ||
    intake.usage.trainingAuthorized !== false ||
    Date.parse(intake.usage.retentionUntil) <= Date.parse(normalizedObservedAt) ||
    (intake.actualUserQueryData &&
      Date.parse(intake.consent.expiresAt) <= Date.parse(normalizedObservedAt)) ||
    normalizedSuite.actualUserQueryData !== intake.actualUserQueryData ||
    normalizedSuite.datasetIdHash !== intake.datasetIdHash ||
    normalizedSuite.intakeEvidenceHash !== intake.evidenceHash ||
    normalizedSuite.cases.some((item) => {
      const record = intakeRecords.get(item.idHash);
      return !record ||
        item.queryHash !== record.queryHash ||
        item.evidenceHash !== record.evidenceHash ||
        item.expectedAnswerContractHash !== record.expectedAnswerContractHash ||
        item.evidenceItemCount !== record.evidenceItemCount ||
        item.domain !== record.domain ||
        item.language !== record.language;
    }) ||
    !recordsEqual(evaluationCaseIds, suiteCaseIds) ||
    !recordsEqual(observationCaseIds, suiteCaseIds) ||
    normalizedModel.id !== baselineContract.model.id ||
    normalizedModel.digest !== baselineContract.model.digest ||
    normalizedModel.sizeBytes !== baselineContract.model.sizeBytes ||
    normalizedRuntime.version !== baselineContract.runtime.version ||
    normalizedEvaluation.thresholdsHash !== hashRecord(normalizedSuite.thresholds) ||
    promptHashes.length !== 1 ||
    promptHashes[0] !== baselineContract.promptHash ||
    normalizedObservations.some((observation) => {
      const definition = normalizedSuite.cases.find(
        (item) => item.idHash === observation.caseIdHash,
      );
      const expectedSourceKeyHashes = Array.from(
        { length: definition.evidenceItemCount },
        (_unused, index) =>
          sha256(`user-query-evidence:${definition.idHash}:${index + 1}`),
      ).sort();
      return observation.generationStatus === 'passed'
        ? observation.claimCount !== definition.evidenceItemCount ||
          !recordsEqual(observation.citedSourceKeyHashes, expectedSourceKeyHashes)
        : observation.claimCount !== 0 ||
          observation.citedSourceKeyHashes.length !== 0;
    })
  ) {
    throw new Error(
      'Local user query quality must bind the Q4 baseline, Q5 intake, model, runtime, prompt, suite, and observations.',
    );
  }

  const qualityPassed = normalizedEvaluation.status === 'passed';
  const actualUserQueryQualityValidated =
    intake.actualUserQueryData && qualityPassed;
  const syntheticUserQueryQualityValidated =
    !intake.actualUserQueryData && qualityPassed;
  const checks = [
    check(baselineContract.checkId, baselineContract.validated),
    check('q5-intake-integrity-validated', normalizedSuite.intakeEvidenceHash === intake.evidenceHash),
    check('local-model-input-authorized', intake.usage.localModelInputAuthorized),
    check('external-transfer-denied', !intake.usage.externalTransferAuthorized),
    check('training-use-denied', !intake.usage.trainingAuthorized),
    check(
      'same-model-digest-bound',
      normalizedModel.digest === baselineContract.model.digest,
    ),
    check(
      'same-runtime-version-bound',
      normalizedRuntime.version === baselineContract.runtime.version,
    ),
    check('same-prompt-bound', promptHashes[0] === baselineContract.promptHash),
    check('all-intake-cases-observed', observationCaseIds.length === suiteCaseIds.length),
    check('all-generations-completed', normalizedObservations.every(
      (item) => item.generationStatus === 'passed',
    )),
    check('complete-source-coverage', normalizedObservations.every(
      (item) => item.sourceCoverageComplete,
    )),
    check('answer-quality-thresholds-passed', qualityPassed),
  ];
  const qualityBlockerIds = checks.filter((item) => !item.passed).map((item) => item.id);
  const activationBlockers = qualityPassed
    ? [
      ...(intake.actualUserQueryData ? [] : ['actual-user-query-evaluation-required']),
      ...GOVERNANCE_BLOCKERS,
    ]
    : [...qualityBlockerIds, ...GOVERNANCE_BLOCKERS];
  const content = {
    activation: {
      authorized: false,
      blockerCheckIds: activationBlockers,
    },
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    actualUserQueryData: intake.actualUserQueryData,
    actualUserQueryQualityValidated,
    baseline: baselineContract.evidence,
    checks,
    contentRetention: 'hashes-and-metrics-only',
    costFree: true,
    currentAnswerPathChanged: false,
    decision: qualityPassed
      ? intake.actualUserQueryData
        ? 'hold-for-governance'
        : 'hold-for-actual-user-query-evaluation'
      : 'keep-current-answer-path',
    evaluation: normalizedEvaluation,
    evaluatorContractTermsSentToModel: false,
    externalProviderCalls: 'none',
    generalAnswerQualityImprovementValidated: false,
    intake: {
      dataClassification: intake.dataClassification,
      datasetIdHash: intake.datasetIdHash,
      evidenceHash: intake.evidenceHash,
    },
    localUserQueryEvaluationValidated: qualityPassed,
    model: normalizedModel,
    observations: normalizedObservations,
    observedAt: normalizedObservedAt,
    productionReadyClaim: false,
    prompt: {
      hash: promptHashes[0],
      version: baselineContract.promptVersion,
    },
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_USER_QUERY_QUALITY_SCHEMA_VERSION,
    status: qualityPassed
      ? intake.actualUserQueryData
        ? 'actual-user-query-quality-passed-governance-blocked'
        : 'synthetic-user-query-quality-passed-actual-evaluation-required'
      : 'local-user-query-quality-failed-keep-current',
    suite: normalizedSuite,
    suiteHash: hashRecord(normalizedSuite),
    syntheticUserQueryQualityValidated,
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-user-query-quality-${evidenceHash}`,
  };
}

export function assertLocalUserQueryQuality(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const qualityPassed = content?.evaluation?.status === 'passed';
  const expectedPromptVersion = content.actualUserQueryData === true
    ? REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION
    : ADVERSARIAL_HARDENED_ANSWER_PROMPT_VERSION;
  if (
    evidenceHash !== expectedHash ||
    id !== `local-user-query-quality-${expectedHash}` ||
    content.schemaVersion !== LOCAL_USER_QUERY_QUALITY_SCHEMA_VERSION ||
    content.productionReadyClaim !== false ||
    content.currentAnswerPathChanged !== false ||
    content.actualModelTrainingExecuted !== false ||
    content.generalAnswerQualityImprovementValidated !== false ||
    content.evaluatorContractTermsSentToModel !== false ||
    content.externalProviderCalls !== 'none' ||
    content.rolloutAuthorized !== false ||
    content.activation?.authorized !== false ||
    content.localUserQueryEvaluationValidated !== qualityPassed ||
    content.actualUserQueryQualityValidated !==
      (content.actualUserQueryData === true && qualityPassed) ||
    content.syntheticUserQueryQualityValidated !==
      (content.actualUserQueryData === false && qualityPassed) ||
    content.suiteHash !== hashRecord(content.suite) ||
    content.suite?.actualUserQueryData !== content.actualUserQueryData ||
    content.suite?.intakeEvidenceHash !== content.intake?.evidenceHash ||
    content.prompt?.version !== expectedPromptVersion ||
    content.prompt?.hash !== content.baseline?.promptHash ||
    (content.actualUserQueryData === true &&
      content.baseline?.kind !== 'review-action-generalization-v5') ||
    (content.actualUserQueryData === false &&
      content.baseline?.kind !== undefined) ||
    !Array.isArray(content.checks) ||
    content.checks.some((item) =>
      !normalizeText(item?.id) ||
      item.passed !== (item.status === 'passed'))
  ) {
    throw new Error('Local user query quality failed integrity validation.');
  }
  normalizeEvaluation(content.evaluation);
  normalizeSuite(content.suite);
  normalizeModel(content.model);
  normalizeRuntime(content.runtime);
  requireTimestamp(content.observedAt);
  content.observations.map((observation) =>
    normalizeObservation(observation, expectedPromptVersion));
  return evidence;
}
