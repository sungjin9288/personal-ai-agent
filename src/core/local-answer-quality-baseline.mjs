import { createHash } from 'node:crypto';

import { CANDIDATE_MODEL_GATE_SCHEMA_VERSION } from './candidate-model-evaluation.mjs';
import { LOCAL_ANSWER_PROMPT_VERSION } from './ollama-answer-generator.mjs';

export const LOCAL_ANSWER_QUALITY_BASELINE_SCHEMA_VERSION =
  'personal-ai-agent-local-answer-quality-baseline/v1';

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
    throw new Error(`Local answer quality ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requirePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(`Local answer quality ${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`);
  }
  return normalized;
}

function normalizeModel(model = {}) {
  const normalized = {
    digest: normalizeText(model.digest),
    id: normalizeText(model.id),
    license: {
      textHash: normalizeText(model.license?.textHash),
      title: normalizeText(model.license?.title),
    },
    modifiedAt: requireTimestamp(model.modifiedAt, 'model modifiedAt'),
    sizeBytes: requirePositiveNumber(model.sizeBytes, 'model sizeBytes', { integer: true }),
  };
  if (
    !normalized.id ||
    normalized.id.length > 200 ||
    !isSha256(normalized.digest) ||
    !normalized.license.title ||
    normalized.license.title.length > 500 ||
    !isSha256(normalized.license.textHash)
  ) {
    throw new Error('Local answer quality requires bounded model and license evidence.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    !normalizeText(runtime.endpointAlias) ||
    runtime.transportLoopback !== true
  ) {
    throw new Error('Local answer quality requires a loopback Ollama runtime.');
  }
  return {
    cloudFeaturesDisabled: runtime.cloudFeaturesDisabled === true,
    endpointAlias: normalizeText(runtime.endpointAlias),
    externalProviderCalls: 'none',
    kind: 'ollama',
    transportLoopback: true,
    version: normalizeText(runtime.version),
  };
}

function normalizeSuite(suite = {}) {
  const caseIds = Array.isArray(suite.caseIds)
    ? [...new Set(suite.caseIds.map((id) => normalizeText(id)).filter(Boolean))].sort()
    : [];
  if (
    !normalizeText(suite.id) ||
    !isSha256(suite.fixtureHash) ||
    caseIds.length === 0 ||
    !suite.thresholds ||
    typeof suite.thresholds !== 'object'
  ) {
    throw new Error('Local answer quality suite identity, hash, cases, and thresholds are required.');
  }
  return {
    caseIds,
    fixtureHash: normalizeText(suite.fixtureHash),
    id: normalizeText(suite.id),
    thresholds: suite.thresholds,
  };
}

function normalizeObservation(observation = {}) {
  const normalized = {
    caseId: normalizeText(observation.caseId),
    citedSourceKeys: Array.isArray(observation.citedSourceKeys)
      ? [...new Set(observation.citedSourceKeys.map((key) => normalizeText(key)).filter(Boolean))].sort()
      : [],
    durationMs: requirePositiveNumber(observation.durationMs, 'observation durationMs'),
    inputHash: normalizeText(observation.inputHash),
    outputBytes: requirePositiveNumber(observation.outputBytes, 'observation outputBytes', { integer: true }),
    promptHash: normalizeText(observation.promptHash),
    promptVersion: normalizeText(observation.promptVersion),
    responseHash: normalizeText(observation.responseHash),
  };
  if (
    !normalized.caseId ||
    normalized.citedSourceKeys.length === 0 ||
    !isSha256(normalized.inputHash) ||
    !isSha256(normalized.promptHash) ||
    normalized.promptVersion !== LOCAL_ANSWER_PROMPT_VERSION ||
    !isSha256(normalized.responseHash)
  ) {
    throw new Error('Local answer quality observation is incomplete.');
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
    throw new Error('Local answer quality requires an intact recorded candidate gate.');
  }
  return candidateGate;
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

function buildContent({ candidateGate, model, observations, observedAt, runtime, suite }) {
  const normalizedGate = normalizeCandidateGate(candidateGate);
  const normalizedModel = normalizeModel(model);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedSuite = normalizeSuite(suite);
  const normalizedObservations = observations.map(normalizeObservation).sort((left, right) =>
    left.caseId.localeCompare(right.caseId));
  const observationCaseIds = normalizedObservations.map((observation) => observation.caseId);
  const candidateCaseIds = normalizedGate.candidate.evaluation.caseResults
    .map((result) => normalizeText(result.id))
    .sort();
  if (
    new Set(observationCaseIds).size !== observationCaseIds.length ||
    JSON.stringify(observationCaseIds) !== JSON.stringify(normalizedSuite.caseIds)
  ) {
    throw new Error('Local answer quality observations must match the suite cases exactly.');
  }
  if (
    normalizedGate.candidate.modelId !== normalizedModel.id ||
    normalizedGate.candidate.provider !== 'local-ollama' ||
    !normalizedGate.candidate.evidenceRefs.includes(`fixture:${normalizedSuite.fixtureHash}`) ||
    !normalizedGate.candidate.evidenceRefs.includes(`ollama-model:${normalizedModel.digest}`) ||
    JSON.stringify(candidateCaseIds) !== JSON.stringify(normalizedSuite.caseIds) ||
    hashRecord(normalizedGate.candidate.evaluation.thresholds) !== hashRecord(normalizedSuite.thresholds)
  ) {
    throw new Error('Local answer quality model and suite evidence must bind the candidate gate.');
  }

  const qualityPassed =
    normalizedGate.status === 'ready-for-review' &&
    normalizedGate.comparison?.status === 'passed';
  const checks = [
    check('actual-model-evaluated', normalizedGate.candidate.actualModelEvaluated),
    check('recorded-model-evaluation', normalizedGate.candidate.evaluationSource === 'recorded-model-evaluation'),
    check('suite-cases-observed', observationCaseIds.length === normalizedSuite.caseIds.length),
    check('response-hashes-bound', normalizedObservations.every((observation) => isSha256(observation.responseHash))),
    check('candidate-quality-passed', qualityPassed),
    check('loopback-transport', normalizedRuntime.transportLoopback),
    check('ollama-cloud-features-disabled', normalizedRuntime.cloudFeaturesDisabled),
    check('license-evidence-bound', isSha256(normalizedModel.license.textHash)),
    check('license-review-approved', false),
    check('os-egress-isolation-approved', false),
    check('resource-envelope-approved', false),
    check('rollback-owner-assigned', false),
  ];
  const governanceBlockerIds = checks
    .filter((item) => !item.passed && item.id !== 'candidate-quality-passed')
    .map((item) => item.id);

  return {
    activation: {
      authorized: false,
      blockerCheckIds: qualityPassed
        ? governanceBlockerIds
        : ['candidate-quality-passed', ...governanceBlockerIds],
    },
    actualLocalAnswerModelQualified: false,
    actualLocalAnswerModelQualityValidated: qualityPassed,
    actualModelEvaluated: true,
    actualModelTrainingExecuted: false,
    candidateGate: normalizedGate,
    checks,
    costFree: true,
    decision: qualityPassed ? 'hold-for-governance' : 'keep-current-answer-path',
    externalProviderCalls: 'none',
    model: normalizedModel,
    observations: normalizedObservations,
    observedAt: requireTimestamp(observedAt, 'observedAt'),
    productionReadyClaim: false,
    rolloutAuthorized: false,
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_ANSWER_QUALITY_BASELINE_SCHEMA_VERSION,
    status: qualityPassed
      ? 'quality-passed-governance-blocked'
      : 'quality-regressed-keep-current',
    suite: normalizedSuite,
  };
}

export function buildLocalAnswerQualityBaseline(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-answer-quality-baseline-${evidenceHash}`,
  };
}

export function assertLocalAnswerQualityBaseline(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `local-answer-quality-baseline-${expectedHash}`
  ) {
    throw new Error('Local answer quality baseline failed: integrity.');
  }
  const rebuilt = buildLocalAnswerQualityBaseline(content);
  if (rebuilt.evidenceHash !== evidenceHash) {
    throw new Error('Local answer quality baseline failed: semantic validation.');
  }
}
