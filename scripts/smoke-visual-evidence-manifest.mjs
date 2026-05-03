import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createVisualEvidenceManifest,
  writeVisualEvidenceManifest,
} from '../src/core/visual-evidence-manifest-service.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-visual-evidence-'));
const artifactRoot = path.join(tempRoot, 'output', 'playwright');
const reportPath = path.join(artifactRoot, 'execution-v1-browser-e2e.json');
const screenshotPath = path.join(artifactRoot, 'execution-v1-browser-e2e.png');
const manifestPath = path.join(artifactRoot, 'execution-v1-visual-evidence-manifest.json');
const transparentPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxX8AAAAASUVORK5CYII=',
  'base64',
);

fs.mkdirSync(artifactRoot, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ ok: true, mode: 'visual-evidence-smoke' }, null, 2)}\n`, 'utf8');
fs.writeFileSync(screenshotPath, transparentPngBuffer);

const unsafePath = path.join(tempRoot, 'outside.png');
assert.throws(
  () =>
    createVisualEvidenceManifest({
      artifactRoot,
      evidenceItems: [
        {
          filePath: unsafePath,
          id: 'unsafe',
          kind: 'screenshot',
        },
      ],
      rootDir: tempRoot,
    }),
  /outside the allowlisted artifact roots/,
);

const directManifest = createVisualEvidenceManifest({
  artifactRoot,
  evidenceItems: [
    {
      filePath: screenshotPath,
      id: 'browser-screenshot',
      kind: 'screenshot',
    },
  ],
  outputPath: manifestPath,
  rootDir: tempRoot,
});
assert.throws(
  () => writeVisualEvidenceManifest({ manifest: directManifest, outputPath: path.join(artifactRoot, 'alternate.json') }),
  /validated outputPath/,
);

const result = spawnSync(process.execPath, ['scripts/build-visual-evidence-manifest.mjs', '--root', tempRoot], {
  cwd: repoDir,
  encoding: 'utf8',
  env: process.env,
});

if (result.status !== 0) {
  throw new Error(`build-visual-evidence-manifest failed\n${result.stderr || result.stdout}`);
}

const buildResult = JSON.parse(String(result.stdout || '{}'));
assert.equal(buildResult.ok, true);
assert.equal(buildResult.outputPath, manifestPath);
assert.equal(buildResult.availableCount, 2);
assert.equal(buildResult.missingCount, 0);
assert.equal(buildResult.visualArtifactCount, 1);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.artifactVersion, 'personal-ai-agent-visual-evidence-manifest/v1');
assert.equal(manifest.security.localFilesOnly, true);
assert.equal(manifest.security.urlCaptureEnabled, false);
assert.equal(manifest.security.recorderEnabled, false);
assert.equal(manifest.captureSession.status, 'ready');
assert.equal(manifest.summary.screenshotCount, 1);
assert.equal(manifest.summary.reportCount, 1);
assert.equal(manifest.summary.videoCount, 0);
assert.equal(manifest.summary.signatureLines.length, 2);
assert.match(manifest.summary.artifactSetSha256, /^[a-f0-9]{64}$/);

const screenshot = manifest.artifacts.find((artifact) => artifact.id === 'browser-screenshot');
assert.ok(screenshot);
assert.equal(screenshot.exists, true);
assert.equal(screenshot.safePath, true);
assert.equal(screenshot.width, 1);
assert.equal(screenshot.height, 1);
assert.equal(screenshot.contentType, 'image/png');
assert.match(screenshot.sha256, /^[a-f0-9]{64}$/);

const report = manifest.artifacts.find((artifact) => artifact.id === 'browser-report');
assert.ok(report);
assert.equal(report.exists, true);
assert.equal(report.kind, 'report');
assert.equal(report.contentType, 'application/json');

console.log(
  JSON.stringify(
    {
      artifactSetSha256: manifest.summary.artifactSetSha256,
      mode: 'visual-evidence-manifest',
      ok: true,
      outputPath: manifestPath,
    },
    null,
    2,
  ),
);
