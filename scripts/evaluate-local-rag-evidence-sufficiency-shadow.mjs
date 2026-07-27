import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRagEvidenceSufficiencyAttributionStable,
  assertLocalRagEvidenceSufficiencyShadow,
  assertRagEvidenceSufficiencyFixtureBinding,
  buildLocalRagEvidenceSufficiencyInferenceContract,
  buildLocalRagEvidenceSufficiencyShadow,
  evaluateRagEvidenceSufficiencyDecision,
} from '../src/core/rag-evidence-sufficiency-evaluation.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(
  path.join(repoDir, 'fixtures/rag-evidence-sufficiency-cases-v1.json'),
  'utf8',
);
const deterministicArtifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/rag-evidence-sufficiency.json'), 'utf8',
));
const { fixture, suite } = assertRagEvidenceSufficiencyFixtureBinding(
  deterministicArtifact,
  fixtureText,
);
const version = await requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/version' });
const inventory = await requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/tags' });
const inventoryModel = inventory.models?.find((item) => item.name === options.model || item.model === options.model);
if (!inventoryModel?.digest) throw new Error(`Local Ollama model is not installed: ${options.model}.`);
const modelInfo = await requestLoopbackJson({
  body: { model: options.model }, endpoint: options.endpoint, pathname: '/api/show', timeoutMs: options.timeoutMs,
});
const license = extractLicense(modelInfo);
if (!license) throw new Error('Local RAG evidence sufficiency shadow requires model license evidence.');

const inferenceContract = buildLocalRagEvidenceSufficiencyInferenceContract({
  fixture,
  model: options.model,
});
const response = await requestLoopbackJson({
  body: inferenceContract.body,
  endpoint: options.endpoint,
  pathname: inferenceContract.pathname,
  timeoutMs: options.timeoutMs,
});
const finalVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
  timeoutMs: options.timeoutMs,
});
const finalInventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
  timeoutMs: options.timeoutMs,
});
const finalInventoryModel = finalInventory.models?.find(
  (item) => item.name === options.model || item.model === options.model,
);
assertLocalRagEvidenceSufficiencyAttributionStable({
  modelDigestAfter: finalInventoryModel?.digest,
  modelDigestBefore: inventoryModel.digest,
  runtimeVersionAfter: finalVersion.version,
  runtimeVersionBefore: version.version,
});
const modelDecisions = parseModelDecisions(response.response, fixture.cases);
const observations = suite.cases.map((result) => {
  const decision = modelDecisions.get(result.id);
  const failureCodes = decision
    ? evaluateRagEvidenceSufficiencyDecision(result, decision)
    : ['model-decision-missing'];
  return {
    caseHash: result.caseHash,
    failureCodes,
    modelAction: decision?.action || 'abstain',
    requestedClaimHashes: (decision?.requestedClaimKeys || []).map(sha256),
  };
});
const evidence = buildLocalRagEvidenceSufficiencyShadow({
  deterministicArtifact,
  inferenceContractHash: inferenceContract.inferenceContractHash,
  model: { digest: inventoryModel.digest, id: options.model, licenseHash: sha256(license) },
  observations,
  observedAt: new Date().toISOString(),
  runtime: { cloudFeaturesDisabled: true, kind: 'ollama', transportLoopback: true, version: version.version },
});
assertLocalRagEvidenceSufficiencyShadow(evidence, {
  deterministicArtifact,
  inferenceContractHash: inferenceContract.inferenceContractHash,
});
fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  actualModelEvaluated: evidence.actualModelEvaluated,
  modelConforms: evidence.aggregate.modelConforms,
  modelFailureCount: evidence.aggregate.modelFailureCount,
  mode: 'local-rag-evidence-sufficiency-shadow',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
  productionReadyClaim: evidence.productionReadyClaim,
  runtimeActivation: evidence.runtimeActivation,
}, null, 2));

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) throw new Error('Expected unique shadow options.');
      cloudFeaturesDisabled = true; index += 1; continue;
    }
    const value = args[index + 1];
    if (!new Set(['--endpoint', '--model', '--output', '--timeout-ms']).has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique local shadow options.');
    }
    values.set(key, value); index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120000);
  const output = String(values.get('--output') || '').trim();
  const outputPath = output ? path.resolve(repoDir, output) : null;
  if (!endpoint || !model || model.length > 200 || /[\r\n\0]/.test(model) || !cloudFeaturesDisabled || !outputPath || !Number.isInteger(timeoutMs) || timeoutMs <= 0 ||
    (outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`))) {
    throw new Error('Local shadow requires loopback endpoint, installed model, cloud-disabled flag, bounded timeout, and repository output.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function parseModelDecisions(responseText, cases) {
  try {
    const parsed = JSON.parse(String(responseText || ''));
    if (!Array.isArray(parsed?.decisions)) return new Map();
    const allowedIds = new Set(cases.map((item) => item.id));
    const allowedClaimsByCase = new Map(
      cases.map((item) => [item.id, new Set(item.requiredClaimKeys)]),
    );
    const decisions = new Map();
    for (const item of parsed.decisions) {
      const id = String(item?.caseId || '').trim();
      const action = String(item?.action || '').trim();
      const requestedClaimKeys = Array.isArray(item?.requestedClaimKeys)
        ? item.requestedClaimKeys.map((key) => String(key).trim()).filter(Boolean)
        : [];
      const allowedClaims = allowedClaimsByCase.get(id);
      if (
        !allowedIds.has(id) ||
        decisions.has(id) ||
        !['answer', 'abstain', 'request-more-evidence'].includes(action) ||
        requestedClaimKeys.length !== new Set(requestedClaimKeys).size ||
        requestedClaimKeys.some((key) => !allowedClaims?.has(key))
      ) continue;
      decisions.set(id, { action, requestedClaimKeys });
    }
    return decisions;
  } catch {
    return new Map();
  }
}

function extractLicense(modelInfo) {
  return String(modelInfo.license || '').trim() ||
    String(modelInfo.modelfile || '').match(/LICENSE\\s+\"\"\"([\\s\\S]*?)\"\"\"/)?.[1]?.trim() || '';
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
