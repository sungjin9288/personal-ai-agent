import { createHash } from 'node:crypto';

const SCHEMA_VERSION = 'personal-ai-agent-local-council-provider-shadow/v1';
const PHASES = new Set(['opening-position', 'rebuttal', 'synthesis']);
const SEATS = new Set(['research', 'implementation', 'verification', 'chair']);
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const EXPECTED_CALL_ORDER = [
  'opening-position:research',
  'opening-position:implementation',
  'opening-position:verification',
  'rebuttal:research',
  'rebuttal:implementation',
  'rebuttal:verification',
  'synthesis:chair',
];
const QUALIFICATION_LIMITATIONS = [
  'actual-user-data-not-evaluated',
  'independent-review-not-performed',
  'semantic-council-quality-not-validated',
];

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function hashLocalCouncilShadowValue(value) {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertExactKeys(value, keys, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are invalid.`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function assertCall(call) {
  assertExactKeys(call, [
    'attemptCount',
    'durationMs',
    'failureKind',
    'inputTokens',
    'outputHash',
    'outputTokens',
    'phase',
    'promptHash',
    'retryCount',
    'seatId',
    'status',
    'totalTokens',
  ], 'local council call');
  if (!PHASES.has(call.phase) || !SEATS.has(call.seatId)) {
    throw new Error('Local council call phase or seat is invalid.');
  }
  if (!['failed', 'not-attempted', 'passed'].includes(call.status)) {
    throw new Error('Local council call status is invalid.');
  }
  for (const [label, value] of [
    ['attemptCount', call.attemptCount],
    ['durationMs', call.durationMs],
    ['inputTokens', call.inputTokens],
    ['outputTokens', call.outputTokens],
    ['retryCount', call.retryCount],
    ['totalTokens', call.totalTokens],
  ]) {
    assertNonNegativeInteger(value, `local council ${label}`);
  }
  if (
    call.status !== 'not-attempted' &&
    (call.attemptCount < 1 || call.retryCount !== call.attemptCount - 1)
  ) {
    throw new Error('Local council attempt history is inconsistent.');
  }
  if (call.totalTokens !== call.inputTokens + call.outputTokens) {
    throw new Error('Local council token total is inconsistent.');
  }
  if (
    call.status !== 'not-attempted' &&
    !HASH.test(call.promptHash)
  ) {
    throw new Error('Attempted local council call prompt hash is invalid.');
  }
  if (call.status === 'passed' && (!HASH.test(call.outputHash) || call.failureKind !== null)) {
    throw new Error('Passed local council call evidence is invalid.');
  }
  if (
    call.status === 'failed' &&
    (
      !/^(?:council-contract|provider):[a-z0-9-]+$/.test(call.failureKind) ||
      (call.outputHash !== null && !HASH.test(call.outputHash))
    )
  ) {
    throw new Error('Failed local council call evidence is invalid.');
  }
  if (
    call.status === 'not-attempted' &&
    (
      call.attemptCount !== 0 ||
      call.durationMs !== 0 ||
      call.failureKind !== 'dependency-blocked' ||
      call.inputTokens !== 0 ||
      call.outputHash !== null ||
      call.outputTokens !== 0 ||
      call.promptHash !== null ||
      call.retryCount !== 0 ||
      call.totalTokens !== 0
    )
  ) {
    throw new Error('Blocked local council call evidence is invalid.');
  }
}

function assertContentFree(artifact) {
  const serialized = JSON.stringify(artifact);
  for (const forbidden of [
    '"artifactContent"',
    '"summaryText"',
    '"rawMessage"',
    '"prompt"',
    '"response"',
    '"path"',
    '"url"',
  ]) {
    if (serialized.includes(forbidden)) {
      throw new Error(`Local council shadow artifact includes forbidden field ${forbidden}.`);
    }
  }
}

export function buildLocalCouncilProviderShadowArtifact({
  calls,
  fixtureHash,
  model,
  observedAt,
  runtime,
  validation,
}) {
  const openingCalls = calls.filter((call) => call.phase === 'opening-position');
  const openingOutputHashes = openingCalls.map((call) => call.outputHash);
  const openingPromptHashes = openingCalls.map((call) => call.promptHash);
  const passedCallCount = calls.filter((call) => call.status === 'passed').length;
  const failedCallCount = calls.filter((call) => call.status === 'failed').length;
  const notAttemptedCallCount = calls.filter((call) => call.status === 'not-attempted').length;
  const totalDurationMs = calls.reduce((total, call) => total + call.durationMs, 0);
  const totalInputTokens = calls.reduce((total, call) => total + call.inputTokens, 0);
  const totalOutputTokens = calls.reduce((total, call) => total + call.outputTokens, 0);
  const distinctOpeningOutputCount = new Set(openingOutputHashes).size;
  const distinctOpeningPromptCount = new Set(openingPromptHashes).size;
  const contractValidated =
    calls.length === 7 &&
    passedCallCount === calls.length &&
    validation.code === 'ok' &&
    validation.status === 'passed';
  const sharedOpeningPromptVerified =
    openingPromptHashes.length === 3 && distinctOpeningPromptCount === 1;
  const independentOpeningDiversityObserved =
    openingOutputHashes.length === 3 && distinctOpeningOutputCount > 1;
  const localShadowQualified =
    contractValidated &&
    sharedOpeningPromptVerified &&
    independentOpeningDiversityObserved;
  const content = {
    actualUserData: false,
    apiCostUsd: 0,
    calls,
    defaultProfilePromotionAuthorized: false,
    externalProviderCallCount: 0,
    fixtureHash,
    localShadowQualified,
    model,
    observedAt,
    productionReadyClaim: false,
    qualification: {
      contractValidated,
      decision: localShadowQualified
        ? 'eligible-for-independent-review'
        : 'keep-stub-only',
      independentOpeningDiversityObserved,
      limitations: [
        ...QUALIFICATION_LIMITATIONS,
      ],
      sharedOpeningPromptVerified,
    },
    runtime,
    runtimeActivation: false,
    schemaVersion: SCHEMA_VERSION,
    summary: {
      callCount: calls.length,
      distinctOpeningOutputCount,
      distinctOpeningPromptCount,
      failedCallCount,
      notAttemptedCallCount,
      passedCallCount,
      totalDurationMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    },
    trainingAuthorized: false,
    validation,
  };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return {
    ...content,
    id: `local-council-provider-shadow-${integrityHash}`,
    integrityHash,
  };
}

export function assertLocalCouncilProviderShadowArtifact(artifact, { fixtureText } = {}) {
  assertExactKeys(artifact, [
    'actualUserData',
    'apiCostUsd',
    'calls',
    'defaultProfilePromotionAuthorized',
    'externalProviderCallCount',
    'fixtureHash',
    'id',
    'integrityHash',
    'localShadowQualified',
    'model',
    'observedAt',
    'productionReadyClaim',
    'qualification',
    'runtime',
    'runtimeActivation',
    'schemaVersion',
    'summary',
    'trainingAuthorized',
    'validation',
  ], 'local council shadow artifact');
  const { id, integrityHash, ...content } = artifact;
  const expectedHash = hashLocalCouncilShadowValue(content);
  if (
    artifact.schemaVersion !== SCHEMA_VERSION ||
    integrityHash !== expectedHash ||
    id !== `local-council-provider-shadow-${expectedHash}`
  ) {
    throw new Error('Local council shadow artifact integrity failed.');
  }
  if (fixtureText && artifact.fixtureHash !== hashLocalCouncilShadowValue(fixtureText)) {
    throw new Error('Local council shadow fixture binding failed.');
  }
  if (!HASH.test(artifact.fixtureHash)) {
    throw new Error('Local council shadow fixture hash is invalid.');
  }
  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7) {
    throw new Error('Local council shadow requires seven sequential calls.');
  }
  artifact.calls.forEach(assertCall);
  const callOrder = artifact.calls.map((call) => `${call.phase}:${call.seatId}`);
  if (callOrder.some((value, index) => value !== EXPECTED_CALL_ORDER[index])) {
    throw new Error('Local council call order is invalid.');
  }
  assertExactKeys(artifact.model, [
    'digest',
    'id',
    'licenseHash',
    'sizeBytes',
  ], 'local council model');
  if (
    artifact.model.id !== 'qwen2.5:3b' ||
    !HASH.test(artifact.model.digest) ||
    !HASH.test(artifact.model.licenseHash) ||
    !Number.isSafeInteger(artifact.model.sizeBytes) ||
    artifact.model.sizeBytes <= 0
  ) {
    throw new Error('Local council model provenance is invalid.');
  }
  assertExactKeys(artifact.runtime, [
    'afterContextLength',
    'afterLoaded',
    'afterSizeBytes',
    'afterVramBytes',
    'beforeLoaded',
    'cloudFeaturesDisabled',
    'endpointAlias',
    'kind',
    'transportLoopback',
    'version',
  ], 'local council runtime');
  if (
    artifact.runtime.kind !== 'ollama' ||
    artifact.runtime.endpointAlias !== 'loopback-ollama' ||
    artifact.runtime.transportLoopback !== true ||
    artifact.runtime.cloudFeaturesDisabled !== true ||
    typeof artifact.runtime.beforeLoaded !== 'boolean' ||
    artifact.runtime.afterLoaded !== true ||
    !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(
      artifact.runtime.version,
    )
  ) {
    throw new Error('Local council runtime provenance is invalid.');
  }
  for (const key of ['afterContextLength', 'afterSizeBytes', 'afterVramBytes']) {
    assertNonNegativeInteger(artifact.runtime[key], `local council runtime ${key}`);
  }
  assertExactKeys(artifact.qualification, [
    'contractValidated',
    'decision',
    'independentOpeningDiversityObserved',
    'limitations',
    'sharedOpeningPromptVerified',
  ], 'local council qualification');
  assertExactKeys(artifact.summary, [
    'callCount',
    'distinctOpeningOutputCount',
    'distinctOpeningPromptCount',
    'failedCallCount',
    'notAttemptedCallCount',
    'passedCallCount',
    'totalDurationMs',
    'totalInputTokens',
    'totalOutputTokens',
    'totalTokens',
  ], 'local council summary');
  assertExactKeys(artifact.validation, [
    'code',
    'manifestDigest',
    'status',
  ], 'local council validation');
  const openingCalls = artifact.calls.slice(0, 3);
  const expectedSummary = {
    callCount: artifact.calls.length,
    distinctOpeningOutputCount: new Set(
      openingCalls.map((call) => call.outputHash),
    ).size,
    distinctOpeningPromptCount: new Set(
      openingCalls.map((call) => call.promptHash),
    ).size,
    failedCallCount: artifact.calls.filter((call) => call.status === 'failed').length,
    notAttemptedCallCount: artifact.calls.filter(
      (call) => call.status === 'not-attempted',
    ).length,
    passedCallCount: artifact.calls.filter((call) => call.status === 'passed').length,
    totalDurationMs: artifact.calls.reduce((total, call) => total + call.durationMs, 0),
    totalInputTokens: artifact.calls.reduce((total, call) => total + call.inputTokens, 0),
    totalOutputTokens: artifact.calls.reduce((total, call) => total + call.outputTokens, 0),
    totalTokens: artifact.calls.reduce((total, call) => total + call.totalTokens, 0),
  };
  if (
    hashLocalCouncilShadowValue(artifact.summary) !==
    hashLocalCouncilShadowValue(expectedSummary)
  ) {
    throw new Error('Local council summary is inconsistent with call evidence.');
  }
  if (
    artifact.actualUserData !== false ||
    artifact.apiCostUsd !== 0 ||
    artifact.externalProviderCallCount !== 0 ||
    artifact.defaultProfilePromotionAuthorized !== false ||
    artifact.productionReadyClaim !== false ||
    artifact.runtimeActivation !== false ||
    artifact.trainingAuthorized !== false
  ) {
    throw new Error('Local council authority boundary changed.');
  }
  const expectedContractValidated =
    artifact.summary.passedCallCount === artifact.calls.length &&
    artifact.validation.code === 'ok' &&
    artifact.validation.status === 'passed';
  const expectedSharedOpeningPromptVerified =
    artifact.summary.distinctOpeningPromptCount === 1;
  const expectedIndependentOpeningDiversityObserved =
    artifact.summary.distinctOpeningOutputCount > 1;
  const expectedQualification =
    expectedContractValidated &&
    expectedSharedOpeningPromptVerified &&
    expectedIndependentOpeningDiversityObserved;
  if (
    artifact.qualification.contractValidated !== expectedContractValidated ||
    artifact.qualification.sharedOpeningPromptVerified !==
      expectedSharedOpeningPromptVerified ||
    artifact.qualification.independentOpeningDiversityObserved !==
      expectedIndependentOpeningDiversityObserved ||
    JSON.stringify(artifact.qualification.limitations) !==
      JSON.stringify(QUALIFICATION_LIMITATIONS) ||
    artifact.localShadowQualified !== expectedQualification ||
    artifact.qualification.decision !== (
      expectedQualification ? 'eligible-for-independent-review' : 'keep-stub-only'
    )
  ) {
    throw new Error('Local council qualification decision is inconsistent.');
  }
  if (
    !['ok', 'council-contract-failed'].includes(artifact.validation.code) ||
    artifact.validation.code === 'ok'
      ? (
          artifact.validation.status !== 'passed' ||
          !DIGEST.test(artifact.validation.manifestDigest)
        )
      : (
          artifact.validation.status !== 'failed' ||
          artifact.validation.manifestDigest !== null
        )
  ) {
    throw new Error('Local council manifest digest is invalid.');
  }
  if (
    typeof artifact.observedAt !== 'string' ||
    Number.isNaN(Date.parse(artifact.observedAt))
  ) {
    throw new Error('Local council observation timestamp is invalid.');
  }
  assertContentFree(artifact);
  return artifact;
}
