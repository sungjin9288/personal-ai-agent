import {
  assertC11BaselineArtifacts,
  assertC11LocalCouncilArtifact,
  runCouncilPromptProfileShadow,
} from './local-council-rebuttal-stability-shadow.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';
import { buildRequestPrompt } from '../providers/structured-provider-utils.mjs';

const C12_SCHEMA_VERSION = 'personal-ai-agent-local-council-strict-prompt-candidate-qualification/v1';
const C11_FILE_SHA256 = '484029d99ba835bd998bd18a2aa730b729ea20dd1935ae7e2b078928ebc3dfc2';
const ORDER = [
  'opening-position:research', 'opening-position:implementation', 'opening-position:verification',
  'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair',
];
const COUNCIL_FAILURE_CODES = new Set([
  'bounded-artifact', 'bounded-field', 'cross-council-evidence', 'decision-conflict', 'duplicate-claim',
  'duplicate-evidence', 'duplicate-value', 'invalid-artifact', 'invalid-claim', 'invalid-digest',
  'invalid-evidence', 'invalid-field', 'invalid-output', 'invalid-owner', 'invalid-risk-signal',
  'invalid-round', 'invalid-seat', 'metadata-mismatch', 'missing-artifact', 'missing-evidence',
  'missing-field', 'missing-opening', 'missing-seat', 'noncanonical-artifact', 'self-target',
  'specialist-contract', 'tampered-artifact', 'tampered-frame', 'unexpected-field', 'unknown-claim',
  'unsupported-promotion', 'unsupported-version',
]);
const PROVIDER_FAILURE_KINDS = new Set(['config', 'http-status', 'timeout', 'transport', 'unknown']);
const STRUCTURED_OUTPUT_FAILURE_KINDS = new Set(['empty-output', 'non-json-output', 'schema-invalid', 'unknown']);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} keys are invalid.`);
  }
}

function promptStat(input, delegatedPrompt) {
  const prompt = buildRequestPrompt(input, delegatedPrompt);
  return {
    bytes: Buffer.byteLength(prompt, 'utf8'),
    lines: prompt.split('\n').length,
    stage: `${input.councilPhase}:${input.councilSeatId}`,
  };
}

export function assertC12Fixture(fixture) {
  exactKeys(fixture, ['councilId', 'evidenceCatalog', 'fixtureId', 'parentRunId', 'promptProfile', 'qualifiedAt', 'requiredSeats', 'schemaVersion', 'sessionId', 'workspaceId'], 'C12 fixture');
  if (fixture.schemaVersion !== 'personal-ai-agent-local-council-strict-prompt-candidate-qualification-fixture/v1' ||
      fixture.fixtureId !== 'local-council-strict-prompt-candidate-qualification-v1' ||
      fixture.promptProfile !== 'seat-scoped-v6-candidate' ||
      JSON.stringify(fixture.requiredSeats) !== JSON.stringify(['research', 'implementation', 'verification']) ||
      !Number.isFinite(Date.parse(fixture.qualifiedAt)) || new Date(fixture.qualifiedAt).toISOString() !== fixture.qualifiedAt) {
    throw new Error('C12 fixture is invalid.');
  }
  const evidenceIds = new Set();
  for (const evidence of fixture.evidenceCatalog || []) {
    exactKeys(evidence, ['id', 'kind'], 'C12 fixture evidence');
    if (evidence.kind !== 'artifact' || !/^artifact:[a-z0-9-]+$/.test(evidence.id) || evidenceIds.has(evidence.id)) {
      throw new Error('C12 fixture evidence is invalid.');
    }
    evidenceIds.add(evidence.id);
  }
  if (!evidenceIds.size || [fixture.councilId, fixture.parentRunId, fixture.sessionId, fixture.workspaceId].some((value) => !String(value || '').trim())) {
    throw new Error('C12 fixture identity is invalid.');
  }
  return fixture;
}

export function assertC12BaselineArtifacts({ artifacts, c11FixtureText, fileSha256, fixtureText }) {
  exactKeys(artifacts, ['c10', 'c11', 'c6', 'c7', 'c8', 'c9'], 'C12 baseline artifacts');
  exactKeys(fileSha256, ['c10', 'c11', 'c6', 'c7', 'c8', 'c9'], 'C12 baseline file SHA-256');
  assertC11BaselineArtifacts({
    artifacts: { c10: artifacts.c10, c6: artifacts.c6, c7: artifacts.c7, c8: artifacts.c8, c9: artifacts.c9 },
    fileSha256: { c10: fileSha256.c10, c6: fileSha256.c6, c7: fileSha256.c7, c8: fileSha256.c8, c9: fileSha256.c9 },
    fixtureText,
  });
  if (fileSha256.c11 !== C11_FILE_SHA256) throw new Error('C12 C11 file SHA-256 changed.');
  assertC11LocalCouncilArtifact(artifacts.c11, {
    baselineArtifacts: { c10: artifacts.c10, c6: artifacts.c6, c7: artifacts.c7, c8: artifacts.c8, c9: artifacts.c9 },
    c11FixtureText,
    fileSha256: { c10: fileSha256.c10, c6: fileSha256.c6, c7: fileSha256.c7, c8: fileSha256.c8, c9: fileSha256.c9 },
    fixtureText,
  });
  if (artifacts.c11.qualification.decision !== 'keep-stub-only' || artifacts.c11.localShadowQualified !== false) {
    throw new Error('C12 C11 authority changed.');
  }
  return artifacts;
}

export async function runC12CandidateQualification({ fixture, fixtureText, provider }) {
  assertC12Fixture(fixture);
  const promptStats = { v5: [], v6: [] };
  const wrappedProvider = {
    ...provider,
    preparePrompt(input) {
      const delegatedPrompt = provider.preparePrompt(input);
      promptStats.v6.push(promptStat(input, delegatedPrompt));
      promptStats.v5.push(promptStat({ ...input, councilPromptProfile: 'seat-scoped-v5' }, delegatedPrompt));
      return delegatedPrompt;
    },
  };
  const execution = await runCouncilPromptProfileShadow({
    fixture,
    fixtureText,
    promptProfile: fixture.promptProfile,
    provider: wrappedProvider,
  });
  return { ...execution, promptComparison: promptStats };
}

function promptSummary(entries) {
  return {
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    lines: entries.reduce((total, entry) => total + entry.lines, 0),
    stages: entries,
  };
}

function callSummary(calls) {
  return {
    callCount: calls.length,
    failedCallCount: calls.filter((call) => call.status === 'failed').length,
    notAttemptedCallCount: calls.filter((call) => call.status === 'not-attempted').length,
    passedCallCount: calls.filter((call) => call.status === 'passed').length,
    retryCount: calls.reduce((total, call) => total + call.retryCount, 0),
  };
}

function assertC12Call(call) {
  exactKeys(call, ['attemptCount', 'durationMs', 'failureKind', 'failureStage', 'inputTokens', 'outputHash', 'outputTokens', 'phase', 'promptHash', 'retryCount', 'seatId', 'status', 'totalTokens'], 'C12 call');
  if (!['passed', 'failed', 'not-attempted'].includes(call.status) ||
      ![call.attemptCount, call.retryCount, call.durationMs, call.inputTokens, call.outputTokens, call.totalTokens]
        .every((value) => Number.isSafeInteger(value) && value >= 0) || call.totalTokens !== call.inputTokens + call.outputTokens) {
    throw new Error('C12 call metrics failed.');
  }
  if (call.status === 'not-attempted' && (call.attemptCount !== 0 || call.durationMs !== 0 || call.failureKind !== 'dependency-blocked' ||
      call.failureStage !== null || call.inputTokens !== 0 || call.outputHash !== null || call.outputTokens !== 0 ||
      call.promptHash !== null || call.retryCount !== 0 || call.totalTokens !== 0)) throw new Error('C12 blocked call failed.');
  if (call.status === 'passed' && (call.attemptCount !== 1 || call.failureKind !== null || call.failureStage !== null ||
      !/^[a-f0-9]{64}$/.test(call.outputHash || '') || !/^[a-f0-9]{64}$/.test(call.promptHash || ''))) throw new Error('C12 passed call failed.');
  if (call.status === 'failed' && (call.attemptCount !== 1 || typeof call.failureKind !== 'string' ||
      !['provider-request', 'structured-output', 'council-rebuttal', 'council-synthesis', 'council-manifest'].includes(call.failureStage) ||
      !/^[a-f0-9]{64}$/.test(call.promptHash || '') || !isC12FailureKindAllowed(call) ||
      (call.failureStage === 'provider-request' ? call.outputHash !== null : !/^[a-f0-9]{64}$/.test(call.outputHash || '')))) {
    throw new Error('C12 failed call failed.');
  }
}

function isC12FailureKindAllowed(call) {
  const [prefix, code, ...extra] = call.failureKind.split(':');
  if (extra.length || !code) return false;
  if (call.failureStage === 'provider-request') return prefix === 'provider' && PROVIDER_FAILURE_KINDS.has(code);
  if (call.failureStage === 'structured-output') {
    return (prefix === 'structured-output' && STRUCTURED_OUTPUT_FAILURE_KINDS.has(code)) ||
      (prefix === 'council-contract' && code === 'invalid-output');
  }
  if (call.failureStage === 'council-manifest') return prefix === 'council-manifest' && code === 'critical-conflict';
  return prefix === 'council-contract' && COUNCIL_FAILURE_CODES.has(code);
}

export function buildC12CandidateArtifact({ baseline, calls, fixtureHash, promptComparison, qualifiedAt, validation }) {
  const summary = callSummary(calls);
  const candidateStatus = summary.passedCallCount === 7 && summary.failedCallCount === 0 && validation.status === 'passed'
    ? 'candidate-qualified'
    : 'candidate-rejected';
  const content = {
    actualModelCompatibility: 'unverified', actualUserData: false, apiCostUsd: 0, baseline, calls,
    candidateStatus, chairReachability: 'unverified', defaultProfilePromotionAuthorized: false,
    externalProviderCallCount: 0, fixtureHash, localShadowQualified: false, productionReadyClaim: false,
    promptComparison: { v5: promptSummary(promptComparison.v5), v6: promptSummary(promptComparison.v6) },
    promptProfile: 'seat-scoped-v6-candidate', qualification: { decision: 'keep-stub-only', deterministicContractPassed: candidateStatus === 'candidate-qualified' },
    qualifiedAt, runtimeActivation: false, schemaVersion: C12_SCHEMA_VERSION, summary, trainingAuthorized: false, validation,
  };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return { ...content, id: `local-council-strict-prompt-candidate-qualification-${integrityHash}`, integrityHash };
}

export function assertC12CandidateArtifact(artifact, { baselineArtifacts, c11FixtureText, c12FixtureText, fileSha256, fixtureText } = {}) {
  exactKeys(artifact, ['actualModelCompatibility', 'actualUserData', 'apiCostUsd', 'baseline', 'calls', 'candidateStatus', 'chairReachability', 'defaultProfilePromotionAuthorized', 'externalProviderCallCount', 'fixtureHash', 'id', 'integrityHash', 'localShadowQualified', 'productionReadyClaim', 'promptComparison', 'promptProfile', 'qualification', 'qualifiedAt', 'runtimeActivation', 'schemaVersion', 'summary', 'trainingAuthorized', 'validation'], 'C12 artifact');
  const { id, integrityHash, ...content } = artifact;
  if (artifact.schemaVersion !== C12_SCHEMA_VERSION || integrityHash !== hashLocalCouncilShadowValue(content) ||
      id !== `local-council-strict-prompt-candidate-qualification-${integrityHash}` ||
      artifact.promptProfile !== 'seat-scoped-v6-candidate' || artifact.localShadowQualified ||
      artifact.qualification.decision !== 'keep-stub-only' || artifact.actualModelCompatibility !== 'unverified' || artifact.chairReachability !== 'unverified') {
    throw new Error('C12 artifact integrity or authority failed.');
  }
  if (baselineArtifacts) assertC12BaselineArtifacts({ artifacts: baselineArtifacts, c11FixtureText, fileSha256, fixtureText });
  if (c12FixtureText !== undefined && artifact.fixtureHash !== hashLocalCouncilShadowValue(c12FixtureText)) throw new Error('C12 fixture binding failed.');
  exactKeys(artifact.baseline, ['c10', 'c11', 'c6', 'c7', 'c8', 'c9'], 'C12 baseline');
  for (const key of ['c6', 'c7', 'c8', 'c9', 'c10', 'c11']) {
    const binding = artifact.baseline[key];
    exactKeys(binding, ['artifactId', 'decision', 'fileSha256', 'integrityHash', 'localShadowQualified'], `C12 ${key} baseline`);
    if (!/^local-council-[a-z0-9-]+-[a-f0-9]{64}$/.test(binding.artifactId || '') ||
        !/^[a-f0-9]{64}$/.test(binding.integrityHash || '') || !/^[a-f0-9]{64}$/.test(binding.fileSha256 || '') ||
        binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false) {
      throw new Error(`C12 ${key} baseline binding failed.`);
    }
  }
  if (baselineArtifacts) {
    for (const key of ['c6', 'c7', 'c8', 'c9', 'c10', 'c11']) {
      const binding = artifact.baseline[key];
      if (binding.artifactId !== baselineArtifacts[key].id || binding.integrityHash !== baselineArtifacts[key].integrityHash ||
          binding.fileSha256 !== fileSha256[key] || binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false) {
        throw new Error(`C12 ${key} baseline binding failed.`);
      }
    }
  }
  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7 ||
      artifact.calls.map((call) => `${call.phase}:${call.seatId}`).some((value, index) => value !== ORDER[index])) throw new Error('C12 call sequence failed.');
  artifact.calls.forEach(assertC12Call);
  const firstFailure = artifact.calls.findIndex((call) => call.status === 'failed');
  if (artifact.calls.filter((call) => call.status === 'failed').length > 1 ||
      (firstFailure < 0 && artifact.calls.some((call) => call.status !== 'passed')) ||
      (firstFailure >= 0 && (artifact.calls.slice(0, firstFailure).some((call) => call.status !== 'passed') ||
        artifact.calls.slice(firstFailure + 1).some((call) => call.status !== 'not-attempted'))) ||
      artifact.calls.some((call) => call.retryCount !== 0) || JSON.stringify(artifact.summary) !== JSON.stringify(callSummary(artifact.calls))) {
    throw new Error('C12 call lifecycle failed.');
  }
  exactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C12 validation');
  if (!['passed', 'failed', 'blocked'].includes(artifact.validation.status) ||
      (artifact.validation.status === 'passed' && (firstFailure >= 0 || !/^sha256:[a-f0-9]{64}$/.test(artifact.validation.manifestDigest || ''))) ||
      (artifact.validation.status === 'blocked' && (firstFailure < 0 || artifact.validation.manifestDigest !== null)) ||
      (artifact.validation.status === 'failed' && firstFailure < 0)) throw new Error('C12 validation failed.');
  exactKeys(artifact.qualification, ['decision', 'deterministicContractPassed'], 'C12 qualification');
  const qualified = firstFailure < 0 && artifact.validation.status === 'passed';
  if (artifact.candidateStatus !== (qualified ? 'candidate-qualified' : 'candidate-rejected') ||
      artifact.qualification.deterministicContractPassed !== qualified) throw new Error('C12 candidate status failed.');
  exactKeys(artifact.promptComparison, ['v5', 'v6'], 'C12 prompt comparison');
  const expectedPromptStageCount = firstFailure < 0 ? 7 : firstFailure + 1;
  for (const profile of ['v5', 'v6']) {
    const summary = artifact.promptComparison[profile];
    exactKeys(summary, ['bytes', 'lines', 'stages'], `C12 ${profile} prompt comparison`);
    if (!Number.isSafeInteger(summary.bytes) || summary.bytes <= 0 || !Number.isSafeInteger(summary.lines) || summary.lines <= 0 ||
        !Array.isArray(summary.stages) || summary.stages.length !== expectedPromptStageCount ||
        summary.bytes !== summary.stages.reduce((total, stage) => total + stage.bytes, 0) ||
        summary.lines !== summary.stages.reduce((total, stage) => total + stage.lines, 0)) throw new Error('C12 prompt comparison is invalid.');
    for (const [index, stage] of summary.stages.entries()) {
      exactKeys(stage, ['bytes', 'lines', 'stage'], `C12 ${profile} prompt stage`);
      if (stage.stage !== ORDER[index] || !Number.isSafeInteger(stage.bytes) || stage.bytes <= 0 || !Number.isSafeInteger(stage.lines) || stage.lines <= 0) {
        throw new Error('C12 prompt stage is invalid.');
      }
    }
  }
  if (artifact.actualUserData || artifact.apiCostUsd !== 0 || artifact.externalProviderCallCount !== 0 || artifact.defaultProfilePromotionAuthorized || artifact.runtimeActivation || artifact.trainingAuthorized || artifact.productionReadyClaim ||
      !Number.isFinite(Date.parse(artifact.qualifiedAt)) || new Date(artifact.qualifiedAt).toISOString() !== artifact.qualifiedAt) {
    throw new Error('C12 authority or time boundary failed.');
  }
  const serialized = JSON.stringify(artifact);
  for (const forbidden of ['"artifactContent"', '"summaryText"', '"rawMessage"', '"output"', '"outputText"', '"prompt"', '"response"', '"path"', '"url"', '"secret"']) {
    if (serialized.includes(forbidden)) throw new Error(`C12 artifact contains forbidden ${forbidden}.`);
  }
  return artifact;
}
