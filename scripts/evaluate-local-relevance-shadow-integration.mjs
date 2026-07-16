import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalRelevanceShadowEvidence,
  buildLocalRelevanceShadowEvidence,
} from '../src/core/local-relevance-shadow-evidence.mjs';
import { createLocalRelevanceShadowEvaluator } from '../src/core/local-relevance-shadow.mjs';
import { assertLocalRerankerRuntimeStability } from '../src/core/local-reranker-runtime-stability.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';
import { createRetrievalRuntimeService, RETRIEVAL_RUNTIME_MODES } from '../src/core/retrieval-runtime-service.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createStore } from '../src/core/store.mjs';

const repoDir = process.cwd();
const stabilityPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-reranker-runtime-stability.json',
);
const options = parseOptions(process.argv.slice(2));
const priorStability = JSON.parse(fs.readFileSync(stabilityPath, 'utf8'));
assertLocalRerankerRuntimeStability(priorStability);

const binding = priorStability.runs[0].binding;
if (
  priorStability.actualLocalRerankerRuntimeStabilityValidated !== true ||
  priorStability.runtimeActivation !== false ||
  priorStability.lifecycle.modelId !== options.model
) {
  throw new Error('R11 requires the current validated and inactive R10 runtime stability evidence.');
}

const version = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find((item) => item.name === options.model);
if (!inventoryModel || inventoryModel.digest !== binding.modelDigest) {
  throw new Error('Shadow integration model digest does not match the R10 binding.');
}

const scorer = createOllamaRelevanceScorer({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const observations = [];
const shadow = createLocalRelevanceShadowEvaluator({
  recordObservation: (observation) => observations.push(observation),
  scorer,
});
const retrievalRuntime = createRetrievalRuntimeService({
  localRelevanceShadow: shadow,
  mode: RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW,
});

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-r11-shadow-'));
try {
  const workspacePath = path.join(rootDir, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });
  const store = createStore({ rootDir });
  const service = createMissionService({ rootDir, retrievalRuntime, store });
  const workspace = service.addWorkspace({
    name: 'R11 shadow fixture',
    workspacePath,
  });
  const mission = service.createMission({
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'How should an expired authentication token be renewed while preserving audit evidence?',
    title: 'Authentication recovery shadow comparison',
    workspaceId: workspace.id,
  });
  const expectedMemory = service.addMemory({
    content: 'When an authentication token expires, renew the credential, revalidate identity, and preserve the verification audit trail. This recovery procedure restores access.',
    kind: 'decision',
    scope: 'mission',
    scopeId: mission.id,
  });
  service.addMissionAttachment({
    content: 'Authentication token recovery screen style guide: use a blue button, compact typography, and centered layout. This visual document does not define the access restoration procedure.',
    fileName: 'authentication-screen-style.md',
    mimeType: 'text/markdown',
    missionId: mission.id,
    source: 'controlled-fixture',
  });
  service.addMissionAttachment({
    content: 'Office badge colors, lobby opening hours, and visitor desk locations.',
    fileName: 'office-access.md',
    mimeType: 'text/markdown',
    missionId: mission.id,
    source: 'controlled-fixture',
  });

  const run = await service.runMission(mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  const storeText = JSON.stringify(store.loadState());
  const shadowMarkers = [
    binding.modelDigest,
    binding.promptHash,
    binding.scorerId,
    'personal-ai-agent-local-relevance-shadow-observation/v1',
  ];
  const storeShadowMetadataFound = shadowMarkers.some((marker) => storeText.includes(marker));
  const artifactShadowMetadataFound = store.loadState().artifacts
    .filter((artifact) => artifact.path && fs.existsSync(artifact.path))
    .some((artifact) => {
      const content = fs.readFileSync(artifact.path, 'utf8');
      return shadowMarkers.some((marker) => content.includes(marker));
    });
  const observedAt = new Date().toISOString();
  const evidence = buildLocalRelevanceShadowEvidence({
    expectedSourceKeyHash: hashValue(`memory:${expectedMemory.id}`),
    mission: {
      artifactShadowMetadataFound,
      providerId: 'stub',
      status: run.mission.status,
      storeShadowMetadataFound,
    },
    observations,
    observedAt,
    priorStability,
    runtime: {
      cloudFeaturesDisabled: options.cloudFeaturesDisabled,
      kind: 'ollama',
      modelDigest: inventoryModel.digest,
      transportLoopback: true,
      version: version.version,
    },
  });

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  }
  assertLocalRelevanceShadowEvidence(evidence);

  console.log(JSON.stringify({
    actualLocalRelevanceShadowIntegrationQualified:
      evidence.actualLocalRelevanceShadowIntegrationQualified,
    actualLocalRelevanceShadowIntegrationValidated:
      evidence.actualLocalRelevanceShadowIntegrationValidated,
    costFree: evidence.costFree,
    decision: evidence.decision,
    mode: 'local-relevance-shadow-integration',
    observationCount: evidence.mission.observationCount,
    ok: true,
    outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
    productionReadyClaim: evidence.productionReadyClaim,
    providerInputPreserved: evidence.mission.providerInputPreserved,
    quality: evidence.quality,
    roles: evidence.mission.roles,
    runtimeActivation: evidence.runtimeActivation,
    status: evidence.status,
  }, null, 2));
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function parseOptions(args) {
  const allowed = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique shadow integration options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique shadow integration options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Shadow integration requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Shadow integration timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Shadow integration output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}
