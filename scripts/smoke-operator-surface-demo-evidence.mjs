import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));

assert.equal(
  packageJson.scripts['smoke:operator-surface-demo-evidence'],
  'node scripts/smoke-operator-surface-demo-evidence.mjs',
);

const docs = {
  operatorSurface: readRequiredFile('docs/operator-surface-demo-evidence-v1.md'),
  demoScenarios: readRequiredFile('docs/demo-scenarios-v1.md'),
  evidenceGallery: readRequiredFile('docs/evidence-gallery.md'),
  implementationEvidence: readRequiredFile('docs/implementation-evidence.md'),
  roadmap: readRequiredFile('docs/roadmap.md'),
  manifest: readRequiredFile('evidence/evidence_manifest.md'),
};

const requiredEvidenceFiles = [
  'evidence/cli-logs/bootstrap-local-runtime.log',
  'evidence/cli-logs/mission-show-runtime.log',
  'evidence/cli-logs/session-show-runtime.log',
  'evidence/output-artifacts/runtime-mission-artifact-list.log',
  'evidence/cli-logs/provider-list.log',
  'evidence/api-responses/api-providers.json',
  'evidence/cli-logs/release-blockers-hermes.log',
  'evidence/cli-logs/approval-inbox-runtime.log',
  'evidence/cli-logs/learning-promotions-runtime.log',
  'evidence/cli-logs/execution-preflight-approval-runtime.log',
  'evidence/api-responses/api-health.json',
  'evidence/api-responses/api-meta.json',
  'evidence/api-responses/api-execution-v1-status.json',
  'evidence/screenshots/operator-console-home.png',
  'evidence/screenshots/representative-release-demo-release-status.png',
];

for (const filePath of requiredEvidenceFiles) {
  assert.equal(fs.existsSync(path.join(repoDir, filePath)), true, `missing evidence file: ${filePath}`);
  assertContains(docs.operatorSurface, filePath, `operator surface doc missing ${filePath}`);
}

for (const fileName of [
  'bootstrap-local-runtime.log',
  'mission-show-runtime.log',
  'session-show-runtime.log',
  'runtime-mission-artifact-list.log',
  'provider-list.log',
  'api-providers.json',
  'release-blockers-hermes.log',
  'approval-inbox-runtime.log',
  'learning-promotions-runtime.log',
  'execution-preflight-approval-runtime.log',
  'api-health.json',
  'api-meta.json',
  'api-execution-v1-status.json',
  'operator-console-home.png',
  'representative-release-demo-release-status.png',
]) {
  assertContains(docs.evidenceGallery, fileName, `evidence gallery missing ${fileName}`);
  assertContains(docs.implementationEvidence, fileName, `implementation evidence missing ${fileName}`);
  assertContains(docs.manifest, fileName, `evidence manifest missing ${fileName}`);
}

for (const term of [
  'Operator Surface Demo Evidence',
  'mission/provider/action',
  'docs/operator-surface-demo-evidence-v1.md',
  'Mission creation/run browser screenshot',
  'Provider readiness browser screenshot',
  'Action inbox browser screenshot',
]) {
  assertContains(docs.demoScenarios, term, `demo scenarios missing ${term}`);
}

for (const term of [
  'operator surface demo evidence',
  'mission/provider/action support evidence',
  'provider-scoped local-first pilot',
]) {
  assertContains(docs.roadmap.toLowerCase(), term.toLowerCase(), `roadmap missing ${term}`);
}

for (const term of [
  'productionReadyClaim: false',
  'not a hosted SaaS or production-ready claim',
  'Mission run',
  'Provider readiness',
  'Action and approval',
  'Operator API',
  'Operator UI',
]) {
  assertContains(docs.operatorSurface, term, `operator surface doc missing ${term}`);
}

for (const risky of [
  'public hosted demo available',
  'hosted SaaS production ready',
  'all providers are live-ready',
  'Hermes is live-ready',
]) {
  assertDoesNotContain(combinedDocs(), risky, `operator surface evidence contains risky claim: ${risky}`);
}

console.log(
  JSON.stringify(
    {
      mode: 'operator-surface-demo-evidence-smoke',
      ok: true,
      evidenceFileCount: requiredEvidenceFiles.length,
      productionReadyClaim: false,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function assertDoesNotContain(text, needle, message) {
  assert.equal(String(text || '').includes(needle), false, message);
}

function combinedDocs() {
  return Object.values(docs).join('\n\n');
}
