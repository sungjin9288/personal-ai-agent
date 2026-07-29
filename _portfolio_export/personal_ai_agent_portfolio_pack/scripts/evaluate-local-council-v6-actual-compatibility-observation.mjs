import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertC13BaselineArtifacts,
  assertC13ActualCompatibilityArtifact,
  assertC13ObservationPathsAvailable,
  assertC13Fixture,
  buildC13ActualCompatibilityArtifact,
  buildC13AttemptReceipt,
  createC13ReceiptGuardedProvider,
  frozenC13PromptProfile,
  runC13ActualObservation,
  writeC13ActualCompatibilityArtifactExclusive,
} from '../src/core/local-council-v6-actual-compatibility-observation.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';

const repoDir = process.cwd();
const OUTPUT = 'evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json';
const RECEIPT = 'evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json';
const options = parseOptions(process.argv.slice(2));

assertC13ObservationPathsAvailable({ artifactPath: options.outputPath, receiptPath: options.receiptPath });

const fixtureText = read('fixtures/local-council-v6-actual-compatibility-observation-v1.json');
const fixture = JSON.parse(fixtureText);
const c11FixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const c12FixtureText = read('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');
const keys = ['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
const artifacts = Object.fromEntries(keys.map((key) => [key, readJson(artifactPath(key))]));
const fileSha256 = Object.fromEntries(keys.map((key) => [key, sha256(artifactPath(key))]));
const fixtureTextByBaseline = { c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'), c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'), c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json') };

assertC13Fixture(fixture);
assertC13BaselineArtifacts({ artifacts, c11FixtureText, c12FixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
const promptFreeze = frozenC13PromptProfile();
const baseline = Object.fromEntries(keys.map((key) => [key, {
  artifactId: artifacts[key].id, decision: artifacts[key].qualification.decision, fileSha256: fileSha256[key], integrityHash: artifacts[key].integrityHash, localShadowQualified: artifacts[key].localShadowQualified,
}]));
const baselineDigest = hashLocalCouncilShadowValue(baseline);

let runtime;
try {
  runtime = await readRuntime();
} catch (error) {
  console.log(JSON.stringify({ mode: 'local-council-v6-actual-compatibility-observation', reason: 'environment-not-ready', status: 'environment-not-ready' }));
  process.exitCode = 2;
  throw error;
}

const receipt = buildC13AttemptReceipt({ baselineDigest, fixtureHash: hashLocalCouncilShadowValue(fixtureText), model: runtime.model, promptFreezeDigest: promptFreeze.digest, reservedAt: new Date().toISOString() });
let receiptWritten = false;
let receiptText;
const provider = createLocalProvider({
  rootDir: repoDir,
  env: { ...process.env, LOCAL_PROVIDER_BASE_URL: `${options.endpoint}/v1`, LOCAL_PROVIDER_MAX_TOKENS: '1600', LOCAL_PROVIDER_MODEL: options.model, LOCAL_PROVIDER_RUN_TIMEOUT_MS: String(options.timeoutMs) },
});
const guardedProvider = createC13ReceiptGuardedProvider({ filePath: options.receiptPath, receipt, provider, onReceiptWritten: () => { receiptText = fs.readFileSync(options.receiptPath, 'utf8'); receiptWritten = true; } });
const execution = await runC13ActualObservation({ fixture, fixtureText, provider: guardedProvider });
if (!receiptWritten) throw new Error('C13 must reserve an attempt immediately before provider execution.');
const after = await readRuntime();
const artifact = buildC13ActualCompatibilityArtifact({
  attemptReceipt: receipt, attemptReceiptFileSha256: sha256Text(receiptText), baseline, calls: execution.calls, fixtureHash: hashLocalCouncilShadowValue(fixtureText), model: runtime.model, observedAt: new Date().toISOString(), promptFreeze,
  runtime: { afterLoaded: after.process.loaded, afterVersion: after.version, beforeLoaded: runtime.process.loaded, beforeVersion: runtime.version, cloudFeaturesDisabled: true, endpointAlias: 'loopback-ollama', kind: 'ollama', modelStable: JSON.stringify(runtime.model) === JSON.stringify(after.model) && runtime.version === after.version, transportLoopback: true }, validation: execution.validation,
});
assertC13ActualCompatibilityArtifact(artifact, { attemptReceipt: receipt, attemptReceiptText: receiptText, baselineArtifacts: artifacts, c11FixtureText, c12FixtureText, c13FixtureText: fixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
writeC13ActualCompatibilityArtifactExclusive({ artifact, filePath: options.outputPath });
console.log(JSON.stringify({ chairReachability: artifact.chairReachability, localProviderRequestCount: artifact.localProviderRequestCount, mode: 'local-council-v6-actual-compatibility-observation', result: artifact.actualModelCompatibility }, null, 2));

async function readRuntime() {
  const [version, tags, show, processes] = await Promise.all([
    requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/version', timeoutMs: options.timeoutMs }), requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/tags', timeoutMs: options.timeoutMs }), requestLoopbackJson({ body: { model: options.model }, endpoint: options.endpoint, pathname: '/api/show', timeoutMs: options.timeoutMs }), requestLoopbackJson({ endpoint: options.endpoint, pathname: '/api/ps', timeoutMs: options.timeoutMs }),
  ]);
  const installed = tags.models?.find((item) => item.name === options.model || item.model === options.model);
  const license = String(show.license || '').trim() || String(show.modelfile || '').match(/LICENSE\s+\"\"\"([\s\S]*?)\"\"\"/)?.[1]?.trim();
  const process = processes.models?.find((item) => item.name === options.model || item.model === options.model);
  if (!installed?.digest || !Number.isSafeInteger(installed.size) || !license || !String(version.version || '').trim()) throw new Error('C13 environment-not-ready: installed qwen2.5:3b and license provenance are required.');
  return { model: { digest: installed.digest, id: options.model, licenseHash: hashLocalCouncilShadowValue(license), sizeBytes: installed.size }, process: { loaded: Boolean(process) }, version: String(version.version) };
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) values.set(args[index], args[index + 1]);
  const endpoint = values.get('--endpoint');
  const output = values.get('--output');
  if (!endpoint || values.get('--model') !== 'qwen2.5:3b' || values.get('--cloud-features-disabled') !== 'true' || !output || !/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)) throw new Error('C13 requires loopback qwen2.5:3b, disabled cloud features, and output.');
  const outputPath = path.resolve(repoDir, output);
  const receiptPath = path.resolve(repoDir, RECEIPT);
  if (outputPath !== path.join(repoDir, OUTPUT) || receiptPath !== path.join(repoDir, RECEIPT)) throw new Error('C13 paths are fixed to dedicated evidence files.');
  return { endpoint, model: 'qwen2.5:3b', outputPath, receiptPath, timeoutMs: 120_000 };
}
function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json', c11: 'local-council-rebuttal-stability-shadow.json', c12: 'local-council-strict-prompt-candidate-qualification.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
function sha256Text(value) { return createHash('sha256').update(value).digest('hex'); }
