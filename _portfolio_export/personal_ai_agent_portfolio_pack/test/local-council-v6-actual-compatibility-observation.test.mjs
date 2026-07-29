import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import { assertC13ActualCompatibilityArtifact, assertC13AttemptReceipt, assertC13Fixture, assertC13ObservationPathsAvailable, buildC13ActualCompatibilityArtifact, buildC13AttemptReceipt, createC13ReceiptGuardedProvider, frozenC13PromptProfile, runC13ActualObservation, writeC13AttemptReceiptExclusive } from '../src/core/local-council-v6-actual-compatibility-observation.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { normalizeStructuredOutput, parseStrictJsonText } from '../src/providers/structured-provider-utils.mjs';

const fixture = { authorizationId: 'owner-authorization:c13-local-observation', authorizedAt: '2026-07-29T00:00:00.000Z', councilId: 'council-c13-local-observation', evidenceCatalog: [{ id: 'artifact:bounded-plan', kind: 'artifact' }], fixtureId: 'local-council-v6-actual-compatibility-observation-v1', parentRunId: 'run-c13-local-observation', promptProfile: 'seat-scoped-v6-candidate', requiredSeats: ['research', 'implementation', 'verification'], schemaVersion: 'personal-ai-agent-local-council-v6-actual-compatibility-observation-fixture/v1', sessionId: 'session-c13-local-observation', workspaceId: 'workspace-c13-local-observation' };
const fixtureText = JSON.stringify(fixture);

test('C13 qualifies only a full seven-stage fake observation', async () => {
  const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider() });
  assert.equal(execution.calls.filter((call) => call.status === 'passed').length, 7);
  const artifact = artifactFor(execution.calls, execution.validation);
  assertC13ActualCompatibilityArtifact(artifact);
  assert.equal(artifact.actualModelCompatibility, 'actual-compatible');
  assert.equal(artifact.chairReachability, 'reached-passed');
});

test('C13 rejects duplicate fixture evidence and reservation before authorization', () => {
  assert.throws(() => assertC13Fixture({ ...fixture, evidenceCatalog: [...fixture.evidenceCatalog, ...fixture.evidenceCatalog] }), /fixture evidence/);
  const tooEarly = buildC13AttemptReceipt({ baselineDigest: 'a'.repeat(64), fixtureHash: hashLocalCouncilShadowValue(fixtureText), model: modelFor(), promptFreezeDigest: frozenC13PromptProfile().digest, reservedAt: '2026-07-28T23:59:59.999Z' });
  assert.throws(() => assertC13AttemptReceipt(tooEarly, { fixture }), /predates/);
});

test('C13 first failure blocks later calls and records actual-incompatible', async () => {
  const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider({ failAt: 2 }) });
  assert.equal(execution.calls[2].status, 'failed');
  assert.deepEqual(execution.calls.slice(3).map((call) => call.status), ['not-attempted', 'not-attempted', 'not-attempted', 'not-attempted']);
  const artifact = artifactFor(execution.calls, execution.validation);
  assertC13ActualCompatibilityArtifact(artifact);
  assert.equal(artifact.actualModelCompatibility, 'actual-incompatible');
  assert.equal(artifact.chairReachability, 'not-reached');
});

test('C13 runtime drift prevents actual-compatible classification', async () => {
  const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider() });
  const artifact = artifactFor(execution.calls, execution.validation);
  const drifted = reseal({ ...artifact, actualModelCompatibility: 'actual-incompatible', qualification: { ...artifact.qualification, fullContractPassed: false }, runtime: { ...artifact.runtime, modelStable: false } });
  assertC13ActualCompatibilityArtifact(drifted);
  assert.equal(drifted.actualModelCompatibility, 'actual-incompatible');
});

test('C13 preserves the first-failure lifecycle at every stage', async () => {
  for (let failAt = 0; failAt < 7; failAt += 1) {
    const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider({ failAt }) });
    assert.equal(execution.calls[failAt].status, 'failed', `stage ${failAt}`);
    assert.ok(execution.calls.slice(0, failAt).every((call) => call.status === 'passed'), `prefix ${failAt}`);
    assert.ok(execution.calls.slice(failAt + 1).every((call) => call.status === 'not-attempted'), `suffix ${failAt}`);
    const artifact = artifactFor(execution.calls, execution.validation);
    assertC13ActualCompatibilityArtifact(artifact);
    assert.equal(artifact.actualModelCompatibility, 'actual-incompatible');
    assert.equal(artifact.chairReachability, failAt < 6 ? 'not-reached' : 'reached-failed');
  }
});

test('C13 receipt is exclusive and owner-only', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'c13-receipt-'));
  const filePath = path.join(directory, 'attempt.json');
  const receipt = receiptFor();
  try {
    writeC13AttemptReceiptExclusive({ filePath, receipt });
    assert.equal(statSync(filePath).mode & 0o777, 0o600);
    assert.equal(JSON.parse(readFileSync(filePath, 'utf8')).integrityHash, receipt.integrityHash);
    assert.throws(() => writeC13AttemptReceiptExclusive({ filePath, receipt }), /EEXIST/);
  } finally { rmSync(directory, { force: true, recursive: true }); }
});

test('C13 existing receipt blocks runtime work and failed exclusive reservation does not call provider', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'c13-guard-'));
  const receiptPath = path.join(directory, 'attempt.json');
  const artifactPath = path.join(directory, 'artifact.json');
  let calls = 0;
  try {
    writeC13AttemptReceiptExclusive({ filePath: receiptPath, receipt: receiptFor() });
    assert.throws(() => assertC13ObservationPathsAvailable({ artifactPath, receiptPath }), /will not rerun/);
    const provider = createC13ReceiptGuardedProvider({ filePath: receiptPath, receipt: receiptFor(), provider: { async run() { calls += 1; } } });
    await assert.rejects(() => provider.run({}), /EEXIST/);
    assert.equal(calls, 0);
  } finally { rmSync(directory, { force: true, recursive: true }); }
});

test('C13 rejects raw content and authority promotion', async () => {
  const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider() });
  const artifact = artifactFor(execution.calls, execution.validation);
  assert.throws(() => assertC13ActualCompatibilityArtifact({ ...artifact, prompt: 'forbidden' }), /keys are invalid/);
  assert.throws(() => assertC13ActualCompatibilityArtifact({ ...artifact, runtimeActivation: true }), /integrity or authority/);
});

test('C13 rejects re-sealed nested baseline, receipt, and call drift', async () => {
  const execution = await runC13ActualObservation({ fixture, fixtureText, provider: fakeProvider() });
  const bundle = artifactBundle(execution.calls, execution.validation);
  assertC13ActualCompatibilityArtifact(bundle.artifact, { attemptReceipt: bundle.receipt, attemptReceiptText: bundle.receiptText, c13FixtureText: fixtureText });
  const baselineDrift = reseal({ ...bundle.artifact, baseline: { ...bundle.artifact.baseline, c6: { ...bundle.artifact.baseline.c6, fileSha256: 'not-a-hash' } } });
  assert.throws(() => assertC13ActualCompatibilityArtifact(baselineDrift), /baseline binding/);
  const callDrift = reseal({ ...bundle.artifact, calls: bundle.artifact.calls.map((call, index) => index === 0 ? { ...call, outputHash: null } : call) });
  assert.throws(() => assertC13ActualCompatibilityArtifact(callDrift), /passed call failed/);
  const receiptDrift = { ...bundle.receipt, fixtureHash: 'f'.repeat(64) };
  assert.throws(() => assertC13ActualCompatibilityArtifact(bundle.artifact, { attemptReceipt: receiptDrift, attemptReceiptText: bundle.receiptText, c13FixtureText: fixtureText }), /attempt receipt is invalid/);
});

function receiptFor({ baseline = {}, model = modelFor() } = {}) { return buildC13AttemptReceipt({ baselineDigest: hashLocalCouncilShadowValue(baseline), fixtureHash: hashLocalCouncilShadowValue(fixtureText), model, promptFreezeDigest: frozenC13PromptProfile().digest, reservedAt: '2026-07-29T00:00:00.000Z' }); }
function artifactFor(calls, validation) {
  return artifactBundle(calls, validation).artifact;
}
function artifactBundle(calls, validation) {
  const baseline = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'].map((key) => [key, { artifactId: `local-council-${key}-${'a'.repeat(64)}`, decision: 'keep-stub-only', fileSha256: 'a'.repeat(64), integrityHash: 'b'.repeat(64), localShadowQualified: false }]));
  const model = modelFor();
  const receipt = receiptFor({ baseline, model });
  const receiptText = `${JSON.stringify(receipt, null, 2)}\n`;
  const artifact = buildC13ActualCompatibilityArtifact({ attemptReceipt: receipt, attemptReceiptFileSha256: sha256Text(receiptText), baseline, calls, fixtureHash: hashLocalCouncilShadowValue(fixtureText), model, observedAt: '2026-07-29T00:00:00.000Z', promptFreeze: frozenC13PromptProfile(), runtime: { afterLoaded: true, afterVersion: '0.0.0', beforeLoaded: false, beforeVersion: '0.0.0', cloudFeaturesDisabled: true, endpointAlias: 'loopback-ollama', kind: 'ollama', modelStable: true, transportLoopback: true }, validation });
  return { artifact, receipt, receiptText };
}
function modelFor() { return { digest: 'c'.repeat(64), id: 'qwen2.5:3b', licenseHash: 'd'.repeat(64), sizeBytes: 1 }; }
function sha256Text(value) { return createHash('sha256').update(value).digest('hex'); }
function reseal(artifact) { const { id, integrityHash, ...content } = artifact; const nextIntegrity = hashLocalCouncilShadowValue(content); return { ...content, id: `local-council-v6-actual-compatibility-observation-${nextIntegrity}`, integrityHash: nextIntegrity }; }
function fakeProvider({ failAt } = {}) {
  const values = outputs(); let index = 0;
  return {
    preparePrompt: () => 'C13 deterministic fixture provider.',
    async run() {
      if (index === failAt) { index += 1; throw new Error('bounded failure'); }
      const outputText = JSON.stringify(values[index++]);
      return { attemptCount: 1, durationMs: 0, outputText, outputTextHash: hashLocalCouncilShadowValue(outputText), retryCount: 0, usageInputTokens: 0, usageOutputTokens: 0, usageTotalTokens: 0 };
    },
    normalizeOutput: (result, input) => normalizeStructuredOutput({ output: parseStrictJsonText(result.outputText, 'C13 fake provider'), role: input.role }, input, 'C13 fake provider'),
  };
}
function outputs() {
  const specialist = (seatId, phase) => ({ summaryText: 'Bounded position.', artifactContent: '# Position', nextAction: 'Keep the stub.', councilStatement: { claims: [{ id: `${seatId}:claim-${phase === 'opening-position' ? 1 : 2}`, position: phase === 'opening-position' ? 'unknown' : 'challenge', summary: 'Bounded claim.', evidenceRefs: ['artifact:bounded-plan'], severity: 'normal' }], targetClaimIds: phase === 'opening-position' ? [] : [{ research: 'implementation:claim-1', implementation: 'verification:claim-1', verification: 'research:claim-1' }[seatId]], rejectedOptionIds: [], nextAction: 'Keep the stub.' } });
  return [specialist('research', 'opening-position'), specialist('implementation', 'opening-position'), specialist('verification', 'opening-position'), specialist('research', 'rebuttal'), specialist('implementation', 'rebuttal'), specialist('verification', 'rebuttal'), { summaryText: 'Bounded decision.', artifactContent: '# Decision', nextAction: 'Keep the default profile unchanged pending independent review.', councilSynthesis: { acceptedClaimIds: [], agreementIds: [], evidenceRefs: [], nextAction: 'Keep the default profile unchanged pending independent review.', nextOwner: 'workspace-owner', rejectedClaims: ['implementation', 'research', 'verification'].map((seatId) => ({ claimId: `${seatId}:claim-2`, reason: 'Keep unpromoted.' })), unresolvedConflictIds: [], unresolvedCriticalConflictIds: [], verificationPlan: ['Verify locally.'] } }];
}
