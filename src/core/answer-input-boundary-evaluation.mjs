import { createHash } from 'node:crypto';

import { sanitizeUntrustedInstructions } from './untrusted-instruction-boundary.mjs';

export const ANSWER_INPUT_BOUNDARY_EVALUATION_SCHEMA_VERSION =
  'personal-ai-agent-answer-input-boundary-evaluation/v1';

const REQUIRED_LANGUAGES = Object.freeze(['en', 'es', 'ja', 'ko']);
const RATE_METRICS = Object.freeze([
  'attackDetectionRate',
  'factRetentionRate',
  'payloadRemovalRate',
  'safePreservationRate',
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

function requireTimestamp(value) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error('Answer input boundary observedAt must be a valid timestamp.');
  }
  return normalized;
}

function normalizeThresholds(thresholds = {}) {
  const normalized = {};
  for (const metric of RATE_METRICS) {
    const value = Number(thresholds[metric]);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Answer input boundary ${metric} threshold must be between 0 and 1.`);
    }
    normalized[metric] = value;
  }
  return normalized;
}

function normalizeFixture(fixture = {}) {
  const cases = Array.isArray(fixture.cases)
    ? fixture.cases.map((definition) => ({
      expectedRemovalCount: Number(definition?.expectedRemovalCount),
      id: normalizeText(definition?.id),
      input: normalizeText(definition?.input),
      kind: normalizeText(definition?.kind),
      language: normalizeText(definition?.language),
      removedTerms: Array.isArray(definition?.removedTerms)
        ? definition.removedTerms.map(normalizeText).filter(Boolean)
        : [],
      retainedTerms: Array.isArray(definition?.retainedTerms)
        ? definition.retainedTerms.map(normalizeText).filter(Boolean)
        : [],
    }))
    : [];
  const languages = [...new Set(cases.map((definition) => definition.language))].sort();
  const attackCount = cases.filter((definition) => definition.kind === 'attack').length;
  const safeCount = cases.filter((definition) => definition.kind === 'safe').length;
  if (
    fixture.schemaVersion !== 'personal-ai-agent-answer-input-boundary-fixture/v1' ||
    fixture.productionReadyClaim !== false ||
    fixture.actualUserQueryData !== false ||
    fixture.dataClassification !== 'curated-synthetic' ||
    cases.length < 12 ||
    attackCount < 6 ||
    safeCount < 6 ||
    new Set(cases.map((definition) => definition.id)).size !== cases.length ||
    JSON.stringify(languages) !== JSON.stringify(REQUIRED_LANGUAGES) ||
    cases.some((definition) =>
      !definition.id ||
      !definition.input ||
      !['attack', 'safe'].includes(definition.kind) ||
      !Number.isInteger(definition.expectedRemovalCount) ||
      definition.expectedRemovalCount < 0 ||
      definition.retainedTerms.length === 0 ||
      (definition.kind === 'attack' &&
        (definition.expectedRemovalCount === 0 || definition.removedTerms.length === 0)) ||
      (definition.kind === 'safe' &&
        (definition.expectedRemovalCount !== 0 || definition.removedTerms.length !== 0)))
  ) {
    throw new Error('Answer input boundary fixture is incomplete.');
  }
  return {
    cases,
    dataClassification: fixture.dataClassification,
    schemaVersion: fixture.schemaVersion,
    thresholds: normalizeThresholds(fixture.thresholds),
  };
}

function evaluateCase(definition) {
  const result = sanitizeUntrustedInstructions(definition.input);
  const attackDetected = definition.kind !== 'attack' ||
    result.removedCount === definition.expectedRemovalCount;
  const factsRetained = definition.retainedTerms.every((term) => result.text.includes(term));
  const payloadRemoved = definition.removedTerms.every((term) => !result.text.includes(term));
  const safePreserved = definition.kind !== 'safe' ||
    (result.removedCount === 0 && result.text === definition.input);
  const checks = {
    attackDetected,
    factsRetained,
    payloadRemoved,
    safePreserved,
  };
  const failureCheckIds = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([id]) => id)
    .sort();
  return {
    failureCheckIds,
    id: definition.id,
    inputHash: sha256(definition.input),
    kind: definition.kind,
    language: definition.language,
    normalizationKinds: result.normalization.kinds,
    outputHash: sha256(result.text),
    removedCount: result.removedCount,
    status: failureCheckIds.length === 0 ? 'passed' : 'failed',
  };
}

function rate(passed, total) {
  return total === 0 ? 0 : Number((passed / total).toFixed(6));
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

export function buildAnswerInputBoundaryEvaluation({
  fixture,
  fixtureHash,
  observedAt,
} = {}) {
  const normalizedFixture = normalizeFixture(fixture);
  if (!isSha256(fixtureHash)) {
    throw new Error('Answer input boundary fixtureHash must be SHA-256.');
  }
  const caseResults = normalizedFixture.cases.map(evaluateCase)
    .sort((left, right) => left.id.localeCompare(right.id));
  const attacks = caseResults.filter((result) => result.kind === 'attack');
  const safeControls = caseResults.filter((result) => result.kind === 'safe');
  const metrics = {
    attackDetectionRate: rate(
      attacks.filter((result) => !result.failureCheckIds.includes('attackDetected')).length,
      attacks.length,
    ),
    factRetentionRate: rate(
      caseResults.filter((result) => !result.failureCheckIds.includes('factsRetained')).length,
      caseResults.length,
    ),
    payloadRemovalRate: rate(
      attacks.filter((result) => !result.failureCheckIds.includes('payloadRemoved')).length,
      attacks.length,
    ),
    safePreservationRate: rate(
      safeControls.filter((result) => !result.failureCheckIds.includes('safePreserved')).length,
      safeControls.length,
    ),
  };
  const checks = [
    ...RATE_METRICS.map((metric) =>
      check(`${metric}-threshold`, metrics[metric] >= normalizedFixture.thresholds[metric])),
    check('all-cases-passed', caseResults.every((result) => result.status === 'passed')),
  ];
  const passed = checks.every((item) => item.passed);
  const content = {
    actualModelEvaluated: false,
    actualModelTrainingExecuted: false,
    actualUserQueryData: false,
    actualUserQueryQualityValidated: false,
    caseResults,
    checks,
    costFree: true,
    currentAnswerPathChanged: false,
    dataClassification: normalizedFixture.dataClassification,
    externalProviderCalls: 'none',
    fixtureHash: normalizeText(fixtureHash),
    metrics,
    observedAt: requireTimestamp(observedAt),
    productionReadyClaim: false,
    rolloutAuthorized: false,
    schemaVersion: ANSWER_INPUT_BOUNDARY_EVALUATION_SCHEMA_VERSION,
    status: passed
      ? 'boundary-fixture-passed-local-only'
      : 'boundary-fixture-failed-keep-current',
    thresholds: normalizedFixture.thresholds,
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `answer-input-boundary-evaluation-${evidenceHash}`,
  };
}

export function assertAnswerInputBoundaryEvaluation(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `answer-input-boundary-evaluation-${expectedHash}` ||
    content.schemaVersion !== ANSWER_INPUT_BOUNDARY_EVALUATION_SCHEMA_VERSION ||
    content.productionReadyClaim !== false ||
    content.actualUserQueryData !== false ||
    content.actualUserQueryQualityValidated !== false ||
    content.actualModelTrainingExecuted !== false ||
    content.currentAnswerPathChanged !== false ||
    content.externalProviderCalls !== 'none' ||
    !isSha256(content.fixtureHash) ||
    !Array.isArray(content.caseResults) ||
    content.caseResults.length < 12 ||
    !Array.isArray(content.checks) ||
    !content.metrics ||
    RATE_METRICS.some((metric) =>
      !Number.isFinite(content.metrics[metric]) ||
      content.metrics[metric] < 0 ||
      content.metrics[metric] > 1)
  ) {
    throw new Error('Answer input boundary evaluation failed integrity validation.');
  }
  return evidence;
}
