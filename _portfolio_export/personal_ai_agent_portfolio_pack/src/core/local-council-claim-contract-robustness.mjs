import {
  createCouncilFrame,
  hashCouncilValue,
} from './council-contract.mjs';
import {
  resolveCouncilSeatPromptContract,
} from './council-seat-prompt-contract.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';

const SCHEMA_VERSION = 'personal-ai-agent-local-council-claim-contract-robustness/v1';
const PROMPT_PROFILE_ID = 'seat-scoped-v2';
const HASH = /^[a-f0-9]{64}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const CALL_ORDER = [
  'opening-position:research',
  'opening-position:implementation',
  'opening-position:verification',
  'rebuttal:research',
  'rebuttal:implementation',
  'rebuttal:verification',
  'synthesis:chair',
];
const CLAIM_FAILURE_SUBREASONS = new Set([
  'claim-count',
  'claim-other',
  'claim-position',
  'claim-seat',
  'claim-severity',
]);
const LIMITATIONS = [
  'actual-user-data-not-evaluated',
  'independent-review-not-performed',
  'semantic-council-quality-not-validated',
  'same-model-single-run-only',
  'default-runtime-activation-not-authorized',
];

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

function summarizeCalls(calls) {
  const openings = calls.filter((call) => call.phase === 'opening-position');
  return {
    callCount: calls.length,
    distinctOpeningOutputCount: new Set(openings.map((call) => call.outputHash)).size,
    distinctOpeningPromptCount: new Set(openings.map((call) => call.promptHash)).size,
    failedCallCount: calls.filter((call) => call.status === 'failed').length,
    matchedRebuttalTargetCount: 0,
    notAttemptedCallCount: calls.filter((call) => call.status === 'not-attempted').length,
    passedCallCount: calls.filter((call) => call.status === 'passed').length,
    totalDurationMs: calls.reduce((total, call) => total + call.durationMs, 0),
    totalInputTokens: calls.reduce((total, call) => total + call.inputTokens, 0),
    totalOutputTokens: calls.reduce((total, call) => total + call.outputTokens, 0),
    totalTokens: calls.reduce((total, call) => total + call.totalTokens, 0),
  };
}

function assertCall(call) {
  assertExactKeys(call, [
    'attemptCount',
    'durationMs',
    'failureKind',
    'failureSubreason',
    'inputTokens',
    'outputHash',
    'outputTokens',
    'phase',
    'promptHash',
    'retryCount',
    'seatId',
    'status',
    'totalTokens',
  ], 'C8 local council call');
  if (!['opening-position', 'rebuttal', 'synthesis'].includes(call.phase)) {
    throw new Error('C8 local council call phase is invalid.');
  }
  if (!['research', 'implementation', 'verification', 'chair'].includes(call.seatId)) {
    throw new Error('C8 local council call seat is invalid.');
  }
  if (!['failed', 'not-attempted', 'passed'].includes(call.status)) {
    throw new Error('C8 local council call status is invalid.');
  }
  for (const key of [
    'attemptCount',
    'durationMs',
    'inputTokens',
    'outputTokens',
    'retryCount',
    'totalTokens',
  ]) {
    assertNonNegativeInteger(call[key], `C8 local council ${key}`);
  }
  if (call.totalTokens !== call.inputTokens + call.outputTokens) {
    throw new Error('C8 local council token total is inconsistent.');
  }
  if (
    call.status !== 'not-attempted' &&
    (call.attemptCount < 1 || call.retryCount !== call.attemptCount - 1)
  ) {
    throw new Error('C8 local council attempt history is inconsistent.');
  }
  if (call.status !== 'not-attempted' && !HASH.test(call.promptHash)) {
    throw new Error('C8 attempted call prompt hash is invalid.');
  }
  if (
    call.status === 'passed' &&
    (
      !HASH.test(call.outputHash) ||
      call.failureKind !== null ||
      call.failureSubreason !== null
    )
  ) {
    throw new Error('C8 passed call evidence is invalid.');
  }
  if (call.status === 'failed') {
    if (
      !/^(?:council-contract|provider):[a-z0-9-]+$/.test(call.failureKind) ||
      (call.outputHash !== null && !HASH.test(call.outputHash))
    ) {
      throw new Error('C8 failed call evidence is invalid.');
    }
    const claimFailure = call.failureKind === 'council-contract:invalid-claim';
    if (
      claimFailure !== CLAIM_FAILURE_SUBREASONS.has(call.failureSubreason) ||
      (!claimFailure && call.failureSubreason !== null)
    ) {
      throw new Error('C8 claim failure subreason is invalid.');
    }
  }
  if (
    call.status === 'not-attempted' &&
    (
      call.attemptCount !== 0 ||
      call.durationMs !== 0 ||
      call.failureKind !== 'dependency-blocked' ||
      call.failureSubreason !== null ||
      call.inputTokens !== 0 ||
      call.outputHash !== null ||
      call.outputTokens !== 0 ||
      call.promptHash !== null ||
      call.retryCount !== 0 ||
      call.totalTokens !== 0
    )
  ) {
    throw new Error('C8 blocked call evidence is invalid.');
  }
}

function assertTargetBinding(binding) {
  assertExactKeys(binding, [
    'expectedTargetHash',
    'matched',
    'observedTargetHash',
    'seatId',
  ], 'C8 rebuttal target binding');
  if (!['research', 'implementation', 'verification'].includes(binding.seatId)) {
    throw new Error('C8 rebuttal target seat is invalid.');
  }
  if (
    !HASH.test(binding.expectedTargetHash) ||
    (binding.observedTargetHash !== null && !HASH.test(binding.observedTargetHash)) ||
    typeof binding.matched !== 'boolean'
  ) {
    throw new Error('C8 rebuttal target hash evidence is invalid.');
  }
  if (binding.matched !== (binding.observedTargetHash === binding.expectedTargetHash)) {
    throw new Error('C8 rebuttal target match is inconsistent.');
  }
}

function assertBaselineBinding(binding, label) {
  assertExactKeys(binding, [
    'artifactId',
    'decision',
    'integrityHash',
    'localShadowQualified',
  ], label);
  if (
    binding.decision !== 'keep-stub-only' ||
    binding.localShadowQualified !== false ||
    typeof binding.artifactId !== 'string' ||
    !binding.artifactId ||
    !HASH.test(binding.integrityHash)
  ) {
    throw new Error(`${label} decision binding is invalid.`);
  }
}

function assertBoundArtifact(binding, artifact, label) {
  if (
    binding.artifactId !== artifact.id ||
    binding.integrityHash !== artifact.integrityHash ||
    binding.decision !== artifact.qualification?.decision ||
    binding.localShadowQualified !== artifact.localShadowQualified
  ) {
    throw new Error(`${label} artifact binding failed.`);
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
      throw new Error(`C8 artifact includes forbidden field ${forbidden}.`);
    }
  }
}

function buildQualification({
  baseline,
  calls,
  diagnostic,
  openingIsolation,
  summary,
  targetBindings,
  validation,
}) {
  return {
    c6BaselinePreserved:
      baseline.c6.localShadowQualified === false &&
      baseline.c6.decision === 'keep-stub-only',
    c7BaselinePreserved:
      baseline.c7.localShadowQualified === false &&
      baseline.c7.decision === 'keep-stub-only',
    c7FailureDiagnosed: diagnostic.exactFailureReproduced === true,
    contractValidated:
      calls.length === 7 &&
      summary.passedCallCount === 7 &&
      validation.code === 'ok' &&
      validation.status === 'passed',
    deterministicRebuttalTargetsVerified:
      targetBindings.length === 3 &&
      targetBindings.every((binding) => binding.matched),
    independentOpeningDiversityObserved:
      summary.distinctOpeningOutputCount === 3,
    openingIsolationVerified:
      openingIsolation.contextKind === 'council-frame' &&
      openingIsolation.otherOpeningStatementCount === 0 &&
      openingIsolation.verified === true,
    seatScopedOpeningPromptsVerified:
      summary.distinctOpeningPromptCount === 3,
  };
}

export function buildLocalCouncilClaimContractRobustnessArtifact({
  baseline,
  c7ResearchCall,
  calls,
  diagnostic,
  fixtureHash,
  model,
  observedAt,
  openingIsolation,
  promptProfileHash,
  runtime,
  targetBindings,
  validation,
}) {
  const normalizedDiagnostic = {
    ...diagnostic,
    exactFailureReproduced:
      diagnostic.failureKind === c7ResearchCall.failureKind &&
      diagnostic.failureKind === 'council-contract:invalid-claim' &&
      CLAIM_FAILURE_SUBREASONS.has(diagnostic.failureSubreason) &&
      diagnostic.outputHash === c7ResearchCall.outputHash &&
      diagnostic.promptHash === c7ResearchCall.promptHash,
  };
  const summary = summarizeCalls(calls);
  summary.matchedRebuttalTargetCount = targetBindings.filter((binding) => binding.matched).length;
  const qualificationChecks = buildQualification({
    baseline,
    calls,
    diagnostic: normalizedDiagnostic,
    openingIsolation,
    summary,
    targetBindings,
    validation,
  });
  const localShadowQualified = Object.values(qualificationChecks).every(Boolean);
  const content = {
    actualUserData: false,
    apiCostUsd: 0,
    baseline,
    calls,
    defaultProfilePromotionAuthorized: false,
    diagnostic: normalizedDiagnostic,
    externalProviderCallCount: 0,
    fixtureHash,
    localShadowQualified,
    model,
    observedAt,
    openingIsolation,
    productionReadyClaim: false,
    promptProfile: {
      hash: promptProfileHash,
      id: PROMPT_PROFILE_ID,
    },
    qualification: {
      ...qualificationChecks,
      decision: localShadowQualified
        ? 'eligible-for-independent-review'
        : 'keep-stub-only',
      limitations: [...LIMITATIONS],
    },
    runtime,
    runtimeActivation: false,
    schemaVersion: SCHEMA_VERSION,
    summary,
    targetBindings,
    trainingAuthorized: false,
    validation,
  };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return {
    ...content,
    id: `local-council-claim-contract-robustness-${integrityHash}`,
    integrityHash,
  };
}

export function assertLocalCouncilClaimContractRobustnessArtifact(artifact, {
  c6BaselineArtifact,
  c7BaselineArtifact,
  fixtureText,
} = {}) {
  assertExactKeys(artifact, [
    'actualUserData',
    'apiCostUsd',
    'baseline',
    'calls',
    'defaultProfilePromotionAuthorized',
    'diagnostic',
    'externalProviderCallCount',
    'fixtureHash',
    'id',
    'integrityHash',
    'localShadowQualified',
    'model',
    'observedAt',
    'openingIsolation',
    'productionReadyClaim',
    'promptProfile',
    'qualification',
    'runtime',
    'runtimeActivation',
    'schemaVersion',
    'summary',
    'targetBindings',
    'trainingAuthorized',
    'validation',
  ], 'C8 local council artifact');
  const { id, integrityHash, ...content } = artifact;
  const expectedHash = hashLocalCouncilShadowValue(content);
  if (
    artifact.schemaVersion !== SCHEMA_VERSION ||
    integrityHash !== expectedHash ||
    id !== `local-council-claim-contract-robustness-${expectedHash}`
  ) {
    throw new Error('C8 local council artifact integrity failed.');
  }
  if (fixtureText && artifact.fixtureHash !== hashLocalCouncilShadowValue(fixtureText)) {
    throw new Error('C8 local council fixture binding failed.');
  }
  if (!HASH.test(artifact.fixtureHash)) {
    throw new Error('C8 local council fixture hash is invalid.');
  }

  assertExactKeys(artifact.baseline, ['c6', 'c7'], 'C8 baseline');
  assertBaselineBinding(artifact.baseline.c6, 'C8 C6 baseline');
  assertBaselineBinding(artifact.baseline.c7, 'C8 C7 baseline');
  if (c6BaselineArtifact) {
    assertBoundArtifact(artifact.baseline.c6, c6BaselineArtifact, 'C8 C6 baseline');
  }
  if (c7BaselineArtifact) {
    assertBoundArtifact(artifact.baseline.c7, c7BaselineArtifact, 'C8 C7 baseline');
  }

  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7) {
    throw new Error('C8 local council requires seven sequential calls.');
  }
  artifact.calls.forEach(assertCall);
  const callOrder = artifact.calls.map((call) => `${call.phase}:${call.seatId}`);
  if (callOrder.some((value, index) => value !== CALL_ORDER[index])) {
    throw new Error('C8 local council call order is invalid.');
  }

  assertExactKeys(artifact.diagnostic, [
    'attemptCount',
    'durationMs',
    'exactFailureReproduced',
    'failureKind',
    'failureSubreason',
    'inputTokens',
    'outputHash',
    'outputTokens',
    'promptHash',
    'retryCount',
    'status',
    'totalTokens',
  ], 'C8 C7 failure diagnostic');
  const {
    exactFailureReproduced,
    ...diagnosticCall
  } = artifact.diagnostic;
  assertCall({
    ...diagnosticCall,
    phase: 'opening-position',
    seatId: 'research',
  });
  if (
    artifact.diagnostic.status !== 'failed' ||
    artifact.diagnostic.failureKind !== 'council-contract:invalid-claim' ||
    !CLAIM_FAILURE_SUBREASONS.has(artifact.diagnostic.failureSubreason) ||
    typeof exactFailureReproduced !== 'boolean'
  ) {
    throw new Error('C8 C7 failure diagnostic is invalid.');
  }
  if (c7BaselineArtifact) {
    const c7ResearchCall = c7BaselineArtifact.calls?.find(
      (call) =>
        call.phase === 'opening-position' &&
        call.seatId === 'research',
    );
    const expectedExactFailureReproduced =
      artifact.diagnostic.failureKind === c7ResearchCall?.failureKind &&
      artifact.diagnostic.outputHash === c7ResearchCall?.outputHash &&
      artifact.diagnostic.promptHash === c7ResearchCall?.promptHash;
    if (artifact.diagnostic.exactFailureReproduced !== expectedExactFailureReproduced) {
      throw new Error('C8 C7 failure diagnostic does not bind the C7 research call.');
    }
  }

  if (!Array.isArray(artifact.targetBindings) || artifact.targetBindings.length !== 3) {
    throw new Error('C8 local council requires three target bindings.');
  }
  artifact.targetBindings.forEach(assertTargetBinding);
  for (const binding of artifact.targetBindings) {
    const seatContract = resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: PROMPT_PROFILE_ID,
      seatId: binding.seatId,
    });
    const expectedTargetHash = hashLocalCouncilShadowValue(
      `${seatContract.targetSeatId}:claim-1`,
    );
    if (binding.expectedTargetHash !== expectedTargetHash) {
      throw new Error('C8 rebuttal target does not match the fixed seat rotation.');
    }
  }

  assertExactKeys(artifact.model, [
    'digest',
    'id',
    'licenseHash',
    'sizeBytes',
  ], 'C8 local council model');
  if (
    artifact.model.id !== 'qwen2.5:3b' ||
    !HASH.test(artifact.model.digest) ||
    !HASH.test(artifact.model.licenseHash) ||
    !Number.isSafeInteger(artifact.model.sizeBytes) ||
    artifact.model.sizeBytes <= 0
  ) {
    throw new Error('C8 local council model provenance is invalid.');
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
  ], 'C8 local council runtime');
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
    throw new Error('C8 local council runtime provenance is invalid.');
  }
  for (const key of ['afterContextLength', 'afterSizeBytes', 'afterVramBytes']) {
    assertNonNegativeInteger(artifact.runtime[key], `C8 local council runtime ${key}`);
  }

  assertExactKeys(artifact.promptProfile, ['hash', 'id'], 'C8 prompt profile');
  const expectedPromptProfileHash = hashLocalCouncilShadowValue(
    ['research', 'implementation', 'verification'].map((seatId) =>
      resolveCouncilSeatPromptContract({
        phase: 'opening-position',
        profile: PROMPT_PROFILE_ID,
        seatId,
      })),
  );
  if (
    artifact.promptProfile.id !== PROMPT_PROFILE_ID ||
    artifact.promptProfile.hash !== expectedPromptProfileHash
  ) {
    throw new Error('C8 prompt profile binding is invalid.');
  }

  assertExactKeys(artifact.openingIsolation, [
    'contextHash',
    'contextKind',
    'otherOpeningStatementCount',
    'verified',
  ], 'C8 opening isolation');
  if (!HASH.test(artifact.openingIsolation.contextHash)) {
    throw new Error('C8 opening context hash is invalid.');
  }
  if (fixtureText) {
    const fixture = JSON.parse(fixtureText);
    const expectedFrame = createCouncilFrame({
      contextDigest: hashCouncilValue({
        fixtureHash: hashLocalCouncilShadowValue(fixtureText),
      }),
      councilId: fixture.councilId,
      evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
        ...item,
        councilId: fixture.councilId,
        sessionId: fixture.sessionId,
        workspaceId: fixture.workspaceId,
      })),
      parentRunId: fixture.parentRunId,
      riskSignals: [],
      sessionId: fixture.sessionId,
      workspaceId: fixture.workspaceId,
    });
    if (
      artifact.openingIsolation.contextHash !==
      hashLocalCouncilShadowValue(expectedFrame)
    ) {
      throw new Error('C8 opening context does not bind the fixture CouncilFrame.');
    }
  }
  assertNonNegativeInteger(
    artifact.openingIsolation.otherOpeningStatementCount,
    'C8 other opening count',
  );

  assertExactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C8 validation');
  if (
    !['ok', 'council-contract-failed'].includes(artifact.validation.code) ||
    (
      artifact.validation.code === 'ok'
        ? (
            artifact.validation.status !== 'passed' ||
            !DIGEST.test(artifact.validation.manifestDigest)
          )
        : (
            artifact.validation.status !== 'failed' ||
            artifact.validation.manifestDigest !== null
          )
    )
  ) {
    throw new Error('C8 local council validation evidence is invalid.');
  }

  assertExactKeys(artifact.summary, [
    'callCount',
    'distinctOpeningOutputCount',
    'distinctOpeningPromptCount',
    'failedCallCount',
    'matchedRebuttalTargetCount',
    'notAttemptedCallCount',
    'passedCallCount',
    'totalDurationMs',
    'totalInputTokens',
    'totalOutputTokens',
    'totalTokens',
  ], 'C8 summary');
  const expectedSummary = summarizeCalls(artifact.calls);
  expectedSummary.matchedRebuttalTargetCount = artifact.targetBindings.filter(
    (binding) => binding.matched,
  ).length;
  if (
    hashLocalCouncilShadowValue(artifact.summary) !==
    hashLocalCouncilShadowValue(expectedSummary)
  ) {
    throw new Error('C8 local council summary is inconsistent.');
  }

  assertExactKeys(artifact.qualification, [
    'c6BaselinePreserved',
    'c7BaselinePreserved',
    'c7FailureDiagnosed',
    'contractValidated',
    'decision',
    'deterministicRebuttalTargetsVerified',
    'independentOpeningDiversityObserved',
    'limitations',
    'openingIsolationVerified',
    'seatScopedOpeningPromptsVerified',
  ], 'C8 qualification');
  const expectedQualification = buildQualification({
    baseline: artifact.baseline,
    calls: artifact.calls,
    diagnostic: artifact.diagnostic,
    openingIsolation: artifact.openingIsolation,
    summary: expectedSummary,
    targetBindings: artifact.targetBindings,
    validation: artifact.validation,
  });
  const expectedLocalShadowQualified = Object.values(expectedQualification).every(Boolean);
  for (const [key, value] of Object.entries(expectedQualification)) {
    if (artifact.qualification[key] !== value) {
      throw new Error(`C8 qualification ${key} is inconsistent.`);
    }
  }
  if (
    artifact.localShadowQualified !== expectedLocalShadowQualified ||
    artifact.qualification.decision !== (
      expectedLocalShadowQualified
        ? 'eligible-for-independent-review'
        : 'keep-stub-only'
    ) ||
    JSON.stringify(artifact.qualification.limitations) !== JSON.stringify(LIMITATIONS)
  ) {
    throw new Error('C8 qualification decision is inconsistent.');
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
    throw new Error('C8 authority boundary changed.');
  }
  if (
    typeof artifact.observedAt !== 'string' ||
    Number.isNaN(Date.parse(artifact.observedAt))
  ) {
    throw new Error('C8 observation timestamp is invalid.');
  }
  assertContentFree(artifact);
  return artifact;
}
