import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalRelevanceShadowEvidence,
  buildLocalRelevanceShadowEvidence,
} from '../src/core/local-relevance-shadow-evidence.mjs';
import { createLocalRelevanceShadowEvaluator } from '../src/core/local-relevance-shadow.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createRetrievalRuntimeService, RETRIEVAL_RUNTIME_MODES } from '../src/core/retrieval-runtime-service.mjs';
import { createStore } from '../src/core/store.mjs';

const repoDir = process.cwd();
const priorStability = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence', 'output-artifacts', 'local-reranker-runtime-stability.json'),
  'utf8',
));
const scorerBinding = priorStability.priorEnvelope.scorer;
const modelDigest = priorStability.runs[0].binding.modelDigest;
const trackedEvidence = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence', 'output-artifacts', 'local-relevance-shadow-integration.json'),
  'utf8',
));
assertLocalRelevanceShadowEvidence(trackedEvidence);
assert.deepEqual(trackedEvidence, buildLocalRelevanceShadowEvidence({
  expectedSourceKeyHash: trackedEvidence.quality.expectedSourceKeyHash,
  mission: trackedEvidence.mission,
  observations: trackedEvidence.observations,
  observedAt: trackedEvidence.observedAt,
  priorStability,
  runtime: trackedEvidence.runtime,
}));

const passing = await runFixture({
  scorer: {
    ...scorerBinding,
    async scoreDocument({ documentText }) {
      return { score: documentText.includes('renew the credential') ? 95 : 5 };
    },
  },
});
assert.equal(passing.run.mission.status, 'completed');
assert.deepEqual(
  [...new Set(passing.observations.map((item) => item.scope.role))].sort(),
  ['executor', 'manager', 'planner', 'reviewer'],
);
assert.equal(passing.observations.every((item) => item.status === 'observed'), true);
assert.equal(passing.artifactShadowMetadataFound, false);
assert.equal(passing.storeShadowMetadataFound, false);

const fixtureEvidence = buildLocalRelevanceShadowEvidence({
  expectedSourceKeyHash: hashValue(`memory:${passing.expectedMemoryId}`),
  mission: {
    artifactShadowMetadataFound: passing.artifactShadowMetadataFound,
    providerId: 'stub',
    status: passing.run.mission.status,
    storeShadowMetadataFound: passing.storeShadowMetadataFound,
  },
  observations: passing.observations,
  observedAt: '2026-07-17T00:00:00.000Z',
  priorStability,
  runtime: {
    cloudFeaturesDisabled: true,
    kind: 'ollama',
    modelDigest,
    transportLoopback: true,
    version: priorStability.runtime.version,
  },
});
assertLocalRelevanceShadowEvidence(fixtureEvidence);

const failing = await runFixture({
  scorer: {
    ...scorerBinding,
    async scoreDocument() {
      throw new Error('fixture scorer failed with raw content');
    },
  },
});
assert.equal(failing.run.mission.status, 'completed');
assert.equal(
  failing.observations.every((item) => item.status === 'failed-lexical-preserved'),
  true,
);
assert.equal(JSON.stringify(failing.observations).includes('raw content'), false);

const developmentPlan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
for (const term of [
  'status: user-learning-operator-surface-current',
  '| R11 Local relevance shadow integration | 완료 |',
  'npm run smoke:local-relevance-shadow-integration',
  'providerInputPreserved: true',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowIntegrationQualified: false,
  actualLocalRelevanceShadowIntegrationValidated: true,
  costFree: true,
  failurePolicy: 'preserve-lexical',
  mode: 'local-relevance-shadow-integration',
  observationCount: trackedEvidence.mission.observationCount,
  ok: true,
  productionReadyClaim: false,
  providerInputPreserved: true,
  runtimeActivation: false,
  storeSchemaMutationRequired: false,
}, null, 2));

async function runFixture({ scorer }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-shadow-smoke-'));
  try {
    const workspacePath = path.join(rootDir, 'workspace');
    fs.mkdirSync(workspacePath, { recursive: true });
    const observations = [];
    const shadow = createLocalRelevanceShadowEvaluator({
      clock: () => '2026-07-17T00:00:00.000Z',
      recordObservation: (observation) => observations.push(observation),
      scorer,
    });
    const retrievalRuntime = createRetrievalRuntimeService({
      localRelevanceShadow: shadow,
      mode: RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW,
    });
    const store = createStore({ rootDir });
    const service = createMissionService({ rootDir, retrievalRuntime, store });
    const workspace = service.addWorkspace({ workspacePath });
    const mission = service.createMission({
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: 'How should an expired authentication token be renewed while preserving audit evidence?',
      title: 'Authentication recovery',
      workspaceId: workspace.id,
    });
    const memory = service.addMemory({
      content: 'When an authentication token expires, renew the credential, revalidate identity, and preserve the verification audit trail.',
      kind: 'decision',
      scope: 'mission',
      scopeId: mission.id,
    });
    service.addMissionAttachment({
      content: 'Authentication token recovery screen style guide uses a blue button and compact typography.',
      fileName: 'authentication-screen-style.md',
      missionId: mission.id,
    });
    const run = await service.runMission(mission.id, {
      provider: 'stub',
      providerSpecified: true,
    });
    const storeText = JSON.stringify(store.loadState());
    const shadowMarkers = [
      modelDigest,
      scorerBinding.promptHash,
      scorerBinding.id,
      'personal-ai-agent-local-relevance-shadow-observation/v1',
    ];
    return {
      artifactShadowMetadataFound: store.loadState().artifacts
        .filter((artifact) => artifact.path && fs.existsSync(artifact.path))
        .some((artifact) => {
          const content = fs.readFileSync(artifact.path, 'utf8');
          return shadowMarkers.some((marker) => content.includes(marker));
        }),
      expectedMemoryId: memory.id,
      observations,
      run,
      storeShadowMetadataFound: shadowMarkers.some((marker) => storeText.includes(marker)),
    };
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
