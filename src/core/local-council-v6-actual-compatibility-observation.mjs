import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertFrozenCouncilPromptProfiles } from './council-prompt-profile-freeze.mjs';
import { assertC12BaselineArtifacts, assertC12CandidateArtifact } from './local-council-strict-prompt-candidate-qualification.mjs';
import { runCouncilPromptProfileShadow } from './local-council-rebuttal-stability-shadow.mjs';
import { hashLocalCouncilShadowValue } from './local-council-provider-shadow.mjs';

const SCHEMA_VERSION = 'personal-ai-agent-local-council-v6-actual-compatibility-observation/v1';
const ATTEMPT_SCHEMA_VERSION = 'personal-ai-agent-local-council-v6-actual-compatibility-attempt/v1';
const C12_FILE_SHA256 = '0987028546fa3a1a84e737c2031274e7b7d7c709832c85d24ba996b50ba88548';
const ORDER = ['opening-position:research', 'opening-position:implementation', 'opening-position:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair'];
const FORBIDDEN_CONTENT_KEYS = ['artifactContent', 'summaryText', 'rawMessage', 'output', 'outputText', 'prompt', 'response', 'path', 'url', 'secret', 'reasoning'];
const PROVIDER_FAILURE_KINDS = new Set(['config', 'http-status', 'timeout', 'transport', 'unknown']);
const STRUCTURED_OUTPUT_FAILURE_KINDS = new Set(['empty-output', 'non-json-output', 'schema-invalid', 'unknown']);
const COUNCIL_FAILURE_CODES = new Set(['bounded-artifact', 'bounded-field', 'cross-council-evidence', 'decision-conflict', 'duplicate-claim', 'duplicate-evidence', 'duplicate-value', 'invalid-artifact', 'invalid-claim', 'invalid-digest', 'invalid-evidence', 'invalid-field', 'invalid-output', 'invalid-owner', 'invalid-risk-signal', 'invalid-round', 'invalid-seat', 'metadata-mismatch', 'missing-artifact', 'missing-evidence', 'missing-field', 'missing-opening', 'missing-seat', 'noncanonical-artifact', 'self-target', 'specialist-contract', 'tampered-artifact', 'tampered-frame', 'unexpected-field', 'unknown-claim', 'unsupported-promotion', 'unsupported-version']);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(`${label} keys are invalid.`);
}

function isSha256(value) { return /^[a-f0-9]{64}$/.test(value || ''); }
function isIso(value) { return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function callCount(calls) { return calls.filter((call) => call.status !== 'not-attempted').length; }

export function assertC13Fixture(fixture) {
  exactKeys(fixture, ['authorizedAt', 'authorizationId', 'councilId', 'evidenceCatalog', 'fixtureId', 'parentRunId', 'promptProfile', 'requiredSeats', 'schemaVersion', 'sessionId', 'workspaceId'], 'C13 fixture');
  if (fixture.schemaVersion !== 'personal-ai-agent-local-council-v6-actual-compatibility-observation-fixture/v1' || fixture.fixtureId !== 'local-council-v6-actual-compatibility-observation-v1' || fixture.promptProfile !== 'seat-scoped-v6-candidate' || !isIso(fixture.authorizedAt) || !/^owner-authorization:[a-z0-9-]+$/.test(fixture.authorizationId || '') || JSON.stringify(fixture.requiredSeats) !== JSON.stringify(['research', 'implementation', 'verification'])) throw new Error('C13 fixture is invalid.');
  if ([fixture.councilId, fixture.parentRunId, fixture.sessionId, fixture.workspaceId].some((value) => typeof value !== 'string' || !value.trim()) || !Array.isArray(fixture.evidenceCatalog) || fixture.evidenceCatalog.length === 0) throw new Error('C13 fixture identity is invalid.');
  const evidenceIds = new Set();
  for (const evidence of fixture.evidenceCatalog) {
    exactKeys(evidence, ['id', 'kind'], 'C13 fixture evidence');
    if (evidence.kind !== 'artifact' || !/^artifact:[a-z0-9-]+$/.test(evidence.id || '') || evidenceIds.has(evidence.id)) throw new Error('C13 fixture evidence is invalid.');
    evidenceIds.add(evidence.id);
  }
  return fixture;
}

export function assertC13BaselineArtifacts({ artifacts, c11FixtureText, c12FixtureText, fileSha256, fixtureText }) {
  exactKeys(artifacts, ['c10', 'c11', 'c12', 'c6', 'c7', 'c8', 'c9'], 'C13 baseline artifacts');
  exactKeys(fileSha256, ['c10', 'c11', 'c12', 'c6', 'c7', 'c8', 'c9'], 'C13 baseline file SHA-256');
  assertC12BaselineArtifacts({ artifacts: { c10: artifacts.c10, c11: artifacts.c11, c6: artifacts.c6, c7: artifacts.c7, c8: artifacts.c8, c9: artifacts.c9 }, c11FixtureText, fileSha256: { c10: fileSha256.c10, c11: fileSha256.c11, c6: fileSha256.c6, c7: fileSha256.c7, c8: fileSha256.c8, c9: fileSha256.c9 }, fixtureText });
  if (fileSha256.c12 !== C12_FILE_SHA256) throw new Error('C13 C12 file SHA-256 changed.');
  assertC12CandidateArtifact(artifacts.c12, { baselineArtifacts: { c10: artifacts.c10, c11: artifacts.c11, c6: artifacts.c6, c7: artifacts.c7, c8: artifacts.c8, c9: artifacts.c9 }, c11FixtureText, c12FixtureText, fileSha256: { c10: fileSha256.c10, c11: fileSha256.c11, c6: fileSha256.c6, c7: fileSha256.c7, c8: fileSha256.c8, c9: fileSha256.c9 }, fixtureText });
  if (artifacts.c12.candidateStatus !== 'candidate-qualified' || artifacts.c12.localShadowQualified !== false || artifacts.c12.qualification.decision !== 'keep-stub-only') throw new Error('C13 C12 qualification authority changed.');
  return artifacts;
}

export function frozenC13PromptProfile() {
  const freeze = assertFrozenCouncilPromptProfiles();
  return { digest: freeze.digest, id: 'v1-v5-35-stage-freeze', profiles: freeze.profiles, stagesPerProfile: freeze.stagesPerProfile };
}

export async function runC13ActualObservation({ fixture, fixtureText, provider }) {
  assertC13Fixture(fixture);
  return runCouncilPromptProfileShadow({ fixture, fixtureText, provider, promptProfile: 'seat-scoped-v6-candidate' });
}

export function buildC13AttemptReceipt({ baselineDigest, fixtureHash, model, promptFreezeDigest, reservedAt }) {
  const content = { baselineDigest, fixtureHash, model, observationAttemptCount: 1, promptFreezeDigest, reservedAt, schemaVersion: ATTEMPT_SCHEMA_VERSION, status: 'reserved' };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return { ...content, id: `local-council-v6-actual-compatibility-attempt-${integrityHash}`, integrityHash };
}

export function assertC13AttemptReceipt(receipt, { fixture } = {}) {
  exactKeys(receipt, ['baselineDigest', 'fixtureHash', 'id', 'integrityHash', 'model', 'observationAttemptCount', 'promptFreezeDigest', 'reservedAt', 'schemaVersion', 'status'], 'C13 attempt receipt');
  const { id, integrityHash, ...content } = receipt;
  if (receipt.schemaVersion !== ATTEMPT_SCHEMA_VERSION || receipt.status !== 'reserved' || receipt.observationAttemptCount !== 1 || !isIso(receipt.reservedAt) || ![receipt.baselineDigest, receipt.fixtureHash, receipt.promptFreezeDigest, integrityHash].every(isSha256) || id !== `local-council-v6-actual-compatibility-attempt-${integrityHash}` || integrityHash !== hashLocalCouncilShadowValue(content)) throw new Error('C13 attempt receipt is invalid.');
  assertModel(receipt.model, 'C13 receipt model');
  if (fixture && (!isIso(fixture.authorizedAt) || receipt.reservedAt < fixture.authorizedAt)) throw new Error('C13 attempt receipt predates owner authorization.');
  assertContentFree(receipt, 'C13 attempt receipt');
  return receipt;
}

export function writeC13AttemptReceiptExclusive({ filePath, receipt }) {
  assertC13AttemptReceipt(receipt);
  return writeExclusiveJson({ filePath, value: receipt, label: 'C13 attempt receipt' });
}

export function writeC13ActualCompatibilityArtifactExclusive({ artifact, filePath }) {
  assertC13ActualCompatibilityArtifact(artifact);
  return writeExclusiveJson({ filePath, value: artifact, label: 'C13 artifact' });
}

export function assertC13ObservationPathsAvailable({ artifactPath, receiptPath }) {
  if (fs.existsSync(artifactPath) || fs.existsSync(receiptPath)) throw new Error('C13 final artifact or attempt receipt already exists; observation will not rerun.');
}

export function createC13ReceiptGuardedProvider({ filePath, provider, receipt, onReceiptWritten = () => {} }) {
  let reserved = false;
  return {
    ...provider,
    async run(input) {
      if (!reserved) {
        writeC13AttemptReceiptExclusive({ filePath, receipt });
        reserved = true;
        onReceiptWritten();
      }
      return provider.run(input);
    },
  };
}

function writeExclusiveJson({ filePath, label, value }) {
  const requestedTarget = path.resolve(filePath);
  const requestedParent = path.dirname(requestedTarget);
  const parentStat = fs.lstatSync(requestedParent);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) throw new Error(`${label} parent must be a real directory.`);
  const parent = fs.realpathSync(requestedParent);
  const target = path.join(parent, path.basename(requestedTarget));
  const parentDescriptor = fs.openSync(parent, 'r');
  let descriptor;
  try {
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0);
    descriptor = fs.openSync(target, flags, 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(descriptor);
    fs.fchmodSync(descriptor, 0o600);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.fsyncSync(parentDescriptor);
    fs.closeSync(parentDescriptor);
  }
  const stat = fs.lstatSync(target);
  const mode = stat.mode & 0o777;
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || mode !== 0o600) throw new Error(`${label} must be an owner-only regular file.`);
  return target;
}

export function buildC13ActualCompatibilityArtifact({ attemptReceipt, attemptReceiptFileSha256, baseline, calls, fixtureHash, model, observedAt, promptFreeze, runtime, validation }) {
  assertC13AttemptReceipt(attemptReceipt);
  const localProviderRequestCount = callCount(calls);
  const passed = localProviderRequestCount === 7 && calls.every((call) => call.status === 'passed') && validation.status === 'passed' && runtime.modelStable === true && runtime.afterLoaded === true;
  const chair = calls[6];
  const chairReachability = chair?.status === 'passed' ? 'reached-passed' : chair?.status === 'failed' ? 'reached-failed' : 'not-reached';
  const content = {
    actualModelCompatibility: passed ? 'actual-compatible' : 'actual-incompatible', actualUserData: false, apiCostUsd: 0, attemptReceiptFileSha256, attemptReceiptHash: attemptReceipt.integrityHash, baseline, calls,
    chairReachability, defaultProfilePromotionAuthorized: false, deploymentAuthorized: false, externalProviderCallCount: 0, fixtureHash, localProviderRequestCount, localShadowQualified: false, model, observationAttemptCount: 1, observedAt,
    productionReadyClaim: false, promptFreeze, promptProfile: 'seat-scoped-v6-candidate', qualification: { decision: 'keep-stub-only', fullContractPassed: passed }, runtime, runtimeActivation: false,
    schemaVersion: SCHEMA_VERSION, trainingAuthorized: false, validation,
  };
  const integrityHash = hashLocalCouncilShadowValue(content);
  return { ...content, id: `local-council-v6-actual-compatibility-observation-${integrityHash}`, integrityHash };
}

export function assertC13ActualCompatibilityArtifact(artifact, { attemptReceipt, attemptReceiptText, baselineArtifacts, c11FixtureText, c12FixtureText, c13FixtureText, fileSha256, fixtureText } = {}) {
  exactKeys(artifact, ['actualModelCompatibility', 'actualUserData', 'apiCostUsd', 'attemptReceiptFileSha256', 'attemptReceiptHash', 'baseline', 'calls', 'chairReachability', 'defaultProfilePromotionAuthorized', 'deploymentAuthorized', 'externalProviderCallCount', 'fixtureHash', 'id', 'integrityHash', 'localProviderRequestCount', 'localShadowQualified', 'model', 'observationAttemptCount', 'observedAt', 'productionReadyClaim', 'promptFreeze', 'promptProfile', 'qualification', 'runtime', 'runtimeActivation', 'schemaVersion', 'trainingAuthorized', 'validation'], 'C13 artifact');
  const { id, integrityHash, ...content } = artifact;
  if (artifact.schemaVersion !== SCHEMA_VERSION || integrityHash !== hashLocalCouncilShadowValue(content) || id !== `local-council-v6-actual-compatibility-observation-${integrityHash}` || artifact.promptProfile !== 'seat-scoped-v6-candidate' || artifact.observationAttemptCount !== 1 || artifact.localShadowQualified || artifact.qualification.decision !== 'keep-stub-only' || artifact.actualUserData || artifact.apiCostUsd !== 0 || artifact.externalProviderCallCount !== 0 || artifact.defaultProfilePromotionAuthorized || artifact.deploymentAuthorized || artifact.runtimeActivation || artifact.trainingAuthorized || artifact.productionReadyClaim || !isIso(artifact.observedAt) || !isSha256(artifact.attemptReceiptFileSha256)) throw new Error('C13 artifact integrity or authority failed.');
  if (attemptReceipt) {
    const fixture = typeof c13FixtureText === 'string' ? JSON.parse(c13FixtureText) : undefined;
    assertC13AttemptReceipt(attemptReceipt, { fixture });
    if (artifact.attemptReceiptHash !== attemptReceipt.integrityHash || artifact.fixtureHash !== attemptReceipt.fixtureHash || artifact.attemptReceiptFileSha256 !== sha256Text(attemptReceiptText || '') || attemptReceipt.baselineDigest !== hashLocalCouncilShadowValue(artifact.baseline) || attemptReceipt.promptFreezeDigest !== artifact.promptFreeze.digest || JSON.stringify(attemptReceipt.model) !== JSON.stringify(artifact.model)) throw new Error('C13 receipt binding failed.');
  }
  if (baselineArtifacts) assertC13BaselineArtifacts({ artifacts: baselineArtifacts, c11FixtureText, c12FixtureText, fileSha256, fixtureText });
  exactKeys(artifact.baseline, ['c10', 'c11', 'c12', 'c6', 'c7', 'c8', 'c9'], 'C13 baseline');
  for (const key of ['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12']) {
    const binding = artifact.baseline[key];
    exactKeys(binding, ['artifactId', 'decision', 'fileSha256', 'integrityHash', 'localShadowQualified'], `C13 ${key} baseline`);
    if (!/^local-council-[a-z0-9-]+-[a-f0-9]{64}$/.test(binding.artifactId || '') || !isSha256(binding.integrityHash) || !isSha256(binding.fileSha256) || binding.decision !== 'keep-stub-only' || binding.localShadowQualified !== false) throw new Error(`C13 ${key} baseline binding failed.`);
    if (baselineArtifacts && (binding.artifactId !== baselineArtifacts[key].id || binding.integrityHash !== baselineArtifacts[key].integrityHash || binding.fileSha256 !== fileSha256[key])) throw new Error(`C13 ${key} baseline binding failed.`);
  }
  if (!Array.isArray(artifact.calls) || artifact.calls.length !== 7 || artifact.calls.map((call) => `${call.phase}:${call.seatId}`).some((value, index) => value !== ORDER[index])) throw new Error('C13 call sequence failed.');
  const firstFailure = artifact.calls.findIndex((call) => call.status === 'failed');
  if (artifact.calls.some((call) => call.retryCount !== 0 || !['passed', 'failed', 'not-attempted'].includes(call.status)) || artifact.calls.filter((call) => call.status === 'failed').length > 1 || (firstFailure < 0 && artifact.calls.some((call) => call.status !== 'passed')) || (firstFailure >= 0 && (artifact.calls.slice(0, firstFailure).some((call) => call.status !== 'passed') || artifact.calls.slice(firstFailure + 1).some((call) => call.status !== 'not-attempted'))) || artifact.localProviderRequestCount !== callCount(artifact.calls) || artifact.localProviderRequestCount < 1 || artifact.localProviderRequestCount > 7) throw new Error('C13 call lifecycle failed.');
  for (const call of artifact.calls) {
    exactKeys(call, ['attemptCount', 'durationMs', 'failureKind', 'failureStage', 'inputTokens', 'outputHash', 'outputTokens', 'phase', 'promptHash', 'retryCount', 'seatId', 'status', 'totalTokens'], 'C13 call');
    assertC13Call(call);
  }
  const passed = firstFailure < 0 && artifact.validation.status === 'passed' && artifact.runtime.modelStable === true && artifact.runtime.afterLoaded === true;
  if (artifact.actualModelCompatibility !== (passed ? 'actual-compatible' : 'actual-incompatible') || artifact.qualification.fullContractPassed !== passed || artifact.chairReachability !== (artifact.calls[6].status === 'passed' ? 'reached-passed' : artifact.calls[6].status === 'failed' ? 'reached-failed' : 'not-reached')) throw new Error('C13 result classification failed.');
  exactKeys(artifact.promptFreeze, ['digest', 'id', 'profiles', 'stagesPerProfile'], 'C13 prompt freeze');
  const expectedFreeze = frozenC13PromptProfile();
  if (JSON.stringify(artifact.promptFreeze) !== JSON.stringify(expectedFreeze)) throw new Error('C13 prompt freeze binding failed.');
  assertModel(artifact.model, 'C13 model');
  exactKeys(artifact.runtime, ['afterLoaded', 'afterVersion', 'beforeLoaded', 'beforeVersion', 'cloudFeaturesDisabled', 'endpointAlias', 'kind', 'modelStable', 'transportLoopback'], 'C13 runtime');
  if (artifact.runtime.kind !== 'ollama' || artifact.runtime.endpointAlias !== 'loopback-ollama' || artifact.runtime.transportLoopback !== true || artifact.runtime.cloudFeaturesDisabled !== true || typeof artifact.runtime.beforeLoaded !== 'boolean' || typeof artifact.runtime.afterLoaded !== 'boolean' || typeof artifact.runtime.modelStable !== 'boolean' || !String(artifact.runtime.beforeVersion || '').trim() || !String(artifact.runtime.afterVersion || '').trim()) throw new Error('C13 runtime provenance failed.');
  exactKeys(artifact.validation, ['code', 'manifestDigest', 'status'], 'C13 validation');
  if (!['passed', 'failed', 'blocked'].includes(artifact.validation.status) || (artifact.validation.status === 'passed' && (!/^sha256:[a-f0-9]{64}$/.test(artifact.validation.manifestDigest || '') || firstFailure >= 0)) || (artifact.validation.status === 'blocked' && (firstFailure < 0 || artifact.validation.manifestDigest !== null)) || (artifact.validation.status === 'failed' && firstFailure < 0)) throw new Error('C13 validation failed.');
  if (typeof c13FixtureText === 'string' && artifact.fixtureHash !== hashLocalCouncilShadowValue(c13FixtureText)) throw new Error('C13 fixture binding failed.');
  assertContentFree(artifact, 'C13 artifact');
  return artifact;
}

function assertContentFree(value, label) {
  const serialized = JSON.stringify(value);
  for (const key of FORBIDDEN_CONTENT_KEYS) if (serialized.includes(`"${key}"`)) throw new Error(`${label} contains forbidden ${key}.`);
}

function assertModel(model, label) {
  exactKeys(model, ['digest', 'id', 'licenseHash', 'sizeBytes'], label);
  if (model.id !== 'qwen2.5:3b' || !isSha256(model.digest) || !isSha256(model.licenseHash) || !Number.isSafeInteger(model.sizeBytes) || model.sizeBytes <= 0) throw new Error(`${label} provenance failed.`);
}

function sha256Text(value) { return createHash('sha256').update(value).digest('hex'); }

function assertC13Call(call) {
  if (![call.attemptCount, call.durationMs, call.inputTokens, call.outputTokens, call.retryCount, call.totalTokens].every((value) => Number.isSafeInteger(value) && value >= 0) || call.totalTokens !== call.inputTokens + call.outputTokens) throw new Error('C13 call metrics failed.');
  if (call.status === 'not-attempted' && (call.attemptCount !== 0 || call.durationMs !== 0 || call.failureKind !== 'dependency-blocked' || call.failureStage !== null || call.inputTokens !== 0 || call.outputHash !== null || call.outputTokens !== 0 || call.promptHash !== null || call.retryCount !== 0 || call.totalTokens !== 0)) throw new Error('C13 blocked call failed.');
  if (call.status === 'passed' && (call.attemptCount !== 1 || call.retryCount !== 0 || call.failureKind !== null || call.failureStage !== null || !isSha256(call.promptHash) || !isSha256(call.outputHash))) throw new Error('C13 passed call failed.');
  if (call.status !== 'failed') return;
  if (call.attemptCount !== 1 || call.retryCount !== 0 || !isSha256(call.promptHash) || !['provider-request', 'structured-output', 'council-rebuttal', 'council-synthesis', 'council-manifest'].includes(call.failureStage) || !isC13FailureKindAllowed(call) || (call.failureStage === 'provider-request' ? call.outputHash !== null : !isSha256(call.outputHash))) throw new Error('C13 failed call failed.');
}

function isC13FailureKindAllowed(call) {
  const [prefix, code, ...extra] = String(call.failureKind || '').split(':');
  if (extra.length || !code) return false;
  if (call.failureStage === 'provider-request') return prefix === 'provider' && PROVIDER_FAILURE_KINDS.has(code);
  if (call.failureStage === 'structured-output') return (prefix === 'structured-output' && STRUCTURED_OUTPUT_FAILURE_KINDS.has(code)) || (prefix === 'council-contract' && code === 'invalid-output');
  if (call.failureStage === 'council-manifest') return prefix === 'council-manifest' && code === 'critical-conflict';
  return prefix === 'council-contract' && COUNCIL_FAILURE_CODES.has(code);
}
