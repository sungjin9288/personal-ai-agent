import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalRagEvidenceSufficiencyAttributionStable,
  assertLocalRagEvidenceSufficiencyShadow,
  assertRagEvidenceSufficiencyArtifact,
  assertRagEvidenceSufficiencyFixtureBinding,
  buildLocalRagEvidenceSufficiencyInferenceContract,
  buildLocalRagEvidenceSufficiencyShadow,
  buildRagEvidenceSufficiencyArtifact,
  evaluateRagEvidenceSufficiencyCase,
  evaluateRagEvidenceSufficiencyDecision,
  evaluateRagEvidenceSufficiencySuite,
} from '../src/core/rag-evidence-sufficiency-evaluation.mjs';

const fixtureText = fs.readFileSync(
  path.join(process.cwd(), 'fixtures/rag-evidence-sufficiency-cases-v1.json'),
  'utf8',
);
const fixture = JSON.parse(fixtureText);

test('Q9 classifies all five fixed states from assertions, not oracle fields', () => {
  const suite = evaluateRagEvidenceSufficiencySuite(fixture);
  assert.deepEqual(suite.cases.map((result) => [result.id, result.state, result.action]), [
    ['conflicting', 'conflicting', 'abstain'],
    ['irrelevant', 'irrelevant', 'request-more-evidence'],
    ['no-evidence', 'no-evidence', 'abstain'],
    ['partial', 'partial', 'request-more-evidence'],
    ['sufficient', 'sufficient', 'answer'],
  ]);
  const alteredOracle = structuredClone(fixture.cases.find((item) => item.id === 'sufficient'));
  alteredOracle.expected = { action: 'abstain', state: 'sufficient' };
  assert.throws(
    () => evaluateRagEvidenceSufficiencyCase(alteredOracle),
    /fixture-expectation-mismatch/,
  );
});

test('Q9 applies conflict precedence and permits matching values from separate sources', () => {
  const matching = structuredClone(fixture.cases.find((item) => item.id === 'sufficient'));
  matching.sources.push({
    assertions: [{ claimKey: 'claim-alpha', valueHash: matching.sources[0].assertions[0].valueHash }],
    sourceKey: 'matching-alpha-source',
  });
  assert.equal(evaluateRagEvidenceSufficiencyCase(matching).state, 'sufficient');
  const conflict = structuredClone(matching);
  delete conflict.expected;
  conflict.sources[0].assertions[0].valueHash = fixture.cases.find((item) => item.id === 'conflicting').sources[1].assertions[0].valueHash;
  assert.equal(evaluateRagEvidenceSufficiencyCase(conflict).state, 'conflicting');
  const withIrrelevant = structuredClone(matching);
  withIrrelevant.sources.push({ assertions: [], sourceKey: 'irrelevant-addition' });
  assert.equal(evaluateRagEvidenceSufficiencyCase(withIrrelevant).state, 'sufficient');
  const withCaseDistinctSource = structuredClone(matching);
  withCaseDistinctSource.sources.push({
    assertions: [],
    sourceKey: matching.sources[0].sourceKey.toUpperCase(),
  });
  assert.equal(evaluateRagEvidenceSufficiencyCase(withCaseDistinctSource).counts.sourceCount, 4);
  const changedSemanticInput = structuredClone(
    fixture.cases.find((item) => item.id === 'sufficient'),
  );
  changedSemanticInput.sources[0].assertions[0].valueHash = 'f'.repeat(64);
  assert.notEqual(
    evaluateRagEvidenceSufficiencyCase(changedSemanticInput).caseHash,
    evaluateRagEvidenceSufficiencyCase(
      fixture.cases.find((item) => item.id === 'sufficient'),
    ).caseHash,
  );
  assert.equal(evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === 'no-evidence')).counts.requiredClaimCount, 2);
});

test('Q9 rejects unsafe decision regressions and request mismatch', () => {
  const sufficient = evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === 'sufficient'));
  const partial = evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === 'partial'));
  const irrelevant = evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === 'irrelevant'));
  assert.deepEqual(evaluateRagEvidenceSufficiencyDecision(partial, { action: 'answer', requestedClaimKeys: [] }), [
    'decision-mismatch', 'evidence-request-mismatch', 'missed-evidence-request', 'unsupported-confident-answer',
  ]);
  assert.deepEqual(evaluateRagEvidenceSufficiencyDecision(sufficient, { action: 'abstain', requestedClaimKeys: [] }), [
    'decision-mismatch', 'unnecessary-abstention',
  ]);
  assert.deepEqual(evaluateRagEvidenceSufficiencyDecision(irrelevant, { action: 'request-more-evidence', requestedClaimKeys: ['claim-alpha'] }), [
    'evidence-request-mismatch',
  ]);
  assert.deepEqual(evaluateRagEvidenceSufficiencyDecision(sufficient, { action: 'request-more-evidence', requestedClaimKeys: [] }), [
    'decision-mismatch', 'unnecessary-evidence-request',
  ]);
  assert.deepEqual(evaluateRagEvidenceSufficiencyDecision(sufficient, {
    action: 'answer',
    requestedClaimKeys: ['claim-alpha'],
  }), ['evidence-request-mismatch']);
  for (const id of ['partial', 'conflicting', 'irrelevant', 'no-evidence']) {
    const result = evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === id));
    assert.ok(
      evaluateRagEvidenceSufficiencyDecision(result, { action: 'answer', requestedClaimKeys: [] })
        .includes('unsupported-confident-answer'),
    );
  }
  for (const id of ['partial', 'irrelevant']) {
    const result = evaluateRagEvidenceSufficiencyCase(fixture.cases.find((item) => item.id === id));
    assert.ok(
      evaluateRagEvidenceSufficiencyDecision(result, { action: 'abstain', requestedClaimKeys: [] })
        .includes('missed-evidence-request'),
    );
  }
});

test('Q9 fails closed for fixture identity, hash, claim, source, and order errors', () => {
  const emptyClaims = structuredClone(fixture.cases[0]); emptyClaims.requiredClaimKeys = [];
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(emptyClaims), /empty-required-claim-set/);
  const unknownClaim = structuredClone(fixture.cases[0]); unknownClaim.sources[0].assertions[0].claimKey = 'unknown';
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(unknownClaim), /unknown-claim-key/);
  const badHash = structuredClone(fixture.cases[0]); badHash.sources[0].assertions[0].valueHash = 'bad';
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(badHash), /invalid-value-hash/);
  const sameSourceConflict = structuredClone(fixture.cases[0]); sameSourceConflict.sources[0].assertions.push({ claimKey: 'claim-alpha', valueHash: fixture.cases[2].sources[1].assertions[0].valueHash });
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(sameSourceConflict), /same-source-conflicting-values/);
  const duplicateClaim = structuredClone(fixture.cases[0]); duplicateClaim.sources[0].assertions.push(structuredClone(duplicateClaim.sources[0].assertions[0]));
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(duplicateClaim), /duplicate-source-claim/);
  const duplicateSource = structuredClone(fixture.cases[0]); duplicateSource.sources.push(structuredClone(duplicateSource.sources[0]));
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(duplicateSource), /duplicate-source-key/);
  const duplicateCase = structuredClone(fixture); duplicateCase.cases[1].id = duplicateCase.cases[0].id;
  assert.throws(() => evaluateRagEvidenceSufficiencySuite(duplicateCase), /duplicate-case-id/);
  const invalidDecision = structuredClone(fixture.cases[0]); invalidDecision.observedDecision = { action: 'invent', requestedClaimKeys: [] };
  assert.throws(() => evaluateRagEvidenceSufficiencyCase(invalidDecision), /invalid-candidate-decision/);
  const invalidPolicy = structuredClone(fixture); invalidPolicy.policyVersion = 'changed';
  assert.throws(() => evaluateRagEvidenceSufficiencySuite(invalidPolicy), /invalid-policy-version/);
  const reordered = structuredClone(fixture); reordered.cases.reverse();
  assert.deepEqual(evaluateRagEvidenceSufficiencySuite(reordered).cases, evaluateRagEvidenceSufficiencySuite(fixture).cases);
});

test('Q9 content-free artifacts reject semantic and shadow drift', () => {
  const suite = evaluateRagEvidenceSufficiencySuite(fixture);
  const artifact = buildRagEvidenceSufficiencyArtifact({
    fixtureHash: createHash('sha256').update(fixtureText).digest('hex'),
    suite,
  });
  assert.doesNotThrow(() => assertRagEvidenceSufficiencyArtifact(artifact));
  assert.doesNotThrow(() => assertRagEvidenceSufficiencyFixtureBinding(artifact, fixtureText));
  assert.throws(
    () => assertRagEvidenceSufficiencyFixtureBinding(artifact, `${fixtureText}\n`),
    /fixture binding failed: artifact drift/,
  );
  const driftedFixture = structuredClone(fixture);
  driftedFixture.cases.find((item) => item.id === 'sufficient').sources[0].text += ' changed';
  assert.throws(
    () => assertRagEvidenceSufficiencyFixtureBinding(artifact, JSON.stringify(driftedFixture)),
    /fixture binding failed: artifact drift/,
  );
  assert.equal(artifact.actualUserQueryData, false);

  const invalidSuite = structuredClone(suite);
  invalidSuite.cases[0].state = 'sufficient';
  invalidSuite.cases[0].action = 'answer';
  const invalidArtifact = buildRagEvidenceSufficiencyArtifact({
    fixtureHash: 'a'.repeat(64),
    suite: invalidSuite,
  });
  assert.throws(
    () => assertRagEvidenceSufficiencyArtifact(invalidArtifact),
    /semantic validation/,
  );
  const impossibleConflict = rehashArtifact(artifact, (content) => {
    content.cases.find((item) => item.state === 'conflicting').counts.coveredClaimCount = 0;
  });
  assert.throws(
    () => assertRagEvidenceSufficiencyArtifact(impossibleConflict),
    /semantic validation/,
  );
  const singleSourceConflict = rehashArtifact(artifact, (content) => {
    const target = content.cases.find((item) => item.state === 'conflicting');
    target.counts.coveredClaimCount = 1;
    target.counts.sourceCount = 1;
    target.sourceHashes = [target.sourceHashes[0]];
  });
  assert.throws(
    () => assertRagEvidenceSufficiencyArtifact(singleSourceConflict),
    /semantic validation/,
  );
  for (const state of ['irrelevant', 'no-evidence', 'partial']) {
    const impossibleConflictState = rehashArtifact(artifact, (content) => {
      const target = content.cases.find((item) => item.state === state);
      target.conflictingClaimHashes = [target.claimHashes[0]];
    });
    assert.throws(
      () => assertRagEvidenceSufficiencyArtifact(impossibleConflictState),
      /semantic validation/,
    );
  }
  const duplicateState = rehashArtifact(artifact, (content) => {
    const source = content.cases.find((item) => item.state === 'sufficient');
    const target = content.cases.find((item) => item.state === 'no-evidence');
    Object.assign(target, {
      action: source.action,
      claimHashes: source.claimHashes,
      conflictingClaimHashes: source.conflictingClaimHashes,
      counts: source.counts,
      requestedClaimHashes: source.requestedClaimHashes,
      sourceHashes: source.sourceHashes,
      state: source.state,
    });
  });
  assert.throws(
    () => assertRagEvidenceSufficiencyArtifact(duplicateState),
    /semantic validation/,
  );

  const observations = suite.cases.map((result) => ({
    caseHash: result.caseHash,
    failureCodes: [],
    modelAction: result.action,
    requestedClaimHashes: result.requestedClaimKeys.map((key) =>
      createHash('sha256').update(key).digest('hex')),
  }));
  const inferenceContract = buildLocalRagEvidenceSufficiencyInferenceContract({
    fixture,
    model: 'local-fixture-model',
  });
  const shadow = buildLocalRagEvidenceSufficiencyShadow({
    deterministicArtifact: artifact,
    inferenceContractHash: inferenceContract.inferenceContractHash,
    model: {
      digest: 'b'.repeat(64),
      id: 'local-fixture-model',
      licenseHash: 'c'.repeat(64),
    },
    observations,
    observedAt: '2026-07-27T00:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: 'fixture',
    },
  });
  assert.doesNotThrow(() => assertLocalRagEvidenceSufficiencyShadow(
    shadow,
    {
      deterministicArtifact: artifact,
      inferenceContractHash: inferenceContract.inferenceContractHash,
    },
  ));
  assert.equal(shadow.actualModelEvaluated, true);
  const driftedInferenceContract = buildLocalRagEvidenceSufficiencyInferenceContract({
    fixture,
    model: 'changed-fixture-model',
  });
  const driftedInferenceShadow = rehashShadow(shadow, (content) => {
    content.inferenceContractHash = driftedInferenceContract.inferenceContractHash;
  });
  assert.throws(() => assertLocalRagEvidenceSufficiencyShadow(
    driftedInferenceShadow,
    {
      deterministicArtifact: artifact,
      inferenceContractHash: inferenceContract.inferenceContractHash,
    },
  ), /semantic validation/);
  assert.doesNotThrow(() => assertLocalRagEvidenceSufficiencyAttributionStable({
    modelDigestAfter: 'b'.repeat(64),
    modelDigestBefore: 'b'.repeat(64),
    runtimeVersionAfter: 'fixture',
    runtimeVersionBefore: 'fixture',
  }));
  assert.throws(() => assertLocalRagEvidenceSufficiencyAttributionStable({
    modelDigestAfter: 'e'.repeat(64),
    modelDigestBefore: 'b'.repeat(64),
    runtimeVersionAfter: 'fixture',
    runtimeVersionBefore: 'fixture',
  }), /attribution changed during evaluation/);
  assert.throws(() => assertLocalRagEvidenceSufficiencyAttributionStable({
    modelDigestAfter: 'b'.repeat(64),
    modelDigestBefore: 'b'.repeat(64),
    runtimeVersionAfter: 'changed',
    runtimeVersionBefore: 'fixture',
  }), /attribution changed during evaluation/);
  assert.throws(
    () => buildLocalRagEvidenceSufficiencyShadow({
      deterministicArtifact: artifact,
      inferenceContractHash: inferenceContract.inferenceContractHash,
      model: {
        digest: 'b'.repeat(64),
        id: 'local-fixture-model',
        licenseHash: 'c'.repeat(64),
      },
      observations: [{
        ...observations[0],
        failureCodes: ['raw-error'],
      }, ...observations.slice(1)],
      observedAt: '2026-07-27T00:00:00.000Z',
      runtime: {
        cloudFeaturesDisabled: true,
        kind: 'ollama',
        transportLoopback: true,
        version: 'fixture',
      },
    }),
    /observation is invalid/,
  );
});

function rehashArtifact(artifact, mutate) {
  const copy = structuredClone(artifact);
  delete copy.id;
  delete copy.integrityHash;
  mutate(copy);
  const integrityHash = createHash('sha256').update(JSON.stringify(copy)).digest('hex');
  return {
    ...copy,
    id: `rag-evidence-sufficiency-${integrityHash}`,
    integrityHash,
  };
}

function rehashShadow(shadow, mutate) {
  const copy = structuredClone(shadow);
  delete copy.id;
  delete copy.integrityHash;
  mutate(copy);
  const integrityHash = createHash('sha256').update(JSON.stringify(copy)).digest('hex');
  return {
    ...copy,
    id: `local-rag-evidence-sufficiency-shadow-${integrityHash}`,
    integrityHash,
  };
}
