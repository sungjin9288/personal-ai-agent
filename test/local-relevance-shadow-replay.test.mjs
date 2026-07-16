import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplayFixtureContract,
} from '../src/core/local-relevance-shadow-replay.mjs';
import { createLocalRelevanceShadowEvaluator } from '../src/core/local-relevance-shadow.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

const fixtureText = fs.readFileSync('fixtures/retrieval-robustness-cases-v1.json', 'utf8');
const fixture = JSON.parse(fixtureText);
const priorShadowEvidence = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-shadow-integration.json', 'utf8'),
);
const scorerBinding = priorShadowEvidence.observations[0].scorer;

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function scoreExpectedProcedure(documentText) {
  return /renew the credential|issue the refund|transfer ownership/.test(documentText) ? 95 : 5;
}

function buildInput({ query, role, scenario }) {
  return {
    attachments: scenario.attachments,
    memoryEntries: scenario.memoryEntries,
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: scenario.missionId,
      mode: 'knowledge',
      objective: query.text,
      title: query.text,
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: role,
    role,
    workspace: { id: `workspace-${scenario.id}` },
  };
}

async function buildCases({ scoreDocument = scoreExpectedProcedure } = {}) {
  const cases = [];
  for (const scenario of fixture.scenarios) {
    for (const query of scenario.queries) {
      const observations = [];
      const evaluator = createLocalRelevanceShadowEvaluator({
        clock: () => '2026-07-17T00:00:00.000Z',
        recordObservation: (observation) => observations.push(observation),
        scorer: {
          ...scorerBinding,
          async scoreDocument({ documentText }) {
            return { score: scoreDocument(documentText) };
          },
        },
      });
      for (const role of ['manager', 'planner', 'executor', 'reviewer']) {
        const input = buildInput({ query, role, scenario });
        await evaluator.observe({
          input,
          lexical: buildRetrievalContextWithCorpus(input),
        });
      }
      cases.push({
        expectedSourceKeyHash: hashValue(scenario.expectedSources[0].key),
        expectedSourceType: scenario.expectedSources[0].type,
        id: `${scenario.id}:${query.id}`,
        mission: {
          artifactShadowMetadataFound: false,
          missionIdHash: hashValue(scenario.missionId),
          providerId: 'stub',
          status: 'completed',
          storeShadowMetadataFound: false,
        },
        observations,
        queryId: query.id,
        scenarioId: scenario.id,
        variationType: query.variationType,
      });
    }
  }
  return cases;
}

function buildReplayInput(cases) {
  return {
    cases,
    fixtureContract: buildLocalRelevanceShadowReplayFixtureContract({
      fixture,
      fixtureHash: hashValue(fixtureText),
    }),
    observedAt: '2026-07-17T00:00:00.000Z',
    priorShadowEvidence,
    queryContract: 'mission-objective-v1',
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      modelDigest: priorShadowEvidence.priorBinding.modelDigest,
      modelId: scorerBinding.modelId,
      transportLoopback: true,
      version: priorShadowEvidence.runtime.version,
    },
  };
}

test('multi-scenario replay validates all 15 cases and 60 role observations', async () => {
  const replay = buildLocalRelevanceShadowReplay(buildReplayInput(await buildCases()));

  assertLocalRelevanceShadowReplay(replay);
  assert.equal(replay.actualLocalRelevanceShadowReplayValidated, true);
  assert.equal(replay.actualLocalRelevanceShadowReplayQualified, false);
  assert.equal(replay.quality.scenarioCount, 3);
  assert.equal(replay.quality.caseCount, 15);
  assert.equal(replay.quality.observationCount, 60);
  assert.equal(replay.quality.expectedTopOneCount, 60);
  assert.equal(replay.quality.casePassRate, 1);
  assert.equal(replay.variationMetrics['hard-negative'].casePassRate, 1);
  assert.equal(replay.variationMetrics['cross-language'].casePassRate, 1);
  assert.equal(replay.latency.modelInferenceCount, 116);
  assert.equal(replay.runtimeActivation, false);
});

test('replay rejects missing cases, model drift, and observation tampering', async () => {
  const cases = await buildCases();
  const input = buildReplayInput(cases);

  assert.throws(
    () => buildLocalRelevanceShadowReplay({ ...input, cases: cases.slice(1) }),
    /exactly match the fixture contract/,
  );
  assert.throws(
    () => buildLocalRelevanceShadowReplay({
      ...input,
      runtime: { ...input.runtime, modelDigest: 'b'.repeat(64) },
    }),
    /retain the R11 model binding/,
  );

  const tampered = structuredClone(cases);
  tampered[0].observations[0].providerInput.changed = true;
  assert.throws(
    () => buildLocalRelevanceShadowReplay({ ...input, cases: tampered }),
    /Local relevance shadow observation failed/,
  );
});

test('quality regression remains valid failed evidence with a lexical decision', async () => {
  const cases = await buildCases({
    scoreDocument(documentText) {
      return scoreExpectedProcedure(documentText) === 95 ? 5 : 95;
    },
  });
  const replay = buildLocalRelevanceShadowReplay(buildReplayInput(cases));

  assert.equal(replay.actualLocalRelevanceShadowReplayValidated, false);
  assert.equal(replay.status, 'failed-keep-lexical');
  assert.equal(replay.decision, 'keep-lexical');
  assert.doesNotThrow(() => assertLocalRelevanceShadowReplay(replay));
});
