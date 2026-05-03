import path from 'node:path';

import {
  createVisualEvidenceManifest,
  writeVisualEvidenceManifest,
} from '../src/core/visual-evidence-manifest-service.mjs';

function readOption(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] || fallback;
}

const args = process.argv.slice(2);
const rootDir = path.resolve(readOption(args, '--root', process.cwd()));
const artifactRoot = path.join(rootDir, 'output', 'playwright');
const outputPath = readOption(
  args,
  '--output',
  path.join(artifactRoot, 'execution-v1-visual-evidence-manifest.json'),
);
const reportPath = path.join(artifactRoot, 'execution-v1-browser-e2e.json');
const screenshotPath = path.join(artifactRoot, 'execution-v1-browser-e2e.png');

const manifest = createVisualEvidenceManifest({
  artifactRoot,
  captureSession: {
    id: 'execution-v1-browser-e2e',
    source: 'smoke:ui-execution-browser-e2e',
  },
  evidenceItems: [
    {
      captureTarget: 'execution-v1 release UI flow',
      evidenceRole: 'browser interaction report',
      filePath: reportPath,
      format: 'json',
      id: 'browser-report',
      kind: 'report',
    },
    {
      captureTarget: 'execution-v1 release UI final state',
      evidenceRole: 'browser visual screenshot',
      filePath: screenshotPath,
      format: 'png',
      id: 'browser-screenshot',
      kind: 'screenshot',
    },
  ],
  outputPath,
  rootDir,
});

const result = writeVisualEvidenceManifest({ manifest, outputPath });

console.log(
  JSON.stringify(
    {
      artifactSetSha256: manifest.summary.artifactSetSha256,
      availableCount: manifest.summary.availableCount,
      missingCount: manifest.summary.missingCount,
      ok: true,
      outputPath: result.outputPath,
      visualArtifactCount: manifest.summary.visualArtifactCount,
    },
    null,
    2,
  ),
);
