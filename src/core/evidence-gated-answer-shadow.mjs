import { createHash } from 'node:crypto';

import {
  DEFAULT_ANSWER_QUALITY_THRESHOLDS,
  evaluateAnswerQualityCase,
} from './answer-quality-evaluation.mjs';
import {
  assertLocalAnswerReviewActionGeneralization,
} from './local-answer-review-action-generalization.mjs';
import {
  assertLocalRagEvidenceSufficiencyShadow,
  assertRagEvidenceSufficiencyFixtureBinding,
  evaluateRagEvidenceSufficiencyCase,
  RAG_EVIDENCE_SUFFICIENCY_POLICY,
} from './rag-evidence-sufficiency-evaluation.mjs';

export const EVIDENCE_GATED_ANSWER_FIXTURE_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-fixture/v1';
export const EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION =
  'personal-ai-agent-evidence-gated-answer-shadow/v1';
export const LOCAL_EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION =
  'personal-ai-agent-local-evidence-gated-answer-shadow/v1';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXPECTED_STATE_COUNTS = Object.freeze({
  conflicting: 1,
  irrelevant: 1,
  'no-evidence': 1,
  partial: 1,
  sufficient: 1,
});
const EXPECTED_LOCAL_OUTCOME = Object.freeze({
  generationStatus: 'passed',
  qualityStatus: 'passed',
  syntheticSufficientCasePassed: true,
});
const GENERATION_FAILURE_KINDS = new Set([
  'generation-contract-error',
  'generation-timeout',
  'incomplete-source-coverage',
  'invalid-review-action',
  'invalid-structured-output',
  'model-attribution-drift',
]);

function text(value) {
  return String(value || '').trim();
}

export function hashEvidenceGatedAnswerValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function hashEvidenceGatedAnswerRecord(value) {
  return hashEvidenceGatedAnswerValue(JSON.stringify(value));
}

function fail(code) {
  throw new Error(`Evidence-gated answer shadow failed: ${code}.`);
}

function ensureUniqueTextList(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${field}-invalid`);
  }
  const items = value.map(text);
  if (
    items.some((item) => !item || item.length > 500) ||
    new Set(items).size !== items.length
  ) {
    fail(`${field}-invalid`);
  }
  return items;
}

function recordsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sorted(items) {
  return [...items].sort();
}

function thresholdsAreFrozen(value) {
  return (
    value &&
    typeof value === 'object' &&
    recordsEqual(
      Object.fromEntries(Object.entries(value).sort()),
      Object.fromEntries(
        Object.entries(DEFAULT_ANSWER_QUALITY_THRESHOLDS).sort(),
      ),
    )
  );
}

function classifyGenerationFailure(error) {
  const message = text(error?.message).toLowerCase();
  if (message.includes('timeout') || error?.name === 'AbortError') {
    return 'generation-timeout';
  }
  if (message.includes('source coverage')) {
    return 'incomplete-source-coverage';
  }
  if (message.includes('review action')) {
    return 'invalid-review-action';
  }
  if (message.includes('structured') || message.includes('json')) {
    return 'invalid-structured-output';
  }
  if (message.includes('another model') || message.includes('attribution')) {
    return 'model-attribution-drift';
  }
  return 'generation-contract-error';
}

function validateAnswerQualityContract(contract, q9Case, q9Result) {
  if (!contract || typeof contract !== 'object') {
    fail('answer-quality-contract-invalid');
  }
  if (text(contract.caseHash) !== q9Result.caseHash) {
    fail('answer-quality-contract-invalid');
  }

  const expectedSourceKeys = ensureUniqueTextList(
    contract.expectedSourceKeys,
    'answer-quality-contract',
    { allowEmpty: false },
  );
  const sourceKeys = ensureUniqueTextList(
    q9Case.sources?.map((source) => source?.sourceKey),
    'q9-source-set',
    { allowEmpty: false },
  );
  if (!recordsEqual(sorted(expectedSourceKeys), sorted(sourceKeys))) {
    fail('answer-quality-contract-invalid');
  }

  const requiredAnswerTerms = ensureUniqueTextList(
    contract.requiredAnswerTerms,
    'answer-quality-contract',
    { allowEmpty: false },
  );
  const forbiddenAnswerTerms = ensureUniqueTextList(
    contract.forbiddenAnswerTerms,
    'answer-quality-contract',
    { allowEmpty: false },
  );
  const forbiddenSourceKeys = ensureUniqueTextList(
    contract.forbiddenSourceKeys,
    'answer-quality-contract',
  );
  if (text(contract.reviewerVerdict).toLowerCase() !== 'pass') {
    fail('answer-quality-contract-invalid');
  }
  if (!thresholdsAreFrozen(contract.thresholds)) {
    fail('threshold-contract-drift');
  }
  if (
    !SHA256_PATTERN.test(text(contract.promptHash)) ||
    !text(contract.promptVersion)
  ) {
    fail('answer-quality-contract-invalid');
  }

  return {
    caseHash: q9Result.caseHash,
    expectedSourceKeys,
    forbiddenAnswerTerms,
    forbiddenSourceKeys,
    promptHash: text(contract.promptHash),
    promptVersion: text(contract.promptVersion),
    requiredAnswerTerms,
    reviewerVerdict: 'pass',
    thresholds: { ...DEFAULT_ANSWER_QUALITY_THRESHOLDS },
  };
}

function blockedResult(q9Result) {
  return {
    action: q9Result.action,
    answer: null,
    answerQuality: null,
    caseHash: q9Result.caseHash,
    generation: {
      attempted: false,
      failureKind: null,
      status: 'blocked-by-gate',
    },
    observation: null,
    requestedClaimKeys: [...q9Result.requestedClaimKeys],
    state: q9Result.state,
    status: q9Result.action === 'abstain' ? 'abstained' : 'evidence-requested',
  };
}

export async function coordinateEvidenceGatedAnswer(input = {}) {
  const q9Case = input.q9Case;
  const q9Result = evaluateRagEvidenceSufficiencyCase(q9Case);
  if (q9Result.action !== 'answer') {
    return blockedResult(q9Result);
  }

  const answerQualityContract = input.answerQualityContract;
  const generator = input.generator;
  const contract = validateAnswerQualityContract(
    answerQualityContract,
    q9Case,
    q9Result,
  );
  if (!generator || typeof generator !== 'object') {
    fail('generation-contract-error');
  }
  if (text(generator.promptHash) !== contract.promptHash) {
    fail('prompt-hash-drift');
  }
  if (text(generator.promptVersion) !== contract.promptVersion) {
    fail('prompt-version-drift');
  }
  if (typeof generator.generate !== 'function') {
    fail('generation-contract-error');
  }

  const retrievedItems = q9Case.sources.map((source) => ({
    snippet: source.text,
    sourceKey: source.sourceKey,
  }));
  let generated;
  try {
    generated = await generator.generate({
      objective: q9Case.objective,
      retrievedItems,
    });
  } catch (error) {
    const failureKind = classifyGenerationFailure(error);
    return {
      action: q9Result.action,
      answer: null,
      answerQuality: null,
      caseHash: q9Result.caseHash,
      generation: {
        attempted: true,
        failureKind,
        status: 'failed',
      },
      observation: null,
      requestedClaimKeys: [],
      state: q9Result.state,
      status: 'answer-generation-failed',
    };
  }

  const quality = evaluateAnswerQualityCase(
    {
      answer: generated?.answer,
      expectedSourceKeys: contract.expectedSourceKeys,
      forbiddenAnswerTerms: contract.forbiddenAnswerTerms,
      forbiddenSourceKeys: contract.forbiddenSourceKeys,
      id: q9Result.id,
      requiredAnswerTerms: contract.requiredAnswerTerms,
      retrievedItems,
      reviewerVerdict: contract.reviewerVerdict,
    },
    { thresholds: contract.thresholds },
  );
  const passed = quality.status === 'passed';
  return {
    action: q9Result.action,
    answer: generated?.answer || null,
    answerQuality: {
      counts: quality.counts,
      failureCheckIds: quality.failures.map((failure) => failure.check),
      metrics: quality.metrics,
      status: quality.status,
    },
    caseHash: q9Result.caseHash,
    generation: {
      attempted: true,
      failureKind: null,
      status: 'passed',
    },
    observation: generated?.observation || null,
    requestedClaimKeys: [],
    state: q9Result.state,
    status: passed ? 'answered-quality-passed' : 'answered-quality-failed',
  };
}

function validateFixtureBoundaries(fixture) {
  if (
    fixture?.currentAnswerPathChanged !== false ||
    fixture?.runtimeActivation !== false ||
    fixture?.trainingAuthorized !== false ||
    fixture?.actualUserQueryData !== false ||
    fixture?.productionReadyClaim !== false ||
    fixture?.externalProviderCalls !== 'none'
  ) {
    fail('q10-contract-fixture-drift');
  }
}

function validateHashField(value, code) {
  if (!SHA256_PATTERN.test(text(value))) {
    fail(code);
  }
  return text(value);
}

function parseBoundJson(value, code) {
  try {
    return JSON.parse(String(value));
  } catch {
    fail(code);
  }
}

export function assertEvidenceGatedAnswerBindings({
  fixtureText,
  q7EvidenceText,
  q9ArtifactText,
  q9FixtureText,
  q9LocalArtifactText,
} = {}) {
  const fixture = parseBoundJson(
    fixtureText,
    'q10-contract-fixture-drift',
  );
  const q9Artifact = parseBoundJson(
    q9ArtifactText,
    'q9-artifact-binding-drift',
  );
  const q9LocalArtifact = parseBoundJson(
    q9LocalArtifactText,
    'q9-shadow-history-drift',
  );
  const q7Evidence = parseBoundJson(q7EvidenceText, 'q7-baseline-drift');
  const { fixture: q9Fixture } =
    assertRagEvidenceSufficiencyFixtureBinding(
      q9Artifact,
      q9FixtureText,
    );
  assertLocalRagEvidenceSufficiencyShadow(q9LocalArtifact, {
    deterministicArtifact: q9Artifact,
    inferenceContractHash: q9LocalArtifact.inferenceContractHash,
  });
  assertLocalAnswerReviewActionGeneralization(q7Evidence);
  assertEvidenceGatedAnswerFixture(fixture, { q9Fixture });

  if (
    fixture.q9FixtureHash !==
      hashEvidenceGatedAnswerValue(q9FixtureText) ||
    fixture.q9DeterministicArtifactFileHash !==
      hashEvidenceGatedAnswerValue(q9ArtifactText) ||
    fixture.q9DeterministicArtifactHash !== q9Artifact.integrityHash ||
    fixture.q9LocalShadowArtifactFileHash !==
      hashEvidenceGatedAnswerValue(q9LocalArtifactText) ||
    fixture.q9LocalShadowArtifactHash !==
      q9LocalArtifact.integrityHash ||
    fixture.q9PolicyHash !== q9Artifact.policyHash
  ) {
    fail('q9-artifact-binding-drift');
  }
  const priorFailure = q9LocalArtifact.observations?.find(
    (item) =>
      item.failureCodes?.includes('unnecessary-abstention'),
  );
  if (
    q9LocalArtifact.aggregate?.caseCount !== 5 ||
    q9LocalArtifact.aggregate?.modelFailureCount !== 1 ||
    q9LocalArtifact.aggregate?.modelConforms !== false ||
    !priorFailure
  ) {
    fail('q9-shadow-history-drift');
  }
  if (
    fixture.q7EvidenceFileHash !==
      hashEvidenceGatedAnswerValue(q7EvidenceText) ||
    fixture.q7EvidenceHash !== q7Evidence.evidenceHash ||
    fixture.q7PromptHash !== q7Evidence.prompt?.candidateHash ||
    fixture.q7PromptVersion !== q7Evidence.prompt?.candidateVersion
  ) {
    fail('q7-baseline-drift');
  }
  if (
    q7Evidence.model?.id !== q9LocalArtifact.model?.id ||
    q7Evidence.model?.digest !== q9LocalArtifact.model?.digest ||
    q7Evidence.runtime?.version !== q9LocalArtifact.runtime?.version
  ) {
    fail('q7-baseline-drift');
  }

  const sufficientBinding = fixture.cases.find(
    (item) => item.expectedState === 'sufficient',
  );
  if (
    sufficientBinding?.answerQualityContract?.promptHash !==
      fixture.q7PromptHash ||
    sufficientBinding?.answerQualityContract?.promptVersion !==
      fixture.q7PromptVersion
  ) {
    fail('q7-baseline-drift');
  }
  return {
    fixture,
    q7Evidence,
    q9Artifact,
    q9Fixture,
    q9LocalArtifact,
  };
}

export function assertEvidenceGatedAnswerFixture(fixture, { q9Fixture } = {}) {
  if (
    text(fixture?.schemaVersion) !==
    EVIDENCE_GATED_ANSWER_FIXTURE_SCHEMA_VERSION
  ) {
    fail('q10-contract-fixture-drift');
  }
  validateFixtureBoundaries(fixture);
  const hashFields = [
    'q9FixtureHash',
    'q9DeterministicArtifactHash',
    'q9DeterministicArtifactFileHash',
    'q9LocalShadowArtifactHash',
    'q9LocalShadowArtifactFileHash',
    'q9PolicyHash',
    'q7EvidenceHash',
    'q7EvidenceFileHash',
    'q7PromptHash',
    'thresholdsHash',
  ];
  for (const field of hashFields) {
    validateHashField(fixture?.[field], 'q10-contract-fixture-drift');
  }
  if (!thresholdsAreFrozen(fixture?.thresholds)) {
    fail('threshold-contract-drift');
  }
  if (
    fixture.thresholdsHash !==
    hashEvidenceGatedAnswerRecord(DEFAULT_ANSWER_QUALITY_THRESHOLDS)
  ) {
    fail('threshold-contract-drift');
  }
  if (!text(fixture?.q7PromptVersion)) {
    fail('q10-contract-fixture-drift');
  }
  if (
    !recordsEqual(
      fixture?.expectedLocalOutcome,
      EXPECTED_LOCAL_OUTCOME,
    )
  ) {
    fail('q10-contract-fixture-drift');
  }
  if (!Array.isArray(fixture?.cases) || fixture.cases.length !== 5) {
    fail('q10-contract-fixture-drift');
  }
  const caseHashes = fixture.cases.map((item) =>
    validateHashField(item?.caseHash, 'q10-contract-fixture-drift'),
  );
  if (new Set(caseHashes).size !== caseHashes.length) {
    fail('q10-contract-fixture-drift');
  }

  const stateCounts = Object.fromEntries(
    Object.keys(EXPECTED_STATE_COUNTS).map((state) => [state, 0]),
  );
  for (const item of fixture.cases) {
    const state = text(item?.expectedState);
    const action = text(item?.expectedAction);
    const expectedCalls = Number(item?.expectedGeneratorCallCount);
    if (
      RAG_EVIDENCE_SUFFICIENCY_POLICY.actions[state] !== action ||
      !Number.isSafeInteger(expectedCalls) ||
      expectedCalls !== (state === 'sufficient' ? 1 : 0)
    ) {
      fail('q10-contract-fixture-drift');
    }
    stateCounts[state] += 1;
    if (state === 'sufficient') {
      const result = { caseHash: item.caseHash };
      const sourceCase = q9Fixture?.cases?.find(
        (candidate) =>
          evaluateRagEvidenceSufficiencyCase(candidate).caseHash ===
          item.caseHash,
      );
      if (sourceCase) {
        validateAnswerQualityContract(
          item.answerQualityContract,
          sourceCase,
          result,
        );
      } else if (!item.answerQualityContract) {
        fail('answer-quality-contract-invalid');
      }
    } else if (item.answerQualityContract !== undefined) {
      fail('q10-contract-fixture-drift');
    }
  }
  if (!recordsEqual(stateCounts, EXPECTED_STATE_COUNTS)) {
    fail('q10-contract-fixture-drift');
  }

  if (q9Fixture) {
    const q9Results = q9Fixture.cases.map(
      evaluateRagEvidenceSufficiencyCase,
    );
    for (const item of fixture.cases) {
      const result = q9Results.find(
        (candidate) => candidate.caseHash === item.caseHash,
      );
      if (
        !result ||
        result.state !== item.expectedState ||
        result.action !== item.expectedAction
      ) {
        fail('q9-fixture-binding-drift');
      }
    }
  }
  return fixture;
}

export async function evaluateEvidenceGatedAnswerSuite({
  fixture,
  generator,
  q9Fixture,
} = {}) {
  assertEvidenceGatedAnswerFixture(fixture, { q9Fixture });
  const bindings = new Map(
    fixture.cases.map((item) => [item.caseHash, item]),
  );
  const cases = [];
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
  for (const q9Case of q9Fixture.cases) {
    const q9Result = evaluateRagEvidenceSufficiencyCase(q9Case);
    const binding = bindings.get(q9Result.caseHash);
    if (!binding) {
      fail('q9-fixture-binding-drift');
    }
    const result = await coordinateEvidenceGatedAnswer({
      answerQualityContract: binding.answerQualityContract,
      generator: countingGenerator,
      q9Case,
    });
    cases.push(result);
  }
  cases.sort((left, right) => left.caseHash.localeCompare(right.caseHash));
  const generationAttemptCount = cases.filter(
    (item) => item.generation.attempted,
  ).length;
  return {
    aggregate: {
      caseCount: cases.length,
      gateBlockedCount: cases.length - generationAttemptCount,
      generationAttemptCount,
      generatorCallCount,
      qualityPassCount: cases.filter(
        (item) => item.answerQuality?.status === 'passed',
      ).length,
    },
    cases,
  };
}

function contentFreeCase(result) {
  return {
    action: result.action,
    answerQuality: result.answerQuality
      ? {
          counts: result.answerQuality.counts,
          failureCheckIds: result.answerQuality.failureCheckIds,
          metrics: result.answerQuality.metrics,
          status: result.answerQuality.status,
        }
      : null,
    caseHash: result.caseHash,
    generation: result.generation,
    requestedClaimHashes: result.requestedClaimKeys.map(
      hashEvidenceGatedAnswerValue,
    ),
    state: result.state,
    status: result.status,
  };
}

export function buildEvidenceGatedAnswerArtifact({
  fixtureHash,
  suite,
  bindings,
} = {}) {
  validateHashField(fixtureHash, 'q10-contract-fixture-drift');
  if (!suite?.cases || !bindings) {
    fail('artifact-contract-invalid');
  }
  const content = {
    actualUserQueryData: false,
    aggregate: {
      ...suite.aggregate,
      fakeGeneratorCallCount: suite.aggregate.generatorCallCount,
    },
    cases: suite.cases.map(contentFreeCase),
    currentAnswerPathChanged: false,
    externalProviderCalls: 'none',
    fixtureHash,
    productionReadyClaim: false,
    q7EvidenceHash: bindings.q7EvidenceHash,
    q7PromptHash: bindings.q7PromptHash,
    q7PromptVersion: bindings.q7PromptVersion,
    q9DeterministicArtifactHash:
      bindings.q9DeterministicArtifactHash,
    q9FixtureHash: bindings.q9FixtureHash,
    q9PolicyHash: bindings.q9PolicyHash,
    reviewerProvenance: {
      independentReviewerValidated: false,
      reviewerVerdictSource: 'synthetic-fixture-oracle',
    },
    runtimeActivation: false,
    schemaVersion: EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION,
    thresholdsHash: bindings.thresholdsHash,
    trainingAuthorized: false,
  };
  const integrityHash = hashEvidenceGatedAnswerRecord(content);
  return {
    ...content,
    id: `evidence-gated-answer-shadow-${integrityHash}`,
    integrityHash,
  };
}

export function assertEvidenceGatedAnswerArtifact(artifact) {
  const { id, integrityHash, ...content } = artifact || {};
  const expectedHash = hashEvidenceGatedAnswerRecord(content);
  if (
    integrityHash !== expectedHash ||
    id !== `evidence-gated-answer-shadow-${expectedHash}`
  ) {
    fail('artifact-integrity');
  }
  validateFixtureBoundaries(content);
  const stateCounts = Object.fromEntries(
    Object.keys(EXPECTED_STATE_COUNTS).map((state) => [state, 0]),
  );
  let casesAreValid =
    Array.isArray(content.cases) &&
    content.cases.length === 5 &&
    new Set(content.cases.map((item) => item?.caseHash)).size === 5;
  if (casesAreValid) {
    for (const item of content.cases) {
      const expectedAction =
        RAG_EVIDENCE_SUFFICIENCY_POLICY.actions[item?.state];
      const isSufficient = item?.state === 'sufficient';
      const shouldRequest =
        item?.state === 'partial' || item?.state === 'irrelevant';
      casesAreValid =
        casesAreValid &&
        SHA256_PATTERN.test(text(item?.caseHash)) &&
        item?.action === expectedAction &&
        item?.generation?.attempted === isSufficient &&
        item?.generation?.status ===
          (isSufficient ? 'passed' : 'blocked-by-gate') &&
        item?.generation?.failureKind === null &&
        (item?.answerQuality !== null) === isSufficient &&
        item?.status ===
          (isSufficient
            ? 'answered-quality-passed'
            : shouldRequest
              ? 'evidence-requested'
              : 'abstained') &&
        Array.isArray(item?.requestedClaimHashes) &&
        item.requestedClaimHashes.every((value) =>
          SHA256_PATTERN.test(text(value))) &&
        (shouldRequest
          ? item.requestedClaimHashes.length > 0
          : item.requestedClaimHashes.length === 0);
      if (isSufficient) {
        casesAreValid =
          casesAreValid &&
          item.answerQuality?.status === 'passed' &&
          item.answerQuality?.failureCheckIds?.length === 0;
      }
      if (Object.hasOwn(stateCounts, item?.state)) {
        stateCounts[item.state] += 1;
      }
    }
  }
  if (
    content.schemaVersion !== EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION ||
    !recordsEqual(content.aggregate, {
      caseCount: 5,
      gateBlockedCount: 4,
      generationAttemptCount: 1,
      generatorCallCount: 1,
      qualityPassCount: 1,
      fakeGeneratorCallCount: 1,
    }) ||
    content.reviewerProvenance?.reviewerVerdictSource !==
      'synthetic-fixture-oracle' ||
    content.reviewerProvenance?.independentReviewerValidated !== false ||
    !casesAreValid ||
    !recordsEqual(stateCounts, EXPECTED_STATE_COUNTS)
  ) {
    fail('artifact-semantic-drift');
  }
  return artifact;
}

export function assertLocalEvidenceGatedAnswerAttributionStable({
  after,
  before,
} = {}) {
  if (!before || !after || !recordsEqual(before, after)) {
    fail('model-attribution-drift');
  }
  return after;
}

export function buildLocalEvidenceGatedAnswerShadow({
  deterministicArtifact,
  fixture,
  model,
  observedAt,
  priorQ9Shadow,
  q9Case,
  result,
  runtime,
} = {}) {
  assertEvidenceGatedAnswerArtifact(deterministicArtifact);
  assertEvidenceGatedAnswerFixture(fixture);
  const timestamp = text(observedAt);
  if (!Number.isFinite(Date.parse(timestamp))) {
    fail('local-artifact-contract-invalid');
  }
  if (
    !model ||
    !text(model.id) ||
    !SHA256_PATTERN.test(text(model.digest)) ||
    !Number.isSafeInteger(model.sizeBytes) ||
    model.sizeBytes <= 0 ||
    !SHA256_PATTERN.test(text(model.licenseHash))
  ) {
    fail('local-artifact-contract-invalid');
  }
  if (
    !runtime ||
    runtime.transportLoopback !== true ||
    runtime.cloudFeaturesDisabled !== true ||
    text(runtime.kind) !== 'ollama' ||
    !text(runtime.version)
  ) {
    fail('local-artifact-contract-invalid');
  }
  if (
    priorQ9Shadow?.aggregate?.caseCount !== 5 ||
    priorQ9Shadow?.aggregate?.modelFailureCount !== 1 ||
    priorQ9Shadow?.aggregate?.modelConforms !== false ||
    !SHA256_PATTERN.test(text(priorQ9Shadow?.integrityHash))
  ) {
    fail('q9-shadow-history-drift');
  }
  if (
    result?.state !== 'sufficient' ||
    result?.action !== 'answer' ||
    result?.generation?.attempted !== true ||
    !result?.answerQuality ||
    !result?.observation
  ) {
    fail('local-artifact-contract-invalid');
  }
  const observation = result.observation;
  if (
    !SHA256_PATTERN.test(text(observation.inputHash)) ||
    !SHA256_PATTERN.test(text(observation.responseHash)) ||
    !Number.isFinite(Number(observation.durationMs)) ||
    Number(observation.durationMs) < 0 ||
    !Number.isSafeInteger(Number(observation.outputBytes)) ||
    Number(observation.outputBytes) <= 0 ||
    text(observation.promptHash) !== fixture.q7PromptHash ||
    text(observation.promptVersion) !== fixture.q7PromptVersion
  ) {
    fail('local-artifact-contract-invalid');
  }
  const observedLocalOutcome = {
    generationStatus: result.generation.status,
    qualityStatus: result.answerQuality.status,
    syntheticSufficientCasePassed:
      result.answerQuality.status === 'passed',
  };
  if (
    !recordsEqual(
      observedLocalOutcome,
      fixture.expectedLocalOutcome,
    )
  ) {
    fail('local-artifact-contract-invalid');
  }

  const content = {
    actualModelEvaluated: true,
    actualUserQueryData: false,
    aggregate: {
      gateBlockedCount: deterministicArtifact.aggregate.gateBlockedCount,
      generationAttemptCount: 1,
      syntheticSufficientCasePassed:
        result.answerQuality.status === 'passed',
      qualityPassCount: result.answerQuality.status === 'passed' ? 1 : 0,
    },
    currentAnswerPathChanged: false,
    deterministicArtifactHash: deterministicArtifact.integrityHash,
    externalProviderCalls: 'none',
    fixtureHash: deterministicArtifact.fixtureHash,
    model: {
      digest: text(model.digest),
      id: text(model.id),
      licenseHash: text(model.licenseHash),
      sizeBytes: model.sizeBytes,
    },
    observation: {
      caseHash: result.caseHash,
      citedSourceHashes: sorted(
        (result.answer?.citedSourceKeys || []).map(
          hashEvidenceGatedAnswerValue,
        ),
      ),
      durationMs: Number(observation.durationMs),
      generationFailureKind: result.generation.failureKind,
      generationStatus: result.generation.status,
      inputHash: text(observation.inputHash),
      outputBytes: Number(observation.outputBytes),
      promptHash: text(observation.promptHash),
      promptVersion: text(observation.promptVersion),
      qualityFailureCheckIds: [
        ...result.answerQuality.failureCheckIds,
      ],
      qualityMetrics: result.answerQuality.metrics,
      qualityStatus: result.answerQuality.status,
      responseHash: text(observation.responseHash),
      sourceHashes: sorted(
        (q9Case?.sources || []).map((source) =>
          hashEvidenceGatedAnswerValue(source?.sourceKey),
        ),
      ),
    },
    observedAt: timestamp,
    priorQ9Shadow: {
      failureCodes: ['unnecessary-abstention'],
      integrityHash: priorQ9Shadow.integrityHash,
      modelConforms: false,
      modelFailureCount: 1,
    },
    productionReadyClaim: false,
    q7EvidenceHash: fixture.q7EvidenceHash,
    reviewerProvenance: {
      independentReviewerValidated: false,
      reviewerVerdictSource: 'synthetic-fixture-oracle',
    },
    runtime: {
      cloudFeaturesDisabled: true,
      externalProviderCalls: 'none',
      kind: 'ollama',
      transportLoopback: true,
      version: text(runtime.version),
    },
    runtimeActivation: false,
    schemaVersion:
      LOCAL_EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION,
    trainingAuthorized: false,
  };
  const integrityHash = hashEvidenceGatedAnswerRecord(content);
  return {
    ...content,
    id: `local-evidence-gated-answer-shadow-${integrityHash}`,
    integrityHash,
  };
}

export function assertLocalEvidenceGatedAnswerShadow(
  artifact,
  {
    deterministicArtifact,
    fixture,
    priorQ9Shadow,
    q7Evidence,
  } = {},
) {
  const { id, integrityHash, ...content } = artifact || {};
  const expectedHash = hashEvidenceGatedAnswerRecord(content);
  if (
    integrityHash !== expectedHash ||
    id !== `local-evidence-gated-answer-shadow-${expectedHash}`
  ) {
    fail('local-artifact-integrity');
  }
  validateFixtureBoundaries(content);
  const observation = content.observation || {};
  const qualityPassed = observation.qualityStatus === 'passed';
  const hashArrays = [
    observation.citedSourceHashes,
    observation.sourceHashes,
  ];
  const hashesValid = hashArrays.every(
    (items) =>
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((value) => SHA256_PATTERN.test(text(value))) &&
      new Set(items).size === items.length,
  );
  if (
    content.schemaVersion !==
      LOCAL_EVIDENCE_GATED_ANSWER_SHADOW_SCHEMA_VERSION ||
    content.actualModelEvaluated !== true ||
    !recordsEqual(content.aggregate, {
      gateBlockedCount: 4,
      generationAttemptCount: 1,
      syntheticSufficientCasePassed: true,
      qualityPassCount: 1,
    }) ||
    content.aggregate.syntheticSufficientCasePassed !== qualityPassed ||
    content.priorQ9Shadow?.modelConforms !== false ||
    content.priorQ9Shadow?.modelFailureCount !== 1 ||
    !recordsEqual(
      content.priorQ9Shadow?.failureCodes,
      ['unnecessary-abstention'],
    ) ||
    content.reviewerProvenance?.independentReviewerValidated !== false ||
    content.reviewerProvenance?.reviewerVerdictSource !==
      'synthetic-fixture-oracle' ||
    content.runtime?.transportLoopback !== true ||
    content.runtime?.cloudFeaturesDisabled !== true ||
    content.runtime?.externalProviderCalls !== 'none' ||
    content.runtime?.kind !== 'ollama' ||
    !text(content.runtime?.version) ||
    !Number.isFinite(Date.parse(text(content.observedAt))) ||
    !SHA256_PATTERN.test(text(content.model?.digest)) ||
    !SHA256_PATTERN.test(text(content.model?.licenseHash)) ||
    !Number.isSafeInteger(content.model?.sizeBytes) ||
    content.model.sizeBytes <= 0 ||
    !text(content.model?.id) ||
    !SHA256_PATTERN.test(text(content.deterministicArtifactHash)) ||
    !SHA256_PATTERN.test(text(content.fixtureHash)) ||
    !SHA256_PATTERN.test(text(content.q7EvidenceHash)) ||
    !SHA256_PATTERN.test(text(content.priorQ9Shadow?.integrityHash)) ||
    !SHA256_PATTERN.test(text(observation.caseHash)) ||
    !SHA256_PATTERN.test(text(observation.inputHash)) ||
    !SHA256_PATTERN.test(text(observation.responseHash)) ||
    !SHA256_PATTERN.test(text(observation.promptHash)) ||
    !text(observation.promptVersion) ||
    observation.generationStatus !== 'passed' ||
    observation.generationFailureKind !== null ||
    !['passed', 'failed'].includes(observation.qualityStatus) ||
    !Array.isArray(observation.qualityFailureCheckIds) ||
    (qualityPassed
      ? observation.qualityFailureCheckIds.length !== 0 ||
        !recordsEqual(
          observation.citedSourceHashes,
          observation.sourceHashes,
        ) ||
        observation.qualityMetrics?.citationGroundingRate !== 1 ||
        observation.qualityMetrics?.expectedSourceCitationRate !== 1 ||
        observation.qualityMetrics?.requiredTermCoverage !== 1 ||
        observation.qualityMetrics?.retrievalHitRate !== 1 ||
        observation.qualityMetrics?.unsupportedCitationRate !== 0 ||
        observation.qualityMetrics?.forbiddenRetrievedSourceCount !== 0 ||
        observation.qualityMetrics?.forbiddenTermMatchCount !== 0
      : observation.qualityFailureCheckIds.length === 0) ||
    !hashesValid
  ) {
    fail('local-artifact-semantic-drift');
  }
  if (deterministicArtifact) {
    assertEvidenceGatedAnswerArtifact(deterministicArtifact);
    const sufficientCase = deterministicArtifact.cases.find(
      (item) => item.state === 'sufficient',
    );
    if (
      content.deterministicArtifactHash !==
        deterministicArtifact.integrityHash ||
      content.fixtureHash !== deterministicArtifact.fixtureHash ||
      observation.caseHash !== sufficientCase?.caseHash
    ) {
      fail('local-artifact-semantic-drift');
    }
  }
  if (
    fixture &&
    (content.q7EvidenceHash !== fixture.q7EvidenceHash ||
      observation.promptHash !== fixture.q7PromptHash ||
      observation.promptVersion !== fixture.q7PromptVersion ||
      !recordsEqual(
        {
          generationStatus: observation.generationStatus,
          qualityStatus: observation.qualityStatus,
          syntheticSufficientCasePassed:
            content.aggregate.syntheticSufficientCasePassed,
        },
        fixture.expectedLocalOutcome,
      ))
  ) {
    fail('local-artifact-semantic-drift');
  }
  if (
    q7Evidence &&
    (content.q7EvidenceHash !== q7Evidence.evidenceHash ||
      content.model?.id !== q7Evidence.model?.id ||
      content.model?.digest !== q7Evidence.model?.digest ||
      content.model?.sizeBytes !== q7Evidence.model?.sizeBytes ||
      content.runtime?.version !== q7Evidence.runtime?.version)
  ) {
    fail('local-artifact-semantic-drift');
  }
  if (
    priorQ9Shadow &&
    (content.priorQ9Shadow?.integrityHash !==
        priorQ9Shadow.integrityHash ||
      content.model?.id !== priorQ9Shadow.model?.id ||
      content.model?.digest !== priorQ9Shadow.model?.digest ||
      content.model?.licenseHash !== priorQ9Shadow.model?.licenseHash)
  ) {
    fail('local-artifact-semantic-drift');
  }
  return artifact;
}

export function assertContentFreeEvidenceGatedAnswerArtifact(
  artifact,
  forbiddenValues = [],
) {
  const serialized = JSON.stringify(artifact).toLowerCase();
  for (const value of forbiddenValues.map(text).filter(Boolean)) {
    if (serialized.includes(value.toLowerCase())) {
      fail('artifact-content-leak');
    }
  }
  return artifact;
}

export function assertGenerationFailureKind(value) {
  if (!GENERATION_FAILURE_KINDS.has(text(value))) {
    fail('generation-failure-kind-invalid');
  }
  return value;
}
