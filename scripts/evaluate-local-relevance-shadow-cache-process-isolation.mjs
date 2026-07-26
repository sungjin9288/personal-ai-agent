import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowCacheProcessIsolationEvidence,
  buildLocalRelevanceCacheInputHash,
  buildLocalRelevanceShadowCacheProcessIsolationEvidence,
} from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import { assertLocalRelevanceShadowCacheLifecycleEvidence } from '../src/core/local-relevance-shadow-cache-lifecycle.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { runLocalRelevanceCacheWorkerProcess } from './local-relevance-cache-process-runner.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const priorEvidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-relevance-shadow-cache-lifecycle.json',
);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const priorLifecycleEvidence = JSON.parse(fs.readFileSync(priorEvidencePath, 'utf8'));
assertLocalRelevanceShadowCacheLifecycleEvidence(priorLifecycleEvidence);

const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find((item) => item.name === options.model);
const priorBinding = priorLifecycleEvidence.stress.cacheSnapshot.binding;
if (
  !inventoryModel ||
  inventoryModel.digest !== priorBinding.modelDigest ||
  options.model !== priorBinding.modelId
) {
  throw new Error('R15 process isolation model does not match the R14 evidence binding.');
}

const scenario = fixture.scenarios[0];
const query = scenario.queries[0];
const source = scenario.memoryEntries[0];
if (!scenario?.id || !query?.id || !query?.text || !source?.content) {
  throw new Error('R15 process isolation fixture input is incomplete.');
}
const runId = randomUUID();
const commonInput = {
  documentText: source.content,
  endpoint: options.endpoint,
  model: options.model,
  modelDigest: inventoryModel.digest,
  queryText: query.text,
  runId,
  timeoutMs: options.timeoutMs,
};
const concurrentWorkers = await Promise.all([
  runLocalRelevanceCacheWorkerProcess({
    input: { ...commonInput, workerId: 'worker-a' },
    timeoutMs: options.workerTimeoutMs,
  }),
  runLocalRelevanceCacheWorkerProcess({
    input: { ...commonInput, workerId: 'worker-b' },
    timeoutMs: options.workerTimeoutMs,
  }),
]);
const restartedWorker = await runLocalRelevanceCacheWorkerProcess({
  input: { ...commonInput, workerId: 'worker-a-restarted' },
  timeoutMs: options.workerTimeoutMs,
});
const evidence = buildLocalRelevanceShadowCacheProcessIsolationEvidence({
  fixtureBinding: {
    fixtureHash: hash(fixtureText),
    inputHash: buildLocalRelevanceCacheInputHash(commonInput),
    queryId: query.id,
    scenarioId: scenario.id,
  },
  observedAt: new Date().toISOString(),
  priorLifecycleEvidence,
  processProbe: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    concurrentWorkers,
    environmentForwarding: 'none',
    processBoundary: 'node-child-process',
    restartedWorker,
    restartOfWorkerId: 'worker-a',
    runIdHash: hash(runId),
  },
  runtime: {
    adapter: 'ollama-independent-score',
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    modelDigest: inventoryModel.digest,
    modelId: options.model,
    runtimeVersion: runtimeVersion.version,
    transport: 'loopback-http',
  },
});
assertLocalRelevanceShadowCacheProcessIsolationEvidence(evidence);
if (!evidence.actualLocalRelevanceShadowCacheProcessIsolationValidated) {
  throw new Error('R15 process isolation gate failed; lexical runtime remains active.');
}
if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheProcessIsolationQualified: false,
  actualLocalRelevanceShadowCacheProcessIsolationValidated: true,
  costFree: true,
  mode: 'local-relevance-shadow-cache-process-isolation',
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  processCount: 3,
  productionReadyClaim: false,
  restartColdStartPassed: evidence.results.restartColdStartPassed,
  runtimeActivation: false,
  scoreParityPassed: evidence.results.scoreParityPassed,
  workerIsolationPassed: evidence.results.workerIsolationPassed,
}, null, 2));

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique R15 process isolation options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!['--endpoint', '--model', '--output', '--timeout-ms', '--worker-timeout-ms'].includes(key) ||
      value === undefined || values.has(key)) {
      throw new Error('Expected unique R15 process isolation options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  const workerTimeoutMs = Number(values.get('--worker-timeout-ms') || 180_000);
  if (!endpoint || !model || model.length > 200 || !cloudFeaturesDisabled) {
    throw new Error('R15 process isolation requires loopback endpoint, model, and cloud disable proof.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 ||
    !Number.isInteger(workerTimeoutMs) || workerTimeoutMs <= 0) {
    throw new Error('R15 process isolation timeouts must be positive integers.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('R15 process isolation output must stay inside the repository.');
  }
  return {
    cloudFeaturesDisabled,
    endpoint,
    model,
    outputPath,
    timeoutMs,
    workerTimeoutMs,
  };
}
