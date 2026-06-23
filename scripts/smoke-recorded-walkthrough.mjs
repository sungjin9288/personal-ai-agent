import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docPath = path.join(repoDir, 'docs', 'recorded-walkthrough-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const demoIndexPath = path.join(repoDir, 'docs', 'demo-evidence-index-v1.md');
const demoScenariosPath = path.join(repoDir, 'docs', 'demo-scenarios-v1.md');
const packageJsonPath = path.join(repoDir, 'package.json');

const doc = readRequiredFile(docPath);
const readme = readRequiredFile(readmePath);
const demoIndex = readRequiredFile(demoIndexPath);
const demoScenarios = readRequiredFile(demoScenariosPath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));

assert.equal(packageJson.scripts['smoke:recorded-walkthrough'], 'node scripts/smoke-recorded-walkthrough.mjs');
assert.equal(packageJson.scripts['demo:local'], 'node scripts/demo-local.mjs');

for (const term of [
  '# Recorded Walkthrough v1',
  'status: recording-script-ready',
  'publicHostedDemoUrl: none',
  'privateRecordedWalkthroughUrl: pending',
  'productionReadyClaim: false',
  'provider-scoped pilot-ready',
  'not a hosted demo link',
  'does not claim that a recorded video has already been published',
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
  'Recorded walkthrough script: [docs/recorded-walkthrough-v1.md](docs/recorded-walkthrough-v1.md)',
  'npm run smoke:recorded-walkthrough',
  'There is no public hosted demo URL.',
]) {
  assertContains(readme, readmeTerm, `README missing recorded walkthrough term: ${readmeTerm}`);
}

for (const indexTerm of [
  'relatedRecordedWalkthrough: [recorded-walkthrough-v1.md](recorded-walkthrough-v1.md)',
  'The current repository includes a recording script, not a published walkthrough URL.',
]) {
  assertContains(demoIndex, indexTerm, `demo evidence index missing recorded walkthrough term: ${indexTerm}`);
}

for (const scenarioTerm of [
  'Recorded walkthrough script',
  'docs/recorded-walkthrough-v1.md',
  'Remaining walkthrough gap',
]) {
  assertContains(demoScenarios, scenarioTerm, `demo scenarios missing recorded walkthrough term: ${scenarioTerm}`);
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
  'recorded video has been published',
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
]) {
  assert.equal(combinedText().toLowerCase().includes(risky.toLowerCase()), false, `recorded walkthrough contains risky claim: ${risky}`);
}

assertNoLocalPaths(doc);

console.log(
  JSON.stringify(
    {
      mode: 'recorded-walkthrough-smoke',
      ok: true,
      storyboardSegments: 7,
      productionReadyClaim: false,
      publicHostedDemoUrl: 'none',
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
