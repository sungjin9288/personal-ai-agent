import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const doc = readRequiredFile('docs/architecture-code-walkthrough-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const roadmap = readRequiredFile('docs/roadmap.md');

assert.equal(
  packageJson.scripts['smoke:architecture-code-walkthrough'],
  'node scripts/smoke-architecture-code-walkthrough.mjs',
);

for (const term of [
  '# Architecture Code Walkthrough v1',
  'status: code-walkthrough-current',
  'productionReadyClaim: false',
  'src/cli.mjs',
  'src/web/server.mjs',
  'src/core/mission-service.mjs',
  'src/core/mission-catalog-service.mjs',
  'src/core/mission-run-service.mjs',
  'src/harness/runtime-harness.mjs',
  'src/providers/index.mjs',
  'src/core/store.mjs',
  'createMissionService',
  'createMissionCatalogService',
  'createMissionRunService',
  'createRuntimeHarness',
  'createProviderRegistry',
  'createStore',
  'handleApi',
  'http.createServer',
  'npm run smoke:architecture-code-walkthrough',
  'Do not claim',
  'Production-ready deployment',
  'All-provider live validation',
  'Published public demo URL',
]) {
  assertContains(doc, term, `architecture walkthrough missing ${term}`);
}

for (const [filePath, pattern] of [
  ['src/core/mission-service.mjs', /export function createMissionService\(/],
  ['src/core/mission-catalog-service.mjs', /export function createMissionCatalogService\(/],
  ['src/core/mission-run-service.mjs', /async function runMission\(/],
  ['src/harness/runtime-harness.mjs', /export function createRuntimeHarness\(/],
  ['src/providers/index.mjs', /export function createProviderRegistry\(/],
  ['src/core/store.mjs', /export function createStore\(/],
  ['src/web/server.mjs', /async function handleApi\(/],
  ['src/web/server.mjs', /http\.createServer/],
  ['src/cli.mjs', /mission|provider|approval|action/s],
]) {
  const source = readRequiredFile(filePath);
  assert.match(source, pattern, `${filePath} missing expected architecture symbol`);
  assertContains(doc, filePath, `architecture walkthrough missing source path ${filePath}`);
}

for (const evidencePath of [
  'evidence/cli-logs/npm-run-smoke.log',
  'evidence/api-responses/api-health.json',
  'evidence/api-responses/api-providers.json',
  'evidence/cli-logs/mission-show-runtime.log',
  'evidence/cli-logs/session-show-runtime.log',
  'evidence/cli-logs/provider-list.log',
  'evidence/output-artifacts/runtime-mission-artifact-list.log',
]) {
  assert.equal(fs.existsSync(path.join(repoDir, evidencePath)), true, `missing evidence file: ${evidencePath}`);
  assertContains(doc, evidencePath, `architecture walkthrough missing evidence path ${evidencePath}`);
}

for (const readmeTerm of [
  'Architecture code walkthrough: [docs/architecture-code-walkthrough-v1.md](docs/architecture-code-walkthrough-v1.md)',
  'npm run smoke:architecture-code-walkthrough',
]) {
  assertContains(readme, readmeTerm, `README missing architecture walkthrough term ${readmeTerm}`);
}

for (const galleryTerm of [
  'Architecture code walkthrough',
  'docs/architecture-code-walkthrough-v1.md',
]) {
  assertContains(evidenceGallery, galleryTerm, `evidence gallery missing architecture walkthrough term ${galleryTerm}`);
}

assertContains(roadmap, '완료: architecture code walkthrough와 symbol smoke guard', 'roadmap missing architecture walkthrough completion');

for (const risky of [
  'hosted demo is live',
  'all-provider-complete achieved',
  'all providers are live validated',
  'published recorded walkthrough URL is verified',
]) {
  assert.equal(combinedText().toLowerCase().includes(risky.toLowerCase()), false, `architecture walkthrough contains risky claim: ${risky}`);
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      mode: 'architecture-code-walkthrough-smoke',
      ok: true,
      checkedSymbols: 9,
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
  return [doc, readme, evidenceGallery, roadmap].join('\n\n');
}
