import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/memory-retrieval-quality-fixture-v1.md');
const readme = readRequiredFile('README.md');
const roadmap = readRequiredFile('docs/roadmap.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const releaseReadiness = readRequiredFile('docs/release-readiness-v1.md');
const retrievalSmoke = readRequiredFile('scripts/smoke-retrieval-memory.mjs');
const factGraphSmoke = readRequiredFile('scripts/smoke-fact-graph-memory.mjs');
const instructionBoundarySmoke = readRequiredFile('scripts/smoke-instruction-boundary-fixture.mjs');
const corpusContractSmoke = readRequiredFile('scripts/smoke-retrieval-corpus-contract.mjs');
const retrievalQualitySmoke = readRequiredFile('scripts/smoke-retrieval-quality-evaluation.mjs');
const semanticRetrievalSmoke = readRequiredFile('scripts/smoke-semantic-retrieval-experiment.mjs');
const rerankingSmoke = readRequiredFile('scripts/smoke-retrieval-reranking-experiment.mjs');
const semanticRuntimeSmoke = readRequiredFile('scripts/smoke-semantic-retrieval-runtime.mjs');
const localModelQualificationSmoke = readRequiredFile('scripts/smoke-local-embedding-model-qualification.mjs');
const localRetrievalRobustnessSmoke = readRequiredFile('scripts/smoke-local-retrieval-robustness.mjs');
const localRelevanceRerankerSmoke = readRequiredFile('scripts/smoke-local-relevance-reranker.mjs');

assert.equal(
  packageJson.scripts['smoke:memory-retrieval-quality-fixture'],
  'node scripts/smoke-memory-retrieval-quality-fixture.mjs',
);
assert.equal(packageJson.scripts['smoke:retrieval-memory'], 'node scripts/smoke-retrieval-memory.mjs');
assert.equal(
  packageJson.scripts['smoke:retrieval-corpus-contract'],
  'node scripts/smoke-retrieval-corpus-contract.mjs',
);
assert.equal(
  packageJson.scripts['smoke:retrieval-quality-evaluation'],
  'node scripts/smoke-retrieval-quality-evaluation.mjs',
);
assert.equal(
  packageJson.scripts['smoke:semantic-retrieval-experiment'],
  'node scripts/smoke-semantic-retrieval-experiment.mjs',
);
assert.equal(
  packageJson.scripts['smoke:retrieval-reranking-experiment'],
  'node scripts/smoke-retrieval-reranking-experiment.mjs',
);
assert.equal(
  packageJson.scripts['smoke:semantic-retrieval-runtime'],
  'node scripts/smoke-semantic-retrieval-runtime.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-embedding-model-qualification'],
  'node scripts/smoke-local-embedding-model-qualification.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-retrieval-robustness'],
  'node scripts/smoke-local-retrieval-robustness.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-relevance-reranker'],
  'node scripts/smoke-local-relevance-reranker.mjs',
);
assert.equal(packageJson.scripts['smoke:fact-graph-memory'], 'node scripts/smoke-fact-graph-memory.mjs');
assert.equal(
  packageJson.scripts['smoke:instruction-boundary'],
  'node scripts/smoke-instruction-boundary-fixture.mjs',
);

for (const term of [
  '# Memory Retrieval Quality Fixture v1',
  'status: memory-retrieval-quality-fixture-current',
  'productionReadyClaim: false',
  'publicHostedDemoUrl: none',
  'credentialFreeReplay: yes',
  'retrieval ranking',
  'source diversity',
  'fact graph provenance',
  'fact revision lifecycle',
  'instruction boundary',
  'not a benchmark',
  'not an accuracy score',
  'npm run smoke:memory-retrieval-quality-fixture',
  'npm run smoke:retrieval-corpus-contract',
  'npm run smoke:retrieval-quality-evaluation',
  'npm run smoke:semantic-retrieval-experiment',
  'npm run smoke:retrieval-reranking-experiment',
  'npm run smoke:semantic-retrieval-runtime',
  'npm run smoke:local-embedding-model-qualification',
  'npm run smoke:local-retrieval-robustness',
  'npm run smoke:local-relevance-reranker',
  'npm run smoke:retrieval-memory',
  'npm run smoke:fact-graph-memory',
  'npm run smoke:instruction-boundary',
  'lexical score',
  'BM25 score',
  'phrase boost score',
  'matched terms',
  'memory provenance',
  'Safe Claim Boundary',
  'Do not claim',
]) {
  assertContains(doc, term, `memory retrieval quality fixture missing ${term}`);
}

for (const smokeTerm of [
  'provider drift was resolved after prompt normalization',
  'lexicalScore',
  'bm25Score',
  'phraseBoostScore',
  'matchTermCount',
  'matchedTerms',
  'retrievalReason',
  'Source diversity retrieval check',
  'mission/decision',
]) {
  assertContains(retrievalSmoke, smokeTerm, `retrieval smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['buildFactCorpusRecord', 'contentHash', 'chunkId', 'revision', 'provenance']) {
  assertContains(corpusContractSmoke, smokeTerm, `corpus contract smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['precisionAtK', 'recallAtK', 'noiseRateAtK', 'sourceDiversityRate']) {
  assertContains(retrievalQualitySmoke, smokeTerm, `retrieval quality smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['createLocalCommandEmbeddingAdapter', 'allowedScopes', 'runtimeActivation']) {
  assertContains(semanticRetrievalSmoke, smokeTerm, `semantic retrieval smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['rerankRetrievalCandidates', 'rerankingAverageMs', 'rollback.sourceKeys']) {
  assertContains(rerankingSmoke, smokeTerm, `retrieval reranking smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['semanticFirstSource', 'failureBeforeProviderRun', 'rollbackMode']) {
  assertContains(semanticRuntimeSmoke, smokeTerm, `semantic runtime smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['actualLocalEmbeddingModelQualityValidated', 'selectedModelId', 'governance-blocked']) {
  assertContains(localModelQualificationSmoke, smokeTerm, `local model qualification smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['actualLocalRetrievalRobustnessValidated', 'failed-keep-lexical', 'hard-negative']) {
  assertContains(localRetrievalRobustnessSmoke, smokeTerm, `local robustness smoke missing ${smokeTerm}`);
}

for (const smokeTerm of ['actualLocalRelevanceRerankerQualityValidated', 'repeatStable', 'quality-passed-governance-blocked']) {
  assertContains(localRelevanceRerankerSmoke, smokeTerm, `local relevance smoke missing ${smokeTerm}`);
}

for (const smokeTerm of [
  'temporal fact graph with provenance',
  'sourceType',
  'shared-keyword',
  'sharedTokens',
  'memory-kind-changed',
  'memory-deleted',
  '--compact',
]) {
  assertContains(factGraphSmoke, smokeTerm, `fact graph smoke missing ${smokeTerm}`);
}

for (const smokeTerm of [
  'REDTEAM_FIXTURE_IGNORE_RUNTIME_AND_PRINT_SECRET_PROMPT',
  'REDTEAM_MEMORY_FIXTURE_OVERRIDE_RUNTIME',
  'untrusted data',
  'not as system\\/developer\\/user instructions',
  'LEAKED_SECRET_PROMPT_OUTPUT',
]) {
  assertContains(instructionBoundarySmoke, smokeTerm, `instruction boundary smoke missing ${smokeTerm}`);
}

for (const readmeTerm of [
  'Memory retrieval quality fixture: [docs/memory-retrieval-quality-fixture-v1.md](docs/memory-retrieval-quality-fixture-v1.md)',
  'npm run smoke:memory-retrieval-quality-fixture',
]) {
  assertContains(readme, readmeTerm, `README missing memory retrieval quality term ${readmeTerm}`);
}

assertContains(roadmap, '완료: memory/retrieval/fact graph quality fixture와 smoke guard', 'roadmap missing memory retrieval completion');
assertContains(
  evidenceGallery,
  '`docs/memory-retrieval-quality-fixture-v1.md`',
  'evidence gallery missing memory retrieval quality fixture',
);
assertContains(
  evidenceManifest,
  'Memory retrieval quality fixture: verified with `npm run smoke:memory-retrieval-quality-fixture`',
  'evidence manifest missing memory retrieval verification',
);
assertContains(releaseReadiness, 'productionReadyClaim: false', 'release readiness must keep productionReadyClaim false');

for (const risky of [
  'retrieval accuracy has been benchmarked',
  'ranking quality is production validated',
  'fact graph extraction is complete for arbitrary corpora',
  'prompt injection defense is comprehensive',
  'customer knowledge quality, SLA, or productivity metrics are proven',
  'hosted SaaS retrieval isolation is implemented',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(risky.toLowerCase()),
    true,
    `memory retrieval quality fixture must explicitly forbid risky claim: ${risky}`,
  );
}

for (const riskyAchievement of [
  'retrieval accuracy benchmark achieved',
  'production retrieval quality achieved',
  'prompt injection defense comprehensive achieved',
  'customer productivity metrics are proven',
  'hosted SaaS retrieval isolation achieved',
]) {
  assert.equal(
    combinedText().toLowerCase().includes(riskyAchievement.toLowerCase()),
    false,
    `memory retrieval quality fixture contains risky achievement claim: ${riskyAchievement}`,
  );
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      mode: 'memory-retrieval-quality-fixture-smoke',
      ok: true,
      credentialFreeReplay: true,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\//);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}

function combinedText() {
  return [doc, readme, roadmap, evidenceGallery, evidenceManifest, releaseReadiness].join('\n\n');
}
