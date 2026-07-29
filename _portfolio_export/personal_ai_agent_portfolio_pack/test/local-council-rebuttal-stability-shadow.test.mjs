import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertC11BaselineArtifacts,
  assertC11Fixture,
  assertC11LocalCouncilArtifact,
  buildC11LocalCouncilArtifact,
  runC11CouncilShadow,
} from '../src/core/local-council-rebuttal-stability-shadow.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { buildRequestPrompt, normalizeStructuredOutput, parseStrictJsonText } from '../src/providers/structured-provider-utils.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';

const repoDir = process.cwd();
const fixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const fixture = JSON.parse(fixtureText);

test('C11 freezes C6-C10 baseline bytes and validates the canonical fixture', () => {
  assertC11Fixture(fixture);
  assert.doesNotThrow(() => assertC11BaselineArtifacts({ artifacts: baselines(), fileSha256: baselineHashes(), fixtureText: baselineFixtures() }));
});

test('C11 fake provider uses the actual seven-stage Council and manifest pipeline', async () => {
  const observed = [];
  const execution = await runC11CouncilShadow({ fixture, fixtureText, provider: fakeProvider(outputs(), observed) });
  assert.deepEqual(observed, order());
  assert.equal(execution.validation.status, 'passed');
  assert.equal(execution.calls.filter((call) => call.status === 'passed').length, 7);
  const artifact = buildArtifact(execution);
  assert.equal(artifact.promptProfile.hash, '33b2c3867353765e28e3ae2db5396bf2706c93eaa19fa416c2f4df603b8f5179');
  assert.doesNotThrow(() => assertC11LocalCouncilArtifact(artifact, {
    baselineArtifacts: baselines(),
    c11FixtureText: fixtureText,
    fileSha256: baselineHashes(),
    fixtureText: baselineFixtures(),
  }));
  assert.throws(() => assertC11LocalCouncilArtifact(artifact, {
    baselineArtifacts: baselines(),
    c11FixtureText: fixtureText.replace('artifact:bounded-plan', 'artifact:changed-plan'),
    fileSha256: baselineHashes(),
    fixtureText: baselineFixtures(),
  }), /prompt or fixture binding/u);
});

test('C11 evaluator refuses an existing artifact before runtime access', () => {
  const result = spawnSync(process.execPath, [
    'scripts/evaluate-local-council-rebuttal-stability-shadow.mjs',
    '--endpoint', 'http://127.0.0.1:11434',
    '--model', 'qwen2.5:3b',
    '--cloud-features-disabled', 'true',
    '--output', 'evidence/output-artifacts/local-council-rebuttal-stability-shadow.json',
  ], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /one-run evaluator cannot run again/u);
});

test('C11 local provider adapter reaches chair through the actual seven-stage pipeline', async () => {
  const values = outputs();
  let requests = 0;
  const provider = createLocalProvider({
    rootDir: repoDir,
    env: {
      LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:11434/v1',
      LOCAL_PROVIDER_MODEL: 'qwen2.5:3b',
    },
    fetchImpl: async () => {
      const output = values[requests];
      requests += 1;
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(output) } }],
        id: `fake-${requests}`,
        usage: { completion_tokens: 3, prompt_tokens: 2, total_tokens: 5 },
      }), { status: 200 });
    },
  });
  const execution = await runC11CouncilShadow({ fixture, fixtureText, provider });
  assert.equal(requests, 7);
  assert.equal(execution.validation.status, 'passed');
  assert.equal(execution.calls.every((call) => call.status === 'passed'), true);
});

test('C11 local provider exposes only parsed output and outputTextHash', async () => {
  let requests = 0;
  const provider = createLocalProvider({ rootDir: repoDir, env: { LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:11434/v1', LOCAL_PROVIDER_MODEL: 'qwen2.5:3b' }, fetchImpl: async () => {
    requests += 1;
    return new Response(JSON.stringify({ id: 'fake', choices: [{ message: { content: JSON.stringify(outputs()[0]) } }], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }), { status: 200 });
  } });
  const result = await provider.run({ councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] }, councilPhase: 'opening-position', councilPromptProfile: 'seat-scoped-v5', councilSeatId: 'research', role: 'specialist' });
  assert.equal(requests, 1);
  assert.equal(Object.hasOwn(result, 'outputText'), false);
  assert.match(result.outputTextHash, /^[a-f0-9]{64}$/);

  const legacyProvider = createLocalProvider({
    rootDir: repoDir,
    env: {
      LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:11434/v1',
      LOCAL_PROVIDER_MODEL: 'qwen2.5:3b',
    },
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"summaryText":"legacy"}' } }],
      id: 'legacy',
      usage: { completion_tokens: 1, prompt_tokens: 1, total_tokens: 2 },
    }), { status: 200 }),
  });
  const legacyResult = await legacyProvider.run({
    councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] },
    councilPhase: 'opening-position',
    councilPromptProfile: 'seat-scoped-v4',
    councilSeatId: 'research',
    role: 'specialist',
  });
  assert.equal(Object.hasOwn(legacyResult, 'outputTextHash'), false);
});

test('C11 local provider makes one request and never retries a failed response', async () => {
  let requests = 0;
  const provider = createLocalProvider({ rootDir: repoDir, env: {
    LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:11434/v1',
    LOCAL_PROVIDER_MODEL: 'qwen2.5:3b',
  }, fetchImpl: async () => {
    requests += 1;
    return new Response(JSON.stringify({ error: 'bounded failure' }), { status: 500 });
  } });
  await assert.rejects(() => provider.run({
    councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] },
    councilPhase: 'opening-position',
    councilPromptProfile: 'seat-scoped-v5',
    councilSeatId: 'research',
    role: 'specialist',
  }));
  assert.equal(requests, 1);
});

test('C11 strict parsing keeps malformed and exact-shape failures at structured-output', async () => {
  for (const [name, raw] of [['code fence', '```json\n{}\n```'], ['duplicate JSON key', '{"summaryText":"a","summaryText":"b"}'], ['malformed JSON', '{']]) {
    await assertFailure({ name, raw, stage: 'structured-output', index: 3 });
  }
  const value = outputs(); delete value[3].councilStatement.claims[0].severity;
  await assertFailure({ name: 'missing severity exact key', values: value, stage: 'structured-output', index: 3 });
  value[3] = outputs()[3]; value[3].extra = true;
  await assertFailure({ name: 'extra top-level key', values: value, stage: 'structured-output', index: 3 });
  const missingClaimId = outputs(); delete missingClaimId[3].councilStatement.claims[0].id;
  await assertFailure({ name: 'missing claim id', values: missingClaimId, stage: 'structured-output', index: 3 });
  const mismatchedNextAction = outputs(); mismatchedNextAction[3].nextAction = 'Different action.';
  await assertFailure({ name: 'mismatched next action', values: mismatchedNextAction, stage: 'structured-output', index: 3 });
});

test('C11 parsed specialist enum, target, evidence, and CouncilStatement failures are council-rebuttal', async () => {
  const cases = [
    ['invalid enum', (value) => { value.councilStatement.claims[0].severity = 'normal | critical'; }],
    ['foreign claim id', (value) => { value.councilStatement.claims[0].id = 'foreign:claim-2'; }],
    ['foreign target', (value) => { value.councilStatement.targetClaimIds = ['foreign:claim-1']; }],
    ['missing target', (value) => { value.councilStatement.targetClaimIds = []; }],
    ['duplicate target', (value) => { value.councilStatement.targetClaimIds.push(value.councilStatement.targetClaimIds[0]); }],
    ['foreign evidence', (value) => { value.councilStatement.claims[0].evidenceRefs = ['artifact:foreign']; }],
    ['missing evidence', (value) => { value.councilStatement.claims[0].evidenceRefs = []; }],
    ['duplicate evidence', (value) => { value.councilStatement.claims[0].evidenceRefs.push(value.councilStatement.claims[0].evidenceRefs[0]); }],
  ];
  for (const [name, mutate] of cases) {
    const values = outputs(); mutate(values[3]);
    await assertFailure({ name, values, stage: 'council-rebuttal', index: 3 });
  }
});

test('C11 provider, chair semantic, and manifest failures preserve taxonomy and stop', async () => {
  const execution = await assertFailure({ name: 'provider request', providerFailure: true, stage: 'provider-request', index: 3 });
  const artifact = buildArtifact(execution);
  artifact.calls[3].failureKind = 'arbitrary-unclassified-value';
  reseal(artifact);
  assert.throws(() => assertC11LocalCouncilArtifact(artifact, {
    baselineArtifacts: baselines(),
    c11FixtureText: fixtureText,
    fileSha256: baselineHashes(),
    fixtureText: baselineFixtures(),
  }), /failure taxonomy/u);
  const chairShape = outputs(); chairShape[6].councilSynthesis.verificationPlan = [];
  await assertFailure({ name: 'chair exact shape', values: chairShape, stage: 'structured-output', index: 6 });
  const synthesisSemantic = outputs(); synthesisSemantic[6].councilSynthesis.acceptedClaimIds = ['research:claim-1'];
  await assertFailure({ name: 'synthesis semantic', values: synthesisSemantic, stage: 'council-synthesis', index: 6 });
  const manifest = outputs(); manifest[3].councilStatement.claims[0].severity = 'critical'; manifest[6].councilSynthesis.rejectedClaims = manifest[6].councilSynthesis.rejectedClaims.filter((item) => item.claimId !== 'research:claim-2'); manifest[6].councilSynthesis.unresolvedCriticalConflictIds = ['research:claim-2']; manifest[6].councilSynthesis.unresolvedConflictIds = ['research:claim-2'];
  await assertFailure({ name: 'manifest', values: manifest, stage: 'council-manifest', index: 6 });
});

async function assertFailure({ name, values = outputs(), raw = null, providerFailure = false, stage, index }) {
  const observed = [];
  const execution = await runC11CouncilShadow({ fixture, fixtureText, provider: fakeProvider(values, observed, { raw, providerFailure, failureIndex: index }) });
  assert.deepEqual(observed, order().slice(0, index + 1), name);
  assert.equal(execution.calls[index].status, 'failed', name);
  assert.equal(execution.calls[index].failureStage, stage, name);
  assert.equal(execution.calls[index].attemptCount, 1, name);
  assert.equal(execution.calls[index].retryCount, 0, name);
  for (const call of execution.calls.slice(index + 1)) assert.deepEqual([call.status, call.attemptCount, call.retryCount], ['not-attempted', 0, 0], name);
  if (stage === 'provider-request') assert.equal(execution.calls[index].outputHash, null, name);
  else {
    assert.match(execution.calls[index].outputHash, /^[a-f0-9]{64}$/, name);
    assert.deepEqual([
      execution.calls[index].durationMs,
      execution.calls[index].inputTokens,
      execution.calls[index].outputTokens,
      execution.calls[index].totalTokens,
    ], [1, 2, 3, 5], name);
  }
  return execution;
}

function fakeProvider(values, observed, { raw = null, providerFailure = false, failureIndex = -1 } = {}) {
  let index = 0;
  return {
    preparePrompt: (input) => `fake ${input.councilPhase}:${input.councilSeatId}`,
    async run(input) {
      observed.push(`${input.councilPhase}:${input.councilSeatId}`);
      const current = index++;
      if (providerFailure && current === failureIndex) throw new Error('provider unavailable');
      const outputText = current === failureIndex && raw !== null ? raw : JSON.stringify(values[current]);
      try {
        return { attemptCount: 1, durationMs: 1, output: parseStrictJsonText(outputText, 'fake'), outputText, outputTextHash: hashLocalCouncilShadowValue(outputText), retryCount: 0, usageInputTokens: 2, usageOutputTokens: 3, usageTotalTokens: 5 };
      } catch (error) {
        error.failure = {
          ...error.failure,
          attemptCount: 1,
          durationMs: 1,
          retryCount: 0,
          usageInputTokens: 2,
          usageOutputTokens: 3,
          usageTotalTokens: 5,
        };
        error.outputTextHash = hashLocalCouncilShadowValue(outputText);
        throw error;
      }
    },
    normalizeOutput: (result, input) => normalizeStructuredOutput(result, input, 'fake'),
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
    { summaryText: 'Bounded decision.', artifactContent: '# Decision', nextAction: 'Keep the stub.', councilSynthesis: {
      acceptedClaimIds: [], agreementIds: [], evidenceRefs: [], nextAction: 'Keep the stub.', nextOwner: 'workspace-owner',
      rejectedClaims: ['implementation', 'research', 'verification'].map((seatId) => ({ claimId: `${seatId}:claim-2`, reason: 'Keep unpromoted.' })),
      unresolvedConflictIds: [], unresolvedCriticalConflictIds: [], verificationPlan: ['Verify locally.'],
    } },
  ];
}

function buildArtifact(execution) {
  return buildC11LocalCouncilArtifact({
    baseline: Object.fromEntries(Object.entries(baselines()).map(([key, value]) => [key, {
      artifactId: value.id,
      decision: value.qualification.decision,
      fileSha256: baselineHashes()[key],
      integrityHash: value.integrityHash,
      localShadowQualified: value.localShadowQualified,
    }])),
    calls: execution.calls,
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
    model: { digest: 'a'.repeat(64), id: 'qwen2.5:3b', licenseHash: 'b'.repeat(64), sizeBytes: 1 },
    observedAt: '2026-07-29T00:00:00.000Z',
    runtime: {
      afterContextLength: 4096,
      afterLoaded: true,
      afterSizeBytes: 1,
      afterVramBytes: 1,
      beforeLoaded: false,
      cloudFeaturesDisabled: true,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: 'test',
    },
    validation: execution.validation,
  });
}
function reseal(artifact) {
  delete artifact.id;
  delete artifact.integrityHash;
  artifact.integrityHash = hashLocalCouncilShadowValue(artifact);
  artifact.id = `local-council-rebuttal-stability-shadow-${artifact.integrityHash}`;
}
function baselines() { return Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, readJson(artifactPath(key))])); }
function baselineHashes() { return Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, sha256(artifactPath(key))])); }
function baselineFixtures() { return { c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'), c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'), c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json') }; }
function order() { return ['opening-position:research', 'opening-position:implementation', 'opening-position:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair']; }
function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
