import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerBindings,
  assertLocalEvidenceGatedAnswerAttributionStable,
  assertLocalEvidenceGatedAnswerShadow,
  buildLocalEvidenceGatedAnswerShadow,
  coordinateEvidenceGatedAnswer,
  hashEvidenceGatedAnswerValue,
} from '../src/core/evidence-gated-answer-shadow.mjs';
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
const beforeFiles = readBoundFiles();
const bindings = assertEvidenceGatedAnswerBindings(beforeFiles);
const deterministicArtifact = JSON.parse(
  beforeFiles.deterministicArtifactText,
);
assertEvidenceGatedAnswerArtifact(deterministicArtifact);
if (
  deterministicArtifact.fixtureHash !==
  hashEvidenceGatedAnswerValue(beforeFiles.fixtureText)
) {
  throw new Error(
    'Local evidence-gated answer shadow deterministic artifact drift.',
  );
}

const runtimeBefore = await readRuntime(options);
assertRuntimeBaseline(runtimeBefore, bindings);
const generator = createReviewActionGeneralizedOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
if (
  generator.promptHash !== bindings.fixture.q7PromptHash ||
  generator.promptVersion !== bindings.fixture.q7PromptVersion
) {
  throw new Error(
    'Local evidence-gated answer shadow prompt binding drift.',
  );
}

const sufficientCase = bindings.q9Fixture.cases.find(
  (item) => item.id === 'sufficient',
);
const sufficientBinding = bindings.fixture.cases.find(
  (item) => item.expectedState === 'sufficient',
);
const result = await coordinateEvidenceGatedAnswer({
  answerQualityContract: sufficientBinding.answerQualityContract,
  generator,
  q9Case: sufficientCase,
});

const runtimeAfter = await readRuntime(options);
const afterFiles = readBoundFiles();
assertLocalEvidenceGatedAnswerAttributionStable({
  after: buildAttributionRecord(afterFiles, runtimeAfter),
  before: buildAttributionRecord(beforeFiles, runtimeBefore),
});
const finalBindings = assertEvidenceGatedAnswerBindings(afterFiles);
assertRuntimeBaseline(runtimeAfter, finalBindings);
const finalDeterministicArtifact = JSON.parse(
  afterFiles.deterministicArtifactText,
);
assertEvidenceGatedAnswerArtifact(finalDeterministicArtifact);

const artifact = buildLocalEvidenceGatedAnswerShadow({
  deterministicArtifact: finalDeterministicArtifact,
  fixture: finalBindings.fixture,
  model: {
    digest: runtimeAfter.model.digest,
    id: options.model,
    licenseHash: runtimeAfter.model.licenseHash,
    sizeBytes: runtimeAfter.model.sizeBytes,
  },
  observedAt: new Date().toISOString(),
  priorQ9Shadow: finalBindings.q9LocalArtifact,
  q9Case: sufficientCase,
  result,
  runtime: {
    cloudFeaturesDisabled: true,
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeAfter.version,
  },
});
assertLocalEvidenceGatedAnswerShadow(artifact, {
  deterministicArtifact: finalDeterministicArtifact,
  fixture: finalBindings.fixture,
  priorQ9Shadow: finalBindings.q9LocalArtifact,
  q7Evidence: finalBindings.q7Evidence,
});
assertContentFreeEvidenceGatedAnswerArtifact(artifact, [
  sufficientCase.objective,
  ...sufficientCase.requiredClaimKeys,
  ...sufficientCase.sources.flatMap((source) => [
    source.sourceKey,
    source.text,
  ]),
  ...sufficientBinding.answerQualityContract.requiredAnswerTerms,
  ...sufficientBinding.answerQualityContract.forbiddenAnswerTerms,
  result.answer?.text,
]);
writeEvidenceJson({
  artifact,
  defaultRelativePath:
    'evidence/output-artifacts/local-evidence-gated-answer-shadow.json',
  label: 'Local evidence-gated answer shadow output',
  repoDir,
  value: options.outputPath,
});

console.log(JSON.stringify({
  actualModelEvaluated: artifact.actualModelEvaluated,
  generationAttemptCount: artifact.aggregate.generationAttemptCount,
  mode: 'local-evidence-gated-answer-shadow',
  modelId: artifact.model.id,
  syntheticSufficientCasePassed:
    artifact.aggregate.syntheticSufficientCasePassed,
  ok: true,
  outputPath: relativePath(options.outputPath),
  priorQ9ModelConforms: artifact.priorQ9Shadow.modelConforms,
  priorQ9ModelFailureCount: artifact.priorQ9Shadow.modelFailureCount,
  productionReadyClaim: artifact.productionReadyClaim,
  qualityStatus: artifact.observation.qualityStatus,
  runtimeActivation: artifact.runtimeActivation,
}, null, 2));

function readBoundFiles() {
  return {
    deterministicArtifactText: readText(
      'evidence/output-artifacts/evidence-gated-answer-shadow.json',
    ),
    fixtureText: readText('fixtures/evidence-gated-answer-cases-v1.json'),
    q7EvidenceText: readText(
      'evidence/output-artifacts/local-answer-review-action-generalization.json',
    ),
    q9ArtifactText: readText(
      'evidence/output-artifacts/rag-evidence-sufficiency.json',
    ),
    q9FixtureText: readText(
      'fixtures/rag-evidence-sufficiency-cases-v1.json',
    ),
    q9LocalArtifactText: readText(
      'evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json',
    ),
  };
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

async function readRuntime(options) {
  const version = await requestLoopbackJson({
    endpoint: options.endpoint,
    pathname: '/api/version',
    timeoutMs: options.timeoutMs,
  });
  const inventory = await requestLoopbackJson({
    endpoint: options.endpoint,
    pathname: '/api/tags',
    timeoutMs: options.timeoutMs,
  });
  const inventoryModel = inventory.models?.find(
    (item) =>
      item.name === options.model || item.model === options.model,
  );
  if (!inventoryModel?.digest) {
    throw new Error(
      `Local Ollama model is not installed: ${options.model}.`,
    );
  }
  const modelInfo = await requestLoopbackJson({
    body: { model: options.model },
    endpoint: options.endpoint,
    pathname: '/api/show',
    timeoutMs: options.timeoutMs,
  });
  const license = extractLicense(modelInfo);
  if (!license) {
    throw new Error(
      'Local evidence-gated answer shadow requires model license evidence.',
    );
  }
  return {
    model: {
      digest: inventoryModel.digest,
      id: options.model,
      licenseHash: hashEvidenceGatedAnswerValue(license),
      sizeBytes: inventoryModel.size,
    },
    version: version.version,
  };
}

function assertRuntimeBaseline(runtime, bindings) {
  const expectedModel = bindings.q7Evidence.model;
  const expectedRuntime = bindings.q7Evidence.runtime;
  const expectedLicenseHash =
    bindings.q9LocalArtifact.model.licenseHash;
  if (runtime.model.id !== expectedModel.id) {
    throw new Error(
      'Local evidence-gated answer shadow model id drift.',
    );
  }
  if (runtime.model.digest !== expectedModel.digest) {
    throw new Error(
      'Local evidence-gated answer shadow model digest drift.',
    );
  }
  if (runtime.model.sizeBytes !== expectedModel.sizeBytes) {
    throw new Error(
      'Local evidence-gated answer shadow model size drift.',
    );
  }
  if (runtime.model.licenseHash !== expectedLicenseHash) {
    throw new Error(
      'Local evidence-gated answer shadow model license drift.',
    );
  }
  if (runtime.version !== expectedRuntime.version) {
    throw new Error(
      'Local evidence-gated answer shadow runtime version drift.',
    );
  }
}

function buildAttributionRecord(files, runtime) {
  return {
    files: Object.fromEntries(
      Object.entries(files)
        .map(([key, value]) => [
          key,
          hashEvidenceGatedAnswerValue(value),
        ])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    model: runtime.model,
    runtimeVersion: runtime.version,
  };
}

function extractLicense(modelInfo) {
  return String(modelInfo.license || '').trim() ||
    String(modelInfo.modelfile || '')
      .match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]
      ?.trim() ||
    '';
}

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error(
          'Local evidence-gated answer shadow options must be unique.',
        );
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (
      !new Set([
        '--endpoint',
        '--model',
        '--output',
        '--timeout-ms',
      ]).has(key) ||
      value === undefined ||
      values.has(key)
    ) {
      throw new Error(
        'Local evidence-gated answer shadow options must be complete.',
      );
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = normalizeLoopbackEndpoint(
    values.get('--endpoint'),
  );
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  const output = String(values.get('--output') || '').trim();
  const outputPath = output
    ? resolveEvidenceOutputPath({
        defaultRelativePath:
          'evidence/output-artifacts/local-evidence-gated-answer-shadow.json',
        label: 'Local evidence-gated answer shadow output',
        repoDir,
        value: output,
      })
    : null;
  if (
    !model ||
    model.length > 200 ||
    /[\r\n\0]/.test(model) ||
    !cloudFeaturesDisabled ||
    !outputPath ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      'Local evidence-gated answer shadow requires loopback, installed model, cloud-disabled proof, timeout, and repository output.',
    );
  }
  return {
    cloudFeaturesDisabled,
    endpoint,
    model,
    outputPath,
    timeoutMs,
  };
}

function relativePath(filename) {
  return path.relative(repoDir, filename).split(path.sep).join('/');
}
