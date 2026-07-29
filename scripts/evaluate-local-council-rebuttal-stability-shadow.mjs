import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertC11BaselineArtifacts,
  assertC11Fixture,
  assertC11LocalCouncilArtifact,
  buildC11LocalCouncilArtifact,
  runC11CouncilShadow,
} from '../src/core/local-council-rebuttal-stability-shadow.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';
import { resolveEvidenceOutputPath, writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const C11_OUTPUT_PATH = 'evidence/output-artifacts/local-council-rebuttal-stability-shadow.json';
const options = parseOptions(process.argv.slice(2));
if (fs.existsSync(options.outputPath)) {
  throw new Error('C11 actual observation artifact already exists; the one-run evaluator cannot run again.');
}
const fixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const fixture = JSON.parse(fixtureText);
assertC11Fixture(fixture);
const baselineArtifacts = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, readJson(artifactPath(key))]));
const fileSha256 = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, sha256(artifactPath(key))]));
const fixtureTextByBaseline = {
  c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'),
  c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'),
  c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json'),
};
assertC11BaselineArtifacts({ artifacts: baselineArtifacts, fileSha256, fixtureText: fixtureTextByBaseline });
const before = await readRuntime();
const provider = createLocalProvider({
  rootDir: repoDir,
  env: { ...process.env, LOCAL_PROVIDER_BASE_URL: `${options.endpoint}/v1`, LOCAL_PROVIDER_MAX_TOKENS: '1600', LOCAL_PROVIDER_MODEL: options.model, LOCAL_PROVIDER_RUN_TIMEOUT_MS: String(options.timeoutMs) },
});
const execution = await runC11CouncilShadow({ fixture, fixtureText, provider });
const after = await readRuntime();
if (JSON.stringify(before.model) !== JSON.stringify(after.model) || before.version !== after.version || !after.process.loaded) {
  throw new Error('C11 local runtime provenance changed or did not remain loaded.');
}
const artifact = buildC11LocalCouncilArtifact({
  baseline: Object.fromEntries(Object.entries(baselineArtifacts).map(([key, value]) => [key, {
    artifactId: value.id, decision: value.qualification.decision, fileSha256: fileSha256[key], integrityHash: value.integrityHash, localShadowQualified: value.localShadowQualified,
  }])),
  calls: execution.calls, fixtureHash: hashLocalCouncilShadowValue(fixtureText), model: after.model, observedAt: new Date().toISOString(),
  runtime: { afterContextLength: after.process.contextLength, afterLoaded: after.process.loaded, afterSizeBytes: after.process.sizeBytes, afterVramBytes: after.process.vramBytes, beforeLoaded: before.process.loaded, cloudFeaturesDisabled: true, endpointAlias: 'loopback-ollama', kind: 'ollama', transportLoopback: true, version: after.version },
  validation: execution.validation,
});
assertC11LocalCouncilArtifact(artifact, { baselineArtifacts, c11FixtureText: fixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
writeEvidenceJson({ artifact, defaultRelativePath: C11_OUTPUT_PATH, label: 'Local council rebuttal stability shadow output', repoDir, value: options.outputPath });
console.log(JSON.stringify({ callCount: artifact.summary.callCount, decision: artifact.qualification.decision, firstFailureStage: execution.failure?.failureStage || null, mode: 'local-council-rebuttal-stability-shadow', ok: true, outputPath: path.relative(repoDir, options.outputPath) }, null, 2));

async function readRuntime() {
  const [version, tags, show, processes] = await Promise.all([
    requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/version', timeoutMs: options.timeoutMs }),
    requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/tags', timeoutMs: options.timeoutMs }),
    requestLoopbackJson({ body: { model: options.model }, endpoint: options.endpoint, pathname: '/api/show', timeoutMs: options.timeoutMs }),
    requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/ps', timeoutMs: options.timeoutMs }),
  ]);
  const installed = tags.models?.find((item) => item.name === options.model || item.model === options.model);
  const license = String(show.license || '').trim() || String(show.modelfile || '').match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]?.trim();
  const process = processes.models?.find((item) => item.name === options.model || item.model === options.model);
  if (!installed?.digest || !Number.isSafeInteger(installed.size) || !license) throw new Error('C11 requires installed model and license provenance.');
  return { model: { digest: installed.digest, id: options.model, licenseHash: hashLocalCouncilShadowValue(license), sizeBytes: installed.size }, process: { contextLength: Number(process?.context_length || 0), loaded: Boolean(process), sizeBytes: Number(process?.size || 0), vramBytes: Number(process?.size_vram || 0) }, version: String(version.version || '').trim() };
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) values.set(args[index], args[index + 1]);
  const endpoint = values.get('--endpoint');
  const output = values.get('--output');
  if (!endpoint || values.get('--model') !== 'qwen2.5:3b' || values.get('--cloud-features-disabled') !== 'true' || !output || !/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)) throw new Error('C11 requires loopback qwen2.5:3b, disabled cloud features, and output.');
  const outputPath = resolveEvidenceOutputPath({ defaultRelativePath: C11_OUTPUT_PATH, label: 'Local council rebuttal stability shadow output', repoDir, value: output });
  if (outputPath !== path.join(repoDir, C11_OUTPUT_PATH)) throw new Error('C11 output must use the dedicated C11 artifact path.');
  return { endpoint, model: 'qwen2.5:3b', outputPath, timeoutMs: 120_000 };
}
function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
