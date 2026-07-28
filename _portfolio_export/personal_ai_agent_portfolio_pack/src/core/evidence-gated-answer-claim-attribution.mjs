import { createHash } from 'node:crypto';

import { coordinateEvidenceGatedAnswer } from './evidence-gated-answer-shadow.mjs';

export const CLAIM_SOURCE_ATTRIBUTION_FIXTURE_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-claim-attribution-fixture/v1';
export const CLAIM_SOURCE_ATTRIBUTION_CONTRACT_SCHEMA_VERSION =
  'personal-ai-agent-claim-source-attribution-contract/v1';
export const CLAIM_SOURCE_ATTRIBUTION_RESULT_SCHEMA_VERSION =
  'personal-ai-agent-claim-source-attribution-result/v1';
export const CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-claim-attribution-artifact/v1';
export const LOCAL_CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION =
  'personal-ai-agent-local-evidence-gated-answer-claim-attribution-artifact/v1';
export const FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE = Object.freeze({
  model: Object.freeze({
    digest: '357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b',
    id: 'qwen2.5:3b',
    licenseHash: 'b5c0e5cf74cf51af1ecbc4af597cfcd13fd9925611838884a681070838a14a50',
    sizeBytes: 1929912432,
  }),
  runtime: Object.freeze({
    cloudFeaturesDisabled: true,
    kind: 'ollama',
    transportLoopback: true,
    version: '0.23.0',
  }),
});

const SHA256 = /^[a-f0-9]{64}$/;
const SOURCE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const TERM = /^[A-Z0-9][A-Z0-9._:/-]{0,199}$/;
const BOUNDARY_FLAGS = Object.freeze({
  actualUserQueryData: false,
  currentAnswerPathChanged: false,
  externalProviderCalls: 'none',
  independentReviewerValidated: false,
  productionReadyClaim: false,
  runtimeActivation: false,
  semanticAttributionValidated: false,
  trainingAuthorized: false,
});
const EXPECTED_AGGREGATE = Object.freeze({
  attributionAttemptCount: 4,
  attributionContractGetterAccessCount: 4,
  attributionPassCount: 4,
  caseCount: 12,
  claimSourceAttributionRate: 1,
  gateBlockedCount: 8,
  generationAttemptCount: 4,
  generatorGetterAccessCount: 4,
  qualityPassCount: 4,
});
const ARTIFACT_KEYS = Object.freeze([
  ...Object.keys(BOUNDARY_FLAGS),
  'lexicalClaimSourceAttributionValidated',
  'aggregate',
  'fixtureHash',
  'schemaVersion',
  'id',
  'integrityHash',
]);
const LOCAL_ARTIFACT_KEYS = Object.freeze([
  ...Object.keys(BOUNDARY_FLAGS),
  'actualModelEvaluated',
  'deterministicArtifactHash',
  'fixtureHash',
  'lexicalClaimSourceAttributionValidated',
  'model',
  'observations',
  'observedAt',
  'runtime',
  'schemaVersion',
  'suiteAggregate',
  'id',
  'integrityHash',
]);
const FORBIDDEN_ARTIFACT_KEYS = new Set([
  'answer', 'source', 'objective', 'rawterm', 'rawsourcekey', 'prompt',
  'response', 'error', 'stderr', 'path', 'file', 'filename', 'machine',
  'user', 'userid', 'username',
]);
const Q13_FAILURE_IDS = new Set([
  'answer-contract-invalid', 'cited-source-order-mismatch', 'answer-control-character',
  'summary-missing', 'source-marker-missing', 'source-marker-duplicate',
  'source-marker-unknown', 'source-marker-reordered', 'source-marker-injection',
  'claim-block-empty', 'reviewer-boundary-missing', 'reviewer-boundary-duplicate',
  'reviewer-action-empty', 'bound-term-missing', 'bound-term-summary-only',
  'cross-source-term',
]);
const Q10_GENERATION_FAILURE_IDS = new Set([
  'generation-contract-error', 'generation-timeout', 'incomplete-source-coverage',
  'invalid-review-action', 'invalid-structured-output', 'model-attribution-drift',
]);
const Q1_FAILURE_IDS = new Set([
  'retrieval-hit-rate', 'expected-source-citation-rate',
  'citation-grounding-rate', 'required-term-coverage', 'unsupported-citation-rate',
  'forbidden-retrieved-source-count', 'forbidden-term-matches', 'reviewer-verdict',
]);

function fail(code) {
  throw new Error(`Claim-source attribution failed: ${code}.`);
}

function text(value) {
  return String(value || '').trim();
}

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function recordHash(value) {
  return hash(JSON.stringify(value));
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sorted(values) {
  return [...new Set(values)].sort();
}

function occurrenceCount(value, term) {
  return String(value).split(term).length - 1;
}

function hasExactKeys(value, expectedKeys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    equal(Object.keys(value).sort(), [...expectedKeys].sort());
}

function boundaryFlagsFor(value) {
  return Object.fromEntries(
    Object.keys(BOUNDARY_FLAGS).map((key) => [key, value?.[key]]),
  );
}

function parseJson(value, code) {
  try {
    return JSON.parse(String(value));
  } catch {
    fail(code);
  }
}

export function hashClaimSourceAttributionValue(value) {
  return hash(value);
}

export function hashClaimSourceAttributionRecord(value) {
  return recordHash(value);
}

export function validateAttributionContract(contract, { requiredAnswerTerms } = {}) {
  if (!contract) fail('attribution-contract-missing');
  if (
    typeof contract !== 'object' ||
    contract.schemaVersion !== CLAIM_SOURCE_ATTRIBUTION_CONTRACT_SCHEMA_VERSION ||
    !SHA256.test(text(contract.caseHash)) ||
    contract.envelopeVersion !== 'q7-v5-flattened-source-claims/v1' ||
    !Array.isArray(contract.expectedSourceOrder) ||
    !Array.isArray(contract.sourceBindings)
  ) {
    fail('attribution-contract-invalid');
  }

  const expectedSourceOrder = contract.expectedSourceOrder.map(text);
  const sourceBindings = contract.sourceBindings.map((binding) => ({
    sourceKey: text(binding?.sourceKey),
    requiredTerms: Array.isArray(binding?.requiredTerms)
      ? binding.requiredTerms.map(text)
      : [],
  }));
  const allTerms = sourceBindings.flatMap((binding) => binding.requiredTerms);
  if (
    expectedSourceOrder.length === 0 ||
    new Set(expectedSourceOrder).size !== expectedSourceOrder.length ||
    expectedSourceOrder.some((key) => !SOURCE_KEY.test(key)) ||
    sourceBindings.length !== expectedSourceOrder.length ||
    sourceBindings.some((binding, index) =>
      binding.sourceKey !== expectedSourceOrder[index] ||
      binding.requiredTerms.length === 0 ||
      new Set(binding.requiredTerms).size !== binding.requiredTerms.length ||
      binding.requiredTerms.some((term) => !TERM.test(term))) ||
    new Set(allTerms).size !== allTerms.length
  ) {
    fail('attribution-contract-invalid');
  }
  if (requiredAnswerTerms && !equal(sorted(allTerms), sorted(requiredAnswerTerms))) {
    fail('boundary-contract-drift');
  }
  return { ...contract, expectedSourceOrder, sourceBindings };
}

function emptyCounts(expectedSourceBlockCount = 0, expectedBoundTermCount = 0) {
  return {
    expectedSourceBlockCount,
    parsedSourceBlockCount: 0,
    expectedBoundTermCount,
    attributedBoundTermCount: 0,
    missingBoundTermCount: expectedBoundTermCount,
    summaryOnlyTermCount: 0,
    crossSourceTermCount: 0,
  };
}

function attributionResult(failureIds, counts) {
  const normalizedFailures = sorted(failureIds);
  const structural = normalizedFailures.some((id) => id === 'answer-contract-invalid' ||
    id === 'answer-control-character' || id === 'summary-missing' ||
    id.startsWith('source-marker-') || id.startsWith('reviewer-') ||
    id === 'claim-block-empty' || id === 'cited-source-order-mismatch');
  const normalizedCounts = structural
    ? { ...emptyCounts(counts.expectedSourceBlockCount, counts.expectedBoundTermCount), parsedSourceBlockCount: counts.parsedSourceBlockCount || 0 }
    : counts;
  return {
    counts: normalizedCounts,
    failureIds: normalizedFailures,
    metrics: {
      claimSourceAttributionRate: normalizedCounts.expectedBoundTermCount
        ? normalizedCounts.attributedBoundTermCount / normalizedCounts.expectedBoundTermCount
        : 0,
    },
    status: normalizedFailures.length ? 'failed' : 'passed',
  };
}

function malformedAnswer(answer) {
  return !answer || typeof answer !== 'object' || Array.isArray(answer) ||
    typeof answer.text !== 'string' || !Array.isArray(answer.citedSourceKeys) ||
    answer.citedSourceKeys.some((key) => typeof key !== 'string');
}

function parseEnvelope(answer, contract) {
  const failures = new Set();
  if (malformedAnswer(answer)) {
    return { claims: new Map(), failures: ['answer-contract-invalid'], parsedSourceBlockCount: 0 };
  }
  if (!equal(answer.citedSourceKeys, contract.expectedSourceOrder)) {
    failures.add('cited-source-order-mismatch');
  }
  if (/[\r\x00-\x09\x0B-\x1F]/.test(answer.text)) {
    failures.add('answer-control-character');
  }

  const lines = answer.text.split('\n');
  const reviewerIndexes = lines
    .map((line, index) => line.startsWith('Reviewer action:') ? index : -1)
    .filter((index) => index >= 0);
  if (reviewerIndexes.length === 0) failures.add('reviewer-boundary-missing');
  if (reviewerIndexes.length > 1) failures.add('reviewer-boundary-duplicate');
  const reviewerIndex = reviewerIndexes[0] ?? -1;
  if (reviewerIndex >= 0 && reviewerIndex !== lines.length - 1) {
    failures.add('source-marker-injection');
  }
  if (reviewerIndex >= 0 && !/^Reviewer action: [^\s].*$/.test(lines[reviewerIndex])) {
    failures.add('reviewer-action-empty');
  }
  if (reviewerIndex >= 0 && /Evidence \(|Reviewer action:/.test(lines[reviewerIndex].slice('Reviewer action: '.length))) {
    failures.add('source-marker-injection');
  }
  if (!lines[0] || lines[0].startsWith('Evidence (') || lines[0].startsWith('Reviewer action:')) {
    failures.add('summary-missing');
  }
  if (/Evidence \(|Reviewer action:/.test(lines[0] || '')) {
    failures.add('source-marker-injection');
  }

  const claims = new Map();
  const evidenceEnd = reviewerIndex >= 0 ? reviewerIndex : lines.length;
  for (let index = 1; index < evidenceEnd; index += 1) {
    const line = lines[index];
    const match = /^Evidence \(([^)]+)\): ([^\s].*)$/.exec(line);
    if (!match) {
      failures.add('source-marker-injection');
      continue;
    }
    const [, sourceKey, claim] = match;
    if (!contract.expectedSourceOrder.includes(sourceKey)) failures.add('source-marker-unknown');
    if (claims.has(sourceKey)) failures.add('source-marker-duplicate');
    if (!claim.trim()) failures.add('claim-block-empty');
    if (/Evidence \(|Reviewer action:/.test(claim)) failures.add('source-marker-injection');
    claims.set(sourceKey, claim);
  }
  for (const sourceKey of contract.expectedSourceOrder) {
    if (!claims.has(sourceKey)) failures.add('source-marker-missing');
  }
  if (!equal([...claims.keys()], contract.expectedSourceOrder)) {
    failures.add('source-marker-reordered');
  }
  return { claims, failures: sorted(failures), parsedSourceBlockCount: claims.size };
}

export function evaluateClaimSourceAttribution({ answer, attributionContract } = {}) {
  const contract = validateAttributionContract(attributionContract);
  const expectedBoundTermCount = contract.sourceBindings
    .flatMap((binding) => binding.requiredTerms).length;
  const parsed = parseEnvelope(answer, contract);
  if (parsed.failures.length) {
    return attributionResult(parsed.failures, {
      ...emptyCounts(contract.expectedSourceOrder.length, expectedBoundTermCount),
      parsedSourceBlockCount: parsed.parsedSourceBlockCount,
    });
  }

  const counts = emptyCounts(contract.expectedSourceOrder.length, expectedBoundTermCount);
  counts.parsedSourceBlockCount = parsed.parsedSourceBlockCount;
  counts.missingBoundTermCount = 0;
  const failures = new Set();
  const summary = answer.text.split('\n')[0];
  for (const binding of contract.sourceBindings) {
    const ownerClaim = parsed.claims.get(binding.sourceKey);
    for (const term of binding.requiredTerms) {
      const ownerCount = occurrenceCount(ownerClaim, term);
      const otherCount = [...parsed.claims]
        .filter(([sourceKey]) => sourceKey !== binding.sourceKey)
        .reduce((total, [, claim]) => total + occurrenceCount(claim, term), 0);
      if (otherCount > 0) {
        failures.add('cross-source-term');
        counts.crossSourceTermCount += 1;
      }
      if (ownerCount !== 1) {
        counts.missingBoundTermCount += 1;
        if (ownerCount === 0 && occurrenceCount(summary, term) > 0 && otherCount === 0) {
          failures.add('bound-term-summary-only');
          counts.summaryOnlyTermCount += 1;
        } else {
          failures.add('bound-term-missing');
        }
      } else if (otherCount === 0) {
        counts.attributedBoundTermCount += 1;
      }
    }
  }
  return attributionResult([...failures], counts);
}

function sanitizeObservation(observation) {
  if (!observation || typeof observation !== 'object') return null;
  const sanitized = {};
  for (const field of ['durationMs', 'outputBytes']) {
    if (Number.isFinite(observation[field])) sanitized[field] = observation[field];
  }
  for (const field of ['inputHash', 'responseHash']) {
    if (SHA256.test(text(observation[field]))) sanitized[field] = observation[field];
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

export async function coordinateClaimSourceAttribution(input = {}) {
  const q10 = await coordinateEvidenceGatedAnswer({
    get q9Case() { return input.q9Case; },
    get generator() { return input.generator; },
    get answerQualityContract() { return input.answerQualityContract; },
  });
  const base = {
    schemaVersion: CLAIM_SOURCE_ATTRIBUTION_RESULT_SCHEMA_VERSION,
    action: q10.action,
    answerQuality: q10.answerQuality,
    caseHash: q10.caseHash,
    generation: q10.generation,
    observation: sanitizeObservation(q10.observation),
    requestedClaimKeys: q10.requestedClaimKeys,
    state: q10.state,
  };
  if (q10.status !== 'answered-quality-passed') {
    return { ...base, attribution: null, status: q10.status };
  }
  const attribution = evaluateClaimSourceAttribution({
    answer: q10.answer,
    attributionContract: input.attributionContract,
  });
  return {
    ...base,
    attribution,
    status: attribution.status === 'passed'
      ? 'answered-attribution-passed'
      : 'answered-attribution-failed',
  };
}

export function assertClaimSourceAttributionFixture(fixture, q11Fixture) {
  if (!fixture || fixture.schemaVersion !== CLAIM_SOURCE_ATTRIBUTION_FIXTURE_SCHEMA_VERSION ||
    !equal(boundaryFlagsFor(fixture), BOUNDARY_FLAGS) ||
    !Array.isArray(fixture.cases) || fixture.cases.length !== 12 ||
    !Array.isArray(q11Fixture?.cases) || q11Fixture.cases.length !== 12) {
    fail('fixture-binding-drift');
  }
  const hashFields = [
    'q11FixtureFileHash', 'q11CoreFileHash', 'q10CoreFileHash', 'q9CoreFileHash',
    'q1EvaluatorFileHash', 'q7GeneratorFileHash', 'q12WriterFileHash',
    'q7EvidenceFileHash', 'q7PromptHash', 'q1ThresholdsHash',
    'q9DeterministicArtifactFileHash', 'q9LocalArtifactFileHash',
    'q10DeterministicArtifactFileHash', 'q10LocalArtifactFileHash',
    'q11DeterministicArtifactFileHash', 'q11LocalArtifactFileHash',
  ];
  if (hashFields.some((field) => !SHA256.test(text(fixture[field]))) ||
    fixture.q7PromptVersion !== 'personal-ai-agent-evidence-first-answer-prompt/v5') {
    fail('fixture-binding-drift');
  }
  for (let index = 0; index < fixture.cases.length; index += 1) {
    const row = fixture.cases[index];
    const q11 = q11Fixture.cases[index];
    if (row?.id !== q11?.id || row?.caseHash !== q11?.caseHash ||
      row?.expectedState !== q11?.expectedState || row?.expectedAction !== q11?.expectedAction) {
      fail('fixture-binding-drift');
    }
    if (q11.expectedState !== 'sufficient') {
      if (row.attributionContract !== undefined) fail('fixture-binding-drift');
      continue;
    }
    const contract = validateAttributionContract(row.attributionContract, q11.answerQualityContract);
    if (contract.caseHash !== q11.caseHash ||
      !equal(contract.expectedSourceOrder, q11.answerQualityContract.expectedSourceKeys)) {
      fail('boundary-contract-drift');
    }
    for (const binding of contract.sourceBindings) {
      const source = q11.q9Case.sources.find((item) => item.sourceKey === binding.sourceKey);
      if (!source) fail('source-bound-term-missing-from-source');
      for (const term of binding.requiredTerms) {
        const matchingSources = q11.q9Case.sources.filter((item) => occurrenceCount(item.text, term));
        if (!occurrenceCount(source.text, term)) fail('source-bound-term-missing-from-source');
        if (matchingSources.length > 1) fail('source-bound-term-cross-source');
        if (occurrenceCount(source.text, term) !== 1) fail('source-bound-term-ambiguous');
      }
    }
  }
  return fixture;
}

export function assertClaimSourceAttributionBindings(inputs = {}) {
  const fixture = parseJson(inputs.fixtureText, 'fixture-binding-drift');
  const q11Fixture = parseJson(inputs.q11FixtureText, 'fixture-binding-drift');
  assertClaimSourceAttributionFixture(fixture, q11Fixture);
  const boundFiles = {
    q11FixtureFileHash: inputs.q11FixtureText,
    q11CoreFileHash: inputs.q11CoreText,
    q10CoreFileHash: inputs.q10CoreText,
    q9CoreFileHash: inputs.q9CoreText,
    q1EvaluatorFileHash: inputs.q1EvaluatorText,
    q7GeneratorFileHash: inputs.q7GeneratorText,
    q12WriterFileHash: inputs.q12WriterText,
    q7EvidenceFileHash: inputs.q7EvidenceText,
    q9DeterministicArtifactFileHash: inputs.q9DeterministicArtifactText,
    q9LocalArtifactFileHash: inputs.q9LocalArtifactText,
    q10DeterministicArtifactFileHash: inputs.q10DeterministicArtifactText,
    q10LocalArtifactFileHash: inputs.q10LocalArtifactText,
    q11DeterministicArtifactFileHash: inputs.q11DeterministicArtifactText,
    q11LocalArtifactFileHash: inputs.q11LocalArtifactText,
  };
  if (Object.entries(boundFiles).some(([field, value]) => fixture[field] !== hash(value))) {
    fail('fixture-binding-drift');
  }
  return { fixture, q11Fixture };
}

function caseView(result, getterCounts) {
  return {
    action: result.action,
    answerQuality: result.answerQuality,
    attribution: result.attribution,
    caseHash: result.caseHash,
    generation: result.generation,
    getterCounts,
    observation: result.observation,
    state: result.state,
    status: result.status,
  };
}

function aggregateFor(cases, generatorGetterAccessCount, attributionContractGetterAccessCount) {
  const attributionPassCount = cases.filter((item) => item.attribution?.status === 'passed').length;
  return {
    attributionAttemptCount: cases.filter((item) => item.attribution).length,
    attributionContractGetterAccessCount,
    attributionPassCount,
    caseCount: cases.length,
    claimSourceAttributionRate: attributionPassCount / 4,
    gateBlockedCount: cases.filter((item) => !item.generation.attempted).length,
    generationAttemptCount: cases.filter((item) => item.generation.attempted).length,
    generatorGetterAccessCount,
    qualityPassCount: cases.filter((item) => item.answerQuality?.status === 'passed').length,
  };
}

export async function evaluateClaimSourceAttributionSuite({ fixture, q11Fixture, generator } = {}) {
  assertClaimSourceAttributionFixture(fixture, q11Fixture);
  const cases = [];
  let generatorGetterAccessCount = 0;
  let attributionContractGetterAccessCount = 0;
  for (let index = 0; index < fixture.cases.length; index += 1) {
    const row = fixture.cases[index];
    const q11 = q11Fixture.cases[index];
    let localGeneratorAccess = 0;
    let localQualityAccess = 0;
    let localAttributionAccess = 0;
    const result = await coordinateClaimSourceAttribution({
      get q9Case() { return q11.q9Case; },
      get generator() {
        generatorGetterAccessCount += 1;
        localGeneratorAccess += 1;
        return generator;
      },
      get answerQualityContract() {
        localQualityAccess += 1;
        return q11.answerQualityContract;
      },
      get attributionContract() {
        attributionContractGetterAccessCount += 1;
        localAttributionAccess += 1;
        return row.attributionContract;
      },
    });
    cases.push(caseView(result, {
      answerQualityContract: localQualityAccess,
      attributionContract: localAttributionAccess,
      generator: localGeneratorAccess,
    }));
  }
  return {
    aggregate: aggregateFor(cases, generatorGetterAccessCount, attributionContractGetterAccessCount),
    cases,
  };
}

export function assertClaimSourceAttributionCandidatePassed(suite) {
  if (!equal(suite?.aggregate, EXPECTED_AGGREGATE)) fail('candidate-pass-assertion-failed');
  return suite;
}

function assertNoForbiddenArtifactKeys(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (FORBIDDEN_ARTIFACT_KEYS.has(normalized)) fail('artifact-content-leak');
    assertNoForbiddenArtifactKeys(nested);
  }
}

export function buildClaimSourceAttributionArtifact({ fixtureText, suite } = {}) {
  assertClaimSourceAttributionCandidatePassed(suite);
  const content = {
    ...BOUNDARY_FLAGS,
    lexicalClaimSourceAttributionValidated: true,
    aggregate: suite.aggregate,
    fixtureHash: hash(fixtureText),
    schemaVersion: CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION,
  };
  const integrityHash = recordHash(content);
  return { ...content, id: `evidence-gated-answer-claim-attribution-${integrityHash}`, integrityHash };
}

export function assertClaimSourceAttributionArtifact(artifact, { fixtureText } = {}) {
  if (!hasExactKeys(artifact, ARTIFACT_KEYS)) fail('artifact-semantic-drift');
  const { id, integrityHash, ...content } = artifact;
  if (integrityHash !== recordHash(content) ||
    id !== `evidence-gated-answer-claim-attribution-${integrityHash}` ||
    content.schemaVersion !== CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION ||
    !equal(boundaryFlagsFor(content), BOUNDARY_FLAGS) ||
    !hasExactKeys(content.aggregate, Object.keys(EXPECTED_AGGREGATE)) ||
    !equal(content.aggregate, EXPECTED_AGGREGATE) ||
    content.lexicalClaimSourceAttributionValidated !== true ||
    !SHA256.test(text(content.fixtureHash)) ||
    (fixtureText && content.fixtureHash !== hash(fixtureText))) {
    fail('artifact-semantic-drift');
  }
  assertNoForbiddenArtifactKeys(artifact);
  return artifact;
}

export function assertContentFreeClaimSourceAttributionArtifact(artifact, forbiddenValues = []) {
  assertNoForbiddenArtifactKeys(artifact);
  const serialized = JSON.stringify(artifact);
  if (forbiddenValues.map(text).filter(Boolean).some((value) => serialized.includes(value))) {
    fail('artifact-content-leak');
  }
  return artifact;
}

export function buildLocalClaimSourceAttributionArtifact({ deterministicArtifact, model, observedAt, observations, runtime, suite } = {}) {
  const candidatePassed = equal(suite.aggregate, EXPECTED_AGGREGATE);
  const content = {
    ...BOUNDARY_FLAGS,
    actualModelEvaluated: true,
    deterministicArtifactHash: deterministicArtifact.integrityHash,
    fixtureHash: deterministicArtifact.fixtureHash,
    lexicalClaimSourceAttributionValidated: candidatePassed,
    model,
    observations: observations.map((item) => ({
      caseHash: item.caseHash,
      durationMs: item.durationMs,
      failureIds: sorted(item.failureIds || []),
      inputHash: item.inputHash ?? null,
      responseHash: item.responseHash ?? null,
    })),
    observedAt,
    runtime,
    schemaVersion: LOCAL_CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION,
    suiteAggregate: suite.aggregate,
  };
  const integrityHash = recordHash(content);
  return { ...content, id: `local-evidence-gated-answer-claim-attribution-${integrityHash}`, integrityHash };
}

function structurallyValidLocalAggregate(aggregate) {
  return hasExactKeys(aggregate, Object.keys(EXPECTED_AGGREGATE)) &&
    aggregate.caseCount === 12 && aggregate.gateBlockedCount === 8 &&
    aggregate.generationAttemptCount === 4 && aggregate.generatorGetterAccessCount === 4 &&
    Number.isInteger(aggregate.qualityPassCount) && aggregate.qualityPassCount >= 0 && aggregate.qualityPassCount <= 4 &&
    Number.isInteger(aggregate.attributionAttemptCount) && aggregate.attributionAttemptCount >= 0 && aggregate.attributionAttemptCount <= aggregate.qualityPassCount &&
    Number.isInteger(aggregate.attributionContractGetterAccessCount) && aggregate.attributionContractGetterAccessCount === aggregate.attributionAttemptCount &&
    Number.isInteger(aggregate.attributionPassCount) && aggregate.attributionPassCount >= 0 && aggregate.attributionPassCount <= aggregate.attributionAttemptCount &&
    aggregate.claimSourceAttributionRate === aggregate.attributionPassCount / 4;
}

export function assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixture, fixtureText, forbiddenValues = [], requireCandidatePass = false } = {}) {
  if (!deterministicArtifact || typeof fixtureText !== 'string') {
    fail('local-artifact-semantic-drift');
  }
  const parsedFixture = parseJson(fixtureText, 'local-artifact-semantic-drift');
  if (fixture && !equal(fixture, parsedFixture)) fail('local-artifact-semantic-drift');
  assertClaimSourceAttributionArtifact(deterministicArtifact, { fixtureText });
  if (!hasExactKeys(artifact, LOCAL_ARTIFACT_KEYS)) fail('local-artifact-semantic-drift');
  const { id, integrityHash, ...content } = artifact;
  const expectedHashes = Array.isArray(parsedFixture.cases)
    ? parsedFixture.cases
      .filter((row) => row.expectedState === 'sufficient')
      .map((row) => row.caseHash)
    : [];
  const validModel = hasExactKeys(content.model, ['digest', 'id', 'licenseHash', 'sizeBytes']) &&
    equal(content.model, FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.model);
  const validRuntime = hasExactKeys(content.runtime, ['cloudFeaturesDisabled', 'kind', 'transportLoopback', 'version']) &&
    equal(content.runtime, FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.runtime);
  const observationKinds = Array.isArray(content.observations)
    ? content.observations.map(classifyObservation)
    : [];
  const validObservations = Array.isArray(content.observations) &&
    content.observations.length === 4 &&
    expectedHashes.length === 4 &&
    equal(content.observations.map((item) => item.caseHash), expectedHashes) &&
    observationKinds.every(Boolean);
  const derivedAggregate = validObservations
    ? aggregateFromObservationKinds(observationKinds)
    : null;
  const candidatePassed = equal(derivedAggregate, EXPECTED_AGGREGATE);
  if (integrityHash !== recordHash(content) ||
    id !== `local-evidence-gated-answer-claim-attribution-${integrityHash}` ||
    content.schemaVersion !== LOCAL_CLAIM_SOURCE_ATTRIBUTION_ARTIFACT_SCHEMA_VERSION ||
    !equal(boundaryFlagsFor(content), BOUNDARY_FLAGS) || content.actualModelEvaluated !== true ||
    !SHA256.test(text(content.fixtureHash)) ||
    !SHA256.test(text(content.deterministicArtifactHash)) ||
    !structurallyValidLocalAggregate(content.suiteAggregate) ||
    !equal(content.suiteAggregate, derivedAggregate) ||
    content.lexicalClaimSourceAttributionValidated !== candidatePassed ||
    !validModel || !validRuntime || !validObservations ||
    !Number.isFinite(Date.parse(text(content.observedAt))) ||
    (fixtureText && content.fixtureHash !== hash(fixtureText)) ||
    (deterministicArtifact && content.deterministicArtifactHash !== deterministicArtifact.integrityHash)) {
    fail('local-artifact-semantic-drift');
  }
  if (requireCandidatePass && !candidatePassed) fail('candidate-pass-assertion-failed');
  assertContentFreeClaimSourceAttributionArtifact(artifact, forbiddenValues);
  return artifact;
}

function classifyObservation(item) {
  if (!hasExactKeys(item, ['caseHash', 'durationMs', 'failureIds', 'inputHash', 'responseHash']) ||
    !SHA256.test(text(item.caseHash)) || !Number.isFinite(item.durationMs) ||
    item.durationMs < 0 || !Array.isArray(item.failureIds) ||
    !equal(item.failureIds, sorted(item.failureIds))) {
    return null;
  }
  const ids = item.failureIds;
  const hashesPresent = SHA256.test(text(item.inputHash)) && SHA256.test(text(item.responseHash));
  if (ids.length === 1 && Q10_GENERATION_FAILURE_IDS.has(ids[0])) {
    return item.inputHash === null && item.responseHash === null ? 'generation-failed' : null;
  }
  if (!hashesPresent) return null;
  if (ids.length === 0) return 'attribution-passed';
  if (ids.every((id) => Q1_FAILURE_IDS.has(id))) return 'quality-failed';
  if (ids.every((id) => Q13_FAILURE_IDS.has(id))) return 'attribution-failed';
  return null;
}

function aggregateFromObservationKinds(kinds) {
  const count = (kind) => kinds.filter((item) => item === kind).length;
  const attributionPassCount = count('attribution-passed');
  const attributionFailureCount = count('attribution-failed');
  return {
    attributionAttemptCount: attributionFailureCount + attributionPassCount,
    attributionContractGetterAccessCount: attributionFailureCount + attributionPassCount,
    attributionPassCount,
    caseCount: 12,
    claimSourceAttributionRate: attributionPassCount / 4,
    gateBlockedCount: 8,
    generationAttemptCount: 4,
    generatorGetterAccessCount: 4,
    qualityPassCount: attributionFailureCount + attributionPassCount,
  };
}
