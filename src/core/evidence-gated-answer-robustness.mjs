import { createHash } from 'node:crypto';

import { DEFAULT_ANSWER_QUALITY_THRESHOLDS } from './answer-quality-evaluation.mjs';
import { coordinateEvidenceGatedAnswer } from './evidence-gated-answer-shadow.mjs';
import {
  evaluateRagEvidenceSufficiencyCase,
  RAG_EVIDENCE_SUFFICIENCY_POLICY,
} from './rag-evidence-sufficiency-evaluation.mjs';

export const EVIDENCE_GATED_ANSWER_ROBUSTNESS_FIXTURE_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-robustness-fixture/v1';
export const EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-robustness-artifact/v1';
export const LOCAL_EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION =
  'personal-ai-agent-local-evidence-gated-answer-robustness-artifact/v1';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXPECTED_STATE_COUNTS = Object.freeze({
  conflicting: 2,
  irrelevant: 2,
  'no-evidence': 2,
  partial: 2,
  sufficient: 4,
});
const EXPECTED_ACTION_COUNTS = Object.freeze({
  abstain: 4,
  answer: 4,
  'request-more-evidence': 4,
});
const EXPECTED_LANGUAGE_COUNTS = Object.freeze({ en: 3, es: 3, ja: 3, ko: 3 });
const EXPECTED_DOMAIN_COUNTS = Object.freeze({
  documentation: 3,
  engineering: 3,
  operations: 3,
  policy: 3,
});
const EXPECTED_CANDIDATE_AGGREGATE = Object.freeze({
  caseCount: 12,
  casePassRate: 1,
  gateBlockedCount: 8,
  generationAttemptCount: 4,
  generatorCallCount: 4,
  qualityPassCount: 4,
});
const BOUNDARY_FLAGS = Object.freeze({
  actualUserQueryData: false,
  currentAnswerPathChanged: false,
  externalProviderCalls: 'none',
  productionReadyClaim: false,
  runtimeActivation: false,
  trainingAuthorized: false,
});
const BOUND_FILE_FIELDS = Object.freeze({
  q7EvidenceFileHash: 'q7EvidenceText',
  q9ArtifactFileHash: 'q9ArtifactText',
  q9CoreFileHash: 'q9CoreText',
  q9FixtureFileHash: 'q9FixtureText',
  q9LocalArtifactFileHash: 'q9LocalArtifactText',
  q10ArtifactFileHash: 'q10ArtifactText',
  q10CoreFileHash: 'q10CoreText',
  q10FixtureFileHash: 'q10FixtureText',
  q10LocalArtifactFileHash: 'q10LocalArtifactText',
});

function fail(code) {
  throw new Error(`Evidence-gated answer robustness failed: ${code}.`);
}

function normalizedText(value) {
  return String(value || '').trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function recordsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertSha256(value, code) {
  const normalized = normalizedText(value);
  if (!SHA256_PATTERN.test(normalized)) {
    fail(code);
  }
  return normalized;
}

function parseJson(value, code) {
  try {
    return JSON.parse(String(value));
  } catch {
    fail(code);
  }
}

function countValues(values, allowedValues) {
  const counts = Object.fromEntries(
    Object.keys(allowedValues).map((value) => [value, 0]),
  );
  for (const value of values) {
    if (!Object.hasOwn(counts, value)) {
      fail('fixture-matrix-drift');
    }
    counts[value] += 1;
  }
  return counts;
}

function boundaryFlagsFor(value) {
  return Object.fromEntries(
    Object.keys(BOUNDARY_FLAGS).map((key) => [key, value?.[key]]),
  );
}

function hasFrozenThresholds(value) {
  return recordsEqual(value, DEFAULT_ANSWER_QUALITY_THRESHOLDS);
}

function assertNonemptyUniqueTextList(value, code) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(code);
  }
  const items = value.map(normalizedText);
  if (items.some((item) => !item) || new Set(items).size !== items.length) {
    fail(code);
  }
  return items;
}

function sourceKeysFor(q9Case) {
  return q9Case.sources.map((source) => normalizedText(source.sourceKey)).sort();
}

function assertQualityContract(caseDefinition, q9Result) {
  const contract = caseDefinition.answerQualityContract;
  if (!contract || typeof contract !== 'object') {
    fail('quality-contract-drift');
  }
  if (
    contract.caseHash !== q9Result.caseHash ||
    contract.promptHash !== caseDefinition.fixturePromptHash ||
    contract.promptVersion !== caseDefinition.fixturePromptVersion ||
    contract.reviewerVerdict !== 'pass' ||
    !hasFrozenThresholds(contract.thresholds)
  ) {
    fail('quality-contract-drift');
  }
  const expectedSourceKeys = assertNonemptyUniqueTextList(
    contract.expectedSourceKeys,
    'quality-contract-drift',
  ).sort();
  if (!recordsEqual(expectedSourceKeys, sourceKeysFor(caseDefinition.q9Case))) {
    fail('quality-contract-drift');
  }
  assertNonemptyUniqueTextList(contract.requiredAnswerTerms, 'quality-contract-drift');
  assertNonemptyUniqueTextList(contract.forbiddenAnswerTerms, 'quality-contract-drift');
  if (!Array.isArray(contract.forbiddenSourceKeys)) {
    fail('quality-contract-drift');
  }
}

export function hashEvidenceGatedAnswerRobustnessValue(value) {
  return hashValue(value);
}

export function hashEvidenceGatedAnswerRobustnessRecord(value) {
  return hashRecord(value);
}

export function assertEvidenceGatedAnswerRobustnessFixture(fixture = {}) {
  if (
    fixture.schemaVersion !== EVIDENCE_GATED_ANSWER_ROBUSTNESS_FIXTURE_SCHEMA_VERSION ||
    !recordsEqual(boundaryFlagsFor(fixture), BOUNDARY_FLAGS) ||
    !hasFrozenThresholds(fixture.thresholds) ||
    fixture.thresholdsHash !== hashRecord(DEFAULT_ANSWER_QUALITY_THRESHOLDS) ||
    !Array.isArray(fixture.cases) ||
    fixture.cases.length !== 12
  ) {
    fail('fixture-contract-drift');
  }

  for (const field of [
    'thresholdsHash',
    'q7EvidenceHash',
    'q7EvidenceFileHash',
    'q7PromptHash',
    'q9PolicyHash',
    'q9ArtifactHash',
    'q10ArtifactHash',
    ...Object.keys(BOUND_FILE_FIELDS),
  ]) {
    assertSha256(fixture[field], 'fixture-binding-hash-invalid');
  }

  const caseIds = fixture.cases.map((item) => normalizedText(item?.id));
  const caseHashes = fixture.cases.map((item) => assertSha256(item?.caseHash, 'fixture-case-hash-invalid'));
  if (
    caseIds.some((id) => !id) ||
    new Set(caseIds).size !== 12 ||
    new Set(caseHashes).size !== 12
  ) {
    fail('fixture-case-identity-drift');
  }

  const stateCounts = countValues(
    fixture.cases.map((item) => item.expectedState),
    EXPECTED_STATE_COUNTS,
  );
  const actionCounts = countValues(
    fixture.cases.map((item) => item.expectedAction),
    EXPECTED_ACTION_COUNTS,
  );
  const languageCounts = countValues(
    fixture.cases.map((item) => item.language),
    EXPECTED_LANGUAGE_COUNTS,
  );
  const domainCounts = countValues(
    fixture.cases.map((item) => item.domain),
    EXPECTED_DOMAIN_COUNTS,
  );
  if (
    !recordsEqual(stateCounts, EXPECTED_STATE_COUNTS) ||
    !recordsEqual(actionCounts, EXPECTED_ACTION_COUNTS) ||
    !recordsEqual(languageCounts, EXPECTED_LANGUAGE_COUNTS) ||
    !recordsEqual(domainCounts, EXPECTED_DOMAIN_COUNTS)
  ) {
    fail('fixture-matrix-drift');
  }

  for (const caseDefinition of fixture.cases) {
    const q9Result = evaluateRagEvidenceSufficiencyCase(caseDefinition.q9Case);
    const isSufficient = q9Result.state === 'sufficient';
    const expectedCallCount = isSufficient ? 1 : 0;

    if (
      q9Result.id !== caseDefinition.id ||
      q9Result.caseHash !== caseDefinition.caseHash ||
      q9Result.state !== caseDefinition.expectedState ||
      q9Result.action !== caseDefinition.expectedAction ||
      RAG_EVIDENCE_SUFFICIENCY_POLICY.actions[q9Result.state] !== q9Result.action ||
      caseDefinition.expectedGeneratorCallCount !== expectedCallCount
    ) {
      fail('q9-case-binding-drift');
    }

    if (isSufficient) {
      assertQualityContract(
        {
          ...caseDefinition,
          fixturePromptHash: fixture.q7PromptHash,
          fixturePromptVersion: fixture.q7PromptVersion,
        },
        q9Result,
      );
    } else if (caseDefinition.answerQualityContract !== undefined) {
      fail('non-sufficient-contract-exposed');
    }
  }

  return fixture;
}

export function assertEvidenceGatedAnswerRobustnessBindings(inputs = {}) {
  const fixture = assertEvidenceGatedAnswerRobustnessFixture(
    parseJson(inputs.fixtureText, 'fixture-contract-drift'),
  );

  for (const [fixtureField, inputField] of Object.entries(BOUND_FILE_FIELDS)) {
    assertSha256(fixture[fixtureField], 'fixture-binding-hash-invalid');
    if (fixture[fixtureField] !== hashValue(inputs[inputField])) {
      fail('bound-file-drift');
    }
  }

  const q7 = parseJson(inputs.q7EvidenceText, 'q7-baseline-drift');
  const q9 = parseJson(inputs.q9ArtifactText, 'q9-artifact-drift');
  const q10 = parseJson(inputs.q10ArtifactText, 'q10-artifact-drift');
  if (
    fixture.q7EvidenceHash !== q7.evidenceHash ||
    fixture.q7PromptHash !== q7.prompt?.candidateHash ||
    fixture.q7PromptVersion !== q7.prompt?.candidateVersion ||
    fixture.q9PolicyHash !== q9.policyHash ||
    fixture.q9ArtifactHash !== q9.integrityHash ||
    fixture.q10ArtifactHash !== q10.integrityHash ||
    q9.aggregate?.caseCount !== 5 ||
    q10.aggregate?.generationAttemptCount !== 1
  ) {
    fail('artifact-history-drift');
  }
  return { fixture, q7, q9, q10 };
}

function failureResult(caseDefinition, error) {
  const q9Result = evaluateRagEvidenceSufficiencyCase(caseDefinition.q9Case);
  return {
    action: q9Result.action,
    answer: null,
    answerQuality: null,
    caseHash: q9Result.caseHash,
    generation: {
      attempted: q9Result.action === 'answer',
      failureKind: q9Result.action === 'answer' ? 'generation-contract-error' : null,
      status: q9Result.action === 'answer' ? 'failed' : 'blocked-by-gate',
    },
    observation: null,
    requestedClaimKeys: q9Result.requestedClaimKeys,
    state: q9Result.state,
    status: q9Result.action === 'answer' ? 'answer-generation-failed' : 'evaluation-failed',
    suiteFailureCode: normalizedText(error?.message) ? 'coordinator-error' : 'unknown-error',
  };
}

function casePassed(result) {
  return [
    'answered-quality-passed',
    'evidence-requested',
    'abstained',
  ].includes(result.status);
}

export async function evaluateEvidenceGatedAnswerRobustnessSuite({ fixture, generator } = {}) {
  assertEvidenceGatedAnswerRobustnessFixture(fixture);

  let generatorCallCount = 0;
  const countingGenerator = {
    get promptHash() {
      return generator.promptHash;
    },
    get promptVersion() {
      return generator.promptVersion;
    },
    async generate(input) {
      generatorCallCount += 1;
      return generator.generate(input);
    },
  };

  const cases = [];
  for (const definition of fixture.cases) {
    const input = { q9Case: definition.q9Case };
    if (definition.expectedState === 'sufficient') {
      input.answerQualityContract = definition.answerQualityContract;
      input.generator = countingGenerator;
    }

    let result;
    try {
      // Q10 calls Q9 once and owns every route decision.
      result = await coordinateEvidenceGatedAnswer(input);
    } catch (error) {
      result = failureResult(definition, error);
    }

    if (
      result.caseHash !== definition.caseHash ||
      result.state !== definition.expectedState ||
      result.action !== definition.expectedAction
    ) {
      fail('route-drift');
    }
    cases.push({ definition, result });
  }

  const results = cases.map((item) => item.result);
  return {
    aggregate: {
      caseCount: results.length,
      casePassRate: results.filter(casePassed).length / results.length,
      gateBlockedCount: results.filter((item) => !item.generation.attempted).length,
      generationAttemptCount: results.filter((item) => item.generation.attempted).length,
      generatorCallCount,
      qualityPassCount: results.filter((item) => item.answerQuality?.status === 'passed').length,
    },
    cases,
  };
}

export function assertEvidenceGatedAnswerRobustnessCandidatePassed(suite = {}) {
  if (!recordsEqual(suite.aggregate, EXPECTED_CANDIDATE_AGGREGATE)) {
    fail('candidate-pass-assertion-failed');
  }
  return suite;
}

function contentFreeCase({ definition, result }) {
  return {
    action: result.action,
    answerQuality: result.answerQuality
      ? {
          failureCheckIds: result.answerQuality.failureCheckIds,
          metrics: result.answerQuality.metrics,
          status: result.answerQuality.status,
        }
      : null,
    caseHash: result.caseHash,
    domainHash: hashValue(definition.domain),
    generation: result.generation,
    languageHash: hashValue(definition.language),
    requestedClaimHashes: result.requestedClaimKeys.map(hashValue),
    sanitizedFailureCode: result.suiteFailureCode || null,
    state: result.state,
    status: result.status,
  };
}

const PASSING_QUALITY_METRICS = Object.freeze({
  citationGroundingRate: 1,
  expectedSourceCitationRate: 1,
  forbiddenRetrievedSourceCount: 0,
  forbiddenTermMatchCount: 0,
  requiredTermCoverage: 1,
  retrievalHitRate: 1,
  unsupportedCitationRate: 0,
});

function expectedDeterministicCase(caseDefinition) {
  const q9Result = evaluateRagEvidenceSufficiencyCase(caseDefinition.q9Case);
  const isSufficient = q9Result.state === 'sufficient';
  const requestsEvidence = q9Result.action === 'request-more-evidence';
  return {
    action: q9Result.action,
    answerQuality: isSufficient
      ? {
          failureCheckIds: [],
          metrics: PASSING_QUALITY_METRICS,
          status: 'passed',
        }
      : null,
    caseHash: q9Result.caseHash,
    domainHash: hashValue(caseDefinition.domain),
    generation: {
      attempted: isSufficient,
      failureKind: null,
      status: isSufficient ? 'passed' : 'blocked-by-gate',
    },
    languageHash: hashValue(caseDefinition.language),
    requestedClaimHashes: requestsEvidence
      ? q9Result.requestedClaimKeys.map(hashValue)
      : [],
    sanitizedFailureCode: null,
    state: q9Result.state,
    status: isSufficient
      ? 'answered-quality-passed'
      : requestsEvidence
        ? 'evidence-requested'
        : 'abstained',
  };
}

const SUCCESSFUL_TERMINAL_STATUSES = new Set([
  'answered-quality-passed',
  'evidence-requested',
  'abstained',
]);
const SANITIZED_FAILURE_CODES = new Set([
  'coordinator-error',
  'unknown-error',
]);
const GENERATION_FAILURE_KINDS = new Set([
  'generation-contract-error',
  'generation-timeout',
  'incomplete-source-coverage',
  'invalid-review-action',
  'invalid-structured-output',
  'model-attribution-drift',
]);

function hasPassingQuality(item) {
  return item.answerQuality?.status === 'passed' &&
    recordsEqual(item.answerQuality.failureCheckIds, []) &&
    recordsEqual(item.answerQuality.metrics, PASSING_QUALITY_METRICS);
}

function hasFailedQuality(item) {
  return item.answerQuality?.status === 'failed' &&
    Array.isArray(item.answerQuality.failureCheckIds) &&
    item.answerQuality.failureCheckIds.length > 0;
}

function localCaseHasValidTerminalRelation(item) {
  const expectedAction = RAG_EVIDENCE_SUFFICIENCY_POLICY.actions[item.state];
  if (item.action !== expectedAction || !item.generation) {
    return false;
  }
  const isSufficient = item.state === 'sufficient';
  const requestsEvidence = item.action === 'request-more-evidence';

  if (SUCCESSFUL_TERMINAL_STATUSES.has(item.status)) {
    if (item.sanitizedFailureCode !== null) {
      return false;
    }
    if (item.status === 'answered-quality-passed') {
      return isSufficient &&
        item.generation.attempted === true &&
        item.generation.status === 'passed' &&
        item.generation.failureKind === null &&
        hasPassingQuality(item);
    }
    if (item.status === 'evidence-requested') {
      return requestsEvidence &&
        item.generation.attempted === false &&
        item.generation.status === 'blocked-by-gate' &&
        item.generation.failureKind === null &&
        item.answerQuality === null;
    }
    return item.state === 'conflicting' || item.state === 'no-evidence'
      ? item.generation.attempted === false &&
        item.generation.status === 'blocked-by-gate' &&
        item.generation.failureKind === null &&
        item.answerQuality === null
      : false;
  }

  if (item.status === 'evaluation-failed') {
    return !isSufficient &&
      SANITIZED_FAILURE_CODES.has(item.sanitizedFailureCode) &&
      item.generation.attempted === false &&
      item.generation.status === 'blocked-by-gate' &&
      item.generation.failureKind === null &&
      item.answerQuality === null;
  }

  if (item.status === 'answer-generation-failed') {
    return isSufficient &&
      item.action === 'answer' &&
      item.generation.attempted === true &&
      item.generation.status === 'failed' &&
      (GENERATION_FAILURE_KINDS.has(item.generation.failureKind) ||
        SANITIZED_FAILURE_CODES.has(item.sanitizedFailureCode)) &&
      item.answerQuality === null;
  }

  if (item.status === 'answered-quality-failed') {
    return isSufficient &&
      item.action === 'answer' &&
      item.sanitizedFailureCode === null &&
      item.generation.attempted === true &&
      item.generation.status === 'passed' &&
      item.generation.failureKind === null &&
      hasFailedQuality(item);
  }
  return false;
}

function deriveAggregateFromCases(cases, generatorCallCount) {
  const passedCaseCount = cases.filter((item) =>
    SUCCESSFUL_TERMINAL_STATUSES.has(item.status),
  ).length;
  return {
    caseCount: cases.length,
    casePassRate: cases.length ? passedCaseCount / cases.length : 0,
    gateBlockedCount: cases.filter((item) => !item.generation.attempted).length,
    generationAttemptCount: cases.filter((item) => item.generation.attempted).length,
    generatorCallCount,
    qualityPassCount: cases.filter(
      (item) => item.answerQuality?.status === 'passed',
    ).length,
  };
}

export function buildEvidenceGatedAnswerRobustnessArtifact({
  bindings,
  fixtureHash,
  suite,
} = {}) {
  assertEvidenceGatedAnswerRobustnessFixture(bindings);
  assertSha256(fixtureHash, 'fixture-hash-invalid');
  assertEvidenceGatedAnswerRobustnessCandidatePassed(suite);

  const content = {
    ...BOUNDARY_FLAGS,
    aggregate: suite.aggregate,
    cases: suite.cases.map(contentFreeCase),
    fixtureHash,
    q1ThresholdsHash: bindings.thresholdsHash,
    q7EvidenceHash: bindings.q7EvidenceHash,
    q7PromptHash: bindings.q7PromptHash,
    q9ArtifactHash: bindings.q9ArtifactHash,
    q9PolicyHash: bindings.q9PolicyHash,
    q10ArtifactHash: bindings.q10ArtifactHash,
    reviewerProvenance: {
      independentReviewerValidated: false,
      reviewerVerdictSource: 'synthetic-fixture-oracle',
    },
    schemaVersion: EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION,
  };
  const integrityHash = hashRecord(content);
  return {
    ...content,
    id: `evidence-gated-answer-robustness-${integrityHash}`,
    integrityHash,
  };
}

export function assertEvidenceGatedAnswerRobustnessArtifact(
  artifact,
  { bindings, fixture, fixtureText } = {},
) {
  const { id, integrityHash, ...content } = artifact || {};
  if (
    integrityHash !== hashRecord(content) ||
    id !== `evidence-gated-answer-robustness-${integrityHash}`
  ) {
    fail('artifact-integrity');
  }
  const validCases = Array.isArray(content.cases) &&
    content.cases.length === 12 &&
    new Set(content.cases.map((item) => item.caseHash)).size === 12 &&
    content.cases.every((item) =>
      SHA256_PATTERN.test(normalizedText(item.caseHash)) &&
      RAG_EVIDENCE_SUFFICIENCY_POLICY.actions[item.state] === item.action &&
      item.generation?.attempted === (item.state === 'sufficient') &&
      (item.state === 'sufficient'
        ? item.answerQuality?.status === 'passed' && item.answerQuality.failureCheckIds.length === 0
        : item.answerQuality === null));
  let exactBindingIsValid = true;
  if (fixture || fixtureText || bindings) {
    const currentFixture = assertEvidenceGatedAnswerRobustnessFixture(
      fixture || parseJson(fixtureText, 'fixture-contract-drift'),
    );
    if (!fixtureText || !bindings) {
      fail('artifact-current-binding-required');
    }
    if (!recordsEqual(bindings.fixture, currentFixture)) {
      fail('artifact-current-binding-drift');
    }
    const expectedCases = currentFixture.cases.map(expectedDeterministicCase);
    exactBindingIsValid =
      content.fixtureHash === hashValue(fixtureText) &&
      content.q1ThresholdsHash === currentFixture.thresholdsHash &&
      content.q7EvidenceHash === currentFixture.q7EvidenceHash &&
      content.q7PromptHash === currentFixture.q7PromptHash &&
      content.q9ArtifactHash === currentFixture.q9ArtifactHash &&
      content.q9PolicyHash === currentFixture.q9PolicyHash &&
      content.q10ArtifactHash === currentFixture.q10ArtifactHash &&
      recordsEqual(content.cases, expectedCases);
  }
  if (
    content.schemaVersion !== EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION ||
    !recordsEqual(boundaryFlagsFor(content), BOUNDARY_FLAGS) ||
    !recordsEqual(content.aggregate, EXPECTED_CANDIDATE_AGGREGATE) ||
    !validCases ||
    !exactBindingIsValid ||
    content.reviewerProvenance?.reviewerVerdictSource !== 'synthetic-fixture-oracle' ||
    content.reviewerProvenance?.independentReviewerValidated !== false
  ) {
    fail('artifact-semantic-drift');
  }
  return artifact;
}

export function assertContentFreeEvidenceGatedAnswerRobustnessArtifact(
  artifact,
  forbiddenValues = [],
) {
  const serialized = JSON.stringify(artifact);
  for (const value of forbiddenValues.map(normalizedText).filter(Boolean)) {
    if (serialized.includes(value)) {
      fail('artifact-content-leak');
    }
  }
  return artifact;
}

export function buildLocalEvidenceGatedAnswerRobustnessArtifact({
  bindings,
  deterministicArtifact,
  model,
  observedAt,
  observations,
  runtime,
  suite,
} = {}) {
  assertEvidenceGatedAnswerRobustnessFixture(bindings);
  assertEvidenceGatedAnswerRobustnessArtifact(deterministicArtifact);
  if (
    !SHA256_PATTERN.test(normalizedText(model?.digest)) ||
    !SHA256_PATTERN.test(normalizedText(model?.licenseHash)) ||
    normalizedText(model?.id) !== 'qwen2.5:3b' ||
    !Number.isSafeInteger(model?.sizeBytes) || model.sizeBytes <= 0 ||
    !Number.isFinite(Date.parse(normalizedText(observedAt))) ||
    runtime?.kind !== 'ollama' ||
    runtime?.transportLoopback !== true ||
    runtime?.cloudFeaturesDisabled !== true ||
    !normalizedText(runtime?.version) ||
    !Array.isArray(observations)
  ) {
    fail('local-artifact-contract-invalid');
  }

  const sufficientCaseHashes = deterministicArtifact.cases
    .filter((item) => item.state === 'sufficient')
    .map((item) => item.caseHash)
    .sort();
  const observationHashes = observations.map((item) => normalizedText(item.caseHash)).sort();
  if (!recordsEqual(observationHashes, sufficientCaseHashes)) {
    fail('local-observation-case-drift');
  }

  if (!suite?.aggregate || !Array.isArray(suite.cases) || suite.cases.length !== 12) {
    fail('local-suite-contract-invalid');
  }

  const contentFreeObservations = observations.map((item) => ({
    caseHash: item.caseHash,
    durationMs: item.durationMs,
    failureCheckIds: item.failureCheckIds,
    generationFailureKind: item.generationFailureKind,
    outputBytes: item.outputBytes,
    status: item.status,
  }));
  const qualityPassCount = contentFreeObservations.filter(
    (item) => item.status === 'passed',
  ).length;
  const content = {
    ...BOUNDARY_FLAGS,
    actualModelEvaluated: true,
    deterministicArtifactHash: deterministicArtifact.integrityHash,
    fixtureHash: deterministicArtifact.fixtureHash,
    model: {
      digest: model.digest,
      id: model.id,
      licenseHash: model.licenseHash,
      sizeBytes: model.sizeBytes,
    },
    observedAt,
    observations: contentFreeObservations,
    cases: suite.cases.map(contentFreeCase),
    q1ThresholdsHash: bindings.thresholdsHash,
    q7EvidenceHash: bindings.q7EvidenceHash,
    q9ArtifactHash: bindings.q9ArtifactHash,
    q10ArtifactHash: bindings.q10ArtifactHash,
    reviewerProvenance: {
      independentReviewerValidated: false,
      reviewerVerdictSource: 'synthetic-fixture-oracle',
    },
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: runtime.version,
    },
    schemaVersion: LOCAL_EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION,
    suiteAggregate: suite.aggregate,
    summary: {
      candidatePassAssertion: recordsEqual(
        suite.aggregate,
        EXPECTED_CANDIDATE_AGGREGATE,
      ),
      generationAttemptCount: suite.aggregate.generationAttemptCount,
      qualityPassCount: suite.aggregate.qualityPassCount,
    },
  };
  const integrityHash = hashRecord(content);
  return {
    ...content,
    id: `local-evidence-gated-answer-robustness-${integrityHash}`,
    integrityHash,
  };
}

export function assertLocalEvidenceGatedAnswerRobustnessArtifact(
  artifact,
  {
    bindings,
    deterministicArtifact,
    fixtureText,
    q9LocalArtifact,
    requireCandidatePass = false,
  } = {},
) {
  const { id, integrityHash, ...content } = artifact || {};
  if (
    integrityHash !== hashRecord(content) ||
    id !== `local-evidence-gated-answer-robustness-${integrityHash}`
  ) {
    fail('local-artifact-integrity');
  }
  const allowedStatuses = new Set(['passed', 'failed']);
  const allowedFailureKinds = new Set([
    null,
    'generation-contract-error',
    'generation-timeout',
    'incomplete-source-coverage',
    'invalid-review-action',
    'invalid-structured-output',
    'model-attribution-drift',
  ]);
  const observationsAreHonest = Array.isArray(content.observations) &&
    content.observations.length === 4 &&
    new Set(content.observations.map((item) => item.caseHash)).size === 4 &&
    content.observations.every((item) =>
      SHA256_PATTERN.test(normalizedText(item.caseHash)) &&
      Number.isFinite(item.durationMs) && item.durationMs >= 0 &&
      Number.isSafeInteger(item.outputBytes) && item.outputBytes >= 0 &&
      Array.isArray(item.failureCheckIds) &&
      item.failureCheckIds.every((check) => normalizedText(check)) &&
      allowedStatuses.has(item.status) &&
      allowedFailureKinds.has(item.generationFailureKind) &&
      (item.status === 'passed'
        ? item.failureCheckIds.length === 0 && item.generationFailureKind === null
        : true));
  const caseProjectionIsHonest = Array.isArray(content.cases) &&
    content.cases.length === 12 &&
    new Set(content.cases.map((item) => item.caseHash)).size === 12 &&
    content.cases.every((item) =>
      SHA256_PATTERN.test(normalizedText(item.caseHash)) &&
      SHA256_PATTERN.test(normalizedText(item.languageHash)) &&
      SHA256_PATTERN.test(normalizedText(item.domainHash)) &&
      Array.isArray(item.requestedClaimHashes) &&
      item.requestedClaimHashes.every((value) => SHA256_PATTERN.test(normalizedText(value))) &&
      localCaseHasValidTerminalRelation(item));
  const observationsMatchCases = caseProjectionIsHonest &&
    content.observations.every((observation) => {
      const matchingCase = content.cases.find(
        (item) => item.caseHash === observation.caseHash,
      );
      return matchingCase?.generation.attempted === true &&
        observation.generationFailureKind === matchingCase.generation.failureKind &&
        recordsEqual(
          observation.failureCheckIds,
          matchingCase.answerQuality?.failureCheckIds || [],
        ) &&
        observation.status ===
          (matchingCase.answerQuality?.status === 'passed' ? 'passed' : 'failed');
    });
  const derivedAggregate = caseProjectionIsHonest &&
    Number.isSafeInteger(content.suiteAggregate?.generatorCallCount) &&
    content.suiteAggregate.generatorCallCount >= 0
    ? deriveAggregateFromCases(
        content.cases,
        content.suiteAggregate.generatorCallCount,
      )
    : null;
  const bindingHashesAreValid = [
    content.deterministicArtifactHash,
    content.fixtureHash,
    content.q1ThresholdsHash,
    content.q7EvidenceHash,
    content.q9ArtifactHash,
    content.q10ArtifactHash,
  ].every((value) => SHA256_PATTERN.test(normalizedText(value)));
  let deterministicBindingIsValid = true;
  let baselineBindingIsValid = true;
  if (deterministicArtifact) {
    assertEvidenceGatedAnswerRobustnessArtifact(deterministicArtifact, {
      bindings,
      fixture: bindings?.fixture,
      fixtureText,
    });
    const expectedSufficientCaseHashes = deterministicArtifact.cases
      .filter((item) => item.state === 'sufficient')
      .map((item) => item.caseHash)
      .sort();
    const observedCaseHashes = content.observations
      .map((item) => item.caseHash)
      .sort();
    deterministicBindingIsValid =
      content.deterministicArtifactHash === deterministicArtifact.integrityHash &&
      content.fixtureHash === deterministicArtifact.fixtureHash &&
      content.q1ThresholdsHash === deterministicArtifact.q1ThresholdsHash &&
      content.q7EvidenceHash === deterministicArtifact.q7EvidenceHash &&
      content.q9ArtifactHash === deterministicArtifact.q9ArtifactHash &&
      content.q10ArtifactHash === deterministicArtifact.q10ArtifactHash &&
      recordsEqual(observedCaseHashes, expectedSufficientCaseHashes);
  }
  if (bindings || fixtureText || q9LocalArtifact) {
    if (!bindings || !fixtureText || !q9LocalArtifact) {
      fail('local-current-binding-required');
    }
    const expectedByCaseHash = new Map(
      bindings.fixture.cases.map((caseDefinition) => {
        const expected = expectedDeterministicCase(caseDefinition);
        return [expected.caseHash, expected];
      }),
    );
    const caseIdentityIsValid = content.cases.every((item) => {
      const expected = expectedByCaseHash.get(item.caseHash);
      return expected &&
        item.state === expected.state &&
        item.action === expected.action &&
        item.languageHash === expected.languageHash &&
        item.domainHash === expected.domainHash &&
        recordsEqual(item.requestedClaimHashes, expected.requestedClaimHashes);
    });
    baselineBindingIsValid =
      content.fixtureHash === hashValue(fixtureText) &&
      content.q1ThresholdsHash === bindings.fixture.thresholdsHash &&
      content.q7EvidenceHash === bindings.fixture.q7EvidenceHash &&
      content.q9ArtifactHash === bindings.fixture.q9ArtifactHash &&
      content.q10ArtifactHash === bindings.fixture.q10ArtifactHash &&
      content.model?.id === bindings.q7.model?.id &&
      content.model?.digest === bindings.q7.model?.digest &&
      content.model?.sizeBytes === bindings.q7.model?.sizeBytes &&
      content.model?.licenseHash === q9LocalArtifact.model?.licenseHash &&
      content.runtime?.version === bindings.q7.runtime?.version &&
      caseIdentityIsValid;
  }
  const valid =
    content.schemaVersion === LOCAL_EVIDENCE_GATED_ANSWER_ROBUSTNESS_ARTIFACT_SCHEMA_VERSION &&
    recordsEqual(boundaryFlagsFor(content), BOUNDARY_FLAGS) &&
    content.actualModelEvaluated === true &&
    Number.isFinite(Date.parse(normalizedText(content.observedAt))) &&
    Date.parse(content.observedAt) <= Date.now() &&
    content.model?.id === 'qwen2.5:3b' &&
    SHA256_PATTERN.test(normalizedText(content.model?.digest)) &&
    SHA256_PATTERN.test(normalizedText(content.model?.licenseHash)) &&
    Number.isSafeInteger(content.model?.sizeBytes) && content.model.sizeBytes > 0 &&
    content.runtime?.kind === 'ollama' &&
    content.runtime?.transportLoopback === true &&
    content.runtime?.cloudFeaturesDisabled === true &&
    normalizedText(content.runtime?.version) &&
    observationsAreHonest &&
    caseProjectionIsHonest &&
    observationsMatchCases &&
    bindingHashesAreValid &&
    deterministicBindingIsValid &&
    baselineBindingIsValid &&
    recordsEqual(content.suiteAggregate, derivedAggregate) &&
    content.summary?.generationAttemptCount === content.suiteAggregate.generationAttemptCount &&
    content.summary?.qualityPassCount === content.suiteAggregate.qualityPassCount &&
    content.summary?.candidatePassAssertion === recordsEqual(content.suiteAggregate, EXPECTED_CANDIDATE_AGGREGATE) &&
    content.reviewerProvenance?.reviewerVerdictSource === 'synthetic-fixture-oracle' &&
    content.reviewerProvenance?.independentReviewerValidated === false;
  if (!valid) {
    fail('local-artifact-semantic-drift');
  }
  if (requireCandidatePass && !content.summary.candidatePassAssertion) {
    fail('local-candidate-pass-required');
  }
  return artifact;
}
