import {
  createCouncilFrame,
  hashCouncilValue,
} from './council-contract.mjs';
import {
  resolveCouncilSeatPromptContract,
} from './council-seat-prompt-contract.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';

const SCHEMA_VERSION = 'personal-ai-agent-local-council-rebuttal-synthesis-shadow/v1';
const PROMPT_PROFILE_ID = 'seat-scoped-v3';
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
    'attemptCount', 'durationMs', 'failureKind', 'failureSubreason', 'inputTokens',
    'outputHash', 'outputTokens', 'phase', 'promptHash', 'retryCount', 'seatId',
    'status', 'totalTokens',
  ], 'C9 local council call');
  if (!['opening-position', 'rebuttal', 'synthesis'].includes(call.phase) ||
      !['research', 'implementation', 'verification', 'chair'].includes(call.seatId) ||
      !['failed', 'not-attempted', 'passed'].includes(call.status)) {
    throw new Error('C9 local council call identity is invalid.');
  }
  for (const key of ['attemptCount', 'durationMs', 'inputTokens', 'outputTokens', 'retryCount', 'totalTokens']) {
    assertNonNegativeInteger(call[key], `C9 local council ${key}`);
  }
  if (call.totalTokens !== call.inputTokens + call.outputTokens) {
    throw new Error('C9 local council token total is inconsistent.');
  }
  if (call.status === 'not-attempted') {
    if (call.attemptCount !== 0 || call.durationMs !== 0 || call.failureKind !== 'dependency-blocked' ||
        call.failureSubreason !== null || call.inputTokens !== 0 || call.outputHash !== null ||
        call.outputTokens !== 0 || call.promptHash !== null || call.retryCount !== 0 || call.totalTokens !== 0) {
      throw new Error('C9 blocked call evidence is invalid.');
    }
    return;
  }
  if (call.attemptCount !== 1 || call.retryCount !== 0 || !HASH.test(call.promptHash)) {
    throw new Error('C9 local council attempt history is invalid.');
  }
  if (call.status === 'passed') {
    if (!HASH.test(call.outputHash) || call.failureKind !== null || call.failureSubreason !== null) {
      throw new Error('C9 passed call evidence is invalid.');
    }
    return;
  }
  if (!/^(?:council-contract|provider):[a-z0-9-]+$/.test(call.failureKind) ||
      (call.outputHash !== null && !HASH.test(call.outputHash)) ||
      ![null, 'claim-severity'].includes(call.failureSubreason)) {
    throw new Error('C9 failed call evidence is invalid.');
  }
}

function assertBaselineBinding(binding, label) {
  assertExactKeys(binding, [
    'artifactId', 'decision', 'integrityHash', 'localShadowQualified',
  ], label);
  if (binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false ||
      !binding.artifactId || !HASH.test(binding.integrityHash)) {
    throw new Error(`${label} binding is invalid.`);
  }
}

function assertBoundArtifact(binding, artifact, label) {
  if (binding.artifactId !== artifact.id || binding.integrityHash !== artifact.integrityHash ||
      binding.decision !== artifact.qualification?.decision ||
      binding.localShadowQualified !== artifact.localShadowQualified) {
    throw new Error(`${label} artifact binding failed.`);
  }
}

function assertTargetBinding(binding) {
  assertExactKeys(binding, [
    'expectedTargetHash', 'matched', 'observedTargetHash', 'seatId',
  ], 'C9 rebuttal target binding');
  if (!['research', 'implementation', 'verification'].includes(binding.seatId) ||
      !HASH.test(binding.expectedTargetHash) ||
      (binding.observedTargetHash !== null && !HASH.test(binding.observedTargetHash)) ||
      binding.matched !== (binding.observedTargetHash === binding.expectedTargetHash)) {
    throw new Error('C9 rebuttal target binding is invalid.');
  }
}

function buildQualification({ baseline, calls, diagnostic, openingIsolation, summary, targetBindings, validation }) {
  return {
    c6BaselinePreserved: baseline.c6.decision === 'keep-stub-only' && !baseline.c6.localShadowQualified,
    c7BaselinePreserved: baseline.c7.decision === 'keep-stub-only' && !baseline.c7.localShadowQualified,
    c8BaselinePreserved: baseline.c8.decision === 'keep-stub-only' && !baseline.c8.localShadowQualified,
    c8FailureDiagnosed: diagnostic.exactFailureReproduced === true,
    contractValidated: calls.length === 7 && summary.passedCallCount === 7 &&
      validation.code === 'ok' && validation.status === 'passed',
    deterministicRebuttalTargetsVerified: targetBindings.length === 3 && targetBindings.every((binding) => binding.matched),
    independentOpeningDiversityObserved: summary.distinctOpeningOutputCount === 3,
    openingIsolationVerified: openingIsolation.contextKind === 'council-frame' &&
      openingIsolation.otherOpeningStatementCount === 0 && openingIsolation.verified === true,
    seatScopedOpeningPromptsVerified: summary.distinctOpeningPromptCount === 3,
  };
}

export function buildLocalCouncilRebuttalSynthesisShadowArtifact({
  baseline, c8ImplementationCall, calls, diagnostic, fixtureHash, model, observedAt,
  openingIsolation, promptProfileHash, runtime, targetBindings, validation,
}) {
  const normalizedDiagnostic = {
    ...diagnostic,
    exactFailureReproduced:
      diagnostic.failureKind === c8ImplementationCall.failureKind &&
      diagnostic.failureSubreason === 'claim-severity' &&
      diagnostic.inputTokens === c8ImplementationCall.inputTokens &&
      diagnostic.outputTokens === c8ImplementationCall.outputTokens &&
      diagnostic.outputHash === c8ImplementationCall.outputHash &&
      diagnostic.promptHash === c8ImplementationCall.promptHash &&
      diagnostic.totalTokens === c8ImplementationCall.totalTokens,
  };
  const summary = summarizeCalls(calls);
  summary.matchedRebuttalTargetCount = targetBindings.filter((binding) => binding.matched).length;
  const qualificationChecks = buildQualification({
    baseline, calls, diagnostic: normalizedDiagnostic, openingIsolation, summary, targetBindings, validation,
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
    promptProfile: { hash: promptProfileHash, id: PROMPT_PROFILE_ID },
    qualification: {
      ...qualificationChecks,
      decision: localShadowQualified ? 'eligible-for-independent-review' : 'keep-stub-only',
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
    id: `local-council-rebuttal-synthesis-shadow-${integrityHash}`,
    integrityHash,
  };
}

export function assertLocalCouncilRebuttalSynthesisShadowArtifact(artifact, {
  c6BaselineArtifact,
  c7BaselineArtifact,
  c8BaselineArtifact,
  fixtureText,
} = {}) {
  assertExactKeys(artifact, [
    'actualUserData', 'apiCostUsd', 'baseline', 'calls', 'defaultProfilePromotionAuthorized',
    'diagnostic', 'externalProviderCallCount', 'fixtureHash', 'id', 'integrityHash',
    'localShadowQualified', 'model', 'observedAt', 'openingIsolation', 'productionReadyClaim',
    'promptProfile', 'qualification', 'runtime', 'runtimeActivation', 'schemaVersion', 'summary',
    'targetBindings', 'trainingAuthorized', 'validation',
  ], 'C9 local council artifact');
  const { id, integrityHash, ...content } = artifact;
  const expectedHash = hashLocalCouncilShadowValue(content);
  if (artifact.schemaVersion !== SCHEMA_VERSION || integrityHash !== expectedHash ||
      id !== `local-council-rebuttal-synthesis-shadow-${expectedHash}` || !HASH.test(artifact.fixtureHash)) {
    throw new Error('C9 local council artifact integrity failed.');
  }
  if (fixtureText && artifact.fixtureHash !== hashLocalCouncilShadowValue(fixtureText)) {
    throw new Error('C9 local council fixture binding failed.');
  }
  assertExactKeys(artifact.baseline, ['c6', 'c7', 'c8'], 'C9 baseline');
  for (const [key, value] of Object.entries(artifact.baseline)) {
    assertBaselineBinding(value, `C9 ${key.toUpperCase()} baseline`);
  }
  if (c6BaselineArtifact) assertBoundArtifact(artifact.baseline.c6, c6BaselineArtifact, 'C9 C6 baseline');
  if (c7BaselineArtifact) assertBoundArtifact(artifact.baseline.c7, c7BaselineArtifact, 'C9 C7 baseline');
  if (c8BaselineArtifact) assertBoundArtifact(artifact.baseline.c8, c8BaselineArtifact, 'C9 C8 baseline');

  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7 ||
      artifact.calls.map((call) => `${call.phase}:${call.seatId}`).some((value, index) => value !== CALL_ORDER[index])) {
    throw new Error('C9 local council call order is invalid.');
  }
  artifact.calls.forEach(assertCall);
  assertExactKeys(artifact.diagnostic, [
    'exactFailureReproduced', 'failureKind', 'failureSubreason', 'inputTokens', 'outputHash',
    'outputTokens', 'promptHash', 'totalTokens',
  ], 'C9 C8 failure diagnostic');
  if (artifact.diagnostic.failureKind !== 'council-contract:missing-field' ||
      artifact.diagnostic.failureSubreason !== 'claim-severity' ||
      !HASH.test(artifact.diagnostic.promptHash) || !HASH.test(artifact.diagnostic.outputHash) ||
      typeof artifact.diagnostic.exactFailureReproduced !== 'boolean') {
    throw new Error('C9 C8 failure diagnostic is invalid.');
  }
  for (const key of ['inputTokens', 'outputTokens', 'totalTokens']) {
    assertNonNegativeInteger(artifact.diagnostic[key], `C9 diagnostic ${key}`);
  }
  if (artifact.diagnostic.totalTokens !== artifact.diagnostic.inputTokens + artifact.diagnostic.outputTokens) {
    throw new Error('C9 diagnostic token total is inconsistent.');
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
      throw new Error('C9 C8 failure diagnostic does not bind the implementation rebuttal.');
    }
  }

  if (!Array.isArray(artifact.targetBindings) || artifact.targetBindings.length !== 3) {
    throw new Error('C9 local council requires three target bindings.');
  }
  artifact.targetBindings.forEach(assertTargetBinding);
  for (const binding of artifact.targetBindings) {
    const contract = resolveCouncilSeatPromptContract({
      phase: 'opening-position', profile: PROMPT_PROFILE_ID, seatId: binding.seatId,
    });
    if (binding.expectedTargetHash !== hashLocalCouncilShadowValue(`${contract.targetSeatId}:claim-1`)) {
      throw new Error('C9 rebuttal target does not match the fixed seat rotation.');
    }
  }

  assertExactKeys(artifact.promptProfile, ['hash', 'id'], 'C9 prompt profile');
  const expectedPromptProfileHash = hashLocalCouncilShadowValue(
    ['research', 'implementation', 'verification'].flatMap((seatId) => [
      resolveCouncilSeatPromptContract({ phase: 'opening-position', profile: PROMPT_PROFILE_ID, seatId }),
      resolveCouncilSeatPromptContract({ phase: 'rebuttal', profile: PROMPT_PROFILE_ID, seatId, councilBrief: {
        claims: [{ id: 'implementation:claim-1', seatId: 'implementation' }, { id: 'verification:claim-1', seatId: 'verification' }, { id: 'research:claim-1', seatId: 'research' }],
      } }),
    ]),
  );
  if (artifact.promptProfile.id !== PROMPT_PROFILE_ID || artifact.promptProfile.hash !== expectedPromptProfileHash) {
    throw new Error('C9 prompt profile binding is invalid.');
  }

  assertExactKeys(artifact.openingIsolation, [
    'contextHash', 'contextKind', 'otherOpeningStatementCount', 'verified',
  ], 'C9 opening isolation');
  if (!HASH.test(artifact.openingIsolation.contextHash) || artifact.openingIsolation.contextKind !== 'council-frame' ||
      artifact.openingIsolation.otherOpeningStatementCount !== 0 || artifact.openingIsolation.verified !== true) {
    throw new Error('C9 opening isolation is invalid.');
  }
  if (fixtureText) {
    const fixture = JSON.parse(fixtureText);
    const frame = createCouncilFrame({
      contextDigest: hashCouncilValue({ fixtureHash: hashLocalCouncilShadowValue(fixtureText) }),
      councilId: fixture.councilId,
      evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
        ...item, councilId: fixture.councilId, sessionId: fixture.sessionId, workspaceId: fixture.workspaceId,
      })),
      parentRunId: fixture.parentRunId,
      riskSignals: [],
      sessionId: fixture.sessionId,
      workspaceId: fixture.workspaceId,
    });
    if (artifact.openingIsolation.contextHash !== hashLocalCouncilShadowValue(frame)) {
      throw new Error('C9 opening context does not bind the fixture CouncilFrame.');
    }
  }

  assertExactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C9 validation');
  if ((artifact.validation.code === 'ok' && (artifact.validation.status !== 'passed' || !DIGEST.test(artifact.validation.manifestDigest))) ||
      (artifact.validation.code === 'council-contract-failed' && (artifact.validation.status !== 'failed' || artifact.validation.manifestDigest !== null)) ||
      !['ok', 'council-contract-failed'].includes(artifact.validation.code)) {
    throw new Error('C9 local council validation evidence is invalid.');
  }
  assertExactKeys(artifact.summary, [
    'callCount', 'distinctOpeningOutputCount', 'distinctOpeningPromptCount', 'failedCallCount',
    'matchedRebuttalTargetCount', 'notAttemptedCallCount', 'passedCallCount', 'totalDurationMs',
    'totalInputTokens', 'totalOutputTokens', 'totalTokens',
  ], 'C9 summary');
  const expectedSummary = summarizeCalls(artifact.calls);
  expectedSummary.matchedRebuttalTargetCount = artifact.targetBindings.filter((binding) => binding.matched).length;
  if (hashLocalCouncilShadowValue(artifact.summary) !== hashLocalCouncilShadowValue(expectedSummary)) {
    throw new Error('C9 local council summary is inconsistent.');
  }
  assertExactKeys(artifact.qualification, [
    'c6BaselinePreserved', 'c7BaselinePreserved', 'c8BaselinePreserved', 'c8FailureDiagnosed',
    'contractValidated', 'decision', 'deterministicRebuttalTargetsVerified',
    'independentOpeningDiversityObserved', 'limitations', 'openingIsolationVerified',
    'seatScopedOpeningPromptsVerified',
  ], 'C9 qualification');
  const expectedQualification = buildQualification({
    baseline: artifact.baseline, calls: artifact.calls, diagnostic: artifact.diagnostic,
    openingIsolation: artifact.openingIsolation, summary: expectedSummary,
    targetBindings: artifact.targetBindings, validation: artifact.validation,
  });
  const qualified = Object.values(expectedQualification).every(Boolean);
  for (const [key, value] of Object.entries(expectedQualification)) {
    if (artifact.qualification[key] !== value) throw new Error(`C9 qualification ${key} is inconsistent.`);
  }
  if (artifact.localShadowQualified !== qualified || artifact.qualification.decision !==
      (qualified ? 'eligible-for-independent-review' : 'keep-stub-only') ||
      JSON.stringify(artifact.qualification.limitations) !== JSON.stringify(LIMITATIONS)) {
    throw new Error('C9 qualification decision is inconsistent.');
  }
  if (artifact.actualUserData !== false || artifact.apiCostUsd !== 0 || artifact.externalProviderCallCount !== 0 ||
      artifact.defaultProfilePromotionAuthorized !== false || artifact.runtimeActivation !== false ||
      artifact.trainingAuthorized !== false || artifact.productionReadyClaim !== false) {
    throw new Error('C9 authority boundary changed.');
  }
  assertExactKeys(artifact.model, ['digest', 'id', 'licenseHash', 'sizeBytes'], 'C9 local council model');
  if (artifact.model.id !== 'qwen2.5:3b' || !HASH.test(artifact.model.digest) ||
      !HASH.test(artifact.model.licenseHash) || !Number.isSafeInteger(artifact.model.sizeBytes) || artifact.model.sizeBytes <= 0) {
    throw new Error('C9 local council model provenance is invalid.');
  }
  assertExactKeys(artifact.runtime, [
    'afterContextLength', 'afterLoaded', 'afterSizeBytes', 'afterVramBytes', 'beforeLoaded',
    'cloudFeaturesDisabled', 'endpointAlias', 'kind', 'transportLoopback', 'version',
  ], 'C9 local council runtime');
  if (artifact.runtime.kind !== 'ollama' || artifact.runtime.endpointAlias !== 'loopback-ollama' ||
      artifact.runtime.transportLoopback !== true || artifact.runtime.cloudFeaturesDisabled !== true ||
      typeof artifact.runtime.beforeLoaded !== 'boolean' || artifact.runtime.afterLoaded !== true ||
      !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(artifact.runtime.version)) {
    throw new Error('C9 local council runtime provenance is invalid.');
  }
  for (const key of ['afterContextLength', 'afterSizeBytes', 'afterVramBytes']) {
    assertNonNegativeInteger(artifact.runtime[key], `C9 local council runtime ${key}`);
  }
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ['"artifactContent"', '"summaryText"', '"rawMessage"', '"prompt"', '"response"', '"path"', '"url"']) {
    if (serialized.includes(forbidden)) throw new Error(`C9 artifact includes forbidden field ${forbidden}.`);
  }
  return artifact;
}
