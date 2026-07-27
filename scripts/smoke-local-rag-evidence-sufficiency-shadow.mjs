import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRagEvidenceSufficiencyShadow,
  buildLocalRagEvidenceSufficiencyInferenceContract,
} from '../src/core/rag-evidence-sufficiency-evaluation.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const evidencePath = path.join(repoDir, 'evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json');
const evidenceText = fs.readFileSync(evidencePath, 'utf8');
const evidence = JSON.parse(evidenceText);
const deterministicArtifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/rag-evidence-sufficiency.json'),
  'utf8',
));
const fixture = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'fixtures/rag-evidence-sufficiency-cases-v1.json'),
  'utf8',
));
const inferenceContract = buildLocalRagEvidenceSufficiencyInferenceContract({
  fixture,
  model: evidence.model.id,
});

assert.equal(packageJson.scripts['smoke:local-rag-evidence-sufficiency-shadow'], 'node scripts/smoke-local-rag-evidence-sufficiency-shadow.mjs');
assert.equal(
  packageJson.scripts['evaluate:local-rag-evidence-sufficiency-shadow'],
  'node scripts/evaluate-local-rag-evidence-sufficiency-shadow.mjs --endpoint http://127.0.0.1:11434 --model qwen2.5:3b --cloud-features-disabled --output evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json',
);
assert.doesNotThrow(() => assertLocalRagEvidenceSufficiencyShadow(
  evidence,
  {
    deterministicArtifact,
    inferenceContractHash: inferenceContract.inferenceContractHash,
  },
));
assert.equal(evidence.inferenceContractHash, inferenceContract.inferenceContractHash);
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.runtimeActivation, false);
assert.equal(evidence.trainingAuthorized, false);
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.aggregate.modelConforms, false);
assert.equal(evidence.aggregate.modelFailureCount, 1);
assert.equal(
  evidence.observations.some((item) =>
    item.failureCodes.includes('unnecessary-abstention')),
  true,
);
assert.doesNotMatch(evidenceText, /Synthetic alpha|claim-alpha|source-|objective|prompt|response|error/i);
for (const relativePath of [
  'docs/ml-rag-development-plan-v1.md',
  'docs/roadmap.md',
  'docs/evidence-checklist.md',
  'docs/evidence-gallery.md',
  'docs/smoke-validation-summary-v1.md',
  'docs/devlog.md',
  'evidence/evidence_manifest.md',
]) {
  assert.match(fs.readFileSync(path.join(repoDir, relativePath), 'utf8'), /rag-evidence-sufficiency|RAG evidence sufficiency|Q9/i);
}
assert.match(fs.readFileSync(path.join(repoDir, 'scripts/run-all-smokes.mjs'), 'utf8'), /smoke:local-rag-evidence-sufficiency-shadow/);
assert.doesNotMatch(
  fs.readFileSync(path.join(repoDir, 'scripts/evaluate-local-rag-evidence-sufficiency-shadow.mjs'), 'utf8'),
  /answer-quality-evaluation|ollama-answer-generator|mission-service|retrieval-runtime-service/,
);
const tampered = structuredClone(evidence); tampered.model.digest = '0'.repeat(64);
assert.throws(() => assertLocalRagEvidenceSufficiencyShadow(tampered), /integrity/);

console.log(JSON.stringify({
  modelConforms: evidence.aggregate.modelConforms,
  mode: 'local-rag-evidence-sufficiency-shadow-smoke',
  ok: true,
  tamperRejectionVerified: true,
}, null, 2));
