import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessBindings,
  assertEvidenceGatedAnswerRobustnessCandidatePassed,
  assertLocalEvidenceGatedAnswerRobustnessArtifact,
  buildLocalEvidenceGatedAnswerRobustnessArtifact,
  evaluateEvidenceGatedAnswerRobustnessSuite,
  hashEvidenceGatedAnswerRobustnessValue,
} from '../src/core/evidence-gated-answer-robustness.mjs';
import {
  normalizeLoopbackEndpoint,
  requestLoopbackJson,
} from '../src/core/loopback-json-client.mjs';
import {
  createReviewActionGeneralizedOllamaAnswerGenerator,
} from '../src/core/ollama-answer-generator.mjs';
import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));

// Every bound byte and runtime fact is captured before the first generation.
const before = await readPreflightState(options);
const generator = createReviewActionGeneralizedOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});

const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({
  fixture: before.bindings.fixture,
  generator,
});

// Capture the same state after all four sufficient-only calls. A changed file,
// model digest, size, license, or runtime version invalidates this observation.
const after = await readPreflightState(options);
if (!sameAttribution(before.attribution, after.attribution)) {
  throw new Error('Local robustness attribution changed during evaluation.');
}

const observations = suite.cases
  .filter((item) => item.result.generation.attempted)
  .map(({ result }) => ({
    caseHash: result.caseHash,
    durationMs: Number(result.observation?.durationMs || 0),
    failureCheckIds: result.answerQuality?.failureCheckIds || [],
    generationFailureKind: result.generation.failureKind,
    outputBytes: Number(result.observation?.outputBytes || 0),
    status: result.answerQuality?.status === 'passed' ? 'passed' : 'failed',
  }));

const localArtifact = buildLocalEvidenceGatedAnswerRobustnessArtifact({
  bindings: after.bindings.fixture,
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
assertLocalEvidenceGatedAnswerRobustnessArtifact(localArtifact, {
  bindings: after.bindings,
  deterministicArtifact: after.deterministicArtifact,
  fixtureText: after.inputs.fixtureText,
  q9LocalArtifact: JSON.parse(after.inputs.q9LocalArtifactText),
});
assertContentFreeEvidenceGatedAnswerRobustnessArtifact(
  localArtifact,
  collectForbiddenValues(after.bindings.fixture),
);

// The writer fsyncs before the candidate assertion can return a non-zero exit.
writeEvidenceJson({
  artifact: localArtifact,
  defaultRelativePath: 'evidence/output-artifacts/local-evidence-gated-answer-robustness.json',
  label: 'Local evidence-gated answer robustness output',
  repoDir,
  value: options.outputPath,
});

// A local failure remains an honest stored observation. It does not become a
// passing candidate merely because the artifact is structurally valid.
assertEvidenceGatedAnswerRobustnessCandidatePassed(suite);
assertLocalEvidenceGatedAnswerRobustnessArtifact(localArtifact, {
  bindings: after.bindings,
  deterministicArtifact: after.deterministicArtifact,
  fixtureText: after.inputs.fixtureText,
  q9LocalArtifact: JSON.parse(after.inputs.q9LocalArtifactText),
  requireCandidatePass: true,
});

console.log(JSON.stringify({
  generationAttemptCount: localArtifact.summary.generationAttemptCount,
  mode: 'local-evidence-gated-answer-robustness',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
  qualityPassCount: localArtifact.summary.qualityPassCount,
}, null, 2));

async function readPreflightState(options) {
  const inputs = readBoundInputs();
  const bindings = assertEvidenceGatedAnswerRobustnessBindings(inputs);
  const deterministicArtifact = JSON.parse(inputs.deterministicArtifactText);
  assertEvidenceGatedAnswerRobustnessArtifact(deterministicArtifact, {
    bindings,
    fixture: bindings.fixture,
    fixtureText: inputs.fixtureText,
  });
  const runtime = await readRuntime(options);
  assertRuntimeBaseline(runtime, bindings, inputs.q9LocalArtifactText);

  return {
    attribution: {
      boundFileHashes: hashBoundFiles(inputs),
      deterministicArtifactFileHash: hashEvidenceGatedAnswerRobustnessValue(
        inputs.deterministicArtifactText,
      ),
      model: runtime.model,
      runtimeVersion: runtime.version,
    },
    bindings,
    deterministicArtifact,
    inputs,
    runtime,
  };
}

function readBoundInputs() {
  return {
    deterministicArtifactText: readText('evidence/output-artifacts/evidence-gated-answer-robustness.json'),
    fixtureText: readText('fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    q7EvidenceText: readText('evidence/output-artifacts/local-answer-review-action-generalization.json'),
    q9ArtifactText: readText('evidence/output-artifacts/rag-evidence-sufficiency.json'),
    q9CoreText: readText('src/core/rag-evidence-sufficiency-evaluation.mjs'),
    q9FixtureText: readText('fixtures/rag-evidence-sufficiency-cases-v1.json'),
    q9LocalArtifactText: readText('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'),
    q10ArtifactText: readText('evidence/output-artifacts/evidence-gated-answer-shadow.json'),
    q10CoreText: readText('src/core/evidence-gated-answer-shadow.mjs'),
    q10FixtureText: readText('fixtures/evidence-gated-answer-cases-v1.json'),
    q10LocalArtifactText: readText('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'),
  };
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function hashBoundFiles(inputs) {
  return Object.fromEntries(Object.entries(inputs)
    .filter(([key]) => key !== 'deterministicArtifactText')
    .map(([key, value]) => [key, hashEvidenceGatedAnswerRobustnessValue(value)])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function sameAttribution(before, after) {
  return JSON.stringify(before) === JSON.stringify(after);
}

async function readRuntime(options) {
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
  const inventoryModel = tags.models?.find(
    (item) => item.name === options.model || item.model === options.model,
  );
  if (!inventoryModel?.digest || !Number.isSafeInteger(inventoryModel.size)) {
    throw new Error('Local robustness requires an installed qwen2.5:3b model.');
  }
  const modelInfo = await requestLoopbackJson({
    body: { model: options.model },
    endpoint: options.endpoint,
    pathname: '/api/show',
    timeoutMs: options.timeoutMs,
  });
  const license = extractLicense(modelInfo);
  if (!license) {
    throw new Error('Local robustness requires model license evidence.');
  }
  return {
    model: {
      digest: inventoryModel.digest,
      id: options.model,
      licenseHash: hashEvidenceGatedAnswerRobustnessValue(license),
      sizeBytes: inventoryModel.size,
    },
    version: String(version.version || '').trim(),
  };
}

function extractLicense(modelInfo) {
  return String(modelInfo.license || '').trim() ||
    String(modelInfo.modelfile || '')
      .match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]
      ?.trim() ||
    '';
}

function assertRuntimeBaseline(runtime, bindings, q9LocalArtifactText) {
  const q9LocalArtifact = JSON.parse(q9LocalArtifactText);
  if (
    runtime.model.id !== bindings.q7.model?.id ||
    runtime.model.digest !== bindings.q7.model?.digest ||
    runtime.model.sizeBytes !== bindings.q7.model?.sizeBytes ||
    runtime.model.licenseHash !== q9LocalArtifact.model?.licenseHash ||
    runtime.version !== bindings.q7.runtime?.version
  ) {
    throw new Error('Local robustness runtime or model attribution drift.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined || values.has(key)) {
      throw new Error('Local robustness options must be unique name/value pairs.');
    }
    values.set(key, value);
  }
  const endpoint = normalizeLoopbackEndpoint(values.get('--endpoint'));
  const model = normalizedOption(values, '--model');
  const output = normalizedOption(values, '--output');
  const cloudDisabled = normalizedOption(values, '--cloud-features-disabled');
  const timeoutMs = Number(values.get('--timeout-ms') || 120000);
  if (
    model !== 'qwen2.5:3b' ||
    cloudDisabled !== 'true' ||
    !Number.isFinite(timeoutMs) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error('Local robustness requires qwen2.5:3b, cloud-disabled proof, and a positive timeout.');
  }
  return {
    endpoint,
    model,
    outputPath: resolveEvidenceOutputPath({
      defaultRelativePath: 'evidence/output-artifacts/local-evidence-gated-answer-robustness.json',
      label: 'Local evidence-gated answer robustness output',
      repoDir,
      value: output,
    }),
    timeoutMs,
  };
}

function normalizedOption(values, key) {
  const value = String(values.get(key) || '').trim();
  if (!value) {
    throw new Error(`Local robustness option ${key} is required.`);
  }
  return value;
}

function collectForbiddenValues(fixture) {
  return fixture.cases.flatMap((caseDefinition) => [
    caseDefinition.q9Case.objective,
    ...caseDefinition.q9Case.sources.flatMap((source) => [
      source.sourceKey,
      source.text,
    ]),
    ...(caseDefinition.answerQualityContract?.requiredAnswerTerms || []),
    ...(caseDefinition.answerQualityContract?.forbiddenAnswerTerms || []),
  ]).filter((value) => String(value).length >= 8);
}
