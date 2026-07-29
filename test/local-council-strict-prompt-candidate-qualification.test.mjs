import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertC12BaselineArtifacts,
  assertC12CandidateArtifact,
  assertC12Fixture,
  buildC12CandidateArtifact,
  runC12CandidateQualification,
} from '../src/core/local-council-strict-prompt-candidate-qualification.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';
import { normalizeStructuredOutput, parseStrictJsonText } from '../src/providers/structured-provider-utils.mjs';

const repoDir = process.cwd();
const fixtureText = read('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');
const fixture = JSON.parse(fixtureText);
const c11FixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');

test('C12 keeps C6-C11 immutable and qualifies the deterministic seven-stage candidate', async () => {
  assertC12Fixture(fixture);
  assert.doesNotThrow(() => assertC12BaselineArtifacts({ artifacts: baselines(), c11FixtureText, fileSha256: baselineHashes(), fixtureText: baselineFixtures() }));
  const observed = [];
  const execution = await runC12CandidateQualification({ fixture, fixtureText, provider: fakeProvider(outputs(), observed) });
  assert.deepEqual(observed, order());
  assert.equal(execution.validation.status, 'passed');
  assert.equal(execution.calls.filter((call) => call.status === 'passed').length, 7);
  assert.equal(execution.calls.every((call) => call.retryCount === 0), true);
  assert.equal(execution.promptComparison.v5.length, 7);
  assert.equal(execution.promptComparison.v6.length, 7);
  assert.equal(execution.promptComparison.v5.at(-1).bytes, execution.promptComparison.v6.at(-1).bytes);
  const artifact = buildArtifact(execution);
  assert.equal(artifact.candidateStatus, 'candidate-qualified');
  assert.equal(artifact.localShadowQualified, false);
  assert.doesNotThrow(() => assertC12CandidateArtifact(artifact, {
    baselineArtifacts: baselines(), c11FixtureText, c12FixtureText: fixtureText, fileSha256: baselineHashes(), fixtureText: baselineFixtures(),
  }));
});

test('C12 rejects every strict output failure and stops before a later provider call', async () => {
  const cases = [
    ['malformed JSON', '{', 'structured-output'], ['prose', 'not JSON', 'structured-output'], ['code fence', '```json\\n{}\\n```', 'structured-output'],
    ['duplicate key', '{"summaryText":"a","summaryText":"b"}', 'structured-output'],
    ['missing key', (value) => { delete value.councilStatement.claims[0].severity; }, 'structured-output'],
    ['extra key', (value) => { value.extra = true; }, 'structured-output'],
    ['invalid enum', (value) => { value.councilStatement.claims[0].severity = 'normal | critical'; }, 'structured-output'],
    ['wrong claim id', (value) => { value.councilStatement.claims[0].id = 'foreign:claim-2'; }, 'structured-output'],
    ['foreign evidence', (value) => { value.councilStatement.claims[0].evidenceRefs = ['artifact:foreign']; }, 'structured-output'],
    ['wrong target', (value) => { value.councilStatement.targetClaimIds = ['research:claim-1']; }, 'structured-output'],
    ['next action mismatch', (value) => { value.nextAction = 'Different action.'; }, 'structured-output'],
  ];
  for (const [name, mutation, stage] of cases) {
    const values = outputs();
    const raw = typeof mutation === 'string' ? mutation : null;
    if (typeof mutation === 'function') mutation(values[3]);
    const observed = [];
    const execution = await runC12CandidateQualification({ fixture, fixtureText, provider: fakeProvider(values, observed, { failureIndex: 3, raw }) });
    assert.deepEqual(observed, order().slice(0, 4), name);
    assert.equal(execution.calls[3].status, 'failed', name);
    assert.equal(execution.calls[3].failureStage, stage, name);
    assert.equal(execution.calls[3].retryCount, 0, name);
    for (const call of execution.calls.slice(4)) assert.deepEqual([call.status, call.attemptCount, call.retryCount], ['not-attempted', 0, 0], name);
  }
});

test('C12 local provider keeps strict parsing and one bounded attempt', async () => {
  let requests = 0;
  const provider = createLocalProvider({
    rootDir: repoDir,
    env: { LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:11434/v1', LOCAL_PROVIDER_MODEL: 'qwen2.5:3b' },
    fetchImpl: async () => {
      requests += 1;
      return new Response(JSON.stringify({ error: 'bounded failure' }), { status: 500 });
    },
  });
  await assert.rejects(() => provider.run({
    councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] }, councilPhase: 'opening-position',
    councilPromptProfile: 'seat-scoped-v6-candidate', councilSeatId: 'research', role: 'specialist',
  }));
  assert.equal(requests, 1);
});

test('C12 distinguishes a real deterministic rejection from re-sealed call tampering', async () => {
  const rejectedExecution = await runC12CandidateQualification({
    fixture,
    fixtureText,
    provider: fakeProvider(outputs(), [], { failureIndex: 3, raw: 'not JSON' }),
  });
  const rejected = buildArtifact(rejectedExecution);
  assert.equal(rejected.candidateStatus, 'candidate-rejected');
  assert.equal(rejected.qualification.deterministicContractPassed, false);
  assert.equal(rejected.validation.status, 'blocked');
  assert.doesNotThrow(() => assertC12CandidateArtifact(rejected, {
    baselineArtifacts: baselines(), c11FixtureText, c12FixtureText: fixtureText, fileSha256: baselineHashes(), fixtureText: baselineFixtures(),
  }));

  for (const mutate of [
    (artifact) => { artifact.calls[0].extra = true; },
    (artifact) => { artifact.calls[0].outputText = 'must not persist'; },
    (artifact) => { artifact.baseline.c6.content = 'raw output'; },
  ]) {
    const tampered = buildArtifact(await runC12CandidateQualification({ fixture, fixtureText, provider: fakeProvider(outputs(), []) }));
    mutate(tampered);
    reseal(tampered);
    assert.throws(() => assertC12CandidateArtifact(tampered), /C12 call keys are invalid|C12 c6 baseline keys are invalid|forbidden/u);
  }
});

function buildArtifact(execution) {
  const source = baselines();
  return buildC12CandidateArtifact({
    baseline: Object.fromEntries(Object.entries(source).map(([key, value]) => [key, {
      artifactId: value.id, decision: value.qualification.decision, fileSha256: baselineHashes()[key], integrityHash: value.integrityHash, localShadowQualified: value.localShadowQualified,
    }])),
    calls: execution.calls, fixtureHash: hashLocalCouncilShadowValue(fixtureText), promptComparison: execution.promptComparison,
    qualifiedAt: fixture.qualifiedAt, validation: execution.validation,
  });
}

function fakeProvider(values, observed, { failureIndex = -1, raw = null } = {}) {
  let index = 0;
  return {
    preparePrompt: () => 'C12 deterministic fixture provider.',
    async run(input) {
      observed.push(`${input.councilPhase}:${input.councilSeatId}`);
      const current = index++;
      const outputText = current === failureIndex && raw !== null ? raw : JSON.stringify(values[current]);
      try {
        return { attemptCount: 1, durationMs: 0, outputText, outputTextHash: hashLocalCouncilShadowValue(outputText), retryCount: 0, usageInputTokens: 0, usageOutputTokens: 0, usageTotalTokens: 0 };
      } catch (error) {
        throw error;
      }
    },
    normalizeOutput: (result, input) => normalizeStructuredOutput({ output: parseStrictJsonText(result.outputText, 'C12 fake provider'), role: input.role }, input, 'C12 fake provider'),
  };
}

function outputs() {
  const specialist = (seatId, phase) => ({ summaryText: 'Bounded position.', artifactContent: '# Position', nextAction: 'Keep the stub.', councilStatement: {
    claims: [{ id: `${seatId}:claim-${phase === 'opening-position' ? 1 : 2}`, position: phase === 'opening-position' ? 'unknown' : 'challenge', summary: 'Bounded claim.', evidenceRefs: ['artifact:bounded-plan'], severity: 'normal' }],
    targetClaimIds: phase === 'opening-position' ? [] : [{ research: 'implementation:claim-1', implementation: 'verification:claim-1', verification: 'research:claim-1' }[seatId]], rejectedOptionIds: [], nextAction: 'Keep the stub.',
  } });
  return [
    specialist('research', 'opening-position'), specialist('implementation', 'opening-position'), specialist('verification', 'opening-position'),
    specialist('research', 'rebuttal'), specialist('implementation', 'rebuttal'), specialist('verification', 'rebuttal'),
    { summaryText: 'Bounded decision.', artifactContent: '# Decision', nextAction: 'Keep the default profile unchanged pending independent review.', councilSynthesis: {
      acceptedClaimIds: [], agreementIds: [], evidenceRefs: [], nextAction: 'Keep the default profile unchanged pending independent review.', nextOwner: 'workspace-owner',
      rejectedClaims: ['implementation', 'research', 'verification'].map((seatId) => ({ claimId: `${seatId}:claim-2`, reason: 'Keep unpromoted.' })),
      unresolvedConflictIds: [], unresolvedCriticalConflictIds: [], verificationPlan: ['Verify locally.'],
    } },
  ];
}

function order() { return ['opening-position:research', 'opening-position:implementation', 'opening-position:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair']; }
function baselines() { return Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, readJson(artifactPath(key))])); }
function baselineHashes() { return Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, sha256(artifactPath(key))])); }
function baselineFixtures() { return { c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'), c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'), c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json') }; }
function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json', c11: 'local-council-rebuttal-stability-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }

function reseal(artifact) {
  const { id: _id, integrityHash: _hash, ...content } = artifact;
  artifact.integrityHash = hashLocalCouncilShadowValue(content);
  artifact.id = `local-council-strict-prompt-candidate-qualification-${artifact.integrityHash}`;
}
