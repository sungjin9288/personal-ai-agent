import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docPath = path.join(repoDir, 'docs', 'recorded-walkthrough-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const demoIndexPath = path.join(repoDir, 'docs', 'demo-evidence-index-v1.md');
const demoScenariosPath = path.join(repoDir, 'docs', 'demo-scenarios-v1.md');
const implementationEvidencePath = path.join(repoDir, 'docs', 'implementation-evidence.md');
const roadmapPath = path.join(repoDir, 'docs', 'roadmap.md');
const evidenceManifestPath = path.join(repoDir, 'evidence', 'evidence_manifest.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const publicRecordPath = path.join(repoDir, 'config', 'public-walkthrough-v1.json');

const doc = readRequiredFile(docPath);
const readme = readRequiredFile(readmePath);
const demoIndex = readRequiredFile(demoIndexPath);
const demoScenarios = readRequiredFile(demoScenariosPath);
const implementationEvidence = readRequiredFile(implementationEvidencePath);
const roadmap = readRequiredFile(roadmapPath);
const evidenceManifest = readRequiredFile(evidenceManifestPath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const publicRecord = JSON.parse(readRequiredFile(publicRecordPath));

const publicUrl =
  'https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4';
const expectedSha256 = '9b1655542dcf4f87a118d5094bd6be4743cbd9a4c3bd202cf1663e5f08c3ea47';

assert.equal(packageJson.scripts['smoke:recorded-walkthrough'], 'node scripts/smoke-recorded-walkthrough.mjs');
assert.equal(packageJson.scripts['demo:local'], 'node scripts/demo-local.mjs');

for (const term of [
  '# Recorded Walkthrough v1',
  'status: published-walkthrough-verified',
  `publicHostedDemoUrl: ${publicUrl}`,
  'privateRecordedWalkthroughUrl: none',
  'productionReadyClaim: false',
  'provider-scoped pilot-ready',
  'releaseTag: walkthrough-v1',
  `assetSha256: ${expectedSha256}`,
  'accessPolicy: public GitHub release asset',
  'accessVerification: unauthenticated HTTP 200 and exact byte/SHA match',
  'npm run demo:local -- --plan',
  'npm run smoke:recorded-walkthrough',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:operator-surface-demo-evidence',
  'npm run smoke:release-artifact-hygiene',
  'evidence/screenshots/operator-surface-mission-run.png',
  'evidence/screenshots/operator-surface-provider-readiness.png',
  'evidence/screenshots/operator-surface-action-inbox.png',
  'evidence/output-artifacts/operator-surface-demo-browser-report.json',
]) {
  assertContains(doc, term, `recorded walkthrough missing ${term}`);
}

for (const requiredPath of [
  'docs/demo-evidence-index-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/operator-surface-demo-evidence-v1.md',
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/output-artifacts/representative-release-demo-browser-e2e.json',
  'evidence/output-artifacts/operator-surface-demo-browser-report.json',
  'evidence/screenshots/representative-release-demo-preview.png',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'evidence/screenshots/operator-surface-mission-run.png',
  'evidence/screenshots/operator-surface-provider-readiness.png',
  'evidence/screenshots/operator-surface-action-inbox.png',
]) {
  assert.equal(fs.existsSync(path.join(repoDir, requiredPath)), true, `required evidence missing: ${requiredPath}`);
  assertContains(doc, requiredPath, `recorded walkthrough missing evidence path ${requiredPath}`);
}

for (const readmeTerm of [
  `Recorded walkthrough: [public video](${publicUrl})`,
  'npm run smoke:recorded-walkthrough',
  'The public recorded walkthrough is access-verified; there is no hosted interactive demo.',
]) {
  assertContains(readme, readmeTerm, `README missing recorded walkthrough term: ${readmeTerm}`);
}

for (const indexTerm of [
  'relatedRecordedWalkthrough: [recorded-walkthrough-v1.md](recorded-walkthrough-v1.md)',
  `publicRecordedWalkthrough: [Recorded Walkthrough v1](${publicUrl})`,
]) {
  assertContains(demoIndex, indexTerm, `demo evidence index missing recorded walkthrough term: ${indexTerm}`);
}

for (const scenarioTerm of [
  'Published recorded walkthrough',
  'docs/recorded-walkthrough-v1.md',
  publicUrl,
]) {
  assertContains(demoScenarios, scenarioTerm, `demo scenarios missing recorded walkthrough term: ${scenarioTerm}`);
}

for (const [document, term] of [
  [doc, 'hosted interactive demo or production service URL'],
  [roadmap, 'hosted interactive demo or production service link'],
  [implementationEvidence, 'hosted interactive demo URL과 실제 사용자 feedback'],
  [evidenceManifest, 'Hosted interactive demo or production service URL'],
]) {
  assertContains(document, term, `walkthrough claim boundary missing: ${term}`);
}

for (const [document, stale] of [
  [doc, 'public demo URL'],
  [roadmap, 'public demo link'],
  [implementationEvidence, 'public demo URL과 실제 사용자 feedback'],
  [evidenceManifest, '\n- Public demo URL\n'],
]) {
  assert.equal(document.includes(stale), false, `stale walkthrough claim remains: ${stale}`);
}

for (const stale of [
  'Mission creation/run browser screenshot\n- Provider readiness browser screenshot\n- Action inbox browser screenshot',
  'These are follow-up portfolio polish items.',
]) {
  assert.equal(demoScenarios.includes(stale), false, `demo scenarios still contain stale walkthrough gap wording: ${stale}`);
}

for (const risky of [
  'public hosted demo: yes',
  'hosted demo is live',
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
]) {
  assert.equal(combinedText().toLowerCase().includes(risky.toLowerCase()), false, `recorded walkthrough contains risky claim: ${risky}`);
}

assertNoLocalPaths(doc);

assert.deepEqual(publicRecord, {
  schemaVersion: 'personal-ai-agent-public-walkthrough-record/v1',
  tag: 'walkthrough-v1',
  releaseUrl: 'https://github.com/sungjin9288/personal-ai-agent/releases/tag/walkthrough-v1',
  releasePublishedAt: '2026-08-09T14:36:55Z',
  asset: {
    id: 507595206,
    name: 'personal-ai-agent-recorded-walkthrough-v1.mp4',
    sizeBytes: 45936551,
    sha256: expectedSha256,
    createdAt: '2026-08-09T14:36:50Z',
  },
  captureCommit: 'a4034fde5a47b7d246eab9573763663a366ca8ab',
  durationSeconds: 390,
  accessPolicy: 'public-github-release-asset',
  accessVerifiedAt: '2026-08-09T14:39:41Z',
  accessVerification: 'unauthenticated HTTP 200 and exact byte/SHA match',
  privacyReview: '17 representative frames, Korean/English OCR, and full-stream decode passed',
  productionReadyClaim: false,
});

console.log(
  JSON.stringify(
    {
      mode: 'recorded-walkthrough-smoke',
      ok: true,
      storyboardSegments: 7,
      productionReadyClaim: false,
      publicHostedDemoUrl: publicUrl,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
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
  return [doc, readme, demoIndex, demoScenarios].join('\n\n');
}
