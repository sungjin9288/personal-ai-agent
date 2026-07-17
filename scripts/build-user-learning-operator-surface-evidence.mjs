import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const outputDir = path.join(repoDir, 'output', 'playwright');
const sourceReportPath = path.join(outputDir, 'user-learning-operator-surface-browser.json');
const sourceScreenshotPath = path.join(outputDir, 'user-learning-operator-surface-browser.png');
const evidenceOutputDir = path.join(repoDir, 'evidence', 'output-artifacts');
const evidenceScreenshotDir = path.join(repoDir, 'evidence', 'screenshots');
const evidencePath = path.join(evidenceOutputDir, 'user-learning-operator-surface.json');
const evidenceScreenshotPath = path.join(
  evidenceScreenshotDir,
  'user-learning-operator-surface.png',
);

const report = JSON.parse(fs.readFileSync(sourceReportPath, 'utf8'));
assert.equal(report.mode, 'user-learning-operator-surface-browser');
assert.equal(report.ok, true);
assert.equal(report.actualBrowserInteractionValidated, true);
assert.equal(report.costFree, true);
assert.equal(report.externalProviderCalls, 'none');
assert.equal(report.productionReadyClaim, false);
assert.deepEqual(report.lifecycle, ['active', 'expired', 'cleared']);
assert.deepEqual(report.results, {
  activeVisible: true,
  clearedVisible: true,
  consoleErrorCount: 0,
  expiredVisible: true,
  finalClearButtonCount: 0,
  setButtonCount: 1,
});

const screenshot = fs.readFileSync(sourceScreenshotPath);
const dimensions = readPngDimensions(screenshot);
fs.mkdirSync(evidenceOutputDir, { recursive: true });
fs.mkdirSync(evidenceScreenshotDir, { recursive: true });
fs.copyFileSync(sourceScreenshotPath, evidenceScreenshotPath);

const evidence = {
  artifacts: {
    screenshot: path.relative(repoDir, evidenceScreenshotPath).split(path.sep).join('/'),
    screenshotHeight: dimensions.height,
    screenshotSha256: sha256(screenshot),
    screenshotWidth: dimensions.width,
    sourceBrowserReportSha256: sha256(fs.readFileSync(sourceReportPath)),
  },
  bindings: {
    candidateIdHash: sha256(report.candidateId),
    missionIdHash: sha256(report.missionId),
    workspaceIdHash: sha256(report.workspaceId),
  },
  claimBoundary: {
    actualModelTrainingExecuted: false,
    actualUserLearningOperatorSurfaceValidated: true,
    automaticPreferenceLearningValidated: false,
    externalProviderCalls: 'none',
    hostedTenantUserPersonalizationValidated: false,
    multiUserIsolationValidated: false,
    productionReadyClaim: false,
  },
  generatedAt: new Date().toISOString(),
  lifecycle: report.lifecycle,
  mode: 'user-learning-operator-surface-evidence',
  results: report.results,
  schemaVersion: 'personal-ai-agent-user-learning-operator-surface/v1',
};

fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({
  evidencePath: path.relative(repoDir, evidencePath).split(path.sep).join('/'),
  mode: evidence.mode,
  ok: true,
  screenshotPath: evidence.artifacts.screenshot,
}, null, 2));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readPngDimensions(buffer) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buffer.length >= 24, true, 'user learning operator screenshot is truncated');
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, 'user learning operator screenshot is not PNG');
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR');
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}
