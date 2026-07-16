import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalRelevanceShadowCacheProcessIsolationEvidence } from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import {
  assertLocalRelevanceShadowCacheTerminationSoakEvidence,
  buildLocalRelevanceShadowCacheTerminationSoakEvidence,
  LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT,
} from '../src/core/local-relevance-shadow-cache-termination-soak.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  runForcedTerminationCacheWorkerProcess,
  runLocalRelevanceCacheWorkerProcess,
} from './local-relevance-cache-process-runner.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const priorEvidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-relevance-shadow-cache-process-isolation.json',
);
const options = parseOptions(process.argv.slice(2));
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const priorEvidence = JSON.parse(fs.readFileSync(priorEvidencePath, 'utf8'));
assertLocalRelevanceShadowCacheProcessIsolationEvidence(priorEvidence);

const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find((item) => item.name === options.model);
const priorBinding = priorEvidence.priorLifecycleEvidenceBinding.cacheBinding;
if (
  !inventoryModel ||
  inventoryModel.digest !== priorBinding.modelDigest ||
  options.model !== priorBinding.modelId ||
  runtimeVersion.version !== priorEvidence.runtime.runtimeVersion
) {
  throw new Error('R16 termination soak runtime does not match the R15 evidence binding.');
}

const scenario = fixture.scenarios[0];
const query = scenario.queries[0];
const source = scenario.memoryEntries[0];
if (!query?.text || !source?.content) {
  throw new Error('R16 termination soak fixture input is incomplete.');
}
const commonInput = {
  documentText: source.content,
  endpoint: options.endpoint,
  model: options.model,
  modelDigest: inventoryModel.digest,
  queryText: query.text,
  runId: randomUUID(),
  timeoutMs: options.timeoutMs,
};
const forced = await runForcedTerminationCacheWorkerProcess({
  input: commonInput,
  timeoutMs: options.workerTimeoutMs,
});
const recoveryWorker = await runLocalRelevanceCacheWorkerProcess({
  input: {
    ...commonInput,
    workerId: 'recovery-worker',
  },
  timeoutMs: options.workerTimeoutMs,
});
const soakWorker = await runLocalRelevanceCacheWorkerProcess({
  input: {
    ...commonInput,
    capacity: LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.capacity,
    mode: 'bounded-soak',
    pairCount: LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.pairCount,
    replayCount: LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.replayCount,
    workerId: 'soak-worker',
  },
  timeoutMs: options.soakTimeoutMs,
});
const evidence = buildLocalRelevanceShadowCacheTerminationSoakEvidence({
  observedAt: new Date().toISOString(),
  priorProcessIsolationEvidence: priorEvidence,
  soakWorker,
  terminationProbe: {
    ...forced,
    recoveryWorker,
  },
});
assertLocalRelevanceShadowCacheTerminationSoakEvidence(evidence);
if (!evidence.actualLocalRelevanceShadowCacheTerminationSoakValidated) {
  throw new Error('R16 termination soak gate failed; lexical runtime remains active.');
}
if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheTerminationSoakQualified: false,
  actualLocalRelevanceShadowCacheTerminationSoakValidated: true,
  cacheCapacity: soakWorker.capacity,
  costFree: true,
  evictionCount: soakWorker.saturatedCacheSnapshot.metrics.evictionCount,
  forcedTerminationSignal: forced.termination.observedSignal,
  heapGrowthBytes: soakWorker.heapGrowthBytes,
  mode: 'local-relevance-shadow-cache-termination-soak',
  modelInferenceCount: soakWorker.saturatedCacheSnapshot.metrics.modelInferenceCount,
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  productionReadyClaim: false,
  recoveryInferenceCount: recoveryWorker.warmCacheSnapshot.metrics.modelInferenceCount,
  rssGrowthBytes: soakWorker.rssGrowthBytes,
  runtimeActivation: false,
}, null, 2));

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique R16 termination soak options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (![
      '--endpoint',
      '--model',
      '--output',
      '--soak-timeout-ms',
      '--timeout-ms',
      '--worker-timeout-ms',
    ].includes(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique R16 termination soak options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  const workerTimeoutMs = Number(values.get('--worker-timeout-ms') || 180_000);
  const soakTimeoutMs = Number(values.get('--soak-timeout-ms') || 900_000);
  if (!endpoint || !model || model.length > 200 || !cloudFeaturesDisabled) {
    throw new Error('R16 termination soak requires loopback endpoint, model, and cloud disable proof.');
  }
  for (const [name, value] of [
    ['timeoutMs', timeoutMs],
    ['workerTimeoutMs', workerTimeoutMs],
    ['soakTimeoutMs', soakTimeoutMs],
  ]) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`R16 termination soak ${name} must be a positive integer.`);
    }
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('R16 termination soak output must stay inside the repository.');
  }
  return {
    cloudFeaturesDisabled,
    endpoint,
    model,
    outputPath,
    soakTimeoutMs,
    timeoutMs,
    workerTimeoutMs,
  };
}
