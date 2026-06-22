import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile(path.join(repoDir, 'package.json')));
const replayLogPath = path.join(repoDir, 'evidence', 'cli-logs', 'representative-release-demo-replay.log');
const summaryPath = path.join(repoDir, 'evidence', 'output-artifacts', 'representative-release-demo-summary.json');
const browserReportPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'representative-release-demo-browser-e2e.json',
);
const screenshotPath = path.join(repoDir, 'evidence', 'screenshots', 'representative-release-demo-release-status.png');
const evidenceGallery = readRequiredFile(path.join(repoDir, 'docs', 'evidence-gallery.md'));
const implementationEvidence = readRequiredFile(path.join(repoDir, 'docs', 'implementation-evidence.md'));
const evidenceManifest = readRequiredFile(path.join(repoDir, 'evidence', 'evidence_manifest.md'));

assert.equal(
  packageJson.scripts['evidence:representative-demo'],
  'node scripts/build-representative-demo-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:representative-demo-evidence'],
  'node scripts/smoke-representative-demo-evidence.mjs',
);

const replayLog = readRequiredFile(replayLogPath);
const summary = JSON.parse(readRequiredFile(summaryPath));
const browserReport = JSON.parse(readRequiredFile(browserReportPath));
const screenshot = fs.readFileSync(screenshotPath);

assert.equal(summary.demo, 'Representative Demo: Release Readiness Evidence Walkthrough');
assert.equal(summary.credentialFree, true);
assert.equal(summary.productionReadyClaim, false);
assert.equal(summary.commandCount, 7);
assert.equal(summary.commands.every((entry) => entry.status === 0), true, JSON.stringify(summary.commands));
assert.equal(summary.screenshot.copied, true);
assert.equal(summary.browserReport.copied, true);
assert.match(summary.screenshot.sha256, /^[a-f0-9]{64}$/);
assert.match(summary.browserReport.sha256, /^[a-f0-9]{64}$/);

for (const command of [
  'npm run smoke:representative-demo',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:execution-v1-handoff',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:pilot-export-package',
  'npm run smoke:ui-execution-browser-e2e',
]) {
  assert.equal(
    summary.commands.some((entry) => entry.command === command),
    true,
    `summary missing command ${command}`,
  );
  assertContains(replayLog, `## ${command}`, `replay log missing command ${command}`);
}

assert.equal(browserReport.ok, true);
assert.equal(browserReport.mode, 'ui-execution-browser-e2e');
assert.equal(screenshot.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(screenshot.length > 1024, true, 'representative demo screenshot must not be empty');

for (const text of [replayLog, JSON.stringify(summary), JSON.stringify(browserReport)]) {
  assertNoLocalPaths(text);
}

for (const fileName of [
  'representative-release-demo-replay.log',
  'representative-release-demo-summary.json',
  'representative-release-demo-browser-e2e.json',
  'representative-release-demo-release-status.png',
]) {
  assertContains(evidenceGallery, fileName, `evidence gallery missing ${fileName}`);
  assertContains(implementationEvidence, fileName, `implementation evidence missing ${fileName}`);
  assertContains(evidenceManifest, fileName, `evidence manifest missing ${fileName}`);
}

console.log(
  JSON.stringify(
    {
      commandCount: summary.commandCount,
      mode: 'representative-demo-evidence-smoke',
      ok: true,
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

function assertNoLocalPaths(text) {
  assert.doesNotMatch(text, /\/Users\/sungjin/);
  assert.doesNotMatch(text, /\/private\/var\/folders\//);
  assert.doesNotMatch(text, /\/var\/folders\//);
}
