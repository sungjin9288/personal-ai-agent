import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docPath = path.join(repoDir, 'docs', 'demo-evidence-index-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packageJsonPath = path.join(repoDir, 'package.json');
const summaryPath = path.join(repoDir, 'evidence', 'output-artifacts', 'representative-release-demo-summary.json');
const replayLogPath = path.join(repoDir, 'evidence', 'cli-logs', 'representative-release-demo-replay.log');
const browserReportPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'representative-release-demo-browser-e2e.json',
);
const previewPath = path.join(repoDir, 'evidence', 'screenshots', 'representative-release-demo-preview.png');
const screenshotPath = path.join(repoDir, 'evidence', 'screenshots', 'representative-release-demo-release-status.png');
const recordedWalkthroughPath = path.join(repoDir, 'docs', 'recorded-walkthrough-v1.md');

const doc = readRequiredFile(docPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const summary = JSON.parse(readRequiredFile(summaryPath));
const browserReport = JSON.parse(readRequiredFile(browserReportPath));
const replayLog = readRequiredFile(replayLogPath);
const recordedWalkthrough = readRequiredFile(recordedWalkthroughPath);
const preview = fs.readFileSync(previewPath);
const screenshot = fs.readFileSync(screenshotPath);

assert.equal(packageJson.scripts['smoke:demo-evidence-index'], 'node scripts/smoke-demo-evidence-index.mjs');

assert.equal(summary.demo, 'Representative Demo: Release Readiness Evidence Walkthrough');
assert.equal(summary.credentialFree, true);
assert.equal(summary.productionReadyClaim, false);
assert.equal(summary.commandCount, 7);
assert.equal(summary.commands.every((entry) => entry.status === 0), true, 'recorded demo commands must all pass');
assert.equal(browserReport.ok, true);
assert.equal(browserReport.mode, 'ui-execution-browser-e2e');
assert.equal(preview.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.deepEqual(readPngDimensions(preview), { height: 675, width: 960 });
assert.equal(screenshot.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

const expectedEvidence = [
  ['representative-release-demo-replay.log', 'evidence/cli-logs/representative-release-demo-replay.log', replayLogPath],
  [
    'representative-release-demo-summary.json',
    'evidence/output-artifacts/representative-release-demo-summary.json',
    summaryPath,
  ],
  [
    'representative-release-demo-browser-e2e.json',
    'evidence/output-artifacts/representative-release-demo-browser-e2e.json',
    browserReportPath,
  ],
  [
    'representative-release-demo-preview.png',
    'evidence/screenshots/representative-release-demo-preview.png',
    previewPath,
  ],
  [
    'representative-release-demo-release-status.png',
    'evidence/screenshots/representative-release-demo-release-status.png',
    screenshotPath,
  ],
];

for (const [fileName, displayPath, filePath] of expectedEvidence) {
  assertContains(doc, fileName, `demo evidence index missing ${fileName}`);
  assertContains(doc, displayPath, `demo evidence index missing ${displayPath}`);
  assertContains(doc, sha256File(filePath), `demo evidence index missing sha256 for ${displayPath}`);
}

for (const command of summary.commands.map((entry) => entry.command)) {
  assertContains(doc, command, `demo evidence index missing command ${command}`);
  assertContains(replayLog, `## ${command}`, `replay log missing command section ${command}`);
}

for (const term of [
  '# Demo Evidence Index v1',
  'publicHostedDemoUrl: none',
  'productionReadyClaim: false',
  summary.generatedAt,
  summary.commit,
  'Credential-free',
  'There is no public hosted demo URL.',
  'not a public hosted demo URL',
  'relatedRecordedWalkthrough: [recorded-walkthrough-v1.md](recorded-walkthrough-v1.md)',
  'The current repository includes a recording script, not a published walkthrough URL.',
  'The current evidence is a local recorded replay plus screenshot and browser report.',
  '![Representative demo preview](../evidence/screenshots/representative-release-demo-preview.png)',
  'Production readiness remains explicitly blocked',
  'npm run demo:local',
  'npm run evidence:representative-demo',
]) {
  assertContains(doc, term, `demo evidence index missing term: ${term}`);
}

for (const readmeTerm of [
  'Demo evidence index: [docs/demo-evidence-index-v1.md](docs/demo-evidence-index-v1.md)',
  'Recorded walkthrough script: [docs/recorded-walkthrough-v1.md](docs/recorded-walkthrough-v1.md)',
  '![Representative demo preview](evidence/screenshots/representative-release-demo-preview.png)',
  'npm run smoke:demo-evidence-index',
  'npm run smoke:recorded-walkthrough',
  'There is no public hosted demo URL.',
]) {
  assertContains(readme, readmeTerm, `README missing demo evidence index term: ${readmeTerm}`);
}

for (const risky of [
  'public hosted demo: yes',
  'hosted demo is live',
  'production-ready AI agent platform',
  'all-provider-complete achieved',
  'all providers are live validated',
]) {
  assert.equal(doc.toLowerCase().includes(risky.toLowerCase()), false, `demo evidence index contains risky claim: ${risky}`);
}

assertNoLocalPaths(doc);
assertNoLocalPaths(recordedWalkthrough);
assertNoLocalPaths(JSON.stringify(summary));
assertNoLocalPaths(JSON.stringify(browserReport));

console.log(
  JSON.stringify(
    {
      commandCount: summary.commandCount,
      mode: 'demo-evidence-index-smoke',
      ok: true,
      previewBytes: preview.length,
      screenshotBytes: screenshot.length,
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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readPngDimensions(buffer) {
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function assertNoLocalPaths(text) {
  assert.doesNotMatch(String(text || ''), /\/Users\/sungjin/);
  assert.doesNotMatch(String(text || ''), /\/private\/var\/folders\//);
  assert.doesNotMatch(String(text || ''), /\/var\/folders\//);
}
