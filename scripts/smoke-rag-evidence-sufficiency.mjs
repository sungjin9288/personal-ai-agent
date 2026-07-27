import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertRagEvidenceSufficiencyArtifact,
  buildRagEvidenceSufficiencyArtifact,
  evaluateRagEvidenceSufficiencySuite,
} from '../src/core/rag-evidence-sufficiency-evaluation.mjs';

const repoDir = process.cwd();
const packageJson = readJson('package.json');
const fixtureText = readText('fixtures/rag-evidence-sufficiency-cases-v1.json');
const fixture = JSON.parse(fixtureText);
const artifactText = readText('evidence/output-artifacts/rag-evidence-sufficiency.json');
const artifact = JSON.parse(artifactText);
const suite = evaluateRagEvidenceSufficiencySuite(fixture);

assert.equal(packageJson.scripts['evaluate:rag-evidence-sufficiency'], 'node scripts/evaluate-rag-evidence-sufficiency.mjs');
assert.equal(packageJson.scripts['smoke:rag-evidence-sufficiency'], 'node scripts/smoke-rag-evidence-sufficiency.mjs');
assert.doesNotThrow(() => assertRagEvidenceSufficiencyArtifact(artifact));
assert.equal(artifact.fixtureHash, sha256(fixtureText));
assert.deepEqual(artifact, buildRagEvidenceSufficiencyArtifact({ fixtureHash: artifact.fixtureHash, suite }));
assert.deepEqual(artifact.aggregate.stateCounts, {
  conflicting: 1,
  irrelevant: 1,
  'no-evidence': 1,
  partial: 1,
  sufficient: 1,
});
assert.equal(artifact.currentAnswerPathChanged, false);
assert.equal(artifact.actualUserQueryData, false);
assert.equal(artifact.runtimeActivation, false);
assert.equal(artifact.trainingAuthorized, false);
assert.equal(artifact.productionReadyClaim, false);
assert.equal(artifact.externalProviderCalls, 'none');
assert.doesNotMatch(artifactText, /Synthetic alpha|claim-alpha|source-sufficient|objective|response|prompt|error/i);

const tampered = structuredClone(artifact);
tampered.cases[0].state = 'sufficient';
assert.throws(() => assertRagEvidenceSufficiencyArtifact(tampered), /integrity/);

for (const relativePath of [
  'docs/ml-rag-development-plan-v1.md',
  'docs/roadmap.md',
  'docs/evidence-checklist.md',
  'docs/evidence-gallery.md',
  'docs/smoke-validation-summary-v1.md',
  'docs/devlog.md',
  'evidence/evidence_manifest.md',
]) {
  assert.match(readText(relativePath), /rag-evidence-sufficiency|RAG evidence sufficiency|Q9/i);
}
assert.match(readText('scripts/run-all-smokes.mjs'), /smoke:rag-evidence-sufficiency/);
assert.match(readText('scripts/run-all-smokes.mjs'), /smoke:local-rag-evidence-sufficiency-shadow/);

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  mode: 'rag-evidence-sufficiency-smoke',
  ok: true,
  tamperRejectionVerified: true,
}, null, 2));

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
