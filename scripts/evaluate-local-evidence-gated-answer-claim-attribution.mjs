import fs from 'node:fs';
import path from 'node:path';

import {
  assertClaimSourceAttributionArtifact,
  assertLocalClaimSourceAttributionArtifact,
  assertClaimSourceAttributionBindings,
  assertClaimSourceAttributionCandidatePassed,
  assertContentFreeClaimSourceAttributionArtifact,
  buildLocalClaimSourceAttributionArtifact,
  evaluateClaimSourceAttributionSuite,
  hashClaimSourceAttributionValue,
} from '../src/core/evidence-gated-answer-claim-attribution.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createReviewActionGeneralizedOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { resolveEvidenceOutputPath, writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const before = await preflight();
const generator = createReviewActionGeneralizedOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const suite = await evaluateClaimSourceAttributionSuite({
  ...before.bindings,
  generator,
});
const after = await preflight();
if (JSON.stringify(before.provenance) !== JSON.stringify(after.provenance)) {
  throw new Error('Q13 local provenance changed during evaluation.');
}
const observations = suite.cases
  .filter((item) => item.generation.attempted)
  .map((item) => ({
    caseHash: item.caseHash,
    durationMs: Number(item.observation?.durationMs || 0),
    failureIds: observationFailureIds(item),
    inputHash: item.observation?.inputHash ?? null,
    responseHash: item.observation?.responseHash ?? null,
  }));
const artifact = buildLocalClaimSourceAttributionArtifact({
  deterministicArtifact: after.deterministicArtifact,
  model: after.runtime.model,
  observedAt: new Date().toISOString(),
  observations,
  runtime: {
    cloudFeaturesDisabled: true,
    kind: 'ollama',
    transportLoopback: true,
    version: after.runtime.version,
  },
  suite,
});
const contentForbiddenValues = forbiddenValues(after.bindings.q11Fixture);
assertContentFreeClaimSourceAttributionArtifact(artifact, contentForbiddenValues);
assertLocalClaimSourceAttributionArtifact(artifact, {
  deterministicArtifact: after.deterministicArtifact,
  fixture: after.bindings.fixture,
  fixtureText: after.inputs.fixtureText,
  forbiddenValues: contentForbiddenValues,
});
writeEvidenceJson({
  artifact,
  defaultRelativePath: 'evidence/output-artifacts/local-evidence-gated-answer-claim-attribution.json',
  label: 'Local claim-source attribution output',
  repoDir,
  value: options.outputPath,
});
assertClaimSourceAttributionCandidatePassed(suite);
console.log(JSON.stringify({
  attributionPassCount: suite.aggregate.attributionPassCount,
  mode: 'local-evidence-gated-answer-claim-attribution',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
}, null, 2));

async function preflight() {
  const inputs = readInputs();
  inputs.deterministicArtifactText = fs.readFileSync(
    path.join(repoDir, 'evidence/output-artifacts/evidence-gated-answer-claim-attribution.json'),
    'utf8',
  );
  const bindings = assertClaimSourceAttributionBindings(inputs);
  const deterministicArtifact = JSON.parse(inputs.deterministicArtifactText);
  assertClaimSourceAttributionArtifact(deterministicArtifact, {
    fixtureText: inputs.fixtureText,
  });
  const version = await requestLoopbackJson({
    endpoint: options.endpoint,
    pathname: '/api/version',
    timeoutMs: options.timeoutMs,
  });
  const tags = await requestLoopbackJson({
    endpoint: options.endpoint,
    pathname: '/api/tags',
    timeoutMs: options.timeoutMs,
  });
  const item = tags.models?.find((model) => model.name === options.model || model.model === options.model);
  if (!item?.digest || !Number.isSafeInteger(item.size)) {
    throw new Error('Q13 requires installed qwen2.5:3b runtime provenance.');
  }
  const show = await requestLoopbackJson({
    body: { model: options.model },
    endpoint: options.endpoint,
    pathname: '/api/show',
    timeoutMs: options.timeoutMs,
  });
  const license = String(show.license || '').trim() ||
    String(show.modelfile || '').match(/LICENSE\s+\"\"\"([\s\S]*?)\"\"\"/)?.[1]?.trim();
  if (!license) throw new Error('Q13 requires model license provenance.');
  const runtime = {
    model: {
      digest: item.digest,
      id: options.model,
      licenseHash: hashClaimSourceAttributionValue(license),
      sizeBytes: item.size,
    },
    version: String(version.version || '').trim(),
  };
  const prior = JSON.parse(fs.readFileSync(
    path.join(repoDir, 'evidence/output-artifacts/local-evidence-gated-answer-robustness.json'),
    'utf8',
  ));
  if (runtime.model.id !== 'qwen2.5:3b' ||
    runtime.model.digest !== prior.model?.digest ||
    runtime.model.sizeBytes !== prior.model?.sizeBytes ||
    runtime.model.licenseHash !== prior.model?.licenseHash ||
    runtime.version !== prior.runtime?.version) {
    throw new Error('Q13 local runtime baseline drift.');
  }
  const fileHashes = Object.fromEntries(Object.entries(inputs)
    .map(([key, value]) => [key, hashClaimSourceAttributionValue(value)])
    .sort(([left], [right]) => left.localeCompare(right)));
  return {
    bindings,
    deterministicArtifact,
    inputs,
    runtime,
    provenance: { files: fileHashes, runtime },
  };
}

function observationFailureIds(item) {
  if (item.attribution?.failureIds?.length) return item.attribution.failureIds;
  if (item.answerQuality?.failureCheckIds?.length) return item.answerQuality.failureCheckIds;
  return item.generation?.failureKind ? [item.generation.failureKind] : [];
}

function readInputs() {
  const read = (relativePath) => fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
  return {
    fixtureText: read('fixtures/evidence-gated-answer-claim-attribution-cases-v1.json'),
    q11FixtureText: read('fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    q11CoreText: read('src/core/evidence-gated-answer-robustness.mjs'),
    q10CoreText: read('src/core/evidence-gated-answer-shadow.mjs'),
    q9CoreText: read('src/core/rag-evidence-sufficiency-evaluation.mjs'),
    q1EvaluatorText: read('src/core/answer-quality-evaluation.mjs'),
    q7GeneratorText: read('src/core/ollama-answer-generator.mjs'),
    q12WriterText: read('scripts/evidence-gated-answer-output.mjs'),
    q7EvidenceText: read('evidence/output-artifacts/local-answer-review-action-generalization.json'),
    q9DeterministicArtifactText: read('evidence/output-artifacts/rag-evidence-sufficiency.json'),
    q9LocalArtifactText: read('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'),
    q10DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-shadow.json'),
    q10LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'),
    q11DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-robustness.json'),
    q11LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-robustness.json'),
  };
}

function forbiddenValues(q11Fixture) {
  return q11Fixture.cases.flatMap((item) => [
    item.q9Case.objective,
    ...item.q9Case.requiredClaimKeys,
    ...item.q9Case.sources.flatMap((source) => [source.sourceKey, source.text]),
    ...(item.answerQualityContract?.requiredAnswerTerms || []),
  ]).filter((value) => String(value).length >= 8);
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    values.set(args[index], args[index + 1]);
  }
  const endpoint = values.get('--endpoint');
  const model = values.get('--model');
  const output = values.get('--output');
  if (!endpoint || model !== 'qwen2.5:3b' ||
    values.get('--cloud-features-disabled') !== 'true' || !output) {
    throw new Error('Q13 local evaluation requires loopback endpoint, qwen2.5:3b, disabled cloud features, and output.');
  }
  if (!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)) {
    throw new Error('Q13 local endpoint must be loopback.');
  }
  return {
    endpoint,
    model,
    outputPath: resolveEvidenceOutputPath({
      defaultRelativePath: 'evidence/output-artifacts/local-evidence-gated-answer-claim-attribution.json',
      label: 'Local claim-source attribution output',
      repoDir,
      value: output,
    }),
    timeoutMs: 120000,
  };
}
