import {
  createCouncilFrame,
  hashCouncilValue,
} from './council-contract.mjs';
import {
  resolveCouncilSeatPromptContract,
} from './council-seat-prompt-contract.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';

const SCHEMA_VERSION = 'personal-ai-agent-local-council-chair-synthesis-contract-shadow/v1';
const PROMPT_PROFILE_ID = 'seat-scoped-v4';
const HASH = /^[a-f0-9]{64}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const CALL_ORDER = [
  'opening-position:research', 'opening-position:implementation', 'opening-position:verification',
  'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair',
];
const LIMITATIONS = [
  'actual-user-data-not-evaluated',
  'independent-review-not-performed',
  'semantic-council-quality-not-validated',
  'same-model-single-run-only',
  'default-runtime-activation-not-authorized',
];

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function exactKeys(value, keys, label) {
  object(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are invalid.`);
  }
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`);
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
    totalDurationMs: calls.reduce((sum, call) => sum + call.durationMs, 0),
    totalInputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    totalOutputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
    totalTokens: calls.reduce((sum, call) => sum + call.totalTokens, 0),
  };
}

function assertCall(call) {
  exactKeys(call, [
    'attemptCount', 'durationMs', 'failureKind', 'failureStage', 'failureSubreason', 'inputTokens',
    'outputHash', 'outputTokens', 'phase', 'promptHash', 'retryCount', 'seatId', 'status', 'totalTokens',
  ], 'C10 call');
  if (!['opening-position', 'rebuttal', 'synthesis'].includes(call.phase) ||
      !['research', 'implementation', 'verification', 'chair'].includes(call.seatId) ||
      !['passed', 'failed', 'not-attempted'].includes(call.status)) {
    throw new Error('C10 call identity is invalid.');
  }
  for (const key of ['attemptCount', 'durationMs', 'inputTokens', 'outputTokens', 'retryCount', 'totalTokens']) {
    nonNegativeInteger(call[key], `C10 ${key}`);
  }
  if (call.totalTokens !== call.inputTokens + call.outputTokens) throw new Error('C10 call token total is inconsistent.');
  if (call.status === 'passed') {
    if (!HASH.test(call.promptHash) || !HASH.test(call.outputHash) || call.failureKind !== null ||
        call.failureStage !== null || call.failureSubreason !== null || call.attemptCount !== 1 || call.retryCount !== 0) {
      throw new Error('C10 passed call evidence is invalid.');
    }
    return;
  }
  if (call.status === 'not-attempted') {
    if (call.attemptCount !== 0 || call.durationMs !== 0 || call.failureKind !== 'dependency-blocked' ||
        call.failureStage !== null || call.failureSubreason !== null || call.inputTokens !== 0 || call.outputHash !== null ||
        call.outputTokens !== 0 || call.promptHash !== null || call.retryCount !== 0 || call.totalTokens !== 0) {
      throw new Error('C10 blocked call evidence is invalid.');
    }
    return;
  }
  if (!['provider-request', 'structured-output', 'council-synthesis', 'council-manifest'].includes(call.failureStage) ||
      !HASH.test(call.promptHash) || call.attemptCount !== 1 || call.retryCount !== 0 ||
      (call.outputHash !== null && !HASH.test(call.outputHash))) {
    throw new Error('C10 failed call taxonomy is invalid.');
  }
  const validFailureKind = {
    'provider-request': String(call.failureKind).startsWith('provider:'),
    'structured-output': ['structured-output:', 'council-contract:']
      .some((prefix) => String(call.failureKind).startsWith(prefix)),
    'council-synthesis': String(call.failureKind).startsWith('council-contract:'),
    'council-manifest': String(call.failureKind).startsWith('council-manifest:'),
  }[call.failureStage];
  if (!validFailureKind) throw new Error('C10 failure kind does not match its stage.');
  if (call.failureStage === 'provider-request' && call.outputHash !== null) {
    throw new Error('C10 provider request failure cannot retain an unobserved outputHash.');
  }
  if (call.failureStage !== 'provider-request' && !HASH.test(call.outputHash)) {
    throw new Error('C10 post-provider failure must retain outputHash.');
  }
}

function assertBaseline(binding, label, artifact) {
  exactKeys(binding, ['artifactId', 'decision', 'fileSha256', 'integrityHash', 'localShadowQualified'], label);
  if (binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false ||
      !HASH.test(binding.fileSha256) || !HASH.test(binding.integrityHash) || !binding.artifactId) {
    throw new Error(`${label} is invalid.`);
  }
  if (artifact && (binding.artifactId !== artifact.id || binding.integrityHash !== artifact.integrityHash ||
      binding.decision !== artifact.qualification?.decision || binding.localShadowQualified !== artifact.localShadowQualified)) {
    throw new Error(`${label} does not bind its baseline artifact.`);
  }
}

function buildQualification({ baseline, calls, openingIsolation, targetBindings, validation }) {
  return {
    c6BaselinePreserved: baseline.c6.decision === 'keep-stub-only' && !baseline.c6.localShadowQualified,
    c7BaselinePreserved: baseline.c7.decision === 'keep-stub-only' && !baseline.c7.localShadowQualified,
    c8BaselinePreserved: baseline.c8.decision === 'keep-stub-only' && !baseline.c8.localShadowQualified,
    c9BaselinePreserved: baseline.c9.decision === 'keep-stub-only' && !baseline.c9.localShadowQualified,
    deterministicRebuttalTargetsVerified: targetBindings.length === 3 && targetBindings.every((value) => value.matched),
    fullSequenceAttempted: calls.length === 7 && calls.every((call) => call.status !== 'not-attempted'),
    openingIsolationVerified: openingIsolation.contextKind === 'council-frame' &&
      openingIsolation.otherOpeningStatementCount === 0 && openingIsolation.verified === true,
    seatScopedOpeningPromptsVerified: new Set(calls.slice(0, 3).map((call) => call.promptHash)).size === 3,
    validationObserved: ['passed', 'failed', 'blocked'].includes(validation.status),
  };
}

export function buildLocalCouncilChairSynthesisContractShadowArtifact({
  baseline, c8ImplementationCall, calls, diagnostic, fixtureHash, model, observedAt, openingIsolation,
  promptProfileHash, runtime, targetBindings, validation,
}) {
  const summary = summarizeCalls(calls);
  summary.matchedRebuttalTargetCount = targetBindings.filter((binding) => binding.matched).length;
  const chairCall = calls.at(-1);
  const chairSynthesisContractPassed = chairCall?.status === 'passed' || chairCall?.failureStage === 'council-manifest';
  const fullContractPassed = chairCall?.status === 'passed' && summary.passedCallCount === 7 && validation.status === 'passed';
  const content = {
    actualUserData: false,
    apiCostUsd: 0,
    baseline,
    calls,
    chairSynthesisContractPassed,
    defaultProfilePromotionAuthorized: false,
    diagnostic: {
      ...diagnostic,
      exactFailureReproduced: diagnostic.failureKind === c8ImplementationCall.failureKind &&
        diagnostic.failureSubreason === 'claim-severity' &&
        diagnostic.inputTokens === c8ImplementationCall.inputTokens &&
        diagnostic.outputHash === c8ImplementationCall.outputHash &&
        diagnostic.outputTokens === c8ImplementationCall.outputTokens &&
        diagnostic.promptHash === c8ImplementationCall.promptHash &&
        diagnostic.totalTokens === c8ImplementationCall.totalTokens,
    },
    externalProviderCallCount: 0,
    fixtureHash,
    fullContractPassed,
    localShadowQualified: false,
    model,
    observedAt,
    openingIsolation,
    productionReadyClaim: false,
    promptProfile: { hash: promptProfileHash, id: PROMPT_PROFILE_ID },
    qualification: {
      ...buildQualification({ baseline, calls, openingIsolation, targetBindings, validation }),
      decision: 'keep-stub-only',
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
  return { ...content, id: `local-council-chair-synthesis-contract-shadow-${integrityHash}`, integrityHash };
}

export function assertLocalCouncilChairSynthesisContractShadowArtifact(artifact, {
  c6BaselineArtifact, c7BaselineArtifact, c8BaselineArtifact, c9BaselineArtifact, fixtureText,
} = {}) {
  exactKeys(artifact, [
    'actualUserData', 'apiCostUsd', 'baseline', 'calls', 'chairSynthesisContractPassed',
    'defaultProfilePromotionAuthorized', 'diagnostic', 'externalProviderCallCount', 'fixtureHash',
    'fullContractPassed', 'id', 'integrityHash', 'localShadowQualified', 'model', 'observedAt',
    'openingIsolation', 'productionReadyClaim', 'promptProfile', 'qualification', 'runtime',
    'runtimeActivation', 'schemaVersion', 'summary', 'targetBindings', 'trainingAuthorized', 'validation',
  ], 'C10 artifact');
  const { id, integrityHash, ...content } = artifact;
  const expectedHash = hashLocalCouncilShadowValue(content);
  if (artifact.schemaVersion !== SCHEMA_VERSION || integrityHash !== expectedHash ||
      id !== `local-council-chair-synthesis-contract-shadow-${expectedHash}` || !HASH.test(artifact.fixtureHash) ||
      (fixtureText && artifact.fixtureHash !== hashLocalCouncilShadowValue(fixtureText))) {
    throw new Error('C10 artifact integrity failed.');
  }
  exactKeys(artifact.baseline, ['c6', 'c7', 'c8', 'c9'], 'C10 baseline');
  assertBaseline(artifact.baseline.c6, 'C10 C6 baseline', c6BaselineArtifact);
  assertBaseline(artifact.baseline.c7, 'C10 C7 baseline', c7BaselineArtifact);
  assertBaseline(artifact.baseline.c8, 'C10 C8 baseline', c8BaselineArtifact);
  assertBaseline(artifact.baseline.c9, 'C10 C9 baseline', c9BaselineArtifact);
  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7 ||
      artifact.calls.map((call) => `${call.phase}:${call.seatId}`).some((value, index) => value !== CALL_ORDER[index])) {
    throw new Error('C10 call order is invalid.');
  }
  artifact.calls.forEach(assertCall);
  exactKeys(artifact.diagnostic, [
    'exactFailureReproduced', 'failureKind', 'failureSubreason', 'inputTokens', 'outputHash',
    'outputTokens', 'promptHash', 'totalTokens',
  ], 'C10 C8 failure diagnostic');
  if (artifact.diagnostic.failureKind !== 'council-contract:missing-field' ||
      artifact.diagnostic.failureSubreason !== 'claim-severity' ||
      !HASH.test(artifact.diagnostic.promptHash) || !HASH.test(artifact.diagnostic.outputHash) ||
      typeof artifact.diagnostic.exactFailureReproduced !== 'boolean') {
    throw new Error('C10 C8 failure diagnostic is invalid.');
  }
  for (const key of ['inputTokens', 'outputTokens', 'totalTokens']) {
    nonNegativeInteger(artifact.diagnostic[key], `C10 diagnostic ${key}`);
  }
  if (artifact.diagnostic.totalTokens !== artifact.diagnostic.inputTokens + artifact.diagnostic.outputTokens) {
    throw new Error('C10 diagnostic token total is inconsistent.');
  }
  if (c8BaselineArtifact) {
    const c8ImplementationCall = c8BaselineArtifact.calls?.find((call) =>
      call.phase === 'rebuttal' && call.seatId === 'implementation');
    const exact = artifact.diagnostic.failureKind === c8ImplementationCall?.failureKind &&
      artifact.diagnostic.inputTokens === c8ImplementationCall?.inputTokens &&
      artifact.diagnostic.outputTokens === c8ImplementationCall?.outputTokens &&
      artifact.diagnostic.outputHash === c8ImplementationCall?.outputHash &&
      artifact.diagnostic.promptHash === c8ImplementationCall?.promptHash &&
      artifact.diagnostic.totalTokens === c8ImplementationCall?.totalTokens;
    if (artifact.diagnostic.exactFailureReproduced !== exact) {
      throw new Error('C10 diagnostic does not bind the C8 implementation rebuttal.');
    }
  }
  if (!Array.isArray(artifact.targetBindings) || artifact.targetBindings.length !== 3) {
    throw new Error('C10 requires three rebuttal target bindings.');
  }
  for (const binding of artifact.targetBindings) {
    exactKeys(binding, ['expectedTargetHash', 'matched', 'observedTargetHash', 'seatId'], 'C10 target binding');
    if (!['research', 'implementation', 'verification'].includes(binding.seatId) ||
        !HASH.test(binding.expectedTargetHash) ||
        (binding.observedTargetHash !== null && !HASH.test(binding.observedTargetHash)) ||
        binding.matched !== (binding.observedTargetHash === binding.expectedTargetHash)) {
      throw new Error('C10 rebuttal target binding is invalid.');
    }
    const contract = resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: PROMPT_PROFILE_ID,
      seatId: binding.seatId,
    });
    if (binding.expectedTargetHash !== hashLocalCouncilShadowValue(`${contract.targetSeatId}:claim-1`)) {
      throw new Error('C10 rebuttal target does not match the fixed seat rotation.');
    }
  }
  exactKeys(artifact.promptProfile, ['hash', 'id'], 'C10 prompt profile');
  const openingClaims = ['research', 'implementation', 'verification'].map((seatId) => ({
    id: `${seatId}:claim-1`,
    seatId,
  }));
  const expectedPromptProfileHash = hashLocalCouncilShadowValue(
    ['research', 'implementation', 'verification'].flatMap((seatId) => [
      resolveCouncilSeatPromptContract({
        phase: 'opening-position',
        profile: PROMPT_PROFILE_ID,
        seatId,
      }),
      resolveCouncilSeatPromptContract({
        councilBrief: { claims: openingClaims },
        phase: 'rebuttal',
        profile: PROMPT_PROFILE_ID,
        seatId,
      }),
    ]),
  );
  if (artifact.promptProfile.id !== PROMPT_PROFILE_ID ||
      artifact.promptProfile.hash !== expectedPromptProfileHash) {
    throw new Error('C10 prompt profile is invalid.');
  }
  exactKeys(artifact.openingIsolation, [
    'contextHash', 'contextKind', 'otherOpeningStatementCount', 'verified',
  ], 'C10 opening isolation');
  if (!HASH.test(artifact.openingIsolation.contextHash) ||
      artifact.openingIsolation.contextKind !== 'council-frame' ||
      artifact.openingIsolation.otherOpeningStatementCount !== 0 ||
      artifact.openingIsolation.verified !== true) {
    throw new Error('C10 opening isolation is invalid.');
  }
  if (fixtureText) {
    const fixture = JSON.parse(fixtureText);
    const frame = createCouncilFrame({
      contextDigest: hashCouncilValue({ fixtureHash: hashLocalCouncilShadowValue(fixtureText) }),
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
    if (artifact.openingIsolation.contextHash !== hashLocalCouncilShadowValue(frame)) {
      throw new Error('C10 opening context does not bind the fixture CouncilFrame.');
    }
  }
  exactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C10 validation');
  const preManifestFailure = artifact.validation.code === 'council-contract-failed' &&
    artifact.validation.status === 'failed' && artifact.validation.manifestDigest === null;
  const manifestObserved = ['passed', 'failed', 'blocked'].includes(artifact.validation.status) &&
    artifact.validation.code !== 'council-contract-failed' && DIGEST.test(artifact.validation.manifestDigest);
  if (!preManifestFailure && !manifestObserved) {
    throw new Error('C10 validation is invalid.');
  }
  exactKeys(artifact.summary, [
    'callCount', 'distinctOpeningOutputCount', 'distinctOpeningPromptCount', 'failedCallCount',
    'matchedRebuttalTargetCount', 'notAttemptedCallCount', 'passedCallCount', 'totalDurationMs',
    'totalInputTokens', 'totalOutputTokens', 'totalTokens',
  ], 'C10 summary');
  const expectedSummary = summarizeCalls(artifact.calls);
  expectedSummary.matchedRebuttalTargetCount = artifact.targetBindings.filter((binding) => binding.matched).length;
  if (hashLocalCouncilShadowValue(artifact.summary) !== hashLocalCouncilShadowValue(expectedSummary)) {
    throw new Error('C10 summary is inconsistent.');
  }
  exactKeys(artifact.qualification, [
    'c6BaselinePreserved', 'c7BaselinePreserved', 'c8BaselinePreserved', 'c9BaselinePreserved',
    'decision', 'deterministicRebuttalTargetsVerified', 'fullSequenceAttempted', 'limitations',
    'openingIsolationVerified', 'seatScopedOpeningPromptsVerified', 'validationObserved',
  ], 'C10 qualification');
  const expectedQualification = buildQualification({
    baseline: artifact.baseline,
    calls: artifact.calls,
    openingIsolation: artifact.openingIsolation,
    targetBindings: artifact.targetBindings,
    validation: artifact.validation,
  });
  for (const [key, value] of Object.entries(expectedQualification)) {
    if (artifact.qualification[key] !== value) {
      throw new Error(`C10 qualification ${key} is inconsistent.`);
    }
  }
  const chairCall = artifact.calls.at(-1);
  const chairSynthesisContractPassed = chairCall.status === 'passed' || chairCall.failureStage === 'council-manifest';
  const fullContractPassed = chairCall.status === 'passed' &&
    expectedSummary.passedCallCount === 7 && artifact.validation.status === 'passed';
  if (artifact.chairSynthesisContractPassed !== chairSynthesisContractPassed || artifact.fullContractPassed !== fullContractPassed ||
      artifact.localShadowQualified !== false || artifact.qualification.decision !== 'keep-stub-only' ||
      JSON.stringify(artifact.qualification.limitations) !== JSON.stringify(LIMITATIONS)) {
    throw new Error('C10 qualification boundary is invalid.');
  }
  if (artifact.actualUserData !== false || artifact.apiCostUsd !== 0 || artifact.externalProviderCallCount !== 0 ||
      artifact.defaultProfilePromotionAuthorized !== false || artifact.runtimeActivation !== false ||
      artifact.trainingAuthorized !== false || artifact.productionReadyClaim !== false) {
    throw new Error('C10 authority boundary changed.');
  }
  exactKeys(artifact.model, ['digest', 'id', 'licenseHash', 'sizeBytes'], 'C10 model');
  if (artifact.model.id !== 'qwen2.5:3b' || !HASH.test(artifact.model.digest) ||
      !HASH.test(artifact.model.licenseHash) ||
      !Number.isSafeInteger(artifact.model.sizeBytes) || artifact.model.sizeBytes <= 0) {
    throw new Error('C10 model provenance is invalid.');
  }
  exactKeys(artifact.runtime, [
    'afterContextLength', 'afterLoaded', 'afterSizeBytes', 'afterVramBytes', 'beforeLoaded',
    'cloudFeaturesDisabled', 'endpointAlias', 'kind', 'transportLoopback', 'version',
  ], 'C10 runtime');
  if (artifact.runtime.kind !== 'ollama' || artifact.runtime.endpointAlias !== 'loopback-ollama' ||
      artifact.runtime.transportLoopback !== true || artifact.runtime.cloudFeaturesDisabled !== true ||
      typeof artifact.runtime.beforeLoaded !== 'boolean' || artifact.runtime.afterLoaded !== true ||
      !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(artifact.runtime.version)) {
    throw new Error('C10 runtime provenance is invalid.');
  }
  for (const key of ['afterContextLength', 'afterSizeBytes', 'afterVramBytes']) {
    nonNegativeInteger(artifact.runtime[key], `C10 runtime ${key}`);
  }
  if (typeof artifact.observedAt !== 'string' || Number.isNaN(Date.parse(artifact.observedAt))) {
    throw new Error('C10 observedAt is invalid.');
  }
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ['"artifactContent"', '"summaryText"', '"rawMessage"', '"prompt"', '"response"', '"path"', '"url"']) {
    if (serialized.includes(forbidden)) throw new Error(`C10 artifact includes forbidden field ${forbidden}.`);
  }
  return artifact;
}
