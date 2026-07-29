import {
  assertLocalCouncilProviderShadowArtifact,
  hashLocalCouncilShadowValue,
} from './local-council-provider-shadow.mjs';
import {
  assertLocalCouncilSeatContractShadowArtifact,
} from './local-council-seat-contract-shadow.mjs';
import {
  assertLocalCouncilClaimContractRobustnessArtifact,
} from './local-council-claim-contract-robustness.mjs';
import {
  assertLocalCouncilRebuttalSynthesisShadowArtifact,
} from './local-council-rebuttal-synthesis-shadow.mjs';
import {
  assertLocalCouncilChairSynthesisContractShadowArtifact,
} from './local-council-chair-synthesis-contract-shadow.mjs';
import { resolveCouncilSeatPromptContract } from './council-seat-prompt-contract.mjs';
import {
  createCouncilBrief,
  createCouncilFrame,
  createCouncilManifest,
  createCouncilStatement,
  createCouncilStatementMetadata,
  createCouncilSynthesis,
  createCouncilSynthesisInput,
  hashCouncilValue,
  sealCouncilStatement,
  sealCouncilSynthesis,
  validateCouncilManifest,
} from './council-contract.mjs';
import { extractProviderFailure } from '../providers/provider-runtime-utils.mjs';
import { buildRequestPrompt, normalizeStructuredOutput, parseStrictJsonText } from '../providers/structured-provider-utils.mjs';

const ORDER = [
  'opening-position:research', 'opening-position:implementation', 'opening-position:verification',
  'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair',
];
const BASELINE_FILE_SHA256 = {
  c6: '85e1dc53c1897f481fb004ad8cb5a925dd08eefa153a37d23d206105ea28c2a5',
  c7: '18a4d47141b607e67124d4867b0489e9ec92ff4fe59765d9c18a504cd699c206',
  c8: 'ac47dc2368477adb7f04e6c309ad009fd356710b86d89c1c3afbdcd1303df93d',
  c9: 'b77056fbe11a7939adb83da13a16b5b571a1c153977a194cfe297aa8e1fec822',
  c10: '455ddb9137c05600fa2a08f607c209657d34bc37677ce9ad5c41bacfd759e8df',
};
const C11_SCHEMA_VERSION = 'personal-ai-agent-local-council-rebuttal-stability-shadow/v1';
const COUNCIL_CONTRACT_FAILURE_CODES = new Set([
  'bounded-artifact', 'bounded-field', 'cross-council-evidence', 'decision-conflict',
  'duplicate-claim', 'duplicate-evidence', 'duplicate-value', 'invalid-artifact',
  'invalid-claim', 'invalid-digest', 'invalid-evidence', 'invalid-field', 'invalid-output',
  'invalid-owner', 'invalid-risk-signal', 'invalid-round', 'invalid-seat', 'metadata-mismatch',
  'missing-artifact', 'missing-evidence', 'missing-field', 'missing-opening', 'missing-seat',
  'noncanonical-artifact', 'self-target', 'specialist-contract', 'tampered-artifact',
  'tampered-frame', 'unexpected-field', 'unknown-claim', 'unsupported-promotion',
  'unsupported-version',
]);
const PROVIDER_FAILURE_KINDS = new Set(['config', 'http-status', 'timeout', 'transport', 'unknown']);
const STRUCTURED_OUTPUT_FAILURE_KINDS = new Set(['empty-output', 'non-json-output', 'schema-invalid', 'unknown']);
const SEATS = ['research', 'implementation', 'verification'];

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are invalid.`);
  }
}

function c11PromptProfileHash() {
  const openingClaims = SEATS.map((seatId) => ({ id: `${seatId}:claim-1`, seatId }));
  const contracts = SEATS.flatMap((seatId) => [
    resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: 'seat-scoped-v5',
      seatId,
    }),
    resolveCouncilSeatPromptContract({
      councilBrief: { claims: openingClaims },
      phase: 'rebuttal',
      profile: 'seat-scoped-v5',
      seatId,
    }),
  ]);
  return hashLocalCouncilShadowValue(contracts);
}

export function assertC11BaselineArtifacts({ artifacts, fileSha256, fixtureText }) {
  exactKeys(artifacts, ['c10', 'c6', 'c7', 'c8', 'c9'], 'C11 baseline artifacts');
  exactKeys(fileSha256, ['c10', 'c6', 'c7', 'c8', 'c9'], 'C11 baseline file SHA-256');
  for (const key of Object.keys(BASELINE_FILE_SHA256)) {
    if (fileSha256[key] !== BASELINE_FILE_SHA256[key]) throw new Error(`C11 ${key.toUpperCase()} file SHA-256 changed.`);
  }
  const fixtures = fixtureText || {};
  assertLocalCouncilProviderShadowArtifact(artifacts.c6, { fixtureText: fixtures.c6 });
  assertLocalCouncilSeatContractShadowArtifact(artifacts.c7, { baselineArtifact: artifacts.c6, fixtureText: fixtures.c7 });
  assertLocalCouncilClaimContractRobustnessArtifact(artifacts.c8, {
    c6BaselineArtifact: artifacts.c6, c7BaselineArtifact: artifacts.c7, fixtureText: fixtures.c8,
  });
  assertLocalCouncilRebuttalSynthesisShadowArtifact(artifacts.c9, {
    c6BaselineArtifact: artifacts.c6, c7BaselineArtifact: artifacts.c7, c8BaselineArtifact: artifacts.c8, fixtureText: fixtures.c9,
  });
  assertLocalCouncilChairSynthesisContractShadowArtifact(artifacts.c10, {
    c6BaselineArtifact: artifacts.c6, c7BaselineArtifact: artifacts.c7, c8BaselineArtifact: artifacts.c8,
    c9BaselineArtifact: artifacts.c9, fixtureText: fixtures.c10,
  });
  for (const artifact of Object.values(artifacts)) {
    if (artifact.qualification.decision !== 'keep-stub-only' || artifact.localShadowQualified !== false) {
      throw new Error('C11 baseline authority changed.');
    }
  }
  return artifacts;
}

export function assertC11Fixture(fixture) {
  exactKeys(fixture, ['councilId', 'evidenceCatalog', 'fixtureId', 'parentRunId', 'promptProfile', 'requiredSeats', 'schemaVersion', 'sessionId', 'workspaceId'], 'C11 fixture');
  if (fixture.schemaVersion !== 'personal-ai-agent-local-council-rebuttal-stability-shadow-fixture/v1' ||
      fixture.fixtureId !== 'local-council-rebuttal-stability-shadow-v1' || fixture.promptProfile !== 'seat-scoped-v5' ||
      JSON.stringify(fixture.requiredSeats) !== JSON.stringify(['research', 'implementation', 'verification']) ||
      !Array.isArray(fixture.evidenceCatalog) || fixture.evidenceCatalog.length === 0) {
    throw new Error('C11 fixture is invalid.');
  }
  const evidenceIds = new Set();
  for (const evidence of fixture.evidenceCatalog) {
    exactKeys(evidence, ['id', 'kind'], 'C11 fixture evidence');
    if (evidence.kind !== 'artifact' || !/^artifact:[a-z0-9-]+$/.test(evidence.id) || evidenceIds.has(evidence.id)) {
      throw new Error('C11 fixture evidence is invalid.');
    }
    evidenceIds.add(evidence.id);
  }
  for (const value of [fixture.councilId, fixture.parentRunId, fixture.sessionId, fixture.workspaceId]) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('C11 fixture identity is invalid.');
  }
  return fixture;
}

function notAttemptedCall(phase, seatId) {
  return {
    attemptCount: 0, durationMs: 0, failureKind: 'dependency-blocked', failureStage: null, inputTokens: 0,
    outputHash: null, outputTokens: 0, phase, promptHash: null, retryCount: 0, seatId,
    status: 'not-attempted', totalTokens: 0,
  };
}

export async function runC11CouncilShadow({ fixture, fixtureText, provider }) {
  assertC11Fixture(fixture);
  return runCouncilPromptProfileShadow({ fixture, fixtureText, provider, promptProfile: 'seat-scoped-v5' });
}

export async function runCouncilPromptProfileShadow({ fixture, fixtureText, provider, promptProfile }) {
  if (!['seat-scoped-v5', 'seat-scoped-v6-candidate'].includes(promptProfile)) {
    throw new Error(`Unsupported strict Council prompt profile: ${promptProfile}.`);
  }
  const frame = createCouncilFrame({
    contextDigest: hashCouncilValue({ fixtureHash: hashLocalCouncilShadowValue(fixtureText) }),
    councilId: fixture.councilId,
    evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
      ...item, councilId: fixture.councilId, sessionId: fixture.sessionId, workspaceId: fixture.workspaceId,
    })),
    parentRunId: fixture.parentRunId,
    riskSignals: [], sessionId: fixture.sessionId, workspaceId: fixture.workspaceId,
  });
  const calls = [];
  const openings = [];
  const rebuttals = [];
  let failure = null;
  let validation = { code: 'dependency-blocked', manifestDigest: null, status: 'blocked' };
  const appendBlocked = () => {
    for (const [phase, seatId] of ORDER.slice(calls.length).map((entry) => entry.split(':'))) {
      calls.push(notAttemptedCall(phase, seatId));
    }
  };
  for (const seatId of fixture.requiredSeats) {
    const metadata = createCouncilStatementMetadata({ frame, round: 'opening', seatId });
    const input = specialistInput({ fixture, frame, metadata, promptProfile, seatId });
    const observed = await observeC11ProviderStage({ input, provider });
    if (!observed.ok) { calls.push(observed.call); failure = observed.call; appendBlocked(); return result(); }
    try {
      assertStrictSpecialistSemantics(observed.output, input);
      const record = createCouncilStatement({
        ...sealCouncilStatement({ artifactContent: observed.output.artifactContent, councilStatement: observed.output.councilStatement,
          metadata: { ...metadata, outputDigest: `sha256:${'0'.repeat(64)}` }, runId: `run-opening-${seatId}` }), frame,
      });
      openings.push(record); calls.push(observed.call);
    } catch (error) {
      failure = councilFailureCall(observed.call, error, 'council-rebuttal'); calls.push(failure); appendBlocked(); return result();
    }
  }
  let brief;
  try { brief = createCouncilBrief({ frame, openings }); }
  catch (error) { throw new Error(`C11 generated opening state is invalid: ${error.message}`); }
  for (const seatId of fixture.requiredSeats) {
    const metadata = createCouncilStatementMetadata({ brief, frame, openings, round: 'rebuttal', seatId });
    const input = specialistInput({ brief, fixture, frame: null, metadata, promptProfile, seatId });
    const observed = await observeC11ProviderStage({ input, provider });
    if (!observed.ok) { calls.push(observed.call); failure = observed.call; appendBlocked(); return result(); }
    try {
      assertStrictSpecialistSemantics(observed.output, input);
      const record = createCouncilStatement({
        ...sealCouncilStatement({ artifactContent: observed.output.artifactContent, councilStatement: observed.output.councilStatement,
          metadata: { ...metadata, outputDigest: `sha256:${'0'.repeat(64)}` }, runId: `run-rebuttal-${seatId}` }), brief, frame, openings,
      });
      rebuttals.push(record); calls.push(observed.call);
    } catch (error) {
      failure = councilFailureCall(observed.call, error, 'council-rebuttal'); calls.push(failure); appendBlocked(); return result();
    }
  }
  const metadata = createCouncilSynthesisInput({ brief, frame, openings, rebuttals });
  const input = {
    councilBrief: null, councilFrame: null, councilId: fixture.councilId, councilPhase: 'synthesis',
    councilPromptProfile: promptProfile, councilRound: 'rebuttal', councilRuntime: {
      artifactFileName: 'local-council-shadow-decision.md', artifactTitle: 'Local Council Shadow Decision',
      deliverableType: 'decision-memo', nextAction: 'Keep the default profile unchanged pending independent review.',
      proposedAction: { kind: 'none', reason: 'Shadow qualification cannot mutate a workspace.', requiresApproval: false, title: 'No workspace action' },
    }, councilSeatId: 'chair', councilSynthesisInput: {
      brief, metadata, rebuttals: rebuttals.map((record) => ({ councilStatement: record.councilStatement, metadata: record.metadata, runId: record.runId })),
    }, parentRunIds: metadata.parentRunIds, providerRole: 'executor', role: 'executor', sourceDigest: metadata.sourceDigest, specialistKind: null,
  };
  const observed = await observeC11ProviderStage({ input, provider });
  if (!observed.ok) { calls.push(observed.call); failure = observed.call; return result(); }
  let synthesis;
  try {
    synthesis = createCouncilSynthesis(sealCouncilSynthesis({
      artifactContent: observed.output.artifactContent, brief, councilSynthesis: observed.output.councilSynthesis, frame,
      metadata: { ...metadata, outputDigest: `sha256:${'0'.repeat(64)}` }, openings, rebuttals, runId: 'run-synthesis-chair',
    }));
  } catch (error) {
    failure = councilFailureCall(observed.call, error, 'council-synthesis'); calls.push(failure); return result();
  }
  const manifest = createCouncilManifest({ brief, frame, openings, rebuttals, synthesis });
  const manifestValidation = validateCouncilManifest({ brief, frame, manifest, openings, rebuttals, synthesis });
  validation = { code: manifestValidation.code, manifestDigest: manifest.manifestDigest, status: manifestValidation.status };
  if (manifestValidation.status !== 'passed') {
    failure = councilFailureCall(observed.call, { code: validation.code }, 'council-manifest'); calls.push(failure); return result();
  }
  calls.push(observed.call);
  return result();

  function result() {
    return { calls, failure, frame, openings, rebuttals, validation };
  }
}

function specialistInput({ brief = null, fixture, frame, metadata, promptProfile, seatId }) {
  return {
    councilBrief: brief, councilFrame: frame, councilId: fixture.councilId, councilPhase: metadata.councilPhase,
    councilPromptProfile: promptProfile, councilRound: metadata.councilRound, councilRuntime: null,
    councilSeatId: seatId, councilSynthesisInput: null, parentRunIds: metadata.parentRunIds,
    providerRole: 'specialist', role: 'specialist', sourceDigest: metadata.sourceDigest, specialistKind: seatId,
  };
}

function assertStrictSpecialistSemantics(output, input) {
  if (input.councilPromptProfile === 'seat-scoped-v6-candidate') return;
  const statement = output.councilStatement;
  const claim = statement.claims[0];
  const expectedClaimId = `${input.councilSeatId}:claim-${input.councilPhase === 'opening-position' ? 1 : 2}`;
  const expectedTarget = input.councilPhase === 'opening-position' ? [] : [{
    research: 'implementation:claim-1', implementation: 'verification:claim-1', verification: 'research:claim-1',
  }[input.councilSeatId]];
  const evidenceIds = (input.councilPhase === 'opening-position'
    ? input.councilFrame.evidenceCatalog.map((item) => item.id)
    : input.councilBrief.evidenceRefs);
  if (claim.id !== expectedClaimId || !['support', 'challenge', 'unknown'].includes(claim.position) ||
      !['normal', 'critical'].includes(claim.severity) || !claim.summary.trim() || claim.evidenceRefs.length === 0 ||
      new Set(claim.evidenceRefs).size !== claim.evidenceRefs.length || !claim.evidenceRefs.every((value) => evidenceIds.includes(value)) ||
      JSON.stringify(statement.targetClaimIds) !== JSON.stringify(expectedTarget)) {
    const error = new Error('C11 specialist semantic contract failed.');
    error.code = 'specialist-contract';
    throw error;
  }
}

async function observeC11ProviderStage({ input, provider }) {
  const prompt = buildRequestPrompt(input, provider.preparePrompt(input));
  let result;
  try {
    result = await provider.run(input);
  } catch (error) {
    return { ok: false, call: providerFailureCall(input, error, prompt) };
  }
  const call = observedCall(input, result, prompt);
  try {
    const output = provider.normalizeOutput
      ? provider.normalizeOutput(result, input)
      : normalizeStructuredOutput({ output: parseStrictJsonText(result.outputText, 'C11 fake provider'), role: input.role }, input, 'C11 fake provider');
    return { call, ok: true, output };
  } catch (error) {
    return { ok: false, call: councilFailureCall(call, error, 'structured-output') };
  }
}

function observedCall(input, result, prompt) {
  const inputTokens = Math.max(0, Number(result.usageInputTokens ?? result.inputTokens ?? 0));
  const outputTokens = Math.max(0, Number(result.usageOutputTokens ?? result.outputTokens ?? 0));
  return {
    attemptCount: Number(result.attemptCount || 1), durationMs: Math.max(0, Number(result.durationMs || 0)),
    failureKind: null, failureStage: null, inputTokens, outputHash: result.outputTextHash || hashLocalCouncilShadowValue(result.outputText),
    outputTokens, phase: input.councilPhase, promptHash: hashLocalCouncilShadowValue(prompt), retryCount: Number(result.retryCount || 0),
    seatId: input.councilSeatId, status: 'passed', totalTokens: Number(result.usageTotalTokens ?? result.totalTokens ?? inputTokens + outputTokens),
  };
}

function providerFailureCall(input, error, prompt) {
  const failure = extractProviderFailure(error);
  const inputTokens = Math.max(0, Number(failure.usageInputTokens || 0));
  const outputTokens = Math.max(0, Number(failure.usageOutputTokens || 0));
  const outputHash = error?.outputTextHash || null;
  return {
    attemptCount: Number(failure.attemptCount || 1), durationMs: Math.max(0, Number(failure.durationMs || 0)),
    failureKind: `${outputHash ? 'structured-output' : 'provider'}:${failure.failureKind || 'unknown'}`,
    failureStage: outputHash ? 'structured-output' : 'provider-request', inputTokens, outputHash, outputTokens,
    phase: input.councilPhase, promptHash: hashLocalCouncilShadowValue(prompt), retryCount: Number(failure.retryCount || 0),
    seatId: input.councilSeatId, status: 'failed', totalTokens: Math.max(0, Number(failure.usageTotalTokens ?? inputTokens + outputTokens)),
  };
}

function councilFailureCall(call, error, failureStage) {
  const prefix = failureStage === 'council-manifest' ? 'council-manifest' : 'council-contract';
  return {
    ...call,
    failureKind: `${prefix}:${String(error?.code || 'invalid-output')}`,
    failureStage,
    status: 'failed',
  };
}

function c11Summary(calls) {
  return {
    callCount: calls.length, failedCallCount: calls.filter((call) => call.status === 'failed').length,
    notAttemptedCallCount: calls.filter((call) => call.status === 'not-attempted').length,
    passedCallCount: calls.filter((call) => call.status === 'passed').length,
    totalDurationMs: calls.reduce((sum, call) => sum + call.durationMs, 0),
    totalInputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    totalOutputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
    totalTokens: calls.reduce((sum, call) => sum + call.totalTokens, 0),
  };
}

export function buildC11LocalCouncilArtifact({ baseline, calls, fixtureHash, model, observedAt, runtime, validation }) {
  const summary = c11Summary(calls);
  const firstFailure = calls.find((call) => call.status === 'failed') || null;
  const content = {
    actualUserData: false, apiCostUsd: 0, baseline, calls, defaultProfilePromotionAuthorized: false,
    externalProviderCallCount: 0, fixtureHash, localShadowQualified: false, model, observedAt,
    productionReadyClaim: false, promptProfile: {
      hash: c11PromptProfileHash(),
      id: 'seat-scoped-v5',
    },
    qualification: { decision: 'keep-stub-only', firstFailureStopsRemainingStages: true, fullContractPassed: !firstFailure && validation.status === 'passed' },
    rootCauseClassification: { category: 'post-provider-specialist-contract-non-conformance', exactField: 'insufficient-observation' },
    runtime, runtimeActivation: false, schemaVersion: C11_SCHEMA_VERSION, summary, trainingAuthorized: false, validation,
  };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return { ...content, id: `local-council-rebuttal-stability-shadow-${integrityHash}`, integrityHash };
}

export function assertC11LocalCouncilArtifact(artifact, { baselineArtifacts, c11FixtureText, fixtureText, fileSha256 } = {}) {
  exactKeys(artifact, ['actualUserData', 'apiCostUsd', 'baseline', 'calls', 'defaultProfilePromotionAuthorized', 'externalProviderCallCount', 'fixtureHash', 'id', 'integrityHash', 'localShadowQualified', 'model', 'observedAt', 'productionReadyClaim', 'promptProfile', 'qualification', 'rootCauseClassification', 'runtime', 'runtimeActivation', 'schemaVersion', 'summary', 'trainingAuthorized', 'validation'], 'C11 artifact');
  const { id, integrityHash, ...content } = artifact;
  if (artifact.schemaVersion !== C11_SCHEMA_VERSION || integrityHash !== hashLocalCouncilShadowValue(content) || id !== `local-council-rebuttal-stability-shadow-${integrityHash}` || artifact.localShadowQualified !== false || artifact.qualification.decision !== 'keep-stub-only') throw new Error('C11 artifact integrity or qualification failed.');
  if (baselineArtifacts) assertC11BaselineArtifacts({ artifacts: baselineArtifacts, fileSha256, fixtureText });
  exactKeys(artifact.baseline, ['c10', 'c6', 'c7', 'c8', 'c9'], 'C11 baseline');
  if (baselineArtifacts) {
    for (const key of ['c6', 'c7', 'c8', 'c9', 'c10']) {
      const binding = artifact.baseline[key];
      exactKeys(binding, ['artifactId', 'decision', 'fileSha256', 'integrityHash', 'localShadowQualified'], `C11 ${key} baseline`);
      if (binding.artifactId !== baselineArtifacts[key].id || binding.integrityHash !== baselineArtifacts[key].integrityHash || binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false || binding.fileSha256 !== fileSha256[key]) throw new Error(`C11 ${key} baseline binding failed.`);
    }
  }
  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7 || artifact.calls.map((call) => `${call.phase}:${call.seatId}`).some((value, index) => value !== ORDER[index])) throw new Error('C11 call sequence failed.');
  for (const call of artifact.calls) {
    exactKeys(call, ['attemptCount', 'durationMs', 'failureKind', 'failureStage', 'inputTokens', 'outputHash', 'outputTokens', 'phase', 'promptHash', 'retryCount', 'seatId', 'status', 'totalTokens'], 'C11 call');
    if (!['passed', 'failed', 'not-attempted'].includes(call.status) ||
        ![call.attemptCount, call.retryCount, call.durationMs, call.inputTokens, call.outputTokens, call.totalTokens]
          .every((value) => Number.isSafeInteger(value) && value >= 0) ||
        call.totalTokens !== call.inputTokens + call.outputTokens) throw new Error('C11 call metrics failed.');
    if (call.status === 'not-attempted' && (call.attemptCount !== 0 || call.durationMs !== 0 || call.failureKind !== 'dependency-blocked' ||
        call.failureStage !== null || call.inputTokens !== 0 || call.outputHash !== null || call.outputTokens !== 0 ||
        call.promptHash !== null || call.retryCount !== 0 || call.totalTokens !== 0)) throw new Error('C11 blocked call failed.');
    if (call.status === 'passed' && (call.attemptCount !== 1 || call.failureKind !== null || call.failureStage !== null || !/^[a-f0-9]{64}$/.test(call.outputHash) || !/^[a-f0-9]{64}$/.test(call.promptHash))) throw new Error('C11 passed call failed.');
    if (call.status === 'failed' && (call.attemptCount !== 1 || typeof call.failureKind !== 'string' ||
        !['provider-request', 'structured-output', 'council-rebuttal', 'council-synthesis', 'council-manifest'].includes(call.failureStage) ||
        !/^[a-f0-9]{64}$/.test(call.promptHash))) throw new Error('C11 failed call failed.');
    if (call.status === 'failed' && !isC11FailureKindAllowed(call)) throw new Error('C11 failure taxonomy failed.');
    if (call.status === 'failed' && call.failureStage === 'provider-request' && call.outputHash !== null) throw new Error('C11 provider failure contains an output hash.');
    if (call.status === 'failed' && call.failureStage !== 'provider-request' && !/^[a-f0-9]{64}$/.test(call.outputHash || '')) throw new Error('C11 post-provider hash is missing.');
  }
  const firstFailure = artifact.calls.findIndex((call) => call.status === 'failed');
  if (artifact.calls.filter((call) => call.status === 'failed').length > 1) throw new Error('C11 recorded multiple authoritative failures.');
  if (firstFailure < 0 && artifact.calls.some((call) => call.status !== 'passed')) throw new Error('C11 successful sequence is incomplete.');
  if (firstFailure >= 0 && artifact.calls.slice(0, firstFailure).some((call) => call.status !== 'passed')) throw new Error('C11 pre-failure sequence is invalid.');
  if (firstFailure >= 0 && artifact.calls.slice(firstFailure + 1).some((call) => call.status !== 'not-attempted')) throw new Error('C11 first failure did not block later stages.');
  if (artifact.calls.some((call) => call.retryCount !== 0 || (call.status !== 'not-attempted' && call.attemptCount !== 1))) throw new Error('C11 retry boundary failed.');
  if (artifact.actualUserData || artifact.apiCostUsd !== 0 || artifact.externalProviderCallCount !== 0 || artifact.defaultProfilePromotionAuthorized || artifact.runtimeActivation || artifact.trainingAuthorized || artifact.productionReadyClaim) throw new Error('C11 authority boundary changed.');
  exactKeys(artifact.model, ['digest', 'id', 'licenseHash', 'sizeBytes'], 'C11 model');
  if (artifact.model.id !== 'qwen2.5:3b' || !/^[a-f0-9]{64}$/.test(artifact.model.digest) ||
      !/^[a-f0-9]{64}$/.test(artifact.model.licenseHash) || !Number.isSafeInteger(artifact.model.sizeBytes) || artifact.model.sizeBytes <= 0) {
    throw new Error('C11 model provenance failed.');
  }
  if (!Number.isFinite(Date.parse(artifact.observedAt)) || new Date(artifact.observedAt).toISOString() !== artifact.observedAt) throw new Error('C11 observation time failed.');
  exactKeys(artifact.promptProfile, ['hash', 'id'], 'C11 prompt profile');
  if (typeof c11FixtureText !== 'string') throw new Error('C11 fixture text is required.');
  assertC11Fixture(JSON.parse(c11FixtureText));
  if (artifact.promptProfile.id !== 'seat-scoped-v5' ||
      artifact.promptProfile.hash !== c11PromptProfileHash() ||
      artifact.fixtureHash !== hashLocalCouncilShadowValue(c11FixtureText)) {
    throw new Error('C11 prompt or fixture binding failed.');
  }
  exactKeys(artifact.qualification, ['decision', 'firstFailureStopsRemainingStages', 'fullContractPassed'], 'C11 qualification');
  if (artifact.qualification.firstFailureStopsRemainingStages !== true ||
      artifact.qualification.fullContractPassed !== (firstFailure < 0 && artifact.validation.status === 'passed')) {
    throw new Error('C11 qualification result failed.');
  }
  exactKeys(artifact.rootCauseClassification, ['category', 'exactField'], 'C11 root cause classification');
  if (artifact.rootCauseClassification.category !== 'post-provider-specialist-contract-non-conformance' || artifact.rootCauseClassification.exactField !== 'insufficient-observation') throw new Error('C11 root cause classification failed.');
  exactKeys(artifact.runtime, ['afterContextLength', 'afterLoaded', 'afterSizeBytes', 'afterVramBytes', 'beforeLoaded', 'cloudFeaturesDisabled', 'endpointAlias', 'kind', 'transportLoopback', 'version'], 'C11 runtime');
  if (artifact.runtime.kind !== 'ollama' || artifact.runtime.endpointAlias !== 'loopback-ollama' ||
      artifact.runtime.transportLoopback !== true || artifact.runtime.cloudFeaturesDisabled !== true ||
      artifact.runtime.afterLoaded !== true || typeof artifact.runtime.beforeLoaded !== 'boolean' ||
      ![artifact.runtime.afterContextLength, artifact.runtime.afterSizeBytes, artifact.runtime.afterVramBytes]
        .every((value) => Number.isSafeInteger(value) && value > 0) ||
      typeof artifact.runtime.version !== 'string' || !artifact.runtime.version.trim()) throw new Error('C11 runtime provenance failed.');
  exactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C11 validation');
  if (!['passed', 'failed', 'blocked'].includes(artifact.validation.status) ||
      (artifact.validation.status === 'passed' && (!/^sha256:[a-f0-9]{64}$/.test(artifact.validation.manifestDigest || '') || firstFailure >= 0)) ||
      (artifact.validation.status === 'blocked' && (artifact.validation.manifestDigest !== null || firstFailure < 0)) ||
      (artifact.validation.status === 'failed' && firstFailure < 0)) throw new Error('C11 validation failed.');
  exactKeys(artifact.summary, ['callCount', 'failedCallCount', 'notAttemptedCallCount', 'passedCallCount', 'totalDurationMs', 'totalInputTokens', 'totalOutputTokens', 'totalTokens'], 'C11 summary');
  if (JSON.stringify(c11Summary(artifact.calls)) !== JSON.stringify(artifact.summary)) throw new Error('C11 summary failed.');
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ['"artifactContent"', '"summaryText"', '"rawMessage"', '"prompt"', '"response"', '"path"', '"url"', '"secret"']) if (serialized.includes(forbidden)) throw new Error(`C11 artifact contains forbidden ${forbidden}.`);
  return artifact;
}

function isC11FailureKindAllowed(call) {
  const [prefix, code, ...extra] = call.failureKind.split(':');
  if (extra.length > 0 || !code) return false;

  if (call.failureStage === 'provider-request') {
    return prefix === 'provider' && PROVIDER_FAILURE_KINDS.has(code);
  }
  if (call.failureStage === 'structured-output') {
    return (prefix === 'structured-output' && STRUCTURED_OUTPUT_FAILURE_KINDS.has(code)) ||
      (prefix === 'council-contract' && code === 'invalid-output');
  }
  if (call.failureStage === 'council-manifest') {
    return prefix === 'council-manifest' && code === 'critical-conflict';
  }
  return prefix === 'council-contract' && COUNCIL_CONTRACT_FAILURE_CODES.has(code);
}
