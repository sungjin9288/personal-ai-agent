import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplayFixtureContract,
  LOCAL_RELEVANCE_SHADOW_REPLAY_SCHEMA_VERSION,
} from '../src/core/local-relevance-shadow-replay.mjs';
import { assertLocalRelevanceShadowEvidence } from '../src/core/local-relevance-shadow-evidence.mjs';
import {
  createCachedLocalRelevanceScorer,
  LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION,
} from '../src/core/local-relevance-score-cache.mjs';
import {
  buildLocalRelevanceShadowQueryText,
  createLocalRelevanceShadowEvaluator,
  LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS,
  LOCAL_RELEVANCE_SHADOW_SCHEMA_VERSION,
} from '../src/core/local-relevance-shadow.mjs';
import {
  assertLocalRelevanceShadowCacheEvidence,
  buildLocalRelevanceShadowCacheEvidence,
  LOCAL_RELEVANCE_SHADOW_CACHE_EVIDENCE_SCHEMA_VERSION,
} from '../src/core/local-relevance-shadow-cache-evidence.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';
import {
  createRetrievalRuntimeService,
  RETRIEVAL_RUNTIME_MODES,
} from '../src/core/retrieval-runtime-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { buildRetrievalQueryText } from '../src/core/retrieval-service.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const priorEvidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-relevance-shadow-integration.json',
);
const priorReplayPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-relevance-shadow-replay.json',
);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const priorShadowEvidence = JSON.parse(fs.readFileSync(priorEvidencePath, 'utf8'));
assertLocalRelevanceShadowEvidence(priorShadowEvidence);

const fixtureContract = buildLocalRelevanceShadowReplayFixtureContract({
  fixture,
  fixtureHash: hashValue(fixtureText),
});
const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find((item) => item.name === options.model);
if (
  !inventoryModel ||
  inventoryModel.digest !== priorShadowEvidence.priorBinding.modelDigest ||
  options.model !== priorShadowEvidence.observations[0].scorer.modelId
) {
  throw new Error('Shadow replay model does not match the R11 evidence binding.');
}

const baseScorer = createOllamaRelevanceScorer({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
let scorer = baseScorer;
if (options.cacheMaxEntries) {
  scorer = createCachedLocalRelevanceScorer({
    maxEntries: options.cacheMaxEntries,
    modelDigest: inventoryModel.digest,
    scorer: baseScorer,
  });
}
const observations = [];
const shadow = createLocalRelevanceShadowEvaluator({
  queryTextBuilder: options.queryContract === LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS.FULL_RETRIEVAL
    ? buildRetrievalQueryText
    : buildLocalRelevanceShadowQueryText,
  recordObservation: (observation) => observations.push(observation),
  scorer,
});
const retrievalRuntime = createRetrievalRuntimeService({
  localRelevanceShadow: shadow,
  mode: RETRIEVAL_RUNTIME_MODES.LOCAL_RELEVANCE_SHADOW,
});
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-r12-shadow-'));

try {
  const store = createStore({ rootDir });
  const service = createMissionService({ rootDir, retrievalRuntime, store });
  const cases = [];

  for (const scenario of fixture.scenarios) {
    for (const query of scenario.queries) {
      cases.push(await runReplayCase({
        observations,
        query,
        rootDir,
        scenario,
        service,
      }));
    }
  }

  const shadowMarkers = [
    inventoryModel.digest,
    scorer.promptHash,
    scorer.id,
    LOCAL_RELEVANCE_SHADOW_SCHEMA_VERSION,
    LOCAL_RELEVANCE_SHADOW_REPLAY_SCHEMA_VERSION,
    ...(options.cacheMaxEntries
      ? [
          LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION,
          LOCAL_RELEVANCE_SHADOW_CACHE_EVIDENCE_SCHEMA_VERSION,
          'bounded-process-local-lru',
        ]
      : []),
  ];
  const state = store.loadState();
  const storeShadowMetadataFound = shadowMarkers.some((marker) =>
    JSON.stringify(state).includes(marker),
  );
  const artifactShadowMetadataFound = state.artifacts
    .filter((artifact) => artifact.path && fs.existsSync(artifact.path))
    .some((artifact) => {
      const content = fs.readFileSync(artifact.path, 'utf8');
      return shadowMarkers.some((marker) => content.includes(marker));
    });
  for (const item of cases) {
    item.mission.artifactShadowMetadataFound = artifactShadowMetadataFound;
    item.mission.storeShadowMetadataFound = storeShadowMetadataFound;
  }

  const replay = buildLocalRelevanceShadowReplay({
    cases,
    fixtureContract,
    observedAt: new Date().toISOString(),
    priorShadowEvidence,
    queryContract: options.queryContract,
    runtime: {
      cloudFeaturesDisabled: options.cloudFeaturesDisabled,
      kind: 'ollama',
      modelDigest: inventoryModel.digest,
      modelId: options.model,
      transportLoopback: true,
      version: runtimeVersion.version,
    },
  });
  const output = options.cacheMaxEntries
    ? buildLocalRelevanceShadowCacheEvidence({
        cacheReplay: replay,
        cacheSnapshot: scorer.getCacheSnapshot(),
        priorReplay: JSON.parse(fs.readFileSync(priorReplayPath, 'utf8')),
      })
    : replay;
  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  }

  const replaySummary = {
    actualLocalRelevanceShadowReplayQualified:
      replay.actualLocalRelevanceShadowReplayQualified,
    actualLocalRelevanceShadowReplayValidated:
      replay.actualLocalRelevanceShadowReplayValidated,
    caseCount: replay.quality.caseCount,
    casePassRate: replay.quality.casePassRate,
    changedTopOneCount: replay.quality.changedTopOneCount,
    costFree: replay.costFree,
    decision: replay.decision,
    latency: replay.latency,
    lexicalExpectedTopOneCount: replay.quality.lexicalExpectedTopOneCount,
    mode: 'local-relevance-shadow-replay',
    observationCount: replay.quality.observationCount,
    ok: true,
    outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
    productionReadyClaim: replay.productionReadyClaim,
    scenarioCount: replay.quality.scenarioCount,
    status: replay.status,
    variationMetrics: replay.variationMetrics,
  };
  const summary = options.cacheMaxEntries
    ? {
        actualLocalRelevanceShadowCacheQualified:
          output.actualLocalRelevanceShadowCacheQualified,
        actualLocalRelevanceShadowCacheValidated:
          output.actualLocalRelevanceShadowCacheValidated,
        cache: output.comparison,
        caseCount: replay.quality.caseCount,
        casePassRate: replay.quality.casePassRate,
        costFree: true,
        decision: output.decision,
        mode: 'local-relevance-shadow-cache',
        observationCount: replay.quality.observationCount,
        ok: true,
        outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
        productionReadyClaim: false,
        runtimeActivation: false,
        scenarioCount: replay.quality.scenarioCount,
        status: output.status,
      }
    : replaySummary;
  console.log(JSON.stringify(summary, null, 2));
  assertLocalRelevanceShadowReplay(replay);
  if (options.cacheMaxEntries) {
    assertLocalRelevanceShadowCacheEvidence(output);
    if (!output.actualLocalRelevanceShadowCacheValidated) {
      throw new Error('Shadow cache quality or resource gate failed; lexical runtime remains active.');
    }
  }
  if (!replay.actualLocalRelevanceShadowReplayValidated) {
    throw new Error('Shadow replay quality gate failed; lexical runtime remains active.');
  }
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

async function runReplayCase({ observations, query, rootDir, scenario, service }) {
  const caseId = `${scenario.id}:${query.id}`;
  const workspacePath = path.join(rootDir, 'workspaces', scenario.id, query.id);
  fs.mkdirSync(workspacePath, { recursive: true });
  const workspace = service.addWorkspace({
    name: `R12 ${caseId}`,
    workspacePath,
  });
  const mission = service.createMission({
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: query.text,
    title: `R12 ${caseId}`,
    workspaceId: workspace.id,
  });
  const actualSourceKeys = new Map();
  for (const entry of scenario.memoryEntries) {
    if (entry.scope !== 'mission') {
      throw new Error(`R12 replay supports mission-scoped fixture memory only: ${entry.id}.`);
    }
    const stored = service.addMemory({
      content: entry.content,
      kind: entry.kind,
      scope: 'mission',
      scopeId: mission.id,
    });
    actualSourceKeys.set(`memory:${entry.id}`, `memory:${stored.id}`);
  }
  for (const attachment of scenario.attachments) {
    const stored = service.addMissionAttachment({
      content: attachment.promptContent,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      missionId: mission.id,
      source: 'controlled-fixture',
    });
    actualSourceKeys.set(`attachment:${attachment.id}`, `attachment:${stored.id}`);
  }
  const observationStart = observations.length;
  const run = await service.runMission(mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  const expectedSource = scenario.expectedSources[0];
  const actualExpectedSourceKey = actualSourceKeys.get(expectedSource.key);
  if (!actualExpectedSourceKey) {
    throw new Error(`R12 replay could not bind expected source: ${caseId}.`);
  }

  return {
    expectedSourceKeyHash: hashValue(actualExpectedSourceKey),
    expectedSourceType: expectedSource.type,
    id: caseId,
    mission: {
      artifactShadowMetadataFound: false,
      missionIdHash: hashValue(mission.id),
      providerId: 'stub',
      status: run.mission.status,
      storeShadowMetadataFound: false,
    },
    observations: observations.slice(observationStart),
    queryId: query.id,
    scenarioId: scenario.id,
    variationType: query.variationType,
  };
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function parseOptions(args) {
  const allowed = new Set([
    '--cache-max-entries',
    '--endpoint',
    '--model',
    '--output',
    '--query-contract',
    '--timeout-ms',
  ]);
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique shadow replay options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique shadow replay options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = normalizeOption(values.get('--endpoint'));
  const model = normalizeOption(values.get('--model'));
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  const cacheMaxEntries = values.has('--cache-max-entries')
    ? Number(values.get('--cache-max-entries'))
    : null;
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Shadow replay requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Shadow replay timeout must be a positive integer.');
  }
  if (
    cacheMaxEntries !== null &&
    (!Number.isInteger(cacheMaxEntries) || cacheMaxEntries <= 0 || cacheMaxEntries > 4_096)
  ) {
    throw new Error('Shadow replay cache max entries must be between 1 and 4096.');
  }
  const outputValue = normalizeOption(values.get('--output'));
  const queryContract = normalizeOption(
    values.get('--query-contract') || LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS.MISSION_OBJECTIVE,
  );
  if (!Object.values(LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS).includes(queryContract)) {
    throw new Error('Shadow replay query contract is unsupported.');
  }
  if (
    cacheMaxEntries !== null &&
    queryContract !== LOCAL_RELEVANCE_SHADOW_QUERY_CONTRACTS.MISSION_OBJECTIVE
  ) {
    throw new Error('Shadow replay cache requires the mission-objective query contract.');
  }
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Shadow replay output must stay inside the repository.');
  }
  return {
    cacheMaxEntries,
    cloudFeaturesDisabled,
    endpoint,
    model,
    outputPath,
    queryContract,
    timeoutMs,
  };
}

function normalizeOption(value) {
  return String(value || '').trim();
}
