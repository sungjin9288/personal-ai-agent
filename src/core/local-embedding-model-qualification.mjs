import { createHash } from 'node:crypto';

import { RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION } from './retrieval-quality-evaluation.mjs';

export const LOCAL_EMBEDDING_MODEL_QUALIFICATION_SCHEMA_VERSION =
  'personal-ai-agent-local-embedding-model-qualification/v1';

const REVIEW_STATUSES = new Set(['approved', 'pending', 'rejected']);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

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

function normalizePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(`${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`);
  }
  return normalized;
}

function normalizeSuite(suite = {}) {
  const caseIds = [...new Set(ensureArray(suite.caseIds).map((id) => normalizeText(id)).filter(Boolean))].sort();
  if (
    !normalizeText(suite.id) ||
    !isSha256(suite.fixtureHash) ||
    caseIds.length === 0 ||
    !suite.thresholds ||
    typeof suite.thresholds !== 'object'
  ) {
    throw new Error('Local embedding qualification suite identity, fixture hash, cases, and thresholds are required.');
  }
  return {
    caseIds,
    fixtureHash: suite.fixtureHash,
    id: normalizeText(suite.id),
    thresholds: suite.thresholds,
  };
}

function summarizeQualityEvaluation(evaluation, suite) {
  if (
    evaluation?.schemaVersion !== RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION ||
    !Array.isArray(evaluation?.cases) ||
    evaluation.cases.length === 0 ||
    !Array.isArray(evaluation?.failures) ||
    !evaluation?.metrics ||
    !evaluation?.thresholds ||
    evaluation?.productionReadyClaim !== false
  ) {
    throw new Error('Candidate must use the retrieval quality evaluation contract.');
  }
  const caseResults = evaluation.cases
    .map((result) => ({
      id: normalizeText(result.id),
      metrics: result.metrics,
      missingExpectedSourceKeys: ensureArray(result.evidence?.missingExpectedSourceKeys),
      retrievedIrrelevantSourceKeys: ensureArray(result.evidence?.retrievedIrrelevantSourceKeys),
      selectedSourceKeys: ensureArray(result.evidence?.selectedSourceKeys),
      status: normalizeText(result.status),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const suiteBound =
    JSON.stringify(caseResults.map((result) => result.id)) === JSON.stringify(suite.caseIds) &&
    JSON.stringify(evaluation.thresholds) === JSON.stringify(suite.thresholds);
  const content = {
    algorithmId: normalizeText(evaluation.algorithmId),
    caseResults,
    failures: evaluation.failures,
    metrics: evaluation.metrics,
    productionReadyClaim: false,
    schemaVersion: evaluation.schemaVersion,
    status: normalizeText(evaluation.status),
    suiteBound,
    thresholds: evaluation.thresholds,
  };
  const evaluationHash = hashRecord(content);
  return {
    ...content,
    evaluationHash,
  };
}

function normalizeCandidate(candidate, suite) {
  const quality = summarizeQualityEvaluation(candidate.qualityEvaluation, suite);
  const actualModelEvaluated = candidate.actualModelEvaluated === true;
  const modelId = normalizeText(candidate.modelId);
  const modelDigest = normalizeText(candidate.modelDigest);
  const licenseTitle = normalizeText(candidate.license?.title) || null;
  const licenseTextHash = normalizeText(candidate.license?.textHash) || null;
  if (
    !actualModelEvaluated ||
    !modelId ||
    !isSha256(modelDigest) ||
    !isValidTimestamp(candidate.modelModifiedAt)
  ) {
    throw new Error('Candidate requires actual local model identity, digest, and modified timestamp.');
  }
  if (licenseTextHash && !isSha256(licenseTextHash)) {
    throw new Error('Candidate license text hash must be SHA-256 when present.');
  }
  const content = {
    actualModelEvaluated,
    dimensions: normalizePositiveNumber(candidate.dimensions, 'dimensions', { integer: true }),
    durationMs: normalizePositiveNumber(candidate.durationMs, 'durationMs'),
    license: {
      evidenceSource: normalizeText(candidate.license?.evidenceSource) || null,
      textHash: licenseTextHash,
      title: licenseTitle,
    },
    modelDigest,
    modelFamily: normalizeText(candidate.modelFamily) || null,
    modelFormat: normalizeText(candidate.modelFormat) || null,
    modelId,
    modelModifiedAt: normalizeText(candidate.modelModifiedAt),
    modelSizeBytes: normalizePositiveNumber(candidate.modelSizeBytes, 'modelSizeBytes', { integer: true }),
    parameterSize: normalizeText(candidate.parameterSize) || null,
    quality,
    qualityPassed:
      quality.suiteBound &&
      quality.status === 'passed' &&
      quality.failures.length === 0 &&
      quality.caseResults.every((result) => result.status === 'passed'),
    quantization: normalizeText(candidate.quantization) || null,
    source: normalizeText(candidate.source, 'local-runtime-observation'),
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-embedding-candidate-${evidenceHash}`,
  };
}

function normalizeReview(review = {}) {
  const status = normalizeText(review.status, 'pending');
  if (!REVIEW_STATUSES.has(status)) {
    throw new Error(`Unsupported qualification review status: ${status}.`);
  }
  const reviewedAt = normalizeText(review.reviewedAt) || null;
  const reviewedBy = normalizeText(review.reviewedBy) || null;
  if (status === 'approved' && (!reviewedAt || !reviewedBy || !isValidTimestamp(reviewedAt))) {
    throw new Error('Approved qualification review requires reviewer and timestamp.');
  }
  return { reviewedAt, reviewedBy, status };
}

function normalizeGovernance(governance = {}) {
  return {
    licenseReview: normalizeReview(governance.licenseReview),
    networkIsolation: {
      egressDisabled: governance.networkIsolation?.egressDisabled === true,
      ...normalizeReview(governance.networkIsolation),
    },
    resourceReview: normalizeReview(governance.resourceReview),
    rollbackOwner: normalizeText(governance.rollbackOwner) || null,
  };
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    !normalizeText(runtime.endpointAlias) ||
    runtime.transportLoopback !== true
  ) {
    throw new Error('Qualification runtime requires loopback Ollama identity and version.');
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

function buildCheck(id, passed, evidence = {}) {
  return {
    ...evidence,
    id,
    passed: Boolean(passed),
    status: passed ? 'passed' : 'failed',
  };
}

function selectCandidate(candidates) {
  return [...candidates]
    .filter((candidate) => candidate.qualityPassed)
    .sort(
      (left, right) =>
        left.modelSizeBytes - right.modelSizeBytes ||
        left.durationMs - right.durationMs ||
        left.modelId.localeCompare(right.modelId),
    )[0] || null;
}

function buildQualificationContent({ candidates, governance, observedAt, runtime, suite }) {
  const normalizedObservedAt = normalizeText(observedAt);
  if (!isValidTimestamp(normalizedObservedAt)) {
    throw new Error('Qualification observedAt must be a valid timestamp.');
  }
  const normalizedSuite = normalizeSuite(suite);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedGovernance = normalizeGovernance(governance);
  const selectedCandidate = selectCandidate(candidates);
  const checks = [
    buildCheck('quality-passing-candidate-selected', Boolean(selectedCandidate)),
    buildCheck('actual-model-evaluated', selectedCandidate?.actualModelEvaluated === true),
    buildCheck('same-suite-quality-passed', selectedCandidate?.qualityPassed === true),
    buildCheck('model-digest-bound', isSha256(selectedCandidate?.modelDigest)),
    buildCheck(
      'license-evidence-bound',
      Boolean(selectedCandidate?.license?.title && isSha256(selectedCandidate?.license?.textHash)),
    ),
    buildCheck('loopback-transport', normalizedRuntime.transportLoopback),
    buildCheck('ollama-cloud-features-disabled', normalizedRuntime.cloudFeaturesDisabled),
    buildCheck('license-review-approved', normalizedGovernance.licenseReview.status === 'approved'),
    buildCheck(
      'network-isolation-approved',
      normalizedGovernance.networkIsolation.status === 'approved' &&
        normalizedGovernance.networkIsolation.egressDisabled,
    ),
    buildCheck('resource-envelope-approved', normalizedGovernance.resourceReview.status === 'approved'),
    buildCheck('rollback-owner-assigned', Boolean(normalizedGovernance.rollbackOwner)),
  ];
  const failedChecks = checks.filter((check) => !check.passed);
  const qualityRejected = !selectedCandidate;
  const governanceBlocked = !qualityRejected && failedChecks.length > 0;
  const status = qualityRejected
    ? 'quality-rejected'
    : governanceBlocked
      ? 'governance-blocked'
      : 'ready-for-operator-review';

  return {
    activation: {
      authorized: false,
      blockerCheckIds: failedChecks.map((check) => check.id),
      status: status === 'ready-for-operator-review' ? 'pending-operator-review' : 'blocked',
    },
    actualLocalEmbeddingModelQualified: status === 'ready-for-operator-review',
    actualLocalEmbeddingModelQualityValidated: Boolean(selectedCandidate),
    candidates,
    checkCounts: {
      failed: failedChecks.length,
      passed: checks.length - failedChecks.length,
    },
    checks,
    costFree: true,
    decision: qualityRejected
      ? 'keep-lexical'
      : governanceBlocked
        ? 'hold-for-governance'
        : 'hold-for-operator-review',
    governance: normalizedGovernance,
    observedAt: normalizedObservedAt,
    productionReadyClaim: false,
    rollback: {
      mode: 'lexical',
      owner: normalizedGovernance.rollbackOwner,
      ownerRequired: true,
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    schemaVersion: LOCAL_EMBEDDING_MODEL_QUALIFICATION_SCHEMA_VERSION,
    selection: {
      candidateEvidenceHash: selectedCandidate?.evidenceHash || null,
      candidateId: selectedCandidate?.id || null,
      modelId: selectedCandidate?.modelId || null,
      reason: selectedCandidate ? 'smallest-quality-passing-local-model' : 'no-quality-passing-model',
    },
    status,
    suite: normalizedSuite,
  };
}

export function buildLocalEmbeddingModelQualification({
  candidates,
  governance = {},
  observedAt,
  runtime,
  suite,
} = {}) {
  const normalizedSuite = normalizeSuite(suite);
  const normalizedCandidates = ensureArray(candidates)
    .map((candidate) => normalizeCandidate(candidate, normalizedSuite))
    .sort((left, right) => left.modelId.localeCompare(right.modelId));
  if (normalizedCandidates.length === 0) {
    throw new Error('At least one actual local embedding model candidate is required.');
  }
  if (new Set(normalizedCandidates.map((candidate) => candidate.modelId)).size !== normalizedCandidates.length) {
    throw new Error('Local embedding model candidate ids must be unique.');
  }
  const content = buildQualificationContent({
    candidates: normalizedCandidates,
    governance,
    observedAt,
    runtime,
    suite: normalizedSuite,
  });
  const qualificationHash = hashRecord(content);
  return {
    ...content,
    id: `local-embedding-model-qualification-${qualificationHash}`,
    qualificationHash,
  };
}

export function assertLocalEmbeddingModelQualification(qualification) {
  const errors = [];
  for (const candidate of ensureArray(qualification?.candidates)) {
    const { evidenceHash, id, ...candidateContent } = candidate;
    const expectedEvidenceHash = hashRecord(candidateContent);
    const { evaluationHash, ...qualityContent } = candidate.quality || {};
    if (
      evidenceHash !== expectedEvidenceHash ||
      id !== `local-embedding-candidate-${expectedEvidenceHash}` ||
      evaluationHash !== hashRecord(qualityContent)
    ) {
      errors.push(`candidate-integrity:${normalizeText(candidate.modelId, 'unknown')}`);
    }
  }

  const { id, qualificationHash, ...qualificationContent } = qualification || {};
  let expectedContent;
  try {
    expectedContent = buildQualificationContent({
      candidates: qualification?.candidates,
      governance: qualification?.governance,
      observedAt: qualification?.observedAt,
      runtime: qualification?.runtime,
      suite: qualification?.suite,
    });
  } catch (error) {
    errors.push(`qualification-contract:${error.message}`);
  }
  if (
    !expectedContent ||
    JSON.stringify(qualificationContent) !== JSON.stringify(expectedContent) ||
    qualificationHash !== hashRecord(qualificationContent) ||
    id !== `local-embedding-model-qualification-${qualificationHash}`
  ) {
    errors.push('qualification-integrity');
  }
  if (
    qualification?.activation?.authorized !== false ||
    qualification?.productionReadyClaim !== false ||
    qualification?.costFree !== true ||
    qualification?.runtime?.externalProviderCalls !== 'none'
  ) {
    errors.push('claim-boundary');
  }

  if (errors.length > 0) {
    throw new Error(`Local embedding model qualification failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
