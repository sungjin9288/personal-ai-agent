import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowEvidence,
  buildLocalRelevanceShadowEvidence,
} from '../src/core/local-relevance-shadow-evidence.mjs';
import { createLocalRelevanceShadowEvaluator } from '../src/core/local-relevance-shadow.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

const priorStability = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-reranker-runtime-stability.json', 'utf8'),
);
const scorerBinding = priorStability.priorEnvelope.scorer;
const modelDigest = priorStability.runs[0].binding.modelDigest;

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildInput(role) {
  return {
    attachments: [{
      id: 'attachment-style',
      fileName: 'style.md',
      missionId: 'mission-1',
      promptContent: 'Authentication token recovery screen uses a blue button and compact typography.',
    }],
    memoryEntries: [{
      content: 'Renew the expired credential, revalidate identity, and preserve the audit trail.',
      id: 'memory-procedure',
      kind: 'decision',
      scope: 'mission',
      scopeId: 'mission-1',
    }],
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: 'mission-1',
      mode: 'knowledge',
      objective: 'Explain the expired authentication token renewal procedure.',
      title: 'Authentication recovery',
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: role,
    role,
    workspace: { id: 'workspace-1' },
  };
}

async function buildObservations() {
  const observations = [];
  const evaluator = createLocalRelevanceShadowEvaluator({
    clock: () => '2026-07-17T00:00:00.000Z',
    recordObservation: (observation) => observations.push(observation),
    scorer: {
      ...scorerBinding,
      async scoreDocument({ documentText }) {
        return { score: documentText.includes('Renew the expired credential') ? 95 : 5 };
      },
    },
  });
  for (const role of ['manager', 'planner', 'executor', 'reviewer']) {
    const input = buildInput(role);
    await evaluator.observe({
      input,
      lexical: buildRetrievalContextWithCorpus(input),
    });
  }
  return observations;
}

test('shadow evidence binds controlled mission observations to the R10 model and prompt', async () => {
  const observations = await buildObservations();
  const evidence = buildLocalRelevanceShadowEvidence({
    expectedSourceKeyHash: hashValue('memory:memory-procedure'),
    mission: {
      artifactShadowMetadataFound: false,
      providerId: 'stub',
      status: 'completed',
      storeShadowMetadataFound: false,
    },
    observations,
    observedAt: '2026-07-17T00:00:00.000Z',
    priorStability,
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      modelDigest,
      transportLoopback: true,
      version: '0.23.0',
    },
  });

  assertLocalRelevanceShadowEvidence(evidence);
  assert.equal(evidence.actualLocalRelevanceShadowIntegrationValidated, true);
  assert.equal(evidence.actualLocalRelevanceShadowIntegrationQualified, false);
  assert.equal(evidence.mission.providerInputPreserved, true);
  assert.equal(evidence.quality.expectedTopOneCount, 4);
  assert.equal(evidence.runtimeActivation, false);
});

test('shadow evidence rejects model drift and integrity tampering', async () => {
  const observations = await buildObservations();
  const input = {
    expectedSourceKeyHash: hashValue('memory:memory-procedure'),
    mission: {
      artifactShadowMetadataFound: false,
      providerId: 'stub',
      status: 'completed',
      storeShadowMetadataFound: false,
    },
    observations,
    observedAt: '2026-07-17T00:00:00.000Z',
    priorStability,
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      modelDigest,
      transportLoopback: true,
      version: '0.23.0',
    },
  };

  assert.throws(
    () => buildLocalRelevanceShadowEvidence({
      ...input,
      runtime: { ...input.runtime, modelDigest: 'b'.repeat(64) },
    }),
    /retain the R10 loopback model binding/,
  );

  const evidence = buildLocalRelevanceShadowEvidence(input);
  evidence.observations[0].providerInput.changed = true;
  assert.throws(() => assertLocalRelevanceShadowEvidence(evidence), /integrity|observation/);
});
